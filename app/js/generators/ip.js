/* Générateurs d'exercices infinis : binaire, hexadécimal, masques, sous-réseaux, VLSM, agrégation, IPv6.
   Chaque question est accompagnée d'une correction pas à pas (méthode + binaire coloré). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const IP = App.ip;
  const V6 = IP.v6;
  const G = App.gen;
  const md = App.md;
  const POW = [128, 64, 32, 16, 8, 4, 2, 1];
  const S = IP.str;
  const NAMES = ['1er', '2e', '3e', '4e'];

  App.quiz.fieldCheckers.v6full = (v, f) => {
    const s = String(v).trim().toLowerCase();
    return /^([0-9a-f]{4}:){7}[0-9a-f]{4}$/.test(s) && s === String(f.a).toLowerCase();
  };

  const subSteps = (n) => {
    let r = n;
    const out = [];
    POW.forEach((w) => {
      if (r >= w) { out.push(`${r} ≥ ${w} → <b>1</b>, reste ${r - w}`); r -= w; }
      else out.push(`<span class="muted">${r} &lt; ${w} → 0</span>`);
    });
    return out;
  };
  const weightsTable = (n) => md.table(POW.map(String), [IP.bin8(n).split('').map((b) => (b === '1' ? '<b class="pri-t">1</b>' : '<span class="muted">0</span>'))]);
  const binRow = (lab, n, p) => `<div class="binrow"><span class="lab">${lab}</span><span>${App.ui.bits32(n, p, { sm: true })}</span><span class="dec">${S(n)}</span></div>`;

  function magic(a, p) {
    const c = IP.calc(a, p);
    if (p % 8 === 0) {
      return `<p>Masque aligné sur l'octet (/${p}) : les ${p / 8} premier(s) octet(s) = réseau. Réseau <b>${S(c.net)}</b>, broadcast <b>${S(c.bc)}</b>.</p>`;
    }
    const o = c.oct, mv = IP.octets(c.mask)[o], b = 256 - mv, v = IP.octets(a)[o], netO = Math.floor(v / b) * b;
    return md.steps([
      `/${p} → masque <b>${S(c.mask)}</b> : l'octet intéressant est le <b>${NAMES[o]}</b> (valeur ${mv}).`,
      `Bloc = 256 − ${mv} = <b class="acc-t">${b}</b>.`,
      `${v} est entre ${netO} et ${netO + b} → réseau = <b>${S(c.net)}</b>${o < 3 ? ' (octets suivants à 0)' : ''}.`,
      `Broadcast = ${netO} + ${b} − 1 = ${netO + b - 1}${o < 3 ? ' (octets suivants à 255)' : ''} → <b>${S(c.bc)}</b>.`,
      `1er hôte = réseau + 1 = <b>${S(c.first)}</b> · dernier = broadcast − 1 = <b>${S(c.last)}</b>.`,
      `Hôtes = 2<sup>${32 - p}</sup> − 2 = <b>${U.fmtNum(c.hosts)}</b>.`
    ]) + binRow('Adresse', a, p) + binRow('Réseau', c.net, p) + binRow('Broadcast', c.bc, p);
  }

  function randAddr(r, p, kind) {
    kind = kind || r.pick(['10', '172', '192', 'pub']);
    let o;
    if (kind === '10') o = [10, r.int(0, 255), r.int(0, 255), r.int(0, 255)];
    else if (kind === '172') o = [172, r.int(16, 31), r.int(0, 255), r.int(0, 255)];
    else if (kind === '192') o = [192, 168, r.int(0, 255), r.int(0, 255)];
    else o = [r.pick([41, 102, 154, 196, 197, 105, 82, 37]), r.int(0, 255), r.int(0, 255), r.int(0, 255)];
    return IP.parse(o.join('.'));
  }

  /* ---------------- Binaire ---------------- */
  G.register({
    id: 'bin-d2b', mod: 'm0', icon: '🔢', title: 'Décimal → binaire',
    desc: 'Convertir un octet décimal en 8 bits (méthode des soustractions).',
    make(r, lvl) {
      const n = lvl === 1 ? r.pick([128, 192, 224, 240, 248, 252, 254, 255, 64, 32, 16, 127, 129, 10, 100, 96, 160])
        : lvl === 2 ? r.int(1, 254) : r.int(200, 254);
      let extra = '';
      if (n >= 200) {
        const m = 255 - n;
        extra = md.tip(`<b>Astuce du complément :</b> 255 − ${n} = ${m} = <span class="mono">${IP.bin8(m)}</span> → on inverse tous les bits → <b class="mono">${IP.bin8(n)}</b>.`);
      }
      return {
        q: `Convertis <b class="mono" style="font-size:1.25em">${n}</b> en binaire sur 8 bits.`,
        fields: [{ kind: 'bin', a: IP.bin8(n), ph: 'ex. 11000000' }],
        expl: `<p>On retire les poids de gauche à droite :</p>${md.ul(subSteps(n))}${weightsTable(n)}${extra}`
      };
    }
  });

  G.register({
    id: 'bin-b2d', mod: 'm0', icon: '🔁', title: 'Binaire → décimal',
    desc: 'Additionner les poids des bits à 1.',
    make(r, lvl) {
      const n = lvl === 1 ? r.pick([128, 192, 224, 240, 248, 252, 254, 255, 64, 1, 3, 15, 63, 127]) : lvl === 2 ? r.int(1, 255) : r.int(1, 255);
      const b = IP.bin8(n);
      const hi = n >> 4, lo = n & 15;
      if (lvl === 3) {
        const m = r.int(0, 255);
        const n2 = (n << 8) | m;
        return {
          q: `Convertis en décimal (16 bits, deux octets séparés) : <b class="mono">${IP.bin8(n)} ${IP.bin8(m)}</b>. Donne chaque octet.`,
          fields: [{ label: '1er octet', kind: 'num', a: n }, { label: '2e octet', kind: 'num', a: m }],
          expl: `<p>Chaque octet se convertit séparément (c'est ainsi qu'on lit une adresse IP) : ${IP.bin8(n)} = <b>${n}</b>, ${IP.bin8(m)} = <b>${m}</b>.</p>${weightsTable(n)}${weightsTable(m)}<p class="small muted">Valeur 16 bits complète : ${U.fmtNum(n2)}.</p>`
        };
      }
      const parts = POW.filter((w, i) => b[i] === '1');
      return {
        q: `Convertis <b class="mono" style="font-size:1.2em">${b}</b> en décimal.`,
        fields: [{ kind: 'num', a: n }],
        expl: `${weightsTable(n)}<p>${parts.join(' + ') || '0'} = <b>${n}</b>.</p>${md.tip(`Par quartets : ${b.slice(0, 4)} = ${hi} et ${b.slice(4)} = ${lo} → ${hi} × 16 + ${lo} = <b>${n}</b>.`)}`
      };
    }
  });

  G.register({
    id: 'bin-hex', mod: 'm0', icon: '🔣', title: 'Hexadécimal',
    desc: 'Quartet ↔ chiffre hexa, octet hexa ↔ décimal (MAC, IPv6).',
    make(r, lvl) {
      if (lvl === 1) {
        const n = r.int(0, 15);
        const h = n.toString(16).toUpperCase();
        if (r.chance(0.5)) return {
          q: `Écris le chiffre hexadécimal <b class="mono" style="font-size:1.25em">${h}</b> en binaire (4 bits).`,
          fields: [{ kind: 'bin', a: n.toString(2).padStart(4, '0') }],
          expl: `<p>${h} = ${n} = 8·${(n >> 3) & 1} + 4·${(n >> 2) & 1} + 2·${(n >> 1) & 1} + 1·${n & 1} → <b class="mono">${n.toString(2).padStart(4, '0')}</b>.</p>${md.tip('A = 10, B = 11, C = 12, D = 13, E = 14, F = 15. Un chiffre hexa = exactement 4 bits (un quartet).')}`
        };
        return {
          q: `Quel chiffre hexadécimal correspond à <b class="mono" style="font-size:1.2em">${n.toString(2).padStart(4, '0')}</b> ?`,
          fields: [{ kind: 'hex', a: h }],
          expl: `<p>8·${(n >> 3) & 1} + 4·${(n >> 2) & 1} + 2·${(n >> 1) & 1} + 1·${n & 1} = ${n} → <b>${h}</b>.</p>`
        };
      }
      const n = r.int(16, 255);
      const h = n.toString(16).toUpperCase().padStart(2, '0');
      if (lvl === 2) return {
        q: `Convertis l'octet hexadécimal <b class="mono" style="font-size:1.25em">0x${h}</b> en décimal.`,
        fields: [{ kind: 'num', a: n }],
        expl: `<p>${h[0]} = ${parseInt(h[0], 16)} et ${h[1]} = ${parseInt(h[1], 16)} → ${parseInt(h[0], 16)} × 16 + ${parseInt(h[1], 16)} = <b>${n}</b>.</p><p class="mono">Binaire : ${IP.bin8(n).slice(0, 4)} ${IP.bin8(n).slice(4)}</p>`
      };
      return {
        q: `Convertis <b class="mono" style="font-size:1.25em">${n}</b> en hexadécimal (2 chiffres).`,
        fields: [{ kind: 'hex', a: h }],
        expl: `<p>${n} ÷ 16 = ${n >> 4} reste ${n & 15} → ${(n >> 4).toString(16).toUpperCase()} puis ${(n & 15).toString(16).toUpperCase()} = <b>${h}</b>.</p><p>Vérif. binaire : ${IP.bin8(n).slice(0, 4)} | ${IP.bin8(n).slice(4)}.</p>`
      };
    }
  });

  /* ---------------- Masques ---------------- */
  G.register({
    id: 'mask', mod: 's1', icon: '🎭', title: 'Préfixe ↔ masque ↔ wildcard',
    desc: 'Traduire /n en masque décimal et en masque générique, et l\'inverse.',
    make(r, lvl) {
      if (lvl === 1) {
        const p = r.int(16, 30);
        return {
          q: `Quel est le masque décimal du préfixe <b>/${p}</b> ?`,
          fields: [{ kind: 'ip', a: S(IP.mask(p)), ph: '255.255.…' }],
          expl: `<p>/${p} = ${p} bits à 1 : ${App.ui.bits32(IP.mask(p), p, { sm: true })}</p><p>→ <b class="mono">${S(IP.mask(p))}</b>. Les octets partiels valent 128, 192, 224, 240, 248, 252, 254.</p>`
        };
      }
      if (lvl === 2) {
        const p = r.int(8, 30);
        return {
          q: `Pour <b>/${p}</b>, donne le masque et le masque générique (wildcard).`,
          fields: [{ label: 'Masque', kind: 'ip', a: S(IP.mask(p)) }, { label: 'Wildcard', kind: 'ip', a: S(IP.wild(p)) }],
          expl: `<p>Masque : <b class="mono">${S(IP.mask(p))}</b>. Wildcard = 255.255.255.255 − masque = <b class="mono">${S(IP.wild(p))}</b> (les bits hôte à 1).</p>${md.tip('Le wildcard s\'écrit dans les ACL Cisco et la commande <code>network</code> d\'OSPF / EIGRP.')}`
        };
      }
      if (r.chance(0.3)) {
        const bad = r.pick(['255.255.253.0', '255.255.255.250', '255.0.255.0', '255.255.224.128', '255.255.239.0']);
        const good = S(IP.mask(r.int(17, 29)));
        const showBad = r.chance(0.6);
        const m = showBad ? bad : good;
        const n = IP.parse(m);
        return {
          type: 'tf',
          q: `Le masque <b class="mono">${m}</b> est-il valide ?`,
          a: !showBad,
          expl: `<p>${App.md.bits(IP.bin(n), null, { sm: true })}</p><p>${showBad ? 'Les 1 ne sont pas tous « collés à gauche » : masque <b>non contigu</b>, donc invalide. Seules les valeurs 0, 128, 192, 224, 240, 248, 252, 254, 255 existent dans un octet de masque.' : 'Tous les 1 sont contigus à gauche : masque valide (/' + IP.prefixOf(n) + ').'}</p>`
        };
      }
      const p = r.int(8, 30);
      return {
        q: `Quel préfixe correspond au masque <b class="mono">${S(IP.mask(p))}</b> ?`,
        fields: [{ kind: 'mask', a: '/' + p, ph: '/…' }],
        expl: `<p>On compte les bits à 1 : 255 = 8 bits, et ${IP.octets(IP.mask(p))[IP.interesting(p)]} = ${p % 8 || 8} bits → <b>/${p}</b>.</p>`
      };
    },
    quick(r) {
      const p = r.int(17, 30);
      return r.chance(0.5)
        ? { q: `Masque décimal de <b>/${p}</b> ?`, fields: [{ kind: 'ip', a: S(IP.mask(p)) }], expl: S(IP.mask(p)) }
        : { q: `Préfixe du masque <b class="mono">${S(IP.mask(p))}</b> ?`, fields: [{ kind: 'mask', a: '/' + p }], expl: '/' + p };
    }
  });

  G.register({
    id: 'hosts', mod: 's1', icon: '👥', title: 'Hôtes, adresses, sous-réseaux',
    desc: '2^h − 2, plus petit préfixe pour N hôtes, nombre de sous-réseaux.',
    make(r, lvl) {
      if (lvl === 1) {
        const p = r.int(20, 30);
        return {
          q: `Combien d'hôtes utilisables dans un <b>/${p}</b> ?`,
          fields: [{ kind: 'num', a: IP.hosts(p) }],
          expl: `${md.f(`h = 32 − ${p} = ${32 - p} &nbsp;→&nbsp; 2<sup>${32 - p}</sup> − 2 = <b>${U.fmtNum(IP.hosts(p))}</b>`)}<p>On retire 2 adresses : l'adresse réseau (bits hôte à 0) et le broadcast (bits hôte à 1).</p>`
        };
      }
      if (lvl === 2) {
        const h = r.pick([r.int(3, 14), r.int(15, 62), r.int(63, 254), r.int(255, 1022), r.int(1023, 4094), 30, 62, 126, 14, 510, 1000, 500, 250, 100, 60, 25]);
        const p = IP.prefixForHosts(h);
        return {
          q: `Quel est le plus petit sous-réseau (préfixe) pour <b>${U.fmtNum(h)}</b> hôtes (passerelle comprise) ?`,
          fields: [{ kind: 'mask', a: '/' + p, ph: '/…' }],
          expl: `<p>Il faut ${h} + 2 = ${h + 2} adresses → plus petite puissance de 2 ≥ ${h + 2} : <b>${IP.size(p)}</b> = 2<sup>${32 - p}</sup> → ${32 - p} bits hôte → <b>/${p}</b> (${U.fmtNum(IP.hosts(p))} hôtes).</p>${IP.hosts(p) === h ? md.trap(`${h} hôtes tiennent pile : ${IP.size(p)} − 2 = ${h}.`) : ''}${IP.hosts(p + 1) + 1 === h ? md.trap(`Piège : ${h} = ${IP.hosts(p + 1)} + 1 → le /${p + 1} ne suffit pas !`) : ''}`
        };
      }
      const p1 = r.int(16, 24), p2 = r.int(p1 + 2, Math.min(30, p1 + 8));
      if (r.chance(0.5)) return {
        q: `Combien de sous-réseaux <b>/${p2}</b> peut-on créer dans un <b>/${p1}</b> ?`,
        fields: [{ kind: 'num', a: Math.pow(2, p2 - p1) }],
        expl: md.f(`2<sup>${p2} − ${p1}</sup> = 2<sup>${p2 - p1}</sup> = <b>${U.fmtNum(Math.pow(2, p2 - p1))}</b>`, 'bits empruntés')
      };
      return {
        q: `Combien d'adresses (au total) contient un <b>/${p1}</b> ?`,
        fields: [{ kind: 'num', a: IP.size(p1) }],
        expl: md.f(`2<sup>32 − ${p1}</sup> = 2<sup>${32 - p1}</sup> = <b>${U.fmtNum(IP.size(p1))}</b>`) + md.trap('Nombre d\'adresses (2<sup>h</sup>) ≠ nombre d\'hôtes (2<sup>h</sup> − 2).')
      };
    },
    quick(r) {
      const p = r.int(22, 30);
      return { q: `Hôtes utilisables dans un <b>/${p}</b> ?`, fields: [{ kind: 'num', a: IP.hosts(p) }], expl: `2^${32 - p} − 2 = ${IP.hosts(p)}` };
    }
  });

  /* ---------------- Sous-réseaux ---------------- */
  G.register({
    id: 'subnet', mod: 's1', icon: '🧮', title: 'Calcul de sous-réseau complet',
    desc: 'Réseau, broadcast, plage d\'hôtes et nombre d\'hôtes (méthode du nombre magique).',
    make(r, lvl) {
      let p = lvl === 1 ? r.int(25, 30) : lvl === 2 ? r.int(17, 23) : r.int(9, 15);
      let a = randAddr(r, p);
      let trap = null;
      if (lvl === 3 && r.chance(0.5)) {
        p = r.int(19, 29);
        const c = IP.calc(a, p);
        trap = r.chance(0.5) ? 'net' : 'bc';
        a = trap === 'net' ? c.net : c.bc;
      }
      const c = IP.calc(a, p);
      const fields = [
        { label: 'Adresse réseau', kind: 'ip', a: S(c.net) },
        { label: 'Broadcast', kind: 'ip', a: S(c.bc) },
        { label: '1er hôte', kind: 'ip', a: S(c.first) },
        { label: 'Dernier hôte', kind: 'ip', a: S(c.last) },
        { label: 'Nb d\'hôtes', kind: 'num', a: c.hosts }
      ];
      if (lvl === 3) fields.push({ label: 'Attribuable à un hôte ?', kind: 'select', opts: ['Oui', 'Non — c\'est l\'adresse réseau', 'Non — c\'est le broadcast'], a: trap === 'net' ? 1 : trap === 'bc' ? 2 : 0, wide: true });
      return {
        q: `Analyse l'adresse <b class="mono" style="font-size:1.15em">${S(a)}/${p}</b>.`,
        fields,
        expl: magic(a, p) + (trap ? md.trap(`L'adresse donnée est ${trap === 'net' ? 'l\'adresse réseau' : 'le broadcast'} : elle n'est pas attribuable à un hôte.`) : '')
      };
    },
    quick(r) {
      const p = r.pick([r.int(25, 30), r.int(18, 23)]);
      const a = randAddr(r, p);
      const c = IP.calc(a, p);
      return { q: `Adresse réseau de <b class="mono">${S(a)}/${p}</b> ?`, fields: [{ kind: 'ip', a: S(c.net) }], expl: `Bloc ${c.block} → ${S(c.net)}` };
    }
  });

  G.register({
    id: 'subnet-same', mod: 's1', icon: '🤝', title: 'Même sous-réseau ?',
    desc: 'Deux postes peuvent-ils communiquer sans routeur ?',
    make(r, lvl) {
      const p = lvl === 1 ? r.int(25, 28) : lvl === 2 ? r.int(19, 27) : r.int(13, 29);
      const a = randAddr(r, p, r.pick(['10', '172', '192']));
      const c = IP.calc(a, p);
      const same = r.chance(0.5);
      let b;
      if (same) b = (c.net + r.int(1, Math.max(1, c.size - 2))) >>> 0;
      else {
        const other = r.chance(0.5) ? (c.bc + 1 + r.int(0, Math.min(200, c.size - 1))) >>> 0 : (c.net - r.int(1, Math.min(200, c.size))) >>> 0;
        b = other;
      }
      if (b === c.net || b === c.bc) b = (b + 1) >>> 0;
      const isSame = IP.network(b, p) === c.net;
      return {
        type: 'tf',
        q: `Deux PC sur le même switch (même VLAN) : <b class="mono">${S(a)}/${p}</b> et <b class="mono">${S(b)}/${p}</b>. Peuvent-ils communiquer sans routeur ?`,
        a: isSame,
        expl: `<p>Bloc ${c.block}${c.oct < 3 ? ' (' + NAMES[c.oct] + ' octet)' : ''} : le 1er est dans <b>${S(c.net)}/${p}</b>, le 2e dans <b>${S(IP.network(b, p))}/${p}</b> → ${isSame ? 'même sous-réseau ✓' : 'sous-réseaux différents : il faut un routeur (ou élargir le masque).'}</p>` + binRow('PC 1', a, p) + binRow('PC 2', b, p)
      };
    }
  });

  G.register({
    id: 'subnet-nth', mod: 's1', icon: '🔢', title: 'Découpage & n-ième sous-réseau',
    desc: 'Choisir le préfixe, trouver le k-ième sous-réseau, calcul inverse.',
    make(r, lvl) {
      if (lvl === 3) {
        const baseP = r.pick([16, 16, 20, 21]);
        const base = IP.network(randAddr(r, baseP, r.pick(['10', '172'])), baseP);
        const needSub = r.int(5, 60);
        const bitsS = Math.ceil(Math.log2(needSub));
        const p = baseP + bitsS;
        const maxH = IP.hosts(p);
        const needH = r.int(Math.max(2, Math.floor(maxH / 2)), maxH);
        return {
          q: `On découpe <b class="mono">${S(base)}/${baseP}</b> en <b>au moins ${needSub}</b> sous-réseaux de <b>${U.fmtNum(needH)}</b> hôtes chacun. Quel préfixe choisir, et combien de sous-réseaux obtient-on ?`,
          fields: [{ label: 'Préfixe', kind: 'mask', a: '/' + p }, { label: 'Nb de sous-réseaux', kind: 'num', a: Math.pow(2, bitsS) }],
          expl: md.steps([
            `${needSub} sous-réseaux → plus petite puissance de 2 ≥ ${needSub} : 2<sup>${bitsS}</sup> = ${Math.pow(2, bitsS)} → <b>${bitsS} bits empruntés</b>.`,
            `/${baseP} + ${bitsS} = <b>/${p}</b> (${S(IP.mask(p))}).`,
            `Vérification hôtes : 2<sup>${32 - p}</sup> − 2 = ${U.fmtNum(maxH)} ≥ ${U.fmtNum(needH)} ✓`
          ])
        };
      }
      const p1 = lvl === 1 ? r.int(22, 24) : r.int(16, 20);
      const p2 = Math.min(30, p1 + r.int(2, lvl === 1 ? 4 : 6));
      const base = IP.network(randAddr(r, p1, r.pick(['10', '172', '192'])), p1);
      const count = Math.pow(2, p2 - p1);
      const k = r.int(2, Math.min(count, 12));
      const net = (base + (k - 1) * IP.size(p2)) >>> 0;
      return {
        q: `Le bloc <b class="mono">${S(base)}/${p1}</b> est découpé en sous-réseaux <b>/${p2}</b>. Donne l'adresse et le broadcast du <b>${k}<sup>e</sup></b> sous-réseau (le 1er commence à ${S(base)}).`,
        fields: [{ label: 'Adresse réseau', kind: 'ip', a: S(net) }, { label: 'Broadcast', kind: 'ip', a: S(IP.broadcast(net, p2)) }],
        expl: md.steps([
          `Taille d'un /${p2} = 2<sup>${32 - p2}</sup> = <b>${U.fmtNum(IP.size(p2))}</b> adresses (bloc ${IP.block(p2)} dans le ${NAMES[IP.interesting(p2)]} octet).`,
          `Le ${k}<sup>e</sup> sous-réseau a l'indice ${k - 1} → décalage ${k - 1} × ${U.fmtNum(IP.size(p2))} = ${U.fmtNum((k - 1) * IP.size(p2))} adresses.`,
          `→ <b>${S(net)}/${p2}</b>, broadcast <b>${S(IP.broadcast(net, p2))}</b>.`
        ])
      };
    }
  });

  G.register({
    id: 'iptype', mod: 's1', icon: '🏷️', title: 'Type d\'adresse IPv4',
    desc: 'Privée, publique, APIPA, bouclage, multicast, CGNAT… (pièges 172.32 / 192.169).',
    make(r, lvl) {
      const cats = [
        ['Privée (RFC 1918)', () => r.pick([`10.${r.int(0, 255)}.${r.int(0, 255)}.${r.int(1, 254)}`, `172.${r.int(16, 31)}.${r.int(0, 255)}.${r.int(1, 254)}`, `192.168.${r.int(0, 255)}.${r.int(1, 254)}`])],
        ['Publique', () => lvl === 3 ? r.pick([`172.${r.pick([15, 32, 33, 40])}.${r.int(0, 255)}.${r.int(1, 254)}`, `192.169.${r.int(0, 255)}.${r.int(1, 254)}`, `11.${r.int(0, 255)}.${r.int(0, 255)}.${r.int(1, 254)}`]) : `${r.pick([41, 154, 196, 8, 102])}.${r.int(0, 255)}.${r.int(0, 255)}.${r.int(1, 254)}`],
        ['APIPA (pas de DHCP)', () => `169.254.${r.int(1, 254)}.${r.int(1, 254)}`],
        ['Bouclage (loopback)', () => `127.${r.int(0, 255)}.${r.int(0, 255)}.${r.int(1, 254)}`],
        ['Multicast', () => `${r.int(224, 239)}.${r.int(0, 255)}.${r.int(0, 255)}.${r.int(1, 254)}`],
        ['CGNAT (100.64.0.0/10)', () => `100.${r.int(64, 127)}.${r.int(0, 255)}.${r.int(1, 254)}`]
      ];
      const ci = lvl === 3 && r.chance(0.6) ? 1 : r.int(0, cats.length - 1);
      const addr = cats[ci][1]();
      const t = IP.typeOf(IP.parse(addr));
      const map = { private: 0, public: 1, apipa: 2, loopback: 3, multicast: 4, cgnat: 5 };
      return {
        type: 'qcm',
        q: `Quel est le type de l'adresse <b class="mono">${addr}</b> ?`,
        choices: cats.map((c) => c[0]),
        a: map[t.key] != null ? map[t.key] : 1,
        noShuffle: true,
        expl: `<p><b>${t.label}</b>.</p>` + md.table(['Plage', 'Rôle'], [['10.0.0.0/8 · 172.16.0.0/12 (172.16 → 172.31) · 192.168.0.0/16', 'Privées (RFC 1918)'], ['169.254.0.0/16', 'APIPA : le client n\'a pas eu de bail DHCP'], ['127.0.0.0/8', 'Bouclage'], ['224.0.0.0/4 (224 → 239)', 'Multicast'], ['100.64.0.0/10 (100.64 → 100.127)', 'CGNAT']]) + (lvl === 3 ? md.trap('172.32.x.x et 192.169.x.x sont publiques : la plage privée 172 s\'arrête à 172.31.') : '')
      };
    }
  });

  /* ---------------- Agrégation ---------------- */
  G.register({
    id: 'summ', mod: 's1', icon: '🧲', title: 'Agrégation de routes',
    desc: 'Trouver la route résumée la plus précise (bits communs).',
    make(r, lvl) {
      let list, askExact = false;
      if (lvl === 1) {
        const k = r.int(1, 2), n = Math.pow(2, k);
        const start = r.int(0, Math.floor(250 / n)) * n;
        const pre = r.pick(['172.16', '192.168', '10.1', '10.20']);
        list = Array.from({ length: n }, (_, i) => ({ net: IP.parse(`${pre}.${start + i}.0`), p: 24 }));
      } else if (lvl === 2) {
        const p = r.int(18, 22), k = r.int(1, 2), n = Math.pow(2, k);
        const size = IP.size(p);
        const base = IP.network(randAddr(r, p - k, r.pick(['10', '172'])), p - k);
        list = Array.from({ length: n }, (_, i) => ({ net: (base + i * size) >>> 0, p }));
      } else {
        const pre = r.pick(['192.168', '172.16', '10.10']);
        const start = r.int(0, 60) * 4 + r.pick([1, 2]);
        const n = r.int(2, 3);
        list = Array.from({ length: n }, (_, i) => ({ net: IP.parse(`${pre}.${start + i}.0`), p: 24 }));
        askExact = true;
      }
      const s = IP.summarize(list);
      const fields = [{ label: 'Route résumée', kind: 'cidr', a: `${S(s.net)}/${s.p}`, ph: 'a.b.c.d/n' }];
      if (askExact) fields.push({ label: 'Résumé exact ?', kind: 'select', opts: ['Oui, exact', 'Non, il englobe d\'autres réseaux'], a: s.exact ? 0 : 1 });
      const o = IP.interesting(Math.min(32, s.p + 1));
      return {
        q: `Quelle est la route résumée la plus précise pour : ${list.map((x) => `<b class="mono">${S(x.net)}/${x.p}</b>`).join(' · ')} ?`,
        fields,
        expl: md.steps([
          `On écrit en binaire l'octet qui change (le ${NAMES[o]}) : ${list.map((x) => `${IP.octets(x.net)[o]} = <span class="mono">${IP.bin8(IP.octets(x.net)[o])}</span>`).join(' · ')}.`,
          `On compte les bits communs depuis la gauche : <b>${s.p}</b> bits.`,
          `Route résumée = bits communs, le reste à 0 → <b class="mono">${S(s.net)}/${s.p}</b>.`
        ]) + list.map((x) => binRow(S(x.net), x.net, s.p)).join('') + (s.exact ? md.key(`Résumé exact : ${list.length} réseaux = 2<sup>${Math.log2(list.length) | 0}</sup>, et le premier est aligné.`) : md.trap(`Sur-agrégation : /${s.p} couvre aussi des réseaux absents. Un résumé exact couvre 2<sup>n</sup> réseaux et commence sur un multiple de 2<sup>n</sup>.`))
      };
    }
  });

  /* ---------------- VLSM ---------------- */
  G.register({
    id: 'vlsm', mod: 's1', icon: '🏗️', title: 'Plan VLSM',
    desc: 'Établir un plan d\'adressage complet du plus grand au plus petit.',
    make(r, lvl) {
      const baseP = lvl === 3 ? r.pick([22, 23]) : 24;
      const total = IP.size(baseP);
      const nLan = lvl === 1 ? 3 : 4;
      const nWan = lvl === 1 ? 1 : lvl === 2 ? 2 : 3;
      let sizes;
      for (let tries = 0; tries < 200; tries++) {
        const pool = lvl === 3 ? [512, 256, 128, 64, 32, 16] : [128, 64, 32, 16, 8];
        sizes = r.shuffle(pool).slice(0, nLan).sort((a, b) => b - a);
        if (U.sum(sizes) + 4 * nWan <= total && U.sum(sizes) + 4 * nWan > total * 0.55) break;
      }
      const names = r.shuffle(['Agents', 'Trésor', 'Impôts', 'Budget', 'Direction', 'Wi-Fi invités', 'Serveurs', 'Douanes', 'DRH', 'Comptabilité']);
      const needs = sizes.map((sz, i) => ({ name: 'LAN ' + names[i], hosts: r.int(sz / 2 - 1, sz - 2) }));
      for (let w = 0; w < nWan; w++) needs.push({ name: 'WAN ' + (w + 1), hosts: 2 });
      const site = r.pick(['Agadez', 'Maradi', 'Dosso', 'Tillabéri', 'Diffa', 'Zinder', 'Tahoua']);
      const third = r.int(0, 60) * (baseP === 24 ? 1 : 4);
      const base = IP.parse(`172.${r.int(16, 31)}.${third}.0`);
      const plan = IP.vlsm(base, baseP, needs);
      const listed = r.shuffle(needs.map((n, i) => i));
      const byName = {};
      plan.plan.forEach((x) => (byName[x.name] = x));
      return {
        q: `Site de <b>${site}</b>, bloc <b class="mono">${S(base)}/${baseP}</b>. Besoins (passerelle comprise) : ${listed.map((i) => `<b>${needs[i].name}</b> ${needs[i].hosts}`).join(' · ')}.<br><span class="small muted">Attribue du plus grand au plus petit, à la suite, depuis le début du bloc (à taille égale : WAN 1, puis 2…). Donne chaque réseau en notation a.b.c.d/n.</span>`,
        fields: needs.map((n) => ({ label: n.name + ' (' + n.hosts + ')', kind: 'cidr', a: `${S(byName[n.name].net)}/${byName[n.name].p}`, ph: 'a.b.c.d/n' })),
        expl: md.steps([
          'Pour chaque besoin : plus petite puissance de 2 ≥ hôtes + 2 → préfixe.',
          'Trier du plus grand au plus petit (les WAN /30 à la fin).',
          'Attribuer à la suite : chaque réseau commence juste après le broadcast du précédent.'
        ]) + md.table(['Réseau', 'Besoin', 'Taille', 'Réseau/préfixe', 'Plage', 'Broadcast'], plan.plan.map((x) => [x.name, x.hosts, x.size, `<b>${S(x.net)}/${x.p}</b>`, `${S(x.first)} → ${S(x.lastHost)}`, S(x.bc)]), { mono: [3, 4, 5] }) +
          `<p class="small">Total : ${U.fmtNum(plan.used)} / ${U.fmtNum(total)} adresses — libres à partir de <b class="mono">${S(plan.next)}</b>.</p>`
      };
    }
  });

  /* ---------------- Wildcard / ACL ---------------- */
  G.register({
    id: 'wildcard', mod: 's1', icon: '🃏', title: 'Masque générique (ACL / OSPF)',
    desc: 'Calculer le wildcard et écrire la ligne d\'ACL ou de network OSPF.',
    make(r, lvl) {
      const p = lvl === 1 ? r.int(24, 30) : r.int(16, 29);
      const net = IP.network(randAddr(r, p, r.pick(['10', '172', '192'])), p);
      if (lvl < 3) return {
        q: `Masque générique (wildcard) pour le réseau <b class="mono">${S(net)}/${p}</b> ?`,
        fields: [{ kind: 'ip', a: S(IP.wild(p)) }],
        expl: md.f(`255.255.255.255 − ${S(IP.mask(p))} = <b>${S(IP.wild(p))}</b>`)
      };
      return {
        q: `Complète : <code>access-list 10 permit … …</code> pour autoriser tout le réseau <b class="mono">${S(net)}/${p}</b>.`,
        fields: [{ label: 'Adresse', kind: 'ip', a: S(net) }, { label: 'Wildcard', kind: 'ip', a: S(IP.wild(p)) }],
        expl: md.code(`access-list 10 permit ${S(net)} ${S(IP.wild(p))}\n! même logique pour OSPF :\nrouter ospf 1\n network ${S(net)} ${S(IP.wild(p))} area 0`) + md.tip('<code>host 10.1.1.1</code> = 10.1.1.1 0.0.0.0 · <code>any</code> = 0.0.0.0 255.255.255.255.')
      };
    }
  });

  /* ---------------- IPv6 ---------------- */
  function randV6(r) {
    const arr = [0x2001, 0x0db8, r.int(0, 0xffff), r.int(0, 0xffff), r.int(0, 0xffff), r.int(0, 0xffff), r.int(0, 0xffff), r.int(1, 0xffff)];
    // une longue suite de zéros
    const runLen = r.int(2, 4), runStart = r.int(2, 7 - runLen);
    for (let i = runStart; i < runStart + runLen; i++) arr[i] = 0;
    // un zéro isolé parfois
    if (r.chance(0.5)) { const i = r.pick([2, 3, 4, 5, 6].filter((x) => x < runStart - 1 || x > runStart + runLen)); if (i != null) arr[i] = 0; }
    // valeurs à zéros de tête
    for (let i = 2; i < 8; i++) if (arr[i] && r.chance(0.5)) arr[i] = r.int(1, 0xff);
    if (r.chance(0.3)) arr[0] = r.pick([0xfe80, 0xfd12, 0x2001, 0x2a02]);
    if (arr[0] === 0xfe80) arr[1] = 0;
    return arr;
  }

  G.register({
    id: 'v6-compress', mod: 's1', icon: '🗜️', title: 'IPv6 : compresser',
    desc: 'Supprimer les 0 de tête, remplacer la plus longue suite de 0 par « :: ».',
    make(r) {
      const a = randV6(r);
      const full = V6.full(a);
      const shown = r.chance(0.5) ? full.toUpperCase() : full;
      return {
        q: `Écris la forme compressée de <b class="mono">${shown}</b>.`,
        fields: [{ kind: 'v6', strict: true, a: V6.compress(a), ph: 'ex. 2001:db8::1' }],
        expl: md.steps([
          `Supprimer les 0 de tête de chaque groupe : <span class="mono">${a.map((h) => h.toString(16)).join(':')}</span>`,
          'Remplacer <b>une seule</b> suite de groupes nuls (la plus longue ; à égalité, la première) par <b>::</b>.',
          `→ <b class="mono">${V6.compress(a)}</b>`
        ]) + md.trap('Un groupe nul isolé s\'écrit « 0 » ; « :: » ne s\'utilise qu\'une fois.')
      };
    }
  });

  G.register({
    id: 'v6-expand', mod: 's1', icon: '📏', title: 'IPv6 : développer',
    desc: 'Retrouver les 8 groupes de 4 chiffres hexadécimaux.',
    make(r) {
      const a = randV6(r);
      return {
        q: `Développe entièrement <b class="mono">${V6.compress(a)}</b> (8 groupes de 4 chiffres).`,
        fields: [{ kind: 'v6full', a: V6.full(a), wide: true, ph: 'xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx', show: V6.full(a) }],
        expl: `<p>On compte les groupes présents : ${V6.compress(a).split('::').map((s) => (s ? s.split(':').length : 0)).reduce((x, y) => x + y, 0)} → « :: » remplace ${8 - V6.compress(a).split('::').map((s) => (s ? s.split(':').length : 0)).reduce((x, y) => x + y, 0)} groupe(s) de 0000. Puis on complète chaque groupe à 4 chiffres.</p><p class="mono"><b>${V6.full(a)}</b></p>`
      };
    }
  });

  G.register({
    id: 'v6-type', mod: 's1', icon: '🛰️', title: 'IPv6 : type d\'adresse',
    desc: 'Global, lien local, ULA, multicast, bouclage…',
    make(r) {
      const opts = [
        ['Unicast global (2000::/3)', () => r.pick(['2001:db8:', '2a02:4780:', '2c0f:f8f0:', '2001:470:']) + r.int(1, 0xfff).toString(16) + '::' + r.int(1, 0xff).toString(16)],
        ['Lien local (fe80::/10)', () => 'fe80::' + r.int(1, 0xffff).toString(16) + ':' + r.int(1, 0xffff).toString(16)],
        ['ULA, ≈ privée (fc00::/7)', () => 'fd' + r.int(0, 0xff).toString(16).padStart(2, '0') + ':' + r.int(1, 0xffff).toString(16) + '::' + r.int(1, 99)],
        ['Multicast (ff00::/8)', () => r.pick(['ff02::1', 'ff02::2', 'ff02::5', 'ff02::1:2', 'ff05::2'])],
        ['Bouclage (::1)', () => '::1'],
        ['Non spécifiée (::)', () => '::']
      ];
      const i = r.int(0, 3) + (r.chance(0.15) ? 2 : 0);
      const addr = opts[Math.min(i, 5)][1]();
      const t = V6.type(V6.parse(addr));
      const map = { gua: 0, doc: 0, ll: 1, ula: 2, mcast: 3, loop: 4, unspec: 5 };
      const extra = { 'ff02::1': ' — tous les nœuds du lien', 'ff02::2': ' — tous les routeurs', 'ff02::5': ' — routeurs OSPF', 'ff02::1:2': ' — serveurs/relais DHCPv6' };
      return {
        type: 'qcm', noShuffle: true,
        q: `Type de l'adresse <b class="mono">${addr}</b> ?`,
        choices: opts.map((o) => o[0]),
        a: map[t.key],
        expl: `<p><b>${t.label}${extra[addr] || ''}</b>.</p>` + md.table(['Préfixe', 'Type'], [['2000::/3', 'Unicast global (routable)'], ['fe80::/10', 'Lien local (toujours présente, non routée)'], ['fc00::/7 (fd00::/8)', 'ULA ≈ adresses privées'], ['ff00::/8', 'Multicast (pas de broadcast en IPv6)'], ['::1/128 · ::/128', 'Bouclage · non spécifiée']])
      };
    }
  });

  G.register({
    id: 'v6-eui64', mod: 's1', icon: '🧬', title: 'IPv6 : EUI-64',
    desc: 'Fabriquer l\'identifiant d\'interface à partir de la MAC.',
    make(r) {
      const mac = [r.pick([0x00, 0x00, 0x0c, 0x3c, 0xa4, 0x52, 0x08]), r.int(0, 255), r.int(0, 255), r.int(0, 255), r.int(0, 255), r.int(0, 255)];
      const macS = mac.map(V6.hex2).join(':').toUpperCase();
      const pfx = [0x2001, 0x0db8, r.int(1, 0xfff), r.int(0, 0xff)];
      const e = V6.eui64(macS);
      const addr = V6.compress(pfx.concat(e.hextets));
      return {
        q: `Calcule l'adresse EUI-64 de l'interface de MAC <b class="mono">${macS}</b> dans le réseau <b class="mono">${V6.compress(pfx.concat([0, 0, 0, 0]))}/64</b>.`,
        fields: [{ kind: 'v6', a: addr, wide: true, ph: '2001:db8:…' }],
        expl: md.steps([
          `Insérer FF:FE au milieu : <span class="mono">${e.withFFFE.map(V6.hex2).join(':')}</span>`,
          `Inverser le 7<sup>e</sup> bit du 1<sup>er</sup> octet : ${V6.hex2(mac[0])} = <span class="mono">${IP.bin8(mac[0])}</span> → <span class="mono">${IP.bin8(e.flipped[0])}</span> = ${V6.hex2(e.flipped[0])}`,
          `Identifiant : <span class="mono">${e.hextets.map((h) => h.toString(16)).join(':')}</span> → adresse <b class="mono">${addr}</b>`
        ]) + md.tip('00 → 02, 02 → 00, 0C → 0E, 3C → 3E, A4 → A6 : on ajoute ou retire 2 au 1er octet.')
      };
    }
  });

  G.register({
    id: 'v6-sub', mod: 's1', icon: '🧩', title: 'IPv6 : découpage /48 → /64',
    desc: 'Nombre de sous-réseaux et n-ième préfixe.',
    make(r, lvl) {
      const h3 = r.int(0x100, 0xfff);
      if (lvl === 1) {
        const p = r.pick([48, 52, 56, 60]);
        return {
          q: `Un site reçoit un préfixe <b>/${p}</b>. Combien de sous-réseaux <b>/64</b> peut-il créer ?`,
          fields: [{ kind: 'num', a: Math.pow(2, 64 - p) }],
          expl: md.f(`2<sup>64 − ${p}</sup> = 2<sup>${64 - p}</sup> = <b>${U.fmtNum(Math.pow(2, 64 - p))}</b>`)
        };
      }
      const k = r.int(2, 40);
      const ans = `2001:db8:${h3.toString(16)}:${(k - 1).toString(16)}::/64`;
      return {
        q: `Préfixe <b class="mono">2001:db8:${h3.toString(16)}::/48</b>. Écris le <b>${k}<sup>e</sup></b> sous-réseau /64 (le 1er est 2001:db8:${h3.toString(16)}::/64).`,
        fields: [{ kind: 'v6', a: ans, wide: true, show: ans }],
        expl: `<p>Le 4<sup>e</sup> groupe (16 bits) numérote les sous-réseaux : indice ${k - 1} = <b>0x${(k - 1).toString(16)}</b> en hexadécimal → <b class="mono">${ans}</b>.</p>${md.trap('Le numéro de sous-réseau s\'écrit en hexadécimal : le 11e sous-réseau est :a:, pas :10:.')}`
      };
    }
  });
})();
