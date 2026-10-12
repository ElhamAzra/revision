/* Point d'entrée : charge la progression, applique le thème, dessine la coquille et démarre le routeur. */
(function () {
  'use strict';
  const App = window.App;

  function boot() {
    App.store.load();
    App.ui.applyTheme();
    App.ui.applyTypo();
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => { if (App.store.state.settings.theme === 'auto') App.ui.applyTheme(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
    App.layout.render();
    App.router.start();
    if (App.home && App.home.onboard) setTimeout(App.home.onboard, 350);
    window.addEventListener('beforeunload', () => App.store.saveNow());
    document.addEventListener('visibilitychange', () => { if (document.hidden) App.store.saveNow(); });

    // Mode application installable quand la page est servie en http(s) (ex. GitHub Pages) : cache hors ligne.
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
