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
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    const name = st.settings.name ? ' ' + U.esc(st.settings.name) : '';

    let heroCount, heroText;
    if (ex.days > 1) { heroCount = `J-${ex.days}`; heroText = `avant le concours (${U.fmtDay(ex.date)})`; }
    else if (ex.days === 1) { heroCount = 'J-1'; heroText = 'C\'est demain ! Relis la fiche dernière heure, dors bien… et bonne chance ! 🍀'; }
    else if (ex.days === 0) { heroCount = 'Jour J'; heroText = 'Bonne chance ! 🍀 Respire, lis tout le sujet et commence par ce que tu maîtrises.'; }
    else { heroCount = '✓'; heroText = 'Le concours est passé — tu peux continuer à t\'entraîner.'; }

    // Reprendre là où on s'était arrêté : la leçon ouverte en dernier (ou la suivante si elle est comprise)
    let resume = null;
    const last = st.settings.last;
    if (last) {
      const lm = App.content.mod(last.mod);
      if (lm) {
        let l = lm.lessons[last.idx];
        if (l && App.progress.lessonDone(l.id)) l = lm.lessons.slice(last.idx + 1).find((x) => !App.progress.lessonDone(x.id)) || null;
        if (l) resume = { m: lm, l };
      }
    }

    const passed = App.content.modules.filter((m) => m.day && m.day < today && App.progress.mastery(m.id) < 0.35);

    App.ui.mount(`
      <section class="hero">
        <div class="hero-grid">
          <div>
            <div class="small" style="opacity:.85">${hello}${name} 👋 · ${U.fmtDay(today)}</div>
            <div class="count mt1">${heroCount}<small>${heroText}</small></div>
            <div class="hero-goal-m"><div class="row between small" style="opacity:.92"><span>🎯 Objectif du jour</span><b>${t.xp} / ${st.settings.dailyGoal} XP</b></div>${App.ui.bar(goalPct)}</div>
            <p class="sub mt1 mb0">${todayMod ? `Séance du jour : <b>${todayMod.icon} ${todayMod.title}</b>` : 'Choisis un module ou lance un entraînement.'}</p>
            <div class="row mt2 hero-cta">
              ${ex.days >= 0 && ex.days <= 2 ? `<a class="btn white lg" href="#/veille">🌙 Mode veille du concours</a>` : ''}
              ${resume ? `<a class="btn white lg" href="#/cours/${resume.m.id}/${resume.l.idx}" title="${U.esc(resume.l.title)}">▶ Reprendre <span class="hero-cta-sub">${resume.m.icon} ${U.esc(resume.l.title)}</span></a>` : ''}
              ${todayMod ? `<a class="btn ${resume ? '' : 'white lg'}" href="#/seance">${App.guided.active(todayMod.id) ? '🧭 Continuer la séance guidée' : resume ? '🧭 Séance guidée' : '🧭 Commencer la séance guidée'}</a>` : (resume ? '<a class="btn" href="#/seance">🧭 Séance guidée</a>' : '<a class="btn white lg" href="#/seance">🧭 Séance guidée</a>')}
              <a class="btn" href="#/eclair/mix">⚡ Défi éclair</a>
            </div>
          </div>
          <div class="center hero-ring">
            ${App.ui.ring(goalPct, 132, 12, '#fff', `<span style="font-size:1.7rem">${t.xp}</span><small style="color:rgba(255,255,255,.85)">/ ${st.settings.dailyGoal} XP</small>`).replace('ring-bg', 'ring-bg" style="stroke:rgba(255,255,255,.25)')}
            <div class="small mt1" style="opacity:.9">Objectif du jour</div>
          </div>
        </div>
      </section>

      ${App.backup.reminderHtml() ? '<div class="mt2">' + App.backup.reminderHtml() + '</div>' : ''}
      <div class="grid k4 mt2">
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
          ${App.prep.card()}
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
      <div class="mod-grid mt1">${App.content.modules.map((m) => modCard(m, today)).join('')}</div>

      <a class="luck-foot mt3" href="#/apropos">
        <span class="luck-clover sm">🍀</span>
        <span class="grow"><b>Bonne chance pour le concours${name ? ',' + name : ''}&nbsp;!</b><small>Application développée par ${App.DEV.name} · contact et à propos ›</small></span>
      </a>
    `);
    App.backup.bindReminder(App.ui.root());
  });

  function modCard(m, today) {
    const mast = App.progress.mastery(m.id);
    const isToday = m.day === today;
    const dl = m.day ? U.daysBetween(today, m.day) : null;
    const when = m.day ? (isToday ? '<span class="chip acc">aujourd\'hui</span>' : dl > 0 ? `<span class="chip">dans ${dl} j</span>` : '<span class="chip">passée</span>') : '<span class="chip pri">fondations</span>';
    const done = m.lessons.filter((l) => App.progress.lessonDone(l.id)).length;
    return `<a class="card hover mod-card ${isToday ? 'today' : ''}" style="--mc:${m.color};color:inherit;text-decoration:none" href="#/cours/${m.id}">
      <span class="m-ico">${m.icon}</span>
      <div class="m-head"><div class="m-num">${m.label}</div></div>
      ${App.ui.ring(mast, 46, 5, m.color)}
      <div class="m-title">${m.title}</div>
      <div class="m-meta">${when}<span>${done}/${m.lessons.length} leçons</span></div>
    </a>`;
  }
  /* Premier lancement : assistant en 4 étapes (ou restauration d'une sauvegarde existante) */
  function onboard() {
    const st = App.store.state;
    if (st.settings.onboarded) return;
    if (st.xp > 0) { st.settings.onboarded = true; App.store.save(); return; }
    const S = st.settings;
    let step = 0;
    const m = App.ui.modal('<div class="onb" id="onb"></div>', { wide: true, locked: true, onClose: () => { S.onboarded = true; App.store.save(); } });
    const box = m.el.querySelector('#onb');
    const dots = (n) => `<div class="onb-dots">${[1, 2, 3].map((k) => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</div>`;
    const finish = () => {
      S.onboarded = true;
      App.store.saveNow();
      m.close();
      App.fx.sound('level');
      App.fx.confetti(0.9);
      const n = App.backup.name();
      App.router.resolve();
      setTimeout(() => App.tour.start(), 900);
    };

    const views = [
      // 0 — accueil : nouvelle révision ou restauration
      () => `
        <div class="big-emoji">📡</div>
        <h2 class="center mt1">Bienvenue !</h2>
        <p class="center muted">Ta révision du concours MEF — Systèmes &amp; Réseaux.<br>100 % hors ligne, ta progression reste sur cet appareil.</p>
        <div class="onb-choice mt2">
          <button class="onb-opt" data-go="new"><span class="e">✨</span><span><b>C'est ma première fois</b><small>Je crée mon profil en 30 secondes.</small></span></button>
          <button class="onb-opt" data-go="restore"><span class="e">📂</span><span><b>J'ai déjà une sauvegarde</b><small>Je reprends ma progression (fichier <code>.json</code> téléchargé depuis l'application, sur ce téléphone ou un autre appareil).</small></span></button>
        </div>
        <p class="center tiny muted mt2 hide-m">Astuce : tu peux aussi glisser-déposer ton fichier de sauvegarde n'importe où dans la fenêtre.</p>
        <p class="center tiny muted mt1 mb0">Application développée par <b>${App.DEV.name}</b> · Bonne chance pour le concours 🍀</p>`,
      // 1 — toi
      () => `${dots(1)}
        <h2 class="center">Faisons connaissance 👋</h2>
        <label class="lbl mt2" for="onbName">Comment t'appelles-tu ?</label>
        <input class="input onb-name" id="onbName" autocomplete="given-name" maxlength="30" placeholder="Ton prénom" value="${U.esc(S.name || '')}">
        <div class="tiny muted mt1">Il sert à personnaliser l'accueil, les encouragements et le nom de tes sauvegardes.</div>
        <label class="lbl mt2" for="onbDate">Date du concours</label>
        <input class="input" type="date" id="onbDate" value="${S.examDate}">
        <div class="lbl mt2">Ton rythme quotidien</div>
        <div class="onb-goals">${[[100, '🌱', 'Tranquille', '≈ 15 min / jour'], [200, '🔥', 'Sérieux', '≈ 30 min / jour'], [400, '🚀', 'Intensif', '≈ 1 h / jour']].map(([v, e, t, d]) => `<button type="button" data-goal="${v}" class="${S.dailyGoal === v ? 'on' : ''}"><span class="e">${e}</span><b>${t}</b><small>${d}</small><small class="pri-t">${v} XP</small></button>`).join('')}</div>
        <div class="onb-nav"><button class="btn ghost" data-back>◀ Retour</button><button class="btn primary" data-next id="onbNext">Continuer ▶</button></div>`,
      // 2 — affichage
      () => `${dots(2)}
        <h2 class="center">${App.backup.name() ? App.backup.name() + ', choisis' : 'Choisis'} ton confort de lecture</h2>
        <div class="mt2" id="onbTypo">${App.ui.typoControls()}</div>
        <div class="lbl mt2">Thème</div>
        <div class="seg" id="onbTheme">${[['auto', '🌗 Auto'], ['light', '☀️ Clair'], ['dark', '🌙 Sombre']].map(([k, l]) => `<button type="button" data-t="${k}" class="${S.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="onb-nav"><button class="btn ghost" data-back>◀ Retour</button><button class="btn primary" data-next>Continuer ▶</button></div>`,
      // 3 — sauvegarde
      () => `${dots(3)}
        <h2 class="center">Ne perds jamais ta progression 💾</h2>
        <div class="onb-save mt2">
          <div><span>✅</span><p><b>Enregistrement automatique</b> sur cet appareil, à chaque réponse.</p></div>
          <div><span>⬇️</span><p><b>Sauvegarde en fichier</b> : un clic sur 💾 télécharge ta progression. Garde-la (Téléchargements, clé USB, WhatsApp…).</p></div>
          <div><span>📂</span><p><b>Restauration</b> : sur un autre appareil ou après un nettoyage du navigateur, ouvre l'application et choisis « J'ai déjà une sauvegarde ».</p></div>
        </div>
        <div class="lbl mt2">Me rappeler de sauvegarder</div>
        ${App.backup.everyControl()}
        <div class="onb-nav"><button class="btn ghost" data-back>◀ Retour</button><button class="btn primary lg" data-done>🚀 Commencer${App.backup.name() ? ', ' + App.backup.name() : ''} !</button></div>`
    ];

    function draw() {
      box.innerHTML = views[step]();
      App.ui.hydrate(box);
      const q = (sel) => box.querySelector(sel);
      U.$$('[data-back]', box).forEach((b) => b.addEventListener('click', () => { step = Math.max(0, step - 1); draw(); }));
      U.$$('[data-next]', box).forEach((b) => b.addEventListener('click', () => { step++; draw(); }));
      if (step === 0) {
        q('[data-go="new"]').addEventListener('click', () => { step = 1; draw(); });
        q('[data-go="restore"]').addEventListener('click', () => App.backup.pick((ok) => { if (ok) m.close(); }));
      } else if (step === 1) {
        const inp = q('#onbName');
        const nx = q('#onbNext');
        const upd = () => { S.name = inp.value.trim(); App.store.save(); nx.textContent = S.name ? `Enchanté, ${S.name} ▶` : 'Continuer sans prénom ▶'; };
        inp.addEventListener('input', upd);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); nx.click(); } });
        upd();
        setTimeout(() => inp.focus(), 60);
        q('#onbDate').addEventListener('change', (e) => { if (e.target.value) { S.examDate = e.target.value; App.store.save(); } });
        U.$$('[data-goal]', box).forEach((b) => b.addEventListener('click', () => { S.dailyGoal = +b.dataset.goal; App.store.save(); U.$$('[data-goal]', box).forEach((x) => x.classList.toggle('on', x === b)); }));
      } else if (step === 2) {
        App.ui.bindTypo(q('#onbTypo'));
        U.$$('#onbTheme button', box).forEach((b) => b.addEventListener('click', () => { S.theme = b.dataset.t; App.store.save(); App.ui.applyTheme(); App.layout.toolIcons(); U.$$('#onbTheme button', box).forEach((x) => x.classList.toggle('on', x === b)); }));
      } else if (step === 3) {
        App.backup.bindEvery(box);
        q('[data-done]').addEventListener('click', finish);
      }
      const md = m.el.querySelector('.modal');
      if (md) md.scrollTop = 0;
    }
    draw();
  }

  App.home = { modCard, onboard };

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
