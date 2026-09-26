/*
 * donnees.js — LE fichier à modifier pour faire évoluer le portfolio
 *
 * - PARCOURS : les blocs de la formation Studi et leur statut
 *     statut possible : "termine", "en-cours", "a-venir" (à ajuster selon ta progression réelle)
 * - PROJETS  : les projets affichés (le premier est mis en avant)
 * - COMPETENCES : les technologies, avec niveau "acquis", "en-cours" ou "a-venir"
 *
 * Pour ajouter un projet : copier un bloc { ... } dans PROJETS et changer les valeurs.
 */

export const GITHUB = "https://github.com/kuetey";
export const DEPOT = "https://github.com/kuetey/kuetey.github.io";

export const PARCOURS = [
    {
        titre: "Réussir ma formation",
        periode: "", // ex : "2024"
        statut: "termine",
        modules: ["Expérience Studi", "Organisation", "Immersion professionnelle", "Préparer les examens"],
    },
    {
        titre: "Les fondamentaux du développement",
        periode: "", // ex : "2024"
        statut: "en-cours",
        modules: ["Écosystème et outils", "Introduction à la programmation", "Algorithmes", "Tris et recherche", "Récursivité"],
    },
    {
        titre: "Front-end",
        periode: "", // ex : "2024"
        statut: "a-venir",
        modules: [
            "Figma", "HTML & CSS", "WordPress", "JavaScript", "Git & GitHub", "Déploiement",
            "Sécurité web", "Docker", "Phaser", "Premier jeu Phaser", "Projet fil rouge front",
        ],
    },
    {
        titre: "Back-end & moteurs de jeu",
        periode: "", // ex : "2024"
        statut: "a-venir",
        modules: [
            "Bases de données", "PHP dynamique", "SQL", "Symfony", "Sécurité", "Tests",
            "Unity 2D (platformer)", "Unity UI", "POO & patterns Unity", "Shader Graph",
            "Unity 3D (FPS)", "Projet fil rouge back",
        ],
    },
    {
        titre: "Bases de données web",
        periode: "", // ex : "2024"
        statut: "a-venir",
        modules: ["Modélisation", "Requêtes", "Optimisation"],
    },
];

export const PROJETS = [
    {
        id: "mot-mystere",
        titre: "Le Mot Mystère",
        accroche: "Un jeu du pendu que je fais évoluer version après version : de la console PHP jusqu'à une scène 3D.",
        versions: [
            {
                nom: "v1 — Ma version",
                auteur: "moi",
                image: "assets/img/v1-original.png",
                texte: "Jeu du pendu en PHP : mot aléatoire, sessions, formulaire, clavier virtuel, pendu dessiné en SVG. C'est ma base de travail, conservée intacte.",
                technos: ["PHP", "Sessions", "HTML", "CSS", "SVG"],
                code: "sources/le-mot-mystere/v1_original",
            },
            {
                nom: "v2 — Graphique",
                auteur: "moi + IA",
                image: "assets/img/v2-graphique.png",
                texte: "Fond animé, personnage cartoon avec humeurs, clavier AZERTY et clavier physique. Modèle Post/Redirect/Get et « dernière action » en session pour n'animer que ce qui change.",
                technos: ["PHP", "CSS animations", "SVG", "JavaScript"],
                code: "sources/le-mot-mystere/v2_graphique",
            },
            {
                nom: "v3 — 3D en CSS",
                auteur: "moi + IA",
                image: "assets/img/v3-3d-css.png",
                texte: "Profondeur sans bibliothèque : scène en parallaxe (perspective, translateZ), lettres en cartes qui se retournent, clavier incliné.",
                technos: ["PHP", "CSS 3D", "perspective", "preserve-3d"],
                code: "sources/le-mot-mystere/v3_3d_css",
            },
            {
                nom: "v4 — Three.js",
                auteur: "moi + IA",
                image: "assets/img/v4-threejs.png",
                texte: "Vraie scène 3D (WebGL) : potence en bois, personnage animé, confettis, caméra orbitale. Les règles passent de PHP à JavaScript pour tourner sur GitHub Pages.",
                technos: ["JavaScript (modules)", "Three.js", "WebGL", "CSS"],
                code: "sources/le-mot-mystere/v4_threejs",
                jouer: "projets/le-mot-mystere-3d/",
            },
        ],
    },
];

export const PETITS_PROJETS = [
    {
        titre: "Exercices PHP en console",
        texte: "Mes premiers programmes : conditions (if / else if), switch, boucles, et un pendu jouable dans le terminal.",
        technos: ["PHP", "readline", "Algorithmique"],
        code: "sources/exercices-php",
    },
];

export const A_VENIR = [
    { titre: "Premier jeu Phaser", texte: "Plateformes, sprites, score et sons." },
    { titre: "Platformer 2D Unity", texte: "Premier jeu avec un moteur de jeu." },
    { titre: "FPS 3D Unity", texte: "Jeu de tir à la première personne." },
    { titre: "Projets fil rouge", texte: "Front-end puis back-end, de bout en bout." },
];

export const COMPETENCES = [
    { groupe: "Front-end", items: [["HTML", "acquis"], ["CSS / animations", "acquis"], ["SVG", "acquis"], ["JavaScript", "en-cours"], ["Three.js", "en-cours"], ["Responsive", "acquis"]] },
    { groupe: "Back-end", items: [["PHP", "en-cours"], ["Sessions / formulaires", "acquis"], ["SQL", "a-venir"], ["Symfony", "a-venir"]] },
    { groupe: "Jeu vidéo", items: [["Logique de jeu", "en-cours"], ["Phaser", "a-venir"], ["Unity / C#", "a-venir"], ["Shader Graph", "a-venir"]] },
    { groupe: "Outils", items: [["Git", "en-cours"], ["GitHub Pages", "en-cours"], ["VS Code", "acquis"], ["Docker", "a-venir"]] },
];
