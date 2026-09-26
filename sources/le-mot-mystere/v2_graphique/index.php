<?php

/*
 * LE MOT MYSTÈRE — v2 graphique
 *
 * PHP garde toutes les règles du jeu (mot, lettres, erreurs, victoire, défaite).
 * Le CSS s'occupe de l'apparence, le JavaScript (dossier js/) des petits effets.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Les SESSIONS : HTTP oublie tout entre deux pages ; $_SESSION garde la partie
 *   côté serveur, le navigateur ne garde qu'un identifiant dans un cookie.
 * - Le modèle POST / REDIRECT / GET : traiter le formulaire, puis rediriger,
 *   pour que la touche F5 ne rejoue pas la dernière lettre.
 * - Le message "flash" : une information gardée en session pour UN SEUL affichage
 *   (ici la dernière lettre jouée), utile pour n'animer que ce qui vient de changer.
 * - Valider tout ce qui vient de l'utilisateur (preg_match, in_array) et échapper
 *   ce qu'on affiche (htmlspecialchars) : ne jamais faire confiance à un formulaire.
 * - Mélanger PHP et HTML proprement : la logique en haut, l'affichage en bas,
 *   avec la syntaxe <?= ?> et les boucles "foreach : / endforeach;".
 * - Générer des classes CSS depuis PHP pour que le CSS se charge de l'animation.
 * ---------------------------------------------------------------------------
 */

// Chaque version a son propre nom de session : les parties de la v1 et de la v2
// ne se mélangent pas, même si elles tournent sur le même ordinateur.
session_name("mot_mystere_v2");

// Démarre (ou reprend) la session : après cette ligne, $_SESSION contient les données
// sauvegardées lors de la page précédente. À appeler AVANT tout affichage HTML.
session_start();

// require inclut le fichier mots.php : la variable $mots y est définie.
// __DIR__ = le dossier de CE fichier, pour que le chemin fonctionne d'où qu'on lance le serveur.
// (require arrête tout si le fichier manque, contrairement à include qui continue.)
require __DIR__ . "/mots.php";

// Constante : nombre d'erreurs autorisées (tête, corps, 2 bras, 2 jambes).
// Une constante ne peut pas être modifiée ensuite, et s'écrit sans $.
const ERREURS_MAX = 6;

/*
 * Démarre une nouvelle partie et l'enregistre dans la session.
 * "array $mots" : le paramètre doit être un tableau (typage).
 * ": void" : la fonction ne renvoie rien, elle modifie seulement $_SESSION.
 */
function nouvellePartie(array $mots): void
{
    // random_int(min, max) tire un entier au hasard, bornes incluses.
    // count($mots) - 1 = dernier index (les index commencent à 0).
    $mot = $mots[random_int(0, count($mots) - 1)];

    $_SESSION["mot"] = strtoupper($mot);       // mot à deviner, en majuscules
    $_SESSION["lettres_trouvees"] = [];        // bonnes lettres déjà jouées
    $_SESSION["lettres_fausses"] = [];         // mauvaises lettres (= nombre d'erreurs)
    $_SESSION["statut"] = "en_cours";          // "en_cours", "gagne" ou "perdu"

    // Pour l'affichage suivant : on signale qu'une partie vient de commencer
    // (la carte fera son animation d'entrée).
    $_SESSION["derniere_action"] = ["type" => "nouvelle_partie"];
}

/*
 * Vérifie si toutes les lettres du mot sont trouvées.
 * ": bool" : renvoie true ou false.
 */
function motEstTrouve(string $mot, array $lettresTrouvees): bool
{
    // strlen() = nombre de caractères. $mot[$i] = le caractère à la position $i.
    for ($i = 0; $i < strlen($mot); $i++) {
        // in_array() : « cette lettre est-elle dans le tableau ? »
        if (!in_array($mot[$i], $lettresTrouvees)) {
            return false; // une lettre manque : inutile de continuer
        }
    }

    return true; // aucune lettre ne manque
}

// Première visite : il n'y a pas encore de mot en session, on crée une partie.
// isset() vérifie qu'une variable (ou une case de tableau) existe et n'est pas null.
if (!isset($_SESSION["mot"])) {
    nouvellePartie($mots);
}

/*
 * 1. TRAITEMENT DU FORMULAIRE
 * Après un POST, on redirige vers la page (modèle "Post / Redirect / Get").
 * Ainsi, appuyer sur F5 ne rejoue pas la dernière lettre.
 */

