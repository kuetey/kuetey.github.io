/*
 * main.js — le chef d'orchestre
 * - reçoit les actions du joueur (clic sur une touche, clavier physique) ;
 * - demande à jeu.js d'appliquer les règles ;
 * - met à jour la page (mot, clavier, cœurs, message) ;
 * - prévient la scène 3D de ce qui s'est passé.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Passer d'une page qui se recharge (PHP) à une page qui se met à jour elle-même (DOM).
 * - Créer des éléments en JavaScript (createElement, appendChild) et gérer des événements (click, keydown).
 * - Relancer une animation CSS : retirer la classe, lire offsetWidth, puis remettre la classe.
 * - Garder l'idée de la « dernière action » de la v2 pour n'animer que ce qui change.
 * - Prévoir un plan B : si la 3D ne démarre pas (try / catch), le jeu reste jouable.
 * ---------------------------------------------------------------------------
 */

import { MOTS } from "./mots.js";
import { ERREURS_MAX, nouvellePartie, jouerLettre } from "./jeu.js";
import { creerScene } from "./scene3d.js";

const RANGEES_CLAVIER = [
    ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
    ["W", "X", "C", "V", "B", "N"],
];

// Raccourcis vers les éléments de la page
const elements = {
    carte: document.getElementById("card"),
    nbLettres: document.getElementById("nb-lettres"),
    erreurs: document.getElementById("erreurs"),
    coeurs: document.getElementById("coeurs"),
    mot: document.getElementById("mot"),
    message: document.getElementById("message"),
    clavier: document.getElementById("clavier"),
    boutonNouvelle: document.getElementById("bouton-nouvelle"),
    scene: document.getElementById("scene3d"),
};

let partie;
let scene = null;

/* ---------- Démarrage de la 3D ---------- */

try {
    scene = creerScene(elements.scene);
} catch (erreur) {
    console.error(erreur);
    elements.scene.innerHTML = `<p class="scene-error">La 3D n'a pas pu démarrer sur cet appareil.<br>Le jeu reste jouable !</p>`;
}

/* ---------- Affichage ---------- */

// Les étoiles du fond (en PHP on les générait avec une boucle for : même idée ici)
function creerEtoiles() {
    const conteneur = document.getElementById("stars");

    for (let i = 0; i < 28; i++) {
        const etoile = document.createElement("span");
        etoile.style.setProperty("--x", `${Math.random() * 100}%`);
        etoile.style.setProperty("--y", `${Math.random() * 100}%`);
        etoile.style.setProperty("--size", `${2 + Math.random() * 3}px`);
        etoile.style.setProperty("--delay", `-${Math.random() * 6}s`);
        conteneur.appendChild(etoile);
    }
}

// Les touches ne sont créées qu'une fois ; ensuite on change seulement leurs classes
function creerClavier() {
    for (const rangee of RANGEES_CLAVIER) {
        const ligne = document.createElement("div");
        ligne.className = "keyboard-row";

        for (const lettre of rangee) {
            const touche = document.createElement("button");
            touche.type = "button";
            touche.className = "key";
            touche.textContent = lettre;
            touche.dataset.lettre = lettre;
            touche.addEventListener("click", () => jouer(lettre));
            ligne.appendChild(touche);
        }

        elements.clavier.appendChild(ligne);
    }
}

/*
 * Met toute la page à jour à partir de l'état de la partie.
 * derniereAction ressemble à celle de la v2 : { lettre: "E", resultat: "bonne" }
 */
