/* Effets : sons synthétisés (WebAudio, aucun fichier), confettis, vibration, XP flottant. */
(function () {
  'use strict';
  const App = window.App;
  let ctx = null;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol) {
    const c = audio();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime + start);
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, c.currentTime + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur + 0.05);
  }

  const fx = (App.fx = {
    sound(name) {
      if (!App.store || !App.store.state.settings.sound) return;
      try {
        switch (name) {
          case 'ok': tone(660, 0, 0.12, 'sine', 0.1); tone(990, 0.08, 0.18, 'sine', 0.1); break;
          case 'combo': tone(660, 0, 0.1, 'triangle', 0.1); tone(880, 0.07, 0.1, 'triangle', 0.1); tone(1320, 0.14, 0.2, 'triangle', 0.1); break;
          case 'ko': tone(220, 0, 0.18, 'square', 0.05); tone(180, 0.1, 0.22, 'square', 0.05); break;
          case 'flip': tone(520, 0, 0.06, 'sine', 0.05); break;
          case 'level': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.1)); break;
          case 'badge': [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.22, 'sine', 0.1)); break;
          case 'tick': tone(1200, 0, 0.03, 'square', 0.03); break;
          case 'end': [392, 523, 659].forEach((f, i) => tone(f, i * 0.12, 0.3, 'sine', 0.1)); break;
        }
      } catch (e) { /* audio indisponible : on ignore */ }
    },

    vibrate(ms) {
      try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
    },

    xpFloat(amount, anchor) {
      if (!amount) return;
      const el = document.createElement('div');
      el.className = 'xp-float';
      el.textContent = '+' + amount + ' XP';
      let x = window.innerWidth / 2, y = window.innerHeight / 2;
      if (anchor && anchor.getBoundingClientRect) {
        const r = anchor.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top;
      }
      el.style.left = Math.max(10, x - 30) + 'px';
      el.style.top = Math.max(10, y - 10) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    },

    confetti(power) {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const cv = document.createElement('canvas');
      cv.className = 'confetti';
      const dpr = window.devicePixelRatio || 1;
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      document.body.appendChild(cv);
      const g = cv.getContext('2d');
      g.scale(dpr, dpr);
      const colors = ['#5b4bff', '#ff7a1a', '#10a861', '#ffd23f', '#ff4d6d', '#1f86e8'];
      const n = Math.round(140 * (power || 1));
      const W = window.innerWidth, H = window.innerHeight;
      const parts = [];
      for (let i = 0; i < n; i++) {
        const fromLeft = i % 2 === 0;
        parts.push({
          x: fromLeft ? -10 : W + 10,
          y: H * (0.55 + Math.random() * 0.3),
          vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9),
          vy: -(9 + Math.random() * 11),
          s: 5 + Math.random() * 6,
          r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          c: colors[i % colors.length],
          shape: Math.random() < 0.5
        });
      }
      const t0 = performance.now();
      (function frame(t) {
        const el = t - t0;
        g.clearRect(0, 0, W, H);
        parts.forEach((p) => {
          p.vy += 0.32;
          p.vx *= 0.99;
          p.x += p.vx;
          p.y += p.vy;
          p.r += p.vr;
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.r);
          g.fillStyle = p.c;
          g.globalAlpha = Math.max(0, 1 - el / 2600);
          if (p.shape) g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
          else { g.beginPath(); g.arc(0, 0, p.s / 2.6, 0, Math.PI * 2); g.fill(); }
          g.restore();
        });
        if (el < 2600) requestAnimationFrame(frame);
        else cv.remove();
      })(t0);
    }
  });
})();
