/*
 * outils.js — petites fonctions réutilisées par tous les fichiers 3D
 */

import * as THREE from "three";

// Dégradé à 3 tons : les ombres sont découpées en aplats, comme un dessin animé
const DEGRADE_CARTOON = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
DEGRADE_CARTOON.minFilter = THREE.NearestFilter;
DEGRADE_CARTOON.magFilter = THREE.NearestFilter;
DEGRADE_CARTOON.needsUpdate = true;

export function matiere(couleur, options = {}) {
    return new THREE.MeshToonMaterial({ color: couleur, gradientMap: DEGRADE_CARTOON, ...options });
}

// Crée un objet visible qui projette et reçoit des ombres
export function objet(geometrie, couleurOuMatiere) {
    const materiau = couleurOuMatiere instanceof THREE.Material ? couleurOuMatiere : matiere(couleurOuMatiere);
    const mesh = new THREE.Mesh(geometrie, materiau);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// Ajoute un contour sombre sur les arêtes (style bande dessinée)
export function contour(mesh, couleur = 0x2a1408, angle = 30) {
    const lignes = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, angle),
        new THREE.LineBasicMaterial({ color: couleur, transparent: true, opacity: 0.55 }),
    );
    mesh.add(lignes);
    return mesh;
}

/*
 * Ressort : fait tendre une valeur vers une cible avec un petit rebond.
 * C'est ce qui donne aux animations un aspect "vivant".
 */
export function creerRessort(valeur = 0, raideur = 180, amortissement = 14) {
    return { valeur, vitesse: 0, cible: valeur, raideur, amortissement };
}

export function animerRessort(r, dt) {
    const force = (r.cible - r.valeur) * r.raideur - r.vitesse * r.amortissement;
    r.vitesse += force * dt;
    r.valeur += r.vitesse * dt;
    return r.valeur;
}

// Rapproche doucement une valeur d'une cible (0 < vitesse < 1)
export function approcher(valeur, cible, vitesse, dt) {
    return valeur + (cible - valeur) * (1 - Math.pow(1 - vitesse, dt * 60));
}
