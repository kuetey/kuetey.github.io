/*
 * textures.js — fabrique des images (bois, lettres, textes) dans un <canvas>
 * puis les transforme en textures Three.js.
 *
 * Avantage : aucune image à télécharger, et on peut écrire n'importe quel texte
 * avec les polices western chargées depuis Google Fonts.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Dessiner dans un <canvas> 2D (dégradés, texte, formes) et s'en servir comme texture 3D.
 * - Attendre qu'une police soit chargée (document.fonts.load) avant de dessiner du texte.
 * - Un générateur pseudo-aléatoire « à graine » : le même bois est redessiné à l'identique.
 * - Mettre en cache (Map) ce qui est coûteux à fabriquer : une texture par lettre, pas plus.
 * - Réduire automatiquement la taille d'un texte trop long (measureText).
 * - Les espaces de couleurs : une texture de couleur doit être déclarée en SRGBColorSpace.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";

export const POLICE_TITRE = '"Rye", Georgia, serif';
export const POLICE_TEXTE = '"Special Elite", "Courier New", monospace';

const PIXELS_PAR_UNITE = 200; // résolution des textes (plus haut = plus net)

export async function chargerPolices() {
    try {
        await Promise.all([
            document.fonts.load(`64px ${POLICE_TITRE}`),
            document.fonts.load(`32px ${POLICE_TEXTE}`),
        ]);
    } catch (erreur) {
        // Pas grave : le navigateur utilisera une police de secours
    }
}

function creerToile(largeur, hauteur) {
    const toile = document.createElement("canvas");
    toile.width = Math.round(largeur);
    toile.height = Math.round(hauteur);
    return [toile, toile.getContext("2d")];
}

function versTexture(toile) {
    const texture = new THREE.CanvasTexture(toile);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}

/* ---------- Bois ---------- */

// Un générateur pseudo-aléatoire "à graine" : le même bois est redessiné à l'identique
function aleatoire(graine) {
    return () => {
        graine = (graine * 16807) % 2147483647;
        return (graine - 1) / 2147483646;
    };
}

export function peindreBois(ctx, l, h, { clair = "#b07a45", fonce = "#7a4a26", graine = 7 } = {}) {
    const hasard = aleatoire(graine);
    const degrade = ctx.createLinearGradient(0, 0, 0, h);
    degrade.addColorStop(0, clair);
    degrade.addColorStop(1, fonce);
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, l, h);

    // Veines du bois
    ctx.lineWidth = Math.max(1.5, h / 90);
    for (let i = 0; i < 14; i++) {
        const y = hasard() * h;
        ctx.strokeStyle = `rgba(60, 28, 8, ${0.12 + hasard() * 0.18})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= l; x += l / 12) {
            ctx.lineTo(x, y + Math.sin(x * 0.015 + i) * h * 0.02);
        }
        ctx.stroke();
    }

    // Nœuds
    for (let i = 0; i < 2; i++) {
        ctx.fillStyle = "rgba(60, 28, 8, 0.25)";
        ctx.beginPath();
        ctx.ellipse(hasard() * l, hasard() * h, l * 0.03, h * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Bords plus sombres (effet de relief)
    ctx.strokeStyle = "rgba(40, 18, 4, 0.55)";
    ctx.lineWidth = Math.max(4, h * 0.05);
    ctx.strokeRect(0, 0, l, h);
}

export function textureBois(options = {}) {
    const [toile, ctx] = creerToile(512, 256);
    peindreBois(ctx, 512, 256, options);
    return versTexture(toile);
}

/* ---------- Texte ---------- */

/*
 * Crée une texture de texte.
 * largeur / hauteur : taille en unités 3D (la résolution en pixels en découle)
 */
export function textureTexte(texte, {
    largeur = 4,
    hauteur = 1,
    police = POLICE_TITRE,
    taille = 0.6,          // hauteur des lettres, en proportion de la hauteur
    couleur = "#ffe6b8",
    contour = null,        // couleur du contour, ou null
    ombre = true,
    fond = null,           // null (transparent), une couleur, ou "bois"
    bois = {},
} = {}) {
    const l = largeur * PIXELS_PAR_UNITE;
    const h = hauteur * PIXELS_PAR_UNITE;
    const [toile, ctx] = creerToile(l, h);

    if (fond === "bois") peindreBois(ctx, l, h, bois);
    else if (fond) {
        ctx.fillStyle = fond;
        ctx.fillRect(0, 0, l, h);
    }

    let tailleTexte = h * taille;
    ctx.font = `${tailleTexte}px ${police}`;
    // Si le texte est trop long, on réduit la police
    while (ctx.measureText(texte).width > l * 0.92 && tailleTexte > 8) {
        tailleTexte *= 0.94;
        ctx.font = `${tailleTexte}px ${police}`;
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const x = l / 2;
    const y = h / 2 + tailleTexte * 0.06;

    if (ombre) {
        ctx.fillStyle = "rgba(30, 10, 0, 0.55)";
        ctx.fillText(texte, x + tailleTexte * 0.04, y + tailleTexte * 0.06);
    }
    if (contour) {
        ctx.strokeStyle = contour;
        ctx.lineWidth = tailleTexte * 0.12;
        ctx.lineJoin = "round";
        ctx.strokeText(texte, x, y);
    }
    ctx.fillStyle = couleur;
    ctx.fillText(texte, x, y);

    return versTexture(toile);
}

/* ---------- Touches rondes du clavier (machine à écrire ancienne) ---------- */

const cacheTouches = new Map();

export function textureTouche(lettre) {
    if (cacheTouches.has(lettre)) return cacheTouches.get(lettre);

    const taille = 256;
    const [toile, ctx] = creerToile(taille, taille);
    const c = taille / 2;

    // Ivoire bombé
    const degrade = ctx.createRadialGradient(c * 0.8, c * 0.7, 10, c, c, c);
    degrade.addColorStop(0, "#fffaf0");
    degrade.addColorStop(0.75, "#f1e2c2");
    degrade.addColorStop(1, "#cdb58a");
    ctx.fillStyle = degrade;
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();

    // Anneau intérieur fin
    ctx.strokeStyle = "rgba(90, 50, 20, 0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#3a1f0c";
    ctx.font = `${taille * 0.5}px ${POLICE_TITRE}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(lettre, c, c + taille * 0.04);

    const texture = versTexture(toile);
    cacheTouches.set(lettre, texture);
    return texture;
}

