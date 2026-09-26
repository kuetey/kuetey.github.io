/*
 * main.js — le chef d'orchestre de la v5
 *
 * 1. Chargement (polices, scène) avec barre de progression
 * 2. Rendu : renderer, caméra, environnement, post-traitement (bloom + vignette)
 * 3. Caméra cinématique : plan d'intro qui tourne → vol jusqu'à la potence
 * 4. Logique de partie : relie les règles (jeu.js), l'interface 3D, le cowboy, le décor et les sons
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { MOTS } from "./mots.js";
import { ERREURS_MAX, nouvellePartie, jouerLettre } from "./jeu.js";
import { chargerPolices } from "./textures.js";
import { sons } from "./sons.js";
import { approcher } from "./outils.js";

const loader = document.getElementById("loader");
const barre = document.getElementById("loader-fill");
const texteChargement = document.getElementById("loader-text");
const annonce = document.getElementById("annonce");

function progression(pourcentage, texte) {
    barre.style.width = `${pourcentage}%`;
    if (texte) texteChargement.textContent = texte;
}

// Laisse le navigateur afficher la barre avant une étape lourde
const pause = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

async function demarrerApplication() {
    progression(10, "Sellage des chevaux…");
    await chargerPolices();

    // Les modules 3D sont importés après les polices : leurs textures de texte en ont besoin
    progression(30, "Construction du saloon…");
    const [{ creerDecor }, { creerPotence }, { creerInterface }] = await Promise.all([
        import("./decor.js"),
        import("./cowboy.js"),
        import("./interface3d.js"),
    ]);

    /* ---------- Renderer, scène, caméra ---------- */

    const mobile = window.matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 600;
    const canvas = document.getElementById("scene");

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
    scene.add(camera); // indispensable : l'interface 3D est accrochée à la caméra

    // Environnement : donne des reflets réalistes au laiton et à l'acier
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;

    await pause();
    progression(55, "Plantation des cactus…");
    const decor = creerDecor(scene, { qualite: mobile ? "basse" : "haute" });

    await pause();
    progression(70, "Préparation de la potence…");
    const cowboy = creerPotence(scene);

    await pause();
    progression(85, "Graissage de la machine à écrire…");

    /* ---------- Post-traitement ---------- */

    // On dessine d'abord la scène dans une image intermédiaire, puis on lui applique des effets
    const cible = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, cible);
    composer.addPass(new RenderPass(scene, camera));

    // Bloom : fait "rayonner" ce qui est très lumineux (soleil, fenêtres, pièces d'or)
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.6, 1.0);
    composer.addPass(bloom);

    composer.addPass(new OutputPass());

    // Vignette : assombrit les bords de l'image, comme au cinéma
    const vignette = new ShaderPass({
        uniforms: { tDiffuse: { value: null }, force: { value: 0.35 }, rouge: { value: 0 } },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
            uniform sampler2D tDiffuse;
            uniform float force;
            uniform float rouge;
            varying vec2 vUv;
            void main() {
                vec4 couleur = texture2D(tDiffuse, vUv);
                float d = distance(vUv, vec2(0.5));
                float v = smoothstep(0.85, 0.3, d);
                couleur.rgb *= mix(1.0 - force, 1.0, v);
                couleur.rgb = mix(couleur.rgb, couleur.rgb * vec3(1.25, 0.7, 0.65), rouge * (1.0 - v));
                gl_FragColor = couleur;
            }`,
    });
    composer.addPass(vignette);

    /* ---------- Interface 3D ---------- */

    const ui = creerInterface({
        camera,
        canvas,
        sons,
        actions: {
            jouer: lancerPartie,
            lettre: jouer,
            nouvellePartie: recommencer,
            basculerSon() {
                ui.changerSon(sons.basculer());
            },
        },
    });

    /* ---------- Caméra cinématique ---------- */

    const regard = new THREE.Vector3();          // point que la caméra regarde
    const regardCible = cowboy.pointDeVue.clone();
    let modeCamera = "intro";                    // "intro", "vol", "jeu"
    let angleIntro = 0.6;
    let vol = null;
    let secousse = 0;
    let rapprochement = 0;                       // la caméra avance un peu en fin de partie
    const souris = new THREE.Vector2();

    window.addEventListener("pointermove", (e) => {
        souris.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
    });

    function positionJeu() {
        const portrait = camera.aspect < 1;
        // Écran étroit : on recule pour voir la potence entre le mot et le clavier
        const recul = portrait ? 25 : camera.aspect < 1.4 ? 20 : 17.5;
        return new THREE.Vector3(0.6, 4.3, recul - rapprochement);
    }

    function positionIntro(t) {
        return new THREE.Vector3(Math.sin(t) * 30, 11 + Math.sin(t * 0.7) * 2, Math.cos(t) * 30 - 2);
    }

    function lancerVol() {
        vol = { depart: camera.position.clone(), regardDepart: regard.clone(), temps: 0, duree: 2.6 };
        modeCamera = "vol";
    }

    function animerCamera(t, dt) {
        if (modeCamera === "intro") {
            angleIntro += dt * 0.07;
            camera.position.copy(positionIntro(angleIntro));
            regard.set(0, 3, -2);
        } else if (modeCamera === "vol") {
            vol.temps += dt;
            const p = Math.min(vol.temps / vol.duree, 1);
            const doux = p * p * (3 - 2 * p); // "smoothstep" : départ et arrivée en douceur
            const arrivee = positionJeu();
            camera.position.lerpVectors(vol.depart, arrivee, doux);
            camera.position.y += Math.sin(p * Math.PI) * 4; // passe un peu au-dessus : effet "drone"
            regard.lerpVectors(vol.regardDepart, regardCible, doux);
            if (p >= 1) {
                modeCamera = "jeu";
                ui.afficherJeu(true);
                recommencer();
            }
        } else {
            const cibleCam = positionJeu();
            cibleCam.x += souris.x * 1.2;
            cibleCam.y -= souris.y * 0.6;
            camera.position.x = approcher(camera.position.x, cibleCam.x, 0.05, dt);
            camera.position.y = approcher(camera.position.y, cibleCam.y, 0.05, dt);
            camera.position.z = approcher(camera.position.z, cibleCam.z, 0.05, dt);
            regard.lerp(regardCible, 0.1);
        }

        camera.lookAt(regard);

        // Secousse (coup de feu) appliquée après le lookAt
        if (secousse > 0) {
            camera.rotation.z += (Math.random() - 0.5) * secousse * 0.05;
            camera.position.x += (Math.random() - 0.5) * secousse * 0.3;
            camera.position.y += (Math.random() - 0.5) * secousse * 0.3;
            secousse = Math.max(0, secousse - dt * 1.6);
        }
    }

    /* ---------- Logique de partie ---------- */

    let partie = null;

    function annoncer() {
        if (!partie) return;
        const visible = [...partie.mot].map((l) => (partie.lettresTrouvees.includes(l) ? l : "_")).join(" ");
        const fin = partie.statut === "gagne" ? " Gagné !" : partie.statut === "perdu" ? ` Perdu, le mot était ${partie.mot}.` : "";
        annonce.textContent = `Mot : ${visible}. Erreurs : ${partie.lettresFausses.length} sur ${ERREURS_MAX}.${fin}`;
    }

    function lancerPartie() {
        if (modeCamera !== "intro") return;
        sons.debloquer();
        sons.vent();
        ui.afficherTitre(false);
        lancerVol();
    }

    function recommencer() {
        partie = nouvellePartie(MOTS);
        rapprochement = 0;
        vignette.uniforms.rouge.value = 0;
        cowboy.reinitialiser();
        decor.ambiance("jeu");
        ui.nouveauMot(partie.mot);
        annoncer();
    }

    function jouer(lettre) {
        if (!partie) return;
        const resultat = jouerLettre(partie, lettre);
        if (resultat === null) return;

        const erreurs = partie.lettresFausses.length;

        if (resultat === "bonne") {
            ui.marquerTouche(lettre, "correct");
            ui.revelerLettre(lettre);
            sons.bonne();
        } else {
            ui.marquerTouche(lettre, "faux");
            ui.perdreBalle(erreurs);
            cowboy.ajouterPartie(erreurs);
            sons.mauvaise();
            secousse = 1;
        }

        if (partie.statut === "gagne") {
            ui.verrouillerClavier();
            cowboy.victoire();
            decor.ambiance("victoire");
            rapprochement = 3;
            setTimeout(() => {
                sons.victoire();
                ui.afficherResultat(true, partie.mot, erreurs);
            }, 900);
        } else if (partie.statut === "perdu") {
            ui.verrouillerClavier();
            ui.revelerTout();
            cowboy.defaite();
            decor.ambiance("defaite");
            vignette.uniforms.rouge.value = 1;
            rapprochement = 2;
            sons.defaite();
            setTimeout(() => ui.afficherResultat(false, partie.mot, erreurs), 1600);
        } else {
            cowboy.humeur(erreurs >= 4 ? "inquiet" : "normal");
        }

        annoncer();
    }

    /* ---------- Clavier physique ---------- */

    function lettreSansAccent(texte) {
        return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
    }

    window.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        sons.debloquer();

        if (e.key === "Enter" || e.key === " ") {
            if (modeCamera === "intro") lancerPartie();
            else if (partie && partie.statut !== "en_cours") {
                sons.bouton();
                recommencer();
            }
            e.preventDefault();
            return;
        }

        const lettre = lettreSansAccent(e.key);
        if (/^[A-Z]$/.test(lettre) && modeCamera === "jeu" && !e.repeat) {
            ui.appuyerTouche(lettre);
        }
    });

    /* ---------- Taille de l'écran ---------- */

    function redimensionner() {
        const l = innerWidth;
        const h = innerHeight;
        camera.aspect = l / h;
        camera.fov = camera.aspect < 1 ? 58 : 45;
        camera.updateProjectionMatrix();
        // La densité de pixels peut changer (zoom, fenêtre déplacée sur un autre écran)
        const densite = Math.min(window.devicePixelRatio, mobile ? 1.5 : 2);
        renderer.setPixelRatio(densite);
        composer.setPixelRatio(densite);
        renderer.setSize(l, h);
        composer.setSize(l, h);
        bloom.resolution.set(l, h);
        bloom.strength = Math.min(l, h) < 600 ? 0.3 : 0.55; // sur petit écran, le halo s'étale trop
        ui.mettreEnPage();
    }
    window.addEventListener("resize", redimensionner);
    redimensionner();

    /* ---------- Boucle principale ---------- */

    const horloge = new THREE.Clock();

    function boucle() {
        const dt = Math.min(horloge.getDelta(), 0.05);
        const t = horloge.elapsedTime;

        decor.mettreAJour(t, dt);
        cowboy.mettreAJour(t, dt);
        ui.mettreAJour(t, dt);
        animerCamera(t, dt);
        vignette.uniforms.rouge.value = approcher(vignette.uniforms.rouge.value, partie?.statut === "perdu" ? 1 : 0, 0.03, dt);

        composer.render();
    }

    // Première image avant d'enlever l'écran de chargement
    camera.position.copy(positionIntro(angleIntro));
    regard.set(0, 3, -2);
    camera.lookAt(regard);
    progression(100, "En selle !");
    renderer.setAnimationLoop(boucle);
    ui.afficherTitre(true);

    setTimeout(() => loader.classList.add("cache"), 350);

    // Pour déboguer dans la console du navigateur
    window.motMystere = { scene, camera, renderer, get partie() { return partie; } };
}

demarrerApplication().catch((erreur) => {
    console.error(erreur);
    texteChargement.textContent = "Impossible de lancer la 3D sur cet appareil (WebGL indisponible ?).";
});
