/* Routeur à base de « hash » (#/chemin) : fonctionne en ouvrant index.html directement (file://). */
(function () {
  'use strict';
  const App = window.App;
  const routes = [];
  let cleanups = [];

  const router = (App.router = {
    current: null,

    add(pattern, handler, opts) {
      const keys = [];
      const re = new RegExp(
        '^' + pattern.replace(/\//g, '\\/').replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^\\/]+)'; }) + '\\/?$'
      );
      routes.push({ pattern, re, keys, handler, opts: opts || {} });
    },

    /* Enregistre une fonction de nettoyage (minuteurs, écouteurs clavier) appelée au changement de page. */
    onLeave(fn) { cleanups.push(fn); },

    go(path) {
      if (location.hash === '#' + path) router.resolve();
      else location.hash = path;
    },

    parse() {
      const raw = decodeURIComponent((location.hash || '#/').slice(1)) || '/';
      const [path, qs] = raw.split('?');
      const query = {};
      (qs || '').split('&').filter(Boolean).forEach((kv) => {
        const [k, v] = kv.split('=');
        query[k] = v == null ? '' : v;
      });
      return { path: path || '/', query };
    },

    resolve() {
      cleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
      cleanups = [];
      const { path, query } = router.parse();
      for (const r of routes) {
        const m = path.match(r.re);
        if (m) {
          const params = {};
          r.keys.forEach((k, i) => (params[k] = m[i + 1]));
          router.current = { path, params, query, pattern: r.pattern };
          App.bus.emit('route', router.current);
          try {
            r.handler(params, query);
          } catch (e) {
            console.error(e);
            App.ui.mount('<div class="card"><h2>Oups…</h2><p>Une erreur est survenue sur cette page.</p><pre>' + App.util.esc(e.stack || e) + '</pre><a class="btn" href="#/">Retour à l\'accueil</a></div>');
          }
          if (!r.opts.keepScroll) window.scrollTo(0, 0);
          return;
        }
      }
      router.go('/');
    },

    start() {
      window.addEventListener('hashchange', router.resolve);
      router.resolve();
    }
  });
})();
