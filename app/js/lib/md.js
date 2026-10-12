/* Petits assistants de mise en forme pour écrire le contenu pédagogique de façon concise.
   Utilisés dans data/*.js : const { key, trap, tip, ... } = App.md; */
(function () {
  'use strict';
  const App = window.App;

  const box = (cls, icon, title) => (html, customTitle) =>
    `<div class="co ${cls}"><div class="co-h">${icon} ${customTitle || title}</div>${html}</div>`;

  const md = (App.md = {
    key: box('key', '🎯', 'À retenir'),
    trap: box('trap', '⚠️', 'Piège concours'),
    tip: box('tip', '💡', 'Astuce'),
    reflex: box('reflex', '⚡', 'Réflexe jour J'),
    ex: box('ex', '✍️', 'Exemple'),
    fix: box('fix', '🛠️', 'Correction du support de cours'),
    mnemo: box('mnemo', '🧠', 'Moyen mnémotechnique'),
    why: box('ex', '🤔', 'Pourquoi ?'),

    /* Formule mise en valeur : f('Hôtes = 2<sup>h</sup> − 2', 'nombre d’hôtes') */
    f: (html, label) => `<div class="f"><span class="f-body">${html}</span>${label ? `<div class="lbl-f">${label}</div>` : ''}</div>`,
    fi: (html) => `<span class="fi">${html}</span>`,
    frac: (num, den) => `<span class="frac"><span>${num}</span><span>${den}</span></span>`,

    /* Tableau : table(['A','B'], [['1','2'], ...]) */
    table: (head, rows, opts) => {
      opts = opts || {};
      const th = head ? '<thead><tr>' + head.map((h) => `<th>${h}</th>`).join('') + '</tr></thead>' : '';
      const tb = '<tbody>' + rows.map((r) => '<tr>' + r.map((c, i) => `<td${opts.mono && opts.mono.includes(i) ? ' class="mono"' : ''}>${c}</td>`).join('') + '</tr>').join('') + '</tbody>';
      return `<div class="tbl-wrap"><table class="t">${th}${tb}</table></div>`;
    },

    steps: (items) => '<ol class="steps">' + items.map((i) => `<li>${i}</li>`).join('') + '</ol>',
    ul: (items) => '<ul>' + items.map((i) => `<li>${i}</li>`).join('') + '</ul>',

    /* Bloc de code avec coloration minimale des commentaires (! # //) */
    code: (txt) => {
      const esc = App.util.esc(txt.replace(/^\n+|\s+$/g, ''));
      const lines = esc.split('\n').map((l) => {
        const m = l.match(/^(\s*)([!#]|\/\/)(.*)$/);
        if (m && !/^#!/.test(l.trim())) return `${m[1]}<span class="c">${m[2]}${m[3]}</span>`;
        return l.replace(/(\s)(#|!)(\s.*)$/, '$1<span class="c">$2$3</span>');
      });
      return `<pre>${lines.join('\n')}</pre>`;
    },

    /* Octet(s) en binaire coloré : bits('11000000.10101000', 26) → partie réseau / hôte */
    bits: (bin, netBits, opts) => {
      opts = opts || {};
      const clean = String(bin).replace(/[^01.\s]/g, '');
      const groups = clean.split(/[.\s]+/).filter(Boolean);
      let idx = 0;
      const out = groups.map((g) => {
        const cells = g.split('').map((b) => {
          const isNet = netBits != null && idx < netBits;
          const cls = netBits == null ? '' : isNet ? (b === '1' ? 'n1' : 'n') : (b === '1' ? 'h1' : 'h');
          idx++;
          return `<b class="${cls}">${b}</b>`;
        }).join('');
        return `<span class="oct">${cells}</span>`;
      }).join('<span class="dot">.</span>');
      return `<span class="bits${opts.sm ? ' sm' : ''}">${out}</span>`;
    },

    /* Widget interactif inséré dans une leçon */
    w: (name, attrs) => {
      const a = Object.entries(attrs || {}).map(([k, v]) => ` data-${k}="${App.util.esc(typeof v === 'string' ? v : JSON.stringify(v))}"`).join('');
      return `<div data-w="${name}"${a}></div>`;
    },

    /* Pas-à-pas : stepper(['<p>étape 1</p>', ...], 'Titre') */
    stepper: (stepsHtml, title) =>
      `<div data-w="stepper" data-title="${App.util.esc(title || 'Pas à pas')}">${stepsHtml.map((s) => `<div class="st-step">${s}</div>`).join('')}</div>`,

    /* Question « testez-vous » à révéler */
    reveal: (q, a) => `<div class="co ex reveal"><div class="co-h">🧩 Testez-vous</div><div>${q}</div><div class="mt1"><button class="btn sm soft reveal-btn">Voir la réponse</button></div><div class="reveal-body mt1">${a}</div></div>`
  });
})();
