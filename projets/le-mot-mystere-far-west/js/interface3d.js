/*
 * interface3d.js — l'interface du jeu, entièrement en 3D
 *
 * Idée clé : tous les éléments d'interface sont "accrochés" à la caméra
 * (comme un casque de réalité virtuelle). Ils restent donc toujours au même
 * endroit à l'écran, pendant que le décor bouge derrière eux.
 *
 * Éléments :
 * - l'écran titre (panneau + bouton JOUER)
 * - le panneau du mot (tuiles en bois qui se retournent)
 * - le clavier de machine à écrire (touches rondes qui s'enfoncent)
 * - le barillet du revolver (6 balles = 6 essais)
 * - les boutons "Nouvelle partie" et "Son"
 * - la bannière de fin de partie
 *
 * Les clics sont détectés avec un Raycaster : un rayon part de la souris
 * vers la scène, et on regarde quel objet il touche en premier.
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { matiere, creerRessort, animerRessort, approcher } from "./outils.js";
import { textureTouche, textureTuile, textureBois, panneauTexte, POLICE_TITRE, POLICE_TEXTE } from "./textures.js";

const DISTANCE = 6; // distance entre la caméra et le "plan" de l'interface

const RANGEES = [
    ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
    ["W", "X", "C", "V", "B", "N"],
];

/* ---------- Matériaux partagés ---------- */

const texBois = textureBois({ clair: "#a8703e", fonce: "#6b4220", graine: 11 });
const texBoisFonce = textureBois({ clair: "#6b4220", fonce: "#3e240f", graine: 5 });

const MAT = {
    bois: new THREE.MeshStandardMaterial({ map: texBois, roughness: 0.75, metalness: 0 }),
    boisFonce: new THREE.MeshStandardMaterial({ map: texBoisFonce, roughness: 0.8 }),
    // Le socle reçoit la lumière du soleil comme le sable : on l'assombrit pour qu'il reste "bois"
    socle: new THREE.MeshStandardMaterial({ map: texBoisFonce, color: 0x5a3f2e, roughness: 0.95, envMapIntensity: 0.3 }),
    laiton: new THREE.MeshStandardMaterial({ color: 0xd4a94f, metalness: 0.85, roughness: 0.45, envMapIntensity: 0.5 }),
    acier: new THREE.MeshStandardMaterial({ color: 0x6d6f7a, metalness: 0.9, roughness: 0.35, envMapIntensity: 0.55 }),
    acierFonce: new THREE.MeshStandardMaterial({ color: 0x2e2f36, metalness: 0.7, roughness: 0.65, envMapIntensity: 0.35 }),
    ivoire: new THREE.MeshStandardMaterial({ color: 0xf3e6c8, roughness: 0.35 }),
    corde: matiere(0xd6a760),
};

const VERT = new THREE.Color(0x7dffae);
const ROUGE = new THREE.Color(0xff6a5a);
const GRIS = new THREE.Color(0x8a7f70);
const BLANC = new THREE.Color(0xffffff);

