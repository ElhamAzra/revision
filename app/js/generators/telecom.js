/* Générateurs télécoms : décibels, bilan de liaison, Shannon, Nyquist, VoIP, MIC / E1, bilan optique. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const G = App.gen;
  const md = App.md;
  const log2 = Math.log2;

  G.register({
    id: 'db', mod: 's6', icon: '📡', title: 'Décibels sans calculatrice',
    desc: '+3 dB = ×2, +10 dB = ×10, dBm ↔ mW.',
    make(r, lvl) {
      if (lvl === 1) {
        const x = r.pick([[3, 2], [6, 4], [9, 8], [10, 10], [13, 20], [16, 40], [20, 100], [23, 200], [30, 1000], [40, 10000]]);
        const neg = r.chance(0.3);
        return {
          q: neg ? `Une perte de <b>${x[0]} dB</b> divise la puissance par combien ?` : `Un gain de <b>${x[0]} dB</b> multiplie la puissance par combien ?`,
          fields: [{ kind: 'num', a: x[1] }],
          expl: md.f(`${x[0]} dB = ${Math.floor(x[0] / 10) ? Math.floor(x[0] / 10) + ' × 10 dB' : ''}${Math.floor(x[0] / 10) && x[0] % 10 ? ' + ' : ''}${x[0] % 10 ? (x[0] % 10) / 3 + ' × 3 dB' : ''} → ${neg ? '÷' : '×'} <b class="hl">${U.fmtNum(x[1])}</b>`) + md.key('+3 dB = ×2 · +10 dB = ×10 · les dB s\'additionnent quand les rapports se multiplient.')
        };
      }
      if (lvl === 2) {
        const x = r.pick([[0, '1 mW', 1], [10, '10 mW', 10], [20, '100 mW', 100], [30, '1 W', 1000], [-10, '0,1 mW', 0.1], [-20, '0,01 mW', 0.01], [-30, '1 µW', 0.001], [3, '2 mW', 2], [13, '20 mW', 20], [23, '200 mW', 200], [33, '2 W', 2000], [27, '500 mW', 500]]);
        return {
          q: `Convertis <b>${x[0]} dBm</b> en milliwatts (mW).`,
          fields: [{ kind: 'num', a: x[2], rel: 0.03, show: x[1] }],
          expl: md.f(`P = 10<sup>${x[0]}/10</sup> mW = <b class="hl">${x[1]}</b>`) + md.tip('0 dBm = 1 mW ; chaque +10 dBm multiplie par 10 ; +3 dBm double ; 27 dBm = 30 − 3 → 1 W ÷ 2 = 500 mW.')
        };
      }
      const pe = r.pick([20, 23, 27, 30]), l1 = r.int(1, 6), g = r.pick([0, 10, 15]), l2 = r.int(2, 9);
      const res = pe - l1 + g - l2;
      return {
        q: `Un émetteur de <b>${pe} dBm</b> traverse un câble (−${l1} dB), un amplificateur (+${g} dB) puis un répartiteur (−${l2} dB). Puissance de sortie en dBm ?`,
        fields: [{ kind: 'num', a: res }],
        expl: md.f(`${pe} − ${l1} + ${g} − ${l2} = <b class="hl">${res} dBm</b>`) + md.key('En dB, on additionne les gains et on soustrait les pertes : pas de multiplication.')
      };
    },
    quick(r) {
      const x = r.pick([[3, 2], [10, 10], [20, 100], [30, 1000], [13, 20], [6, 4]]);
      return { q: `+${x[0]} dB = puissance × ?`, fields: [{ kind: 'num', a: x[1] }], expl: '×' + x[1] };
    }
  });

  G.register({
    id: 'budget', mod: 's6', icon: '🗼', title: 'Bilan de liaison',
    desc: 'Puissance reçue et marge (radio ou fibre).',
    make(r, lvl) {
      if (lvl === 3) {
        const km = r.pick([10, 20, 25, 40, 50, 60]), att = r.pick([0.25, 0.2, 0.35]), con = 2, sp = r.int(2, 10), pe = r.pick([0, -3, 3]), sens = r.pick([-28, -30, -24]);
        const loss = km * att + con * 0.5 + sp * 0.1, pr = pe - loss;
        return {
          q: `Fibre monomode de <b>${km} km</b> (${U.fmtNum(att)} dB/km), 2 connecteurs (0,5 dB chacun), ${sp} épissures (0,1 dB chacune). Émetteur ${pe} dBm, sensibilité ${sens} dBm. Puissance reçue et marge ?`,
          fields: [{ label: 'P reçue (dBm)', kind: 'num', a: Math.round(pr * 100) / 100, tol: 0.05 }, { label: 'Marge (dB)', kind: 'num', a: Math.round((pr - sens) * 100) / 100, tol: 0.05 }],
          expl: md.steps([`Fibre : ${km} × ${U.fmtNum(att)} = ${U.fmtNum(km * att)} dB`, `Connecteurs : 2 × 0,5 = 1 dB · épissures : ${sp} × 0,1 = ${U.fmtNum(sp * 0.1)} dB`, `Pertes totales = ${U.fmtNum(loss)} dB → P reçue = ${pe} − ${U.fmtNum(loss)} = <b>${U.fmtNum(pr)} dBm</b>`, `Marge = ${U.fmtNum(pr)} − (${sens}) = <b>${U.fmtNum(pr - sens)} dB</b>`])
        };
      }
      const pe = r.pick([20, 23, 27, 30]), ge = r.pick([15, 20, 25, 30]), gr = ge, lc = r.int(1, 3), lp = r.int(110, 145), sens = r.pick([-70, -75, -80, -85]);
      const pr = pe + ge + gr - 2 * lc - lp, m = pr - sens;
      return {
        q: `Faisceau hertzien : puissance émise <b>${pe} dBm</b>, antennes <b>${ge} dBi</b> de chaque côté, pertes câbles <b>${lc} dB</b> de chaque côté, affaiblissement de propagation <b>${lp} dB</b>, sensibilité du récepteur <b>${sens} dBm</b>.`,
        fields: [{ label: 'P reçue (dBm)', kind: 'num', a: pr }, { label: 'Marge (dB)', kind: 'num', a: m }, { label: 'Conclusion', kind: 'select', opts: ['Viable (marge ≥ 10 dB)', 'Fragile (0 à 10 dB)', 'Impossible (marge < 0)'], a: m >= 10 ? 0 : m >= 0 ? 1 : 2 }],
        expl: md.f(`P<sub>r</sub> = ${pe} + ${ge} + ${gr} − ${lc} − ${lc} − ${lp} = <b class="hl">${pr} dBm</b>`) + md.f(`Marge = ${pr} − (${sens}) = <b class="hl">${m} dB</b>`) + md.key('On vise une marge ≥ 10 dB (pluie, vent de sable, vieillissement).')
      };
    }
  });

  G.register({
    id: 'shannon', mod: 's6', icon: '📶', title: 'Shannon & Nyquist',
    desc: 'Capacité d\'un canal, débit, bauds.',
    make(r, lvl) {
      if (lvl === 1) {
        const M = r.pick([2, 4, 8, 16, 64, 256]);
        const R = r.pick([1200, 2400, 3200, 4800]);
        return {
          q: `Une modulation à <b>${M} états</b> transmet <b>${U.fmtNum(R)} bauds</b>. Quel est le débit en bit/s ?`,
          fields: [{ kind: 'num', a: R * log2(M) }],
          expl: md.f(`D = R × log<sub>2</sub>(M) = ${U.fmtNum(R)} × ${log2(M)} = <b class="hl">${U.fmtNum(R * log2(M))} bit/s</b>`) + md.tip('log₂ : 2 → 1, 4 → 2, 8 → 3, 16 → 4, 64 → 6, 256 → 8.')
        };
      }
      if (lvl === 2 && r.chance(0.5)) {
        const B = r.pick([3100, 4000, 1000000, 20000000]), M = r.pick([2, 4, 16, 64]);
        const D = 2 * B * log2(M);
        return {
          q: `Canal sans bruit de bande passante <b>${U.fmtNum(B)} Hz</b>, signal à <b>${M} niveaux</b>. Débit maximal (Nyquist) en bit/s ?`,
          fields: [{ kind: 'num', a: D }],
          expl: md.f(`D<sub>max</sub> = 2 × B × log<sub>2</sub>(M) = 2 × ${U.fmtNum(B)} × ${log2(M)} = <b class="hl">${U.fmtNum(D)} bit/s</b>`)
        };
      }
      const B = r.pick([3100, 4000, 1000000, 5000000]), sn = r.pick([10, 20, 30, 40]);
      const lin = Math.pow(10, sn / 10), lg = log2(1 + lin);
      const C = B * lg;
      return {
        q: `Canal de bande passante <b>${U.fmtNum(B)} Hz</b> avec un rapport signal/bruit de <b>${sn} dB</b>. Capacité de Shannon en bit/s ? <span class="small muted">(log₂(1 + ${U.fmtNum(lin)}) ≈ ${U.fmtNum(lg, 2)})</span>`,
        fields: [{ kind: 'num', a: C, rel: 0.02, show: U.fmtNum(Math.round(C)) + ' bit/s' }],
        expl: md.steps([`S/N en linéaire : ${sn} dB → 10<sup>${sn / 10}</sup> = <b>${U.fmtNum(lin)}</b>`, `C = B × log₂(1 + S/N) = ${U.fmtNum(B)} × ${U.fmtNum(lg, 2)} ≈ <b>${U.fmtNum(Math.round(C))} bit/s</b>`]) + md.trap('Toujours convertir les dB en rapport linéaire avant Shannon : 30 dB → 1 000, pas 30.')
      };
    }
  });

  G.register({
    id: 'voip-bw', mod: 's6', icon: '☎️', title: 'Bande passante VoIP',
    desc: 'G.711 = 80 kbit/s, G.729 = 24 kbit/s en IP (20 ms).',
    make(r, lvl) {
      const codec = r.pick([['G.711', 64000], ['G.729', 8000]]);
      const ms = lvl === 3 ? r.pick([20, 30]) : 20;
      const pps = 1000 / ms, voice = (codec[1] * ms) / 8000, pkt = voice + 40, bw = (pkt * 8 * pps) / 1000;
      if (lvl === 1) return {
        q: `Débit IP d'un appel <b>${codec[0]}</b> avec des paquets toutes les ${ms} ms (en-têtes IP + UDP + RTP = 40 octets), en kbit/s ?`,
        fields: [{ kind: 'num', a: bw }],
        expl: md.steps([`${pps} paquets/s`, `voix = ${U.fmtNum(codec[1])} × ${ms / 1000} ÷ 8 = ${voice} octets`, `paquet = ${voice} + 40 = ${pkt} octets`, `${pkt} × 8 × ${pps} = <b>${U.fmtNum(bw)} kbit/s</b>`])
      };
      const n = r.int(5, 30), cap = r.pick([512, 1024, 2048, 4096]);
      const tot = bw * n;
      return {
        q: `<b>${n} appels</b> simultanés en <b>${codec[0]}</b> (paquets de ${ms} ms) sur une liaison de <b>${U.fmtNum(cap)} kbit/s</b>. Bande passante totale (kbit/s) et pourcentage du lien ?`,
        fields: [{ label: 'Total (kbit/s)', kind: 'num', a: tot, tol: 0.5 }, { label: '% du lien', kind: 'num', a: Math.round((tot / cap) * 100), tol: 1 }],
        expl: md.steps([`1 appel = (${voice} + 40) × 8 × ${pps} = ${U.fmtNum(bw)} kbit/s`, `${n} × ${U.fmtNum(bw)} = <b>${U.fmtNum(tot)} kbit/s</b>`, `${U.fmtNum(tot)} ÷ ${cap} ≈ <b>${Math.round((tot / cap) * 100)} %</b>${tot > cap ? ' → le lien est saturé !' : ''}`])
      };
    }
  });

  G.register({
    id: 'mic', mod: 's6', icon: '🎙️', title: 'MIC, E1, SDH',
    desc: '64 kbit/s, 30 voies par E1, 63 E1 par STM-1.',
    make(r, lvl) {
      if (lvl === 1) {
        const x = r.pick([
          ['Débit d\'un canal téléphonique numérique MIC (kbit/s) ?', 64, '8 000 échantillons/s × 8 bits = 64 kbit/s'],
          ['Combien de voies de voix dans un E1 ?', 30, '32 IT dont IT0 (synchronisation) et IT16 (signalisation) → 30 voies'],
          ['Débit d\'un E1 en kbit/s ?', 2048, '32 × 64 = 2 048 kbit/s'],
          ['Combien d\'E1 dans un STM-1 ?', 63, 'STM-1 = 155,52 Mbit/s = 63 E1'],
          ['Fréquence d\'échantillonnage de la voix (Hz) ?', 8000, 'Shannon-Nyquist : fe ≥ 2 × 4 kHz'],
          ['Débit d\'un accès de base RNIS 2B + D (kbit/s) ?', 144, '2 × 64 + 16 = 144 kbit/s']
        ]);
        return { q: x[0], fields: [{ kind: 'num', a: x[1] }], expl: `<p>${x[2]}.</p>` };
      }
      const calls = r.int(31, 200);
      const e1 = Math.ceil(calls / 30);
      return {
        q: `Un centre d'appels doit écouler <b>${calls} communications</b> simultanées en téléphonie classique (MIC). Combien de liens E1 faut-il ?`,
        fields: [{ kind: 'num', a: e1 }],
        expl: md.f(`${md.frac(calls, 30)} = ${U.fmtNum(calls / 30, 2)} → arrondi au supérieur : <b class="hl">${e1} E1</b>`) + md.trap('Un E1 transporte 30 voies, pas 32 (IT0 et IT16 sont réservés).')
      };
    }
  });
})();
