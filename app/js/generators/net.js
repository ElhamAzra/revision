/* Générateurs réseau : ports, TCP (séquences, fenêtre), OSPF, choix de route, distance administrative, domaines. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const IP = App.ip;
  const G = App.gen;
  const md = App.md;
  const S = IP.str;

  const PORTS = [
    [20, 'FTP (données)', 'TCP'], [21, 'FTP (commandes)', 'TCP'], [22, 'SSH / SFTP / SCP', 'TCP'], [23, 'Telnet', 'TCP'],
    [25, 'SMTP (entre serveurs)', 'TCP'], [53, 'DNS', 'UDP et TCP'], [67, 'DHCP serveur', 'UDP'], [68, 'DHCP client', 'UDP'],
    [69, 'TFTP', 'UDP'], [80, 'HTTP', 'TCP'], [88, 'Kerberos', 'TCP et UDP'], [110, 'POP3', 'TCP'], [123, 'NTP', 'UDP'],
    [143, 'IMAP', 'TCP'], [161, 'SNMP', 'UDP'], [162, 'SNMP trap', 'UDP'], [179, 'BGP', 'TCP'], [389, 'LDAP', 'TCP'],
    [443, 'HTTPS', 'TCP'], [445, 'SMB (partage Windows)', 'TCP'], [465, 'SMTPS', 'TCP'], [500, 'IKE (IPsec)', 'UDP'],
    [514, 'Syslog', 'UDP'], [520, 'RIP', 'UDP'], [587, 'SMTP soumission', 'TCP'], [636, 'LDAPS', 'TCP'], [993, 'IMAPS', 'TCP'],
    [995, 'POP3S', 'TCP'], [1433, 'SQL Server', 'TCP'], [1521, 'Oracle', 'TCP'], [1812, 'RADIUS (authentification)', 'UDP'],
    [1813, 'RADIUS (comptabilité)', 'UDP'], [3268, 'Catalogue global AD', 'TCP'], [3306, 'MySQL', 'TCP'], [3389, 'RDP (bureau à distance)', 'TCP'],
    [4500, 'NAT-T (IPsec)', 'UDP'], [5060, 'SIP', 'UDP et TCP'], [5061, 'SIP sur TLS', 'TCP'], [49, 'TACACS+', 'TCP'], [3260, 'iSCSI', 'TCP']
  ];
  const CORE = [20, 21, 22, 23, 25, 53, 67, 69, 80, 88, 110, 123, 143, 161, 389, 443, 445, 514, 3389, 1812, 500, 5060, 587, 993, 995];
  const PROTO_NUM = [['ICMP', 1], ['TCP', 6], ['UDP', 17], ['GRE', 47], ['ESP', 50], ['AH', 51], ['EIGRP', 88], ['OSPF', 89]];

  G.register({
    id: 'ports', mod: 's4', icon: '🔌', title: 'Ports & protocoles',
    desc: 'Le tableau des ports, en version réflexe.',
    make(r, lvl) {
      const pool = lvl === 1 ? PORTS.filter((p) => CORE.slice(0, 16).includes(p[0])) : lvl === 2 ? PORTS.filter((p) => CORE.includes(p[0])) : PORTS;
      const p = r.pick(pool);
      const mode = lvl === 3 && r.chance(0.25) ? 'proto' : r.pick(['port', 'svc', 'tr']);
      const table = md.table(['Port', 'Service', 'Transport'], [[p[0], p[1], p[2]]]);
      if (mode === 'proto') {
        const x = r.pick(PROTO_NUM);
        return { q: `Quel est le <b>numéro de protocole IP</b> de <b>${x[0]}</b> (champ « Protocole » de l'en-tête IPv4) ?`, fields: [{ kind: 'num', a: x[1] }], expl: md.table(['Protocole', 'N°'], PROTO_NUM.map((y) => [y[0], y[1]])) + md.trap('Ce ne sont pas des ports : ESP (50), AH (51), OSPF (89) n\'utilisent ni TCP ni UDP.') };
      }
      if (mode === 'port') return { q: `Quel port utilise <b>${p[1]}</b> ?`, fields: [{ kind: 'num', a: p[0] }], expl: table };
      if (mode === 'svc') {
        const others = r.shuffle(PORTS.filter((x) => x[0] !== p[0] && x[1] !== p[1])).slice(0, 3);
        const ch = r.shuffle([p].concat(others));
        return { type: 'qcm', q: `Quel service écoute sur le port <b>${p[0]}</b> ?`, choices: ch.map((x) => x[1]), a: ch.indexOf(p), expl: table };
      }
      const opts = ['TCP', 'UDP', 'UDP et TCP'];
      const ans = p[2] === 'TCP et UDP' ? 2 : opts.indexOf(p[2]);
      return { type: 'qcm', noShuffle: true, q: `<b>${p[1]}</b> (port ${p[0]}) utilise quel protocole de transport ?`, choices: opts, a: ans < 0 ? 2 : ans, expl: table + md.tip('UDP : DNS (requêtes), DHCP, TFTP, SNMP, NTP, Syslog, RADIUS, RTP/VoIP. TCP : tout ce qui transfère des fichiers, des pages, des mails, des sessions.') };
    },
    quick(r) {
      const p = r.pick(PORTS.filter((x) => CORE.includes(x[0])));
      return { q: `Port de <b>${p[1]}</b> ?`, fields: [{ kind: 'num', a: p[0] }], expl: `${p[1]} = ${p[0]}/${p[2]}` };
    }
  });

  G.register({
    id: 'tcp-seq', mod: 's4', icon: '🤝', title: 'TCP : séquences et ACK',
    desc: 'Poignée de main, échange de données, numéros à calculer.',
    make(r, lvl) {
      const c = r.int(1, 90) * 100, s = r.int(1, 90) * 100 + 7;
      if (lvl === 1) {
        const which = r.int(2, 3);
        const rows = which === 2 ? { seq: s, ack: c + 1 } : { seq: c + 1, ack: s + 1 };
        return {
          q: `Le client envoie <b>SYN, seq = ${c}</b>. Le serveur a pour numéro initial <b>${s}</b>. Donne seq et ack du segment n°${which} (${which === 2 ? 'SYN-ACK du serveur' : 'ACK final du client'}).`,
          fields: [{ label: 'seq', kind: 'num', a: rows.seq }, { label: 'ack', kind: 'num', a: rows.ack }],
          expl: md.table(['N°', 'Drapeaux', 'seq', 'ack'], [['1', 'SYN', c, '—'], ['2', 'SYN, ACK', s, c + 1], ['3', 'ACK', c + 1, s + 1]]) + md.key('Le SYN compte pour 1 octet : on acquitte x + 1.')
        };
      }
      const q = r.pick([100, 200, 300, 500, 512, 1000]), rr = r.pick([536, 1000, 1460, 1460, 2920]);
      const ask = lvl === 2 ? r.pick(['5', '6']) : 'fin';
      if (ask === 'fin') {
        return {
          q: `Après la poignée de main (client ISN ${c}, serveur ISN ${s}), le client envoie ${q} octets puis le serveur répond ${rr} octets. Le client envoie ensuite un <b>FIN</b>. Quels sont seq et ack de ce FIN ? Quel ack le serveur renverra-t-il ?`,
          fields: [{ label: 'seq du FIN', kind: 'num', a: c + 1 + q }, { label: 'ack du FIN', kind: 'num', a: s + 1 + rr }, { label: 'ack renvoyé par le serveur', kind: 'num', a: c + 1 + q + 1 }],
          expl: `<p>Après les données : client à ${c + 1 + q}, serveur à ${s + 1 + rr}. Le FIN porte seq = <b>${c + 1 + q}</b>, ack = <b>${s + 1 + rr}</b>. Comme le SYN, le <b>FIN compte pour 1</b> → le serveur acquitte <b>${c + q + 2}</b>.</p>`
        };
      }
      const rows = [['4', 'Client → Serveur', c + 1, s + 1, q], ['5', 'Serveur → Client', s + 1, c + 1 + q, rr], ['6', 'Client → Serveur', c + 1 + q, s + 1 + rr, 0]];
      const row = ask === '5' ? rows[1] : rows[2];
      return {
        q: `Poignée de main faite (client ISN ${c}, serveur ISN ${s}). Le client envoie une requête de <b>${q} octets</b> (segment 4), le serveur répond avec <b>${rr} octets</b> (segment 5), le client acquitte (segment 6). Donne seq et ack du segment <b>${ask}</b>.`,
        fields: [{ label: 'seq', kind: 'num', a: row[2] }, { label: 'ack', kind: 'num', a: row[3] }],
        expl: md.table(['N°', 'Sens', 'seq', 'ack', 'Données'], rows.map((x) => [x[0], x[1], x[2], x[3], x[4]])) + md.key('ACK = séquence reçue + nombre d\'octets reçus (« le prochain octet que j\'attends »).')
      };
    }
  });

  G.register({
    id: 'tcp-win', mod: 's4', icon: '🛰️', title: 'TCP : fenêtre et débit',
    desc: 'Débit ≤ fenêtre ÷ RTT (liaisons satellite).',
    make(r, lvl) {
      const w = r.pick([65535, 65535, 32768, 16384, 131072]);
      const rtt = r.pick([600, 500, 300, 200, 100, 50]);
      const d = (w * 8) / (rtt / 1000);
      if (lvl < 3) return {
        q: `Fenêtre TCP de <b>${U.fmtNum(w)} octets</b>, RTT de <b>${rtt} ms</b>. Débit maximal d'une connexion, en <b>kbit/s</b> ?`,
        fields: [{ kind: 'num', a: Math.round(d / 1000), rel: 0.02, show: U.fmtNum(Math.round(d / 1000)) + ' kbit/s' }],
        expl: md.f(`Débit<sub>max</sub> = ${md.frac(U.fmtNum(w) + ' × 8', rtt / 1000 + ' s')} = ${U.fmtNum(Math.round(d))} bit/s ≈ <b class="hl">${U.fmtNum(Math.round(d / 1000))} kbit/s</b>`) + md.trap('Ce plafond ne dépend pas du débit du lien : même un lien à 10 Mbit/s plafonne si la fenêtre est petite et le RTT long.')
      };
      const tgt = r.pick([4, 8, 10, 20]);
      const need = (tgt * 1e6 * (rtt / 1000)) / 8;
      return {
        q: `Quelle fenêtre (en <b>octets</b>) faut-il pour remplir un lien de <b>${tgt} Mbit/s</b> avec un RTT de <b>${rtt} ms</b> ?`,
        fields: [{ kind: 'num', a: need, rel: 0.02, show: U.fmtNum(need) + ' octets' }],
        expl: md.f(`W = débit × RTT ÷ 8 = ${tgt} × 10<sup>6</sup> × ${rtt / 1000} ÷ 8 = <b class="hl">${U.fmtNum(need)} octets</b>`) + '<p>Au-delà de 65 535 octets, il faut l\'option <b>window scaling</b> (RFC 7323).</p>'
      };
    }
  });

  G.register({
    id: 'ospf-cost', mod: 's2', icon: '🛣️', title: 'Coût OSPF',
    desc: 'Coût = 10⁸ / débit, somme des coûts, choix du chemin.',
    make(r, lvl) {
      const BW = [['FastEthernet 100 Mbit/s', 1e8, 1], ['Ethernet 10 Mbit/s', 1e7, 10], ['E1 2,048 Mbit/s', 2048000, 48], ['T1 1,544 Mbit/s', 1544000, 64], ['Liaison 512 kbit/s', 512000, 195], ['Liaison 64 kbit/s', 64000, 1562], ['GigabitEthernet', 1e9, 1]];
      if (lvl === 1) {
        const b = r.pick(BW);
        return { q: `Coût OSPF d'une interface <b>${b[0]}</b> (bande passante de référence par défaut 100 Mbit/s) ?`, fields: [{ kind: 'num', a: b[2] }], expl: md.f(`Coût = ${md.frac('10<sup>8</sup>', U.fmtNum(b[1]))} = <b class="hl">${b[2]}</b>`, 'partie entière, minimum 1') + (b[2] === 1 && b[1] > 1e8 ? md.trap('GigabitEthernet a aussi un coût de 1 : on règle <code>auto-cost reference-bandwidth 10000</code>.') : '') };
      }
      const a = r.pick(BW.slice(0, 5)), b = r.pick(BW.slice(0, 5)), c2 = r.pick(BW.slice(0, 5)), lan = 1;
      const direct = r.pick(BW.slice(2, 6));
      const viaCost = a[2] + b[2] + lan, dCost = direct[2] + lan;
      return {
        q: `Chemin direct R1 → R3 par une liaison <b>${direct[0]}</b>, ou détour R1 → R2 (<b>${a[0]}</b>) → R3 (<b>${b[0]}</b>). Le LAN de destination derrière R3 est en FastEthernet. Coût de chaque chemin et chemin choisi par OSPF ?`,
        fields: [{ label: 'Coût direct', kind: 'num', a: dCost }, { label: 'Coût via R2', kind: 'num', a: viaCost }, { label: 'Chemin choisi', kind: 'select', opts: ['Direct', 'Via R2', 'Les deux (partage de charge)'], a: dCost < viaCost ? 0 : dCost > viaCost ? 1 : 2 }],
        expl: md.steps([`Direct : ${direct[2]} + LAN ${lan} = <b>${dCost}</b>`, `Via R2 : ${a[2]} + ${b[2]} + LAN ${lan} = <b>${viaCost}</b>`, `OSPF prend le plus petit coût total${dCost === viaCost ? ' — égalité : partage de charge (ECMP)' : ''}. RIP, lui, aurait pris le chemin avec le moins de sauts.`]) + (c2 ? '' : '')
      };
    }
  });

  G.register({
    id: 'route-pick', mod: 's2', icon: '🧭', title: 'Lire une table de routage',
    desc: 'Plus long préfixe, puis distance administrative, puis métrique.',
    make(r) {
      const rt = [
        { code: 'S*', net: '0.0.0.0', p: 0, via: 'via 203.0.113.1 (FAI)' },
        { code: 'S', net: '10.0.0.0', p: 8, via: 'via 10.20.3.230' },
        { code: 'C', net: '10.20.0.0', p: 23, via: 'G0/0' },
        { code: 'C', net: '10.20.2.0', p: 24, via: 'G0/1' },
        { code: 'O', net: '10.20.3.0', p: 25, via: 'via 10.20.3.226' },
        { code: 'O', net: '10.20.3.128', p: 26, via: 'via 10.20.3.230' },
        { code: 'C', net: '10.20.3.192', p: 27, via: 'G0/3' }
      ];
      const dests = ['10.20.3.' + r.int(1, 126), '10.20.3.' + r.int(129, 190), '10.20.3.' + r.int(193, 222), '10.20.' + r.int(4, 200) + '.' + r.int(1, 254), r.pick(['8.8.8.8', '41.203.' + r.int(1, 254) + '.1', '196.200.1.10']), '10.20.' + r.int(0, 1) + '.' + r.int(1, 254), '10.20.2.' + r.int(1, 254), '10.' + r.int(21, 250) + '.' + r.int(0, 255) + '.1'];
      const d = r.pick(dests);
      const di = IP.parse(d);
      const cands = rt.map((x, i) => ({ x, i })).filter((o) => IP.network(di, o.x.p) === IP.parse(o.x.net));
      const best = cands.sort((a, b) => b.x.p - a.x.p)[0];
      const opts = rt.map((x) => `${x.code} ${x.net}/${x.p} ${x.via}`);
      return {
        q: `Table de R-NIAMEY :<pre style="font-size:.8rem">${rt.map((x) => `${x.code.padEnd(3)}${(x.net + '/' + x.p).padEnd(17)}${x.via}`).join('\n')}</pre>Quelle route est utilisée pour un paquet vers <b class="mono">${d}</b> ?`,
        fields: [{ kind: 'select', opts, a: best.i, wide: true }],
        expl: `<p>Routes qui contiennent ${d} : ${cands.map((o) => `<span class="mono">${o.x.net}/${o.x.p}</span>`).join(', ')}. Le <b>plus long préfixe</b> gagne → <b class="mono">${opts[best.i]}</b>.</p>${best.x.p === 8 ? md.trap('Piège : 10.0.0.0/8 est plus précis que la route par défaut — le paquet part vers Tahoua, pas vers Internet (et sera sans doute perdu).') : ''}`
      };
    }
  });

  G.register({
    id: 'ad-pick', mod: 's2', icon: '⚖️', title: 'Distance administrative',
    desc: 'Quelle source de route l\'emporte ?',
    make(r, lvl) {
      const AD = [['connectée', 0], ['statique', 1], ['eBGP', 20], ['EIGRP', 90], ['OSPF', 110], ['IS-IS', 115], ['RIP', 120], ['EIGRP externe', 170], ['iBGP', 200]];
      if (lvl === 1) {
        const x = r.pick(AD);
        return { q: `Distance administrative par défaut d'une route <b>${x[0]}</b> (Cisco) ?`, fields: [{ kind: 'num', a: x[1] }], expl: md.table(['Source', 'AD'], AD.map((y) => [y[0], y[1]])) + md.mnemo('« 0 - 1 - 20 - 90 - 110 - 120 » : connectée, statique, eBGP, EIGRP, OSPF, RIP.') };
      }
      const set = r.shuffle(AD.slice(1, 7)).slice(0, 3);
      const win = set.slice().sort((a, b) => a[1] - b[1])[0];
      if (lvl === 2) return { type: 'qcm', q: `Le réseau 192.168.50.0/24 est appris par ${set.map((x) => '<b>' + x[0] + '</b>').join(', ')}. Quelle route est installée ?`, choices: set.map((x) => x[0]), a: set.indexOf(win), expl: `<p>Même préfixe → la plus petite AD gagne : <b>${win[0]} (${win[1]})</b>.</p>` };
      const lo = set[set.length - 1];
      return {
        type: 'qcm',
        q: `Un routeur connaît 192.168.50.0/24 par <b>${win[0]}</b> (AD ${win[1]}) et 192.168.50.0/25 par <b>${lo[0]}</b> (AD ${lo[1]}). Vers où part un paquet pour <b>192.168.50.${r.int(1, 126)}</b> ?`,
        choices: [`Route /25 (${lo[0]})`, `Route /24 (${win[0]})`, 'Partage de charge', 'Il est détruit'], a: 0, noShuffle: true,
        expl: md.key('Le plus long préfixe passe AVANT la distance administrative. L\'AD ne départage que des routes de même préfixe.')
      };
    }
  });

  G.register({
    id: 'domains', mod: 's3', icon: '🧩', title: 'Domaines de collision et de broadcast',
    desc: 'Compter les domaines selon hubs, switchs, routeurs, VLAN.',
    make(r, lvl) {
      const nIf = r.int(2, 3);
      let coll = 0, bc = 0;
      const desc = [];
      for (let i = 0; i < nIf; i++) {
        const kind = r.pick(['switch', 'hub', 'switch']);
        if (kind === 'hub') {
          const pcs = r.int(2, 6);
          coll += 1; bc += 1;
          desc.push(`interface ${i + 1} → un <b>hub</b> avec ${pcs} PC`);
        } else {
          const pcs = r.int(3, 10);
          const hub = r.chance(0.5) ? r.int(2, 4) : 0;
          const vlans = lvl === 3 && r.chance(0.6) ? r.int(2, 3) : 1;
          coll += pcs + 1 + (hub ? 1 : 0);
          bc += vlans;
          desc.push(`interface ${i + 1} → un <b>switch</b> avec ${pcs} PC${hub ? ` et un hub portant ${hub} PC` : ''}${vlans > 1 ? ` (${vlans} VLAN, trunk vers le routeur)` : ''}`);
        }
      }
      return {
        q: `Un routeur a ${nIf} interfaces utilisées : ${desc.join(' ; ')}. Combien de domaines de collision et de broadcast ?`,
        fields: [{ label: 'Domaines de collision', kind: 'num', a: coll }, { label: 'Domaines de broadcast', kind: 'num', a: bc }],
        expl: md.ul(['Chaque <b>port de switch</b> utilisé = 1 domaine de collision (y compris le port vers le routeur et le port vers un hub).', 'Un <b>hub</b> et tout ce qui y est branché = 1 seul domaine de collision.', 'Chaque <b>interface de routeur</b> (ou chaque <b>VLAN</b>) = 1 domaine de broadcast.']) + `<p>Total : <b>${coll}</b> domaines de collision, <b>${bc}</b> domaines de broadcast.</p>`
      };
    }
  });
})();
