/*
 * scene3d.js — le pendu en 3D avec Three.js
 *
 * Vocabulaire Three.js :
 * - Scene    : le "monde" qui contient tous les objets
 * - Camera   : l'œil qui regarde la scène
 * - Renderer : dessine ce que voit la caméra dans un <canvas>
 * - Mesh     : un objet visible = une forme (Geometry) + une matière (Material)
 * - Group    : une boîte invisible qui regroupe des objets pour les déplacer ensemble
 *
 * Ce fichier exporte creerScene(), qui renvoie les commandes utilisées par main.js :
 * ajouterPartie(), bonneLettre(), humeur(), victoire(), defaite(), reinitialiser().
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Les bases de Three.js : scène, caméra, renderer, lumières, Mesh = géométrie + matériau.
 * - Construire un personnage avec des formes simples (sphères, capsules) groupées (Group).
 * - Les pivots : faire tourner un bras autour de l'épaule en le plaçant dans un groupe décalé.
 * - Le style cartoon : MeshToonMaterial avec un dégradé de seulement 3 tons.
 * - Les ombres portées (castShadow / receiveShadow) et leur réglage.
 * - Une animation « ressort » codée à la main (vitesse + amortissement) pour un effet vivant.
 * - Une petite physique pour les confettis : gravité, frottement de l'air, durée de vie.
 * - OrbitControls pour tourner autour de la scène, avec des limites.
 * - Exposer une API claire (ajouterPartie, victoire…) pour que main.js n'ait pas à connaître la 3D.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const COULEURS = {
    bois: 0x9a6236,
    boisFonce: 0x6e4222,
    corde: 0xd09a5a,
    rose: 0xff5c93,
    peau: 0xffd27a,
    violetFonce: 0x34205f,
    ile: 0xe6ddff,
    ileDessous: 0x8e7ae0,
};

const CONFETTIS = [0xff5c93, 0x3fd0ff, 0xffd95a, 0x6c4cff, 0x3fcf8e];

/* ---------- Style "cartoon" ---------- */

// Un dégradé de 3 tons seulement : l'ombre est découpée en aplats, comme un dessin animé
const DEGRADE_CARTOON = new THREE.DataTexture(new Uint8Array([80, 170, 255]), 3, 1, THREE.RedFormat);
DEGRADE_CARTOON.minFilter = THREE.NearestFilter;
DEGRADE_CARTOON.magFilter = THREE.NearestFilter;
DEGRADE_CARTOON.needsUpdate = true;

function matiere(couleur) {
    return new THREE.MeshToonMaterial({ color: couleur, gradientMap: DEGRADE_CARTOON });
}