function afficher(derniereAction = null) {
    const { mot, lettresTrouvees, lettresFausses, statut } = partie;
    const erreurs = lettresFausses.length;
    const essaisRestants = ERREURS_MAX - erreurs;
    const nouvelleErreur = derniereAction?.resultat === "mauvaise";

    document.body.className = `etat-${statut}`;
    elements.nbLettres.textContent = `${mot.length} lettres`;
    elements.erreurs.textContent = `${erreurs} / ${ERREURS_MAX}`;

    // Cœurs
    elements.coeurs.innerHTML = "";
    elements.coeurs.setAttribute("aria-label", `${essaisRestants} essai(s) restant(s)`);
    for (let i = 0; i < ERREURS_MAX; i++) {
        const coeur = document.createElement("span");
        coeur.className = "heart";
        coeur.textContent = "♥";
        if (i >= essaisRestants) coeur.classList.add("lost");
        if (nouvelleErreur && i === essaisRestants) coeur.classList.add("breaking");
        elements.coeurs.appendChild(coeur);
    }

    // Mot : une carte 3D par lettre (même principe que la v3)
    elements.mot.innerHTML = "";
    [...mot].forEach((lettre, i) => {
        const estRevelee = lettresTrouvees.includes(lettre);
        const case_ = document.createElement("span");
        case_.className = "letter";
        case_.style.setProperty("--i", i);

        if (estRevelee) case_.classList.add("revealed");
        else if (statut === "perdu") case_.classList.add("missed");
        if (derniereAction?.resultat === "bonne" && lettre === derniereAction.lettre) case_.classList.add("pop");

        const visible = estRevelee || statut === "perdu";
        case_.innerHTML = `
            <span class="letter-inner">
                <span class="face face-front">?</span>
                <span class="face face-back">${visible ? lettre : ""}</span>
            </span>`;
        elements.mot.appendChild(case_);
    });

    // Clavier
    for (const touche of elements.clavier.querySelectorAll(".key")) {
        const lettre = touche.dataset.lettre;
        const estTrouvee = lettresTrouvees.includes(lettre);
        const estFausse = lettresFausses.includes(lettre);

        touche.classList.remove("pressed", "just-played");
        touche.classList.toggle("correct", estTrouvee);
        touche.classList.toggle("wrong", estFausse);
        touche.disabled = estTrouvee || estFausse || statut !== "en_cours";

        if (derniereAction?.lettre === lettre) {
            // Astuce : lire offsetWidth force le navigateur à relancer l'animation CSS
            void touche.offsetWidth;
            touche.classList.add("just-played");
        }
    }
    elements.clavier.classList.toggle("locked", statut !== "en_cours");

    // Message de fin ou consigne
    if (statut === "en_cours") {
        elements.message.innerHTML = `<div class="letters-title">CHOISIS UNE LETTRE <small>(ou tape-la au clavier)</small></div>`;
        elements.boutonNouvelle.hidden = false;
    } else {
        const gagne = statut === "gagne";
        elements.message.innerHTML = `
            <div class="result ${gagne ? "success" : "failure"}">
                <div class="result-emoji">${gagne ? "🎉" : "😵"}</div>
                <div class="result-text">
                    <strong>${gagne ? "Bravo !" : "Dommage !"}</strong>
                    ${gagne
                        ? `Trouvé avec ${erreurs} erreur${erreurs > 1 ? "s" : ""}.`
                        : `Le mot était <b>${mot}</b>.`}
                </div>
                <button class="btn btn-play" type="button">${gagne ? "▶ Rejouer" : "↻ Réessayer"}</button>
            </div>`;
        elements.message.querySelector(".btn-play").addEventListener("click", demarrer);
        elements.boutonNouvelle.hidden = true;
    }

    // Tremblement de la carte après une erreur
    elements.carte.classList.remove("shake", "enter");
    if (nouvelleErreur) {
        void elements.carte.offsetWidth;
        elements.carte.classList.add("shake");
    }
}

/* ---------- Actions ---------- */

function jouer(lettre) {
    const resultat = jouerLettre(partie, lettre);

    if (resultat === null) {
        return; // lettre déjà jouée ou partie finie
    }

    afficher({ lettre, resultat });

    if (!scene) return;

    if (resultat === "mauvaise") {
        scene.ajouterPartie(partie.lettresFausses.length);
    } else {
        scene.bonneLettre();
    }

    if (partie.statut === "gagne") scene.victoire();
    if (partie.statut === "perdu") scene.defaite();
    else scene.humeur(partie.lettresFausses.length >= 4 ? "inquiet" : "normal");
}

function demarrer() {
    partie = nouvellePartie(MOTS);
    scene?.reinitialiser();
    afficher();
}

/* ---------- Clavier physique (repris de keyboard.js de la v2) ---------- */

function lettreSansAccent(texte) {
    return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

document.addEventListener("keydown", (evenement) => {
    if (evenement.ctrlKey || evenement.altKey || evenement.metaKey) return;

    if (evenement.key === "Enter" && partie.statut !== "en_cours") {
        evenement.preventDefault();
        demarrer();
        return;
    }

    const lettre = lettreSansAccent(evenement.key);
    if (!/^[A-Z]$/.test(lettre)) return;

    const touche = elements.clavier.querySelector(`[data-lettre="${lettre}"]`);
    if (touche && !touche.disabled) {
        touche.classList.add("pressed");
        setTimeout(() => jouer(lettre), 90);
    }
});

elements.boutonNouvelle.addEventListener("click", demarrer);

/* ---------- Lancement ---------- */

creerEtoiles();
creerClavier();
demarrer();
elements.carte.classList.add("enter");
