/* Widgets interactifs insérables dans les leçons : registre + pas-à-pas + diagrammes de séquence animés. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const reg = {};

  const widgets = (App.widgets = {
    register(name, fn) { reg[name] = fn; },
    hydrate(root) {
      U.$$('[data-w]', root).forEach((el) => {
        if (el._w) return;
        el._w = true;
        const fn = reg[el.dataset.w];
        if (!fn) return;
        try { fn(el, el.dataset); } catch (e) { console.error('widget', el.dataset.w, e); }
      });
    },
    /* Insère un widget dans un conteneur (pour les pages Labs) */
    render(name, data) {
      const el = document.createElement('div');
      el.dataset.w = name;
      Object.entries(data || {}).forEach(([k, v]) => (el.dataset[k] = typeof v === 'string' ? v : JSON.stringify(v)));
      return el;
    }
  });

  /* ---------- Pas-à-pas ---------- */
  widgets.register('stepper', (el, d) => {
    const steps = U.$$(':scope > .st-step', el);
    if (!steps.length) return;
    el.classList.add('widget', 'stepper');
    const head = U.el(`<div class="w-h">👣 ${U.esc(d.title || 'Pas à pas')}</div>`);
    el.prepend(head);
    const nav = U.el(`<div class="st-nav"><button class="btn sm" data-p>◀</button><div class="dots">${steps.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div><span class="small muted" data-c></span><button class="btn sm primary" data-n>Suivant ▶</button></div>`);
    el.appendChild(nav);
    let i = 0;
    const go = (k) => {
      i = U.clamp(k, 0, steps.length - 1);
      steps.forEach((s, j) => s.classList.toggle('on', j === i));
      U.$$('.dots i', nav).forEach((dd, j) => dd.classList.toggle('on', j === i));
      nav.querySelector('[data-c]').textContent = `${i + 1}/${steps.length}`;
      nav.querySelector('[data-p]').disabled = i === 0;
      nav.querySelector('[data-n]').textContent = i === steps.length - 1 ? '↺ Recommencer' : 'Suivant ▶';
      App.ui.hydrate(steps[i]);
    };
    nav.querySelector('[data-p]').addEventListener('click', () => go(i - 1));
    nav.querySelector('[data-n]').addEventListener('click', () => go(i === steps.length - 1 ? 0 : i + 1));
    U.$$('.dots i', nav).forEach((dd) => dd.addEventListener('click', () => go(+dd.dataset.i)));
    go(0);
  });

  /* ---------- Diagramme de séquence animé ----------
     data-seq = { title, actors: ['Client','Serveur'], msgs: [{ from:0, to:1, label:'SYN', sub:'seq=100', bc:false, note:'…' }] } */
  widgets.register('seq', (el, d) => {
    let spec;
    try { spec = JSON.parse(d.seq); } catch (e) { spec = App.content.extras.seqs && App.content.extras.seqs[d.seq]; }
    if (!spec) return;
    const n = spec.actors.length;
    el.classList.add('widget');
    const center = (i) => ((i + 0.5) / n) * 100;
    el.innerHTML = `
      <div class="w-h">🎬 ${U.esc(spec.title || 'Échange animé')}</div>
      <div class="seq">
        <div class="actors" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${spec.actors.map((a) => `<div class="actor">${a}</div>`).join('')}</div>
        <div class="lanes">
          ${spec.actors.map((_, i) => `<div class="lifeline" style="left:${center(i)}%"></div>`).join('')}
          ${spec.msgs.map((m, k) => {
            const a = center(m.from), b = center(m.to);
            const left = Math.min(a, b), w = Math.abs(a - b);
            return `<div class="msg" data-k="${k}"><div class="lbl" style="left:${left}%;width:${w}%">${m.label}${m.sub ? `<br><small>${m.sub}</small>` : ''}</div><div class="arrow ${b > a ? 'r' : 'l'} ${m.bc ? 'bc' : ''}" style="left:${left}%;width:${w}%"></div></div>`;
          }).join('')}
        </div>
      </div>
      <div class="seq-note"></div>
      <div class="row mt1"><button class="btn sm" data-reset>↺</button><span class="grow small muted" data-c></span><button class="btn sm soft" data-all>Tout afficher</button><button class="btn sm primary" data-next>Étape suivante ▶</button></div>`;
    const msgs = U.$$('.msg', el);
    const note = el.querySelector('.seq-note');
    let k = 0;
    const upd = () => {
      msgs.forEach((m, j) => m.classList.toggle('on', j < k));
      const last = spec.msgs[k - 1];
      note.innerHTML = k === 0 ? (spec.intro || 'Clique sur « Étape suivante » pour dérouler l\'échange.') : last.note || '';
      el.querySelector('[data-c]').textContent = `${k}/${msgs.length}`;
      el.querySelector('[data-next]').disabled = k >= msgs.length;
    };
    el.querySelector('[data-next]').addEventListener('click', () => { if (k < msgs.length) { k++; App.fx.sound('tick'); upd(); } });
    el.querySelector('[data-reset]').addEventListener('click', () => { k = 0; upd(); });
    el.querySelector('[data-all]').addEventListener('click', () => { k = msgs.length; upd(); note.innerHTML = spec.outro || note.innerHTML; });
    upd();
  });

  /* ---------- Quiz express inline (une question dans le cours) ----------
     data-q = id d'une question enregistrée */
  widgets.register('q', (el, d) => {
    const q = App.content.questions[d.q];
    if (!q) return;
    const api = App.qview.create(q, {
      mode: 'practice',
      onAnswer: (res) => {
        App.progress.record(q, res.ok);
        App.game.addXP(App.quiz.xpFor(q, res, 0), api.el.querySelector('.q-text'));
        App.fx.sound(res.ok ? 'ok' : 'ko');
      },
      onNext: () => {}
    });
    el.appendChild(api.el);
  });
})();
