# kuetey.github.io

Mon portfolio de développeur web & gaming, construit tout au long de ma formation **Graduate Développeur Web Gaming** chez Studi (2023 → 2029).

🌐 **En ligne : https://kuetey.github.io**

## Contenu

| Dossier | Rôle |
|---|---|
| `index.html` | La page du portfolio |
| `assets/css/style.css` | Le style (sombre, néons violet / cyan / rose) |
| `assets/js/donnees.js` | **Le fichier à modifier** : parcours, projets, compétences |
| `assets/js/main.js` | Construit les sections à partir des données |
| `assets/js/hero3d.js` | La scène 3D de l'en-tête (Three.js) |
| `assets/img/` | Captures d'écran des projets |
| `projets/le-mot-mystere-3d/` | Le jeu v4, jouable en ligne |
| `sources/` | Le code source de chaque version du jeu et mes exercices PHP |

## Mettre à jour le portfolio

- **Avancer dans la formation** : dans `assets/js/donnees.js`, passer le `statut` d'un bloc à `"termine"` ou `"en-cours"`. La barre de progression se calcule toute seule.
- **Ajouter un projet** : copier un bloc dans `PETITS_PROJETS` (ou `PROJETS` pour un projet avec plusieurs versions), puis ajouter sa capture dans `assets/img/`.
- **Publier** :

```bash
git add .
git commit -m "Ajout du projet ..."
git push
```

GitHub Pages met le site à jour en une ou deux minutes.

## Tester en local

Les modules JavaScript ne fonctionnent pas en ouvrant `index.html` directement (`file://`). Il faut un petit serveur :

```bash
php -S localhost:8020
```

Puis ouvrir http://localhost:8020

## Technologies

HTML, CSS, JavaScript (modules ES), Three.js (chargé depuis jsDelivr), GitHub Pages. Aucune étape de compilation.
