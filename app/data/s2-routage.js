/* Séance 2 — Routage statique et dynamique, NAT/PAT, réseaux étendus (HDLC, PPP). */
(function () {
  'use strict';
  const { key, trap, tip, reflex, ex, fix, mnemo, why, f, frac, table, steps, ul, bits, w, stepper, reveal, code } = App.md;

  const topo = `<pre style="font-size:.78rem;line-height:1.35">                    LAN Niamey : Admin 10.20.0.0/23 (G0/0) · Impôts 10.20.2.0/24 (G0/1) · DMZ 10.20.3.192/27 (G0/3)
                                         ┌──────────┐  G0/2 203.0.113.2/30
                                         │ R-NIAMEY │──────────────────── FAI (.1)
                                         └──────────┘
                     S0/0 10.20.3.224/30 ╱            ╲ S0/1 10.20.3.228/30
              Niamey .225 · Zinder .226 ╱              ╲ Niamey .229 · Tahoua .230
                          ┌──────────┐                    ┌──────────┐
                          │ R-ZINDER │────────────────────│ R-TAHOUA │
                          └──────────┘ 10.20.3.232/30     └──────────┘
                LAN Zinder 10.20.3.0/25  Zinder .233 · Tahoua .234   LAN Tahoua 10.20.3.128/26</pre>`;

  App.registerModule({
    id: 's2', order: 2, label: 'Séance 2', short: 'Routage & NAT',
    title: 'Routage statique et dynamique, NAT/PAT, WAN',
    subtitle: 'Plus long préfixe, distance administrative, OSPF, NAT — Épreuve 2',
    icon: '🧭', color: '#0ea5e9', day: '2026-10-11', epreuve: 'Épreuve 2',
    intro: 'Comment un routeur choisit son chemin, comment écrire une route statique ou une configuration OSPF, comment publier un serveur derrière le NAT. Plus les liaisons WAN (HDLC, PPP) du cours de l\'ESTN.',

    pretest: [
      { type: 'qcm', q: 'Un routeur connaît 10.0.0.0/8 (statique) et 10.20.3.0/25 (OSPF). Pour 10.20.3.50, il utilise :', choices: ['la route OSPF /25', 'la route statique /8', 'les deux', 'la route par défaut'], a: 0, expl: 'Le plus long préfixe passe avant la distance administrative.' },
      { type: 'qcm', q: 'Quand un paquet traverse un routeur (sans NAT) :', choices: ['les MAC changent, les IP restent', 'les IP changent', 'rien ne change', 'le TTL augmente'], a: 0, expl: 'Nouvelle trame à chaque saut ; IP de bout en bout ; TTL − 1.' },
      { type: 'qcm', q: 'Le PAT permet :', choices: ['plusieurs IP privées derrière une seule IP publique', 'un chiffrement', 'le routage OSPF', 'de remplacer DHCP'], a: 0, expl: 'Les connexions sont distinguées par le numéro de port.' }
    ],

    lessons: [
      {
        title: 'Le voyage d\'un paquet', min: 6,
        essentiel: ul([
          'L\'hôte compare son réseau et celui de la destination (ET logique) : différent → il envoie à sa <b>passerelle</b>.',
          'Il fait un <b>ARP pour la MAC de la passerelle</b> (pas celle du serveur !).',
          'À chaque saut : <b>MAC changent, IP restent, TTL − 1</b>. TTL = 0 → paquet détruit + ICMP « Time Exceeded » (c\'est ce qu\'exploite traceroute).'
        ]),
        html: `
<p>Un PC de Zinder (10.20.3.10) envoie un paquet à un serveur de Niamey (10.20.0.50) :</p>
${stepper([
  `<p><b>1. Le PC décide.</b> 10.20.3.10/25 ET masque → 10.20.3.0 ; 10.20.0.50 ET le même masque → 10.20.0.0. Résultats différents → <b>autre réseau</b> → passer par la passerelle 10.20.3.1.</p>`,
  `<p><b>2. ARP de la passerelle.</b> Le PC demande « qui a 10.20.3.1 ? » (broadcast), R-ZINDER répond avec sa MAC.</p>${table(['Champ', 'Valeur'], [['MAC destination', '<b>MAC de R-ZINDER (G0/0)</b>'], ['MAC source', 'MAC du PC'], ['IP source', '10.20.3.10'], ['IP destination', '<b>10.20.0.50</b> (le serveur)'], ['TTL', '128']])}`,
  `<p><b>3. R-ZINDER route.</b> Il retire la trame, lit l'IP de destination, consulte sa table (route vers Niamey via 10.20.3.225), <b>décrémente le TTL</b> et crée une <b>nouvelle trame</b> sur la liaison série.</p>${table(['Champ', 'Valeur'], [['En-tête de couche 2', 'HDLC/PPP (plus de MAC Ethernet sur la série)'], ['IP source / destination', '10.20.3.10 → 10.20.0.50 (inchangées)'], ['TTL', '127']])}`,
  `<p><b>4. R-NIAMEY livre.</b> 10.20.0.0/23 est directement connecté : ARP pour la MAC du serveur, puis trame finale.</p>${table(['Champ', 'Valeur'], [['MAC destination', '<b>MAC du serveur</b>'], ['MAC source', 'MAC de R-NIAMEY (G0/0)'], ['IP', '10.20.3.10 → 10.20.0.50'], ['TTL', '126']])}`
], 'Zinder → Niamey, saut par saut')}
${key('<b>La phrase à écrire dans une copie</b> : « À chaque saut, les adresses MAC changent (nouvelle trame) ; les adresses IP source et destination restent identiques de bout en bout (sauf NAT). Le TTL diminue de 1 à chaque routeur ; à 0, le paquet est détruit et un ICMP Time Exceeded est renvoyé. »')}
${trap('Oublier la <b>route de retour</b> : un ping exige un chemin aller ET retour. Si R-NIAMEY ne sait pas joindre 10.20.3.0/25, la réponse est perdue.')}
`,
        check: [
          { type: 'qcm', q: 'Pour joindre un serveur distant, le PC fait un ARP pour :', choices: ['la MAC de sa passerelle', 'la MAC du serveur', 'la MAC du DNS', 'rien, il connaît déjà'], a: 0, expl: 'La destination n\'est pas sur son réseau : il envoie la trame à la passerelle.' },
          { type: 'tf', q: 'Le TTL augmente de 1 à chaque routeur traversé.', a: false, expl: 'Il diminue de 1. À 0, le paquet est détruit.' }
        ]
      },
      {
        title: 'Lire une table de routage', min: 5,
        essentiel: ul([
          'Sources : <b>C</b> connectée (+ <b>L</b> = IP de l\'interface en /32), <b>S</b> statique (<b>S*</b> par défaut), <b>R</b> RIP, <b>O</b> OSPF, <b>D</b> EIGRP, <b>B</b> BGP.',
          '<b>[110/65]</b> = [distance administrative / métrique].',
          'Route par défaut <b>0.0.0.0/0</b> : « tout ce que je ne connais pas, envoie-le là ».'
        ]),
        html: `
${table(['Source', 'Code Cisco', 'Explication'], [
  ['Réseau directement connecté', 'C (+ L)', 'Ajoutée automatiquement quand une interface a une IP et est active (up/up). L = l\'IP de l\'interface en /32.'],
  ['Route statique', 'S (S* = défaut)', 'Écrite à la main. Simple, sûre, mais ne s\'adapte pas aux pannes.'],
  ['Route dynamique', 'R, O, D, B', 'Apprise automatiquement (RIP, OSPF, EIGRP, BGP).']
])}
${ex(`<span class="mono">O 10.20.3.0/25 [110/65] via 10.20.3.226, 00:12:40, Serial0/0</span><br>
<b>O</b> = appris par OSPF · <b>10.20.3.0/25</b> = réseau de destination · <b>[110/65]</b> = [AD / métrique] · <b>via</b> = saut suivant · <b>00:12:40</b> = âge · <b>Serial0/0</b> = interface de sortie.`, 'Lire une ligne')}
${why('Pourquoi 65 ? Coût OSPF du T1 = 10<sup>8</sup> / 1 544 000 ≈ 64 (partie entière) + coût du LAN distant FastEthernet = 1 → <b>65</b>.')}
${code(`R-NIAMEY# show ip route
S*  0.0.0.0/0 [1/0] via 203.0.113.1
S   10.0.0.0/8 [1/0] via 10.20.3.230
C   10.20.0.0/23 is directly connected, GigabitEthernet0/0
L   10.20.0.1/32 is directly connected, GigabitEthernet0/0
O   10.20.3.0/25 [110/65] via 10.20.3.226, Serial0/0`)}
`,
        check: [
          { type: 'qcm', q: 'Dans une table Cisco, le code « L » désigne :', choices: ['l\'adresse de l\'interface locale en /32', 'une route apprise par LSA', 'une route de secours', 'une route BGP'], a: 0, expl: 'L = Local.' },
          { type: 'input', q: 'Dans [110/65], que vaut la distance administrative ?', fields: [{ kind: 'num', a: 110 }], expl: '110 = OSPF ; 65 = coût.' }
        ]
      },
      {
        title: 'Comment le routeur choisit : les 3 règles', min: 6,
        essentiel: steps([
          '<b>Plus long préfixe</b> : parmi les routes qui contiennent la destination, la plus précise gagne (/26 bat /24 bat /8 bat /0). Toujours en premier.',
          'À préfixe identique : la plus petite <b>distance administrative</b> (confiance dans la source).',
          'Même protocole, même préfixe : la plus petite <b>métrique</b>. Égalité → partage de charge (ECMP).'
        ]),
        html: `
${table(['Source', 'AD'], [['Connectée', '0'], ['Statique', '1'], ['Résumé EIGRP', '5'], ['eBGP (externe)', '20'], ['EIGRP (interne)', '90'], ['IGRP', '100'], ['OSPF', '110'], ['IS-IS', '115'], ['RIP', '120'], ['EIGRP externe', '170'], ['iBGP (interne)', '200'], ['Inconnue / inutilisable', '255']])}
${mnemo('« 0 – 1 – 20 – 90 – 110 – 120 » : connectée, statique, eBGP, EIGRP, OSPF, RIP.')}
${fix('Dans le support « Éléments de base de la conception d\'un réseau IP », le tableau des distances administratives indique « BGP interne : 90 ». C\'est une coquille : <b>90 = EIGRP interne</b> ; le BGP interne (iBGP) vaut <b>200</b>.')}
${ex(`Un routeur apprend 192.168.50.0/24 par RIP, OSPF, EIGRP et une statique → la <b>statique</b> (AD 1). Sans elle : EIGRP (90 &lt; 110 &lt; 120).<br>
Il apprend aussi 192.168.50.0/25 par RIP : pour 192.168.50.10, la /25 RIP est choisie <b>malgré son AD de 120</b> (plus long préfixe) ; pour 192.168.50.200 (hors /25) → la /24 statique.`)}
${w('ipviz', { ip: '192.168.50.10/25' })}
${trap('Choisir la route avec la meilleure AD alors qu\'une autre a un préfixe plus long → faux : le préfixe passe avant l\'AD.')}
`,
        check: [
          { type: 'qcm', q: 'AD d\'OSPF :', choices: ['90', '100', '110', '120'], a: 2, noShuffle: true, expl: 'OSPF = 110.' },
          { type: 'qcm', q: 'Route RIP /25 et route statique /24 contenant toutes deux la destination :', choices: ['la /25 RIP', 'la /24 statique', 'partage de charge', 'aucune'], a: 0, expl: 'Plus long préfixe d\'abord.' },
          { type: 'order', q: 'Range dans l\'ordre de préférence (AD croissante) :', items: ['Connectée', 'Statique', 'EIGRP', 'OSPF', 'RIP'], expl: '0, 1, 90, 110, 120.' }
        ]
      },
      {
        title: 'Le routage statique', min: 7,
        essentiel: ul([
          '<code>ip route &lt;réseau&gt; &lt;masque&gt; &lt;saut suivant | interface&gt; [AD]</code>',
          '4 types : <b>standard</b>, <b>par défaut</b> (0.0.0.0 0.0.0.0), <b>récapitulative</b> (résumé CIDR), <b>flottante</b> (AD plus grande = secours).',
          'Idéal : petit réseau, réseau d\'extrémité (stub), route par défaut vers le FAI.'
        ]),
        html: `
${code(`ip route 10.20.3.128 255.255.255.192 10.20.3.234   ! standard
ip route 0.0.0.0 0.0.0.0 203.0.113.1                ! par défaut
ip route 172.16.8.0 255.255.252.0 10.20.3.226       ! récapitulative (/22)
ip route 10.20.3.0 255.255.255.128 10.20.3.230 120  ! flottante (secours d'OSPF 110)`)}
${table(['', 'Statique', 'Dynamique'], [
  ['+', 'Aucune charge CPU ni bande passante ; sûre, prévisible', 'S\'adapte seul aux pannes ; indispensable dans un grand réseau'],
  ['−', 'Ne réagit pas aux pannes ; lourde à maintenir', 'Consomme CPU, RAM, bande passante ; plus complexe à sécuriser'],
  ['Idéal', 'Petit réseau, réseau stub, route par défaut', 'Plusieurs sites interconnectés avec redondance']
])}
${key('<b>Route flottante</b> = route de secours : on lui donne une AD <b>plus grande</b> que la route principale. Elle n\'apparaît dans la table que si la principale disparaît.')}
${ex(`R-ZINDER sans protocole dynamique, deux commandes suffisent :
${code(`ip route 10.20.3.128 255.255.255.192 10.20.3.234   ! LAN Tahoua par le lien direct
ip route 0.0.0.0 0.0.0.0 10.20.3.225                ! tout le reste via Niamey`)}
Le LAN de Zinder et les deux WAN sont directement connectés. La route par défaut couvre Niamey, la DMZ et Internet. Seul le LAN de Tahoua part ailleurs, d'où une route plus précise (/26) qui bat /0.`, 'Configuration minimale')}
${trap('Si le lien Zinder–Niamey tombe, les routes statiques ne réagissent pas : tout le trafic est perdu. Parade : route par défaut <b>flottante</b> via Tahoua (<code>ip route 0.0.0.0 0.0.0.0 10.20.3.234 10</code>) ou mieux, OSPF.')}
${trap('Route flottante avec une AD plus <b>petite</b> que la principale → elle devient la principale !')}
`,
        check: [
          { type: 'input', q: 'Écris la route par défaut vers 203.0.113.1.', fields: [{ kind: 'code', ci: true, a: ['ip route 0.0.0.0 0.0.0.0 203.0.113.1'], wide: true, ph: 'ip route …' }], expl: '<code>ip route 0.0.0.0 0.0.0.0 203.0.113.1</code>' },
          { type: 'qcm', q: 'Route OSPF principale (AD 110). Quelle AD pour une statique de secours ?', choices: ['120', '1', '90', '110'], a: 0, expl: 'Toute AD > 110 convient (souvent 120, 150 ou 200).' }
        ]
      },
      {
        title: 'Routage dynamique : les deux familles', min: 7,
        essentiel: ul([
          '<b>AS</b> = ensemble de réseaux sous une même politique (un FAI). <b>IGP</b> dans un AS (RIP, OSPF, IS-IS, EIGRP) · <b>EGP</b> entre AS (BGP).',
          '<b>Vecteur de distance</b> (RIP, Bellman-Ford) : « routage par rumeur », chacun ne connaît que ce que disent ses voisins.',
          '<b>État de liens</b> (OSPF, IS-IS ; Dijkstra) : chacun reçoit tous les liens (LSA), construit la carte (LSDB) et calcule ses chemins.'
        ]),
        html: `
${table(['', 'RIPv2', 'OSPF', 'EIGRP', 'BGP'], [
  ['Famille', 'Vecteur de distance', 'État de liens', 'Vecteur de distance avancé (« hybride »)', 'Vecteur de chemins'],
  ['Usage', 'IGP', 'IGP', 'IGP', 'EGP (Internet)'],
  ['Métrique', 'Sauts (max 15 ; 16 = inaccessible)', 'Coût = 10<sup>8</sup> / débit', 'Bande passante + délai', 'Attributs (AS_PATH…)'],
  ['Algorithme', 'Bellman-Ford', 'Dijkstra (SPF)', 'DUAL', 'Sélection par attributs'],
  ['Mises à jour', 'Toute la table toutes les 30 s (224.0.0.9)', 'Sur changement (LSA) ; hello 224.0.0.5 / .6', 'Partielles, sur changement', 'Sur changement, TCP 179'],
  ['AD', '120', '110', '90', '20 / 200'],
  ['Convergence', 'Lente', 'Rapide', 'Très rapide', 'Lente (volontairement stable)'],
  ['Standard', 'Ouvert', 'Ouvert (RFC 2328)', 'Cisco à l\'origine', 'Ouvert']
])}
<p>Comparatif du cours ESTN :</p>
${table(['', 'RIPv1', 'RIPv2', 'IGRP', 'EIGRP', 'OSPF', 'IS-IS'], [
  ['Convergence', 'Lente', 'Lente', 'Lente', 'Rapide', 'Rapide', 'Rapide'],
  ['Évolutivité', 'Faible', 'Faible', 'Faible', 'Élevée', 'Élevée', 'Élevée'],
  ['VLSM', 'Non', 'Oui', 'Non', 'Oui', 'Oui', 'Oui'],
  ['Ressources', 'Faible', 'Faible', 'Faible', 'Moyenne', 'Élevée', 'Élevée'],
  ['Mise en œuvre', 'Simple', 'Simple', 'Simple', 'Complexe', 'Complexe', 'Complexe']
])}
${fix('Le support « Routage dynamique » écrit « RIP (Router Information Protocol) » et « EIGRP (Enherence Interior Gateway Protocol) ». Les noms exacts sont <b>Routing Information Protocol</b> et <b>Enhanced Interior Gateway Routing Protocol</b>.')}
<h3>Les anti-boucles de RIP (question de cours)</h3>
${ul(['<b>Split horizon</b> : ne pas réannoncer une route par l\'interface d\'où on l\'a apprise.', '<b>Route poisoning</b> : annoncer une route morte avec une métrique de 16.', '<b>Poison reverse</b>, <b>hold-down timers</b>, <b>mises à jour déclenchées</b>.', '<b>Maximum 15 sauts</b> : stoppe le « comptage à l\'infini ».'])}
${trap('Croire que RIP choisit le lien le plus rapide : il compte uniquement les sauts. 2 sauts en 64 kbit/s battent 3 sauts en fibre. OSPF (coût) ou EIGRP (bande passante + délai) corrigent ce défaut.')}
`,
        check: [
          { type: 'qcm', q: 'Algorithme d\'OSPF :', choices: ['Bellman-Ford', 'DUAL', 'Dijkstra', 'Spanning Tree'], a: 2, noShuffle: true, expl: 'SPF de Dijkstra.' },
          { type: 'qcm', q: 'Protocole utilisé entre opérateurs sur Internet :', choices: ['OSPF', 'EIGRP', 'BGP', 'RIP'], a: 2, noShuffle: true, expl: 'BGP, le seul EGP.' },
          { type: 'qcm', q: 'Pour RIP, une métrique de 16 signifie :', choices: ['16 sauts', 'réseau inaccessible', 'lien lent', 'route par défaut'], a: 1, noShuffle: true, expl: 'Infini pour RIP.' }
        ]
      },
      {
        title: 'OSPF : les détails qui font la différence', min: 9,
        essentiel: ul([
          '<b>Coût = 10<sup>8</sup> / débit</b> : FastEthernet 1 · Ethernet 10 · E1 48 · T1 64. Coût d\'un chemin = somme des interfaces de sortie.',
          '<b>DR/BDR</b> : plus haute priorité (défaut 1, 0 = jamais élu), puis plus haut Router-ID. Pas de préemption.',
          'Voisins : mêmes <b>aire, hello/dead (10/40 s), sous-réseau/masque, authentification, type d\'aire</b> ; même <b>MTU</b> pour l\'état Full.'
        ]),
        html: `
${f(`Coût = ${frac('10<sup>8</sup>', 'débit (bit/s)')} &nbsp;&nbsp; T1 : ${frac('100 000 000', '1 544 000')} ≈ <b class="hl">64</b>`, 'bande passante de référence 100 Mbit/s')}
${trap('GigabitEthernet a aussi un coût de 1 (comme FastEthernet) : OSPF ne les distingue pas → <code>auto-cost reference-bandwidth 10000</code>.')}
${ex(`Niamey–Tahoua en E1 (48) ; Niamey–Zinder et Zinder–Tahoua en fibre 100 Mbit/s (1) ; LAN Tahoua FastEthernet (1).<br>
Direct : 48 + 1 = <b>49</b> · Via Zinder : 1 + 1 + 1 = <b>3</b> → OSPF passe par Zinder, même avec un saut de plus. RIP aurait pris le lien direct.`, 'Calcul de chemin')}
<h3>Élection DR / BDR</h3>
${ex('R1 prio 1, RID 1.1.1.1 · R2 prio 1, RID 2.2.2.2 · R3 prio 0 · R4 prio 10, RID 0.0.0.4 → <b>DR = R4</b> (priorité 10) · <b>BDR = R2</b> (égalité de priorité avec R1, plus haut RID) · R3 (priorité 0) ne peut jamais être élu (DROTHER).')}
<h3>Router-ID, aires, états</h3>
${ul([
  '<b>Router-ID</b> : (1) commande <code>router-id</code> ; sinon (2) plus haute IP de loopback ; sinon (3) plus haute IP d\'interface active.',
  '<b>Aire 0</b> (backbone) obligatoire ; les autres aires s\'y connectent. <b>ABR</b> = entre deux aires ; <b>ASBR</b> = injecte des routes externes.',
  'États : Down → Init → 2-Way → ExStart → Exchange → Loading → <b>Full</b>.',
  'OSPF est un protocole IP n° <b>89</b> (ni TCP ni UDP). Multicast 224.0.0.5 (tous les routeurs OSPF) et 224.0.0.6 (DR/BDR).'
])}
${code(`router ospf 1
 router-id 1.1.1.1
 network 10.20.0.0 0.0.1.255 area 0
 network 10.20.3.224 0.0.0.3 area 0
 passive-interface g0/0           ! pas de hello vers les PC
 default-information originate    ! diffuse la route par défaut`)}
${reflex('Deux voisins bloqués ? Cite : aires différentes · timers différents · sous-réseau/masque différent · authentification · Router-ID en double · type d\'aire (stub) · interface passive · ACL bloquant le protocole 89 · MTU différent (bloque en ExStart/Exchange).')}
`,
        check: [
          { type: 'input', q: 'Coût OSPF d\'une interface E1 (2,048 Mbit/s) ?', fields: [{ kind: 'num', a: 48 }], expl: '10<sup>8</sup> / 2 048 000 ≈ 48,8 → 48.' },
          { type: 'qcm', q: 'Intervalle hello OSPF par défaut sur Ethernet :', choices: ['5 s', '10 s', '30 s', '40 s'], a: 1, noShuffle: true, expl: 'Hello 10 s, dead 40 s.' },
          { type: 'qcm', q: 'Un routeur OSPF de priorité 0 :', choices: ['ne peut jamais être DR ni BDR', 'est toujours DR', 'est BDR', 'n\'envoie pas de hello'], a: 0, expl: 'Priorité 0 = DROTHER.' }
        ]
      },
      {
        title: 'Configurer RIP et EIGRP (cours ESTN)', min: 5,
        essentiel: ul([
          'RIP : <code>router rip</code> · <code>version 2</code> · <code>no auto-summary</code> · <code>network</code> (réseau par classe).',
          'EIGRP : <code>router eigrp &lt;n° AS&gt;</code> (identique sur tous les routeurs) · <code>network &lt;réseau&gt; &lt;wildcard&gt;</code>.',
          'EIGRP utilise l\'algorithme <b>DUAL</b> (Cisco) ; métrique = bande passante + délai ; AD 90.'
        ]),
        html: `
${code(`! RIPv2
router rip
 version 2
 no auto-summary            ! sinon résumé par classe (problème avec VLSM)
 network 10.0.0.0
 passive-interface g0/0

! EIGRP (n° de système autonome 100)
router eigrp 100
 eigrp router-id 2.2.2.2
 network 10.20.3.0 0.0.0.127      ! wildcard : seulement ce sous-réseau
 network 10.20.3.224 0.0.0.3
 no auto-summary`)}
<p>Comme le rappelle le cours, la commande <code>network</code> active le protocole sur chaque interface dont l'adresse correspond, et y annonce le réseau. Le <b>wildcard</b> permet de ne retenir qu'un sous-réseau précis.</p>
${tip('EIGRP : le meilleur chemin s\'appelle le <b>successeur</b> ; un chemin de secours sans boucle déjà calculé = <b>successeur réalisable</b> (feasible successor). D\'où sa convergence très rapide.')}
${code(`show ip protocols          ! protocoles actifs, réseaux annoncés
show ip ospf neighbor      ! voisins OSPF et leur état
show ip eigrp neighbors
show ip route ospf`)}
`,
        check: [
          { type: 'qcm', q: 'Pourquoi <code>no auto-summary</code> en RIPv2 ?', choices: ['pour éviter le résumé automatique par classe, incompatible avec VLSM', 'pour chiffrer les mises à jour', 'pour passer en OSPF', 'pour réduire le TTL'], a: 0, expl: 'Sinon 10.20.3.0/25 et 10.20.0.0/23 seraient annoncés comme 10.0.0.0/8.' },
          { type: 'qcm', q: 'Algorithme d\'EIGRP :', choices: ['DUAL', 'Dijkstra', 'Bellman-Ford pur', 'STP'], a: 0, expl: 'Diffusing Update Algorithm.' }
        ]
      },
      {
        title: 'NAT et PAT', min: 9,
        essentiel: ul([
          'Les adresses privées ne sont pas routées sur Internet : le <b>NAT</b> remplace l\'IP privée par une publique en sortie, et fait l\'inverse au retour.',
          '<b>Statique</b> 1 ↔ 1 (publier un serveur) · <b>dynamique</b> N → pool · <b>PAT (overload)</b> N → 1 IP, distinguées par le <b>port</b>.',
          'Termes : <b>inside local</b> (IP privée) · <b>inside global</b> (IP publique qui la représente) · <b>outside global</b> (IP du serveur externe).'
        ]),
        html: `
<h3>Comment ça marche (exemple du cours)</h3>
${steps([
  'PC1 (192.168.10.10) envoie un paquet au serveur web 209.165.201.1.',
  'R2 lit l\'IP source et voit qu\'elle doit être traduite.',
  'R2 ajoute à sa table NAT : 192.168.10.10 ↔ 209.165.200.226.',
  'R2 envoie le paquet avec la source traduite.',
  'Le serveur répond à 209.165.200.226.',
  'R2 retrouve l\'entrée dans sa table et retraduit vers 192.168.10.10.'
])}
${table(['Terme Cisco', 'Signification', 'Exemple'], [
  ['Inside local', 'IP privée du poste interne (vue de l\'intérieur)', '10.20.0.25'],
  ['Inside global', 'IP publique qui représente le poste', '203.0.113.2'],
  ['Outside global', 'IP publique réelle du serveur externe', '196.200.1.10'],
  ['Outside local', 'Comment l\'interne voit l\'externe (souvent = outside global)', '196.200.1.10']
])}
${code(`! PAT : tout le bloc derrière l'IP de G0/2
access-list 1 permit 10.20.0.0 0.0.3.255
ip nat inside source list 1 interface GigabitEthernet0/2 overload

! NAT statique : publier le serveur web de la DMZ
ip nat inside source static 10.20.3.194 203.0.113.5

! Redirection de port (NAT statique avec port)
ip nat inside source static tcp 10.20.3.194 443 203.0.113.2 443

! NAT dynamique : pool d'adresses publiques
ip nat pool POOL1 209.165.200.226 209.165.200.240 netmask 255.255.255.224
ip nat inside source list 1 pool POOL1

! Rôles des interfaces : indispensable !
interface range g0/0 - 1 , g0/3 , s0/0 - 1
 ip nat inside
interface g0/2
 ip nat outside

show ip nat translations
clear ip nat translation *`)}
${fix('Dans le corrigé de l\'exercice 6 du plan (séance 2), seules <code>g0/0 - 1</code> et <code>g0/3</code> sont déclarées <code>ip nat inside</code>. Or le trafic des LAN de <b>Zinder et Tahoua arrive par S0/0 et S0/1</b> : sans <code>ip nat inside</code> sur ces interfaces, il n\'est <b>pas traduit</b> et ces sites n\'ont pas Internet. Il faut ajouter <code>s0/0 - 1</code>, comme ci-dessus.', 'Correction du plan de révision')}
${ex('Traduction : <span class="mono">10.20.0.25:51000 → 196.200.1.10:443</span> devient <span class="mono">203.0.113.2:51000 → 196.200.1.10:443</span>.<br>Inside local = 10.20.0.25 · inside global = 203.0.113.2 · outside global = 196.200.1.10.')}
${why('Combien de connexions avec une seule IP publique en PAT ? Le port est sur 16 bits → 65 536 valeurs par IP et par protocole (environ 64 000 utilisables). C\'est le couple IP publique + port qui distingue chaque connexion.')}
${trap('Oublier <code>ip nat inside</code> / <code>ip nat outside</code> sur les interfaces → aucune traduction. Et l\'ACL du NAT s\'écrit avec un <b>wildcard</b>.')}
`,
        check: [
          { type: 'match', q: 'Dans <span class="mono">10.20.0.25 → 196.200.1.10</span> traduit en <span class="mono">203.0.113.2</span>, associe :', pairs: [['Inside local', '10.20.0.25'], ['Inside global', '203.0.113.2'], ['Outside global', '196.200.1.10']], expl: 'Inside = notre poste ; local = vu de l\'intérieur ; global = vu d\'Internet.' },
          { type: 'qcm', q: 'Pour publier un serveur web interne sur une IP publique fixe :', choices: ['NAT statique', 'PAT', 'NAT dynamique', 'DHCP'], a: 0, expl: '1 ↔ 1 permanent.' },
          { type: 'qcm', q: 'Mot-clé qui transforme le NAT en PAT :', choices: ['overload', 'static', 'pool', 'inside'], a: 0, expl: 'overload = surcharge d\'une IP avec plusieurs ports.' }
        ]
      },
      {
        title: 'Réseaux étendus : HDLC et PPP (cours ESTN)', min: 8,
        essentiel: ul([
          'Le <b>WAN</b> couvre un pays ou plus ; il opère surtout en couches <b>1 et 2</b>. Connexions : lignes louées (E1 2,048 / T1 1,544 Mbit/s), commutation de circuits (RNIS), de paquets (Frame Relay, ATM, X.25).',
          '<b>DTE</b> = le routeur ; <b>DCE</b> = le modem / CSU-DSU, qui fournit l\'horloge (<code>clock rate</code>).',
          '<b>HDLC</b> (trames I, S, U ; fanion 01111110) · <b>PPP</b> = tramage type HDLC + <b>LCP</b> (lien) + <b>NCP</b> (couche 3) + authentification <b>PAP / CHAP</b>.'
        ]),
        html: `
${table(['Type de connexion', 'Exemples', 'Caractéristique'], [
  ['Ligne louée (point à point)', 'E1 = 2,048 Mbit/s, T1 = 1,544 Mbit/s', 'Dédiée, coûteuse, débit garanti'],
  ['Commutation de circuits', 'Modem RTC, RNIS (ISDN)', 'Circuit établi pour la durée de l\'appel'],
  ['Commutation de paquets', 'Frame Relay, ATM, X.25 (et aujourd\'hui MPLS)', 'Ressources partagées'],
  ['Accès Internet public', 'DSL, satellite, 4G + VPN', 'Peu coûteux, à sécuriser (IPsec)']
])}
<h3>Couche physique : DTE, DCE et normes séries</h3>
${ul([
  '<b>DTE</b> (Data Terminal Equipment) : le routeur local. <b>DCE</b> (Data Communication Equipment) : le modem CSU/DSU côté opérateur.',
  'En labo, sur un câble série dos à dos, c\'est le côté DCE qui donne l\'horloge : <code>clock rate 64000</code>.',
  'Normes de câbles WAN : EIA/TIA-232 (RS-232), EIA/TIA-449, V.24, <b>V.35</b> (routeurs ↔ CSU/DSU, synchrone haut débit), V.21, G.703, EIA-530, <b>HSSI</b> (jusqu\'à 52 Mbit/s, lignes T3).',
  'Le multiplexage temporel (<b>TDM</b>) partage une liaison en tranches de temps : SDH (STM-1 155 Mbit/s → STM-4 622 → STM-16 2,5 G → STM-64 10 G) ou SONET ; le <b>WDM</b> multiplexe des longueurs d\'onde.'
])}
<h3>HDLC</h3>
${table(['Fanion', 'Adresse', 'Contrôle', 'Données', 'FCS', 'Fanion'], [['01111110', '1 octet', 'trame I, S ou U', 'variable', '16 ou 32 bits', '01111110']])}
${ul(['<b>Trame I</b> (information) : transporte les données de couche supérieure + du contrôle.', '<b>Trame S</b> (supervision) : acquittements, demande/suspension d\'émission.', '<b>Trame U</b> (non numérotée) : contrôle de la liaison.'])}
${tip('Sur les routeurs Cisco, l\'encapsulation série par défaut est le <b>HDLC Cisco</b> (propriétaire). Entre deux constructeurs différents, on utilise <b>PPP</b>.')}
<h3>PPP</h3>
${ul([
  'Tramage proche de HDLC (adresse 11111111, contrôle 00000011) pour le multiprotocole point à point.',
  '<b>LCP</b> (Link Control Protocol) : établit, configure, teste la liaison (taille des paquets, erreurs de configuration, fin de liaison, qualité).',
  '<b>NCP</b> (Network Control Protocols) : négocie les protocoles de couche 3 (IPCP pour IPv4, IPv6CP…).',
  'Authentification : <b>PAP</b> (mot de passe en clair, 2 échanges) ou <b>CHAP</b> (défi-réponse haché, répété périodiquement : préférable).',
  'Fonctionne sur série synchrone ou asynchrone, HSSI, RNIS ; <b>PPTP</b> (Microsoft) = PPP encapsulé dans IP.'
])}
${code(`R-ZINDER(config)# username R-NIAMEY password M0tCommun
R-ZINDER(config)# interface s0/0
R-ZINDER(config-if)# encapsulation ppp
R-ZINDER(config-if)# ppp authentication chap
R-ZINDER# show interfaces s0/0     ! "Encapsulation PPP, LCP Open"`)}
${trap('PAP envoie le mot de passe <b>en clair</b> ; CHAP n\'envoie jamais le mot de passe (seulement un hachage du défi).')}
`,
        check: [
          { type: 'qcm', q: 'Sur une liaison série, qui fournit l\'horloge ?', choices: ['Le DCE', 'Le DTE', 'Les deux', 'Le serveur DHCP'], a: 0, expl: 'Le DCE (modem / CSU-DSU).' },
          { type: 'qcm', q: 'Sous-protocole PPP qui négocie la couche 3 :', choices: ['NCP', 'LCP', 'CHAP', 'HDLC'], a: 0, expl: 'NCP (IPCP pour IPv4).' },
          { type: 'qcm', q: 'Authentification PPP la plus sûre :', choices: ['CHAP', 'PAP', 'Telnet', 'Aucune'], a: 0, expl: 'Défi-réponse, mot de passe jamais transmis.' }
        ]
      }
    ],

    cards: [
      { front: 'Les 3 règles de choix d\'une route, dans l\'ordre ?', back: '1) plus long préfixe 2) plus petite AD 3) plus petite métrique' },
      { front: 'AD : connectée, statique, eBGP, EIGRP, OSPF, IS-IS, RIP, iBGP ?', back: '<b>0 · 1 · 20 · 90 · 110 · 115 · 120 · 200</b>' },
      { front: 'À chaque saut, qu\'est-ce qui change ?', back: 'Les <b>MAC</b> changent, les <b>IP</b> restent, le <b>TTL</b> baisse de 1' },
      { front: 'TTL = 0 ?', back: 'Paquet détruit + ICMP <b>Time Exceeded</b> (utilisé par traceroute)' },
      { front: 'Codes Cisco C, L, S, S*, R, O, D, B ?', back: 'connectée, locale /32, statique, défaut, RIP, OSPF, EIGRP, BGP' },
      { front: 'Que signifie [110/65] ?', back: '[distance administrative / métrique]' },
      { front: 'Syntaxe d\'une route statique ?', back: '<code>ip route réseau masque saut-suivant|interface [AD]</code>' },
      { front: 'Route statique flottante ?', back: 'Route de secours avec une AD <b>plus grande</b> que la principale' },
      { front: '4 types de routes statiques (cours) ?', back: 'standard · par défaut · récapitulative · flottante' },
      { front: 'IGP vs EGP ?', back: 'IGP : dans un AS (RIP, OSPF, IS-IS, EIGRP) · EGP : entre AS (BGP)' },
      { front: 'Vecteur de distance vs état de liens ?', back: 'VD : connaît ce que disent les voisins (rumeur) · EL : carte complète (LSDB), calcule avec Dijkstra' },
      { front: 'RIP : métrique, max, AD, mises à jour ?', back: 'Sauts · max 15 (16 = inaccessible) · AD 120 · table entière toutes les 30 s' },
      { front: 'Anti-boucles de RIP ?', back: 'split horizon, route poisoning, poison reverse, hold-down, max 15 sauts' },
      { front: 'Coût OSPF : formule et valeurs FE, E1, T1 ?', back: '10<sup>8</sup>/débit → FastEthernet 1 · E1 48 · T1 64 · Ethernet 10' },
      { front: 'OSPF : élection DR ?', back: 'Plus haute priorité (défaut 1, 0 = jamais) puis plus haut Router-ID ; pas de préemption' },
      { front: 'OSPF : timers par défaut Ethernet ?', back: 'Hello <b>10 s</b> · Dead <b>40 s</b>' },
      { front: 'OSPF : choix du Router-ID ?', back: 'router-id → plus haute IP de loopback → plus haute IP d\'interface active' },
      { front: 'OSPF : conditions pour être voisins ?', back: 'même aire, timers, sous-réseau/masque, authentification, type d\'aire ; même MTU pour Full' },
      { front: 'OSPF : états du voisinage ?', back: 'Down → Init → 2-Way → ExStart → Exchange → Loading → Full' },
      { front: 'OSPF : n° de protocole et multicast ?', back: 'IP <b>89</b> · 224.0.0.5 (tous) · 224.0.0.6 (DR/BDR)' },
      { front: 'BGP : transport et port ?', back: '<b>TCP 179</b>' },
      { front: 'EIGRP : algorithme, métrique, AD ?', back: '<b>DUAL</b> · bande passante + délai · AD <b>90</b>' },
      { front: 'NAT statique, dynamique, PAT ?', back: '1↔1 (serveur) · N → pool · N → 1 IP + ports (overload)' },
      { front: 'Inside local / inside global / outside global ?', back: 'IP privée du poste · IP publique qui le représente · IP publique du serveur externe' },
      { front: 'Commande PAT sur l\'interface G0/2 ?', back: '<code>ip nat inside source list 1 interface g0/2 overload</code>' },
      { front: 'Commande pour voir la table NAT ?', back: '<code>show ip nat translations</code>' },
      { front: 'Redirection de port (cours) ?', back: 'NAT statique avec un port TCP/UDP précis : <code>ip nat inside source static tcp 10.0.0.5 80 203.0.113.2 80</code>' },
      { front: 'DTE / DCE ?', back: 'DTE = routeur · DCE = modem CSU/DSU (fournit l\'horloge, <code>clock rate</code>)' },
      { front: 'PPP : LCP et NCP ?', back: 'LCP : établit/teste la liaison · NCP : négocie la couche 3 (IPCP…)' },
      { front: 'PAP vs CHAP ?', back: 'PAP : mot de passe en clair · CHAP : défi-réponse haché, périodique (sûr)' },
      { front: 'Trames HDLC I, S, U ?', back: 'Information · Supervision (acquittements) · non numérotée (contrôle)' },
      { front: 'Débits E1 et T1 ?', back: 'E1 = <b>2,048 Mbit/s</b> · T1 = <b>1,544 Mbit/s</b>' }
    ],

    qcm: [
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'AD d\'OSPF :', choices: ['90', '100', '110', '120'], a: 2, noShuffle: true, expl: '110.' },
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'Pour RIP, une métrique de 16 signifie :', choices: ['16 sauts', 'réseau inaccessible', 'lien lent', 'route par défaut'], a: 1, noShuffle: true, expl: 'Infini.' },
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'Protocole utilisé entre opérateurs sur Internet :', choices: ['OSPF', 'EIGRP', 'BGP', 'RIP'], a: 2, noShuffle: true, expl: 'BGP.' },
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'Algorithme d\'OSPF :', choices: ['Bellman-Ford', 'DUAL', 'Dijkstra', 'Spanning Tree'], a: 2, noShuffle: true, expl: 'Dijkstra (SPF).' },
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'BGP utilise :', choices: ['UDP 520', 'TCP 179', 'IP 89', 'UDP 179'], a: 1, noShuffle: true, expl: 'TCP 179. (UDP 520 = RIP, IP 89 = OSPF.)' },
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'Commande Cisco pour afficher la table de routage :', choices: ['show route', 'show ip route', 'display ip routing-table', 'route print'], a: 1, noShuffle: true, expl: 'show ip route (display… = Huawei, route print = Windows).' },
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'Quand un paquet traverse un routeur (sans NAT) :', choices: ['les IP changent', 'les MAC changent et le TTL baisse de 1', 'rien ne change', 'le TTL augmente'], a: 1, noShuffle: true, expl: 'Nouvelle trame, IP inchangées.' },
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'Intervalle hello OSPF par défaut sur Ethernet :', choices: ['5 s', '10 s', '30 s', '40 s'], a: 1, noShuffle: true, expl: 'Dead = 40 s.' },
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'Dans une table Cisco, le code « L » désigne :', choices: ['une route apprise par LSA', 'l\'adresse de l\'interface locale en /32', 'une route de secours', 'une route BGP'], a: 1, noShuffle: true, expl: 'Local.' },
      { type: 'qcm', src: 'Plan S2 · QCM', q: 'L\'aire OSPF obligatoire est :', choices: ['1', '0', '255', 'aucune'], a: 1, noShuffle: true, expl: 'Aire 0 (backbone).' },
      { type: 'qcm', q: 'Avec RIP, 2 sauts en 64 kbit/s contre 3 sauts en fibre :', choices: ['2 sauts choisi', '3 sauts choisi', 'partage de charge', 'aucun'], a: 0, expl: 'RIP ne compte que les sauts.' },
      { type: 'qcm', q: 'Une route statique /24 (AD 1) et une OSPF /24 (AD 110) vers le même réseau :', choices: ['la statique est installée', 'l\'OSPF est installée', 'les deux en partage de charge', 'aucune'], a: 0, expl: 'Même préfixe → plus petite AD.' },
      { type: 'qcm', q: 'Quel champ IP permet à traceroute de fonctionner ?', choices: ['TTL', 'ToS', 'Checksum', 'Fragment offset'], a: 0, expl: 'TTL = 1, 2, 3… → chaque routeur renvoie un Time Exceeded.' },
      { type: 'qcm', q: 'PAT : combien de ports par IP publique et par protocole ?', choices: ['65 536', '1 024', '256', 'illimité'], a: 0, expl: 'Port sur 16 bits.' },
      { type: 'qcm', q: 'L\'ACL d\'un NAT dynamique sert à :', choices: ['désigner les adresses à traduire', 'bloquer Internet', 'chiffrer', 'définir le pool'], a: 0, expl: 'access-list 1 permit… = « qui a le droit d\'être traduit ».' },
      { type: 'qcm', q: 'Encapsulation série par défaut d\'un routeur Cisco :', choices: ['HDLC Cisco', 'PPP', 'Frame Relay', 'Ethernet'], a: 0, expl: 'HDLC propriétaire Cisco.' },
      { type: 'qcm', q: 'Norme d\'interface série HSSI : débit maximal ?', choices: ['52 Mbit/s', '2 Mbit/s', '1 Gbit/s', '64 kbit/s'], a: 0, expl: 'Jusqu\'à 52 Mbit/s (lignes T3).' },
      { type: 'tf', q: 'Une route statique s\'adapte automatiquement à la panne d\'un lien.', a: false, expl: 'Non : il faut une route flottante ou un protocole dynamique.' },
      { type: 'tf', q: 'OSPF utilise TCP pour échanger ses LSA.', a: false, expl: 'OSPF est encapsulé directement dans IP (protocole 89).' },
      { type: 'match', q: 'Associe chaque protocole à sa métrique.', pairs: [['RIP', 'Nombre de sauts'], ['OSPF', 'Coût = 10⁸/débit'], ['EIGRP', 'Bande passante + délai'], ['BGP', 'Attributs (AS_PATH…)']], expl: 'Question de cours fréquente.' }
    ],

    exercises: [
      {
        title: 'Lire une table de routage (plus long préfixe)', min: 10, src: 'Plan S2 · Ex. 1',
        statement: `${topo}<p>Table de R-NIAMEY (extrait) :</p>${code(`S*  0.0.0.0/0 [1/0] via 203.0.113.1
S   10.0.0.0/8 [1/0] via 10.20.3.230
C   10.20.0.0/23 is directly connected, GigabitEthernet0/0
C   10.20.2.0/24 is directly connected, GigabitEthernet0/1
O   10.20.3.0/25 [110/65] via 10.20.3.226, Serial0/0
O   10.20.3.128/26 [110/65] via 10.20.3.230, Serial0/1
C   10.20.3.192/27 is directly connected, GigabitEthernet0/3`)}`,
        parts: [
          { q: 'a) Pour chaque destination, quelle route est utilisée ?', pts: 3, fields: [
            { label: '10.20.3.50', kind: 'select', opts: ['0.0.0.0/0', '10.0.0.0/8', '10.20.0.0/23', '10.20.2.0/24', '10.20.3.0/25', '10.20.3.128/26', '10.20.3.192/27'], a: 4 },
            { label: '10.20.3.140', kind: 'select', opts: ['0.0.0.0/0', '10.0.0.0/8', '10.20.0.0/23', '10.20.2.0/24', '10.20.3.0/25', '10.20.3.128/26', '10.20.3.192/27'], a: 5 },
            { label: '10.20.3.200', kind: 'select', opts: ['0.0.0.0/0', '10.0.0.0/8', '10.20.0.0/23', '10.20.2.0/24', '10.20.3.0/25', '10.20.3.128/26', '10.20.3.192/27'], a: 6 },
            { label: '10.20.4.10', kind: 'select', opts: ['0.0.0.0/0', '10.0.0.0/8', '10.20.0.0/23', '10.20.2.0/24', '10.20.3.0/25', '10.20.3.128/26', '10.20.3.192/27'], a: 1 },
            { label: '8.8.8.8', kind: 'select', opts: ['0.0.0.0/0', '10.0.0.0/8', '10.20.0.0/23', '10.20.2.0/24', '10.20.3.0/25', '10.20.3.128/26', '10.20.3.192/27'], a: 0 },
            { label: '10.20.1.77', kind: 'select', opts: ['0.0.0.0/0', '10.0.0.0/8', '10.20.0.0/23', '10.20.2.0/24', '10.20.3.0/25', '10.20.3.128/26', '10.20.3.192/27'], a: 2 }
          ], corr: table(['Destination', 'Route retenue', 'Sortie'], [['10.20.3.50', '10.20.3.0/25 (O)', 'via 10.20.3.226 → Zinder'], ['10.20.3.140', '10.20.3.128/26 (O)', 'via 10.20.3.230 → Tahoua'], ['10.20.3.200', '10.20.3.192/27 (C)', 'G0/3 (DMZ), livraison directe'], ['10.20.4.10', '10.0.0.0/8 (S)', 'via 10.20.3.230 → Tahoua — piège : pas Internet ! Tahoua ne connaît sans doute pas ce réseau → paquet perdu'], ['8.8.8.8', '0.0.0.0/0 (S*)', 'via 203.0.113.1 → FAI'], ['10.20.1.77', '10.20.0.0/23 (C)', 'G0/0 (10.20.0.0 → 10.20.1.255)']]) },
          { q: 'b) Que signifient les deux nombres de [110/65] ? Explique 65 (liaisons T1, LAN distants FastEthernet).', pts: 1, corr: '<p>110 = distance administrative d\'OSPF ; 65 = coût. T1 : 10<sup>8</sup> / 1 544 000 ≈ 64 + LAN FastEthernet 1 = <b>65</b>.</p>' }
        ]
      },
      {
        title: 'Distance administrative et route flottante', min: 7, src: 'Plan S2 · Ex. 2',
        statement: '<p>Un routeur apprend 192.168.50.0/24 de quatre façons : RIP, OSPF, EIGRP et une route statique.</p>',
        parts: [
          { q: 'a) Quelle route est installée ? Et si on supprime la statique ?', pts: 1, fields: [{ label: 'Installée', kind: 'select', opts: ['RIP', 'OSPF', 'EIGRP', 'Statique'], a: 3 }, { label: 'Sans la statique', kind: 'select', opts: ['RIP', 'OSPF', 'EIGRP'], a: 2 }], corr: '<p>La statique (AD 1). Sans elle : EIGRP (90 &lt; OSPF 110 &lt; RIP 120).</p>' },
          { q: 'b) Le routeur apprend aussi 192.168.50.0/25 par RIP. Vers où partent 192.168.50.10 et 192.168.50.200 ?', pts: 1, corr: '<p>192.168.50.10 ∈ /25 (0 à 127) → route RIP /25, malgré son AD de 120 (le plus long préfixe passe avant). 192.168.50.200 n\'est pas dans la /25 → route /24 (la statique).</p>' },
          { q: 'c) Sur R-NIAMEY, écris une route statique flottante de secours vers le LAN de Zinder (10.20.3.0/25) qui passe par Tahoua (10.20.3.230).', pts: 1, fields: [{ kind: 'code', ci: true, wide: true, a: ['ip route 10.20.3.0 255.255.255.128 10.20.3.230 120', 'ip route 10.20.3.0 255.255.255.128 10.20.3.230 150', 'ip route 10.20.3.0 255.255.255.128 10.20.3.230 200', 'ip route 10.20.3.0 255.255.255.128 10.20.3.230 130'], ph: 'ip route …' }], corr: '<p><code>ip route 10.20.3.0 255.255.255.128 10.20.3.230 120</code> — toute AD &gt; 110 convient (120, 150, 200). Avec une AD ≤ 110, elle remplacerait la route OSPF.</p>' }
        ]
      },
      {
        title: 'Configuration statique de R-ZINDER', min: 8, src: 'Plan S2 · Ex. 3',
        statement: `${topo}<p>R-ZINDER n'utilise aucun protocole dynamique. Il doit joindre tous les réseaux du Ministère et Internet ; le trafic vers Niamey et Internet passe par 10.20.3.225, le trafic vers le LAN de Tahoua par le lien direct (10.20.3.234).</p>`,
        parts: [
          { q: 'a) Écris le nombre minimal de commandes ip route. Justifie.', pts: 2, corr: `${code(`ip route 10.20.3.128 255.255.255.192 10.20.3.234
ip route 0.0.0.0 0.0.0.0 10.20.3.225`)}<p>Le LAN de Zinder et les deux WAN sont directement connectés. La route par défaut vers Niamey couvre ses LAN, la DMZ et Internet. Seul le LAN de Tahoua part ailleurs, d'où une route plus précise (/26) qui l'emporte sur /0. Accepté aussi : routes explicites + défaut (juste, mais pas minimal).</p>` },
          { q: 'b) Le lien Zinder–Niamey tombe. Que se passe-t-il ? Comment l\'éviter ?', pts: 1, corr: '<p>Les statiques ne réagissent pas : la route par défaut pointe toujours vers .225, injoignable → tout le trafic vers Niamey et Internet est perdu. Solutions : route par défaut flottante via Tahoua (<code>ip route 0.0.0.0 0.0.0.0 10.20.3.234 10</code>) ou, mieux, OSPF sur les trois routeurs.</p>' }
        ]
      },
      {
        title: 'OSPF : calcul de chemin et élection', min: 10, src: 'Plan S2 · Ex. 4',
        parts: [
          { q: 'a) Niamey–Tahoua = E1 ; Niamey–Zinder et Zinder–Tahoua = fibre 100 Mbit/s ; LAN Tahoua = FastEthernet. Coût des deux chemins de Niamey vers 10.20.3.128/26 ? Lequel est choisi ?', pts: 2, fields: [{ label: 'Coût direct', kind: 'num', a: 49 }, { label: 'Coût via Zinder', kind: 'num', a: 3 }], corr: '<p>E1 = 48, fibre = 1, FE = 1. Direct : 48 + 1 = <b>49</b>. Via Zinder : 1 + 1 + 1 = <b>3</b> → OSPF passe par Zinder (même avec un saut de plus). RIP aurait choisi le lien direct.</p>' },
          { q: 'b) R1 prio 1 RID 1.1.1.1 · R2 prio 1 RID 2.2.2.2 · R3 prio 0 RID 3.3.3.3 · R4 prio 10 RID 0.0.0.4. DR ? BDR ? Pourquoi R3 ne peut-il pas être élu ?', pts: 1, fields: [{ label: 'DR', kind: 'select', opts: ['R1', 'R2', 'R3', 'R4'], a: 3 }, { label: 'BDR', kind: 'select', opts: ['R1', 'R2', 'R3', 'R4'], a: 1 }], corr: '<p>DR = R4 (priorité 10). BDR = R2 (égalité R1/R2 à 1 → plus haut RID 2.2.2.2). R3 a une priorité 0 : jamais DR ni BDR (DROTHER).</p>' },
          { q: 'c) Deux routeurs ne deviennent jamais voisins OSPF. Cite quatre causes.', pts: 1, corr: '<p>Aires différentes · timers hello/dead différents · sous-réseau ou masque différent · authentification différente · Router-ID en double · type d\'aire différent (stub) · interface passive · ACL bloquant le protocole IP 89 · MTU différent (bloque en ExStart/Exchange).</p>' }
        ]
      },
      {
        title: 'Questions de cours (réponses courtes)', min: 7, src: 'Plan S2 · Ex. 5',
        parts: [
          { q: 'a) Différence entre vecteur de distance et état de liens (deux phrases).', pts: 0.75, corr: '<p>Vecteur de distance : chaque routeur annonce à ses voisins sa table (distance + direction) et ne connaît pas la topologie complète. État de liens : chaque routeur diffuse l\'état de ses liens à tous, construit la carte complète et calcule lui-même les plus courts chemins (Dijkstra).</p>' },
          { q: 'b) Pourquoi RIP limite-t-il la métrique à 15 ? Cite deux autres mécanismes anti-boucles.', pts: 0.75, corr: '<p>Pour stopper le comptage à l\'infini (16 = inaccessible). Autres : split horizon, route poisoning / poison reverse, hold-down timers, mises à jour déclenchées.</p>' },
          { q: 'c) IGP et EGP : différence et un exemple de chaque.', pts: 0.75, corr: '<p>IGP : à l\'intérieur d\'un système autonome (OSPF, RIP, EIGRP, IS-IS). EGP : entre systèmes autonomes (BGP).</p>' },
          { q: 'd) Pourquoi RIP préfère-t-il 2 sauts en 64 kbit/s à 3 sauts en fibre ? Quel protocole corrige ce défaut ?', pts: 0.75, corr: '<p>RIP ne compte que les sauts (2 &lt; 3) et ignore le débit. OSPF (coût fondé sur le débit) ou EIGRP (bande passante + délai) corrigent ce défaut.</p>' }
        ]
      },
      {
        title: 'NAT / PAT au Ministère', min: 8, src: 'Plan S2 · Ex. 6',
        statement: '<p>R-NIAMEY dispose de l\'adresse publique <b>203.0.113.2</b> sur G0/2 (vers le FAI). Le FAI a aussi attribué <b>203.0.113.5</b> au Ministère.</p>',
        parts: [
          { q: 'a) Écris la configuration qui permet à tous les postes du bloc 10.20.0.0/22 d\'accéder à Internet avec l\'unique adresse de G0/2.', pts: 1.5, corr: `${code(`access-list 1 permit 10.20.0.0 0.0.3.255
ip nat inside source list 1 interface GigabitEthernet0/2 overload
interface range g0/0 - 1 , g0/3 , s0/0 - 1
 ip nat inside
interface g0/2
 ip nat outside`)}<div class="co fix"><div class="co-h">🛠️ Correction du plan</div>Le corrigé original n'active <code>ip nat inside</code> que sur g0/0-1 et g0/3. Le trafic de Zinder et Tahoua entre par <b>S0/0 et S0/1</b> : sans ces interfaces en « inside », il n'est pas traduit. Ajouter <code>s0/0 - 1</code>.</div>` },
          { q: 'b) Publie le serveur web de la DMZ (10.20.3.194) sur l\'adresse 203.0.113.5.', pts: 1, fields: [{ kind: 'code', ci: true, wide: true, a: ['ip nat inside source static 10.20.3.194 203.0.113.5'], ph: 'ip nat …' }], corr: '<p><code>ip nat inside source static 10.20.3.194 203.0.113.5</code></p>' },
          { q: 'c) <span class="mono">10.20.0.25:51000 → 196.200.1.10:443</span> devient <span class="mono">203.0.113.2:51000 → 196.200.1.10:443</span>. Inside local, inside global, outside global ?', pts: 1, fields: [{ label: 'Inside local', kind: 'ip', a: '10.20.0.25' }, { label: 'Inside global', kind: 'ip', a: '203.0.113.2' }, { label: 'Outside global', kind: 'ip', a: '196.200.1.10' }], corr: '<p>Inside local = 10.20.0.25 · inside global = 203.0.113.2 · outside global = 196.200.1.10.</p>' },
          { q: 'd) Combien de connexions simultanées le PAT peut-il gérer avec une seule IP publique ? Pourquoi ?', pts: 0.5, corr: '<p>Le port est codé sur 16 bits → 2<sup>16</sup> = 65 536 valeurs par IP et par protocole (en pratique ~64 000). C\'est la combinaison IP publique + port qui distingue chaque connexion.</p>' }
        ]
      }
    ],

    phrases: [
      'Le routeur choisit d\'abord le plus long préfixe, puis la plus petite AD, puis la plus petite métrique.',
      'AD : connectée 0, statique 1, EIGRP 90, OSPF 110, RIP 120.',
      'À chaque saut : les MAC changent, les IP restent, le TTL baisse de 1.',
      'OSPF : état de liens, Dijkstra, coût = 10⁸/débit, aire 0 obligatoire, DR = plus haute priorité puis plus haut RID.',
      'PAT = plusieurs IP privées derrière une IP publique, distinguées par le port ; sans ip nat inside/outside, aucune traduction.'
    ]
  });
})();
