/* Modèle : persistance de la progression dans le navigateur (localStorage), avec export / import JSON. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const KEY = 'mef-revision-v1';

  const defaults = () => ({
    v: 1,
    created: Date.now(),
    settings: { theme: 'auto', sound: true, examDate: '2026-10-19', dailyGoal: 200, newCardsPerSession: 20, name: '', font: 'nunito', textSize: 'm', nav: 'auto', onboarded: false, last: null, lastBackup: null, backupEvery: 3 },
    xp: 0,
    daily: {},          // { 'AAAA-MM-JJ': { xp, answered, correct, cards, goalHit } }
    streak: { count: 0, best: 0, last: null },
    lessons: {},        // { lessonId: timestamp }
    qstats: {},         // { questionId: { seen, ok, last, streak } }
    modStats: {},       // { modId: { answered, ok, recent: [1,0,...] } }
    genStats: {},       // { genId: { answered, ok, best } }
    cards: {},          // { cardId: { box, due, reps, lapses, last } }
    errors: {},         // { key: { q, mod, wrong, ok, at } }
    errorsBeaten: 0,
    badges: {},         // { badgeId: timestamp }
    records: {},        // { blitzMode: bestScore }
    exams: [],          // [{ at, kind, e1, e2, avg, ... }]
    exercises: {},      // { exId: { score, max, at } }
    pretest: {},        // { modId: { score, total, at } }
    counters: {},       // compteurs divers pour les badges
    notes: {},          // { lessonId: texte }
    guided: null        // séance guidée du jour { day, mod, done, ... }
  });

  let mem = null; // repli si localStorage indisponible

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return mem;
    }
  }
  function write(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      mem = state;
      return false;
    }
  }

  function merge(base, saved) {
    // fusion superficielle à deux niveaux : conserve les nouvelles clés par défaut
    const out = Object.assign({}, base, saved);
    out.settings = Object.assign({}, base.settings, saved && saved.settings);
    out.streak = Object.assign({}, base.streak, saved && saved.streak);
    return out;
  }

  const store = (App.store = {
    state: defaults(),
    persistent: true,

    load() {
      const saved = read();
      store.state = saved ? merge(defaults(), saved) : defaults();
      store.persistent = write(store.state);
      return store.state;
    },

    save: U.debounce(() => write(store.state), 250),
    saveNow() { write(store.state); },

    today() {
      const k = U.dayKey();
      if (!store.state.daily[k]) store.state.daily[k] = { xp: 0, answered: 0, correct: 0, cards: 0, goalHit: false };
      return store.state.daily[k];
    },

    count(name, n) {
      store.state.counters[name] = (store.state.counters[name] || 0) + (n == null ? 1 : n);
      return store.state.counters[name];
    },

    exportJSON() {
      return JSON.stringify({ app: 'revision-mef', exportedAt: new Date().toISOString(), state: store.state });
    },

    importJSON(text) {
      const data = JSON.parse(text);
      const st = data && data.state ? data.state : data;
      if (!st || typeof st !== 'object' || !('xp' in st)) throw new Error('Fichier de progression invalide');
      store.state = merge(defaults(), st);
      store.saveNow();
    },

    reset() {
      store.state = defaults();
      store.saveNow();
    }
  });
})();
