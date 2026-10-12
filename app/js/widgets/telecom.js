/* Widgets télécoms : décibels et bilan de liaison, bande passante VoIP. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const W = App.widgets;
  const md = App.md;

  W.register('db', (el) => {
    el.classList.add('widget');
    el.innerHTML = `
      <div class="w-h">📡 Convertisseur décibels</div>
      <div class="grid c2">
        <div><label class="lbl">Gain / perte en dB</label><input class="input mono" data-db value="13"><div data-dbo class="small mt1"></div></div>
        <div><label class="lbl">Puissance en dBm</label><input class="input mono" data-dbm value="27"><div data-dbmo class="small mt1"></div></div>
      </div>
      <hr>
      <div class="w-h">🗼 Bilan de liaison radio (faisceau hertzien)</div>
      <div class="grid c3">
        <div><label class="lbl">Puissance émise (dBm)</label><input class="input mono" data-pe value="27"></div>
        <div><label class="lbl">Gain antenne émission (dBi)</label><input class="input mono" data-ge value="30"></div>
        <div><label class="lbl">Gain antenne réception (dBi)</label><input class="input mono" data-gr value="30"></div>
        <div><label class="lbl">Pertes câbles (dB, total)</label><input class="input mono" data-lc value="4"></div>
        <div><label class="lbl">Affaiblissement propagation (dB)</label><input class="input mono" data-lp value="140"></div>
        <div><label class="lbl">Sensibilité récepteur (dBm)</label><input class="input mono" data-sens value="-75"></div>
      </div>
      <div data-b class="mt1"></div>`;
    const n = (k) => U.parseNum(el.querySelector(k).value);
    const render = () => {
      const db = n('[data-db]');
      if (!isNaN(db)) {
        const ratio = Math.pow(10, db / 10);
        // décomposition en 10 et 3
        let rest = Math.abs(db), parts = [];
        const tens = Math.floor(rest / 10); rest -= tens * 10;
        const threes = Math.round(rest / 3);
        if (tens) parts.push(`${tens} × 10 dB (× ${Math.pow(10, tens)})`);
        if (threes && Math.abs(rest - threes * 3) < 0.01) parts.push(`${threes} × 3 dB (× ${Math.pow(2, threes)})`);
        el.querySelector('[data-dbo]').innerHTML = `Rapport de puissance : <b>${db >= 0 ? '× ' : '÷ '}${U.fmtNum(db >= 0 ? ratio : 1 / ratio, 2)}</b>${parts.length && Math.abs(rest - threes * 3) < 0.01 ? `<br><span class="muted">Astuce : ${parts.join(' + ')}</span>` : ''}`;
      }
      const dbm = n('[data-dbm]');
      if (!isNaN(dbm)) {
        const mw = Math.pow(10, dbm / 10);
        el.querySelector('[data-dbmo]').innerHTML = `= <b>${mw >= 1000 ? U.fmtNum(mw / 1000, 3) + ' W' : mw >= 1 ? U.fmtNum(mw, 3) + ' mW' : U.fmtNum(mw * 1000, 3) + ' µW'}</b> <span class="muted">(0 dBm = 1 mW, 30 dBm = 1 W)</span>`;
      }
      const pe = n('[data-pe]'), ge = n('[data-ge]'), gr = n('[data-gr]'), lc = n('[data-lc]'), lp = n('[data-lp]'), s = n('[data-sens]');
      if ([pe, ge, gr, lc, lp, s].some(isNaN)) return;
      const pr = pe + ge + gr - lc - lp, marge = pr - s;
      el.querySelector('[data-b]').innerHTML = md.f(`P<sub>reçue</sub> = ${pe} + ${ge} + ${gr} − ${lc} − ${lp} = <b class="hl">${U.fmtNum(pr)} dBm</b>`) +
        md.f(`Marge = ${U.fmtNum(pr)} − (${U.fmtNum(s)}) = <b class="hl">${U.fmtNum(marge)} dB</b>`) +
        `<div class="co ${marge >= 10 ? 'reflex' : marge >= 0 ? 'tip' : 'trap'}"><div class="co-h">${marge >= 10 ? '✅ Liaison viable' : marge >= 0 ? '⚠️ Liaison fragile' : '⛔ Liaison impossible'}</div>${marge >= 10 ? 'Marge ≥ 10 dB : bonne réserve contre la pluie, le vent de sable, le vieillissement.' : marge >= 0 ? 'Le signal passe, mais la marge &lt; 10 dB ne protège pas des évanouissements.' : 'La puissance reçue est inférieure à la sensibilité.'}</div>`;
    };
    U.$$('input', el).forEach((x) => x.addEventListener('input', render));
    render();
  });

  W.register('voip', (el) => {
    el.classList.add('widget');
    const CODECS = { 'G.711 (64 kbit/s)': 64000, 'G.729 (8 kbit/s)': 8000, 'G.722 (64 kbit/s)': 64000, 'G.723.1 (6,3 kbit/s)': 6300 };
    el.innerHTML = `
      <div class="w-h">☎️ Bande passante VoIP</div>
      <div class="grid c3">
        <div><label class="lbl">Codec</label><select class="input" data-c>${Object.keys(CODECS).map((k) => `<option>${k}</option>`).join('')}</select></div>
        <div><label class="lbl">Paquetisation (ms)</label><select class="input" data-ms><option>10</option><option selected>20</option><option>30</option></select></div>
        <div><label class="lbl">En-tête de couche 2</label><select class="input" data-l2><option value="0">Aucun (débit IP)</option><option value="18">Ethernet (18 o)</option><option value="6">PPP (6 o)</option></select></div>
        <div><label class="lbl">Appels simultanés</label><input class="input mono" data-n value="20"></div>
        <div><label class="lbl">Capacité du lien (kbit/s)</label><input class="input mono" data-cap value="2048"></div>
      </div>
      <div data-o class="mt1"></div>`;
    const render = () => {
      const rate = CODECS[el.querySelector('[data-c]').value];
      const ms = +el.querySelector('[data-ms]').value;
      const l2 = +el.querySelector('[data-l2]').value;
      const n = U.parseNum(el.querySelector('[data-n]').value) || 0;
      const cap = U.parseNum(el.querySelector('[data-cap]').value) || 1;
      const pps = 1000 / ms;
      const voice = (rate * ms) / 1000 / 8;
      const pkt = voice + 40 + l2;
      const bw = pkt * 8 * pps;
      const tot = bw * n;
      el.querySelector('[data-o]').innerHTML = md.steps([
        `Paquets par seconde = 1000 ÷ ${ms} = <b>${pps}</b>`,
        `Voix par paquet = ${U.fmtNum(rate)} × ${ms / 1000} ÷ 8 = <b>${U.fmtNum(voice)} octets</b>`,
        `En-têtes = RTP 12 + UDP 8 + IP 20 = 40 octets${l2 ? ' + ' + l2 + ' (couche 2)' : ''} → paquet de <b>${U.fmtNum(pkt)} octets</b>`,
        `Débit d'un appel = ${U.fmtNum(pkt)} × 8 × ${pps} = <b>${U.fmtNum(bw / 1000, 1)} kbit/s</b> (dans chaque sens)`,
        `${n} appels = <b>${U.fmtNum(tot / 1000, 1)} kbit/s</b> = <b class="${tot / 1000 / cap > 0.75 ? 'ko-t' : 'ok-t'}">${U.fmtNum((tot / 1000 / cap) * 100, 0)} %</b> du lien de ${U.fmtNum(cap)} kbit/s`
      ]) + md.tip('Seuils de qualité : délai &lt; 150 ms dans un sens, gigue &lt; 30 ms, pertes &lt; 1 %. On réserve en général au plus ~33 à 75 % du lien à la voix (LLQ).');
    };
    U.$$('input, select', el).forEach((x) => { x.addEventListener('input', render); x.addEventListener('change', render); });
    render();
  });
})();
