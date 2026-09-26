/*
 * decor.js — le Far West au coucher du soleil
 * Ciel dégradé (shader), dunes, mesas, soleil, saloon, cactus, tonneaux,
 * château d'eau, virevoltant, vautours et poussière.
 */

import * as THREE from "three";
import { matiere, objet, contour, approcher } from "./outils.js";
import { textureTexte, POLICE_TITRE } from "./textures.js";

const COULEURS = {
    sable: 0xe3a35f,
    sableFonce: 0xc9854a,
    mesa: 0xb4583c,
    mesaFonce: 0x8e3f2c,
    cactus: 0x5a8f3c,
    bois: 0x9a6236,
    boisFonce: 0x5e3a1c,
    boisClair: 0xc48a52,
};

// Les trois ambiances du ciel : [haut, horizon, bas]
const AMBIANCES = {
    jeu:      { ciel: [0x2a1850, 0xff7b3a, 0xffc27a], soleil: 0xffb070, brume: 0xf0955a, lumiere: 1 },
    victoire: { ciel: [0x3b3a9a, 0xffb347, 0xffe3a3], soleil: 0xffd79a, brume: 0xffc27a, lumiere: 1.25 },
    defaite:  { ciel: [0x14060f, 0xb3262a, 0x5a1c16], soleil: 0xff4a3a, brume: 0x7a2a22, lumiere: 0.7 },
};

