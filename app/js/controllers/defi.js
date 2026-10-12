/* Défi entre amis : un code (format + graine) génère exactement les mêmes questions chez chacun, sans Internet.
   Après la partie, un « code résultat » (code + score + temps) se partage : l'ami qui le saisit joue
   les mêmes questions et voit la comparaison à la fin. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  const FORMATS = {
    C: { title: 'Calculs express', icon: '🧮', desc: 'Binaire, masques, sous-réseaux, IPv6, ports, chmod, décibels.', n: 12, build(r) {
      const ids = ['bin-d2b', 'bin-b2d', 'mask', 'hosts', 'subnet', 'wildcard', 'v6-compress', 'ports', 'chmod', 'umask', 'db'].filter((id) => App.gen.byId[id]);
      return Array.from({ length: 12 }, (_, i) => App.gen.make(r.pick(ids), r.int(1, 2), (r() * 4294967296) >>> 0, true));
    } },
    R: { title: 'Réseaux & télécoms (E2)', icon: '🌐', desc: 'QCM des séances 1 à 6 + calculs d\'adressage.', n: 15, build(r) {
      const qcm = r.shuffle(['m0', 's1', 's2', 's3', 's4', 's5', 's6'].flatMap((id) => (App.content.mod(id) || { qcm: [] }).qcm)).slice(0, 11);
      const gens = ['subnet', 'mask', 'hosts', 'ports'].filter((id) => App.gen.byId[id]);
      return qcm.concat(Array.from({ length: 4 }, () => App.gen.make(r.pick(gens), r.int(1, 2), (r() * 4294967296) >>> 0)));
    } },
    S: { title: 'Systèmes (E1)', icon: '🖥️', desc: 'Linux, Windows Server, AD, stockage, sauvegardes.', n: 12, build(r) {
      const qcm = r.shuffle(['s7', 's8'].flatMap((id) => (App.content.mod(id) || { qcm: [] }).qcm)).slice(0, 10);
      const gens = ['chmod', 'cron-read', 'raid'].filter((id) => App.gen.byId[id]);
      return qcm.concat(Array.from({ length: 2 }, () => App.gen.make(r.pick(gens), r.int(1, 2), (r() * 4294967296) >>> 0)));
    } },
    T: { title: 'Tout le programme', icon: '🎯', desc: 'Un peu de tout, comme le jour J.', n: 15, build(r) {
      const qcm = r.shuffle(App.content.modules.flatMap((m) => m.qcm)).slice(0, 12);
      const gens = ['subnet', 'chmod', 'bin-d2b', 'ports'].filter((id) => App.gen.byId[id]);
      return qcm.concat(Array.from({ length: 3 }, () => App.gen.make(r.pick(gens), r.int(1, 2), (r() * 4294967296) >>> 0)));
    } }
  };

  const fmtCode = (f, seed) => `MEF-${f}${seed.toString(36).toUpperCase().padStart(6, '0')}`;
  function parse(str) {
    const m = String(str || '').toUpperCase().replace(/\s+/g, '').match(/MEF-?([CRST])([0-9A-Z]{1,7})(?:[.\-_/](\d{1,2})[.\-_/](\d{1,4}))?/);
    if (!m) return null;
    const seed = parseInt(m[2], 36) >>> 0;
    return { f: m[1], seed, code: fmtCode(m[1], seed), vs: m[3] != null ? { score: +m[3], secs: +m[4] } : null };
  }
  const resultCode = (code, score, secs) => `${code}.${score}.${Math.round(secs)}`;

  function questions(f, seed) {
    const qs = FORMATS[f].build(U.rng(seed)).filter(Boolean);
    return qs.map((q) => { const c = Object.assign({}, q); delete c._order; delete c._rorder; return c; });
  }

  function share(text) {
    if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
    copy(text);
  }
  function copy(text) {
    const done = () => App.ui.toast('📋', 'Copié ! Colle-le dans WhatsApp, un SMS ou un e-mail.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { App.ui.toast('⚠️', 'Copie impossible : sélectionne le code à la main.'); }
      ta.remove();
    }
  }
  const shareBtns = (text) => `<div class="row mt1 defi-share">
      <a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">💬 WhatsApp</a>
      <button class="btn" data-copy>📋 Copier le message</button>
      ${navigator.share ? '<button class="btn" data-share>📤 Partager…</button>' : ''}</div>`;
  function bindShare(root, text) {
    const c = root.querySelector('[data-copy]'); if (c) c.addEventListener('click', () => copy(text));
    const s = root.querySelector('[data-share]'); if (s) s.addEventListener('click', () => share(text));
  }

  /* ---------- Accueil du défi ---------- */
  R.add('/defi', (p, query) => {
    App.layout.setTitle('Défi entre amis');
    const st = App.store.state;
    const hist = (st.defis || []).slice().reverse().slice(0, 8);
    const v = App.ui.mount(`
      <div class="page-head"><h1>⚔️ Défi entre amis</h1><div class="sub">Lance un défi : un <b>code</b> génère exactement les mêmes questions chez ton ami, même sans Internet. Le meilleur score gagne (à égalité, le plus rapide).</div></div>
      <div class="grid c2">
        <div class="card"><h3>🆕 Créer un défi</h3><p class="small muted">Choisis le type de questions :</p>
          <div class="defi-formats">${Object.entries(FORMATS).map(([k, f]) => `<button class="defi-f" data-f="${k}"><span class="e">${f.icon}</span><span><b>${f.title}</b><small>${f.n} questions · ${f.desc}</small></span></button>`).join('')}</div>
        </div>
        <div class="card"><h3>🎟️ Relever un défi</h3><p class="small muted">Saisis le code reçu (par exemple <code>MEF-R4K9Z2Q</code> ou un code résultat <code>MEF-R4K9Z2Q.12.151</code>).</p>
          <input class="input mono" id="dCode" placeholder="MEF-…" autocomplete="off" spellcheck="false" value="${U.esc(query.code || '')}">
          <button class="btn primary block mt1" id="dGo">⚔️ Relever le défi</button>
          <div class="tiny muted mt1">Astuce : colle tout le message reçu, le code est retrouvé automatiquement.</div>
        </div>
      </div>
      ${hist.length ? `<h2 class="mt3">📜 Mes derniers défis</h2>${App.md.table(['Date', 'Défi', 'Mon score', 'Adversaire', 'Résultat'], hist.map((h) => {
        const f = FORMATS[h.f] || { icon: '', title: '' };
        const vs = h.vs ? `${h.vs.score}/${h.n} · ${U.fmtDuration(h.vs.secs)}` : '—';
        const res = !h.vs ? '<span class="chip">créé</span>' : h.win > 0 ? '<span class="chip ok">🏆 gagné</span>' : h.win < 0 ? '<span class="chip ko">perdu</span>' : '<span class="chip warn">égalité</span>';
        return [new Date(h.at).toLocaleDateString('fr-FR'), `${f.icon} <span class="mono">${h.code}</span>`, `<b>${h.score}/${h.n}</b> · ${U.fmtDuration(h.secs)}`, vs, res];
      }))}` : ''}`, { help: 'defi' });
    U.$$('[data-f]', v).forEach((b) => b.addEventListener('click', () => {
      const seed = (Math.random() * 2176782336) >>> 0; // 6 caractères en base 36
      R.go('/defi/jouer?code=' + fmtCode(b.dataset.f, seed));
    }));
    const go = () => {
      const c = parse(v.querySelector('#dCode').value);
      if (!c) { App.ui.toast('⚠️', 'Code introuvable. Il commence par <b>MEF-</b>.'); return; }
      R.go('/defi/jouer?code=' + c.code + (c.vs ? `.${c.vs.score}.${c.vs.secs}` : ''));
    };
    v.querySelector('#dGo').addEventListener('click', go);
    v.querySelector('#dCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });

  /* ---------- Avant de jouer ---------- */
  R.add('/defi/jouer', (p, query) => {
    const c = parse(query.code);
    if (!c) return R.go('/defi');
    const f = FORMATS[c.f];
    App.layout.setTitle('Défi ' + c.code);
    const nm = App.backup.name();
    const invite = `⚔️ ${nm || 'Un ami'} te lance un défi « ${f.title} » sur l'appli Révision MEF !\nCode : ${c.code}\nOuvre l'application → Défi entre amis → « Relever un défi » et saisis ce code. Mêmes questions pour nous deux. Bonne chance ! 🍀`;
    const v = App.ui.mount(`
      ${App.ui.crumbs([['Défi entre amis', '#/defi'], [c.code]])}
      <div class="card pad-lg center">
        <div style="font-size:3rem">${f.icon}</div>
        <h1 class="mb0">${f.title}</h1>
        <p class="muted">${f.n} questions · le meilleur score gagne, à égalité le plus rapide.</p>
        <div class="defi-code mono">${c.code}</div>
        ${c.vs ? `<div class="co key mt2" style="text-align:left"><div class="co-h">🎯 Score à battre</div><b>${c.vs.score}/${f.n}</b> en <b>${U.fmtDuration(c.vs.secs)}</b>. À toi de jouer !</div>` : `<p class="small muted mt2">Envoie ce code à ton ami <b>maintenant</b> ou après ta partie (avec ton score).</p>${shareBtns(invite)}`}
        <button class="btn accent lg mt3" id="play">⚔️ Jouer maintenant</button>
      </div>`, { narrow: true });
    if (!c.vs) bindShare(v, invite);
    v.querySelector('#play').addEventListener('click', () => {
      const qs = questions(c.f, c.seed);
      App.runner.start({
        title: `⚔️ ${f.title}`,
        crumbs: [['Défi entre amis', '#/defi'], [c.code]],
        questions: qs,
        backHref: '#/defi',
        help: 'defi',
        onDone: (s) => result(c, f, s)
      });
    });
  });

  /* ---------- Résultat ---------- */
  function result(c, f, s) {
    const st = App.store.state;
    const secs = Math.round(s.secs);
    const n = s.n;
    let win = 0;
    if (c.vs) win = s.ok > c.vs.score ? 1 : s.ok < c.vs.score ? -1 : secs < c.vs.secs ? 1 : secs > c.vs.secs ? -1 : 0;
    st.defis = st.defis || [];
    st.defis.push({ code: c.code, f: c.f, score: s.ok, n, secs, at: Date.now(), vs: c.vs, win });
    if (win > 0) App.game.award('defi');
    App.store.save();
    const rc = resultCode(c.code, s.ok, secs);
    const nm = App.backup.name();
    const msg = c.vs
      ? `⚔️ Défi « ${f.title} » relevé : ${s.ok}/${n} en ${U.fmtDuration(secs)} (toi : ${c.vs.score}/${n} en ${U.fmtDuration(c.vs.secs)}). ${win > 0 ? 'J\'ai gagné 😎' : win < 0 ? 'Bien joué, revanche ?' : 'Égalité parfaite !'}\nRevanche avec le code : ${rc}`
      : `⚔️ ${nm || 'Ton ami'} a fait ${s.ok}/${n} en ${U.fmtDuration(secs)} au défi « ${f.title} » sur l'appli Révision MEF. Peux-tu faire mieux ?\nCode : ${rc}\n(Application → Défi entre amis → « Relever un défi ».) 🍀`;
    if (win > 0 || (!c.vs && s.ok / n >= 0.8)) App.fx.confetti(1);
    const v = App.ui.mount(`
      ${App.ui.crumbs([['Défi entre amis', '#/defi'], ['Résultat']])}
      <div class="card pad-lg center">
        <div style="font-size:3.2rem">${c.vs ? (win > 0 ? '🏆' : win < 0 ? '💪' : '🤝') : '⚔️'}</div>
        <h1 class="mb0">${c.vs ? (win > 0 ? 'Victoire !' : win < 0 ? 'Défaite… de peu ?' : 'Égalité !') : `${s.ok} / ${n}`}</h1>
        ${c.vs ? `<div class="defi-vs mt2"><div><small>Toi${nm ? ' (' + nm + ')' : ''}</small><b>${s.ok}/${n}</b><span>${U.fmtDuration(secs)}</span></div><div class="vs">VS</div><div><small>Ton ami</small><b>${c.vs.score}/${n}</b><span>${U.fmtDuration(c.vs.secs)}</span></div></div>`
          : `<p class="muted">en ${U.fmtDuration(secs)} · +${s.xp} XP</p>`}
        <h3 class="mt3">📨 Envoie ton résultat</h3>
        <div class="defi-code mono">${rc}</div>
        <p class="small muted">Ce code contient ton score et ton temps : ton ami jouera les mêmes questions et verra qui a gagné.</p>
        ${shareBtns(msg)}
        <div class="row mt3" style="justify-content:center"><a class="btn" href="#/defi">⚔️ Autre défi</a>${s.results.some((r) => !r.ok) ? '<a class="btn" href="#/erreurs">🩹 Mes erreurs</a>' : ''}</div>
      </div>`, { narrow: true });
    bindShare(v, msg);
  }

  App.help.TEXTS.defi = { t: '⚔️ Défi entre amis', h: '<ol><li><b>Crée un défi</b> (calculs, réseaux, systèmes ou tout le programme) : un code <code>MEF-…</code> est généré.</li><li>Joue, puis <b>envoie ton code résultat</b> (WhatsApp, SMS, copier).</li><li>Ton ami saisit le code dans « Relever un défi » : <b>mêmes questions</b>, et la comparaison s\'affiche à la fin.</li></ol><p class="small muted">Aucune connexion nécessaire pour jouer : seul l\'envoi du message passe par ton téléphone. Utilisez la même version de l\'application pour avoir exactement les mêmes questions.</p>' };
})();
