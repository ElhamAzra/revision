/* Séance 5 — Sécurité des réseaux : vocabulaire, menaces, attaques, pare-feu, ACL, cryptographie, VPN, AAA, dépannage. */
(function () {
  'use strict';
  const { key, trap, tip, reflex, ex, fix, mnemo, why, f, frac, table, steps, ul, w, stepper, reveal, code } = App.md;

  const synSeq = JSON.stringify({
    title: 'Inondation SYN (SYN flood)',
    actors: ['Attaquant<br><small>IP usurpées</small>', 'Serveur web', 'Utilisateur légitime'],
    msgs: [
      { from: 0, to: 1, label: 'SYN', sub: 'source usurpée 1', note: 'L\'attaquant envoie des milliers de SYN, souvent avec des adresses source falsifiées.' },
      { from: 1, to: 0, label: 'SYN-ACK', note: 'Le serveur répond et réserve des ressources pour chaque connexion « semi-ouverte »…' },
      { from: 0, to: 1, label: 'SYN, SYN, SYN…', note: '… mais l\'attaquant ne répond jamais par l\'ACK final. La file des connexions semi-ouvertes se remplit.' },
      { from: 2, to: 1, label: 'SYN', note: 'Un utilisateur légitime tente de se connecter…' },
      { from: 1, to: 2, label: '✗ refusé', note: '… la file est pleine : déni de service. Parades : SYN cookies, filtrage chez l\'opérateur, anti-DDoS.' }
    ]
  });

  App.registerModule({
    id: 's5', order: 5, label: 'Séance 5', short: 'Sécurité',
    title: 'Sécurité des réseaux : ACL, pare-feu, VPN, cryptographie',
    subtitle: 'Menaces, attaques et parades, filtrage, chiffrement, dépannage — Épreuve 2',
    icon: '🛡️', color: '#ef4444', day: '2026-10-14', epreuve: 'Épreuve 2',
    intro: 'Le vocabulaire du risque, les acteurs et les outils d\'attaque, les logiciels malveillants, les attaques réseau (IP, TCP, UDP, ARP, DNS, DHCP) avec leurs parades, puis les défenses : pare-feu, DMZ, IDS/IPS, ACL, cryptographie, IPsec, AAA et méthode de dépannage. Intègre tout le cours « Concepts de sécurité des réseaux » de l\'ESTN.',

    pretest: [
      { type: 'qcm', q: 'Pour envoyer un fichier confidentiel avec un système asymétrique, on chiffre avec :', choices: ['la clé publique du destinataire', 'sa propre clé privée', 'la clé privée du destinataire', 'une clé de hachage'], a: 0, expl: 'Seul le destinataire, avec sa clé privée, peut déchiffrer.' },
      { type: 'qcm', q: 'Une ACL qui ne contient que des « deny » :', choices: ['bloque tout', 'laisse tout passer', 'ne fait rien', 'n\'est pas acceptée'], a: 0, expl: 'Il y a toujours un deny implicite à la fin.' },
      { type: 'qcm', q: 'Un IDS :', choices: ['détecte et alerte', 'bloque en coupure', 'chiffre le trafic', 'remplace le pare-feu'], a: 0, expl: 'L\'IPS, lui, bloque.' }
    ],

    lessons: [
      {
        title: 'Le vocabulaire de la sécurité', min: 7,
        essentiel: ul([
          '<b>DICP</b> : Disponibilité, Intégrité, Confidentialité, Preuve (en anglais CIA + traçabilité).',
          '<b>Actif</b> (ce qui a de la valeur) · <b>vulnérabilité</b> (faiblesse) · <b>menace</b> (danger) · <b>exploit</b> (mécanisme qui tire parti d\'une faille) · <b>atténuation</b> (contre-mesure).',
          '<b>Risque</b> = probabilité que la menace exploite la vulnérabilité × impact. Défense en profondeur, moindre privilège, AAA.'
        ]),
        html: `
${table(['Critère', 'Question', 'Outil typique'], [['Disponibilité', 'Le service est-il accessible quand on en a besoin ?', 'Redondance, sauvegardes, anti-DDoS'], ['Intégrité', 'La donnée a-t-elle été modifiée ?', 'Hachage (SHA), signature'], ['Confidentialité', 'Seules les personnes autorisées peuvent-elles la lire ?', 'Chiffrement (AES), contrôle d\'accès'], ['Preuve / traçabilité', 'Qui a fait quoi, sans pouvoir le nier ?', 'Journaux, signature (non-répudiation)']])}
${table(['Terme (cours)', 'Définition'], [['Atout / actif', 'Tout ce qui a de la valeur : personnes, équipements, ressources, données'], ['Vulnérabilité', 'Faiblesse d\'un système ou de sa conception, exploitable par une menace'], ['Menace', 'Danger potentiel pour les actifs, les données ou les fonctions du réseau'], ['Exploit', 'Mécanisme qui tire parti d\'une vulnérabilité'], ['Atténuation', 'Contre-mesure qui réduit la probabilité ou la gravité d\'une menace'], ['Risque', 'Probabilité qu\'une menace exploite une vulnérabilité, × ses conséquences']])}
${ul(['<b>Vecteurs d\'attaque</b> : chemins par lesquels un acteur accède à un hôte ou un réseau. Ils viennent de l\'extérieur ou de l\'<b>intérieur</b> ; les menaces internes peuvent faire plus de dégâts (accès direct aux bâtiments et équipements).', '<b>Perte de données</b> (exfiltration) : atteinte à la réputation, perte d\'avantage concurrentiel, de clients, de revenus, poursuites. Vecteurs : courriel / réseaux sociaux, appareils non chiffrés, cloud mal sécurisé, supports amovibles (clé USB), copies papier non déchiquetées, contrôle d\'accès faible. Parade : <b>DLP</b> (prévention de perte de données).', '<b>Défense en profondeur</b> : plusieurs barrières successives (pare-feu + IPS + VPN + AAA + antivirus + MFA + sauvegardes).', '<b>Moindre privilège</b> : chacun n\'a que les droits strictement nécessaires.', '<b>AAA</b> : Authentification (qui es-tu ?), Autorisation (qu\'as-tu le droit de faire ?), Accounting / traçabilité (qu\'as-tu fait ?).'])}
${key('Risque = menace × vulnérabilité × impact : si l\'un des trois vaut zéro, il n\'y a pas de risque. On agit donc sur la vulnérabilité (correctifs) et sur l\'impact (sauvegardes, segmentation).')}
`,
        check: [
          { type: 'match', q: 'Associe chaque critère à son outil typique.', pairs: [['Confidentialité', 'Chiffrement'], ['Intégrité', 'Hachage'], ['Disponibilité', 'Redondance'], ['Preuve', 'Journaux et signature']], expl: 'DICP.' },
          { type: 'qcm', q: 'Un mot de passe faible est :', choices: ['une vulnérabilité', 'une menace', 'un actif', 'une atténuation'], a: 0, expl: 'Une faiblesse exploitable.' }
        ]
      },
      {
        title: 'Acteurs de menace et outils d\'attaque', min: 6,
        essentiel: ul([
          'Chapeaux <b>blancs</b> (éthiques), <b>gris</b> (délits sans but de nuire), <b>noirs</b> (criminels).',
          'Script kiddies, courtiers de vulnérabilités, hacktivistes, cybercriminels, attaquants <b>sponsorisés par un État</b>.',
          'Outils à double usage : Nmap (scan), Wireshark (renifleur), Metasploit (exploitation), Nessus/OpenVAS (vulnérabilités), John the Ripper / Hydra (mots de passe), Aircrack-ng (Wi-Fi), Kali Linux.'
        ]),
        html: `
${table(['Terme', 'Description (cours)'], [['Script kiddies', 'Débutants qui lancent des outils existants, pour nuire, généralement sans but lucratif'], ['Courtiers de vulnérabilités', 'Chapeaux gris qui découvrent des failles et les signalent aux éditeurs contre récompense'], ['Hacktivistes', 'Chapeaux gris qui protestent publiquement (fuites, attaques) contre organisations ou gouvernements'], ['Cybercriminels', 'Chapeaux noirs, seuls ou pour de grandes organisations criminelles'], ['Sponsorisés par l\'État', 'Volent des secrets, collectent du renseignement, sabotent ; ciblent gouvernements et grandes entreprises']])}
${table(['Catégorie d\'outil', 'Exemples'], [['Craqueurs de mots de passe', 'John the Ripper, Ophcrack, L0phtCrack, THC Hydra, RainbowCrack, Medusa'], ['Piratage sans fil', 'Aircrack-ng, Kismet, InSSIDer, KisMAC, ViStumbler'], ['Analyse du réseau (scan de ports)', 'Nmap, SuperScan, Angry IP Scanner, NetScanTools'], ['Fabrication de paquets', 'Hping, Scapy, Socat, Yersinia, Netcat, Nping, Nemesis'], ['Renifleurs de paquets', 'Wireshark, Tcpdump, Ettercap, Dsniff, SSLstrip'], ['Détecteurs de rootkit', 'AIDE, Netfilter, PF'], ['Fuzzers', 'Skipfish, Wapiti, W3af'], ['Investigation (forensic)', 'Sleuth Kit, Helix, Maltego, EnCase'], ['Débogueurs', 'GDB, WinDbg, IDA Pro, Immunity Debugger'], ['OS de test', 'Kali Linux, BackBox'], ['Chiffrement', 'VeraCrypt, OpenSSH, OpenSSL, Tor, OpenVPN, Stunnel'], ['Exploitation de vulnérabilités', 'Metasploit, Core Impact, Sqlmap, Social Engineer Toolkit, Netsparker'], ['Analyseurs de vulnérabilités', 'Nessus, OpenVAS, SAINT, Nipper, Core Impact']])}
${tip('Ces outils servent aussi aux défenseurs (tests d\'intrusion autorisés). Au concours, on attend surtout : <b>Nmap</b> = scan de ports, <b>Wireshark</b> = analyse de trames, <b>Metasploit</b> = exploitation, <b>Nessus</b> = scan de vulnérabilités.')}
`,
        check: [
          { type: 'qcm', q: 'Outil d\'analyse de trames / de capture de paquets :', choices: ['Wireshark', 'Nmap', 'Metasploit', 'John the Ripper'], a: 0, expl: 'Renifleur de paquets.' },
          { type: 'qcm', q: 'Un pirate éthique qui signale les failles aux développeurs est un chapeau :', choices: ['blanc', 'gris', 'noir', 'rouge'], a: 0, expl: 'White hat.' }
        ]
      },
      {
        title: 'Les logiciels malveillants', min: 6,
        essentiel: ul([
          '<b>Virus</b> : s\'attache à un fichier, a besoin d\'une <b>action humaine</b> pour se propager.',
          '<b>Ver</b> : se propage <b>seul</b> en exploitant des failles via le réseau.',
          '<b>Cheval de Troie</b> (paraît utile), <b>rançongiciel</b> (chiffre et exige une rançon), <b>rootkit</b> (accès admin caché), <b>logiciel espion</b>, <b>publicitaire</b>.'
        ]),
        html: `
${table(['Type de virus', 'Cible'], [['Secteur de démarrage', 'Secteur de boot, table de partitions, système de fichiers'], ['Micrologiciel', 'Firmware du périphérique'], ['Macro', 'Macros MS Office'], ['Programme', 'S\'insère dans un exécutable'], ['Script', 'Interpréteur de scripts du système']])}
${table(['Cheval de Troie', 'Effet'], [['Accès distant', 'Accès à distance non autorisé (porte dérobée)'], ['Envoi de données', 'Vole des données (mots de passe)'], ['Destructeur', 'Corrompt ou supprime des fichiers'], ['Proxy', 'Utilise la victime pour lancer d\'autres attaques'], ['FTP', 'Ouvre un service de transfert de fichiers'], ['Désactivation de sécurité', 'Arrête antivirus et pare-feu'], ['DoS', 'Ralentit ou arrête le réseau'], ['Enregistreur de frappe', 'Capture les touches (keylogger)']])}
${table(['Logiciel', 'Caractéristique'], [['Rançongiciel (ransomware)', 'Chiffre les fichiers et exige une rançon (souvent en cryptomonnaie) ; sans sauvegarde à jour, on est piégé'], ['Rootkit', 'Accès administrateur, très difficile à détecter (modifie OS, antivirus, pare-feu) ; souvent réinstallation complète'], ['Logiciel espion (spyware)', 'Collecte des informations sans consentement'], ['Logiciel publicitaire (adware)', 'Publicités, fenêtres intempestives, redirections'], ['Ver (worm)', 'Se réplique seul via le réseau, ralentit ou perturbe']])}
${reflex('Contre les rançongiciels : <b>sauvegardes hors ligne (3-2-1)</b>, correctifs, EDR, segmentation, MFA. C\'est la réponse attendue.')}
`,
        check: [
          { type: 'qcm', q: 'Quel logiciel malveillant se propage sans intervention de l\'utilisateur ?', choices: ['le ver', 'le virus', 'le cheval de Troie', 'le logiciel publicitaire'], a: 0, expl: 'Le virus, lui, a besoin d\'une action humaine.' },
          { type: 'qcm', q: 'Meilleure parade contre un rançongiciel :', choices: ['sauvegardes hors ligne (3-2-1)', 'un IDS', 'un VLAN', 'le NAT'], a: 0, expl: 'Pouvoir restaurer sans payer.' }
        ]
      },
      {
        title: 'Les attaques réseau courantes', min: 8,
        essentiel: ul([
          '3 familles : <b>reconnaissance</b> (collecte d\'infos, scans), <b>accès</b> (mots de passe, usurpation, homme du milieu, débordement de tampon), <b>DoS / DDoS</b>.',
          'Reconnaissance : requête d\'info (whois, Google) → <b>balayage ping</b> → <b>scan de ports</b> (Nmap) → scan de vulnérabilités → exploitation.',
          '<b>Ingénierie sociale</b> : hameçonnage (phishing, ciblé), prétexte, appâtage (clé USB), tailgating, espionnage par-dessus l\'épaule, fouille des poubelles.'
        ]),
        html: `
${table(['Type d\'attaque (cours)', 'Description'], [['Écoute (reniflement)', 'Capturer et lire le trafic'], ['Modification de données', 'Modifier les paquets capturés à l\'insu des deux parties'], ['Usurpation d\'adresse IP', 'Paquet qui semble venir d\'une adresse interne valide'], ['Attaque par mot de passe', 'Avec un compte valide, mêmes droits que l\'utilisateur'], ['Déni de service', 'Empêcher l\'usage normal (inondation ou paquets malformés)'], ['Homme du milieu', 'Se placer entre la source et la destination pour surveiller et modifier'], ['Clé compromise', 'Clé secrète volée → accès aux communications sécurisées'], ['Renifleur', 'Lit tout le contenu si les paquets ne sont pas chiffrés']])}
${table(['Ingénierie sociale', 'Principe'], [['Prétexte', 'Prétendre avoir besoin d\'infos pour « confirmer l\'identité »'], ['Hameçonnage (phishing)', 'Faux mail d\'une source fiable ; « ciblé » (spear phishing) s\'il vise une personne'], ['Spam', 'Courrier non sollicité, liens nuisibles'], ['Contrepartie (quid pro quo)', 'Informations contre un cadeau'], ['Appâtage', 'Clé USB infectée laissée dans un lieu public'], ['Usurpation d\'identité', 'Se faire passer pour quelqu\'un d\'autre'], ['Tailgating', 'Suivre une personne autorisée dans une zone sécurisée'], ['Shoulder surfing', 'Regarder par-dessus l\'épaule'], ['Fouille de poubelles', 'Chercher des documents confidentiels jetés']])}
${ul(['<b>DoS</b> : quantité écrasante de trafic, ou paquets malformés que le récepteur ne sait pas traiter. <b>DDoS</b> : la même chose depuis de nombreuses sources coordonnées (botnet).', 'Les attaques de reconnaissance <b>précèdent</b> les attaques d\'accès ou de DoS.'])}
${reflex('Parades « humaines » : sensibilisation des agents, MFA, politique de bureau propre, destruction des documents (déchiqueteuse), badge pour les zones sensibles.')}
`,
        check: [
          { type: 'order', q: 'Ordre d\'une attaque de reconnaissance :', items: ['Recherche d\'informations sur la cible (whois, site web)', 'Balayage ping des adresses', 'Scan des ports ouverts', 'Scan des vulnérabilités', 'Exploitation'], expl: 'De la collecte à l\'exploitation.' },
          { type: 'qcm', q: 'Laisser une clé USB infectée sur un parking est :', choices: ['de l\'appâtage', 'du tailgating', 'du phishing', 'un DDoS'], a: 0, expl: 'Baiting.' }
        ]
      },
      {
        title: 'Attaques sur IP, TCP, UDP, ARP, DNS et DHCP', min: 10,
        essentiel: ul([
          'IP ne vérifie pas l\'adresse source → <b>usurpation</b> ; ICMP sert à la reconnaissance et au DoS ; <b>amplification / réflexion</b>.',
          'TCP : <b>SYN flood</b> (connexions semi-ouvertes), <b>reset</b> (RST usurpé), <b>détournement de session</b>. UDP : <b>UDP flood</b>.',
          '<b>Empoisonnement ARP</b> (→ DAI), <b>faux DHCP</b> (→ DHCP snooping), attaques <b>DNS</b> (cache, amplification, tunneling).'
        ]),
        html: `
${w('seq', { seq: synSeq })}
<h3>ARP : empoisonnement du cache (cours)</h3>
${steps(['PC-A demande la MAC de sa passerelle (192.168.10.1) ; R1 et PC-A se mettent à jour normalement.', 'L\'attaquant envoie des <b>réponses ARP gratuites usurpées</b> avec sa propre MAC.', 'PC-A croit que la passerelle est l\'attaquant ; R1 croit que PC-A est l\'attaquant → <b>homme du milieu</b>.'])}
<p>Passif = vol d'informations ; actif = modification ou injection de données. <b>Parade : DAI</b> (Dynamic ARP Inspection).</p>
<h3>DNS</h3>
${ul(['<b>Résolveur ouvert</b> (répond à tout le monde) : empoisonnement du cache (fausses réponses → faux sites), <b>amplification et réflexion</b> (requêtes avec l\'IP de la victime), épuisement des ressources.', '<b>Furtivité</b> : fast flux (IP qui changent toutes les minutes), double flux IP, algorithmes de génération de domaines (DGA) pour joindre les serveurs de commande (C&C).', '<b>Tunneling DNS</b> : cacher des commandes ou des données volées dans des requêtes DNS (sous-domaines encodés). Parade : filtrer et inspecter le DNS, surveiller les requêtes anormalement longues ou suspectes ; DNSSEC contre la falsification.'])}
<h3>DHCP : faux serveur (cours)</h3>
${steps(['Le client diffuse un Discover ; le vrai serveur et le faux le reçoivent.', 'Les deux répondent ; le client accepte la <b>première</b> offre reçue (celle du faux).', 'Le faux serveur fournit une <b>fausse passerelle</b> (homme du milieu), un <b>faux DNS</b> (faux sites) ou une IP invalide (DoS).'])}
${table(['Attaque', 'Principe', 'Parade'], [
  ['MAC flooding', 'Saturer la table MAC → le switch inonde tout (écoute)', 'Port security'],
  ['ARP spoofing', 'Fausses réponses ARP : « la passerelle, c\'est moi »', 'DAI'],
  ['Faux serveur DHCP', 'Fausse passerelle ou faux DNS', 'DHCP snooping'],
  ['VLAN hopping', 'Sauter de VLAN (DTP, double tag)', 'VLAN natif inutilisé, nonegotiate, ports access'],
  ['DoS / DDoS, SYN flood', 'Épuiser les ressources', 'SYN cookies, filtrage opérateur, anti-DDoS'],
  ['Usurpation IP / DNS', 'Se faire passer pour une autre source', 'Anti-spoofing (uRPF), DNSSEC'],
  ['Force brute', 'Essayer des milliers de mots de passe', 'Verrouillage, MFA, clés SSH, ACL sur l\'administration'],
  ['Hameçonnage', 'Faux mail pour voler un mot de passe', 'Sensibilisation, filtrage, MFA'],
  ['Rançongiciel', 'Chiffre les données', 'Sauvegardes hors ligne 3-2-1, correctifs, EDR, segmentation'],
  ['Injection SQL, XSS', 'Injecter du code dans une application web', 'Requêtes paramétrées, validation, WAF']
])}
`,
        check: [
          { type: 'match', q: 'Associe chaque attaque à sa parade.', pairs: [['ARP spoofing', 'Dynamic ARP Inspection'], ['Faux serveur DHCP', 'DHCP snooping'], ['MAC flooding', 'Port security'], ['Rançongiciel', 'Sauvegardes hors ligne (3-2-1)'], ['Injection SQL', 'Requêtes paramétrées, WAF']], expl: 'Tableau à connaître.' },
          { type: 'qcm', q: 'Une attaque qui laisse des milliers de connexions TCP semi-ouvertes :', choices: ['SYN flood', 'ARP spoofing', 'DNS tunneling', 'VLAN hopping'], a: 0, expl: 'L\'ACK final n\'arrive jamais.' }
        ]
      },
      {
        title: 'Pare-feu, DMZ, IDS / IPS', min: 7,
        essentiel: ul([
          'Pare-feu <b>sans état</b> (ACL : chaque paquet isolément) · <b>à états</b> (suit les connexions, autorise les réponses) · proxy · <b>NGFW</b> · <b>WAF</b>.',
          '<b>DMZ</b> : réseau séparé pour les serveurs publics. Internet → DMZ (ports précis) ; interne → DMZ (administration) ; <b>DMZ → interne interdit</b>.',
          '<b>IDS</b> : copie du trafic (port miroir), <b>alerte</b>. <b>IPS</b> : en coupure, <b>bloque</b>. Faux négatif = attaque non détectée (le plus grave).'
        ]),
        html: `
${table(['Type de pare-feu', 'Ce qu\'il examine'], [['Filtrage de paquets sans état (ACL)', 'Chaque paquet isolément : IP, protocole, ports'], ['Pare-feu à états (stateful)', 'Suit les connexions : autorise automatiquement les réponses au trafic sortant légitime'], ['Proxy applicatif', 'Relaie et analyse le contenu d\'un protocole (HTTP…)'], ['NGFW (nouvelle génération)', 'Applications, utilisateurs, IPS intégré, inspection TLS'], ['WAF', 'Protège spécifiquement les applications web']])}
${ul(['Politique : <b>tout interdire par défaut</b>, puis n\'ouvrir que le strict nécessaire.', 'IDS/IPS : détection par <b>signatures</b> (attaques connues ; atomiques = 1 paquet, composites = plusieurs) ou par <b>anomalie</b>. <b>Faux positif</b> = alerte à tort ; <b>faux négatif</b> = attaque non détectée.', 'Fonctionnement d\'un IPS (cours) : il intercepte le paquet, le compare aux menaces connues et aux politiques, journalise vers la console, puis l\'abandonne.', '<b>SIEM</b> : centralise et corrèle les journaux.', 'Défense en profondeur (cours) : VPN, pare-feu ASA, IPS, filtrage mail/web (ESA/WSA), serveur AAA, équipements durcis.'])}
${reflex('DMZ : un serveur public piraté ne doit jamais donner accès au réseau interne. D\'où la règle « DMZ → interne : interdit, sauf exception justifiée ».')}
`,
        check: [
          { type: 'qcm', q: 'Quel équipement bloque une attaque en temps réel ?', choices: ['IDS', 'IPS', 'SIEM', 'proxy de cache'], a: 1, noShuffle: true, expl: 'IPS = en coupure.' },
          { type: 'qcm', q: 'La zone qui héberge les serveurs publics :', choices: ['LAN', 'DMZ', 'VLAN natif', 'intranet'], a: 1, noShuffle: true, expl: 'DMZ.' },
          { type: 'qcm', q: 'Le plus grave pour un IDS :', choices: ['le faux négatif', 'le faux positif', 'l\'alerte', 'le journal plein'], a: 0, expl: 'Une attaque passée inaperçue.' }
        ]
      },
      {
        title: 'Les ACL Cisco : écrire et analyser', min: 10,
        essentiel: ul([
          '<b>Standard</b> (1-99, 1300-1999) : IP <b>source</b> seulement → placée <b>près de la destination</b>. <b>Étendue</b> (100-199, 2000-2699) : source, destination, protocole, ports → <b>près de la source</b>.',
          'Lecture <b>de haut en bas</b>, <b>première correspondance</b> ; <b>deny any implicite</b> à la fin ; une ACL par interface, par sens, par protocole.',
          'Masque générique ; <code>host</code> = /32 ; <code>any</code> = tout. <code>established</code> = réponses TCP (ACK/RST), ne marche pas pour UDP.'
        ]),
        html: `
${code(`! ACL standard : seul le LAN Admin administre le routeur (lignes vty)
access-list 10 permit 10.20.0.0 0.0.1.255
line vty 0 4
 access-class 10 in

! ACL étendue nommée
ip access-list extended WEB-ONLY
 permit tcp 10.20.2.0 0.0.0.255 host 10.20.3.194 eq 443
 deny   ip 10.20.2.0 0.0.0.255 10.20.3.192 0.0.0.31
 permit ip any any
interface g0/1
 ip access-group WEB-ONLY in
show access-lists`)}
${w('aclsim')}
${ex(`${code(`ip access-list extended VERS-DMZ
 permit tcp any host 10.20.3.194 eq 80
 permit tcp any host 10.20.3.194 eq 443
 permit tcp any host 10.20.3.195 eq 25
 permit udp any host 10.20.3.196 eq 53
 permit tcp any host 10.20.3.196 eq 53
 permit tcp 10.20.0.0 0.0.1.255 10.20.3.192 0.0.0.31 eq 22
 permit tcp any 10.20.3.192 0.0.0.31 established
 deny ip any any log
interface g0/3
 ip access-group VERS-DMZ out`)}
<b>out sur G0/3</b> : filtre tout ce qui entre dans la DMZ, d'où qu'il vienne. En entrée de G0/2 (Internet), le trafic porte encore les adresses <b>publiques</b> (pas encore traduites) : les règles en 10.20.3.x ne correspondraient jamais.`, 'Protéger la DMZ (plan)')}
${trap('<code>access-list 101 deny tcp any any eq 23</code> seule en entrée de G0/0 → plus personne n\'accède à rien (deny implicite). Il faut ajouter <code>access-list 101 permit ip any any</code> <b>après</b>.')}
${trap('Une règle large avant une règle précise la rend inutile : <code>permit ip 10.20.0.0 0.0.1.255 any</code> puis <code>deny tcp host 10.20.0.50 any eq 80</code> → la 2<sup>e</sup> n\'est jamais lue. Mettre la règle précise en premier.')}
${why('Le DNS de la DMZ qui interroge Internet : les réponses arrivent en UDP vers un port aléatoire ; <code>established</code> ne marche que pour TCP → elles tombent sur le deny. Mieux qu\'une ACL : un <b>pare-feu à états</b> (ou Zone-Based Firewall Cisco).')}
`,
        check: [
          { type: 'qcm', q: 'Une ACL standard filtre sur :', choices: ['l\'IP destination', 'l\'IP source', 'le port', 'la MAC'], a: 1, noShuffle: true, expl: 'Source uniquement.' },
          { type: 'qcm', q: 'Où placer une ACL étendue ?', choices: ['près de la source', 'près de la destination', 'sur le FAI', 'n\'importe où'], a: 0, expl: 'On bloque le trafic au plus tôt.' },
          { type: 'input', q: 'Pour limiter l\'accès SSH au routeur, on applique l\'ACL sur les lignes vty avec quelle commande ? (2 mots + n° + sens)', fields: [{ kind: 'code', ci: true, a: ['access-class 10 in'], ph: 'access-… 10 …' }], expl: '<code>access-class 10 in</code> (et non ip access-group).' }
        ]
      },
      {
        title: 'Cryptographie : chiffrer, hacher, signer', min: 9,
        essentiel: ul([
          '<b>Symétrique</b> : 1 clé partagée, rapide (AES) ; N personnes → <b>N(N−1)/2</b> clés. <b>Asymétrique</b> : paire publique/privée, lent (RSA, ECC, Diffie-Hellman).',
          '<b>Confidentialité</b> = clé <b>publique du destinataire</b>. <b>Signature</b> = hachage chiffré avec la clé <b>privée de l\'émetteur</b>.',
          '<b>Hachage</b> = empreinte non réversible (SHA-256 ; MD5 cassé). <b>TLS / IPsec = hybride</b> : asymétrique pour échanger une clé de session, symétrique pour les données.'
        ]),
        html: `
${table(['Opération', 'Image simple', 'Réversible ?', 'Protège'], [['Chiffrement symétrique', 'Un coffre avec une seule clé, que les deux possèdent', 'Oui, avec la clé', 'Confidentialité'], ['Chiffrement asymétrique', 'Une boîte aux lettres : tout le monde dépose (clé publique), seul le propriétaire ouvre (clé privée)', 'Oui, avec la clé privée', 'Confidentialité, échange de clés'], ['Hachage', 'Une empreinte digitale du fichier, de taille fixe', 'Non (sens unique)', 'Intégrité'], ['Signature', 'Le hachage, chiffré avec la clé privée de l\'émetteur', 'Vérifiable avec sa clé publique', 'Authenticité, intégrité, non-répudiation']])}
${table(['', 'Symétrique', 'Asymétrique'], [['Clés', '1 clé secrète partagée', '1 paire : publique + privée'], ['Algorithmes', 'AES (128/256), 3DES, DES (cassé), ChaCha20', 'RSA, ECC, Diffie-Hellman (échange)'], ['Vitesse', 'Rapide → gros volumes', 'Lent → petites données, échange de clés'], ['Problème', 'Transmettre la clé ? N(N−1)/2 clés', 'Être sûr de la clé publique ? → certificats']])}
${stepper([
  '<p><b>Awa signe le fichier.</b> Elle calcule le hachage SHA-256 du fichier.</p>',
  '<p>Elle chiffre ce hachage avec sa <b>clé privée</b> : c\'est la <b>signature</b>, jointe au fichier.</p>',
  '<p>Pour la confidentialité, elle chiffre le fichier avec la <b>clé publique de Moussa</b> (en pratique : une clé de session AES, elle-même chiffrée avec la clé publique de Moussa).</p>',
  '<p><b>Moussa</b> déchiffre avec sa <b>clé privée</b>, puis vérifie la signature avec la <b>clé publique d\'Awa</b> et recalcule le hachage : identiques → fichier intègre et bien envoyé par Awa.</p>',
  '<p>Bonus : la clé publique d\'Awa doit être garantie par un <b>certificat</b> signé par une autorité de certification (PKI).</p>'
], 'Awa envoie un fichier signé et confidentiel à Moussa')}
${ul(['<b>HMAC</b> = hachage + clé secrète (intégrité + authenticité).', '<b>PKI</b> : une autorité de certification (AC) signe des certificats <b>X.509</b> qui lient une clé publique à une identité. Révocation : <b>CRL</b> ou <b>OCSP</b>. Chaîne : AC racine → AC intermédiaire → certificat du serveur.'])}
${f(`Clés symétriques = ${frac('N (N − 1)', '2')} &nbsp;→&nbsp; 20 agents : ${frac('20 × 19', '2')} = <b class="hl">190</b> &nbsp;·&nbsp; asymétrique : 20 paires`)}
${trap('Hachage ≠ chiffrement : on ne « déchiffre » pas un hachage. Et pour signer, c\'est la clé PRIVÉE de l\'émetteur (pas la publique du destinataire).')}
`,
        check: [
          { type: 'qcm', q: 'AES est un algorithme :', choices: ['asymétrique', 'symétrique', 'de hachage', 'd\'échange de clés'], a: 1, noShuffle: true, expl: 'Symétrique.' },
          { type: 'qcm', q: 'Pour signer, l\'émetteur utilise :', choices: ['sa clé publique', 'sa clé privée', 'la clé publique du destinataire', 'une clé de session'], a: 1, noShuffle: true, expl: 'Clé privée de l\'émetteur.' },
          { type: 'input', q: 'Combien de clés symétriques pour que 10 agents échangent deux à deux ?', fields: [{ kind: 'num', a: 45 }], expl: '10 × 9 / 2 = 45.' }
        ]
      },
      {
        title: 'VPN et IPsec', min: 7,
        essentiel: ul([
          'VPN <b>site à site</b> (Niamey ↔ Zinder, IPsec, transparent pour les postes) · <b>accès distant</b> (agent en mission : SSL/TLS ou client IPsec, avec MFA).',
          '<b>AH</b> (protocole IP 51) : intégrité sans chiffrement, incompatible avec le NAT. <b>ESP</b> (50) : chiffrement + intégrité → le choix habituel.',
          'Mode <b>transport</b> (hôte à hôte) / <b>tunnel</b> (site à site, tout le paquet encapsulé). <b>IKE</b> UDP 500 (phases 1 et 2) ; <b>NAT-T</b> UDP 4500.'
        ]),
        html: `
${table(['IPsec', 'Détail'], [['AH (protocole IP 51)', 'Intégrité + authentification, pas de chiffrement ; incompatible avec le NAT (il protège l\'en-tête IP, que le NAT modifie)'], ['ESP (protocole IP 50)', 'Chiffrement + intégrité + authentification : le choix habituel'], ['Mode transport', 'Protège les données ; l\'en-tête IP d\'origine reste visible (hôte à hôte)'], ['Mode tunnel', 'Encapsule tout le paquet dans un nouveau paquet IP (site à site)'], ['IKE (UDP 500)', 'Négocie les clés : phase 1 (canal sûr) puis phase 2 (tunnels de données)'], ['NAT-T (UDP 4500)', 'Encapsule ESP dans UDP pour traverser le NAT']])}
${ul(['<b>GRE</b> : tunnel sans chiffrement qui transporte le multicast (donc OSPF) ; souvent <b>GRE dans IPsec</b>.', 'Paramètres sûrs : ESP tunnel, AES-256 (ou AES-GCM), SHA-256, IKEv2, Diffie-Hellman ≥ groupe 14, certificats (ou clé pré-partagée longue).', 'Pare-feu de Niamey : laisser entrer UDP 500, UDP 4500 et le protocole IP 50, uniquement depuis les adresses publiques des sites.', 'Accès distant des inspecteurs : <b>MFA</b> obligatoire (un mot de passe volé ne suffit plus) — l\'accès distant est la porte d\'entrée préférée des rançongiciels.'])}
${trap('« AH chiffre » est faux : c\'est <b>ESP</b> qui chiffre. AH ne fait qu\'authentifier.')}
`,
        check: [
          { type: 'qcm', q: 'Le protocole IPsec qui chiffre :', choices: ['AH', 'IKE', 'ESP', 'GRE'], a: 2, noShuffle: true, expl: 'ESP.' },
          { type: 'qcm', q: 'Port de NAT-T :', choices: ['UDP 4500', 'UDP 500', 'TCP 443', 'IP 50'], a: 0, expl: 'ESP dans UDP 4500.' },
          { type: 'qcm', q: 'Pour relier deux sites par Internet :', choices: ['VPN IPsec site à site, ESP en mode tunnel', 'AH en mode transport', 'Telnet', 'GRE seul'], a: 0, expl: 'GRE seul ne chiffre pas.' }
        ]
      },
      {
        title: 'AAA, 802.1X et durcissement des équipements', min: 6,
        essentiel: ul([
          '<b>RADIUS</b> : UDP 1812/1813, chiffre le mot de passe seulement, combine authentification + autorisation → accès réseau (802.1X, Wi-Fi, VPN).',
          '<b>TACACS+</b> : TCP 49, chiffre tout, sépare les 3 A → administration des équipements (Cisco).',
          '<b>802.1X</b> : supplicant (poste) → authentificateur (switch/borne) → serveur RADIUS ; le port ne laisse rien passer avant authentification (messages EAP).'
        ]),
        html: `
${table(['', 'RADIUS', 'TACACS+'], [['Transport', 'UDP 1812/1813', 'TCP 49'], ['Chiffrement', 'Mot de passe seulement', 'Tout le paquet'], ['AAA', 'Authentification + autorisation combinées', 'Les 3 « A » séparés'], ['Usage', 'Accès réseau (802.1X, Wi-Fi, VPN)', 'Administration des équipements (Cisco)']])}
${code(`hostname R-NIAMEY
ip domain-name finances.exemple.ne
crypto key generate rsa modulus 2048
ip ssh version 2
username admin privilege 15 secret M0tDeP@sseLong
enable secret AutreM0tDeP@sse
service password-encryption
line vty 0 4
 transport input ssh
 login local
 access-class 10 in
 exec-timeout 5 0
banner motd #Accès réservé aux personnes autorisées#
! + ports inutilisés en shutdown, NTP, journaux (syslog), sauvegarde des configurations`)}
${tip('<code>secret</code> (haché) est préférable à <code>password</code>. <code>service password-encryption</code> ne fait qu\'obscurcir les mots de passe en clair de la configuration.')}
`,
        check: [
          { type: 'qcm', q: 'TACACS+ utilise :', choices: ['UDP 1812', 'TCP 49', 'UDP 49', 'TCP 443'], a: 1, noShuffle: true, expl: 'TCP 49.' },
          { type: 'qcm', q: 'Dans 802.1X, le switch joue le rôle :', choices: ['de supplicant', 'd\'authentificateur', 'de serveur RADIUS', 'd\'AC'], a: 1, noShuffle: true, expl: 'Authentificateur.' }
        ]
      },
      {
        title: 'Dépannage : la méthode qui rapporte des points', min: 7,
        essentiel: ul([
          'Approches : <b>ascendante</b> (couche 1 → 7), <b>descendante</b>, <b>diviser pour régner</b> (commencer au milieu : « le ping marche-t-il ? »).',
          'Pings dans l\'ordre : <b>127.0.0.1 → sa propre IP → la passerelle → une IP distante → un nom</b>. Le premier qui échoue désigne la couche en panne.',
          'Cisco : <b>administratively down</b> = shutdown · <b>down/down</b> = couche 1 · <b>up/down</b> = couche 2 · erreurs <b>CRC</b> = câble / duplex.'
        ]),
        html: `
${steps(['Recueillir les symptômes', 'Formuler une hypothèse', 'Tester', 'Corriger', 'Vérifier', 'Documenter'])}
${table(['Outil', 'Usage'], [['ipconfig /all · ip a', 'IP, masque, passerelle, DNS, DHCP'], ['ping', 'Joignabilité (ICMP echo)'], ['tracert · traceroute', 'Où le chemin s\'arrête'], ['nslookup · dig', 'Résolution DNS'], ['arp -a · netstat -an · ss -tulpn', 'Table ARP · ports ouverts et connexions'], ['show ip interface brief', 'État et IP des interfaces Cisco'], ['show interfaces', 'Erreurs (CRC → câble, duplex)']])}
${table(['État Cisco (Status / Protocol)', 'Signification', 'Action'], [['administratively down / down', 'Commande shutdown', 'no shutdown'], ['down / down', 'Couche 1 : câble, port distant éteint', 'Vérifier câblage, modem, opérateur'], ['up / down', 'Couche 2 : encapsulation, horloge (clock rate), keepalive', 'Vérifier encapsulation HDLC/PPP des deux côtés'], ['up / up', 'Fonctionnel', '—']])}
${ex(`Poste de Tahoua : IP 10.20.3.150/26, passerelle 10.20.3.129, DNS 10.20.0.10. Ping passerelle OK ; ping 10.20.0.80 échoue ; tracert : 1 10.20.3.129 ; 2 * * *.<br>
R-TAHOUA : S0/1 <b>administratively down</b> → <code>no shutdown</code> ; S0/0 <b>down/down</b> → problème physique (câble, modem, opérateur, routeur de Zinder éteint). Les deux WAN sont hors service : Tahoua est isolé.<br>
Autre jour : ping de l'IP OK mais pas du nom → <b>DNS</b> (nslookup, enregistrement A, ipconfig /flushdns). Milliers d'erreurs CRC → <b>couche 1</b> (câble, interférences, duplex).`, 'Cas du plan')}
`,
        check: [
          { type: 'qcm', q: 'Interface « up / line protocol down » :', choices: ['câble débranché', 'shutdown', 'problème de couche 2', 'problème DNS'], a: 2, noShuffle: true, expl: 'Encapsulation, horloge, keepalive.' },
          { type: 'order', q: 'Ordre des pings de dépannage :', items: ['127.0.0.1', 'Sa propre IP', 'La passerelle', 'Une IP distante', 'Un nom (DNS)'], expl: 'Le premier qui échoue désigne la couche en panne.' }
        ]
      }
    ],

    cards: [
      { front: 'DICP ?', back: 'Disponibilité, Intégrité, Confidentialité, Preuve (traçabilité)' },
      { front: 'Actif, vulnérabilité, menace, exploit ?', back: 'Ce qui a de la valeur · faiblesse · danger · mécanisme qui exploite la faille' },
      { front: 'Formule du risque ?', back: 'Probabilité (menace × vulnérabilité) × impact' },
      { front: 'AAA ?', back: 'Authentification, Autorisation, Accounting (traçabilité)' },
      { front: 'Défense en profondeur ?', back: 'Plusieurs barrières successives (pare-feu, IPS, VPN, AAA, MFA, sauvegardes…)' },
      { front: 'Chapeaux blanc, gris, noir ?', back: 'Éthique · délits sans but de nuire · criminel' },
      { front: 'Nmap, Wireshark, Metasploit, Nessus ?', back: 'Scan de ports · capture de trames · exploitation · scan de vulnérabilités' },
      { front: 'Virus vs ver ?', back: 'Virus : action humaine nécessaire · ver : se propage seul via le réseau' },
      { front: 'Rootkit ?', back: 'Accès administrateur caché, très difficile à détecter' },
      { front: '3 familles d\'attaques réseau ?', back: 'Reconnaissance · accès · DoS/DDoS' },
      { front: 'Ingénierie sociale : 5 exemples ?', back: 'Hameçonnage, prétexte, appâtage (clé USB), tailgating, shoulder surfing, fouille de poubelles' },
      { front: 'SYN flood ?', back: 'Milliers de SYN sans ACK final → file des connexions semi-ouvertes pleine (parade : SYN cookies)' },
      { front: 'Parade contre ARP spoofing ?', back: '<b>DAI</b> (Dynamic ARP Inspection)' },
      { front: 'Parade contre faux serveur DHCP ?', back: '<b>DHCP snooping</b>' },
      { front: 'Parade contre MAC flooding ?', back: '<b>Port security</b>' },
      { front: 'Parades VLAN hopping ?', back: 'VLAN natif inutilisé, nonegotiate (DTP off), ports en access' },
      { front: 'Tunneling DNS ?', back: 'Cacher des commandes/données dans des requêtes DNS → inspecter le DNS, requêtes anormalement longues' },
      { front: 'Pare-feu sans état vs à états ?', back: 'Chaque paquet isolé (ACL) · suit les connexions et autorise les réponses' },
      { front: 'DMZ : règles ?', back: 'Internet → DMZ (ports précis) · interne → DMZ (admin) · DMZ → interne interdit' },
      { front: 'IDS vs IPS ?', back: 'IDS : copie du trafic, alerte · IPS : en coupure, bloque' },
      { front: 'Faux positif / faux négatif ?', back: 'Alerte à tort / attaque non détectée (le plus grave)' },
      { front: 'ACL standard vs étendue ?', back: 'Standard 1-99 (source) près de la destination · étendue 100-199 près de la source' },
      { front: 'Les 4 règles des ACL ?', back: 'Haut → bas · première correspondance · deny implicite · 1 ACL par interface/sens/protocole' },
      { front: 'Appliquer une ACL sur les lignes vty ?', back: '<code>access-class 10 in</code>' },
      { front: 'Mot-clé established ?', back: 'Laisse passer les segments TCP ACK/RST (réponses) ; inutile pour UDP' },
      { front: 'Confidentialité vs signature (clés) ?', back: 'Clé publique du destinataire · clé privée de l\'émetteur' },
      { front: 'Symétrique vs asymétrique ?', back: 'AES, rapide, N(N−1)/2 clés · RSA/ECC, lent, paire de clés' },
      { front: 'Hachages : MD5, SHA-1, SHA-256 ?', back: 'Cassé · déconseillé · recommandé' },
      { front: 'Pourquoi TLS est hybride ?', back: 'Asymétrique pour échanger la clé de session, symétrique (AES) pour les données' },
      { front: 'PKI : AC, X.509, CRL/OCSP ?', back: 'Autorité de certification · format des certificats · révocation' },
      { front: 'AH vs ESP ?', back: 'AH (51) : intégrité, pas de chiffrement, incompatible NAT · ESP (50) : chiffre' },
      { front: 'IPsec : transport vs tunnel ?', back: 'Hôte à hôte (en-tête visible) · site à site (tout le paquet encapsulé)' },
      { front: 'Ports IPsec ?', back: 'IKE UDP 500 · NAT-T UDP 4500 · ESP = protocole IP 50' },
      { front: 'RADIUS vs TACACS+ ?', back: 'UDP 1812/1813, accès réseau · TCP 49, chiffre tout, administration' },
      { front: '802.1X : les 3 rôles ?', back: 'Supplicant (poste) · authentificateur (switch/borne) · serveur RADIUS' },
      { front: 'États d\'interface Cisco ?', back: 'admin down = shutdown · down/down = couche 1 · up/down = couche 2' },
      { front: 'Ordre des pings de dépannage ?', back: '127.0.0.1 → soi → passerelle → distant → nom' }
    ],

    qcm: [
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'AES est un algorithme :', choices: ['asymétrique', 'symétrique', 'de hachage', 'd\'échange de clés'], a: 1, noShuffle: true, expl: 'Symétrique.' },
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'Le protocole IPsec qui chiffre :', choices: ['AH', 'IKE', 'ESP', 'GRE'], a: 2, noShuffle: true, expl: 'ESP.' },
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'Une ACL standard filtre sur :', choices: ['l\'IP destination', 'l\'IP source', 'le port', 'la MAC'], a: 1, noShuffle: true, expl: 'Source.' },
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'TACACS+ utilise :', choices: ['UDP 1812', 'TCP 49', 'UDP 49', 'TCP 443'], a: 1, noShuffle: true, expl: 'TCP 49.' },
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'Pour signer, l\'émetteur utilise :', choices: ['sa clé publique', 'sa clé privée', 'la clé publique du destinataire', 'une clé de session'], a: 1, noShuffle: true, expl: 'Sa clé privée.' },
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'Quel équipement bloque une attaque en temps réel ?', choices: ['IDS', 'IPS', 'SIEM', 'proxy de cache'], a: 1, noShuffle: true, expl: 'IPS.' },
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'Fonction de hachage recommandée :', choices: ['MD5', 'SHA-1', 'SHA-256', 'DES'], a: 2, noShuffle: true, expl: 'SHA-256.' },
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'Interface « up / line protocol down » :', choices: ['câble débranché', 'shutdown', 'problème de couche 2', 'problème DNS'], a: 2, noShuffle: true, expl: 'Couche 2.' },
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'La zone qui héberge les serveurs publics :', choices: ['LAN', 'DMZ', 'VLAN natif', 'intranet'], a: 1, noShuffle: true, expl: 'DMZ.' },
      { type: 'qcm', src: 'Plan S5 · QCM', q: 'Dans 802.1X, le switch joue le rôle :', choices: ['de supplicant', 'd\'authentificateur', 'de serveur RADIUS', 'd\'AC'], a: 1, noShuffle: true, expl: 'Authentificateur.' },
      { type: 'qcm', q: 'Laquelle est une attaque d\'accès ?', choices: ['attaque par mot de passe', 'balayage ping', 'requête whois', 'scan de ports'], a: 0, expl: 'Les autres sont de la reconnaissance.' },
      { type: 'qcm', q: 'Un attaquant envoie des réponses ARP gratuites avec sa MAC pour l\'IP de la passerelle. C\'est :', choices: ['de l\'empoisonnement ARP (homme du milieu)', 'un SYN flood', 'du DNS tunneling', 'du MAC flooding'], a: 0, expl: 'Parade : DAI.' },
      { type: 'qcm', q: 'Un résolveur DNS ouvert peut servir à :', choices: ['des attaques par amplification et réflexion', 'chiffrer le trafic', 'remplacer DHCP', 'faire du NAT'], a: 0, expl: 'Il répond à n\'importe qui, y compris avec l\'IP usurpée d\'une victime.' },
      { type: 'qcm', q: '20 agents doivent échanger deux à deux en symétrique. Combien de clés ?', choices: ['190', '20', '40', '400'], a: 0, expl: '20 × 19 / 2.' },
      { type: 'qcm', q: 'Pourquoi AH ne fonctionne-t-il pas à travers le NAT ?', choices: ['il protège l\'en-tête IP, que le NAT modifie', 'il utilise TCP', 'il chiffre les ports', 'il est trop lent'], a: 0, expl: 'L\'intégrité calculée ne correspond plus.' },
      { type: 'qcm', q: 'Mot de passe d\'administration Cisco le plus sûr :', choices: ['enable secret', 'enable password', 'service password-encryption seul', 'aucun'], a: 0, expl: 'Haché.' },
      { type: 'tf', q: 'Un hachage SHA-256 peut être déchiffré avec la bonne clé.', a: false, expl: 'Le hachage est à sens unique.' },
      { type: 'tf', q: 'Les menaces internes peuvent causer plus de dégâts que les menaces externes.', a: true, expl: 'Accès direct aux locaux et aux équipements (cours).' },
      { type: 'match', q: 'Associe l\'outil à sa catégorie.', pairs: [['Nmap', 'Scan de ports'], ['Wireshark', 'Renifleur de paquets'], ['Metasploit', 'Exploitation'], ['John the Ripper', 'Craquage de mots de passe'], ['Aircrack-ng', 'Piratage Wi-Fi']], expl: 'Outils du cours.' },
      { type: 'order', q: 'Méthode de dépannage :', items: ['Recueillir les symptômes', 'Formuler une hypothèse', 'Tester', 'Corriger', 'Vérifier', 'Documenter'], expl: 'Toujours documenter à la fin.' }
    ],

    exercises: [
      {
        title: 'Protéger la DMZ par une ACL étendue', min: 12, src: 'Plan S5 · Ex. 1',
        statement: '<p>DMZ : 10.20.3.192/27 sur G0/3 de R-NIAMEY. Serveurs : web 10.20.3.194 (HTTP, HTTPS) · messagerie 10.20.3.195 (réception SMTP) · DNS public 10.20.3.196. Administrateurs : LAN Admin 10.20.0.0/23. Le NAT statique publie déjà ces serveurs.</p>',
        parts: [
          { q: 'a) ACL étendue VERS-DMZ : services publics depuis n\'importe où, SSH depuis le LAN Admin, réponses aux connexions TCP ouvertes par la DMZ ; tout le reste refusé et journalisé.', pts: 3, corr: code(`ip access-list extended VERS-DMZ
 permit tcp any host 10.20.3.194 eq 80
 permit tcp any host 10.20.3.194 eq 443
 permit tcp any host 10.20.3.195 eq 25
 permit udp any host 10.20.3.196 eq 53
 permit tcp any host 10.20.3.196 eq 53
 permit tcp 10.20.0.0 0.0.1.255 10.20.3.192 0.0.0.31 eq 22
 permit tcp any 10.20.3.192 0.0.0.31 established
 deny ip any any log`) + '<p class="small">Barème : services publics 2 pts, SSH limité 1 pt, established 0,5, deny final journalisé 0,5 ; TCP 53 en bonus.</p>' },
          { q: 'b) Sur quelle interface et dans quel sens ? Pourquoi pas en entrée de G0/2 ?', pts: 1, corr: '<p><code>interface g0/3</code> → <code>ip access-group VERS-DMZ out</code> : filtre tout ce qui entre dans la DMZ, quelle que soit la provenance. En entrée de G0/2, le trafic d\'Internet porte encore les adresses <b>publiques</b> (pas encore traduites) : les règles en 10.20.3.x ne correspondraient jamais.</p>' },
          { q: 'c) Le DNS de la DMZ interroge d\'autres DNS sur Internet : ses réponses arriveront-elles ? Meilleure solution ?', pts: 1, corr: '<p>Non : les réponses arrivent en UDP vers un port aléatoire ; <code>established</code> ne marche que pour TCP → elles tombent sur le deny. Solution : un <b>pare-feu à états</b> (ou Zone-Based Firewall Cisco).</p>' }
        ]
      },
      {
        title: 'Analyser des ACL', min: 8, src: 'Plan S5 · Ex. 2',
        parts: [
          { q: 'a) Un stagiaire applique en entrée de G0/0 : <code>access-list 101 deny tcp any any eq 23</code>. Le lendemain, plus personne n\'a accès à rien. Pourquoi ? Corrige.', pts: 1, corr: '<p>L\'ACL ne contient qu\'un deny ; le <b>deny any implicite</b> bloque tout le reste. Ajouter <code>access-list 101 permit ip any any</code> après.</p>' },
          { q: 'b) Cette ACL doit interdire le web au poste 10.20.0.50 et autoriser le reste du LAN Admin. Elle ne marche pas : pourquoi ? Corrige.<br><code>access-list 110 permit ip 10.20.0.0 0.0.1.255 any</code><br><code>access-list 110 deny tcp host 10.20.0.50 any eq 80</code>', pts: 1, corr: `<p>10.20.0.50 ∈ 10.20.0.0/23 : la 1<sup>re</sup> ligne l'autorise déjà, la 2<sup>e</sup> n'est jamais lue. Mettre la règle précise en premier :</p>${code(`access-list 110 deny tcp host 10.20.0.50 any eq 80
access-list 110 permit ip 10.20.0.0 0.0.1.255 any`)}` },
          { q: 'c) ACL qui limite l\'accès SSH au routeur au seul LAN Admin, et où l\'appliquer.', pts: 1, corr: code(`access-list 10 permit 10.20.0.0 0.0.1.255
line vty 0 4
 access-class 10 in`) + '<p>Sur les lignes vty, avec <code>access-class</code>, et non sur une interface.</p>' }
        ]
      },
      {
        title: 'Cryptographie', min: 8, src: 'Plan S5 · Ex. 3',
        statement: '<p>Awa (Budget, Niamey) doit envoyer à Moussa (Zinder) un fichier de prévisions budgétaires confidentiel.</p>',
        parts: [
          { q: 'a) Asymétrique : avec quelle clé Awa chiffre-t-elle ? Avec quelle clé Moussa déchiffre-t-il ?', pts: 1, fields: [{ label: 'Awa chiffre avec', kind: 'select', opts: ['sa clé privée', 'sa clé publique', 'la clé publique de Moussa', 'la clé privée de Moussa'], a: 2 }, { label: 'Moussa déchiffre avec', kind: 'select', opts: ['sa clé privée', 'sa clé publique', 'la clé publique d\'Awa', 'la clé privée d\'Awa'], a: 0 }], corr: '<p>Clé <b>publique de Moussa</b> ; seul Moussa peut déchiffrer, avec sa <b>clé privée</b>.</p>' },
          { q: 'b) Moussa veut être sûr que le fichier vient d\'Awa et n\'a pas été modifié : mécanisme ?', pts: 1, corr: '<p>Signature : Awa calcule le hachage (SHA-256) et le chiffre avec sa clé privée. Moussa déchiffre la signature avec la clé publique d\'Awa, recalcule le hachage et compare : identiques → intègre. Bonus : clé publique garantie par un certificat.</p>' },
          { q: 'c) 20 agents échangent deux à deux : combien de clés en symétrique ? En asymétrique ?', pts: 1, fields: [{ label: 'Symétrique', kind: 'num', a: 190 }, { label: 'Paires asymétriques', kind: 'num', a: 20 }], corr: '<p>N(N−1)/2 = 20 × 19 / 2 = <b>190</b>. Asymétrique : <b>20 paires</b> (40 clés, dont 20 publiques).</p>' },
          { q: 'd) Pourquoi TLS utilise-t-il les deux types de chiffrement ?', pts: 1, corr: '<p>L\'asymétrique résout l\'échange de clé mais est lent ; le symétrique est rapide mais exige une clé partagée. TLS échange une clé de session en asymétrique (ou Diffie-Hellman), puis chiffre les données en symétrique (AES).</p>' }
        ]
      },
      {
        title: 'Étude de cas : interconnexion par VPN', min: 10, src: 'Plan S5 · Ex. 4',
        statement: '<p>Le Ministère remplace les liaisons louées vers Zinder et Tahoua par des accès Internet, et veut permettre aux inspecteurs en mission d\'accéder aux applications internes.</p>',
        parts: [
          { q: 'a) Type de VPN pour les sites ? Pour les inspecteurs ?', pts: 1, corr: '<p>Sites : VPN <b>IPsec site à site</b> (permanent, entre routeurs/pare-feux, transparent pour les postes). Inspecteurs : VPN d\'<b>accès distant</b> (SSL/TLS ou client IPsec), chaque utilisateur se connectant depuis n\'importe quel réseau.</p>' },
          { q: 'b) Paramètres IPsec sûrs. Pourquoi pas AH ?', pts: 1, corr: '<p>ESP en mode tunnel, AES-256 (ou AES-GCM), SHA-256, IKEv2, DH ≥ 14, certificats (ou PSK longue). Pas AH : pas de confidentialité, et incompatible avec le NAT.</p>' },
          { q: 'c) Flux à laisser entrer sur le pare-feu de Niamey pour les tunnels ?', pts: 1, corr: '<p>UDP 500 (IKE), UDP 4500 (NAT-T), protocole IP 50 (ESP), uniquement depuis les adresses publiques des sites.</p>' },
          { q: 'd) Pourquoi imposer l\'authentification multifacteur aux inspecteurs ?', pts: 1, corr: '<p>Un mot de passe peut être volé (hameçonnage, ordinateur perdu) ; avec la MFA, le voleur n\'a pas le second facteur. L\'accès distant ouvre le réseau interne : porte d\'entrée préférée des rançongiciels.</p>' }
        ]
      },
      {
        title: 'Attaques et contre-mesures', min: 5, src: 'Plan S5 · Ex. 5',
        parts: [
          { q: 'Associe chaque attaque à sa meilleure contre-mesure.', pts: 3, fields: [
            { label: 'ARP spoofing', kind: 'select', opts: ['Sauvegardes hors ligne', 'DHCP snooping', 'Requêtes paramétrées, WAF', 'Dynamic ARP Inspection', 'Port security', 'Clés SSH, verrouillage, ACL vty'], a: 3 },
            { label: 'Faux serveur DHCP', kind: 'select', opts: ['Sauvegardes hors ligne', 'DHCP snooping', 'Requêtes paramétrées, WAF', 'Dynamic ARP Inspection', 'Port security', 'Clés SSH, verrouillage, ACL vty'], a: 1 },
            { label: 'MAC flooding', kind: 'select', opts: ['Sauvegardes hors ligne', 'DHCP snooping', 'Requêtes paramétrées, WAF', 'Dynamic ARP Inspection', 'Port security', 'Clés SSH, verrouillage, ACL vty'], a: 4 },
            { label: 'Rançongiciel', kind: 'select', opts: ['Sauvegardes hors ligne', 'DHCP snooping', 'Requêtes paramétrées, WAF', 'Dynamic ARP Inspection', 'Port security', 'Clés SSH, verrouillage, ACL vty'], a: 0 },
            { label: 'Force brute sur SSH', kind: 'select', opts: ['Sauvegardes hors ligne', 'DHCP snooping', 'Requêtes paramétrées, WAF', 'Dynamic ARP Inspection', 'Port security', 'Clés SSH, verrouillage, ACL vty'], a: 5 },
            { label: 'Injection SQL', kind: 'select', opts: ['Sauvegardes hors ligne', 'DHCP snooping', 'Requêtes paramétrées, WAF', 'Dynamic ARP Inspection', 'Port security', 'Clés SSH, verrouillage, ACL vty'], a: 2 }
          ], corr: '<p>1-D · 2-B · 3-E · 4-A · 5-F · 6-C (0,5 point par bonne association).</p>' }
        ]
      },
      {
        title: 'Dépannage : Tahoua n\'accède plus à la paie', min: 8, src: 'Plan S5 · Ex. 6',
        statement: code(`C:\\> ipconfig : IP 10.20.3.150 · masque 255.255.255.192 · passerelle 10.20.3.129 · DNS 10.20.0.10
C:\\> ping 10.20.3.129  → Réponse (4/4)
C:\\> ping 10.20.0.80   → Délai d'attente dépassé (0/4)
C:\\> tracert 10.20.0.80 → 1 10.20.3.129 ; 2 * * * ; 3 * * *
R-TAHOUA# show ip interface brief
Interface  IP-Address    Status                Protocol
G0/0       10.20.3.129   up                    up
S0/1       10.20.3.230   administratively down down
S0/0       10.20.3.234   down                  down`),
        parts: [
          { q: 'a) Interprète chaque test : jusqu\'où va le trafic ? Quelle couche est en cause ?', pts: 1, corr: '<p>Configuration cohérente (passerelle .129 dans 10.20.3.128/26). Ping de la passerelle OK → le LAN fonctionne. Le tracert s\'arrête après R-TAHOUA → problème sur R-TAHOUA ou au-delà : liaisons WAN / routage (couches 1 à 3 côté WAN).</p>' },
          { q: 'b) Que signifient les états de S0/1 et S0/0 ? Action pour chacun ?', pts: 1, corr: '<p>S0/1 administratively down : quelqu\'un a tapé shutdown → <code>interface s0/1</code> puis <code>no shutdown</code>. S0/0 down/down : problème physique (câble, modem, opérateur, routeur de Zinder éteint) → vérifier le câblage, appeler l\'opérateur. Les deux WAN étant hors service, Tahoua est isolé. Vérifier ensuite avec show ip route et un nouveau ping.</p>' },
          { q: 'c) Un autre jour, ping 10.20.0.80 fonctionne mais pas ping paie.finances.exemple.ne. Où chercher ? Et si show interfaces affiche des milliers d\'erreurs CRC ?', pts: 1, corr: '<p>IP OK mais pas le nom → <b>DNS</b> : serveur DNS configuré, nslookup, enregistrement A, cache (ipconfig /flushdns). CRC nombreux → <b>couche 1</b> : câble abîmé ou trop long, interférences, désaccord de duplex.</p>' }
        ]
      }
    ],

    phrases: [
      'DICP : Disponibilité, Intégrité, Confidentialité, Preuve ; risque = menace × vulnérabilité × impact.',
      'ACL : de haut en bas, première correspondance, deny implicite final ; standard près de la destination, étendue près de la source.',
      'Confidentialité = clé publique du destinataire ; signature = clé privée de l\'émetteur ; hachage = intégrité (SHA-256).',
      'IPsec : ESP (50) chiffre, AH (51) non ; IKE UDP 500, NAT-T UDP 4500 ; tunnel pour site à site.',
      'Pings dans l\'ordre : 127.0.0.1 → soi → passerelle → distant → nom ; administratively down = no shutdown.'
    ]
  });
})();
