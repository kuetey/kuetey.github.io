<?php

/*
 * mots.php — la liste des mots à deviner
 *
 * ---------------------------------------------------------------------------
 * CE QUE CE FICHIER M'A APPRIS
 * - Séparer les données du code : la liste des mots vit dans son propre fichier,
 *   que index.php inclut avec require. Ajouter un mot ne demande pas de toucher à la logique.
 * - Un tableau PHP simple ($mots = [...]) et son utilisation avec count() et random_int().
 * ---------------------------------------------------------------------------
 */

$mots = [
    "PROGRAMMATION",
    "ORDINATEUR",
    "DEVELOPPEMENT",
    "AUTOMOBILE",
    "MECANIQUE",
    "ENTREPRENEUR",
    "APPLICATION",
    "INTELLIGENCE",
    "ALGORITHME",
    "INTERNET",
    "TELEPHONE",
    "CREATIVITE",
    "MARKETING",
    "BUSINESS",
    "DIAGNOSTIC"
];