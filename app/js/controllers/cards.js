/* Contrôleur : cartes mémoire avec répétition espacée (retourner, s'auto-évaluer). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  R.add('/cartes', (p, query) => {
    App.layout.setTitle('Cartes mémoire');
    const mods = App.content.modules.filter((m) => m.cards.length);
    if (query.go == null) {
      const all = App.srs.counts();
      App.ui.mount(`
        <div class="page-head"><h1>🃏 Cartes mémoire</h1><div class="sub">Répétition espacée : une carte revient juste avant que tu l'oublies. Sois honnête dans ton auto-évaluation : c'est elle qui règle le calendrier.</div></div>
        <div class="card pad-lg">
          <div class="row nowrap">
            ${App.ui.ring(all.total ? all.mastered / all.total : 0, 84, 8, 'var(--ok)', `${all.mastered}<small>maîtrisées</small>`)}
            <div class="grow">
              <div class="row"><span class="chip ko">${all.due} à revoir</span><span class="chip pri">${all.fresh} nouvelles</span><span class="chip">${all.total} au total</span></div>
              <p class="small muted mt1 mb1">Prochaine échéance : ${App.srs.nextDueLabel() || '—'}. Chaque session = les cartes dues + ${App.store.state.settings.newCardsPerSession} nouvelles.</p>
              <a class="btn primary lg" href="#/cartes?go=1">▶ Lancer la session</a>
            </div>
          </div>
        </div>
        ${App.md.tip('Pour chaque carte : <b>essaie de répondre à voix haute avant de la retourner</b>. Raccourcis : <kbd>Espace</kbd> retourner · <kbd>1</kbd> À revoir · <kbd>2</kbd> Difficile · <kbd>3</kbd> Bien · <kbd>4</kbd> Facile.')}
        <h2 class="mt3">Par module</h2>
        <div class="grid auto">${mods.map((m) => {
          const c = App.srs.counts(m.id);
          return `<a class="card hover" style="color:inherit;text-decoration:none;border-left:5px solid ${m.color}" href="#/cartes?go=1&mod=${m.id}"><div class="row nowrap"><span style="font-size:1.5rem">${m.icon}</span><div class="grow"><b>${m.short || m.title}</b><div class="small muted">${c.total} cartes · ${c.due} à revoir · ${c.fresh} nouvelles</div>${App.ui.bar(c.total ? c.mastered / c.total : 0, 'ok')}</div></div></a>`;
        }).join('')}</div>`, { help: 'cartes' });
      return;
    }
    session(query.mod || null, query.g != null && App.guided.active(query.mod), query.fragile != null);
  });

  function session(modId, guidedOn, fragile) {
    const queue = fragile ? App.srs.fragile(20) : App.srs.session({ mod: modId });
    const m = modId ? App.content.mod(modId) : null;
    const title = fragile ? '🌙 Les 20 cartes les plus fragiles' : m ? `${m.icon} Cartes — ${m.short || m.title}` : '🃏 Session de cartes';
    let i = 0, flipped = false, reviewed = 0, xp = 0;
    const tally = [0, 0, 0, 0];
    if (!queue.length) {
      App.ui.mount(`${App.ui.crumbs([['Cartes', '#/cartes'], ['Session']])}<div class="card empty"><div class="big">🎉</div><h2>Rien à revoir pour l'instant</h2><p>Toutes les cartes de ce paquet sont à jour. Prochaine échéance : ${App.srs.nextDueLabel(modId) || '—'}.</p><a class="btn primary" href="#/entrainement">S'entraîner autrement</a></div>`);
      return;
    }
    const v = App.ui.mount(`
      <div class="focus-head">
        <a class="fh-close" href="#/cartes" title="Quitter (Échap)" aria-label="Quitter">✕</a>
        <div class="fh-mid"><div class="fh-title">${title}</div>${App.ui.bar(0, 'fh-bar ok')}</div>
        <span class="fh-count" id="cCount"></span>
        <button class="btn sm ghost" id="cEnd">Terminer</button>
      </div>
      <div id="cHost" class="focus-body"></div>`, { focus: true, help: 'cartes' });
    App.layout.setBack('#/cartes');
    const host = v.querySelector('#cHost');
    const bar = v.querySelector('.fh-bar > i');
    v.querySelector('#cEnd').addEventListener('click', end);

    function show() {
      if (i >= queue.length) return end();
      const c = queue[i];
      const cm = App.content.mod(c.mod);
      const st = App.srs.state(c.id);
      flipped = false;
      v.querySelector('#cCount').textContent = `${i + 1} / ${queue.length}`;
      bar.style.width = Math.round((i / queue.length) * 100) + '%';
      host.innerHTML = `
        <div class="flip-wrap" style="--mc:${cm ? cm.color : 'var(--primary)'}">
          <div class="flip" id="flip">
            <div class="face front"><span class="tag">${cm ? cm.icon + ' ' + (cm.short || cm.title) : ''} ${st ? '' : '· nouvelle'}</span><div class="fc-text">${c.front}</div><div class="hint">Réponds dans ta tête, puis touche la carte (Espace)</div></div>
            <div class="face back"><span class="tag">Réponse</span><div class="fc-text prose">${c.back}</div></div>
          </div>
        </div>
        <div id="rateBox" class="mt2"><button class="btn primary lg block" id="flipBtn">Retourner la carte <span class="k">Espace</span></button></div>`;
      const flip = host.querySelector('#flip');
      // hauteur adaptée au contenu le plus long
      requestAnimationFrame(() => {
        const faces = U.$$('.face', flip);
        const h = Math.max(290, ...faces.map((f) => f.scrollHeight + 10));
        flip.style.minHeight = Math.min(h, 620) + 'px';
      });
      flip.addEventListener('click', doFlip);
      host.querySelector('#flipBtn').addEventListener('click', doFlip);
    }

    function doFlip() {
      const flip = host.querySelector('#flip');
      if (!flip) return;
      if (flipped) { flip.classList.toggle('on'); return; }
      flipped = true;
      flip.classList.add('on');
      App.fx.sound('flip');
      const c = queue[i];
      const st = App.srs.state(c.id);
      const lbl = (k) => {
        if (k === 0) return '< 1 min';
        const sim = Object.assign({ box: 0 }, st || {});
        let box = sim.box;
        if (k === 1) box = Math.max(1, box); else if (k === 2) box = Math.min(6, box === 0 ? 2 : box + 1); else box = Math.min(6, box === 0 ? 3 : box + 2);
        const ms = App.srs.INTERVALS[box] * (k === 1 ? 0.5 : 1);
        return ms < 3600000 ? Math.round(ms / 60000) + ' min' : ms < 86400000 ? Math.round(ms / 3600000) + ' h' : Math.round(ms / 86400000) + ' j';
      };
      host.querySelector('#rateBox').innerHTML = `<div class="rate">
        <button class="btn again" data-r="0">À revoir<small>${lbl(0)} · 1</small></button>
        <button class="btn hard" data-r="1">Difficile<small>${lbl(1)} · 2</small></button>
        <button class="btn good" data-r="2">Bien<small>${lbl(2)} · 3</small></button>
        <button class="btn easy" data-r="3">Facile<small>${lbl(3)} · 4</small></button></div>`;
      U.$$('[data-r]', host).forEach((b) => b.addEventListener('click', () => rate(+b.dataset.r)));
    }

    function rate(r) {
      if (!flipped) return;
      const c = queue[i];
      App.srs.rate(c.id, r);
      tally[r]++;
      reviewed++;
      const t = App.store.today();
      t.cards = (t.cards || 0) + 1;
      const tot = App.store.count('cardsReviewed');
      if (tot >= 100) App.game.award('cards100');
      if (tot >= 500) App.game.award('cards500');
      const gain = [1, 2, 3, 3][r];
      xp += gain;
      App.game.addXP(gain, false);
      if (r === 0) queue.push(c); // revient en fin de session
      i++;
      show();
    }

    function end() {
      App.router.onLeave(() => {});
      App.ui.setFocus(false);
      bar.style.width = '100%';
      App.fx.sound('end');
      if (reviewed >= 10) App.fx.confetti(0.6);
      host.innerHTML = `<div class="card pad-lg center"><div class="big-emoji" style="font-size:3.4rem">🧠</div><h2 class="mt1">${reviewed} carte(s) révisée(s)</h2>
        <div class="row mt1" style="justify-content:center"><span class="chip ko">À revoir ${tally[0]}</span><span class="chip warn">Difficile ${tally[1]}</span><span class="chip ok">Bien ${tally[2]}</span><span class="chip pri">Facile ${tally[3]}</span></div>
        <p class="muted mt2">+${xp} XP · prochaine échéance ${App.srs.nextDueLabel(modId) || '—'}</p>
        <div class="row mt2" style="justify-content:center">${fragile ? '<a class="btn primary" href="#/veille">🌙 Suite de la veille ▶</a>' : guidedOn ? '<a class="btn primary" href="#/seance">🧭 Suite de la séance ▶</a><a class="btn" href="#/cartes">Autre paquet</a>' : '<a class="btn primary" href="#/cartes">Autre paquet</a><a class="btn" href="#/entrainement">S\'entraîner</a>'}</div></div>`;
      if (guidedOn) App.guided.mark('cartes', modId);
      if (fragile) App.veille.mark('cartes');
      v.querySelector('#cCount').textContent = 'Terminé';
      App.store.save();
    }

    App.ui.keys({
      ' ': (e) => { e.preventDefault(); doFlip(); },
      Enter: (e) => { if (!flipped) { e.preventDefault(); doFlip(); } },
      1: () => rate(0), 2: () => rate(1), 3: () => rate(2), 4: () => rate(3),
      Escape: () => { if (!document.querySelector('.modal-bg')) location.hash = '#/cartes'; }
    });
    show();
  }
})();
