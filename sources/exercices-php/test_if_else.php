<?php
$m = readline("Saisir le montant : ");

$s = readline("Saisir le solde : ");

if ($s >= $m) {
    echo "Transaction autorisée\n";
} else {
    echo "Transaction refusée\n";
}
?>