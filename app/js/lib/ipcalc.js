/* Bibliothèque de calcul IPv4 / IPv6 (sans dépendance).
   Toutes les adresses IPv4 sont manipulées comme des entiers non signés 32 bits. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const ip = (App.ip = {});

  ip.parse = (s) => {
    if (typeof s === 'number') return s >>> 0;
    const m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const o = m.slice(1).map(Number);
    if (o.some((x) => x > 255)) return null;
    return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
  };
  ip.octets = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  ip.str = (n) => ip.octets(n >>> 0).join('.');
  ip.mask = (p) => (p <= 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
  ip.wild = (p) => (~ip.mask(p)) >>> 0;
  ip.prefixOf = (maskInt) => {
    maskInt = maskInt >>> 0;
    let p = 0;
    while (p < 32 && ((maskInt >>> (31 - p)) & 1)) p++;
    return ip.mask(p) === maskInt ? p : -1; // -1 = masque non contigu
  };
  ip.network = (a, p) => (a & ip.mask(p)) >>> 0;
  ip.broadcast = (a, p) => (ip.network(a, p) | ip.wild(p)) >>> 0;
  ip.size = (p) => Math.pow(2, 32 - p);
  ip.hosts = (p) => (p >= 32 ? 1 : p === 31 ? 2 : Math.pow(2, 32 - p) - 2);
  ip.first = (a, p) => (p >= 31 ? ip.network(a, p) : ip.network(a, p) + 1) >>> 0;
  ip.last = (a, p) => (p >= 31 ? ip.broadcast(a, p) : ip.broadcast(a, p) - 1) >>> 0;
  /* octet « intéressant » (où le masque n'est ni 255 ni 0) : 0..3 */
  ip.interesting = (p) => (p >= 32 ? 3 : Math.min(3, Math.floor(p / 8)));
  ip.block = (p) => {
    if (p % 8 === 0 && p < 32) return 256;
    const m = ip.octets(ip.mask(p))[ip.interesting(p)];
    return 256 - m;
  };
  ip.bin = (n, sep) => {
    const s = (n >>> 0).toString(2).padStart(32, '0');
    return [s.slice(0, 8), s.slice(8, 16), s.slice(16, 24), s.slice(24)].join(sep == null ? '.' : sep);
  };
  ip.bin8 = (v) => (v & 255).toString(2).padStart(8, '0');
  ip.prefixForHosts = (h) => {
    for (let p = 30; p >= 0; p--) if (ip.hosts(p) >= h) return p;
    return 0;
  };
  ip.prefixForAddresses = (n) => {
    for (let p = 32; p >= 0; p--) if (ip.size(p) >= n) return p;
    return 0;
  };
  ip.classOf = (n) => {
    const a = n >>> 24;
    if (a < 128) return 'A';
    if (a < 192) return 'B';
    if (a < 224) return 'C';
    if (a < 240) return 'D';
    return 'E';
  };
  ip.inRange = (n, net, p) => ip.network(n, p) === (ip.parse(net) >>> 0);
  ip.typeOf = (n) => {
    n = n >>> 0;
    const t = [
      ['0.0.0.0', 32, 'this', '« Cette machine » / adresse non spécifiée'],
      ['255.255.255.255', 32, 'bcast', 'Broadcast limité (jamais routé)'],
      ['10.0.0.0', 8, 'private', 'Privée (RFC 1918)'],
      ['172.16.0.0', 12, 'private', 'Privée (RFC 1918)'],
      ['192.168.0.0', 16, 'private', 'Privée (RFC 1918)'],
      ['127.0.0.0', 8, 'loopback', 'Bouclage (loopback)'],
      ['169.254.0.0', 16, 'apipa', 'APIPA / lien local (pas de bail DHCP)'],
      ['100.64.0.0', 10, 'cgnat', 'CGNAT (NAT chez l\'opérateur)'],
      ['224.0.0.0', 4, 'multicast', 'Multicast (ex-classe D)'],
      ['240.0.0.0', 4, 'reserved', 'Réservée (ex-classe E)'],
      ['192.0.2.0', 24, 'doc', 'Documentation (TEST-NET-1)'],
      ['198.51.100.0', 24, 'doc', 'Documentation (TEST-NET-2)'],
      ['203.0.113.0', 24, 'doc', 'Documentation (TEST-NET-3)'],
      ['0.0.0.0', 8, 'this', 'Réseau « ce réseau » (0.0.0.0/8)']
    ];
    for (const [net, p, key, label] of t) if (ip.inRange(n, net, p)) return { key, label };
    return { key: 'public', label: 'Publique (routable sur Internet)' };
  };

  /* Calcul complet d'un sous-réseau */
  ip.calc = (addr, p) => {
    const a = typeof addr === 'number' ? addr >>> 0 : ip.parse(addr);
    if (a == null || p < 0 || p > 32) return null;
    const net = ip.network(a, p), bc = ip.broadcast(a, p);
    return {
      addr: a, prefix: p, mask: ip.mask(p), wild: ip.wild(p),
      net, bc, first: ip.first(a, p), last: ip.last(a, p),
      hosts: ip.hosts(p), size: ip.size(p),
      block: ip.block(p), oct: ip.interesting(p),
      isNet: a === net && p < 31, isBc: a === bc && p < 31,
      cls: ip.classOf(a), type: ip.typeOf(a)
    };
  };

  /* Agrégation : plus petit préfixe couvrant toutes les routes */
  ip.summarize = (list) => {
    // list : [{net:int, p:int}]
    let lo = Math.min(...list.map((r) => ip.network(r.net, r.p)));
    let hi = Math.max(...list.map((r) => ip.broadcast(r.net, r.p)));
    let p = 32;
    while (p > 0 && !(ip.network(lo, p) === ip.network(hi, p))) p--;
    const net = ip.network(lo, p);
    const covered = ip.size(p);
    const actual = U.sum(list.map((r) => ip.size(r.p)));
    return { net, p, exact: covered === actual };
  };

  /* VLSM : besoins [{name, hosts}] (passerelle comprise) → plan aligné, du plus grand au plus petit */
  ip.vlsm = (base, baseP, needs) => {
    const b = typeof base === 'number' ? base : ip.parse(base);
    const sorted = needs.map((n, i) => Object.assign({ i }, n)).sort((x, y) => y.hosts - x.hosts || x.i - y.i);
    let cur = ip.network(b, baseP);
    const end = ip.broadcast(b, baseP);
    const out = [];
    let ok = true;
    for (const n of sorted) {
      const p = n.p != null ? n.p : ip.prefixForHosts(n.hosts);
      const size = ip.size(p);
      // alignement sur un multiple de la taille
      if (cur % size !== 0) cur = (Math.ceil(cur / size) * size) >>> 0;
      const last = cur + size - 1;
      if (last > end) ok = false;
      out.push({ name: n.name, hosts: n.hosts, p, size, net: cur >>> 0, bc: last >>> 0, first: (p >= 31 ? cur : cur + 1) >>> 0, lastHost: (p >= 31 ? last : last - 1) >>> 0, fits: last <= end });
      cur = (last + 1) >>> 0;
    }
    return { plan: out, ok, used: U.sum(out.map((x) => x.size)), total: ip.size(baseP), next: cur };
  };

  /* ---------------- IPv6 ---------------- */
  const v6 = (ip.v6 = {});
  /* Développe en 8 hextets numériques ; null si invalide */
  v6.parse = (s) => {
    s = String(s).trim().toLowerCase().replace(/\/\d+$/, '');
    if (!/^[0-9a-f:]+$/.test(s)) return null;
    const dbl = s.split('::');
    if (dbl.length > 2) return null;
    const left = dbl[0] ? dbl[0].split(':') : [];
    const right = dbl.length === 2 && dbl[1] ? dbl[1].split(':') : [];
    if ([...left, ...right].some((h) => h === '' || h.length > 4)) return null;
    let groups;
    if (dbl.length === 2) {
      const missing = 8 - left.length - right.length;
      if (missing < 1) return null;
      groups = [...left, ...Array(missing).fill('0'), ...right];
    } else {
      groups = left;
    }
    if (groups.length !== 8) return null;
    return groups.map((h) => parseInt(h, 16));
  };
  v6.full = (arr) => arr.map((h) => h.toString(16).padStart(4, '0')).join(':');
  /* Forme compressée canonique (RFC 5952) */
  v6.compress = (arr) => {
    let bestS = -1, bestL = 0, s = -1, l = 0;
    for (let i = 0; i <= 8; i++) {
      if (i < 8 && arr[i] === 0) {
        if (s < 0) { s = i; l = 0; }
        l++;
      } else if (s >= 0) {
        if (l > bestL) { bestS = s; bestL = l; }
        s = -1;
      }
    }
    const hex = arr.map((h) => h.toString(16));
    if (bestL < 2) return hex.join(':');
    const left = hex.slice(0, bestS).join(':');
    const right = hex.slice(bestS + bestL).join(':');
    return left + '::' + right;
  };
  v6.type = (arr) => {
    const h0 = arr[0];
    if (arr.every((x) => x === 0)) return { key: 'unspec', label: 'Non spécifiée (::/128)' };
    if (arr.slice(0, 7).every((x) => x === 0) && arr[7] === 1) return { key: 'loop', label: 'Bouclage (::1/128)' };
    if ((h0 & 0xff00) === 0xff00) return { key: 'mcast', label: 'Multicast (ff00::/8)' };
    if ((h0 & 0xffc0) === 0xfe80) return { key: 'll', label: 'Lien local (fe80::/10)' };
    if ((h0 & 0xfe00) === 0xfc00) return { key: 'ula', label: 'Unique locale ULA (fc00::/7)' };
    if (h0 === 0x2001 && arr[1] === 0x0db8) return { key: 'doc', label: 'Unicast global — plage de documentation (2001:db8::/32)' };
    if ((h0 & 0xe000) === 0x2000) return { key: 'gua', label: 'Unicast global (2000::/3)' };
    return { key: 'other', label: 'Autre / réservée' };
  };
  /* EUI-64 : MAC « 00:1A:2B:3C:4D:5E » → identifiant d'interface (4 hextets) avec étapes */
  v6.eui64 = (mac) => {
    const b = String(mac).toLowerCase().replace(/[^0-9a-f]/g, '').match(/.{2}/g).map((x) => parseInt(x, 16));
    const withFFFE = [b[0], b[1], b[2], 0xff, 0xfe, b[3], b[4], b[5]];
    const flipped = withFFFE.slice();
    flipped[0] = flipped[0] ^ 0x02;
    const hextets = [];
    for (let i = 0; i < 8; i += 2) hextets.push((flipped[i] << 8) | flipped[i + 1]);
    return { bytes: b, withFFFE, flipped, hextets };
  };
  v6.hex2 = (n) => n.toString(16).padStart(2, '0');
})();
