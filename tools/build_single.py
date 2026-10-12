#!/usr/bin/env python3
"""Construit une version « un seul fichier » de l'application de révision,
et régénère le service worker (liste complète des fichiers à mettre en cache hors ligne).

Toutes les feuilles de style et tous les scripts référencés par app/index.html
sont intégrés dans un unique fichier HTML autonome (aucune dépendance, hors ligne) :
pratique pour l'envoyer par WhatsApp / clé USB ou l'ouvrir sur un téléphone.

Usage : python3 tools/build_single.py
Sortie : revision-concours-mef.html (à la racine du dépôt)
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app"
OUT = ROOT / "revision-concours-mef.html"


def main() -> int:
    html = (APP / "index.html").read_text(encoding="utf-8")
    missing = []

    def css(m):
        path = APP / m.group(1)
        if not path.exists():
            missing.append(str(path))
            return ""
        return "<style>\n" + path.read_text(encoding="utf-8") + "\n</style>"

    def js(m):
        path = APP / m.group(1)
        if not path.exists():
            missing.append(str(path))
            return ""
        code = path.read_text(encoding="utf-8").replace("</script", "<\\/script")
        return "<script>\n/* " + m.group(1) + " */\n" + code + "\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js, html)
    # le manifeste et le service worker n'ont pas de sens dans un fichier isolé
    html = re.sub(r'\s*<link rel="manifest"[^>]*>', "", html)
    html = re.sub(r'\s*<link rel="apple-touch-icon"[^>]*>', "", html)
    OUT.write_text(html, encoding="utf-8")
    size = OUT.stat().st_size / 1024
    print(f"OK : {OUT.relative_to(ROOT)} ({size:.0f} Ko)")
    if missing:
        print("Fichiers manquants :", *missing, sep="\n  ")
        return 1
    return 0


SW_TEMPLATE = """/* Service worker (généré par tools/build_single.py — ne pas modifier à la main).
   Quand l'application est servie en ligne (ex. GitHub Pages), tous les fichiers sont mis en cache
   dès l'installation : l'application fonctionne ensuite entièrement hors ligne et peut être installée
   sur l'écran d'accueil (Android, iPhone, ordinateur). */
const CACHE = '__CACHE__';
const ASSETS = __ASSETS__;
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
"""


def write_sw() -> None:
    """Liste tous les fichiers de l'application et régénère app/sw.js (version = empreinte du contenu)."""
    html = (APP / "index.html").read_text(encoding="utf-8")
    files = ["index.html", "manifest.webmanifest", "icon.svg"]
    files += re.findall(r'<link rel="stylesheet" href="([^"]+)">', html)
    files += re.findall(r'<script src="([^"]+)"></script>', html)
    files += sorted(str(p.relative_to(APP)) for p in (APP / "icons").glob("*.png"))
    h = hashlib.sha256()
    for f in files:
        h.update(f.encode())
        h.update((APP / f).read_bytes())
    assets = ["./"] + ["./" + f for f in files]
    sw = SW_TEMPLATE.replace("__CACHE__", "revision-mef-" + h.hexdigest()[:10])
    sw = sw.replace("__ASSETS__", "[\n  " + ",\n  ".join(repr(a).replace('"', "'") for a in assets) + "\n]")
    (APP / "sw.js").write_text(sw, encoding="utf-8")
    print(f"OK : app/sw.js ({len(assets)} fichiers en cache hors ligne)")


if __name__ == "__main__":
    code = main()
    write_sw()
    sys.exit(code)
