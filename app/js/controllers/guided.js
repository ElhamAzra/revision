/* Contrôleur : parcours guidés.
   - App.path : composant « parcours » (étapes, progression, bouton « Continuer », passer une étape) ;
   - /seance : séance guidée du jour (rappel → pré-test → leçons → cartes → QCM → exercice → erreurs → bilan),
     qui reproduit le rythme d'une séance de 2 h du plan, sans avoir à choisir quoi faire. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  /* ---------- Composant parcours ---------- */
  const path = (App.path = {
    /* steps : [{ key, ico, title, desc, min, href?, inline?, done: bool, info?, optional? }] */
    html(steps, opts) {
      const cur = steps.findIndex((s) => !s.done);
      return `<ol class="path">${steps.map((s, i) => {
        const state = s.done ? 'done' : i === cur ? 'cur' : 'todo';
        const act = state === 'cur' ? `<div class="path-act">
            ${s.href ? `<a class="btn primary" href="${s.href}">▶ ${s.cta || 'Commencer'}</a>` : ''}
            ${s.inline ? `<button class="btn primary" data-inline="${s.key}">${s.cta || 'C\'est fait'}</button>` : ''}
            <button class="btn ghost sm" data-skip="${s.key}">Passer cette étape</button></div>` : '';
        return `<li class="path-step ${state}" data-step="${s.key}">
          <span class="path-dot">${s.done ? '✓' : s.ico}</span>
          <div class="path-body">
            <div class="row between nowrap"><b class="path-t">${s.title}</b>${s.min ? `<span class="chip">${s.min} min</span>` : ''}</div>
            <div class="small muted">${s.desc}</div>
            ${s.info ? `<div class="path-info">${s.info}</div>` : ''}
            ${state === 'cur' && s.body ? `<div class="path-extra">${s.body}</div>` : ''}
            ${act}
            ${s.done && s.href && opts && opts.redo !== false ? `<a class="tiny" href="${s.href}">refaire</a>` : ''}
          </div>
        </li>`;
      }).join('')}</ol>`;
    },
    bind(root, handlers) {
      U.$$('[data-skip]', root).forEach((b) => b.addEventListener('click', () => handlers.skip(b.dataset.skip)));
      U.$$('[data-inline]', root).forEach((b) => b.addEventListener('click', () => handlers.inline(b.dataset.inline)));
    }
  });

  /* ---------- État de la séance guidée ---------- */
  const guided = (App.guided = {
    state() {
      const g = App.store.state.guided;
      return g && g.day === U.dayKey() ? g : null;
    },
    active(modId) {
      const g = guided.state();
      return !!g && (!modId || g.mod === modId) && !g.finished;
    },
    start(modId) {
      const st = App.store.state;
      const t = App.store.today();
      st.guided = { day: U.dayKey(), mod: modId, done: {}, xp0: t.xp, a0: t.answered, c0: t.correct, l0: Object.keys(st.lessons).length, k0: t.cards || 0, t0: Date.now(), finished: false };
      App.store.save();
      return st.guided;
    },
    mark(key, modId) {
      const g = guided.state();
      if (!g || (modId && g.mod !== modId)) return;
      g.done[key] = g.done[key] || 'ok';
      App.store.save();
    },
    /* Lien de retour vers le parcours (pour les écrans appelés depuis la séance) */
    backLink() { return '#/seance'; }
  });

  function chooseModule(query) {
    const today = U.dayKey();
    if (query.mod && App.content.mod(query.mod)) return App.content.mod(query.mod);
    const g = guided.state();
    if (g && App.content.mod(g.mod)) return App.content.mod(g.mod);
    return App.content.moduleForDay(today) || App.progress.weakest() || App.content.modules[0];
  }

  function stepsFor(m, g) {
    const st = App.store.state;
    const idx = App.content.modules.indexOf(m);
    const prev = App.content.modules.slice(0, idx).reverse().find((x) => x.phrases && x.phrases.length);
    const lessonsDone = m.lessons.filter((l) => App.progress.lessonDone(l.id)).length;
    const nextL = m.lessons.find((l) => !App.progress.lessonDone(l.id));
    const errs = App.progress.errors(m.id).length;
    const exToday = m.exercises.find((e) => { const s = App.progress.exerciseScore(e.id); return s && U.dayKey(new Date(s.at)) === g.day; });
    const nextEx = m.exercises.find((e) => !App.progress.exerciseScore(e.id)) || m.exercises[0];
    const d = g.done;
    const steps = [];
    if (prev) steps.push({
      key: 'rappel', ico: '🗣️', title: 'Rappel actif', min: 5,
      desc: `Récite de mémoire les 5 phrases clés de « ${U.esc(prev.short || prev.title)} », puis vérifie.`,
      inline: true, cta: '✓ Rappel fait',
      body: `<div class="stack-sm">${prev.phrases.map((ph, i) => `<div class="co ex reveal"><div class="co-h">Phrase ${i + 1}</div><div class="small muted">« ${ph.replace(/<[^>]+>/g, '').split(/\s+/).slice(0, 4).join(' ')} … »</div><div class="mt1"><button class="btn sm soft reveal-btn">Voir la réponse</button></div><div class="reveal-body mt1"><b>${ph}</b></div></div>`).join('')}</div>`,
      done: !!d.rappel
    });
    if (m.pretest.length) steps.push({
      key: 'pretest', ico: '🧪', title: 'Pré-test', min: 3,
      desc: 'Réponds avant de lire : se tromper ici prépare le cerveau à retenir. Ça ne compte pas.',
      href: `#/pretest/${m.id}?g=1`, done: !!d.pretest || !!st.pretest[m.id],
      info: st.pretest[m.id] ? `Score : ${st.pretest[m.id].score}/${st.pretest[m.id].total}` : ''
    });
    steps.push({
      key: 'lecons', ico: '📖', title: 'Leçons', min: Math.min(35, U.sum(m.lessons.filter((l) => !App.progress.lessonDone(l.id)).map((l) => l.min || 5)) || 5),
      desc: 'Lis chaque leçon, réponds aux questions de vérification, puis « J\'ai compris ».',
      href: nextL ? `#/cours/${m.id}/${nextL.idx}` : `#/cours/${m.id}`, cta: nextL ? `Leçon ${nextL.idx + 1} : ${U.esc(nextL.title)}` : 'Revoir le cours',
      info: `${lessonsDone}/${m.lessons.length} leçons comprises ${App.ui.bar(lessonsDone / m.lessons.length, 'ok thin')}`,
      done: !!d.lecons || lessonsDone === m.lessons.length
    });
    if (m.cards.length) steps.push({
      key: 'cartes', ico: '🃏', title: 'Cartes mémoire', min: 8,
      desc: 'Réponds à voix haute avant de retourner la carte, puis note-toi honnêtement.',
      href: `#/cartes?go=1&mod=${m.id}&g=1`, done: !!d.cartes
    });
    if (m.qcm.length) steps.push({
      key: 'qcm', ico: '✅', title: 'QCM de la séance', min: 10,
      desc: `${Math.min(12, m.qcm.length)} questions, en priorité celles jamais vues ou ratées.`,
      href: `#/quiz/${m.id}?n=12&g=1`, done: !!d.qcm
    });
    if (m.exercises.length) steps.push({
      key: 'exo', ico: '✍️', title: 'Exercice type concours', min: nextEx.min || 10, optional: true,
      desc: `Chronométré, sur papier, puis corrige-toi avec le barème : « ${U.esc(nextEx.title)} ».`,
      href: `#/exo/${nextEx.id}`, done: !!d.exo || !!exToday
    });
    steps.push({
      key: 'erreurs', ico: '🩹', title: 'Carnet d\'erreurs', min: 5,
      desc: errs ? `${errs} erreur(s) de cette séance à retravailler : 2 bonnes réponses d'affilée et elles disparaissent.` : 'Aucune erreur en attente pour cette séance 👌',
      href: errs ? `#/erreurs?go=1&mod=${m.id}&g=1` : null, inline: !errs, cta: errs ? 'Rejouer mes erreurs' : '✓ Continuer',
      done: !!d.erreurs
    });
    return steps;
  }

  R.add('/seance', (p, query) => {
    const m = chooseModule(query);
    let g = guided.state();
    if (!g || g.mod !== m.id) g = guided.start(m.id);
    App.layout.setTitle('Séance guidée');
    const steps = stepsFor(m, g);
    const doneN = steps.filter((s) => s.done).length;
    const allDone = doneN === steps.length;
    const leftMin = U.sum(steps.filter((s) => !s.done).map((s) => s.min || 0));
    const t = App.store.today();
    const nm = App.backup.name();
    const others = App.content.modules.filter((x) => x.lessons.length);

    if (allDone && !g.finished) {
      g.finished = true;
      App.game.award('guided');
      App.game.addXP(50, false);
      App.store.save();
      setTimeout(() => { App.fx.sound('level'); App.fx.confetti(1.2); }, 200);
    }
    const ans = t.answered - (g.a0 || 0), cor = t.correct - (g.c0 || 0);
    const bilan = allDone ? `
      <div class="card pad-lg center mt2 guided-end">
        <div class="big-emoji">🏁</div>
        <h2 class="mt1">Séance terminée${nm ? ', bravo ' + nm : ''}&nbsp;!</h2>
        <div class="grid k4s mt2" style="max-width:640px;margin:1rem auto 0">
          <div class="kpi" style="justify-content:center"><div><div class="v pri-t">+${Math.max(0, t.xp - (g.xp0 || 0))}</div><div class="l">XP</div></div></div>
          <div class="kpi" style="justify-content:center"><div><div class="v">${Math.max(0, Object.keys(App.store.state.lessons).length - (g.l0 || 0))}</div><div class="l">leçons</div></div></div>
          <div class="kpi" style="justify-content:center"><div><div class="v">${ans > 0 ? Math.round((cor / ans) * 100) + ' %' : '—'}</div><div class="l">réussite</div></div></div>
          <div class="kpi" style="justify-content:center"><div><div class="v">${U.fmtDuration((Date.now() - g.t0) / 1000).replace(/:\d\d$/, ' min').replace(/^(\d+):(\d+) min$/, '$1 h $2')}</div><div class="l">durée</div></div></div>
        </div>
        <p class="muted mt2">Ce soir ou demain matin : relis les « 5 phrases » de cette séance en 5 minutes. C'est le rappel le plus rentable.</p>
        <div class="row mt2" style="justify-content:center"><a class="btn primary" href="#/cours/${m.id}?tab=phrases">🗣️ Les 5 phrases</a><a class="btn" href="#/preparation">📈 Mon indice de préparation</a><a class="btn" href="#/">Accueil</a></div>
      </div>` : '';

    const v = App.ui.mount(`
      <div class="guided-hero" style="--mc:${m.color}">
        <div class="row nowrap" style="align-items:flex-start">
          <span class="m-ico gh-ico">${m.icon}</span>
          <div class="grow">
            <div class="lesson-kicker" style="color:${m.color}">🧭 Séance guidée · ${m.label}${m.day ? ' · ' + U.fmtDay(m.day) : ''}</div>
            <h1 class="mb0 mt1">${m.title}</h1>
            <div class="muted small mt1">${allDone ? 'Toutes les étapes sont faites.' : `${doneN}/${steps.length} étapes · environ ${leftMin} min restantes`} · suit le rythme d'une séance du plan.</div>
          </div>
          ${App.ui.ring(doneN / steps.length, 64, 7, m.color, `${doneN}/${steps.length}`)}
        </div>
        <details class="gh-change mt2"><summary>Changer de séance</summary><div class="row mt1">${others.map((x) => `<a class="btn sm ${x.id === m.id ? 'soft' : ''}" href="#/seance?mod=${x.id}">${x.icon} ${x.short || x.title}</a>`).join('')}</div></details>
      </div>
      ${bilan}
      <div class="card mt2">${path.html(steps)}</div>
      ${App.md.tip('Tu peux quitter à tout moment : la séance reprend où tu t\'es arrêté (aujourd\'hui). Chaque étape terminée est cochée automatiquement.', 'Comment ça marche ?')}`, { narrow: true, help: 'seance' });
    App.ui.hydrate(v);
    path.bind(v, {
      skip: (k) => { g.done[k] = 'skip'; App.store.save(); R.resolve(); },
      inline: (k) => { g.done[k] = 'ok'; App.store.save(); App.game.addXP(5, false); R.resolve(); }
    });
    const cur = v.querySelector('.path-step.cur');
    if (cur && doneN > 0) setTimeout(() => cur.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
  });

  /* ---------- Veille du concours : 30 minutes ciblées ---------- */
  const veille = (App.veille = {
    state() {
      const st = App.store.state;
      if (!st.veille || st.veille.day !== U.dayKey()) st.veille = { day: U.dayKey(), done: {}, t0: Date.now() };
      return st.veille;
    },
    mark(key) { veille.state().done[key] = veille.state().done[key] || 'ok'; App.store.save(); }
  });

  const CHECK = ['Convocation et pièce d\'identité', 'Deux stylos (bleu/noir), crayon, gomme, règle', 'Montre (le téléphone sera interdit)', 'Eau et un en-cas', 'Itinéraire et heure d\'arrivée (30 min d\'avance)', 'Réveil réglé, 7 à 8 h de sommeil'];

  R.add('/veille', () => {
    App.layout.setTitle('Veille du concours');
    const v0 = veille.state();
    const d = v0.done;
    const errs = App.progress.errors().length;
    const ex = App.store.state.settings.examDate;
    const dl = U.daysBetween(U.dayKey(), ex);
    const nm = App.backup.name();
    const steps = [
      { key: 'fiche', ico: '⚡', title: 'Relire la fiche dernière heure', min: 8, desc: 'Tableaux de masques, ports, AD/OSPF, commandes Linux, RAID, sauvegardes… tout l\'essentiel sur une page.', href: '#/fiche?v=1', cta: 'Ouvrir la fiche', done: !!d.fiche },
      { key: 'erreurs', ico: '🩹', title: 'Tes dernières erreurs', min: 7, desc: errs ? `Rejoue jusqu'à 10 de tes ${errs} erreurs : ce sont tes pièges personnels.` : 'Aucune erreur en attente 👌', href: errs ? '#/erreurs?go=1&v=1' : null, inline: !errs, cta: errs ? 'Rejouer mes erreurs' : '✓ Continuer', done: !!d.erreurs },
      { key: 'cartes', ico: '🃏', title: 'Les 20 cartes les plus fragiles', min: 7, desc: 'Les cartes que tu oublies le plus (ou pas encore vues dans tes modules faibles).', href: '#/cartes?go=1&fragile=1', cta: 'Lancer les 20 cartes', done: !!d.cartes },
      { key: 'exam', ico: '📝', title: 'Mini-examen de confiance', min: 8, desc: '12 questions des deux épreuves, corrigées tout de suite. Objectif : finir sur une bonne note.', href: '#/veille/exam', cta: 'Commencer', done: !!d.exam },
      { key: 'pret', ico: '🎒', title: 'Réflexes du jour J et sac prêt', min: 3, desc: 'Les réflexes pour l\'épreuve et la check-list du matin.', inline: true, cta: '✓ Je suis prêt' + (nm ? '' : '(e)'),
        body: `${App.content.extras.reflexes ? `<ol class="steps">${App.content.extras.reflexes.map((r) => `<li>${r}</li>`).join('')}</ol>` : ''}<div class="checklist">${CHECK.map((c, i) => `<label><input type="checkbox" data-ck="${i}"> ${c}</label>`).join('')}</div>`,
        done: !!d.pret }
    ];
    const doneN = steps.filter((x) => x.done).length;
    const all = doneN === steps.length;
    if (all && !v0.finished) { v0.finished = true; App.game.addXP(40, false); App.store.save(); setTimeout(() => { App.fx.sound('level'); App.fx.confetti(1.4); }, 200); }
    const v = App.ui.mount(`
      <section class="veille-hero">
        <div class="vh-moon">🌙</div>
        <div class="grow">
          <div class="lesson-kicker" style="color:#c4b5fd">Veille du concours${dl >= 0 ? ` · ${dl === 0 ? 'jour J' : dl === 1 ? 'demain' : 'J-' + dl}` : ''}</div>
          <h1 class="mb0 mt1" style="color:#fff">30 minutes pour tout consolider</h1>
          <p class="mb0 mt1" style="opacity:.88">Rien de nouveau ce soir : on relit, on corrige ses erreurs, on se rassure… et on va dormir.</p>
        </div>
        ${App.ui.ring(doneN / steps.length, 70, 7, '#c4b5fd', `${doneN}/${steps.length}`).replace('ring-bg', 'ring-bg" style="stroke:rgba(255,255,255,.18)').replace('class="ring-label"', 'class="ring-label" style="color:#fff"')}
      </section>
      ${all ? `<section class="luck mt2"><div class="luck-clover">🍀</div><div><div class="luck-t">Bonne chance pour le concours${nm ? ', ' + nm : ''}&nbsp;!</div><p class="mb0">Tu as fait le travail. Ferme l'application, prépare tes affaires et dors bien. Demain : lis tout le sujet, commence par ce que tu maîtrises, garde 10 minutes pour relire. 💪</p></div></section>` : ''}
      <div class="card mt2">${path.html(steps)}</div>`, { narrow: true });
    App.ui.hydrate(v);
    path.bind(v, {
      skip: (k) => { v0.done[k] = 'skip'; App.store.save(); R.resolve(); },
      inline: (k) => { v0.done[k] = 'ok'; App.store.save(); R.resolve(); }
    });
  });

  R.add('/veille/exam', () => {
    const pick = (ids, n) => U.shuffle(ids.flatMap((id) => (App.content.mod(id) || { qcm: [] }).qcm)).slice(0, n);
    const e2 = pick(['s1', 's2', 's3', 's4', 's5', 's6'], 5);
    const gens = App.gen.list.filter((g) => ['s1', 'm0'].includes(g.mod));
    for (let i = 0; i < 2 && gens.length; i++) e2.push(App.gen.make(U.pick(gens).id, 1));
    const e1 = pick(['s7', 's8'], 5);
    App.runner.start({
      title: '📝 Mini-examen de confiance',
      sub: '12 questions des deux épreuves. Corrigé tout de suite : chaque erreur est une chance de la corriger ce soir plutôt que demain.',
      crumbs: [['Veille', '#/veille'], ['Mini-examen']],
      questions: U.shuffle(e2.concat(e1)),
      backHref: '#/veille',
      onFinish: () => veille.mark('exam'),
      nextHref: '#/veille', nextLabel: '🌙 Suite de la veille ▶'
    });
  });
})();
