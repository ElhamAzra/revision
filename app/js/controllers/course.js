/* Contrôleurs : liste des cours, page d'un module (leçons, cartes, QCM, exercices, 5 phrases), page d'une leçon. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  R.add('/cours', () => {
    App.layout.setTitle('Cours');
    const today = U.dayKey();
    App.ui.mount(`
      <div class="page-head"><h1>📚 Cours</h1><div class="sub">${App.content.lessonCount()} leçons, construites à partir du plan de révision et des supports de cours de l'ESTN. Chaque leçon commence par <b>l'essentiel en 30 secondes</b>.</div></div>
      <div class="mod-grid">${App.content.modules.map((m) => App.home.modCard(m, today)).join('')}</div>`);
  });

  R.add('/cours/:mod', (p, query) => {
    const m = App.content.mod(p.mod);
    if (!m) return R.go('/cours');
    App.layout.setTitle(m.short || m.title);
    const st = App.store.state;
    const mast = App.progress.mastery(m.id);
    const done = m.lessons.filter((l) => App.progress.lessonDone(l.id)).length;
    const nextL = m.lessons.find((l) => !App.progress.lessonDone(l.id)) || m.lessons[0];
    const cc = App.srs.counts(m.id);
    const acc = App.progress.accuracy(m.id);
    const gens = App.gen.forModule(m.id);
    const pre = st.pretest[m.id];
    const tab = query.tab || 'lecons';

    const tabs = [['lecons', '📖 Leçons'], ['pratique', '🎯 Pratique'], ['phrases', '🗣️ 5 phrases']];
    let body = '';
    if (tab === 'lecons') {
      body = `<div class="lesson-list">${m.lessons.map((l) => `<a class="lesson-item ${App.progress.lessonDone(l.id) ? 'done' : ''}" style="--mc:${m.color}" href="#/cours/${m.id}/${l.idx}"><span class="n">${App.progress.lessonDone(l.id) ? '✓' : l.idx + 1}</span><span class="t">${l.title}</span><span class="d">${l.min || 5} min</span></a>`).join('')}</div>`;
    } else if (tab === 'pratique') {
      body = `<div class="grid c2">
        <a class="card hover" href="#/cartes?mod=${m.id}" style="color:inherit;text-decoration:none"><h3>🃏 Cartes mémoire</h3><p class="small muted mb1">${cc.total} cartes · ${cc.mastered} maîtrisées · ${cc.due} à revoir · ${cc.fresh} nouvelles</p>${App.ui.bar(cc.total ? cc.mastered / cc.total : 0, 'ok')}</a>
        <a class="card hover" href="#/quiz/${m.id}" style="color:inherit;text-decoration:none"><h3>✅ QCM de la séance</h3><p class="small muted mb1">${m.qcm.length} questions${acc != null ? ` · réussite récente ${Math.round(acc * 100)} %` : ''}</p>${App.ui.bar(acc || 0)}</a>
      </div>
      ${m.exercises.length ? `<h3 class="mt3">✍️ Exercices type concours</h3><div class="lesson-list">${m.exercises.map((e) => {
        const sc = App.progress.exerciseScore(e.id);
        return `<a class="lesson-item ${sc && sc.score / sc.max >= 0.7 ? 'done' : ''}" href="#/exo/${e.id}"><span class="n">${sc ? Math.round((sc.score / sc.max) * 100) + '%' : '✍️'}</span><span class="t">${e.title}</span><span class="d">${e.min || 10} min · ${e.points} pts</span></a>`;
      }).join('')}</div>` : ''}
      ${gens.length ? `<h3 class="mt3">♾️ Générateurs d'exercices infinis</h3><div class="grid auto">${gens.map(genCard).join('')}</div>` : ''}`;
    } else {
      body = m.phrases.length ? `<div class="card"><p class="muted small">Récite-les de mémoire avant de commencer la séance suivante, puis vérifie. C'est le rappel actif le plus rentable.</p>
        <div data-recite>${m.phrases.map((ph, i) => `<div class="co ex reveal"><div class="co-h">Phrase ${i + 1}</div><div class="small muted">${hintOf(ph)}</div><div class="mt1"><button class="btn sm soft reveal-btn">Voir la réponse</button></div><div class="reveal-body mt1"><b>${ph}</b></div></div>`).join('')}</div></div>` : '<p class="muted">Pas de phrases pour ce module.</p>';
    }

    App.ui.mount(`
      ${App.ui.crumbs([['Cours', '#/cours'], [m.short || m.title]])}
      <div class="card pad-lg" style="--mc:${m.color};border-top:5px solid ${m.color}">
        <div class="row nowrap" style="align-items:flex-start">
          <span class="m-ico" style="width:58px;height:58px;border-radius:17px;display:grid;place-items:center;font-size:1.8rem;background:color-mix(in srgb, ${m.color} 16%, var(--surface));flex:none">${m.icon}</span>
          <div class="grow">
            <div class="tiny" style="font-weight:800;color:${m.color};text-transform:uppercase;letter-spacing:.06em">${m.label}${m.day ? ' · ' + U.fmtDay(m.day) : ''}${m.epreuve ? ' · ' + m.epreuve : ''}</div>
            <h1 class="mb0">${m.title}</h1>
            <div class="muted">${m.subtitle || ''}</div>
          </div>
          ${App.ui.ring(mast, 70, 7, m.color)}
        </div>
        ${m.intro ? `<p class="mt2 mb0">${m.intro}</p>` : ''}
        <div class="row mt2">
          ${nextL ? `<a class="btn primary" href="#/cours/${m.id}/${nextL.idx}">${done ? '▶ Continuer' : '▶ Commencer'} : ${nextL.title}</a>` : ''}
          ${m.pretest.length && !pre ? `<a class="btn accent" href="#/pretest/${m.id}">🧪 Pré-test (${m.pretest.length} questions)</a>` : ''}
          <a class="btn" href="#/quiz/${m.id}">✅ QCM</a>
        </div>
        <div class="small muted mt1">${done}/${m.lessons.length} leçons · ${cc.mastered}/${cc.total} cartes maîtrisées${pre ? ` · pré-test : ${pre.score}/${pre.total}` : ''}</div>
      </div>
      ${m.pretest.length && !pre ? App.md.tip('Le <b>pré-test</b> se fait <b>avant</b> de lire le cours : essayer de répondre (même en se trompant) prépare le cerveau à retenir la bonne réponse. C\'est prouvé, et ça ne compte pas dans ta note.', 'Pourquoi un pré-test ?') : ''}
      <div class="tabs mt2">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${body}`);
    U.$$('.tabs button').forEach((b) => b.addEventListener('click', () => R.go(`/cours/${m.id}?tab=${b.dataset.tab}`)));
  }, { keepScroll: false });

  function hintOf(ph) {
    const words = ph.replace(/<[^>]+>/g, '').split(/\s+/);
    return '« ' + words.slice(0, 4).join(' ') + ' … »';
  }

  function genCard(g) {
    const s = App.store.state.genStats[g.id];
    return `<a class="card hover" href="#/gen/${g.id}" style="color:inherit;text-decoration:none"><div class="row nowrap"><span style="font-size:1.6rem">${g.icon}</span><div class="grow"><b>${g.title}</b><div class="small muted">${g.desc}</div>${s ? `<div class="tiny mt1 ok-t">${s.ok} ✓ / ${s.answered}</div>` : ''}</div></div></a>`;
  }
  App.course = { genCard };

  /* ---------- Page d'une leçon ---------- */
  R.add('/cours/:mod/:idx', (p) => {
    const m = App.content.mod(p.mod);
    if (!m) return R.go('/cours');
    const i = +p.idx;
    const l = m.lessons[i];
    if (!l) return R.go('/cours/' + m.id);
    App.layout.setTitle(l.title);
    const prev = m.lessons[i - 1], next = m.lessons[i + 1];
    const isDone = App.progress.lessonDone(l.id);
    const note = App.store.state.notes[l.id] || '';
    App.store.state.settings.last = { mod: m.id, idx: i, t: Date.now() };
    App.store.save();
    const doneN = m.lessons.filter((x) => App.progress.lessonDone(x.id)).length;
    const outline = `<aside class="lesson-aside"><div class="la-card">
        <a class="la-head" href="#/cours/${m.id}"><span class="m-ico" style="background:color-mix(in srgb, ${m.color} 16%, var(--surface))">${m.icon}</span><span><span class="la-num" style="color:${m.color}">${m.label}</span><span class="la-title">${m.short || m.title}</span></span></a>
        ${App.ui.bar(doneN / m.lessons.length, 'ok thin')}<div class="tiny muted mt1">${doneN}/${m.lessons.length} leçons comprises</div>
        <ol class="la-list">${m.lessons.map((x) => `<li><a href="#/cours/${m.id}/${x.idx}" class="${x.idx === i ? 'on' : ''} ${App.progress.lessonDone(x.id) ? 'done' : ''}"><span class="n">${App.progress.lessonDone(x.id) ? '✓' : x.idx + 1}</span><span class="t">${x.title}</span></a></li>`).join('')}</ol>
        <div class="la-actions"><a class="btn sm soft" href="#/quiz/${m.id}">✅ QCM</a><a class="btn sm" href="#/cartes?go=1&mod=${m.id}">🃏 Cartes</a></div>
      </div></aside>`;
    const v = App.ui.mount(`
      <div class="read-progress" style="--mc:${m.color}"><i></i></div>
      <div class="lesson-layout" style="--mc:${m.color}">
      <div class="lesson-main">
        ${App.ui.crumbs([['Cours', '#/cours'], [m.short || m.title, '#/cours/' + m.id], ['Leçon ' + (i + 1)]])}
        <div class="row between" style="align-items:flex-start">
          <div class="grow"><div class="lesson-kicker" style="color:${m.color}">${m.icon} ${m.label} · leçon ${i + 1}/${m.lessons.length} · ${l.min || 5} min</div><h1 class="mt1">${l.title}</h1></div>
          ${isDone ? '<span class="chip ok">✓ comprise</span>' : ''}
        </div>
        ${App.ui.bar((i + 1) / m.lessons.length)}
        ${l.essentiel ? `<div class="essentiel mt2"><div class="tag">⚡ L'essentiel en 30 secondes</div>${l.essentiel}</div>` : '<div class="mt2"></div>'}
        <article class="prose">${l.html}</article>
        ${l.check.length ? `<h2 class="mt3">🧩 Vérifie ta compréhension</h2><p class="muted small">Réponds sans relire : c'est l'effort de rappel qui fixe la mémoire. Les erreurs vont dans ton carnet.</p><div class="stack" id="checks"></div>` : ''}
        <details class="card mt3"><summary style="cursor:pointer;font-weight:700">📝 Mes notes sur cette leçon</summary><textarea class="input mt1" rows="3" id="note" placeholder="Reformule avec tes mots (technique Feynman) : si tu sais l'expliquer simplement, tu l'as compris.">${U.esc(note)}</textarea></details>
        <div class="lesson-dock">
          ${prev ? `<a class="btn" href="#/cours/${m.id}/${i - 1}" title="${U.esc(prev.title)}">◀<span class="hide-m"> ${U.esc(prev.title)}</span></a>` : `<a class="btn" href="#/cours/${m.id}">◀<span class="hide-m"> Sommaire</span></a>`}
          <button class="btn ${isDone ? 'ghost' : 'ok'}" id="markDone">${isDone ? '✓ Comprise' : '✓ <span class="hide-m">J\'ai compris</span><span class="show-m">Compris</span>'}</button>
          ${next ? `<a class="btn primary" href="#/cours/${m.id}/${i + 1}" id="nextL" title="${U.esc(next.title)}"><span class="hide-m">${U.esc(next.title)} </span><span class="show-m">Suivante </span>▶</a>` : `<a class="btn primary" href="#/quiz/${m.id}">QCM ▶</a>`}
        </div>
      </div>
      ${outline}
      </div>`, { wide: true });
    const rp = v.querySelector('.read-progress > i');
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      rp.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 100) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    App.router.onLeave(() => window.removeEventListener('scroll', onScroll));
    onScroll();
    const cur = v.querySelector('.la-list a.on');
    if (cur && cur.scrollIntoView) { const lst = cur.closest('.la-list'); if (lst) lst.scrollTop = cur.offsetTop - lst.clientHeight / 2; }
    // questions de vérification
    const host = v.querySelector('#checks');
    let answered = 0;
    if (host) {
      l.check.forEach((q) => {
        const api = App.qview.create(q, {
          mode: 'practice',
          onAnswer: (res) => {
            answered++;
            App.progress.record(q, res.ok);
            App.game.addXP(App.quiz.xpFor(q, res, 0), api.el.querySelector('.q-text'));
            App.fx.sound(res.ok ? 'ok' : 'ko');
            if (answered === l.check.length) complete();
          },
          onNext: () => {
            const nx = api.el.nextElementSibling;
            if (nx) nx.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else { const b = document.getElementById('nextL') || document.getElementById('markDone'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          }
        });
        host.appendChild(api.el);
      });
    }
    function complete() {
      if (App.progress.markLesson(l.id)) {
        App.game.addXP(25, document.getElementById('markDone'));
        App.ui.toast('📖', '<b>Leçon terminée !</b><div class="muted small">+25 XP</div>');
        App.fx.sound('level');
        const b = document.getElementById('markDone');
        if (b) { b.className = 'btn ghost'; b.textContent = '✓ Comprise'; }
      }
    }
    v.querySelector('#markDone').addEventListener('click', complete);
    v.querySelector('#note').addEventListener('input', U.debounce((e) => { App.store.state.notes[l.id] = e.target.value; App.store.save(); }, 400));
    App.ui.keys({ ArrowRight: () => next && R.go(`/cours/${m.id}/${i + 1}`), ArrowLeft: () => prev && R.go(`/cours/${m.id}/${i - 1}`) });
  });
})();
