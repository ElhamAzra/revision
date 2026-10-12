#!/usr/bin/env python3
"""Construit une version « un seul fichier » de l'application de révision.

Toutes les feuilles de style et tous les scripts référencés par app/index.html
sont intégrés dans un unique fichier HTML autonome (aucune dépendance, hors ligne) :
pratique pour l'envoyer par WhatsApp / clé USB ou l'ouvrir sur un téléphone.

Usage : python3 tools/build_single.py
Sortie : revision-concours-mef.html (à la racine du dépôt)
"""
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
    OUT.write_text(html, encoding="utf-8")
    size = OUT.stat().st_size / 1024
    print(f"OK : {OUT.relative_to(ROOT)} ({size:.0f} Ko)")
    if missing:
        print("Fichiers manquants :", *missing, sep="\n  ")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
