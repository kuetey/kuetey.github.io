<?php
$lu = readline("Indiquez votre température : ");
switch($lu){
    case 37:
        echo "tout va bien\n";
        break;
    case 38:
        echo "vous êtes légèrement fiévreux\n";
        break;
    case 39:
        echo "vous êtes vraiment fiévreux\n";
        break;
    case 40:
        echo "vous êtes très fiévreux\n";
        break;
}
echo "\n";
?>