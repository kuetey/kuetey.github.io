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
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Séparer les RÈGLES du jeu de l'AFFICHAGE : ce fichier pourrait servir
 *   tel quel à une version texte, 2D ou 3D. La v4 et la v5 utilisent exactement le même.
 * - Les modules JavaScript : "export" rend une fonction utilisable ailleurs avec "import".
 * - Traduire du PHP en JavaScript : in_array() → includes(), strtoupper() → toUpperCase(),
 *   preg_match() → une expression régulière avec .test().
 * - Représenter l'état d'une partie avec un seul objet, au lieu de variables de session.
 * - Une fonction qui renvoie null pour dire « rien ne s'est passé » : l'appelant
 *   sait alors qu'il ne doit rien animer.
 * ---------------------------------------------------------------------------
 */

// Nombre d'erreurs autorisées avant de perdre (tête, corps, 2 bras, 2 jambes = 6).
// "export" : main.js peut l'importer pour afficher "x / 6".
// "const" : cette valeur ne changera jamais pendant le programme.
export const ERREURS_MAX = 6;

/*
 * Crée une nouvelle partie à partir de la liste de mots.
 * Paramètre : mots → un tableau de chaînes, par exemple ["INTERNET", "ALGORITHME"]
 * Renvoie   : un objet qui décrit toute la partie
 */
export function nouvellePartie(mots) {
    // Math.random() donne un nombre à virgule entre 0 (inclus) et 1 (exclu), ex : 0.734
    // En le multipliant par le nombre de mots (15), on obtient un nombre entre 0 et 14,99…
    // Math.floor() arrondit vers le bas : on obtient donc un index entier entre 0 et 14.
    // (En PHP, j'utilisais random_int(0, count($mots) - 1) pour la même chose.)
    const index = Math.floor(Math.random() * mots.length);

    // On renvoie un "objet littéral" : des paires clé → valeur entre accolades.
    return {
        // Le mot à deviner, mis en majuscules par sécurité (comme strtoupper en PHP)
        mot: mots[index].toUpperCase(),
        // Les lettres correctes déjà jouées (tableau vide au départ)
        lettresTrouvees: [],
        // Les lettres fausses déjà jouées (leur nombre = le nombre d'erreurs)
        lettresFausses: [],
        // L'état de la partie : "en_cours", "gagne" ou "perdu"
        statut: "en_cours",
    };
}

/*
 * Vérifie si toutes les lettres du mot ont été trouvées.
 * Renvoie true (vrai) ou false (faux) : c'est un "booléen".
 */
export function motEstTrouve(partie) {
    // "for...of" parcourt chaque caractère de la chaîne : "MOT" → "M", puis "O", puis "T"
    for (const lettre of partie.mot) {
        // includes() répond à la question : « cette lettre est-elle dans le tableau ? »
        // Le "!" inverse la réponse : on cherche une lettre qui N'EST PAS encore trouvée.
        if (!partie.lettresTrouvees.includes(lettre)) {
            // Une seule lettre manquante suffit : inutile de continuer la boucle.
            return false;
        }
    }

    // Si on arrive ici, la boucle n'a trouvé aucune lettre manquante : le mot est complet.
    return true;
}

/*
 * Joue une lettre et met la partie à jour.
 * Renvoie "bonne", "mauvaise", ou null si la lettre n'est pas jouable.
 *
 * Attention : cette fonction MODIFIE l'objet "partie" qu'on lui donne
 * (en JavaScript, un objet passé à une fonction n'est pas copié : c'est le même objet).
 */
export function jouerLettre(partie, lettre) {
    // On accepte "e" comme "E" : tout est comparé en majuscules.
    lettre = lettre.toUpperCase();

    // "||" veut dire "OU" : la lettre est déjà jouée si elle est dans l'un OU l'autre tableau.
    const dejaJouee = partie.lettresTrouvees.includes(lettre) || partie.lettresFausses.includes(lettre);

    // Trois raisons de refuser la lettre (même contrôle que dans ma version PHP) :
    // 1. la partie est terminée ;
    // 2. ce n'est pas UNE lettre de A à Z. /^[A-Z]$/ est une "expression régulière" :
    //    ^ = début, [A-Z] = un caractère entre A et Z, $ = fin → exactement une lettre ;
    // 3. la lettre a déjà été jouée.
    if (partie.statut !== "en_cours" || !/^[A-Z]$/.test(lettre) || dejaJouee) {
        // null = « rien ne s'est passé » : main.js ne déclenchera aucune animation.
        return null;
    }

    // "let" (et non "const") car la valeur est donnée plus bas, dans le if / else.
    let resultat;

    // includes() fonctionne aussi sur une chaîne : "ORDINATEUR".includes("D") → true
    // (En PHP : strpos($mot, $lettre) !== false)
    if (partie.mot.includes(lettre)) {
        // push() ajoute un élément à la fin du tableau (en PHP : $tableau[] = $lettre)
        partie.lettresTrouvees.push(lettre);
        resultat = "bonne";
    } else {
        partie.lettresFausses.push(lettre);
        resultat = "mauvaise";
    }

    // Après chaque coup, on vérifie si la partie est finie.
    if (motEstTrouve(partie)) {
        partie.statut = "gagne";
    } else if (partie.lettresFausses.length >= ERREURS_MAX) {
        // .length = nombre d'éléments du tableau (en PHP : count($tableau))
        partie.statut = "perdu";
    }

    // On renvoie le résultat pour que l'affichage sache quoi animer.
    return resultat;
}
