/* Vue : installation de l'application (PWA) sur l'écran d'accueil — Android, iPhone, ordinateur —
   et avis de nouvelle version quand l'application est servie en ligne. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const ua = navigator.userAgent || '';

  const ins = (App.install = {
    deferred: null,
    isIOS: /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isAndroid: /android/i.test(ua),
    online: /^https?:$/.test(location.protocol),
    standalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; },

    async prompt() {
      if (!ins.deferred) return;
      ins.deferred.prompt();
      const r = await ins.deferred.userChoice.catch(() => null);
      ins.deferred = null;
      if (r && r.outcome === 'accepted') App.ui.toast('📲', '<b>Application installée !</b><div class="small muted">Retrouve-la sur ton écran d\'accueil. Elle fonctionne hors ligne.</div>', '', 5000);
      App.bus.emit('installable');
    },

    /* Carte d'installation adaptée à l'appareil et à la façon dont l'application est ouverte */
    card() {
      let body;
      if (ins.standalone()) {
        body = '<p class="mb0">✅ <b>L\'application est installée</b> et fonctionne hors ligne. Les mises à jour arrivent automatiquement quand tu as Internet.</p>';
      } else if (ins.deferred) {
        body = `<p>Installe l'application sur ton ${ins.isAndroid ? 'téléphone' : 'appareil'} : icône sur l'écran d'accueil, plein écran, <b>fonctionne sans Internet</b>.</p><button class="btn primary" data-install>📲 Installer l'application</button>`;
      } else if (ins.online && ins.isIOS) {
        body = `<p>Sur iPhone / iPad, avec <b>Safari</b> :</p><ol class="steps"><li>Touche le bouton <b>Partager</b> <span class="kbdish">⬆︎</span> en bas de l'écran.</li><li>Choisis <b>« Sur l'écran d'accueil »</b>.</li><li>Touche <b>Ajouter</b> : l'icône « Révision MEF » apparaît, l'application fonctionne ensuite hors ligne.</li></ol>`;
      } else if (ins.online) {
        body = `<ol class="steps"><li>Ouvre le menu du navigateur <b>⋮</b> (Chrome, Edge, Samsung Internet) ou <b>☰</b> (Firefox Android).</li><li>Choisis <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</li><li>L'icône « Révision MEF » apparaît ; l'application fonctionne ensuite hors ligne.</li></ol>`;
      } else {
        body = `<p>Tu utilises le <b>fichier</b> de l'application : il marche déjà hors ligne, mais un fichier ne peut pas s'installer sur l'écran d'accueil.</p>
          <p>Pour l'installer (Android, iPhone ou ordinateur), ouvre <b>une seule fois avec Internet</b> la version en ligne, puis « Installer » :</p>
          <div class="install-url mono">${App.ONLINE_URL}</div>
          <div class="row mt1"><a class="btn primary" href="${App.ONLINE_URL}" target="_blank" rel="noopener">🌐 Ouvrir la version en ligne</a><button class="btn" data-copyurl>📋 Copier l'adresse</button></div>
          <p class="tiny muted mt1">Ta progression est propre à chaque version : utilise 💾 Sauvegarder ici, puis « Restaurer » dans la version installée.</p>`;
      }
      return `<div class="card install-card" id="installCard"><h3>📲 Installer l'application</h3>${body}</div>`;
    },
    bind(root) {
      const b = root.querySelector('[data-install]');
      if (b) b.addEventListener('click', () => ins.prompt());
      const c = root.querySelector('[data-copyurl]');
      if (c) c.addEventListener('click', () => {
        const done = () => App.ui.toast('📋', 'Adresse copiée.');
        if (navigator.clipboard) navigator.clipboard.writeText(App.ONLINE_URL).then(done, () => {}); else done();
      });
    },
    /* Bannière discrète sur l'accueil quand l'installation est possible en un clic */
    banner() {
      const s = App.store.state.settings;
      if (!ins.deferred || ins.standalone() || (s.installDismissed && Date.now() - s.installDismissed < 7 * 86400000)) return '';
      return `<div class="bk-remind install-banner" id="instBanner"><span class="bk-ico">📲</span><div class="grow"><b>Installe l'application</b><div class="small muted">Une icône sur ton écran d'accueil, en plein écran, qui marche sans Internet.</div></div><div class="row"><button class="btn sm primary" data-install>Installer</button><button class="btn sm ghost" data-inst-later>Plus tard</button></div></div>`;
    },
    bindBanner(root) {
      const box = root.querySelector('#instBanner');
      if (!box) return;
      box.querySelector('[data-install]').addEventListener('click', () => { ins.prompt(); box.remove(); });
      box.querySelector('[data-inst-later]').addEventListener('click', () => { App.store.state.settings.installDismissed = Date.now(); App.store.save(); box.remove(); });
    }
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    ins.deferred = e;
    App.bus.emit('installable');
    const cur = App.router.current && App.router.current.path;
    if ((cur === '/' || cur === '/profil' || cur === '/apropos') && !document.querySelector('.modal-bg')) App.router.resolve();
  });
  window.addEventListener('appinstalled', () => { ins.deferred = null; App.game && App.game.award && App.game.award('installed'); });

  /* Service worker : cache hors ligne + avis de mise à jour */
  ins.registerSW = function () {
    if (!('serviceWorker' in navigator) || !ins.online) return;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            const t = U.el('<div class="update-bar"><span>🎉 Nouvelle version disponible</span><button class="btn sm primary">Mettre à jour</button></div>');
            t.querySelector('button').addEventListener('click', () => { App.store.saveNow(); nw.postMessage('skipWaiting'); });
            document.body.appendChild(t);
          }
        });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  };
})();