// $_SERVER["REQUEST_METHOD"] vaut "GET" quand on affiche la page,
// et "POST" quand on vient de cliquer sur un bouton du formulaire.
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    // Le bouton "Nouvelle partie" envoie un champ nommé nouvelle_partie.
    if (isset($_POST["nouvelle_partie"])) {
        nouvellePartie($mots);

    // Un bouton-lettre envoie le champ "lettre" (sa valeur : "A", "B"…).
    // On ne joue que si la partie est en cours.
    } elseif (isset($_POST["lettre"]) && $_SESSION["statut"] === "en_cours") {

        // trim() enlève les espaces autour, strtoupper() met en majuscule.
        $lettre = strtoupper(trim($_POST["lettre"]));
        $mot = $_SESSION["mot"];

        // SÉCURITÉ : on ne fait jamais confiance à ce qu'envoie le navigateur.
        // - preg_match("/^[A-Z]$/") : exactement UNE lettre de A à Z ;
        // - la lettre ne doit pas avoir déjà été jouée (ni bonne, ni fausse).
        if (
            preg_match("/^[A-Z]$/", $lettre) &&
            !in_array($lettre, $_SESSION["lettres_trouvees"]) &&
            !in_array($lettre, $_SESSION["lettres_fausses"])
        ) {
            // strpos() donne la position de la lettre dans le mot, ou false si absente.
            // On compare avec !== false (et non != false) car la position 0 est une
            // vraie réponse : "A" est en position 0 dans "ALGORITHME".
            if (strpos($mot, $lettre) !== false) {
                $_SESSION["lettres_trouvees"][] = $lettre; // [] = ajouter à la fin du tableau
                $resultat = "bonne";
            } else {
                $_SESSION["lettres_fausses"][] = $lettre;
                $resultat = "mauvaise";
            }

            // On mémorise la dernière action pour savoir QUOI animer au prochain affichage
            $_SESSION["derniere_action"] = [
                "type" => "lettre",
                "lettre" => $lettre,
                "resultat" => $resultat,
            ];

            // Fin de partie ? Victoire si le mot est complet, défaite après 6 erreurs.
            if (motEstTrouve($mot, $_SESSION["lettres_trouvees"])) {
                $_SESSION["statut"] = "gagne";
            } elseif (count($_SESSION["lettres_fausses"]) >= ERREURS_MAX) {
                $_SESSION["statut"] = "perdu";
            }
        }
    }

    // REDIRECT : on renvoie le navigateur vers cette même page, en GET.
    // $_SERVER["SCRIPT_NAME"] = le chemin de ce fichier (ex : /index.php).
    header("Location: " . $_SERVER["SCRIPT_NAME"]);
    // exit arrête le script : rien ne doit être affiché après une redirection.
    exit;
}

/*
 * 2. PRÉPARATION DE L'AFFICHAGE
 * On recopie la session dans des variables courtes, plus lisibles dans le HTML.
 */
$mot = $_SESSION["mot"];
$lettresTrouvees = $_SESSION["lettres_trouvees"];
$lettresFausses = $_SESSION["lettres_fausses"];
$statut = $_SESSION["statut"];
$erreurs = count($lettresFausses);            // nombre d'erreurs = nombre de lettres fausses
$essaisRestants = ERREURS_MAX - $erreurs;

// La dernière action n'est utilisée qu'une seule fois (comme un message "flash") :
// on la lit, puis on l'efface. Un simple rafraîchissement n'animera donc plus rien.
// "??" = opérateur de coalescence nulle : si la case n'existe pas, on prend null.
$derniereAction = $_SESSION["derniere_action"] ?? null;
$_SESSION["derniere_action"] = null;

// Quelques booléens pour décider des animations dans le HTML
$derniereLettre = $derniereAction["lettre"] ?? null;
$nouvelleErreur = ($derniereAction["resultat"] ?? null) === "mauvaise";   // → la carte tremble
$nouvelleBonneLettre = ($derniereAction["resultat"] ?? null) === "bonne"; // → la lettre rebondit
$animerEntree = $derniereAction === null || $derniereAction["type"] === "nouvelle_partie";

// Humeur du personnage : change l'expression de son visage dans le SVG
if ($statut === "gagne") {
    $humeur = "joyeux";
} elseif ($statut === "perdu") {
    $humeur = "perdu";
} elseif ($erreurs >= 4) {
    $humeur = "inquiet"; // à partir de 4 erreurs, il commence à s'inquiéter
} else {
    $humeur = "normal";
}

/*
 * Classes CSS d'une partie du pendu (1 = tête, 2 = corps, ... 6 = jambe droite).
 * PHP ne dessine rien lui-même : il ajoute des classes, et le CSS décide
 * de l'apparence ("visible") et de l'animation ("new").
 */
