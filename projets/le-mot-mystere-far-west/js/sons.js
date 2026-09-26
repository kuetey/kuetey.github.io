/*
 * sons.js — effets sonores fabriqués avec la Web Audio API
 *
 * Aucun fichier audio : chaque son est "synthétisé" à partir
 * d'oscillateurs (notes) et de bruit blanc (claquements, coups de feu).
 * Les navigateurs n'autorisent le son qu'après une action du joueur (clic, touche).
 *
 * La deuxième partie du fichier compose une MUSIQUE DE FOND western,
 * elle aussi jouée note par note par le code.
 */

let contexte = null;
let volumeGeneral = null;
let volumeMusique = null; // volume de la musique
let volumeEffets = null;  // volume des effets sonores
let reverb = null;        // écho "grand canyon"

/*
 * Réglage du volume : un niveau de 0 (coupé) à 5 pour chaque canal.
 * Le niveau est converti en "gain" (multiplicateur du signal).
 * Il est mémorisé dans le navigateur (localStorage) pour la prochaine visite.
 */
const NIVEAU_MAX = 5;
const GAINS = {
    musique: [0, 0.08, 0.17, 0.28, 0.4, 0.55],
    effets: [0, 0.25, 0.5, 0.75, 1, 1.3],
};
const niveaux = { musique: 3, effets: 4 };

try {
    const memoire = JSON.parse(localStorage.getItem("mot-mystere-volume"));
    if (memoire) Object.assign(niveaux, memoire);
} catch (erreur) {
    // localStorage indisponible (navigation privée…) : on garde les valeurs par défaut
}

const gainMusique = () => GAINS.musique[niveaux.musique];
const effetsActifs = () => niveaux.effets > 0;

function demarrerAudio() {
    if (!contexte) {
        contexte = new (window.AudioContext || window.webkitAudioContext)();
        volumeGeneral = contexte.createGain();
        volumeGeneral.gain.value = 0.55;
        volumeGeneral.connect(contexte.destination);

        volumeMusique = contexte.createGain();
        volumeMusique.gain.value = gainMusique();
        volumeMusique.connect(volumeGeneral);

        volumeEffets = contexte.createGain();
        volumeEffets.gain.value = GAINS.effets[niveaux.effets];
        volumeEffets.connect(volumeGeneral);

        reverb = creerReverb(contexte);
        reverb.connect(volumeMusique);
    }
    if (contexte.state === "suspended") contexte.resume();
    return contexte;
}

// Une note : forme d'onde, fréquence, début, durée, volume
function note(frequence, debut, duree, { type = "triangle", volume = 0.3, glisseVers = null, sortie = null, absolu = false } = {}) {
    const ctx = demarrerAudio();
    const t = absolu ? debut : ctx.currentTime + debut;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequence, t);
    if (glisseVers) osc.frequency.exponentialRampToValueAtTime(glisseVers, t + duree);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);

    osc.connect(gain).connect(sortie ?? volumeEffets);
    osc.start(t);
    osc.stop(t + duree + 0.05);
}

// Un bruit filtré (claquement, poussière, détonation)
function bruit(debut, duree, { volume = 0.4, frequence = 1200, type = "lowpass", sortie = null, absolu = false } = {}) {
    const ctx = demarrerAudio();
    const t = absolu ? debut : ctx.currentTime + debut;
    const echantillons = Math.floor(ctx.sampleRate * duree);
    const tampon = ctx.createBuffer(1, echantillons, ctx.sampleRate);
    const donnees = tampon.getChannelData(0);
    for (let i = 0; i < echantillons; i++) donnees[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = tampon;
    const filtre = ctx.createBiquadFilter();
    filtre.type = type;
    filtre.frequency.value = frequence;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);

    source.connect(filtre).connect(gain).connect(sortie ?? volumeEffets);
    source.start(t);
}

/* =========================================================
   MUSIQUE DE FOND — un petit air de western spaghetti
   Tempo 96, la mineur, 8 mesures qui tournent en boucle :
   - guitare "boom-chick" : basse sur les temps forts, accord sur les temps faibles
   - mélodie sifflée (sinus + vibrato), comme dans les films de Sergio Leone
   - sabots de cheval (petits claquements) en guise de batterie
   ========================================================= */

// Réverbération : une "empreinte" de bruit qui s'éteint doucement = écho d'un grand espace
function creerReverb(ctx) {
    const duree = 2.4;
    const taille = Math.floor(ctx.sampleRate * duree);
    const empreinte = ctx.createBuffer(2, taille, ctx.sampleRate);
    for (let canal = 0; canal < 2; canal++) {
        const d = empreinte.getChannelData(canal);
        for (let i = 0; i < taille; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / taille, 3);
    }
    const convolution = ctx.createConvolver();
    convolution.buffer = empreinte;
    return convolution;
}

