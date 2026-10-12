/* Modèle : enregistrement des réponses, carnet d'erreurs automatique, maîtrise par module, recommandations. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const P = (App.progress = {
    /* Enregistre une réponse. q = objet question (statique ou généré). Retourne l'XP gagnée. */
    record(q, ok, opts) {
      opts = opts || {};
      const st = App.store.state;
      const today = App.store.today();
      today.answered++;
      if (ok) today.correct++;
      // statistiques par question statique
      if (q.id && !q.gen) {
        const s = st.qstats[q.id] || { seen: 0, ok: 0, last: 0, streak: 0 };
        s.seen++;
        if (ok) { s.ok++; s.streak++; } else s.streak = 0;
        s.last = Date.now();
        st.qstats[q.id] = s;
      }
      // statistiques par module
      if (q.mod) {
        const m = st.modStats[q.mod] || { answered: 0, ok: 0, recent: [] };
        m.answered++;
        if (ok) m.ok++;
        m.recent.push(ok ? 1 : 0);
        if (m.recent.length > 40) m.recent.shift();
        st.modStats[q.mod] = m;
        const mods = App.content.modules.filter((x) => x.lessons.length);
        if (mods.every((x) => st.modStats[x.id] && st.modStats[x.id].answered > 0)) App.game.award('allmods');
      }
      // statistiques par générateur (badges spécialisés)
      if (q.gen) {
        const g = st.genStats[q.gen] || { answered: 0, ok: 0 };
        g.answered++;
        if (ok) g.ok++;
        st.genStats[q.gen] = g;
        const fam = (prefix) => U.sum(Object.entries(st.genStats).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v.ok));
        if (fam('bin') >= 50) App.game.award('bin50');
        if (fam('subnet') + fam('ipcalc') >= 50) App.game.award('cidr50');
        if ((st.genStats.vlsm || {}).ok >= 5) App.game.award('vlsm5');
        if (fam('v6') >= 20) App.game.award('v6');
      }
      // carnet d'erreurs
      const key = P.errKey(q);
      if (!ok && !opts.noErrorLog) {
        const e = st.errors[key] || { q: P.snapshot(q), mod: q.mod, wrong: 0, ok: 0, at: 0 };
        e.wrong++;
        e.ok = 0;
        e.at = Date.now();
        st.errors[key] = e;
      } else if (ok && st.errors[key]) {
        const e = st.errors[key];
        e.ok++;
        if (e.ok >= 2) {
          delete st.errors[key];
          st.errorsBeaten = (st.errorsBeaten || 0) + 1;
          App.ui.toast('🛡️', '<b>Erreur vaincue !</b><div class="muted small">+15 XP — elle sort du carnet.</div>');
          App.game.addXP(15, false);
          if (st.errorsBeaten >= 10) App.game.award('errors10');
        }
      }
      if (ok) App.game.award('first');
      App.store.save();
    },

    errKey: (q) => (q.gen ? 'g:' + q.gen + ':' + U.norm(q.q).slice(0, 120) : 'q:' + q.id),
    snapshot: (q) => JSON.parse(JSON.stringify(q)),
    errors(mod) {
      return Object.entries(App.store.state.errors)
        .filter(([, e]) => !mod || e.mod === mod)
        .map(([k, e]) => Object.assign({ key: k }, e))
        .sort((a, b) => b.at - a.at);
    },

    lessonDone(lessonId) { return !!App.store.state.lessons[lessonId]; },
    markLesson(lessonId) {
      const st = App.store.state;
      if (st.lessons[lessonId]) return false;
      st.lessons[lessonId] = Date.now();
      const n = Object.keys(st.lessons).length;
      if (n >= 5) App.game.award('lessons5');
      if (n >= 30) App.game.award('lessons30');
      const l = App.content.lessons[lessonId];
      if (l) {
        const m = App.content.mod(l.mod);
        if (m && m.lessons.every((x) => st.lessons[x.id])) App.game.award('module');
      }
      App.store.save();
      return true;
    },

    /* Maîtrise d'un module (0..1) : leçons lues 35 %, réussite récente 40 %, cartes maîtrisées 25 % */
    mastery(modId) {
      const m = App.content.mod(modId);
      if (!m) return 0;
      const st = App.store.state;
      const lessons = m.lessons.length ? m.lessons.filter((l) => st.lessons[l.id]).length / m.lessons.length : 0;
      const ms = st.modStats[modId];
      const recent = ms && ms.recent.length ? U.sum(ms.recent) / ms.recent.length : 0;
      const volume = ms ? Math.min(1, ms.recent.length / 20) : 0;
      const c = App.srs.counts(modId);
      const cards = c.total ? (c.mastered + 0.4 * c.learning) / c.total : 0;
      return Math.min(1, 0.35 * lessons + 0.4 * recent * volume + 0.25 * cards);
    },

    accuracy(modId) {
      const ms = App.store.state.modStats[modId];
      if (!ms || !ms.recent.length) return null;
      return U.sum(ms.recent) / ms.recent.length;
    },

    /* Module le plus faible parmi ceux déjà travaillés (ou à travailler selon le plan) */
    weakest() {
      const today = U.dayKey();
      const cand = App.content.modules.filter((m) => m.lessons.length && (!m.day || m.day <= today));
      if (!cand.length) return null;
      return cand.map((m) => ({ m, v: P.mastery(m.id) })).sort((a, b) => a.v - b.v)[0].m;
    },

    exerciseScore(exId) { return App.store.state.exercises[exId] || null; },
    saveExercise(exId, score, max) {
      const prev = App.store.state.exercises[exId];
      App.store.state.exercises[exId] = { score, max, at: Date.now(), best: Math.max(score, prev ? prev.best || prev.score : 0) };
      App.store.save();
    },

    totals() {
      const st = App.store.state;
      const days = Object.values(st.daily);
      return {
        answered: U.sum(days.map((d) => d.answered)),
        correct: U.sum(days.map((d) => d.correct)),
        cards: U.sum(days.map((d) => d.cards)),
        lessons: Object.keys(st.lessons).length,
        errors: Object.keys(st.errors).length
      };
    }
  });
})();
