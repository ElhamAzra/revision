/* Séance 3 — Commutation : Ethernet, ARP, VLAN, STP, redondance, Wi-Fi. */
(function () {
  'use strict';
  const { key, trap, tip, reflex, ex, fix, mnemo, why, f, table, steps, ul, bits, w, stepper, reveal, code } = App.md;

  const arpSeq = JSON.stringify({
    title: 'ARP : trouver la MAC de 192.168.1.20',
    actors: ['PC-A<br><small>192.168.1.10</small>', 'Switch', 'PC-B<br><small>192.168.1.20</small>', 'PC-C<br><small>192.168.1.30</small>'],
    intro: 'PC-A veut envoyer un paquet à 192.168.1.20 (même réseau) mais ne connaît pas sa MAC : sa table ARP est vide.',
    msgs: [
      { from: 0, to: 1, label: 'Requête ARP', sub: 'dest FF:FF:FF:FF:FF:FF · type 0x0806', bc: true, note: 'PC-A diffuse « Qui a 192.168.1.20 ? Répondez à AA:AA… ». MAC cible vide dans le message, MAC destination de la trame = broadcast.' },
      { from: 1, to: 2, label: 'inondation', bc: true, note: 'Broadcast : le switch inonde sur tous les ports sauf celui d\'arrivée (et apprend au passage la MAC de PC-A).' },
      { from: 1, to: 3, label: 'inondation', bc: true, note: 'PC-C reçoit aussi la requête, voit que l\'IP cible n\'est pas la sienne et l\'ignore.' },
      { from: 2, to: 1, label: 'Réponse ARP', sub: 'unicast vers AA:AA…', note: 'PC-B répond en <b>unicast</b> : « 192.168.1.20 est à BB:BB… ». Il note aussi la MAC de PC-A dans sa table.' },
      { from: 1, to: 0, label: 'filtrage', note: 'La MAC de PC-A est connue : le switch ne transmet que vers son port. PC-A enregistre 192.168.1.20 ↔ BB:BB… dans sa table ARP (arp -a).' }
    ]
  });

  App.registerModule({
    id: 's3', order: 3, label: 'Séance 3', short: 'Commutation & Wi-Fi',
    title: 'Commutation : Ethernet, VLAN, STP, Wi-Fi',
    subtitle: 'Couches 1 et 2, domaines, trames, VLAN, Spanning Tree, sans fil — Épreuve 2',
    icon: '🔀', color: '#14b8a6', day: '2026-10-12', epreuve: 'Épreuve 2',
    intro: 'Comment un switch apprend, ce que contient une trame, comment découper un réseau en VLAN et éviter les boucles avec STP, et tout ce qu\'il faut savoir sur le Wi-Fi. Intègre les cours « Accès réseau et Ethernet », « Évolution des LAN », « Redondance des LAN » et « WLAN » de l\'ESTN.',

    pretest: [
      { type: 'qcm', q: 'Un switch qui reçoit une trame dont la MAC de destination est inconnue :', choices: ['l\'inonde sur tous les ports du VLAN sauf celui d\'arrivée', 'la détruit', 'l\'envoie au routeur', 'envoie une requête ARP'], a: 0, expl: 'Inondation (flooding).' },
      { type: 'qcm', q: 'Le pont racine STP est le switch qui a :', choices: ['le plus petit Bridge ID', 'le plus grand Bridge ID', 'le plus de ports', 'la plus grande MAC'], a: 0, expl: 'Plus petite priorité, puis plus petite MAC.' },
      { type: 'qcm', q: 'Le Wi-Fi utilise :', choices: ['CSMA/CA', 'CSMA/CD', 'Token Ring', 'TDMA'], a: 0, expl: 'Collision Avoidance : une radio ne peut pas écouter en émettant.' }
    ],

    lessons: [
      {
        title: 'Hub, switch, routeur : les domaines', min: 7,
        essentiel: ul([
          '<b>Hub</b> (couche 1) : répète tout → tous ses ports = <b>1 domaine de collision</b>.',
          '<b>Switch</b> (couche 2) : chaque port = 1 domaine de collision ; tout le switch (ou chaque <b>VLAN</b>) = 1 domaine de broadcast.',
          '<b>Routeur</b> (couche 3) : chaque interface = 1 domaine de broadcast (il bloque les broadcasts).'
        ]),
        html: `
${table(['Équipement', 'Couche OSI', 'Ce qu\'il regarde', 'Comportement', 'Domaines'], [
  ['Hub (concentrateur)', '1 — Physique', 'Rien (des bits)', 'Répète le signal sur tous les ports', 'Tous ses ports = 1 seul domaine de collision'],
  ['Switch (commutateur)', '2 — Liaison', 'Adresse MAC', 'Envoie la trame sur le seul port du destinataire', 'Chaque port = 1 domaine de collision ; le switch (ou chaque VLAN) = 1 domaine de broadcast'],
  ['Routeur', '3 — Réseau', 'Adresse IP', 'Relie des réseaux différents', 'Chaque interface = 1 domaine de broadcast']
])}
${key('<b>Domaine de collision</b> : ensemble des équipements dont les émissions simultanées peuvent entrer en collision (un câble partagé, un hub).<br><b>Domaine de broadcast</b> : ensemble des équipements qui reçoivent un broadcast (ex. une requête ARP) envoyé par l\'un d\'eux. Seuls un routeur ou des VLAN le découpent.', 'Deux définitions à savoir écrire')}
${fix('Le support « Évolution des LAN » dit qu\'« un commutateur Ethernet est un concentrateur ». C\'est inexact : un <b>concentrateur (hub)</b> répète les bits sur tous les ports, alors qu\'un <b>commutateur (switch)</b> lit la MAC et n\'envoie la trame que vers le bon port. (Coquille aussi : « Pond » → <b>pont</b>, l\'ancêtre du switch à 2 ports.)')}
${ex(`Routeur R à 2 interfaces. Sur la 1<sup>re</sup> : switch S1 avec 8 PC + un hub H2 portant 3 PC. Sur la 2<sup>e</sup> : un hub H1 avec 4 PC.<br>
<b>Broadcast</b> = 2 (une par interface). <b>Collision</b> = côté S1 : 8 ports PC + 1 port vers R + 1 port vers H2 (H2 et ses 3 PC partagent ce domaine) = 10 ; côté H1 : 1 (le hub, ses PC et l'interface de R). Total <b>11</b>.<br>
Si H1 devient un switch : 4 PC + 1 port vers R = 5 → <b>15</b>. Avec 2 VLAN sur S1 et un trunk : <b>3</b> domaines de broadcast.`, 'Exemple du plan')}
${trap('Un switch ne découpe PAS le domaine de broadcast (sauf avec des VLAN). Et un hub = un seul domaine de collision, quel que soit son nombre de ports.')}
`,
        check: [
          { type: 'input', q: 'Un switch de 24 ports (tous utilisés), sans VLAN, relié à un routeur. Domaines de collision et de broadcast côté switch ?', fields: [{ label: 'Collision', kind: 'num', a: 24 }, { label: 'Broadcast', kind: 'num', a: 1 }], expl: '1 domaine de collision par port ; 1 seul domaine de broadcast pour tout le switch.' },
          { type: 'qcm', q: 'Quel équipement découpe les domaines de broadcast ?', choices: ['Le routeur', 'Le hub', 'Le répéteur', 'Le switch sans VLAN'], a: 0, expl: 'Le routeur (ou des VLAN sur un switch).' }
        ]
      },
      {
        title: 'Comment un switch apprend (table MAC)', min: 6,
        essentiel: steps([
          '<b>Apprentissage</b> : il note « la MAC <u>source</u> est derrière ce port » (table MAC / CAM, entrée effacée après <b>300 s</b> d\'inactivité).',
          '<b>Transmission / filtrage</b> : MAC de destination connue → envoi sur ce seul port.',
          '<b>Inondation</b> : destination inconnue ou broadcast → tous les ports sauf celui d\'arrivée (dans le même VLAN).'
        ]),
        html: `
${w('switchsim')}
${ex(`Switch neuf ; A (port 1), B (port 2), C (port 3), D (port 4).<br>
1) A → B : ports 2, 3, 4 (B inconnu) ; table : AA → 1.<br>
2) B → A : port 1 seulement (A connu) ; table : BB → 2.<br>
3) C → broadcast (ARP) : ports 1, 2, 4 ; table : CC → 3.<br>
4) A → C : port 3 seulement ; rien à ajouter (AA connue, minuterie remise à zéro).<br>
5) A → D : ports 2, 3, 4 (D n'a jamais émis → inconnue).`, 'Exercice type du plan')}
${fix('Le support « Évolution des LAN » écrit : « si l\'adresse n\'est pas dans la table, le processus ARP sera entamé ». Attention : un switch ne fait <b>pas d\'ARP</b>. Il <b>inonde</b> la trame (unicast inconnue). L\'ARP est fait par les <b>hôtes</b> (et les routeurs) pour trouver une MAC à partir d\'une IP. La table du switch s\'appelle <b>table MAC / CAM</b>, pas table ARP.')}
${code(`show mac address-table          ! table MAC du switch
clear mac address-table dynamic`)}
${trap('Le switch apprend la MAC <b>source</b> et commute selon la MAC <b>destination</b>. Le piège classique est d\'inverser.')}
`,
        check: [
          { type: 'qcm', q: 'Le switch remplit sa table avec :', choices: ['la MAC source des trames reçues', 'la MAC destination', 'les adresses IP', 'des requêtes ARP'], a: 0, expl: 'Apprentissage sur la source.' },
          { type: 'input', q: 'Durée de vie par défaut d\'une entrée dynamique de la table MAC (Cisco), en secondes ?', fields: [{ kind: 'num', a: 300 }], expl: '300 s = 5 minutes.' }
        ]
      },
      {
        title: 'La trame Ethernet et la couche liaison', min: 8,
        essentiel: ul([
          'Trame Ethernet II : préambule 7 + SFD 1 · MAC dest 6 · MAC source 6 · [tag 802.1Q 4] · EtherType 2 · données <b>46 à 1 500</b> · <b>FCS 4</b> (CRC-32).',
          'Taille sans préambule : <b>64 à 1 518 octets</b> (1 522 avec tag). MTU = 1 500. Moins de 46 octets de données → <b>bourrage</b>.',
          'EtherType : <b>0x0800</b> IPv4 · <b>0x0806</b> ARP · <b>0x86DD</b> IPv6 · <b>0x8100</b> VLAN.'
        ]),
        html: `
<h3>Les sous-couches de la liaison de données</h3>
${table(['Sous-couche', 'Rôle', 'Normes'], [['LLC (802.2)', 'Interface avec la couche réseau (identifie le protocole)', 'commune à tous'], ['MAC', 'Adressage physique, accès au support, trame', '802.3 Ethernet · 802.11 Wi-Fi · 802.15 Bluetooth']])}
<h3>La trame Ethernet II (dessinée dans beaucoup de sujets)</h3>
${table(['Préambule + SFD', 'MAC destination', 'MAC source', '[Tag 802.1Q]', 'EtherType', 'Données', 'FCS'], [['7 + 1 octets', '6', '6', '(4)', '2', '46 à 1 500', '4 (CRC-32)']])}
${table(['EtherType', 'Protocole transporté'], [['0x0800', 'IPv4'], ['0x0806', 'ARP'], ['0x86DD', 'IPv6'], ['0x8100', 'Trame taguée 802.1Q (VLAN)'], ['0x8847', 'MPLS']])}
${why('Pourquoi 64 octets minimum ? Pour que l\'émetteur soit encore en train d\'émettre quand une collision revient (détection CSMA/CD sur un réseau de 2 500 m à 10 Mbit/s : 512 bits = 64 octets).')}
<h3>Accès au support : CSMA/CD et CSMA/CA</h3>
${ul(['<b>CSMA/CD</b> (Ethernet half-duplex) : écouter avant d\'émettre, détecter la collision, signal de brouillage, attente aléatoire. En full-duplex avec un switch : plus de collision.', '<b>CSMA/CA</b> (Wi-Fi) : on ne peut pas détecter, donc on <b>évite</b> (attente, acquittements, RTS/CTS).'])}
${ex(`Trame : <span class="mono">00 1a 2b 3c 4d 5e 3c 52 82 11 22 33 <b>81 00</b> 00 0a <b>08 00</b> 45 00 …</span><br>
Destination 00:1A:2B:3C:4D:5E · source 3C:52:82:11:22:33 · 0x8100 → <b>taguée 802.1Q</b>. TCI = 00 0a → PCP 000 (priorité 0), DEI 0, <b>VID = 10</b>. EtherType suivant 0x0800 = IPv4 ; 45 = version 4, en-tête de 5 × 4 = 20 octets.`, 'Analyse de trame (plan)')}
${trap('Une trame dont le FCS est faux est <b>détruite</b> : Ethernet ne corrige pas et ne renvoie pas (c\'est TCP qui retransmettra).')}
`,
        check: [
          { type: 'qcm', q: 'EtherType de l\'IPv6 :', choices: ['0x0800', '0x0806', '0x8100', '0x86DD'], a: 3, noShuffle: true, expl: '0x86DD.' },
          { type: 'input', q: 'Taille minimale d\'une trame Ethernet (sans préambule), en octets ?', fields: [{ kind: 'num', a: 64 }], expl: '64 octets ; maximum 1 518.' },
          { type: 'qcm', q: 'Le FCS sert à :', choices: ['détecter les erreurs', 'corriger les erreurs', 'chiffrer', 'numéroter les trames'], a: 0, expl: 'CRC-32 : détection seulement.' }
        ]
      },
      {
        title: 'Adresse MAC et protocole ARP', min: 7,
        essentiel: ul([
          'MAC = <b>48 bits</b>, 12 chiffres hexa : <b>OUI</b> (24 bits, constructeur, attribué par l\'IEEE) + 24 bits uniques.',
          'Broadcast <b>FF:FF:FF:FF:FF:FF</b> · multicast : dernier bit du 1<sup>er</sup> octet à 1 (IPv4 : <b>01:00:5E:…</b>).',
          '<b>ARP</b> : requête en <b>broadcast</b> (« qui a cette IP ? »), réponse en <b>unicast</b>. Destination distante → ARP pour la <b>passerelle</b>.'
        ]),
        html: `
${table(['OUI (constructeur)', 'Identifiant de la carte'], [['24 bits = 6 chiffres hexa', '24 bits = 6 chiffres hexa'], ['00-E0-FC (Huawei)', '58-64-CF']])}
${ul(['<b>Monodiffusion</b> : une seule carte. <b>Diffusion</b> : FF-FF-FF-FF-FF-FF (48 bits à 1).', '<b>Multidiffusion</b> : pour un groupe IP 224.0.0.0-239.255.255.255, MAC commençant par <b>01-00-5E</b> ; ex. 01:00:5E:00:00:05 = groupe 224.0.0.5 (tous les routeurs OSPF). En IPv6, multicast FF00::/8.'])}
${w('seq', { seq: arpSeq })}
<h3>Contenu des messages ARP (cours)</h3>
${ul(['<b>Requête</b> : IP cible connue, MAC cible vide ; trame vers FF:FF:FF:FF:FF:FF, type 0x806.', '<b>Réponse</b> : IP et MAC de l\'expéditeur (celui qu\'on cherchait) ; trame unicast vers le demandeur, type 0x806.', 'Chacun enregistre le couple IP ↔ MAC dans sa <b>table ARP</b> (<code>arp -a</code>).'])}
${key('Si la destination est sur <b>un autre réseau</b>, l\'hôte cherche dans sa table ARP la MAC de sa <b>passerelle par défaut</b>, pas celle du serveur distant.')}
${trap('Tout hôte peut envoyer une réponse ARP non sollicitée (ARP gratuit) : c\'est la base de l\'<b>empoisonnement ARP</b> (homme du milieu). Parade : DAI (Dynamic ARP Inspection) — voir séance 5.')}
`,
        check: [
          { type: 'qcm', q: 'La requête ARP est envoyée en :', choices: ['broadcast', 'unicast', 'multicast 224.0.0.5', 'anycast'], a: 0, expl: 'FF:FF:FF:FF:FF:FF ; la réponse est unicast.' },
          { type: 'qcm', q: 'Quel type d\'adresse est 01:00:5E:00:00:05 ?', choices: ['Multicast IPv4', 'Broadcast', 'Unicast Cisco', 'Adresse invalide'], a: 0, expl: '01:00:5E = multicast IPv4 ; ici le groupe 224.0.0.5.' },
          { type: 'qcm', q: 'Que représentent les 24 premiers bits d\'une MAC ?', choices: ['L\'OUI (constructeur)', 'Le numéro de VLAN', 'Le réseau IP', 'Le numéro de port'], a: 0, expl: 'Attribué par l\'IEEE.' }
        ]
      },
      {
        title: 'Câblage, duplex et vitesse', min: 5,
        essentiel: ul([
          'Cat 5e : 1 Gbit/s · 100 m ; Cat 6 : 10 Gbit/s ≤ 55 m ; <b>Cat 6a : 10 Gbit/s · 100 m</b>. Fibre multimode (bâtiment), <b>monomode</b> (km, entre sites).',
          'Câble <b>droit</b> : équipements différents (PC ↔ switch). <b>Croisé</b> : identiques (switch ↔ switch). <b>Inversé</b> (Cisco) : console. Auto-MDIX s\'adapte.',
          '<b>Full-duplex</b> : envoi et réception simultanés, pas de collision. Half : chacun son tour.'
        ]),
        html: `
${table(['Support', 'Débit / distance'], [['Cat 5e', '1 Gbit/s · 100 m'], ['Cat 6', '1 Gbit/s · 100 m ; 10 Gbit/s ≤ 55 m'], ['Cat 6a', '10 Gbit/s · 100 m'], ['Fibre multimode (OM3/OM4)', 'Courtes distances (≈ 300-550 m à 10 G), bâtiment'], ['Fibre monomode (OS2)', 'Longues distances (km à dizaines de km), entre sites']])}
${table(['Type de câble', 'Sertissage', 'Usage'], [['Droit', 'T568A ou T568B aux deux bouts', 'Hôte ↔ switch, routeur ↔ switch'], ['Croisé', 'T568A d\'un côté, T568B de l\'autre', 'Hôte ↔ hôte, switch ↔ switch, routeur ↔ routeur'], ['Inversé (rollover)', 'Propriétaire Cisco', 'Port série du PC → port console du routeur/switch']])}
${ul(['<b>Auto-MDIX</b> : l\'interface détecte le type de câble et s\'adapte ; il faut alors vitesse et duplex en <b>auto</b>.', '<b>Auto-négociation</b> : détection automatique de la vitesse et du duplex.', 'Un <b>désaccord de duplex</b> (un côté full, l\'autre half) provoque des collisions tardives et des erreurs CRC : lenteurs.'])}
${reflex('Bâtiment à 8 km de Niamey → <b>fibre monomode</b>. 10 Gbit/s sur 100 m en cuivre → <b>Cat 6a</b>.')}
${code(`interface g0/1
 speed auto
 duplex auto
 mdix auto`)}
`,
        check: [
          { type: 'qcm', q: 'Câble pour 10 Gbit/s sur 100 m :', choices: ['Cat 5e', 'Cat 6', 'Cat 6a', 'coaxial'], a: 2, noShuffle: true, expl: 'Cat 6a.' },
          { type: 'qcm', q: 'Pour relier un PC au port console d\'un routeur :', choices: ['câble inversé (rollover)', 'câble droit', 'câble croisé', 'fibre'], a: 0, expl: 'Câble console propriétaire Cisco.' }
        ]
      },
      {
        title: 'Les VLAN et le tag 802.1Q', min: 9,
        essentiel: ul([
          'VLAN = un switch découpé en réseaux logiques isolés. <b>1 VLAN = 1 domaine de broadcast = 1 sous-réseau IP.</b>',
          'Port <b>access</b> : 1 VLAN, non tagué (PC). Port <b>trunk</b> : plusieurs VLAN, tagués <b>802.1Q</b> (4 octets, VID sur <b>12 bits</b>).',
          '<b>VLAN natif</b> : seul VLAN non tagué sur un trunk (VLAN 1 par défaut), identique aux deux bouts ; à déplacer vers un VLAN inutilisé.'
        ]),
        html: `
<p>Selon le cours, un VLAN est une <b>partition logique d'un réseau de couche 2</b>. Les hôtes ignorent qu'ils sont dans un VLAN ; deux VLAN ne communiquent que par un routeur (couche 3).</p>
${ul(['<b>Avantages</b> : sécurité (isolement des services), moins de broadcasts, meilleures performances, réduction des coûts, organisation par service plutôt que par étage, gestion simplifiée.', '<b>Types</b> : VLAN de données, VLAN par défaut (VLAN 1), VLAN natif, VLAN de gestion (adresse du switch), VLAN voix.'])}
<h3>Le tag 802.1Q (4 octets)</h3>
${table(['TPID', 'PCP', 'DEI (ex-CFI)', 'VID'], [['16 bits = 0x8100', '3 bits : priorité 802.1p, 0 à 7', '1 bit', '12 bits : n° de VLAN']])}
<p>12 bits → 4 096 valeurs ; <b>1 à 4 094 utilisables</b> (0 et 4 095 réservés).</p>
${fix('Le support « Évolution des LAN » indique que le champ priorité sur 3 bits permet « 7 niveaux de priorité ». En réalité 3 bits donnent <b>8 niveaux (0 à 7)</b>. Il présente aussi le bit CFI (Ethernet/Token Ring), aujourd\'hui renommé <b>DEI</b> (Drop Eligible Indicator).')}
${code(`vlan 10
 name ADMIN
vlan 20
 name IMPOTS
interface range fa0/1 - 12
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
interface g0/1
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,99
 switchport nonegotiate
! Vérifications
show vlan brief
show interfaces trunk`)}
${ul(['<b>DTP</b> (Cisco) négocie automatiquement les trunks (dynamic auto / desirable) → à désactiver (<code>nonegotiate</code>) pour la sécurité.', '<b>VTP</b> (Cisco) propage la liste des VLAN (serveur / client / transparent). Danger : un switch avec un numéro de révision plus élevé peut <b>effacer les VLAN</b> de tout le réseau.'])}
${trap('VLAN natif différent aux deux bouts d\'un trunk → fuite de trafic entre VLAN. Et laisser le natif en VLAN 1 permet le <b>VLAN hopping</b> par double étiquetage.')}
`,
        check: [
          { type: 'qcm', q: 'Taille du champ VID du tag 802.1Q :', choices: ['8 bits', '10 bits', '12 bits', '16 bits'], a: 2, noShuffle: true, expl: '12 bits → 4 096 valeurs.' },
          { type: 'qcm', q: 'Commande pour voir les trunks d\'un switch Cisco :', choices: ['show vlan', 'show interfaces trunk', 'show trunk all', 'show ip route'], a: 1, noShuffle: true, expl: 'show interfaces trunk.' },
          { type: 'tf', q: 'Sur un trunk, les trames du VLAN natif ne sont pas taguées.', a: true, expl: 'C\'est la définition du VLAN natif.' }
        ]
      },
      {
        title: 'Routage inter-VLAN', min: 6,
        essentiel: ul([
          'Deux VLAN ne communiquent <b>jamais</b> sans couche 3.',
          '<b>Router-on-a-stick</b> : un seul lien trunk vers le routeur, une <b>sous-interface par VLAN</b> (<code>encapsulation dot1Q</code>). Simple mais goulot d\'étranglement.',
          '<b>Switch de niveau 3</b> : une interface virtuelle <b>SVI</b> par VLAN + <code>ip routing</code>. La solution des réseaux d\'entreprise.'
        ]),
        html: `
${code(`! R-NIAMEY : router-on-a-stick
interface g0/0
 no shutdown
interface g0/0.10
 encapsulation dot1Q 10
 ip address 10.20.0.1 255.255.254.0
interface g0/0.20
 encapsulation dot1Q 20
 ip address 10.20.2.1 255.255.255.0
interface g0/0.99
 encapsulation dot1Q 99
 ip address 10.20.3.241 255.255.255.240

! SW-NY : adresse de gestion
interface vlan 99
 ip address 10.20.3.242 255.255.255.240
 no shutdown
ip default-gateway 10.20.3.241

! Variante switch de niveau 3 (SVI)
ip routing
interface vlan 10
 ip address 10.20.0.1 255.255.254.0`)}
${why('VLAN natif 999 : contre le VLAN hopping. <code>nonegotiate</code> : un attaquant ne peut pas monter lui-même un trunk (DTP). <code>portfast</code> : les PC obtiennent l\'accès immédiatement au lieu d\'attendre 30 s (sinon la demande DHCP peut échouer au démarrage).')}
${reflex('Lien G0/1 saturé ? (1) EtherChannel LACP (agréger 2 à 4 liens) ; (2) remplacer router-on-a-stick par un switch de niveau 3 ; (3) passer le lien en 10 Gbit/s.')}
`,
        check: [
          { type: 'qcm', q: 'Commande qui associe une sous-interface au VLAN 20 :', choices: ['encapsulation dot1Q 20', 'switchport access vlan 20', 'vlan 20', 'ip routing 20'], a: 0, expl: 'Sur le routeur, dans la sous-interface.' },
          { type: 'qcm', q: 'Sur un switch de niveau 3, chaque VLAN a :', choices: ['une SVI (interface vlan X)', 'un câble dédié', 'un DHCP', 'un trunk'], a: 0, expl: 'Switch Virtual Interface + ip routing.' }
        ]
      },
      {
        title: 'Spanning Tree (STP) : supprimer les boucles', min: 10,
        essentiel: steps([
          'Élire le <b>pont racine</b> : plus petit <b>Bridge ID</b> = priorité (32 768 par défaut, multiple de 4 096) + MAC.',
          'Sur chaque switch non racine : un <b>port racine</b> = plus petit coût cumulé vers la racine.',
          'Sur chaque segment : un <b>port désigné</b> (switch le plus proche de la racine). Tous les autres ports sont <b>bloqués</b>.'
        ]),
        html: `
<h3>Le problème : les boucles de couche 2</h3>
<p>Pour la redondance, on relie les switchs en boucle. Sans STP, comme les trames Ethernet n'ont <b>pas de TTL</b> :</p>
${ul(['<b>Tempête de broadcast</b> : les broadcasts tournent sans fin, saturent la bande passante → déni de service en quelques secondes.', '<b>Instabilité de la table MAC</b> : une même MAC apparaît sur plusieurs ports.', '<b>Trames unicast en double</b> : une trame inconnue inondée arrive plusieurs fois.'])}
${fix('Le support « Redondance des LAN » titre ces problèmes « redondance de la <b>couche 1</b> » et affiche des diapositives « Structure d\'un paquet IPv4/IPv6 » hors sujet. Ce sont des problèmes de <b>couche 2</b> (boucles de commutation), justement parce que la trame Ethernet n\'a pas de TTL, contrairement au paquet IP.')}
${table(['Débit', 'Coût STP'], [['10 Mbit/s', '100'], ['100 Mbit/s', '19'], ['1 Gbit/s', '4'], ['10 Gbit/s', '2']])}
${w('stp')}
<p><b>Départage</b> en cas d'égalité, dans l'ordre : plus petit coût vers la racine → plus petit Bridge ID de l'émetteur → plus petit Port ID (priorité 128 + n° de port).</p>
${table(['802.1D (STP)', 'Durée', '802.1w (RSTP)'], [['Blocking', '20 s (max age)', 'Discarding'], ['Listening', '15 s', '(fusionné dans Discarding)'], ['Learning', '15 s', 'Learning'], ['Forwarding', '—', 'Forwarding'], ['Convergence 30 à 50 s', '', 'Convergence ~1 s']])}
${ul(['Rôles RSTP : <b>root, designated, alternate</b> (secours du port racine), backup.', '<b>PVST+</b> (Cisco) : une instance STP par VLAN → permet de répartir la charge (racine différente selon le VLAN).', '<b>PortFast</b> : un port vers un PC passe directement en forwarding ; à coupler avec <b>BPDU Guard</b> (le port se coupe s\'il reçoit un BPDU).', 'Les switchs échangent des <b>BPDU</b> (trames de contrôle) pour construire l\'arbre.'])}
${code(`spanning-tree mode rapid-pvst
spanning-tree vlan 10 root primary        ! ou : spanning-tree vlan 10 priority 4096
interface fa0/5
 spanning-tree portfast
 spanning-tree bpduguard enable
show spanning-tree`)}
${trap('Le pont racine a le <b>plus petit</b> Bridge ID (et non le plus grand). À priorité égale, la plus petite MAC gagne — souvent le switch le plus ancien, pas forcément le meilleur !')}
`,
        check: [
          { type: 'qcm', q: 'Coût STP d\'un lien 1 Gbit/s :', choices: ['19', '4', '2', '100'], a: 1, noShuffle: true, expl: '10 M = 100, 100 M = 19, 1 G = 4, 10 G = 2.' },
          { type: 'qcm', q: 'Priorité STP par défaut :', choices: ['0', '4 096', '32 768', '65 535'], a: 2, noShuffle: true, expl: '32 768 (+ n° de VLAN avec PVST+).' },
          { type: 'input', q: 'SW1 prio 32768 MAC 0011.1111.1111, SW2 prio 4096 MAC 0011.2222.2222, SW3 prio 32768 MAC 0011.0000.0001. Pont racine ? (tape SW1, SW2 ou SW3)', fields: [{ kind: 'text', a: 'SW2' }], expl: 'Priorité 4 096 la plus faible → SW2, quelle que soit sa MAC. Sans modification des priorités, ce serait SW3 (plus petite MAC).' }
        ]
      },
      {
        title: 'Redondance du premier saut : HSRP, VRRP, GLBP', min: 5,
        essentiel: ul([
          'Les postes ont une seule passerelle : si ce routeur tombe, plus rien ne sort. Solution : deux routeurs partagent une <b>adresse IP et MAC virtuelles</b>.',
          'Un routeur <b>actif</b> répond ; l\'autre est en <b>veille</b>. Plus de hello du actif → la veille prend le rôle, sans interruption pour les hôtes.',
          '<b>HSRP</b> (Cisco) · <b>VRRP</b> (standard IETF, RFC 5798) · <b>GLBP</b> (Cisco, avec équilibrage de charge).'
        ]),
        html: `
${table(['Protocole', 'Standard ou propriétaire', 'Particularité'], [['HSRP', 'Propriétaire Cisco', 'Actif / veille'], ['VRRP', 'Norme IETF (RFC 5798, révise la RFC 3768)', 'Maître / sauvegarde ; fonctionne comme HSRP'], ['GLBP', 'Propriétaire Cisco', 'En plus : équilibre la charge entre plusieurs routeurs']])}
${steps(['Le routeur en veille cesse de recevoir les messages Hello du routeur actif.', 'Il prend le rôle de routeur de transfert.', 'Comme il reprend l\'IP <b>et</b> la MAC virtuelles, les hôtes ne voient aucune interruption.'])}
${code(`! R1 (actif) — passerelle virtuelle 10.20.0.254
interface g0/0
 ip address 10.20.0.2 255.255.254.0
 standby 1 ip 10.20.0.254
 standby 1 priority 110
 standby 1 preempt
! R2 (veille) : même groupe, priorité par défaut 100
show standby brief`)}
${key('Les postes sont configurés avec l\'adresse <b>virtuelle</b> comme passerelle par défaut (ici 10.20.0.254), jamais avec l\'adresse réelle d\'un des routeurs.')}
`,
        check: [
          { type: 'qcm', q: 'Protocole de redondance de passerelle normalisé par l\'IETF :', choices: ['VRRP', 'HSRP', 'GLBP', 'STP'], a: 0, expl: 'VRRP ; HSRP et GLBP sont Cisco.' },
          { type: 'qcm', q: 'Quel FHRP équilibre en plus la charge ?', choices: ['GLBP', 'HSRP', 'VRRP', 'RSTP'], a: 0, expl: 'Gateway Load Balancing Protocol.' }
        ]
      },
      {
        title: 'EtherChannel et sécurité des ports', min: 5,
        essentiel: ul([
          '<b>EtherChannel</b> : 2 à 8 liens physiques = 1 lien logique (débit additionné, redondance, STP ne bloque pas). <b>LACP</b> (802.3ad : active/passive) ou <b>PAgP</b> (Cisco : desirable/auto).',
          'Ports agrégés : même vitesse, même duplex, mêmes VLAN.',
          '<b>Port security</b> : limiter le nombre de MAC par port ; violation <b>shutdown</b> (défaut, err-disabled), restrict, protect. Contre le MAC flooding.'
        ]),
        html: `
${code(`! EtherChannel LACP entre deux switchs
interface range g0/1 - 2
 channel-group 1 mode active
interface port-channel 1
 switchport mode trunk

! Port security sur un port d'accès
interface fa0/5
 switchport mode access
 switchport port-security
 switchport port-security maximum 2
 switchport port-security mac-address sticky
 switchport port-security violation shutdown
show port-security interface fa0/5`)}
${table(['Mode de violation', 'Effet'], [['shutdown (défaut)', 'Port désactivé (err-disabled), alerte'], ['restrict', 'Bloque les MAC en trop et journalise'], ['protect', 'Bloque les MAC en trop sans journaliser']])}
${tip('Pour réactiver un port err-disabled : <code>shutdown</code> puis <code>no shutdown</code> sur l\'interface (après avoir retiré la cause).')}
`,
        check: [
          { type: 'qcm', q: 'Protocole d\'agrégation normalisé IEEE :', choices: ['LACP', 'PAgP', 'DTP', 'VTP'], a: 0, expl: 'LACP = 802.3ad.' },
          { type: 'qcm', q: 'Mode de violation port-security par défaut :', choices: ['shutdown', 'protect', 'restrict', 'aucun'], a: 0, expl: 'Le port passe en err-disabled.' }
        ]
      },
      {
        title: 'Wi-Fi (1) : normes, fréquences, canaux, CSMA/CA', min: 9,
        essentiel: ul([
          '2,4 GHz : meilleure portée mais saturée ; seuls <b>3 canaux sans chevauchement : 1, 6, 11</b>. 5 GHz : plus de débit et de canaux, portée plus courte.',
          'Normes : b (11), a/g (54 Mbit/s), n = Wi-Fi 4 (MIMO), ac = Wi-Fi 5 (MU-MIMO), ax = Wi-Fi 6 (OFDMA), be = Wi-Fi 7.',
          '<b>CSMA/CA</b> : une station radio ne peut pas écouter en émettant → on évite les collisions (DIFS, NAV, ACK, RTS/CTS).'
        ]),
        html: `
<p>Selon le cours, un WLAN relie des périphériques par <b>ondes radio</b>. Avantages : <b>mobilité, facilité, souplesse, coût, évolutivité</b>. Inconvénients : <b>sécurité</b> (on s'y connecte sans câble) et <b>qualité du signal</b> (perturbations : radar, Bluetooth…).</p>
${table(['Norme', 'Nom', 'Bande(s)', 'Débit max théorique'], [
  ['802.11 (1997)', '—', '2,4 GHz', '2 Mbit/s'],
  ['802.11b (1999)', '—', '2,4 GHz', '11 Mbit/s (bonne portée)'],
  ['802.11a (1999)', '—', '5 GHz', '54 Mbit/s (portée plus courte)'],
  ['802.11g (2003)', '—', '2,4 GHz', '54 Mbit/s'],
  ['802.11n (2009)', 'Wi-Fi 4', '2,4 + 5 GHz', '150 à 600 Mbit/s (MIMO), ~70 m'],
  ['802.11ac (2013)', 'Wi-Fi 5', '5 GHz', '≈ 1,3 à 6,9 Gbit/s (MU-MIMO)'],
  ['802.11ad', 'WiGig', '60 GHz (+2,4/5)', '≈ 7 Gbit/s, ne traverse pas les murs'],
  ['802.11ax', 'Wi-Fi 6 / 6E', '2,4 + 5 (+6) GHz', '9,6 Gbit/s (OFDMA)'],
  ['802.11be', 'Wi-Fi 7', '2,4 + 5 + 6 GHz', '≈ 46 Gbit/s']
])}
${ul(['Bandes libres <b>ISM</b> (2,4 GHz) et <b>UNII</b> (5 GHz) ; le spectre est régulé par l\'<b>UIT-R</b>.', 'Organismes : <b>UIT-R</b> (spectre), <b>IEEE</b> (normes 802.11), <b>Wi-Fi Alliance</b> (certification d\'interopérabilité).', 'Techniques d\'étalement / modulation : DSSS, FHSS, OFDM.', '<b>MIMO</b> : plusieurs antennes en émission et en réception ; <b>MU-MIMO</b> (ac Wave 2) : la borne parle à plusieurs appareils en même temps.', 'Débit réel ≈ moitié du débit théorique (support partagé, en-têtes).'])}
<h3>CSMA/CA pas à pas (cours)</h3>
${steps(['La station vérifie que le canal est libre (mécanisme <b>CCA</b> de la couche physique).', 'Libre pendant un <b>DIFS</b> → elle émet ; sinon elle diffère.', 'Les autres stations règlent leur minuterie <b>NAV</b> (Network Allocation Vector) et attendent.', 'Le destinataire vérifie le CRC et renvoie un <b>ACK</b>. Pas d\'ACK → collision supposée → retransmission.', '<b>RTS/CTS</b> règle le problème du <b>nœud caché</b> (deux stations qui ne s\'entendent pas).'])}
${reflex('3 bornes en 2,4 GHz → <b>canaux 1, 6 et 11</b> : les seuls canaux de 20 MHz qui ne se chevauchent pas.')}
`,
        check: [
          { type: 'qcm', q: 'Canaux 2,4 GHz sans chevauchement :', choices: ['1-2-3', '1-6-11', '1-5-9-13', '36-40-44'], a: 1, noShuffle: true, expl: '1, 6, 11.' },
          { type: 'qcm', q: 'Pourquoi le Wi-Fi utilise-t-il CSMA/CA et non CSMA/CD ?', choices: ['une radio ne peut pas écouter en émettant, donc ne détecte pas les collisions', 'c\'est plus rapide', 'pour chiffrer', 'parce que le Wi-Fi est full-duplex'], a: 0, expl: 'On évite plutôt que détecter.' },
          { type: 'qcm', q: 'Norme Wi-Fi 6 :', choices: ['802.11ax', '802.11ac', '802.11n', '802.11be'], a: 0, expl: 'ax = Wi-Fi 6 (OFDMA).' }
        ]
      },
      {
        title: 'Wi-Fi (2) : architecture, trames, sécurité', min: 8,
        essentiel: ul([
          '<b>SSID</b> = nom du réseau · <b>BSSID</b> = MAC de la borne · <b>BSS</b> = une borne et ses clients · <b>ESS</b> = plusieurs bornes, même SSID (itinérance).',
          'Modes <b>ad hoc</b> (sans borne) et <b>infrastructure</b>. Association : <b>détection → authentification → association</b>.',
          'WEP cassé · WPA (TKIP) obsolète · <b>WPA2 = AES-CCMP</b> · <b>WPA3 = SAE</b>. Entreprise = <b>802.1X + RADIUS</b> (EAP).'
        ]),
        html: `
${ul(['<b>Mode ad hoc</b> : deux appareils sans borne (Bluetooth, Wi-Fi Direct).', '<b>Mode infrastructure</b> : via un point d\'accès relié au réseau filaire (système de distribution, DS).', 'Entreprise : bornes légères gérées par un <b>contrôleur WLC</b> (protocole CAPWAP).', 'Paramètres d\'une borne : <b>SSID</b>, mot de passe, mode de sécurité, canal.'])}
<h3>La trame 802.11 (cours)</h3>
${table(['Frame Control', 'Durée', 'Adresse 1', 'Adresse 2', 'Adresse 3', 'Séquence', 'Adresse 4', 'Données', 'FCS'], [['type, sous-type, sécurité…', 'délai avant réception', 'récepteur', 'émetteur', 'destination / passerelle', 'n° d\'ordre, fragment', 'mode ad hoc / pont', 'charge utile', 'contrôle d\'erreurs']])}
${ul(['<b>Trames de gestion</b> : recherche, authentification, association à un point d\'accès (balises/beacons).', '<b>Trames de contrôle</b> : faciliter l\'échange (ACK, RTS, CTS).', '<b>Trames de données</b> : les informations utiles.'])}
${table(['Sécurité', 'Chiffrement', 'Statut'], [['WEP', 'RC4', 'Cassé, interdit'], ['WPA', 'TKIP', 'Obsolète'], ['WPA2', 'AES-CCMP', 'Encore courant'], ['WPA3', 'AES + SAE', 'Recommandé']])}
${ul(['<b>Personnel (PSK)</b> : un mot de passe partagé. <b>Entreprise</b> : 802.1X + serveur RADIUS (identifiant propre à chaque agent, souvent lié à l\'Active Directory).', 'Le cours précise : <b>EAP</b> (Extensible Authentication Protocol) est un protocole de <b>transport</b> de l\'authentification, pas une méthode en soi.', 'Attaques : borne pirate (rogue AP), evil twin, désauthentification.'])}
${ex('Direction régionale de Tahoua : 3 bornes (agents + visiteurs). Canaux 1, 6, 11. Agents : WPA2/WPA3-Entreprise (802.1X + RADIUS relié à l\'AD). Visiteurs : SSID séparé, WPA3-Personnel ou portail captif, dans un <b>VLAN dédié</b> routé uniquement vers Internet (ACL interdisant 10.20.0.0/22), avec isolation des clients entre eux.', 'Étude de cas du plan')}
`,
        check: [
          { type: 'qcm', q: 'WPA3 Personnel repose sur :', choices: ['TKIP', 'WEP', 'SAE', 'PSK de WPA2'], a: 2, noShuffle: true, expl: 'SAE (Simultaneous Authentication of Equals).' },
          { type: 'order', q: 'Ordre de connexion d\'un client Wi-Fi :', items: ['Détection du point d\'accès', 'Authentification', 'Association'], expl: 'Trois étapes via des trames de gestion.' },
          { type: 'qcm', q: 'Plusieurs bornes avec le même SSID forment :', choices: ['un ESS', 'un BSS', 'un IBSS', 'un VLAN'], a: 0, expl: 'Extended Service Set → itinérance.' }
        ]
      }
    ],

    cards: [
      { front: 'Hub, switch, routeur : couche et domaines ?', back: 'Hub (1) : 1 domaine de collision · Switch (2) : 1 collision/port, 1 broadcast · Routeur (3) : 1 broadcast/interface' },
      { front: 'Définition du domaine de collision ?', back: 'Équipements dont les émissions simultanées peuvent entrer en collision (câble partagé, hub)' },
      { front: 'Définition du domaine de broadcast ?', back: 'Équipements qui reçoivent un broadcast envoyé par l\'un d\'eux ; découpé par un routeur ou des VLAN' },
      { front: 'Les 3 actions d\'un switch ?', back: 'Apprendre (MAC <b>source</b>) · filtrer/transmettre (MAC destination connue) · inonder (inconnue ou broadcast)' },
      { front: 'Durée de vie d\'une entrée de table MAC ?', back: '<b>300 s</b> d\'inactivité' },
      { front: 'Trame Ethernet II : champs et tailles ?', back: 'Préambule 7+1 · MAC dest 6 · MAC src 6 · [tag 4] · EtherType 2 · données 46-1 500 · FCS 4' },
      { front: 'Taille min / max d\'une trame Ethernet ?', back: '<b>64 / 1 518</b> octets (1 522 avec tag), MTU 1 500' },
      { front: 'EtherType 0x0800, 0x0806, 0x86DD, 0x8100 ?', back: 'IPv4 · ARP · IPv6 · VLAN 802.1Q' },
      { front: 'Adresse MAC : structure ?', back: '48 bits = OUI (24 bits, constructeur) + 24 bits uniques' },
      { front: 'MAC de broadcast ? de multicast IPv4 ?', back: 'FF:FF:FF:FF:FF:FF · 01:00:5E:…' },
      { front: 'ARP : requête et réponse ?', back: 'Requête en <b>broadcast</b> (MAC cible vide) · réponse en <b>unicast</b> · type 0x0806' },
      { front: 'Destination sur un autre réseau : ARP pour qui ?', back: 'Pour la <b>passerelle par défaut</b>' },
      { front: 'Câble droit, croisé, inversé ?', back: 'Droit : équipements différents · croisé : identiques · inversé : console Cisco' },
      { front: 'Cat 5e, Cat 6, Cat 6a ?', back: '1 G/100 m · 10 G ≤ 55 m · <b>10 G/100 m</b>' },
      { front: 'Fibre multimode vs monomode ?', back: 'Multimode : courte distance (bâtiment) · monomode : km, entre sites' },
      { front: 'Port access vs trunk ?', back: 'Access : 1 VLAN, non tagué · trunk : plusieurs VLAN, tagués 802.1Q' },
      { front: 'Tag 802.1Q : taille et champs ?', back: '4 octets : TPID 0x8100 (16) · PCP (3, priorité 0-7) · DEI (1) · VID (12)' },
      { front: 'Nombre de VLAN utilisables ?', back: '<b>1 à 4 094</b> (VID sur 12 bits)' },
      { front: 'VLAN natif ?', back: 'Seul VLAN non tagué sur un trunk (VLAN 1 par défaut) ; identique aux deux bouts ; à déplacer vers un VLAN inutilisé' },
      { front: 'DTP et VTP : dangers ?', back: 'DTP : un attaquant monte un trunk (→ nonegotiate) · VTP : révision plus haute efface les VLAN' },
      { front: 'Router-on-a-stick ?', back: 'Un trunk vers le routeur + une sous-interface par VLAN (<code>encapsulation dot1Q X</code>)' },
      { front: 'SVI ?', back: 'Interface virtuelle de VLAN sur un switch L3 (<code>interface vlan X</code> + <code>ip routing</code>)' },
      { front: 'Problèmes sans STP (boucles L2) ?', back: 'Tempêtes de broadcast · instabilité de la table MAC · trames en double (pas de TTL en couche 2)' },
      { front: 'STP : les 3 étapes ?', back: 'Pont racine (plus petit BID) → port racine par switch → port désigné par segment ; le reste bloqué' },
      { front: 'Coûts STP 10 M / 100 M / 1 G / 10 G ?', back: '<b>100 / 19 / 4 / 2</b>' },
      { front: 'Bridge ID ?', back: 'Priorité (32 768 par défaut, multiple de 4 096) + adresse MAC' },
      { front: 'STP 802.1D vs RSTP ?', back: '802.1D : 30-50 s (blocking 20, listening 15, learning 15) · RSTP 802.1w : ~1 s' },
      { front: 'PortFast + BPDU Guard ?', back: 'Port PC en forwarding immédiat ; coupé s\'il reçoit un BPDU' },
      { front: 'HSRP, VRRP, GLBP ?', back: 'HSRP (Cisco) · VRRP (IETF) · GLBP (Cisco + équilibrage) : IP/MAC virtuelles de passerelle' },
      { front: 'EtherChannel : protocoles et modes ?', back: 'LACP (802.3ad) active/passive · PAgP (Cisco) desirable/auto' },
      { front: 'Port security : modes de violation ?', back: 'shutdown (défaut, err-disabled) · restrict (journalise) · protect' },
      { front: 'Canaux 2,4 GHz sans chevauchement ?', back: '<b>1, 6, 11</b>' },
      { front: 'Normes Wi-Fi 4, 5, 6, 7 ?', back: '802.11n · ac · ax · be' },
      { front: 'CSMA/CA : mécanismes ?', back: 'CCA, DIFS, NAV, ACK, RTS/CTS (nœud caché)' },
      { front: 'SSID, BSSID, BSS, ESS ?', back: 'Nom · MAC de la borne · 1 borne + clients · plusieurs bornes même SSID' },
      { front: 'WEP, WPA, WPA2, WPA3 ?', back: 'RC4 cassé · TKIP obsolète · AES-CCMP · AES + SAE' },
      { front: 'Wi-Fi Entreprise ?', back: '<b>802.1X + RADIUS</b> (EAP), un identifiant par agent' },
      { front: 'Les 3 organismes du Wi-Fi ?', back: 'UIT-R (spectre) · IEEE (normes) · Wi-Fi Alliance (certification)' }
    ],

    qcm: [
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'Taille du champ VID du tag 802.1Q :', choices: ['8 bits', '10 bits', '12 bits', '16 bits'], a: 2, noShuffle: true, expl: '12 bits.' },
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'EtherType de l\'IPv6 :', choices: ['0x0800', '0x0806', '0x8100', '0x86DD'], a: 3, noShuffle: true, expl: '0x86DD.' },
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'Coût STP d\'un lien 1 Gbit/s :', choices: ['19', '4', '2', '100'], a: 1, noShuffle: true, expl: '4.' },
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'Priorité STP par défaut :', choices: ['0', '4 096', '32 768', '65 535'], a: 2, noShuffle: true, expl: '32 768.' },
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'Canaux 2,4 GHz sans chevauchement :', choices: ['1-2-3', '1-6-11', '1-5-9-13', '36-40-44'], a: 1, noShuffle: true, expl: '1, 6, 11.' },
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'WPA3 Personnel repose sur :', choices: ['TKIP', 'WEP', 'SAE', 'PSK de WPA2'], a: 2, noShuffle: true, expl: 'SAE.' },
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'Câble pour 10 Gbit/s sur 100 m :', choices: ['Cat 5e', 'Cat 6', 'Cat 6a', 'coaxial'], a: 2, noShuffle: true, expl: 'Cat 6a.' },
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'Pour relier Niamey à un bâtiment à 8 km :', choices: ['Cat 6a', 'fibre multimode', 'fibre monomode', 'Wi-Fi 6'], a: 2, noShuffle: true, expl: 'Monomode pour les kilomètres.' },
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'Commande pour voir les trunks d\'un switch Cisco :', choices: ['show vlan', 'show interfaces trunk', 'show trunk all', 'show ip route'], a: 1, noShuffle: true, expl: 'show interfaces trunk.' },
      { type: 'qcm', src: 'Plan S3 · QCM', q: 'Un switch reçoit une trame dont la MAC destination est inconnue :', choices: ['il la détruit', 'il l\'envoie au routeur', 'il l\'inonde sur tous les ports du VLAN sauf l\'entrée', 'il envoie un ARP'], a: 2, noShuffle: true, expl: 'Inondation.' },
      { type: 'qcm', q: 'Combien de domaines de collision crée un hub de 16 ports ?', choices: ['1', '16', '2', '0'], a: 0, expl: 'Un hub = un seul domaine de collision.' },
      { type: 'qcm', q: 'Les trames Ethernet n\'ont pas de :', choices: ['TTL', 'adresse source', 'FCS', 'EtherType'], a: 0, expl: 'D\'où les boucles infinies sans STP.' },
      { type: 'qcm', q: 'RSTP converge en environ :', choices: ['1 seconde', '30 secondes', '50 secondes', '5 minutes'], a: 0, expl: '802.1w.' },
      { type: 'qcm', q: 'Le bit DEI du tag 802.1Q s\'appelait autrefois :', choices: ['CFI', 'TPID', 'PCP', 'VID'], a: 0, expl: 'Canonical Format Indicator.' },
      { type: 'qcm', q: 'Combien de niveaux de priorité permet le champ PCP (3 bits) ?', choices: ['8 (0 à 7)', '7', '3', '16'], a: 0, expl: '2<sup>3</sup> = 8. (Le support indique 7 par erreur.)' },
      { type: 'qcm', q: 'Un trunk relie deux switchs : VLAN natif 1 d\'un côté, 999 de l\'autre. Conséquence ?', choices: ['fuite de trafic entre VLAN', 'rien', 'le trunk se chiffre', 'STP se désactive'], a: 0, expl: 'Le natif doit être identique aux deux bouts.' },
      { type: 'qcm', q: 'Mode d\'agrégation LACP qui initie la négociation :', choices: ['active', 'passive', 'desirable', 'auto'], a: 0, expl: 'active (LACP) ; desirable (PAgP).' },
      { type: 'tf', q: 'Un switch découpe naturellement les domaines de broadcast.', a: false, expl: 'Seulement avec des VLAN.' },
      { type: 'tf', q: 'En 802.11, chaque trame de données est acquittée par un ACK.', a: true, expl: 'Pas d\'ACK = collision supposée.' },
      { type: 'match', q: 'Associe l\'attaque à la parade de couche 2.', pairs: [['MAC flooding', 'Port security'], ['VLAN hopping', 'VLAN natif inutilisé + nonegotiate'], ['Faux BPDU sur un port PC', 'BPDU Guard'], ['ARP spoofing', 'DAI']], expl: 'Sécurisation de la couche 2.' }
    ],

    exercises: [
      {
        title: 'Compter les domaines', min: 7, src: 'Plan S3 · Ex. 1',
        statement: '<p>Un routeur R a deux interfaces. Sur la première, un switch S1 auquel sont reliés 8 PC et un hub H2 portant 3 PC. Sur la seconde, un hub H1 portant 4 PC. Aucun VLAN.</p>',
        parts: [
          { q: 'a) Combien de domaines de broadcast ? de collision ? Justifie.', pts: 1.5, fields: [{ label: 'Broadcast', kind: 'num', a: 2 }, { label: 'Collision', kind: 'num', a: 11 }], corr: '<p>Broadcast = <b>2</b> (une par interface du routeur). Collision = <b>11</b> : côté S1, 8 ports PC + 1 port vers R + 1 port vers H2 = 10 ; côté H1 : 1 (le hub, ses 4 PC et l\'interface du routeur).</p>' },
          { q: 'b) On remplace H1 par un switch. Combien de domaines de collision ?', pts: 0.75, fields: [{ kind: 'num', a: 15 }], corr: '<p>Le nouveau switch crée un domaine par port : 4 PC + 1 port vers R = 5 → 10 + 5 = <b>15</b>.</p>' },
          { q: 'c) 2 VLAN sur S1 (4 PC chacun ; H2 dans le VLAN du premier groupe), trunk vers R. Combien de domaines de broadcast ?', pts: 0.75, fields: [{ kind: 'num', a: 3 }], corr: '<p>2 VLAN côté S1 + 1 côté H1 = <b>3</b> (le routeur a une sous-interface par VLAN).</p>' }
        ]
      },
      {
        title: 'Apprentissage d\'un switch', min: 8, src: 'Plan S3 · Ex. 2',
        statement: '<p>Switch neuf (table vide). PC-A (MAC AA) port 1, PC-B (BB) port 2, PC-C (CC) port 3, PC-D (DD) port 4. Pour chaque trame : ports de sortie et ajout à la table.</p>',
        parts: [
          { q: '1. A envoie une trame à B.', pts: 0.6, fields: [{ label: 'Ports de sortie', kind: 'select', opts: ['2', '2, 3, 4', '1, 2, 3, 4', 'aucun'], a: 1 }], corr: '<p>Ports 2, 3, 4 (BB inconnue → inondation) ; table : AA → 1.</p>' },
          { q: '2. B répond à A.', pts: 0.6, fields: [{ label: 'Ports de sortie', kind: 'select', opts: ['1', '1, 3, 4', 'aucun', '2'], a: 0 }], corr: '<p>Port 1 seulement (AA connue → filtrage) ; table : BB → 2.</p>' },
          { q: '3. C envoie une requête ARP (broadcast).', pts: 0.6, fields: [{ label: 'Ports de sortie', kind: 'select', opts: ['1, 2, 4', '1, 2, 3, 4', '3', 'aucun'], a: 0 }], corr: '<p>Ports 1, 2, 4 (un broadcast est toujours inondé) ; table : CC → 3.</p>' },
          { q: '4. A envoie une trame à C.', pts: 0.6, fields: [{ label: 'Ports de sortie', kind: 'select', opts: ['3', '2, 3, 4', '1', 'aucun'], a: 0 }], corr: '<p>Port 3 seulement (CC connue) ; rien d\'ajouté (minuterie de AA remise à zéro).</p>' },
          { q: '5. A envoie une trame à D.', pts: 0.6, fields: [{ label: 'Ports de sortie', kind: 'select', opts: ['4', '2, 3, 4', '1, 2, 3, 4', 'aucun'], a: 1 }], corr: '<p>Ports 2, 3, 4 : DD n\'a jamais émis → inconnue → inondation.</p>' }
        ]
      },
      {
        title: 'Analyse de trames', min: 8, src: 'Plan S3 · Ex. 3',
        statement: `<p>Début (hexadécimal) de deux trames capturées :</p>${code(`Trame 1 : ff ff ff ff ff ff 00 1a 2b 3c 4d 5e 08 06 00 01 …
Trame 2 : 00 1a 2b 3c 4d 5e 3c 52 82 11 22 33 81 00 00 0a 08 00 45 00 …`)}`,
        parts: [
          { q: 'a) Trame 1 : MAC destination, MAC source, protocole transporté. Que se passe-t-il ?', pts: 0.75, corr: '<p>Destination FF:FF:FF:FF:FF:FF (broadcast) · source 00:1A:2B:3C:4D:5E · EtherType 0x0806 = <b>ARP</b>. C\'est une requête ARP : la machine cherche la MAC d\'une IP de son réseau (00 01 = matériel Ethernet).</p>' },
          { q: 'b) Trame 2 : taguée ? VLAN et priorité ? Protocole transporté ?', pts: 0.75, fields: [{ label: 'N° de VLAN', kind: 'num', a: 10 }, { label: 'Priorité (PCP)', kind: 'num', a: 0 }], corr: '<p>0x8100 → taguée 802.1Q. TCI = 00 0a = 0000 0000 0000 1010 → PCP = 000 (priorité 0), DEI = 0, VID = 0x00A = <b>VLAN 10</b>. EtherType suivant 0x0800 = IPv4 ; 45 = version 4, en-tête de 20 octets.</p>' },
          { q: 'c) Quel type d\'adresse est 01:00:5E:00:00:05 ? Que signifie l\'OUI 00:1A:2B ?', pts: 0.75, corr: '<p>Multicast IPv4 (1<sup>er</sup> octet avec son dernier bit à 1) : groupe 224.0.0.5 (tous les routeurs OSPF). L\'OUI = les 24 premiers bits, identifiant du constructeur attribué par l\'IEEE.</p>' },
          { q: 'd) Pourquoi une trame doit-elle faire au moins 64 octets ? Que fait la carte si les données sont trop courtes ?', pts: 0.75, corr: '<p>Pour que l\'émetteur soit encore en train d\'émettre quand une collision revient (CSMA/CD, 2 500 m à 10 Mbit/s : 512 bits). Moins de 46 octets de données → <b>bourrage (padding)</b>.</p>' }
        ]
      },
      {
        title: 'Étude de cas : VLAN au siège de Niamey', min: 12, src: 'Plan S3 · Ex. 4',
        statement: `<p>Un switch d'accès SW-NY relie les postes ; un seul lien (G0/1 du switch ↔ G0/0 du routeur) remonte vers R-NIAMEY.</p>${table(['VLAN', 'Nom', 'Ports', 'Sous-réseau', 'Passerelle'], [['10', 'ADMIN', 'Fa0/1 à Fa0/12', '10.20.0.0/23', '10.20.0.1'], ['20', 'IMPOTS', 'Fa0/13 à Fa0/22', '10.20.2.0/24', '10.20.2.1'], ['99', 'GESTION', '— (adresse du switch)', '10.20.3.240/28', '10.20.3.241'], ['999', 'NATIF', 'VLAN natif inutilisé', '—', '—']])}`,
        parts: [
          { q: 'a) Configuration du switch (VLAN, ports access, trunk, adresse de gestion 10.20.3.242, passerelle).', pts: 2, corr: code(`vlan 10
 name ADMIN
vlan 20
 name IMPOTS
vlan 99
 name GESTION
vlan 999
 name NATIF
interface range fa0/1 - 12
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
interface range fa0/13 - 22
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
interface g0/1
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,99
 switchport nonegotiate
interface vlan 99
 ip address 10.20.3.242 255.255.255.240
 no shutdown
ip default-gateway 10.20.3.241
! ports Fa0/23-24 inutilisés : VLAN inutilisé + shutdown`) },
          { q: 'b) Configuration du routeur (router-on-a-stick).', pts: 1.5, corr: code(`interface g0/0
 no shutdown
interface g0/0.10
 encapsulation dot1Q 10
 ip address 10.20.0.1 255.255.254.0
interface g0/0.20
 encapsulation dot1Q 20
 ip address 10.20.2.1 255.255.255.0
interface g0/0.99
 encapsulation dot1Q 99
 ip address 10.20.3.241 255.255.255.240`) },
          { q: 'c) Pourquoi déplacer le VLAN natif vers 999 ? Pourquoi nonegotiate et portfast ?', pts: 1, corr: '<p>Natif 999 : il circule sans tag ; laissé en VLAN 1, un attaquant peut faire du VLAN hopping (double étiquetage). <code>nonegotiate</code> désactive DTP : personne ne peut monter un trunk lui-même. <code>portfast</code> : accès immédiat au lieu d\'attendre 30 s (sinon le DHCP peut échouer au démarrage).</p>' },
          { q: 'd) Le lien G0/1 est saturé. Deux améliorations ?', pts: 0.5, corr: '<p>(1) EtherChannel LACP (2 à 4 liens) ; (2) switch de niveau 3 (SVI + ip routing) ; (3) lien 10 Gbit/s.</p>' }
        ]
      },
      {
        title: 'Spanning Tree', min: 10, src: 'Plan S3 · Ex. 5',
        statement: '<p>Trois switchs en triangle, liens 1 Gbit/s : SW1 (priorité 32 768, MAC 0011.1111.1111) · SW2 (4 096, 0011.2222.2222) · SW3 (32 768, 0011.0000.0001). Essaie le lab « Élection STP » pour vérifier.</p>',
        parts: [
          { q: 'a) Quel switch est pont racine ? Pourquoi ?', pts: 1, fields: [{ kind: 'select', opts: ['SW1', 'SW2', 'SW3'], a: 1 }], corr: '<p>SW2 : sa priorité (4 096) est la plus faible → plus petit Bridge ID, quelle que soit sa MAC.</p>' },
          { q: 'b) Port racine de chaque switch non racine (coût vers la racine).', pts: 1, corr: '<p>SW1 : port vers SW2 (coût 4, contre 4 + 4 = 8 via SW3) · SW3 : port vers SW2 (coût 4).</p>' },
          { q: 'c) Sur le lien SW1–SW3, quel port est désigné, lequel est bloqué ?', pts: 1, fields: [{ label: 'Port bloqué', kind: 'select', opts: ['côté SW1', 'côté SW3'], a: 0 }], corr: '<p>Égalité de coût vers la racine (4). On compare les Bridge ID : même priorité, MAC de SW3 (0011.0000.0001) &lt; SW1 → le port de SW3 est désigné, celui de <b>SW1 est bloqué</b>.</p>' },
          { q: 'd) Sans modification des priorités, qui serait racine ? Quelle commande rend SW1 racine ?', pts: 0.5, corr: '<p>Toutes à 32 768 → plus petite MAC → <b>SW3</b>. Pour SW1 : <code>spanning-tree vlan 1 root primary</code> ou <code>spanning-tree vlan 1 priority 0</code> (ou 4096 ; multiple de 4 096).</p>' },
          { q: 'e) Temps pour remettre un port bloqué en service en 802.1D ? Version plus rapide ?', pts: 0.5, corr: '<p>802.1D : jusqu\'à 50 s (20 max age + 15 listening + 15 learning), 30 s si la panne est détectée directement. <b>RSTP (802.1w)</b> : ~1 s (ports alternate, négociation proposition/accord).</p>' }
        ]
      },
      {
        title: 'Étude de cas Wi-Fi : direction régionale de Tahoua', min: 6, src: 'Plan S3 · Ex. 6',
        statement: '<p>3 bornes Wi-Fi dans un bâtiment de bureaux : agents (applications financières) et visiteurs (Internet uniquement).</p>',
        parts: [
          { q: 'a) Quels canaux pour les 3 bornes en 2,4 GHz ? Pourquoi ?', pts: 1, corr: '<p>1, 6 et 11 : seuls canaux de 20 MHz sans chevauchement ; deux bornes voisines sur des canaux qui se chevauchent se brouillent.</p>' },
          { q: 'b) Sécurité pour les agents et les visiteurs ? Comment isoler les visiteurs ?', pts: 1, corr: '<p>Agents : WPA2/WPA3-Entreprise (802.1X + RADIUS relié à l\'AD, identifiant révocable). Visiteurs : SSID séparé, WPA3-Personnel ou portail captif. Isolation : VLAN dédié routé uniquement vers Internet (ACL/pare-feu interdisant 10.20.0.0/22), isolation des clients entre eux.</p>' },
          { q: 'c) Pourquoi CSMA/CA et non CSMA/CD ?', pts: 1, corr: '<p>Une station radio ne peut pas écouter pendant qu\'elle émet (son propre signal couvre tout) → impossible de détecter une collision ; on cherche donc à l\'éviter (attente aléatoire, ACK, RTS/CTS).</p>' }
        ]
      }
    ],

    phrases: [
      'Chaque port de switch = 1 domaine de collision ; chaque interface de routeur (ou chaque VLAN) = 1 domaine de broadcast.',
      'Le switch apprend la MAC source, commute sur la MAC destination, inonde l\'inconnu et le broadcast.',
      '802.1Q : tag de 4 octets, VID sur 12 bits, VLAN natif non tagué ; access = 1 VLAN, trunk = plusieurs.',
      'STP : racine = plus petit Bridge ID (priorité puis MAC) ; coûts 100 / 19 / 4 / 2 ; RSTP converge en ~1 s.',
      'Wi-Fi : CSMA/CA, canaux 1-6-11, WPA3 = SAE, Entreprise = 802.1X + RADIUS.'
    ]
  });
})();
