<?php

/*
 * LE MOT MYSTÈRE — v3 3D CSS (copie de la v2 + effets de profondeur en CSS)
 *
 * PHP garde toutes les règles du jeu (mot, lettres, erreurs, victoire, défaite).
 * Le CSS s'occupe de l'apparence, le JavaScript (dossier js/) des petits effets.
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Faire évoluer un projet sans le casser : la v3 est une copie de la v2, seules
 *   quelques parties du HTML changent (calques de la scène, cartes des lettres).
 * - Découper un dessin SVG en deux calques pour créer un effet de profondeur (parallaxe).
 * - Structurer une carte à deux faces en HTML (face avant « ? », face arrière = la lettre).
 * - Garder PHP pour la logique : la 3D n'est qu'une question d'affichage (CSS).
 * ---------------------------------------------------------------------------
 */

// Nom de session propre à cette version : elle ne se mélange pas avec la v1 et la v2
session_name("mot_mystere_v3");
session_start();

require __DIR__ . "/mots.php";

const ERREURS_MAX = 6;

function nouvellePartie(array $mots): void
{
    $mot = $mots[random_int(0, count($mots) - 1)];

    $_SESSION["mot"] = strtoupper($mot);
    $_SESSION["lettres_trouvees"] = [];
    $_SESSION["lettres_fausses"] = [];
    $_SESSION["statut"] = "en_cours";
    $_SESSION["derniere_action"] = ["type" => "nouvelle_partie"];
}

function motEstTrouve(string $mot, array $lettresTrouvees): bool
{
    for ($i = 0; $i < strlen($mot); $i++) {
        if (!in_array($mot[$i], $lettresTrouvees)) {
            return false;
        }
    }

    return true;
}

if (!isset($_SESSION["mot"])) {
    nouvellePartie($mots);
}

/*
 * 1. TRAITEMENT DU FORMULAIRE
 * Après un POST, on redirige vers la page (modèle "Post / Redirect / Get").
 * Ainsi, appuyer sur F5 ne rejoue pas la dernière lettre.
 */
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    if (isset($_POST["nouvelle_partie"])) {
        nouvellePartie($mots);
    } elseif (isset($_POST["lettre"]) && $_SESSION["statut"] === "en_cours") {

        $lettre = strtoupper(trim($_POST["lettre"]));
        $mot = $_SESSION["mot"];

        if (
            preg_match("/^[A-Z]$/", $lettre) &&
            !in_array($lettre, $_SESSION["lettres_trouvees"]) &&
            !in_array($lettre, $_SESSION["lettres_fausses"])
        ) {
            if (strpos($mot, $lettre) !== false) {
                $_SESSION["lettres_trouvees"][] = $lettre;
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

            if (motEstTrouve($mot, $_SESSION["lettres_trouvees"])) {
                $_SESSION["statut"] = "gagne";
            } elseif (count($_SESSION["lettres_fausses"]) >= ERREURS_MAX) {
                $_SESSION["statut"] = "perdu";
            }
        }
    }

    header("Location: " . $_SERVER["SCRIPT_NAME"]);
    exit;
}

/*
 * 2. PRÉPARATION DE L'AFFICHAGE
 */
$mot = $_SESSION["mot"];
$lettresTrouvees = $_SESSION["lettres_trouvees"];
$lettresFausses = $_SESSION["lettres_fausses"];
$statut = $_SESSION["statut"];
$erreurs = count($lettresFausses);
$essaisRestants = ERREURS_MAX - $erreurs;

// La dernière action n'est utilisée qu'une seule fois (comme un message "flash")
$derniereAction = $_SESSION["derniere_action"] ?? null;
$_SESSION["derniere_action"] = null;

$derniereLettre = $derniereAction["lettre"] ?? null;
$nouvelleErreur = ($derniereAction["resultat"] ?? null) === "mauvaise";
$nouvelleBonneLettre = ($derniereAction["resultat"] ?? null) === "bonne";
$animerEntree = $derniereAction === null || $derniereAction["type"] === "nouvelle_partie";

// Humeur du personnage : change l'expression de son visage
if ($statut === "gagne") {
    $humeur = "joyeux";
} elseif ($statut === "perdu") {
    $humeur = "perdu";
} elseif ($erreurs >= 4) {
    $humeur = "inquiet";
} else {
    $humeur = "normal";
}

