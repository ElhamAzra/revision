/* Contrôleur : exercices type concours (énoncé, réponses partiellement auto-corrigées, corrigé détaillé, auto-évaluation au barème). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  /* Rend un bloc « partie » réutilisé par les exercices et le sujet blanc.
     onGrade(points) est appelé à chaque auto-évaluation. */
  function partBlock(part, k, onGrade, opts) {
    opts = opts || {};
    const el = U.el(`<div class="part">
      <div class="row between nowrap" style="align-items:flex-start"><div class="grow prose">${part.q}</div><span class="pts nowrap">${U.fmtNum(part.pts)} pt${part.pts > 1 ? 's' : ''}</span></div>
      ${part.fields ? `<div class="fields mt1">${part.fields.map((f, i) => `<div class="field" style="${f.wide ? 'grid-column:1/-1' : ''}"><label class="lbl">${f.label || 'Réponse'}</label>${f.kind === 'select' ? `<select class="input" data-i="${i}"><option value="">—</option>${f.opts.map((o, j) => `<option value="${j}">${o}</option>`).join('')}</select>` : `<input class="input ${/ip|cidr|mask|v6|num|bin|hex/.test(f.kind || '') ? 'mono' : ''}" data-i="${i}" autocomplete="off" spellcheck="false" placeholder="${U.esc(f.ph || '')}">`}<div class="exp"></div></div>`).join('')}</div>` : `<textarea class="input mt1" rows="${opts.rows || 3}" placeholder="Rédige ta réponse ici (ou sur papier, comme le jour J)…"></textarea>`}
      <div class="row mt1">${part.fields ? '<button class="btn sm soft" data-check>Vérifier</button>' : ''}<button class="btn sm" data-corr>Voir le corrigé</button><span class="grow"></span><span class="small muted" data-gotlbl></span></div>
      <div data-corrbox></div>
    </div>`);
    let auto = null;
    const box = el.querySelector('[data-corrbox]');
    if (part.fields) {
      el.querySelector('[data-check]').addEventListener('click', () => {
        const inputs = U.$$('[data-i]', el);
        let n = 0;
        inputs.forEach((inp, i) => {
          const f = part.fields[i];
          const ok = App.quiz.checkField(f, inp.value);
          if (ok) n++;
          inp.classList.remove('ok', 'ko');
          inp.classList.add(ok ? 'ok' : 'ko');
          const exp = inp.parentElement.querySelector('.exp');
          exp.className = 'exp ' + (ok ? 'ok' : 'ko');
          exp.textContent = ok ? '✓' : '→ ' + App.quiz.expected(f);
        });
        auto = Math.round((n / inputs.length) * part.pts * 2) / 2;
        App.fx.sound(n === inputs.length ? 'ok' : 'ko');
        showCorr();
        grade(auto, true);
      });
    }
    el.querySelector('[data-corr]').addEventListener('click', showCorr);
    function showCorr() {
      if (box.innerHTML) return;
      const half = part.pts / 2;
      box.innerHTML = `<div class="corr prose">${part.corr}</div>
        <div class="grade-row"><span class="small muted">Ma note :</span>
          <button class="btn sm ko" data-g="0">0</button>
          ${part.pts >= 1 ? `<button class="btn sm" data-g="${half}">${U.fmtNum(half)}</button>` : ''}
          <button class="btn sm ok" data-g="${part.pts}">${U.fmtNum(part.pts)} ✓</button>
          <span class="small muted">/ ${U.fmtNum(part.pts)}</span></div>`;
      App.ui.hydrate(box);
      U.$$('[data-g]', box).forEach((b) => b.addEventListener('click', () => grade(+b.dataset.g)));
      if (auto != null) grade(auto, true);
    }
    function grade(v, silent) {
      U.$$('[data-g]', box).forEach((b) => b.classList.toggle('on', +b.dataset.g === v));
      el.querySelector('[data-gotlbl]').innerHTML = `<b class="${v >= part.pts ? 'ok-t' : v > 0 ? 'warn-t' : 'ko-t'}">${U.fmtNum(v)} / ${U.fmtNum(part.pts)}</b>`;
      onGrade(k, v);
      if (!silent) App.fx.sound(v >= part.pts ? 'ok' : 'tick');
    }
    return el;
  }
  App.exo = { partBlock };

  R.add('/exo/:id', (p) => {
    const e = App.content.exercises[p.id];
    if (!e) return R.go('/entrainement');
    const m = App.content.mod(e.mod);
    App.layout.setTitle(e.title);
    const grades = {};
    const prev = App.progress.exerciseScore(e.id);
    const v = App.ui.mount(`
      ${App.ui.crumbs([['Cours', '#/cours'], [m.short || m.title, '#/cours/' + m.id + '?tab=pratique'], ['Exercice']])}
      <div class="page-head"><div class="tiny" style="font-weight:800;color:${m.color};text-transform:uppercase;letter-spacing:.06em">${m.icon} ${m.label} · ${e.min || 10} min · ${e.points} points${e.src ? ' · ' + e.src : ''}</div><h1 class="mt1">✍️ ${e.title}</h1></div>
      <div class="card"><div class="row between"><span class="small muted">Conditions concours : papier, crayon, pas de calculatrice. Lance le chrono puis compare au corrigé.</span><span class="row"><span class="timer" id="tm">${U.fmtDuration((e.min || 10) * 60)}</span><button class="btn sm" id="tmGo">⏱️ Démarrer</button></span></div>
        ${e.statement ? `<div class="prose mt2">${e.statement}</div>` : ''}</div>
      <div class="card mt2" id="parts"></div>
      <div class="card mt2 center" id="total"></div>`);
    const host = v.querySelector('#parts');
    e.parts.forEach((part, k) => host.appendChild(partBlock(part, k, (kk, val) => { grades[kk] = val; total(); })));
    function total() {
      const sc = U.sum(Object.values(grades));
      const all = Object.keys(grades).length === e.parts.length;
      v.querySelector('#total').innerHTML = `<div class="small muted">Total ${all ? '' : '(provisoire)'}</div><div class="bignum ${sc / e.points >= 0.7 ? 'ok-t' : sc / e.points >= 0.4 ? 'warn-t' : 'ko-t'}">${U.fmtNum(sc)} / ${e.points}</div>
        ${prev ? `<div class="small muted">Meilleur score précédent : ${U.fmtNum(prev.best || prev.score)} / ${prev.max}</div>` : ''}
        <div class="row mt2" style="justify-content:center"><button class="btn primary" id="save" ${all ? '' : 'disabled'}>💾 Enregistrer mon score</button>${App.guided.active(m.id) ? '<a class="btn" href="#/seance">🧭 Suite de la séance ▶</a>' : `<a class="btn" href="#/cours/${m.id}?tab=pratique">Retour</a>`}</div>`;
      const sb = v.querySelector('#save');
      sb.addEventListener('click', () => {
        App.progress.saveExercise(e.id, sc, e.points);
        App.guided.mark('exo', m.id);
        App.game.addXP(Math.round(sc * 5) + 10, sb);
        App.ui.toast('✍️', `<b>Score enregistré : ${U.fmtNum(sc)}/${e.points}</b>`);
        if (sc / e.points >= 0.8) App.fx.confetti(0.6);
        sb.disabled = true;
        sb.textContent = '✓ Enregistré';
      });
    }
    total();
    // chronomètre
    let left = (e.min || 10) * 60, tid = null;
    v.querySelector('#tmGo').addEventListener('click', (ev) => {
      if (tid) { clearInterval(tid); tid = null; ev.target.textContent = '▶ Reprendre'; return; }
      ev.target.textContent = '⏸ Pause';
      tid = setInterval(() => {
        left--;
        const t = v.querySelector('#tm');
        if (!t) return clearInterval(tid);
        t.textContent = (left < 0 ? '+' : '') + U.fmtDuration(Math.abs(left));
        t.classList.toggle('low', left <= 60);
        if (left === 0) { App.fx.sound('end'); App.ui.toast('⏰', 'Temps écoulé ! Termine ta phrase et passe au corrigé.'); }
      }, 1000);
    });
    App.router.onLeave(() => clearInterval(tid));
  });
})();
