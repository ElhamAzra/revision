/* Modèle : motivation — XP, niveaux, série de jours (🔥), objectif quotidien, badges. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const TITLES = [
    'Novice du réseau', 'Apprenti', 'Stagiaire IT', 'Technicien junior', 'Technicien', 'Technicien confirmé',
    'Admin junior', 'Administrateur', 'Admin confirmé', 'Admin senior', 'Ingénieur junior', 'Ingénieur réseau',
    'Ingénieur confirmé', 'Expert réseau', 'Expert sécurité', 'Architecte', 'Architecte senior', 'Gourou du CIDR',
    'Légende du MEF', 'Major du concours'
  ];
  const xpFor = (L) => 50 * L * (L - 1); // XP cumulée pour atteindre le niveau L (L1 = 0, L2 = 100, L3 = 300…)

  const BADGES = [
    { id: 'first', e: '🌱', n: 'Premiers pas', d: 'Première bonne réponse' },
    { id: 'goal1', e: '🎯', n: 'Objectif atteint', d: 'Atteindre l\'objectif du jour' },
    { id: 'streak3', e: '🔥', n: 'En feu', d: '3 jours d\'objectif d\'affilée' },
    { id: 'streak7', e: '☄️', n: 'Inarrêtable', d: '7 jours d\'objectif d\'affilée' },
    { id: 'lessons5', e: '📖', n: 'Lecteur assidu', d: '5 leçons terminées' },
    { id: 'lessons30', e: '📚', n: 'Bibliothèque vivante', d: '30 leçons terminées' },
    { id: 'module', e: '🏅', n: 'Module bouclé', d: 'Toutes les leçons d\'un module' },
    { id: 'bin50', e: '🤖', n: 'Ninja du binaire', d: '50 conversions binaires justes' },
    { id: 'cidr50', e: '🧮', n: 'Maître du CIDR', d: '50 calculs de sous-réseaux justes' },
    { id: 'vlsm5', e: '🏗️', n: 'Architecte VLSM', d: '5 plans VLSM réussis' },
    { id: 'v6', e: '🛰️', n: 'Pionnier IPv6', d: '20 questions IPv6 justes' },
    { id: 'combo10', e: '⚡', n: 'Combo ×10', d: '10 bonnes réponses d\'affilée' },
    { id: 'combo25', e: '🌪️', n: 'Combo ×25', d: '25 bonnes réponses d\'affilée' },
    { id: 'perfect', e: '💯', n: 'Sans faute', d: 'Une série d\'au moins 10 questions sans erreur' },
    { id: 'blitz15', e: '⏱️', n: 'Éclair', d: '15 points en défi éclair' },
    { id: 'blitz30', e: '🚀', n: 'Supersonique', d: '30 points en défi éclair' },
    { id: 'cards100', e: '🃏', n: 'Mémoire vive', d: '100 cartes révisées' },
    { id: 'cards500', e: '🧠', n: 'Mémoire d\'éléphant', d: '500 cartes révisées' },
    { id: 'errors10', e: '🛡️', n: 'Chasseur d\'erreurs', d: '10 erreurs vaincues' },
    { id: 'exam', e: '📝', n: 'Conditions réelles', d: 'Terminer un examen blanc' },
    { id: 'exam10', e: '✅', n: 'La moyenne !', d: 'Examen blanc ≥ 10/20' },
    { id: 'exam14', e: '🏆', n: 'Major en vue', d: 'Examen blanc ≥ 14/20' },
    { id: 'allmods', e: '🌍', n: 'Polyvalent', d: 'Répondre dans tous les modules' },
    { id: 'night', e: '🦉', n: 'Noctambule', d: 'Réviser après 23 h' },
    { id: 'early', e: '🌅', n: 'Lève-tôt', d: 'Réviser avant 6 h 30' },
    { id: 'level10', e: '👑', n: 'Niveau 10', d: 'Atteindre le niveau 10' }
  ];

  const game = (App.game = {
    TITLES, BADGES, xpFor,

    level(xp) {
      xp = xp == null ? App.store.state.xp : xp;
      let L = 1;
      while (L < 20 && xp >= xpFor(L + 1)) L++;
      const cur = xpFor(L), next = L < 20 ? xpFor(L + 1) : cur;
      return { level: L, title: TITLES[L - 1], cur, next, into: xp - cur, need: next - cur, pct: L < 20 ? (xp - cur) / (next - cur) : 1 };
    },

    /* Ajoute de l'XP, met à jour l'objectif du jour, la série et les niveaux */
    addXP(amount, anchor) {
      amount = Math.round(amount);
      if (amount <= 0) return;
      const st = App.store.state;
      const before = game.level(st.xp).level;
      st.xp += amount;
      const today = App.store.today();
      today.xp += amount;
      if (anchor !== false) App.fx.xpFloat(amount, anchor);
      // objectif du jour
      if (!today.goalHit && today.xp >= st.settings.dailyGoal) {
        today.goalHit = true;
        game.bumpStreak();
        st.xp += 50;
        today.xp += 50;
        setTimeout(() => {
          App.ui.toast('🎯', '<b>Objectif du jour atteint !</b><div class="muted small">+50 XP bonus · série : ' + st.streak.count + ' 🔥</div>', 'badge');
          App.fx.confetti(0.7);
          App.fx.sound('badge');
        }, 300);
        game.award('goal1');
        if (st.streak.count >= 3) game.award('streak3');
        if (st.streak.count >= 7) game.award('streak7');
      }
      const after = game.level(st.xp);
      if (after.level > before) {
        setTimeout(() => game.levelUp(after), 450);
        if (after.level >= 10) game.award('level10');
      }
      const h = new Date().getHours(), m = new Date().getMinutes();
      if (h >= 23) game.award('night');
      if (h < 6 || (h === 6 && m < 30)) game.award('early');
      App.store.save();
      App.bus.emit('xp', st.xp);
    },

    bumpStreak() {
      const s = App.store.state.streak;
      const today = U.dayKey();
      if (s.last === today) return;
      const yesterday = U.addDays(today, -1);
      s.count = s.last === yesterday ? s.count + 1 : 1;
      s.last = today;
      s.best = Math.max(s.best, s.count);
    },

    /* Série affichée : si le dernier jour validé est avant-hier ou plus ancien, la série est cassée */
    streakNow() {
      const s = App.store.state.streak;
      if (!s.last) return 0;
      const gap = U.daysBetween(s.last, U.dayKey());
      return gap <= 1 ? s.count : 0;
    },

    levelUp(info) {
      App.fx.sound('level');
      App.fx.confetti(1.2);
      App.ui.modal(`
        <div class="big-emoji">🎉</div>
        <h2 class="center mt1">Niveau ${info.level} !</h2>
        <p class="center">Tu es maintenant <b class="pri-t">${info.title}</b>.</p>
        <p class="center muted small">Prochain palier : ${U.fmtNum(info.next)} XP. Continue, chaque question te rapproche du concours.</p>
        <div class="center mt2"><button class="btn primary" data-close>Continuer 🚀</button></div>`);
    },

    award(id) {
      const st = App.store.state;
      if (st.badges[id]) return false;
      const b = BADGES.find((x) => x.id === id);
      if (!b) return false;
      st.badges[id] = Date.now();
      App.store.save();
      setTimeout(() => {
        App.fx.sound('badge');
        App.ui.toast(b.e, `<b>Badge débloqué : ${b.n}</b><div class="muted small">${b.d}</div>`, 'badge', 4200);
      }, 600);
      return true;
    },

    /* Multiplicateur de combo (bonnes réponses d'affilée) */
    comboMult(combo) {
      if (combo >= 10) return 2;
      if (combo >= 5) return 1.5;
      return 1;
    },

    dailyGoalPct() {
      const t = App.store.today();
      return Math.min(1, t.xp / App.store.state.settings.dailyGoal);
    }
  });
})();
