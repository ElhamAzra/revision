/* Contrôleurs : hub d'entraînement, générateurs infinis, défi éclair, QCM, pré-test, mélange intelligent, carnet d'erreurs. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  /* ---------- Hub ---------- */
  R.add('/entrainement', () => {
    App.layout.setTitle('Entraînement');
    const st = App.store.state;
    const mods = App.content.modules;
    App.ui.mount(`
      <div class="page-head"><h1>🎯 Entraînement</h1><div class="sub">S'entraîner à se rappeler (et pas seulement relire) : c'est la méthode la plus efficace pour retenir.</div></div>
      <div class="grid c2">
        <a class="card hover" href="#/quiz/mix" style="color:inherit;text-decoration:none;background:linear-gradient(135deg,var(--primary-soft),var(--surface))"><h3>🎲 Mélange intelligent</h3><p class="small muted mb0">15 questions qui mélangent tes erreurs, tes modules faibles et les séances déjà vues. L'alternance des thèmes imite le jour J.</p></a>
        <a class="card hover" href="#/defi" style="color:inherit;text-decoration:none;background:linear-gradient(135deg,var(--accent-soft),var(--surface))"><h3>⚔️ Défi entre amis</h3><p class="small muted mb0">Un code, les mêmes questions pour toi et tes amis, même sans Internet. Qui fera le meilleur score ?</p></a>
        <a class="card hover" href="#/erreurs" style="color:inherit;text-decoration:none"><h3>🩹 Carnet d'erreurs</h3><p class="small muted mb0">${Object.keys(st.errors).length} erreur(s) en attente. Une erreur sort du carnet après 2 bonnes réponses d'affilée.</p></a>
      </div>

      <h2 class="mt3">⚡ Défis éclair — 60 secondes</h2>
      <div class="grid auto">${App.gen.BLITZ.map((b) => `<a class="card hover" href="#/eclair/${b.id}" style="color:inherit;text-decoration:none"><div class="row nowrap"><span style="font-size:1.7rem">${b.icon}</span><div class="grow"><b>${b.title}</b><div class="small muted">Record : <b class="acc-t">${st.records['blitz-' + b.id] || 0}</b></div></div><span class="chip acc">60 s</span></div></a>`).join('')}</div>

      <h2 class="mt3">✅ QCM par séance</h2>
      <div class="grid auto">${mods.filter((m) => m.qcm.length).map((m) => {
        const acc = App.progress.accuracy(m.id);
        return `<a class="card hover" href="#/quiz/${m.id}" style="color:inherit;text-decoration:none;border-left:5px solid ${m.color}"><div class="row nowrap"><span style="font-size:1.5rem">${m.icon}</span><div class="grow"><b>${m.short || m.title}</b><div class="small muted">${m.qcm.length} questions${acc != null ? ' · ' + Math.round(acc * 100) + ' % récent' : ''}</div></div></div></a>`;
      }).join('')}</div>

      <h2 class="mt3">✍️ Exercices type concours (corrigés + barème)</h2>
      <div class="grid auto">${mods.filter((m) => m.exercises.length).map((m) => {
        const done = m.exercises.filter((e) => App.progress.exerciseScore(e.id)).length;
        return `<a class="card hover" href="#/cours/${m.id}?tab=pratique" style="color:inherit;text-decoration:none;border-left:5px solid ${m.color}"><div class="row nowrap"><span style="font-size:1.5rem">${m.icon}</span><div class="grow"><b>${m.short || m.title}</b><div class="small muted">${m.exercises.length} exercices · ${done} faits</div></div></div></a>`;
      }).join('')}</div>

      <h2 class="mt3">♾️ Générateurs d'exercices infinis</h2>
      <p class="muted small">Des questions toujours nouvelles, corrigées pas à pas. Idéal pour automatiser les calculs (sous-réseaux, binaire, décibels, droits Linux…).</p>
      ${mods.map((m) => {
        const gs = App.gen.forModule(m.id);
        return gs.length ? `<h3 class="mt2" style="color:${m.color}">${m.icon} ${m.short || m.title}</h3><div class="grid auto">${gs.map(App.course.genCard).join('')}</div>` : '';
      }).join('')}`, { help: 'entrainement' });
  });

  /* ---------- Générateur infini ---------- */
  R.add('/gen/:id', (p, query) => {
    const g = App.gen.byId[p.id];
    if (!g) return R.go('/entrainement');
    const lvl = +(query.lvl || 1);
    const m = App.content.mod(g.mod);
    App.runner.start({
      title: `${g.icon} ${g.title}`,
      sub: `${g.desc} <div class="seg mt1" id="lvlSeg">${g.levels.map((l, i) => `<button data-l="${i + 1}" class="${lvl === i + 1 ? 'on' : ''}">${'★'.repeat(i + 1)} ${l}</button>`).join('')}</div>`,
      crumbs: [['Entraînement', '#/entrainement'], [m ? m.short || m.title : 'Générateur', m ? '#/cours/' + m.id + '?tab=pratique' : null], [g.title]],
      next: () => App.gen.make(g.id, lvl),
      help: 'gen',
      count: Infinity,
      backHref: m ? '#/cours/' + m.id + '?tab=pratique' : '#/entrainement',
      retry: () => R.resolve()
    });
    U.$$('#lvlSeg button').forEach((b) => b.addEventListener('click', () => R.go(`/gen/${g.id}?lvl=${b.dataset.l}`)));
  });

  /* ---------- Défi éclair ---------- */
  R.add('/eclair/:pack', (p) => {
    const b = App.gen.BLITZ.find((x) => x.id === p.pack) || App.gen.BLITZ[App.gen.BLITZ.length - 1];
    const best = App.store.state.records['blitz-' + b.id] || 0;
    App.layout.setTitle('Défi éclair');
    const v = App.ui.mount(`
      ${App.ui.crumbs([['Entraînement', '#/entrainement'], ['Défi éclair']])}
      <div class="card pad-lg center">
        <div style="font-size:3.4rem">${b.icon}</div>
        <h1>Défi éclair : ${b.title}</h1>
        <p class="muted">60 secondes. Un maximum de bonnes réponses. Pas de pause.<br>Ton record : <b class="acc-t" style="font-size:1.2rem">${best}</b></p>
        <button class="btn accent lg" id="go">⚡ Partez ! <span class="k">Entrée</span></button>
        <p class="small muted mt2">Astuce : sur PC, valide avec <kbd>Entrée</kbd> sans lâcher le clavier.</p>
      </div>`, { help: 'eclair' });
    let offKeys = null;
    const go = () => {
      if (offKeys) offKeys();
      const t = App.store.today();
      t.blitz = (t.blitz || 0) + 1;
      App.runner.start({
        title: `${b.icon} ${b.title}`,
        crumbs: [['Entraînement', '#/entrainement'], ['Défi éclair']],
        mode: 'blitz', time: 60, recordKey: 'blitz-' + b.id, help: 'eclair',
        next: App.gen.mixer(b.ids, b.level, b.quick),
        count: Infinity,
        noErrorLog: false,
        retry: () => R.resolve(),
        backHref: '#/entrainement'
      });
    };
    v.querySelector('#go').addEventListener('click', go);
    offKeys = App.ui.keys({ Enter: (e) => { e.preventDefault(); go(); } });
  });

  /* ---------- QCM d'un module / mélange ---------- */
  R.add('/quiz/:mod', (p, query) => {
    if (p.mod === 'mix') return mix();
    const m = App.content.mod(p.mod);
    if (!m) return R.go('/entrainement');
    const n = +(query.n || 0) || m.qcm.length;
    // priorité aux questions jamais vues / ratées
    const st = App.store.state.qstats;
    const pool = U.shuffle(m.qcm).sort((a, b) => score(a) - score(b));
    function score(q) { const s = st[q.id]; return !s ? 0 : s.streak >= 2 ? 3 : s.ok / s.seen < 0.6 ? 1 : 2; }
    const g = query.g != null && App.guided.active(m.id);
    App.runner.start({
      title: `${m.icon} QCM — ${m.short || m.title}`,
      crumbs: [['Cours', '#/cours'], [m.short || m.title, '#/cours/' + m.id], ['QCM']],
      questions: pool.slice(0, n),
      backHref: g ? '#/seance' : '#/cours/' + m.id + '?tab=pratique',
      onFinish: g ? () => App.guided.mark('qcm', m.id) : null,
      nextHref: g ? '#/seance' : null, nextLabel: '🧭 Suite de la séance ▶',
      retry: () => R.resolve()
    });
  });

  function mix() {
    const st = App.store.state;
    const today = U.dayKey();
    const seen = App.content.modules.filter((m) => !m.day || m.day <= today || (st.modStats[m.id] && st.modStats[m.id].answered));
    const errs = App.progress.errors().slice(0, 5).map((e) => e.q);
    const weak = seen.slice().sort((a, b) => App.progress.mastery(a.id) - App.progress.mastery(b.id)).slice(0, 3);
    const qs = [];
    const add = (q) => { if (q && !qs.find((x) => x.id === q.id)) qs.push(q); };
    errs.forEach(add);
    weak.forEach((m) => U.shuffle(m.qcm).slice(0, 3).forEach(add));
    U.shuffle(seen.flatMap((m) => m.qcm)).slice(0, 8).forEach(add);
    const gens = App.gen.list.filter((g) => seen.find((m) => m.id === g.mod));
    for (let i = 0; i < 3 && gens.length; i++) add(App.gen.make(U.pick(gens).id, U.R.int(1, 2)));
    App.runner.start({
      title: '🎲 Mélange intelligent',
      sub: 'Tes erreurs, tes points faibles et des calculs générés, mélangés.',
      crumbs: [['Entraînement', '#/entrainement'], ['Mélange']],
      questions: U.shuffle(qs).slice(0, 15),
      retry: () => R.resolve()
    });
  }

  /* ---------- Pré-test ---------- */
  R.add('/pretest/:mod', (p, query) => {
    const m = App.content.mod(p.mod);
    if (!m || !m.pretest.length) return R.go('/cours');
    const g = query.g != null && App.guided.active(m.id);
    App.runner.start({
      title: `🧪 Pré-test — ${m.short || m.title}`,
      sub: 'Réponds au mieux AVANT de lire le cours. Se tromper ici est normal et utile.',
      crumbs: [['Cours', '#/cours'], [m.short || m.title, '#/cours/' + m.id], ['Pré-test']],
      questions: m.pretest,
      noErrorLog: true,
      backHref: g ? '#/seance' : '#/cours/' + m.id,
      nextHref: g ? '#/seance' : '#/cours/' + m.id, nextLabel: g ? '🧭 Suite de la séance ▶' : '📖 Lire le cours ▶',
      onFinish: (s) => { App.store.state.pretest[m.id] = { score: s.ok, total: s.n, at: Date.now() }; if (g) App.guided.mark('pretest', m.id); App.store.save(); }
    });
  });

  /* ---------- Carnet d'erreurs ---------- */
  R.add('/erreurs', (p, query) => {
    App.layout.setTitle('Carnet d\'erreurs');
    if (query.go != null) return replay(query.mod || null, query.g != null && App.guided.active(query.mod), query.v != null);
    const list = App.progress.errors();
    const byMod = {};
    list.forEach((e) => (byMod[e.mod] = (byMod[e.mod] || 0) + 1));
    App.ui.mount(`
      <div class="page-head"><h1>🩹 Carnet d'erreurs</h1><div class="sub">Rempli automatiquement. Une erreur disparaît quand tu y réponds juste <b>2 fois d'affilée</b> (+15 XP à chaque erreur vaincue). Erreurs vaincues : <b class="ok-t">${App.store.state.errorsBeaten || 0}</b>.</div></div>
      ${list.length ? `
        <div class="row"><a class="btn primary lg" href="#/erreurs?go=1">🔁 Rejouer mes ${Math.min(list.length, 20)} erreurs</a>
        ${Object.entries(byMod).map(([mid, n]) => { const m = App.content.mod(mid); return m ? `<a class="btn sm" href="#/erreurs?go=1&mod=${mid}">${m.icon} ${m.short} (${n})</a>` : ''; }).join('')}</div>
        <div class="stack mt2">${list.map((e) => { const m = App.content.mod(e.mod); return `<div class="card"><div class="row between"><span class="chip" style="color:${m ? m.color : ''}">${m ? m.icon + ' ' + m.short : ''}</span><span class="tiny muted">ratée ${e.wrong}× · ${U.ago(e.at)}${e.ok ? ' · 1 réussite' : ''}</span></div><div class="mt1">${e.q.q}</div></div>`; }).join('')}</div>
        <div class="mt2"><button class="btn sm ghost" id="clearErr">Vider le carnet</button></div>`
        : `<div class="card empty"><div class="big">✨</div><h2>Carnet vide</h2><p>Aucune erreur en attente. Lance un QCM ou un défi : tes erreurs apparaîtront ici pour être retravaillées.</p><a class="btn primary" href="#/quiz/mix">🎲 Mélange intelligent</a></div>`}`, { help: 'erreurs' });
    const cb = document.getElementById('clearErr');
    if (cb) cb.addEventListener('click', () => App.ui.confirm('<h3>Vider le carnet ?</h3><p>Les erreurs enregistrées seront supprimées.</p>', 'Vider', () => { App.store.state.errors = {}; App.store.save(); R.resolve(); }, true));
  });

  function replay(mod, g, vl) {
    const list = App.progress.errors(mod).slice(0, vl ? 10 : 20).map((e) => {
      const q = JSON.parse(JSON.stringify(e.q));
      delete q._order; delete q._rorder;
      return q;
    });
    const t = App.store.today();
    t.errReplay = (t.errReplay || 0) + 1;
    App.runner.start({
      title: '🔁 Rejouer mes erreurs',
      sub: 'Deux bonnes réponses d\'affilée sur une erreur = elle est vaincue.',
      crumbs: [['Carnet d\'erreurs', '#/erreurs'], ['Rejouer']],
      questions: U.shuffle(list),
      backHref: vl ? '#/veille' : g ? '#/seance' : '#/erreurs',
      onFinish: vl ? () => App.veille.mark('erreurs') : g ? () => App.guided.mark('erreurs', mod) : null,
      nextHref: vl ? '#/veille' : g ? '#/seance' : null, nextLabel: vl ? '🌙 Suite de la veille ▶' : '🧭 Suite de la séance ▶',
      retry: () => R.resolve()
    });
  }
})();
