/* Contrôleur : examens blancs — sujet blanc (auto-évalué au barème) et examen express (auto-corrigé), notes E1/E2. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  const E1_MODS = ['s7', 's8'];
  const avgOf = (e1, e2) => (2 * e1 + 3 * e2) / 5;

  function verdict(e1, e2) {
    const avg = avgOf(e1, e2);
    const elim = e1 <= 5 || e2 <= 5;
    return { avg, elim, html: `
      <div class="grid c3 mt2">
        <div class="card center"><div class="small muted">Épreuve 1 (coef. 2)</div><div class="bignum ${e1 <= 5 ? 'ko-t' : e1 >= 10 ? 'ok-t' : 'warn-t'}">${U.fmtNum(e1, 1)}</div><div class="tiny muted">/ 20 — systèmes</div></div>
        <div class="card center"><div class="small muted">Épreuve 2 (coef. 3)</div><div class="bignum ${e2 <= 5 ? 'ko-t' : e2 >= 10 ? 'ok-t' : 'warn-t'}">${U.fmtNum(e2, 1)}</div><div class="tiny muted">/ 20 — réseaux & télécoms</div></div>
        <div class="card center" style="border:2px solid var(--primary)"><div class="small muted">Moyenne (2×E1 + 3×E2) / 5</div><div class="bignum pri-t">${U.fmtNum(avg, 2)}</div><div class="tiny muted">/ 20</div></div>
      </div>
      ${elim ? App.md.trap(`Une note ≤ 5 est <b>éliminatoire</b>${e1 <= 5 ? ' (Épreuve 1)' : ''}${e2 <= 5 ? ' (Épreuve 2)' : ''}. Ce soir : relis uniquement les « 5 phrases » des séances concernées et refais leurs QCM. Ne commence rien de nouveau.`, 'Alerte note éliminatoire') :
        avg >= 14 ? App.md.key('Excellent niveau : garde le rythme, relis la fiche dernière heure et dors bien.', '🏆 Très bon résultat') :
        avg >= 10 ? App.md.reflex('Au-dessus de la moyenne. Repère dans la correction les questions perdues et refais-les demain matin en 10 minutes.', '✅ Objectif atteint') :
        App.md.tip('Sous la moyenne : concentre-toi sur les points « faciles » (droits Linux, cron, RAID, AGDLP, LSDOU, ports, sous-réseaux) — ce sont les plus rentables.', '💪 Plan de remontée')}` };
  }

  function saveResult(kind, e1, e2, extra) {
    const st = App.store.state;
    const avg = avgOf(e1, e2);
    st.exams.push(Object.assign({ at: Date.now(), kind, e1: Math.round(e1 * 10) / 10, e2: Math.round(e2 * 10) / 10, avg: Math.round(avg * 100) / 100 }, extra || {}));
    App.game.award('exam');
    if (avg >= 10 && e1 > 5 && e2 > 5) App.game.award('exam10');
    if (avg >= 14 && e1 > 5 && e2 > 5) App.game.award('exam14');
    App.game.addXP(100 + Math.round(avg * 10), false);
    App.store.save();
  }

  /* ---------- Hub ---------- */
  R.add('/examen', () => {
    App.layout.setTitle('Examen blanc');
    const hist = App.store.state.exams.slice().reverse();
    const blanc = App.content.extras.examBlanc;
    App.ui.mount(`
      <div class="page-head"><h1>📝 Examen blanc</h1><div class="sub">Mets-toi en conditions réelles : téléphone en silencieux, pas de notes, pas de calculatrice. Note finale = (2 × E1 + 3 × E2) / 5, avec <b>note ≤ 5 éliminatoire</b>.</div></div>
      <div class="grid c2">
        ${blanc ? `<a class="card hover" href="#/examen/blanc" style="color:inherit;text-decoration:none;border-top:4px solid var(--primary)"><h3>📄 ${blanc.title}</h3><p class="small muted">Sujet complet de la séance 9 : étude de cas Agadez — réseaux, télécoms, Linux, Windows, sauvegardes. ${blanc.minutes} min. Tu rédiges, puis tu t'auto-évalues avec le barème officiel.</p><span class="chip pri">${blanc.minutes} min · 40 pts</span></a>` : ''}
        <a class="card hover" href="#/examen/express" style="color:inherit;text-decoration:none;border-top:4px solid var(--accent)"><h3>⚡ Examen express auto-corrigé</h3><p class="small muted">30 questions tirées au sort (QCM + calculs générés) : 18 pour l'Épreuve 2, 12 pour l'Épreuve 1. Corrigé automatiquement, toujours différent.</p><span class="chip acc">35 min · 30 questions</span></a>
        <a class="card hover" href="#/examen/express?part=e2" style="color:inherit;text-decoration:none"><h3>🌐 Mini-épreuve 2 (réseaux)</h3><p class="small muted mb0">20 questions · 25 min</p></a>
        <a class="card hover" href="#/examen/express?part=e1" style="color:inherit;text-decoration:none"><h3>🖥️ Mini-épreuve 1 (systèmes)</h3><p class="small muted mb0">15 questions · 20 min — sécurise la note éliminatoire.</p></a>
      </div>
      ${App.content.extras.reflexes ? `<div class="card mt2"><h3>🧭 Le jour J : les réflexes</h3><ol class="steps">${App.content.extras.reflexes.map((r) => `<li>${r}</li>`).join('')}</ol></div>` : ''}
      <h2 class="mt3">📈 Historique</h2>
      ${hist.length ? App.md.table(['Date', 'Type', 'E1', 'E2', 'Moyenne'], hist.map((h) => [new Date(h.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }), h.kind, `<span class="${h.e1 <= 5 ? 'ko-t' : ''}">${U.fmtNum(h.e1, 1)}</span>`, `<span class="${h.e2 <= 5 ? 'ko-t' : ''}">${U.fmtNum(h.e2, 1)}</span>`, `<b>${U.fmtNum(h.avg, 2)}</b>`])) : '<p class="muted">Aucun examen passé pour l\'instant.</p>'}`);
  });

  /* ---------- Examen express ---------- */
  R.add('/examen/express', (p, query) => {
    const part = query.part || 'all';
    const conf = part === 'e1' ? { n1: 15, n2: 0, min: 20, label: 'Mini-épreuve 1' } : part === 'e2' ? { n1: 0, n2: 20, min: 25, label: 'Mini-épreuve 2' } : { n1: 12, n2: 18, min: 35, label: 'Examen express' };
    const mods = App.content.modules;
    const pick = (isE1, n) => {
      const ms = mods.filter((m) => (E1_MODS.includes(m.id)) === isE1);
      const qcm = U.shuffle(ms.flatMap((m) => m.qcm));
      const gens = App.gen.list.filter((g) => ms.find((m) => m.id === g.mod));
      const out = [];
      const nGen = Math.round(n * 0.35);
      for (let i = 0; i < nGen && gens.length; i++) out.push(App.gen.make(U.pick(gens).id, U.R.int(1, 3)));
      return out.concat(qcm.slice(0, n - out.length)).map((q) => Object.assign({}, q, { _e1: isE1 }));
    };
    const qs = U.shuffle(pick(true, conf.n1)).concat(U.shuffle(pick(false, conf.n2)));
    if (!qs.length) return R.go('/examen');
    App.layout.setTitle(conf.label);
    const resp = qs.map(() => null);
    let cur = 0, left = conf.min * 60, tid = null, finished = false;
    const v = App.ui.mount(`
      <div class="focus-head">
        <a class="fh-close" href="#/examen" title="Quitter l'examen" aria-label="Quitter" data-quit>✕</a>
        <div class="fh-mid"><div class="fh-title">⚡ ${conf.label}</div>${App.ui.bar(0, 'fh-bar')}</div>
        <span class="timer" id="tm"></span>
        <button class="btn sm accent" id="fin">Rendre</button>
      </div>
      <details class="card exam-pal" open><summary><span>Questions</span><span class="small muted" id="palInfo"></span></summary><div class="row mt1" id="pal" style="gap:.35rem"></div></details>
      <div id="qh" class="mt2"></div>
      <div class="exam-nav"><button class="btn" id="pv">◀ Précédente</button><span class="grow"></span><button class="btn primary" id="nx">Suivante ▶</button></div>`, { focus: true });
    App.layout.setBack('#/examen');
    v.querySelector('[data-quit]').addEventListener('click', (e) => {
      if (finished) return;
      e.preventDefault();
      App.ui.confirm('<h3>Quitter l\'examen ?</h3><p>Tes réponses seront perdues.</p>', 'Quitter', () => { finished = true; location.hash = '#/examen'; }, true);
    });
    if (window.innerWidth <= 880) v.querySelector('.exam-pal').removeAttribute('open');
    const pal = v.querySelector('#pal');
    function drawPal() {
      const answeredN = resp.filter((r) => r != null && (!Array.isArray(r) || r.some((x) => x != null && String(x).trim() !== ''))).length;
      v.querySelector('#palInfo').textContent = `${answeredN} / ${qs.length} répondues`;
      const pb = v.querySelector('.fh-bar > i');
      if (pb) pb.style.width = Math.round((answeredN / qs.length) * 100) + '%';
      pal.innerHTML = qs.map((q, i) => `<button class="btn sm ${i === cur ? 'primary' : resp[i] != null && (!Array.isArray(resp[i]) || resp[i].some((x) => x != null && String(x).trim() !== '')) ? 'soft' : ''}" data-i="${i}" style="min-width:2.4rem;padding:.3rem .4rem">${i + 1}${q._e1 ? '<sup style="font-size:.6em">E1</sup>' : ''}</button>`).join('');
      U.$$('[data-i]', pal).forEach((b) => b.addEventListener('click', () => { cur = +b.dataset.i; show(); }));
    }
    function show() {
      const q = qs[cur];
      const api = App.qview.create(q, { mode: 'exam', initial: resp[cur], onChange: (r) => { resp[cur] = r; drawPal(); } });
      const h = v.querySelector('#qh');
      h.innerHTML = `<div class="small muted mb1">Question ${cur + 1} / ${qs.length} · ${q._e1 ? 'Épreuve 1' : 'Épreuve 2'}</div>`;
      h.appendChild(api.el);
      api.focus();
      drawPal();
      v.querySelector('#pv').disabled = cur === 0;
      v.querySelector('#nx').disabled = cur === qs.length - 1;
      if (window.innerWidth <= 880) window.scrollTo(0, 0);
    }
    v.querySelector('#pv').addEventListener('click', () => { if (cur > 0) { cur--; show(); } });
    v.querySelector('#nx').addEventListener('click', () => { if (cur < qs.length - 1) { cur++; show(); } });
    v.querySelector('#fin').addEventListener('click', () => {
      const empty = resp.filter((r) => r == null).length;
      App.ui.confirm(`<h3>Rendre la copie ?</h3><p>${empty ? `<b>${empty}</b> question(s) sans réponse.` : 'Toutes les questions ont une réponse.'} Il reste ${U.fmtDuration(left)}.</p>`, 'Rendre', finish);
    });
    function tick() {
      const t = v.querySelector('#tm');
      if (!t) return;
      t.textContent = '⏱️ ' + U.fmtDuration(left);
      t.classList.toggle('low', left <= 120);
      if (left <= 0) { finish(); return; }
      left--;
    }
    tick();
    tid = setInterval(tick, 1000);
    App.router.onLeave(() => clearInterval(tid));
    show();

    function finish() {
      if (finished) return;
      finished = true;
      clearInterval(tid);
      App.ui.setFocus(false);
      const res = qs.map((q, i) => (resp[i] == null ? { ok: false, score: 0 } : App.quiz.check(q, resp[i])));
      const part1 = qs.map((q, i) => ({ q, r: res[i] })).filter((x) => x.q._e1);
      const part2 = qs.map((q, i) => ({ q, r: res[i] })).filter((x) => !x.q._e1);
      const sc = (arr) => (arr.length ? (U.sum(arr.map((x) => x.r.score)) / arr.length) * 20 : null);
      let e1 = sc(part1), e2 = sc(part2);
      qs.forEach((q, i) => App.progress.record(q, res[i].ok, { noErrorLog: res[i].score > 0.99 }));
      const okN = res.filter((r) => r.ok).length;
      if (e1 != null && e2 != null) saveResult(conf.label, e1, e2, { n: qs.length, ok: okN });
      else App.game.addXP(60 + okN * 3, false);
      App.fx.sound('end');
      const vd = e1 != null && e2 != null ? verdict(e1, e2).html : `<div class="card center mt2"><div class="bignum pri-t">${U.fmtNum((e1 != null ? e1 : e2), 1)} / 20</div><div class="muted">${e1 != null ? 'Épreuve 1' : 'Épreuve 2'} (${okN}/${qs.length} justes)</div></div>`;
      if ((e1 == null || e1 > 10) && (e2 == null || e2 > 10)) App.fx.confetti(0.8);
      v.innerHTML = `${App.ui.crumbs([['Examen', '#/examen'], ['Résultats']])}
        <div class="page-head"><h1>📊 Résultats — ${conf.label}</h1><div class="sub">${okN} / ${qs.length} réponses justes en ${U.fmtDuration(conf.min * 60 - left)}.</div></div>
        ${vd}
        <h2 class="mt3">Correction détaillée</h2>
        <div class="stack">${qs.map((q, i) => `<div class="card"><div class="row between"><span class="chip ${res[i].ok ? 'ok' : res[i].score > 0 ? 'warn' : 'ko'}">${res[i].ok ? '✓' : res[i].score > 0 ? '½' : '✗'} Question ${i + 1}</span><span class="tiny muted">${q._e1 ? 'Épreuve 1' : 'Épreuve 2'}</span></div><div class="mt1">${q.q}</div>${res[i].ok ? '' : `<div class="fb ko"><div class="fb-h" style="font-size:.95rem">Réponse attendue : ${answerOf(q)}</div><div class="expl prose">${q.expl || ''}</div></div>`}</div>`).join('')}</div>
        <div class="row mt3"><a class="btn primary" href="#/examen/express${part !== 'all' ? '?part=' + part : ''}">🔁 Nouvel examen</a><a class="btn" href="#/erreurs">🩹 Carnet d'erreurs</a><a class="btn" href="#/examen">Retour</a></div>`;
      App.ui.hydrate(v);
      window.scrollTo(0, 0);
    }
  });

  function answerOf(q) {
    if (q.type === 'qcm') return q.choices[q.a];
    if (q.type === 'tf') return q.a ? 'Vrai' : 'Faux';
    if (q.type === 'multi') return q.a.map((i) => q.choices[i]).join(' + ');
    if (q.type === 'order') return q.items.join(' → ');
    if (q.type === 'match') return q.pairs.map((p) => p[0] + ' → ' + p[1]).join(' · ');
    if (q.type === 'input') return q.fields.map((f) => (f.label ? f.label + ' : ' : '') + U.esc(App.quiz.expected(f))).join(' · ');
    return '';
  }

  /* ---------- Sujet blanc (séance 9) ---------- */
  R.add('/examen/blanc', () => {
    const ex = App.content.extras.examBlanc;
    if (!ex) return R.go('/examen');
    App.layout.setTitle('Sujet blanc');
    const grades = {};
    let left = ex.minutes * 60, tid = null, phase = 'compose';
    const v = App.ui.mount(`
      ${App.ui.crumbs([['Examen', '#/examen'], ['Sujet blanc']])}
      <div class="page-head"><h1>📄 ${ex.title}</h1><div class="sub">${ex.sub}</div></div>
      <div class="card" style="position:sticky;top:.5rem;z-index:5"><div class="row between"><span class="timer" id="tm">${U.fmtDuration(left)}</span><span class="small muted" id="phaseLbl">Phase 1 : rédaction (corrigés masqués)</span><button class="btn sm primary" id="go">▶ Démarrer le chrono</button><button class="btn sm accent" id="end">Terminer → corriger</button></div></div>
      <div class="card mt2 prose">${ex.context}</div>
      <div id="secs" class="exam-locked"></div>
      <div id="result" class="mt2"></div>`);
    const secs = v.querySelector('#secs');
    let gi = 0;
    ex.sections.forEach((s) => {
      const box = U.el(`<div class="mt3"><h2>${s.title} <span class="chip pri">${s.max} pts</span></h2><div class="small muted mb1">${s.note || ''}</div><div class="card" data-host></div></div>`);
      const host = box.querySelector('[data-host]');
      s.items.forEach((it) => {
        const k = gi++;
        it._sec = s.id;
        host.appendChild(App.exo.partBlock(it, k, (kk, val) => { grades[kk] = { val, sec: s.id }; summary(); }, { rows: 4 }));
      });
      secs.appendChild(box);
    });
    const total = gi;
    v.querySelector('#go').addEventListener('click', (e) => {
      if (tid) return;
      e.target.disabled = true;
      tid = setInterval(() => {
        left--;
        const t = v.querySelector('#tm');
        if (!t) return clearInterval(tid);
        t.textContent = U.fmtDuration(Math.max(0, left));
        t.classList.toggle('low', left <= 600);
        if (left === 0) { App.ui.toast('⏰', '<b>Temps écoulé !</b> Passe à la correction.'); App.fx.sound('end'); }
      }, 1000);
    });
    v.querySelector('#end').addEventListener('click', () => {
      if (phase === 'grade') return;
      phase = 'grade';
      clearInterval(tid);
      secs.classList.remove('exam-locked');
      v.querySelector('#phaseLbl').textContent = 'Phase 2 : correction — ouvre chaque corrigé et note-toi honnêtement';
      App.ui.toast('🧑‍🏫', 'Ouvre les corrigés et attribue-toi les points selon le barème.');
      summary();
    });
    App.router.onLeave(() => clearInterval(tid));
    function summary() {
      const out = v.querySelector('#result');
      if (phase !== 'grade') { out.innerHTML = ''; return; }
      const n = Object.keys(grades).length;
      const p1 = U.sum(Object.values(grades).filter((g) => g.sec === 'I').map((g) => g.val));
      const p2 = U.sum(Object.values(grades).filter((g) => g.sec === 'II').map((g) => g.val));
      const sI = ex.sections.find((s) => s.id === 'I'), sII = ex.sections.find((s) => s.id === 'II');
      const e2 = (p1 * 20) / sI.max, e1 = (p2 * 20) / sII.max;
      out.innerHTML = `<div class="card"><h2>🧮 Ta note</h2><p class="muted small">${n}/${total} questions notées · Partie I : <b>${U.fmtNum(p1)}/${sI.max}</b> → E2 = ${U.fmtNum(p1)} × 20 / ${sI.max} · Partie II : <b>${U.fmtNum(p2)}/${sII.max}</b> → E1 = ${U.fmtNum(p2)} × 20 / ${sII.max}</p>
        ${verdict(e1, e2).html}
        <div class="center mt2"><button class="btn primary" id="saveEx" ${n < total ? 'disabled' : ''}>💾 Enregistrer le résultat</button>${n < total ? '<div class="tiny muted mt1">Note toutes les questions pour enregistrer.</div>' : ''}</div></div>`;
      const b = out.querySelector('#saveEx');
      b.addEventListener('click', () => { saveResult('Sujet blanc', e1, e2); b.disabled = true; b.textContent = '✓ Enregistré'; App.fx.confetti(0.8); });
    }
  });
})();