function classesPartie(int $numero, int $erreurs, string $statut, bool $nouvelleErreur): string
{
    $classes = ["part"];

    // Une partie est visible si le joueur a fait au moins $numero erreurs.
    // En cas de victoire, le personnage apparaît en entier… et libéré !
    if ($erreurs >= $numero || $statut === "gagne") {
        $classes[] = "visible";
    }

    // Seule la partie qui vient d'apparaître est animée
    if ($nouvelleErreur && $numero === $erreurs) {
        $classes[] = "new";
    }

    // implode() colle les éléments du tableau avec un espace : ["part", "visible"] → "part visible"
    return implode(" ", $classes);
}

// Clavier AZERTY, comme le clavier physique : un tableau de rangées,
// chaque rangée étant elle-même un tableau de lettres (tableau à 2 dimensions).
$rangeesClavier = [
    ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
    ["W", "X", "C", "V", "B", "N"],
];

// Étoiles du fond : mt_srand() fixe la "graine" du hasard. Avec la même graine,
// mt_rand() donne toujours la même suite de nombres : les étoiles ne bougent pas
// à chaque rechargement de page.
mt_srand(2026);

/*
 * 3. AFFICHAGE HTML
 * À partir d'ici, on sort de PHP ("?>") : tout est envoyé tel quel au navigateur,
 * sauf les petits morceaux de PHP insérés :
 *   <?= $variable ?>          affiche une valeur (raccourci de <?php echo ... ?>)
 *   <?php if (...): ?> … <?php endif; ?>        condition
 *   <?php foreach (...): ?> … <?php endforeach; ?>  boucle
 */
?>
<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Le Mot Mystère</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Fredoka:wght@600;700&display=swap">
    <link rel="stylesheet" href="style.css">
</head>

<body class="etat-<?= $statut ?>">

<!-- ===== FOND ANIMÉ ===== -->
<div class="background" aria-hidden="true">
    <div class="aurora">
        <span class="blob blob-violet"></span>
        <span class="blob blob-rose"></span>
        <span class="blob blob-cyan"></span>
        <span class="blob blob-jaune"></span>
    </div>

    <div class="grid"></div>

    <div class="stars">
        <?php
        // 28 étoiles. Chacune reçoit des "variables CSS" (--x, --y…) calculées par PHP :
        // le CSS les lit avec var(--x) pour placer et animer l'étoile.
        // Syntaxe "for (...):" … "endfor;" = la même boucle for, mais plus lisible au milieu du HTML.
        ?>
        <?php for ($i = 0; $i < 28; $i++): ?>
            <span style="
                --x: <?= mt_rand(0, 100) ?>%;
                --y: <?= mt_rand(0, 100) ?>%;
                --size: <?= mt_rand(2, 5) ?>px;
                --delay: -<?= mt_rand(0, 60) / 10 ?>s;
            "></span>
        <?php endfor; ?>
    </div>

    <div class="spotlight"></div>
    <div class="defeat-tint"></div>
</div>

