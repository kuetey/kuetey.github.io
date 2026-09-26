/*
 * effects.js — effets visuels généraux (repris de la v2)
 * 1. Halo lumineux du fond qui suit la souris
 * 2. Légère inclinaison 3D de la carte
 * (La conservation du défilement de la v2 n'est plus utile : la page ne se recharge plus.)
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Simplifier un fichier quand le besoin change : sans rechargement de page,
 *   la sauvegarde du défilement de la v2 n'est plus utile.
 * ---------------------------------------------------------------------------
 */

const moinsDAnimations = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ecranTactile = window.matchMedia("(hover: none)").matches;

const carte = document.querySelector(".game-card");
const INCLINAISON_MAX = 2.5; // plus discret qu'en v2 : la scène 3D bouge déjà

if (!moinsDAnimations && !ecranTactile) {
    document.addEventListener("mousemove", (evenement) => {
        const x = evenement.clientX / window.innerWidth;
        const y = evenement.clientY / window.innerHeight;

        document.documentElement.style.setProperty("--mx", `${x * 100}%`);
        document.documentElement.style.setProperty("--my", `${y * 100}%`);

        carte.style.setProperty("--ry", `${(x - 0.5) * INCLINAISON_MAX}deg`);
        carte.style.setProperty("--rx", `${(0.5 - y) * INCLINAISON_MAX}deg`);
    });

    document.addEventListener("mouseleave", () => {
        carte.style.setProperty("--rx", "0deg");
        carte.style.setProperty("--ry", "0deg");
    });
}