export function creerInterface({ camera, canvas, sons, actions }) {
    const hud = new THREE.Group();
    camera.add(hud);

    // Une lumière qui suit la caméra pour bien éclairer l'interface
    // placée derrière et au-dessus de la caméra : éclairage doux et uniforme
    const lumiereHud = new THREE.PointLight(0xfff0d8, 22, 40, 2);
    lumiereHud.position.set(0, 4, 4);
    camera.add(lumiereHud);

    const interactifs = []; // tout ce qui est cliquable
    const elements = {};    // éléments d'interface positionnés par mettreEnPage()

    /* =====================================================
       Outils de construction
       ===================================================== */

    // Un élément d'interface : un groupe racine, sa taille "naturelle" et un ressort d'apparition
    function element(nom, racine) {
        const boite = new THREE.Box3().setFromObject(racine);
        const taille = boite.getSize(new THREE.Vector3());
        const e = {
            racine,
            largeur: taille.x,
            hauteur: taille.y,
            echelle: 1,
            apparition: creerRessort(0, 160, 14),
            flottement: Math.random() * 10,
        };
        hud.add(racine);
        elements[nom] = e;
        return e;
    }

    function montrer(nom, visible) {
        if (elements[nom]) elements[nom].apparition.cible = visible ? 1 : 0;
    }

    function rendreCliquable(meshes, action, groupeAnime, options = {}) {
        const interactif = {
            meshes,
            action,
            groupe: groupeAnime,
            survol: creerRessort(0, 300, 18),
            appui: creerRessort(0, 500, 20),
            actif: true,
            ...options,
        };
        for (const mesh of meshes) mesh.userData.interactif = interactif;
        interactifs.push(interactif);
        return interactif;
    }

    function corde(x, hauteur) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, hauteur, 6), MAT.corde);
        c.position.set(x, hauteur / 2, -0.05);
        return c;
    }

    function clou(x, y, z = 0.14) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT.laiton);
        c.position.set(x, y, z);
        return c;
    }

    // Bouton en planche de bois avec un texte gravé
    function creerBouton(texte, { largeur = 3, hauteur = 0.9, taille = 0.55, action, sonore = true }) {
        const racine = new THREE.Group();
        const corps = new THREE.Group(); // la partie qui s'enfonce
        const planche = new THREE.Mesh(new RoundedBoxGeometry(largeur, hauteur, 0.26, 3, 0.1), MAT.bois);
        const libelle = panneauTexte(texte, {
            largeur: largeur * 0.92, hauteur: hauteur * 0.85, taille,
            couleur: "#ffe6b8", contour: "#3a1a08",
        });
        libelle.position.z = 0.135;
        corps.add(planche, libelle, clou(-largeur / 2 + 0.18, 0), clou(largeur / 2 - 0.18, 0));
        racine.add(corps);

        const interactif = rendreCliquable([planche, libelle], () => {
            if (sonore) sons.bouton();
            action();
        }, corps);
        return { racine, libelle, interactif };
    }

    /* =====================================================
       1. Écran titre
       ===================================================== */

    const titreRacine = new THREE.Group();
    const panneauTitre = new THREE.Mesh(new RoundedBoxGeometry(7.6, 3, 0.3, 3, 0.12), MAT.bois);
    const texteTitre = panneauTexte("LE MOT MYSTÈRE", {
        largeur: 7.2, hauteur: 1.5, taille: 0.7, couleur: "#ffe2a8", contour: "#4a1f08",
    });
    texteTitre.position.set(0, 0.45, 0.16);
    const sousTitre = panneauTexte("~ Far West ~", {
        largeur: 5, hauteur: 0.8, taille: 0.6, couleur: "#ffb45e", contour: "#4a1f08",
    });
    sousTitre.position.set(0, -0.6, 0.16);
    titreRacine.add(panneauTitre, texteTitre, sousTitre, corde(-3, 6), corde(3, 6), clou(-3, 1.3, 0.16), clou(3, 1.3, 0.16));

    const boutonJouer = creerBouton("JOUER", { largeur: 3.2, hauteur: 1.1, taille: 0.62, action: () => actions.jouer() });
    boutonJouer.racine.position.set(0, -2.35, 0);
    titreRacine.add(boutonJouer.racine);

    const astuce = panneauTexte("Clique ou appuie sur Entrée", {
        largeur: 5, hauteur: 0.45, police: POLICE_TEXTE, taille: 0.6, couleur: "#fff1d6", ombre: true,
    });
    astuce.position.set(0, -3.35, 0);
    titreRacine.add(astuce);
    element("titre", titreRacine);

    /* =====================================================
       2. Clavier de machine à écrire
       ===================================================== */

    const clavierRacine = new THREE.Group();
    const clavierIncline = new THREE.Group();
    // Le clavier est "posé sur une table" : on le fait basculer vers la caméra
    clavierIncline.rotation.x = 0.95;
    clavierRacine.add(clavierIncline);

    const socle = new THREE.Mesh(new RoundedBoxGeometry(11.2, 0.5, 3.9, 4, 0.2), MAT.socle);
    socle.position.y = -0.1;
    const lisere = new THREE.Mesh(new RoundedBoxGeometry(11.35, 0.12, 4.05, 3, 0.05), MAT.laiton);
    lisere.position.y = -0.3; // dépasse sous le socle : fin lisere doré sur le pourtour
    clavierIncline.add(socle, lisere);

    const plaque = panneauTexte("MACHINE À MOTS · 1880", {
        largeur: 4.2, hauteur: 0.42, police: POLICE_TITRE, taille: 0.62, couleur: "#3a1f0c", ombre: false, fond: "#d4a94f",
    });
    plaque.position.set(0, -0.1, 1.97); // plaque vissée sur la face avant du socle
    clavierIncline.add(plaque);

    const touches = new Map();
    const PAS = 1.02;

    RANGEES.forEach((rangee, r) => {
        const decalage = r === 1 ? 0.25 : 0;
        rangee.forEach((lettre, i) => {
            const touche = new THREE.Group();
            touche.position.set((i - (rangee.length - 1) / 2) * PAS + decalage, 0.1, (r - 1) * 1.08);

            const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8), MAT.acier);
            tige.position.y = 0.2;

            const tete = new THREE.Group();
            const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 12, 36), MAT.laiton.clone());
            anneau.rotation.x = Math.PI / 2;
            const capuchon = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.39, 0.14, 36), MAT.ivoire);
            const disque = new THREE.Mesh(
                new THREE.CircleGeometry(0.35, 36),
                new THREE.MeshBasicMaterial({ map: textureTouche(lettre), toneMapped: false }),
            );
            disque.rotation.x = -Math.PI / 2;
            disque.position.y = 0.071;
            tete.add(anneau, capuchon, disque);
            touche.add(tige, tete);
            clavierIncline.add(touche);

            const donnees = {
                lettre, tete, disque, anneau,
                etat: "normal",       // "normal", "correct", "faux"
                enfoncement: creerRessort(0, 520, 16),
                survol: 0,
                flash: 0,
            };

            donnees.interactif = rendreCliquable([capuchon, disque, anneau], () => actions.lettre(lettre), tete, { touche: donnees });
            touches.set(lettre, donnees);
        });
    });

    element("clavier", clavierRacine);

    /* =====================================================
       3. Panneau du mot (reconstruit à chaque nouveau mot)
       ===================================================== */

    let tuiles = [];

    function construirePanneauMot(mot) {
        if (elements.mot) {
            hud.remove(elements.mot.racine);
            elements.mot.racine.traverse((o) => o.geometry?.dispose());
        }

        const racine = new THREE.Group();
        const PAS_TUILE = 0.95;
        const largeur = mot.length * PAS_TUILE + 0.9;

        const planche = new THREE.Mesh(new RoundedBoxGeometry(largeur, 1.8, 0.24, 3, 0.1), MAT.bois);
        racine.add(planche, clou(-largeur / 2 + 0.2, 0.7), clou(largeur / 2 - 0.2, 0.7));

        // Petit panneau-titre au-dessus, suspendu par deux cordes
        const enseigne = new THREE.Group();
        const plancheTitre = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.62, 0.18, 3, 0.06), MAT.boisFonce);
        const texte = panneauTexte("MOT MYSTÈRE", { largeur: 3.2, hauteur: 0.55, taille: 0.7, couleur: "#ffd27a", contour: "#2a1004" });
        texte.position.z = 0.1;
        enseigne.add(plancheTitre, texte);
        enseigne.position.y = 1.35;
        racine.add(enseigne, corde(-1.3, 0.25).translateY(0.86), corde(1.3, 0.25).translateY(0.86));

        tuiles = [...mot].map((lettre, i) => {
            const tuile = new THREE.Group();
            tuile.position.set((i - (mot.length - 1) / 2) * PAS_TUILE, -0.08, 0.2);

            const bloc = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.08, 0.12), MAT.boisFonce);
            const avant = new THREE.Mesh(
                new THREE.PlaneGeometry(0.82, 1.06),
                new THREE.MeshBasicMaterial({ map: textureTuile("?", "cachee"), toneMapped: false }),
            );
            avant.position.z = 0.061;
            const arriere = new THREE.Mesh(
                new THREE.PlaneGeometry(0.82, 1.06),
                new THREE.MeshBasicMaterial({ map: textureTuile(lettre, "trouvee"), toneMapped: false }),
            );
            arriere.position.z = -0.061;
            arriere.rotation.y = Math.PI; // la face arrière est retournée : visible après un demi-tour
            tuile.add(bloc, avant, arriere);
            racine.add(tuile);

            return { lettre, tuile, arriere, rotation: creerRessort(0, 90, 9), delai: 0, retournee: false, index: i };
        });

        const e = element("mot", racine);
        mettreEnPage();
        return e;
    }

    /* =====================================================
       4. Barillet du revolver (6 essais)
       ===================================================== */

    const barilletRacine = new THREE.Group();
    const barillet = new THREE.Group();
    barilletRacine.add(barillet);

    /*
     * Un vrai barillet : on dessine sa forme en 2D (Shape) puis on lui donne
     * de l'épaisseur (ExtrudeGeometry).
     * - le contour a 6 rainures creusées entre les chambres (comme un Colt) ;
     * - 6 trous (les chambres) + le trou de l'axe sont découpés dans la forme.
     * Quand une balle est tirée, on voit la chambre vide.
     */
    const RAYON = 0.95;
    const RAYON_CHAMBRES = 0.56;
    const RAYON_TROU = 0.235;
    const angleChambre = (k) => Math.PI / 2 + (k * Math.PI) / 3;

    const forme = new THREE.Shape();
    const nbPoints = 180;
    for (let i = 0; i <= nbPoints; i++) {
        const theta = (i / nbPoints) * Math.PI * 2;
        // Rainure au milieu de deux chambres : cos(6θ) vaut 1 à ces angles précis
        const rainure = Math.pow(Math.max(0, Math.cos(6 * (theta - angleChambre(0) - Math.PI / 6))), 10);
        const r = RAYON - 0.13 * rainure;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        if (i === 0) forme.moveTo(x, y);
        else forme.lineTo(x, y);
    }
    for (let k = 0; k < 6; k++) {
        const trou = new THREE.Path();
        const a = angleChambre(k);
        trou.absarc(Math.cos(a) * RAYON_CHAMBRES, Math.sin(a) * RAYON_CHAMBRES, RAYON_TROU, 0, Math.PI * 2, true);
        forme.holes.push(trou);
    }
    const trouAxe = new THREE.Path();
    trouAxe.absarc(0, 0, 0.11, 0, Math.PI * 2, true);
    forme.holes.push(trouAxe);

    const geoTambour = new THREE.ExtrudeGeometry(forme, {
        depth: 0.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3, curveSegments: 32,
    });
    geoTambour.translate(0, 0, -0.25); // centre le cylindre sur z = 0
    const tambour = new THREE.Mesh(geoTambour, MAT.acierFonce);

    // Fond des chambres : parois intérieures et fond sombres (profondeur du trou)
    const matInterieur = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.9, side: THREE.DoubleSide });
    for (let k = 0; k < 6; k++) {
        const a = angleChambre(k);
        const paroi = new THREE.Mesh(new THREE.CylinderGeometry(RAYON_TROU, RAYON_TROU, 0.5, 24, 1, true), matInterieur);
        paroi.rotation.x = Math.PI / 2;
        paroi.position.set(Math.cos(a) * RAYON_CHAMBRES, Math.sin(a) * RAYON_CHAMBRES, 0);
        barillet.add(paroi);
    }
    const fond = new THREE.Mesh(new THREE.CircleGeometry(RAYON - 0.05, 40), matInterieur);
    fond.position.z = -0.22;
    const axe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 16), MAT.acier);
    axe.rotation.x = Math.PI / 2;
    barillet.add(tambour, fond, axe);

    const balles = [];
    for (let k = 0; k < 6; k++) {
        const angle = angleChambre(k);
        const balle = new THREE.Group();
        const douille = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.54, 24), MAT.laiton);
        douille.rotation.x = Math.PI / 2;
        // Bourrelet du culot, un peu plus large que le trou : la balle "tient" dans la chambre
        const bourrelet = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.04, 24), MAT.laiton);
        bourrelet.rotation.x = Math.PI / 2;
        bourrelet.position.z = 0.27;
        const amorce = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16), MAT.acier);
        amorce.rotation.x = Math.PI / 2;
        amorce.position.z = 0.29;
        balle.add(douille, bourrelet, amorce);
        const origine = new THREE.Vector3(Math.cos(angle) * RAYON_CHAMBRES, Math.sin(angle) * RAYON_CHAMBRES, 0.04);
        balle.position.copy(origine);
        barillet.add(balle);
        balles.push({ balle, origine, envol: null });
    }

    const texteEssais = panneauTexte("6 ESSAIS", {
        largeur: 2.4, hauteur: 0.5, taille: 0.7, couleur: "#ffe6b8", contour: "#3a1a08",
    });
    texteEssais.position.set(0, -1.35, 0);
    barilletRacine.add(texteEssais);

    const rotationBarillet = creerRessort(0, 120, 10);
    element("barillet", barilletRacine);

    /* =====================================================
       5. Boutons du coin
       ===================================================== */

    const coinRacine = new THREE.Group();
    const boutonNouvelle = creerBouton("NOUVELLE PARTIE", { largeur: 3.6, hauteur: 0.85, taille: 0.5, action: () => actions.nouvellePartie() });
    coinRacine.add(boutonNouvelle.racine);

    /*
     * Panneau de volume : pour la musique et pour les effets,
     * un bouton "−", 5 crans cliquables (comme les barres de réseau d'un téléphone) et un bouton "+".
     */
    const panneauVolume = new THREE.Group();
    panneauVolume.position.set(0, -1.55, 0);
    const plancheVolume = new THREE.Mesh(new RoundedBoxGeometry(3.6, 1.75, 0.22, 3, 0.08), MAT.boisFonce);
    panneauVolume.add(plancheVolume, clou(-1.62, 0.7, 0.12), clou(1.62, 0.7, 0.12));
    coinRacine.add(panneauVolume);

    const matCranPlein = MAT.laiton;
    const matCranVide = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 });
    const reglages = {};

    function petitBouton(texte, action) {
        const groupe = new THREE.Group();
        const disque = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 24), MAT.laiton);
        disque.rotation.x = Math.PI / 2;
        const signe = panneauTexte(texte, { largeur: 0.4, hauteur: 0.4, taille: 0.8, couleur: "#3a1f0c", ombre: false, police: POLICE_TEXTE });
        signe.position.z = 0.06;
        groupe.add(disque, signe);
        rendreCliquable([disque, signe], action, groupe);
        return groupe;
    }

    [["musique", "MUSIQUE", 0.38], ["effets", "EFFETS", -0.42]].forEach(([canal, libelle, y]) => {
        const ligne = new THREE.Group();
        ligne.position.set(0, y, 0.12);

        const titre = panneauTexte(libelle, { largeur: 1.25, hauteur: 0.4, taille: 0.62, couleur: "#ffe6b8", contour: "#2a1004", police: POLICE_TEXTE });
        titre.position.x = -1.05;
        ligne.add(titre);

        const moins = petitBouton("−", () => changerVolume(canal, sons.niveau(canal) - 1));
        moins.position.x = -0.22;
        const plus = petitBouton("+", () => changerVolume(canal, sons.niveau(canal) + 1));
        plus.position.x = 1.5;
        ligne.add(moins, plus);

        const crans = [];
        for (let i = 0; i < sons.NIVEAU_MAX; i++) {
            const hauteur = 0.14 + i * 0.07;
            const cran = new THREE.Mesh(new THREE.BoxGeometry(0.16, hauteur, 0.08), matCranVide);
            cran.position.set(0.12 + i * 0.25, hauteur / 2 - 0.2, 0);
            ligne.add(cran);
            // Cliquer sur un cran règle directement le niveau (cliquer sur le cran actif le coupe)
            rendreCliquable([cran], () => {
                const niveau = sons.niveau(canal) === i + 1 ? 0 : i + 1;
                changerVolume(canal, niveau);
            }, cran);
            crans.push(cran);
        }

        panneauVolume.add(ligne);
        reglages[canal] = crans;
    });

    function afficherVolume(canal) {
        const niveau = sons.niveau(canal);
        reglages[canal].forEach((cran, i) => {
            cran.material = i < niveau ? matCranPlein : matCranVide;
        });
    }

    function changerVolume(canal, niveau) {
        sons.debloquer();
        sons.reglerVolume(canal, niveau);
        afficherVolume(canal);
        if (canal === "effets") sons.bonne(); // petit son pour entendre le nouveau volume
    }

    afficherVolume("musique");
    afficherVolume("effets");
    element("coin", coinRacine);

    /* =====================================================
       6. Bannière de fin de partie
       ===================================================== */

    const banniereRacine = new THREE.Group();
    const plancheBanniere = new THREE.Mesh(new RoundedBoxGeometry(7.4, 3.3, 0.3, 3, 0.12), MAT.bois);
    const titreBanniere = panneauTexte("BRAVO !", { largeur: 7, hauteur: 1.3, taille: 0.8, couleur: "#ffd27a", contour: "#3a1004" });
    titreBanniere.position.set(0, 0.7, 0.16);
    const texteBanniere = panneauTexte("", { largeur: 6.8, hauteur: 0.6, police: POLICE_TEXTE, taille: 0.6, couleur: "#fff1d6" });
    texteBanniere.position.set(0, -0.35, 0.16);
    const boutonRejouer = creerBouton("REJOUER", { largeur: 3, hauteur: 0.95, taille: 0.6, action: () => actions.nouvellePartie() });
    boutonRejouer.racine.position.set(0, -2.05, 0.1);
    banniereRacine.add(plancheBanniere, titreBanniere, texteBanniere, boutonRejouer.racine,
        clou(-3.4, 1.4, 0.16), clou(3.4, 1.4, 0.16), clou(-3.4, -1.4, 0.16), clou(3.4, -1.4, 0.16));
    element("banniere", banniereRacine);
    const chuteBanniere = creerRessort(8, 90, 9);

    /* =====================================================
       Mise en page : place les éléments selon la taille de l'écran
       ===================================================== */

    function mettreEnPage() {
        const hauteurVue = 2 * DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const largeurVue = hauteurVue * camera.aspect;
        const marge = hauteurVue * 0.035;
        const portrait = camera.aspect < 1;

        const placer = (nom, x, y, echelle, z = 0) => {
            const e = elements[nom];
            if (!e) return;
            e.echelle = echelle;
            e.x = x;
            e.y = y;
            e.racine.position.set(x, y, -DISTANCE + z);
        };

        // Titre au centre
        const eTitre = elements.titre;
        const sTitre = Math.min((largeurVue * 0.9) / eTitre.largeur, (hauteurVue * 0.6) / 7.6);
        placer("titre", 0, hauteurVue * 0.05, sTitre, 0.5);

        // Coin : boutons en haut à droite
        const eCoin = elements.coin;
        // Sur téléphone, on l'agrandit : les crans du volume doivent rester faciles à toucher
        const sCoin = Math.min((hauteurVue * 0.24) / eCoin.hauteur, (largeurVue * (portrait ? 0.5 : 0.3)) / eCoin.largeur);
        placer("coin", largeurVue / 2 - marge - (eCoin.largeur * sCoin) / 2, hauteurVue / 2 - marge - (0.45 * sCoin), sCoin);

        // Barillet en haut à gauche
        const eBar = elements.barillet;
        const sBar = Math.min((hauteurVue * 0.2) / eBar.hauteur, (largeurVue * 0.22) / eBar.largeur);
        placer("barillet", -largeurVue / 2 + marge + (eBar.largeur * sBar) / 2, hauteurVue / 2 - marge - 0.95 * sBar, sBar);

        // Clavier en bas
        const eCla = elements.clavier;
        const sCla = Math.min((largeurVue * 0.96) / eCla.largeur, (hauteurVue * (portrait ? 0.27 : 0.29)) / eCla.hauteur);
        placer("clavier", 0, -hauteurVue / 2 + marge + (eCla.hauteur * sCla) / 2, sCla);

        // Mot : en haut au centre, entre le barillet et le coin s'il y a la place, sinon en dessous
        if (elements.mot) {
            const eMot = elements.mot;
            const largeurCotes = 2 * Math.max(eCoin.largeur * sCoin, eBar.largeur * sBar) + 4 * marge;
            const placeEntre = largeurVue - largeurCotes;
            const sEntre = Math.min(placeEntre / eMot.largeur, (hauteurVue * 0.24) / eMot.hauteur);
            // En paysage (tablette), on limite sa hauteur pour ne pas cacher la potence
            const sDessous = Math.min((largeurVue * 0.95) / eMot.largeur, (hauteurVue * (portrait ? 0.24 : 0.15)) / eMot.hauteur);

            // On choisit "entre" seulement si le mot y reste assez grand
            if (!portrait && sEntre >= sDessous * 0.75) {
                placer("mot", 0, hauteurVue / 2 - marge - 1.7 * sEntre, sEntre, 0.2);
            } else {
                const hautOccupe = Math.max(eCoin.hauteur * sCoin, eBar.hauteur * sBar) + marge * 1.5;
                placer("mot", 0, hauteurVue / 2 - hautOccupe - 1.7 * sDessous, sDessous, 0.2);
            }
        }

        // Bannière de fin : à la place du clavier (qui se range), pour laisser voir le cowboy
        const sBan = Math.min((largeurVue * 0.9) / 7.4, (hauteurVue * 0.34) / 4.3);
        placer("banniere", 0, -hauteurVue / 2 + marge + 2.6 * sBan, sBan);
    }

    /* =====================================================
       Souris / doigt : survol et clic
       ===================================================== */

    const rayon = new THREE.Raycaster();
    const pointeur = new THREE.Vector2(9, 9);
    let survole = null;
    let appuye = null;

    function interactifSous(evenement) {
        const rect = canvas.getBoundingClientRect();
        pointeur.x = ((evenement.clientX - rect.left) / rect.width) * 2 - 1;
        pointeur.y = -((evenement.clientY - rect.top) / rect.height) * 2 + 1;
        rayon.setFromCamera(pointeur, camera);

        const cibles = [];
        for (const i of interactifs) {
            if (i.actif && estVisible(i.meshes[0])) cibles.push(...i.meshes);
        }
        const touche = rayon.intersectObjects(cibles, false)[0];
        return touche ? touche.object.userData.interactif : null;
    }

    function estVisible(objet) {
        let o = objet;
        while (o) {
            if (!o.visible) return false;
            o = o.parent;
        }
        return true;
    }

    canvas.addEventListener("pointermove", (e) => {
        survole = interactifSous(e);
        document.body.classList.toggle("survol", !!survole);
    });

    canvas.addEventListener("pointerdown", (e) => {
        sons.debloquer();
        appuye = interactifSous(e);
        if (appuye) {
            appuye.appui.cible = 1;
            if (appuye.touche) sons.clic();
        }
    });

    window.addEventListener("pointerup", (e) => {
        if (!appuye) return;
        const relache = interactifSous(e);
        appuye.appui.cible = 0;
        if (relache === appuye && appuye.actif) appuye.action();
        appuye = null;
    });

    canvas.addEventListener("pointerleave", () => {
        survole = null;
        document.body.classList.remove("survol");
    });

    /* =====================================================
       Animation à chaque image
       ===================================================== */

    let victoire = false;

    function mettreAJour(t, dt) {
        // Apparition / disparition des éléments (effet ressort sur l'échelle)
        for (const e of Object.values(elements)) {
            const a = animerRessort(e.apparition, dt);
            e.racine.scale.setScalar(Math.max(e.echelle * a, 0.0001));
            e.racine.visible = a > 0.01;
            // Léger balancement des panneaux suspendus
            e.racine.rotation.z = Math.sin(t * 0.9 + e.flottement) * 0.008;
        }

        // Titre : balancement plus marqué
        elements.titre.racine.rotation.z = Math.sin(t * 1.1) * 0.02;

        // Bannière : tombe du haut
        const chute = animerRessort(chuteBanniere, dt);
        if (elements.banniere.y !== undefined) {
            elements.banniere.racine.position.y = elements.banniere.y + chute * elements.banniere.echelle;
        }

        // Boutons et touches : survol + appui
        for (const i of interactifs) {
            i.survol.cible = i === survole && i.actif ? 1 : 0;
            const s = animerRessort(i.survol, dt);
            const a = animerRessort(i.appui, dt);
            if (!i.touche) {
                i.groupe.scale.setScalar(1 + s * 0.06 - a * 0.05);
                if (!i.groupe.userData.zDepart) i.groupe.userData.zDepart = i.groupe.position.z || 0.0001;
                i.groupe.position.z = i.groupe.userData.zDepart - a * 0.12;
            }
        }

        // Touches du clavier
        for (const touche of touches.values()) {
            const { interactif } = touche;
            const s = interactif.survol.valeur;
            const a = interactif.appui.valeur;
            const enf = animerRessort(touche.enfoncement, dt);
            // Hauteur : levée au survol, enfoncée à l'appui, reste basse une fois jouée
            touche.tete.position.y = 0.5 + s * 0.08 - a * 0.22 - enf * 0.16;
            touche.tete.scale.setScalar(1 + s * 0.06);

            touche.flash = Math.max(0, touche.flash - dt * 1.4);
            const couleur = touche.disque.material.color;
            if (touche.etat === "correct") couleur.copy(VERT);
            else if (touche.etat === "faux") couleur.copy(GRIS).lerp(ROUGE, touche.flash);
            else couleur.copy(BLANC);

            const emissif = touche.anneau.material.emissive;
            if (touche.etat === "correct") emissif.setHex(0x1f8a4a);
            else if (touche.etat === "faux") emissif.setRGB(touche.flash * 0.8, 0, 0);
            else emissif.setRGB(s * 0.35, s * 0.25, 0);
        }

        // Tuiles du mot : se retournent (avec un délai pour l'effet "vague")
        for (const t2 of tuiles) {
            if (t2.delai > 0) {
                t2.delai -= dt;
                if (t2.delai <= 0) {
                    t2.rotation.cible = Math.PI;
                    sons.clic();
                }
            }
            const r = animerRessort(t2.rotation, dt);
            t2.tuile.rotation.y = r;
            // Pendant qu'elle tourne, la tuile avance un peu vers nous
            t2.tuile.position.z = 0.2 + Math.sin(Math.min(Math.max(r, 0), Math.PI)) * 0.5;
            t2.tuile.position.y = victoire ? -0.08 + Math.max(0, Math.sin(t * 6 - t2.index * 0.6)) * 0.18 : -0.08;
        }

        // Barillet
        barillet.rotation.z = animerRessort(rotationBarillet, dt);
        for (const b of balles) {
            if (!b.envol) continue;
            b.envol.vitesse.y -= 12 * dt;
            b.balle.position.addScaledVector(b.envol.vitesse, dt);
            b.balle.rotation.x += dt * 12;
            b.balle.rotation.y += dt * 9;
            b.envol.vie -= dt;
            b.balle.visible = b.envol.vie > 0;
        }
    }

    /* =====================================================
       Commandes utilisées par main.js
       ===================================================== */

    mettreEnPage();

    return {
        mettreAJour,
        mettreEnPage,

        afficherTitre(visible) {
            montrer("titre", visible);
            boutonJouer.interactif.actif = visible;
        },

        afficherJeu(visible) {
            for (const nom of ["clavier", "barillet", "coin", "mot"]) montrer(nom, visible);
        },

        nouveauMot(mot) {
            victoire = false;
            construirePanneauMot(mot);
            montrer("mot", true);
            elements.mot.apparition.valeur = 0;

            for (const touche of touches.values()) {
                touche.etat = "normal";
                touche.enfoncement.cible = 0;
                touche.interactif.actif = true;
            }

            rotationBarillet.cible = 0;
            for (const b of balles) {
                b.envol = null;
                b.balle.visible = true;
                b.balle.position.copy(b.origine);
                b.balle.rotation.set(0, 0, 0);
            }
            texteEssais.userData.changerTexte("6 ESSAIS");

            montrer("banniere", false);
            montrer("clavier", true);
            chuteBanniere.cible = 8;
            boutonNouvelle.interactif.actif = true;
            boutonNouvelle.racine.visible = true;
            montrer("coin", true);
        },

        // Retourne les tuiles des lettres trouvées
        revelerLettre(lettre) {
            let delai = 0;
            for (const t of tuiles) {
                if (t.lettre === lettre && !t.retournee) {
                    t.retournee = true;
                    t.delai = 0.001 + delai;
                    delai += 0.12;
                }
            }
        },

        // Fin de partie perdue : on montre les lettres manquantes en rouge
        revelerTout() {
            let delai = 0.3;
            for (const t of tuiles) {
                if (!t.retournee) {
                    t.retournee = true;
                    t.arriere.material.map = textureTuile(t.lettre, "ratee");
                    t.delai = delai;
                    delai += 0.1;
                }
            }
        },

        marquerTouche(lettre, etat) {
            const touche = touches.get(lettre);
            if (!touche) return;
            touche.etat = etat;
            touche.flash = 1;
            touche.enfoncement.cible = 1;
            touche.interactif.actif = false;
        },

        // Utilisé par le clavier physique : on voit la touche s'enfoncer
        appuyerTouche(lettre) {
            const touche = touches.get(lettre);
            if (!touche || !touche.interactif.actif) return false;
            touche.interactif.appui.cible = 1;
            sons.clic();
            setTimeout(() => {
                touche.interactif.appui.cible = 0;
                actions.lettre(lettre);
            }, 110);
            return true;
        },

        verrouillerClavier() {
            for (const touche of touches.values()) touche.interactif.actif = false;
        },

        perdreBalle(erreurs) {
            const b = balles[erreurs - 1];
            if (b) {
                // La balle est éjectée vers l'avant et tombe
                b.envol = { vitesse: new THREE.Vector3((Math.random() - 0.5) * 3, 4, 3), vie: 1.2 };
            }
            rotationBarillet.cible = (-erreurs * Math.PI) / 3;
            const reste = 6 - erreurs;
            texteEssais.userData.changerTexte(`${reste} ESSAI${reste > 1 ? "S" : ""}`, {
                couleur: reste <= 2 ? "#ff8a6a" : "#ffe6b8",
            });
        },

        afficherResultat(gagne, mot, erreurs) {
            victoire = gagne;
            titreBanniere.userData.changerTexte(gagne ? "BRAVO, COWBOY !" : "PENDU !", {
                couleur: gagne ? "#ffd27a" : "#ff7a5a",
            });
            texteBanniere.userData.changerTexte(
                gagne ? `Trouvé avec ${erreurs} erreur${erreurs > 1 ? "s" : ""}.` : `Le mot était ${mot}.`,
            );
            montrer("banniere", true);
            montrer("clavier", false);
            elements.banniere.apparition.valeur = 1;
            chuteBanniere.valeur = 8;
            chuteBanniere.cible = 0;
            boutonNouvelle.interactif.actif = false;
            boutonNouvelle.racine.visible = false; // le volume, lui, reste réglable
        },

        enJeu() {
            return elements.clavier.apparition.cible === 1;
        },
    };
}