<main class="game-wrapper">

    <?php
    // Opérateur ternaire : condition ? valeur_si_vrai : valeur_si_faux
    // → on ajoute la classe "shake" (la carte tremble) seulement après une erreur.
    ?>
    <section class="game-card <?= $animerEntree ? "enter" : "" ?> <?= $nouvelleErreur ? "shake" : "" ?>">

        <header class="game-header">
            <h1 class="logo">
                <span class="logo-star">✦</span>
                <span class="logo-text">LE MOT MYSTÈRE</span>
                <span class="logo-star">✦</span>
            </h1>
            <div class="chips">
                <span class="chip chip-yellow"><?= strlen($mot) ?> lettres</span>
                <span class="chip chip-cyan">Devine le mot</span>
            </div>
        </header>

        <div class="game-content">

            <!-- ===== ZONE DU PENDU ===== -->
            <div class="hangman-zone">

                <div class="zone-title">
                    <span>LE PENDU</span>
                    <span class="mistakes"><?= $erreurs ?> / <?= ERREURS_MAX ?></span>
                </div>

                <svg class="hangman humeur-<?= $humeur ?>" viewBox="0 0 300 330" role="img"
                     aria-label="Pendu : <?= $erreurs ?> erreur(s) sur <?= ERREURS_MAX ?>">

                    <!-- Ombre au sol -->
                    <ellipse class="ground-shadow" cx="150" cy="308" rx="120" ry="10" />

                    <!-- Potence -->
                    <g class="gallows">
                        <line x1="30" y1="305" x2="260" y2="305" />
                        <line x1="80" y1="305" x2="80" y2="30" />
                        <line x1="80" y1="30" x2="215" y2="30" />
                        <line x1="80" y1="78" x2="128" y2="30" />
                    </g>
                    <line class="rope" x1="215" y1="30" x2="215" y2="68" />

                    <!-- Personnage -->
                    <g class="character">

                        <?php
                        // Chaque partie du corps demande ses classes à classesPartie() :
                        // "part visible new limb" → le CSS l'affiche et la "dessine" (animation).
                        ?>
                        <!-- Erreur 2 : corps -->
                        <path class="<?= classesPartie(2, $erreurs, $statut, $nouvelleErreur) ?> limb"
                              d="M215 128 L215 205" pathLength="1" />

                        <!-- Erreur 3 : bras gauche -->
                        <path class="<?= classesPartie(3, $erreurs, $statut, $nouvelleErreur) ?> limb"
                              d="M215 148 Q196 160 180 186" pathLength="1" />

                        <!-- Erreur 4 : bras droit -->
                        <path class="<?= classesPartie(4, $erreurs, $statut, $nouvelleErreur) ?> limb"
                              d="M215 148 Q234 160 250 186" pathLength="1" />

                        <!-- Erreur 5 : jambe gauche -->
                        <path class="<?= classesPartie(5, $erreurs, $statut, $nouvelleErreur) ?> limb"
                              d="M215 205 Q202 232 190 262" pathLength="1" />

                        <!-- Erreur 6 : jambe droite -->
                        <path class="<?= classesPartie(6, $erreurs, $statut, $nouvelleErreur) ?> limb"
                              d="M215 205 Q228 232 240 262" pathLength="1" />

                        <!-- Erreur 1 : tête + visage -->
                        <g class="<?= classesPartie(1, $erreurs, $statut, $nouvelleErreur) ?> head-group">
                            <circle class="head" cx="215" cy="98" r="30" />

                            <g class="face">
                                <?php // Le visage change selon $humeur, calculée plus haut ?>
                                <?php if ($humeur === "perdu"): ?>
                                    <path class="eye-x" d="M200 88 l9 9 M209 88 l-9 9 M221 88 l9 9 M230 88 l-9 9" />
                                    <path class="mouth" d="M204 116 Q215 106 226 116" />
                                <?php elseif ($humeur === "joyeux"): ?>
                                    <path class="eye-happy" d="M199 95 Q205 87 211 95 M219 95 Q225 87 231 95" />
                                    <path class="mouth-open" d="M202 105 Q215 124 228 105 Z" />
                                <?php elseif ($humeur === "inquiet"): ?>
                                    <path class="brow" d="M199 83 L210 87 M231 83 L220 87" />
                                    <circle class="eye" cx="205" cy="94" r="3.5" />
                                    <circle class="eye" cx="225" cy="94" r="3.5" />
                                    <path class="mouth" d="M205 113 Q210 109 215 113 Q220 117 225 113" />
                                <?php else: ?>
                                    <circle class="eye" cx="205" cy="94" r="3.5" />
                                    <circle class="eye" cx="225" cy="94" r="3.5" />
                                    <path class="mouth" d="M205 108 Q215 116 225 108" />
                                <?php endif; ?>
                                <circle class="cheek" cx="197" cy="106" r="5" />
                                <circle class="cheek" cx="233" cy="106" r="5" />
                            </g>
                        </g>
                    </g>
                </svg>

                <div class="hearts" aria-label="<?= $essaisRestants ?> essai(s) restant(s)">
                    <?php for ($i = 0; $i < ERREURS_MAX; $i++): ?>
                        <?php
                        // Les cœurs se perdent en partant de la droite :
                        // avec 2 erreurs, il reste 4 essais → les cœurs 4 et 5 (en partant de 0) sont perdus.
                        $perdu = $i >= $essaisRestants;
                        // Le cœur qui vient de se briser reçoit une animation spéciale
                        // (seulement juste après une erreur, grâce au message "flash").
                        $vientDeSeBriser = $nouvelleErreur && $i === $essaisRestants;
                        ?>
                        <span class="heart <?= $perdu ? "lost" : "" ?> <?= $vientDeSeBriser ? "breaking" : "" ?>">♥</span>
                    <?php endfor; ?>
                </div>

            </div>

            <!-- ===== ZONE DU MOT ET DU CLAVIER ===== -->
            <div class="word-zone">

                <p class="instruction">
                    Trouve le mot avant que le personnage soit complet !
                </p>

                <div class="word" aria-live="polite">
                    <?php for ($i = 0; $i < strlen($mot); $i++): ?>
                        <?php
                        // Une case par lettre du mot. On décide de ses classes :
                        // "revealed" (trouvée), "missed" (non trouvée, montrée à la fin), "pop" (vient d'apparaître).
                        $lettre = $mot[$i];
                        $estRevelee = in_array($lettre, $lettresTrouvees);
                        $classes = ["letter"];

                        if ($estRevelee) {
                            $classes[] = "revealed";
                        } elseif ($statut === "perdu") {
                            $classes[] = "missed"; // lettre révélée à la fin, en rouge
                        }

                        if ($nouvelleBonneLettre && $lettre === $derniereLettre) {
                            $classes[] = "pop";
                        }
                        ?>
                        <?php
                        // --i = position de la lettre : le CSS s'en sert pour décaler les animations
                        // (effet de vague). htmlspecialchars() "neutralise" les caractères spéciaux
                        // (<, >, &, ") pour qu'aucun texte ne soit interprété comme du HTML.
                        ?>
                        <span class="<?= implode(" ", $classes) ?>" style="--i: <?= $i ?>">
                            <?= ($estRevelee || $statut === "perdu") ? htmlspecialchars($lettre) : "" ?>
                        </span>
                    <?php endfor; ?>
                </div>

                <?php // Pendant la partie : la consigne. À la fin : le message de victoire ou de défaite. ?>
                <?php if ($statut === "en_cours"): ?>

                    <div class="letters-title">CHOISIS UNE LETTRE <small>(ou tape-la au clavier)</small></div>

                <?php else: ?>

                    <div class="result <?= $statut === "gagne" ? "success" : "failure" ?>">
                        <div class="result-emoji"><?= $statut === "gagne" ? "🎉" : "😵" ?></div>
                        <div class="result-text">
                            <strong><?= $statut === "gagne" ? "Bravo !" : "Dommage !" ?></strong>
                            <?php if ($statut === "gagne"): ?>
                                Trouvé avec <?= $erreurs ?> erreur<?= $erreurs > 1 ? "s" : "" ?>.
                            <?php else: ?>
                                Le mot était <b><?= htmlspecialchars($mot) ?></b>.
                            <?php endif; ?>
                        </div>
                        <form method="POST">
                            <button class="btn btn-play" type="submit" name="nouvelle_partie" autofocus>
                                <?= $statut === "gagne" ? "▶ Rejouer" : "↻ Réessayer" ?>
                            </button>
                        </form>
                    </div>

                <?php endif; ?>

                <?php
                /*
                 * LE CLAVIER : un seul formulaire, 26 boutons "submit".
                 * Tous les boutons s'appellent name="lettre" ; seul celui sur lequel on clique
                 * envoie sa valeur. PHP la reçoit dans $_POST["lettre"] (voir tout en haut).
                 * Deux boucles imbriquées : les rangées, puis les lettres de chaque rangée.
                 */
                ?>
                <form method="POST" id="letter-form">
                    <div class="keyboard <?= $statut !== "en_cours" ? "locked" : "" ?>">
                        <?php foreach ($rangeesClavier as $rangee): ?>
                            <div class="keyboard-row">
                                <?php foreach ($rangee as $lettre): ?>
                                    <?php
                                    // État de la touche → classes CSS (vert, rouge/gris) et désactivation
                                    $estTrouvee = in_array($lettre, $lettresTrouvees);
                                    $estFausse = in_array($lettre, $lettresFausses);
                                    $estDesactivee = $estTrouvee || $estFausse || $statut !== "en_cours";
                                    $vientDEtreJouee = $lettre === $derniereLettre;

                                    $classes = ["key"];
                                    if ($estTrouvee) $classes[] = "correct";
                                    if ($estFausse) $classes[] = "wrong";
                                    if ($vientDEtreJouee) $classes[] = "just-played";
                                    ?>
                                    <?php // "disabled" empêche de rejouer une lettre (et PHP vérifie aussi, par sécurité) ?>
                                    <button type="submit" name="lettre" value="<?= $lettre ?>"
                                            class="<?= implode(" ", $classes) ?>"
                                            <?= $estDesactivee ? "disabled" : "" ?>>
                                        <?= $lettre ?>
                                    </button>
                                <?php endforeach; ?>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </form>

                <?php if ($statut === "en_cours"): ?>
                    <form method="POST">
                        <button class="btn btn-new" type="submit" name="nouvelle_partie">
                            ↻ Nouvelle partie
                        </button>
                    </form>
                <?php endif; ?>

            </div>

        </div>

    </section>

</main>

<?php // Les scripts sont chargés à la fin : le HTML existe déjà quand ils cherchent les éléments. ?>
<script src="js/effects.js"></script>
<script src="js/keyboard.js"></script>

</body>
</html>
