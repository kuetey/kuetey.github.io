/*
 * main.js — le chef d'orchestre de la v5
 *
 * 1. Chargement (polices, scène) avec barre de progression
 * 2. Rendu : renderer, caméra, environnement, post-traitement (bloom + vignette)
 * 3. Caméra cinématique : plan d'intro qui tourne → vol jusqu'à la potence
 * 4. Logique de partie : relie les règles (jeu.js), l'interface 3D, le cowboy, le décor et les sons
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Organiser un programme en modules : ce fichier ne dessine rien lui-même,
 *   il appelle les autres (decor, cowboy, interface3d, sons) et les fait travailler ensemble.
 * - L'asynchrone : async / await, les Promise, et l'import dynamique import("./fichier.js")
 *   pour charger les modules seulement quand les polices sont prêtes.
 * - La boucle de rendu d'un jeu : environ 60 fois par seconde, on met tout à jour
 *   (avec dt, le temps écoulé) puis on dessine une image.
 * - Une "machine à états" simple pour la caméra : "intro" → "vol" → "jeu".
 * - L'interpolation : lerp (mélange de deux positions) et smoothstep (départ et arrivée en douceur).
 * - Le post-traitement : dessiner la scène dans une image, puis lui appliquer des effets (bloom, vignette).
 * - L'accessibilité : même dans un jeu 100 % 3D, une zone aria-live décrit la partie
 *   aux lecteurs d'écran.
 * ---------------------------------------------------------------------------
 */

// "import * as THREE" : on récupère toute la bibliothèque Three.js sous le nom THREE.
// Le navigateur sait où la trouver grâce à l'"importmap" déclarée dans index.html.
import * as THREE from "three";

// Les "addons" sont des extensions officielles de Three.js, à importer une par une.
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";   // enchaîne les effets
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";           // 1er effet : dessiner la scène
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js"; // halo lumineux
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";           // effet sur mesure (vignette)
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";           // conversion finale des couleurs
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";   // "pièce" virtuelle pour les reflets

// Mes propres modules. Les accolades { } importent seulement ce qui est demandé.
import { MOTS } from "./mots.js";
import { ERREURS_MAX, nouvellePartie, jouerLettre } from "./jeu.js";
import { chargerPolices } from "./textures.js";
import { sons } from "./sons.js";
import { approcher } from "./outils.js";

// Les seuls éléments HTML de la page (tout le reste est dessiné en 3D)
const loader = document.getElementById("loader");               // écran de chargement
const barre = document.getElementById("loader-fill");           // barre de progression
const texteChargement = document.getElementById("loader-text"); // texte sous la barre
const annonce = document.getElementById("annonce");             // texte lu par les lecteurs d'écran

// Met à jour la barre de chargement. `${...}` insère une valeur dans une chaîne (template string).
function progression(pourcentage, texte) {
    barre.style.width = `${pourcentage}%`;
    if (texte) texteChargement.textContent = texte;
}

