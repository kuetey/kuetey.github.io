<?php
$mot = readline("Indiquez un mot commençant par 'e' ou 'E' : ");

switch ($mot[0]) {
    case 'e':
        echo "Votre mot commence par une minuscule.";
        break;

    case 'E':
        echo "Votre mot commence par une majuscule.";
        break;

    default:
        echo "Je n'ai pas pu déterminer votre lettre.";
}

echo "\n";
?>