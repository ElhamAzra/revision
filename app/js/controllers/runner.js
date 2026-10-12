/* Contrôleur : session de questions (pratique, défi éclair) — progression, combo, XP, bilan. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const runner = (App.runner = {
    /* opts : { title, crumbs, questions | next(), count, mode, time, recordKey, onFinish, intro, backHref, retry() } */
    start(opts) {
      const mode = opts.mode || 'practice';
      const infinite = !opts.questions && (opts.count == null || opts.count === Infinity);
      const total = opts.questions ? opts.questions.length : infinite ? Infinity : opts.count;
      const S = { idx: 0, results: [], combo: 0, maxCombo: 0, xp: 0, t0: Date.now(), score: 0, done: false, current: null, advancing: false };
      let timerId = null, timeLeft = opts.time || 0;

      const crumbLinks = (opts.crumbs || []).filter((c) => c[1]);
      const backHref = opts.backHref || (crumbLinks.length ? crumbLinks[crumbLinks.length - 1][1] : '#/entrainement');
      const v = App.ui.mount(`
        <div class="focus-head">
          <a class="fh-close" href="${backHref}" title="Quitter (Échap)" aria-label="Quitter">✕</a>
          <div class="fh-mid">
            <div class="fh-title">${opts.title}</div>
            ${infinite && mode !== 'blitz' ? '' : App.ui.bar(0, 'fh-bar')}
          </div>
          <span class="fh-count" id="qCount"></span>
          <span class="combo" id="qCombo"></span>
          ${mode === 'blitz' ? '<span class="timer" id="qTimer">0:00</span>' : ''}
          ${mode !== 'blitz' ? '<button class="btn sm ghost" id="qEnd" title="Terminer et voir le bilan">Terminer</button>' : ''}
        </div>
        ${opts.sub ? `<div class="focus-sub">${opts.sub}</div>` : ''}
        <div id="qHost" class="focus-body"></div>`, { focus: true });
      App.layout.setBack(backHref);
      const host = v.querySelector('#qHost');
      const bar = v.querySelector('.fh-bar > i');
      const endBtn = v.querySelector('#qEnd');
      if (endBtn) endBtn.addEventListener('click', () => finish());

      App.ui.keys({ Enter: (e) => S.current && S.current.key(e), default: null });
      const onKey = (e) => {
        if (e.key === 'Escape') { if (!document.querySelector('.modal-bg')) location.hash = backHref; return; }
        if (e.key !== 'Enter' && S.current) S.current.key(e);
      };
      document.addEventListener('keydown', onKey);
      App.router.onLeave(() => { document.removeEventListener('keydown', onKey); clearInterval(timerId); S.done = true; });

      function updateTop() {
        const cnt = v.querySelector('#qCount');
        if (mode === 'blitz') cnt.innerHTML = `Score <b class="pri-t" style="font-size:1.15em">${S.score}</b>`;
        else cnt.textContent = infinite ? `${S.results.filter((r) => r.ok).length} ✓ / ${S.results.length}` : `${Math.min(S.idx + 1, total)} / ${total}`;
        if (bar && !infinite) bar.style.width = Math.round((S.results.length / total) * 100) + '%';
        const c = v.querySelector('#qCombo');
        if (S.combo >= 3) {
          const m = App.game.comboMult(S.combo);
          c.innerHTML = `<span class="flame">🔥</span>×${S.combo}${m > 1 ? ` <span class="chip acc">XP ×${m}</span>` : ''}`;
          c.classList.remove('big'); void c.offsetWidth; c.classList.add('big');
        } else c.innerHTML = '';
      }

      function getQ(i) {
        if (opts.questions) return opts.questions[i];
        return opts.next(i);
      }

      function show() {
        if (S.done) return;
        if (!infinite && S.idx >= total) return finish();
        const q = getQ(S.idx);
        if (!q) return finish();
        S.advancing = false;
        const api = App.qview.create(q, {
          mode: mode === 'blitz' ? 'blitz' : 'practice',
          onAnswer: (res, resp) => answered(q, res, resp, api),
          onNext: () => next()
        });
        S.current = api;
        host.innerHTML = '';
        host.appendChild(api.el);
        App.ui.hydrate(api.el);
        api.focus();
        updateTop();
      }

      function answered(q, res, resp, api) {
        S.results.push({ q, ok: res.ok, score: res.score, resp, skipped: !!res.skipped });
        if (res.ok) {
          S.combo++;
          S.maxCombo = Math.max(S.maxCombo, S.combo);
          S.score++;
          App.fx.sound(S.combo >= 5 && S.combo % 5 === 0 ? 'combo' : 'ok');
          if (S.combo === 10) App.game.award('combo10');
          if (S.combo === 25) App.game.award('combo25');
        } else {
          S.combo = 0;
          App.fx.sound('ko');
          App.fx.vibrate(80);
        }
        const xp = App.quiz.xpFor(q, res, S.combo);
        S.xp += xp;
        App.progress.record(q, res.ok, { noErrorLog: opts.noErrorLog || res.score > 0.99 });
        App.game.addXP(xp, api.el.querySelector('.q-text'));
        updateTop();
        if (mode === 'blitz') setTimeout(() => next(), res.ok ? 380 : 1500);
      }

      function next() {
        if (S.advancing || S.done) return;
        S.advancing = true;
        S.idx++;
        show();
      }

      function finish() {
        if (S.done) return;
        S.done = true;
        clearInterval(timerId);
        document.removeEventListener('keydown', onKey);
        const n = S.results.length;
        const ok = S.results.filter((r) => r.ok).length;
        const pct = n ? ok / n : 0;
        const secs = (Date.now() - S.t0) / 1000;
        let record = false;
        if (mode === 'blitz' && opts.recordKey) {
          const rec = App.store.state.records;
          if (!rec[opts.recordKey] || S.score > rec[opts.recordKey]) { record = !!rec[opts.recordKey] || S.score > 0; rec[opts.recordKey] = S.score; }
          if (S.score >= 15) App.game.award('blitz15');
          if (S.score >= 30) App.game.award('blitz30');
          App.store.save();
        }
        if (n >= 10 && ok === n) App.game.award('perfect');
        const summary = { n, ok, pct, xp: S.xp, maxCombo: S.maxCombo, secs, results: S.results, score: S.score };
        if (opts.onFinish) opts.onFinish(summary);
        App.fx.sound('end');
        if (pct >= 0.8 && n >= 5) App.fx.confetti(0.8);
        const emoji = n === 0 ? '👋' : pct >= 0.9 ? '🏆' : pct >= 0.7 ? '🎉' : pct >= 0.5 ? '💪' : '📚';
        const msg = n === 0 ? 'Aucune réponse cette fois.' : pct >= 0.9 ? 'Excellent ! Tu maîtrises.' : pct >= 0.7 ? 'Très bien ! Encore un effort sur les erreurs ci-dessous.' : pct >= 0.5 ? 'C\'est en bonne voie. Relis les explications des erreurs.' : 'Chaque erreur est une leçon : elles sont dans ton carnet, on les reverra.';
        const wrong = S.results.filter((r) => !r.ok);
        App.ui.setFocus(false);
        v.innerHTML = `
          ${opts.crumbs ? App.ui.crumbs(opts.crumbs) : ''}
          <div class="card pad-lg center">
            <div class="big-emoji" style="font-size:3.6rem">${emoji}</div>
            <h1 class="mt1">${mode === 'blitz' ? `Score : ${S.score}` : `${ok} / ${n} bonnes réponses`}</h1>
            ${record ? '<div class="chip acc mb1">🏅 Nouveau record personnel !</div>' : ''}
            <p class="muted">${msg}</p>
            <div class="grid k3 mt2" style="max-width:560px;margin-left:auto;margin-right:auto">
              <div class="kpi" style="justify-content:center"><div><div class="v pri-t">+${S.xp}</div><div class="l">XP gagnés</div></div></div>
              <div class="kpi" style="justify-content:center"><div><div class="v acc-t">🔥 ${S.maxCombo}</div><div class="l">meilleur combo</div></div></div>
              <div class="kpi" style="justify-content:center"><div><div class="v">${U.fmtDuration(secs)}</div><div class="l">durée</div></div></div>
            </div>
            <div class="row mt3" style="justify-content:center">
              ${opts.retry ? '<button class="btn primary" data-retry>🔁 Recommencer</button>' : ''}
              ${wrong.length ? '<a class="btn soft" href="#/erreurs">🩹 Voir le carnet d\'erreurs</a>' : ''}
              <a class="btn" href="${backHref}">Retour</a>
            </div>
          </div>
          ${wrong.length ? `<h2 class="mt3">À revoir (${wrong.length})</h2>
            <div class="stack">${wrong.map((r) => `<div class="card"><div class="q-text" style="font-size:1rem">${r.q.q}</div>
              <div class="fb ko" style="margin-top:.4rem"><div class="fb-h" style="font-size:.95rem">Réponse : ${U.esc(answerOf(r.q)).replace(/&lt;(\/?(b|sup|sub|code|i))&gt;/g, '<$1>')}</div><div class="expl prose">${r.q.expl || ''}</div></div></div>`).join('')}</div>` : ''}`;
        App.ui.hydrate(v);
        const rb = v.querySelector('[data-retry]');
        if (rb) rb.addEventListener('click', () => opts.retry());
        window.scrollTo(0, 0);
      }

      function answerOf(q) {
        if (q.type === 'qcm') return q.choices[q.a].replace(/<[^>]+>/g, '');
        if (q.type === 'multi') return q.a.map((i) => q.choices[i]).join(' + ').replace(/<[^>]+>/g, '');
        if (q.type === 'tf') return q.a ? 'Vrai' : 'Faux';
        if (q.type === 'order') return q.items.join(' → ').replace(/<[^>]+>/g, '');
        if (q.type === 'match') return q.pairs.map((p) => p[0] + ' → ' + p[1]).join(' · ').replace(/<[^>]+>/g, '');
        if (q.type === 'input') return q.fields.map((f) => (f.label ? f.label.replace(/<[^>]+>/g, '') + ' : ' : '') + App.quiz.expected(f)).join(' · ');
        return '';
      }

      if (mode === 'blitz') {
        timeLeft = opts.time || 60;
        const tEl = v.querySelector('#qTimer');
        const tick = () => {
          tEl.textContent = U.fmtDuration(timeLeft);
          tEl.classList.toggle('low', timeLeft <= 10);
          if (timeLeft <= 0) { finish(); return; }
          timeLeft--;
        };
        tick();
        timerId = setInterval(tick, 1000);
      }
      show();
      return S;
    }
  });
})();
