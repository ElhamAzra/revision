/* Vue : coquille de l'application.
   - PC large : barre latérale complète (repliable en rail d'icônes) ;
   - PC moyen / tablette paysage : rail d'icônes ;
   - téléphone : barre du haut (retour, titre) + onglets en bas ;
   - téléphone en paysage : rail compact (pas de barres qui mangent la hauteur) ;
   - mode « focus » (quiz, cartes, examen) : aucune navigation, tout l'écran pour la question. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const NAV = [
    { sep: 'Apprendre' },
    { href: '#/', ico: '🏠', label: 'Accueil', match: /^\/$/ },
    { href: '#/seance', ico: '🧭', label: 'Séance guidée', match: /^\/seance/ },
    { href: '#/plan', ico: '🗓️', label: 'Plan de révision', match: /^\/plan/ },
    { href: '#/cours', ico: '📚', label: 'Cours', match: /^\/(cours|pretest)/ },
    { href: '#/cartes', ico: '🃏', label: 'Cartes mémoire', match: /^\/cartes/, count: () => App.srs.counts().due },
    { sep: 'S\'entraîner' },
    { href: '#/entrainement', ico: '🎯', label: 'Entraînement', match: /^\/(entrainement|gen|quiz|exo|eclair)/ },
    { href: '#/labs', ico: '🧪', label: 'Labs interactifs', match: /^\/labs?/ },
    { href: '#/examen', ico: '📝', label: 'Examen blanc', match: /^\/examen/ },
    { href: '#/erreurs', ico: '🩹', label: 'Carnet d\'erreurs', match: /^\/erreurs/, count: () => Object.keys(App.store.state.errors).length },
    { sep: 'Mémo' },
    { href: '#/fiche', ico: '⚡', label: 'Fiche dernière heure', match: /^\/fiche/ },
    { href: '#/glossaire', ico: '🔤', label: 'Glossaire', match: /^\/glossaire/ },
    { href: '#/recherche', ico: '🔎', label: 'Recherche', match: /^\/recherche/ },
    { href: '#/profil', ico: '👤', label: 'Profil & réglages', match: /^\/profil/ },
    { href: '#/apropos', ico: 'ℹ️', label: 'À propos', match: /^\/apropos/ }
  ];
  const BOTTOM = [
    { href: '#/', ico: '🏠', label: 'Accueil', match: /^\/$/ },
    { href: '#/cours', ico: '📚', label: 'Cours', match: /^\/(cours|pretest)/ },
    { href: '#/cartes', ico: '🃏', label: 'Cartes', match: /^\/cartes/, count: () => App.srs.counts().due },
    { href: '#/entrainement', ico: '🎯', label: 'S\'entraîner', match: /^\/(entrainement|gen|quiz|exo|eclair|labs?|examen|erreurs)/ },
    { href: '#/plus', ico: '☰', label: 'Plus', match: /^\/(plus|fiche|glossaire|recherche|profil|plan|apropos|seance)/ }
  ];

  let back = null;

  const layout = (App.layout = {
    NAV,
    render() {
      document.body.innerHTML = `
        <div class="shell">
          <aside class="sidebar" aria-label="Navigation">
            <a class="brand" href="#/" title="Accueil">
              <span class="brand-logo">IP</span>
              <span class="brand-text"><span class="brand-name">Révision MEF</span><span class="brand-sub">Systèmes &amp; Réseaux</span></span>
            </a>
            <nav class="nav" id="nav"></nav>
            <div class="side-foot">
              <div class="side-player" id="sidePlayer"></div>
              <div class="side-tools">
                <button class="tool" data-tool="save" title="Sauvegarder ma progression (fichier)" aria-label="Sauvegarder ma progression">💾</button>
                <button class="tool" data-tool="theme" title="Thème clair / sombre" aria-label="Changer de thème"></button>
                <button class="tool" data-tool="fs" title="Plein écran (F)" aria-label="Plein écran"></button>
                <button class="tool" data-tool="nav" title="Replier / déplier le menu" aria-label="Replier le menu"></button>
              </div>
            </div>
          </aside>
          <div class="main">
            <header class="topbar">
              <a href="#/" class="tb-btn tb-back" id="tbBack" aria-label="Retour">‹</a>
              <a href="#/" class="brand-logo" id="tbLogo" aria-label="Accueil">IP</a>
              <div class="title" id="topTitle">Révision MEF</div>
              <button class="tb-btn" data-tool="fs" aria-label="Plein écran"></button>
              <div class="pill-stats" id="topStats"></div>
            </header>
            <main id="view" class="view"></main>
          </div>
        </div>
        <nav class="bottombar" id="bottomNav" aria-label="Navigation mobile"></nav>`;
      U.$$('[data-tool]').forEach((b) => b.addEventListener('click', () => layout.tool(b.dataset.tool)));
      layout.applyNav();
      window.addEventListener('resize', U.debounce(() => layout.applyNav(), 80));
      window.addEventListener('orientationchange', () => setTimeout(() => layout.applyNav(), 150));
      document.addEventListener('fullscreenchange', () => layout.toolIcons());
      document.addEventListener('webkitfullscreenchange', () => layout.toolIcons());
      document.addEventListener('keydown', (e) => {
        if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.target.isContentEditable && !document.documentElement.dataset.focus) App.ui.fullscreen.toggle();
      });
      layout.refresh();
    },

    /* Choisit la disposition selon la taille réelle de l'écran */
    applyNav() {
      const w = window.innerWidth, h = window.innerHeight;
      const pref = App.store.state.settings.nav || 'auto';
      let mode;
      if (h < 540 && w > h && w <= 1100) mode = 'rail';
      else if (w <= 880) mode = 'mobile';
      else if (pref === 'rail' || (pref === 'auto' && w < 1200)) mode = 'rail';
      else mode = 'full';
      const root = document.documentElement;
      root.dataset.nav = mode;
      root.classList.toggle('compact-h', h < 540 && w > h);
      layout.toolIcons();
    },

    tool(name) {
      if (name === 'fs') App.ui.fullscreen.toggle();
      else if (name === 'save') App.backup.download();
      else if (name === 'theme') {
        const st = App.store.state.settings;
        st.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        App.store.save();
        App.ui.applyTheme();
        layout.toolIcons();
      } else if (name === 'nav') {
        const st = App.store.state.settings;
        const cur = document.documentElement.dataset.nav;
        st.nav = cur === 'rail' ? 'full' : 'rail';
        App.store.save();
        layout.applyNav();
      }
    },

    toolIcons() {
      const dark = document.documentElement.dataset.theme === 'dark';
      const fs = App.ui.fullscreen.is();
      const rail = document.documentElement.dataset.nav === 'rail';
      U.$$('[data-tool="theme"]').forEach((b) => { b.textContent = dark ? '☀️' : '🌙'; });
      U.$$('[data-tool="fs"]').forEach((b) => {
        b.innerHTML = fs ? '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        b.title = fs ? 'Quitter le plein écran (F)' : 'Plein écran (F)';
        b.hidden = !App.ui.fullscreen.supported();
      });
      U.$$('[data-tool="nav"]').forEach((b) => { b.textContent = rail ? '»' : '«'; b.title = rail ? 'Déplier le menu' : 'Replier le menu'; });
    },

    refresh() {
      const path = (App.router.current && App.router.current.path) || '/';
      const nav = document.getElementById('nav');
      if (!nav) return;
      nav.innerHTML = NAV.map((n) => {
        if (n.sep) return `<div class="nav-sep"><span>${n.sep}</span></div>`;
        const c = n.count ? n.count() : 0;
        return `<a href="${n.href}" class="${n.match.test(path) ? 'active' : ''}" title="${n.label}"><span class="ico">${n.ico}</span><span class="lbl">${n.label}</span>${c ? `<span class="count">${c > 99 ? '99+' : c}</span>` : ''}</a>`;
      }).join('');
      document.getElementById('bottomNav').innerHTML = BOTTOM.map((n) => {
        const c = n.count ? n.count() : 0;
        return `<a href="${n.href}" class="${n.match.test(path) ? 'active' : ''}"><span class="ico">${n.ico}${c ? `<i class="dot">${c > 99 ? '99+' : c}</i>` : ''}</span>${n.label}</a>`;
      }).join('');
      const L = App.game.level();
      const streak = App.game.streakNow();
      const goal = App.game.dailyGoalPct();
      document.getElementById('sidePlayer').innerHTML = `
        <a class="sp-main" href="#/profil" title="Niveau ${L.level} · ${L.title} · objectif du jour ${Math.round(goal * 100)} %">
          ${App.ui.ring(goal, 46, 5, 'var(--accent)', `<span style="font-size:1rem">${goal >= 1 ? '✅' : '🎯'}</span>`)}
          <div class="sp-txt">
            <div class="lvl"><b>Niv. ${L.level}</b><span class="muted tiny">${U.fmtNum(App.store.state.xp)} XP</span></div>
            <div class="tiny muted" style="margin:.05rem 0 .3rem">${L.title}</div>
            ${App.ui.bar(L.pct, 'thin')}
          </div>
        </a>
        <div class="sp-row small"><span class="acc-t" style="font-weight:800"><span class="flame">🔥</span> ${streak} j</span><span class="muted tiny">Objectif ${Math.round(goal * 100)} %</span></div>`;
      document.getElementById('topStats').innerHTML = `<span class="pill fire"><span class="flame">🔥</span>${streak}</span><span class="pill xp">⭐ ${L.level}</span>`;
      layout.toolIcons();
    },

    setTitle(t) {
      const el = document.getElementById('topTitle');
      if (el) el.textContent = t;
      document.title = t + ' · Révision MEF';
    },

    /* Lien « retour » de la barre du haut (mobile) : dernier élément cliquable du fil d'Ariane */
    setBack(href) { back = href; },
    applyBack() {
      const b = document.getElementById('tbBack'), logo = document.getElementById('tbLogo');
      if (!b) return;
      if (back) { b.href = back; b.style.display = ''; logo.style.display = 'none'; }
      else { b.style.display = 'none'; logo.style.display = ''; }
    }
  });

  App.bus.on('route', () => { back = null; layout.refresh(); });
  App.bus.on('xp', U.debounce(() => layout.refresh(), 120));
})();
