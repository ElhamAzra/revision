/* Séance 8 — Windows Server, Active Directory, GPO, partages NTFS, virtualisation, stockage RAID, sauvegardes. */
(function () {
  'use strict';
  const { key, trap, tip, reflex, ex, fix, mnemo, why, f, frac, table, steps, ul, w, stepper, reveal, code } = App.md;

  const kerbSeq = JSON.stringify({
    title: 'Ouverture de session Kerberos dans un domaine',
    actors: ['Poste', 'DNS', 'DC (KDC)', 'Serveur de fichiers'],
    msgs: [
      { from: 0, to: 1, label: 'SRV _ldap._tcp.dc._msdcs ?', note: 'Le poste cherche un contrôleur de domaine grâce aux enregistrements SRV du DNS. Si le poste utilise le DNS de l\'opérateur : « domaine introuvable ».' },
      { from: 1, to: 0, label: 'DC = 10.20.0.11', note: 'Le DNS (intégré à AD) indique le DC du site.' },
      { from: 0, to: 2, label: 'Demande de TGT (port 88)', note: 'L\'utilisateur s\'authentifie auprès du KDC du contrôleur de domaine. Les horloges doivent être synchronisées à 5 min près.' },
      { from: 2, to: 0, label: 'TGT', note: 'Le DC délivre un ticket d\'octroi de tickets (TGT).' },
      { from: 0, to: 2, label: 'TGT + « accès au serveur de fichiers »', note: 'Pour accéder à une ressource, le poste présente son TGT.' },
      { from: 2, to: 0, label: 'Ticket de service', note: 'Le KDC renvoie un ticket de service pour ce serveur.' },
      { from: 0, to: 3, label: 'Ticket de service', note: 'Le serveur vérifie le ticket : le mot de passe ne circule jamais sur le réseau.' }
    ]
  });

  App.registerModule({
    id: 's8', order: 8, label: 'Séance 8', short: 'Windows & stockage',
    title: 'Windows Server, Active Directory, stockage, sauvegardes',
    subtitle: 'Épreuve 1 — AD, FSMO, AGDLP, GPO (LSDOU), NTFS, RAID, 3-2-1, RPO/RTO, virtualisation',
    icon: '🪟', color: '#3b82f6', day: '2026-10-17', epreuve: 'Épreuve 1',
    intro: 'Les questions les plus « rentables » de l\'Épreuve 1 : la structure d\'Active Directory, les 5 rôles FSMO, la méthode AGDLP, l\'ordre des GPO, le calcul des droits effectifs (partage + NTFS), les niveaux de RAID et les stratégies de sauvegarde.',

    pretest: [
      { type: 'qcm', q: 'Base de données d\'Active Directory :', choices: ['NTDS.dit', 'SAM', 'SYSVOL', 'registry.dat'], a: 0, expl: 'Sur chaque contrôleur de domaine.' },
      { type: 'qcm', q: 'Ordre d\'application des GPO :', choices: ['Locale → Site → Domaine → OU', 'OU → Domaine → Site → Locale', 'Domaine → Site → OU', 'Site → Locale → Domaine → OU'], a: 0, expl: 'LSDOU.' },
      { type: 'qcm', q: 'Restaurer avec des différentielles :', choices: ['complète + dernière différentielle', 'toutes les différentielles', 'dernière différentielle seule', 'complète seule'], a: 0, expl: 'Une différentielle contient tout depuis la dernière complète.' }
    ],

    lessons: [
      {
        title: 'Groupe de travail, domaine, Windows Server', min: 6,
        essentiel: ul([
          '<b>Groupe de travail</b> : chaque PC gère ses comptes (ingérable au-delà d\'une dizaine de postes). <b>Domaine</b> : annuaire central (Active Directory), même identifiant partout, règles appliquées à tous (GPO).',
          'Rôles : AD DS, DNS, DHCP, fichiers, IIS, WSUS, Hyper-V, impression, RDS. Éditions : Standard (2 VM) / Datacenter (VM illimitées). Installation <b>Core</b> (sans interface, plus sûre et légère).',
          'Outils : Gestionnaire de serveur, consoles MMC, PowerShell, Observateur d\'événements.'
        ]),
        html: `
${table(['Objet de l\'annuaire', 'Rôle'], [['Utilisateur', 'Un compte (agent, compte de service)'], ['Ordinateur', 'Un poste ou un serveur joint au domaine'], ['Groupe', 'Ensemble de comptes, pour donner des droits (ou envoyer des mails)'], ['Unité d\'organisation (OU)', 'Dossier qui range les objets, pour appliquer des GPO et déléguer l\'administration'], ['GPO', 'Ensemble de règles appliquées aux utilisateurs et ordinateurs']])}
${key('<b>OU ou groupe ?</b> (question piège classique) — OU = pour <b>organiser</b>, appliquer des <b>GPO</b> et <b>déléguer</b> ; on ne donne pas de droits sur un dossier à une OU. Groupe = pour donner des <b>permissions</b>. Un compte est dans <b>une seule OU</b> mais dans <b>plusieurs groupes</b>.')}
${ul(['Le serveur qui héberge l\'annuaire est un <b>contrôleur de domaine (DC)</b>.', 'Vocabulaire de la continuité : <b>sauvegarde</b> = copie pour restaurer après une perte ; <b>redondance</b> (RAID, cluster) = continuer pendant une panne. Les deux sont nécessaires.'])}
`,
        check: [
          { type: 'qcm', q: 'Pour donner un droit de modification sur un dossier partagé, on utilise :', choices: ['un groupe', 'une OU', 'une GPO', 'un site'], a: 0, expl: 'Les droits se donnent à des groupes ; les GPO se lient aux OU.' },
          { type: 'qcm', q: 'Installation Windows Server sans interface graphique :', choices: ['Core', 'Datacenter', 'Standard', 'Nano Desktop'], a: 0, expl: 'Plus sûre, plus légère.' }
        ]
      },
      {
        title: 'Active Directory : domaine, forêt, DC, Kerberos', min: 9,
        essentiel: ul([
          '<b>Forêt ⊃ arbre ⊃ domaine ⊃ OU</b>. La forêt partage le schéma et le catalogue global ; c\'est la <b>frontière de sécurité</b>.',
          '<b>DC</b> = base <b>NTDS.dit</b> + dossier <b>SYSVOL</b> (scripts, GPO), réplication multi-maître ; <b>toujours au moins 2 DC</b>. <b>RODC</b> pour un site distant peu sûr.',
          'AD dépend du <b>DNS</b> (enregistrements SRV). <b>Kerberos</b> (port 88) : tickets, horloge à <b>5 min</b> près. LDAP 389 / LDAPS 636 ; catalogue global 3268.'
        ]),
        html: `
${ul(['<b>Domaine</b> : unité d\'administration et de réplication (ex. ad.finances.exemple.ne).', '<b>Arbre</b> : domaines aux noms contigus (dgi.ad.finances… sous ad.finances…).', '<b>Forêt</b> : ensemble d\'arbres partageant le même schéma et le même catalogue global.', '<b>RODC</b> (DC en lecture seule) : ne stocke pas les mots de passe par défaut, ne peut rien modifier → agences régionales.', '<b>Sites AD</b> : correspondent aux sites physiques (sous-réseaux IP) ; ils optimisent la réplication et l\'authentification (le poste s\'adresse au DC de son site).', '<b>Catalogue global (GC)</b> : copie partielle de tous les objets de la forêt (recherche, ouverture de session), port 3268.', '<b>Relations d\'approbation (trusts)</b> : accès aux ressources d\'un autre domaine.'])}
${w('seq', { seq: kerbSeq })}
${ex('Postes de Tahoua : « domaine introuvable » → cause la plus probable : leur <b>DNS ne pointe pas vers les DC</b> (DNS de l\'opérateur ou adresse erronée) : ils ne trouvent pas les enregistrements SRV. Corriger le DNS (via DHCP, option 6). Autres causes : lien WAN, pare-feu, heure.', 'Diagnostic classique')}
${ex('Ministère, 800 agents, sites Niamey (salle sécurisée), Zinder et Tahoua (sans informaticien, locaux peu sûrs) : <b>un seul domaine dans une seule forêt</b> (nom : ad.finances.exemple.ne, éviter « .local ») · <b>2 DC complets à Niamey</b> (DNS + GC) · <b>1 RODC à Zinder et 1 à Tahoua</b> · sites AD avec leurs sous-réseaux et liens de sites.', 'Conception (plan)')}
${trap('Kerberos refuse l\'authentification si l\'écart d\'horloge dépasse 5 minutes : l\'émulateur PDC doit se synchroniser sur un NTP externe fiable.')}
`,
        check: [
          { type: 'qcm', q: 'Port de Kerberos :', choices: ['88', '389', '445', '3268'], a: 0, noShuffle: true, expl: '88.' },
          { type: 'qcm', q: 'Pour une agence régionale aux locaux peu sécurisés :', choices: ['un RODC', 'un DC complet', 'aucun DC', 'un serveur DHCP'], a: 0, expl: 'Lecture seule, pas de mots de passe stockés par défaut.' },
          { type: 'qcm', q: 'Frontière de sécurité dans Active Directory :', choices: ['la forêt', 'le domaine', 'l\'OU', 'le site'], a: 0, expl: 'La forêt.' }
        ]
      },
      {
        title: 'Les 5 rôles FSMO', min: 5,
        essentiel: ul([
          '<b>Forêt (2)</b> : maître de <b>schéma</b> · maître d\'attribution des <b>noms de domaine</b>.',
          '<b>Domaine (3)</b> : maître <b>RID</b> · <b>émulateur PDC</b> (heure, mots de passe, verrouillages, GPO) · maître d\'<b>infrastructure</b>.',
          'Commande : <code>netdom query fsmo</code>. Jamais sur un RODC.'
        ]),
        html: `
${table(['Rôle FSMO', 'Portée', 'Rôle'], [['Maître de schéma', 'Forêt', 'Seul à modifier le schéma (structure de l\'annuaire)'], ['Maître d\'attribution des noms de domaine', 'Forêt', 'Ajout / suppression de domaines'], ['Maître RID', 'Domaine', 'Distribue les blocs d\'identifiants (SID) aux DC'], ['Émulateur PDC', 'Domaine', 'Heure de référence, changements de mots de passe, verrouillages, édition des GPO'], ['Maître d\'infrastructure', 'Domaine', 'Références entre domaines']])}
${mnemo('« <b>2 de forêt, 3 de domaine = 5 rôles</b> ». Forêt : <b>S</b>chéma + <b>N</b>oms. Domaine : <b>R</b>ID, <b>P</b>DC, <b>I</b>nfrastructure → « SN – RPI ».')}
${reflex('Où placer les FSMO ? Tous sur les DC de Niamey (souvent le premier, l\'autre en secours), jamais sur un RODC.')}
`,
        check: [
          { type: 'qcm', q: 'Rôle FSMO de référence pour l\'heure du domaine :', choices: ['RID', 'Schéma', 'Émulateur PDC', 'Infrastructure'], a: 2, noShuffle: true, expl: 'Émulateur PDC.' },
          { type: 'match', q: 'Associe chaque rôle FSMO à sa portée.', pairs: [['Maître de schéma', 'Forêt'], ['Noms de domaine', 'Forêt'], ['RID', 'Domaine'], ['Émulateur PDC', 'Domaine'], ['Infrastructure', 'Domaine']], expl: '2 de forêt, 3 de domaine.' }
        ]
      },
      {
        title: 'Groupes et méthode AGDLP', min: 7,
        essentiel: ul([
          'Types : <b>sécurité</b> (droits) ou <b>distribution</b> (listes de mail). Étendues : <b>globale</b> (GG_ : comptes du domaine, par fonction) · <b>domaine local</b> (DL_ : porte les permissions sur une ressource) · universelle.',
          '<b>AGDLP</b> : <b>A</b>ccounts → groupes <b>G</b>lobaux → groupes <b>D</b>omaine <b>L</b>ocal → <b>P</b>ermissions.',
          'Avantage : à chaque arrivée/départ, on ne touche qu\'à un groupe, jamais aux droits des dossiers.'
        ]),
        html: `
${table(['Étendue', 'Contient', 'Sert à'], [['Globale (GG_)', 'Comptes du même domaine', 'Regrouper les personnes par fonction (« Agents du Budget »)'], ['Domaine local (DL_)', 'Comptes et groupes de toute la forêt', 'Porter les permissions sur une ressource (« Budget en écriture »)'], ['Universelle', 'Comptes et groupes de toute la forêt', 'Regrouper à travers plusieurs domaines']])}
${ex('Moussa → <b>GG_DGB_Agents</b> → <b>DL_Budget_RW</b> → NTFS « Modification » sur D:\\Budget. Les inspecteurs de l\'IGF : GG_IGF_Inspecteurs → DL_Budget_Lecture → NTFS « Lecture et exécution ». Partage : Utilisateurs authentifiés = Modification ; le filtrage se fait en NTFS.', 'AGDLP appliqué (plan)')}
${why('Pourquoi jamais de droits directement aux comptes ? Ingérable et source d\'erreurs : à chaque mutation il faudrait modifier de nombreux dossiers, et on oublie de retirer des droits (accès résiduels). Avec les groupes : une seule opération, traçable. (Variante multi-domaines : AGUDLP.)')}
`,
        check: [
          { type: 'order', q: 'Remets AGDLP dans l\'ordre :', items: ['Comptes', 'Groupes globaux', 'Groupes domaine local', 'Permissions'], expl: 'A-G-DL-P.' },
          { type: 'qcm', q: 'Quel groupe reçoit la permission NTFS sur la ressource ?', choices: ['le groupe domaine local', 'le groupe global', 'l\'OU', 'le compte'], a: 0, expl: 'DL_ = par ressource et niveau d\'accès.' }
        ]
      },
      {
        title: 'Les stratégies de groupe (GPO)', min: 8,
        essentiel: ul([
          'Deux parties : <b>Configuration ordinateur</b> (au démarrage) et <b>Configuration utilisateur</b> (à l\'ouverture de session). Liée à un <b>site, un domaine ou une OU</b> (pas à un groupe).',
          'Ordre <b>LSDOU</b> : Locale → Site → Domaine → OU parente → OU enfant ; en cas de conflit, <b>la dernière appliquée gagne</b>.',
          '<b>Bloquer l\'héritage</b> ignore les niveaux supérieurs… sauf les GPO <b>« Appliqué » (Enforced)</b>, qui gagnent toujours. <code>gpupdate /force</code> · <code>gpresult /r</code>.'
        ]),
        html: `
${ex('GPO-Site (Niamey) → image A ; GPO-Domaine → image B ; GPO-DGI (OU DGI) → image C. Un agent de la DGI voit <b>C</b> (L → S (A) → D (B) → OU (C), la dernière gagne). Si GPO-Domaine est <b>Enforced</b> → <b>B</b>. Si l\'OU DGI <b>bloque l\'héritage</b> (sans Enforced) → <b>C</b> ; avec Enforced, B passe à travers le blocage.', 'Fond d\'écran (plan)')}
${ul(['Filtrage de <b>sécurité</b> (appliquer à certains groupes) et filtrage <b>WMI</b> (selon le système).', 'Rafraîchissement automatique toutes les <b>90 min (± 30)</b>.', 'Exemples : politique de mots de passe (au niveau du <b>domaine</b>, Default Domain Policy ; <b>FGPP</b> affinée pour les administrateurs), lecteurs réseau, <b>blocage des clés USB</b> (configuration ordinateur), déploiement de logiciels, écran de veille verrouillé, pare-feu, redirection des dossiers, WSUS.'])}
${code(`gpupdate /force                 # appliquer maintenant
gpresult /r                     # GPO réellement appliquées (ou /h rapport.html)
dcdiag                          # santé d'un DC
repadmin /replsummary           # état de la réplication
Get-ADUser -Filter * -SearchBase "OU=DGB,DC=ad,DC=finances,DC=exemple,DC=ne"
New-ADUser -Name "Moussa Ali" -SamAccountName mali
Add-ADGroupMember GG_DGB_Agents -Members mali
Install-WindowsFeature AD-Domain-Services
Get-WinEvent -LogName System -MaxEvents 20`)}
${trap('Les droits se donnent à des <b>groupes</b>, les GPO se lient à des <b>OU</b>. Et LSDOU : c\'est l\'OU (appliquée en dernier) qui gagne, sauf Enforced.')}
`,
        check: [
          { type: 'qcm', q: 'Ordre d\'application des GPO :', choices: ['OU-D-S-L', 'L-S-D-OU', 'D-S-L-OU', 'S-L-D-OU'], a: 1, noShuffle: true, expl: 'LSDOU.' },
          { type: 'qcm', q: 'Forcer l\'application des GPO :', choices: ['gpresult /r', 'gpupdate /force', 'dcdiag', 'netdom'], a: 1, noShuffle: true, expl: 'gpupdate /force.' },
          { type: 'qcm', q: 'GPO bloquant les clés USB : quelle partie ?', choices: ['Configuration ordinateur', 'Configuration utilisateur', 'Préférences réseau', 'Filtrage WMI'], a: 0, expl: 'Le blocage concerne la machine, quel que soit l\'utilisateur.' }
        ]
      },
      {
        title: 'Partages et droits NTFS', min: 7,
        essentiel: ul([
          'NTFS : Lecture · Lecture et exécution · Écriture · <b>Modification</b> (droit normal d\'un utilisateur) · Contrôle total (administrateurs).',
          'Plusieurs groupes → droits <b>cumulés</b> ; un <b>refus explicite (Deny) l\'emporte</b>.',
          'Par le <b>réseau</b> : partage ET NTFS → le <b>plus restrictif</b>. En <b>local</b> : NTFS seul.'
        ]),
        html: `
${table(['Droit NTFS', 'Permet'], [['Lecture', 'Ouvrir, lire'], ['Lecture et exécution', '+ lancer des programmes'], ['Écriture', 'Créer, écrire'], ['Modification', 'Lire, écrire, supprimer (le droit normal d\'un utilisateur)'], ['Contrôle total', '+ changer les permissions, prendre possession']])}
${steps(['Les droits d\'un utilisateur dans plusieurs groupes se <b>cumulent</b> (le plus permissif).', 'Un <b>refus explicite</b> l\'emporte sur une autorisation.', 'Accès <b>réseau</b> : on calcule les droits de partage et NTFS, puis on garde le <b>plus restrictif</b>.', 'Accès <b>local</b> (assis devant le serveur) : seuls les droits NTFS comptent.'])}
${ex('Moussa : G1 (NTFS Modification) + G2 (NTFS Lecture) ; partage « Tout le monde : Lecture ». NTFS cumulés = Modification ; partage = Lecture → par le réseau : <b>Lecture</b> ; en local : <b>Modification</b>.<br>Awa : G1 (Modification) + G3 (Refuser l\'écriture), partage Contrôle total → elle peut <b>lire</b> mais <b>pas modifier</b> (le refus l\'emporte).', 'Droits effectifs (plan)')}
${ul(['Partages administratifs cachés : <b>C$</b>, <b>ADMIN$</b> ; un nom de partage terminé par <b>$</b> est masqué.', '<b>DFS</b> : espace de noms unique pour plusieurs serveurs.', 'Bonne pratique : partage « Tout le monde : Contrôle total » (ou Utilisateurs authentifiés : Modification) et gestion fine en NTFS.'])}
`,
        check: [
          { type: 'qcm', q: 'Partage « Lecture » + NTFS « Contrôle total », accès réseau :', choices: ['Contrôle total', 'Modification', 'Lecture', 'Aucun'], a: 2, noShuffle: true, expl: 'Le plus restrictif.' },
          { type: 'tf', q: 'Un refus explicite d\'écriture est annulé par une autorisation Modification d\'un autre groupe.', a: false, expl: 'Le refus explicite l\'emporte toujours.' }
        ]
      },
      {
        title: 'Virtualisation', min: 6,
        essentiel: ul([
          'Hyperviseur <b>type 1</b> (« bare metal », sur le matériel : ESXi, Hyper-V, Proxmox/KVM, Xen) · <b>type 2</b> (sur un OS : VirtualBox, VMware Workstation).',
          'VM = OS complet (isolation forte, lourde) ; <b>conteneur</b> (Docker, Kubernetes) = partage le noyau de l\'hôte (léger, isolation plus faible).',
          'Avantages : consolidation, déploiement rapide, snapshots, migration à chaud, <b>HA</b>. <b>Snapshot ≠ sauvegarde</b>.'
        ]),
        html: `
${table(['', 'Type 1 (« bare metal »)', 'Type 2 (hébergé)'], [['Installation', 'Directement sur le matériel', 'Sur un OS existant'], ['Exemples', 'VMware ESXi, Hyper-V, Proxmox (KVM), Xen', 'VirtualBox, VMware Workstation'], ['Usage', 'Production, datacenter', 'Tests, poste de travail']])}
${ul(['Avantages : moins de serveurs, d\'énergie, de place (utile avec les coupures d\'électricité), modèles, <b>migration à chaud</b> (vMotion / Live Migration), <b>haute disponibilité</b> (les VM d\'un hôte en panne redémarrent sur un autre).', 'Un cluster d\'hôtes exige un <b>stockage partagé</b> (SAN, ou distribué : vSAN, Ceph). Dimensionner pour que N−1 hôtes portent toute la charge.', 'Gestion centrale : vCenter (VMware), SCVMM / Windows Admin Center (Hyper-V).'])}
${trap('Un <b>snapshot n\'est pas une sauvegarde</b> : il dépend du disque d\'origine (même panne, même rançongiciel) et, conservé longtemps, il grossit, sature le stockage et dégrade les performances.')}
${ex('3 serveurs d\'Agadez sur un seul hôte : avantage = moins de matériel, d\'énergie, restauration rapide ; risque = <b>point de défaillance unique (SPOF)</b> → sauvegarder les VM, prévoir pièces de rechange ou un second hôte.')}
`,
        check: [
          { type: 'qcm', q: 'Hyperviseur de type 1 :', choices: ['VirtualBox', 'VMware Workstation', 'VMware ESXi', 'Docker'], a: 2, noShuffle: true, expl: 'ESXi (comme Hyper-V, Proxmox).' },
          { type: 'tf', q: 'Un snapshot de VM conservé 6 mois remplace une sauvegarde.', a: false, expl: 'Il dépend du disque d\'origine et dégrade les performances.' }
        ]
      },
      {
        title: 'Stockage et RAID', min: 8,
        essentiel: ul([
          '<b>DAS</b> (disques attachés) · <b>NAS</b> (fichiers en réseau : SMB/CIFS, NFS) · <b>SAN</b> (blocs, LUN, Fibre Channel ou <b>iSCSI</b> port 3260).',
          'RAID 0 : N, 0 panne · RAID 1 : N/2 · <b>RAID 5 : N−1, 1 panne, min 3</b> · <b>RAID 6 : N−2, 2 pannes, min 4</b> · <b>RAID 10 : N/2</b>, min 4.',
          'Écritures intensives (bases) → RAID 10. Gros volumes de fichiers → RAID 6. <b>RAID ≠ sauvegarde</b>.'
        ]),
        html: `
${table(['RAID', 'Principe', 'Min.', 'Capacité utile', 'Pannes tolérées'], [['0', 'Agrégat (striping)', '2', 'N', '0'], ['1', 'Miroir', '2', 'N/2', '1 (par miroir)'], ['5', 'Parité répartie', '3', 'N − 1', '1'], ['6', 'Double parité', '4', 'N − 2', '2'], ['10', 'Miroirs agrégés', '4', 'N/2', '1 par miroir (jusqu\'à N/2)']])}
${w('raid')}
${ex('6 disques de 4 To : RAID 0 = 24 To (0 panne) · RAID 5 = 20 To (1) · RAID 6 = 16 To (2) · RAID 10 = 12 To (1 garantie, jusqu\'à 3 si chaque panne touche un miroir différent). Serveur de fichiers → <b>RAID 6</b> (résiste à une 2<sup>e</sup> panne pendant la longue reconstruction) ; base de paie → <b>RAID 10</b> (écritures, pas de parité, reconstruction rapide).', 'Calcul (plan)')}
${ul(['<b>Disque de secours (hot spare)</b> : remplace automatiquement un disque défaillant.'])}
${trap('« Nos données sont en RAID 6, pas besoin de sauvegarde » : faux. (1) Le RAID recopie instantanément une suppression, un rançongiciel ou une corruption. (2) Il ne protège pas de la perte du serveur entier (incendie, vol, contrôleur, inondation).')}
`,
        check: [
          { type: 'qcm', q: 'Nombre minimal de disques en RAID 5 :', choices: ['2', '3', '4', '5'], a: 1, noShuffle: true, expl: '3.' },
          { type: 'input', q: '4 disques de 2 To en RAID 5 : capacité utile (To) ?', fields: [{ kind: 'num', a: 6 }], expl: '(4 − 1) × 2 = 6 To.' },
          { type: 'qcm', q: 'Protocole SAN sur Ethernet :', choices: ['iSCSI', 'NFS', 'SMB', 'FTP'], a: 0, expl: 'iSCSI, port 3260 (NFS et SMB = NAS).' }
        ]
      },
      {
        title: 'Sauvegardes et continuité d\'activité', min: 9,
        essentiel: ul([
          '<b>Incrémentielle</b> = depuis la dernière sauvegarde (rapide ; restauration = complète + <b>toutes</b> les incrémentielles). <b>Différentielle</b> = depuis la dernière <b>complète</b> (restauration = complète + <b>dernière</b> différentielle).',
          '<b>RPO</b> = perte de données maximale admissible (fixe la fréquence) · <b>RTO</b> = durée d\'interruption maximale (fixe les moyens de reprise).',
          '<b>3-2-1</b> (+1-0) : 3 copies, 2 supports, 1 hors site ; + 1 hors ligne/immuable ; 0 erreur aux tests. 99,9 % = 8,76 h d\'arrêt par an.'
        ]),
        html: `
${table(['Type', 'Sauvegarde…', 'Pour restaurer'], [['Complète', 'Tout', 'La dernière complète'], ['Incrémentielle', 'Ce qui a changé depuis la dernière sauvegarde (quelle qu\'elle soit)', 'Complète + toutes les incrémentielles qui suivent'], ['Différentielle', 'Ce qui a changé depuis la dernière complète', 'Complète + la dernière différentielle']])}
${ex('Complète le dimanche 22 h, puis chaque soir à 22 h ; panne jeudi 10 h. Incrémentielles → complète + lundi + mardi + mercredi (dans l\'ordre). Différentielles → complète + mercredi seulement. Perte : de mercredi 22 h à jeudi 10 h = <b>12 h</b> (pire cas ≈ 24 h → RPO 24 h respecté).', 'Que restaurer ? (plan)')}
${table(['Disponibilité', 'Arrêt autorisé par an'], [['99 %', '3,65 jours (87,6 h)'], ['99,9 %', '8,76 h'], ['99,99 %', '52,6 min']])}
${ul(['<b>PCA</b> (plan de continuité) : le service continue malgré l\'incident (redondance, second site actif).', '<b>PRA</b> (plan de reprise) : redémarrer après un sinistre sur un site de secours, à partir des sauvegardes ; à <b>tester</b> régulièrement.', 'RPO 1 h + RTO 4 h pour la paie : journaux de transactions toutes les 15 min à 1 h ou réplication continue, instantanés horaires ; VM répliquée sur un second site/hôte, procédure de bascule testée, sauvegardes sur disque.', 'Électricité : <b>onduleurs (UPS)</b> avec arrêt propre, groupe électrogène ou solaire + batteries, parafoudres, climatisation secourue.'])}
${ex('3-2-1 au Ministère : copie 1 = production à Niamey ; copie 2 = NAS de sauvegarde dans un autre bâtiment (autre support) ; copie 3 = réplication hors site (Zinder ou cloud souverain) + une copie hors ligne (disque déconnecté, bande en coffre) contre les rançongiciels ; tests de restauration mensuels.', 'Règle 3-2-1 appliquée')}
${trap('Différentielle = depuis la dernière <b>complète</b> ; incrémentielle = depuis la dernière <b>sauvegarde</b>. Et RPO = données perdues, RTO = temps d\'arrêt (ne pas inverser).')}
`,
        check: [
          { type: 'qcm', q: 'Le RPO mesure :', choices: ['la durée d\'arrêt', 'la perte de données maximale admissible', 'le nombre de sauvegardes', 'le coût'], a: 1, noShuffle: true, expl: 'Recovery Point Objective.' },
          { type: 'qcm', q: 'Restaurer avec des incrémentielles :', choices: ['complète + toutes les incrémentielles', 'complète + dernière incrémentielle', 'dernière incrémentielle seule', 'complète seule'], a: 0, expl: 'Chaque incrémentielle ne contient que les changements depuis la précédente.' },
          { type: 'input', q: '99,9 % de disponibilité : arrêt autorisé par an (heures) ?', fields: [{ kind: 'num', a: 8.76, tol: 0.05 }], expl: '0,1 % × 8 760 h = 8,76 h.' }
        ]
      }
    ],

    cards: [
      { front: 'Groupe de travail vs domaine ?', back: 'Comptes locaux sur chaque PC · annuaire central (AD), GPO' },
      { front: 'OU ou groupe ?', back: 'OU : organiser, GPO, déléguer · groupe : donner des permissions' },
      { front: 'Forêt, arbre, domaine, OU ?', back: 'Forêt ⊃ arbre ⊃ domaine ⊃ OU ; la forêt = frontière de sécurité' },
      { front: 'Que contient un DC ?', back: '<b>NTDS.dit</b> (base) + <b>SYSVOL</b> (scripts, GPO)' },
      { front: 'Combien de DC au minimum ?', back: '<b>Au moins 2</b> (réplication multi-maître)' },
      { front: 'RODC ?', back: 'DC en lecture seule pour site distant peu sûr ; pas de mots de passe stockés par défaut' },
      { front: 'Sites AD ?', back: 'Sites physiques (sous-réseaux IP) : optimisent réplication et authentification' },
      { front: 'Catalogue global ?', back: 'Copie partielle de tous les objets de la forêt ; port <b>3268</b>' },
      { front: 'Kerberos ?', back: 'Tickets (TGT), port <b>88</b>, KDC = DC, horloge à <b>5 min</b> près' },
      { front: 'Pourquoi AD dépend du DNS ?', back: 'Les clients trouvent les DC par les enregistrements <b>SRV</b>' },
      { front: 'LDAP / LDAPS ?', back: '<b>389 / 636</b>' },
      { front: 'Les 5 rôles FSMO ?', back: 'Forêt : schéma, noms de domaine · Domaine : RID, émulateur PDC, infrastructure' },
      { front: 'Rôle FSMO de l\'heure ?', back: '<b>Émulateur PDC</b> (synchronisé sur un NTP externe)' },
      { front: 'Commande pour voir les FSMO ?', back: '<code>netdom query fsmo</code>' },
      { front: 'Étendues de groupes ?', back: 'Globale (GG_, par fonction) · domaine local (DL_, par ressource) · universelle' },
      { front: 'AGDLP ?', back: 'Accounts → Globaux → Domaine Local → Permissions' },
      { front: 'Les 2 parties d\'une GPO ?', back: 'Configuration ordinateur (démarrage) · configuration utilisateur (ouverture de session)' },
      { front: 'Où lier une GPO ?', back: 'Site, domaine ou OU (pas un groupe)' },
      { front: 'LSDOU ?', back: 'Locale → Site → Domaine → OU ; la dernière gagne, sauf Enforced' },
      { front: 'Bloquer l\'héritage vs Enforced ?', back: 'Le blocage ignore les niveaux supérieurs, sauf les GPO « Appliqué » (Enforced)' },
      { front: 'gpupdate /force et gpresult /r ?', back: 'Appliquer maintenant · voir les GPO réellement appliquées' },
      { front: 'Rafraîchissement des GPO ?', back: 'Toutes les 90 min (± 30)' },
      { front: 'Politique de mots de passe : où ?', back: 'GPO du domaine (Default Domain Policy) ; FGPP pour les admins' },
      { front: 'Règles des droits effectifs ?', back: 'Cumul entre groupes · Deny prioritaire · réseau = plus restrictif partage/NTFS · local = NTFS seul' },
      { front: 'Partages cachés ?', back: 'C$, ADMIN$ ; nom terminé par $ = masqué' },
      { front: 'Hyperviseur type 1 vs type 2 ?', back: 'Sur le matériel (ESXi, Hyper-V, Proxmox) · sur un OS (VirtualBox, Workstation)' },
      { front: 'VM vs conteneur ?', back: 'OS complet, isolation forte · partage le noyau, léger' },
      { front: 'Snapshot = sauvegarde ?', back: '<b>Non</b> : dépend du disque d\'origine, dégrade les performances' },
      { front: 'DAS, NAS, SAN ?', back: 'Disques attachés · fichiers en réseau (SMB, NFS) · blocs/LUN (FC, iSCSI 3260)' },
      { front: 'RAID 0, 1, 5, 6, 10 : capacité ?', back: 'N · N/2 · N−1 · N−2 · N/2' },
      { front: 'RAID 5 et 6 : pannes et minimum ?', back: '5 : 1 panne, 3 disques · 6 : 2 pannes, 4 disques' },
      { front: 'RAID pour une base de données ? Pour des fichiers ?', back: 'RAID 10 · RAID 6' },
      { front: 'Incrémentielle vs différentielle ?', back: 'Depuis la dernière sauvegarde · depuis la dernière complète' },
      { front: 'Restauration incrémentielle / différentielle ?', back: 'Complète + toutes les incrémentielles / complète + la dernière différentielle' },
      { front: 'RPO vs RTO ?', back: 'Perte de données admissible · durée d\'arrêt admissible' },
      { front: 'Règle 3-2-1-1-0 ?', back: '3 copies, 2 supports, 1 hors site, 1 hors ligne, 0 erreur aux tests' },
      { front: 'PCA vs PRA ?', back: 'Continuer malgré l\'incident · redémarrer après un sinistre' },
      { front: '99 %, 99,9 %, 99,99 % ?', back: '3,65 j · 8,76 h · 52,6 min d\'arrêt par an' }
    ],

    qcm: [
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Base de données d\'Active Directory :', choices: ['SAM', 'NTDS.dit', 'SYSVOL', 'registry.dat'], a: 1, noShuffle: true, expl: 'NTDS.dit.' },
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Rôle FSMO de référence pour l\'heure du domaine :', choices: ['RID', 'Schéma', 'Émulateur PDC', 'Infrastructure'], a: 2, noShuffle: true, expl: 'Émulateur PDC.' },
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Ordre d\'application des GPO :', choices: ['OU-D-S-L', 'L-S-D-OU', 'D-S-L-OU', 'S-L-D-OU'], a: 1, noShuffle: true, expl: 'LSDOU.' },
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Port de Kerberos :', choices: ['88', '389', '445', '3268'], a: 0, noShuffle: true, expl: '88.' },
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Nombre minimal de disques en RAID 5 :', choices: ['2', '3', '4', '5'], a: 1, noShuffle: true, expl: '3.' },
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Restaurer avec des différentielles :', choices: ['toutes les différentielles', 'complète + dernière différentielle', 'dernière différentielle seule', 'complète seule'], a: 1, noShuffle: true, expl: 'Complète + dernière différentielle.' },
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Hyperviseur de type 1 :', choices: ['VirtualBox', 'VMware Workstation', 'VMware ESXi', 'Docker'], a: 2, noShuffle: true, expl: 'ESXi.' },
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Forcer l\'application des GPO :', choices: ['gpresult /r', 'gpupdate /force', 'dcdiag', 'netdom'], a: 1, noShuffle: true, expl: 'gpupdate /force.' },
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Partage « Lecture » + NTFS « Contrôle total », accès réseau :', choices: ['Contrôle total', 'Modification', 'Lecture', 'Aucun'], a: 2, noShuffle: true, expl: 'Lecture.' },
      { type: 'qcm', src: 'Plan S8 · QCM', q: 'Le RPO mesure :', choices: ['la durée d\'arrêt', 'la perte de données maximale admissible', 'le nombre de sauvegardes', 'le coût'], a: 1, noShuffle: true, expl: 'La perte de données.' },
      { type: 'qcm', q: 'Les postes d\'un site ne trouvent pas le domaine. Cause la plus probable ?', choices: ['leur DNS ne pointe pas vers un DC', 'le RAID est dégradé', 'le DHCP est en panne totale', 'la GPO est mal liée'], a: 0, expl: 'Enregistrements SRV introuvables.' },
      { type: 'qcm', q: 'Où configurer une longueur de mot de passe de 12 caractères pour tout le domaine ?', choices: ['GPO liée au domaine (Default Domain Policy)', 'GPO liée à une OU', 'Sur chaque poste', 'Dans le DNS'], a: 0, expl: 'Stratégie de comptes au niveau du domaine ; FGPP pour des exceptions.' },
      { type: 'qcm', q: 'Un utilisateur est dans un groupe Modification et dans un groupe « Refuser l\'écriture » :', choices: ['il peut lire mais pas modifier', 'il peut modifier', 'aucun accès', 'contrôle total'], a: 0, expl: 'Le refus explicite l\'emporte.' },
      { type: 'qcm', q: '6 disques de 4 To en RAID 6 : capacité utile ?', choices: ['16 To', '20 To', '12 To', '24 To'], a: 0, expl: '(6 − 2) × 4.' },
      { type: 'qcm', q: 'Quel stockage présente un disque en mode bloc (LUN) au serveur ?', choices: ['SAN', 'NAS', 'DAS USB', 'DFS'], a: 0, expl: 'SAN (Fibre Channel ou iSCSI).' },
      { type: 'qcm', q: 'Disponibilité 99,99 % : arrêt annuel autorisé ?', choices: ['≈ 52,6 min', '≈ 8,76 h', '≈ 3,65 j', '≈ 5 min'], a: 0, expl: '0,01 % × 525 600 min.' },
      { type: 'tf', q: 'Une GPO peut être liée directement à un groupe de sécurité.', a: false, expl: 'Site, domaine ou OU ; on peut filtrer par groupe.' },
      { type: 'tf', q: 'En accès local sur le serveur, seuls les droits NTFS s\'appliquent.', a: true, expl: 'Les droits de partage ne jouent que par le réseau.' },
      { type: 'match', q: 'Associe le niveau de RAID à sa capacité utile (N disques).', pairs: [['RAID 0', 'N'], ['RAID 5', 'N − 1'], ['RAID 6', 'N − 2'], ['RAID 10', 'N / 2']], expl: 'Tableau à connaître.' },
      { type: 'order', q: 'Ordre LSDOU :', items: ['Locale', 'Site', 'Domaine', 'OU parente', 'OU enfant'], expl: 'La dernière appliquée gagne.' }
    ],

    exercises: [
      {
        title: 'Concevoir l\'Active Directory du Ministère', min: 12, src: 'Plan S8 · Ex. 1',
        statement: '<p>~800 agents. Sites : Niamey (siège, salle sécurisée), Zinder et Tahoua (directions régionales, sans informaticien, locaux peu sûrs). Directions : DGB, DGI, DGTCP, DRH.</p>',
        parts: [
          { q: 'a) Un ou plusieurs domaines ? Nom de domaine ?', pts: 1, corr: '<p>Un seul domaine dans une seule forêt : une organisation, une politique de sécurité, 800 comptes (AD en gère des millions). Nom : sous-domaine d\'un domaine public possédé, ex. <b>ad.finances.exemple.ne</b> (éviter « .local »).</p>' },
          { q: 'b) Arborescence d\'OU ; pourquoi séparer comptes et ordinateurs ?', pts: 1, corr: `${code(`MEF
├── Niamey ─┬─ DGB ─┬─ Utilisateurs
│           │       └─ Ordinateurs
│           ├─ DGI, DGTCP, DRH (même découpage)
├── Zinder ── Utilisateurs / Ordinateurs
├── Tahoua ── Utilisateurs / Ordinateurs
├── Serveurs
├── Groupes
└── Comptes_Admin (comptes à privilèges)`)}<p>Les parties « ordinateur » et « utilisateur » des GPO ne s'appliquent qu'aux objets du bon type présents dans l'OU ; cela permet aussi de déléguer (ex. le support de Zinder gère seulement l'OU Zinder).</p>` },
          { q: 'c) Combien de DC, de quel type, où ? Que configurer pour que Zinder s\'authentifie localement ?', pts: 1.5, corr: '<p>2 DC complets à Niamey (redondance, salle sécurisée, DNS + GC). 1 RODC à Zinder et 1 à Tahoua : authentification locale même si le WAN tombe, sans exposer la base complète en cas de vol. Créer les sites AD Niamey, Zinder, Tahoua avec leurs sous-réseaux (10.20.0.0/23, 10.20.3.0/25, 10.20.3.128/26…) et les liens de sites.</p>' },
          { q: 'd) Où placer les FSMO ? Pourquoi l\'émulateur PDC doit-il être synchronisé sur un NTP fiable ?', pts: 1, corr: '<p>Tous sur les DC de Niamey (jamais sur un RODC). L\'émulateur PDC est la source d\'heure du domaine ; au-delà de 5 min d\'écart, Kerberos refuse les authentifications.</p>' },
          { q: 'e) Tahoua : « domaine introuvable ». Cause la plus probable ?', pts: 0.5, corr: '<p>Le DNS des postes ne pointe pas vers les DC (DNS de l\'opérateur ou adresse erronée) : enregistrements SRV introuvables. Corriger via DHCP (option 6). Autres causes : lien WAN, pare-feu, heure.</p>' }
        ]
      },
      {
        title: 'Groupes et droits effectifs', min: 10, src: 'Plan S8 · Ex. 2',
        parts: [
          { q: 'a) D:\\Budget : modification pour les agents de la DGB, lecture pour les inspecteurs de l\'IGF. Applique AGDLP.', pts: 1.5, corr: '<p>Comptes → <b>GG_DGB_Agents</b> et <b>GG_IGF_Inspecteurs</b> (globaux) → placés dans <b>DL_Budget_Modif</b> et <b>DL_Budget_Lecture</b> (domaine local) → NTFS sur D:\\Budget : Modification / Lecture et exécution. Retirer l\'héritage « Utilisateurs » si nécessaire ; partage : Utilisateurs authentifiés = Modification.</p>' },
          { q: 'b) Moussa : G1 (NTFS Modification) + G2 (NTFS Lecture) ; partage « Tout le monde : Lecture ». Droits depuis son poste ? En local sur le serveur ?', pts: 1, fields: [{ label: 'Par le réseau', kind: 'select', opts: ['Contrôle total', 'Modification', 'Lecture', 'Aucun'], a: 2 }, { label: 'En local', kind: 'select', opts: ['Contrôle total', 'Modification', 'Lecture', 'Aucun'], a: 1 }], corr: '<p>NTFS cumulés = Modification ; partage = Lecture → réseau : <b>Lecture</b> ; local : <b>Modification</b>.</p>' },
          { q: 'c) Awa : G1 (Modification) + G3 (Refuser l\'écriture) ; partage Contrôle total. Peut-elle modifier un fichier ?', pts: 0.75, corr: '<p>Non : le refus explicite d\'écriture l\'emporte. Elle peut lire, pas modifier.</p>' },
          { q: 'd) Pourquoi ne jamais donner les droits directement aux comptes ?', pts: 0.75, corr: '<p>Ingérable : à chaque arrivée, départ ou mutation, il faudrait modifier de nombreux dossiers ; on oublie de retirer des droits. Avec les groupes, une seule opération, traçable.</p>' }
        ]
      },
      {
        title: 'Stratégies de groupe', min: 7, src: 'Plan S8 · Ex. 3',
        statement: '<p>Fond d\'écran : GPO-Site (site Niamey) → image A ; GPO-Domaine → image B ; GPO-DGI (OU DGI) → image C.</p>',
        parts: [
          { q: 'a) Quelle image voit un agent de la DGI à Niamey ?', pts: 0.75, fields: [{ kind: 'select', opts: ['A', 'B', 'C'], a: 2 }], corr: '<p><b>C</b> : L → S (A) → D (B) → OU (C), la dernière appliquée gagne.</p>' },
          { q: 'b) Si GPO-Domaine est « Appliquée » (Enforced) ? Si l\'OU DGI bloque l\'héritage (sans Enforced) ?', pts: 0.75, fields: [{ label: 'Avec Enforced', kind: 'select', opts: ['A', 'B', 'C'], a: 1 }, { label: 'Blocage seul', kind: 'select', opts: ['A', 'B', 'C'], a: 2 }], corr: '<p>Enforced → <b>B</b> (ne peut pas être écrasée). Blocage de l\'héritage sans Enforced → site et domaine ignorés → <b>C</b> (et Enforced + blocage → B, car Enforced passe à travers).</p>' },
          { q: 'c) Où configurer la politique de mots de passe (12 caractères, complexité, verrouillage après 5 échecs) ? Comment exiger 16 caractères pour les seuls administrateurs ?', pts: 0.75, corr: '<p>GPO liée au domaine (Default Domain Policy) : Configuration ordinateur → Stratégies → Paramètres Windows → Paramètres de sécurité → Stratégies de comptes. Pour les administrateurs : une <b>stratégie de mot de passe affinée (FGPP)</b> appliquée à leur groupe (Centre d\'administration AD).</p>' },
          { q: 'd) Une nouvelle GPO ne s\'applique pas sur un poste : deux commandes ?', pts: 0.75, corr: '<p><code>gpupdate /force</code> puis <code>gpresult /r</code> (ou /h rapport.html) pour voir si la GPO est appliquée ou filtrée ; vérifier l\'OU et le filtrage de sécurité.</p>' }
        ]
      },
      {
        title: 'RAID', min: 7, src: 'Plan S8 · Ex. 4',
        statement: '<p>Un serveur dispose de 6 disques de 4 To.</p>',
        parts: [
          { q: 'a) Capacité utile et pannes tolérées en RAID 0, 5, 6 et 10.', pts: 1.5, fields: [{ label: 'RAID 0 (To)', kind: 'num', a: 24 }, { label: 'RAID 5 (To)', kind: 'num', a: 20 }, { label: 'RAID 6 (To)', kind: 'num', a: 16 }, { label: 'RAID 10 (To)', kind: 'num', a: 12 }], corr: table(['RAID', 'Capacité utile', 'Pannes tolérées'], [['0', '6 × 4 = 24 To', '0'], ['5', '(6 − 1) × 4 = 20 To', '1'], ['6', '(6 − 2) × 4 = 16 To', '2 (n\'importe lesquels)'], ['10', '6 / 2 × 4 = 12 To', '1 garanti ; jusqu\'à 3 si chaque panne touche un miroir différent']]) },
          { q: 'b) Quel RAID pour le serveur de fichiers ? Pour la base de paie (beaucoup d\'écritures) ?', pts: 0.75, corr: '<p>Fichiers : <b>RAID 6</b> (capacité/sécurité, résiste à une 2<sup>e</sup> panne pendant la reconstruction). Paie : <b>RAID 10</b> (écritures, pas de parité, reconstruction rapide).</p>' },
          { q: 'c) « Nos données sont en RAID 6, pas besoin de sauvegarde. » Réponds en deux arguments.', pts: 0.75, corr: '<p>(1) Le RAID ne protège pas d\'une suppression, d\'un rançongiciel ou d\'une corruption : recopiées instantanément sur tous les disques. (2) Il ne protège pas de la perte du serveur entier (incendie, vol, contrôleur, inondation). Il faut des sauvegardes, dont une hors site et hors ligne.</p>' }
        ]
      },
      {
        title: 'Stratégie de sauvegarde', min: 8, src: 'Plan S8 · Ex. 5',
        statement: '<p>Complète le dimanche à 22 h, puis une sauvegarde chaque soir à 22 h du lundi au samedi. Le disque tombe en panne jeudi à 10 h.</p>',
        parts: [
          { q: 'a) Que restaurer si les quotidiennes sont incrémentielles ? Différentielles ?', pts: 1, corr: '<p>Incrémentielles : complète de dimanche + incrémentielles de lundi, mardi et mercredi (dans l\'ordre). Différentielles : complète de dimanche + différentielle de mercredi seulement.</p>' },
          { q: 'b) Quantité de données perdue ? RPO de 24 h respecté ?', pts: 1, fields: [{ label: 'Heures perdues', kind: 'num', a: 12 }], corr: '<p>De mercredi 22 h à jeudi 10 h = <b>12 h</b>. Le pire cas est juste avant la sauvegarde du soir (≈ 24 h) → RPO 24 h respecté.</p>' },
          { q: 'c) Paie : RPO 1 h et RTO 4 h. Que proposes-tu ?', pts: 1, corr: '<p>RPO 1 h : journaux de transactions toutes les 15 min à 1 h, ou réplication continue vers un second serveur ; instantanés horaires. RTO 4 h : VM répliquée sur un second site (ou second hôte prêt), procédure de bascule documentée et testée, sauvegardes sur disque plutôt que sur bande seule.</p>' },
          { q: 'd) Applique la règle 3-2-1 au Ministère (supports et lieux concrets).', pts: 1, corr: '<p>Copie 1 : production à Niamey. Copie 2 : NAS de sauvegarde dans un autre bâtiment (autre support). Copie 3 : réplication hors site (Zinder, cloud souverain) + une copie hors ligne (disque déconnecté, bande en coffre) contre les rançongiciels. Tests de restauration mensuels.</p>' }
        ]
      },
      {
        title: 'Virtualisation et PRA', min: 7, src: 'Plan S8 · Ex. 6',
        statement: '<p>Le Ministère exploite 12 serveurs physiques anciens à Niamey et veut les virtualiser.</p>',
        parts: [
          { q: 'a) Type d\'hyperviseur ? Deux produits ? Différence avec un conteneur Docker ?', pts: 0.75, corr: '<p>Type 1 (bare metal) : VMware ESXi, Microsoft Hyper-V, Proxmox VE. Une VM contient un OS complet ; un conteneur partage le noyau de l\'hôte (plus léger, isolation plus faible).</p>' },
          { q: 'b) Architecture supportant la panne d\'un serveur physique sans interruption longue.', pts: 1, corr: '<p>Au moins 3 hôtes (2 au minimum) en cluster, stockage partagé (SAN iSCSI/FC redondant, ou hyperconvergé), <b>haute disponibilité</b> (redémarrage automatique des VM d\'un hôte en panne), migration à chaud pour la maintenance. N−1 hôtes doivent porter toute la charge. Onduleurs, double alimentation.</p>' },
          { q: 'c) Snapshots de toutes les VM depuis 6 mois « en guise de sauvegarde » : deux problèmes ?', pts: 0.75, corr: '<p>(1) Un snapshot n\'est pas une sauvegarde : il dépend du disque d\'origine (panne, rançongiciel, suppression de la VM). (2) Des snapshots anciens grossissent, saturent le stockage, dégradent les performances ; leur fusion est longue et risquée.</p>' },
          { q: 'd) 99,9 % de disponibilité : heures d\'arrêt autorisées par an ?', pts: 0.5, fields: [{ kind: 'num', a: 8.76, tol: 0.05 }], corr: '<p>0,1 % × 8 760 h = <b>8,76 h</b> (≈ 8 h 45 min).</p>' }
        ]
      }
    ],

    phrases: [
      'Forêt ⊃ arbre ⊃ domaine ⊃ OU ; DC = NTDS.dit + SYSVOL ; RODC pour les sites peu sûrs ; AD dépend du DNS (SRV) ; Kerberos port 88, horloge à 5 min.',
      '5 FSMO : schéma et noms de domaine (forêt) ; RID, émulateur PDC, infrastructure (domaine).',
      'AGDLP ; GPO liées aux OU, ordre LSDOU, la dernière gagne sauf Enforced ; gpupdate /force, gpresult /r.',
      'Partage + NTFS → le plus restrictif ; Deny prioritaire. RAID 5 = N−1 (1 panne), RAID 6 = N−2 (2 pannes), RAID 10 = N/2.',
      'Incrémentielle = depuis la dernière sauvegarde ; différentielle = depuis la dernière complète ; 3-2-1 ; RPO = données perdues, RTO = durée d\'arrêt.'
    ]
  });
})();
