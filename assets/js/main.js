/*
 * main.js — construit les sections à partir de donnees.js
 * et gère la navigation et les animations d'apparition.
 */

import { DEPOT, PARCOURS, PROJETS, PETITS_PROJETS, A_VENIR, COMPETENCES } from "./donnees.js";

const LIBELLES_STATUT = { "termine": "terminé", "en-cours": "en cours", "a-venir": "à venir" };

// Petit utilitaire : échappe le texte avant de l'insérer dans le HTML
function texte(valeur) {
    const div = document.createElement("div");
    div.textContent = valeur;
    return div.innerHTML;
}

const lienCode = (chemin) => `${DEPOT}/tree/main/${chemin}`;

/* ---------- Parcours ---------- */

function afficherParcours() {
    const liste = document.getElementById("timeline");

    liste.innerHTML = PARCOURS.map((bloc, i) => `
        <li class="step ${bloc.statut} reveal">
            <div class="step-head">
                <h3><span class="step-num">Bloc ${i + 1}</span>${texte(bloc.titre)}</h3>
                <span class="status ${bloc.statut}">
                    ${LIBELLES_STATUT[bloc.statut]}
                </span>
            </div>
            <ul class="chips">
                ${bloc.modules.map((m) => `<li>${texte(m)}</li>`).join("")}
            </ul>
        </li>`).join("");

    // Progression : un module d'un bloc terminé compte 1, d'un bloc en cours 0,5
    let total = 0;
    let fait = 0;
    for (const bloc of PARCOURS) {
        total += bloc.modules.length;
        if (bloc.statut === "termine") fait += bloc.modules.length;
        if (bloc.statut === "en-cours") fait += bloc.modules.length / 2;
    }
    const pourcentage = Math.round((fait / total) * 100);

    document.getElementById("progress-text").textContent = `≈ ${pourcentage} % du parcours`;
    const barre = document.getElementById("progress-fill");
    new IntersectionObserver((entrees, observateur) => {
        if (entrees[0].isIntersecting) {
            barre.style.width = `${pourcentage}%`;
            observateur.disconnect();
        }
    }).observe(barre);
}

/* ---------- Projets ---------- */

function afficherProjetVedette(projet) {
    const conteneur = document.getElementById("projets-vedette");

    conteneur.innerHTML = `
        <article class="featured reveal">
            <div class="featured-media">
                <img id="${projet.id}-image" src="${projet.versions[0].image}"
                     alt="Capture d'écran : ${texte(projet.titre)}" width="1280" height="800">
            </div>
            <div class="featured-body">
                <h3>${texte(projet.titre)}</h3>
                <p>${texte(projet.accroche)}</p>
                <div class="tabs" role="tablist" aria-label="Versions">
                    ${projet.versions.map((v, i) => `
                        <button class="tab" role="tab" data-index="${i}" aria-selected="${i === 0}">
                            ${texte(v.nom.split(" — ")[0])}
                        </button>`).join("")}
                </div>
                <div id="${projet.id}-details" role="tabpanel"></div>
            </div>
        </article>`;

    const image = document.getElementById(`${projet.id}-image`);
    const details = document.getElementById(`${projet.id}-details`);
    const onglets = conteneur.querySelectorAll(".tab");

    function montrerVersion(index) {
        const v = projet.versions[index];
        const classeBadge = v.auteur === "moi" ? "badge-moi" : "badge-ia";

        onglets.forEach((o) => o.setAttribute("aria-selected", o.dataset.index === String(index)));

        details.innerHTML = `
            <p class="version-title">${texte(v.nom)} <span class="badge ${classeBadge}">${texte(v.auteur)}</span></p>
            <p class="version-text">${texte(v.texte)}</p>
            <div class="tags">${v.technos.map((t) => `<span class="tag">${texte(t)}</span>`).join("")}</div>
            <div class="links">
                ${v.jouer ? `<a class="btn btn-primary btn-sm" href="${v.jouer}">▶ Jouer</a>` : ""}
                <a class="btn btn-ghost btn-sm" href="${lienCode(v.code)}" target="_blank" rel="noopener">Voir le code</a>
            </div>`;

        // Fondu entre deux captures
        if (!image.src.endsWith(v.image)) {
            image.classList.add("switching");
            setTimeout(() => {
                image.onload = () => image.classList.remove("switching");
                image.src = v.image;
                image.alt = `Capture d'écran : ${projet.titre}, ${v.nom}`;
            }, 200);
        }
    }

    onglets.forEach((onglet) => onglet.addEventListener("click", () => montrerVersion(Number(onglet.dataset.index))));

    // On ouvre la version la plus récente par défaut
    montrerVersion(projet.versions.length - 1);
}