// Classes CSS d'une partie du pendu (1 = tête, 2 = corps, ... 6 = jambe droite)
function classesPartie(int $numero, int $erreurs, string $statut, bool $nouvelleErreur): string
{
    $classes = ["part"];

    // En cas de victoire, le personnage apparaît en entier… et libéré !
    if ($erreurs >= $numero || $statut === "gagne") {
        $classes[] = "visible";
    }

    // Seule la partie qui vient d'apparaître est animée
    if ($nouvelleErreur && $numero === $erreurs) {
        $classes[] = "new";
    }

    return implode(" ", $classes);
}

// Clavier AZERTY, comme le clavier physique
$rangeesClavier = [
    ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
    ["W", "X", "C", "V", "B", "N"],
];

// Étoiles du fond : la graine fixe garde les mêmes positions à chaque rechargement
mt_srand(2026);

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

                <!--
                    SCÈNE 3D EN CSS
                    Le dessin est découpé en deux calques SVG superposés :
                    - calque du fond : sol + poteau de la potence
                    - calque de devant (avancé avec translateZ) : poutre, corde et personnage
                    Quand la souris bouge, la scène pivote : les calques se décalent
                    et donnent une impression de profondeur (effet "parallaxe").
                -->
                <div class="stage humeur-<?= $humeur ?>" role="img"
                     aria-label="Pendu : <?= $erreurs ?> erreur(s) sur <?= ERREURS_MAX ?>">
                <div class="stage-inner">

                <div class="stage-floor"></div>

                <svg class="hangman layer-back" viewBox="0 0 300 330" aria-hidden="true">
                    <ellipse class="ground-shadow" cx="150" cy="308" rx="120" ry="10" />
                    <g class="gallows">
                        <line x1="30" y1="305" x2="260" y2="305" />
                        <line x1="80" y1="305" x2="80" y2="30" />
                        <line x1="80" y1="78" x2="128" y2="30" />
                    </g>
                </svg>

                <svg class="hangman layer-front" viewBox="0 0 300 330" aria-hidden="true">
                    <g class="gallows">
                        <line x1="80" y1="30" x2="215" y2="30" />
                    </g>
                    <line class="rope" x1="215" y1="30" x2="215" y2="68" />

                    <!-- Personnage -->
                    <g class="character">

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

                </div><!-- /.stage-inner -->
                </div><!-- /.stage -->

                <div class="hearts" aria-label="<?= $essaisRestants ?> essai(s) restant(s)">
                    <?php for ($i = 0; $i < ERREURS_MAX; $i++): ?>
                        <?php
                        // Les cœurs se perdent en partant de la droite
                        $perdu = $i >= $essaisRestants;
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
                        <!-- Chaque case est une carte à deux faces qui se retourne en 3D -->
                        <span class="<?= implode(" ", $classes) ?>" style="--i: <?= $i ?>">
                            <span class="letter-inner">
                                <span class="face face-front">?</span>
                                <span class="face face-back">
                                    <?= ($estRevelee || $statut === "perdu") ? htmlspecialchars($lettre) : "" ?>
                                </span>
                            </span>
                        </span>
                    <?php endfor; ?>
                </div>

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

                <form method="POST" id="letter-form">
                    <div class="keyboard <?= $statut !== "en_cours" ? "locked" : "" ?>">
                        <?php foreach ($rangeesClavier as $rangee): ?>
                            <div class="keyboard-row">
                                <?php foreach ($rangee as $lettre): ?>
                                    <?php
                                    $estTrouvee = in_array($lettre, $lettresTrouvees);
                                    $estFausse = in_array($lettre, $lettresFausses);
                                    $estDesactivee = $estTrouvee || $estFausse || $statut !== "en_cours";
                                    $vientDEtreJouee = $lettre === $derniereLettre;

                                    $classes = ["key"];
                                    if ($estTrouvee) $classes[] = "correct";
                                    if ($estFausse) $classes[] = "wrong";
                                    if ($vientDEtreJouee) $classes[] = "just-played";
                                    ?>
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

<script src="js/effects.js"></script>
<script src="js/keyboard.js"></script>

</body>
</html>
