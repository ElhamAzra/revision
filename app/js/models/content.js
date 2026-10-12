/* Modèle : registre du contenu pédagogique (modules, leçons, questions, cartes, exercices) + recherche. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const C = (App.content = {
    modules: [],
    byId: {},
    questions: {},
    cards: {},
    lessons: {},
    exercises: {},
    extras: { tips: [], quotes: [], glossary: [] },

    register(mod) {
      mod.lessons = mod.lessons || [];
      mod.qcm = mod.qcm || [];
      mod.cards = mod.cards || [];
      mod.exercises = mod.exercises || [];
      mod.pretest = mod.pretest || [];
      mod.phrases = mod.phrases || [];
      mod.lessons.forEach((l, i) => {
        l.id = l.id || mod.id + '-l' + (i + 1);
        l.mod = mod.id;
        l.idx = i;
        l.check = (l.check || []).map((q, j) => C.addQ(q, mod.id, l.id + '-c' + (j + 1), l.id));
        C.lessons[l.id] = l;
      });
      mod.qcm = mod.qcm.map((q, j) => C.addQ(q, mod.id, mod.id + '-q' + (j + 1)));
      mod.pretest = mod.pretest.map((q, j) => C.addQ(q, mod.id, mod.id + '-p' + (j + 1)));
      mod.cards.forEach((c, j) => {
        c.id = c.id || mod.id + '-k' + (j + 1);
        c.mod = mod.id;
        C.cards[c.id] = c;
      });
      mod.exercises.forEach((e, j) => {
        e.id = e.id || mod.id + '-ex' + (j + 1);
        e.mod = mod.id;
        e.points = e.points || U.sum((e.parts || []).map((p) => p.pts || 0));
        C.exercises[e.id] = e;
      });
      C.modules.push(mod);
      C.modules.sort((a, b) => a.order - b.order);
      C.byId[mod.id] = mod;
    },

    addQ(q, modId, defId, lessonId) {
      q.id = q.id || defId;
      q.mod = q.mod || modId;
      if (lessonId) q.lesson = lessonId;
      C.questions[q.id] = q;
      return q;
    },

    mod: (id) => C.byId[id],
    allQuestions: (filter) => Object.values(C.questions).filter((q) => !filter || filter(q)),
    allCards: (filter) => Object.values(C.cards).filter((c) => !filter || filter(c)),
    lessonCount: () => C.modules.reduce((n, m) => n + m.lessons.length, 0),

    /* Module « du jour » selon le plan (date de séance) */
    moduleForDay(dayKey) {
      return C.modules.find((m) => m.day === dayKey) || null;
    },

    /* --------- Recherche plein texte --------- */
    _index: null,
    buildIndex() {
      const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ');
      const idx = [];
      C.modules.forEach((m) => {
        m.lessons.forEach((l) => {
          idx.push({ kind: 'Leçon', title: l.title, sub: m.title, href: '#/cours/' + m.id + '/' + l.idx, text: strip(l.title + ' ' + (l.essentiel || '') + ' ' + l.html), mod: m });
        });
        m.cards.forEach((c) => {
          idx.push({ kind: 'Carte', title: strip(c.front).slice(0, 90), sub: m.title, href: '#/cartes?mod=' + m.id, text: strip(c.front + ' ' + c.back), mod: m });
        });
      });
      C.extras.glossary.forEach((g) => idx.push({ kind: 'Glossaire', title: g[0], sub: strip(g[1]).slice(0, 100), href: '#/glossaire?q=' + encodeURIComponent(g[0]), text: strip(g[0] + ' ' + g[1]) }));
      idx.forEach((e) => (e.ntext = U.norm(e.text)));
      C._index = idx;
    },
    search(q) {
      if (!C._index) C.buildIndex();
      const terms = U.norm(q).split(' ').filter((t) => t.length > 1);
      if (!terms.length) return [];
      const res = [];
      C._index.forEach((e) => {
        let score = 0;
        for (const t of terms) {
          const pos = e.ntext.indexOf(t);
          if (pos < 0) return;
          score += 1 + (U.norm(e.title).includes(t) ? 5 : 0);
        }
        const first = e.ntext.indexOf(terms[0]);
        const raw = e.text;
        const start = Math.max(0, first - 60);
        res.push(Object.assign({}, e, { score, snippet: (start > 0 ? '… ' : '') + raw.slice(start, start + 180) + '…' }));
      });
      return res.sort((a, b) => b.score - a.score).slice(0, 40);
    }
  });

  App.registerModule = C.register;
})();
