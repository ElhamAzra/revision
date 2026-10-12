/* Vue : aide intégrée.
   - App.help : textes d'aide par écran, bouton « ? » (modale) et bulle de première visite ;
   - App.tour : visite guidée (projecteur sur les vrais éléments de l'interface + bulles). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const TEXTS = {
    seance: { t: '🧭 Séance guidée', h: `<p>Un seul parcours pour faire <b>toute la séance du jour</b>, dans l'ordre du plan : rappel des 5 phrases de la veille → pré-test → leçons → cartes → QCM → exercice type concours → carnet d'erreurs → bilan.</p><ul><li>Clique sur <b>▶</b> pour lancer l'étape en cours ; à la fin de l'étape, le bouton <b>« Suite de la séance »</b> te ramène ici et l'étape est cochée.</li><li><b>Passer cette étape</b> si tu l'as déjà faite ou si le temps manque.</li><li>Tu peux quitter et revenir dans la journée : la séance reprend où tu t'es arrêté.</li><li>« Changer de séance » pour rattraper une séance passée.</li></ul>` },
    cours: { t: '📚 Les cours', h: `<p>Chaque séance du plan est un module : <b>leçons courtes</b>, cartes, QCM, exercices et « 5 phrases ». L'anneau indique ta <b>maîtrise</b> (leçons comprises, réussite récente, cartes maîtrisées).</p><ul><li>Commence par le <b>pré-test</b> (avant de lire), puis les leçons dans l'ordre.</li><li>Onglet <b>Pratique</b> : cartes, QCM, exercices type concours, générateurs.</li><li>Onglet <b>5 phrases</b> : l'essentiel à réciter de mémoire le lendemain.</li></ul>` },
    lecon: { t: '📖 Lire une leçon', h: `<ul><li><b>L'essentiel en 30 secondes</b> d'abord : c'est ce qu'il faut retenir.</li><li>Les encadrés : <b>⚠️ Piège concours</b> (erreurs classiques), <b>🎯 Réflexe jour J</b>, <b>💡 Astuce</b>, <b>🔧 Correction</b> (erreur relevée dans les supports).</li><li>Les schémas animés et pas-à-pas se lancent avec <b>Étape suivante</b>.</li><li><b>Vérifie ta compréhension</b> sans relire : les erreurs vont dans ton carnet.</li><li><b>✓ J'ai compris</b> marque la leçon (+25 XP). Flèches ← → pour changer de leçon.</li><li>🔊 <b>Écouter</b> lit la leçon à voix haute (si ton appareil le permet).</li></ul>` },
    cartes: { t: '🃏 Cartes mémoire', h: `<p>Une carte revient <b>juste avant que tu l'oublies</b> (répétition espacée).</p><ol><li>Lis la question et <b>réponds à voix haute</b>.</li><li>Retourne la carte (touche la carte ou <kbd>Espace</kbd>).</li><li>Note-toi honnêtement : <b>À revoir</b> (raté, revient dans 1 min) · <b>Difficile</b> (trouvé avec peine) · <b>Bien</b> · <b>Facile</b> (évident). Raccourcis <kbd>1</kbd> à <kbd>4</kbd>.</li></ol><p class="small muted">Sous chaque bouton : quand la carte reviendra. Une carte est « maîtrisée » quand elle revient dans 2 jours ou plus.</p>` },
    entrainement: { t: '🎯 S\'entraîner', h: `<ul><li><b>Mélange intelligent</b> : tes erreurs + tes points faibles + des calculs, mélangés comme le jour J.</li><li><b>Défis éclair</b> : 60 secondes, un maximum de bonnes réponses (bat ton record).</li><li><b>QCM par séance</b> : en priorité les questions jamais vues ou ratées.</li><li><b>Exercices type concours</b> : chronométrés, corrigés et notés au barème.</li><li><b>Générateurs infinis</b> : des calculs toujours nouveaux, corrigés pas à pas, avec 3 niveaux.</li></ul>` },
    quiz: { t: '✅ Questions', h: `<ul><li>Clique sur une réponse (ou touches <kbd>1</kbd>–<kbd>9</kbd> / <kbd>A</kbd>–<kbd>J</kbd>, <kbd>V</kbd>/<kbd>F</kbd>).</li><li>Les réponses à saisir se valident avec <kbd>Entrée</kbd> ; les nombres acceptent l'écriture française (1 022 ; 9,97).</li><li><b>Je ne sais pas</b> affiche la réponse sans pénalité (et la note dans ton carnet).</li><li>Les bonnes réponses d'affilée font un <b>combo 🔥</b> : XP ×1,5 dès 5, ×2 dès 10.</li><li><kbd>Échap</kbd> ou ✕ pour quitter, <b>Terminer</b> pour voir le bilan.</li></ul>` },
    gen: { t: '♾️ Générateurs', h: `<p>Des exercices <b>générés à l'infini</b>, jamais deux fois les mêmes, avec la correction détaillée.</p><ul><li>Choisis le niveau : ★ Facile, ★★ Moyen, ★★★ Difficile.</li><li>Fais-en jusqu'à ce que le calcul devienne automatique (5 justes d'affilée = maîtrisé).</li><li>Saisis les adresses normalement (192.168.1.0), les masques en décimal ou /CIDR selon le champ.</li></ul>` },
    eclair: { t: '⚡ Défi éclair', h: `<p>60 secondes pour enchaîner un maximum de bonnes réponses. Pas de pause, pas d'explication longue : c'est un entraînement de <b>réflexes</b> (conversions, masques, ports…). Ton record est enregistré.</p>` },
    examen: { t: '📝 Examens', h: `<ul><li><b>Sujets blancs</b> : énoncé complet, 2 h, tu rédiges sur papier puis tu t'<b>auto-évalues</b> avec le barème (corrigés masqués pendant la rédaction).</li><li><b>Examen express</b> : 30 questions corrigées automatiquement, toujours différentes.</li><li><b>Mini-épreuves</b> : uniquement réseaux (E2) ou systèmes (E1).</li><li>Note finale = (2 × E1 + 3 × E2) / 5 ; <b>une note ≤ 5 est éliminatoire</b>.</li></ul>` },
    labs: { t: '🧪 Labs', h: `<p>Des outils à manipuler pour <b>comprendre</b> : chaque lab montre le calcul, pas seulement le résultat (bits colorés, ET logique, élection STP, ACL…). Change les valeurs et observe.</p>` },
    erreurs: { t: '🩹 Carnet d\'erreurs', h: `<p>Chaque question ratée y est enregistrée automatiquement. Rejoue-les : une erreur <b>disparaît après 2 bonnes réponses d'affilée</b> (+15 XP). C'est l'exercice le plus rentable avant le concours.</p>` },
    fiche: { t: '⚡ Fiche dernière heure', h: `<p>Le condensé à relire la veille et le matin du concours. Imprimable (Ctrl + P) ou disponible dans <b>Fiches imprimables</b>.</p>` },
    profil: { t: '👤 Profil', h: `<p>Ton niveau, tes statistiques, tes badges et tes réglages : prénom, date du concours, objectif quotidien, police, taille du texte, thème, menu, plein écran, sauvegarde.</p>` }
  };

  const help = (App.help = {
    TEXTS,
    btn(key) { return TEXTS[key] ? `<button type="button" class="help-btn" data-help="${key}" title="Comment ça marche ?" aria-label="Aide">?</button>` : ''; },
    open(key) {
      const x = TEXTS[key];
      if (!x) return;
      App.ui.modal(`<h2>${x.t}</h2><div class="prose">${x.h}</div><div class="row mt2"><a class="btn ghost" href="#/aide" data-close>📘 Mode d'emploi complet</a><span class="grow"></span><button class="btn primary" data-close>Compris</button></div>`);
    },
    /* Bulle de première visite, insérée en haut de la page */
    coach(key, root) {
      const st = App.store.state.settings;
      st.seenHelp = st.seenHelp || {};
      const x = TEXTS[key];
      if (!x || st.seenHelp[key] || !st.onboarded) return;
      const box = U.el(`<div class="coach"><span class="coach-ico">💡</span><div class="grow"><b>Première fois ici ? ${x.t}</b><div class="prose small">${x.h}</div></div><button class="btn sm primary" data-ok>Compris</button></div>`);
      box.querySelector('[data-ok]').addEventListener('click', () => { st.seenHelp[key] = Date.now(); App.store.save(); box.remove(); });
      const head = root.querySelector('.page-head, .focus-sub, .focus-head, .guided-hero');
      if (head) head.insertAdjacentElement('afterend', box); else root.prepend(box);
    },
    /* Ajoute le « ? » au titre de la page + bulle de première visite */
    decorate(root, key) {
      if (!TEXTS[key]) return;
      const h = root.querySelector('.page-head h1, .guided-hero h1, h1');
      const fh = root.querySelector('.focus-head');
      if (fh) { const b = U.el(help.btn(key)); b.classList.add('in-focus'); const close = fh.querySelector('.fh-close'); close.insertAdjacentElement('afterend', b); }
      else if (h && !h.querySelector('.help-btn')) h.insertAdjacentHTML('beforeend', ' ' + help.btn(key));
      help.coach(key, root);
    }
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-help]');
    if (b) { e.preventDefault(); help.open(b.dataset.help); }
  });

  /* ---------- Visite guidée ---------- */
  const visible = (sel) => U.$$(sel).find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }) || null;

  function steps() {
    const mobile = document.documentElement.dataset.nav === 'mobile';
    const nm = App.backup.name();
    return [
      { t: `Bienvenue${nm ? ' ' + nm : ''} ! 👋`, h: 'Petit tour de 1 minute pour savoir où tout se trouve. Tu peux le passer et le revoir plus tard dans <b>Mode d\'emploi</b>.' },
      { sel: '.hero .count', t: '⏳ Compte à rebours', h: 'Les jours restants avant le concours, et (sur téléphone) ta barre d\'<b>objectif du jour</b> en XP.' },
      { sel: '.hero-cta', t: '🧭 Ton point de départ', h: '<b>Séance guidée</b> : un bouton, et la séance du jour s\'enchaîne (rappel, leçons, cartes, QCM, erreurs). <b>Reprendre</b> apparaît quand tu as une leçon en cours.' },
      { sel: '.grid.k4', t: '📊 Tes compteurs', h: 'Niveau, <b>série 🔥</b> (jours d\'objectif atteint d\'affilée), cartes à revoir, erreurs à vaincre. Touche-les pour y aller.' },
      { sel: '.mission', parent: '.card', t: '🎯 Missions du jour', h: 'Cinq objectifs simples qui se cochent tout seuls quand tu les réalises.' },
      mobile ? { sel: '#bottomNav', t: '🧭 Navigation', h: '<b>Cours</b>, <b>Cartes</b>, <b>S\'entraîner</b> (QCM, calculs infinis, défis, examens) et <b>Plus</b> (séance guidée, fiche, glossaire, profil, aide).' }
        : { sel: '#nav', t: '🧭 Le menu', h: '<b>Apprendre</b> (séance guidée, plan, cours, cartes), <b>S\'entraîner</b> (QCM, labs, examens, erreurs) et <b>Mémo</b> (fiche, glossaire, recherche, profil, aide).' },
      mobile ? { sel: '#bottomNav a[href="#/plus"]', t: '💾 Sauvegarde & réglages', h: 'Dans <b>Plus → Profil</b> : police, taille du texte, thème et <b>sauvegarde de ta progression</b> (à faire régulièrement).' }
        : { sel: '.side-tools', t: '🛠️ Outils', h: '💾 <b>Sauvegarder</b> ta progression en un clic · 🌙 thème clair/sombre · ⛶ <b>plein écran</b> (touche F) · « replier le menu.' },
      { sel: '.topbar [data-tool="fs"]', skipIfMissing: true, t: '⛶ Plein écran', h: 'Pour réviser sans les barres du navigateur.' },
      { t: '❓ Besoin d\'aide ?', h: 'Chaque écran a un bouton <span class="help-btn" style="display:inline-grid">?</span> qui explique comment il fonctionne, et le <b>Mode d\'emploi</b> détaille tout. Bonne révision ! 🍀' }
    ];
  }

  const tour = (App.tour = {
    start() {
      if (location.hash !== '#/' && location.hash !== '' && location.hash !== '#') { App.router.go('/'); setTimeout(tour.start, 450); return; }
      const list = steps().filter((s) => !s.skipIfMissing || visible(s.sel));
      let i = 0;
      const ui = U.el(`<div class="tour"><div class="tour-spot"></div><div class="tour-bubble" role="dialog" aria-live="polite"></div></div>`);
      document.body.appendChild(ui);
      const spot = ui.querySelector('.tour-spot'), bub = ui.querySelector('.tour-bubble');
      const end = () => { ui.remove(); window.removeEventListener('resize', place); document.removeEventListener('keydown', onKey); const s = App.store.state.settings; s.toured = Date.now(); App.store.save(); };
      const onKey = (e) => { if (e.key === 'Escape') end(); else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); go(i + 1); } else if (e.key === 'ArrowLeft') go(i - 1); };
      document.addEventListener('keydown', onKey);
      function target() {
        const s = list[i];
        if (!s.sel) return null;
        let el = visible(s.sel);
        if (el && s.parent) el = el.closest(s.parent) || el;
        return el;
      }
      function place() {
        const s = list[i];
        const el = target();
        bub.innerHTML = `<div class="tour-n">${i + 1} / ${list.length}</div><h3>${s.t}</h3><p>${s.h}</p>
          <div class="row nowrap"><button class="btn ghost sm" data-end>${i === list.length - 1 ? 'Fermer' : 'Passer'}</button><span class="grow"></span>${i ? '<button class="btn sm" data-prev>◀</button>' : ''}<button class="btn primary sm" data-next>${i === list.length - 1 ? 'Terminer 🚀' : 'Suivant ▶'}</button></div>`;
        bub.querySelector('[data-end]').onclick = end;
        bub.querySelector('[data-next]').onclick = () => go(i + 1);
        const pv = bub.querySelector('[data-prev]');
        if (pv) pv.onclick = () => go(i - 1);
        const vw = window.innerWidth, vh = window.innerHeight;
        const bw = Math.min(360, vw - 24);
        bub.style.width = bw + 'px';
        if (!el) {
          spot.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0`;
          bub.style.left = (vw - bw) / 2 + 'px';
          bub.style.top = Math.max(12, vh / 2 - bub.offsetHeight / 2) + 'px';
          return;
        }
        const r = el.getBoundingClientRect(), pad = 8;
        spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px`;
        const bh = bub.offsetHeight;
        let top = r.bottom + pad + 12;
        if (top + bh > vh - 8) top = r.top - pad - 12 - bh;
        if (top < 8) top = Math.max(8, Math.min(vh - bh - 8, r.top + 16));
        let left = r.left + r.width / 2 - bw / 2;
        left = Math.max(12, Math.min(vw - bw - 12, left));
        bub.style.left = left + 'px';
        bub.style.top = top + 'px';
      }
      function go(n) {
        if (n >= list.length) return end();
        if (n < 0) return;
        i = n;
        const el = target();
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.top < 70 || r.bottom > window.innerHeight - 90) {
            el.scrollIntoView({ block: 'center' });
          }
        }
        setTimeout(place, 60);
      }
      window.addEventListener('resize', place);
      go(0);
    }
  });
})();
