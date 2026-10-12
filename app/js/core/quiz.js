/* Logique de correction des questions (indépendante de l'affichage).
   Types : qcm, tf (vrai/faux), input (champs à saisir), order (remettre dans l'ordre), match (associer). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const asArr = (a) => (Array.isArray(a) ? a : [a]);

  const fieldCheckers = {
    ip(v, f) {
      const n = App.ip.parse(String(v).replace(/\s/g, ''));
      return n != null && asArr(f.a).some((a) => App.ip.parse(String(a)) === n);
    },
    cidr(v, f) {
      const s = String(v).replace(/\s/g, '');
      const m = s.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/);
      if (!m) return false;
      return asArr(f.a).some((a) => {
        const am = String(a).match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/);
        return am && App.ip.parse(am[1]) === App.ip.parse(m[1]) && +am[2] === +m[2];
      });
    },
    mask(v, f) {
      const s = String(v).replace(/\s/g, '');
      let p;
      if (/^\/?\d{1,2}$/.test(s)) p = +s.replace('/', '');
      else {
        const n = App.ip.parse(s);
        if (n == null) return false;
        p = App.ip.prefixOf(n);
      }
      return asArr(f.a).some((a) => {
        const as = String(a);
        const ap = /^\/?\d{1,2}$/.test(as) ? +as.replace('/', '') : App.ip.prefixOf(App.ip.parse(as));
        return ap === p && p >= 0;
      });
    },
    num(v, f) {
      const n = U.parseNum(v);
      if (isNaN(n)) return false;
      return asArr(f.a).some((a) => {
        const an = typeof a === 'number' ? a : U.parseNum(a);
        const tol = f.tol != null ? f.tol : 0;
        const rel = f.rel != null ? Math.abs(an) * f.rel : 0;
        return Math.abs(n - an) <= Math.max(tol, rel) + 1e-9;
      });
    },
    v6(v, f) {
      const s = String(v).trim().toLowerCase();
      if (f.strict) return asArr(f.a).some((a) => String(a).toLowerCase() === s);
      const p = App.ip.v6.parse(s);
      return !!p && asArr(f.a).some((a) => {
        const ap = App.ip.v6.parse(String(a));
        return ap && ap.every((x, i) => x === p[i]);
      });
    },
    bin(v, f) {
      const s = String(v).replace(/[\s.]/g, '');
      return /^[01]+$/.test(s) && asArr(f.a).some((a) => String(a).replace(/[\s.]/g, '') === s);
    },
    hex(v, f) {
      const s = String(v).trim().toLowerCase().replace(/^0x/, '').replace(/^0+(?=.)/, '');
      return asArr(f.a).some((a) => String(a).toLowerCase().replace(/^0x/, '').replace(/^0+(?=.)/, '') === s);
    },
    text(v, f) {
      const s = U.norm(v).replace(/[.;]+$/, '');
      if (f.re) return new RegExp(f.re, 'i').test(U.norm(v));
      return asArr(f.a).some((a) => U.norm(a) === s);
    },
    code(v, f) {
      // commande : espaces multiples ignorés, casse respectée sauf option
      const n = (x) => String(x).trim().replace(/\s+/g, ' ');
      return asArr(f.a).some((a) => (f.ci ? n(a).toLowerCase() === n(v).toLowerCase() : n(a) === n(v)));
    },
    select(v, f) {
      return String(v) === String(f.a);
    }
  };

  const quiz = (App.quiz = {
    fieldCheckers,

    checkField(f, v) {
      if (v == null || String(v).trim() === '') return false;
      const kind = f.kind || 'text';
      const fn = fieldCheckers[kind] || fieldCheckers.text;
      try { return fn(v, f); } catch (e) { return false; }
    },

    expected(f) {
      if (f.show) return f.show;
      if (f.kind === 'select') return (f.opts || [])[f.a];
      const a = asArr(f.a)[0];
      return typeof a === 'number' ? U.fmtNum(a) : String(a);
    },

    /* Retourne { ok, score (0..1), fields: [bool] } */
    check(q, resp) {
      switch (q.type) {
        case 'qcm': {
          const ok = resp === q.a;
          return { ok, score: ok ? 1 : 0 };
        }
        case 'multi': {
          const want = q.a.slice().sort().join(',');
          const got = (resp || []).slice().sort().join(',');
          return { ok: want === got, score: want === got ? 1 : 0 };
        }
        case 'tf': {
          const ok = resp === q.a;
          return { ok, score: ok ? 1 : 0 };
        }
        case 'input': {
          const fields = q.fields.map((f, i) => quiz.checkField(f, (resp || [])[i]));
          const n = fields.filter(Boolean).length;
          return { ok: n === fields.length, score: n / fields.length, fields };
        }
        case 'order': {
          const fields = (resp || []).map((v, i) => v === i);
          const ok = resp && resp.length === q.items.length && fields.every(Boolean);
          return { ok: !!ok, score: fields.filter(Boolean).length / q.items.length, fields };
        }
        case 'match': {
          const fields = q.pairs.map((p, i) => (resp || [])[i] === i);
          const n = fields.filter(Boolean).length;
          return { ok: n === q.pairs.length, score: n / q.pairs.length, fields };
        }
        default:
          return { ok: false, score: 0 };
      }
    },

    /* XP pour une réponse */
    xpFor(q, result, combo) {
      if (!result.ok) return result.score > 0 ? Math.round(4 * result.score) : 1;
      const base = 10 + (q.level === 3 ? 6 : q.level === 2 ? 3 : 0) + (q.type === 'input' && q.fields.length > 2 ? 4 : 0);
      return Math.round(base * App.game.comboMult(combo));
    }
  });
})();
