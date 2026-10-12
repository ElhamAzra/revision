/* Vue : lecture à voix haute (synthèse vocale du navigateur, hors ligne sur la plupart des appareils).
   Lit une page bloc par bloc (titres, paragraphes, listes, encadrés), surligne le passage en cours,
   avec un lecteur flottant : pause / reprise, passage suivant, vitesse, arrêt. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const synth = window.speechSynthesis;
  const SUPPORTED = !!(synth && window.SpeechSynthesisUtterance);

  let queue = [], idx = 0, playing = false, paused = false, bar = null, curEl = null, token = 0;

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

  let voicesCache = [];
  function loadVoices() { try { voicesCache = synth.getVoices() || []; } catch (e) { voicesCache = []; } }
  function voice() {
    if (!voicesCache.length) loadVoices();
    const vs = voicesCache;
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

  /* Lecture robuste (Android, iPhone, ordinateur) :
     - pas de pause()/resume() natifs (instables sur Android) : la pause arrête et la reprise relit le passage ;
     - les énoncés restent référencés (sinon Chrome peut « oublier » l'événement de fin) ;
     - un chien de garde passe à la suite si la fin n'est jamais signalée ;
     - si rien ne démarre, on relance une fois puis on explique comment installer une voix. */
  const live = [];
  let watchdog = null, started = false, retried = false;
  function speakNext() {
    if (!playing || paused) return;
    if (idx >= queue.length) { tts.stop(); App.ui.toast('🔊', 'Lecture terminée.'); return; }
    const item = queue[idx];
    highlight(item.el);
    const parts = chunks(item.text);
    const my = ++token;
    let k = 0;
    const one = () => {
      clearTimeout(watchdog);
      if (my !== token || !playing || paused) return;
      if (k >= parts.length) { idx++; speakNext(); return; }
      const text = parts[k++];
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      const v = voice();
      if (v) u.voice = v;
      u.rate = rate();
      let done = false;
      const finish = () => { if (done) return; done = true; const i = live.indexOf(u); if (i >= 0) live.splice(i, 1); if (my === token) one(); };
      u.onstart = () => { started = true; };
      u.onend = finish;
      u.onerror = (e) => { if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; finish(); };
      live.push(u);
      synth.speak(u);
      // chien de garde : après la durée estimée (≈ 14 caractères/s à vitesse 1), on surveille la fin réelle
      // (speechSynthesis.speaking) ; plafond de sécurité = 2 × l'estimation + 2,5 s
      const dur = (text.length / (14 * rate())) * 1000;
      const t0 = Date.now(), cap = Math.max(4000, dur * 2 + 2500);
      const check = () => {
        if (done || my !== token) return;
        if (!started && Date.now() - t0 > 2500) {
          if (!retried) { retried = true; synth.cancel(); k--; setTimeout(one, 150); return; }
          tts.stop();
          App.ui.toast('🔇', '<b>Aucune voix n\'a parlé.</b><div class="small muted">Sur Android : Paramètres → Gestion globale (ou Accessibilité) → Synthèse vocale → « Services vocaux Google », et télécharger la voix <b>Français</b>. Sur iPhone : désactive le mode silencieux.</div>', '', 9000);
          return;
        }
        const elapsed = Date.now() - t0;
        if (started && elapsed > dur * 0.6 && !synth.speaking && !synth.pending) { finish(); return; }
        if (elapsed > cap) { synth.cancel(); finish(); return; }
        watchdog = setTimeout(check, 400);
      };
      watchdog = setTimeout(check, Math.min(2600, Math.max(600, dur * 0.6)));
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
      idx = 0; playing = true; paused = false; started = false; retried = false;
      loadVoices();
      if (!voice() && voicesCache.length) App.ui.toast('🔊', 'Aucune voix française installée : la lecture utilise la voix par défaut. (Paramètres du téléphone → Synthèse vocale → Français.)', '', 5000);
      speakNext();
    },
    readEl(root) { tts.play(blocksOf(root)); },
    readTexts(list) { tts.play(list.map((t) => ({ el: null, text: speakable(String(t).replace(/<[^>]+>/g, ' ')) }))); },
    toggle() {
      if (!playing) return;
      if (paused) { paused = false; speakNext(); }        // relit le passage en cours
      else { paused = true; token++; clearTimeout(watchdog); synth.cancel(); }
      drawBar();
    },
    jump(d) { if (!playing) return; token++; clearTimeout(watchdog); synth.cancel(); idx = Math.max(0, Math.min(queue.length, idx + d)); paused = false; speakNext(); },
    next() { tts.jump(1); },
    prev() { tts.jump(-1); },
    rate() {
      const steps = [0.85, 1, 1.15, 1.3, 1.5];
      const cur = rate();
      const nx = steps[(steps.indexOf(cur) + 1) % steps.length] || 1;
      App.store.state.settings.ttsRate = nx;
      App.store.save();
      if (playing && !paused) tts.jump(0); else drawBar();
    },
    stop() {
      token++;
      playing = false; paused = false;
      clearTimeout(watchdog);
      live.length = 0;
      if (SUPPORTED) synth.cancel();
      highlight(null);
      if (bar) { bar.remove(); bar = null; }
    },
    /* Bouton « Écouter » réutilisable */
    btn(label, cls) { return SUPPORTED ? `<button type="button" class="btn ${cls || 'sm soft'} tts-btn" data-tts>🔊 ${label || 'Écouter'}</button>` : ''; }
  });

  if (SUPPORTED) {
    loadVoices();
    try { if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices); else synth.onvoiceschanged = loadVoices; } catch (e) { /* ignore */ }
    document.addEventListener('visibilitychange', () => { if (document.hidden && playing && !paused) tts.toggle(); });
    window.addEventListener('beforeunload', () => synth.cancel());
  }
  App.bus.on('route', () => tts.stop(true));
})();
