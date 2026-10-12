/* Vue : lecture à voix haute (synthèse vocale du navigateur, hors ligne sur la plupart des appareils).
   Lit une page bloc par bloc (titres, paragraphes, listes, encadrés), surligne le passage en cours,
   avec un lecteur flottant : pause / reprise, passage suivant, vitesse, arrêt. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const synth = window.speechSynthesis;
  const SUPPORTED = !!(synth && window.SpeechSynthesisUtterance);

  let queue = [], idx = 0, playing = false, paused = false, keepAlive = null, bar = null, curEl = null, token = 0;

  /* Texte « prononçable » : symboles du cours lus en français */
  function speakable(t) {
    return String(t)
      .replace(/\s+/g, ' ')
      .replace(/(\d)\s*\/\s*(\d)/g, '$1 sur $2')
      .replace(/\/(\d{1,3})\b/g, ' barre oblique $1')
      .replace(/→|⇒|->/g, ', donne, ')
      .replace(/←/g, ', vient de, ')
      .replace(/↔/g, ' et réciproquement ')
      .replace(/≤/g, ' inférieur ou égal à ').replace(/≥/g, ' supérieur ou égal à ')
      .replace(/≠/g, ' différent de ').replace(/≈/g, ' environ ')
      .replace(/×/g, ' fois ').replace(/÷/g, ' divisé par ').replace(/−/g, ' moins ')
      .replace(/\s=\s/g, ' égale ').replace(/·/g, ', ')
      .replace(/\be\.g\./gi, 'par exemple').replace(/\bcf\./gi, 'voir')
      .replace(/\s\+\s/g, ' plus ')
      .replace(/[«»"]/g, '')
      .replace(/[\u2600-\u27BF\uFE0F]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]/g, '')
      .trim();
  }

  function textOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('button, .tts-skip, .help-btn, script, style').forEach((x) => x.remove());
    c.querySelectorAll('sup').forEach((s) => { const v = s.textContent.trim(); s.textContent = /^\d+$/.test(v) ? ' puissance ' + v + ' ' : v; });
    c.querySelectorAll('sub').forEach((s) => { s.textContent = ' indice ' + s.textContent + ' '; });
    c.querySelectorAll('.bits').forEach((s) => { s.textContent = ' ' + s.textContent.replace(/\s+/g, '').replace(/\./g, ' point ') + ' '; });
    c.querySelectorAll('.frac').forEach((s) => { const sp = s.querySelectorAll('span'); if (sp.length === 2) s.textContent = ` ${sp[0].textContent} sur ${sp[1].textContent} `; });
    return speakable(c.textContent);
  }

  /* Découpe en phrases de taille raisonnable (contourne la coupure des longues lectures sur Chrome) */
  function chunks(text) {
    const out = [];
    (text.match(/[^.!?;:]+[.!?;:]*\s*/g) || [text]).map((x) => x.trim()).forEach((s) => {
      if (!s) return;
      if (out.length && (out[out.length - 1] + ' ' + s).length < 200) out[out.length - 1] += ' ' + s;
      else out.push(s);
    });
    return out;
  }

  /* Blocs lisibles d'une zone de page, dans l'ordre */
  function blocksOf(root) {
    const sel = 'h1, h2, h3, h4, p, li, .f, tr, .essentiel .tag, .co-h, .lead';
    const all = U.$$(sel, root).filter((el) => {
      if (el.closest('.q-card, .widget, pre, .tts-bar, .lesson-dock, .crumbs, .reveal-body:not(.tts-force), details:not([open]) > :not(summary), .lesson-aside, .help-btn, .coach')) return false;
      if (el.parentElement && el.parentElement.closest(sel)) return false; // pas de double lecture
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return all.map((el) => ({ el, text: textOf(el) })).filter((b) => b.text.length > 1);
  }

  function voice() {
    const vs = synth.getVoices() || [];
    return vs.find((v) => /^fr[-_]FR/i.test(v.lang) && v.localService) || vs.find((v) => /^fr[-_]FR/i.test(v.lang)) || vs.find((v) => /^fr/i.test(v.lang)) || null;
  }

  function rate() { return App.store.state.settings.ttsRate || 1; }

  function highlight(el) {
    if (curEl) curEl.classList.remove('tts-on');
    curEl = el || null;
    if (curEl) {
      curEl.classList.add('tts-on');
      const r = curEl.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 140) curEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function speakNext() {
    if (!playing) return;
    if (idx >= queue.length) { tts.stop(); App.ui.toast('🔊', 'Lecture terminée.'); return; }
    const item = queue[idx];
    highlight(item.el);
    const parts = chunks(item.text);
    const my = ++token;
    let k = 0;
    const one = () => {
      if (my !== token || !playing) return;
      if (k >= parts.length) { idx++; speakNext(); return; }
      const u = new SpeechSynthesisUtterance(parts[k++]);
      u.lang = 'fr-FR';
      const v = voice();
      if (v) u.voice = v;
      u.rate = rate();
      u.onend = () => { if (my === token) one(); };
      u.onerror = (e) => { if (my === token && e.error !== 'interrupted' && e.error !== 'canceled') { idx++; speakNext(); } };
      synth.speak(u);
    };
    one();
    drawBar();
  }

  function drawBar() {
    if (!bar) {
      bar = U.el(`<div class="tts-bar" role="region" aria-label="Lecture audio"></div>`);
      document.body.appendChild(bar);
    }
    const r = rate();
    bar.innerHTML = `<span class="tts-ico">🔊</span>
      <div class="tts-info"><b>${paused ? 'En pause' : 'Lecture'}</b><small>${Math.min(idx + 1, queue.length)} / ${queue.length}</small></div>
      <button class="tts-b" data-t="toggle" title="${paused ? 'Reprendre' : 'Pause'}">${paused ? '▶' : '⏸'}</button>
      <button class="tts-b" data-t="prev" title="Passage précédent">⏮</button>
      <button class="tts-b" data-t="next" title="Passage suivant">⏭</button>
      <button class="tts-b tts-rate" data-t="rate" title="Vitesse">${String(r).replace('.', ',')}×</button>
      <button class="tts-b" data-t="stop" title="Arrêter">⏹</button>`;
    bar.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => tts[b.dataset.t]()));
  }

  const tts = (App.tts = {
    supported: SUPPORTED,
    /* Lit une liste de blocs [{el?, text}] */
    play(blocks) {
      if (!SUPPORTED) { App.ui.toast('🔇', 'La lecture à voix haute n\'est pas disponible sur ce navigateur.'); return; }
      tts.stop(true);
      queue = blocks.filter((b) => b.text);
      if (!queue.length) return;
      idx = 0; playing = true; paused = false;
      if (!voice() && synth.getVoices().length) App.ui.toast('🔊', 'Aucune voix française installée : la lecture utilise la voix par défaut. (Réglages du téléphone → Synthèse vocale.)', '', 5000);
      clearInterval(keepAlive);
      keepAlive = setInterval(() => { if (playing && !paused && synth.speaking) { synth.pause(); synth.resume(); } }, 12000);
      speakNext();
    },
    readEl(root) { tts.play(blocksOf(root)); },
    readTexts(list) { tts.play(list.map((t) => ({ el: null, text: speakable(String(t).replace(/<[^>]+>/g, ' ')) }))); },
    toggle() {
      if (!playing) return;
      if (paused) { paused = false; synth.resume(); if (!synth.speaking) speakNext(); }
      else { paused = true; synth.pause(); }
      drawBar();
    },
    next() { if (!playing) return; token++; synth.cancel(); idx = Math.min(queue.length, idx + 1); paused = false; speakNext(); },
    prev() { if (!playing) return; token++; synth.cancel(); idx = Math.max(0, idx - 1); paused = false; speakNext(); },
    rate() {
      const steps = [0.85, 1, 1.15, 1.3, 1.5];
      const cur = rate();
      const nx = steps[(steps.indexOf(cur) + 1) % steps.length] || 1;
      App.store.state.settings.ttsRate = nx;
      App.store.save();
      if (playing) { token++; synth.cancel(); paused = false; speakNext(); } else drawBar();
    },
    stop(silent) {
      token++;
      playing = false; paused = false;
      clearInterval(keepAlive);
      if (SUPPORTED) synth.cancel();
      highlight(null);
      if (bar) { bar.remove(); bar = null; }
    },
    /* Bouton « Écouter » réutilisable */
    btn(label, cls) { return SUPPORTED ? `<button type="button" class="btn ${cls || 'sm soft'} tts-btn" data-tts>🔊 ${label || 'Écouter'}</button>` : ''; }
  });

  if (SUPPORTED) {
    try { synth.getVoices(); if (synth.addEventListener) synth.addEventListener('voiceschanged', () => {}); } catch (e) { /* ignore */ }
    window.addEventListener('beforeunload', () => synth.cancel());
  }
  App.bus.on('route', () => tts.stop(true));
})();