export function creerDecor(scene, { qualite = "haute" } = {}) {
    const monde = new THREE.Group();
    scene.add(monde);

    /* ---------- Ciel : une grande sphère vue de l'intérieur, colorée par un shader ---------- */

    const uniformes = {
        haut: { value: new THREE.Color(AMBIANCES.jeu.ciel[0]) },
        milieu: { value: new THREE.Color(AMBIANCES.jeu.ciel[1]) },
        bas: { value: new THREE.Color(AMBIANCES.jeu.ciel[2]) },
    };

    const ciel = new THREE.Mesh(
        new THREE.SphereGeometry(400, 32, 16),
        new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            uniforms: uniformes,
            // Le vertex shader transmet la direction de chaque point du ciel
            vertexShader: /* glsl */ `
                varying vec3 vDirection;
                void main() {
                    vDirection = normalize(position);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }`,
            // Le fragment shader choisit la couleur selon la hauteur (y)
            fragmentShader: /* glsl */ `
                uniform vec3 haut;
                uniform vec3 milieu;
                uniform vec3 bas;
                varying vec3 vDirection;
                void main() {
                    float y = vDirection.y;
                    vec3 couleur = y > 0.0
                        ? mix(milieu, haut, smoothstep(0.0, 0.45, y))
                        : mix(milieu, bas, smoothstep(0.0, -0.15, y));
                    gl_FragColor = vec4(couleur, 1.0);
                    #include <colorspace_fragment>
                }`,
        }),
    );
    scene.add(ciel);

    // Étoiles (visibles surtout en haut du ciel)
    const nbEtoiles = 500;
    const posEtoiles = new Float32Array(nbEtoiles * 3);
    for (let i = 0; i < nbEtoiles; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.35; // seulement le haut du ciel
        posEtoiles.set([
            Math.sin(phi) * Math.cos(theta) * 350,
            Math.cos(phi) * 350,
            Math.sin(phi) * Math.sin(theta) * 350,
        ], i * 3);
    }
    const geoEtoiles = new THREE.BufferGeometry();
    geoEtoiles.setAttribute("position", new THREE.BufferAttribute(posEtoiles, 3));
    const etoiles = new THREE.Points(geoEtoiles, new THREE.PointsMaterial({
        color: 0xfff1d6, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false,
    }));
    scene.add(etoiles);

    // Soleil couchant (couleur très claire : le "bloom" le fera briller)
    const soleil = new THREE.Mesh(
        new THREE.CircleGeometry(16, 48),
        // Couleur multipliée au-delà de 1 : elle dépasse le seuil du bloom et rayonne
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe2a8).multiplyScalar(2.2), fog: false, toneMapped: false }),
    );
    soleil.position.set(-60, 14, -260);
    soleil.lookAt(0, 14, 0);
    scene.add(soleil);

    const halo = new THREE.Mesh(
        new THREE.CircleGeometry(40, 48),
        new THREE.MeshBasicMaterial({ color: 0xff9a4a, transparent: true, opacity: 0.25, fog: false, depthWrite: false }),
    );
    halo.position.copy(soleil.position).add(new THREE.Vector3(0, 0, -1));
    halo.lookAt(0, 14, 0);
    scene.add(halo);

    scene.fog = new THREE.Fog(AMBIANCES.jeu.brume, 45, 230);

    /* ---------- Lumières ---------- */

    const hemisphere = new THREE.HemisphereLight(0xffd6a0, 0x7a4a2a, 1.3);
    scene.add(hemisphere);

    const lumiereSoleil = new THREE.DirectionalLight(AMBIANCES.jeu.soleil, 2.8);
    lumiereSoleil.position.set(-18, 16, 10);
    lumiereSoleil.castShadow = true;
    const tailleOmbre = qualite === "haute" ? 2048 : 1024;
    lumiereSoleil.shadow.mapSize.set(tailleOmbre, tailleOmbre);
    Object.assign(lumiereSoleil.shadow.camera, { left: -22, right: 22, top: 18, bottom: -10, near: 1, far: 70 });
    lumiereSoleil.shadow.bias = -0.0008;
    scene.add(lumiereSoleil);

    /* ---------- Sol : un grand plan déformé en dunes ---------- */

    const geoSol = new THREE.PlaneGeometry(500, 500, 160, 160);
    geoSol.rotateX(-Math.PI / 2);
    const positions = geoSol.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const distance = Math.hypot(x, z);
        // Plat au centre (là où l'on joue), dunes de plus en plus hautes au loin
        const force = THREE.MathUtils.smoothstep(distance, 18, 70);
        const dune = Math.sin(x * 0.045) * Math.cos(z * 0.05) * 4 + Math.sin(x * 0.13 + z * 0.09) * 1.2;
        positions.setY(i, dune * force);
    }
    geoSol.computeVertexNormals();
    const sol = new THREE.Mesh(geoSol, matiere(COULEURS.sable));
    sol.receiveShadow = true;
    monde.add(sol);

    // Chemin de terre plus sombre vers le saloon
    const chemin = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 60),
        matiere(COULEURS.sableFonce, { transparent: true, opacity: 0.6 }),
    );
    chemin.rotation.x = -Math.PI / 2;
    chemin.rotation.z = 0.5;
    chemin.position.set(6, 0.02, -12);
    chemin.receiveShadow = true;
    monde.add(chemin);

    /* ---------- Mesas au loin ---------- */

    const mesas = [
        [-110, -170, 26, 32, 38], [-60, -200, 18, 22, 52], [30, -210, 30, 36, 44],
        [95, -180, 20, 26, 34], [150, -140, 16, 20, 28], [-170, -120, 22, 28, 30],
        [60, -150, 10, 13, 22],
    ];
    for (const [x, z, rHaut, rBas, h] of mesas) {
        const mesa = new THREE.Mesh(
            new THREE.CylinderGeometry(rHaut, rBas, h, 7, 3),
            new THREE.MeshLambertMaterial({ color: COULEURS.mesa, flatShading: true }),
        );
        mesa.position.set(x, h / 2 - 2, z);
        mesa.rotation.y = Math.random() * Math.PI;
        monde.add(mesa);

        // Bande plus sombre = strates de roche
        const strate = new THREE.Mesh(
            new THREE.CylinderGeometry(rBas * 0.97, rBas * 1.01, h * 0.25, 7),
            new THREE.MeshLambertMaterial({ color: COULEURS.mesaFonce, flatShading: true }),
        );
        strate.position.set(x, h * 0.18, z);
        strate.rotation.y = mesa.rotation.y;
        monde.add(strate);
    }

    /* ---------- Cactus ---------- */

    function cactus(x, z, echelle = 1, rotation = 0) {
        const groupe = new THREE.Group();
        const tronc = objet(new THREE.CapsuleGeometry(0.42, 3.2, 6, 12), COULEURS.cactus);
        tronc.position.y = 2;
        groupe.add(tronc);

        for (const [cote, hauteur, longueur] of [[-1, 1.8, 1.1], [1, 2.4, 0.9]]) {
            const coude = objet(new THREE.CapsuleGeometry(0.26, 0.7, 6, 10), COULEURS.cactus);
            coude.rotation.z = Math.PI / 2;
            coude.position.set(cote * 0.75, hauteur, 0);
            const bras = objet(new THREE.CapsuleGeometry(0.26, longueur, 6, 10), COULEURS.cactus);
            bras.position.set(cote * 1.12, hauteur + longueur / 2 + 0.1, 0);
            groupe.add(coude, bras);
        }

        groupe.position.set(x, 0, z);
        groupe.scale.setScalar(echelle);
        groupe.rotation.y = rotation;
        monde.add(groupe);
    }

    cactus(-11, -6, 1.1, 0.4);
    cactus(-17, 3, 0.8, 1.2);
    cactus(14, -16, 1.3, -0.3);
    cactus(-25, -22, 1.5, 0.8);
    cactus(22, 2, 0.9, 2.1);
    cactus(-6, -30, 1.2, 0.2);
    cactus(34, -30, 1.6, 1);

    // Rochers
    for (const [x, z, s] of [[-8, 4, 0.9], [9, 5, 0.6], [-14, -12, 1.4], [18, -8, 1.1], [3, -18, 0.8]]) {
        const rocher = objet(new THREE.DodecahedronGeometry(s, 0), 0xa0613e);
        rocher.position.set(x, s * 0.5, z);
        rocher.rotation.set(Math.random(), Math.random(), Math.random());
        rocher.material.flatShading = true;
        monde.add(rocher);
    }

    /* ---------- Saloon ---------- */

    const saloon = new THREE.Group();

    const corps = contour(objet(new THREE.BoxGeometry(8, 5, 6), COULEURS.bois));
    corps.position.y = 2.5;
    const facade = contour(objet(new THREE.BoxGeometry(8.8, 7.2, 0.4), COULEURS.boisClair));
    facade.position.set(0, 3.6, 3.1);
    const toit = contour(objet(new THREE.BoxGeometry(8.8, 0.25, 2.2), COULEURS.boisFonce));
    toit.position.set(0, 3.4, 4.3);
    const plancher = contour(objet(new THREE.BoxGeometry(8.8, 0.3, 2.2), COULEURS.boisFonce));
    plancher.position.set(0, 0.15, 4.3);
    saloon.add(corps, facade, toit, plancher);

    for (const x of [-4.1, -1.4, 1.4, 4.1]) {
        const poteau = objet(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), COULEURS.boisFonce);
        poteau.position.set(x, 1.8, 5.2);
        saloon.add(poteau);
    }

    // Enseigne
    const enseigne = new THREE.Mesh(
        new THREE.PlaneGeometry(6.4, 1.4),
        new THREE.MeshBasicMaterial({
            map: textureTexte("SALOON", {
                largeur: 6.4, hauteur: 1.4, fond: "bois", couleur: "#ffe2a8", contour: "#5a2a0a",
                bois: { clair: "#6b3e1f", fonce: "#4a2810" },
            }),
        }),
    );
    enseigne.position.set(0, 5.9, 3.32);
    saloon.add(enseigne);

    // Fenêtres éclairées (couleur vive : le bloom les fait rayonner)
    const lumiereFenetre = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc46b).multiplyScalar(1.8), toneMapped: false });
    for (const x of [-2.9, 2.9]) {
        const fenetre = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.3), lumiereFenetre);
        fenetre.position.set(x, 2, 3.31);
        const cadre = objet(new THREE.BoxGeometry(1.7, 1.5, 0.08), COULEURS.boisFonce);
        cadre.position.set(x, 2, 3.29);
        saloon.add(cadre, fenetre);
    }
    for (const x of [-2.9, 0, 2.9]) {
        const fenetreHaut = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1), lumiereFenetre);
        fenetreHaut.position.set(x, 4.6, 3.31);
        saloon.add(fenetreHaut);
    }

    // Portes battantes
    const portes = [];
    for (const cote of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(cote * 0.9, 1.6, 3.4);
        const porte = objet(new THREE.BoxGeometry(0.85, 1.1, 0.08), COULEURS.boisClair);
        porte.position.x = -cote * 0.43;
        pivot.add(porte);
        saloon.add(pivot);
        portes.push({ pivot, cote });
    }
    const interieur = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), new THREE.MeshBasicMaterial({ color: 0x3a1a08 }));
    interieur.position.set(0, 1.3, 3.305);
    saloon.add(interieur);

    const lampe = new THREE.PointLight(0xffa94d, 8, 12, 2);
    lampe.position.set(0, 2.2, 5);
    saloon.add(lampe);

    saloon.position.set(12, 0, -10);
    saloon.rotation.y = -0.55;
    monde.add(saloon);

    /* ---------- Château d'eau ---------- */

    const chateau = new THREE.Group();
    for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
        const pied = objet(new THREE.BoxGeometry(0.25, 6, 0.25), COULEURS.boisFonce);
        pied.position.set(x, 3, z);
        chateau.add(pied);
    }
    const reservoir = contour(objet(new THREE.CylinderGeometry(2, 2, 2.8, 20), COULEURS.bois));
    reservoir.position.y = 7.4;
    const chapeau = objet(new THREE.ConeGeometry(2.3, 1.4, 20), COULEURS.boisFonce);
    chapeau.position.y = 9.5;
    chateau.add(reservoir, chapeau);
    chateau.position.set(-16, 0, -16);
    monde.add(chateau);

    /* ---------- Tonneaux et clôture près de la potence ---------- */

    function tonneau(x, z, couche = false) {
        const groupe = new THREE.Group();
        const fut = contour(objet(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 16), COULEURS.bois), 0x2a1408, 40);
        groupe.add(fut);
        for (const y of [-0.4, 0.4]) {
            const cercle = objet(new THREE.TorusGeometry(0.56, 0.04, 6, 24), 0x3a3a3a);
            cercle.rotation.x = Math.PI / 2;
            cercle.position.y = y;
            groupe.add(cercle);
        }
        groupe.position.set(x, couche ? 0.55 : 0.65, z);
        if (couche) groupe.rotation.z = Math.PI / 2;
        monde.add(groupe);
    }
    tonneau(-5.2, 1.5);
    tonneau(-6.2, 0.6);
    tonneau(-5.6, 2.8, true);
    tonneau(5.8, -2.5);

    for (let i = 0; i < 7; i++) {
        const x = -9 + i * 2.2;
        const piquet = objet(new THREE.BoxGeometry(0.18, 1.4, 0.18), COULEURS.boisFonce);
        piquet.position.set(x, 0.7, -5);
        monde.add(piquet);
        if (i < 6) {
            for (const y of [0.5, 1.1]) {
                const traverse = objet(new THREE.BoxGeometry(2.3, 0.12, 0.08), COULEURS.bois);
                traverse.position.set(x + 1.1, y, -5);
                traverse.rotation.z = (Math.random() - 0.5) * 0.08;
                monde.add(traverse);
            }
        }
    }

    /* ---------- Virevoltant (boule d'herbes sèches qui roule) ---------- */

    const virevoltant = new THREE.Group();
    const boule1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), matiere(0xa4773f, { wireframe: true }));
    const boule2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), matiere(0x8a5f2f, { wireframe: true }));
    boule2.rotation.set(0.5, 0.3, 0.2);
    virevoltant.add(boule1, boule2);
    virevoltant.position.set(-40, 0.75, 6);
    monde.add(virevoltant);
    let prochainVirevoltant = 3;

    /* ---------- Vautours qui tournent dans le ciel ---------- */

    const vautours = [];
    for (let i = 0; i < 3; i++) {
        const oiseau = new THREE.Group();
        const corpsOiseau = objet(new THREE.CapsuleGeometry(0.18, 0.5, 4, 8), 0x2a1a14);
        corpsOiseau.rotation.x = Math.PI / 2;
        oiseau.add(corpsOiseau);
        const ailes = [];
        for (const cote of [-1, 1]) {
            const pivot = new THREE.Group();
            const aile = objet(new THREE.BoxGeometry(1.4, 0.04, 0.45), 0x2a1a14);
            aile.position.x = cote * 0.7;
            pivot.add(aile);
            oiseau.add(pivot);
            ailes.push({ pivot, cote });
        }
        oiseau.userData = { ailes, angle: (i / 3) * Math.PI * 2, rayon: 9 + i * 2.5, hauteur: 16 + i * 1.5 };
        vautours.push(oiseau);
        monde.add(oiseau);
    }

    /* ---------- Poussière dans l'air ---------- */

    const nbGrains = qualite === "haute" ? 400 : 180;
    const posGrains = new Float32Array(nbGrains * 3);
    for (let i = 0; i < nbGrains; i++) {
        posGrains.set([(Math.random() - 0.5) * 60, Math.random() * 10, (Math.random() - 0.5) * 40 - 5], i * 3);
    }
    const geoGrains = new THREE.BufferGeometry();
    geoGrains.setAttribute("position", new THREE.BufferAttribute(posGrains, 3));
    const poussiere = new THREE.Points(geoGrains, new THREE.PointsMaterial({
        color: 0xffd9a0, size: 0.08, transparent: true, opacity: 0.6, depthWrite: false,
    }));
    monde.add(poussiere);

    /* ---------- Ambiance (transition douce des couleurs) ---------- */

    let ambianceCible = AMBIANCES.jeu;
    const couleurTemp = new THREE.Color();

    function transitionCouleur(couleur, hex, dt, vitesse = 0.03) {
        couleurTemp.setHex(hex);
        couleur.lerp(couleurTemp, 1 - Math.pow(1 - vitesse, dt * 60));
    }

    /* ---------- Animation ---------- */

    function mettreAJour(t, dt) {
        // Couleurs du ciel, du brouillard et de la lumière
        transitionCouleur(uniformes.haut.value, ambianceCible.ciel[0], dt);
        transitionCouleur(uniformes.milieu.value, ambianceCible.ciel[1], dt);
        transitionCouleur(uniformes.bas.value, ambianceCible.ciel[2], dt);
        transitionCouleur(scene.fog.color, ambianceCible.brume, dt);
        transitionCouleur(lumiereSoleil.color, ambianceCible.soleil, dt);
        lumiereSoleil.intensity = approcher(lumiereSoleil.intensity, 2.8 * ambianceCible.lumiere, 0.03, dt);
        hemisphere.intensity = approcher(hemisphere.intensity, 1.3 * ambianceCible.lumiere, 0.03, dt);

        halo.scale.setScalar(1 + Math.sin(t * 0.6) * 0.04);

        // Portes du saloon qui battent doucement
        for (const { pivot, cote } of portes) pivot.rotation.y = cote * Math.sin(t * 1.3) * 0.15;
        lampe.intensity = 7 + Math.sin(t * 9) * 0.6 + Math.sin(t * 23) * 0.4; // flamme qui vacille

        // Virevoltant : traverse la scène de temps en temps
        prochainVirevoltant -= dt;
        if (prochainVirevoltant <= 0) {
            virevoltant.position.x += dt * 7;
            virevoltant.position.y = 0.75 + Math.abs(Math.sin(t * 5)) * 0.6;
            virevoltant.rotation.z -= dt * 7 / 0.75;
            if (virevoltant.position.x > 45) {
                virevoltant.position.set(-45, 0.75, 3 + Math.random() * 6);
                prochainVirevoltant = 8 + Math.random() * 8;
            }
        }

        // Vautours
        for (const oiseau of vautours) {
            const d = oiseau.userData;
            d.angle += dt * 0.25;
            const hauteurCible = ambianceCible === AMBIANCES.defaite ? d.hauteur - 7 : d.hauteur;
            oiseau.position.set(Math.cos(d.angle) * d.rayon, approcher(oiseau.position.y || d.hauteur, hauteurCible, 0.01, dt), Math.sin(d.angle) * d.rayon - 4);
            oiseau.rotation.y = -d.angle;
            oiseau.rotation.z = 0.25;
            for (const { pivot, cote } of d.ailes) pivot.rotation.z = cote * Math.sin(t * 3 + d.angle) * 0.35;
        }

        // Poussière qui dérive avec le vent
        const pos = poussiere.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i) + dt * 1.2;
            if (x > 30) x = -30;
            pos.setX(i, x);
            pos.setY(i, pos.getY(i) + Math.sin(t + i) * dt * 0.1);
        }
        pos.needsUpdate = true;
    }

    return {
        mettreAJour,
        ambiance(nom) {
            ambianceCible = AMBIANCES[nom] ?? AMBIANCES.jeu;
            etoiles.material.opacity = nom === "defaite" ? 1 : 0.8;
        },
    };
}
