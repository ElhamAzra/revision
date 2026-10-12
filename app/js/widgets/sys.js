/* Widgets systèmes : calculateur chmod, traducteur crontab, calculateur RAID. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const W = App.widgets;
  const md = App.md;

  /* Conversion octale → chaîne symbolique (avec s/S/t/T) */
  function symbolic(oct, isDir) {
    const n = parseInt(oct, 8);
    const sp = (n >> 9) & 7, u = (n >> 6) & 7, g = (n >> 3) & 7, o = n & 7;
    const tri = (v) => [(v & 4 ? 'r' : '-'), (v & 2 ? 'w' : '-'), (v & 1 ? 'x' : '-')];
    const U3 = tri(u), G3 = tri(g), O3 = tri(o);
    if (sp & 4) U3[2] = u & 1 ? 's' : 'S';
    if (sp & 2) G3[2] = g & 1 ? 's' : 'S';
    if (sp & 1) O3[2] = o & 1 ? 't' : 'T';
    return (isDir ? 'd' : '-') + U3.join('') + G3.join('') + O3.join('');
  }
  App.sys = { symbolic };

  W.register('chmod', (el) => {
    el.classList.add('widget');
    const who = ['Propriétaire (u)', 'Groupe (g)', 'Autres (o)'];
    const perms = [['r', 4, 'lire'], ['w', 2, 'écrire'], ['x', 1, 'exécuter']];
    el.innerHTML = `
      <div class="w-h">🔐 Calculateur chmod</div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th></th>${perms.map((p) => `<th class="center">${p[0]} (${p[1]})<br><span class="tiny">${p[2]}</span></th>`).join('')}<th class="center">Total</th></tr></thead>
      <tbody>${who.map((w, i) => `<tr><td><b>${w}</b></td>${perms.map((p, j) => `<td class="center"><input type="checkbox" data-c="${i}${j}" style="width:22px;height:22px;accent-color:var(--primary)"></td>`).join('')}<td class="center mono" data-t="${i}"><b>0</b></td></tr>`).join('')}</tbody></table></div>
      <div class="row">
        <label class="switch"><input type="checkbox" data-sp="4"> SUID (4000)</label>
        <label class="switch"><input type="checkbox" data-sp="2"> SGID (2000)</label>
        <label class="switch"><input type="checkbox" data-sp="1"> Sticky (1000)</label>
        <label class="switch"><input type="checkbox" data-dir> Dossier</label>
      </div>
      <div class="row mt2" style="align-items:flex-end">
        <div><label class="lbl">Octal</label><input class="input mono" style="width:120px;font-size:1.3rem;font-weight:800" data-oct value="750"></div>
        <div class="grow"><div class="tiny muted">Affichage ls -l</div><div class="bignum" style="font-size:1.7rem" data-sym></div></div>
      </div>
      <div data-cmd class="mt1"></div>`;
    let lock = false;
    const fromBoxes = () => {
      let sp = 0;
      U.$$('[data-sp]', el).forEach((c) => { if (c.checked) sp |= +c.dataset.sp; });
      const t = [0, 1, 2].map((i) => [0, 1, 2].reduce((a, j) => a + (el.querySelector(`[data-c="${i}${j}"]`).checked ? perms[j][1] : 0), 0));
      return (sp ? String(sp) : '') + t.join('');
    };
    const show = (oct) => {
      const isDir = el.querySelector('[data-dir]').checked;
      const n = parseInt(oct, 8);
      [0, 1, 2].forEach((i) => el.querySelector(`[data-t="${i}"]`).innerHTML = `<b>${(n >> (6 - 3 * i)) & 7}</b>`);
      el.querySelector('[data-sym]').textContent = symbolic(oct, isDir);
      const sp = (n >> 9) & 7;
      const notes = [];
      if (sp & 4) notes.push('<b>SUID</b> : le programme s\'exécute avec les droits de son propriétaire (ex. /usr/bin/passwd).');
      if (sp & 2) notes.push(isDir ? '<b>SGID sur dossier</b> : les fichiers créés héritent du groupe du dossier.' : '<b>SGID</b> : exécution avec les droits du groupe.');
      if (sp & 1) notes.push('<b>Sticky bit</b> : dans ce dossier, chacun ne peut supprimer que ses propres fichiers (/tmp = 1777).');
      if (/[ST]/.test(symbolic(oct, isDir))) notes.push('Majuscule (S ou T) = droit spécial posé mais x absent en dessous.');
      el.querySelector('[data-cmd]').innerHTML = md.code(`chmod ${oct} ${isDir ? 'dossier' : 'fichier'}\nchmod u=${sym3(n >> 6)},g=${sym3(n >> 3)},o=${sym3(n)} ${isDir ? 'dossier' : 'fichier'}`) + (notes.length ? md.ul(notes) : '');
    };
    const sym3 = (v) => (v & 4 ? 'r' : '') + (v & 2 ? 'w' : '') + (v & 1 ? 'x' : '');
    const toBoxes = (oct) => {
      const n = parseInt(oct, 8);
      [0, 1, 2].forEach((i) => [0, 1, 2].forEach((j) => (el.querySelector(`[data-c="${i}${j}"]`).checked = !!(((n >> (6 - 3 * i)) & 7) & perms[j][1]))));
      U.$$('[data-sp]', el).forEach((c) => (c.checked = !!(((n >> 9) & 7) & +c.dataset.sp)));
    };
    U.$$('input[type=checkbox]', el).forEach((c) => c.addEventListener('change', () => {
      if (c.hasAttribute('data-dir')) return show(el.querySelector('[data-oct]').value || '0');
      const oct = fromBoxes();
      el.querySelector('[data-oct]').value = oct;
      show(oct);
    }));
    el.querySelector('[data-oct]').addEventListener('input', (e) => {
      const v = e.target.value.trim();
      if (/^[0-7]{3,4}$/.test(v)) { toBoxes(v); show(v); }
    });
    toBoxes('750');
    show('750');
  });

  /* ---------- Traducteur crontab ---------- */
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const MOIS = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function fieldFr(v, unit, names) {
    if (v === '*') return null;
    const nm = (x) => (names ? names[+x] : x);
    if (/^\*\/\d+$/.test(v)) return `toutes les ${v.slice(2)} ${unit}`;
    if (/^\d+-\d+\/\d+$/.test(v)) { const [r, s] = v.split('/'); const [a, b] = r.split('-'); return `toutes les ${s} ${unit} de ${nm(a)} à ${nm(b)}`; }
    if (/^\d+-\d+$/.test(v)) { const [a, b] = v.split('-'); return `de ${nm(a)} à ${nm(b)}`; }
    if (/^[\d,]+$/.test(v)) return v.split(',').map(nm).join(', ');
    return v;
  }
  function cronFr(line) {
    const p = line.trim().split(/\s+/);
    if (p.length < 5) return null;
    const [mi, h, dom, mon, dow] = p;
    const cmd = p.slice(5).join(' ');
    let when;
    if (/^\d+$/.test(mi) && /^\d+$/.test(h)) when = `à ${h} h ${mi.padStart(2, '0')}`;
    else if (/^\d+$/.test(mi) && h === '*') when = `à la minute ${mi} de chaque heure`;
    else if (/^\d+$/.test(mi)) when = `à la minute ${mi}, heures : ${fieldFr(h, 'heures')}`;
    else if (mi === '*' && h === '*') when = 'chaque minute';
    else when = `minutes : ${fieldFr(mi, 'minutes') || 'chaque minute'}${h !== '*' ? ', heures : ' + fieldFr(h, 'heures') : ''}`;
    const parts = [when];
    if (dom !== '*') parts.push(`le(s) ${fieldFr(dom, 'jours')} du mois`);
    if (mon !== '*') parts.push(`en ${fieldFr(mon, 'mois', MOIS)}`);
    if (dow !== '*') parts.push(`(${fieldFr(dow, 'jours', JOURS)})`);
    if (dom === '*' && dow === '*') parts.push('tous les jours');
    return { text: parts.join(' '), cmd };
  }
  App.sys.cronFr = cronFr;

  W.register('cron', (el) => {
    el.classList.add('widget');
    const ex = ['30 23 * * * /opt/sauvegarde.sh', '*/10 7-17 * * 1-5 /opt/verif_liens.sh', '0 6 1 * * /opt/rapport_mensuel.sh', '0 0 * * 0 /opt/purge.sh', '0 */4 * * 6,0 /opt/sync.sh', '15 3 1,15 * * /opt/stats.sh'];
    el.innerHTML = `
      <div class="w-h">⏰ Traducteur crontab</div>
      <input class="input mono" data-l value="${ex[1]}">
      <div class="row mt1">${ex.map((e) => `<button class="btn sm ghost mono" data-ex="${U.esc(e)}">${U.esc(e.split(' ').slice(0, 5).join(' '))}</button>`).join('')}</div>
      <div data-o class="mt1"></div>
      ${md.table(['min', 'heure', 'jour du mois', 'mois', 'jour sem.', 'commande'], [['0-59', '0-23', '1-31', '1-12', '0-7 (0 et 7 = dimanche)', 'chemin absolu']])}`;
    const render = () => {
      const r = cronFr(el.querySelector('[data-l]').value);
      el.querySelector('[data-o]').innerHTML = r ? `<div class="co key"><div class="co-h">🗣️ En français</div><b>${r.text}</b>${r.cmd ? ` : exécuter <code>${U.esc(r.cmd)}</code>` : ''}.</div>` : '<p class="ko-t small">Il faut 5 champs + la commande.</p>';
    };
    el.querySelector('[data-l]').addEventListener('input', render);
    U.$$('[data-ex]', el).forEach((b) => b.addEventListener('click', () => { el.querySelector('[data-l]').value = b.dataset.ex; render(); }));
    render();
  });

  /* ---------- Calculateur RAID ---------- */
  W.register('raid', (el) => {
    el.classList.add('widget');
    el.innerHTML = `
      <div class="w-h">💽 Calculateur RAID</div>
      <div class="grid c2"><div><label class="lbl">Nombre de disques (N)</label><input class="input mono" data-n value="6"></div><div><label class="lbl">Taille d'un disque (To)</label><input class="input mono" data-s value="4"></div></div>
      <div data-o class="mt1"></div>`;
    const render = () => {
      const n = Math.floor(U.parseNum(el.querySelector('[data-n]').value) || 0), s = U.parseNum(el.querySelector('[data-s]').value) || 0;
      const L = [
        ['RAID 0', 'Agrégat (striping)', 2, n * s, '0', 'Performances, aucune sécurité'],
        ['RAID 1', 'Miroir', 2, (n / 2) * s, '1 par miroir', 'Système, petits serveurs'],
        ['RAID 5', 'Parité répartie', 3, (n - 1) * s, '1', 'Lectures, capacité ; écritures pénalisées'],
        ['RAID 6', 'Double parité', 4, (n - 2) * s, '2 (n\'importe lesquels)', 'Gros volumes de fichiers'],
        ['RAID 10', 'Miroirs agrégés', 4, (n / 2) * s, '1 garanti (jusqu\'à N/2)', 'Bases de données, écritures intensives']
      ];
      el.querySelector('[data-o]').innerHTML = md.table(['Niveau', 'Principe', 'Min.', 'Capacité utile', 'Pannes tolérées', 'Usage'],
        L.map((r) => [`<b>${r[0]}</b>`, r[1], r[2], n >= r[2] && !(r[0] === 'RAID 10' && n % 2) && !(r[0] === 'RAID 1' && n % 2) ? `<b class="pri-t">${U.fmtNum(r[3])} To</b>` : '<span class="muted">—</span>', r[4], `<span class="small">${r[5]}</span>`])) +
        md.trap('RAID ≠ sauvegarde : une suppression, un rançongiciel ou un incendie touchent tous les disques en même temps.');
    };
    U.$$('input', el).forEach((x) => x.addEventListener('input', render));
    render();
  });
})();
