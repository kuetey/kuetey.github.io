/*
 * sons.js — effets sonores fabriqués avec la Web Audio API
 *
 * Aucun fichier audio : chaque son est "synthétisé" à partir
 * d'oscillateurs (notes) et de bruit blanc (claquements, coups de feu).
 * Les navigateurs n'autorisent le son qu'après une action du joueur (clic, touche).
 */

let contexte = null;
let volumeGeneral = null;
let actif = true;

function demarrerAudio() {
    if (!contexte) {
        contexte = new (window.AudioContext || window.webkitAudioContext)();
        volumeGeneral = contexte.createGain();
        volumeGeneral.gain.value = 0.55;
        volumeGeneral.connect(contexte.destination);
    }
    if (contexte.state === "suspended") contexte.resume();
    return contexte;
}

// Une note : forme d'onde, fréquence, début, durée, volume
function note(frequence, debut, duree, { type = "triangle", volume = 0.3, glisseVers = null } = {}) {
    const ctx = demarrerAudio();
    const t = ctx.currentTime + debut;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequence, t);
    if (glisseVers) osc.frequency.exponentialRampToValueAtTime(glisseVers, t + duree);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);

    osc.connect(gain).connect(volumeGeneral);
    osc.start(t);
    osc.stop(t + duree + 0.05);
}

// Un bruit filtré (claquement, poussière, détonation)
function bruit(debut, duree, { volume = 0.4, frequence = 1200, type = "lowpass" } = {}) {
    const ctx = demarrerAudio();
    const t = ctx.currentTime + debut;
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

    source.connect(filtre).connect(gain).connect(volumeGeneral);
    source.start(t);
}

export const sons = {
    debloquer: demarrerAudio,

    get actif() {
        return actif;
    },

    basculer() {
        actif = !actif;
        return actif;
    },

    // Touche de machine à écrire
    clic() {
        if (!actif) return;
        bruit(0, 0.05, { volume: 0.5, frequence: 3500, type: "bandpass" });
        note(180, 0, 0.06, { type: "square", volume: 0.05 });
    },

    // Bonne lettre : petite clochette
    bonne() {
        if (!actif) return;
        note(988, 0.02, 0.35, { volume: 0.18 });
        note(1318, 0.09, 0.45, { volume: 0.14 });
    },

    // Mauvaise lettre : coup de revolver
    mauvaise() {
        if (!actif) return;
        bruit(0, 0.35, { volume: 0.9, frequence: 900 });
        note(120, 0, 0.25, { type: "sine", volume: 0.5, glisseVers: 40 });
        bruit(0.18, 0.5, { volume: 0.12, frequence: 500 }); // écho
    },

    // Bouton en bois
    bouton() {
        if (!actif) return;
        note(220, 0, 0.08, { type: "square", volume: 0.06 });
        bruit(0, 0.06, { volume: 0.3, frequence: 800 });
    },

    // Victoire : petite fanfare
    victoire() {
        if (!actif) return;
        const melodie = [523, 659, 784, 1047, 784, 1047];
        melodie.forEach((f, i) => note(f, i * 0.12, 0.3, { type: "square", volume: 0.07 }));
        melodie.forEach((f, i) => note(f / 2, i * 0.12, 0.3, { volume: 0.12 }));
        for (let i = 0; i < 6; i++) note(2000 + Math.random() * 1500, 0.8 + i * 0.07, 0.2, { type: "sine", volume: 0.05 });
    },

    // Défaite : "wah wah wah" qui descend
    defaite() {
        if (!actif) return;
        [392, 370, 349].forEach((f, i) => note(f, i * 0.45, 0.42, { type: "sawtooth", volume: 0.08, glisseVers: f * 0.94 }));
        note(330, 1.35, 1.1, { type: "sawtooth", volume: 0.09, glisseVers: 220 });
    },

    // Vent du désert au démarrage
    vent() {
        if (!actif) return;
        bruit(0, 2.5, { volume: 0.08, frequence: 400 });
    },
};
