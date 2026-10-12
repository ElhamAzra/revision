/* Espace de noms global et utilitaires communs.
   Toute l'application vit sous window.App (scripts classiques : compatibles file://). */
(function () {
  'use strict';
  const App = (window.App = window.App || {});
  App.version = '1.0.0';

  const U = (App.util = {});

  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  U.el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  };
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.sum = (arr) => arr.reduce((a, b) => a + b, 0);
  U.uid = () => Math.random().toString(36).slice(2, 10);

  /* Générateur pseudo-aléatoire reproductible (mulberry32) : permet de rejouer une question générée. */
  U.rng = (seed) => {
    let a = seed >>> 0;
    const f = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.shuffle = (arr) => {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(f() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    };
    f.chance = (p) => f() < p;
    return f;
  };
  U.seed = () => (Math.random() * 4294967296) >>> 0;
  U.R = U.rng(U.seed());
  U.shuffle = (arr) => U.R.shuffle(arr);
  U.pick = (arr) => U.R.pick(arr);

  /* Dates locales au format AAAA-MM-JJ */
  U.dayKey = (d) => {
    d = d || new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };
  U.parseDay = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  U.daysBetween = (a, b) => Math.round((U.parseDay(b) - U.parseDay(a)) / 86400000);
  U.addDays = (s, n) => {
    const d = U.parseDay(s);
    d.setDate(d.getDate() + n);
    return U.dayKey(d);
  };
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  U.fmtDay = (s, withYear) => {
    const d = U.parseDay(s);
    return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()] + (withYear ? ' ' + d.getFullYear() : '');
  };
  U.fmtDuration = (sec) => {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const p = (n) => String(n).padStart(2, '0');
    return (h ? h + ':' + p(m) : m) + ':' + p(s);
  };
  U.ago = (ts) => {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return "à l'instant";
    if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
    return 'il y a ' + Math.round(s / 86400) + ' j';
  };

  /* Normalisation de texte pour comparer des réponses (accents, casse, espaces). */
  U.norm = (s) =>
    String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

  /* Nombres au format français : 4 094 ; 2,5 */
  U.fmtNum = (n, dec) => {
    if (typeof n !== 'number' || !isFinite(n)) return String(n);
    let s = dec != null ? n.toFixed(dec) : String(Math.round(n * 1000) / 1000);
    let [i, f] = s.split('.');
    const neg = i.startsWith('-');
    if (neg) i = i.slice(1);
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '−' : '') + i + (f ? ',' + f : '');
  };
  U.parseNum = (s) => {
    if (typeof s === 'number') return s;
    const t = String(s).replace(/[\s  ]/g, '').replace(',', '.').replace('−', '-');
    if (t === '' || !/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t)) return NaN;
    return parseFloat(t);
  };

  U.debounce = (fn, ms) => {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  };

  U.plural = (n, one, many) => n + ' ' + (Math.abs(n) >= 2 ? many || one + 's' : one);

  /* Petit bus d'événements */
  const handlers = {};
  App.bus = {
    on(evt, fn) {
      (handlers[evt] = handlers[evt] || []).push(fn);
      return () => (handlers[evt] = handlers[evt].filter((f) => f !== fn));
    },
    emit(evt, data) {
      (handlers[evt] || []).slice().forEach((fn) => {
        try { fn(data); } catch (e) { console.error(e); }
      });
    }
  };
})();
