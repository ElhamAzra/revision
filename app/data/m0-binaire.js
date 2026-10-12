/* Module 0 — Les fondations : binaire, hexadécimal, masques, ET logique, calcul mental. */
(function () {
  'use strict';
  const { key, trap, tip, reflex, ex, mnemo, why, f, fi, frac, table, steps, ul, bits, w, stepper, reveal } = App.md;

  App.registerModule({
    id: 'm0', order: 0, label: 'Fondations', short: 'Binaire & astuces',
    title: 'Binaire, hexadécimal et calcul mental',
    subtitle: 'La base de tout l\'adressage IP — à maîtriser en premier',
    icon: '🤖', color: '#7c3aed', day: null, epreuve: 'E2',
    intro: 'Sans binaire, l\'adressage IP reste une suite de recettes. Avec lui, tout devient logique. Ce module te donne les <b>astuces de calcul mental</b> pour travailler <b>sans calculatrice</b>, comme le jour J.',

    pretest: [
      { type: 'qcm', q: 'Combien vaut le binaire <span class="mono">11000000</span> ?', choices: ['192', '128', '224', '3'], a: 0, expl: '128 + 64 = 192.' },
      { type: 'qcm', q: 'Combien de valeurs différentes peut prendre un octet ?', choices: ['256', '255', '128', '8'], a: 0, expl: '2<sup>8</sup> = 256 valeurs, de 0 à 255.' },
      { type: 'qcm', q: 'Laquelle de ces valeurs ne peut PAS apparaître dans un masque de sous-réseau ?', choices: ['253', '252', '248', '224'], a: 0, expl: '253 = 11111101 : les 1 ne sont pas tous collés à gauche.' }
    ],

    lessons: [
      {
        title: 'Les bits et leurs poids', min: 5,
        essentiel: ul([
          'Un <b>octet</b> = 8 bits. Chaque bit a un <b>poids</b> : <b class="mono">128 64 32 16 8 4 2 1</b>.',
          'La valeur d\'un octet = somme des poids des bits à 1. Maximum : 255 (tous à 1).',
          'Un octet a <b>256</b> valeurs possibles (0 à 255) = 2<sup>8</sup>.'
        ]),
        html: `
<p class="lead">Un ordinateur ne connaît que deux états : <b>0</b> (pas de courant) et <b>1</b> (courant). Pour écrire un nombre, on aligne des bits, et chaque position a une valeur double de sa voisine de droite.</p>
${table(['Position', '7', '6', '5', '4', '3', '2', '1', '0'], [['Puissance', '2<sup>7</sup>', '2<sup>6</sup>', '2<sup>5</sup>', '2<sup>4</sup>', '2<sup>3</sup>', '2<sup>2</sup>', '2<sup>1</sup>', '2<sup>0</sup>'], ['<b>Poids</b>', '<b>128</b>', '<b>64</b>', '<b>32</b>', '<b>16</b>', '<b>8</b>', '<b>4</b>', '<b>2</b>', '<b>1</b>']])}
<p>Exemple : <span class="mono">${'10101000'}</span> → 128 + 32 + 8 = <b>168</b> (comme dans 192.<b>168</b>.1.1).</p>
${w('bits8')}
<h3>Les puissances de 2 à connaître par cœur</h3>
${table(['n', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '16'], [['2<sup>n</sup>', '2', '4', '8', '16', '32', '64', '128', '256', '512', '1 024', '2 048', '4 096', '65 536']])}
${tip('2<sup>10</sup> = 1 024 ≈ 1 000. Donc 2<sup>20</sup> ≈ 1 million et 2<sup>32</sup> ≈ 4,3 milliards : c\'est le nombre total d\'adresses IPv4.')}
${mnemo('Pour retrouver les poids, pars de 1 à droite et <b>double</b> à chaque case : 1, 2, 4, 8, 16, 32, 64, 128. Dans l\'autre sens, <b>divise par 2</b> depuis 128.')}
${key('Une adresse IPv4 = 4 octets = 32 bits, écrits en décimal pointé : 192.168.10.130. Chaque nombre entre les points est un octet (0 à 255).')}
`,
        check: [
          { type: 'input', q: 'Combien vaut <span class="mono">00010101</span> ?', fields: [{ kind: 'num', a: 21 }], expl: '16 + 4 + 1 = 21.' },
          { type: 'qcm', q: 'Quel est le poids du bit le plus à gauche d\'un octet ?', choices: ['128', '256', '255', '64'], a: 0, expl: '2<sup>7</sup> = 128. (256 = 2<sup>8</sup> n\'existe pas dans un octet.)' },
          { type: 'input', q: 'Combien vaut 2<sup>12</sup> ?', fields: [{ kind: 'num', a: 4096 }], expl: '2<sup>10</sup> = 1 024, × 4 = 4 096. C\'est le nombre d\'adresses d\'un /20.' }
        ]
      },
      {
        title: 'Décimal → binaire en 20 secondes', min: 7,
        essentiel: ul([
          '<b>Méthode des soustractions</b> : on retire les poids de gauche à droite (128, 64, 32…) tant que c\'est possible ; chaque retrait = un 1.',
          '<b>Astuce du complément</b> pour les grands nombres : 255 − n, puis on inverse les bits.',
          'Toujours écrire <b>8 bits</b> (avec les 0 de tête).'
        ]),
        html: `
<h3>Méthode 1 — les soustractions (la plus rapide)</h3>
${steps(['Écris les poids : 128 64 32 16 8 4 2 1.', 'Le nombre est-il ≥ 128 ? Si oui, écris 1 et retire 128. Sinon, écris 0.', 'Recommence avec 64, puis 32… jusqu\'à 1.'])}
${stepper([
  `<p><b>200</b> → 200 ≥ 128 ✓ → <b>1</b>, reste 72.</p><p class="mono">1 _ _ _ _ _ _ _</p>`,
  `<p>72 ≥ 64 ✓ → <b>1</b>, reste 8.</p><p class="mono">1 1 _ _ _ _ _ _</p>`,
  `<p>8 &lt; 32 → 0 · 8 &lt; 16 → 0 · 8 ≥ 8 ✓ → <b>1</b>, reste 0.</p><p class="mono">1 1 0 0 1 _ _ _</p>`,
  `<p>Il reste 0 : tous les bits suivants sont à 0.</p><p class="mono" style="font-size:1.3rem"><b>200 = 11001000</b></p>`
], 'Convertir 200 en binaire')}
<h3>Méthode 2 — l'astuce du complément (pour 200 à 255)</h3>
<p>Pour un grand nombre, il est plus simple de calculer ce qui <b>manque</b> pour faire 255 :</p>
${ex(`<b>252</b> : 255 − 252 = 3 = <span class="mono">00000011</span> → on inverse tout → <b class="mono">11111100</b>.<br><b>223</b> : 255 − 223 = 32 = <span class="mono">00100000</span> → <b class="mono">11011111</b>.`)}
<h3>Méthode 3 — les divisions par 2 (si tu l'as apprise ainsi)</h3>
<p>On divise par 2 et on note les restes, puis on lit les restes <b>de bas en haut</b> : 45 → 22 r1 → 11 r0 → 5 r1 → 2 r1 → 1 r0 → 0 r1 → <b>101101</b> → sur 8 bits <b>00101101</b>. Plus lent, mais sûr.</p>
${tip('Repère les « morceaux » connus : 172 = 128 + 32 + 8 + 4 ; 168 = 128 + 32 + 8 ; 10 = 8 + 2 ; 100 = 64 + 32 + 4.')}
${trap('Oublier les 0 de tête : 45 s\'écrit <b>00101101</b> sur 8 bits, pas 101101. Dans une adresse IP, chaque octet fait exactement 8 bits.')}
${reflex('Le jour J : tu n\'as besoin de convertir en binaire que l\'<b>octet intéressant</b> d\'une adresse (celui où le masque n\'est ni 255 ni 0).')}
`,
        check: [
          { type: 'input', q: 'Convertis <b>172</b> en binaire (8 bits).', fields: [{ kind: 'bin', a: '10101100' }], expl: '128 + 32 + 8 + 4 = 172 → 10101100.' },
          { type: 'input', q: 'Convertis <b>99</b> en binaire (8 bits).', fields: [{ kind: 'bin', a: '01100011' }], expl: '64 + 32 + 2 + 1 = 99 → 01100011.' },
          { type: 'input', q: 'Avec l\'astuce du complément, convertis <b>247</b>.', fields: [{ kind: 'bin', a: '11110111' }], expl: '255 − 247 = 8 = 00001000 → inversé : 11110111.' }
        ]
      },
      {
        title: 'Binaire → décimal et lecture par quartets', min: 5,
        essentiel: ul([
          'On additionne les poids des bits à 1.',
          '<b>Quartets</b> : un octet = 2 × 4 bits. Valeur = (quartet gauche × 16) + quartet droit.',
          'Formes à reconnaître d\'un coup d\'œil : 11110000 = 240, 00001111 = 15, 01111111 = 127, 10000000 = 128.'
        ]),
        html: `
<p>Pour lire <span class="mono">10110110</span> : 128 + 32 + 16 + 4 + 2 = <b>182</b>.</p>
<h3>L'astuce des quartets</h3>
<p>Coupe l'octet en deux moitiés de 4 bits. Chaque moitié vaut entre 0 et 15 (poids 8 4 2 1).</p>
${f(`1011 | 0110 &nbsp;→&nbsp; 11 × 16 + 6 = <b class="hl">182</b>`, 'quartet fort × 16 + quartet faible')}
<p>C'est exactement le principe de l'hexadécimal (leçon suivante) : <b>B6</b> = 182.</p>
<h3>Motifs à reconnaître instantanément</h3>
${table(['Binaire', 'Décimal', 'Où le voit-on ?'], [
  ['<span class="mono">11111111</span>', '255', 'masque plein, broadcast'],
  ['<span class="mono">11110000</span>', '240', 'masque /28 ou /20'],
  ['<span class="mono">00001111</span>', '15', 'wildcard d\'un /28 ou /20'],
  ['<span class="mono">01111111</span>', '127', 'boucle locale 127.x'],
  ['<span class="mono">10000000</span>', '128', 'masque /25'],
  ['<span class="mono">00111111</span>', '63', 'wildcard d\'un /26, broadcast .63'],
  ['<span class="mono">2<sup>n</sup> − 1</span>', '1, 3, 7, 15, 31, 63, 127, 255', 'bits hôte tous à 1 → fin de bloc']
])}
${key('Les nombres de la forme 2<sup>n</sup> − 1 (3, 7, 15, 31, 63, 127, 255) sont « n bits à 1 à droite ». Ce sont les valeurs de broadcast et de wildcard.')}
`,
        check: [
          { type: 'input', q: 'Combien vaut <span class="mono">11100000</span> ?', fields: [{ kind: 'num', a: 224 }], expl: '128 + 64 + 32 = 224 (masque /27).' },
          { type: 'input', q: 'Par quartets : <span class="mono">0100 1011</span> = ?', fields: [{ kind: 'num', a: 75 }], expl: '4 × 16 + 11 = 75.' }
        ]
      },
      {
        title: 'L\'hexadécimal : MAC et IPv6', min: 6,
        essentiel: ul([
          'Base 16 : chiffres 0-9 puis <b>A=10, B=11, C=12, D=13, E=14, F=15</b>.',
          '<b>1 chiffre hexa = 4 bits</b> (un quartet). Un octet = 2 chiffres hexa (00 à FF).',
          'Adresse MAC = 48 bits = 12 chiffres hexa ; groupe IPv6 (hextet) = 16 bits = 4 chiffres hexa.'
        ]),
        html: `
${table(['Hexa', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'], [
  ['Décimal', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'],
  ['Binaire', '0000', '0001', '0010', '0011', '0100', '0101', '0110', '0111', '1000', '1001', '1010', '1011', '1100', '1101', '1110', '1111']
])}
<h3>Conversions express</h3>
${ul([
  'Hexa → binaire : chaque chiffre donne 4 bits. <b>3C</b> = 0011 1100.',
  'Hexa → décimal : premier chiffre × 16 + second. <b>3C</b> = 3 × 16 + 12 = <b>60</b>.',
  'Décimal → hexa : divise par 16. 200 = 12 × 16 + 8 → <b>C8</b>.'
])}
<h3>Où le rencontre-t-on ?</h3>
${ul([
  '<b>Adresse MAC</b> : 00:1A:2B:3C:4D:5E — 6 octets = 48 bits. Les 3 premiers octets = <b>OUI</b> (constructeur).',
  '<b>IPv6</b> : 2001:0DB8:0000:0000:0000:FF00:0042:8329 — 8 groupes de 16 bits.',
  '<b>EtherType</b> : 0x0800 (IPv4), 0x0806 (ARP), 0x86DD (IPv6), 0x8100 (VLAN).'
])}
${tip('Pour retenir les lettres : <b>A</b> = 10 (« dix »), et on compte : B 11, C 12, D 13, E 14, F 15. Et 1010 = A, 1111 = F.')}
${trap('Le préfixe <code>0x</code> signale l\'hexadécimal : 0x10 = 16, pas 10.')}
`,
        check: [
          { type: 'input', q: 'Combien vaut l\'octet hexadécimal <b>FF</b> en décimal ?', fields: [{ kind: 'num', a: 255 }], expl: '15 × 16 + 15 = 255.' },
          { type: 'input', q: 'Écris <b>C</b> (hexa) en binaire 4 bits.', fields: [{ kind: 'bin', a: '1100' }], expl: 'C = 12 = 8 + 4 → 1100.' },
          { type: 'qcm', q: 'Combien de bits contient une adresse MAC ?', choices: ['48', '32', '64', '128'], a: 0, expl: '12 chiffres hexa × 4 bits = 48 bits.' }
        ]
      },
      {
        title: 'Les 9 valeurs d\'un octet de masque', min: 6,
        essentiel: ul([
          'Dans un masque, les 1 sont <b>tous collés à gauche</b>. Un octet de masque ne peut valoir que <b>0, 128, 192, 224, 240, 248, 252, 254, 255</b>.',
          'Construction : on ajoute à chaque fois la moitié de ce qu\'on vient d\'ajouter : 128, +64, +32, +16…',
          '<b>Bloc = 256 − valeur</b> : 192 → 64, 224 → 32, 240 → 16, 248 → 8, 252 → 4.'
        ]),
        html: `
${w('masks')}
<h3>Pourquoi seulement ces valeurs ?</h3>
<p>Le masque sépare la partie <span class="net-t">réseau</span> (bits à 1) de la partie <span class="host-t">hôte</span> (bits à 0). Comme le réseau est toujours « devant », les 1 sont contigus : ${bits('11111111.11111111.11110000.00000000', 20)} = 255.255.240.0 = /20.</p>
${trap('<b>255.255.253.0</b> est invalide : 253 = 11111101, il y a un 0 au milieu des 1. Réponse attendue : « masque non contigu, refusé ».')}
<h3>Le « bloc » (ou nombre magique)</h3>
${f(`Bloc = 256 − <var>valeur du masque</var>`, 'la taille d\'un sous-réseau dans l\'octet intéressant')}
<p>Le bloc est aussi égal à 2<sup>(bits à 0 de cet octet)</sup> : 240 = 11110000 → 4 zéros → 2<sup>4</sup> = 16 ✓.</p>
${mnemo('« 128 – 192 – 224 – 240 – 248 – 252 – 254 – 255 » : retiens la suite des blocs à l\'envers, 128 – 64 – 32 – 16 – 8 – 4 – 2 – 1. Valeur + bloc = 256 toujours.')}
`,
        check: [
          { type: 'input', q: 'Bloc d\'un masque 255.255.255.<b>224</b> ?', fields: [{ kind: 'num', a: 32 }], expl: '256 − 224 = 32.' },
          { type: 'tf', q: '255.255.255.250 est un masque valide.', a: false, expl: '250 = 11111010 : non contigu.' },
          { type: 'input', q: 'Quelle valeur de masque donne un bloc de 8 ?', fields: [{ kind: 'num', a: 248 }], expl: '256 − 8 = 248.' }
        ]
      },
      {
        title: 'Le ET logique : comment on trouve le réseau', min: 7,
        essentiel: ul([
          'Adresse réseau = <b>adresse ET masque</b>, bit à bit (1 ET 1 = 1, sinon 0).',
          'Octet de masque 255 → l\'octet est <b>recopié</b> ; 0 → il devient <b>0</b>.',
          'Octet partiel : le ET revient à <b>arrondir au multiple du bloc inférieur</b> → c\'est pourquoi la méthode du nombre magique marche.'
        ]),
        html: `
${table(['A', 'B', 'A ET B'], [['0', '0', '0'], ['0', '1', '0'], ['1', '0', '0'], ['1', '1', '<b>1</b>']])}
<p>L'ordinateur (et le routeur) fait ce calcul pour savoir si une destination est <b>dans son réseau</b> ou s'il faut passer par la passerelle.</p>
${ex(`<b>172.16.45.200/20</b> → masque 255.255.240.0. Seul le 3<sup>e</sup> octet est intéressant :<br>
<div class="binrow"><span class="lab">45</span>${bits('00101101', 4)}<span></span></div>
<div class="binrow"><span class="lab">240</span>${bits('11110000', 4)}<span></span></div>
<div class="binrow"><span class="lab">ET → 32</span>${bits('00100000', 4)}<span></span></div>
Réseau : <b>172.16.32.0</b>. Le ET a « gommé » les 4 bits hôte : 45 est arrondi au multiple de 16 inférieur (32).`, 'Exemple résolu')}
${why('Les bits hôte valent 8, 4, 2, 1 : leur somme est toujours &lt; 16. Les mettre à 0 revient donc à descendre au multiple de 16 juste en dessous. C\'est la <b>méthode du nombre magique</b> : réseau = plus grand multiple du bloc ≤ valeur.')}
<p>Joue avec le curseur : observe comment la frontière <span class="net-t">réseau</span> / <span class="host-t">hôte</span> se déplace.</p>
${w('ipviz', { ip: '172.16.45.200/20' })}
${key('Broadcast = tous les bits hôte à <b>1</b> = réseau + bloc − 1 dans l\'octet intéressant, puis 255 dans les octets suivants.')}
`,
        check: [
          { type: 'input', q: '130 ET 192 = ?', fields: [{ kind: 'num', a: 128 }], expl: '10000010 ET 11000000 = 10000000 = 128 (multiple de 64 inférieur).' },
          { type: 'input', q: 'Adresse réseau de <b>192.168.10.130/26</b> ?', fields: [{ kind: 'ip', a: '192.168.10.128' }], expl: 'Bloc 64 : 130 est entre 128 et 192 → 192.168.10.128.' }
        ]
      },
      {
        title: 'Calcul mental express : les réflexes', min: 6,
        essentiel: ul([
          'Hôtes = 2<sup>h</sup> − 2 (h = bits hôte) ; adresses = 2<sup>h</sup>.',
          'Sous-réseaux créés = 2<sup>n</sup> (n = bits empruntés).',
          'Multiple du bloc ≤ v : fais « v ÷ bloc », garde la partie entière, multiplie par le bloc.'
        ]),
        html: `
${f(`Hôtes = 2<sup><var>h</var></sup> − 2 &nbsp;&nbsp;·&nbsp;&nbsp; <var>h</var> = 32 − préfixe`, 'on retire l\'adresse réseau et le broadcast')}
${f(`Sous-réseaux = 2<sup><var>n</var></sup> &nbsp;&nbsp;·&nbsp;&nbsp; <var>n</var> = nouveau préfixe − ancien préfixe`, 'bits empruntés')}
<h3>Trouver vite le multiple du bloc</h3>
${ul([
  'Bloc 64 : 0, 64, 128, 192 → seulement 4 choix.',
  'Bloc 32 : 0, 32, 64, 96, 128, 160, 192, 224.',
  'Bloc 16 : compte de 16 en 16, ou fais 45 ÷ 16 = 2,8 → 2 × 16 = 32.',
  'Bloc 8 ou 4 : multiples de 8 (… 96, 104, 112, 120…) ou de 4.'
])}
<h3>Les tailles à reconnaître</h3>
${table(['Préfixe', '/30', '/29', '/28', '/27', '/26', '/25', '/24', '/23', '/22', '/21', '/20'], [['Adresses', '4', '8', '16', '32', '64', '128', '256', '512', '1 024', '2 048', '4 096'], ['Hôtes', '2', '6', '14', '30', '62', '126', '254', '510', '1 022', '2 046', '4 094']])}
${trap('Confondre adresses (2<sup>h</sup>) et hôtes (2<sup>h</sup> − 2). Pour 62 hôtes il faut 64 adresses → /26 ; pour 63 hôtes il faut un /25 !')}
${reveal('Combien de /26 dans un /22 ?', '26 − 22 = 4 bits empruntés → 2<sup>4</sup> = <b>16</b>.')}
${reflex('Avant tout calcul, écris dans la marge la ligne « 128 64 32 16 8 4 2 1 » et la suite des masques « 128 192 224 240 248 252 254 255 ». 10 secondes qui évitent toutes les erreurs.')}
`,
        check: [
          { type: 'input', q: 'Combien d\'hôtes dans un /27 ?', fields: [{ kind: 'num', a: 30 }], expl: '2<sup>5</sup> − 2 = 30.' },
          { type: 'input', q: 'Combien de sous-réseaux /28 dans un /24 ?', fields: [{ kind: 'num', a: 16 }], expl: '2<sup>28−24</sup> = 2<sup>4</sup> = 16.' },
          { type: 'input', q: 'Plus grand multiple de 16 inférieur ou égal à 200 ?', fields: [{ kind: 'num', a: 192 }], expl: '200 ÷ 16 = 12,5 → 12 × 16 = 192.' }
        ]
      }
    ],

    cards: [
      { front: 'Les 8 poids d\'un octet ?', back: '<b class="mono">128 64 32 16 8 4 2 1</b>' },
      { front: 'Les 9 valeurs possibles d\'un octet de masque ?', back: '<b class="mono">0 128 192 224 240 248 252 254 255</b>' },
      { front: 'Bloc (nombre magique) pour un octet de masque à 224 ?', back: '256 − 224 = <b>32</b>' },
      { front: 'Bloc pour 240 ? pour 248 ? pour 252 ?', back: '<b>16 · 8 · 4</b>' },
      { front: '2<sup>10</sup> = ?', back: '<b>1 024</b> (≈ 1 000)' },
      { front: '2<sup>16</sup> = ?', back: '<b>65 536</b>' },
      { front: 'Nombre de valeurs d\'un octet ?', back: '<b>256</b> (0 à 255) = 2<sup>8</sup>' },
      { front: '200 en binaire ?', back: '<b class="mono">11001000</b> (128 + 64 + 8)' },
      { front: '172 en binaire ?', back: '<b class="mono">10101100</b> (128 + 32 + 8 + 4)' },
      { front: '168 en binaire ?', back: '<b class="mono">10101000</b> (128 + 32 + 8)' },
      { front: '<span class="mono">11111100</span> = ?', back: '<b>252</b> (masque /30)' },
      { front: '<span class="mono">00111111</span> = ?', back: '<b>63</b> (= 2<sup>6</sup> − 1)' },
      { front: 'Astuce du complément pour convertir 250 ?', back: '255 − 250 = 5 = 00000101 → inversé : <b class="mono">11111010</b>' },
      { front: 'Hexa → décimal : A, B, C, D, E, F ?', back: '<b>10, 11, 12, 13, 14, 15</b>' },
      { front: 'Combien de bits pour un chiffre hexadécimal ?', back: '<b>4 bits</b> (un quartet)' },
      { front: '0x3C en décimal ?', back: '3 × 16 + 12 = <b>60</b>' },
      { front: 'Lecture par quartets : valeur d\'un octet ?', back: 'quartet gauche × 16 + quartet droit' },
      { front: 'Table de vérité du ET (AND) ?', back: 'Seul <b>1 ET 1 = 1</b> ; tout le reste donne 0.' },
      { front: 'Adresse réseau = ?', back: '<b>Adresse IP ET masque</b> (bits hôte à 0)' },
      { front: 'Pourquoi 255.255.253.0 est-il invalide ?', back: '253 = 11111101 : <b>masque non contigu</b>' },
      { front: 'Formule du nombre d\'hôtes ?', back: '2<sup>h</sup> − 2 (h = bits hôte = 32 − préfixe)' },
      { front: 'Formule du nombre de sous-réseaux ?', back: '2<sup>n</sup> (n = bits empruntés)' }
    ],

    qcm: [
      { type: 'qcm', q: '<span class="mono">10101010</span> vaut :', choices: ['170', '160', '172', '85'], a: 0, expl: '128 + 32 + 8 + 2 = 170.' },
      { type: 'qcm', q: '255 en binaire :', choices: ['11111111', '11111110', '10000000', '1111111'], a: 0, expl: 'Les 8 bits à 1 : 128 + 64 + … + 1 = 255.' },
      { type: 'qcm', q: 'Le chiffre hexadécimal E correspond à :', choices: ['1110', '1101', '1111', '1011'], a: 0, expl: 'E = 14 = 8 + 4 + 2 → 1110.' },
      { type: 'qcm', q: '0x80 vaut en décimal :', choices: ['128', '80', '8', '256'], a: 0, expl: '8 × 16 + 0 = 128.' },
      { type: 'qcm', q: 'Bloc d\'un octet de masque 192 :', choices: ['64', '32', '128', '192'], a: 0, expl: '256 − 192 = 64.' },
      { type: 'qcm', q: '45 ET 240 =', choices: ['32', '45', '48', '0'], a: 0, expl: '45 arrondi au multiple de 16 inférieur : 32.' },
      { type: 'qcm', q: 'Un /29 contient combien d\'hôtes utilisables ?', choices: ['6', '8', '14', '2'], a: 0, expl: '2<sup>3</sup> − 2 = 6.' },
      { type: 'qcm', q: 'Combien de bits pour 2 chiffres hexadécimaux ?', choices: ['8', '4', '16', '2'], a: 0, expl: '2 × 4 = 8 bits = 1 octet.' },
      { type: 'tf', q: 'Dans un masque, les bits à 1 représentent la partie hôte.', a: false, expl: 'Les 1 = partie réseau ; les 0 = partie hôte.' },
      { type: 'tf', q: '2<sup>n</sup> − 1 s\'écrit avec n bits à 1 à droite.', a: true, expl: 'Ex. 2<sup>4</sup> − 1 = 15 = 00001111.' },
      { type: 'order', q: 'Range ces valeurs de masque de la plus petite à la plus grande (moins de bits à 1 → plus de bits à 1).', items: ['128', '192', '224', '240', '248', '252', '254', '255'], expl: 'Chaque valeur ajoute un bit à 1 : +64, +32, +16, +8, +4, +2, +1.' },
      { type: 'match', q: 'Associe chaque valeur à son binaire.', pairs: [['224', '11100000'], ['248', '11111000'], ['15', '00001111'], ['127', '01111111']], expl: '224 = 128+64+32 ; 248 = 224+16+8 ; 15 = 8+4+2+1 ; 127 = 255 − 128.' }
    ],

    exercises: [
      {
        title: 'Échauffement : 10 conversions chronométrées', min: 6, src: 'Fondations',
        statement: '<p>Sans calculatrice. Objectif : moins de 6 minutes pour l\'ensemble.</p>',
        parts: [
          { q: 'a) 192, 224, 240, 248 en binaire.', pts: 1, fields: [{ label: '192', kind: 'bin', a: '11000000' }, { label: '224', kind: 'bin', a: '11100000' }, { label: '240', kind: 'bin', a: '11110000' }, { label: '248', kind: 'bin', a: '11111000' }], corr: '<p>11000000 · 11100000 · 11110000 · 11111000 (on ajoute un bit à 1 à chaque fois).</p>' },
          { q: 'b) 10, 45, 130 en binaire.', pts: 1.5, fields: [{ label: '10', kind: 'bin', a: '00001010' }, { label: '45', kind: 'bin', a: '00101101' }, { label: '130', kind: 'bin', a: '10000010' }], corr: '<p>10 = 8 + 2 → 00001010 · 45 = 32 + 8 + 4 + 1 → 00101101 · 130 = 128 + 2 → 10000010.</p>' },
          { q: 'c) En décimal : 10101100, 01111111, 11000011.', pts: 1.5, fields: [{ label: '10101100', kind: 'num', a: 172 }, { label: '01111111', kind: 'num', a: 127 }, { label: '11000011', kind: 'num', a: 195 }], corr: '<p>172 (128+32+8+4) · 127 (255 − 128) · 195 (128+64+2+1).</p>' },
          { q: 'd) Hexadécimal : 0xC8 en décimal ; 60 en hexa.', pts: 1, fields: [{ label: '0xC8', kind: 'num', a: 200 }, { label: '60 en hexa', kind: 'hex', a: '3C' }], corr: '<p>C8 = 12 × 16 + 8 = 200 · 60 = 3 × 16 + 12 → 3C.</p>' }
        ]
      }
    ],

    phrases: [
      'Les poids d\'un octet sont 128, 64, 32, 16, 8, 4, 2, 1 ; un octet vaut de 0 à 255.',
      'Un octet de masque vaut 0, 128, 192, 224, 240, 248, 252, 254 ou 255 ; toute autre valeur est invalide.',
      'Le bloc vaut 256 moins la valeur du masque dans l\'octet intéressant.',
      'Adresse réseau = adresse ET masque ; broadcast = bits hôte à 1.',
      'Hôtes = 2 puissance h moins 2 ; sous-réseaux = 2 puissance n bits empruntés.'
    ]
  });
})();
