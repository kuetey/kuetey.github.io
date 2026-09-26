/*
 * hero3d.js — scène 3D de l'en-tête (Three.js)
 * Un noyau géométrique entouré d'anneaux et d'objets en orbite,
 * dans un nuage de particules. Réagit à la souris et au défilement.
 */

import * as THREE from "three";

const canvas = document.getElementById("hero-canvas");
const hero = canvas.parentElement;
const moinsDAnimations = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const COULEURS = { violet: 0x8b6cff, cyan: 0x3fd0ff, rose: 0xff5c93, jaune: 0xffd95a };

try {
    demarrer();
} catch (erreur) {
    // Pas de WebGL : le site reste parfaitement lisible sans la 3D
    console.warn("3D indisponible :", erreur);
    canvas.remove();
}

function demarrer() {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const lumiereViolette = new THREE.PointLight(COULEURS.violet, 60, 30);
    lumiereViolette.position.set(3, 3, 4);
    const lumiereCyan = new THREE.PointLight(COULEURS.cyan, 40, 30);
    lumiereCyan.position.set(-4, -2, 3);
    scene.add(lumiereViolette, lumiereCyan);

    // Tout ce qui tourne est dans "ensemble"
    const ensemble = new THREE.Group();
    scene.add(ensemble);

    // Noyau : un icosaèdre plein aux facettes visibles + son contour en fil de fer
    const noyau = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.5, 1),
        new THREE.MeshStandardMaterial({
            color: 0x1c1936, emissive: 0x2a1a6e, emissiveIntensity: 0.5,
            metalness: 0.4, roughness: 0.35, flatShading: true,
        }),
    );
    const contour = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.53, 1)),
        new THREE.LineBasicMaterial({ color: COULEURS.violet, transparent: true, opacity: 0.75 }),
    );
    ensemble.add(noyau, contour);

    // Anneaux
    const anneaux = [
        { rayon: 2.4, couleur: COULEURS.cyan, inclinaison: [1.2, 0.3, 0] },
        { rayon: 2.9, couleur: COULEURS.rose, inclinaison: [1.7, -0.5, 0.4] },
    ].map(({ rayon, couleur, inclinaison }) => {
        const anneau = new THREE.Mesh(
            new THREE.TorusGeometry(rayon, 0.012, 8, 200),
            new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.6 }),
        );
        anneau.rotation.set(...inclinaison);
        ensemble.add(anneau);
        return anneau;
    });

    // Petits objets en orbite (clin d'œil aux formes des jeux)
    const formes = [
        new THREE.OctahedronGeometry(0.22),
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.TetrahedronGeometry(0.26),
        new THREE.TorusGeometry(0.16, 0.06, 8, 20),
    ];
    const couleursOrbite = [COULEURS.cyan, COULEURS.rose, COULEURS.jaune, COULEURS.violet];
    const satellites = [];

    for (let i = 0; i < 7; i++) {
        const satellite = new THREE.Mesh(
            formes[i % formes.length],
            new THREE.MeshStandardMaterial({
                color: couleursOrbite[i % couleursOrbite.length],
                emissive: couleursOrbite[i % couleursOrbite.length],
                emissiveIntensity: 0.35, roughness: 0.3, flatShading: true,
            }),
        );
        satellite.userData = {
            rayon: 2.4 + (i % 3) * 0.5,
            vitesse: 0.25 + Math.random() * 0.25,
            phase: (i / 7) * Math.PI * 2,
            hauteur: (Math.random() - 0.5) * 1.6,
        };
        satellites.push(satellite);
        ensemble.add(satellite);
    }

    // Nuage de particules
    const nb = 900;
    const positions = new Float32Array(nb * 3);
    const couleurs = new Float32Array(nb * 3);
    const couleur = new THREE.Color();
    for (let i = 0; i < nb; i++) {
        // Points répartis dans une coquille sphérique
        const rayon = 4 + Math.random() * 9;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = rayon * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = rayon * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = rayon * Math.cos(phi) - 3;
        couleur.setHex(Math.random() > 0.5 ? COULEURS.violet : COULEURS.cyan).lerp(new THREE.Color(0xffffff), Math.random() * 0.5);
        couleur.toArray(couleurs, i * 3);
    }
    const geometrie = new THREE.BufferGeometry();
    geometrie.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometrie.setAttribute("color", new THREE.BufferAttribute(couleurs, 3));
    const particules = new THREE.Points(geometrie, new THREE.PointsMaterial({
        size: 0.03, vertexColors: true, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(particules);

    /* ----- Souris et défilement ----- */

    const souris = { x: 0, y: 0 };
    window.addEventListener("pointermove", (e) => {
        souris.x = e.clientX / window.innerWidth - 0.5;
        souris.y = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    /* ----- Taille ----- */

    function redimensionner() {
        const largeur = hero.clientWidth;
        const hauteur = hero.clientHeight;
        renderer.setSize(largeur, hauteur, false);
        camera.aspect = largeur / hauteur;
        camera.updateProjectionMatrix();
        // Sur grand écran, la 3D se place à droite du texte
        const grandEcran = largeur > 900;
        ensemble.position.x = grandEcran ? 2.6 : 1.2;
        ensemble.position.y = grandEcran ? 0 : 1.2;
        ensemble.scale.setScalar(grandEcran ? 1 : 0.75);
    }
    new ResizeObserver(redimensionner).observe(hero);
    redimensionner();

    /* ----- Animation ----- */

    const horloge = new THREE.Clock();
    let visible = true;

    function image() {
        const t = horloge.getElapsedTime();
        const defilement = window.scrollY / window.innerHeight;

        noyau.rotation.x = contour.rotation.x = t * 0.15 + defilement;
        noyau.rotation.y = contour.rotation.y = t * 0.2;
        anneaux[0].rotation.z = t * 0.1;
        anneaux[1].rotation.z = -t * 0.08;

        for (const s of satellites) {
            const { rayon, vitesse, phase, hauteur } = s.userData;
            const angle = t * vitesse + phase;
            s.position.set(Math.cos(angle) * rayon, hauteur + Math.sin(angle * 2) * 0.2, Math.sin(angle) * rayon);
            s.rotation.x = s.rotation.y = t * 0.8;
        }

        particules.rotation.y = t * 0.015;

        // La scène suit doucement la souris
        ensemble.rotation.y += (souris.x * 0.6 - ensemble.rotation.y) * 0.04;
        ensemble.rotation.x += (souris.y * 0.4 - ensemble.rotation.x) * 0.04;
        camera.position.y = -defilement * 1.5;

        renderer.render(scene, camera);
    }

    if (moinsDAnimations) {
        image(); // une seule image, pas d'animation
        return;
    }

    // On arrête le rendu quand l'en-tête n'est plus visible (économise la batterie)
    new IntersectionObserver(([entree]) => {
        visible = entree.isIntersecting;
        renderer.setAnimationLoop(visible ? image : null);
    }).observe(hero);
}
