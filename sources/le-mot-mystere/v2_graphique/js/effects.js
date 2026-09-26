/*
 * effects.js — effets visuels généraux
 * 1. Halo lumineux du fond qui suit la souris
 * 2. Légère inclinaison 3D de la carte
 * 3. Conservation de la position de défilement entre deux coups (utile sur mobile)
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Écouter un événement (mousemove) et en tirer une position en pourcentage de l'écran.
 * - Passer des valeurs du JavaScript au CSS avec des variables : style.setProperty("--rx", …).
 * - matchMedia() : adapter le comportement (écran tactile, animations réduites).
 * - sessionStorage pour retrouver la position de défilement après un rechargement,
 *   avec try / catch car le stockage peut être indisponible (navigation privée).
 * ---------------------------------------------------------------------------
 */

const moinsDAnimations = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ecranTactile = window.matchMedia("(hover: none)").matches;

/* ---------- 1 et 2 : souris ---------- */

const carte = document.querySelector(".game-card");
const INCLINAISON_MAX = 4; // en degrés : reste discret

if (!moinsDAnimations && !ecranTactile) {
    document.addEventListener("mousemove", (evenement) => {
        // Position de la souris en pourcentage de la fenêtre
        const x = evenement.clientX / window.innerWidth;
        const y = evenement.clientY / window.innerHeight;

        document.documentElement.style.setProperty("--mx", `${x * 100}%`);
        document.documentElement.style.setProperty("--my", `${y * 100}%`);

        // x et y vont de 0 à 1 ; on les ramène entre -0.5 et 0.5
        carte.style.setProperty("--ry", `${(x - 0.5) * INCLINAISON_MAX}deg`);
        carte.style.setProperty("--rx", `${(0.5 - y) * INCLINAISON_MAX}deg`);
    });

    document.addEventListener("mouseleave", () => {
        carte.style.setProperty("--rx", "0deg");
        carte.style.setProperty("--ry", "0deg");
    });
}

/* ---------- 3 : position de défilement ---------- */

// Chaque coup recharge la page : on retient où l'on était pour y revenir
const CLE_SCROLL = "mot-mystere-scroll";

try {
    const position = sessionStorage.getItem(CLE_SCROLL);
    if (position !== null) {
        window.scrollTo(0, Number(position));
        sessionStorage.removeItem(CLE_SCROLL);
    }
} catch (erreur) {
    // sessionStorage indisponible (navigation privée…) : ce n'est pas grave
}

document.querySelectorAll("form").forEach((formulaire) => {
    formulaire.addEventListener("submit", () => {
        try {
            sessionStorage.setItem(CLE_SCROLL, String(window.scrollY));
        } catch (erreur) {}
    });
});
