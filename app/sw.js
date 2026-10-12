/* Service worker (généré par tools/build_single.py — ne pas modifier à la main).
   Quand l'application est servie en ligne (ex. GitHub Pages), tous les fichiers sont mis en cache
   dès l'installation : l'application fonctionne ensuite entièrement hors ligne et peut être installée
   sur l'écran d'accueil (Android, iPhone, ordinateur). */
const CACHE = 'revision-mef-d8ea80c938';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './css/fonts.css',
  './css/app.css',
  './js/core/util.js',
  './js/core/router.js',
  './js/core/fx.js',
  './js/lib/ipcalc.js',
  './js/lib/md.js',
  './js/models/store.js',
  './js/models/content.js',
  './js/models/srs.js',
  './js/models/game.js',
  './js/models/progress.js',
  './js/views/ui.js',
  './js/views/layout.js',
  './js/views/backup.js',
  './js/views/help.js',
  './js/views/tts.js',
  './js/views/install.js',
  './js/core/quiz.js',
  './js/views/question.js',
  './js/core/gen.js',
  './js/widgets/core.js',
  './js/widgets/ip.js',
  './js/widgets/net.js',
  './js/widgets/telecom.js',
  './js/widgets/sys.js',
  './js/generators/ip.js',
  './js/generators/net.js',
  './js/generators/telecom.js',
  './js/generators/sys.js',
  './data/m0-binaire.js',
  './data/s1-adressage.js',
  './data/s2-routage.js',
  './data/s3-commutation.js',
  './data/s4-services.js',
  './data/s5-securite.js',
  './data/s6-telecoms.js',
  './data/s7-linux.js',
  './data/s8-windows.js',
  './data/extras.js',
  './data/examen.js',
  './data/examens2.js',
  './js/controllers/runner.js',
  './js/controllers/home.js',
  './js/controllers/course.js',
  './js/controllers/cards.js',
  './js/controllers/practice.js',
  './js/controllers/guided.js',
  './js/controllers/prep.js',
  './js/controllers/defi.js',
  './js/controllers/exercises.js',
  './js/controllers/exam.js',
  './js/controllers/misc.js',
  './js/main.js',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
