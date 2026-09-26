/*
 * cowboy.js — la potence en bois et le cowboy
 *
 * Ordre d'apparition des parties (une par erreur) :
 * 1 tête + chapeau · 2 corps · 3 bras gauche · 4 bras droit · 5 jambe gauche · 6 jambe droite
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Organiser un personnage en hiérarchie : pendu > tête > chapeau, pendu > bras (pivot) > main.
 * - Détacher un objet de son parent sans qu'il saute (scene.attach) pour le faire voler.
 * - Une petite physique : gravité, rebonds amortis sur l'estrade et le sol.
 * - Des humeurs qui changent le visage en montrant / cachant des éléments.
 * - Des états de jeu (jeu, victoire, défaite) qui pilotent les animations.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";
import { objet, contour, creerRessort, animerRessort, approcher } from "./outils.js";

const C = {
    bois: 0x9a6236,
    boisFonce: 0x5e3a1c,
    corde: 0xd6a760,
    peau: 0xf1c27d,
    chemise: 0xc0392b,
    gilet: 0x6b3e1f,
    jean: 0x3b5b8c,
    bottes: 0x4a2a14,
    chapeau: 0x8a5a2b,
    bandeChapeau: 0x3b2412,
    foulard: 0xe0b33a,
    moustache: 0x4a2a14,
    fonce: 0x2a1408,
    or: 0xffc94a,
};

export function creerPotence(scene) {
    const groupe = new THREE.Group();
    scene.add(groupe);

    /* ---------- Potence ---------- */

    const HAUT_ESTRADE = 1.2;

    const estrade = contour(objet(new THREE.BoxGeometry(5, HAUT_ESTRADE, 3.2), C.bois));
    estrade.position.set(0.5, HAUT_ESTRADE / 2, 0);
    groupe.add(estrade);

    // Planches du dessus
    for (let i = 0; i < 6; i++) {
        const planche = contour(objet(new THREE.BoxGeometry(0.8, 0.06, 3.2), i % 2 ? C.bois : 0xa66c3c));
        planche.position.set(-1.5 + i * 0.82, HAUT_ESTRADE + 0.03, 0);
        groupe.add(planche);
    }

    // Escalier à gauche
    for (let i = 0; i < 3; i++) {
        const marche = contour(objet(new THREE.BoxGeometry(0.6, 0.3 * (i + 1), 1.6), C.boisFonce));
        marche.position.set(-2.6 + i * 0.55 - 0.55, 0.15 * (i + 1), 0.6);
        groupe.add(marche);
    }

    const poteau = contour(objet(new THREE.BoxGeometry(0.36, 5.4, 0.36), C.bois));
    poteau.position.set(-1.3, HAUT_ESTRADE + 2.7, -0.6);
    const poutre = contour(objet(new THREE.BoxGeometry(3.2, 0.34, 0.36), C.bois));
    poutre.position.set(0.1, HAUT_ESTRADE + 5.2, -0.6);
    const renfort = contour(objet(new THREE.BoxGeometry(0.22, 1.5, 0.22), C.boisFonce));
    renfort.position.set(-0.8, HAUT_ESTRADE + 4.5, -0.6);
    renfort.rotation.z = -Math.PI / 4;
    groupe.add(poteau, poutre, renfort);

    // Trappe (s'ouvre en cas de défaite)
    const pivotTrappe = new THREE.Group();
    pivotTrappe.position.set(0.55, HAUT_ESTRADE + 0.07, -0.6);
    const trappe = contour(objet(new THREE.BoxGeometry(1.2, 0.08, 1.3), C.boisFonce));
    trappe.position.x = 0.6;
    pivotTrappe.add(trappe);
    groupe.add(pivotTrappe);

    /* ---------- Le cowboy (accroché à la poutre) ---------- */

    const ACCROCHE = new THREE.Vector3(1.15, HAUT_ESTRADE + 5.03, -0.6);
    const pendu = new THREE.Group();
    pendu.position.copy(ACCROCHE);
    groupe.add(pendu);

    const corde = objet(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8), C.corde);
    corde.position.y = -0.42;
    pendu.add(corde);

    // Tête
    const tete = new THREE.Group();
    tete.position.y = -1.3;
    tete.add(objet(new THREE.SphereGeometry(0.46, 32, 24), C.peau));

    // Chapeau
    const chapeau = new THREE.Group();
    const bord = objet(new THREE.CylinderGeometry(0.82, 0.82, 0.06, 32), C.chapeau);
    bord.scale.z = 0.85;
    const calotte = objet(new THREE.CylinderGeometry(0.36, 0.44, 0.5, 24), C.chapeau);
    calotte.position.y = 0.26;
    const bande = objet(new THREE.CylinderGeometry(0.445, 0.445, 0.1, 24), C.bandeChapeau);
    bande.position.y = 0.07;
    const creux = objet(new THREE.SphereGeometry(0.2, 12, 8), C.bandeChapeau);
    creux.scale.set(1, 0.3, 1.6);
    creux.position.y = 0.5;
    chapeau.add(bord, calotte, bande, creux);
    chapeau.position.y = 0.36;
    chapeau.rotation.z = 0.08;
    tete.add(chapeau);

    // Visage
    const yeux = new THREE.Group();
    for (const x of [-0.15, 0.15]) {
        const oeil = objet(new THREE.SphereGeometry(0.06, 12, 8), C.fonce);
        oeil.position.set(x, 0.06, 0.42);
        yeux.add(oeil);
    }
    const yeuxX = new THREE.Group();
    for (const x of [-0.15, 0.15]) {
        for (const angle of [Math.PI / 4, -Math.PI / 4]) {
            const trait = objet(new THREE.BoxGeometry(0.16, 0.035, 0.03), C.fonce);
            trait.position.set(x, 0.06, 0.44);
            trait.rotation.z = angle;
            yeuxX.add(trait);
        }
    }
    const nez = objet(new THREE.SphereGeometry(0.08, 12, 8), 0xe8a86a);
    nez.position.set(0, -0.04, 0.46);

    const moustache = new THREE.Group();
    for (const cote of [-1, 1]) {
        const poils = objet(new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), C.moustache);
        poils.rotation.z = cote * (Math.PI / 2 - 0.35);
        poils.position.set(cote * 0.12, -0.13, 0.43);
        moustache.add(poils);
    }

    const bouche = objet(new THREE.TorusGeometry(0.1, 0.025, 8, 16, Math.PI), C.fonce);
    bouche.position.set(0, -0.24, 0.4);
    bouche.rotation.z = Math.PI; // sourire

    for (const x of [-0.27, 0.27]) {
        const joue = objet(new THREE.SphereGeometry(0.07, 10, 8), 0xff8a7a);
        joue.position.set(x, -0.08, 0.36);
        joue.scale.set(1, 0.6, 0.4);
        tete.add(joue);
    }
    tete.add(yeux, yeuxX, nez, moustache, bouche);
    pendu.add(tete);

    // Corps : chemise, gilet, foulard, ceinture
    const corps = new THREE.Group();
    corps.position.y = -2.35;
    corps.add(objet(new THREE.CapsuleGeometry(0.3, 0.7, 6, 16), C.chemise));
    for (const cote of [-1, 1]) {
        const panneau = objet(new THREE.BoxGeometry(0.24, 0.8, 0.1), C.gilet);
        panneau.position.set(cote * 0.17, 0.05, 0.27);
        panneau.rotation.y = cote * 0.25;
        corps.add(panneau);
    }
    const foulard = objet(new THREE.ConeGeometry(0.22, 0.35, 3), C.foulard);
    foulard.rotation.x = Math.PI;
    foulard.position.set(0, 0.45, 0.25);
    const ceinture = objet(new THREE.TorusGeometry(0.31, 0.05, 6, 20), C.fonce);
    ceinture.rotation.x = Math.PI / 2;
    ceinture.position.y = -0.42;
    const boucle = objet(new THREE.BoxGeometry(0.16, 0.12, 0.05), C.or);
    boucle.position.set(0, -0.42, 0.33);
    const etoile = objet(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 5), C.or); // étoile de shérif
    etoile.rotation.x = Math.PI / 2;
    etoile.position.set(-0.17, 0.2, 0.34);
    corps.add(foulard, ceinture, boucle, etoile);
    pendu.add(corps);

    function membre(x, y, rayon, longueur, angle, couleur, bout) {
        const pivot = new THREE.Group();
        pivot.position.set(x, y, 0);
        pivot.rotation.z = angle;
        const mesh = objet(new THREE.CapsuleGeometry(rayon, longueur, 6, 12), couleur);
        mesh.position.y = -(longueur / 2 + rayon);
        pivot.add(mesh);
        if (bout) {
            bout.position.y = -(longueur + rayon * 1.6);
            pivot.add(bout);
        }
        pivot.userData.angleDepart = angle;
        pendu.add(pivot);
        return pivot;
    }

    const main = () => objet(new THREE.SphereGeometry(0.12, 12, 8), C.peau);
    const botte = () => {
        const b = objet(new THREE.BoxGeometry(0.26, 0.28, 0.42), C.bottes);
        b.geometry.translate(0, 0, 0.08);
        return b;
    };

    const brasGauche = membre(-0.3, -1.95, 0.11, 0.6, -0.55, C.chemise, main());
    const brasDroit = membre(0.3, -1.95, 0.11, 0.6, 0.55, C.chemise, main());
    const jambeGauche = membre(-0.14, -2.95, 0.13, 0.65, -0.12, C.jean, botte());
    const jambeDroite = membre(0.14, -2.95, 0.13, 0.65, 0.12, C.jean, botte());
    const HAUTEUR_PIEDS = 4.1; // distance entre l'accroche et la semelle des bottes

    const parties = [tete, corps, brasGauche, brasDroit, jambeGauche, jambeDroite];
    for (const partie of parties) partie.userData.ressort = creerRessort(0, 220, 12);

    /* ---------- Pièces d'or (victoire) ---------- */

    const geoPiece = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16);
    const matPiece = new THREE.MeshStandardMaterial({
        color: 0xffc94a, emissive: 0xffa000, emissiveIntensity: 1.4, metalness: 0.6, roughness: 0.3,
    });
    const pieces = [];

    function pluieDePieces(nombre) {
        for (let i = 0; i < nombre; i++) {
            const piece = new THREE.Mesh(geoPiece, matPiece);
            piece.castShadow = true;
            piece.position.set(ACCROCHE.x + (Math.random() - 0.5) * 8, 9 + Math.random() * 6, (Math.random() - 0.5) * 5);
            piece.userData = {
                vitesse: new THREE.Vector3((Math.random() - 0.5) * 2, -Math.random() * 2, (Math.random() - 0.5) * 2),
                rotation: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 0),
                vie: 4 + Math.random() * 2,
            };
            scene.add(piece);
            pieces.push(piece);
        }
    }

    function animerPieces(dt) {
        for (let i = pieces.length - 1; i >= 0; i--) {
            const p = pieces[i];
            const d = p.userData;
            d.vitesse.y -= 9.8 * dt;
            p.position.addScaledVector(d.vitesse, dt);
            // Rebond sur l'estrade ou le sol
            const sol = Math.abs(p.position.x - 0.5) < 2.5 && Math.abs(p.position.z) < 1.6 ? HAUT_ESTRADE + 0.08 : 0.02;
            if (p.position.y < sol) {
                p.position.y = sol;
                d.vitesse.y *= -0.35;
                d.vitesse.x *= 0.6;
                d.vitesse.z *= 0.6;
                d.rotation.multiplyScalar(0.5);
            }
            p.rotation.x += d.rotation.x * dt;
            p.rotation.y += d.rotation.y * dt;
            d.vie -= dt;
            if (d.vie <= 0) {
                scene.remove(p);
                pieces.splice(i, 1);
            }
        }
    }

    /* ---------- États et humeurs ---------- */

    let etat = "jeu"; // "jeu", "victoire", "defaite"
    let tempsEtat = 0;
    let humeur = "normal";
    let chapeauLibre = null; // physique du chapeau quand il s'envole ou tombe

    function appliquerHumeur(nom) {
        humeur = nom;
        yeux.visible = nom !== "perdu";
        yeuxX.visible = nom === "perdu";
        bouche.rotation.z = nom === "perdu" || nom === "inquiet" ? 0 : Math.PI;
        bouche.position.y = nom === "perdu" || nom === "inquiet" ? -0.3 : -0.24;
        bouche.scale.setScalar(nom === "joyeux" ? 1.5 : nom === "inquiet" ? 0.7 : 1);
    }

    // Le chapeau quitte la tête : on le rattache à la scène pour le faire voler
    function libererChapeau(vitesse) {
        scene.attach(chapeau);
        chapeauLibre = { vitesse, rotation: new THREE.Vector3(3, 6, 2) };
    }

    function remettreChapeau() {
        tete.add(chapeau);
        chapeau.position.set(0, 0.36, 0);
        chapeau.rotation.set(0, 0, 0.08);
        chapeauLibre = null;
    }

    /* ---------- Mise à jour à chaque image ---------- */

    function mettreAJour(t, dt) {
        tempsEtat += dt;

        for (const partie of parties) {
            const valeur = animerRessort(partie.userData.ressort, dt);
            partie.scale.setScalar(Math.max(valeur, 0.0001));
            partie.visible = valeur > 0.01;
        }

        if (etat === "jeu") {
            pendu.rotation.z = Math.sin(t * 1.2) * 0.04;
            tete.position.x = humeur === "inquiet" ? Math.sin(t * 38) * 0.012 : 0;
        }

        if (etat === "defaite") {
            pivotTrappe.rotation.z = approcher(pivotTrappe.rotation.z, -1.4, 0.15, dt);
            pendu.position.y = approcher(pendu.position.y, ACCROCHE.y - 0.35, 0.2, dt);
            pendu.rotation.z = Math.sin(t * 1.1) * 0.14;
            tete.rotation.z = approcher(tete.rotation.z, 0.45, 0.05, dt);
            tete.rotation.x = approcher(tete.rotation.x, 0.3, 0.05, dt);
        }

        if (etat === "victoire") {
            // Il descend sur l'estrade, puis saute de joie, bras en l'air
            pendu.rotation.z = approcher(pendu.rotation.z, 0, 0.1, dt);
            const sol = HAUT_ESTRADE + 0.07 + HAUTEUR_PIEDS;
            const saut = tempsEtat > 0.6 ? Math.abs(Math.sin((tempsEtat - 0.6) * 5)) * 0.9 : 0;
            pendu.position.y = approcher(pendu.position.y, sol + saut, 0.3, dt);
            brasGauche.rotation.z = approcher(brasGauche.rotation.z, -2.6, 0.12, dt);
            brasDroit.rotation.z = approcher(brasDroit.rotation.z, 2.6, 0.12, dt);
        }

        // Chapeau en vol
        if (chapeauLibre) {
            const { vitesse, rotation } = chapeauLibre;
            vitesse.y -= 9.8 * dt * 0.6;
            chapeau.position.addScaledVector(vitesse, dt);
            chapeau.rotation.x += rotation.x * dt;
            chapeau.rotation.y += rotation.y * dt;
            const sol = Math.abs(chapeau.position.x - 0.5) < 2.5 && Math.abs(chapeau.position.z) < 1.6 ? HAUT_ESTRADE + 0.05 : 0.05;
            if (chapeau.position.y <= sol) {
                chapeau.position.y = sol;
                vitesse.set(0, 0, 0);
                rotation.set(0, 0, 0);
                chapeau.rotation.x = approcher(chapeau.rotation.x, 0, 0.2, dt);
                chapeau.rotation.z = approcher(chapeau.rotation.z, 0, 0.2, dt);
                // En cas de victoire, le chapeau revient sur sa tête après l'atterrissage
                if (etat === "victoire" && tempsEtat > 3) remettreChapeau();
            }
        }

        animerPieces(dt);
    }

    /* ---------- Commandes ---------- */

    function reinitialiser() {
        etat = "jeu";
        tempsEtat = 0;
        for (const partie of parties) partie.userData.ressort.cible = 0;
        corde.visible = true;
        pendu.position.copy(ACCROCHE);
        pendu.rotation.set(0, 0, 0);
        tete.rotation.set(0, 0, 0);
        pivotTrappe.rotation.z = 0;
        for (const m of [brasGauche, brasDroit, jambeGauche, jambeDroite]) m.rotation.z = m.userData.angleDepart;
        remettreChapeau();
        appliquerHumeur("normal");
    }

    reinitialiser();

    return {
        mettreAJour,
        reinitialiser,
        pointDeVue: new THREE.Vector3(0.6, HAUT_ESTRADE + 2.6, 0), // ce que la caméra regarde

        ajouterPartie(numero) {
            const partie = parties[numero - 1];
            if (!partie) return;
            partie.userData.ressort.cible = 1;
            partie.userData.ressort.vitesse = 6;
        },

        humeur(nom) {
            if (etat === "jeu") appliquerHumeur(nom);
        },

        victoire() {
            etat = "victoire";
            tempsEtat = 0;
            corde.visible = false;
            for (const partie of parties) partie.userData.ressort.cible = 1;
            appliquerHumeur("joyeux");
            libererChapeau(new THREE.Vector3(0.5, 7, 0.8)); // il lance son chapeau en l'air
            pluieDePieces(70);
        },

        defaite() {
            etat = "defaite";
            tempsEtat = 0;
            appliquerHumeur("perdu");
            libererChapeau(new THREE.Vector3(1.2, 1, 1.5)); // le chapeau tombe
        },
    };
}
