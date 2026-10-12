# Révision Concours MEF Niger — Systèmes & Réseaux

Application de révision **100 % hors ligne** : cours, cartes mémoire, exercices infinis, labs interactifs et examens blancs, construits à partir du plan « 9 séances » et des supports de cours de l'ESTN présents dans ce dépôt.

## Lancer l'application

Aucune installation, aucune connexion Internet.

| Appareil | Méthode |
|---|---|
| **PC** (Windows, Mac, Linux) | Télécharger le dépôt (*Code → Download ZIP*), décompresser, puis **double-cliquer sur `app/index.html`**. Ou ouvrir directement `revision-concours-mef.html`. |
| **Téléphone Android** | Copier **`revision-concours-mef.html`** (un seul fichier, tout compris) sur le téléphone (WhatsApp, câble, clé), puis l'ouvrir avec Chrome ou Firefox. |
| **iPhone** | L'aperçu de l'app Fichiers ne lance pas le JavaScript : ouvrir le fichier avec une app comme *Documents* (Readdle), ou publier le dossier `app/` sur GitHub Pages et l'ajouter à l'écran d'accueil (il fonctionne ensuite hors ligne). |

La progression (XP, cartes, erreurs, badges) est enregistrée dans le navigateur. Pour passer du PC au téléphone : **Profil → Exporter**, puis **Importer** sur l'autre appareil.

## Ce que contient l'application

- **Cours** : un module de fondations (binaire, hexadécimal, masques, calcul mental) + les séances du plan, chacune avec « l'essentiel en 30 secondes », des encadrés *Piège concours* / *Réflexe jour J*, des pas-à-pas, des animations (ARP, DHCP, TCP…) et des questions de vérification. Les erreurs relevées dans les supports de cours sont signalées et corrigées.
- **Cartes mémoire** avec répétition espacée (calendrier compressé sur la semaine du concours).
- **Générateurs d'exercices infinis**, corrigés pas à pas : binaire, sous-réseaux, VLSM, agrégation, wildcard, IPv6/EUI-64, ports, TCP, OSPF, table de routage, domaines, décibels, Shannon, VoIP, E1, chmod, umask, cron, RAID, sauvegardes…
- **Labs** : octet interactif, visualiseur de sous-réseau (ET logique coloré), planificateur VLSM, agrégation, atelier IPv6, simulateur de switch, élection STP, simulateur d'ACL, calculateurs TCP, dB/bilan de liaison, VoIP, chmod, cron, RAID.
- **Exercices type concours** du plan (énoncé, corrigé, barème, auto-évaluation, parties auto-corrigées).
- **Examens** : sujet blanc de la séance 9 (2 h, auto-évaluation au barème) et examen express auto-corrigé, toujours différent ; calcul E1/E2, moyenne (2×E1 + 3×E2)/5 et alerte « note ≤ 5 éliminatoire ».
- **Motivation** : XP, niveaux, série de jours 🔥, objectif quotidien, missions du jour, 26 badges, défis éclair de 60 s, carnet d'erreurs automatique.

## Pour les développeurs

Structure MVC en scripts classiques (compatibles `file://`), sans dépendance ni étape de compilation :

```
app/
├── index.html            point d'entrée unique
├── css/app.css           thèmes clair/sombre, responsive
├── js/core/              utilitaires, routeur, effets, correction des réponses, registre des générateurs
├── js/lib/               calcul IPv4/IPv6, aides de mise en forme du contenu
├── js/models/            sauvegarde, contenu, répétition espacée, XP/badges, progression
├── js/views/             composants d'interface, coquille, rendu des questions
├── js/widgets/           labs interactifs
├── js/generators/        générateurs d'exercices
├── js/controllers/       écrans (accueil, cours, cartes, entraînement, examens…)
└── data/                 contenu pédagogique (un fichier par séance)
tools/build_single.py     fabrique revision-concours-mef.html (tout en un)
```

Régénérer la version un seul fichier après une modification : `python3 tools/build_single.py`.