/* ---------- Tuiles du mot ---------- */

const cacheTuiles = new Map();

// type : "cachee" (point d'interrogation), "trouvee" ou "ratee" (révélée en rouge à la fin)
export function textureTuile(lettre, type) {
    const cle = `${lettre}-${type}`;
    if (cacheTuiles.has(cle)) return cacheTuiles.get(cle);

    const l = 200;
    const h = 250;
    const [toile, ctx] = creerToile(l, h);

    if (type === "cachee") {
        peindreBois(ctx, l, h, { clair: "#8a5a33", fonce: "#5e3a1c", graine: 3 });
        ctx.fillStyle = "rgba(255, 220, 160, 0.28)";
        ctx.font = `${h * 0.55}px ${POLICE_TITRE}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", l / 2, h / 2 + 8);
    } else {
        // Papier d'affiche "WANTED"
        const degrade = ctx.createRadialGradient(l / 2, h / 2, 10, l / 2, h / 2, h * 0.7);
        degrade.addColorStop(0, type === "ratee" ? "#ffd9cc" : "#fbe9c6");
        degrade.addColorStop(1, type === "ratee" ? "#d98c7a" : "#d9b77e");
        ctx.fillStyle = degrade;
        ctx.fillRect(0, 0, l, h);
        ctx.strokeStyle = "rgba(90, 50, 20, 0.6)";
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, l - 20, h - 20);

        ctx.font = `${h * 0.62}px ${POLICE_TITRE}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = type === "ratee" ? "#a8201a" : "#3a1f0c";
        ctx.fillText(lettre, l / 2, h / 2 + 12);
    }

    const texture = versTexture(toile);
    cacheTuiles.set(cle, texture);
    return texture;
}

/* ---------- Petit utilitaire : un panneau de texte (plan) ---------- */

export function panneauTexte(texte, options = {}) {
    const { largeur = 4, hauteur = 1 } = options;
    const materiau = new THREE.MeshBasicMaterial({
        map: textureTexte(texte, options),
        transparent: true,
        toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur), materiau);

    // Permet de changer le texte plus tard
    mesh.userData.changerTexte = (nouveau, nouvellesOptions = {}) => {
        materiau.map.dispose();
        materiau.map = textureTexte(nouveau, { ...options, ...nouvellesOptions });
        materiau.needsUpdate = true;
    };

    return mesh;
}
