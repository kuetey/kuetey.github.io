/*
 * keyboard.js — prise en charge du clavier physique
 * - Taper une lettre = cliquer sur la touche correspondante du clavier virtuel
 * - Les accents sont acceptés : é, è, ê → E, ç → C…
 * - Entrée = rejouer quand la partie est terminée
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Relier le clavier physique à une page existante sans la réécrire :
 *   on « clique » simplement sur le bouton HTML correspondant (touche.click()).
 * - Normaliser le texte pour accepter les accents : normalize("NFD") puis suppression des accents.
 * - Une expression régulière pour vérifier qu'on a bien une lettre de A à Z.
 * - Un drapeau (coupEnCours) pour éviter d'envoyer deux lettres pendant le rechargement.
 * ---------------------------------------------------------------------------
 */

let coupEnCours = false; // évite d'envoyer deux lettres pendant le rechargement

function lettreSansAccent(texte) {
    // "é" devient "e" + accent séparé, puis on supprime l'accent
    return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

document.addEventListener("keydown", (evenement) => {
    // On ignore les raccourcis (Ctrl+R, Alt+Tab…)
    if (evenement.ctrlKey || evenement.altKey || evenement.metaKey) {
        return;
    }

    if (evenement.key === "Enter") {
        const boutonRejouer = document.querySelector(".btn-play");
        if (boutonRejouer) {
            evenement.preventDefault();
            boutonRejouer.click();
        }
        return;
    }

    const lettre = lettreSansAccent(evenement.key);

    if (!/^[A-Z]$/.test(lettre) || coupEnCours) {
        return;
    }

    const touche = document.querySelector(`.key[value="${lettre}"]`);

    if (!touche || touche.disabled) {
        return;
    }

    coupEnCours = true;

    // Petit effet d'appui visible avant l'envoi du formulaire
    touche.classList.add("pressed");
    setTimeout(() => touche.click(), 90);
});