// Laisse le navigateur afficher la barre avant une étape lourde.
// Une Promise représente un résultat "plus tard" ; requestAnimationFrame attend la prochaine image.
const pause = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// "async" : cette fonction peut utiliser "await" pour attendre sans bloquer la page.
async function demarrerApplication() {
    progression(10, "Sellage des chevaux…");
    // On attend les polices western : les textes 3D sont dessinés avec elles.
    await chargerPolices();

    // Les modules 3D sont importés après les polices : leurs textures de texte en ont besoin.
    // Promise.all lance les trois chargements en même temps et attend qu'ils soient tous finis.
    // La "déstructuration" [{ creerDecor }, …] récupère directement la fonction voulue de chaque module.
    progression(30, "Construction du saloon…");
    const [{ creerDecor }, { creerPotence }, { creerInterface }] = await Promise.all([
        import("./decor.js"),
        import("./cowboy.js"),
        import("./interface3d.js"),
    ]);

    /* ---------- Renderer, scène, caméra ---------- */

    // Détection d'un appareil mobile : écran tactile OU petit écran → on réduit la qualité.
    const mobile = window.matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 600;
    const canvas = document.getElementById("scene");

    // Le renderer dessine la 3D dans le <canvas> grâce à WebGL (la carte graphique).
    // antialias: false car l'anticrénelage est fait plus loin par le post-traitement (samples: 4).
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    // Densité de pixels : 2 sur les écrans "Retina", limitée pour ne pas surcharger la carte graphique.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;               // active les ombres portées
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ombres aux bords adoucis

    // La scène contient tous les objets ; la caméra est l'œil qui la regarde.
    const scene = new THREE.Scene();
    // PerspectiveCamera(angle de vue en degrés, rapport largeur/hauteur, distance mini, distance maxi)
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
    scene.add(camera); // indispensable : l'interface 3D est accrochée à la caméra

    // Environnement : donne des reflets réalistes au laiton et à l'acier.
    // PMREMGenerator prépare une "carte de reflets" à partir d'une pièce virtuelle.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;

    // Chaque étape de construction est séparée par une pause pour que la barre avance à l'écran.
    await pause();
    progression(55, "Plantation des cactus…");
    const decor = creerDecor(scene, { qualite: mobile ? "basse" : "haute" });

    await pause();
    progression(70, "Préparation de la potence…");
    const cowboy = creerPotence(scene);

    await pause();
    progression(85, "Graissage de la machine à écrire…");

    /* ---------- Post-traitement ---------- */

    // On dessine d'abord la scène dans une image intermédiaire (render target), puis on lui applique des effets.
    // HalfFloatType : les couleurs peuvent dépasser 1 (très lumineux) → le bloom sait quoi faire briller.
    const cible = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, cible);
    composer.addPass(new RenderPass(scene, camera)); // étape 1 : dessiner la scène

    // Bloom : fait "rayonner" ce qui est très lumineux (soleil, fenêtres, pièces d'or).
    // Paramètres : taille de l'image, force 0.55, rayon 0.6, seuil 1.0 (seul ce qui dépasse 1 brille).
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.6, 1.0);
    composer.addPass(bloom);

    composer.addPass(new OutputPass()); // convertit les couleurs pour l'écran (espace sRGB)

    // Vignette : assombrit les bords de l'image, comme au cinéma.
    // C'est un petit programme GLSL exécuté par la carte graphique pour CHAQUE pixel de l'image.
    const vignette = new ShaderPass({
        // "uniforms" = valeurs envoyées du JavaScript vers le shader
        uniforms: { tDiffuse: { value: null }, force: { value: 0.35 }, rouge: { value: 0 } },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
            uniform sampler2D tDiffuse; // l'image déjà dessinée
            uniform float force;        // intensité de l'assombrissement
            uniform float rouge;        // 0 = normal, 1 = teinte rouge (défaite)
            varying vec2 vUv;           // position du pixel (0 à 1)
            void main() {
                vec4 couleur = texture2D(tDiffuse, vUv);
                float d = distance(vUv, vec2(0.5));        // distance au centre de l'écran
                float v = smoothstep(0.85, 0.3, d);        // 1 au centre, 0 dans les coins
                couleur.rgb *= mix(1.0 - force, 1.0, v);   // bords plus sombres
                couleur.rgb = mix(couleur.rgb, couleur.rgb * vec3(1.25, 0.7, 0.65), rouge * (1.0 - v));
                gl_FragColor = couleur;
            }`,
    });
    composer.addPass(vignette);

    /* ---------- Interface 3D ---------- */

    // L'interface reçoit des "actions" : des fonctions qu'elle appellera quand le joueur clique.
    // Ce sont des "callbacks" (fonctions de rappel) : interface3d.js ne connaît pas les règles,
    // elle prévient simplement main.js.
    const ui = creerInterface({
        camera,
        canvas,
        sons,
        actions: {
            jouer: lancerPartie,          // bouton JOUER de l'écran titre
            lettre: jouer,                // clic sur une touche du clavier 3D
            nouvellePartie: recommencer,  // boutons NOUVELLE PARTIE et REJOUER
        },
    });
    // Remarque : lancerPartie, jouer et recommencer sont définies plus bas.
    // Ça fonctionne car les déclarations "function" sont "remontées" (hoisting) en JavaScript.

    /* ---------- Caméra cinématique ---------- */

    const regard = new THREE.Vector3();          // point que la caméra regarde
    const regardCible = cowboy.pointDeVue.clone();
    let modeCamera = "intro";                    // "intro", "vol", "jeu"
    let angleIntro = 0.6;                        // angle de la caméra qui tourne autour de la scène
    let vol = null;                              // données du vol (départ, durée…) pendant le mode "vol"
    let secousse = 0;                            // intensité du tremblement après un coup de feu
    let rapprochement = 0;                       // la caméra avance un peu en fin de partie
    const souris = new THREE.Vector2();          // position de la souris, de -0.5 à 0.5

    // À chaque mouvement de souris, on mémorise sa position relative à l'écran
    window.addEventListener("pointermove", (e) => {
        souris.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
    });

    // Position de la caméra pendant la partie
    function positionJeu() {
        const portrait = camera.aspect < 1;
        // Écran étroit : on recule pour voir la potence entre le mot et le clavier.
        // Ternaire imbriqué : portrait → 25, sinon écran presque carré → 20, sinon → 17.5
        const recul = portrait ? 25 : camera.aspect < 1.4 ? 20 : 17.5;
        return new THREE.Vector3(0.6, 4.3, recul - rapprochement);
    }

    // Position pendant l'écran titre : un cercle autour de la scène (trigonométrie).
    // sin et cos d'un même angle donnent un point sur un cercle ; ici de rayon 30.
    function positionIntro(t) {
        return new THREE.Vector3(Math.sin(t) * 30, 11 + Math.sin(t * 0.7) * 2, Math.cos(t) * 30 - 2);
    }

    // Démarre le vol : on retient d'où l'on part pour pouvoir interpoler jusqu'à l'arrivée
    function lancerVol() {
        vol = { depart: camera.position.clone(), regardDepart: regard.clone(), temps: 0, duree: 2.6 };
        modeCamera = "vol";
    }

    // Appelée à chaque image : déplace la caméra selon le mode en cours
    function animerCamera(t, dt) {
        if (modeCamera === "intro") {
            // La caméra tourne lentement autour de la scène
            angleIntro += dt * 0.07;
            camera.position.copy(positionIntro(angleIntro));
            regard.set(0, 3, -2);
        } else if (modeCamera === "vol") {
            vol.temps += dt;
            // p : avancement du vol, de 0 (départ) à 1 (arrivée)
            const p = Math.min(vol.temps / vol.duree, 1);
            const doux = p * p * (3 - 2 * p); // "smoothstep" : départ et arrivée en douceur
            const arrivee = positionJeu();
            // lerpVectors : position intermédiaire entre le départ et l'arrivée ("lerp" = interpolation linéaire)
            camera.position.lerpVectors(vol.depart, arrivee, doux);
            camera.position.y += Math.sin(p * Math.PI) * 4; // passe un peu au-dessus : effet "drone"
            regard.lerpVectors(vol.regardDepart, regardCible, doux);
            if (p >= 1) {
                // Arrivé : on passe en mode jeu, on affiche l'interface et on tire un mot
                modeCamera = "jeu";
                ui.afficherJeu(true);
                recommencer();
            }
        } else {
            // Mode jeu : la caméra suit légèrement la souris (effet de profondeur)
            const cibleCam = positionJeu();
            cibleCam.x += souris.x * 1.2;
            cibleCam.y -= souris.y * 0.6;
            // approcher() rapproche doucement chaque coordonnée de sa cible : mouvement fluide
            camera.position.x = approcher(camera.position.x, cibleCam.x, 0.05, dt);
            camera.position.y = approcher(camera.position.y, cibleCam.y, 0.05, dt);
            camera.position.z = approcher(camera.position.z, cibleCam.z, 0.05, dt);
            regard.lerp(regardCible, 0.1);
        }

        // Oriente la caméra vers le point regardé
        camera.lookAt(regard);

        // Secousse (coup de feu) appliquée après le lookAt, sinon lookAt l'annulerait
        if (secousse > 0) {
            camera.rotation.z += (Math.random() - 0.5) * secousse * 0.05;
            camera.position.x += (Math.random() - 0.5) * secousse * 0.3;
            camera.position.y += (Math.random() - 0.5) * secousse * 0.3;
            secousse = Math.max(0, secousse - dt * 1.6); // diminue jusqu'à 0 en un peu plus d'une demi-seconde
        }
    }

    /* ---------- Logique de partie ---------- */

    let partie = null; // l'objet créé par nouvellePartie() (voir jeu.js)

    // Accessibilité : décrit la partie en texte pour les lecteurs d'écran.
    function annoncer() {
        if (!partie) return;
        // [...partie.mot] transforme "MOT" en ["M", "O", "T"] ; map() remplace chaque lettre
        // non trouvée par "_" ; join(" ") recolle le tout avec des espaces : "M _ T"
        const visible = [...partie.mot].map((l) => (partie.lettresTrouvees.includes(l) ? l : "_")).join(" ");
        const fin = partie.statut === "gagne" ? " Gagné !" : partie.statut === "perdu" ? ` Perdu, le mot était ${partie.mot}.` : "";
        annonce.textContent = `Mot : ${visible}. Erreurs : ${partie.lettresFausses.length} sur ${ERREURS_MAX}.${fin}`;
    }

    // Bouton JOUER de l'écran titre
    function lancerPartie() {
        if (modeCamera !== "intro") return; // évite un double lancement
        sons.debloquer();       // le son n'est autorisé qu'après une action du joueur
        sons.vent();
        ui.afficherTitre(false);
        lancerVol();
    }

    // Nouvelle partie : on remet tout à zéro (règles, cowboy, décor, interface)
    function recommencer() {
        partie = nouvellePartie(MOTS);
        rapprochement = 0;
        vignette.uniforms.rouge.value = 0;
        cowboy.reinitialiser();
        decor.ambiance("jeu");
        ui.nouveauMot(partie.mot);
        annoncer();
    }

    // Le cœur du jeu : appelée quand le joueur choisit une lettre (clic ou clavier)
    function jouer(lettre) {
        if (!partie) return;
        // jeu.js applique les règles et nous dit ce qui s'est passé
        const resultat = jouerLettre(partie, lettre);
        if (resultat === null) return; // lettre refusée : on n'anime rien

        const erreurs = partie.lettresFausses.length;

        // Réactions selon le résultat : chaque module s'occupe de sa partie
        if (resultat === "bonne") {
            ui.marquerTouche(lettre, "correct"); // touche verte
            ui.revelerLettre(lettre);            // les tuiles se retournent
            sons.bonne();                        // clochette
        } else {
            ui.marquerTouche(lettre, "faux");    // touche rouge puis grise
            ui.perdreBalle(erreurs);             // une balle quitte le barillet
            cowboy.ajouterPartie(erreurs);       // une partie du cowboy apparaît
            sons.mauvaise();                     // coup de revolver
            secousse = 1;                        // la caméra tremble
        }

        if (partie.statut === "gagne") {
            ui.verrouillerClavier();
            cowboy.victoire();
            decor.ambiance("victoire");
            rapprochement = 3;
            // setTimeout : on attend 900 ms (le temps de voir le cowboy sauter) avant la bannière
            setTimeout(() => {
                sons.victoire();
                ui.afficherResultat(true, partie.mot, erreurs);
            }, 900);
        } else if (partie.statut === "perdu") {
            ui.verrouillerClavier();
            ui.revelerTout();                    // on montre le mot en rouge
            cowboy.defaite();
            decor.ambiance("defaite");           // le ciel devient rouge
            vignette.uniforms.rouge.value = 1;
            rapprochement = 2;
            sons.defaite();
            setTimeout(() => ui.afficherResultat(false, partie.mot, erreurs), 1600);
        } else {
            // Partie en cours : le cowboy s'inquiète à partir de 4 erreurs
            cowboy.humeur(erreurs >= 4 ? "inquiet" : "normal");
        }

        annoncer();
    }

    /* ---------- Musique : démarre à la première action (règle des navigateurs) ---------- */

    // Les navigateurs interdisent de jouer du son avant une action de l'utilisateur.
    // On démarre donc la musique au premier clic ou à la première touche, puis on retire
    // ces écouteurs (removeEventListener) : ils ne servent qu'une fois.
    function premiereAction() {
        sons.demarrerMusique();
        window.removeEventListener("pointerdown", premiereAction);
        window.removeEventListener("keydown", premiereAction);
    }
    window.addEventListener("pointerdown", premiereAction);
    window.addEventListener("keydown", premiereAction);

    /* ---------- Clavier physique ---------- */

    // "é" → "E" : normalize("NFD") sépare la lettre de son accent, puis on supprime les accents
    // (les caractères Unicode de U+0300 à U+036F sont les accents "combinants").
    function lettreSansAccent(texte) {
        return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    }

    window.addEventListener("keydown", (e) => {
        // On ignore les raccourcis clavier (Ctrl+R, Alt+Tab…)
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        sons.debloquer();

        // Entrée ou Espace : lancer le jeu depuis le titre, ou rejouer en fin de partie
        if (e.key === "Enter" || e.key === " ") {
            if (modeCamera === "intro") lancerPartie();
            else if (partie && partie.statut !== "en_cours") {
                sons.bouton();
                recommencer();
            }
            e.preventDefault(); // empêche l'Espace de faire défiler la page
            return;
        }

        const lettre = lettreSansAccent(e.key);
        // !e.repeat : on ignore la répétition automatique quand la touche reste enfoncée
        if (/^[A-Z]$/.test(lettre) && modeCamera === "jeu" && !e.repeat) {
            ui.appuyerTouche(lettre); // la touche 3D s'enfonce, puis jouer() est appelée
        }
    });

    /* ---------- Taille de l'écran ---------- */

    // Recalcule tout quand la fenêtre change de taille (ou quand on tourne le téléphone)
    function redimensionner() {
        const l = innerWidth;
        const h = innerHeight;
        camera.aspect = l / h;
        camera.fov = camera.aspect < 1 ? 58 : 45; // en portrait, on élargit le champ de vision
        camera.updateProjectionMatrix();          // obligatoire après avoir changé aspect ou fov
        // La densité de pixels peut changer (zoom, fenêtre déplacée sur un autre écran)
        const densite = Math.min(window.devicePixelRatio, mobile ? 1.5 : 2);
        renderer.setPixelRatio(densite);
        composer.setPixelRatio(densite);
        renderer.setSize(l, h);
        composer.setSize(l, h);
        bloom.resolution.set(l, h);
        bloom.strength = Math.min(l, h) < 600 ? 0.3 : 0.55; // sur petit écran, le halo s'étale trop
        ui.mettreEnPage(); // l'interface 3D se replace selon la nouvelle taille
    }
    window.addEventListener("resize", redimensionner);
    redimensionner();

    /* ---------- Boucle principale ---------- */

    // L'horloge mesure le temps écoulé entre deux images
    const horloge = new THREE.Clock();

    // Appelée environ 60 fois par seconde par le navigateur
    function boucle() {
        // dt = secondes écoulées depuis l'image précédente (≈ 0.016).
        // On le limite à 0.05 : si l'onglet a été mis en pause, rien ne "saute".
        const dt = Math.min(horloge.getDelta(), 0.05);
        const t = horloge.elapsedTime; // temps total depuis le début

        // 1. Tout le monde se met à jour…
        decor.mettreAJour(t, dt);
        cowboy.mettreAJour(t, dt);
        ui.mettreAJour(t, dt);
        animerCamera(t, dt);
        // "?." (chaînage optionnel) : si partie est null, on n'essaie pas de lire .statut
        vignette.uniforms.rouge.value = approcher(vignette.uniforms.rouge.value, partie?.statut === "perdu" ? 1 : 0, 0.03, dt);

        // 2. … puis on dessine l'image (scène + effets)
        composer.render();
    }

    // Première image avant d'enlever l'écran de chargement
    camera.position.copy(positionIntro(angleIntro));
    regard.set(0, 3, -2);
    camera.lookAt(regard);
    progression(100, "En selle !");
    renderer.setAnimationLoop(boucle); // lance la boucle (équivalent de requestAnimationFrame en continu)
    ui.afficherTitre(true);

    // L'écran de chargement disparaît en fondu (transition CSS sur la classe "cache")
    setTimeout(() => loader.classList.add("cache"), 350);

    // Pour déboguer dans la console du navigateur : window.motMystere.partie affiche la partie en cours
    window.motMystere = { scene, camera, renderer, get partie() { return partie; } };
}

// On lance tout. Si une erreur survient (ex : WebGL indisponible), on l'affiche sur l'écran de chargement.
demarrerApplication().catch((erreur) => {
    console.error(erreur);
    texteChargement.textContent = "Impossible de lancer la 3D sur cet appareil (WebGL indisponible ?).";
});
