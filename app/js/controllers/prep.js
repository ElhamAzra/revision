/* Indice de préparation : estimation des notes E1 / E2 et de la moyenne à partir des résultats,
   niveau de confiance, risque éliminatoire, priorités (les modules qui rapportent le plus de points). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  /* Poids des modules dans chaque épreuve (d'après le plan et les barèmes des sujets) */
  const W = {
    E2: { m0: 0.06, s1: 0.22, s2: 0.17, s3: 0.16, s4: 0.15, s5: 0.13, s6: 0.11 },
    E1: { s7: 0.5, s8: 0.5 }
  };
  const TARGET = 12; // moyenne visée = 100 %

  function modScore(m) {
    const st = App.store.state;
    const ms = st.modStats[m.id];
    const n = ms ? ms.recent.length : 0;
    const ok = ms ? U.sum(ms.recent) : 0;
    const acc = (ok + 0.25 * 6) / (n + 6); // réussite lissée (a priori : 25 % = hasard sur un QCM)
    const L = m.lessons.length ? m.lessons.filter((l) => st.lessons[l.id]).length / m.lessons.length : 0;
    const c = App.srs.counts(m.id);
    const C = c.total ? (c.mastered + 0.5 * c.learning) / c.total : 0;
    const ex = m.exercises.map((e) => App.progress.exerciseScore(e.id)).filter(Boolean);
    const X = ex.length ? U.sum(ex.map((s) => (s.best || s.score) / s.max)) / ex.length : null;
    const s = 0.55 * acc + 0.2 * L + 0.15 * C + 0.1 * (X == null ? acc : X);
    const conf = n >= 30 ? 2 : n >= 10 ? 1 : 0;
    return { m, s, acc, rawAcc: n ? ok / n : null, n, L, C, X, conf };
  }

  const prep = (App.prep = {
    compute() {
      const st = App.store.state;
      const out = { mods: {}, E1: 0, E2: 0 };
      ['E1', 'E2'].forEach((E) => {
        let tot = 0;
        Object.entries(W[E]).forEach(([id, w]) => {
          const m = App.content.mod(id);
          if (!m) return;
          const r = modScore(m);
          r.w = w; r.E = E;
          out.mods[id] = r;
          tot += w * r.s;
        });
        out[E + 'model'] = 20 * tot;
      });
      // examens récents (7 derniers jours) : ils pèsent 60 % de l'estimation
      const recent = st.exams.filter((x) => Date.now() - x.at < 7 * 86400000).slice(-3);
      out.examN = recent.length;
      ['E1', 'E2'].forEach((E) => {
        const k = E.toLowerCase();
        const ex = recent.length ? U.sum(recent.map((x) => x[k])) / recent.length : null;
        out[E] = ex == null ? out[E + 'model'] : 0.6 * ex + 0.4 * out[E + 'model'];
      });
      out.avg = (2 * out.E1 + 3 * out.E2) / 5;
      out.pct = Math.max(0, Math.min(1, out.avg / TARGET));
      const answered = U.sum(Object.values(out.mods).map((r) => r.n));
      out.conf = out.examN ? 2 : answered >= 150 ? 2 : answered >= 40 ? 1 : 0;
      out.risk = out.conf > 0 && (out.E1 <= 7 || out.E2 <= 7);
      // priorités : points de moyenne récupérables en amenant le module à 80 %
      out.prio = Object.values(out.mods).map((r) => {
        const share = r.E === 'E1' ? 2 / 5 : 3 / 5;
        r.gain = 20 * r.w * Math.max(0, 0.8 - r.s) * share * (r.E === 'E1' && out.E1 <= 8 ? 1.5 : 1);
        return r;
      }).sort((a, b) => b.gain - a.gain).slice(0, 3);
      return out;
    },

    /* Mémorise l'estimation du jour (courbe d'évolution) */
    snapshot(res) {
      const st = App.store.state;
      st.readiness = st.readiness || {};
      st.readiness[U.dayKey()] = Math.round(res.avg * 100) / 100;
      App.store.save();
    },

    why(r) {
      const bits = [];
      bits.push(r.rawAcc == null ? 'aucune question faite' : `réussite ${Math.round(r.rawAcc * 100)} % sur ${r.n} question${r.n > 1 ? 's' : ''}`);
      bits.push(`${Math.round(r.L * 100)} % des leçons`);
      bits.push(`cartes ${Math.round(r.C * 100)} %`);
      if (r.X != null) bits.push(`exercices ${Math.round(r.X * 100)} %`);
      return bits.join(' · ');
    },

    color(note) { return note <= 5 ? 'ko-t' : note < 10 ? 'warn-t' : 'ok-t'; },

    /* Carte compacte pour l'accueil */
    card() {
      const r = prep.compute();
      prep.snapshot(r);
      const p = r.prio[0];
      return `<a class="card hover prep-mini" href="#/preparation" style="color:inherit;text-decoration:none">
        <div class="row between nowrap"><h3 class="mb0">📈 Indice de préparation</h3><span class="chip ${r.conf ? 'pri' : ''}">${['estimation provisoire', 'estimation moyenne', 'estimation fiable'][r.conf]}</span></div>
        <div class="row nowrap mt1" style="gap:1rem">
          ${App.ui.ring(r.pct, 74, 8, r.risk ? 'var(--ko)' : r.pct >= 1 ? 'var(--ok)' : 'var(--primary)', `${Math.round(r.pct * 100)}<small>% prêt</small>`)}
          <div class="grow">
            <div class="prep-notes"><span>E1 <b class="${prep.color(r.E1)}">${U.fmtNum(r.E1, 1)}</b></span><span>E2 <b class="${prep.color(r.E2)}">${U.fmtNum(r.E2, 1)}</b></span><span>Moy. <b class="pri-t">${U.fmtNum(r.avg, 1)}</b></span></div>
            ${p ? `<div class="small mt1">Priorité : <b style="color:${p.m.color}">${p.m.icon} ${p.m.short || p.m.title}</b> <span class="muted">(+${U.fmtNum(p.gain, 1)} pt possible)</span></div>` : ''}
            ${r.risk ? '<div class="small ko-t mt1">⚠️ Risque de note éliminatoire</div>' : r.conf === 0 ? '<div class="small muted mt1">Réponds à quelques QCM pour affiner l\'estimation.</div>' : ''}
          </div>
        </div></a>`;
    }
  });

  function spark(st) {
    const days = Object.keys(st.readiness || {}).sort().slice(-14);
    if (days.length < 2) return '<p class="small muted mb0">La courbe apparaîtra après quelques jours de révision.</p>';
    const vals = days.map((d) => st.readiness[d]);
    const w = 320, h = 80, max = 20;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * (w - 10) + 5},${h - 5 - (v / max) * (h - 10)}`).join(' ');
    const y10 = h - 5 - (10 / max) * (h - 10);
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" role="img" aria-label="Évolution de la moyenne estimée">
      <line x1="0" x2="${w}" y1="${y10}" y2="${y10}" stroke="var(--border-strong)" stroke-dasharray="4 4"/>
      <polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      ${vals.map((v, i) => `<circle cx="${(i / (vals.length - 1)) * (w - 10) + 5}" cy="${h - 5 - (v / max) * (h - 10)}" r="3.5" fill="var(--primary)"/>`).join('')}
    </svg><div class="tiny muted">Moyenne estimée, jour après jour (pointillés : 10/20). ${U.fmtDay(days[0])} → ${U.fmtDay(days[days.length - 1])}.</div>`;
  }

  R.add('/preparation', () => {
    App.layout.setTitle('Indice de préparation');
    const st = App.store.state;
    const r = prep.compute();
    prep.snapshot(r);
    const nm = App.backup.name();
    const modRow = (x) => `<div class="prep-row">
        <span class="pr-ico">${x.m.icon}</span>
        <div class="grow"><div class="row between nowrap"><b>${x.m.short || x.m.title}</b><span class="small"><b>${Math.round(x.s * 100)} %</b> <span class="muted">· poids ${Math.round(x.w * 100)} %</span></span></div>
        ${App.ui.bar(x.s, x.s >= 0.7 ? 'ok' : x.s < 0.4 ? 'acc' : '')}
        <div class="tiny muted">${prep.why(x)}${x.conf === 0 ? ' · <span class="warn-t">peu de données</span>' : ''}</div></div>
      </div>`;
    const group = (E, title) => `<div class="card"><h3>${title}</h3><div class="stack-sm mt1">${Object.values(r.mods).filter((x) => x.E === E).map(modRow).join('')}</div></div>`;
    App.ui.mount(`
      <div class="page-head"><h1>📈 Indice de préparation</h1><div class="sub">Une estimation de ta note à partir de tes réponses, leçons, cartes, exercices et examens. Plus tu t'entraînes, plus elle est fiable.</div></div>
      <section class="prep-hero ${r.risk ? 'risk' : ''}">
        ${App.ui.ring(r.pct, 140, 12, '#fff', `<span style="font-size:2rem">${Math.round(r.pct * 100)}<span style="font-size:.6em">%</span></span><small style="color:rgba(255,255,255,.85)">prêt</small>`).replace('ring-bg', 'ring-bg" style="stroke:rgba(255,255,255,.25)')}
        <div class="grow">
          <div class="ph-k">${nm ? nm + ', voici' : 'Voici'} ton estimation</div>
          <div class="ph-notes">
            <div><small>Épreuve 1 · coef. 2</small><b>${U.fmtNum(r.E1, 1)}</b><span>/20</span></div>
            <div><small>Épreuve 2 · coef. 3</small><b>${U.fmtNum(r.E2, 1)}</b><span>/20</span></div>
            <div class="ph-avg"><small>Moyenne estimée</small><b>${U.fmtNum(r.avg, 1)}</b><span>/20</span></div>
          </div>
          <div class="small mt1" style="opacity:.92">${['🔸 Estimation provisoire : réponds à plus de questions ou fais un examen express pour la confirmer.', '🔹 Estimation moyennement fiable : un examen express la rendra plus précise.', '✅ Estimation fiable' + (r.examN ? ` (inclut ${r.examN} examen${r.examN > 1 ? 's' : ''} récent${r.examN > 1 ? 's' : ''})` : '') + '.'][r.conf]} 100 % = ${TARGET}/20 de moyenne.</div>
        </div>
      </section>
      ${r.risk ? App.md.trap(`Une de tes notes estimées est basse (${r.E1 <= 7 ? 'Épreuve 1' : 'Épreuve 2'}). Une note ≤ 5 est <b>éliminatoire</b> : sécurise d'abord les points faciles de cette épreuve (${r.E1 <= 7 ? 'droits Linux, cron, RAID, AGDLP, LSDOU' : 'sous-réseaux, ports, routage statique'}).`, 'Attention à la note éliminatoire') : ''}
      <h2 class="mt3">🎯 Tes 3 priorités</h2>
      <p class="muted small">Les modules qui peuvent te rapporter le plus de points de moyenne d'ici le concours.</p>
      <div class="grid c3">${r.prio.map((x, i) => `<div class="card prio" style="border-top:4px solid ${x.m.color}">
        <div class="row between nowrap"><span class="chip">Priorité ${i + 1}</span><b class="pri-t">+${U.fmtNum(x.gain, 1)} pt</b></div>
        <h3 class="mt1">${x.m.icon} ${x.m.short || x.m.title}</h3>
        <div class="small muted">${prep.why(x)}</div>
        <div class="row mt2"><a class="btn sm primary" href="#/seance?mod=${x.m.id}">🧭 Séance guidée</a><a class="btn sm" href="#/quiz/${x.m.id}">✅ QCM</a><a class="btn sm" href="#/cartes?go=1&mod=${x.m.id}">🃏</a></div>
      </div>`).join('')}</div>
      <div class="grid c2 mt3">
        ${group('E2', '🌐 Épreuve 2 — Réseaux & télécoms')}
        <div class="stack">${group('E1', '🖥️ Épreuve 1 — Systèmes')}
          <div class="card"><h3>📉 Évolution</h3>${spark(st)}</div>
          <div class="card"><h3>🧪 Confirmer l'estimation</h3><p class="small muted">Un examen express (30 questions, corrigé automatiquement) pèse 60 % de l'estimation pendant 7 jours.</p><a class="btn soft" href="#/examen/express">⚡ Examen express</a></div>
        </div>
      </div>
      <details class="card mt2"><summary style="cursor:pointer;font-weight:700">Comment est-ce calculé ?</summary><div class="prose small mt1">
        <p>Pour chaque module : <b>55 %</b> réussite récente (lissée : sans données, on part de 25 %, le hasard sur un QCM), <b>20 %</b> leçons comprises, <b>15 %</b> cartes maîtrisées, <b>10 %</b> exercices type concours. Les modules sont pondérés selon leur poids dans chaque épreuve (ex. adressage IP = 22 % de l'Épreuve 2).</p>
        <p>Les examens des 7 derniers jours comptent pour 60 %. Moyenne = (2 × E1 + 3 × E2) / 5. C'est une <b>estimation</b> pour t'orienter, pas une promesse : le jour J, la rédaction et la gestion du temps comptent aussi.</p></div></details>`, { help: 'prep' });
  });

  App.help.TEXTS.prep = { t: '📈 Indice de préparation', h: '<p>Une estimation de tes notes E1, E2 et de ta moyenne, calculée sur tes résultats (questions, leçons, cartes, exercices, examens). <b>100 %</b> correspond à une moyenne de 12/20.</p><ul><li>Les <b>priorités</b> sont les modules qui peuvent te rapporter le plus de points : lance leur séance guidée.</li><li>Fais un <b>examen express</b> pour fiabiliser l\'estimation.</li></ul>' };
})();
