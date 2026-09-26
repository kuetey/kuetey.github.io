<?php

session_start();

$mots = [
    "PROGRAMMATION",
    "ORDINATEUR",
    "DEVELOPPEMENT",
    "AUTOMOBILE",
    "MECANIQUE",
    "ENTREPRENEUR",
    "APPLICATION",
    "ALGORITHME",
    "INTERNET",
    "DIAGNOSTIC",
    "MARKETING",
    "CREATIVITE"
];

function nouvellePartie(array $mots): void
{
    $mot = $mots[random_int(0, count($mots) - 1)];

    $_SESSION["mot"] = strtoupper($mot);
    $_SESSION["lettres_trouvees"] = [];
    $_SESSION["lettres_fausses"] = [];
    $_SESSION["statut"] = "en_cours";
}

if (!isset($_SESSION["mot"]) || isset($_POST["nouvelle_partie"])) {
    nouvellePartie($mots);
}

if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST["lettre"])) {
    $lettre = strtoupper(trim($_POST["lettre"]));
    $mot = $_SESSION["mot"];

    if (
        strlen($lettre) === 1 &&
        preg_match("/^[A-Z]$/", $lettre) &&
        !in_array($lettre, $_SESSION["lettres_trouvees"]) &&
        !in_array($lettre, $_SESSION["lettres_fausses"])
    ) {
        if (strpos($mot, $lettre) !== false) {
            $_SESSION["lettres_trouvees"][] = $lettre;
        } else {
            $_SESSION["lettres_fausses"][] = $lettre;
        }
    }

    $motTrouve = true;

    for ($i = 0; $i < strlen($mot); $i++) {
        if (!in_array($mot[$i], $_SESSION["lettres_trouvees"])) {
            $motTrouve = false;
            break;
        }
    }

    if ($motTrouve) {
        $_SESSION["statut"] = "gagne";
    } elseif (count($_SESSION["lettres_fausses"]) >= 6) {
        $_SESSION["statut"] = "perdu";
    }
}

$mot = $_SESSION["mot"];
$lettresTrouvees = $_SESSION["lettres_trouvees"];
$lettresFausses = $_SESSION["lettres_fausses"];
$statut = $_SESSION["statut"];

$motVisible = "";

for ($i = 0; $i < strlen($mot); $i++) {
    if (in_array($mot[$i], $lettresTrouvees)) {
        $motVisible .= $mot[$i] . " ";
    } else {
        $motVisible .= "_ ";
    }
}

$erreurs = count($lettresFausses);

?>

<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Le Mot Mystère</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>

<div class="background-shapes">
    <span></span>
    <span></span>
    <span></span>
    <span></span>
</div>

<main class="game-wrapper">

    <section class="game-card">

        <header class="game-header">
            <div class="logo">✦ MOT MYSTÈRE</div>
            <div class="category">DEVINE LE MOT</div>
        </header>

        <div class="game-content">

            <div class="hangman-zone">

                <div class="zone-title">
                    <span>LE PENDU</span>
                    <span class="mistakes">
                        <?= $erreurs ?> / 6
                    </span>
                </div>

                <svg class="hangman" viewBox="0 0 300 330">

                    <line class="structure" x1="35" y1="300" x2="230" y2="300" />
                    <line class="structure" x1="80" y1="300" x2="80" y2="35" />
                    <line class="structure" x1="80" y1="35" x2="210" y2="35" />
                    <line class="structure" x1="210" y1="35" x2="210" y2="75" />

                    <circle
                        class="body-part head <?= $erreurs >= 1 ? "visible" : "" ?>"
                        cx="210"
                        cy="105"
                        r="30"
                    />

                    <line
                        class="body-part <?= $erreurs >= 2 ? "visible" : "" ?>"
                        x1="210"
                        y1="135"
                        x2="210"
                        y2="220"
                    />

                    <line
                        class="body-part <?= $erreurs >= 3 ? "visible" : "" ?>"
                        x1="210"
                        y1="155"
                        x2="165"
                        y2="195"
                    />

                    <line
                        class="body-part <?= $erreurs >= 4 ? "visible" : "" ?>"
                        x1="210"
                        y1="155"
                        x2="255"
                        y2="195"
                    />

                    <line
                        class="body-part <?= $erreurs >= 5 ? "visible" : "" ?>"
                        x1="210"
                        y1="220"
                        x2="170"
                        y2="275"
                    />

                    <line
                        class="body-part <?= $erreurs >= 6 ? "visible" : "" ?>"
                        x1="210"
                        y1="220"
                        x2="250"
                        y2="275"
                    />

                </svg>

                <div class="hearts">
                    <?php for ($i = 0; $i < 6; $i++): ?>
                        <span class="<?= $i < $erreurs ? "lost" : "" ?>">♥</span>
                    <?php endfor; ?>
                </div>

            </div>

            <div class="word-zone">

                <p class="instruction">
                    Trouve le mot avant que le personnage soit complet !
                </p>

                <div class="word">
                    <?= htmlspecialchars(trim($motVisible)) ?>
                </div>

                <div class="letters-title">CHOISIS UNE LETTRE</div>

                <form method="POST" id="letter-form">

                    <div class="keyboard">
                        <?php foreach (range("A", "Z") as $lettre): ?>

                            <?php
                            $estTrouvee = in_array($lettre, $lettresTrouvees);
                            $estFausse = in_array($lettre, $lettresFausses);
                            $estDesactivee = $estTrouvee || $estFausse || $statut !== "en_cours";
                            ?>

                            <button
                                type="submit"
                                name="lettre"
                                value="<?= $lettre ?>"
                                class="
                                    key
                                    <?= $estTrouvee ? "correct" : "" ?>
                                    <?= $estFausse ? "wrong" : "" ?>
                                "
                                <?= $estDesactivee ? "disabled" : "" ?>
                            >
                                <?= $lettre ?>
                            </button>

                        <?php endforeach; ?>
                    </div>

                </form>

                <?php if ($statut === "gagne"): ?>

                    <div class="result success">
                        <span>🎉</span>
                        Bravo ! Tu as trouvé le mot
                        <strong><?= htmlspecialchars($mot) ?></strong>
                    </div>

                <?php elseif ($statut === "perdu"): ?>

                    <div class="result failure">
                        <span>😵</span>
                        Dommage ! Le mot était
                        <strong><?= htmlspecialchars($mot) ?></strong>
                    </div>

                <?php endif; ?>

                <form method="POST">
                    <button class="new-game" type="submit" name="nouvelle_partie">
                        ↻ Nouvelle partie
                    </button>
                </form>

            </div>

        </div>

    </section>

</main>

</body>
</html>