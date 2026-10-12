/* Vue : rendu interactif d'une question (QCM, vrai/faux, saisie, ordre, association). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const LETTERS = 'ABCDEFGHIJ';

  const qview = (App.qview = {
    /* opts : { mode: 'practice' | 'exam' | 'blitz', onAnswer(result, resp), onChange(resp), onNext(), initial, meta } */
    create(q, opts) {
      opts = opts || {};
      const mode = opts.mode || 'practice';
      const mod = q.mod ? App.content.mod(q.mod) : null;
      const el = U.el(`<div class="card q-card"></div>`);
      const api = { el, q, answered: false, resp: opts.initial != null ? opts.initial : null };

      const meta = [];
      if (opts.meta !== false) {
        if (mod) meta.push(`<span class="chip" style="background:color-mix(in srgb, ${mod.color} 15%, var(--surface));color:${mod.color}">${mod.icon} ${U.esc(mod.short || mod.title)}</span>`);
        if (q.src) meta.push(`<span class="chip">${U.esc(q.src)}</span>`);
        if (q.gen) meta.push(`<span class="chip pri">♾️ généré</span>`);
        if (q.level) meta.push(`<span class="chip warn">${'★'.repeat(q.level)}</span>`);
        if (App.store.state.errors[App.progress.errKey(q)]) meta.push('<span class="chip ko">🩹 déjà ratée</span>');
      }
      el.innerHTML = `
        ${meta.length ? `<div class="q-meta">${meta.join('')}</div>` : ''}
        <div class="q-text">${q.q}</div>
        <div class="q-body"></div>
        <div class="q-fb"></div>
        <div class="q-actions"></div>`;
      const body = el.querySelector('.q-body');
      const fbBox = el.querySelector('.q-fb');
      const actions = el.querySelector('.q-actions');

      /* ---------- Rendus par type ---------- */
      let order = null; // ordre d'affichage des choix
      if (q.type === 'qcm' || q.type === 'multi') {
        order = q.noShuffle || mode === 'exam-fixed' ? q.choices.map((_, i) => i) : U.shuffle(q.choices.map((_, i) => i));
        if (q._order) order = q._order; else q._order = order; // ordre stable si la question est réaffichée
        body.innerHTML = `<div class="choices">${order.map((ci, di) => `<button class="choice" data-ci="${ci}"><span class="letter">${LETTERS[di]}</span><span>${q.choices[ci]}</span></button>`).join('')}</div>`;
        if (q.type === 'multi') body.insertAdjacentHTML('afterbegin', '<p class="small muted">Plusieurs réponses possibles.</p>');
        U.$$('.choice', body).forEach((b) => b.addEventListener('click', () => pick(+b.dataset.ci)));
        if (mode === 'exam' && api.resp != null) markPicked();
      } else if (q.type === 'tf') {
        body.innerHTML = `<div class="grid c2"><button class="choice" data-v="1"><span class="letter">V</span><span>Vrai</span></button><button class="choice" data-v="0"><span class="letter">F</span><span>Faux</span></button></div>`;
        U.$$('.choice', body).forEach((b) => b.addEventListener('click', () => pick(b.dataset.v === '1')));
        if (mode === 'exam' && api.resp != null) markPicked();
      } else if (q.type === 'input') {
        body.innerHTML = `<div class="fields">${q.fields.map((f, i) => {
          const im = f.kind === 'num' ? 'decimal' : 'text';
          const ctl = f.kind === 'select'
            ? `<select class="select input" data-i="${i}"><option value="">— choisir —</option>${f.opts.map((o, j) => `<option value="${j}">${o}</option>`).join('')}</select>`
            : `<input class="input ${/ip|cidr|mask|v6|bin|hex|code|num/.test(f.kind || '') ? 'mono' : ''}" data-i="${i}" inputmode="${im}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${U.esc(f.ph || '')}">`;
          return `<div class="field" style="${f.wide ? 'grid-column:1/-1' : ''}"><label class="lbl">${f.label || 'Réponse'}</label>${ctl}<div class="exp"></div></div>`;
        }).join('')}</div>`;
        if (q.fields.length === 1 && !q.fields[0].label) body.querySelector('.lbl').remove();
        const ins = U.$$('.input', body);
        ins.forEach((inp, i) => {
          if (api.resp && api.resp[i] != null) inp.value = api.resp[i];
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              const next = ins[i + 1];
              if (next && inp.value.trim() && !next.value.trim()) next.focus();
              else if (mode !== 'exam') submit();
            }
          });
          inp.addEventListener('input', () => { api.resp = ins.map((x) => x.value); if (opts.onChange) opts.onChange(api.resp); });
          inp.addEventListener('change', () => { api.resp = ins.map((x) => x.value); if (opts.onChange) opts.onChange(api.resp); });
        });
      } else if (q.type === 'order') {
        const shuffled = q._order || U.shuffle(q.items.map((_, i) => i));
        q._order = shuffled;
        let picked = Array.isArray(api.resp) ? api.resp.slice() : [];
        const draw = () => {
          body.innerHTML = `<p class="small muted mb1">Touchez les éléments dans le bon ordre (touchez un élément placé pour le retirer).</p>
            <div class="order-picked">${picked.length ? picked.map((ii, k) => `<button class="tok" data-p="${k}"><span class="i">${k + 1}</span>${q.items[ii]}</button>`).join('') : '<span class="muted small" style="padding:.4rem">Votre ordre apparaîtra ici…</span>'}</div>
            <div class="order-pool">${shuffled.filter((ii) => !picked.includes(ii)).map((ii) => `<button class="tok" data-ii="${ii}">${q.items[ii]}</button>`).join('')}</div>`;
          U.$$('[data-ii]', body).forEach((b) => b.addEventListener('click', () => { if (api.answered) return; picked.push(+b.dataset.ii); api.resp = picked.slice(); draw(); if (opts.onChange) opts.onChange(api.resp); if (picked.length === q.items.length && mode === 'practice') submit(); }));
          U.$$('[data-p]', body).forEach((b) => b.addEventListener('click', () => { if (api.answered) return; picked.splice(+b.dataset.p, 1); api.resp = picked.slice(); draw(); if (opts.onChange) opts.onChange(api.resp); }));
        };
        draw();
        api._drawOrder = (res) => {
          const pk = U.$$('.order-picked .tok', body);
          pk.forEach((b, k) => b.classList.add(res.fields[k] ? 'ok' : 'ko'));
        };
      } else if (q.type === 'match') {
        const rightOrder = q._rorder || U.shuffle(q.pairs.map((_, i) => i));
        q._rorder = rightOrder;
        body.innerHTML = q.pairs.map((p, i) => `<div class="match-row"><div><b>${p[0]}</b></div><select class="select input" data-i="${i}"><option value="">— associer —</option>${rightOrder.map((ri) => `<option value="${ri}">${q.pairs[ri][1]}</option>`).join('')}</select></div>`).join('');
        const sels = U.$$('select', body);
        sels.forEach((s, i) => {
          if (api.resp && api.resp[i] != null) s.value = api.resp[i];
          s.addEventListener('change', () => { api.resp = sels.map((x) => (x.value === '' ? null : +x.value)); if (opts.onChange) opts.onChange(api.resp); });
        });
      }

      /* ---------- Actions ---------- */
      const needsSubmit = q.type === 'input' || q.type === 'match' || q.type === 'multi' || q.type === 'order';
      if (mode !== 'exam') {
        actions.innerHTML = `
          ${q.hint ? '<button class="btn ghost sm" data-hint>💡 Indice</button>' : ''}
          <button class="btn ghost sm" data-skip>Je ne sais pas</button>
          <span class="grow"></span>
          ${needsSubmit ? '<button class="btn primary" data-submit>Valider <span class="k">Entrée</span></button>' : ''}`;
        const hintB = actions.querySelector('[data-hint]');
        if (hintB) hintB.addEventListener('click', () => { fbBox.innerHTML = `<div class="fb partial"><div class="fb-h">💡 Indice</div><div class="expl">${q.hint}</div></div>`; hintB.remove(); });
        actions.querySelector('[data-skip]').addEventListener('click', () => submit(true));
        const sb = actions.querySelector('[data-submit]');
        if (sb) sb.addEventListener('click', () => submit());
      }

      function markPicked() {
        U.$$('.choice', body).forEach((b) => {
          const v = q.type === 'tf' ? b.dataset.v === '1' : +b.dataset.ci;
          const on = q.type === 'multi' ? (api.resp || []).includes(v) : api.resp === v;
          b.classList.toggle('picked', on);
        });
      }

      function pick(v) {
        if (api.answered) return;
        if (q.type === 'multi') {
          const cur = api.resp || [];
          api.resp = cur.includes(v) ? cur.filter((x) => x !== v) : cur.concat([v]);
          markPicked();
          if (opts.onChange) opts.onChange(api.resp);
          return;
        }
        api.resp = v;
        if (mode === 'exam') { markPicked(); if (opts.onChange) opts.onChange(v); return; }
        submit();
      }

      function collect() {
        if (q.type === 'input') return U.$$('.input', body).map((x) => x.value);
        if (q.type === 'match') return U.$$('select', body).map((x) => (x.value === '' ? null : +x.value));
        return api.resp;
      }

      function submit(skip) {
        if (api.answered) { if (opts.onNext) opts.onNext(); return; }
        let resp = skip ? null : collect();
        if (!skip && q.type === 'input' && resp.every((v) => !String(v).trim())) {
          const first = body.querySelector('.input');
          if (first) { first.focus(); first.classList.add('ko'); setTimeout(() => first.classList.remove('ko'), 600); }
          return;
        }
        if (!skip && q.type === 'order' && (!resp || resp.length < q.items.length)) return;
        api.resp = resp;
        const res = skip ? { ok: false, score: 0, fields: (q.fields || q.pairs || q.items || []).map(() => false), skipped: true } : App.quiz.check(q, resp);
        api.answered = true;
        api.result = res;
        showResult(res);
        if (opts.onAnswer) opts.onAnswer(res, resp);
      }

      function showResult(res) {
        // états visuels
        if (q.type === 'qcm' || q.type === 'tf') {
          U.$$('.choice', body).forEach((b) => {
            b.disabled = true;
            const v = q.type === 'tf' ? b.dataset.v === '1' : +b.dataset.ci;
            if (v === q.a) b.classList.add('correct');
            else if (v === api.resp) b.classList.add('wrong');
          });
        } else if (q.type === 'multi') {
          U.$$('.choice', body).forEach((b) => {
            b.disabled = true;
            const v = +b.dataset.ci;
            if (q.a.includes(v)) b.classList.add('correct');
            else if ((api.resp || []).includes(v)) b.classList.add('wrong');
          });
        } else if (q.type === 'input') {
          U.$$('.field', body).forEach((fd, i) => {
            const inp = fd.querySelector('.input');
            inp.disabled = true;
            const ok = res.fields[i];
            inp.classList.add(ok ? 'ok' : 'ko');
            const exp = fd.querySelector('.exp');
            exp.className = 'exp ' + (ok ? 'ok' : 'ko');
            exp.innerHTML = ok ? '✓ juste' : '→ ' + U.esc(App.quiz.expected(q.fields[i]));
          });
        } else if (q.type === 'order') {
          if (!res.skipped && api._drawOrder) api._drawOrder(res);
        } else if (q.type === 'match') {
          U.$$('select', body).forEach((s, i) => {
            s.disabled = true;
            s.classList.add(res.fields[i] ? 'ok' : 'ko');
            if (!res.fields[i]) s.insertAdjacentHTML('afterend', `<div class="exp ko small mono" style="grid-column:2">→ ${q.pairs[i][1]}</div>`);
          });
        }
        if (mode === 'blitz') {
          el.classList.add(res.ok ? 'flash-ok' : 'flash-ko');
          if (!res.ok) fbBox.innerHTML = `<div class="fb ko"><div class="fb-h">✗ Réponse : ${answerText()}</div></div>`;
          return;
        }
        const head = res.ok ? '✅ Exact !' : res.skipped ? '📘 Voici la réponse' : res.score > 0 ? '🟠 Presque…' : '❌ Pas tout à fait';
        const cls = res.ok ? 'ok' : res.score > 0 ? 'partial' : 'ko';
        const corrList = !res.ok && (q.type === 'qcm' || q.type === 'tf' || q.type === 'order') ? `<p><b>Bonne réponse :</b> ${answerText()}</p>` : '';
        fbBox.innerHTML = `<div class="fb ${cls}"><div class="fb-h">${head}</div><div class="expl prose">${corrList}${q.expl || ''}</div></div>`;
        App.ui.hydrate(fbBox);
        actions.innerHTML = `<span class="grow"></span><button class="btn primary" data-next>Continuer <span class="k">Entrée</span></button>`;
        actions.querySelector('[data-next]').addEventListener('click', () => opts.onNext && opts.onNext());
        setTimeout(() => { const nb = actions.querySelector('[data-next]'); if (nb) nb.focus({ preventScroll: true }); }, 30);
      }

      function answerText() {
        if (q.type === 'qcm') return q.choices[q.a];
        if (q.type === 'multi') return q.a.map((i) => q.choices[i]).join(' + ');
        if (q.type === 'tf') return q.a ? 'Vrai' : 'Faux';
        if (q.type === 'order') return q.items.map((t, i) => `${i + 1}. ${t}`).join(' → ');
        if (q.type === 'input') return q.fields.map((f) => (f.label ? f.label + ' : ' : '') + App.quiz.expected(f)).join(' · ');
        if (q.type === 'match') return q.pairs.map((p) => p[0] + ' → ' + p[1]).join(' · ');
        return '';
      }

      /* Raccourcis clavier délégués par le contrôleur */
      api.key = (e) => {
        const k = e.key;
        if (k === 'Enter') {
          if (e.target && /^(BUTTON|SELECT|A|TEXTAREA)$/.test(e.target.tagName)) return; // l'élément gère son propre clic
          if (api.answered) { e.preventDefault(); if (opts.onNext) opts.onNext(); return; }
          if (needsSubmit && mode !== 'exam' && !(e.target && e.target.tagName === 'INPUT')) { e.preventDefault(); submit(); }
          return;
        }
        if (api.answered || mode === 'exam') return;
        if ((q.type === 'qcm' || q.type === 'multi') && e.target.tagName !== 'INPUT') {
          let di = -1;
          if (/^[1-9]$/.test(k)) di = +k - 1;
          else if (/^[a-j]$/i.test(k)) di = LETTERS.indexOf(k.toUpperCase());
          if (di >= 0 && order && di < order.length) pick(order[di]);
        }
        if (q.type === 'tf' && e.target.tagName !== 'INPUT') {
          if (/^[v1]$/i.test(k)) pick(true);
          if (/^[f2]$/i.test(k)) pick(false);
        }
      };
      api.submit = submit;
      api.answerText = answerText;
      api.focus = () => {
        const inp = body.querySelector('.input');
        if (inp && window.innerWidth > 880) inp.focus({ preventScroll: true });
      };
      return api;
    }
  });
})();
