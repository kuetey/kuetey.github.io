/*
 * effects.js — effets visuels généraux
 * 1. Halo lumineux du fond qui suit la souris
 * 2. Légère inclinaison 3D de la carte + rotation de la scène 3D du pendu (v3)
 * 3. Conservation de la position de défilement entre deux coups (utile sur mobile)
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Envoyer la position de la souris au CSS sous forme de nombres (--px, --py)
 *   pour que la scène 3D tourne avec calc(var(--px) * 28deg).
 * - Revenir à une position neutre quand la souris quitte la fenêtre (mouseleave).
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

        // v3 : valeurs brutes (-0.5 à 0.5) utilisées par la scène 3D du pendu (voir .stage-inner)
        document.documentElement.style.setProperty("--px", (x - 0.5).toFixed(3));
        document.documentElement.style.setProperty("--py", (y - 0.5).toFixed(3));
    });

    document.addEventListener("mouseleave", () => {
        carte.style.setProperty("--rx", "0deg");
        carte.style.setProperty("--ry", "0deg");
        document.documentElement.style.setProperty("--px", "0");
        document.documentElement.style.setProperty("--py", "0");
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
