/* Séance 1 — Adressage IP avancé : nombre magique, VLSM, agrégation, wildcard, IPv6. */
(function () {
  'use strict';
  const { key, trap, tip, reflex, ex, fix, mnemo, why, f, frac, table, steps, ul, bits, w, stepper, reveal, code } = App.md;

  App.registerModule({
    id: 's1', order: 1, label: 'Séance 1', short: 'Adressage IP',
    title: 'Adressage IP avancé : VLSM, agrégation, IPv6',
    subtitle: 'Le thème qui tombe « presque à coup sûr » — Épreuve 2',
    icon: '🧮', color: '#4f46e5', day: '2026-10-10', epreuve: 'Épreuve 2',
    intro: 'Calcul de sous-réseau sans calculatrice, plan d\'adressage VLSM, résumé de routes, adresses spéciales et IPv6. Méthode du « nombre magique » : 20 secondes par adresse.',

    pretest: [
      { type: 'qcm', q: 'Quelle est l\'adresse réseau de 192.168.10.130/26 ?', choices: ['192.168.10.128', '192.168.10.0', '192.168.10.130', '192.168.10.192'], a: 0, expl: 'Bloc 64 : 130 est entre 128 et 192.' },
      { type: 'qcm', q: 'Pour 62 hôtes, quel préfixe ?', choices: ['/26', '/25', '/27', '/24'], a: 0, expl: '64 − 2 = 62 : un /26 suffit pile.' },
      { type: 'qcm', q: 'En IPv6, qu\'est-ce qui remplace ARP ?', choices: ['NDP (ICMPv6)', 'DHCPv6', 'IGMP', 'Rien'], a: 0, expl: 'NDP : messages ICMPv6 NS/NA (voisins) et RS/RA (routeurs).' }
    ],

    lessons: [
      {
        title: 'Adresse, masque, préfixe : la structure IPv4', min: 6,
        essentiel: ul([
          'IPv4 = <b>32 bits</b> = partie <span class="net-t">réseau</span> (le quartier) + partie <span class="host-t">hôte</span> (la maison).',
          'Le <b>masque</b> dit où s\'arrête le réseau : bits à 1 = réseau. <b>/24</b> = 24 bits à 1 = 255.255.255.0.',
          'Adresse réseau = bits hôte à 0 ; <b>broadcast</b> = bits hôte à 1 ; les deux sont non attribuables.'
        ]),
        html: `
<p class="lead">IP (Internet Protocol) est la couche 3 : il est <b>sans connexion</b>, achemine <b>au mieux</b> (aucune garantie de livraison) et est <b>indépendant du support</b> (câble, fibre, radio).</p>
<p>Chaque adresse IPv4 se découpe en deux : ${bits('11000000.10101000.00001010.10000010', 26)} = 192.168.10.130/26</p>
${table(['Élément', 'Définition', 'Exemple'], [
  ['Masque', 'Bits à 1 = partie réseau, bits à 0 = partie hôte', '255.255.255.192'],
  ['Préfixe (CIDR)', 'Nombre de bits à 1 du masque, noté /n', '/26'],
  ['Adresse réseau', 'Tous les bits hôte à 0 — « le nom du quartier »', '192.168.10.128'],
  ['Broadcast (diffusion dirigée)', 'Tous les bits hôte à 1 — « message à tout le quartier »', '192.168.10.191'],
  ['Passerelle', 'Le routeur du réseau local, « porte de sortie »', 'souvent la 1<sup>re</sup> adresse'],
  ['Hôtes', 'Toutes les adresses entre les deux', '.129 → .190 (62)']
])}
<h3>Les types d'adresses IPv4</h3>
${ul([
  '<b>Monodiffusion (unicast)</b> : un seul destinataire.',
  '<b>Diffusion dirigée</b> : la dernière adresse d\'un sous-réseau (ex. 192.168.10.191). Routable vers ce réseau, mais en pratique bloquée par les routeurs.',
  '<b>Diffusion limitée</b> : 255.255.255.255 — reste sur le réseau local, jamais routée.',
  '<b>Multidiffusion (multicast)</b> : 224.0.0.0 à 239.255.255.255, vers un groupe d\'abonnés.'
])}
<h3>Les classes historiques (encore demandées)</h3>
${table(['Classe', '1<sup>er</sup> octet', 'Bits de tête', 'Masque par défaut', 'Usage'], [
  ['A', '1 – 126', '0…', '/8 (255.0.0.0)', 'Très grands réseaux'],
  ['B', '128 – 191', '10…', '/16 (255.255.0.0)', 'Moyens'],
  ['C', '192 – 223', '110…', '/24 (255.255.255.0)', 'Petits'],
  ['D', '224 – 239', '1110…', '—', 'Multicast'],
  ['E', '240 – 255', '1111…', '—', 'Réservée']
])}
${key('Le routage moderne est <b>sans classe (CIDR)</b> : le préfixe /n compte, pas la classe. 127 n\'est dans aucune classe utilisable : c\'est le bouclage.')}
${mnemo('Un hôte compare <b>son réseau</b> et <b>le réseau de la destination</b> (deux ET logiques avec son masque). Identiques → livraison directe (ARP de la cible). Différents → envoi à la passerelle (ARP de la passerelle).')}
`,
        check: [
          { type: 'qcm', q: '10.5.20.1 appartient historiquement à la classe :', choices: ['A', 'B', 'C', 'D'], a: 0, expl: '1<sup>er</sup> octet 10 ∈ 1-126 → classe A.' },
          { type: 'qcm', q: 'Laquelle est une adresse de diffusion limitée ?', choices: ['255.255.255.255', '192.168.1.255', '224.0.0.1', '0.0.0.0'], a: 0, expl: '255.255.255.255 ne sort jamais du réseau local. 192.168.1.255 est une diffusion dirigée (si /24).' },
          { type: 'tf', q: 'L\'adresse réseau peut être attribuée à un poste si le réseau est petit.', a: false, expl: 'Jamais : réseau et broadcast sont réservés (sauf cas particulier du /31 point-à-point).' }
        ]
      },
      {
        title: 'La méthode du « nombre magique » (sans binaire)', min: 8,
        essentiel: steps([
          'Repère l\'<b>octet intéressant</b> : celui où le masque n\'est ni 255 ni 0.',
          '<b>Bloc = 256 − valeur du masque</b> dans cet octet.',
          '<b>Réseau</b> = plus grand multiple du bloc ≤ valeur de l\'IP (octets suivants à 0).',
          '<b>Broadcast</b> = réseau + bloc − 1 (octets suivants à 255).',
          '1<sup>er</sup> hôte = réseau + 1 · dernier = broadcast − 1 · hôtes = 2<sup>h</sup> − 2.'
        ]),
        html: `
${stepper([
  `<p><b>Exemple 1 — 192.168.10.130/26</b></p><p>/26 → masque 255.255.255.<b>192</b> → octet intéressant : le <b>4<sup>e</sup></b>.</p>`,
  `<p>Bloc = 256 − 192 = <b class="acc-t">64</b> → réseaux : .0, .64, .128, .192.</p>`,
  `<p>130 est entre 128 et 192 → réseau <b>192.168.10.128</b>, broadcast 128 + 64 − 1 = <b>192.168.10.191</b>.</p>`,
  `<p>Hôtes : <b>.129 → .190</b>, soit 2<sup>6</sup> − 2 = <b>62</b>.</p>`,
  `<p><b>Exemple 2 — 172.16.45.200/20</b> (octet intéressant = 3<sup>e</sup>)</p><p>/20 → 255.255.<b>240</b>.0 → bloc = <b class="acc-t">16</b> → multiples : 0, 16, 32, 48…</p>`,
  `<p>45 est entre 32 et 48 → réseau <b>172.16.32.0</b> (4<sup>e</sup> octet à 0).</p><p>Broadcast : 32 + 16 − 1 = 47 → <b>172.16.47.255</b> (4<sup>e</sup> octet à 255).</p>`,
  `<p>Hôtes : <b>172.16.32.1 → 172.16.47.254</b>, soit 2<sup>12</sup> − 2 = <b>4 094</b>.</p>`,
  `<p><b>Exemple 3 — 10.200.7.9/13</b> (octet intéressant = 2<sup>e</sup>)</p><p>/13 → 255.<b>248</b>.0.0 → bloc 8 → 200 = 8 × 25 : multiple exact → réseau <b>10.200.0.0</b>.</p><p>Broadcast : 200 + 8 − 1 = 207 → <b>10.207.255.255</b>. Hôtes : 2<sup>19</sup> − 2 = <b>524 286</b>.</p>`
], '3 exemples résolus')}
${w('ipviz', { ip: '192.168.10.130/26' })}
${tip('Pour trouver l\'octet intéressant : /8 à /15 → 2<sup>e</sup> octet · /16 à /23 → 3<sup>e</sup> · /24 à /31 → 4<sup>e</sup>. Si le préfixe est un multiple de 8 (/8, /16, /24), il n\'y a pas d\'octet partiel.')}
${trap('<b>192.168.5.63/27</b> : bloc 32 → réseau .32, broadcast .63. L\'adresse donnée EST le broadcast : réponds « non attribuable à un hôte ». C\'est le piège n° 1.')}
${reflex('Présente toujours ta réponse en tableau : adresse · réseau · broadcast · 1<sup>er</sup> hôte · dernier hôte · nombre d\'hôtes. Le correcteur note ligne par ligne.')}
`,
        check: [
          { type: 'input', q: 'Réseau et broadcast de <b>10.15.99.17/29</b> ?', fields: [{ label: 'Réseau', kind: 'ip', a: '10.15.99.16' }, { label: 'Broadcast', kind: 'ip', a: '10.15.99.23' }], expl: 'Bloc 8 : 17 est entre 16 et 24 → .16 et .23.' },
          { type: 'input', q: 'Réseau et broadcast de <b>172.20.130.5/23</b> ?', fields: [{ label: 'Réseau', kind: 'ip', a: '172.20.130.0' }, { label: 'Broadcast', kind: 'ip', a: '172.20.131.255' }], expl: '/23 → 255.255.254.0 → bloc 2 dans le 3<sup>e</sup> octet : 130 est pair → réseau 172.20.130.0, broadcast 172.20.131.255 (510 hôtes).' },
          { type: 'tf', q: '172.16.31.255/20 peut être attribuée à un serveur.', a: false, expl: '/20 → bloc 16 : réseau 172.16.16.0, broadcast 172.16.31.255. C\'est le broadcast.' }
        ]
      },
      {
        title: 'Les tables à connaître par cœur', min: 6,
        essentiel: ul([
          '/24 → 254 hôtes · /25 → 126 · /26 → 62 · /27 → 30 · /28 → 14 · /29 → 6 · /30 → 2.',
          '/20 → 4 094 · /21 → 2 046 · /22 → 1 022 · /23 → 510.',
          '<b>/30</b> pour une liaison WAN classique, <b>/31</b> point-à-point (RFC 3021), <b>/32</b> route d\'hôte (loopback).'
        ]),
        html: `
${table(['CIDR', 'Masque', 'Bloc', 'Hôtes', 'Wildcard'], [
  ['/24', '255.255.255.0', '256', '254', '0.0.0.255'],
  ['/25', '255.255.255.128', '128', '126', '0.0.0.127'],
  ['/26', '255.255.255.192', '64', '62', '0.0.0.63'],
  ['/27', '255.255.255.224', '32', '30', '0.0.0.31'],
  ['/28', '255.255.255.240', '16', '14', '0.0.0.15'],
  ['/29', '255.255.255.248', '8', '6', '0.0.0.7'],
  ['/30', '255.255.255.252', '4', '2', '0.0.0.3'],
  ['/31', '255.255.255.254', '2', '2 (point-à-point, RFC 3021)', '0.0.0.1'],
  ['/32', '255.255.255.255', '1', '1 hôte (route d\'hôte, loopback)', '0.0.0.0']
], { mono: [1, 4] })}
${table(['CIDR', 'Masque', 'Bloc (3<sup>e</sup> octet)', 'Hôtes'], [
  ['/16', '255.255.0.0', '256', '65 534'],
  ['/19', '255.255.224.0', '32', '8 190'],
  ['/20', '255.255.240.0', '16', '4 094'],
  ['/21', '255.255.248.0', '8', '2 046'],
  ['/22', '255.255.252.0', '4', '1 022'],
  ['/23', '255.255.254.0', '2', '510']
], { mono: [1] })}
<h3>Emprunter des bits pour créer des sous-réseaux</h3>
<p>D'après le cours : à partir d'un /24, l'emprunt de <b>n</b> bits du 4<sup>e</sup> octet crée <b>2<sup>n</sup></b> sous-réseaux.</p>
${table(['Emprunt', 'Préfixe', 'Sous-réseaux', 'Hôtes chacun'], [['1 bit', '/25', '2', '126'], ['2 bits', '/26', '4', '62'], ['3 bits', '/27', '8', '30'], ['4 bits', '/28', '16', '14'], ['5 bits', '/29', '32', '6'], ['6 bits', '/30', '64', '2']])}
${f(`Sous-réseaux = 2<sup><var>n</var></sup> &nbsp;·&nbsp; Hôtes = 2<sup><var>h</var></sup> − 2`, 'n = bits empruntés · h = bits restants pour les hôtes')}
${tip('Lien utile : chaque bit emprunté <b>double</b> le nombre de sous-réseaux et <b>divise par deux</b> leur taille.')}
${reveal('On découpe 172.16.0.0/16 en au moins 50 sous-réseaux de 1 000 hôtes. Préfixe ?', '50 → 2<sup>6</sup> = 64 ≥ 50 → 6 bits empruntés → <b>/22</b> (255.255.252.0) : 64 sous-réseaux de 1 022 hôtes ✓. Avec 7 bits → /23 → 510 hôtes, insuffisant.')}
`,
        check: [
          { type: 'input', q: 'Combien d\'hôtes dans un /21 ?', fields: [{ kind: 'num', a: 2046 }], expl: '2<sup>11</sup> − 2 = 2 046.' },
          { type: 'input', q: 'Masque du /19 ?', fields: [{ kind: 'ip', a: '255.255.224.0' }], expl: '16 + 3 bits : 3<sup>e</sup> octet = 224.' },
          { type: 'qcm', q: 'Un /31 sert à :', choices: ['une liaison point-à-point', 'un LAN de 2 postes avec broadcast', 'une route par défaut', 'rien, il est invalide'], a: 0, expl: 'RFC 3021 : 2 adresses, pas de réseau/broadcast, parfait entre deux routeurs.' }
        ]
      },
      {
        title: 'Adresses spéciales et les 8 pièges du jour J', min: 6,
        essentiel: ul([
          'Privées (RFC 1918) : <b>10/8 · 172.16/12 (172.16 → 172.31) · 192.168/16</b>.',
          '<b>169.254/16</b> = APIPA (pas de bail DHCP) · <b>127/8</b> bouclage · <b>100.64/10</b> CGNAT · <b>224/4</b> multicast.',
          '<b>172.32.x.x</b> et <b>192.169.x.x</b> sont PUBLIQUES.'
        ]),
        html: `
${table(['Plage', 'Rôle'], [
  ['10.0.0.0/8', 'Privée (RFC 1918) — 16 777 216 adresses'],
  ['172.16.0.0/12 (172.16 → 172.31)', 'Privée (RFC 1918) — 1 048 576 adresses'],
  ['192.168.0.0/16', 'Privée (RFC 1918) — 65 536 adresses'],
  ['127.0.0.0/8', 'Bouclage (loopback) : test de la pile TCP/IP'],
  ['169.254.0.0/16', 'APIPA : le client n\'a pas obtenu de bail DHCP'],
  ['100.64.0.0/10', 'CGNAT : NAT chez l\'opérateur'],
  ['224.0.0.0/4', 'Multicast (ex-classe D), 224 → 239'],
  ['240.0.0.0/4', 'Réservée (ex-classe E)'],
  ['0.0.0.0', '« Cette machine » ; 0.0.0.0/0 = route par défaut'],
  ['255.255.255.255', 'Broadcast limité (non routé)'],
  ['192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24', 'Documentation (exemples des cours)']
])}
${w('ipviz', { ip: '172.32.10.1/16' })}
<h3>Les 8 pièges classiques</h3>
<ol>
<li>L'adresse donnée est l'<b>adresse réseau ou le broadcast</b> (ex. 192.168.5.63/27) → « non attribuable à un hôte ».</li>
<li><b>172.32.x.x n'est pas privée</b> : la plage privée s'arrête à 172.31.</li>
<li><b>Masque non contigu</b> (255.255.253.0) → invalide.</li>
<li><b>Passerelle hors du sous-réseau</b> du poste → pas d'accès aux autres réseaux.</li>
<li>Deux postes sur le même switch mais dans <b>deux sous-réseaux différents</b> → ne communiquent pas sans routeur.</li>
<li>Confondre <b>nombre d'adresses</b> (2<sup>h</sup>) et <b>nombre d'hôtes</b> (2<sup>h</sup> − 2).</li>
<li><b>Résumé de routes trop large</b>, qui annonce des réseaux inexistants.</li>
<li>IPv6 : utiliser <b>« :: » deux fois</b> dans la même adresse → invalide.</li>
</ol>
${ex('<b>Diagnostic :</b> poste 192.168.20.70, masque 255.255.255.192, passerelle 192.168.20.62. Il joint ses voisins mais pas Internet.<br>→ /26, bloc 64 : le poste est dans 192.168.20.64/26 (.65 à .126). La passerelle .62 est dans 192.168.20.0/26 : <b>passerelle hors sous-réseau</b>. Correction : 192.168.20.65.')}
${reflex('Un poste en 169.254.x.x = « le serveur DHCP est injoignable » (câble, VLAN, relais DHCP manquant). Ce n\'est ni un conflit d\'IP ni une panne DNS.')}
`,
        check: [
          { type: 'qcm', q: 'Laquelle est une adresse privée ?', choices: ['172.31.255.1', '172.32.0.1', '192.169.1.1', '11.0.0.1'], a: 0, expl: '172.16 à 172.31 = privé. Les autres sont publiques.' },
          { type: 'qcm', q: 'La plage 100.64.0.0/10 correspond à :', choices: ['CGNAT', 'APIPA', 'Multicast', 'Documentation'], a: 0, expl: 'NAT de l\'opérateur (Carrier-Grade NAT).' },
          { type: 'tf', q: 'Deux postes 10.0.0.10/25 et 10.0.0.130/25 sur le même switch peuvent se pinguer.', a: false, expl: 'Bloc 128 : 10.0.0.0/25 et 10.0.0.128/25 sont deux réseaux différents → il faut un routeur (ou passer en /24).' }
        ]
      },
      {
        title: 'VLSM : le plan d\'adressage qui rapporte tous les points', min: 10,
        essentiel: steps([
          'Lister les besoins (+2 pour réseau et broadcast ; la passerelle fait partie des hôtes).',
          'Pour chacun : plus petite puissance de 2 ≥ besoin + 2 → préfixe.',
          'Trier du <b>plus grand au plus petit</b>, attribuer <b>à la suite</b> depuis le début du bloc.',
          'Vérifier : somme des tailles ≤ taille du bloc. Présenter un tableau complet.'
        ]),
        html: `
<p><b>VLSM</b> (Variable Length Subnet Mask) = des sous-réseaux de tailles différentes dans un même bloc, pour ne pas gaspiller d'adresses. En triant par taille décroissante, chaque sous-réseau commence automatiquement sur un multiple de sa taille (alignement).</p>
<h3>Étude de cas du plan : le Ministère (bloc 10.20.0.0/22)</h3>
${table(['Réseau', 'Besoin', '+2', 'Taille', 'Préfixe'], [
  ['Admin & Finances (Niamey)', '300', '302', '512', '/23'],
  ['Impôts (Niamey)', '200', '202', '256', '/24'],
  ['Zinder', '100', '102', '128', '/25'],
  ['Tahoua', '60', '62', '64', '/26'],
  ['DMZ serveurs', '25', '27', '32', '/27'],
  ['3 liaisons WAN', '2 chacune', '4', '3 × 4 = 12', '/30']
])}
<p>Total : 512 + 256 + 128 + 64 + 32 + 12 = <b>1 004 ≤ 1 024</b> ✓ (il reste 20 adresses).</p>
${table(['Réseau', 'Préfixe / masque', 'Adresse réseau', 'Plage d\'hôtes', 'Broadcast', 'Passerelle'], [
  ['Admin & Finances', '/23 · 255.255.254.0', '10.20.0.0', '10.20.0.1 → 10.20.1.254', '10.20.1.255', '10.20.0.1'],
  ['Impôts', '/24 · 255.255.255.0', '10.20.2.0', '.1 → .254', '10.20.2.255', '10.20.2.1'],
  ['Zinder', '/25 · 255.255.255.128', '10.20.3.0', '.1 → .126', '10.20.3.127', '10.20.3.1'],
  ['Tahoua', '/26 · 255.255.255.192', '10.20.3.128', '.129 → .190', '10.20.3.191', '10.20.3.129'],
  ['DMZ', '/27 · 255.255.255.224', '10.20.3.192', '.193 → .222', '10.20.3.223', '10.20.3.193'],
  ['WAN Niamey–Zinder', '/30', '10.20.3.224', '.225 – .226', '10.20.3.227', '—'],
  ['WAN Niamey–Tahoua', '/30', '10.20.3.228', '.229 – .230', '10.20.3.231', '—'],
  ['WAN Zinder–Tahoua', '/30', '10.20.3.232', '.233 – .234', '10.20.3.235', '—']
], { mono: [2, 3, 4, 5] })}
<p>Libres : <b>10.20.3.236 → 10.20.3.255</b> (20 adresses = 10.20.3.236/30 + 10.20.3.240/28) → une 4<sup>e</sup> liaison WAN et un réseau d'administration des équipements.</p>
${w('vlsm')}
<h3>Pièges VLSM</h3>
${ul([
  '62 hôtes → /26 (64 − 2 = 62 ✓) ; <b>63 hôtes → /25</b>.',
  'Oublier les <b>liaisons WAN</b> entre routeurs : un /30 chacune (ou /31).',
  'Commencer par les petits réseaux → chevauchements et trous.',
  'Ne pas laisser de <b>marge de croissance</b> quand l\'énoncé parle d\'évolution (prévoir 20 à 30 %).',
  'Oublier de vérifier que la <b>passerelle</b> est dans le même sous-réseau que les postes.'
])}
${ex('Zinder doit passer à 140 hôtes l\'an prochain : 142 adresses → il faut un /24 (256). Il ne reste que 20 adresses → le plan ne tient pas. Solutions : demander un bloc supplémentaire (ex. 10.20.4.0/24) et y migrer Zinder, ou redécouper à partir d\'un /21.', 'Question d\'évolution')}
`,
        check: [
          { type: 'input', q: 'Quel préfixe pour un LAN de 100 hôtes ?', fields: [{ kind: 'mask', a: '/25' }], expl: '102 → 128 → /25.' },
          { type: 'order', q: 'Dans quel ordre attribuer ces sous-réseaux en VLSM ?', items: ['LAN de 300 hôtes (/23)', 'LAN de 200 hôtes (/24)', 'LAN de 60 hôtes (/26)', 'DMZ de 25 hôtes (/27)', 'Liaison WAN (/30)'], expl: 'Du plus grand au plus petit : l\'alignement est alors automatique.' },
          { type: 'input', q: 'Bloc 192.168.1.0/24 : LAN A 100 hôtes, LAN B 50 hôtes. Adresse réseau du LAN B ?', fields: [{ kind: 'cidr', a: '192.168.1.128/26', ph: 'a.b.c.d/n' }], expl: 'A : /25 → 192.168.1.0/25. B : /26 juste après → 192.168.1.128/26.' }
        ]
      },
      {
        title: 'Agrégation de routes (résumé, supernetting)', min: 7,
        essentiel: steps([
          'Écrire en binaire l\'octet qui change, pour la première et la dernière route.',
          'Compter les bits communs depuis la gauche → nouveau préfixe.',
          'Route résumée = bits communs, le reste à 0. Vérifier qu\'elle n\'englobe pas de réseaux absents.'
        ]),
        html: `
<p>Un routeur peut annoncer <b>une seule route</b> à la place de plusieurs : table plus petite, convergence plus rapide. C'est la <b>route statique récapitulative</b> du cours (CIDR).</p>
${ex(`172.16.8.0/24 · 172.16.9.0/24 · 172.16.10.0/24 · 172.16.11.0/24<br>
<div class="binrow"><span class="lab">8</span>${bits('00001000', 6)}<span></span></div>
<div class="binrow"><span class="lab">11</span>${bits('00001011', 6)}<span></span></div>
6 bits communs dans le 3<sup>e</sup> octet → 16 + 6 = <b>22</b> → <b>172.16.8.0/22</b>. Exact : il couvre précisément 8, 9, 10, 11.`, 'Exemple résolu')}
${key('Un résumé <b>exact</b> couvre 2<sup>n</sup> réseaux et le premier est un multiple de 2<sup>n</sup> (ici 4 réseaux, et 8 est multiple de 4).')}
${w('summ')}
${ex(`10.1.64.0/20 et 10.1.80.0/20 : 64 = 0100 0000, 80 = 0101 0000 → 3 bits communs → 16 + 3 = <b>10.1.64.0/19</b> (64 → 95 = 64-79 + 80-95 ✓).`)}
${trap(`192.168.1.0/24 · 192.168.2.0/24 · 192.168.3.0/24 (le routeur ne connaît pas 192.168.0.0/24) : 1, 2, 3 → 6 bits communs → 192.168.0.0/22, qui <b>inclut 192.168.0.0/24 inexistant</b> → sur-agrégation (risque de trou noir ou de boucle). Résumé correct : 192.168.1.0/24 + 192.168.2.0/23.`, 'Piège : la sur-agrégation')}
${code(`! Route statique récapitulative sur un routeur
ip route 172.16.8.0 255.255.252.0 10.20.3.226`)}
`,
        check: [
          { type: 'input', q: 'Résumé de 10.10.4.0/24, 10.10.5.0/24, 10.10.6.0/24, 10.10.7.0/24 ?', fields: [{ kind: 'cidr', a: '10.10.4.0/22' }], expl: '4 = 00000100, 7 = 00000111 → 6 bits communs → /22.' },
          { type: 'input', q: 'Résumé de 192.168.16.0/24 et 192.168.17.0/24 ?', fields: [{ kind: 'cidr', a: '192.168.16.0/23' }], expl: '16 et 17 ne diffèrent que du dernier bit → /23.' },
          { type: 'tf', q: '192.168.0.0/22 résume exactement 192.168.1.0, .2.0 et .3.0 /24.', a: false, expl: 'Il englobe aussi 192.168.0.0/24 : sur-agrégation.' }
        ]
      },
      {
        title: 'Le masque générique (wildcard)', min: 5,
        essentiel: ul([
          '<b>Wildcard = 255.255.255.255 − masque</b> : /26 → 0.0.0.63 · /22 → 0.0.3.255 · /20 → 0.0.15.255.',
          'Utilisé dans les <b>ACL Cisco</b> et la commande <b>network</b> d\'OSPF / EIGRP.',
          '<code>host A</code> = A 0.0.0.0 · <code>any</code> = 0.0.0.0 255.255.255.255.'
        ]),
        html: `
<p>Dans un wildcard, un bit à <b>0</b> veut dire « à vérifier », un bit à <b>1</b> « peu importe ». C'est l'inverse du masque.</p>
${f(`255.255.255.255 − 255.255.252.0 = <b class="hl">0.0.3.255</b>`, 'wildcard d\'un /22')}
${code(`access-list 10 permit 10.20.0.0 0.0.3.255      ! tout 10.20.0.0/22
router ospf 1
 network 10.20.0.0 0.0.1.255 area 0          ! le /23 de l'Admin
router eigrp 100
 network 10.20.3.224 0.0.0.3                 ! une liaison /30`)}
${fix('Le cours de routage dynamique rappelle : « certaines versions IOS permettent de saisir le masque plutôt que le wildcard ». Le jour J, écris toujours le <b>wildcard</b> : c\'est la réponse attendue.', 'Remarque du cours')}
${trap('Écrire le masque (255.255.252.0) au lieu du wildcard dans une ACL : l\'ACL ne fait plus du tout ce que tu crois.')}
`,
        check: [
          { type: 'input', q: 'Wildcard d\'un /21 ?', fields: [{ kind: 'ip', a: '0.0.7.255' }], expl: '255 − 248 = 7 dans le 3<sup>e</sup> octet.' },
          { type: 'qcm', q: '<code>host 10.1.1.1</code> équivaut à :', choices: ['10.1.1.1 0.0.0.0', '10.1.1.1 255.255.255.255', '10.1.1.0 0.0.0.255', '10.1.1.1 0.0.0.255'], a: 0, expl: 'Wildcard 0.0.0.0 : tous les bits sont vérifiés.' }
        ]
      },
      {
        title: 'IPv6 (1) : format, compression, types', min: 8,
        essentiel: ul([
          '<b>128 bits</b> = 8 groupes (hextets) de 16 bits en hexa. En-tête fixe de <b>40 octets</b>.',
          'Compression : (1) supprimer les 0 de tête ; (2) remplacer <b>UNE</b> suite de groupes nuls par <b>::</b> (la plus longue ; à égalité, la première).',
          '<b>2000::/3</b> global · <b>fe80::/10</b> lien local · <b>fc00::/7</b> ULA · <b>ff00::/8</b> multicast · <b>::1</b> bouclage. <b>Pas de broadcast.</b>'
        ]),
        html: `
<h3>Pourquoi IPv6 ?</h3>
${ul(['Manque d\'adresses IPv4 publiques (4,3 milliards seulement).', 'Croissance des tables de routage d\'Internet.', 'Perte de la connectivité de bout en bout (NAT partout).'])}
<h3>Écrire et compresser</h3>
${ex(`<span class="mono">2001:0DB8:0000:0000:0000:FF00:0042:8329</span><br>
Règle 1 (zéros de tête) : <span class="mono">2001:DB8:0:0:0:FF00:42:8329</span><br>
Règle 2 (« :: » une seule fois) : <b class="mono">2001:db8::ff00:42:8329</b>`, 'Compression en 2 règles')}
${ex(`<span class="mono">2001:0db8:0000:0001:0000:0000:0000:0001</span> → <b class="mono">2001:db8:0:1::1</b> : le « :: » remplace la plus longue suite (groupes 5 à 7), le 0 isolé du 3<sup>e</sup> groupe reste « 0 ».`)}
${trap('<b>2001:db8::1::5</b> est invalide : avec deux « :: », impossible de savoir combien de groupes chacun remplace (le cours cite 2001:DB8::1234::5678).')}
<h3>Les types d'adresses</h3>
${table(['Préfixe', 'Type', 'Équivalent IPv4'], [
  ['2000::/3 (2000 → 3FFF)', 'Unicast global — routable sur Internet', 'adresse publique'],
  ['fe80::/10', 'Lien local — toujours présente, jamais routée', 'APIPA (en mieux)'],
  ['fc00::/7 (fd00::/8 en pratique)', 'ULA, unique locale', 'adresse privée'],
  ['ff00::/8', 'Multicast · ff02::1 = tous les nœuds · ff02::2 = tous les routeurs', 'multicast/broadcast'],
  ['::1/128', 'Bouclage', '127.0.0.1'],
  ['::/128', 'Non spécifiée (source quand on n\'a pas encore d\'adresse)', '0.0.0.0'],
  ['2001:db8::/32', 'Documentation', '192.0.2.0/24']
])}
<p><b>Anycast</b> (cours) : une même adresse unicast attribuée à plusieurs appareils ; le paquet va au plus proche.</p>
<h3>Structure d'une adresse globale</h3>
${table(['Préfixe de routage global', 'ID de sous-réseau', 'ID d\'interface'], [['48 bits (donné par le FAI)', '16 bits (choisis par le site)', '64 bits (la machine)']])}
${key('Un LAN IPv6 = un <b>/64</b>. Un site reçoit souvent un <b>/48</b> → 2<sup>16</sup> = <b>65 536</b> sous-réseaux /64. Le 1<sup>er</sup> hextet d\'une adresse globale commence par les bits 001 (2000 à 3FFF).')}
${w('ipv6')}
`,
        check: [
          { type: 'input', q: 'Compresse <b>fe80:0000:0000:0000:0000:0000:0001:002a</b>.', fields: [{ kind: 'v6', strict: true, a: 'fe80::1:2a' }], expl: 'Zéros de tête supprimés, puis les 5 groupes nuls → ::' },
          { type: 'qcm', q: 'Type de <b>fd12:3456::1</b> ?', choices: ['ULA (≈ privée)', 'Lien local', 'Global', 'Multicast'], a: 0, expl: 'fd00::/8 ⊂ fc00::/7.' },
          { type: 'qcm', q: 'Taille de l\'en-tête IPv6 :', choices: ['40 octets', '20 octets', '32 octets', 'variable'], a: 0, expl: 'Fixe : 40 octets (IPv4 : 20 à 60).' }
        ]
      },
      {
        title: 'IPv6 (2) : NDP, SLAAC et EUI-64', min: 7,
        essentiel: ul([
          'ARP → <b>NDP</b> (ICMPv6) : <b>NS/NA</b> pour trouver la MAC d\'un voisin, <b>RS/RA</b> pour découvrir le routeur.',
          'Configuration : <b>SLAAC</b> (automatique via RA), DHCPv6 avec ou sans état, ou statique.',
          '<b>EUI-64</b> : MAC coupée en deux + <b>FF:FE</b> au milieu + inversion du <b>7<sup>e</sup> bit</b> du 1<sup>er</sup> octet.'
        ]),
        html: `
${table(['Message ICMPv6', 'Rôle'], [
  ['RS — Sollicitation de routeur', 'Un hôte demande « y a-t-il un routeur ? » (vers ff02::2)'],
  ['RA — Annonce de routeur', 'Le routeur donne le préfixe /64 et la passerelle (vers ff02::1)'],
  ['NS — Sollicitation de voisin', 'Équivalent de la requête ARP (+ détection d\'adresse dupliquée, DAD)'],
  ['NA — Annonce de voisin', 'Équivalent de la réponse ARP']
])}
<h3>SLAAC : l'autoconfiguration sans serveur</h3>
${steps(['L\'hôte se crée une adresse <b>lien local</b> fe80::/64.', 'Il envoie un <b>RS</b> ; le routeur répond par un <b>RA</b> avec le préfixe (ex. 2001:db8:a:1::/64).', 'Il fabrique son identifiant d\'interface (EUI-64 ou aléatoire) et vérifie qu\'il est unique (DAD).'])}
<h3>EUI-64 pas à pas</h3>
${stepper([
  `<p>MAC : <b class="mono">00:1A:2B:3C:4D:5E</b>. On la coupe en deux : 00:1A:2B | 3C:4D:5E.</p>`,
  `<p>On insère <b>FF:FE</b> au milieu : <span class="mono">00:1A:2B:<b>FF:FE</b>:3C:4D:5E</span>.</p>`,
  `<p>On inverse le <b>7<sup>e</sup> bit</b> (bit U/L) du 1<sup>er</sup> octet : 00 = 0000 00<b>0</b>0 → 0000 00<b>1</b>0 = <b>02</b>.</p>`,
  `<p>Identifiant : <b class="mono">021a:2bff:fe3c:4d5e</b> → avec le préfixe 2001:db8:a:1::/64 : <b class="mono">2001:db8:a:1:21a:2bff:fe3c:4d5e</b>.</p>`
], 'EUI-64')}
${tip('Inverser le 7<sup>e</sup> bit = ajouter ou retirer 2 au 1<sup>er</sup> octet : 00 → 02, 0C → 0E, 02 → 00, A4 → A6.')}
<h3>Routes statiques IPv6 (cours)</h3>
${code(`R1(config)# ipv6 unicast-routing
R1(config)# ipv6 route 2001:db8:acad:2::/64 S0/0/0
R1(config)# ipv6 route ::/0 2001:db8:acad:1::2     ! route par défaut`)}
`,
        check: [
          { type: 'qcm', q: 'En IPv6, ARP est remplacé par :', choices: ['NDP (ICMPv6)', 'DHCPv6', 'SLAAC', 'IGMP'], a: 0, expl: 'NS/NA jouent le rôle de la requête/réponse ARP.' },
          { type: 'input', q: 'Combien de sous-réseaux /64 dans un /48 ?', fields: [{ kind: 'num', a: 65536 }], expl: '2<sup>64−48</sup> = 2<sup>16</sup> = 65 536.' },
          { type: 'input', q: 'Identifiant EUI-64 (4 hextets) de la MAC <b>00:0C:29:AB:CD:EF</b> ?', fields: [{ kind: 'text', a: ['20c:29ff:feab:cdef', '020c:29ff:feab:cdef'], ph: 'xxxx:xxxx:xxxx:xxxx' }], expl: '00 → 02 ; 02:0C:29:FF:FE:AB:CD:EF → 020c:29ff:feab:cdef.' }
        ]
      }
    ],

    cards: [
      { front: 'Méthode du nombre magique : les 5 étapes ?', back: '1) octet intéressant 2) bloc = 256 − masque 3) réseau = multiple du bloc ≤ IP 4) broadcast = réseau + bloc − 1 5) hôtes = 2<sup>h</sup> − 2' },
      { front: '/26 : masque, bloc, hôtes ?', back: '255.255.255.192 · bloc 64 · <b>62</b> hôtes' },
      { front: '/27 : masque, bloc, hôtes ?', back: '255.255.255.224 · bloc 32 · <b>30</b> hôtes' },
      { front: '/28 : masque, bloc, hôtes ?', back: '255.255.255.240 · bloc 16 · <b>14</b> hôtes' },
      { front: '/29 : masque, bloc, hôtes ?', back: '255.255.255.248 · bloc 8 · <b>6</b> hôtes' },
      { front: '/30 : masque, hôtes, usage ?', back: '255.255.255.252 · <b>2</b> hôtes · liaison WAN entre deux routeurs' },
      { front: '/31 : à quoi sert-il ?', back: 'Liaison <b>point-à-point</b> (RFC 3021) : 2 adresses, sans réseau ni broadcast' },
      { front: '/22 : masque et hôtes ?', back: '255.255.252.0 · <b>1 022</b> hôtes (bloc 4 dans le 3<sup>e</sup> octet)' },
      { front: '/20 : masque et hôtes ?', back: '255.255.240.0 · <b>4 094</b> hôtes (bloc 16 dans le 3<sup>e</sup> octet)' },
      { front: '/23 : masque et hôtes ?', back: '255.255.254.0 · <b>510</b> hôtes' },
      { front: 'Les 3 plages privées RFC 1918 ?', back: '<b>10.0.0.0/8 · 172.16.0.0/12 (172.16 → 172.31) · 192.168.0.0/16</b>' },
      { front: '169.254.x.x signifie ?', back: '<b>APIPA</b> : le client n\'a pas obtenu de bail DHCP (serveur injoignable)' },
      { front: '100.64.0.0/10 ?', back: '<b>CGNAT</b> (NAT chez l\'opérateur)' },
      { front: '172.32.1.1 est-elle privée ?', back: '<b>Non</b> : publique (la plage privée s\'arrête à 172.31)' },
      { front: 'Classes A, B, C : plages du 1<sup>er</sup> octet ?', back: 'A : 1-126 (/8) · B : 128-191 (/16) · C : 192-223 (/24) · D : 224-239 · E : 240-255' },
      { front: 'Diffusion limitée vs dirigée ?', back: 'Limitée : <b>255.255.255.255</b> (jamais routée) · dirigée : dernière adresse d\'un sous-réseau' },
      { front: 'VLSM : les 4 étapes ?', back: 'besoin + 2 → puissance de 2 → trier du plus grand au plus petit → attribuer à la suite, vérifier la somme' },
      { front: 'Hôtes 62 → préfixe ? 63 → ?', back: '62 → <b>/26</b> · 63 → <b>/25</b>' },
      { front: 'Agrégation : méthode ?', back: 'Binaire de l\'octet qui change → bits communs depuis la gauche → nouveau préfixe, reste à 0' },
      { front: 'Résumé de 172.16.8.0 à 172.16.11.0 /24 ?', back: '<b>172.16.8.0/22</b>' },
      { front: 'Sur-agrégation : c\'est quoi ?', back: 'Un résumé trop large qui annonce des réseaux absents → trou noir ou boucle' },
      { front: 'Wildcard : formule et exemple /26 ?', back: '255.255.255.255 − masque → /26 = <b>0.0.0.63</b>' },
      { front: '<code>any</code> et <code>host</code> en wildcard ?', back: 'any = 0.0.0.0 255.255.255.255 · host A = A 0.0.0.0' },
      { front: 'IPv6 : taille d\'adresse et d\'en-tête ?', back: '<b>128 bits</b> · en-tête fixe de <b>40 octets</b>' },
      { front: 'IPv6 : les 2 règles de compression ?', back: '1) supprimer les 0 de tête 2) « :: » <b>une seule fois</b> pour la plus longue suite de groupes nuls' },
      { front: 'fe80::/10 ?', back: 'Adresse <b>lien local</b> (toujours présente, non routée)' },
      { front: 'fc00::/7 ?', back: '<b>ULA</b> (unique locale) ≈ adresse privée (fd00::/8 en pratique)' },
      { front: 'ff02::1 et ff02::2 ?', back: 'Multicast <b>tous les nœuds</b> · <b>tous les routeurs</b> du lien' },
      { front: '2000::/3 ?', back: '<b>Unicast global</b> (routable sur Internet), 1<sup>er</sup> hextet 2000 à 3FFF' },
      { front: '::1 et :: ?', back: '<b>Bouclage</b> · adresse <b>non spécifiée</b>' },
      { front: 'IPv6 : qui remplace ARP et le broadcast ?', back: '<b>NDP</b> (ICMPv6 NS/NA, RS/RA) et le <b>multicast</b>' },
      { front: 'Taille standard d\'un LAN IPv6 ? Un site /48 donne ?', back: '<b>/64</b> · 2<sup>16</sup> = <b>65 536</b> sous-réseaux /64' },
      { front: 'EUI-64 : les 2 opérations ?', back: 'Insérer <b>FF:FE</b> au milieu de la MAC + inverser le <b>7<sup>e</sup> bit</b> du 1<sup>er</sup> octet' },
      { front: 'SLAAC ?', back: 'Autoconfiguration sans état : préfixe reçu par <b>RA</b> + identifiant d\'interface (EUI-64 ou aléatoire)' },
      { front: 'Structure d\'une adresse IPv6 globale ?', back: '48 bits préfixe de routage global + 16 bits ID de sous-réseau + 64 bits ID d\'interface' }
    ],

    qcm: [
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'Combien d\'hôtes utilisables dans un /27 ?', choices: ['32', '30', '62', '14'], a: 1, noShuffle: true, expl: '2<sup>5</sup> − 2 = 30.' },
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'Laquelle est une adresse privée ?', choices: ['172.32.0.1', '192.169.1.1', '172.31.255.1', '11.0.0.1'], a: 2, noShuffle: true, expl: '172.16 à 172.31.' },
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'Masque générique d\'un /21 ?', choices: ['0.0.3.255', '0.0.7.255', '0.0.15.255', '255.255.248.0'], a: 1, noShuffle: true, expl: '255 − 248 = 7.' },
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'Un poste a l\'adresse 169.254.10.5. Cause la plus probable ?', choices: ['conflit d\'IP', 'serveur DHCP injoignable', 'DNS en panne', 'mauvaise passerelle'], a: 1, noShuffle: true, expl: 'APIPA : aucun bail DHCP reçu.' },
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'Un /31 sert à :', choices: ['un LAN de 2 postes avec broadcast', 'une liaison point-à-point', 'une route par défaut', 'rien, il est invalide'], a: 1, noShuffle: true, expl: 'RFC 3021.' },
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'La plage 100.64.0.0/10 correspond à :', choices: ['multicast', 'APIPA', 'CGNAT', 'documentation'], a: 2, noShuffle: true, expl: 'NAT chez l\'opérateur.' },
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'En IPv6, ARP est remplacé par :', choices: ['DHCPv6', 'NDP (ICMPv6)', 'SLAAC', 'IGMP'], a: 1, noShuffle: true, expl: 'NDP.' },
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'Taille de l\'en-tête IPv6 :', choices: ['20 octets', '32 octets', '40 octets', 'variable'], a: 2, noShuffle: true, expl: '40 octets fixes.' },
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'Combien de /26 dans un /22 ?', choices: ['4', '8', '16', '32'], a: 2, noShuffle: true, expl: '2<sup>26−22</sup> = 16.' },
      { type: 'qcm', src: 'Plan S1 · QCM', q: 'Plus petit réseau contenant 10.0.0.5 et 10.0.0.12 ?', choices: ['10.0.0.0/29', '10.0.0.0/28', '10.0.0.4/28', '10.0.0.0/27'], a: 1, noShuffle: true, expl: '5 = 0000 0101 et 12 = 0000 1100 : 4 bits communs → /28 = 10.0.0.0 à 10.0.0.15. (10.0.0.4/28 n\'existe pas : un /28 commence sur un multiple de 16.)' },
      { type: 'qcm', q: 'Adresse réseau de 172.16.45.200/20 ?', choices: ['172.16.32.0', '172.16.45.0', '172.16.40.0', '172.16.0.0'], a: 0, expl: 'Bloc 16 dans le 3<sup>e</sup> octet : 45 → 32.' },
      { type: 'qcm', q: 'Broadcast de 10.20.3.130/26 ?', choices: ['10.20.3.191', '10.20.3.255', '10.20.3.127', '10.20.3.159'], a: 0, expl: 'Réseau .128, bloc 64 → 128 + 63 = 191.' },
      { type: 'qcm', q: 'Quel masque est invalide ?', choices: ['255.255.253.0', '255.255.252.0', '255.255.255.248', '255.224.0.0'], a: 0, expl: '253 = 11111101 : non contigu.' },
      { type: 'qcm', q: 'Pour 500 hôtes, il faut au minimum :', choices: ['/23', '/24', '/22', '/25'], a: 0, expl: '502 → 512 → /23 (510 hôtes).' },
      { type: 'qcm', q: 'Résumé exact de 10.1.64.0/20 et 10.1.80.0/20 :', choices: ['10.1.64.0/19', '10.1.64.0/18', '10.1.0.0/16', '10.1.64.0/21'], a: 0, expl: '3 bits communs dans le 3<sup>e</sup> octet → /19.' },
      { type: 'qcm', q: 'Forme compressée de 2001:0db8:0000:0001:0000:0000:0000:0001 :', choices: ['2001:db8:0:1::1', '2001:db8::1::1', '2001:db8:0:1:0:0:0:1', '2001:db8::1:0:0:0:1'], a: 0, expl: 'Le « :: » remplace la plus longue suite (3 groupes).' },
      { type: 'qcm', q: 'Un site reçoit 2001:db8:4e0::/48. Le 3<sup>e</sup> sous-réseau /64 est :', choices: ['2001:db8:4e0:2::/64', '2001:db8:4e0:3::/64', '2001:db8:4e2::/64', '2001:db8:4e0::3/64'], a: 0, expl: 'Le 1<sup>er</sup> est :0:, le 2<sup>e</sup> :1:, le 3<sup>e</sup> :2:.' },
      { type: 'tf', q: 'Une adresse IPv6 peut contenir deux fois « :: ».', a: false, expl: 'Une seule fois, sinon l\'adresse est ambiguë.' },
      { type: 'tf', q: 'Le préfixe 0.0.0.0/0 désigne la route par défaut.', a: true, expl: '« Tout ce que je ne connais pas ».' },
      { type: 'match', q: 'Associe chaque plage à son rôle.', pairs: [['169.254.0.0/16', 'APIPA'], ['127.0.0.0/8', 'Bouclage'], ['224.0.0.0/4', 'Multicast'], ['100.64.0.0/10', 'CGNAT'], ['fe80::/10', 'Lien local IPv6']], expl: 'À connaître par cœur.' }
    ],

    exercises: [
      {
        title: 'Calcul rapide (6 adresses)', min: 10, src: 'Plan S1 · Ex. 1',
        statement: '<p>Pour chaque adresse : adresse réseau, broadcast, 1<sup>er</sup> et dernier hôte, nombre d\'hôtes. Si l\'adresse n\'est pas attribuable, dis pourquoi. 1 point par ligne entièrement juste.</p>',
        parts: [
          { q: 'a) <b class="mono">192.168.10.130/26</b>', pts: 1, fields: [{ label: 'Réseau', kind: 'ip', a: '192.168.10.128' }, { label: 'Broadcast', kind: 'ip', a: '192.168.10.191' }, { label: '1er hôte', kind: 'ip', a: '192.168.10.129' }, { label: 'Dernier', kind: 'ip', a: '192.168.10.190' }, { label: 'Hôtes', kind: 'num', a: 62 }], corr: '<p>Bloc 64 → .128 / .191 · .129 → .190 · 62.</p>' },
          { q: 'b) <b class="mono">172.16.45.200/20</b>', pts: 1, fields: [{ label: 'Réseau', kind: 'ip', a: '172.16.32.0' }, { label: 'Broadcast', kind: 'ip', a: '172.16.47.255' }, { label: '1er hôte', kind: 'ip', a: '172.16.32.1' }, { label: 'Dernier', kind: 'ip', a: '172.16.47.254' }, { label: 'Hôtes', kind: 'num', a: 4094 }], corr: '<p>Bloc 16 dans le 3<sup>e</sup> octet → 172.16.32.0 / 172.16.47.255 · 4 094 hôtes.</p>' },
          { q: 'c) <b class="mono">10.15.99.17/29</b>', pts: 1, fields: [{ label: 'Réseau', kind: 'ip', a: '10.15.99.16' }, { label: 'Broadcast', kind: 'ip', a: '10.15.99.23' }, { label: '1er hôte', kind: 'ip', a: '10.15.99.17' }, { label: 'Dernier', kind: 'ip', a: '10.15.99.22' }, { label: 'Hôtes', kind: 'num', a: 6 }], corr: '<p>Bloc 8 → .16 / .23 · .17 → .22 · 6.</p>' },
          { q: 'd) <b class="mono">192.168.5.63/27</b>', pts: 1, fields: [{ label: 'Réseau', kind: 'ip', a: '192.168.5.32' }, { label: 'Broadcast', kind: 'ip', a: '192.168.5.63' }, { label: '1er hôte', kind: 'ip', a: '192.168.5.33' }, { label: 'Dernier', kind: 'ip', a: '192.168.5.62' }, { label: 'Hôtes', kind: 'num', a: 30 }], corr: '<p>Bloc 32 → .32 / .63 · .33 → .62 · 30. <b>192.168.5.63 est le broadcast</b> : non attribuable à un hôte — c\'est le piège classique.</p>' },
          { q: 'e) <b class="mono">10.200.7.9/13</b>', pts: 1, fields: [{ label: 'Réseau', kind: 'ip', a: '10.200.0.0' }, { label: 'Broadcast', kind: 'ip', a: '10.207.255.255' }, { label: '1er hôte', kind: 'ip', a: '10.200.0.1' }, { label: 'Dernier', kind: 'ip', a: '10.207.255.254' }, { label: 'Hôtes', kind: 'num', a: 524286 }], corr: '<p>/13 → 255.248.0.0 → bloc 8 dans le 2<sup>e</sup> octet ; 200 = 8 × 25 → 10.200.0.0 / 10.207.255.255 · 2<sup>19</sup> − 2 = 524 286.</p>' },
          { q: 'f) <b class="mono">172.20.130.5/23</b>', pts: 1, fields: [{ label: 'Réseau', kind: 'ip', a: '172.20.130.0' }, { label: 'Broadcast', kind: 'ip', a: '172.20.131.255' }, { label: '1er hôte', kind: 'ip', a: '172.20.130.1' }, { label: 'Dernier', kind: 'ip', a: '172.20.131.254' }, { label: 'Hôtes', kind: 'num', a: 510 }], corr: '<p>Bloc 2 dans le 3<sup>e</sup> octet → 172.20.130.0 / 172.20.131.255 · 510.</p>' }
        ]
      },
      {
        title: 'Étude de cas : plan d\'adressage du Ministère', min: 20, src: 'Plan S1 · Ex. 2',
        statement: `<p>La Direction de l'Informatique du Ministère des Finances dispose du bloc <b>10.20.0.0/22</b> pour interconnecter Niamey (siège), Zinder et Tahoua. Besoins (passerelle comprise) :</p>
${table(['Réseau', 'Hôtes'], [['LAN Niamey — Administration & Finances', '300'], ['LAN Niamey — Direction des Impôts', '200'], ['LAN Zinder', '100'], ['LAN Tahoua', '60'], ['DMZ serveurs (Niamey)', '25'], ['3 liaisons WAN : Niamey–Zinder, Niamey–Tahoua, Zinder–Tahoua', '2 chacune']])}`,
        parts: [
          { q: '1. Combien d\'adresses contient le bloc /22 ? Les besoins tiennent-ils ? Justifie par un calcul.', pts: 1, fields: [{ label: 'Adresses du /22', kind: 'num', a: 1024 }, { label: 'Total nécessaire', kind: 'num', a: 1004 }], corr: '<p>/22 → 2<sup>10</sup> = 1 024 adresses. Tailles : 300 → 512 (/23) · 200 → 256 (/24) · 100 → 128 (/25) · 60 → 64 (/26) · 25 → 32 (/27) · 3 WAN → 3 × 4 = 12 (/30). Total = <b>1 004 ≤ 1 024</b> → ça tient (reste 20 adresses).</p>' },
          { q: '2. Établis le plan VLSM complet (adresses réseau avec préfixe).', pts: 3, fields: [{ label: 'Admin & Finances', kind: 'cidr', a: '10.20.0.0/23' }, { label: 'Impôts', kind: 'cidr', a: '10.20.2.0/24' }, { label: 'Zinder', kind: 'cidr', a: '10.20.3.0/25' }, { label: 'Tahoua', kind: 'cidr', a: '10.20.3.128/26' }, { label: 'DMZ', kind: 'cidr', a: '10.20.3.192/27' }, { label: 'WAN Niamey–Zinder', kind: 'cidr', a: '10.20.3.224/30' }, { label: 'WAN Niamey–Tahoua', kind: 'cidr', a: '10.20.3.228/30' }, { label: 'WAN Zinder–Tahoua', kind: 'cidr', a: '10.20.3.232/30' }], corr: table(['Réseau', 'Préfixe', 'Réseau', 'Plage', 'Broadcast', 'Passerelle'], [['Admin', '/23', '10.20.0.0', '10.20.0.1 → 10.20.1.254', '10.20.1.255', '10.20.0.1'], ['Impôts', '/24', '10.20.2.0', '.1 → .254', '10.20.2.255', '10.20.2.1'], ['Zinder', '/25', '10.20.3.0', '.1 → .126', '10.20.3.127', '10.20.3.1'], ['Tahoua', '/26', '10.20.3.128', '.129 → .190', '10.20.3.191', '10.20.3.129'], ['DMZ', '/27', '10.20.3.192', '.193 → .222', '10.20.3.223', '10.20.3.193'], ['WAN N–Z', '/30', '10.20.3.224', '.225 – .226', '10.20.3.227', '—'], ['WAN N–T', '/30', '10.20.3.228', '.229 – .230', '10.20.3.231', '—'], ['WAN Z–T', '/30', '10.20.3.232', '.233 – .234', '10.20.3.235', '—']]) },
          { q: '3. Quelles adresses restent libres ? Propose une utilisation.', pts: 1, corr: '<p>10.20.3.236 → 10.20.3.255 (20 adresses) = 10.20.3.236/30 + 10.20.3.240/28. Usage : une 4<sup>e</sup> liaison WAN (/30) et un réseau d\'administration des équipements (/28, 14 hôtes : switchs, bornes, onduleurs).</p>' },
          { q: '4. Zinder doit passer à 140 hôtes l\'an prochain. Le plan tient-il ? Que proposes-tu ?', pts: 1, corr: '<p>140 → 142 adresses → il faut un /24 (256). Il ne reste que 20 adresses → <b>non</b>. Solutions : demander un bloc supplémentaire (ex. 10.20.4.0/24) et y migrer Zinder, ou tout redécouper à partir d\'un /21. Réflexe à écrire : « prévoir une marge de croissance de 20 à 30 % dès la conception ».</p>' }
        ]
      },
      {
        title: 'Agrégation de routes', min: 10, src: 'Plan S1 · Ex. 3',
        statement: '<p>Donne la route résumée la plus précise pour chaque groupe, et dis si un problème se pose.</p>',
        parts: [
          { q: 'a) 172.16.8.0/24 · 172.16.9.0/24 · 172.16.10.0/24 · 172.16.11.0/24', pts: 1, fields: [{ kind: 'cidr', a: '172.16.8.0/22' }], corr: '<p>8 = 00001000, 11 = 00001011 → 6 bits communs → 16 + 6 = <b>172.16.8.0/22</b>. Exact.</p>' },
          { q: 'b) 10.1.64.0/20 · 10.1.80.0/20', pts: 1, fields: [{ kind: 'cidr', a: '10.1.64.0/19' }], corr: '<p>64 = 01000000, 80 = 01010000 → 3 bits communs → <b>10.1.64.0/19</b> (couvre 64 → 95 ✓).</p>' },
          { q: 'c) 192.168.1.0/24 · 192.168.2.0/24 · 192.168.3.0/24 (le routeur ne connaît pas 192.168.0.0/24)', pts: 1, fields: [{ label: 'Résumé', kind: 'cidr', a: '192.168.0.0/22' }], corr: '<p>1, 2, 3 → 6 bits communs → 192.168.0.0/22. <b>Problème</b> : il inclut 192.168.0.0/24, absent → sur-agrégation (trou noir ou boucle). Résumé correct : 192.168.1.0/24 + 192.168.2.0/23.</p>' }
        ]
      },
      {
        title: 'Diagnostic : trouve l\'erreur', min: 8, src: 'Plan S1 · Ex. 4',
        parts: [
          { q: 'a) Poste : IP 192.168.20.70, masque 255.255.255.192, passerelle 192.168.20.62. Il joint ses voisins mais pas Internet.', pts: 0.5, corr: '<p>/26 → bloc 64 : le poste est dans 192.168.20.64/26 (65 à 126). La passerelle .62 est dans 192.168.20.0/26 : <b>passerelle hors sous-réseau</b>. Correction : 192.168.20.65 (ou toute adresse .65-.126 configurée sur le routeur).</p>' },
          { q: 'b) Deux postes sur le même switch (même VLAN) : 10.0.0.10/25 et 10.0.0.130/25. Le ping échoue.', pts: 0.5, corr: '<p>Bloc 128 : 10.0.0.10 ∈ 10.0.0.0/25 et 10.0.0.130 ∈ 10.0.0.128/25 : deux sous-réseaux → il faut un routeur (ou passer les deux en /24).</p>' },
          { q: 'c) Un serveur est configuré en 172.16.31.255/20. Correct ?', pts: 0.5, corr: '<p>/20 → bloc 16 → réseau 172.16.16.0, broadcast 172.16.31.255 : c\'est le <b>broadcast</b>, invalide pour un hôte.</p>' },
          { q: 'd) Un technicien saisit le masque 255.255.253.0. Que se passe-t-il ?', pts: 0.5, corr: '<p>253 = 11111101 → masque <b>non contigu</b>, invalide : le système le refuse.</p>' }
        ]
      },
      {
        title: 'Calcul inverse', min: 7, src: 'Plan S1 · Ex. 5',
        statement: '<p>On découpe <b>172.16.0.0/16</b> en au moins 50 sous-réseaux pouvant chacun recevoir 1 000 hôtes.</p>',
        parts: [
          { q: 'a) Quel préfixe et quel masque ? Combien de sous-réseaux et d\'hôtes par sous-réseau ?', pts: 1, fields: [{ label: 'Préfixe', kind: 'mask', a: '/22' }, { label: 'Nb sous-réseaux', kind: 'num', a: 64 }, { label: 'Hôtes / sous-réseau', kind: 'num', a: 1022 }], corr: '<p>50 → 2<sup>6</sup> = 64 → 6 bits → <b>/22</b> (255.255.252.0) : 64 sous-réseaux de 2<sup>10</sup> − 2 = 1 022 hôtes ✓. (7 bits → /23 → 510 hôtes, insuffisant.)</p>' },
          { q: 'b) Adresse réseau et broadcast du 10<sup>e</sup> sous-réseau (le premier est 172.16.0.0).', pts: 0.5, fields: [{ label: 'Réseau', kind: 'ip', a: '172.16.36.0' }, { label: 'Broadcast', kind: 'ip', a: '172.16.39.255' }], corr: '<p>Bloc 4 dans le 3<sup>e</sup> octet ; 10<sup>e</sup> → indice 9 → 9 × 4 = 36 → <b>172.16.36.0/22</b>, broadcast <b>172.16.39.255</b>.</p>' },
          { q: 'c) Quel wildcard écrire dans une ACL pour ce sous-réseau ?', pts: 0.5, fields: [{ kind: 'ip', a: '0.0.3.255' }], corr: '<p>255.255.255.255 − 255.255.252.0 = <b>0.0.3.255</b>.</p>' }
        ]
      },
      {
        title: 'IPv6', min: 10, src: 'Plan S1 · Ex. 6',
        parts: [
          { q: 'a) Compresse : 2001:0DB8:0000:0000:0000:FF00:0042:8329 et 2001:0db8:0000:0001:0000:0000:0000:0001', pts: 0.5, fields: [{ label: '1re', kind: 'v6', strict: true, a: '2001:db8::ff00:42:8329' }, { label: '2e', kind: 'v6', strict: true, a: '2001:db8:0:1::1' }], corr: '<p>2001:db8::ff00:42:8329 · 2001:db8:0:1::1 (le :: remplace la plus longue suite ; le 0 isolé reste « 0 »).</p>' },
          { q: 'b) Développe en entier : fe80::1:2a', pts: 0.5, fields: [{ kind: 'v6full', a: 'fe80:0000:0000:0000:0000:0000:0001:002a', wide: true }], corr: '<p>fe80:0000:0000:0000:0000:0000:0001:002a</p>' },
          { q: 'c) L\'adresse 2001:db8::1::5 est-elle valide ?', pts: 0.5, corr: '<p>Non : « :: » apparaît deux fois, on ne peut pas savoir combien de groupes nuls chacun remplace.</p>' },
          { q: 'd) Type de : fe80::1 · ff02::2 · 2001:db8:acad::1 · fd12:3456::1 · ::1', pts: 0.5, corr: '<p>Lien local · multicast « tous les routeurs » · unicast global (plage de documentation) · ULA (privée) · bouclage.</p>' },
          { q: 'e) Adresse EUI-64 d\'une interface de MAC 00-1A-2B-3C-4D-5E dans 2001:db8:a:1::/64.', pts: 0.5, fields: [{ kind: 'v6', a: '2001:db8:a:1:21a:2bff:fe3c:4d5e', wide: true }], corr: '<p>00:1A:2B + FF:FE + 3C:4D:5E ; 00 → 02 → <b>2001:db8:a:1:21a:2bff:fe3c:4d5e</b>.</p>' },
          { q: 'f) Le Ministère reçoit 2001:db8:4e0::/48. Combien de /64 ? Donne les trois premiers.', pts: 0.5, fields: [{ label: 'Nombre de /64', kind: 'num', a: 65536 }], corr: '<p>64 − 48 = 16 bits → 2<sup>16</sup> = 65 536. Premiers : 2001:db8:4e0::/64, 2001:db8:4e0:1::/64, 2001:db8:4e0:2::/64.</p>' }
        ]
      }
    ],

    phrases: [
      'Bloc = 256 moins le masque dans l\'octet intéressant ; réseau = plus grand multiple du bloc ≤ l\'IP ; broadcast = réseau + bloc − 1.',
      'Privées : 10/8, 172.16/12 (de 172.16 à 172.31), 192.168/16 ; 169.254 = APIPA, pas de DHCP.',
      'VLSM : besoin + 2, puissance de 2, du plus grand au plus petit, à la suite, sans oublier les /30 des WAN.',
      'Agrégation : bits communs depuis la gauche ; un résumé exact couvre 2 puissance n réseaux alignés.',
      'IPv6 : 128 bits, « :: » une seule fois, /64 par LAN, fe80 lien local, ff00 multicast, NDP remplace ARP, EUI-64 = FFFE + 7e bit inversé.'
    ]
  });
})();
