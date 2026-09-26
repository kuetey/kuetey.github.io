<?php
$m = readline("Saisir la note obtenue : ");
if ($m < 10) {
    echo "Pas de riz\n";
} 
else if ($m < 12) {
    echo "Mouais\n";
}
else if ($m < 14) {
    echo "Bien\n";
}
else if ($m < 16) {
    echo "Très bien\n";
}
else {
    echo "Grandiot\n";
}
echo "\n";
?>