// Petit raccourci : crée un objet qui projette et reçoit des ombres
function objet(geometrie, couleur) {
    const mesh = new THREE.Mesh(geometrie, matiere(couleur));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

export function creerScene(conteneur) {

    /* ---------- 1. Renderer, scène, caméra ---------- */

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha : fond transparent
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    conteneur.prepend(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(2, 3.2, 12);

    // OrbitControls : faire glisser la souris (ou le doigt) pour tourner autour de la scène
    const controles = new OrbitControls(camera, renderer.domElement);
    controles.target.set(0, 2.2, 0);
    controles.enableDamping = true; // mouvement amorti, plus doux
    controles.enablePan = false;
    controles.enableZoom = false;
    controles.minAzimuthAngle = -1.1; // limites pour ne pas passer derrière le décor
    controles.maxAzimuthAngle = 1.1;
    controles.minPolarAngle = 1.0;
    controles.maxPolarAngle = 1.62;

    // Tout le décor est dans "monde" : on le secoue en cas d'erreur
    const monde = new THREE.Group();
    scene.add(monde);

    /* ---------- 2. Lumières ---------- */

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b4fd8, 1.6));

    const soleil = new THREE.DirectionalLight(0xffffff, 2.4);
    soleil.position.set(4, 9, 6);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(1024, 1024);
    Object.assign(soleil.shadow.camera, { left: -6, right: 6, top: 8, bottom: -2 });
    soleil.shadow.bias = -0.001;
    scene.add(soleil);

    const contreJour = new THREE.DirectionalLight(COULEURS.rose, 1.4); // liseré rose à l'arrière
    contreJour.position.set(-5, 4, -5);
    scene.add(contreJour);

    const lumiereDefaite = new THREE.PointLight(0xff2244, 0, 0, 0); // s'allume en cas de défaite
    lumiereDefaite.position.set(0.9, 4, 3);
    scene.add(lumiereDefaite);

    /* ---------- 3. Décor : île flottante et potence en bois ---------- */

    const ile = objet(new THREE.CylinderGeometry(3.4, 3.6, 0.5, 48), COULEURS.ile);
    ile.position.y = -0.25;
    monde.add(ile);

    const dessousIle = objet(new THREE.ConeGeometry(3.5, 1.8, 48), COULEURS.ileDessous);
    dessousIle.rotation.x = Math.PI; // pointe vers le bas
    dessousIle.position.y = -1.4;
    monde.add(dessousIle);

    const potence = new THREE.Group();
    const socle = objet(new THREE.BoxGeometry(2.6, 0.3, 1.2), COULEURS.boisFonce);
    socle.position.set(-0.3, 0.15, 0);
    const poteau = objet(new THREE.BoxGeometry(0.32, 5.2, 0.32), COULEURS.bois);
    poteau.position.set(-1.3, 2.9, 0);
    const poutre = objet(new THREE.BoxGeometry(2.7, 0.3, 0.32), COULEURS.bois);
    poutre.position.set(-0.1, 5.35, 0);
    const renfort = objet(new THREE.BoxGeometry(0.2, 1.3, 0.2), COULEURS.boisFonce);
    renfort.position.set(-0.85, 4.75, 0);
    renfort.rotation.z = -Math.PI / 4;
    potence.add(socle, poteau, poutre, renfort);
    monde.add(potence);

    // Cristaux qui flottent autour de l'île
    const cristaux = [];
    [[-2.6, 1.6, 1.2, 0x3fd0ff], [2.7, 2.6, -0.8, 0xffd95a], [-2.2, 4.4, -1.5, COULEURS.rose], [2.4, 0.9, 1.6, 0x6c4cff]]
        .forEach(([x, y, z, couleur], i) => {
            const cristal = objet(new THREE.OctahedronGeometry(0.28), couleur);
            cristal.position.set(x, y, z);
            cristal.userData = { baseY: y, phase: i * 1.7 };
            cristaux.push(cristal);
            monde.add(cristal);
        });

    // Poussière d'étoiles colorées
    const nbPoints = 160;
    const positions = new Float32Array(nbPoints * 3);
    const couleursPoints = new Float32Array(nbPoints * 3);
    const couleur = new THREE.Color();
    for (let i = 0; i < nbPoints; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 22;
        positions[i * 3 + 1] = Math.random() * 12 - 3;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 4;
        couleur.setHex(CONFETTIS[i % CONFETTIS.length]).lerp(new THREE.Color(0xffffff), 0.5);
        couleur.toArray(couleursPoints, i * 3);
    }
    const geometriePoints = new THREE.BufferGeometry();
    geometriePoints.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometriePoints.setAttribute("color", new THREE.BufferAttribute(couleursPoints, 3));
    const poussiere = new THREE.Points(geometriePoints, new THREE.PointsMaterial({
        size: 0.07, vertexColors: true, transparent: true, opacity: 0.8,
    }));
    scene.add(poussiere);

    /* ---------- 4. Le personnage ---------- */

    // "pendu" est accroché sous la poutre : le faire tourner = le faire se balancer
    const POINT_ACCROCHE_Y = 5.2;
    const pendu = new THREE.Group();
    pendu.position.set(0.9, POINT_ACCROCHE_Y, 0);
    monde.add(pendu);

    const corde = objet(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 8), COULEURS.corde);
    corde.position.y = -0.45;
    pendu.add(corde);

    // Tête et visage
    const tete = new THREE.Group();
    tete.position.y = -1.35;
    tete.add(objet(new THREE.SphereGeometry(0.45, 32, 24), COULEURS.peau));

    const yeux = new THREE.Group();
    for (const x of [-0.16, 0.16]) {
        const oeil = objet(new THREE.SphereGeometry(0.065, 12, 8), COULEURS.violetFonce);
        oeil.position.set(x, 0.06, 0.41);
        yeux.add(oeil);
    }

    const yeuxX = new THREE.Group(); // yeux en croix pour la défaite
    for (const x of [-0.16, 0.16]) {
        for (const angle of [Math.PI / 4, -Math.PI / 4]) {
            const trait = objet(new THREE.BoxGeometry(0.17, 0.04, 0.04), COULEURS.violetFonce);
            trait.position.set(x, 0.06, 0.42);
            trait.rotation.z = angle;
            yeuxX.add(trait);
        }
    }

    for (const x of [-0.28, 0.28]) {
        const joue = objet(new THREE.SphereGeometry(0.08, 12, 8), COULEURS.rose);
        joue.position.set(x, -0.1, 0.35);
        joue.scale.set(1, 0.6, 0.4);
        tete.add(joue);
    }

    // Bouche : un demi-anneau (retourné = sourire, à l'endroit = bouche triste)
    const bouche = objet(new THREE.TorusGeometry(0.13, 0.03, 8, 20, Math.PI), COULEURS.violetFonce);
    bouche.position.set(0, -0.1, 0.41);
    const boucheO = objet(new THREE.TorusGeometry(0.06, 0.025, 8, 16), COULEURS.violetFonce);
    boucheO.position.set(0, -0.15, 0.42);

    tete.add(yeux, yeuxX, bouche, boucheO);
    pendu.add(tete);

    // Corps et membres (les membres tournent autour d'un "pivot" : épaule ou hanche)
    const corps = objet(new THREE.CapsuleGeometry(0.16, 0.8, 6, 16), COULEURS.rose);
    corps.position.y = -2.41;
    pendu.add(corps);

    function membre(x, y, rayon, longueur, angle) {
        const pivot = new THREE.Group();
        pivot.position.set(x, y, 0);
        pivot.rotation.z = angle;
        const mesh = objet(new THREE.CapsuleGeometry(rayon, longueur, 6, 12), COULEURS.rose);
        mesh.position.y = -(longueur / 2 + rayon);
        pivot.add(mesh);
        pivot.userData.angleDepart = angle;
        pendu.add(pivot);
        return pivot;
    }

    const brasGauche = membre(-0.12, -2.05, 0.09, 0.55, -0.6);
    const brasDroit = membre(0.12, -2.05, 0.09, 0.55, 0.6);
    const jambeGauche = membre(-0.08, -2.9, 0.1, 0.65, -0.25);
    const jambeDroite = membre(0.08, -2.9, 0.1, 0.65, 0.25);
    const HAUTEUR_PIEDS = 3.76; // distance entre le point d'accroche et les pieds

    // Ordre d'apparition : erreur 1 = tête … erreur 6 = jambe droite
    const parties = [tete, corps, brasGauche, brasDroit, jambeGauche, jambeDroite];

    /* ---------- 5. Confettis et étincelles ---------- */

    const geometrieConfetti = new THREE.PlaneGeometry(0.12, 0.2);
    const confettis = [];

    function lancerConfettis(nombre, origine, couleurs, force) {
        for (let i = 0; i < nombre; i++) {
            const materiau = new THREE.MeshBasicMaterial({
                color: couleurs[i % couleurs.length], side: THREE.DoubleSide, transparent: true,
            });
            const confetti = new THREE.Mesh(geometrieConfetti, materiau);
            confetti.position.copy(origine);
            confetti.userData = {
                vitesse: new THREE.Vector3(
                    (Math.random() - 0.5) * force,
                    Math.random() * force + force * 0.6,
                    (Math.random() - 0.5) * force,
                ),
                rotation: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
                vie: 1,
            };
            scene.add(confetti);
            confettis.push(confetti);
        }
    }

    function animerConfettis(dt) {
        for (let i = confettis.length - 1; i >= 0; i--) {
            const c = confettis[i];
            const { vitesse, rotation } = c.userData;
            vitesse.y -= 9 * dt;       // gravité
            vitesse.multiplyScalar(0.985); // frottement de l'air
            c.position.addScaledVector(vitesse, dt);
            c.rotation.x += rotation.x * dt;
            c.rotation.y += rotation.y * dt;
            c.userData.vie -= dt * 0.35;
            c.material.opacity = Math.min(1, c.userData.vie * 2);

            if (c.userData.vie <= 0) {
                scene.remove(c);
                c.material.dispose();
                confettis.splice(i, 1);
            }
        }
    }

    /* ---------- 6. État de l'animation ---------- */

    let etat = "jeu";        // "jeu", "victoire" ou "defaite"
    let humeurActuelle = "normal";
    let secousse = 0;        // intensité du tremblement après une erreur
    let pulsation = 0;       // les cristaux grossissent après une bonne lettre
    let tempsEtat = 0;

    // Chaque partie a une valeur "ressort" : elle rebondit un peu en apparaissant
    for (const partie of parties) {
        partie.userData.ressort = { valeur: 0, vitesse: 0, cible: 0 };
    }

    function appliquerHumeur(nom) {
        humeurActuelle = nom;
        yeux.visible = nom !== "perdu";
        yeuxX.visible = nom === "perdu";
        boucheO.visible = nom === "inquiet";
        bouche.visible = nom !== "inquiet";
        bouche.rotation.z = nom === "perdu" ? 0 : Math.PI; // triste ou sourire
        bouche.position.y = nom === "perdu" ? -0.22 : -0.1;
        bouche.scale.setScalar(nom === "joyeux" ? 1.35 : 1);
    }

    /* ---------- 7. Boucle d'animation (≈ 60 fois par seconde) ---------- */

    const horloge = new THREE.Clock();

    function boucle() {
        const dt = Math.min(horloge.getDelta(), 0.05);
        const t = horloge.elapsedTime;
        tempsEtat += dt;

        // Apparition des parties avec rebond
        for (const partie of parties) {
            const r = partie.userData.ressort;
            r.vitesse += (r.cible - r.valeur) * 0.18;
            r.vitesse *= 0.72;
            r.valeur += r.vitesse;
            partie.scale.setScalar(Math.max(r.valeur, 0.0001));
            partie.visible = r.valeur > 0.01;
        }

        // Décor vivant
        cristaux.forEach((cristal) => {
            cristal.rotation.y += dt * (1 + pulsation * 6);
            cristal.position.y = cristal.userData.baseY + Math.sin(t * 1.5 + cristal.userData.phase) * 0.15;
            cristal.scale.setScalar(1 + pulsation * 0.6);
        });
        pulsation = Math.max(0, pulsation - dt * 1.5);
        poussiere.rotation.y = t * 0.02;

        // Comportement du personnage selon l'état
        if (etat === "jeu") {
            pendu.rotation.z = Math.sin(t * 1.3) * 0.04;
            tete.position.x = humeurActuelle === "inquiet" ? Math.sin(t * 40) * 0.01 : 0;
        }

        if (etat === "defaite") {
            pendu.rotation.z = Math.sin(t * 1.1) * 0.12;
            tete.rotation.z += (0.4 - tete.rotation.z) * 0.05;  // la tête penche doucement
            tete.rotation.x += (0.35 - tete.rotation.x) * 0.05;
            lumiereDefaite.intensity += (2.5 - lumiereDefaite.intensity) * 0.03;
        }

        if (etat === "victoire") {
            // Il descend au sol, puis saute de joie, bras en l'air
            pendu.rotation.z *= 0.9;
            const sol = HAUTEUR_PIEDS + 0.02;
            const saut = tempsEtat > 0.6 ? Math.abs(Math.sin((tempsEtat - 0.6) * 5)) * 0.8 : 0;
            pendu.position.y += (sol + saut - pendu.position.y) * 0.25;
            brasGauche.rotation.z += (-2.5 - brasGauche.rotation.z) * 0.1;
            brasDroit.rotation.z += (2.5 - brasDroit.rotation.z) * 0.1;
        }

        // Secousse après une erreur
        monde.position.x = (Math.random() - 0.5) * secousse;
        monde.position.y = (Math.random() - 0.5) * secousse * 0.5;
        secousse = Math.max(0, secousse - dt * 1.2);

        animerConfettis(dt);
        controles.update();
        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(boucle);

    /* ---------- 8. Adaptation à la taille du conteneur ---------- */

    function redimensionner() {
        const largeur = conteneur.clientWidth;
        const hauteur = conteneur.clientHeight;
        renderer.setSize(largeur, hauteur, false);
        camera.aspect = largeur / hauteur;
        // Écran étroit : on recule la caméra pour tout voir
        camera.fov = camera.aspect < 1 ? 45 : 35;
        camera.updateProjectionMatrix();
    }

    new ResizeObserver(redimensionner).observe(conteneur);
    redimensionner();

    /* ---------- 9. Commandes utilisées par main.js ---------- */

    function reinitialiser() {
        etat = "jeu";
        tempsEtat = 0;
        for (const partie of parties) partie.userData.ressort.cible = 0;
        corde.visible = true;
        pendu.position.y = POINT_ACCROCHE_Y;
        pendu.rotation.set(0, 0, 0);
        tete.rotation.set(0, 0, 0);
        for (const m of [brasGauche, brasDroit, jambeGauche, jambeDroite]) m.rotation.z = m.userData.angleDepart;
        lumiereDefaite.intensity = 0;
        appliquerHumeur("normal");
    }

    reinitialiser();

    return {
        reinitialiser,

        ajouterPartie(numero) {
            const partie = parties[numero - 1];
            if (partie) {
                partie.userData.ressort.cible = 1;
                partie.userData.ressort.vitesse = 0.25; // petit élan pour le rebond
            }
            secousse = 0.35;
        },

        bonneLettre() {
            pulsation = 1;
            const tetePosition = new THREE.Vector3();
            tete.getWorldPosition(tetePosition);
            lancerConfettis(14, tetePosition.add(new THREE.Vector3(0, 0.8, 0)), [0x3fcf8e, 0xffd95a], 2.2);
        },

        humeur(nom) {
            if (etat === "jeu") appliquerHumeur(nom);
        },

        victoire() {
            etat = "victoire";
            tempsEtat = 0;
            corde.visible = false;
            for (const partie of parties) partie.userData.ressort.cible = 1; // le personnage apparaît en entier
            appliquerHumeur("joyeux");
            lancerConfettis(160, new THREE.Vector3(0.9, 3, 0), CONFETTIS, 5);
        },

        defaite() {
            etat = "defaite";
            tempsEtat = 0;
            appliquerHumeur("perdu");
        },
    };
}
