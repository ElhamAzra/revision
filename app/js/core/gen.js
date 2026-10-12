/* Registre des générateurs d'exercices infinis. Chaque question générée est reproductible (graine). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const gen = (App.gen = {
    list: [],
    byId: {},
    /* def : { id, title, mod, icon, desc, levels: ['Facile','Moyen','Difficile'], make(r, level) → question, quick?(r) → question } */
    register(def) {
      def.levels = def.levels || ['Facile', 'Moyen', 'Difficile'];
      gen.list.push(def);
      gen.byId[def.id] = def;
    },
    make(id, level, seed, quick) {
      const def = gen.byId[id];
      if (!def) return null;
      seed = seed == null ? U.seed() : seed;
      const r = U.rng(seed);
      const lvl = level || 1;
      const q = quick && def.quick ? def.quick(r, lvl) : def.make(r, lvl);
      q.gen = id;
      q.mod = q.mod || def.mod;
      q.level = q.level || lvl;
      q.seed = seed;
      q.id = 'gen:' + id + ':' + seed;
      q.type = q.type || 'input';
      return q;
    },
    /* Mélange de plusieurs générateurs (défi éclair, examen express) */
    mixer(ids, level, quick) {
      return () => {
        const id = U.pick(ids);
        const lv = Array.isArray(level) ? U.pick(level) : level || U.R.int(1, 2);
        return gen.make(id, lv, null, quick);
      };
    },
    forModule(mod) { return gen.list.filter((g) => g.mod === mod); }
  });

  /* Packs du « défi éclair » (60 s chrono) */
  gen.BLITZ = [
    { id: 'binaire', title: 'Binaire ↔ décimal', icon: '🤖', ids: ['bin-d2b', 'bin-b2d'], level: [1, 2] },
    { id: 'masques', title: 'Masques & préfixes', icon: '🎭', ids: ['mask', 'hosts'], level: [1, 2] },
    { id: 'reseau', title: 'Adresse réseau express', icon: '⚡', ids: ['subnet'], level: [1, 2], quick: true },
    { id: 'ipv6', title: 'IPv6 express', icon: '🛰️', ids: ['v6-type', 'v6-compress'], level: [1, 2] },
    { id: 'ports', title: 'Ports & protocoles', icon: '🔌', ids: ['ports'], level: [1, 2] },
    { id: 'sys', title: 'Droits Linux & cron', icon: '🐧', ids: ['chmod', 'umask', 'cron-read'], level: [1, 2] },
    { id: 'telecom', title: 'Décibels express', icon: '📡', ids: ['db'], level: [1, 2] },
    { id: 'mix', title: 'Grand mélange', icon: '🌪️', ids: ['bin-d2b', 'bin-b2d', 'mask', 'hosts', 'subnet', 'ports', 'chmod', 'v6-type', 'db'], level: [1, 2], quick: true }
  ];
})();
