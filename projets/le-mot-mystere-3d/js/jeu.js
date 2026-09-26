/*
 * jeu.js — les règles du jeu
 *
 * C'est la traduction en JavaScript de la partie PHP des versions précédentes :
 *   $_SESSION["mot"]              → partie.mot
 *   $_SESSION["lettres_trouvees"] → partie.lettresTrouvees
 *   $_SESSION["lettres_fausses"]  → partie.lettresFausses
 *   $_SESSION["statut"]           → partie.statut
 *
 * Avantage : plus besoin de serveur PHP, le jeu peut être hébergé sur GitHub Pages.
 * Ce fichier ne touche ni à la page ni à la 3D : il ne fait que calculer.
 */

export const ERREURS_MAX = 6;

export function nouvellePartie(mots) {
    const index = Math.floor(Math.random() * mots.length);

    return {
        mot: mots[index].toUpperCase(),
        lettresTrouvees: [],
        lettresFausses: [],
        statut: "en_cours", // "en_cours", "gagne" ou "perdu"
    };
}

export function motEstTrouve(partie) {
    for (const lettre of partie.mot) {
        if (!partie.lettresTrouvees.includes(lettre)) {
            return false;
        }
    }

    return true;
}

/*
 * Joue une lettre et met la partie à jour.
 * Renvoie "bonne", "mauvaise", ou null si la lettre n'est pas jouable.
 */
export function jouerLettre(partie, lettre) {
    lettre = lettre.toUpperCase();

    const dejaJouee = partie.lettresTrouvees.includes(lettre) || partie.lettresFausses.includes(lettre);

    if (partie.statut !== "en_cours" || !/^[A-Z]$/.test(lettre) || dejaJouee) {
        return null;
    }

    let resultat;

    if (partie.mot.includes(lettre)) {
        partie.lettresTrouvees.push(lettre);
        resultat = "bonne";
    } else {
        partie.lettresFausses.push(lettre);
        resultat = "mauvaise";
    }

    if (motEstTrouve(partie)) {
        partie.statut = "gagne";
    } else if (partie.lettresFausses.length >= ERREURS_MAX) {
        partie.statut = "perdu";
    }

    return resultat;
}