// Numéro de note MIDI → fréquence (69 = La 440 Hz)
const frequence = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/*
 * Guitare : algorithme de Karplus-Strong.
 * On remplit une petite mémoire de bruit, puis on la fait "tourner" en la lissant :
 * le bruit se transforme en son de corde pincée. Chaque note est gardée en cache.
 */
const cordes = new Map();

function tamponCorde(midi) {
    if (cordes.has(midi)) return cordes.get(midi);
    const ctx = contexte;
    const taille = Math.floor(ctx.sampleRate * 1.8);
    const tampon = ctx.createBuffer(1, taille, ctx.sampleRate);
    const sortie = tampon.getChannelData(0);
    const periode = Math.round(ctx.sampleRate / frequence(midi));
    const boucle = new Float32Array(periode).map(() => Math.random() * 2 - 1);
    for (let i = 0; i < taille; i++) {
        const j = i % periode;
        sortie[i] = boucle[j];
        boucle[j] = 0.996 * 0.5 * (boucle[j] + boucle[(j + 1) % periode]);
    }
    cordes.set(midi, tampon);
    return tampon;
}

function corde(midi, t, volume) {
    const source = contexte.createBufferSource();
    source.buffer = tamponCorde(midi);
    const gain = contexte.createGain();
    gain.gain.value = volume;
    const echo = contexte.createGain();
    echo.gain.value = volume * 0.35;
    source.connect(gain).connect(volumeMusique);
    source.connect(echo).connect(reverb);
    source.start(t);
    source.stop(t + 1.8);
}

// Sifflement : un sinus légèrement "glissé" au départ, avec un vibrato qui arrive doucement
function siffler(midi, t, duree) {
    const f = frequence(midi);
    const osc = contexte.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f * 0.96, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.07);

    const vibrato = contexte.createOscillator();
    vibrato.frequency.value = 5.5;
    const profondeur = contexte.createGain();
    profondeur.gain.setValueAtTime(0, t);
    profondeur.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.35, duree));
    vibrato.connect(profondeur).connect(osc.frequency);

    const gain = contexte.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.05);
    gain.gain.setValueAtTime(0.16, t + Math.max(0.06, duree - 0.12));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);

    const echo = contexte.createGain();
    echo.gain.value = 0.6;
    osc.connect(gain);
    gain.connect(volumeMusique);
    gain.connect(echo).connect(reverb);

    osc.start(t);
    vibrato.start(t);
    osc.stop(t + duree + 0.05);
    vibrato.stop(t + duree + 0.05);
}

// Accords des 8 mesures : basses (temps 1 et 3) et notes de l'accord
const LA_M = { basses: [45, 40], accord: [57, 60, 64] }; // la mineur
const RE_M = { basses: [38, 45], accord: [57, 62, 65] }; // ré mineur
const MI = { basses: [40, 47], accord: [56, 59, 64] };   // mi majeur
const GRILLE = [LA_M, RE_M, LA_M, MI, LA_M, RE_M, MI, LA_M];

// Mélodie sifflée : [note MIDI, début (en croches), durée (en croches)]
const MELODIE = [
    [69, 0, 3], [72, 3, 1], [76, 4, 4],
    [74, 8, 2], [77, 10, 2], [76, 12, 2], [74, 14, 2],
    [72, 16, 3], [71, 19, 1], [69, 20, 4],
    [68, 24, 2], [71, 26, 2], [76, 28, 4],
    [81, 32, 3], [79, 35, 1], [76, 36, 4],
    [77, 40, 2], [76, 42, 2], [74, 44, 4],
    [71, 48, 2], [72, 50, 2], [71, 52, 2], [68, 54, 2],
    [69, 56, 8],
];

const TEMPO = 96;
const CROCHE = 60 / TEMPO / 2;
const NB_PAS = GRILLE.length * 8;

let musiqueLancee = false;
let prochainPas = 0;
let tempsProchainPas = 0;
let tour = 0; // la mélodie ne joue qu'un tour sur deux : on respire

function jouerPas(pas, t) {
    const mesure = Math.floor(pas / 8);
    const temps = pas % 8;
    const { basses, accord } = GRILLE[mesure];

    // Guitare : "boom" (basse) sur 0 et 4, "chick" (accord gratté) sur 2, 6 et 7
    if (temps === 0) corde(basses[0], t, 0.55);
    if (temps === 4) corde(basses[1], t, 0.45);
    if (temps === 2 || temps === 6 || temps === 7) {
        const force = temps === 7 ? 0.12 : 0.2;
        accord.forEach((n, i) => corde(n, t + i * 0.012, force)); // grattage : notes décalées de 12 ms
    }

    // Sabots de cheval : "cloc-clop"
    const accent = temps % 2 === 0 ? 0.22 : 0.12;
    bruit(t, 0.04, { volume: accent, frequence: temps % 2 === 0 ? 1700 : 1250, type: "bandpass", sortie: volumeMusique, absolu: true });

    // Mélodie (un tour sur deux)
    if (tour % 2 === 1) {
        for (const [n, debut, duree] of MELODIE) {
            if (debut === pas) siffler(n, t, duree * CROCHE);
        }
    }
}

