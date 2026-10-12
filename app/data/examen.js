/* Sujet blanc de la séance 9 (plan de révision) : étude de cas Agadez, corrigé et barème officiels. */
(function () {
  'use strict';
  const { table, code } = App.md;

  App.content.extras.examBlanc = {
    title: 'Sujet blanc mixte — Agadez',
    sub: 'Épreuves 1 et 2 · 2 h · Partie I (réseaux et télécoms) 24 points → note E2 ; Partie II (systèmes) 16 points → note E1.',
    minutes: 120,
    context: `<p><b>Contexte.</b> Le Ministère ouvre une direction régionale à <b>Agadez</b> (35 agents, un bureau du Trésor, un Wi-Fi visiteurs). Elle doit être reliée au siège de Niamey (réseau 10.20.0.0/22 des séances précédentes ; serveur DHCP/DNS 10.20.0.10) par un lien satellite <b>VSAT de 4 Mbit/s</b>, en attendant un faisceau hertzien. Tu es l'administrateur systèmes et réseaux chargé du projet.</p>
<p class="small muted">Gestion du temps conseillée : Partie I : 55 min · Partie II : 35 min. Lis tout le sujet en 3 minutes, puis traite d'abord ce que tu maîtrises.</p>`,
    sections: [
      {
        id: 'I', title: 'PARTIE I — Réseaux et télécommunications', max: 24, note: 'Note E2 = Partie I × 20 / 24',
        items: [
          { q: '<b>Q1 a.</b> Le site reçoit 172.16.40.0/24. Besoins (passerelle comprise) : VLAN Agents 90 · VLAN Trésor 40 · VLAN Wi-Fi invités 20 · VLAN Serveurs 10 · liaison WAN vers Niamey (2). Vérifie par le calcul que les besoins tiennent dans le bloc.', pts: 1, fields: [{ label: 'Total d\'adresses nécessaires', kind: 'num', a: 244 }], corr: '<p>90 → 92 → /25 (128) · 40 → 42 → /26 (64) · 20 → 22 → /27 (32) · 10 → 12 → /28 (16) · WAN → /30 (4). Total 128 + 64 + 32 + 16 + 4 = <b>244 ≤ 256</b> ✓.</p>' },
          { q: '<b>Q1 b.</b> Plan VLSM complet (réseau/préfixe). Le WAN prend le premier /30 libre ; R-AGADEZ a la 2<sup>e</sup> adresse du /30, R-NIAMEY la 1<sup>re</sup>.', pts: 4, fields: [{ label: 'VLAN 10 Agents', kind: 'cidr', a: '172.16.40.0/25' }, { label: 'VLAN 20 Trésor', kind: 'cidr', a: '172.16.40.128/26' }, { label: 'VLAN 30 Invités', kind: 'cidr', a: '172.16.40.192/27' }, { label: 'VLAN 40 Serveurs', kind: 'cidr', a: '172.16.40.224/28' }, { label: 'WAN Agadez–Niamey', kind: 'cidr', a: '172.16.40.240/30' }], corr: table(['Réseau', 'Préfixe / masque', 'Adresse', 'Plage', 'Broadcast', 'Passerelle'], [['VLAN 10 Agents', '/25 · 255.255.255.128', '172.16.40.0', '.1 → .126', '172.16.40.127', '172.16.40.1'], ['VLAN 20 Trésor', '/26 · 255.255.255.192', '172.16.40.128', '.129 → .190', '172.16.40.191', '172.16.40.129'], ['VLAN 30 Invités', '/27 · 255.255.255.224', '172.16.40.192', '.193 → .222', '172.16.40.223', '172.16.40.193'], ['VLAN 40 Serveurs', '/28 · 255.255.255.240', '172.16.40.224', '.225 → .238', '172.16.40.239', '172.16.40.225'], ['WAN Agadez–Niamey', '/30 · 255.255.255.252', '172.16.40.240', 'Niamey .241 · Agadez .242', '172.16.40.243', '—']]) + '<p class="small">Barème : 0,8 par ligne juste.</p>' },
          { q: '<b>Q1 c.</b> Quelles adresses restent libres ?', pts: 1, corr: '<p>172.16.40.244 → .255 (12 adresses : 172.16.40.244/30 + 172.16.40.248/29).</p>' },
          { q: '<b>Q2 a.</b> 4 VLAN sur le switch d\'Agadez (10 Agents, 20 Trésor, 30 Invités, 40 Serveurs), relié à R-AGADEZ par un seul lien. Configuration du port du switch vers le routeur et de la sous-interface du VLAN 10.', pts: 2, corr: code(`! Switch
interface g0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,40
 switchport trunk native vlan 999
 switchport nonegotiate
! R-AGADEZ
interface g0/0.10
 encapsulation dot1Q 10
 ip address 172.16.40.1 255.255.255.128`) },
          { q: '<b>Q2 b.</b> Route statique sur R-NIAMEY pour joindre tout Agadez, et route nécessaire sur R-AGADEZ.', pts: 1, fields: [{ label: 'Sur R-NIAMEY', kind: 'code', ci: true, wide: true, a: ['ip route 172.16.40.0 255.255.255.0 172.16.40.242'] }, { label: 'Sur R-AGADEZ', kind: 'code', ci: true, wide: true, a: ['ip route 0.0.0.0 0.0.0.0 172.16.40.241'] }], corr: code(`! R-AGADEZ
ip route 0.0.0.0 0.0.0.0 172.16.40.241
! R-NIAMEY
ip route 172.16.40.0 255.255.255.0 172.16.40.242`) },
          { q: '<b>Q2 c.</b> Pourquoi une seule route suffit-elle sur R-NIAMEY ?', pts: 1, corr: '<p>Tous les sous-réseaux d\'Agadez sont contenus dans 172.16.40.0/24 : une route résumée suffit. (Le /30 WAN est directement connecté sur R-NIAMEY ; la route /24 le couvre aussi, mais la route connectée /30, plus précise, l\'emporte.)</p>' },
          { q: '<b>Q3 a.</b> Les postes du VLAN Agents doivent obtenir leur adresse auprès du serveur DHCP de Niamey. Que faut-il configurer, et où ? Que se passe-t-il sinon ?', pts: 1.5, corr: '<p>Un <b>relais DHCP</b> sur R-AGADEZ, sous-interface du VLAN 10 : <code>ip helper-address 10.20.0.10</code>, et un pool 172.16.40.0/25 sur le serveur (passerelle 172.16.40.1). Sans relais, le Discover (broadcast) n\'est pas routé : les postes prennent une adresse APIPA 169.254.x.x.</p>' },
          { q: '<b>Q3 b.</b> Décris les 4 messages DHCP (nom, émetteur, broadcast ou non).', pts: 1, corr: '<p>Discover (client, broadcast) → Offer (serveur) → Request (client, broadcast) → Ack (serveur) ; UDP 67/68.</p>' },
          { q: '<b>Q3 c.</b> Un agent ouvre https://paie.finances.exemple.ne. Cite dans l\'ordre les protocoles utilisés (ports et transport) jusqu\'à l\'affichage.', pts: 1.5, corr: '<p>DNS (UDP 53) pour obtenir l\'IP → ARP pour la MAC de la passerelle → TCP 443 : SYN, SYN-ACK, ACK → TLS (vérification du certificat, échange de clés) → HTTP (GET) chiffré → réponse 200 OK.</p>' },
          { q: '<b>Q4 a.</b> Le lien VSAT passe par Internet. Quelle solution pour protéger le trafic Agadez–Niamey ? Protocole, mode, et pourquoi ESP plutôt qu\'AH.', pts: 2, corr: '<p>VPN <b>IPsec site à site</b>, <b>ESP en mode tunnel</b> (AES-256, SHA-256, IKEv2). ESP chiffre (AH ne fait qu\'authentifier) et traverse le NAT avec NAT-T (UDP 4500) ; ouvrir UDP 500, UDP 4500 et ESP (protocole 50).</p>' },
          { q: '<b>Q4 b.</b> ACL étendue nommée INVITES, en entrée de la sous-interface du VLAN 30, qui : laisse les invités obtenir une adresse DHCP auprès du routeur ; leur interdit l\'accès aux réseaux internes (10.0.0.0/8 et 172.16.0.0/12) ; autorise le reste (Internet).', pts: 2, corr: code(`ip access-list extended INVITES
 permit udp any any eq 67
 deny ip 172.16.40.192 0.0.0.31 10.0.0.0 0.255.255.255
 deny ip 172.16.40.192 0.0.0.31 172.16.0.0 0.15.255.255
 permit ip 172.16.40.192 0.0.0.31 any
interface g0/0.30
 ip access-group INVITES in`) },
          { q: '<b>Q4 c.</b> Pourquoi la ligne DHCP doit-elle utiliser « any » comme source ?', pts: 1, corr: '<p>Un client qui demande une adresse n\'en a pas encore : son Discover part avec l\'adresse source <b>0.0.0.0</b>, qui n\'appartient pas à 172.16.40.192/27 ; sans cette ligne, il serait bloqué par le deny implicite. Les invités utiliseront un DNS public, autorisé par la dernière ligne.</p>' },
          { q: '<b>Q5 a.</b> Le VSAT a un temps aller-retour de 600 ms. Débit maximal d\'une connexion TCP avec une fenêtre de 64 Ko (65 535 octets), en kbit/s ?', pts: 1.5, fields: [{ kind: 'num', a: 874, rel: 0.02, show: '≈ 874 kbit/s' }], corr: '<p>65 535 × 8 ÷ 0,6 ≈ <b>874 kbit/s</b>, quel que soit le débit du lien (window scaling nécessaire).</p>' },
          { q: '<b>Q5 b.</b> 10 appels VoIP simultanés en G.729 (paquets de 20 ms). Bande passante IP nécessaire ? Le débit suffit-il ? La qualité sera-t-elle bonne ?', pts: 2, fields: [{ label: 'Bande passante (kbit/s)', kind: 'num', a: 240 }], corr: '<p>G.729 : 20 octets de voix + 40 d\'en-têtes = 60 octets × 8 × 50 = 24 kbit/s par appel → 10 appels = <b>240 kbit/s</b> : le débit suffit (6 % des 4 Mbit/s). Mais le délai dans un sens (≈ 300 ms) dépasse les 150 ms recommandés : conversation hachée → qualité médiocre ; il faudra le faisceau hertzien ou la fibre.</p>' },
          { q: '<b>Q5 c.</b> Futur faisceau hertzien : puissance émise 27 dBm, antennes 30 dBi de chaque côté, pertes câbles 2 dB de chaque côté, propagation 140 dB, sensibilité −75 dBm. Puissance reçue et marge ? Conclusion ?', pts: 1.5, fields: [{ label: 'P reçue (dBm)', kind: 'num', a: -57 }, { label: 'Marge (dB)', kind: 'num', a: 18 }], corr: '<p>P<sub>reçue</sub> = 27 + 30 + 30 − 2 − 2 − 140 = <b>−57 dBm</b>. Marge = −57 − (−75) = <b>18 dB</b> ≥ 10 dB → liaison viable, avec une bonne réserve (vent de sable, pluie).</p>' }
        ]
      },
      {
        id: 'II', title: 'PARTIE II — Administration des systèmes', max: 16, note: 'Note E1 = Partie II × 20 / 16 — rappel : note ≤ 5 éliminatoire',
        items: [
          { q: '<b>Q6 a.</b> Serveur de fichiers Linux d\'Agadez : commandes pour créer le groupe tresor ; créer l\'utilisateur hamidou (dossier personnel, bash) et l\'ajouter au groupe ; créer /srv/tresor accessible aux seuls membres du groupe, avec héritage du groupe pour les nouveaux fichiers.', pts: 2, corr: code(`groupadd tresor
useradd -m -s /bin/bash hamidou
usermod -aG tresor hamidou ; passwd hamidou
mkdir -p /srv/tresor
chown root:tresor /srv/tresor
chmod 2770 /srv/tresor          # (3770 avec sticky : accepté)`) },
          { q: '<b>Q6 b.</b> Que signifie -rwsr-xr-x ? Donne sa valeur octale.', pts: 1, fields: [{ label: 'Octal', kind: 'text', a: '4755' }], corr: '<p>SUID : le programme s\'exécute avec les droits de son propriétaire ; propriétaire rwx, groupe et autres r-x → <b>4755</b>.</p>' },
          { q: '<b>Q6 c.</b> Ligne de crontab qui lance /opt/sauvegarde.sh /srv/tresor à 21 h du lundi au vendredi (les 5 champs).', pts: 0.5, fields: [{ kind: 'cron', a: '0 21 * * 1-5', wide: true, ph: 'min heure jm mois js' }], corr: '<p><code>0 21 * * 1-5 /opt/sauvegarde.sh /srv/tresor</code></p>' },
          { q: '<b>Q6 d.</b> Script bash qui écrit une alerte datée dans /var/log/disque.log si l\'occupation de / dépasse 90 %. (Indice : <code>df / --output=pcent | tail -1 | tr -d \' %\'</code> renvoie le pourcentage.)', pts: 1.5, corr: code(`#!/bin/bash
SEUIL=90
USAGE=$(df / --output=pcent | tail -1 | tr -d ' %')
if [ "$USAGE" -gt "$SEUIL" ]; then
  echo "$(date '+%F %T') ALERTE : / occupée à \${USAGE} %" >> /var/log/disque.log
fi`) },
          { q: '<b>Q7 a.</b> Quel type de contrôleur de domaine installer à Agadez ? Justifie. Que créer dans « Sites et services AD » ?', pts: 2, corr: '<p>Un <b>RODC</b> (avec DNS) : site éloigné, lien satellite lent et parfois coupé → authentification locale ; locaux moins sécurisés → base en lecture seule, mots de passe non stockés par défaut. Créer le site AD « Agadez », le sous-réseau 172.16.40.0/24 associé et un lien de site vers Niamey (réplication planifiée).</p>' },
          { q: '<b>Q7 b.</b> Une GPO bloquant les clés USB doit s\'appliquer uniquement aux postes d\'Agadez. Où la lier ? Dans quelle partie de la GPO ?', pts: 1, corr: '<p>Liée à l\'<b>OU Agadez</b> (sous-OU des ordinateurs) ; partie <b>Configuration ordinateur</b> (le blocage concerne la machine, quel que soit l\'utilisateur).</p>' },
          { q: '<b>Q7 c.</b> Applique AGDLP pour donner aux agents du Trésor d\'Agadez le droit de modifier \\\\SRV-AGZ\\Tresor.', pts: 1, corr: '<p>Comptes → <b>GG_AGZ_Tresor</b> (global) → <b>DL_AGZ_Tresor_Modif</b> (domaine local) → NTFS Modification sur le dossier ; partage ouvert aux utilisateurs authentifiés.</p>' },
          { q: '<b>Q7 d.</b> Hamidou est dans G1 (NTFS Modification) et G2 (NTFS Lecture) ; le partage donne « Tout le monde : Lecture ». Droits effectifs par le réseau ?', pts: 1, fields: [{ kind: 'select', opts: ['Contrôle total', 'Modification', 'Lecture', 'Aucun'], a: 2 }], corr: '<p>NTFS cumulés = Modification ; partage = Lecture ; par le réseau → le plus restrictif = <b>Lecture</b>.</p>' },
          { q: '<b>Q8 a.</b> 4 disques de 2 To : compare RAID 5 et RAID 10 (capacité, pannes, performances). Lequel pour un serveur de fichiers peu sollicité ?', pts: 1.5, corr: '<p>RAID 5 : (4 − 1) × 2 = <b>6 To</b>, 1 panne, écritures plus lentes (parité). RAID 10 : 4/2 × 2 = <b>4 To</b>, 1 panne garantie (2 si elles touchent des miroirs différents), meilleures performances, reconstruction plus rapide. Serveur peu sollicité : RAID 5 acceptable (plus de capacité) si les sauvegardes sont solides ; RAID 10 se justifie aussi. Toute réponse argumentée est acceptée.</p>' },
          { q: '<b>Q8 b.</b> Complète le samedi, différentielles du dimanche au vendredi à 20 h. Panne mercredi à 15 h : que restaurer ? Combien d\'heures perdues ?', pts: 1.5, fields: [{ label: 'Heures perdues', kind: 'num', a: 19 }], corr: '<p>Complète du samedi + différentielle de <b>mardi 20 h</b>. Perte : de mardi 20 h à mercredi 15 h = <b>19 h</b> (de travail effectif : la journée de mercredi matin).</p>' },
          { q: '<b>Q8 c.</b> Définis RPO et RTO ; valeurs réalistes pour le serveur de fichiers d\'Agadez.', pts: 1, corr: '<p>RPO = perte de données maximale admissible (ex. 24 h) ; RTO = durée maximale d\'interruption (ex. 4 à 8 h pour un serveur de fichiers régional).</p>' },
          { q: '<b>Q8 d.</b> Coupures d\'électricité fréquentes : deux mesures pour protéger équipements et données.', pts: 1, corr: '<p>Onduleurs (UPS) avec arrêt automatique propre des serveurs ; groupe électrogène ou panneaux solaires avec batteries ; parafoudres ; climatisation secourue ; sauvegardes hors site.</p>' },
          { q: '<b>Q8 e.</b> On propose de virtualiser les 3 serveurs d\'Agadez sur un seul hôte. Avantage et risque principal ?', pts: 1, corr: '<p>Avantage : moins de matériel, d\'énergie et de maintenance, déploiement et restauration rapides (une VM se restaure en entier). Risque : l\'hôte unique est un <b>point de défaillance unique (SPOF)</b> → sauvegarde des VM, pièces de rechange ou second hôte.</p>' }
        ]
      }
    ]
  };
})();
