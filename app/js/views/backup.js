/* Vue : sauvegarde et restauration de la progression (fichier .json), aperçu avant restauration,
   rappels de sauvegarde et glisser-déposer d'un fichier de sauvegarde sur la fenêtre. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const DAY = 86400000;

  const backup = (App.backup = {
    /* Prénom de l'utilisateur, échappé pour l'affichage ('' si inconnu) */
    name() { return U.esc((App.store.state.settings.name || '').trim()); },

    fileName() {
      const n = U.norm(App.store.state.settings.name || '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return 'sauvegarde-revision-mef' + (n ? '-' + n : '') + '-' + U.dayKey() + '.json';
    },

    /* Télécharge la sauvegarde et mémorise la date */
    download() {
      const st = App.store.state;
      st.settings.lastBackup = Date.now();
      delete st.settings.backupSnooze;
      App.store.saveNow();
      const blob = new Blob([App.store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = backup.fileName();
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      App.ui.toast('💾', `<b>Sauvegarde téléchargée</b><div class="small muted">${U.esc(backup.fileName())} — garde-la précieusement (Téléchargements, clé, WhatsApp…).</div>`, '', 5000);
      App.bus.emit('backup');
    },

    /* Ouvre le sélecteur de fichier puis lance la restauration */
    pick(after) {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.style.display = 'none';
      inp.addEventListener('change', () => {
        const f = inp.files[0];
        inp.remove();
        if (f) backup.readFile(f, after);
      });
      document.body.appendChild(inp);
      inp.click();
    },

    readFile(file, after) {
      const rd = new FileReader();
      rd.onload = () => backup.restoreFlow(String(rd.result), after);
      rd.onerror = () => App.ui.toast('⚠️', 'Impossible de lire ce fichier.');
      rd.readAsText(file);
    },

    /* Résumé lisible d'un fichier de sauvegarde (lève une erreur si invalide) */
    preview(text) {
      const data = JSON.parse(text);
      const st = data && data.state ? data.state : data;
      if (!st || typeof st !== 'object' || !('xp' in st)) throw new Error('ce n\'est pas une sauvegarde de cette application');
      const L = App.game.level(st.xp || 0);
      const days = Object.keys(st.daily || {}).sort();
      return {
        name: (st.settings && st.settings.name) || '',
        xp: st.xp || 0,
        level: L.level,
        title: L.title,
        lessons: Object.keys(st.lessons || {}).length,
        cards: Object.keys(st.cards || {}).length,
        errors: Object.keys(st.errors || {}).length,
        badges: Object.keys(st.badges || {}).length,
        exams: (st.exams || []).length,
        streak: (st.streak && st.streak.best) || 0,
        exportedAt: data.exportedAt ? new Date(data.exportedAt).getTime() : null,
        lastDay: days.length ? days[days.length - 1] : null
      };
    },

    /* Aperçu + confirmation, puis restauration */
    restoreFlow(text, after) {
      let p;
      try { p = backup.preview(text); }
      catch (e) { App.ui.toast('⚠️', '<b>Fichier invalide</b><div class="small muted">' + U.esc(e.message) + '.</div>', '', 4500); return; }
      const cur = App.store.state;
      const hasCurrent = cur.xp > 0;
      const m = App.ui.modal(`
        <div class="big-emoji">📂</div>
        <h2 class="center mt1">${p.name ? 'Sauvegarde de ' + U.esc(p.name) : 'Sauvegarde trouvée'}</h2>
        <p class="center muted small">${p.exportedAt ? 'Créée ' + U.ago(p.exportedAt) + ' (' + new Date(p.exportedAt).toLocaleDateString('fr-FR') + ')' : 'Date de création inconnue'}${p.lastDay ? ' · dernière révision le ' + U.fmtDay(p.lastDay) : ''}</p>
        <div class="bk-sum">
          <div><b>Niv. ${p.level}</b><small>${U.esc(p.title)}</small></div>
          <div><b>${U.fmtNum(p.xp)}</b><small>XP</small></div>
          <div><b>${p.lessons}</b><small>leçons</small></div>
          <div><b>${p.cards}</b><small>cartes vues</small></div>
          <div><b>${p.badges}</b><small>badges</small></div>
          <div><b>${p.exams}</b><small>examens</small></div>
        </div>
        ${hasCurrent ? `<div class="co trap mt2"><div class="co-h">⚠️ Attention</div>La progression actuelle de cet appareil (${U.fmtNum(cur.xp)} XP) sera <b>remplacée</b>. Si besoin, <a href="#" data-save-first>sauvegarde-la d'abord</a>.</div>` : ''}
        <div class="row mt2" style="justify-content:flex-end"><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-ok>✅ Restaurer</button></div>`);
      const sf = m.el.querySelector('[data-save-first]');
      if (sf) sf.addEventListener('click', (e) => { e.preventDefault(); backup.download(); });
      m.el.querySelector('[data-ok]').addEventListener('click', () => {
        try {
          App.store.importJSON(text);
        } catch (e) {
          App.ui.toast('⚠️', 'Restauration impossible : ' + U.esc(e.message));
          return;
        }
        const s = App.store.state.settings;
        s.onboarded = true;
        s.lastBackup = p.exportedAt || Date.now();
        App.store.saveNow();
        m.close();
        App.ui.applyTheme();
        App.ui.applyTypo();
        App.layout.applyNav();
        App.layout.refresh();
        App.fx.sound('level');
        App.fx.confetti(0.8);
        App.ui.toast('👋', `<b>Bon retour${p.name ? ', ' + U.esc(p.name) : ''} !</b><div class="small muted">Progression restaurée : niveau ${p.level}, ${U.fmtNum(p.xp)} XP.</div>`, '', 4500);
        if (after) after(true);
        if (location.hash === '#/' || location.hash === '' || location.hash === '#') App.router.resolve(); else App.router.go('/');
      });
    },

    /* Faut-il rappeler de sauvegarder ? */
    due() {
      const st = App.store.state;
      const every = st.settings.backupEvery == null ? 3 : st.settings.backupEvery;
      if (!every || st.xp < 30) return null;
      const now = Date.now();
      if (st.settings.backupSnooze && now < st.settings.backupSnooze) return null;
      const ref = st.settings.lastBackup || st.created || now;
      const days = Math.floor((now - ref) / DAY);
      return days >= every ? { days, never: !st.settings.lastBackup } : null;
    },

    reminderHtml() {
      const d = backup.due();
      if (!d) return '';
      const n = backup.name();
      return `<div class="bk-remind" id="bkRemind"><span class="bk-ico">💾</span>
        <div class="grow"><b>${n ? n + ', pense' : 'Pense'} à sauvegarder ta progression</b><div class="small muted">${d.never ? 'Tu n\'as encore jamais téléchargé de sauvegarde.' : 'Dernière sauvegarde il y a ' + d.days + ' jours.'} Elle te protège si le navigateur est effacé ou si tu changes d'appareil.</div></div>
        <div class="row"><button class="btn sm primary" data-bk-save>Sauvegarder</button><button class="btn sm ghost" data-bk-later>Plus tard</button></div></div>`;
    },

    bindReminder(root) {
      const box = root.querySelector('#bkRemind');
      if (!box) return;
      box.querySelector('[data-bk-save]').addEventListener('click', () => { backup.download(); box.remove(); });
      box.querySelector('[data-bk-later]').addEventListener('click', () => { App.store.state.settings.backupSnooze = Date.now() + DAY; App.store.save(); box.remove(); });
    },

    /* Choix de la fréquence des rappels */
    everyControl() {
      const cur = App.store.state.settings.backupEvery == null ? 3 : App.store.state.settings.backupEvery;
      return `<div class="seg" data-bk-every>${[[1, 'Chaque jour'], [3, 'Tous les 3 jours'], [7, 'Chaque semaine'], [0, 'Jamais']].map(([k, l]) => `<button type="button" data-v="${k}" class="${cur === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    },
    bindEvery(root) {
      U.$$('[data-bk-every] button', root).forEach((b) => b.addEventListener('click', () => {
        App.store.state.settings.backupEvery = +b.dataset.v;
        App.store.save();
        U.$$('[data-bk-every] button', root).forEach((x) => x.classList.toggle('on', x === b));
      }));
    },

    lastLabel() {
      const t = App.store.state.settings.lastBackup;
      return t ? U.ago(t) + ' (' + new Date(t).toLocaleDateString('fr-FR') + ')' : 'jamais';
    }
  });

  /* Glisser-déposer d'un fichier de sauvegarde n'importe où sur la fenêtre (PC) */
  let dragTimer = null;
  window.addEventListener('dragover', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    document.documentElement.classList.add('drop-on');
    clearTimeout(dragTimer);
    dragTimer = setTimeout(() => document.documentElement.classList.remove('drop-on'), 300);
  });
  window.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault();
    document.documentElement.classList.remove('drop-on');
    const f = e.dataTransfer.files[0];
    if (!/\.json$/i.test(f.name) && f.type !== 'application/json') { App.ui.toast('⚠️', 'Dépose un fichier de sauvegarde <b>.json</b>.'); return; }
    const open = document.querySelector('.modal-bg');
    if (open) open.remove();
    backup.readFile(f);
  });
})();
