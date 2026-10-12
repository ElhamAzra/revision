/* Séance 6 — Télécommunications : signal, décibels, Nyquist/Shannon, MIC, multiplexage, supports, VoIP, mobiles, accès. */
(function () {
  'use strict';
  const { key, trap, tip, reflex, ex, fix, mnemo, why, f, frac, table, steps, ul, w, stepper, reveal, code } = App.md;

  const sipSeq = JSON.stringify({
    title: 'Un appel SIP de bout en bout',
    actors: ['Poste Zinder<br><small>agent</small>', 'IPBX Niamey<br><small>proxy SIP</small>', 'Poste Niamey'],
    msgs: [
      { from: 0, to: 1, label: 'INVITE', sub: 'SIP 5060', note: 'L\'appelant envoie INVITE (avec la description SDP du codec proposé).' },
      { from: 1, to: 0, label: '100 Trying', note: 'Le proxy accuse réception : « je m\'en occupe ».' },
      { from: 1, to: 2, label: 'INVITE', note: 'Le proxy relaie l\'invitation vers le poste appelé (enregistré au préalable par REGISTER).' },
      { from: 2, to: 0, label: '180 Ringing', note: 'Le téléphone appelé sonne.' },
      { from: 2, to: 0, label: '200 OK', note: 'L\'appelé décroche.' },
      { from: 0, to: 2, label: 'ACK', note: 'L\'appelant confirme : la session est établie.' },
      { from: 0, to: 2, label: '⇄ RTP / UDP (voix)', note: 'La voix circule directement en RTP sur UDP (ports dynamiques), RTCP rapporte la qualité, SRTP chiffre.' },
      { from: 2, to: 0, label: 'BYE', note: 'Un des deux raccroche…' },
      { from: 0, to: 2, label: '200 OK', note: '… et l\'autre confirme la fin de session.' }
    ]
  });

  App.registerModule({
    id: 's6', order: 6, label: 'Séance 6', short: 'Télécoms',
    title: 'Télécommunications : transmission, VoIP, mobiles, accès',
    subtitle: 'Décibels, Shannon, MIC/E1, bilans de liaison, VoIP, 2G→5G, xDSL, fibre — Épreuve 2',
    icon: '📡', color: '#f59e0b', day: '2026-10-15', epreuve: 'Épreuve 2',
    intro: 'Les calculs qui tombent souvent (décibels, bilans de liaison, Shannon, Nyquist, bande passante VoIP, nombre d\'E1) et les architectures (VoIP, réseaux mobiles, réseaux d\'accès), avec les multiplexages TDM/SDH/WDM du cours WAN de l\'ESTN.',

    pretest: [
      { type: 'qcm', q: '+3 dB correspond à une puissance :', choices: ['multipliée par 2', 'multipliée par 3', 'multipliée par 10', 'divisée par 2'], a: 0, expl: '10 log(2) ≈ 3.' },
      { type: 'qcm', q: 'Combien de voies de voix dans un E1 ?', choices: ['30', '32', '24', '64'], a: 0, expl: '32 intervalles de temps dont 2 réservés.' },
      { type: 'qcm', q: 'Débit IP d\'un appel G.729 (paquets de 20 ms) :', choices: ['24 kbit/s', '8 kbit/s', '64 kbit/s', '80 kbit/s'], a: 0, expl: '20 octets de voix + 40 d\'en-têtes, 50 fois par seconde.' }
    ],

    lessons: [
      {
        title: 'Le vocabulaire du signal', min: 6,
        essentiel: ul([
          'Fréquence f (Hz) ; période T = 1/f ; longueur d\'onde <b>λ = c / f</b> (c = 3 × 10<sup>8</sup> m/s) : à 900 MHz, λ ≈ 33 cm.',
          '<b>Bande passante</b> (Hz) = plage de fréquences transmise (téléphone : 300 à 3 400 Hz → B = 3 100 Hz) ≠ <b>débit</b> (bit/s).',
          'Rapidité de modulation R (<b>bauds</b>) = symboles/s ; débit <b>D = R × log<sub>2</sub>(M)</b>.'
        ]),
        html: `
${ul(['Signal <b>analogique</b> : varie de façon continue (la voix dans un micro). <b>Numérique</b> : un nombre fini de valeurs (0 et 1).', '<b>Atténuation</b> : le signal s\'affaiblit avec la distance. <b>Bruit</b> : perturbations. <b>Diaphonie</b> : fils voisins qui se perturbent.', '<b>Simplex</b> (un seul sens : radio FM) · <b>half-duplex</b> (chacun son tour : talkie-walkie) · <b>full-duplex</b> (simultané : téléphone).'])}
${f(`λ = ${frac('c', 'f')} = ${frac('3 × 10<sup>8</sup>', '900 × 10<sup>6</sup>')} ≈ <b class="hl">0,33 m</b>`, 'longueur d\'onde à 900 MHz')}
${f(`D = R × log<sub>2</sub>(<var>M</var>)`, 'débit (bit/s) = bauds × bits par symbole')}
${table(['M (états)', '2', '4', '8', '16', '64', '256'], [['log<sub>2</sub>(M) bits/symbole', '1', '2', '3', '4', '6', '8']])}
${trap('Bauds ≠ bit/s, sauf si chaque symbole porte 1 bit (M = 2, ex. BPSK). Et bande passante (Hz) ≠ débit (bit/s).')}
`,
        check: [
          { type: 'input', q: 'Un modem 16-QAM à 2 400 bauds : débit en bit/s ?', fields: [{ kind: 'num', a: 9600 }], expl: '2 400 × log₂16 = 2 400 × 4 = 9 600.' },
          { type: 'input', q: 'Bande passante d\'une ligne téléphonique (300 à 3 400 Hz), en Hz ?', fields: [{ kind: 'num', a: 3100 }], expl: '3 400 − 300.' }
        ]
      },
      {
        title: 'Les décibels sans calculatrice', min: 8,
        essentiel: ul([
          '<b>G(dB) = 10 × log<sub>10</sub>(P<sub>sortie</sub> / P<sub>entrée</sub>)</b>.',
          '<b>+3 dB = ×2</b> · <b>+10 dB = ×10</b> · +20 dB = ×100 · −3 dB = ÷2 · −10 dB = ÷10.',
          '<b>dBm</b> = par rapport à 1 mW : 0 dBm = 1 mW · 10 dBm = 10 mW · <b>30 dBm = 1 W</b> · −30 dBm = 1 µW.'
        ]),
        html: `
${f(`G<sub>dB</sub> = 10 × log<sub>10</sub>${frac('P<sub>sortie</sub>', 'P<sub>entrée</sub>')}`)}
${table(['dB', '+3', '+6', '+10', '+13', '+20', '+30', '−3', '−10'], [['Rapport', '×2', '×4', '×10', '×20', '×100', '×1 000', '÷2', '÷10']])}
${tip('<b>Décompose en 10 et 3</b> : 13 dB = 10 + 3 → ×10 × 2 = ×20 · 23 dB = 20 + 3 → ×200 · 27 dBm = 30 − 3 → 1 W ÷ 2 = <b>500 mW</b> · 16 dB = 10 + 3 + 3 → ×40.')}
${key('Le grand avantage : dans une chaîne, on <b>additionne les gains et on soustrait les pertes</b> au lieu de multiplier. Ex. 20 dBm − 6 dB de pertes = 14 dBm.')}
${w('db')}
${table(['log₂', '2', '4', '8', '16', '64', '256', '1 000', '1 001'], [['valeur', '1', '2', '3', '4', '6', '8', '≈ 10', '≈ 9,97']])}
`,
        check: [
          { type: 'qcm', q: '0 dBm correspond à :', choices: ['0 W', '1 mW', '1 W', '10 mW'], a: 1, noShuffle: true, expl: 'Référence 1 mW.' },
          { type: 'input', q: 'Combien de mW font 23 dBm ?', fields: [{ kind: 'num', a: 200, rel: 0.03 }], expl: '20 dBm = 100 mW, +3 dB = ×2 → 200 mW.' },
          { type: 'input', q: 'Un câble perd 3 dB. Quelle fraction de la puissance reste-t-il (en %) ?', fields: [{ kind: 'num', a: 50 }], expl: '−3 dB = ÷2 → 50 %.' }
        ]
      },
      {
        title: 'Nyquist et Shannon : les limites du débit', min: 8,
        essentiel: ul([
          '<b>Nyquist</b> (canal sans bruit) : <b>D<sub>max</sub> = 2 × B × log<sub>2</sub>(M)</b> ; rapidité max = 2B bauds.',
          '<b>Shannon</b> (canal bruité, limite absolue) : <b>C = B × log<sub>2</sub>(1 + S/N)</b>, avec <b>S/N linéaire</b>.',
          '30 dB → S/N = 1 000 · 20 dB → 100 · 40 dB → 10 000.'
        ]),
        html: `
${f(`D<sub>max</sub> = 2 × <var>B</var> × log<sub>2</sub>(<var>M</var>)`, 'Nyquist — B en Hz, M = nombre de niveaux (valence)')}
${f(`C = <var>B</var> × log<sub>2</sub>(1 + ${frac('S', 'N')})`, 'Shannon — S/N en rapport linéaire, pas en dB !')}
${stepper([
  '<p><b>Ligne téléphonique</b> : B = 3 400 − 300 = <b>3 100 Hz</b>, S/N = 30 dB.</p>',
  '<p>Conversion : 30 dB → 10<sup>30/10</sup> = <b>1 000</b> (rapport linéaire).</p>',
  '<p>C = 3 100 × log₂(1 001) ≈ 3 100 × 9,97 ≈ <b>30 900 bit/s ≈ 31 kbit/s</b>. C\'est pourquoi les modems analogiques plafonnaient vers 33,6 kbit/s.</p>',
  '<p><b>Nyquist</b> avec 16 niveaux sur la même ligne : 2 × 3 100 × 4 = <b>24 800 bit/s</b>.</p>'
], 'Exemple du plan')}
${w('db')}
${trap('Dans Shannon, convertir les dB en rapport linéaire (30 dB → 1 000, pas 30). Utiliser 30 donnerait un résultat complètement faux.')}
${why('Plus il y a d\'états M, plus le débit est élevé, mais plus le signal doit être propre (bon S/N). C\'est pourquoi le débit 4G ou Wi-Fi baisse quand on s\'éloigne : la modulation redescend (64-QAM → 16-QAM → QPSK).')}
`,
        check: [
          { type: 'input', q: 'S/N = 20 dB : rapport linéaire ?', fields: [{ kind: 'num', a: 100 }], expl: '10<sup>20/10</sup> = 100.' },
          { type: 'input', q: 'Canal de 1 MHz, S/N = 30 dB (log₂ 1001 ≈ 9,97) : capacité de Shannon en Mbit/s ?', fields: [{ kind: 'num', a: 9.97, tol: 0.05 }], expl: '1 × 10<sup>6</sup> × 9,97 ≈ 9,97 Mbit/s.' }
        ]
      },
      {
        title: 'Modulations et numérisation de la voix (MIC)', min: 6,
        essentiel: ul([
          'ASK (amplitude), FSK (fréquence), BPSK (1 bit), QPSK (2 bits), 16-QAM (4), 64-QAM (6), 256-QAM (8 bits/symbole).',
          '<b>MIC / PCM (G.711)</b> : échantillonnage à <b>8 000 Hz</b> (≥ 2 × 4 kHz) × <b>8 bits</b> = <b>64 kbit/s</b> = un canal téléphonique (IT).',
          'Étapes : <b>échantillonnage → quantification → codage</b>.'
        ]),
        html: `
${table(['Modulation', 'Ce qui varie', 'Bits / symbole'], [['ASK', 'Amplitude', '1 (en binaire)'], ['FSK', 'Fréquence', '1 (en binaire)'], ['BPSK', 'Phase (2 états)', '1'], ['QPSK', 'Phase (4 états)', '2'], ['16-QAM', 'Amplitude + phase', '4'], ['64-QAM / 256-QAM', 'Amplitude + phase', '6 / 8']])}
${f(`f<sub>e</sub> ≥ 2 × f<sub>max</sub> = 2 × 4 000 = 8 000 Hz &nbsp;→&nbsp; 8 000 × 8 bits = <b class="hl">64 kbit/s</b>`, 'théorème d\'échantillonnage (Shannon-Nyquist)')}
${steps(['<b>Échantillonnage</b> : prélever 8 000 valeurs par seconde.', '<b>Quantification</b> : arrondir chaque valeur à l\'un des 256 niveaux (loi A en Europe/Afrique, µ aux États-Unis).', '<b>Codage</b> : écrire chaque niveau sur 8 bits.'])}
`,
        check: [
          { type: 'qcm', q: 'Fréquence d\'échantillonnage de la voix en téléphonie :', choices: ['4 kHz', '8 kHz', '16 kHz', '44,1 kHz'], a: 1, noShuffle: true, expl: '8 kHz.' },
          { type: 'qcm', q: 'Bits par symbole en 64-QAM :', choices: ['4', '6', '8', '64'], a: 1, noShuffle: true, expl: 'log₂64 = 6.' }
        ]
      },
      {
        title: 'Multiplexage et hiérarchies numériques', min: 7,
        essentiel: ul([
          'FDM (fréquence : radio, ADSL) · <b>TDM</b> (temps : E1, GSM) · <b>WDM</b> (longueurs d\'onde dans une fibre) · CDMA (codes : 3G) · OFDM/OFDMA (sous-porteuses : 4G, 5G, Wi-Fi 6).',
          '<b>E1</b> = 32 IT × 64 kbit/s = <b>2,048 Mbit/s</b> → <b>30 voies</b> (IT0 synchro, IT16 signalisation). T1 = 1,544 Mbit/s.',
          'SDH : <b>STM-1 = 155,52 Mbit/s = 63 E1</b> · STM-4 622 Mbit/s · STM-16 ≈ 2,5 Gbit/s · STM-64 ≈ 10 Gbit/s.'
        ]),
        html: `
${table(['Technique', 'Principe', 'Exemple'], [['FDM (fréquence)', 'Chaque voie a sa bande de fréquences', 'Radio FM, ADSL'], ['TDM (temps)', 'Chaque voie a sa tranche de temps', 'E1, GSM (TDMA)'], ['WDM (longueur d\'onde)', 'Plusieurs « couleurs » de lumière dans une fibre', 'Dorsales optiques (DWDM)'], ['CDMA (code)', 'Tous en même temps, séparés par un code', '3G (W-CDMA)'], ['OFDM / OFDMA', 'Nombreuses sous-porteuses orthogonales partagées', '4G, 5G, Wi-Fi 6, ADSL (DMT)']])}
${f(`E1 = 32 × 64 kbit/s = <b class="hl">2,048 Mbit/s</b> &nbsp;·&nbsp; T1 = 24 × 64 + 8 = 1,544 Mbit/s`)}
${ul(['<b>PDH</b> (ancienne hiérarchie) : E1 2 Mbit/s, E2 8, <b>E3 34 Mbit/s</b>. Remplacée par la <b>SDH</b> (fibre, opérateurs) ; SONET est l\'équivalent nord-américain.', 'Cours WAN : « avant le multiplexage, chaque appel avait sa propre liaison physique » ; le TDM est un concept de couche 1, indépendant du protocole de couche 2.', '<b>MPLS</b> : réseau d\'opérateur qui commute par étiquettes ; il sert à vendre des VPN MPLS entre sites, avec qualité de service.'])}
${ex('Centre d\'appels : 100 communications simultanées → 100 ÷ 30 = 3,33 → <b>4 E1</b>. Un STM-1 contient 63 E1.')}
${trap('E1 = 2,048 Mbit/s mais seulement <b>30</b> voies de voix (pas 32) : IT0 et IT16 sont réservés.')}
`,
        check: [
          { type: 'qcm', q: 'Débit d\'un STM-1 :', choices: ['2,048 Mbit/s', '34 Mbit/s', '155,52 Mbit/s', '622 Mbit/s'], a: 2, noShuffle: true, expl: '155,52 Mbit/s = 63 E1.' },
          { type: 'qcm', q: 'Multiplexage pour transporter plusieurs longueurs d\'onde dans une fibre :', choices: ['TDM', 'CDMA', 'WDM', 'FDMA'], a: 2, noShuffle: true, expl: 'WDM / DWDM.' },
          { type: 'input', q: 'Combien d\'E1 pour 75 communications simultanées ?', fields: [{ kind: 'num', a: 3 }], expl: '75 ÷ 30 = 2,5 → 3.' }
        ]
      },
      {
        title: 'Supports et bilans de liaison', min: 9,
        essentiel: ul([
          'Fibre : insensible aux perturbations, ≈ <b>0,35 dB/km à 1 310 nm</b> et <b>0,2-0,25 dB/km à 1 550 nm</b> ; connecteur ≈ 0,5 dB, épissure ≈ 0,1 dB.',
          '<b>Bilan radio</b> : P<sub>reçue</sub> = P<sub>émise</sub> + gains d\'antennes − pertes (câbles, propagation). <b>Marge</b> = P<sub>reçue</sub> − sensibilité, viser <b>≥ 10 dB</b>.',
          'Satellite géostationnaire (36 000 km, VSAT) : ≈ 250-280 ms dans un sens (<b>≈ 600 ms aller-retour</b>) ; LEO : ≈ 30-50 ms.'
        ]),
        html: `
${f(`P<sub>reçue</sub> = P<sub>émise</sub> + G<sub>émission</sub> + G<sub>réception</sub> − pertes`, 'tout en dB / dBm')}
${f(`Marge = P<sub>reçue</sub> − sensibilité ≥ 10 dB`)}
${ex(`Faisceau hertzien Tahoua : 30 dBm − 2 + 15 − 125 + 15 − 2 = <b>−69 dBm</b> ; sensibilité −80 dBm → marge <b>11 dB</b> ≥ 10 → correcte, avec réserve contre la poussière et la pluie.`, 'Bilan radio (plan)')}
${ex(`Fibre monomode 40 km à 1 550 nm (0,25 dB/km), 2 connecteurs (0,5), 8 épissures (0,1) : pertes = 10 + 1 + 0,8 = <b>11,8 dB</b>. Émetteur 0 dBm → P<sub>reçue</sub> = <b>−11,8 dBm</b> ; sensibilité −28 dBm → marge <b>16,2 dB</b>.`, 'Bilan optique (plan)')}
${ul(['<b>Faisceau hertzien (FH)</b> : liaison radio point à point ; il faut une visibilité directe (dégager la zone de Fresnel). Très utilisé entre villes et pour relier les antennes mobiles.', '<b>Satellite</b> : couvre tout le territoire, mais latence élevée → gênant pour la VoIP et TCP.', 'Câbles sous-marins (cours WAN) et dorsale nationale en fibre : le Niger en dispose ; hors fibre : FH, 4G, VSAT.'])}
${reflex('Pense à l\'environnement sahélien : la marge sert à tenir le <b>vent de sable</b>, la pluie et le vieillissement des équipements.')}
`,
        check: [
          { type: 'input', q: 'P émise 20 dBm, antennes 20 dBi × 2, câbles 2 dB × 2, propagation 120 dB. P reçue (dBm) ?', fields: [{ kind: 'num', a: -64 }], expl: '20 + 20 + 20 − 2 − 2 − 120 = −64 dBm.' },
          { type: 'qcm', q: 'Latence aller-retour typique d\'un VSAT géostationnaire :', choices: ['5 ms', '50 ms', '~600 ms', '5 s'], a: 2, noShuffle: true, expl: '36 000 km d\'altitude.' }
        ]
      },
      {
        title: 'Voix sur IP : SIP, RTP, codecs et QoS', min: 10,
        essentiel: ul([
          'Signalisation <b>SIP</b> (IETF, 5060 ; 5061 en TLS) ou H.323 (UIT-T) ; voix en <b>RTP sur UDP</b> ; RTCP = qualité ; SRTP = chiffrement.',
          'En-têtes RTP 12 + UDP 8 + IP 20 = <b>40 octets</b> ; 20 ms → 50 paquets/s : <b>G.711 = 80 kbit/s</b>, <b>G.729 = 24 kbit/s</b> en IP (par sens).',
          'Seuils : délai <b>&lt; 150 ms</b> dans un sens, gigue <b>&lt; 30 ms</b>, pertes <b>&lt; 1 %</b>. QoS : VLAN voix, <b>DSCP EF (46)</b>, file prioritaire LLQ, 802.1p = 5.'
        ]),
        html: `
${w('seq', { seq: sipSeq })}
${table(['Codec', 'Débit voix', 'Remarque'], [['G.711 (MIC)', '64 kbit/s', 'Qualité « RTC », sans compression'], ['G.729', '8 kbit/s', 'Compressé, liens WAN lents'], ['G.722', '64 kbit/s', '« HD voice » (large bande)'], ['Opus', '6 à 510 kbit/s', 'Adaptatif (WebRTC, WhatsApp)']])}
${f(`G.711 : ${frac('64 000 × 0,02', '8')} = 160 o + 40 o = 200 o × 8 × 50 = <b class="hl">80 kbit/s</b>`)}
${f(`G.729 : ${frac('8 000 × 0,02', '8')} = 20 o + 40 o = 60 o × 8 × 50 = <b class="hl">24 kbit/s</b>`)}
<p>Avec Ethernet (+18 octets) : 87,2 et 31,2 kbit/s. Ce débit est nécessaire <b>dans chaque sens</b>.</p>
${w('voip')}
${ul(['<b>IPBX</b> (Asterisk, 3CX) : central téléphonique sur IP. <b>Trunk SIP</b> : raccordement à l\'opérateur par IP.', 'Passerelles : <b>FXS</b> (vers un téléphone analogique) / <b>FXO</b> (vers une ligne de l\'opérateur).', 'Postes alimentés par le câble : <b>PoE</b> 802.3af (15,4 W), 802.3at (30 W), 802.3bt (60-90 W).', 'Note de qualité <b>MOS</b> de 1 à 5 (≥ 4 = bon).'])}
${ex('Zinder → Niamey, 20 appels sur 2 Mbit/s : G.711 = 1 600 kbit/s (<b>80 %</b>, il ne reste rien pour les données) ; G.729 = 480 kbit/s (<b>24 %</b>) → G.729 sur le WAN. QoS : VLAN voix, DSCP EF, LLQ, contrôle d\'admission (refuser le 21<sup>e</sup> appel).', 'Étude de cas (plan)')}
${trap('Le débit VoIP réel inclut les en-têtes : G.729 = <b>24 kbit/s</b> en IP, pas 8.')}
`,
        check: [
          { type: 'order', q: 'Remets dans l\'ordre les messages SIP d\'un appel :', items: ['INVITE', '100 Trying', '180 Ringing', '200 OK', 'ACK', 'BYE'], expl: 'Puis la voix en RTP entre ACK et BYE.' },
          { type: 'qcm', q: 'Marquage DSCP de la voix :', choices: ['AF41', 'CS1', 'EF (46)', '0'], a: 2, noShuffle: true, expl: 'Expedited Forwarding.' },
          { type: 'input', q: '10 appels G.711 (20 ms) : bande passante IP totale en kbit/s ?', fields: [{ kind: 'num', a: 800 }], expl: '10 × 80.' }
        ]
      },
      {
        title: 'Réseaux mobiles : de la 2G à la 5G', min: 8,
        essentiel: ul([
          '2G GSM : <b>BTS / BSC / MSC</b>, TDMA · 3G UMTS : <b>NodeB / RNC</b>, W-CDMA · 4G LTE : <b>eNodeB</b> + <b>EPC</b> tout IP (MME, SGW, PGW, HSS), voix <b>VoLTE</b> · 5G NR : <b>gNodeB</b> + 5GC (AMF, SMF, UPF), slicing.',
          '<b>HLR</b> (HSS en 4G) : base centrale des abonnés · <b>VLR</b> : copie locale du MSC · AuC : authentification · EIR : terminaux volés.',
          '<b>IMSI</b> = abonné (SIM) · <b>IMEI</b> = téléphone · MSISDN = numéro.'
        ]),
        html: `
${table(['Génération', 'Radio', 'Station / contrôleur', 'Cœur de réseau', 'Débit typique'], [
  ['2G GSM (GPRS 2,5G ; EDGE 2,75G)', 'FDMA + TDMA (900/1 800 MHz)', 'BTS / BSC', 'MSC + HLR, VLR, AuC, EIR (voix en circuit) ; SGSN, GGSN (données)', '9,6 kbit/s → ~200 kbit/s (EDGE)'],
  ['3G UMTS / HSPA', 'W-CDMA', 'NodeB / RNC', 'Circuit (voix) + paquet (données)', '384 kbit/s → 14-42 Mbit/s'],
  ['4G LTE / LTE-A', 'OFDMA (descendant), SC-FDMA (montant), MIMO', 'eNodeB (pas de contrôleur)', 'EPC tout IP : MME, SGW, PGW, HSS ; voix = VoLTE (IMS)', '~100 Mbit/s → 1 Gbit/s'],
  ['5G NR', 'OFDMA, massive MIMO, < 6 GHz et ondes millimétriques', 'gNodeB', '5GC : AMF, SMF, UPF ; tranches (slicing)', 'jusqu\'à 10-20 Gbit/s ; latence ~1 ms']
])}
${ul(['<b>Cellule</b> : zone couverte par une antenne ; les fréquences sont réutilisées dans des cellules éloignées. <b>Handover</b> : passage d\'une cellule à l\'autre pendant un appel.', '<b>VoLTE</b> : la 4G est tout IP (plus de domaine circuit) → la voix passe en IP via l\'IMS. Sans VoLTE, le téléphone redescend en 3G/2G pour chaque appel (<b>CSFB</b>, Circuit Switched Fallback).', 'Usages 5G : <b>eMBB</b> (très haut débit mobile), <b>URLLC</b> (fiabilité, latence très faible), <b>mMTC</b> (objets connectés massifs).', '<b>Network slicing</b> : découper un même réseau en réseaux logiques aux garanties différentes (ex. tranche sécurisée pour les secours ou les terminaux de paiement des régies financières).'])}
${mnemo('Les stations de base gagnent une lettre à chaque génération : BTS (2G) → <b>Node</b>B (3G) → <b>e</b>NodeB (4G, « evolved ») → <b>g</b>NodeB (5G).')}
`,
        check: [
          { type: 'qcm', q: 'Le cœur de réseau tout-IP de la 4G :', choices: ['BSS', 'EPC', '5GC', 'RTC'], a: 1, noShuffle: true, expl: 'Evolved Packet Core.' },
          { type: 'qcm', q: 'La 3G utilise principalement :', choices: ['TDMA', 'W-CDMA', 'OFDMA', 'FDM seul'], a: 1, noShuffle: true, expl: 'W-CDMA.' },
          { type: 'match', q: 'Associe chaque équipement à sa génération.', pairs: [['BTS / BSC', '2G'], ['NodeB / RNC', '3G'], ['eNodeB / MME', '4G'], ['gNodeB / AMF', '5G']], expl: 'Une lettre de plus à chaque génération.' }
        ]
      },
      {
        title: 'Réseaux d\'accès : la boucle locale', min: 7,
        essentiel: ul([
          '<b>xDSL</b> sur la paire de cuivre : ADSL asymétrique (download > upload, ≈ 8 Mbit/s ; ADSL2+ ≈ 24), VDSL2 (50-100 Mbit/s sur courte distance) ; le débit baisse avec la distance au <b>DSLAM</b>.',
          '<b>FTTH / GPON</b> : un <b>OLT</b> alimente 32 ou 64 abonnés (<b>ONT</b>) via un coupleur passif ; <b>2,5 Gbit/s descendant / 1,25 montant</b>, partagés. XGS-PON : 10 Gbit/s symétrique.',
          'RNIS : accès de base <b>2B + D = 144 kbit/s</b> ; accès primaire 30B + D sur un E1. Boucle locale radio, 4G/5G fixe, VSAT.'
        ]),
        html: `
${ul(['<b>RTC</b> : téléphonie analogique historique, commutation de circuits.', '<b>RNIS</b> (numérique) : 2B + D = 2 × 64 + 16 = 144 kbit/s ; accès primaire 30B + D.', 'Le <b>filtre / splitter</b> sépare voix (basses fréquences) et données (hautes fréquences) : c\'est du <b>FDM</b>. SDSL = symétrique (entreprises).', 'Variantes fibre : <b>FTTB</b> (bâtiment), <b>FTTC</b> (trottoir), <b>FTTO</b> (fibre dédiée entreprise).', 'Boucle locale radio : WiMAX (802.16), 4G/5G fixe, FH. <b>VSAT</b> : zones isolées (latence élevée).'])}
${ex('Coupleur GPON 1:32 sur 2,5 Gbit/s : débit minimal garanti si tous téléchargent = 2 500 ÷ 32 ≈ <b>78 Mbit/s</b>. L\'ADSL est asymétrique parce que les usages téléchargent bien plus qu\'ils n\'envoient : plus de sous-porteuses en descendant.')}
${ex('Choix d\'accès (plan) : <b>siège</b> (200 agents, applis critiques) → fibre dédiée (FTTO) ou MPLS, doublée par un second opérateur ou un FH · <b>bureau isolé à 60 km</b> sans fibre ni ADSL → VSAT ou 4G (FH si point haut), avec VPN IPsec · <b>agence en ville à 4 km du central</b> → ADSL2+ (quelques Mbit/s ; VDSL2 trop loin) ou 4G / boucle locale radio.')}
${trap('GPON : le débit est <b>partagé</b> entre les abonnés d\'un même coupleur — 2,5 Gbit/s n\'est pas le débit de chacun.')}
`,
        check: [
          { type: 'qcm', q: 'Pourquoi l\'ADSL est-il asymétrique ?', choices: ['on télécharge plus qu\'on n\'envoie', 'pour la sécurité', 'à cause de la fibre', 'pour la voix'], a: 0, expl: 'Plus de fréquences en descendant.' },
          { type: 'input', q: 'Débit d\'un accès de base RNIS 2B + D (kbit/s) ?', fields: [{ kind: 'num', a: 144 }], expl: '2 × 64 + 16.' }
        ]
      }
    ],

    cards: [
      { front: 'Longueur d\'onde : formule ?', back: 'λ = c / f (c = 3 × 10<sup>8</sup> m/s) ; 900 MHz → ≈ 33 cm' },
      { front: 'Bande passante vs débit vs bauds ?', back: 'Hz (plage de fréquences) · bit/s · symboles/s' },
      { front: 'D = ? (bauds et états)', back: 'D = R × log₂(M)' },
      { front: '+3 dB, +10 dB, +20 dB, −3 dB ?', back: '×2 · ×10 · ×100 · ÷2' },
      { front: '0 dBm, 10 dBm, 30 dBm, −30 dBm ?', back: '1 mW · 10 mW · 1 W · 1 µW' },
      { front: '27 dBm en mW ?', back: '30 − 3 dB → 1 W ÷ 2 = <b>500 mW</b>' },
      { front: '13 dB = rapport ?', back: '10 + 3 → ×10 × 2 = <b>×20</b>' },
      { front: 'Formule de Nyquist ?', back: 'D<sub>max</sub> = 2 × B × log₂(M)' },
      { front: 'Formule de Shannon ?', back: 'C = B × log₂(1 + S/N), S/N <b>linéaire</b>' },
      { front: '30 dB, 20 dB, 40 dB en S/N linéaire ?', back: '1 000 · 100 · 10 000' },
      { front: 'Capacité de Shannon d\'une ligne téléphonique (3 100 Hz, 30 dB) ?', back: '≈ 31 kbit/s' },
      { front: 'Numérisation MIC : étapes et débit ?', back: 'Échantillonnage (8 kHz) → quantification (256 niveaux) → codage (8 bits) = 64 kbit/s' },
      { front: 'Bits par symbole : BPSK, QPSK, 16-QAM, 64-QAM ?', back: '1 · 2 · 4 · 6' },
      { front: 'FDM, TDM, WDM, CDMA, OFDM : exemples ?', back: 'Radio/ADSL · E1/GSM · fibre DWDM · 3G · 4G/5G/Wi-Fi 6' },
      { front: 'E1 et T1 ?', back: 'E1 = 32 × 64 = 2,048 Mbit/s (30 voies) · T1 = 1,544 Mbit/s (24 voies)' },
      { front: 'IT0 et IT16 d\'un E1 ?', back: 'Synchronisation (verrouillage de trame) · signalisation' },
      { front: 'STM-1, STM-4, STM-16, STM-64 ?', back: '155,52 Mbit/s (63 E1) · 622 Mbit/s · 2,5 Gbit/s · 10 Gbit/s' },
      { front: 'Atténuation de la fibre ?', back: '≈ 0,35 dB/km à 1 310 nm · 0,2-0,25 dB/km à 1 550 nm ; connecteur 0,5 dB, épissure 0,1 dB' },
      { front: 'Bilan de liaison radio ?', back: 'P<sub>r</sub> = P<sub>e</sub> + G<sub>e</sub> + G<sub>r</sub> − pertes ; marge = P<sub>r</sub> − sensibilité ≥ 10 dB' },
      { front: 'Latence VSAT géostationnaire ?', back: '≈ 250-280 ms un sens, ≈ 600 ms aller-retour' },
      { front: 'VoIP : signalisation et transport ?', back: 'SIP (5060/5061) ou H.323 · RTP/UDP (RTCP qualité, SRTP chiffre)' },
      { front: 'Messages SIP d\'un appel ?', back: 'INVITE, 100 Trying, 180 Ringing, 200 OK, ACK, (RTP), BYE, 200 OK' },
      { front: 'Débit IP G.711 et G.729 (20 ms) ?', back: '<b>80 kbit/s</b> et <b>24 kbit/s</b> (par sens)' },
      { front: 'Seuils de qualité VoIP ?', back: 'Délai &lt; 150 ms (un sens) · gigue &lt; 30 ms · pertes &lt; 1 % · MOS ≥ 4' },
      { front: 'QoS de la voix ?', back: 'VLAN voix · DSCP EF (46) · LLQ · 802.1p = 5 · contrôle d\'admission' },
      { front: 'FXS / FXO ?', back: 'Vers un téléphone analogique / vers une ligne d\'opérateur' },
      { front: 'PoE 802.3af, at, bt ?', back: '15,4 W · 30 W · 60-90 W' },
      { front: 'Stations et cœurs 2G, 3G, 4G, 5G ?', back: 'BTS/BSC/MSC · NodeB/RNC · eNodeB/EPC · gNodeB/5GC' },
      { front: 'HLR, VLR, AuC, EIR ?', back: 'Base centrale des abonnés · copie locale du MSC · authentification · terminaux volés' },
      { front: 'IMSI, IMEI, MSISDN ?', back: 'Abonné (SIM) · téléphone · numéro' },
      { front: 'VoLTE et CSFB ?', back: 'Voix en IP (IMS) sur 4G · sinon repli 3G/2G pour chaque appel' },
      { front: 'Usages 5G ?', back: 'eMBB (débit) · URLLC (latence, fiabilité) · mMTC (objets massifs) ; slicing' },
      { front: 'GPON ?', back: 'OLT → coupleur passif 1:32/64 → ONT ; 2,5 / 1,25 Gbit/s partagés' },
      { front: 'RNIS : accès de base et primaire ?', back: '2B + D = 144 kbit/s · 30B + D sur un E1' }
    ],

    qcm: [
      { type: 'qcm', src: 'Plan S6 · QCM', q: '0 dBm correspond à :', choices: ['0 W', '1 mW', '1 W', '10 mW'], a: 1, noShuffle: true, expl: '1 mW.' },
      { type: 'qcm', src: 'Plan S6 · QCM', q: 'Fréquence d\'échantillonnage de la voix en téléphonie :', choices: ['4 kHz', '8 kHz', '16 kHz', '44,1 kHz'], a: 1, noShuffle: true, expl: '8 kHz.' },
      { type: 'qcm', src: 'Plan S6 · QCM', q: 'Débit d\'un STM-1 :', choices: ['2,048 Mbit/s', '34 Mbit/s', '155,52 Mbit/s', '622 Mbit/s'], a: 2, noShuffle: true, expl: '155,52 Mbit/s.' },
      { type: 'qcm', src: 'Plan S6 · QCM', q: 'Protocole de signalisation VoIP normalisé par l\'IETF :', choices: ['RTP', 'SIP', 'H.323', 'MGCP'], a: 1, noShuffle: true, expl: 'SIP (H.323 = UIT-T).' },
      { type: 'qcm', src: 'Plan S6 · QCM', q: 'Marquage DSCP de la voix :', choices: ['AF41', 'CS1', 'EF (46)', '0'], a: 2, noShuffle: true, expl: 'EF.' },
      { type: 'qcm', src: 'Plan S6 · QCM', q: 'La 3G utilise principalement :', choices: ['TDMA', 'W-CDMA', 'OFDMA', 'FDM seul'], a: 1, noShuffle: true, expl: 'W-CDMA.' },
      { type: 'qcm', src: 'Plan S6 · QCM', q: 'Le cœur de réseau tout-IP de la 4G :', choices: ['BSS', 'EPC', '5GC', 'RTC'], a: 1, noShuffle: true, expl: 'EPC.' },
      { type: 'qcm', src: 'Plan S6 · QCM', q: 'Latence aller-retour typique d\'un VSAT géostationnaire :', choices: ['5 ms', '50 ms', '~600 ms', '5 s'], a: 2, noShuffle: true, expl: '~600 ms.' },
      { type: 'qcm', src: 'Plan S6 · QCM', q: 'Multiplexage utilisé dans une fibre pour plusieurs longueurs d\'onde :', choices: ['TDM', 'CDMA', 'WDM', 'FDMA'], a: 2, noShuffle: true, expl: 'WDM.' },
      { type: 'qcm', src: 'Plan S6 · QCM', q: 'Bits par symbole en 64-QAM :', choices: ['4', '6', '8', '64'], a: 1, noShuffle: true, expl: '6.' },
      { type: 'qcm', q: 'Un amplificateur de 20 dB multiplie la puissance par :', choices: ['100', '20', '10', '200'], a: 0, expl: '+10 dB = ×10, deux fois.' },
      { type: 'qcm', q: 'Dans Shannon, un S/N de 30 dB s\'utilise comme :', choices: ['1 000', '30', '3', '10'], a: 0, expl: 'Rapport linéaire.' },
      { type: 'qcm', q: 'Pourquoi un E1 n\'offre que 30 voies ?', choices: ['IT0 et IT16 sont réservés', 'à cause du bruit', 'pour la QoS', 'pour le chiffrement'], a: 0, expl: 'Synchronisation et signalisation.' },
      { type: 'qcm', q: 'Sans VoLTE, un téléphone 4G qui appelle :', choices: ['repasse en 3G/2G (CSFB)', 'ne peut pas appeler', 'utilise le Wi-Fi', 'passe en 5G'], a: 0, expl: 'Circuit Switched Fallback.' },
      { type: 'qcm', q: 'Coupleur GPON 1:32 sur 2,5 Gbit/s : débit minimal par abonné si tous chargent ?', choices: ['≈ 78 Mbit/s', '2,5 Gbit/s', '1,25 Gbit/s', '32 Mbit/s'], a: 0, expl: '2 500 ÷ 32.' },
      { type: 'qcm', q: 'Un FH a une marge de 4 dB. Conclusion ?', choices: ['fragile : < 10 dB', 'excellente', 'impossible', 'trop puissante'], a: 0, expl: 'On vise ≥ 10 dB.' },
      { type: 'tf', q: 'La bande passante d\'un canal s\'exprime en bit/s.', a: false, expl: 'En hertz ; le débit en bit/s.' },
      { type: 'tf', q: 'Le splitter ADSL sépare voix et données par fréquence (FDM).', a: true, expl: 'Basses fréquences = voix.' },
      { type: 'match', q: 'Associe la technique de multiplexage à son exemple.', pairs: [['TDM', 'E1'], ['WDM', 'Dorsale optique'], ['CDMA', '3G'], ['OFDMA', '4G / Wi-Fi 6'], ['FDM', 'Radio FM']], expl: 'Tableau du plan.' },
      { type: 'order', q: 'Étapes de la numérisation MIC :', items: ['Échantillonnage', 'Quantification', 'Codage'], expl: '8 000 × 8 bits.' }
    ],

    exercises: [
      {
        title: 'Décibels et bilans de liaison', min: 12, src: 'Plan S6 · Ex. 1',
        parts: [
          { q: 'a) Un ampli de 20 dB multiplie la puissance par ? Un câble perd 3 dB : quelle part reste-t-il (%) ? 30 dBm en mW ? −20 dBm en mW ?', pts: 1.5, fields: [{ label: '20 dB = ×', kind: 'num', a: 100 }, { label: 'Reste après −3 dB (%)', kind: 'num', a: 50 }, { label: '30 dBm (mW)', kind: 'num', a: 1000 }, { label: '−20 dBm (mW)', kind: 'num', a: 0.01 }], corr: '<p>20 dB → ×100. −3 dB → la moitié (50 %). 30 dBm = 1 W (1 000 mW) ; −20 dBm = 1 mW ÷ 100 = 0,01 mW (10 µW).</p>' },
          { q: 'b) FH Tahoua – relais : P émise 30 dBm ; câble émission −2 dB ; antenne émission 15 dBi ; propagation 125 dB ; antenne réception 15 dBi ; câble réception −2 dB ; sensibilité −80 dBm. P reçue et marge ? Correcte ?', pts: 2, fields: [{ label: 'P reçue (dBm)', kind: 'num', a: -69 }, { label: 'Marge (dB)', kind: 'num', a: 11 }], corr: '<p>30 − 2 + 15 − 125 + 15 − 2 = <b>−69 dBm</b>. Marge = −69 − (−80) = <b>11 dB</b> ≥ 10 → correcte, avec une réserve contre les évanouissements (poussière, pluie).</p>' },
          { q: 'c) Fibre monomode 40 km à 1 550 nm (0,25 dB/km), 2 connecteurs (0,5 dB), 8 épissures (0,1 dB). Émetteur 0 dBm, sensibilité −28 dBm. Bilan et marge ?', pts: 1.5, fields: [{ label: 'Pertes totales (dB)', kind: 'num', a: 11.8 }, { label: 'Marge (dB)', kind: 'num', a: 16.2 }], corr: '<p>Fibre 10 dB + connecteurs 1 dB + épissures 0,8 dB = <b>11,8 dB</b> → P reçue = −11,8 dBm → marge = −11,8 − (−28) = <b>16,2 dB</b> → largement suffisant.</p>' }
        ]
      },
      {
        title: 'Nyquist et Shannon', min: 8, src: 'Plan S6 · Ex. 2',
        statement: '<p>Ligne téléphonique : 300 à 3 400 Hz. Donnée : log₂(1 001) ≈ 9,97.</p>',
        parts: [
          { q: 'a) Bande passante ?', pts: 0.5, fields: [{ label: 'B (Hz)', kind: 'num', a: 3100 }], corr: '<p>3 400 − 300 = <b>3 100 Hz</b>.</p>' },
          { q: 'b) S/N = 30 dB : capacité maximale (Shannon) en bit/s ?', pts: 1.5, fields: [{ kind: 'num', a: 30898, rel: 0.02, show: '≈ 30 900 bit/s' }], corr: '<p>30 dB → 10<sup>3</sup> = 1 000. C = 3 100 × 9,97 ≈ <b>30 900 bit/s ≈ 31 kbit/s</b> (d\'où les modems à 33,6 kbit/s).</p>' },
          { q: 'c) Modem 16-QAM à 2 400 bauds : débit ? Limite de Nyquist avec 16 niveaux ?', pts: 1.5, fields: [{ label: 'Débit (bit/s)', kind: 'num', a: 9600 }, { label: 'Nyquist (bit/s)', kind: 'num', a: 24800 }], corr: '<p>log₂16 = 4 → 2 400 × 4 = <b>9 600 bit/s</b>. Nyquist : 2 × 3 100 × 4 = <b>24 800 bit/s</b>.</p>' },
          { q: 'd) Différence entre bauds et bit/s ? Quand sont-ils égaux ?', pts: 0.5, corr: '<p>Bauds = symboles/s ; bit/s = bits/s ; D = R × log₂(M). Égaux seulement si chaque symbole porte 1 bit (M = 2, ex. BPSK).</p>' }
        ]
      },
      {
        title: 'Numérisation et MIC', min: 6, src: 'Plan S6 · Ex. 3',
        parts: [
          { q: 'a) Pourquoi un canal téléphonique numérique vaut-il 64 kbit/s ? (théorème + 3 étapes)', pts: 1, corr: '<p>Voix utile ≲ 4 kHz ; théorème d\'échantillonnage : f<sub>e</sub> ≥ 2 × 4 000 = 8 000 Hz. Chaque échantillon est quantifié sur 256 niveaux = 8 bits → 8 000 × 8 = 64 kbit/s. Étapes : échantillonnage, quantification, codage.</p>' },
          { q: 'b) Débit d\'un E1 ? Combien de communications ? Rôle des IT 0 et 16 ?', pts: 1, fields: [{ label: 'Débit (kbit/s)', kind: 'num', a: 2048 }, { label: 'Communications', kind: 'num', a: 30 }], corr: '<p>32 × 64 = <b>2,048 Mbit/s</b> ; <b>30</b> communications ; IT0 = synchronisation (verrouillage de trame), IT16 = signalisation.</p>' },
          { q: 'c) 100 communications simultanées : combien d\'E1 ? Combien d\'E1 dans un STM-1 ?', pts: 1, fields: [{ label: 'E1 nécessaires', kind: 'num', a: 4 }, { label: 'E1 par STM-1', kind: 'num', a: 63 }], corr: '<p>100 ÷ 30 = 3,33 → <b>4 E1</b>. Un STM-1 contient <b>63 E1</b>.</p>' }
        ]
      },
      {
        title: 'Étude de cas : téléphonie IP Niamey – Zinder', min: 12, src: 'Plan S6 · Ex. 4',
        statement: '<p>IPBX à Niamey. Zinder doit passer 20 appels simultanés sur une liaison WAN de 2 Mbit/s qui transporte aussi les données. Paquets toutes les 20 ms.</p>',
        parts: [
          { q: 'a) Bande passante IP d\'un appel en G.711 puis en G.729 (détaille les en-têtes).', pts: 1.5, fields: [{ label: 'G.711 (kbit/s)', kind: 'num', a: 80 }, { label: 'G.729 (kbit/s)', kind: 'num', a: 24 }], corr: '<p>50 paquets/s ; en-têtes IP + UDP + RTP = 20 + 8 + 12 = 40 octets. G.711 : 160 + 40 = 200 octets × 8 × 50 = <b>80 kbit/s</b>. G.729 : 20 + 40 = 60 octets × 8 × 50 = <b>24 kbit/s</b>.</p>' },
          { q: 'b) Part de la liaison pour 20 appels dans chaque cas ? Quel codec ? Pourquoi ?', pts: 1.5, fields: [{ label: 'G.711 (%)', kind: 'num', a: 80, tol: 2 }, { label: 'G.729 (%)', kind: 'num', a: 24, tol: 1 }], corr: '<p>G.711 : 20 × 80 = 1 600 kbit/s = <b>80 %</b> → presque rien pour les données. G.729 : 480 kbit/s = <b>24 %</b> → <b>G.729 sur le WAN</b> (G.711 possible sur le LAN). Liaison full-duplex : calcul valable dans chaque sens.</p>' },
          { q: 'c) Ordre des messages SIP : 200 OK · BYE · INVITE · 180 Ringing · ACK · 100 Trying. Quel protocole transporte ensuite la voix ?', pts: 1, corr: '<p>INVITE → 100 Trying → 180 Ringing → 200 OK → ACK → (conversation en <b>RTP sur UDP</b>) → BYE (puis 200 OK).</p>' },
          { q: 'd) Trois mesures de QoS et les seuils de délai, gigue et pertes.', pts: 1, corr: '<p>VLAN voix séparé ; marquage DSCP EF (46) des paquets RTP (CoS 5) ; file prioritaire LLQ sur les routeurs WAN avec bande réservée ; contrôle d\'admission (refuser le 21<sup>e</sup> appel). Seuils : délai &lt; 150 ms (un sens), gigue &lt; 30 ms, pertes &lt; 1 %.</p>' }
        ]
      },
      {
        title: 'Réseaux mobiles', min: 7, src: 'Plan S6 · Ex. 5',
        parts: [
          { q: 'a) Classe par génération : eNodeB · BSC · gNodeB · RNC · MSC · MME · NodeB · AMF · BTS.', pts: 1, corr: '<p>2G : BTS, BSC, MSC · 3G : NodeB, RNC · 4G : eNodeB, MME · 5G : gNodeB, AMF.</p>' },
          { q: 'b) Rôle du HLR et du VLR ? Différence IMSI / IMEI ?', pts: 0.75, corr: '<p>HLR : base centrale et permanente des abonnés (profil, droits, localisation). VLR : base temporaire des abonnés présents dans la zone d\'un MSC. IMSI = identité de l\'abonné (SIM) ; IMEI = identité de l\'appareil.</p>' },
          { q: 'c) Pourquoi un téléphone 4G a-t-il besoin de VoLTE ? Sinon ?', pts: 0.75, corr: '<p>La 4G est tout IP : plus de domaine circuit. La voix passe en IP via l\'IMS (VoLTE). Sans VoLTE, le téléphone redescend en 3G/2G pour chaque appel (CSFB).</p>' },
          { q: 'd) Qu\'est-ce que le network slicing ? Exemple pour l\'État.', pts: 0.5, corr: '<p>Découper un même réseau physique en réseaux logiques aux garanties différentes (débit, latence, isolation). Ex. : tranche sécurisée pour les secours, ou pour les terminaux de paiement des régies financières.</p>' }
        ]
      },
      {
        title: 'Choisir un accès', min: 6, src: 'Plan S6 · Ex. 6',
        parts: [
          { q: 'a) Technologie d\'accès pour : (1) le siège à Niamey (200 agents, applis critiques) ; (2) un bureau à 60 km de la ville, sans fibre ni ADSL ; (3) une agence en ville à 4 km du central, sans fibre.', pts: 1, corr: '<p>(1) Fibre dédiée (FTTO) ou MPLS opérateur, doublée par un second opérateur ou un FH. (2) VSAT ou 4G (FH si point haut visible) + VPN IPsec. (3) ADSL2+ (quelques Mbit/s à 4 km ; VDSL2 trop loin) ou 4G / boucle locale radio.</p>' },
          { q: 'b) Coupleur GPON 1:32 sur 2,5 Gbit/s : débit minimal garanti par abonné ? Pourquoi l\'ADSL est-il asymétrique ?', pts: 1, fields: [{ label: 'Mbit/s par abonné', kind: 'num', a: 78, tol: 1.5 }], corr: '<p>2 500 ÷ 32 ≈ <b>78 Mbit/s</b>. L\'ADSL est asymétrique car les usages téléchargent beaucoup plus qu\'ils n\'envoient : plus de sous-porteuses en descendant.</p>' }
        ]
      }
    ],

    phrases: [
      '+3 dB = × 2, +10 dB = × 10 ; 0 dBm = 1 mW, 30 dBm = 1 W ; dans un bilan, on additionne les gains et on soustrait les pertes.',
      'Nyquist : D = 2B log₂M ; Shannon : C = B log₂(1 + S/N) avec S/N linéaire.',
      'Voix : 8 kHz × 8 bits = 64 kbit/s ; E1 = 2,048 Mbit/s = 30 voies ; STM-1 = 155,52 Mbit/s = 63 E1.',
      'VoIP : SIP (5060) signale, RTP/UDP transporte ; G.711 = 80 kbit/s, G.729 = 24 kbit/s en IP ; délai < 150 ms, gigue < 30 ms, pertes < 1 %, DSCP EF.',
      '2G BTS/BSC/MSC (TDMA) · 3G NodeB/RNC (W-CDMA) · 4G eNodeB/EPC (OFDMA, VoLTE) · 5G gNodeB/5GC (slicing).'
    ]
  });
})();
