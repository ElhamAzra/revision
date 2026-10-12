/* Séance 4 — Modèles en couches, TCP/UDP, ports, DNS, DHCP, web, messagerie, services de gestion. */
(function () {
  'use strict';
  const { key, trap, tip, reflex, ex, fix, mnemo, why, f, frac, table, steps, ul, w, stepper, reveal, code } = App.md;

  const tcpSeq = JSON.stringify({
    title: 'TCP : ouverture, échange, fermeture',
    actors: ['Client<br><small>ISN 1000</small>', 'Serveur<br><small>ISN 5000</small>'],
    intro: 'Le client ouvre une connexion vers le serveur web. Observe les numéros de séquence (seq) et d\'acquittement (ack).',
    msgs: [
      { from: 0, to: 1, label: 'SYN', sub: 'seq = 1000', note: '1. Le client annonce son numéro initial (ISN). Le SYN compte pour 1 octet.' },
      { from: 1, to: 0, label: 'SYN, ACK', sub: 'seq = 5000 · ack = 1001', note: '2. Le serveur annonce son ISN et acquitte 1000 + 1.' },
      { from: 0, to: 1, label: 'ACK', sub: 'seq = 1001 · ack = 5001', note: '3. Connexion établie : c\'est la poignée de main en 3 temps.' },
      { from: 0, to: 1, label: 'PSH, ACK (500 o)', sub: 'seq = 1001 · ack = 5001', note: '4. Requête HTTP de 500 octets. Le seq n\'a pas bougé : le segment 3 ne portait aucune donnée.' },
      { from: 1, to: 0, label: 'ACK (1 460 o)', sub: 'seq = 5001 · ack = 1501', note: '5. Réponse de 1 460 octets (MSS) ; ack = 1001 + 500 = 1501.' },
      { from: 0, to: 1, label: 'ACK', sub: 'seq = 1501 · ack = 6461', note: '6. ack = 5001 + 1 460 = 6461 : « le prochain octet que j\'attends ».' },
      { from: 0, to: 1, label: 'FIN', sub: 'seq = 1501', note: '7. Fermeture en 4 segments : le client n\'a plus rien à envoyer.' },
      { from: 1, to: 0, label: 'ACK', sub: 'ack = 1502', note: '8. Le FIN compte pour 1 → 1501 + 1.' },
      { from: 1, to: 0, label: 'FIN', note: '9. Le serveur ferme à son tour.' },
      { from: 0, to: 1, label: 'ACK', note: '10. Le client acquitte puis reste un moment en TIME_WAIT.' }
    ]
  });
  const doraSeq = JSON.stringify({
    title: 'DHCP : DORA avec relais',
    actors: ['Client<br><small>0.0.0.0</small>', 'R-ZINDER<br><small>relais 10.20.3.1</small>', 'Serveur DHCP<br><small>10.20.0.10</small>'],
    intro: 'Un poste de Zinder démarre sans adresse. Le serveur DHCP est à Niamey : il faut un relais (ip helper-address).',
    msgs: [
      { from: 0, to: 1, label: 'DISCOVER', sub: '0.0.0.0:68 → 255.255.255.255:67', bc: true, note: 'D — Le client cherche un serveur, en broadcast (il n\'a pas encore d\'IP).' },
      { from: 1, to: 2, label: 'DISCOVER relayé', sub: 'unicast, giaddr 10.20.3.1', note: 'Le relais transforme le broadcast en unicast vers 10.20.0.10, en indiquant sa propre adresse : le serveur sait ainsi dans quel pool choisir.' },
      { from: 2, to: 1, label: 'OFFER', sub: '10.20.3.57 proposée', note: 'O — Le serveur propose une adresse et des options (masque, passerelle, DNS, bail).' },
      { from: 1, to: 0, label: 'OFFER', note: 'Le relais transmet l\'offre au client.' },
      { from: 0, to: 1, label: 'REQUEST', sub: 'broadcast', bc: true, note: 'R — Le client accepte, en broadcast, pour prévenir les autres serveurs qu\'ils ne sont pas retenus.' },
      { from: 1, to: 2, label: 'REQUEST relayé', note: 'Relayé vers le serveur.' },
      { from: 2, to: 1, label: 'ACK', note: 'A — Le serveur confirme le bail.' },
      { from: 1, to: 0, label: 'ACK', sub: '10.20.3.57/25, passerelle .1', note: 'Le client configure son interface. Renouvellement à 50 % du bail (T1), puis 87,5 % (T2).' }
    ]
  });
  const dnsSeq = JSON.stringify({
    title: 'DNS : résolution de www.finances.exemple.ne (cache vide)',
    actors: ['Poste', 'Résolveur<br><small>DNS interne</small>', 'Racine « . »', 'Serveurs .ne', 'ns1.finances…'],
    msgs: [
      { from: 0, to: 1, label: 'requête récursive', note: '1. Le poste demande au résolveur « donne-moi la réponse finale » (récursive).' },
      { from: 1, to: 2, label: 'www.finances.exemple.ne ?', note: '2. Cache vide : le résolveur interroge un serveur racine (itératif).' },
      { from: 2, to: 1, label: 'voir les serveurs de .ne', note: 'La racine ne connaît pas la réponse mais renvoie vers les serveurs du TLD .ne.' },
      { from: 1, to: 3, label: '… ?', note: '3. Le résolveur interroge les serveurs de .ne, qui le renvoient vers exemple.ne puis vers les NS de finances.exemple.ne.' },
      { from: 3, to: 1, label: 'voir ns1.finances…', note: '« Demande plutôt à… » : c\'est la réponse typique d\'une requête itérative.' },
      { from: 1, to: 4, label: 'www ?', note: '4. Il interroge le serveur faisant autorité (ns1).' },
      { from: 4, to: 1, label: 'CNAME web · A 203.0.113.5', note: '5. www est un alias (CNAME) de web, dont l\'enregistrement A vaut 203.0.113.5.' },
      { from: 1, to: 0, label: '203.0.113.5', note: '6. Le résolveur répond au poste et garde la réponse en cache pendant le TTL.' }
    ]
  });

  App.registerModule({
    id: 's4', order: 4, label: 'Séance 4', short: 'TCP/UDP & services',
    title: 'TCP, UDP et services : DNS, DHCP, HTTP, messagerie',
    subtitle: 'Modèles en couches, ports, poignée de main, DORA, enregistrements DNS — Épreuve 2',
    icon: '🔌', color: '#22c55e', day: '2026-10-13', epreuve: 'Épreuve 2',
    intro: 'Les couches OSI et TCP/IP, la couche transport (TCP vs UDP, numéros de séquence, fenêtre), le tableau des ports, puis les services réseau. Intègre les cours « Principes de communication », « Couche transport » et « Couche application » de l\'ESTN.',

    pretest: [
      { type: 'qcm', q: 'Taille de l\'en-tête UDP :', choices: ['8 octets', '20 octets', '4 octets', '40 octets'], a: 0, expl: 'Ports source et destination, longueur, somme de contrôle : 4 × 2 octets.' },
      { type: 'qcm', q: 'Le premier message DHCP envoyé par le client :', choices: ['Discover', 'Offer', 'Request', 'Ack'], a: 0, expl: 'D-O-R-A.' },
      { type: 'qcm', q: 'Enregistrement DNS d\'un serveur de messagerie :', choices: ['MX', 'A', 'PTR', 'SOA'], a: 0, expl: 'Mail eXchanger.' }
    ],

    lessons: [
      {
        title: 'Modèles OSI et TCP/IP, encapsulation', min: 8,
        essentiel: ul([
          'OSI de 1 à 7 : <b>Physique, Liaison, Réseau, Transport, Session, Présentation, Application</b>.',
          'PDU : <b>bit</b> (1), <b>trame</b> (2), <b>paquet</b> (3), <b>segment</b> TCP / datagramme UDP (4), données (5-7).',
          'Encapsulation : chaque couche ajoute son en-tête en descendant ; la réception les retire (désencapsulation).'
        ]),
        html: `
${table(['N°', 'Couche OSI', 'Rôle (en une phrase)', 'PDU', 'Exemples', 'TCP/IP'], [
  ['7', 'Application', 'Service rendu à l\'utilisateur', 'Données', 'HTTP, DNS, SMTP, FTP, SSH', 'Application'],
  ['6', 'Présentation', 'Format, chiffrement, compression', '', 'TLS, JPEG, ASCII', 'Application'],
  ['5', 'Session', 'Ouvrir / maintenir / fermer un dialogue', '', 'RPC, NetBIOS', 'Application'],
  ['4', 'Transport', 'De processus à processus (ports), fiabilité', 'Segment / datagramme', 'TCP, UDP', 'Transport'],
  ['3', 'Réseau', 'Adressage logique et routage de bout en bout', 'Paquet', 'IP, ICMP, OSPF', 'Internet'],
  ['2', 'Liaison', 'Transmission sur le lien local (MAC), détection d\'erreurs', 'Trame', 'Ethernet, Wi-Fi, PPP', 'Accès réseau'],
  ['1', 'Physique', 'Transmission des bits sur le support', 'Bit', 'Câble, fibre, radio', 'Accès réseau']
])}
${mnemo('De 1 à 7 : « <b>P</b>our <b>L</b>e <b>R</b>éseau <b>T</b>out <b>S</b>e <b>P</b>asse <b>A</b>utomatiquement ». PDU de 1 à 4 : Bit – Trame – Paquet – Segment.')}
${ex('Données → + en-tête TCP = <b>segment</b> → + en-tête IP = <b>paquet</b> → + en-tête et FCS Ethernet = <b>trame</b> → <b>bits</b> sur le câble. À la réception, chaque couche retire le sien.', 'Encapsulation')}
<h3>Règles de communication et normalisation (cours)</h3>
${ul(['Un protocole fixe : le <b>codage</b>, le <b>format et l\'encapsulation</b>, la <b>taille</b>, la <b>synchronisation</b> et les <b>options de remise</b> des messages (unicast, multicast, broadcast).', 'Organismes : <b>IANA</b> (adresses, numéros de ports, noms), <b>ICANN</b> (noms de domaine), <b>ISO</b> (modèle OSI), <b>IEEE</b> (802.3, 802.11), <b>IETF</b> (RFC : TCP/IP), <b>UIT-T</b> (télécoms).', 'Critères d\'un réseau fiable : <b>résilience</b> (tolérance aux pannes), <b>évolutivité</b>, <b>qualité de service</b>, <b>sécurité</b> (disponibilité, intégrité, confidentialité).'])}
${fix('Le support indique « ISO créée en 1946 à Londres, 164 membres ». La réunion fondatrice a bien eu lieu à Londres en 1946, mais l\'ISO a été officiellement créée en <b>1947</b> et siège à <b>Genève</b> ; elle compte aujourd\'hui environ 170 membres. Au concours, retiens : <b>ISO = Organisation internationale de normalisation, modèle OSI</b>.')}
${tip('La couche présentation (cours) a trois fonctions : <b>mettre en forme</b>, <b>compresser</b>, <b>chiffrer</b> les données.')}
`,
        check: [
          { type: 'qcm', q: 'La couche 4 du modèle OSI est :', choices: ['Réseau', 'Session', 'Transport', 'Liaison'], a: 2, noShuffle: true, expl: 'Transport : TCP, UDP.' },
          { type: 'qcm', q: 'Le PDU de la couche 3 s\'appelle :', choices: ['trame', 'segment', 'paquet', 'bit'], a: 2, noShuffle: true, expl: 'Paquet.' },
          { type: 'order', q: 'Remets les couches OSI dans l\'ordre, de 1 à 7.', items: ['Physique', 'Liaison', 'Réseau', 'Transport', 'Session', 'Présentation', 'Application'], expl: '« Pour Le Réseau Tout Se Passe Automatiquement ».' }
        ]
      },
      {
        title: 'Ports, sockets et multiplexage', min: 5,
        essentiel: ul([
          'L\'adresse IP désigne la machine ; le <b>port</b> (16 bits, 0 à 65 535) désigne le <b>programme</b>.',
          '0-1023 bien connus · 1024-49151 enregistrés · 49152-65535 dynamiques (côté client).',
          '<b>Socket</b> = IP + port. Une connexion = 5 éléments : IP et port source, IP et port destination, protocole.'
        ]),
        html: `
${table(['Plage', 'Nom', 'Exemples'], [['0 – 1023', 'Ports bien connus (services standard)', '22 SSH, 80 HTTP, 443 HTTPS'], ['1024 – 49 151', 'Ports enregistrés (applications)', '3306 MySQL, 3389 RDP'], ['49 152 – 65 535', 'Ports dynamiques / éphémères (côté client)', 'port source du navigateur']])}
<p>La couche transport (cours) : <b>suit chaque conversation</b>, <b>segmente</b> les données et les reconstitue, <b>identifie les applications</b> par les ports, et <b>multiplexe</b> plusieurs conversations sur le même réseau.</p>
${ex('Paire de sockets : <span class="mono">192.168.1.5:1099 ↔ 192.168.1.7:80</span>. Le port source (1099) sert d\'« adresse de retour » ; un même client peut ouvrir plusieurs connexions vers le même serveur, distinguées par leur port source.')}
${code(`netstat -an          ! connexions actives, adresses et ports en numérique
ss -tulpn            ! Linux : ports en écoute et processus`)}
${tip('<code>netstat</code> sert aussi en sécurité : une connexion TCP inexpliquée vers l\'extérieur peut trahir un logiciel malveillant.')}
`,
        check: [
          { type: 'qcm', q: 'Un port est codé sur :', choices: ['16 bits', '8 bits', '32 bits', '48 bits'], a: 0, expl: '0 à 65 535.' },
          { type: 'qcm', q: 'Les ports dynamiques (éphémères) utilisés par les clients commencent à :', choices: ['49 152', '1 024', '80', '65 535'], a: 0, expl: 'Plage IANA 49 152 – 65 535.' }
        ]
      },
      {
        title: 'TCP contre UDP', min: 6,
        essentiel: ul([
          '<b>TCP</b> : orienté connexion (3 temps), fiable (ACK, retransmission), ordonné, contrôle de flux et de congestion, en-tête <b>20 octets</b>.',
          '<b>UDP</b> : sans connexion, « au mieux », pas de remise en ordre, en-tête <b>8 octets</b>.',
          'UDP pour : DNS, DHCP, TFTP, SNMP, NTP, Syslog, VoIP (RTP), vidéo en direct.'
        ]),
        html: `
${table(['', 'TCP', 'UDP'], [
  ['Connexion', 'Orienté connexion (poignée de main en 3 temps)', 'Sans connexion'],
  ['Fiabilité', 'Accusés de réception, retransmission des pertes', 'Aucune garantie (« au mieux »)'],
  ['Ordre', 'Remis dans l\'ordre (numéros de séquence)', 'Pas de remise en ordre'],
  ['Contrôle', 'Flux (fenêtre glissante) et congestion (slow start)', 'Aucun'],
  ['En-tête', '20 octets minimum', '8 octets (ports, longueur, somme de contrôle)'],
  ['Usages', 'Web, messagerie, fichiers, SSH, bases de données', 'DNS, DHCP, VoIP (RTP), vidéo en direct, SNMP, NTP, TFTP, Syslog']
])}
<h3>Les 3 familles d'applications UDP (cours)</h3>
${ul(['<b>Multimédia et streaming</b> : tolèrent un peu de pertes, pas de retard (VoIP, vidéo en direct).', '<b>Requête / réponse simples</b> : DNS, DHCP.', '<b>Applications qui gèrent elles-mêmes la fiabilité</b> : SNMP, TFTP.'])}
${why('Pourquoi la VoIP utilise UDP : une donnée vocale retransmise arrive trop tard pour être utile ; mieux vaut perdre un peu de son que d\'accumuler du retard.')}
${tip('Côté UDP, le client choisit un port source dynamique ; le serveur répond en <b>inversant</b> ports source et destination. Toute la transaction garde la même paire de ports.')}
`,
        check: [
          { type: 'qcm', q: 'Taille de l\'en-tête UDP :', choices: ['4', '8', '20', '40'], a: 1, noShuffle: true, expl: '8 octets.' },
          { type: 'qcm', q: 'Lequel utilise UDP ?', choices: ['DHCP', 'SSH', 'HTTPS', 'SMTP'], a: 0, expl: 'DHCP : UDP 67/68.' },
          { type: 'tf', q: 'UDP remet les datagrammes dans l\'ordre.', a: false, expl: 'Non : pas de numéros de séquence.' }
        ]
      },
      {
        title: 'TCP en détail : séquences, ACK, fenêtre', min: 10,
        essentiel: ul([
          '<b>ACK = séquence reçue + nombre d\'octets reçus</b> (« le prochain octet que j\'attends »). Le <b>SYN</b> et le <b>FIN</b> comptent pour 1.',
          '<b>MSS = MTU − 20 (IP) − 20 (TCP) = 1 460</b> octets.',
          '<b>Débit ≤ fenêtre ÷ RTT</b> : 65 535 octets sur satellite (RTT 600 ms) → ≈ 874 kbit/s → option <b>window scaling</b>.'
        ]),
        html: `
<p><b>En-tête TCP</b> : port source (16) · port destination (16) · numéro de séquence (32) · numéro d'acquittement (32) · longueur d'en-tête · drapeaux · fenêtre (16) · somme de contrôle · pointeur urgent · options.</p>
${table(['Drapeau', 'Sens'], [['SYN', 'Synchroniser les numéros de séquence (ouverture)'], ['ACK', 'Le champ acquittement est valide'], ['PSH', 'Remettre tout de suite à l\'application'], ['URG', 'Pointeur urgent significatif'], ['RST', 'Réinitialiser : coupure brutale (ex. port fermé)'], ['FIN', 'Plus de données de l\'émetteur (fermeture)']])}
${w('seq', { seq: tcpSeq })}
${key('Ouverture : <b>3 segments</b> (SYN, SYN-ACK, ACK). Fermeture : <b>4 segments</b> (FIN, ACK, FIN, ACK) ; le client reste ensuite en TIME_WAIT. RST = coupure brutale.')}
${f(`Débit<sub>max</sub> = ${frac('fenêtre × 8', 'RTT')} = ${frac('65 535 × 8', '0,6 s')} ≈ <b class="hl">874 kbit/s</b>`, 'quel que soit le débit du lien')}
${w('tcpcalc')}
${trap('L\'ACK = séquence + octets reçus, <b>pas + 1</b> — sauf pour le SYN et le FIN, qui comptent pour 1 octet.')}
${why('Fenêtre glissante = contrôle de flux : le récepteur annonce combien d\'octets il peut encore recevoir. Plusieurs segments peuvent être acquittés par un seul ACK.')}
`,
        check: [
          { type: 'input', q: 'Client ISN 1000, serveur ISN 5000. Le client envoie 500 octets, le serveur répond 1 460. Quel ACK le client renvoie-t-il ensuite ?', fields: [{ kind: 'num', a: 6461 }], expl: '5000 + 1 (SYN) + 1 460 = 6 461.' },
          { type: 'qcm', q: 'Drapeau TCP qui termine brutalement une connexion :', choices: ['FIN', 'RST', 'PSH', 'URG'], a: 1, noShuffle: true, expl: 'RST.' },
          { type: 'input', q: 'MSS sur Ethernet (octets) ?', fields: [{ kind: 'num', a: 1460 }], expl: '1 500 − 20 − 20.' }
        ]
      },
      {
        title: 'Les ports à connaître par cœur', min: 6,
        essentiel: ul([
          '20/21 FTP · 22 SSH · 23 Telnet · 25 SMTP · 53 DNS · 67/68 DHCP · 69 TFTP · 80 HTTP · 110 POP3 · 123 NTP · 143 IMAP · 161/162 SNMP · 443 HTTPS.',
          '389 LDAP · 445 SMB · 514 Syslog · 587 SMTP soumission · 993 IMAPS · 995 POP3S · 3389 RDP · 1812 RADIUS · 88 Kerberos.',
          'UDP : 53 (requêtes), 67/68, 69, 123, 161/162, 514, 1812/1813, 500/4500.'
        ]),
        html: `
${table(['Port', 'Service', 'Transport', 'Port', 'Service', 'Transport'], [
  ['20 / 21', 'FTP (données / commandes)', 'TCP', '143 / 993', 'IMAP / IMAPS', 'TCP'],
  ['22', 'SSH, SFTP, SCP', 'TCP', '161 / 162', 'SNMP / SNMP trap', 'UDP'],
  ['23', 'Telnet (en clair !)', 'TCP', '389 / 636', 'LDAP / LDAPS', 'TCP'],
  ['25', 'SMTP (entre serveurs)', 'TCP', '443', 'HTTPS', 'TCP (UDP pour HTTP/3)'],
  ['53', 'DNS', 'UDP et TCP', '445', 'SMB (partage Windows)', 'TCP'],
  ['67 / 68', 'DHCP (serveur / client)', 'UDP', '514', 'Syslog', 'UDP'],
  ['69', 'TFTP', 'UDP', '587 / 465', 'SMTP soumission (client → serveur)', 'TCP'],
  ['80', 'HTTP', 'TCP', '1812 / 1813', 'RADIUS (auth. / comptabilité)', 'UDP'],
  ['88', 'Kerberos', 'TCP/UDP', '3306 / 1433 / 1521', 'MySQL / SQL Server / Oracle', 'TCP'],
  ['110 / 995', 'POP3 / POP3S', 'TCP', '3389', 'RDP (bureau à distance)', 'TCP'],
  ['123', 'NTP', 'UDP', '5060 / 5061', 'SIP / SIP sur TLS', 'UDP-TCP / TCP'],
  ['500 / 4500', 'IPsec IKE / NAT-T', 'UDP', '179 · 49', 'BGP · TACACS+', 'TCP']
])}
${tip('Entraîne-toi en <a href="#/eclair/ports">défi éclair « Ports »</a> : 60 secondes chaque soir jusqu\'au concours suffisent à les ancrer.')}
${mnemo('Les « sécurisés » ajoutent souvent 400 à 900 : HTTP 80 → HTTPS 443 · IMAP 143 → IMAPS 993 · POP3 110 → POP3S 995 · LDAP 389 → LDAPS 636.')}
`,
        check: [
          { type: 'qcm', q: 'Port de RDP :', choices: ['22', '445', '3389', '5900'], a: 2, noShuffle: true, expl: '3389/TCP.' },
          { type: 'qcm', q: 'TFTP utilise :', choices: ['TCP 21', 'UDP 69', 'TCP 69', 'UDP 21'], a: 1, noShuffle: true, expl: 'UDP 69.' },
          { type: 'match', q: 'Associe le port au service.', pairs: [['22', 'SSH'], ['53', 'DNS'], ['161', 'SNMP'], ['445', 'SMB'], ['514', 'Syslog']], expl: 'À connaître par cœur.' }
        ]
      },
      {
        title: 'DNS : la résolution de noms', min: 9,
        essentiel: ul([
          'Hiérarchie : racine « . » → TLD (.ne, .com) → domaines → sous-domaines. Chaque zone a un serveur faisant <b>autorité</b> (primaire + secondaires).',
          'Requête <b>récursive</b> (poste → résolveur : « la réponse finale ») ; <b>itérative</b> (résolveur → racine → TLD → autorité : « demande plutôt à… »).',
          'A, AAAA, CNAME, <b>MX</b> (plus petite priorité d\'abord), NS, PTR, SOA (n° de série), TXT, SRV. UDP 53 ; <b>TCP 53</b> pour les transferts de zone.'
        ]),
        html: `
${table(['Enregistrement', 'Rôle'], [['A', 'Nom → adresse IPv4'], ['AAAA', 'Nom → adresse IPv6'], ['CNAME', 'Alias → nom canonique'], ['MX', 'Serveur de messagerie du domaine (priorité : la plus petite est essayée d\'abord)'], ['NS', 'Serveurs faisant autorité pour la zone'], ['PTR', 'Adresse IP → nom (zone in-addr.arpa)'], ['SOA', 'Début de zone : serveur primaire, n° de série, minuteries'], ['TXT', 'Texte libre (SPF, DKIM contre le spam)'], ['SRV', 'Localiser un service (utilisé par Active Directory)']])}
${w('seq', { seq: dnsSeq })}
${ex(`${code(`$ORIGIN finances.exemple.ne.
@     IN SOA  ns1 admin ( 2026101301 3600 900 604800 86400 )
@     IN NS   ns1
@     IN MX   10 mail1
@     IN MX   20 mail2
mail1 IN A    203.0.113.20
web   IN A    203.0.113.5
www   IN CNAME web
web   IN AAAA 2001:db8:4e0::5`)}
www → CNAME web → A <b>203.0.113.5</b>. Un mail pour agent@finances.exemple.ne part d'abord vers <b>mail1</b> (priorité 10), puis mail2 si mail1 est en panne.<br>
Inverse de 203.0.113.5 : zone <b>113.0.203.in-addr.arpa</b>, ligne <span class="mono">5 IN PTR web.finances.exemple.ne.</span><br>
<b>2026101301</b> = numéro de série (AAAAMMJJnn) : à incrémenter à chaque modification, sinon les secondaires gardent l'ancienne version.`, 'Lire une zone (plan)')}
${ul(['Les réponses sont gardées en <b>cache</b> pendant leur TTL. Le fichier local <b>hosts</b> est consulté avant le DNS.', 'Outils : <code>nslookup</code>, <code>dig</code>, <code>ipconfig /flushdns</code>.'])}
${trap('DNS utilise aussi <b>TCP</b> (transferts de zone AXFR, grosses réponses). Et MX : c\'est la priorité la plus <b>petite</b> qui passe en premier.')}
`,
        check: [
          { type: 'qcm', q: 'Enregistrement pour la résolution inverse :', choices: ['PTR', 'A', 'CNAME', 'MX'], a: 0, expl: 'PTR dans in-addr.arpa.' },
          { type: 'qcm', q: 'MX 10 mail1 et MX 20 mail2 : quel serveur est essayé en premier ?', choices: ['mail1', 'mail2', 'au hasard', 'les deux'], a: 0, expl: 'Plus petite priorité d\'abord.' },
          { type: 'input', q: 'Zone de résolution inverse de 203.0.113.5 (sans le point final) ?', fields: [{ kind: 'text', a: ['113.0.203.in-addr.arpa', '113.0.203.in-addr.arpa.'] }], expl: 'Octets réseau à l\'envers + in-addr.arpa.' }
        ]
      },
      {
        title: 'DHCP : attribution automatique', min: 8,
        essentiel: ul([
          '<b>DORA</b> (UDP, serveur 67, client 68) : Discover (broadcast) → Offer → Request (<b>broadcast</b>) → Ack.',
          'Serveur dans un autre réseau → <b>relais</b> sur le routeur du client : <code>ip helper-address &lt;IP serveur&gt;</code>. Sinon : APIPA 169.254.x.x.',
          'Renouvellement à <b>50 %</b> du bail (T1, même serveur), puis <b>87,5 %</b> (T2, n\'importe quel serveur).'
        ]),
        html: `
${w('seq', { seq: doraSeq })}
${table(['Message', 'IP source', 'IP destination', 'Ports'], [['Discover (poste)', '0.0.0.0', '255.255.255.255', '68 → 67'], ['Offer (serveur)', '10.20.0.10 (relayé)', 'adresse proposée ou broadcast', '67 → 68'], ['Request (poste)', '0.0.0.0', '255.255.255.255', '68 → 67'], ['Ack (serveur)', '10.20.0.10 (relayé)', 'adresse attribuée ou broadcast', '67 → 68']])}
${ul(['Paramètres fournis : IP + masque, <b>passerelle (option 3)</b>, <b>DNS (option 6)</b>, nom de domaine (option 15), durée du bail.', '<b>Réservation</b> : toujours la même IP pour une MAC (imprimantes, serveurs). <b>Exclusions</b> : adresses du pool jamais distribuées (passerelle, serveurs fixes).', 'Le serveur peut répondre <b>DHCPNAK</b> si l\'offre n\'est plus valide (cours).', 'DHCPv6 (cours) : SOLLICITATION, ANNONCE, DEMANDE, RÉPONSE.'])}
${code(`! Relais sur R-ZINDER, interface côté LAN des clients
interface g0/0
 ip helper-address 10.20.0.10

! Variante : R-ZINDER serveur DHCP
ip dhcp excluded-address 10.20.3.1 10.20.3.10
ip dhcp pool ZINDER
 network 10.20.3.0 255.255.255.128
 default-router 10.20.3.1
 dns-server 10.20.0.10
 lease 8`)}
${trap('Attaques : <b>faux serveur DHCP</b> (fausse passerelle ou faux DNS → homme du milieu) et <b>épuisement du pool</b>. Parade : <b>DHCP snooping</b> sur les switchs.')}
${reflex('Bail de 8 jours : premier renouvellement au bout de <b>4 jours</b> (T1), puis tentative auprès de n\'importe quel serveur à 7 jours (T2).')}
`,
        check: [
          { type: 'qcm', q: 'Le DHCP Request est envoyé en :', choices: ['broadcast', 'unicast', 'multicast', 'anycast'], a: 0, expl: 'Pour prévenir les autres serveurs qu\'ils ne sont pas retenus.' },
          { type: 'qcm', q: 'Commande qui transforme le routeur en relais DHCP :', choices: ['ip helper-address', 'ip dhcp pool', 'ip nat inside', 'service dhcp'], a: 0, expl: 'Sur l\'interface côté clients.' },
          { type: 'order', q: 'Ordre des messages DHCP :', items: ['Discover', 'Offer', 'Request', 'Ack'], expl: 'DORA.' }
        ]
      },
      {
        title: 'Web, messagerie, fichiers, gestion', min: 9,
        essentiel: ul([
          'HTTP : GET, POST, PUT, DELETE ; codes 2xx succès, 3xx redirection, 4xx erreur client (401, 403, 404), 5xx erreur serveur (500, 503). HTTPS = HTTP + TLS + certificat.',
          '<b>SMTP</b> envoie (25 entre serveurs, 587 du client) ; <b>POP3</b> télécharge (un seul appareil) ; <b>IMAP</b> synchronise (plusieurs appareils).',
          'FTP : 2 connexions (21 commandes, 20 données) ; SSH remplace Telnet ; SNMP (v3 chiffre) ; NTP indispensable pour Kerberos.'
        ]),
        html: `
<h3>Le Web (cours)</h3>
<p>L'URL <span class="mono">http://www.cisco.com/index.html</span> = <b>protocole</b> (http) + <b>nom du serveur</b> (traduit par le DNS) + <b>fichier</b> demandé. Le navigateur envoie un <b>GET</b>, reçoit le HTML et l'affiche.</p>
${table(['Code', 'Sens', 'Code', 'Sens'], [['200', 'OK', '403', 'Interdit (même authentifié)'], ['301 / 302', 'Redirection définitive / temporaire', '404', 'Introuvable'], ['304', 'Non modifié (cache)', '500', 'Erreur interne du serveur'], ['400', 'Requête invalide', '502 / 503', 'Passerelle invalide / service indisponible'], ['401', 'Authentification requise', '', '1xx info · 2xx succès · 3xx redirection · 4xx client · 5xx serveur']])}
<h3>La messagerie</h3>
${steps(['Client → <b>SMTP 587</b> (authentifié, TLS) → serveur du Ministère.', 'Le serveur interroge le DNS : <b>MX</b> du domaine destinataire.', '<b>SMTP 25</b> vers le serveur MX du destinataire → stockage dans la boîte.', 'Le destinataire lit avec <b>IMAP (993)</b> ou <b>POP3 (995)</b>.'])}
${ul(['<b>POP3</b> : télécharge et (souvent) supprime du serveur → un seul appareil.', '<b>IMAP</b> : les mails restent sur le serveur, dossiers synchronisés → PC + téléphone.'])}
<h3>Transfert de fichiers et gestion</h3>
${ul(['<b>FTP</b> : 21 (commandes) + 20 (données en mode actif) ; mode <b>passif</b> pour traverser les pare-feux ; mot de passe en clair → préférer <b>SFTP</b> (sur SSH) ou FTPS.', '<b>SSH</b> (22) remplace <b>Telnet</b> (23, en clair).', '<b>SNMP</b> : un manager interroge des agents (GET/SET, UDP 161) qui envoient aussi des alertes (TRAP, 162) ; données décrites dans la <b>MIB</b>. v1/v2c : « communauté » en clair ; <b>v3</b> : authentification et chiffrement.', '<b>NTP</b> (UDP 123) : synchronise l\'heure (strates). Indispensable pour les journaux et Kerberos (écart max 5 min).', 'Modèles : <b>client-serveur</b> (le client demande, le serveur répond) ou <b>pair-à-pair (P2P)</b> où chaque nœud est client et serveur (BitTorrent, avec des « trackers »).'])}
${trap('POP3 et IMAP servent à <b>lire</b> ; seul <b>SMTP</b> sert à <b>envoyer</b>. Un agent qui reçoit mais n\'envoie pas → regarder SMTP (587).')}
`,
        check: [
          { type: 'qcm', q: 'Les agents lisent leurs mails sur PC et téléphone. POP3 ou IMAP ?', choices: ['IMAP', 'POP3', 'SMTP', 'MIME'], a: 0, expl: 'IMAP synchronise.' },
          { type: 'qcm', q: 'Code HTTP « accès interdit » :', choices: ['403', '401', '404', '503'], a: 0, expl: '401 = authentification requise ; 403 = interdit même authentifié.' },
          { type: 'qcm', q: 'Version de SNMP qui chiffre :', choices: ['v1', 'v2c', 'v3', 'aucune'], a: 2, noShuffle: true, expl: 'SNMPv3.' }
        ]
      }
    ],

    cards: [
      { front: 'Couches OSI de 1 à 7 ?', back: 'Physique, Liaison, Réseau, Transport, Session, Présentation, Application (« Pour Le Réseau Tout Se Passe Automatiquement »)' },
      { front: 'PDU des couches 1, 2, 3, 4 ?', back: 'Bit · trame · paquet · segment (TCP) / datagramme (UDP)' },
      { front: 'Couches du modèle TCP/IP ?', back: 'Accès réseau · Internet · Transport · Application' },
      { front: 'Les 3 fonctions de la couche présentation ?', back: 'Mettre en forme · compresser · chiffrer' },
      { front: 'Organismes : IANA, ICANN, ISO, IEEE, IETF ?', back: 'adresses/ports · noms de domaine · OSI · 802.x · RFC TCP/IP' },
      { front: 'Plages de ports ?', back: '0-1023 bien connus · 1024-49151 enregistrés · 49152-65535 dynamiques' },
      { front: 'Socket ? Connexion ?', back: 'Socket = IP + port · connexion = IP/port source + IP/port destination + protocole' },
      { front: 'TCP vs UDP : en-têtes ?', back: 'TCP 20 octets · UDP 8 octets' },
      { front: 'Pourquoi la VoIP utilise UDP ?', back: 'Une voix retransmise arrive trop tard : mieux vaut perdre un peu de son que du retard' },
      { front: 'Poignée de main TCP ?', back: 'SYN (seq x) → SYN-ACK (seq y, ack x+1) → ACK (seq x+1, ack y+1)' },
      { front: 'Règle de calcul de l\'ACK ?', back: 'Séquence reçue + octets reçus ; SYN et FIN comptent pour 1' },
      { front: 'Fermeture TCP ?', back: '4 segments : FIN, ACK, FIN, ACK (puis TIME_WAIT) ; RST = brutal' },
      { front: 'MSS sur Ethernet ?', back: '<b>1 460</b> = 1 500 − 20 (IP) − 20 (TCP)' },
      { front: 'Débit max d\'une connexion TCP ?', back: 'fenêtre × 8 ÷ RTT (65 535 o sur RTT 600 ms ≈ 874 kbit/s) → window scaling' },
      { front: 'Ports : FTP, SSH, Telnet, SMTP, DNS ?', back: '20/21 · 22 · 23 · 25 · 53' },
      { front: 'Ports : DHCP, TFTP, HTTP, POP3, NTP ?', back: '67/68 · 69 · 80 · 110 · 123' },
      { front: 'Ports : IMAP, SNMP, LDAP, HTTPS, SMB ?', back: '143 · 161/162 · 389 · 443 · 445' },
      { front: 'Ports : Syslog, SMTP soumission, IMAPS, POP3S, RDP ?', back: '514 · 587 · 993 · 995 · 3389' },
      { front: 'Ports : Kerberos, RADIUS, IKE, NAT-T, SIP ?', back: '88 · 1812/1813 · 500 · 4500 · 5060' },
      { front: 'Requête DNS récursive vs itérative ?', back: 'Récursive : « la réponse finale » (poste → résolveur) · itérative : « demande plutôt à… »' },
      { front: 'Enregistrements A, AAAA, CNAME, MX, NS ?', back: 'Nom→IPv4 · Nom→IPv6 · alias · messagerie (priorité) · serveurs de la zone' },
      { front: 'Enregistrements PTR, SOA, TXT, SRV ?', back: 'IP→nom · début de zone (n° de série) · texte (SPF/DKIM) · localiser un service (AD)' },
      { front: 'DNS et TCP ?', back: 'TCP 53 pour les transferts de zone (AXFR) et les grosses réponses' },
      { front: 'DORA ?', back: 'Discover (broadcast) → Offer → Request (broadcast) → Ack ; UDP 67/68' },
      { front: 'Relais DHCP ?', back: '<code>ip helper-address IP-serveur</code> sur l\'interface du routeur côté clients' },
      { front: 'Options DHCP 3, 6, 15 ?', back: 'Passerelle · DNS · nom de domaine' },
      { front: 'Renouvellement DHCP : T1, T2 ?', back: '50 % du bail (même serveur) · 87,5 % (n\'importe quel serveur)' },
      { front: 'Attaques DHCP et parade ?', back: 'Faux serveur, épuisement du pool → <b>DHCP snooping</b>' },
      { front: 'Codes HTTP 301, 401, 403, 404, 503 ?', back: 'Déplacé · authentification requise · interdit · introuvable · service indisponible' },
      { front: 'SMTP, POP3, IMAP ?', back: 'Envoyer · télécharger (1 appareil) · synchroniser (plusieurs appareils)' },
      { front: 'FTP : connexions ?', back: '21 commandes + 20 données (mode actif) ; passif pour les pare-feux ; préférer SFTP' },
      { front: 'SNMP : composants et versions ?', back: 'Manager, agents, MIB, GET/SET/TRAP ; v1/v2c communauté en clair, v3 chiffre' },
      { front: 'NTP : pourquoi indispensable ?', back: 'Horodatage des journaux et Kerberos (écart max 5 min)' }
    ],

    qcm: [
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'Taille de l\'en-tête UDP :', choices: ['4', '8', '20', '40 octets'], a: 1, noShuffle: true, expl: '8 octets.' },
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'La couche 4 du modèle OSI est :', choices: ['Réseau', 'Session', 'Transport', 'Liaison'], a: 2, noShuffle: true, expl: 'Transport.' },
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'L\'enregistrement DNS d\'un serveur de messagerie :', choices: ['A', 'MX', 'PTR', 'SOA'], a: 1, noShuffle: true, expl: 'MX.' },
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'Port de RDP :', choices: ['22', '445', '3389', '5900'], a: 2, noShuffle: true, expl: '3389.' },
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'Le message DHCP envoyé en premier par le client :', choices: ['Request', 'Offer', 'Discover', 'Ack'], a: 2, noShuffle: true, expl: 'Discover.' },
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'Drapeau TCP qui termine brutalement une connexion :', choices: ['FIN', 'RST', 'PSH', 'URG'], a: 1, noShuffle: true, expl: 'RST.' },
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'Version de SNMP qui chiffre les échanges :', choices: ['v1', 'v2c', 'v3', 'aucune'], a: 2, noShuffle: true, expl: 'v3.' },
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'Protocole qui permet de lire ses mails sur plusieurs appareils :', choices: ['SMTP', 'POP3', 'IMAP', 'MIME'], a: 2, noShuffle: true, expl: 'IMAP.' },
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'TFTP utilise :', choices: ['TCP 21', 'UDP 69', 'TCP 69', 'UDP 21'], a: 1, noShuffle: true, expl: 'UDP 69.' },
      { type: 'qcm', src: 'Plan S4 · QCM', q: 'Le PDU de la couche 3 s\'appelle :', choices: ['trame', 'segment', 'paquet', 'bit'], a: 2, noShuffle: true, expl: 'Paquet.' },
      { type: 'qcm', q: 'Pourquoi le serveur envoie-t-il au plus 1 460 octets par segment ?', choices: ['MTU 1 500 − 20 (IP) − 20 (TCP)', 'limite de la fenêtre', 'limite de l\'ACK', 'taille du port'], a: 0, expl: 'MSS ; au-delà, il faudrait fragmenter.' },
      { type: 'qcm', q: 'Un client envoie un SYN avec seq = 200. Le SYN-ACK porte ack = ?', choices: ['201', '200', '1', '0'], a: 0, expl: 'Le SYN compte pour 1.' },
      { type: 'qcm', q: 'Les postes de Zinder obtiennent 169.254.x.x alors que le serveur DHCP est à Niamey. Cause ?', choices: ['pas de relais (ip helper-address) sur R-ZINDER', 'DNS en panne', 'NAT mal configuré', 'mauvaise passerelle'], a: 0, expl: 'Le Discover broadcast n\'est pas routé.' },
      { type: 'qcm', q: 'Le numéro de série du SOA sert à :', choices: ['indiquer aux secondaires qu\'il faut recopier la zone', 'chiffrer la zone', 'compter les requêtes', 'définir le TTL'], a: 0, expl: 'À incrémenter à chaque modification.' },
      { type: 'qcm', q: 'Un agent reçoit ses mails mais ne peut pas en envoyer. Protocole en cause ?', choices: ['SMTP (587)', 'IMAP (993)', 'POP3 (995)', 'DNS (53)'], a: 0, expl: 'L\'envoi passe par SMTP.' },
      { type: 'qcm', q: 'Quel service utilise à la fois UDP et TCP sur le même port ?', choices: ['DNS (53)', 'DHCP (67)', 'SSH (22)', 'NTP (123)'], a: 0, expl: 'UDP pour les requêtes, TCP pour les transferts de zone.' },
      { type: 'tf', q: 'Une requête DNS récursive demande au serveur de fournir la réponse finale.', a: true, expl: 'Le résolveur se charge des requêtes itératives.' },
      { type: 'tf', q: 'POP3 permet d\'envoyer des mails.', a: false, expl: 'Seul SMTP envoie.' },
      { type: 'order', q: 'Trajet d\'un mail vers un autre domaine :', items: ['Client → SMTP 587 vers son serveur', 'Requête DNS MX du domaine destinataire', 'SMTP 25 vers le serveur MX destinataire', 'Lecture par IMAP ou POP3'], expl: 'Le DNS (MX) trouve le serveur de destination.' },
      { type: 'match', q: 'Associe le code HTTP à sa signification.', pairs: [['200', 'OK'], ['301', 'Déplacé définitivement'], ['404', 'Introuvable'], ['500', 'Erreur interne du serveur']], expl: '2xx succès, 3xx redirection, 4xx client, 5xx serveur.' }
    ],

    exercises: [
      {
        title: 'Poignée de main et numéros de séquence', min: 10, src: 'Plan S4 · Ex. 1',
        statement: '<p>Un poste (ISN 1000) ouvre une connexion TCP vers le serveur web de la DMZ (ISN 5000). Complète seq et ack.</p>',
        parts: [
          { q: 'Segment 1 (poste → serveur, SYN) : seq ?', pts: 0.5, fields: [{ label: 'seq', kind: 'num', a: 1000 }], corr: '<p>SYN, seq = 1000 : le poste annonce son numéro initial.</p>' },
          { q: 'Segment 2 (serveur → poste, SYN-ACK) : seq et ack ?', pts: 0.5, fields: [{ label: 'seq', kind: 'num', a: 5000 }, { label: 'ack', kind: 'num', a: 1001 }], corr: '<p>seq 5000, ack 1001 (le SYN compte pour 1).</p>' },
          { q: 'Segment 3 (poste → serveur, ACK) : seq et ack ?', pts: 0.5, fields: [{ label: 'seq', kind: 'num', a: 1001 }, { label: 'ack', kind: 'num', a: 5001 }], corr: '<p>seq 1001, ack 5001 : connexion établie.</p>' },
          { q: 'Segment 4 (requête HTTP, ACK+PSH, 500 octets) : seq et ack ?', pts: 0.5, fields: [{ label: 'seq', kind: 'num', a: 1001 }, { label: 'ack', kind: 'num', a: 5001 }], corr: '<p>seq 1001 (le segment 3 ne contenait aucune donnée), ack 5001.</p>' },
          { q: 'Segment 5 (réponse, 1 460 octets) : seq et ack ?', pts: 0.5, fields: [{ label: 'seq', kind: 'num', a: 5001 }, { label: 'ack', kind: 'num', a: 1501 }], corr: '<p>seq 5001, ack 1001 + 500 = 1501.</p>' },
          { q: 'Segment 6 (poste → serveur, ACK) : seq et ack ?', pts: 0.5, fields: [{ label: 'seq', kind: 'num', a: 1501 }, { label: 'ack', kind: 'num', a: 6461 }], corr: '<p>seq 1501, ack 5001 + 1 460 = 6461.</p>' },
          { q: 'Pourquoi le serveur envoie-t-il au maximum 1 460 octets par segment ?', pts: 1, corr: '<p>1 460 = MSS = MTU Ethernet (1 500) − en-tête IP (20) − en-tête TCP (20). Au-delà, le paquet devrait être fragmenté.</p>' }
        ]
      },
      {
        title: 'Débit et fenêtre TCP sur liaison satellite', min: 7, src: 'Plan S4 · Ex. 2',
        statement: '<p>Agadez est relié à Niamey par un VSAT de 10 Mbit/s, RTT 600 ms. Fenêtre TCP de 65 535 octets (sans option).</p>',
        parts: [
          { q: 'a) Débit maximal d\'une connexion TCP (kbit/s, arrondi) ?', pts: 1, fields: [{ kind: 'num', a: 874, rel: 0.02, show: '≈ 874 kbit/s' }], corr: '<p>65 535 × 8 ÷ 0,6 ≈ 874 000 bit/s ≈ <b>0,87 Mbit/s</b>, moins de 9 % du lien, quelle que soit sa capacité.</p>' },
          { q: 'b) Quelle fenêtre (octets) pour utiliser les 10 Mbit/s ? Quelle option TCP ?', pts: 1, fields: [{ label: 'Fenêtre (octets)', kind: 'num', a: 750000, rel: 0.01 }], corr: '<p>10 000 000 × 0,6 ÷ 8 = <b>750 000 octets</b> (≈ 732 Ko). Option <b>window scaling</b> (RFC 7323). Autres solutions : connexions parallèles, accélérateurs WAN.</p>' },
          { q: 'c) Pourquoi un appel VoIP sur ce lien sera-t-il de mauvaise qualité, même avec peu de trafic ?', pts: 1, corr: '<p>La VoIP supporte mal plus de ~150 ms dans un sens (UIT-T G.114). Ici ≈ 300 ms : conversation décalée, interlocuteurs qui se coupent. Problème de <b>latence</b>, pas de débit.</p>' }
        ]
      },
      {
        title: 'Ports et filtrage', min: 8, src: 'Plan S4 · Ex. 3',
        parts: [
          { q: 'a) Port et transport : DNS · DHCP serveur · SSH · HTTPS · SMTP entre serveurs · IMAPS · SNMP trap · RDP · Syslog · LDAP.', pts: 2, fields: [{ label: 'DNS', kind: 'num', a: 53 }, { label: 'DHCP serveur', kind: 'num', a: 67 }, { label: 'SSH', kind: 'num', a: 22 }, { label: 'HTTPS', kind: 'num', a: 443 }, { label: 'SMTP serveurs', kind: 'num', a: 25 }, { label: 'IMAPS', kind: 'num', a: 993 }, { label: 'SNMP trap', kind: 'num', a: 162 }, { label: 'RDP', kind: 'num', a: 3389 }, { label: 'Syslog', kind: 'num', a: 514 }, { label: 'LDAP', kind: 'num', a: 389 }], corr: '<p>DNS 53 UDP (et TCP) · DHCP serveur 67 UDP · SSH 22 TCP · HTTPS 443 TCP · SMTP 25 TCP · IMAPS 993 TCP · SNMP trap 162 UDP · RDP 3389 TCP · Syslog 514 UDP · LDAP 389 TCP.</p>' },
          { q: 'b) DMZ : serveur web (HTTP/HTTPS), messagerie qui reçoit d\'Internet, DNS public. Flux entrants à autoriser depuis Internet ? Comment administrer ces serveurs, et d\'où ?', pts: 1.5, corr: '<p>Uniquement vers les serveurs concernés : TCP 80 et 443 → web · TCP 25 → messagerie · UDP 53 (+ TCP 53 si nécessaire) → DNS. Tout le reste refusé par défaut. Administration : SSH (22) ou RDP, uniquement depuis le réseau d\'administration interne (ou via VPN), jamais ouvert vers Internet.</p>' },
          { q: 'c) Un agent ne parvient pas à envoyer ses mails, mais il en reçoit. Quel protocole (et port) est en cause en priorité ?', pts: 0.5, corr: '<p>SMTP (soumission, TCP 587, ou 465/25 selon la configuration) : l\'envoi passe par SMTP, la réception par IMAP/POP3.</p>' }
        ]
      },
      {
        title: 'DNS : lire une zone', min: 10, src: 'Plan S4 · Ex. 4',
        statement: code(`$ORIGIN finances.exemple.ne.
@      IN SOA   ns1 admin ( 2026101301 3600 900 604800 86400 )
@      IN NS    ns1
@      IN NS    ns2
@      IN MX    10 mail1
@      IN MX    20 mail2
ns1    IN A     203.0.113.10
ns2    IN A     203.0.113.11
mail1  IN A     203.0.113.20
mail2  IN A     203.0.113.21
web    IN A     203.0.113.5
www    IN CNAME web
web    IN AAAA  2001:db8:4e0::5`),
        parts: [
          { q: 'a) Quelle IPv4 obtient-on pour www.finances.exemple.ne ? Étapes ?', pts: 0.75, fields: [{ kind: 'ip', a: '203.0.113.5' }], corr: '<p>www est un CNAME vers web → enregistrement A de web → <b>203.0.113.5</b>.</p>' },
          { q: 'b) Un serveur extérieur envoie un mail à agent@finances.exemple.ne : vers quel serveur d\'abord ? Et s\'il est en panne ?', pts: 0.75, corr: '<p>MX → mail1 (priorité 10, la plus petite) → 203.0.113.20. En panne → mail2 (priorité 20) → 203.0.113.21.</p>' },
          { q: 'c) Enregistrement de résolution inverse de 203.0.113.5 (zone et ligne PTR).', pts: 0.75, corr: '<p>Zone <b>113.0.203.in-addr.arpa</b>, ligne : <span class="mono">5 IN PTR web.finances.exemple.ne.</span></p>' },
          { q: 'd) À quoi sert 2026101301 ? Que faire après chaque modification ?', pts: 0.75, corr: '<p>Numéro de série de la zone (AAAAMMJJnn). Les secondaires le comparent pour savoir s\'ils doivent recopier la zone : il faut l\'<b>incrémenter</b> à chaque modification.</p>' },
          { q: 'e) Résolution complète de www.finances.exemple.ne par un poste au cache vide (qui interroge qui, récursif / itératif).', pts: 1, corr: '<p>(1) Requête <b>récursive</b> du poste à son résolveur. (2) Le résolveur interroge un serveur racine → « voici les serveurs de .ne » (<b>itératif</b>). (3) Serveurs de .ne → « voici exemple.ne ». (4) exemple.ne → « voici les NS de finances.exemple.ne ». (5) ns1 (autoritaire) → CNAME web + A 203.0.113.5. (6) Réponse au poste, mise en cache pendant le TTL.</p>' }
        ]
      },
      {
        title: 'DHCP centralisé pour Zinder', min: 10, src: 'Plan S4 · Ex. 5',
        statement: '<p>Serveur DHCP à Niamey (10.20.0.10). Postes de Zinder : 10.20.3.0/25, passerelle 10.20.3.1 sur G0/0 de R-ZINDER.</p>',
        parts: [
          { q: 'a) Pour le Discover émis par le poste : IP source, IP destination, port source, port destination.', pts: 1, fields: [{ label: 'IP source', kind: 'ip', a: '0.0.0.0' }, { label: 'IP destination', kind: 'ip', a: '255.255.255.255' }, { label: 'Port source', kind: 'num', a: 68 }, { label: 'Port destination', kind: 'num', a: 67 }], corr: table(['Message', 'IP source', 'IP destination', 'Ports'], [['Discover (poste)', '0.0.0.0', '255.255.255.255', '68 → 67'], ['Offer (serveur)', '10.20.0.10 (relayé)', 'proposée ou broadcast', '67 → 68'], ['Request (poste)', '0.0.0.0', '255.255.255.255', '68 → 67'], ['Ack (serveur)', '10.20.0.10 (relayé)', 'attribuée ou broadcast', '67 → 68']]) },
          { q: 'b) Pourquoi les postes obtiennent-ils 169.254.x.x ? Commande qui corrige, et sur quelle interface ?', pts: 1, fields: [{ label: 'Commande', kind: 'code', ci: true, wide: true, a: ['ip helper-address 10.20.0.10'] }], corr: `<p>Le Discover est un broadcast que R-ZINDER ne transmet pas → aucune offre → APIPA. Sur R-ZINDER, interface côté LAN (G0/0) :</p>${code(`interface g0/0
 ip helper-address 10.20.0.10`)}<p>Le relais transforme le broadcast en unicast et indique son adresse (10.20.3.1) pour le choix du pool. Il faut aussi un pool 10.20.3.0/25 sur le serveur.</p>` },
          { q: 'c) Variante : R-ZINDER serveur DHCP (exclure les 10 premières adresses, DNS 10.20.0.10, bail de 8 jours).', pts: 1.5, corr: code(`ip dhcp excluded-address 10.20.3.1 10.20.3.10
ip dhcp pool ZINDER
 network 10.20.3.0 255.255.255.128
 default-router 10.20.3.1
 dns-server 10.20.0.10
 lease 8`) },
          { q: 'd) Avec ce bail, quand le poste demande-t-il son premier renouvellement ?', pts: 0.5, fields: [{ label: 'Jours', kind: 'num', a: 4 }], corr: '<p>À 50 % du bail → au bout de <b>4 jours</b> (T1). Sans réponse, nouvelle tentative auprès de n\'importe quel serveur à 87,5 % → 7 jours.</p>' }
        ]
      },
      {
        title: 'Web et messagerie', min: 5, src: 'Plan S4 · Ex. 6',
        parts: [
          { q: 'a) Signification des codes 301, 401, 403, 404, 503.', pts: 0.75, corr: '<p>301 déplacé définitivement · 401 authentification requise · 403 accès interdit (même authentifié) · 404 ressource introuvable · 503 service indisponible.</p>' },
          { q: 'b) PC + téléphone : POP3 ou IMAP ? Pourquoi ?', pts: 0.5, corr: '<p>IMAP : les mails restent sur le serveur, l\'état (lu, dossiers) est synchronisé ; POP3 télécharge sur un seul appareil.</p>' },
          { q: 'c) Trajet d\'un mail vers un correspondant d\'un autre domaine (protocoles, ports, rôle du DNS).', pts: 0.75, corr: '<p>Client → SMTP 587 (authentifié, TLS) → serveur du Ministère → requête DNS MX du domaine destinataire → SMTP 25 vers le MX → stockage → lecture en IMAP (993) ou POP3 (995).</p>' }
        ]
      }
    ],

    phrases: [
      'OSI de 1 à 7 : Physique, Liaison, Réseau, Transport, Session, Présentation, Application ; PDU : bit, trame, paquet, segment.',
      'TCP : connexion en 3 temps (SYN, SYN-ACK, ACK), fiable, en-tête de 20 octets ; UDP : sans connexion, 8 octets.',
      'ACK = séquence reçue + octets reçus ; MSS = 1 460 ; débit max = fenêtre ÷ RTT.',
      'DNS 53 (UDP et TCP), A / AAAA / CNAME / MX / PTR / NS / SOA ; MX : la plus petite priorité d\'abord.',
      'DHCP = DORA en UDP 67/68 ; un autre sous-réseau exige ip helper-address ; échec = 169.254.x.x.'
    ]
  });
})();
