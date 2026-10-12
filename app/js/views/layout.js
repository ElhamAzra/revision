/* Vue : coquille de l'application (barre latérale PC, barre du haut + onglets en bas sur mobile). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const NAV = [
    { sep: 'Apprendre' },
    { href: '#/', ico: '🏠', label: 'Accueil', match: /^\/$/ },
    { href: '#/plan', ico: '🗓️', label: 'Plan de révision', match: /^\/plan/ },
    { href: '#/cours', ico: '📚', label: 'Cours', match: /^\/cours/ },
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
    { href: '#/profil', ico: '👤', label: 'Profil & badges', match: /^\/profil/ }
  ];
  const BOTTOM = [
    { href: '#/', ico: '🏠', label: 'Accueil', match: /^\/$/ },
    { href: '#/cours', ico: '📚', label: 'Cours', match: /^\/cours/ },
    { href: '#/cartes', ico: '🃏', label: 'Cartes', match: /^\/cartes/ },
    { href: '#/entrainement', ico: '🎯', label: 'S\'entraîner', match: /^\/(entrainement|gen|quiz|exo|eclair|labs?|examen|erreurs)/ },
    { href: '#/plus', ico: '☰', label: 'Plus', match: /^\/(plus|fiche|glossaire|recherche|profil|plan)/ }
  ];

  const layout = (App.layout = {
    NAV,
    render() {
      document.body.innerHTML = `
        <div class="shell">
          <aside class="sidebar" aria-label="Navigation">
            <a class="brand" href="#/">
              <span class="brand-logo">IP</span>
              <span><span class="brand-name">Révision MEF</span><br><span class="brand-sub">Systèmes &amp; Réseaux</span></span>
            </a>
            <nav class="nav" id="nav"></nav>
            <div class="side-player" id="sidePlayer"></div>
          </aside>
          <div class="main">
            <header class="topbar">
              <a href="#/" class="brand-logo" aria-label="Accueil">IP</a>
              <div class="title" id="topTitle">Révision MEF</div>
              <div class="pill-stats" id="topStats"></div>
            </header>
            <main id="view" class="view"></main>
          </div>
        </div>
        <nav class="bottombar" id="bottomNav" aria-label="Navigation mobile"></nav>`;
      layout.refresh();
    },

    refresh() {
      const path = (App.router.current && App.router.current.path) || '/';
      const nav = document.getElementById('nav');
      if (!nav) return;
      nav.innerHTML = NAV.map((n) => {
        if (n.sep) return `<div class="nav-sep">${n.sep}</div>`;
        const c = n.count ? n.count() : 0;
        return `<a href="${n.href}" class="${n.match.test(path) ? 'active' : ''}"><span class="ico">${n.ico}</span>${n.label}${c ? `<span class="count">${c}</span>` : ''}</a>`;
      }).join('');
      document.getElementById('bottomNav').innerHTML = BOTTOM.map((n) =>
        `<a href="${n.href}" class="${n.match.test(path) ? 'active' : ''}"><span class="ico">${n.ico}</span>${n.label}</a>`).join('');
      const L = App.game.level();
      const streak = App.game.streakNow();
      const goal = App.game.dailyGoalPct();
      document.getElementById('sidePlayer').innerHTML = `
        <div class="row nowrap" style="gap:.7rem">
          ${App.ui.ring(goal, 52, 6, 'var(--accent)', `<span style="font-size:1.1rem">${goal >= 1 ? '✅' : '🎯'}</span>`)}
          <div class="grow">
            <div class="lvl"><b>Niv. ${L.level}</b><span class="muted tiny">${U.fmtNum(App.store.state.xp)} XP</span></div>
            <div class="tiny muted" style="margin:.1rem 0 .35rem">${L.title}</div>
            ${App.ui.bar(L.pct, 'thin')}
          </div>
        </div>
        <div class="row between mt1 small"><span class="acc-t" style="font-weight:800"><span class="flame">🔥</span> ${streak} j</span><span class="muted tiny">Objectif : ${Math.round(goal * 100)} %</span></div>`;
      document.getElementById('topStats').innerHTML = `<span class="pill fire"><span class="flame">🔥</span>${streak}</span><span class="pill xp">⭐ ${L.level}</span>`;
    },

    setTitle(t) {
      const el = document.getElementById('topTitle');
      if (el) el.textContent = t;
      document.title = t + ' · Révision MEF';
    }
  });

  App.bus.on('route', () => layout.refresh());
  App.bus.on('xp', U.debounce(() => layout.refresh(), 120));
})();
