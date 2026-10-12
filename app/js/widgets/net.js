/* Widgets réseau : simulateur de switch, élection STP, calculateur TCP, simulateur d'ACL. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const IP = App.ip;
  const W = App.widgets;

  /* ---------- Simulateur de switch (table MAC) ---------- */
  W.register('switchsim', (el) => {
    el.classList.add('widget');
    const pcs = [{ n: 'A', mac: 'AA' }, { n: 'B', mac: 'BB' }, { n: 'C', mac: 'CC' }, { n: 'D', mac: 'DD' }];
    let table = {};
    el.innerHTML = `
      <div class="w-h">🔀 Simulateur de switch — envoie des trames et observe la table MAC</div>
      <div class="sw-ports">${pcs.map((p, i) => `<div class="sw-port" data-p="${i}"><div class="pc">🖥️</div><b>PC-${p.n}</b><div class="tiny muted mono">MAC ${p.mac} · port ${i + 1}</div></div>`).join('')}</div>
      <div class="row mt2">
        <label class="small">De <select class="input" style="width:auto;display:inline-block" data-src>${pcs.map((p, i) => `<option value="${i}">PC-${p.n}</option>`).join('')}</select></label>
        <label class="small">vers <select class="input" style="width:auto;display:inline-block" data-dst>${pcs.map((p, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>PC-${p.n}</option>`).join('')}<option value="bc">Broadcast (FF:FF…)</option></select></label>
        <button class="btn primary sm" data-send>📨 Envoyer la trame</button>
        <button class="btn sm ghost" data-reset>↺ Redémarrer le switch</button>
      </div>
      <div class="grid c2 mt2">
        <div><div class="small" style="font-weight:800">Table MAC (CAM)</div><div data-tbl></div></div>
        <div class="seq-note" data-note>La table est vide au démarrage : le switch ne sait encore rien.</div>
      </div>`;
    const ports = U.$$('.sw-port', el);
    const draw = () => {
      const rows = Object.entries(table);
      el.querySelector('[data-tbl]').innerHTML = rows.length ? App.md.table(['MAC', 'Port'], rows.map(([mac, p]) => [`<span class="mono">${mac}</span>`, `<b>${p + 1}</b>`])) : '<p class="small muted">(vide)</p>';
    };
    el.querySelector('[data-send]').addEventListener('click', () => {
      const s = +el.querySelector('[data-src]').value;
      const dv = el.querySelector('[data-dst]').value;
      if (dv !== 'bc' && +dv === s) { el.querySelector('[data-note]').textContent = 'Choisis une destination différente de la source.'; return; }
      ports.forEach((p) => p.classList.remove('tx', 'flood', 'drop'));
      const learned = table[pcs[s].mac] == null;
      table[pcs[s].mac] = s;
      let msg = `1) <b>Apprentissage</b> : MAC source ${pcs[s].mac} → port ${s + 1} ${learned ? '(ajoutée)' : '(déjà connue, minuterie remise à zéro)'}.<br>`;
      if (dv === 'bc') {
        ports.forEach((p, i) => p.classList.add(i === s ? 'drop' : 'flood'));
        msg += '2) Destination <b>broadcast</b> → <b>inondation</b> sur tous les ports sauf celui d\'arrivée.';
      } else {
        const d = +dv;
        const known = table[pcs[d].mac];
        if (known != null) {
          ports.forEach((p, i) => p.classList.add(i === known ? 'tx' : 'drop'));
          msg += `2) MAC destination ${pcs[d].mac} <b>connue</b> (port ${known + 1}) → <b>filtrage</b> : envoi sur ce seul port.`;
        } else {
          ports.forEach((p, i) => p.classList.add(i === s ? 'drop' : 'flood'));
          msg += `2) MAC destination ${pcs[d].mac} <b>inconnue</b> → <b>inondation</b> (ports ${pcs.map((_, i) => i).filter((i) => i !== s).map((i) => i + 1).join(', ')}).`;
        }
      }
      el.querySelector('[data-note]').innerHTML = msg;
      App.fx.sound('tick');
      draw();
    });
    el.querySelector('[data-reset]').addEventListener('click', () => { table = {}; ports.forEach((p) => p.classList.remove('tx', 'flood', 'drop')); el.querySelector('[data-note]').textContent = 'Table vidée (comme après un redémarrage ou 300 s d\'inactivité).'; draw(); });
    draw();
  });

  /* ---------- Élection STP (triangle de 3 switchs) ---------- */
  W.register('stp', (el) => {
    el.classList.add('widget');
    const COST = { '10M': 100, '100M': 19, '1G': 4, '10G': 2 };
    const sw = [
      { n: 'SW1', prio: 32768, mac: '0011.1111.1111' },
      { n: 'SW2', prio: 4096, mac: '0011.2222.2222' },
      { n: 'SW3', prio: 32768, mac: '0011.0000.0001' }
    ];
    const links = [{ a: 0, b: 1, sp: '1G' }, { a: 0, b: 2, sp: '1G' }, { a: 1, b: 2, sp: '1G' }];
    el.innerHTML = `
      <div class="w-h">🌳 Élection STP — modifie priorités, MAC et débits</div>
      <div class="grid c3">${sw.map((s, i) => `<div class="card" style="padding:.7rem"><b>${s.n}</b><label class="lbl mt1">Priorité</label><select class="input" data-prio="${i}">${[0, 4096, 8192, 16384, 24576, 28672, 32768, 36864, 61440].map((p) => `<option ${p === s.prio ? 'selected' : ''}>${p}</option>`).join('')}</select><label class="lbl mt1">MAC</label><input class="input mono" data-mac="${i}" value="${s.mac}"></div>`).join('')}</div>
      <div class="row mt1">${links.map((l, i) => `<label class="small">${sw[l.a].n}–${sw[l.b].n} <select class="input" style="width:auto;display:inline-block" data-sp="${i}">${Object.keys(COST).map((k) => `<option ${k === l.sp ? 'selected' : ''}>${k}</option>`).join('')}</select></label>`).join('')}</div>
      <div data-svg class="mt1"></div>
      <div data-out></div>`;
    const bid = (s) => [s.prio, s.mac.toLowerCase().replace(/[^0-9a-f]/g, '')];
    const cmp = (x, y) => { const a = bid(x), b = bid(y); return a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0); };
    const render = () => {
      sw.forEach((s, i) => { s.prio = +el.querySelector(`[data-prio="${i}"]`).value; s.mac = el.querySelector(`[data-mac="${i}"]`).value; });
      links.forEach((l, i) => (l.sp = el.querySelector(`[data-sp="${i}"]`).value));
      const root = [0, 1, 2].sort((a, b) => cmp(sw[a], sw[b]))[0];
      const lc = (a, b) => COST[links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)).sp];
      const rpc = [0, 1, 2].map((i) => {
        if (i === root) return 0;
        const other = [0, 1, 2].find((x) => x !== i && x !== root);
        return Math.min(lc(i, root), lc(i, other) + lc(other, root));
      });
      // rôles : role[link][end]
      const roles = links.map(() => ['', '']);
      const rootPort = {};
      [0, 1, 2].filter((i) => i !== root).forEach((i) => {
        const cands = [0, 1, 2].filter((x) => x !== i).map((y) => ({ y, c: lc(i, y) + rpc[y] }));
        cands.sort((p, q) => p.c - q.c || cmp(sw[p.y], sw[q.y]));
        rootPort[i] = cands[0].y;
      });
      links.forEach((l, k) => {
        const ends = [l.a, l.b];
        ends.forEach((s, e) => { if (rootPort[s] === ends[1 - e]) roles[k][e] = 'R'; });
        // port désigné du segment
        const d = rpc[l.a] !== rpc[l.b] ? (rpc[l.a] < rpc[l.b] ? 0 : 1) : (cmp(sw[l.a], sw[l.b]) < 0 ? 0 : 1);
        if (!roles[k][d]) roles[k][d] = 'D';
        ends.forEach((s, e) => { if (!roles[k][e]) roles[k][e] = 'B'; });
      });
      const pos = [[60, 30], [300, 30], [180, 190]];
      const col = { R: '#10a861', D: '#5b4bff', B: '#e5383b' };
      const lbl = { R: 'racine', D: 'désigné', B: 'bloqué' };
      el.querySelector('[data-svg]').innerHTML = `<svg viewBox="0 0 360 230" style="width:100%;max-width:520px;display:block;margin:auto">
        ${links.map((l, k) => { const [x1, y1] = pos[l.a], [x2, y2] = pos[l.b]; const blocked = roles[k].includes('B');
          const p1 = [x1 + (x2 - x1) * 0.22, y1 + (y2 - y1) * 0.22], p2 = [x1 + (x2 - x1) * 0.78, y1 + (y2 - y1) * 0.78];
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${blocked ? '#e5383b' : 'currentColor'}" stroke-width="3" ${blocked ? 'stroke-dasharray="6 5"' : ''} opacity=".7"/>
            <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" font-size="11" text-anchor="middle" fill="currentColor">${l.sp} · coût ${COST[l.sp]}</text>
            <circle cx="${p1[0]}" cy="${p1[1]}" r="10" fill="${col[roles[k][0]]}"/><text x="${p1[0]}" y="${p1[1] + 4}" font-size="11" text-anchor="middle" fill="#fff" font-weight="700">${roles[k][0]}</text>
            <circle cx="${p2[0]}" cy="${p2[1]}" r="10" fill="${col[roles[k][1]]}"/><text x="${p2[0]}" y="${p2[1] + 4}" font-size="11" text-anchor="middle" fill="#fff" font-weight="700">${roles[k][1]}</text>`; }).join('')}
        ${sw.map((s, i) => `<g><rect x="${pos[i][0] - 34}" y="${pos[i][1] - 17}" width="68" height="34" rx="9" fill="${i === root ? '#ffb020' : '#5b4bff'}"/><text x="${pos[i][0]}" y="${pos[i][1] + 5}" font-size="13" text-anchor="middle" fill="#fff" font-weight="800">${i === root ? '👑 ' : ''}${s.n}</text></g>`).join('')}
      </svg>
      <div class="legend" style="justify-content:center"><span><i style="background:#10a861"></i>R = port racine</span><span><i style="background:#5b4bff"></i>D = port désigné</span><span><i style="background:#e5383b"></i>B = bloqué</span></div>`;
      el.querySelector('[data-out]').innerHTML = App.md.steps([
        `Pont racine = plus petit Bridge ID (priorité puis MAC) → <b>${sw[root].n}</b> (${sw[root].prio} + ${sw[root].mac}).`,
        ...[0, 1, 2].filter((i) => i !== root).map((i) => `${sw[i].n} : coût vers la racine = <b>${rpc[i]}</b> → port racine vers <b>${sw[rootPort[i]].n}</b>.`),
        'Sur chaque lien : le port du switch le plus proche de la racine est désigné (égalité → plus petit Bridge ID). Les autres sont bloqués.'
      ]) + `<p class="small">${links.map((l, k) => `${sw[l.a].n}–${sw[l.b].n} : ${sw[l.a].n} ${lbl[roles[k][0]]}, ${sw[l.b].n} ${lbl[roles[k][1]]}`).join(' · ')}</p>`;
    };
    U.$$('select, input', el).forEach((x) => x.addEventListener('input', render));
    U.$$('select', el).forEach((x) => x.addEventListener('change', render));
    render();
  });

  /* ---------- Calculateur TCP ---------- */
  W.register('tcpcalc', (el) => {
    el.classList.add('widget');
    el.innerHTML = `
      <div class="w-h">🤝 Numéros de séquence et d'acquittement</div>
      <div class="grid c3">
        <div><label class="lbl">ISN client</label><input class="input mono" data-c value="1000"></div>
        <div><label class="lbl">ISN serveur</label><input class="input mono" data-s value="5000"></div>
        <div><label class="lbl">Octets : requête client / réponse serveur</label><div class="row nowrap"><input class="input mono" data-q value="500"><input class="input mono" data-r value="1460"></div></div>
      </div>
      <div data-t class="mt1"></div>
      <hr>
      <div class="w-h">🛰️ Débit maximal d'une connexion = fenêtre ÷ RTT</div>
      <div class="grid c3">
        <div><label class="lbl">Fenêtre (octets)</label><input class="input mono" data-w value="65535"></div>
        <div><label class="lbl">RTT (ms)</label><input class="input mono" data-rtt value="600"></div>
        <div><label class="lbl">Débit visé (Mbit/s)</label><input class="input mono" data-target value="10"></div>
      </div>
      <div data-o class="mt1"></div>`;
    const num = (k) => U.parseNum(el.querySelector(k).value) || 0;
    const render = () => {
      const c = num('[data-c]'), s = num('[data-s]'), q = num('[data-q]'), r = num('[data-r]');
      const rows = [
        ['1', 'Client → Serveur', 'SYN', c, '—', 0],
        ['2', 'Serveur → Client', 'SYN, ACK', s, c + 1, 0],
        ['3', 'Client → Serveur', 'ACK', c + 1, s + 1, 0],
        ['4', 'Client → Serveur', 'PSH, ACK (requête)', c + 1, s + 1, q],
        ['5', 'Serveur → Client', 'ACK (réponse)', s + 1, c + 1 + q, r],
        ['6', 'Client → Serveur', 'ACK', c + 1 + q, s + 1 + r, 0]
      ];
      el.querySelector('[data-t]').innerHTML = App.md.table(['#', 'Sens', 'Drapeaux', 'seq', 'ack', 'Données'], rows.map((x) => [x[0], x[1], x[2], `<b>${U.fmtNum(x[3])}</b>`, typeof x[4] === 'number' ? `<b>${U.fmtNum(x[4])}</b>` : x[4], x[5]]), { mono: [3, 4, 5] }) +
        '<p class="small muted mb0">Règle : ACK = séquence reçue + nombre d\'octets reçus (le SYN et le FIN comptent pour 1).</p>';
      const w = num('[data-w]'), rtt = num('[data-rtt]') / 1000, tg = num('[data-target]');
      const d = rtt ? (w * 8) / rtt : 0;
      const need = (tg * 1e6 * rtt) / 8;
      el.querySelector('[data-o]').innerHTML = App.md.f(`Débit<sub>max</sub> = ${App.md.frac(U.fmtNum(w) + ' × 8', U.fmtNum(rtt) + ' s')} ≈ <b class="hl">${d >= 1e6 ? U.fmtNum(d / 1e6, 2) + ' Mbit/s' : U.fmtNum(d / 1000, 0) + ' kbit/s'}</b>`) +
        `<p class="small">Pour atteindre ${U.fmtNum(tg)} Mbit/s il faudrait une fenêtre de ${U.fmtNum(Math.round(need))} octets (${U.fmtNum(need / 1024, 0)} Ko) → option <b>window scaling</b>.</p>`;
    };
    U.$$('input', el).forEach((x) => x.addEventListener('input', render));
    render();
  });

  /* ---------- Simulateur d'ACL Cisco ---------- */
  function parseAddr(tok, i) {
    // retourne [ {net, wild} , nextIndex ]
    const t = tok[i];
    if (t === 'any') return [{ net: 0, wild: 0xffffffff }, i + 1];
    if (t === 'host') return [{ net: IP.parse(tok[i + 1]), wild: 0 }, i + 2];
    const a = IP.parse(t);
    const w = IP.parse(tok[i + 1] || '');
    if (a != null && w != null && /^\d/.test(tok[i + 1])) return [{ net: a, wild: w }, i + 2];
    if (a != null) return [{ net: a, wild: 0 }, i + 1];
    throw new Error('adresse illisible : ' + t);
  }
  const matchAddr = (spec, ip) => ((ip & ~spec.wild) >>> 0) === ((spec.net & ~spec.wild) >>> 0);
  const PORTS = { www: 80, http: 80, https: 443, ssh: 22, telnet: 23, smtp: 25, domain: 53, ftp: 21, 'ftp-data': 20, bootps: 67, bootpc: 68, tftp: 69, ntp: 123, snmp: 161 };
  function parseLine(line) {
    let tok = line.trim().replace(/\s+/g, ' ').split(' ');
    if (tok[0] === 'access-list') {
      const num = +tok[1];
      tok = tok.slice(2);
      tok.std = num >= 1 && num <= 99 || num >= 1300 && num <= 1999;
    }
    const action = tok[0];
    if (action !== 'permit' && action !== 'deny') return null;
    const rule = { action, raw: line.trim() };
    let i = 1;
    const protos = ['ip', 'tcp', 'udp', 'icmp'];
    if (!protos.includes(tok[1])) {
      // standard
      const [src] = parseAddr(tok, 1);
      rule.std = true; rule.src = src;
      return rule;
    }
    rule.proto = tok[1]; i = 2;
    let r1 = parseAddr(tok, i); rule.src = r1[0]; i = r1[1];
    if (tok[i] === 'eq') { rule.sport = PORTS[tok[i + 1]] || +tok[i + 1]; i += 2; }
    let r2 = parseAddr(tok, i); rule.dst = r2[0]; i = r2[1];
    if (tok[i] === 'eq') { rule.dport = PORTS[tok[i + 1]] || +tok[i + 1]; i += 2; }
    if (tok[i] === 'established') rule.est = true;
    return rule;
  }
  W.register('aclsim', (el, d) => {
    el.classList.add('widget');
    el.innerHTML = `
      <div class="w-h">🧱 Simulateur d'ACL — lecture de haut en bas, première correspondance</div>
      <label class="lbl">ACL (syntaxe Cisco, une règle par ligne)</label>
      <textarea class="input mono" rows="6" data-acl>${U.esc(d.acl || 'permit tcp any host 10.20.3.194 eq 80\npermit tcp any host 10.20.3.194 eq 443\npermit tcp 10.20.0.0 0.0.1.255 10.20.3.192 0.0.0.31 eq 22\ndeny ip any any')}</textarea>
      <div class="grid c4 mt1">
        <div><label class="lbl">IP source</label><input class="input mono" data-s value="41.203.10.5"></div>
        <div><label class="lbl">IP destination</label><input class="input mono" data-d value="10.20.3.194"></div>
        <div><label class="lbl">Protocole</label><select class="input" data-p><option>tcp</option><option>udp</option><option>icmp</option></select></div>
        <div><label class="lbl">Port destination</label><input class="input mono" data-port value="22"></div>
      </div>
      <div data-out class="mt1"></div>`;
    const render = () => {
      const lines = el.querySelector('[data-acl]').value.split('\n').filter((l) => l.trim() && !l.trim().startsWith('!'));
      const src = IP.parse(el.querySelector('[data-s]').value), dst = IP.parse(el.querySelector('[data-d]').value);
      const proto = el.querySelector('[data-p]').value, port = +el.querySelector('[data-port]').value;
      const out = el.querySelector('[data-out]');
      if (src == null || dst == null) { out.innerHTML = '<p class="ko-t small">Adresses invalides.</p>'; return; }
      let hit = -1, rows = [], err = null;
      lines.forEach((l, k) => {
        let r = null;
        try { r = parseLine(l); } catch (e) { err = e.message; }
        let m = false;
        if (r && hit < 0) {
          if (r.std) m = matchAddr(r.src, src);
          else {
            m = (r.proto === 'ip' || r.proto === proto) && matchAddr(r.src, src) && matchAddr(r.dst, dst) && (r.dport == null || (proto !== 'icmp' && r.dport === port)) && !r.est;
          }
          if (m) hit = k;
        }
        rows.push(`<div class="mono small" style="padding:.3rem .5rem;border-radius:8px;margin:2px 0;${k === hit ? `background:${r.action === 'permit' ? 'var(--ok-soft)' : 'var(--ko-soft)'};font-weight:800` : hit >= 0 && k > hit ? 'opacity:.4' : ''}">${k + 1}. ${U.esc(l.trim())}${!r ? ' <span class="ko-t">(ignorée)</span>' : ''}${k === hit ? ' ← correspondance' : ''}</div>`);
      });
      rows.push(`<div class="mono small" style="padding:.3rem .5rem;border-radius:8px;${hit < 0 ? 'background:var(--ko-soft);font-weight:800' : 'opacity:.4'}">∞. deny any (implicite)${hit < 0 ? ' ← correspondance' : ''}</div>`);
      const action = hit >= 0 ? parseLine(lines[hit]).action : 'deny';
      out.innerHTML = rows.join('') + `<div class="co ${action === 'permit' ? 'reflex' : 'trap'} mt1"><div class="co-h">${action === 'permit' ? '✅ Paquet autorisé' : '⛔ Paquet refusé'}</div>${hit >= 0 ? `Règle ${hit + 1} : la suite n'est pas lue.` : 'Aucune règle ne correspond : le <b>deny any implicite</b> s\'applique.'}${err ? `<div class="small ko-t">${U.esc(err)}</div>` : ''}</div>`;
    };
    U.$$('input, textarea, select', el).forEach((x) => { x.addEventListener('input', render); x.addEventListener('change', render); });
    render();
  });
})();