function afficherAutresProjets() {
    document.getElementById("petits-projets").innerHTML = PETITS_PROJETS.map((p) => `
        <article class="card reveal">
            <h4>${texte(p.titre)} <span class="badge badge-moi">moi</span></h4>
            <p>${texte(p.texte)}</p>
            <div class="tags">${p.technos.map((t) => `<span class="tag">${texte(t)}</span>`).join("")}</div>
            <div class="links">
                <a class="btn btn-ghost btn-sm" href="${lienCode(p.code)}" target="_blank" rel="noopener">Voir le code</a>
            </div>
        </article>`).join("");

    document.getElementById("a-venir").innerHTML = A_VENIR.map((p) => `
        <article class="card card-soon reveal">
            <span class="soon">// bientôt</span>
            <h4>${texte(p.titre)}</h4>
            <p>${texte(p.texte)}</p>
        </article>`).join("");
}

/* ---------- Compétences ---------- */

function afficherCompetences() {
    document.getElementById("skills").innerHTML = COMPETENCES.map((groupe) => `
        <div class="skill-group reveal">
            <h3>${texte(groupe.groupe)}</h3>
            <ul>
                ${groupe.items.map(([nom, niveau]) =>
                    `<li class="level level-${niveau}" title="${LIBELLES_STATUT[niveau] ?? niveau}">${texte(nom)}</li>`).join("")}
            </ul>
        </div>`).join("");
}

/* ---------- Navigation ---------- */

function gererNavigation() {
    const nav = document.getElementById("nav");
    const burger = document.getElementById("burger");
    const menu = document.getElementById("menu");

    const surDefilement = () => nav.classList.toggle("scrolled", window.scrollY > 20);
    window.addEventListener("scroll", surDefilement, { passive: true });
    surDefilement();

    function fermerMenu() {
        menu.classList.remove("open");
        nav.classList.remove("menu-open");
        burger.setAttribute("aria-expanded", "false");
    }

    burger.addEventListener("click", () => {
        const ouvert = menu.classList.toggle("open");
        nav.classList.toggle("menu-open", ouvert);
        burger.setAttribute("aria-expanded", String(ouvert));
    });

    menu.querySelectorAll("a").forEach((lien) => lien.addEventListener("click", fermerMenu));

    // Lien actif selon la section visible
    const liens = [...menu.querySelectorAll("a")];
    const observateur = new IntersectionObserver((entrees) => {
        for (const entree of entrees) {
            if (entree.isIntersecting) {
                liens.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === `#${entree.target.id}`));
            }
        }
    }, { rootMargin: "-45% 0px -50% 0px" });

    document.querySelectorAll("main section[id]").forEach((section) => observateur.observe(section));
}

/* ---------- Apparition au défilement ---------- */

function gererApparitions() {
    const observateur = new IntersectionObserver((entrees) => {
        for (const entree of entrees) {
            if (entree.isIntersecting) {
                entree.target.classList.add("visible");
                observateur.unobserve(entree.target);
            }
        }
    }, { threshold: 0.12 });

    document.querySelectorAll(".reveal").forEach((element, i) => {
        element.style.transitionDelay = `${(i % 4) * 70}ms`;
        observateur.observe(element);
    });
}

/* ---------- Lancement ---------- */

afficherParcours();
afficherProjetVedette(PROJETS[0]);
afficherAutresProjets();
afficherCompetences();
gererNavigation();
gererApparitions();
