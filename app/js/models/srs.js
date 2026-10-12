/* Modèle : répétition espacée (Leitner compressé sur une semaine de révision intensive).
   Boîtes 1 → 6 : 10 min, 6 h, 1 j, 2 j, 4 j, 7 j. Une carte en boîte ≥ 4 est « maîtrisée ». */
(function () {
  'use strict';
  const App = window.App;
  const MIN = 60000, H = 3600000, D = 86400000;
  const INTERVALS = [0, 10 * MIN, 6 * H, 1 * D, 2 * D, 4 * D, 7 * D];

  const srs = (App.srs = {
    INTERVALS,
    state(cardId) { return App.store.state.cards[cardId] || null; },
    isNew(cardId) { return !App.store.state.cards[cardId]; },
    isDue(cardId, now) {
      const s = srs.state(cardId);
      return !!s && s.due <= (now || Date.now());
    },
    mastered(cardId) {
      const s = srs.state(cardId);
      return !!s && s.box >= 4;
    },

    /* rating : 0 = À revoir, 1 = Difficile, 2 = Bien, 3 = Facile */
    rate(cardId, rating) {
      const now = Date.now();
      const st = App.store.state.cards;
      const s = st[cardId] || { box: 0, due: now, reps: 0, lapses: 0, last: 0 };
      if (rating === 0) {
        s.box = 1;
        s.lapses++;
        s.due = now + MIN;
      } else if (rating === 1) {
        s.box = Math.max(1, s.box);
        s.due = now + Math.max(5 * MIN, INTERVALS[s.box] * 0.5);
      } else if (rating === 2) {
        s.box = Math.min(6, s.box === 0 ? 2 : s.box + 1);
        s.due = now + INTERVALS[s.box];
      } else {
        s.box = Math.min(6, s.box === 0 ? 3 : s.box + 2);
        s.due = now + INTERVALS[s.box];
      }
      s.reps++;
      s.last = now;
      st[cardId] = s;
      App.store.save();
      return s;
    },

    /* Construit une session : cartes dues (les plus en retard d'abord) + un quota de nouvelles cartes */
    session(opts) {
      opts = opts || {};
      const now = Date.now();
      const filter = (c) => (!opts.mod || c.mod === opts.mod);
      const all = App.content.allCards(filter);
      const due = all.filter((c) => srs.isDue(c.id, now)).sort((a, b) => srs.state(a.id).due - srs.state(b.id).due);
      const fresh = all.filter((c) => srs.isNew(c.id));
      const nNew = opts.newCount != null ? opts.newCount : App.store.state.settings.newCardsPerSession;
      // nouvelles cartes dans l'ordre du cours (les modules du jour d'abord)
      const out = due.slice(0, opts.max || 60).concat(fresh.slice(0, nNew));
      return out;
    },

    /* Cartes « fragiles » pour la veille : les moins solides d'abord (boîte basse, oublis), complétées
       par des nouvelles cartes des modules les moins maîtrisés */
    fragile(n) {
      const seen = App.content.allCards((c) => !!srs.state(c.id)).sort((a, b) => {
        const A = srs.state(a.id), B = srs.state(b.id);
        return A.box - B.box || B.lapses - A.lapses || A.due - B.due;
      });
      const out = seen.slice(0, n);
      if (out.length < n) {
        const mods = App.content.modules.filter((m) => m.cards.length).sort((a, b) => App.progress.mastery(a.id) - App.progress.mastery(b.id));
        for (const m of mods) {
          for (const c of m.cards) { if (out.length >= n) break; if (!srs.state(c.id)) out.push(c); }
          if (out.length >= n) break;
        }
      }
      return out;
    },

    counts(mod) {
      const now = Date.now();
      const all = App.content.allCards((c) => !mod || c.mod === mod);
      let due = 0, fresh = 0, mastered = 0, learning = 0;
      all.forEach((c) => {
        const s = srs.state(c.id);
        if (!s) fresh++;
        else {
          if (s.due <= now) due++;
          if (s.box >= 4) mastered++; else learning++;
        }
      });
      return { total: all.length, due, fresh, mastered, learning };
    },

    nextDueLabel(mod) {
      const all = App.content.allCards((c) => !mod || c.mod === mod).map((c) => srs.state(c.id)).filter(Boolean);
      if (!all.length) return null;
      const next = Math.min(...all.map((s) => s.due));
      const d = next - Date.now();
      if (d <= 0) return 'maintenant';
      if (d < H) return 'dans ' + Math.ceil(d / MIN) + ' min';
      if (d < D) return 'dans ' + Math.round(d / H) + ' h';
      return 'dans ' + Math.round(d / D) + ' j';
    }
  });
})();