// Programmateur : toutes les 30 ms, on prévoit les notes des 150 prochaines millisecondes
function programmer() {
    while (tempsProchainPas < contexte.currentTime + 0.15) {
        jouerPas(prochainPas, tempsProchainPas);
        // Léger "swing" : les croches ne sont pas toutes égales, ça balance
        tempsProchainPas += CROCHE * (prochainPas % 2 === 0 ? 1.1 : 0.9);
        prochainPas = (prochainPas + 1) % NB_PAS;
        if (prochainPas === 0) tour++;
    }
}

function demarrerMusique() {
    demarrerAudio();
    if (musiqueLancee) return;
    musiqueLancee = true;
    prochainPas = 0;
    tour = 0;
    tempsProchainPas = contexte.currentTime + 0.2;
    setInterval(programmer, 30);

    // Onglet caché : on met le son en pause
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) contexte.suspend();
        else contexte.resume();
    });
}

// Baisse la musique quelques secondes (pendant une fanfare, un coup de feu…)
function attenuerMusique(duree = 3) {
    if (!volumeMusique) return;
    const t = contexte.currentTime;
    const normal = gainMusique();
    volumeMusique.gain.cancelScheduledValues(t);
    volumeMusique.gain.setValueAtTime(volumeMusique.gain.value, t);
    volumeMusique.gain.linearRampToValueAtTime(normal * 0.25, t + 0.2);
    volumeMusique.gain.setValueAtTime(normal * 0.25, t + duree);
    volumeMusique.gain.linearRampToValueAtTime(normal, t + duree + 1.5);
}

// Change le niveau d'un canal ("musique" ou "effets"), de 0 à 5
function reglerVolume(canal, niveau) {
    niveaux[canal] = Math.max(0, Math.min(NIVEAU_MAX, niveau));
    try {
        localStorage.setItem("mot-mystere-volume", JSON.stringify(niveaux));
    } catch (erreur) {}

    if (!contexte) return niveaux[canal];
    const noeud = canal === "musique" ? volumeMusique : volumeEffets;
    const t = contexte.currentTime;
    noeud.gain.cancelScheduledValues(t);
    noeud.gain.setValueAtTime(noeud.gain.value, t);
    noeud.gain.linearRampToValueAtTime(GAINS[canal][niveaux[canal]], t + 0.15);
    return niveaux[canal];
}

export const sons = {
    debloquer: demarrerAudio,
    demarrerMusique,
    attenuerMusique,
    reglerVolume,
    NIVEAU_MAX,

    niveau(canal) {
        return niveaux[canal];
    },

    // Touche de machine à écrire
    clic() {
        if (!effetsActifs()) return;
        bruit(0, 0.05, { volume: 0.5, frequence: 3500, type: "bandpass" });
        note(180, 0, 0.06, { type: "square", volume: 0.05 });
    },

    // Bonne lettre : petite clochette
    bonne() {
        if (!effetsActifs()) return;
        note(988, 0.02, 0.35, { volume: 0.18 });
        note(1318, 0.09, 0.45, { volume: 0.14 });
    },

    // Mauvaise lettre : coup de revolver
    mauvaise() {
        if (!effetsActifs()) return;
        bruit(0, 0.35, { volume: 0.9, frequence: 900 });
        note(120, 0, 0.25, { type: "sine", volume: 0.5, glisseVers: 40 });
        bruit(0.18, 0.5, { volume: 0.12, frequence: 500 }); // écho
    },

    // Bouton en bois
    bouton() {
        if (!effetsActifs()) return;
        note(220, 0, 0.08, { type: "square", volume: 0.06 });
        bruit(0, 0.06, { volume: 0.3, frequence: 800 });
    },

    // Victoire : petite fanfare
    victoire() {
        if (!effetsActifs()) return;
        attenuerMusique(3); // la musique se fait discrète pendant la fanfare
        const melodie = [523, 659, 784, 1047, 784, 1047];
        melodie.forEach((f, i) => note(f, i * 0.12, 0.3, { type: "square", volume: 0.07 }));
        melodie.forEach((f, i) => note(f / 2, i * 0.12, 0.3, { volume: 0.12 }));
        for (let i = 0; i < 6; i++) note(2000 + Math.random() * 1500, 0.8 + i * 0.07, 0.2, { type: "sine", volume: 0.05 });
    },

    // Défaite : "wah wah wah" qui descend
    defaite() {
        if (!effetsActifs()) return;
        attenuerMusique(4);
        [392, 370, 349].forEach((f, i) => note(f, i * 0.45, 0.42, { type: "sawtooth", volume: 0.08, glisseVers: f * 0.94 }));
        note(330, 1.35, 1.1, { type: "sawtooth", volume: 0.09, glisseVers: 220 });
    },

    // Vent du désert au démarrage
    vent() {
        if (!effetsActifs()) return;
        bruit(0, 2.5, { volume: 0.08, frequence: 400 });
    },
};
