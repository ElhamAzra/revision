/* Widgets d'adressage : octet interactif, visualiseur de sous-réseau, planificateur VLSM, agrégation, IPv6. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const IP = App.ip;
  const W = App.widgets;
  const bits = (n, p, o) => App.ui.bits32(n, p, o);
  const POW = [128, 64, 32, 16, 8, 4, 2, 1];

  /* ---------- Octet à cliquer (128 64 32 16 8 4 2 1) + défi ---------- */
  W.register('bits8', (el, d) => {
    el.classList.add('widget');
    let val = +(d.value || 0);
    let target = null;
    el.innerHTML = `
      <div class="w-h">🔢 L'octet interactif — clique sur les bits</div>
      <div class="octet-toggler">${POW.map((w, i) => `<button class="bitbtn" data-i="${i}"><span class="w">${w}</span><span class="v">0</span></button>`).join('')}</div>
      <div class="row mt2" style="align-items:flex-end">
        <div><div class="tiny muted">Décimal</div><div class="bignum pri-t" data-dec>0</div></div>
        <div><div class="tiny muted">Hexa</div><div class="bignum" style="font-size:1.6rem" data-hex>00</div></div>
        <div class="grow small muted" data-sum></div>
      </div>
      <div class="row mt2">
        <input class="input mono" style="max-width:150px" inputmode="numeric" placeholder="Tape 0-255" data-in>
        <button class="btn sm" data-clear>Effacer</button>
        <button class="btn sm accent" data-chal>🎯 Défi : compose un nombre</button>
        <span class="grow"></span>
      </div>
      <div class="seq-note mt1" data-note>Astuce : un masque n'utilise que des 1 « collés à gauche » → 128, 192, 224, 240, 248, 252, 254, 255.</div>`;
    const btns = U.$$('.bitbtn', el);
    const upd = () => {
      btns.forEach((b, i) => {
        const on = (val >> (7 - i)) & 1;
        b.classList.toggle('on', !!on);
        b.querySelector('.v').textContent = on;
      });
      el.querySelector('[data-dec]').textContent = val;
      el.querySelector('[data-hex]').textContent = val.toString(16).toUpperCase().padStart(2, '0');
      const parts = POW.filter((w, i) => (val >> (7 - i)) & 1);
      el.querySelector('[data-sum]').innerHTML = parts.length ? parts.join(' + ') + ' = <b>' + val + '</b>' : 'Tous les bits à 0 = 0';
      if (target != null && val === target) {
        el.querySelector('[data-note]').innerHTML = `✅ Bravo ! <b>${target}</b> = <span class="mono">${IP.bin8(target)}</span>. Nouveau défi ?`;
        App.fx.sound('ok');
        App.game.addXP(3, el.querySelector('[data-dec]'));
        App.progress.record({ gen: 'bin-octet', mod: 'm0', q: 'défi octet' }, true);
        target = null;
      }
    };
    btns.forEach((b) => b.addEventListener('click', () => { val ^= 1 << (7 - +b.dataset.i); App.fx.sound('tick'); upd(); }));
    el.querySelector('[data-in]').addEventListener('input', (e) => {
      const n = parseInt(e.target.value, 10);
      if (n >= 0 && n <= 255) {
        val = n;
        upd();
        // méthode des soustractions
        let r = n; const steps = [];
        POW.forEach((w) => { if (r >= w) { steps.push(`${r} − ${w} = ${r - w} → bit <b>1</b>`); r -= w; } });
        el.querySelector('[data-note]').innerHTML = steps.length ? '<b>Méthode des soustractions :</b> ' + steps.join(' · ') : '0 → 00000000';
      }
    });
    el.querySelector('[data-clear]').addEventListener('click', () => { val = 0; upd(); });
    el.querySelector('[data-chal]').addEventListener('click', () => {
      const pool = [192, 224, 240, 248, 252, 254, 172, 168, 200, 130, 100, 63, 127, 45, 99, 10, 20, 64, 96, 160, 176, 208, 232, 77, 150];
      target = U.pick(pool);
      val = 0;
      upd();
      el.querySelector('[data-note]').innerHTML = `🎯 Compose <b class="acc-t" style="font-size:1.2rem">${target}</b> en allumant les bons bits.`;
    });
    upd();
  });

  /* ---------- Visualiseur de sous-réseau (ET logique, nombre magique) ---------- */
  W.register('ipviz', (el, d) => {
    el.classList.add('widget');
    const init = d.ip || '172.16.45.200/20';
    el.innerHTML = `
      <div class="w-h">🔬 Visualiseur de sous-réseau — tape une adresse et bouge le curseur</div>
      <div class="row">
        <input class="input mono grow" style="max-width:260px" value="${U.esc(init)}" data-in aria-label="Adresse IP/préfixe">
        <span class="chip pri" data-pfx></span>
      </div>
      <input type="range" min="0" max="32" class="mt1" data-r aria-label="Préfixe">
      <div class="legend mt1"><span><i style="background:var(--net)"></i>partie réseau</span><span><i style="background:var(--host)"></i>partie hôte</span></div>
      <div class="mt1" data-rows></div>
      <div class="lab-out mt1" data-out></div>
      <div class="co ex mt2" data-magic></div>`;
    const inp = el.querySelector('[data-in]');
    const rng = el.querySelector('[data-r]');
    const render = () => {
      const m = inp.value.trim().match(/^(\d+\.\d+\.\d+\.\d+)\s*\/\s*(\d{1,2})$/);
      const a = m ? IP.parse(m[1]) : null;
      const p = m ? +m[2] : NaN;
      if (a == null || !(p >= 0 && p <= 32)) {
        el.querySelector('[data-rows]').innerHTML = '<p class="ko-t small">Format attendu : 192.168.10.130/26</p>';
        return;
      }
      rng.value = p;
      const c = IP.calc(a, p);
      el.querySelector('[data-pfx]').textContent = '/' + p + ' = ' + IP.str(c.mask);
      const row = (lab, n, pp, extra) => `<div class="binrow"><span class="lab">${lab}</span><span>${bits(n, pp, { sm: true })}</span><span class="dec">${IP.str(n)}${extra || ''}</span></div>`;
      el.querySelector('[data-rows]').innerHTML =
        row('Adresse', a, p) +
        row('Masque', c.mask, p) +
        `<div class="small muted" style="margin:.2rem 0 .2rem 0">ET logique (AND) bit à bit ⤵ : 1 ET 1 = 1, sinon 0</div>` +
        row('<b>Réseau</b>', c.net, p) +
        row('Broadcast', c.bc, p, '') ;
      const cell = (l, v) => `<div class="cell"><div class="l">${l}</div><div class="v">${v}</div></div>`;
      el.querySelector('[data-out]').innerHTML =
        cell('Réseau', IP.str(c.net) + '/' + p) +
        cell('Broadcast', IP.str(c.bc)) +
        cell('1er hôte', IP.str(c.first)) +
        cell('Dernier hôte', IP.str(c.last)) +
        cell('Hôtes utilisables', U.fmtNum(c.hosts)) +
        cell('Masque', IP.str(c.mask)) +
        cell('Wildcard', IP.str(c.wild)) +
        cell('Classe (historique)', c.cls) +
        cell('Type', c.type.label) +
        (c.isNet ? cell('⚠️ Attention', 'C\'est l\'adresse réseau') : '') +
        (c.isBc ? cell('⚠️ Attention', 'C\'est le broadcast') : '');
      // méthode du nombre magique
      const mg = el.querySelector('[data-magic]');
      if (p === 32) { mg.innerHTML = '<div class="co-h">🧮 /32</div>Route d\'hôte : une seule adresse (ex. loopback d\'un routeur).'; return; }
      if (p % 8 === 0) {
        const k = p / 8;
        mg.innerHTML = `<div class="co-h">🧮 Masque aligné sur l'octet</div>Avec /${p}, les ${k} premier(s) octet(s) forment le réseau, le reste est à 0 pour l'adresse réseau et à 255 pour le broadcast. Hôtes = 2<sup>${32 - p}</sup> − 2 = <b>${U.fmtNum(c.hosts)}</b>.`;
        return;
      }
      const o = c.oct, mv = IP.octets(c.mask)[o], b = 256 - mv, v = IP.octets(a)[o];
      const netO = Math.floor(v / b) * b;
      const names = ['1er', '2e', '3e', '4e'];
      mg.innerHTML = `<div class="co-h">🧮 Méthode du nombre magique (sans binaire)</div>
        <ol class="steps">
          <li>Octet intéressant : le <b>${names[o]}</b> (masque = <b>${mv}</b>, ni 255 ni 0).</li>
          <li>Bloc = 256 − ${mv} = <b class="acc-t">${b}</b> → les réseaux avancent de ${b} en ${b} : ${[0, 1, 2, 3].map((i) => i * b).filter((x) => x < 256).join(', ')}…</li>
          <li>Valeur de l'IP dans cet octet : <b>${v}</b> → plus grand multiple de ${b} ≤ ${v} = <b class="pri-t">${netO}</b> → réseau <b>${IP.str(c.net)}</b>.</li>
          <li>Broadcast = ${netO} + ${b} − 1 = <b>${netO + b - 1}</b>${o < 3 ? ' (octets suivants à 255)' : ''} → <b>${IP.str(c.bc)}</b>.</li>
          <li>Hôtes = 2<sup>${32 - p}</sup> − 2 = <b>${U.fmtNum(c.hosts)}</b> (de ${IP.str(c.first)} à ${IP.str(c.last)}).</li>
        </ol>`;
    };
    inp.addEventListener('input', render);
    rng.addEventListener('input', () => {
      const ipPart = inp.value.split('/')[0].trim();
      inp.value = ipPart + '/' + rng.value;
      render();
    });
    render();
  });

  /* ---------- Échelle des masques (valeurs à connaître) ---------- */
  W.register('masks', (el) => {
    el.classList.add('widget');
    const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
      const v = 256 - Math.pow(2, 8 - k);
      return [k, v];
    });
    el.innerHTML = `<div class="w-h">🪜 L'échelle des 8 valeurs de masque</div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>Bits à 1</th><th>Binaire</th><th>Valeur</th><th>Bloc (256 − v)</th><th>Préfixes</th></tr></thead><tbody>
      ${rows.map(([k, v]) => `<tr><td>${k}</td><td>${App.md.bits(IP.bin8(v), k, { sm: true })}</td><td class="mono"><b>${v}</b></td><td class="mono acc-t"><b>${256 - v}</b></td><td class="mono small">/${k} · /${8 + k} · /${16 + k} · /${24 + k}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small muted mb0">Lecture : on ajoute à chaque fois la moitié de ce qu'on vient d'ajouter : 128 → +64 = 192 → +32 = 224 → +16 = 240 → +8 = 248 → +4 = 252 → +2 = 254 → +1 = 255.</p>`;
  });

  /* ---------- Planificateur VLSM ---------- */
  W.register('vlsm', (el, d) => {
    el.classList.add('widget');
    const base = d.base || '10.20.0.0/22';
    const needs = d.needs || 'Admin & Finances 300\nImpôts 200\nZinder 100\nTahoua 60\nDMZ 25\nWAN Niamey-Zinder 2\nWAN Niamey-Tahoua 2\nWAN Zinder-Tahoua 2';
    el.innerHTML = `
      <div class="w-h">🏗️ Planificateur VLSM — vérifie tes plans d'adressage</div>
      <div class="grid c2">
        <div><label class="lbl">Bloc disponible</label><input class="input mono" data-b value="${U.esc(base)}"></div>
        <div><label class="lbl">Besoins (un par ligne : nom + nombre d'hôtes, passerelle comprise)</label><textarea class="input mono" rows="6" data-n>${U.esc(needs)}</textarea></div>
      </div>
      <div class="mt1" data-alloc></div>
      <div data-out class="mt1"></div>`;
    const colors = ['#5b4bff', '#ff7a1a', '#10a861', '#1f86e8', '#e5383b', '#d946ef', '#0ea5e9', '#f59e0b', '#14b8a6', '#64748b'];
    const render = () => {
      const m = el.querySelector('[data-b]').value.trim().match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/);
      const out = el.querySelector('[data-out]');
      if (!m || IP.parse(m[1]) == null) { out.innerHTML = '<p class="ko-t small">Bloc invalide (ex. 10.20.0.0/22)</p>'; return; }
      const list = el.querySelector('[data-n]').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const mm = l.match(/^(.*?)[\s:]+(\d+)$/);
        return mm ? { name: mm[1].trim(), hosts: +mm[2] } : null;
      }).filter(Boolean);
      if (!list.length) { out.innerHTML = ''; return; }
      const r = IP.vlsm(m[1], +m[2], list);
      const totalSize = r.total;
      el.querySelector('[data-alloc]').innerHTML = `<div class="alloc">${r.plan.map((x, i) => `<div style="width:${(x.size / totalSize) * 100}%;background:${colors[i % colors.length]}" title="${U.esc(x.name)}">${x.size / totalSize > 0.06 ? U.esc(x.name.split(' ')[0]) : ''}</div>`).join('')}</div>
        <div class="small mt1 ${r.ok ? 'ok-t' : 'ko-t'}"><b>${U.fmtNum(r.used)}</b> adresses utilisées sur <b>${U.fmtNum(totalSize)}</b> ${r.ok ? '✓ ça tient' : '✗ ça ne tient pas !'} — libres : ${U.fmtNum(Math.max(0, totalSize - r.used))}</div>`;
      out.innerHTML = App.md.table(['Réseau', 'Besoin', 'Taille', 'Préfixe / masque', 'Adresse réseau', 'Plage d\'hôtes', 'Broadcast'],
        r.plan.map((x, i) => [
          `<span style="color:${colors[i % colors.length]};font-weight:800">■</span> ${U.esc(x.name)}`, x.hosts, x.size,
          `/${x.p} · ${IP.str(IP.mask(x.p))}`, `<b>${IP.str(x.net)}</b>`, `${IP.str(x.first)} → ${IP.str(x.lastHost)}`, IP.str(x.bc) + (x.fits ? '' : ' ⚠️')
        ]), { mono: [3, 4, 5, 6] }) +
        `<p class="small muted mb0">Règle : pour chaque besoin, plus petite puissance de 2 ≥ hôtes + 2 ; on trie du plus grand au plus petit et on attribue à la suite.</p>`;
    };
    el.querySelector('[data-b]').addEventListener('input', render);
    el.querySelector('[data-n]').addEventListener('input', render);
    render();
  });

  /* ---------- Agrégation (résumé de routes) ---------- */
  W.register('summ', (el, d) => {
    el.classList.add('widget');
    el.innerHTML = `
      <div class="w-h">🧲 Agrégation de routes — bits communs en couleur</div>
      <textarea class="input mono" rows="4" data-n>${U.esc(d.nets || '172.16.8.0/24\n172.16.9.0/24\n172.16.10.0/24\n172.16.11.0/24')}</textarea>
      <div data-out class="mt1"></div>`;
    const render = () => {
      const list = el.querySelector('[data-n]').value.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean).map((s) => {
        const m = s.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/);
        return m && IP.parse(m[1]) != null ? { net: IP.network(IP.parse(m[1]), +m[2]), p: +m[2] } : null;
      }).filter(Boolean);
      const out = el.querySelector('[data-out]');
      if (list.length < 2) { out.innerHTML = '<p class="small muted">Entre au moins deux réseaux (un par ligne).</p>'; return; }
      const s = IP.summarize(list);
      out.innerHTML = list.map((r) => `<div class="binrow"><span class="lab mono">${IP.str(r.net)}/${r.p}</span><span>${bits(r.net, s.p, { sm: true })}</span><span></span></div>`).join('') +
        `<div class="co ${s.exact ? 'key' : 'trap'} mt1"><div class="co-h">${s.exact ? '✅ Résumé exact' : '⚠️ Sur-agrégation'}</div>
        <b>${s.p}</b> bits communs → route résumée <b class="mono">${IP.str(s.net)}/${s.p}</b> (${IP.str(IP.mask(s.p))}).
        ${s.exact ? 'Elle couvre exactement les réseaux donnés.' : `Elle couvre ${U.fmtNum(IP.size(s.p))} adresses alors que les réseaux n'en font que ${U.fmtNum(U.sum(list.map((r) => IP.size(r.p))))} : elle annonce des réseaux qui ne sont pas derrière ce routeur (risque de trou noir).`}</div>`;
    };
    el.querySelector('[data-n]').addEventListener('input', render);
    render();
  });

  /* ---------- Outil IPv6 (compression, type, EUI-64) ---------- */
  W.register('ipv6', (el, d) => {
    el.classList.add('widget');
    el.innerHTML = `
      <div class="w-h">🛰️ Atelier IPv6</div>
      <label class="lbl">Adresse IPv6 (complète ou compressée)</label>
      <input class="input mono" data-a value="${U.esc(d.addr || '2001:0DB8:0000:0000:0000:FF00:0042:8329')}">
      <div class="lab-out mt1" data-out></div>
      <hr>
      <label class="lbl">EUI-64 : adresse MAC + préfixe /64</label>
      <div class="grid c2"><input class="input mono" data-mac value="${U.esc(d.mac || '00:1A:2B:3C:4D:5E')}"><input class="input mono" data-pfx value="${U.esc(d.pfx || '2001:db8:a:1::/64')}"></div>
      <div data-eui class="mt1"></div>`;
    const V = IP.v6;
    const r1 = () => {
      const p = V.parse(el.querySelector('[data-a]').value);
      const out = el.querySelector('[data-out]');
      if (!p) { out.innerHTML = '<p class="ko-t small">Adresse invalide (8 groupes de 16 bits, « :: » une seule fois).</p>'; return; }
      const cell = (l, v) => `<div class="cell" style="grid-column:1/-1"><div class="l">${l}</div><div class="v">${v}</div></div>`;
      out.innerHTML = cell('Forme complète', V.full(p)) + cell('Forme compressée (canonique)', V.compress(p)) + cell('Type', V.type(p).label);
    };
    const r2 = () => {
      const box = el.querySelector('[data-eui]');
      const mac = el.querySelector('[data-mac]').value;
      if (!/^([0-9a-f]{2}[:\-.]?){5}[0-9a-f]{2}$/i.test(mac.trim())) { box.innerHTML = '<p class="ko-t small">MAC invalide</p>'; return; }
      const e = V.eui64(mac);
      const pf = V.parse(el.querySelector('[data-pfx]').value.split('/')[0]);
      const h2 = (a) => a.map(V.hex2).join(':');
      const b0 = e.withFFFE[0], f0 = e.flipped[0];
      box.innerHTML = App.md.steps([
        `Couper la MAC en deux et insérer <b>FF:FE</b> au milieu : <span class="mono">${h2(e.withFFFE)}</span>`,
        `Inverser le 7<sup>e</sup> bit (U/L) du 1<sup>er</sup> octet : <span class="mono">${V.hex2(b0)} = ${IP.bin8(b0).slice(0, 6)}<b class="acc-t">${IP.bin8(b0)[6]}</b>${IP.bin8(b0)[7]}</span> → <span class="mono">${IP.bin8(f0).slice(0, 6)}<b class="acc-t">${IP.bin8(f0)[6]}</b>${IP.bin8(f0)[7]} = ${V.hex2(f0)}</span>`,
        `Identifiant d'interface : <b class="mono">${e.hextets.map((h) => h.toString(16)).join(':')}</b>`,
        pf ? `Adresse complète : <b class="mono">${V.compress(pf.slice(0, 4).concat(e.hextets))}</b>` : 'Préfixe invalide'
      ]);
    };
    el.querySelector('[data-a]').addEventListener('input', r1);
    el.querySelector('[data-mac]').addEventListener('input', r2);
    el.querySelector('[data-pfx]').addEventListener('input', r2);
    r1(); r2();
  });
})();
