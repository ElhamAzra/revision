# Révision Concours MEF Niger — Systèmes & Réseaux

Application de révision **100 % hors ligne** : cours, cartes mémoire, exercices infinis, labs interactifs et examens blancs, construits à partir du plan « 9 séances » et des supports de cours de l'ESTN présents dans ce dépôt.

## Lancer l'application

Aucune installation, aucune connexion Internet.

| Appareil | Méthode |
|---|---|
| **PC** (Windows, Mac, Linux) | Télécharger le dépôt (*Code → Download ZIP*), décompresser, puis **double-cliquer sur `app/index.html`**. Ou ouvrir directement `revision-concours-mef.html`. |
| **Téléphone Android** | Copier **`revision-concours-mef.html`** (un seul fichier, tout compris) sur le téléphone (WhatsApp, câble, clé), puis l'ouvrir avec Chrome ou Firefox. |
| **iPhone** | L'aperçu de l'app Fichiers ne lance pas le JavaScript : ouvrir le fichier avec une app comme *Documents* (Readdle), ou publier le dossier `app/` sur GitHub Pages et l'ajouter à l'écran d'accueil (il fonctionne ensuite hors ligne). |

Au **premier lancement**, un court assistant demande ton prénom, ta date de concours, ton rythme quotidien et ton confort de lecture, ou propose de **restaurer une sauvegarde existante**.

**Sauvegarde** : la progression (XP, cartes, erreurs, badges, réglages) est enregistrée automatiquement dans le navigateur. Pour ne rien perdre et changer d'appareil, clique sur **💾** (menu) ou **Profil → Sauvegarder maintenant** : un fichier `sauvegarde-revision-mef-<prénom>-<date>.json` est téléchargé. Sur l'autre appareil, choisis **« J'ai déjà une sauvegarde »** à l'ouverture, ou **Profil → Restaurer une sauvegarde** (ou glisse le fichier sur la fenêtre, sur ordinateur). Un aperçu (niveau, XP, leçons, date) s'affiche avant de confirmer. L'application rappelle de sauvegarder (tous les jours, 3 jours, chaque semaine ou jamais).

## Installer l'application (Android, iPhone, ordinateur)

La version **en ligne** s'installe sur l'écran d'accueil et fonctionne ensuite **sans Internet** (tous les fichiers sont mis en cache) :

- **Android** (Chrome, Edge, Samsung Internet) : bouton « 📲 Installer l'application » (accueil ou Profil), ou menu ⋮ → « Installer l'application ».
- **iPhone / iPad** (Safari) : bouton Partager → « Sur l'écran d'accueil ».
- **Ordinateur** (Chrome, Edge) : icône d'installation dans la barre d'adresse.

**Version en ligne** : **https://revision-app-zeta.vercel.app** (hébergée gratuitement sur Vercel, dépôt public ou privé). Chaque mise à jour de `main` est publiée automatiquement ; la configuration est dans `vercel.json` (dossier publié `app/`, en-têtes du service worker ; aucune étape de build : lancer `python3 tools/build_single.py` avant de committer). Le fichier unique est aussi disponible à `https://revision-app-zeta.vercel.app/revision-concours-mef.html`. Si l'adresse change, mettre à jour `App.ONLINE_URL` dans `app/js/core/util.js`.

## Confort d'utilisation

- **S'adapte à tous les écrans** : menu latéral complet sur grand écran (repliable en icônes), rail d'icônes sur écran moyen ou téléphone en paysage, barre d'onglets en bas sur téléphone. Le contenu occupe toute la largeur disponible.
- **Plein écran** : bouton ⛶ (ou touche **F** sur ordinateur).
- **Mode concentration** pendant les QCM, cartes et examens : plus de menus, une barre de progression, le bouton d'action toujours à portée du pouce. **Échap** ou ✕ pour quitter.
- **Leçons** : sommaire du module à droite sur grand écran, barre de lecture, boutons précédente / compris / suivante toujours visibles sur téléphone, et bouton **Reprendre** sur l'accueil.
- **Polices intégrées** (fonctionnent hors ligne) : *Nunito* (ronde, par défaut), *Lexend* (conçue pour lire plus vite) ou police du système, et 4 tailles de texte : **Profil → Affichage et lecture**. Thème clair / sombre.

## Ce que contient l'application

- **Cours** : un module de fondations (binaire, hexadécimal, masques, calcul mental) + les séances du plan, chacune avec « l'essentiel en 30 secondes », des encadrés *Piège concours* / *Réflexe jour J*, des pas-à-pas, des animations (ARP, DHCP, TCP…) et des questions de vérification. Les erreurs relevées dans les supports de cours sont signalées et corrigées.
- **Cartes mémoire** avec répétition espacée (calendrier compressé sur la semaine du concours).
- **Générateurs d'exercices infinis**, corrigés pas à pas : binaire, sous-réseaux, VLSM, agrégation, wildcard, IPv6/EUI-64, ports, TCP, OSPF, table de routage, domaines, décibels, Shannon, VoIP, E1, chmod, umask, cron, RAID, sauvegardes…
- **Labs** : octet interactif, visualiseur de sous-réseau (ET logique coloré), planificateur VLSM, agrégation, atelier IPv6, simulateur de switch, élection STP, simulateur d'ACL, calculateurs TCP, dB/bilan de liaison, VoIP, chmod, cron, RAID.
- **Exercices type concours** du plan (énoncé, corrigé, barème, auto-évaluation, parties auto-corrigées).
- **Examens** : 3 sujets blancs complets (Agadez — séance 9 du plan, Zinder, Maradi ; 2 h, auto-évaluation au barème) et examen express auto-corrigé, toujours différent ; calcul E1/E2, moyenne (2×E1 + 3×E2)/5 et alerte « note ≤ 5 éliminatoire ».
- **Motivation** : XP, niveaux, série de jours 🔥, objectif quotidien, missions du jour, 26 badges, défis éclair de 60 s, carnet d'erreurs automatique.

## Pour les développeurs

Structure MVC en scripts classiques (compatibles `file://`), sans dépendance ni étape de compilation :

```
app/
├── index.html            point d'entrée unique
├── css/fonts.css         polices Lexend, Nunito, JetBrains Mono (base64, licence SIL OFL 1.1)
├── css/app.css           thèmes clair/sombre, responsive
├── js/core/              utilitaires, routeur, effets, correction des réponses, registre des générateurs
├── js/lib/               calcul IPv4/IPv6, aides de mise en forme du contenu
├── js/models/            sauvegarde, contenu, répétition espacée, XP/badges, progression
├── js/views/             composants d'interface, coquille, rendu des questions
├── js/widgets/           labs interactifs
├── js/generators/        générateurs d'exercices
├── js/controllers/       écrans (accueil, cours, cartes, entraînement, examens…)
└── data/                 contenu pédagogique (un fichier par séance)
tools/build_single.py     fabrique revision-concours-mef.html (tout en un) et régénère app/sw.js (cache hors ligne)
```

Régénérer la version un seul fichier après une modification : `python3 tools/build_single.py`.

## Développeur

**Abderrahim Amadou Hassane** — ✉️ [abderrahim.amadou@gmail.com](mailto:abderrahim.amadou@gmail.com) · 📞 +227 99 00 87 67

Une question, une erreur dans un cours ou une idée d'amélioration ? N'hésitez pas à écrire.

🍀 **Bonne chance pour le concours !**

