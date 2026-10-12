/* Générateurs systèmes : chmod, umask, crontab, RAID, sauvegardes, disponibilité. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const G = App.gen;
  const md = App.md;
  const sym = (o, d) => App.sys.symbolic(o, d);

  /* Comparaison sémantique de lignes cron (5 champs) */
  function expand(f, lo, hi) {
    const out = new Set();
    f.split(',').forEach((part) => {
      let [range, step] = part.split('/');
      step = step ? +step : 1;
      let a = lo, b = hi;
      if (range !== '*') {
        if (range.includes('-')) [a, b] = range.split('-').map(Number);
        else { a = +range; b = step > 1 ? hi : a; }
      }
      for (let x = a; x <= b; x += step) out.add(x);
    });
    return out;
  }
  function cronSets(line) {
    const p = String(line).trim().split(/\s+/);
    if (p.length < 5) return null;
    try {
      const dow = expand(p[4], 0, 7);
      if (dow.has(7)) { dow.delete(7); dow.add(0); }
      return [expand(p[0], 0, 59), expand(p[1], 0, 23), expand(p[2], 1, 31), expand(p[3], 1, 12), dow];
    } catch (e) { return null; }
  }
  App.quiz.fieldCheckers.cron = (v, f) => {
    const a = cronSets(v), b = cronSets(f.a);
    if (!a || !b) return false;
    return a.every((s, i) => s.size === b[i].size && [...s].every((x) => b[i].has(x)));
  };

  G.register({
    id: 'chmod', mod: 's7', icon: '🔐', title: 'Droits Linux : rwx ↔ octal',
    desc: 'r = 4, w = 2, x = 1, plus SUID / SGID / sticky.',
    make(r, lvl) {
      const common = ['755', '644', '640', '750', '700', '600', '775', '664', '660', '770', '711', '444', '555', '751', '740', '604'];
      if (lvl === 3) {
        const o = r.pick(['4755', '2770', '1777', '2755', '3770', '4750', '1755', '2750', '6755']);
        const dir = /^[123]/.test(o) && o !== '4755';
        if (r.chance(0.5)) return { q: `Valeur octale de <b class="mono">${sym(o, dir)}</b> ?`, fields: [{ kind: 'text', a: o, ph: '4 chiffres' }], expl: expl(o, dir) };
        return { q: `Que donne <b class="mono">ls -l</b> pour un ${dir ? 'dossier' : 'fichier'} en <b>${o}</b> ? (10 caractères)`, fields: [{ kind: 'code', a: sym(o, dir), ph: dir ? 'drwx…' : '-rwx…' }], expl: expl(o, dir) };
      }
      const o = r.pick(common);
      if (lvl === 1 || r.chance(0.5)) return { q: `Valeur octale de <b class="mono">${sym(o).slice(1)}</b> ?`, fields: [{ kind: 'text', a: o, ph: 'ex. 750' }], expl: expl(o) };
      return { q: `Écris en symbolique (9 caractères rwx) le droit <b>${o}</b>.`, fields: [{ kind: 'code', a: sym(o).slice(1), ph: 'rwxr-x---' }], expl: expl(o) };
      function expl(oc, d) {
        const n = parseInt(oc, 8);
        const t = (v) => `${v & 4 ? 'r' : '-'}${v & 2 ? 'w' : '-'}${v & 1 ? 'x' : '-'} = ${v & 4 ? 4 : 0}+${v & 2 ? 2 : 0}+${v & 1 ? 1 : 0} = <b>${v}</b>`;
        const sp = (n >> 9) & 7;
        return md.ul([`Propriétaire : ${t((n >> 6) & 7)}`, `Groupe : ${t((n >> 3) & 7)}`, `Autres : ${t(n & 7)}`].concat(sp ? [`Spécial : ${sp & 4 ? 'SUID 4000 ' : ''}${sp & 2 ? 'SGID 2000 ' : ''}${sp & 1 ? 'sticky 1000' : ''} → s/t remplace le x (majuscule S/T si x absent)`] : [])) + `<p class="mono"><b>${sym(oc, d)}</b> = ${oc}</p>`;
      }
    },
    quick(r) {
      const o = r.pick(['755', '644', '640', '750', '700', '600', '775', '660']);
      return { q: `<b class="mono">${sym(o).slice(1)}</b> en octal ?`, fields: [{ kind: 'text', a: o }], expl: o };
    }
  });

  G.register({
    id: 'umask', mod: 's7', icon: '🎭', title: 'umask',
    desc: 'Droits par défaut : 666 (fichiers) et 777 (dossiers) moins le umask.',
    make(r) {
      const u = r.pick(['022', '027', '077', '002', '007', '026']);
      const f = (0o666 & ~parseInt(u, 8)).toString(8).padStart(3, '0'), d = (0o777 & ~parseInt(u, 8)).toString(8).padStart(3, '0');
      return {
        q: `Avec un <b>umask ${u}</b>, quels droits octaux aura un nouveau fichier ? Un nouveau dossier ?`,
        fields: [{ label: 'Fichier', kind: 'text', a: f }, { label: 'Dossier', kind: 'text', a: d }],
        expl: md.steps([`Fichier : 666 − ${u} → <b>${f}</b> (${sym(f).slice(1)})`, `Dossier : 777 − ${u} → <b>${d}</b> (${sym(d, true).slice(1)})`]) + md.trap('On part de 666 pour un fichier : un fichier n\'est jamais exécutable par défaut.')
      };
    },
    quick(r) {
      const u = r.pick(['022', '027', '077']);
      const f = (0o666 & ~parseInt(u, 8)).toString(8).padStart(3, '0');
      return { q: `umask ${u} → droits d'un nouveau fichier ?`, fields: [{ kind: 'text', a: f }], expl: f };
    }
  });

  const CRON = [
    ['30 23 * * *', 'tous les jours à 23 h 30'],
    ['0 2 * * *', 'tous les jours à 2 h 00'],
    ['*/15 8-17 * * 1-5', 'toutes les 15 minutes de 8 h à 17 h 45, du lundi au vendredi'],
    ['*/10 7-17 * * 1-5', 'toutes les 10 minutes de 7 h à 17 h 50, du lundi au vendredi'],
    ['0 6 1 * *', 'le 1er de chaque mois à 6 h'],
    ['0 0 * * 0', 'chaque dimanche à minuit'],
    ['0 21 * * 1-5', 'du lundi au vendredi à 21 h'],
    ['15 3 1,15 * *', 'le 1er et le 15 de chaque mois à 3 h 15'],
    ['0 */4 * * 6,0', 'toutes les 4 heures pile, le samedi et le dimanche'],
    ['45 12 * * 5', 'chaque vendredi à 12 h 45'],
    ['0 8 * 1 *', 'tous les jours de janvier à 8 h'],
    ['5 0 * * *', 'tous les jours à 0 h 05'],
    ['0 18 * * 1', 'chaque lundi à 18 h'],
    ['30 7 * * 1,3,5', 'lundi, mercredi et vendredi à 7 h 30']
  ];
  G.register({
    id: 'cron-read', mod: 's7', icon: '⏰', title: 'Crontab : lire et écrire',
    desc: 'minute · heure · jour du mois · mois · jour de semaine (0 = dimanche).',
    make(r, lvl) {
      const c = r.pick(CRON);
      if (lvl === 1 || (lvl === 2 && r.chance(0.5))) {
        const others = r.shuffle(CRON.filter((x) => x !== c)).slice(0, 3);
        const ch = r.shuffle([c].concat(others));
        return { type: 'qcm', q: `Que signifie <b class="mono">${c[0]} /opt/script.sh</b> ?`, choices: ch.map((x) => x[1]), a: ch.indexOf(c), expl: md.table(['min', 'heure', 'jour mois', 'mois', 'jour sem.'], [c[0].split(' ')]) + md.trap('L\'ordre est minute PUIS heure : « 0 2 » = 2 h 00, pas 0 h 02.') };
      }
      return {
        q: `Écris les <b>5 champs</b> de crontab pour exécuter une tâche <b>${c[1]}</b>.`,
        fields: [{ kind: 'cron', a: c[0], ph: 'min heure jm mois js', wide: true }],
        expl: `<p class="mono"><b>${c[0]}</b></p>` + md.table(['Champ', 'Valeurs'], [['minute', '0-59'], ['heure', '0-23'], ['jour du mois', '1-31'], ['mois', '1-12'], ['jour de la semaine', '0-7 (0 et 7 = dimanche, 1 = lundi)']]) + md.tip('*/15 = toutes les 15 · 1-5 = du lundi au vendredi · 1,15 = le 1er et le 15.')
      };
    },
    quick(r) {
      const c = r.pick(CRON);
      const others = r.shuffle(CRON.filter((x) => x !== c)).slice(0, 3);
      const ch = r.shuffle([c].concat(others));
      return { type: 'qcm', q: `<b class="mono">${c[0]}</b> = ?`, choices: ch.map((x) => x[1]), a: ch.indexOf(c), expl: c[1] };
    }
  });

  G.register({
    id: 'raid', mod: 's8', icon: '💽', title: 'RAID : capacité et pannes',
    desc: 'RAID 0 / 1 / 5 / 6 / 10.',
    make(r, lvl) {
      const n = r.pick([4, 4, 6, 6, 8]), s = r.pick([1, 2, 4, 8]);
      const L = [['RAID 0', n * s, 0], ['RAID 5', (n - 1) * s, 1], ['RAID 6', (n - 2) * s, 2], ['RAID 10', (n / 2) * s, 1], ['RAID 1', (n / 2) * s, 1]];
      const x = lvl === 1 ? r.pick(L.slice(0, 3)) : r.pick(L);
      return {
        q: `<b>${n} disques de ${s} To</b> en <b>${x[0]}</b> : capacité utile (To) et nombre de pannes de disque tolérées (garanties) ?`,
        fields: [{ label: 'Capacité (To)', kind: 'num', a: x[1] }, { label: 'Pannes tolérées', kind: 'num', a: x[2] }],
        expl: md.table(['RAID', 'Capacité', 'Pannes'], [['0', 'N', '0'], ['1', 'N/2', '1 par miroir'], ['5', 'N − 1', '1'], ['6', 'N − 2', '2'], ['10', 'N/2', '1 garantie (jusqu\'à N/2)']]) + `<p>${x[0]} avec ${n} × ${s} To → <b>${x[1]} To</b>, <b>${x[2]}</b> panne(s).</p>`
      };
    }
  });

  G.register({
    id: 'backup', mod: 's8', icon: '🗄️', title: 'Sauvegardes : que restaurer ?',
    desc: 'Complète, incrémentielle, différentielle, données perdues.',
    make(r) {
      const J = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const full = r.pick([0, 6]);
      const failDay = (full + r.int(2, 5)) % 7;
      const h = r.pick([20, 22]);
      const failH = r.pick([9, 10, 11, 14, 15]);
      const type = r.pick(['incrémentielles', 'différentielles']);
      const days = [];
      for (let d = (full + 1) % 7; d !== failDay; d = (d + 1) % 7) days.push(J[d]);
      const last = days[days.length - 1];
      const lost = 24 - h + failH;
      const good = type === 'incrémentielles' ? `La complète de ${J[full]} + les incrémentielles de ${days.join(', ')} (dans l'ordre)` : `La complète de ${J[full]} + la différentielle de ${last} seulement`;
      const bad1 = type === 'incrémentielles' ? `La complète de ${J[full]} + l'incrémentielle de ${last} seulement` : `La complète de ${J[full]} + toutes les différentielles (${days.join(', ')})`;
      const ch = [good, bad1, `La dernière sauvegarde (${last}) seulement`, `La complète de ${J[full]} seulement`];
      return {
        q: `Complète le <b>${J[full]}</b> à ${h} h, puis des <b>${type}</b> chaque soir à ${h} h. Le disque tombe en panne le <b>${J[failDay]} à ${failH} h</b>. Que faut-il restaurer, et combien d'heures de données sont perdues ?`,
        type: 'input',
        fields: [{ label: 'À restaurer', kind: 'select', opts: ch, a: 0, wide: true }, { label: 'Heures perdues', kind: 'num', a: lost }],
        expl: md.ul(['<b>Incrémentielle</b> = depuis la dernière sauvegarde (quelle qu\'elle soit) → restaurer la complète + TOUTES les incrémentielles.', '<b>Différentielle</b> = depuis la dernière complète → restaurer la complète + la DERNIÈRE différentielle.']) + `<p>Perte : du ${last} ${h} h au ${J[failDay]} ${failH} h = <b>${lost} h</b> (le RPO de 24 h est ${lost <= 24 ? 'respecté' : 'dépassé'}).</p>`
      };
    }
  });

  G.register({
    id: 'dispo', mod: 's8', icon: '⏱️', title: 'Disponibilité (%)',
    desc: '99 % = 3,65 j · 99,9 % = 8,76 h · 99,99 % = 52,6 min par an.',
    make(r) {
      const x = r.pick([[99, 87.6, 'h'], [99.5, 43.8, 'h'], [99.9, 8.76, 'h'], [99.99, 52.56, 'min'], [99.95, 4.38, 'h']]);
      return {
        q: `Un contrat garantit <b>${U.fmtNum(x[0])} %</b> de disponibilité. Combien d'arrêt est autorisé par an (en ${x[2] === 'h' ? 'heures' : 'minutes'}) ?`,
        fields: [{ kind: 'num', a: x[1], rel: 0.02, show: U.fmtNum(x[1]) + ' ' + x[2] }],
        expl: md.f(`(100 − ${U.fmtNum(x[0])}) % × 8 760 h = <b class="hl">${U.fmtNum(x[1])} ${x[2]}</b>`) + '<p>Une année = 365 × 24 = 8 760 h = 525 600 min.</p>'
      };
    }
  });
})();
