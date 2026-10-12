/* Contrôleurs : tableau de bord, plan de révision, menu « Plus » (mobile). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  function examInfo() {
    const ex = App.store.state.settings.examDate;
    const today = U.dayKey();
    const d = U.daysBetween(today, ex);
    return { date: ex, days: d };
  }

  /* Missions du jour : détectées automatiquement à partir de l'activité */
  function missions(todayMod) {
    const t = App.store.today();
    const due = App.srs.counts().due;
    const lessonsToday = Object.entries(App.store.state.lessons).filter(([, ts]) => U.dayKey(new Date(ts)) === U.dayKey()).length;
    const errs = Object.keys(App.store.state.errors).length;
    return [
      { done: lessonsToday >= 2, title: todayMod ? `Lire 2 leçons — ${todayMod.short}` : 'Lire 2 leçons', sub: `${Math.min(lessonsToday, 2)}/2 aujourd'hui`, href: todayMod ? '#/cours/' + todayMod.id : '#/cours' },
      { done: (t.cards || 0) >= 20 || (due === 0 && (t.cards || 0) > 0), title: 'Réviser 20 cartes mémoire', sub: `${t.cards || 0} révisées · ${due} à revoir`, href: '#/cartes' },
      { done: (t.blitz || 0) >= 1, title: 'Faire un défi éclair (60 s)', sub: (t.blitz || 0) ? 'fait ✓' : 'réflexes de calcul', href: '#/eclair/mix' },
      { done: (t.errReplay || 0) >= 1 || (errs === 0 && t.answered > 0), title: 'Rejouer le carnet d\'erreurs', sub: errs ? `${errs} erreur(s) à vaincre` : 'carnet vide 👌', href: '#/erreurs' },
      { done: !!t.goalHit, title: `Atteindre l'objectif : ${App.store.state.settings.dailyGoal} XP`, sub: `${t.xp} XP aujourd'hui`, href: '#/entrainement' }
    ];
  }

  R.add('/', () => {
    App.layout.setTitle('Accueil');
    const st = App.store.state;
    const ex = examInfo();
    const today = U.dayKey();
    const todayMod = App.content.moduleForDay(today);
    const L = App.game.level();
    const streak = App.game.streakNow();
    const cards = App.srs.counts();
    const errs = Object.keys(st.errors).length;
    const t = App.store.today();
    const goalPct = App.game.dailyGoalPct();
    const ms = missions(todayMod);
    const doneM = ms.filter((m) => m.done).length;
    const tips = App.content.extras.tips;
    const tip = tips.length ? tips[(U.daysBetween('2026-01-01', today) + new Date().getHours()) % tips.length] : null;
    const weak = App.progress.weakest();
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    const name = st.settings.name ? ' ' + U.esc(st.settings.name) : '';

    let heroCount, heroText;
    if (ex.days > 1) { heroCount = `J-${ex.days}`; heroText = `avant le concours (${U.fmtDay(ex.date)})`; }
    else if (ex.days === 1) { heroCount = 'J-1'; heroText = 'C\'est demain ! Relis la fiche dernière heure et dors bien.'; }
    else if (ex.days === 0) { heroCount = 'Jour J'; heroText = 'Respire. Tu as travaillé. Lis tout le sujet, commence par ce que tu maîtrises.'; }
    else { heroCount = '✓'; heroText = 'Le concours est passé — tu peux continuer à t\'entraîner.'; }

    const passed = App.content.modules.filter((m) => m.day && m.day < today && App.progress.mastery(m.id) < 0.35);

    App.ui.mount(`
      <section class="hero">
        <div class="hero-grid">
          <div>
            <div class="small" style="opacity:.85">${hello}${name} 👋 · ${U.fmtDay(today)}</div>
            <div class="count mt1">${heroCount}<small>${heroText}</small></div>
            <div class="hero-goal-m"><div class="row between small" style="opacity:.92"><span>🎯 Objectif du jour</span><b>${t.xp} / ${st.settings.dailyGoal} XP</b></div>${App.ui.bar(goalPct)}</div>
            <p class="sub mt1 mb0">${todayMod ? `Séance du jour : <b>${todayMod.icon} ${todayMod.title}</b>` : 'Choisis un module ou lance un entraînement.'}</p>
            <div class="row mt2">
              ${todayMod ? `<a class="btn white lg" href="#/cours/${todayMod.id}">▶ Commencer la séance</a>` : '<a class="btn white lg" href="#/cours">📚 Ouvrir les cours</a>'}
              <a class="btn" href="#/eclair/mix">⚡ Défi éclair</a>
            </div>
          </div>
          <div class="center hero-ring">
            ${App.ui.ring(goalPct, 132, 12, '#fff', `<span style="font-size:1.7rem">${t.xp}</span><small style="color:rgba(255,255,255,.85)">/ ${st.settings.dailyGoal} XP</small>`).replace('ring-bg', 'ring-bg" style="stroke:rgba(255,255,255,.25)')}
            <div class="small mt1" style="opacity:.9">Objectif du jour</div>
          </div>
        </div>
      </section>

      <div class="grid c4 mt2">
        <a class="card hover kpi" href="#/profil" style="color:inherit;text-decoration:none"><span class="ico">⭐</span><div><div class="v">Niv. ${L.level}</div><div class="l">${L.title}</div></div></a>
        <a class="card hover kpi" href="#/profil" style="color:inherit;text-decoration:none"><span class="ico"><span class="flame">🔥</span></span><div><div class="v acc-t">${streak} j</div><div class="l">série (record ${st.streak.best})</div></div></a>
        <a class="card hover kpi" href="#/cartes" style="color:inherit;text-decoration:none"><span class="ico">🃏</span><div><div class="v">${cards.due}</div><div class="l">cartes à revoir · ${cards.fresh} nouvelles</div></div></a>
        <a class="card hover kpi" href="#/erreurs" style="color:inherit;text-decoration:none"><span class="ico">🩹</span><div><div class="v ${errs ? 'ko-t' : 'ok-t'}">${errs}</div><div class="l">erreurs à vaincre</div></div></a>
      </div>

      <div class="grid c2 mt2">
        <div class="card">
          <div class="row between"><h3 class="mb0">🎯 Missions du jour</h3><span class="chip ${doneM === ms.length ? 'ok' : 'pri'}">${doneM}/${ms.length}</span></div>
          <div class="mt1">${ms.map((m) => `<a class="mission ${m.done ? 'done' : ''}" href="${m.href}" style="color:inherit;text-decoration:none"><span class="tick">✓</span><div class="grow"><div class="m-title">${m.title}</div><div class="m-sub">${m.sub}</div></div><span class="muted">›</span></a>`).join('')}</div>
        </div>
        <div class="stack">
          ${weak ? `<div class="card"><h3>🧭 Ton point faible du moment</h3><div class="row nowrap mt1">${App.ui.ring(App.progress.mastery(weak.id), 58, 6, weak.color)}<div class="grow"><b>${weak.icon} ${weak.title}</b><div class="small muted">${weak.subtitle || ''}</div></div></div><div class="row mt2"><a class="btn sm soft" href="#/cours/${weak.id}">Revoir le cours</a><a class="btn sm" href="#/quiz/${weak.id}">QCM</a><a class="btn sm" href="#/cartes?mod=${weak.id}">Cartes</a></div></div>` : ''}
          ${tip ? `<div class="card tip-day"><span class="ico">💡</span><div><div class="tiny muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.06em">Astuce du moment</div><div>${tip}</div></div></div>` : ''}
          <div class="card"><h3>🚀 Accès rapide</h3><div class="row mt1">
            <a class="btn sm primary" href="#/quiz/mix">🎲 Mélange intelligent</a>
            <a class="btn sm" href="#/lab/ipviz">🔬 Visualiseur IP</a>
            <a class="btn sm" href="#/gen/subnet">🧮 Sous-réseaux ∞</a>
            <a class="btn sm" href="#/examen">📝 Examen blanc</a>
            <a class="btn sm" href="#/fiche">⚡ Fiche J-0</a>
          </div></div>
        </div>
      </div>

      ${passed.length ? `<div class="co trap mt2"><div class="co-h">⏪ Rattrapage conseillé</div>Ces séances sont passées dans le plan mais encore peu maîtrisées : ${passed.map((m) => `<a href="#/cours/${m.id}"><b>${m.icon} ${m.short}</b></a>`).join(' · ')}. Une leçon + un QCM par séance suffit à remonter.</div>` : ''}

      <div class="row between mt3"><h2 class="mb0">Tes modules</h2><a href="#/plan" class="small">Voir le plan →</a></div>
      <div class="grid auto mt1">${App.content.modules.map((m) => modCard(m, today)).join('')}</div>
    `);
  });

  function modCard(m, today) {
    const mast = App.progress.mastery(m.id);
    const isToday = m.day === today;
    const dl = m.day ? U.daysBetween(today, m.day) : null;
    const when = m.day ? (isToday ? '<span class="chip acc">aujourd\'hui</span>' : dl > 0 ? `<span class="chip">dans ${dl} j</span>` : '<span class="chip">passée</span>') : '<span class="chip pri">fondations</span>';
    const done = m.lessons.filter((l) => App.progress.lessonDone(l.id)).length;
    return `<a class="card hover mod-card ${isToday ? 'today' : ''}" style="--mc:${m.color};color:inherit;text-decoration:none" href="#/cours/${m.id}">
      <span class="m-ico">${m.icon}</span>
      <div class="grow"><div class="m-num">${m.label}</div><div class="m-title">${m.title}</div><div class="m-meta mt1">${when} <span class="muted">· ${done}/${m.lessons.length} leçons</span></div></div>
      ${App.ui.ring(mast, 48, 5, m.color)}
    </a>`;
  }
  App.home = { modCard };

  /* ---------- Plan de révision ---------- */
  R.add('/plan', () => {
    App.layout.setTitle('Plan de révision');
    const today = U.dayKey();
    const ex = examInfo();
    const mods = App.content.modules.filter((m) => m.day);
    App.ui.mount(`
      <div class="page-head"><h1>🗓️ Plan de révision</h1><div class="sub">9 séances de 2 h, du ${U.fmtDay(mods.length ? mods[0].day : today)} au concours (${U.fmtDay(ex.date, true)}).</div></div>
      <div class="grid c2">
        <div class="card"><h3>📝 Épreuve 1 — Administration des systèmes</h3><p class="mb0">Coefficient <b>2</b> · Linux, Windows Server / AD, stockage, sauvegardes. <span class="chip ko">note ≤ 5 éliminatoire</span></p></div>
        <div class="card"><h3>🌐 Épreuve 2 — Réseaux et télécoms</h3><p class="mb0">Coefficient <b>3</b> · adressage, routage, commutation, services, sécurité, télécoms.</p></div>
      </div>
      <div class="co key"><div class="co-h">⏱️ Rythme d'une séance (2 h)</div>5 min de rappel (les « 5 phrases » de la veille) → 35 min de leçons → 55 min d'exercices chronométrés → 25 min de correction + carnet d'erreurs. L'application suit exactement ce rythme : <b>leçons</b>, <b>cartes</b>, <b>QCM / exercices</b>, puis <b>carnet d'erreurs</b>.</div>
      <div class="stack mt2">
        ${App.content.modules.filter((m) => !m.day).map((m) => planRow(m, today)).join('')}
        ${mods.map((m) => planRow(m, today)).join('')}
        <a class="card hover mod-card" style="--mc:#ec4899;color:inherit;text-decoration:none" href="#/examen"><span class="m-ico">🏁</span><div class="grow"><div class="m-num">${U.fmtDay(ex.date)} · Jour J</div><div class="m-title">Le concours</div><div class="m-meta">Lis tout le sujet (5 min), commence par ce que tu maîtrises, garde 10 min pour relire.</div></div></a>
      </div>`);
  });

  function planRow(m, today) {
    const mast = App.progress.mastery(m.id);
    const isToday = m.day === today;
    return `<a class="card hover mod-card ${isToday ? 'today' : ''}" style="--mc:${m.color};color:inherit;text-decoration:none" href="#/cours/${m.id}">
      <span class="m-ico">${m.icon}</span>
      <div class="grow"><div class="m-num">${m.day ? U.fmtDay(m.day) + ' · ' + (m.label || '') : m.label}${isToday ? ' · <span class="acc-t">AUJOURD\'HUI</span>' : ''}</div><div class="m-title">${m.title}</div><div class="m-meta">${m.subtitle || ''}</div></div>
      ${App.ui.ring(mast, 50, 5, m.color)}</a>`;
  }

  /* ---------- Menu « Plus » (mobile) ---------- */
  R.add('/plus', () => {
    App.layout.setTitle('Plus');
    App.ui.mount(`<div class="page-head"><h1>☰ Plus</h1></div>
      <div class="stack-sm">${App.layout.NAV.filter((n) => !n.sep).map((n) => {
        const c = n.count ? n.count() : 0;
        return `<a class="lesson-item" href="${n.href}"><span class="n">${n.ico}</span><span class="t">${n.label}</span>${c ? `<span class="chip acc">${c}</span>` : ''}<span class="muted">›</span></a>`;
      }).join('')}</div>`);
  });
})();
