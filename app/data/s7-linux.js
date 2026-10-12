/* Séance 7 — Linux : arborescence, commandes, utilisateurs, droits, processus, services, cron, réseau, disques, scripts. */
(function () {
  'use strict';
  const { key, trap, tip, reflex, ex, fix, mnemo, why, f, frac, table, steps, ul, w, stepper, reveal, code } = App.md;

  App.registerModule({
    id: 's7', order: 7, label: 'Séance 7', short: 'Linux',
    title: 'Linux : fichiers, utilisateurs, droits, processus, scripts',
    subtitle: 'Épreuve 1 (coef. 2) — une note ≤ 5 est éliminatoire : ce sont les points les plus faciles à prendre',
    icon: '🐧', color: '#f97316', day: '2026-10-16', epreuve: 'Épreuve 1',
    intro: '<b>Rappel stratégique</b> : l\'Épreuve 1 compte coefficient 2 et une note ≤ 5/20 est éliminatoire. Il ne s\'agit pas d\'y briller mais d\'assurer au moins 10 : les droits, les commandes et la crontab sont les points les plus faciles à prendre.',

    pretest: [
      { type: 'qcm', q: '<span class="mono">chmod 640</span> donne :', choices: ['rw-r-----', 'rwxr-----', 'rw-rw----', 'r--r-----'], a: 0, expl: '6 = rw-, 4 = r--, 0 = ---.' },
      { type: 'qcm', q: 'Les empreintes des mots de passe sont dans :', choices: ['/etc/shadow', '/etc/passwd', '/etc/group', '/etc/login'], a: 0, expl: 'Lisible par root seul.' },
      { type: 'qcm', q: 'Dans une crontab, le premier champ est :', choices: ['la minute', 'l\'heure', 'le jour', 'la commande'], a: 0, expl: 'minute · heure · jour du mois · mois · jour de la semaine.' }
    ],

    lessons: [
      {
        title: 'Le système et l\'arborescence', min: 6,
        essentiel: ul([
          'OS : gère processus, mémoire, fichiers, périphériques et sécurité. <b>Noyau</b> = cœur qui parle au matériel ; <b>shell</b> (bash) = interpréteur de commandes.',
          'Debian/Ubuntu (.deb, <code>apt</code>) · Red Hat/Rocky/AlmaLinux (.rpm, <code>dnf</code>). Tout est fichier (<code>/dev/sda</code>). <b>root = UID 0</b>.',
          '/etc config · /home utilisateurs · /var/log journaux · /bin /sbin /usr programmes · /tmp temporaires · /dev périphériques · /proc processus.'
        ]),
        html: `
${table(['Dossier', 'Contenu'], [['/', 'Racine de tout'], ['/etc', 'Fichiers de configuration'], ['/home', 'Dossiers personnels des utilisateurs'], ['/root', 'Dossier personnel de root'], ['/var', 'Données variables : /var/log (journaux), spool, sites web'], ['/bin, /sbin, /usr', 'Programmes (sbin = administration)'], ['/boot', 'Noyau et chargeur de démarrage'], ['/dev', 'Périphériques'], ['/proc', 'Infos du noyau et des processus (virtuel)'], ['/tmp', 'Fichiers temporaires'], ['/mnt, /media', 'Points de montage'], ['/opt', 'Logiciels additionnels']])}
${ul(['Chemin <b>absolu</b> (commence par /) ou <b>relatif</b> (depuis le dossier courant) ; <b>.</b> = ici, <b>..</b> = dossier parent, <b>~</b> = dossier personnel.', 'On travaille en utilisateur normal + <b>sudo</b> ; root a tous les droits.'])}
`,
        check: [
          { type: 'qcm', q: 'Où se trouvent les fichiers de configuration ?', choices: ['/etc', '/var', '/bin', '/home'], a: 0, expl: '/etc.' },
          { type: 'qcm', q: 'Où chercher les journaux ?', choices: ['/var/log', '/etc/log', '/tmp', '/proc'], a: 0, expl: '/var/log (syslog, auth.log…).' }
        ]
      },
      {
        title: 'Les commandes de survie et les redirections', min: 6,
        essentiel: ul([
          '<code>ls -la</code> · <code>cd</code> / <code>pwd</code> · <code>cp -r</code> / <code>mv</code> / <code>rm -r</code> · <code>mkdir -p</code> / <code>touch</code> · <code>cat</code> / <code>less</code> · <code>head</code> / <code>tail -f</code> · <code>grep -i</code> · <code>find</code>.',
          '<b>&gt;</b> écrase · <b>&gt;&gt;</b> ajoute · <b>2&gt;</b> erreurs · <b>|</b> enchaîne · <b>&amp;&amp;</b> si succès.',
          '<code>grep "Failed password" /var/log/auth.log | wc -l</code> compte les échecs SSH.'
        ]),
        html: `
${table(['Commande', 'Rôle', 'Commande', 'Rôle'], [['ls -la', 'Lister (fichiers cachés, détails)', 'cat / less', 'Afficher un fichier'], ['cd / pwd', 'Changer / afficher le dossier courant', 'head -n 5 / tail -f', 'Début / fin (suivi en direct d\'un journal)'], ['cp -r / mv / rm -r', 'Copier / déplacer-renommer / supprimer', 'grep -i motif fichier', 'Chercher un texte'], ['mkdir -p / touch', 'Créer un dossier / un fichier vide', 'find / -name "*.log"', 'Chercher des fichiers'], ['man commande', 'Manuel', 'wc -l · sort · uniq · cut', 'Compter · trier · dédoublonner · découper']])}
${code(`ls -la /etc > liste.txt          # écrase liste.txt
echo "ligne" >> liste.txt        # ajoute à la fin
find / -name "*.conf" 2> /dev/null   # jette les erreurs
grep "Failed password" /var/log/auth.log | wc -l   # nombre d'échecs SSH
apt update && apt upgrade        # la 2e seulement si la 1re réussit`)}
`,
        check: [
          { type: 'qcm', q: 'Quel opérateur ajoute à la fin d\'un fichier sans l\'écraser ?', choices: ['>>', '>', '|', '2>'], a: 0, expl: '> écrase.' },
          { type: 'qcm', q: 'Suivre un journal en direct :', choices: ['tail -f', 'head -n', 'cat -f', 'less -r'], a: 0, expl: 'tail -f /var/log/syslog.' }
        ]
      },
      {
        title: 'Utilisateurs et groupes', min: 7,
        essentiel: ul([
          '<b>/etc/passwd</b> (lisible par tous, 7 champs) : login : x : UID : GID : commentaire : dossier : shell. <b>/etc/shadow</b> (root seul) : empreintes. <b>/etc/group</b>.',
          '<code>useradd -m -s /bin/bash</code> · <code>passwd</code> · <code>usermod -aG</code> (le <b>-a</b> !) · <code>usermod -L/-U</code> · <code>chage -d 0</code> · <code>userdel -r</code>.',
          '<code>su -</code> : session root (mot de passe de root) · <code>sudo</code> : une commande en root avec son propre mot de passe, tracée (/etc/sudoers via visudo).'
        ]),
        html: `
${ex(`<span class="mono">aissa:x:1003:1003:Aissa Moussa,DGI:/home/aissa:/bin/bash</span><br>login · x (mot de passe dans /etc/shadow) · UID · GID du groupe principal · commentaire (GECOS) · dossier personnel · shell de connexion.<br>UID 0 = root ; UID &lt; 1000 = comptes système ; shell /usr/sbin/nologin = connexion interdite.`, '/etc/passwd — 7 champs')}
${code(`useradd -m -s /bin/bash ibrahim     # dossier perso + shell bash
usermod -aG budget,sudo ibrahim      # AJOUTE aux groupes (garde les autres)
passwd ibrahim                       # définir le mot de passe
chage -d 0 ibrahim                   # changement obligatoire à la 1re connexion (ou passwd -e)
usermod -L ibrahim                   # verrouiller (congé) ; usermod -U pour déverrouiller
userdel -r ibrahim                   # supprimer avec son dossier
groupadd budget ; id ibrahim         # créer un groupe ; afficher UID et groupes`)}
${trap('<code>usermod -G</code> <b>sans -a</b> retire l\'utilisateur de tous ses autres groupes !')}
${why('<code>sudo</code> est préférable à <code>su -</code> : on n\'a pas à partager le mot de passe de root, les droits sont fins (/etc/sudoers) et chaque commande est journalisée.')}
`,
        check: [
          { type: 'input', q: 'Combien de champs dans une ligne de /etc/passwd ?', fields: [{ kind: 'num', a: 7 }], expl: 'login:x:UID:GID:commentaire:dossier:shell.' },
          { type: 'qcm', q: 'Ajouter ibrahim au groupe budget sans lui retirer ses autres groupes :', choices: ['usermod -aG budget ibrahim', 'usermod -G budget ibrahim', 'groupadd ibrahim budget', 'useradd -G budget ibrahim'], a: 0, expl: 'Le -a (append) est indispensable.' },
          { type: 'qcm', q: 'UID de root :', choices: ['0', '1', '1000', '65535'], a: 0, noShuffle: true, expl: '0.' }
        ]
      },
      {
        title: 'Les droits : LE sujet qui tombe à chaque fois', min: 10,
        essentiel: ul([
          '<b>r = 4, w = 2, x = 1</b> ; 3 triplets : propriétaire (u) · groupe (g) · autres (o). rwx = 7, r-x = 5, rw- = 6, r-- = 4.',
          'Sur un <b>dossier</b> : r = lister, w = créer/supprimer/renommer dedans, x = entrer (cd).',
          '<b>Supprimer un fichier = droit w sur le dossier</b>, pas sur le fichier.'
        ]),
        html: `
${ex('<span class="mono">-rwxr-x--- 1 aissa budget 2048 oct 16 rapport.sh</span><br>1<sup>er</sup> caractère : <b>-</b> fichier, <b>d</b> dossier, <b>l</b> lien. Puis : propriétaire <b>rwx</b> (7) · groupe <b>r-x</b> (5) · autres <b>---</b> (0) → <b>750</b>.')}
${table(['Droit', 'Valeur', 'Sur un fichier', 'Sur un dossier'], [['r', '4', 'Lire le contenu', 'Lister les noms'], ['w', '2', 'Modifier', 'Créer / supprimer / renommer des fichiers dedans'], ['x', '1', 'Exécuter', 'Entrer / traverser (cd)']])}
${w('chmod')}
${code(`chmod 640 fichier              # octal
chmod u+x,g-w,o= fichier       # symbolique
chown aissa:budget fichier     # propriétaire et groupe
chown -R aissa:budget dossier  # récursif
chgrp budget fichier`)}
${ex('Moussa a <b>rw-</b> sur un fichier mais seulement <b>r-x</b> sur le dossier : il peut <b>modifier</b> le fichier (w sur le fichier suffit) mais <b>pas le supprimer</b> (il faudrait w sur le dossier).', 'Piège classique')}
${mnemo('« <b>R</b>ead <b>4</b>, <b>W</b>rite <b>2</b>, e<b>X</b>ecute <b>1</b> » : 4-2-1, comme les trois derniers poids binaires. 7 = 4+2+1, 6 = 4+2, 5 = 4+1.')}
`,
        check: [
          { type: 'input', q: 'Valeur octale de <span class="mono">rwxr-x---</span> ?', fields: [{ kind: 'text', a: '750' }], expl: '7, 5, 0.' },
          { type: 'qcm', q: '<span class="mono">chmod 644</span> donne :', choices: ['rwxr--r--', 'rw-r--r--', 'rw-rw-r--', 'r--r--r--'], a: 1, noShuffle: true, expl: '6 = rw-, 4 = r--.' },
          { type: 'tf', q: 'Pour supprimer un fichier, il faut le droit w sur ce fichier.', a: false, expl: 'Il faut w sur le dossier qui le contient.' }
        ]
      },
      {
        title: 'umask et droits spéciaux (SUID, SGID, sticky)', min: 8,
        essentiel: ul([
          '<b>umask</b> : on le retire de <b>666 (fichier)</b> et <b>777 (dossier)</b> : 022 → 644/755 · 027 → 640/750 · 077 → 600/700.',
          '<b>SUID 4000</b> (rwsr-xr-x) : s\'exécute avec les droits du propriétaire (ex. /usr/bin/passwd → root).',
          '<b>SGID 2000</b> sur dossier : héritage du groupe · <b>sticky 1000</b> : chacun ne supprime que ses fichiers (/tmp = 1777). Majuscule S/T = x absent.'
        ]),
        html: `
${f(`fichier : 666 − umask &nbsp;·&nbsp; dossier : 777 − umask`, 'umask 027 → 640 / 750')}
${table(['Droit spécial', 'Valeur', 'Affichage', 'Effet'], [['SUID', '4000', 'rwsr-xr-x', 'Le programme s\'exécute avec les droits de son propriétaire (ex. /usr/bin/passwd → root, pour écrire dans /etc/shadow)'], ['SGID', '2000', 'rwxr-s---', 'Sur un dossier : les fichiers créés héritent du groupe du dossier (dossiers partagés)'], ['Sticky bit', '1000', 'rwxrwxrwt', 'Sur un dossier : chacun ne peut supprimer que ses propres fichiers (/tmp = 1777)']])}
${ex(`Dossier partagé /srv/budget : seuls les membres de budget (lecture + écriture), héritage du groupe, personne ne supprime les fichiers d'un collègue :
${code(`mkdir -p /srv/budget
chown root:budget /srv/budget
chmod 3770 /srv/budget        # 2000 SGID + 1000 sticky + 770
ls -ld /srv/budget            # drwxrws--T root budget`)}
Le « T » majuscule s'affiche car les autres n'ont pas x : c'est normal. Un umask 007 pour les membres (fichiers en 660) est un plus.`, 'Cas pratique du plan')}
${ul(['<b>ACL fines</b> : <code>setfacl -m u:moussa:r fichier</code>, <code>getfacl fichier</code>.'])}
${trap('umask se retire de <b>666</b> pour un fichier (et non de 777) : un fichier n\'est jamais exécutable par défaut.')}
`,
        check: [
          { type: 'input', q: 'umask 027 : droits d\'un nouveau fichier et d\'un nouveau dossier ?', fields: [{ label: 'Fichier', kind: 'text', a: '640' }, { label: 'Dossier', kind: 'text', a: '750' }], expl: '666 − 027 → 640 ; 777 − 027 → 750.' },
          { type: 'input', q: 'Valeur octale de <span class="mono">-rwsr-xr-x</span> ?', fields: [{ kind: 'text', a: '4755' }], expl: 'SUID 4000 + 755.' },
          { type: 'qcm', q: 'Le sticky bit sur /tmp sert à :', choices: ['rendre les fichiers exécutables', 'empêcher de supprimer les fichiers des autres', 'hériter du groupe', 'chiffrer'], a: 1, noShuffle: true, expl: 'Chacun ne supprime que ses fichiers.' }
        ]
      },
      {
        title: 'Processus et services (systemd)', min: 8,
        essentiel: ul([
          'Chaque programme lancé = un processus (PID, PPID). <b>PID 1 = systemd</b>. <code>ps aux</code>, <code>top</code>, <code>pgrep</code>.',
          '<code>kill PID</code> = <b>SIGTERM (15)</b>, arrêt propre · <code>kill -9</code> = SIGKILL, forcé · <code>kill -1</code> = SIGHUP, relire la config. <code>nice</code> : −20 (prioritaire) à 19.',
          '<code>systemctl start|stop|restart|reload|status|enable|disable</code> · <code>journalctl -u ssh -f</code> · <code>journalctl -p err --since today</code>.'
        ]),
        html: `
${code(`ps aux | grep nginx          # ou : pgrep nginx
kill 1234                    # SIGTERM (15) : arrêt propre
kill -9 1234                 # SIGKILL : en dernier recours
nice -n 19 /opt/sauvegarde.sh   # priorité la plus basse
top                          # trier par %CPU ; ou : ps aux --sort=-%cpu | head
cmd &  ;  jobs ; fg ; bg ; Ctrl+Z ; nohup cmd &

systemctl status ssh         # état + derniers journaux
systemctl restart ssh        # après modification de la configuration (ou reload)
systemctl enable ssh         # lancer au démarrage ; is-enabled pour vérifier
systemctl disable cups
systemctl list-units --type=service
journalctl -u postgresql -p err --since today
systemctl get-default        # multi-user.target (≈ niveau 3) / graphical.target (≈ 5)`)}
${table(['État', 'Signification'], [['R', 'En cours d\'exécution'], ['S', 'En attente (sommeil)'], ['D', 'Attente disque (non interruptible)'], ['T', 'Arrêté'], ['Z', 'Zombie : terminé mais pas encore « ramassé » par son parent']])}
${ul(['Journaux classiques : <b>/var/log/syslog</b> (Debian) ou <b>/var/log/messages</b> (Red Hat) ; authentifications : <b>/var/log/auth.log</b> ou <b>/var/log/secure</b>.', 'Un <b>zombie</b> n\'utilise plus de ressources mais occupe une entrée dans la table des processus ; on le fait disparaître en corrigeant ou redémarrant le parent.'])}
${trap('<code>kill</code> sans option envoie <b>SIGTERM (15)</b>, pas SIGKILL (9).')}
`,
        check: [
          { type: 'qcm', q: 'Signal envoyé par défaut par kill :', choices: ['SIGKILL (9)', 'SIGHUP (1)', 'SIGTERM (15)', 'SIGSTOP'], a: 2, noShuffle: true, expl: 'SIGTERM.' },
          { type: 'qcm', q: 'Premier processus (PID 1) d\'une distribution récente :', choices: ['bash', 'kernel', 'systemd', 'cron'], a: 2, noShuffle: true, expl: 'systemd (anciennement init).' },
          { type: 'qcm', q: 'Pour que SSH démarre au prochain redémarrage :', choices: ['systemctl enable ssh', 'systemctl start ssh', 'systemctl reload ssh', 'service ssh status'], a: 0, expl: 'enable = au boot ; start = maintenant.' }
        ]
      },
      {
        title: 'Planifier avec cron', min: 7,
        essentiel: ul([
          '<b>minute · heure · jour du mois · mois · jour de la semaine · commande</b>. Jour de la semaine : <b>0 ou 7 = dimanche</b>, 1 = lundi.',
          '<b>*/15</b> = toutes les 15 · <b>1-5</b> = du lundi au vendredi · <b>1,15</b> = le 1<sup>er</sup> et le 15.',
          '<code>crontab -e</code> (éditer) · <code>crontab -l</code> (lister) ; toujours des <b>chemins absolus</b>.'
        ]),
        html: `
${code(`# min heure jour-mois mois jour-sem commande
30 2   *   *   *     /opt/sauvegarde.sh          # chaque nuit à 2 h 30
*/15 8-17 * * 1-5    /opt/verif.sh               # toutes les 15 min, 8 h-17 h, lun.-ven.
0  6   1   *   *     /opt/rapport.sh             # le 1er du mois à 6 h
0  0   *   *   0     /opt/purge.sh               # chaque dimanche à minuit`)}
${w('cron')}
${ul(['<b>/etc/crontab</b> et <b>/etc/cron.d/</b> ont un 6<sup>e</sup> champ = utilisateur. Dossiers <b>/etc/cron.daily</b>, weekly…', '<code>crontab -u aissa -l</code> : la crontab d\'un autre utilisateur.', '<code>at 22:00</code> : exécuter une seule fois. Alternative moderne : <b>timers systemd</b>.', 'L\'environnement de cron est minimal : chemins absolus partout.'])}
${ex('« De 7 h à 18 h » toutes les 10 min, du lundi au vendredi : <code>*/10 7-17 * * 1-5</code> (jusqu\'à 17 h 50) ; 7-18 irait jusqu\'à 18 h 50. Les deux sont acceptées si elles sont justifiées.')}
${trap('L\'ordre est minute PUIS heure : « 0 2 » = 2 h 00, pas 0 h 02.')}
`,
        check: [
          { type: 'input', q: 'Les 5 champs pour : tous les jours à 23 h 30.', fields: [{ kind: 'cron', a: '30 23 * * *', wide: true, ph: 'min heure jm mois js' }], expl: '<code>30 23 * * *</code>' },
          { type: 'qcm', q: '<span class="mono">15 3 1,15 * *</span> signifie :', choices: ['à 3 h 15 le 1er et le 15 de chaque mois', 'à 15 h 03 le 1er et le 15', 'toutes les 15 min le 1er', 'le 3 janvier et le 15'], a: 0, expl: 'Minute 15, heure 3, jours 1 et 15.' },
          { type: 'input', q: 'Les 5 champs pour : chaque dimanche à minuit.', fields: [{ kind: 'cron', a: '0 0 * * 0', wide: true }], expl: '<code>0 0 * * 0</code> (ou 7).' }
        ]
      },
      {
        title: 'Réseau, disques, paquets, archives, SSH', min: 9,
        essentiel: ul([
          'Réseau : <code>ip a</code> · <code>ip route</code> · <code>ss -tulpn</code> · /etc/resolv.conf · /etc/hosts ; Ubuntu : <b>netplan</b> (<code>netplan apply</code>).',
          'Disques : <code>lsblk</code> · <code>mkfs.ext4</code> · <code>mount</code> ; permanent : <b>/etc/fstab</b> · <code>df -h</code> (par système de fichiers) · <code>du -sh</code> · <code>free -h</code> · LVM (PV → VG → LV).',
          'Archives : <code>tar -czvf a.tar.gz dossier</code> / <code>tar -xzvf</code>. SSH : <b>PermitRootLogin no</b>, <b>PasswordAuthentication no</b> (clés).'
        ]),
        html: `
${table(['Besoin', 'Commande / fichier'], [['Adresses, interfaces', 'ip a · ip link set eth0 up'], ['Routes', 'ip route · ip route add default via 10.20.0.1'], ['Ports en écoute', 'ss -tulpn (ancien : netstat)'], ['DNS', '/etc/resolv.conf · /etc/hosts · dig'], ['Config. permanente', 'Ubuntu : netplan (/etc/netplan/*.yaml) · Debian : /etc/network/interfaces · Red Hat : nmcli'], ['Pare-feu', 'ufw allow 22/tcp · firewall-cmd --add-service=ssh --permanent · nftables / iptables'], ['Copie distante', 'scp, rsync -avz'], ['Paquets Debian', 'apt update && apt upgrade · apt install · dpkg -i'], ['Paquets Red Hat', 'dnf install · rpm -qa'], ['Disques', 'lsblk · fdisk / parted · mkfs.ext4 /dev/sdb1'], ['Montage', 'mount /dev/sdb1 /data ; permanent : /etc/fstab'], ['Occupation', 'df -h · du -sh dossier · free -h (mémoire)'], ['LVM', 'PV → VG → LV agrandissables : lvextend -r -L +10G'], ['Archives', 'tar -czvf a.tar.gz dossier · tar -xzvf a.tar.gz']])}
${ex(`${code(`# /etc/netplan/01-reseau.yaml
network:
  version: 2
  ethernets:
    ens18:
      dhcp4: false
      addresses: [10.20.0.80/23]
      routes:
        - to: default
          via: 10.20.0.1
      nameservers:
        addresses: [10.20.0.10]
# puis : sudo netplan apply   (ou netplan try)`)}`, 'Adresse fixe avec netplan (plan)')}
${reflex('Serveur injoignable en SSH : <code>ip a</code> (IP, interface UP ?) → <code>ip route</code> (passerelle ?) → <code>ping 10.20.0.1</code> → <code>systemctl status ssh</code> → <code>ss -tlnp | grep :22</code> → <code>ufw status</code> → <code>journalctl -u ssh</code> / /var/log/auth.log.')}
${tip('Sécuriser SSH : PermitRootLogin no ; clés + PasswordAuthentication no ; AllowUsers / AllowGroups ; port 22 filtré sur le seul LAN Admin ; fail2ban contre la force brute ; mises à jour.')}
`,
        check: [
          { type: 'qcm', q: 'Espace libre par système de fichiers :', choices: ['du -sh', 'df -h', 'free -h', 'lsblk'], a: 1, noShuffle: true, expl: 'df = disk free.' },
          { type: 'qcm', q: 'Fichier des montages automatiques au démarrage :', choices: ['/etc/mtab', '/etc/fstab', '/etc/mount.conf', '/boot/grub'], a: 1, noShuffle: true, expl: '/etc/fstab.' },
          { type: 'qcm', q: 'Voir les ports en écoute :', choices: ['ip route', 'ss -tulpn', 'ps aux', 'lsof -h'], a: 1, noShuffle: true, expl: 'ss -tulpn.' }
        ]
      },
      {
        title: 'Scripts bash : la syntaxe minimale', min: 9,
        essentiel: ul([
          '<code>#!/bin/bash</code> · <b>$0</b> nom du script · <b>$1 $2</b> arguments · <b>$#</b> nombre d\'arguments · <b>$@</b> tous · <b>$?</b> code retour (0 = OK).',
          '<code>NOM="x"</code> sans espaces autour du = ; <code>$(commande)</code> ; dans <code>[ ]</code> des espaces obligatoires.',
          'Tests : -eq -ne -lt -le -gt -ge (nombres) ; = != (texte) ; -f fichier ; -d dossier ; -z vide ; -e existe ; -x exécutable.'
        ]),
        html: `
${code(`#!/bin/bash
# $0 = nom du script, $1 $2 = arguments, $# = nombre, $@ = tous, $? = code retour
NOM="Niamey"                 # pas d'espace autour de =
DATE=$(date +%F)             # résultat d'une commande
echo "Site : $NOM le $DATE"

if [ $# -ne 1 ]; then
   echo "Usage : $0 dossier" ; exit 1
fi
if [ -d "$1" ]; then echo "dossier existe"
elif [ -f "$1" ]; then echo "fichier"
else echo "introuvable"
fi

for SITE in Niamey Zinder Tahoua; do
  ping -c 1 "$SITE" > /dev/null && echo "$SITE OK"
done

i=1
while [ $i -le 5 ]; do
  echo "Tour $i" ; i=$((i+1))
done

case "$1" in
  start) echo "Démarrage" ;;
  stop)  echo "Arrêt" ;;
  *)     echo "Inconnu" ;;
esac
# Lancer : chmod +x s.sh puis ./s.sh`)}
${ex(`${code(`#!/bin/bash
LOG=/var/log/sauvegarde.log
DEST=/backup
if [ $# -ne 1 ]; then
   echo "Usage : $0 dossier" ; exit 1
fi
if [ ! -d "$1" ]; then
   echo "Erreur : $1 n'est pas un dossier" ; exit 2
fi
NOM=$(basename "$1")
ARCHIVE="$DEST/\${NOM}_$(date +%F).tar.gz"
mkdir -p "$DEST"
if tar -czf "$ARCHIVE" "$1" 2>/dev/null; then
   echo "$(date '+%F %T') OK $ARCHIVE" >> "$LOG"
else
   echo "$(date '+%F %T') ECHEC $1" >> "$LOG"
   exit 3
fi
find "$DEST" -name "*.tar.gz" -mtime +7 -delete
exit 0`)}Planification : <code>30 23 * * * /opt/sauvegarde.sh /srv/budget</code> ; ne pas oublier <code>chmod +x</code>. Une sauvegarde doit aussi être copiée hors du serveur (rsync) et testée par une restauration.`, 'Script de sauvegarde complet (plan)')}
${trap('<code>NOM = x</code> (avec espaces) est une erreur ; <code>[$1 -eq 1]</code> sans espaces dans les crochets aussi. Mets toujours les variables entre guillemets : <code>"$1"</code>.')}
`,
        check: [
          { type: 'qcm', q: 'En bash, $? contient :', choices: ['le PID', 'le nombre d\'arguments', 'le code retour de la dernière commande', 'le nom du script'], a: 2, noShuffle: true, expl: '0 = succès.' },
          { type: 'qcm', q: 'Test « $1 est un dossier » :', choices: ['[ -d "$1" ]', '[ -f "$1" ]', '[ -z "$1" ]', '[ $1 -eq d ]'], a: 0, expl: '-d = directory.' },
          { type: 'qcm', q: 'Nombre d\'arguments passés au script :', choices: ['$#', '$@', '$0', '$?'], a: 0, expl: '$#.' }
        ]
      }
    ],

    cards: [
      { front: 'Rôle du noyau et du shell ?', back: 'Noyau : cœur qui parle au matériel · shell (bash) : interpréteur de commandes' },
      { front: '/etc, /var/log, /home, /tmp, /dev, /proc ?', back: 'Config · journaux · dossiers perso · temporaires · périphériques · infos noyau/processus' },
      { front: '> , >> , 2> , | , && ?', back: 'Écrase · ajoute · redirige les erreurs · enchaîne · exécute si succès' },
      { front: '/etc/passwd : les 7 champs ?', back: 'login : x : UID : GID : commentaire : dossier : shell' },
      { front: '/etc/shadow ?', back: 'Empreintes des mots de passe + expiration, lisible par root seul' },
      { front: 'Créer ibrahim avec dossier et bash ?', back: '<code>useradd -m -s /bin/bash ibrahim</code>' },
      { front: 'Ajouter à un groupe sans retirer les autres ?', back: '<code>usermod -aG groupe user</code> (le -a !)' },
      { front: 'Forcer le changement de mot de passe ?', back: '<code>chage -d 0 user</code> (ou passwd -e)' },
      { front: 'Verrouiller / déverrouiller un compte ?', back: '<code>usermod -L</code> / <code>usermod -U</code> (ou passwd -l)' },
      { front: 'su - vs sudo ?', back: 'su - : session root (mot de passe root) · sudo : une commande, son propre mot de passe, journalisée' },
      { front: 'r, w, x : valeurs ?', back: '<b>4, 2, 1</b>' },
      { front: 'rwxr-x--- en octal ? rw-r----- ?', back: '<b>750 · 640</b>' },
      { front: 'Droits r, w, x sur un dossier ?', back: 'Lister · créer/supprimer dedans · entrer (cd)' },
      { front: 'Supprimer un fichier exige quel droit ?', back: '<b>w sur le dossier</b> qui le contient' },
      { front: 'umask 022, 027, 077 ?', back: '644/755 · 640/750 · 600/700' },
      { front: 'SUID, SGID, sticky : valeurs et effets ?', back: '4000 droits du propriétaire · 2000 héritage du groupe · 1000 pas de suppression des fichiers des autres' },
      { front: '-rwsr-xr-x en octal ?', back: '<b>4755</b> (ex. /usr/bin/passwd)' },
      { front: 'drwxrwxrwt (/tmp) en octal ?', back: '<b>1777</b>' },
      { front: 'drwxrws--- en octal ?', back: '<b>2770</b>' },
      { front: 'S ou T majuscule dans ls -l ?', back: 'Droit spécial posé mais x absent en dessous' },
      { front: 'kill, kill -9, kill -1 ?', back: 'SIGTERM 15 (propre) · SIGKILL 9 (forcé) · SIGHUP 1 (relire la config)' },
      { front: 'nice : plage de priorité ?', back: '−20 (plus prioritaire, root seul) à 19 (moins prioritaire)' },
      { front: 'Processus zombie ?', back: 'Terminé, pas encore ramassé par son parent (état Z)' },
      { front: 'systemctl start vs enable ?', back: 'Maintenant · au démarrage' },
      { front: 'Journaux d\'erreurs d\'un service depuis ce matin ?', back: '<code>journalctl -u service -p err --since today</code>' },
      { front: 'Crontab : ordre des champs ?', back: 'minute · heure · jour du mois · mois · jour de semaine (0/7 = dimanche) · commande' },
      { front: '*/15 8-17 * * 1-5 ?', back: 'Toutes les 15 min de 8 h à 17 h 45, du lundi au vendredi' },
      { front: 'Ports en écoute ? Adresses ? Routes ?', back: '<code>ss -tulpn</code> · <code>ip a</code> · <code>ip route</code>' },
      { front: 'df -h vs du -sh vs free -h ?', back: 'Occupation par système de fichiers · taille d\'un dossier · mémoire' },
      { front: 'Montage permanent ?', back: '<b>/etc/fstab</b>' },
      { front: 'LVM ?', back: 'PV (disques) → VG (groupe) → LV (volumes agrandissables : lvextend -r)' },
      { front: 'Créer / extraire une archive tar.gz ?', back: '<code>tar -czvf a.tar.gz dossier</code> / <code>tar -xzvf a.tar.gz</code>' },
      { front: 'Sécuriser SSH : 3 réglages ?', back: 'PermitRootLogin no · clés + PasswordAuthentication no · filtrer le port 22 / fail2ban' },
      { front: 'Bash : $0, $1, $#, $@, $? ?', back: 'Nom du script · 1er argument · nombre · tous · code retour' },
      { front: 'Bash : tests de fichiers ?', back: '-f fichier · -d dossier · -e existe · -x exécutable · -z chaîne vide' },
      { front: 'Bash : comparaisons de nombres ?', back: '-eq -ne -lt -le -gt -ge' }
    ],

    qcm: [
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'Les empreintes des mots de passe sont dans :', choices: ['/etc/passwd', '/etc/shadow', '/etc/group', '/etc/login'], a: 1, noShuffle: true, expl: '/etc/shadow.' },
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'chmod 644 donne :', choices: ['rwxr--r--', 'rw-r--r--', 'rw-rw-r--', 'r--r--r--'], a: 1, noShuffle: true, expl: 'rw-r--r--.' },
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'Signal envoyé par défaut par kill :', choices: ['SIGKILL (9)', 'SIGHUP (1)', 'SIGTERM (15)', 'SIGSTOP'], a: 2, noShuffle: true, expl: 'SIGTERM.' },
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'Espace libre par système de fichiers :', choices: ['du -sh', 'df -h', 'free -h', 'lsblk'], a: 1, noShuffle: true, expl: 'df -h.' },
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'UID de root :', choices: ['0', '1', '1000', '65535'], a: 0, noShuffle: true, expl: '0.' },
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'Fichier des montages automatiques au démarrage :', choices: ['/etc/mtab', '/etc/fstab', '/etc/mount.conf', '/boot/grub'], a: 1, noShuffle: true, expl: '/etc/fstab.' },
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'En bash, $? contient :', choices: ['le PID', 'le nombre d\'arguments', 'le code retour de la dernière commande', 'le nom du script'], a: 2, noShuffle: true, expl: 'Code retour.' },
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'Le sticky bit sur /tmp sert à :', choices: ['rendre les fichiers exécutables', 'empêcher de supprimer les fichiers des autres', 'hériter du groupe', 'chiffrer'], a: 1, noShuffle: true, expl: 'Protection des fichiers des autres.' },
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'Voir les ports en écoute :', choices: ['ip route', 'ss -tulpn', 'ps aux', 'lsof -h'], a: 1, noShuffle: true, expl: 'ss -tulpn.' },
      { type: 'qcm', src: 'Plan S7 · QCM', q: 'Premier processus (PID 1) d\'une distribution récente :', choices: ['bash', 'kernel', 'systemd', 'cron'], a: 2, noShuffle: true, expl: 'systemd.' },
      { type: 'qcm', q: 'umask 077 : droits d\'un nouveau fichier ?', choices: ['600', '700', '644', '077'], a: 0, expl: '666 − 077 = 600.' },
      { type: 'qcm', q: 'Commande pour donner le dossier /srv/tresor au groupe tresor :', choices: ['chown root:tresor /srv/tresor', 'chmod tresor /srv/tresor', 'usermod -G tresor /srv/tresor', 'groupadd /srv/tresor'], a: 0, expl: 'chown utilisateur:groupe.' },
      { type: 'qcm', q: 'Valeur octale de drwxrws--- :', choices: ['2770', '770', '4770', '1770'], a: 0, expl: 'SGID 2000 + 770.' },
      { type: 'qcm', q: 'Commande qui relit la configuration de nginx sans couper les connexions :', choices: ['systemctl reload nginx', 'systemctl stop nginx', 'kill -9 nginx', 'systemctl disable nginx'], a: 0, expl: 'reload (ou kill -1).' },
      { type: 'qcm', q: 'Ligne cron « toutes les 4 heures pile, le samedi et le dimanche » :', choices: ['0 */4 * * 6,0', '*/4 0 * * 6,0', '0 4 * * 6-0', '4 * * * 6,0'], a: 0, expl: 'Minute 0, heures */4.' },
      { type: 'qcm', q: 'Commande qui compresse /srv/budget dans budget.tar.gz :', choices: ['tar -czvf budget.tar.gz /srv/budget', 'tar -xzvf budget.tar.gz /srv/budget', 'gzip /srv/budget', 'zip -r /srv/budget'], a: 0, expl: 'c = créer, z = gzip, f = fichier.' },
      { type: 'tf', q: 'Avec rw- sur un fichier et r-x sur son dossier, on peut modifier le fichier mais pas le supprimer.', a: true, expl: 'Supprimer exige w sur le dossier.' },
      { type: 'tf', q: 'usermod -G sudo ibrahim ajoute ibrahim au groupe sudo en conservant ses autres groupes.', a: false, expl: 'Sans -a, ses autres groupes sont retirés.' },
      { type: 'match', q: 'Associe le droit spécial à son effet.', pairs: [['SUID (4000)', 'Exécution avec les droits du propriétaire'], ['SGID (2000) sur dossier', 'Héritage du groupe du dossier'], ['Sticky (1000)', 'Ne supprimer que ses propres fichiers']], expl: 'À savoir réciter.' },
      { type: 'order', q: 'Ordre des champs d\'une crontab :', items: ['minute', 'heure', 'jour du mois', 'mois', 'jour de la semaine', 'commande'], expl: '« 0 2 » = 2 h 00.' }
    ],

    exercises: [
      {
        title: 'Droits d\'accès', min: 12, src: 'Plan S7 · Ex. 1',
        parts: [
          { q: 'a) Valeur octale de : -rw-r----- · drwxr-x--- · -rwsr-xr-x (/usr/bin/passwd) · drwxrwxrwt (/tmp) · drwxrws---', pts: 1.5, fields: [{ label: '-rw-r-----', kind: 'text', a: '640' }, { label: 'drwxr-x---', kind: 'text', a: '750' }, { label: '-rwsr-xr-x', kind: 'text', a: '4755' }, { label: 'drwxrwxrwt', kind: 'text', a: '1777' }, { label: 'drwxrws---', kind: 'text', a: '2770' }], corr: '<p>640 : propriétaire lit/écrit, groupe lit. · 750 : le groupe peut lister et entrer, pas créer. · 4755 : SUID, passwd s\'exécute en root pour écrire dans /etc/shadow. · 1777 : tout le monde écrit, mais le sticky bit empêche de supprimer les fichiers des autres. · 2770 : SGID sur dossier, héritage du groupe.</p>' },
          { q: 'b) umask 027 : droits d\'un nouveau fichier et d\'un nouveau dossier ?', pts: 0.75, fields: [{ label: 'Fichier', kind: 'text', a: '640' }, { label: 'Dossier', kind: 'text', a: '750' }], corr: '<p>Fichier : 666 − 027 → 640 (rw-r-----). Dossier : 777 − 027 → 750 (rwxr-x---).</p>' },
          { q: 'c) -rw-r----- root budget paie.csv : Moussa (groupe budget) peut-il le lire ? le modifier ? Awa (hors groupe) ?', pts: 0.75, corr: '<p>Moussa (groupe, r--) : lire oui, modifier non. Awa (autres, ---) : aucun accès.</p>' },
          { q: 'd) Dossier partagé /srv/budget : seuls les membres de budget y accèdent (lecture, écriture) ; héritage du groupe ; personne ne supprime les fichiers d\'un collègue. Commandes et octal final.', pts: 1.5, fields: [{ label: 'Octal final', kind: 'text', a: '3770' }], corr: code(`mkdir -p /srv/budget
chown root:budget /srv/budget
chmod 3770 /srv/budget        # 2000 SGID + 1000 sticky + 770
ls -ld /srv/budget            # drwxrws--T root budget`) + '<p>Le T majuscule s\'affiche car les autres n\'ont pas x. Un umask 007 pour les membres est un plus.</p>' },
          { q: 'e) Moussa a rw- sur un fichier mais r-x sur le dossier. Peut-il le modifier ? Le supprimer ?', pts: 0.5, corr: '<p>Modifier : <b>oui</b> (w sur le fichier suffit). Supprimer : <b>non</b> (il faut w sur le dossier).</p>' }
        ]
      },
      {
        title: 'Comptes utilisateurs', min: 7, src: 'Plan S7 · Ex. 2',
        parts: [
          { q: 'a) Explique chaque champ de aissa:x:1003:1003:Aissa Moussa,DGI:/home/aissa:/bin/bash. Où est son mot de passe ?', pts: 1, corr: '<p>aissa = login · x = mot de passe dans /etc/shadow · 1003 = UID · 1003 = GID du groupe principal · « Aissa Moussa,DGI » = commentaire (GECOS) · /home/aissa = dossier personnel · /bin/bash = shell.</p>' },
          { q: 'b) Créer ibrahim (dossier, bash), l\'ajouter aux groupes budget et sudo sans lui retirer d\'autres groupes, mot de passe, changement obligatoire à la 1re connexion.', pts: 1, corr: code(`useradd -m -s /bin/bash ibrahim
usermod -aG budget,sudo ibrahim
passwd ibrahim
chage -d 0 ibrahim          # ou : passwd -e ibrahim`) },
          { q: 'c) Ibrahim part 3 mois en congé : bloquer sans supprimer ? Différence su - / sudo ?', pts: 1, corr: '<p><code>usermod -L ibrahim</code> (ou passwd -l), éventuellement <code>chage -E</code> avec une date ; au retour <code>usermod -U</code>. <code>su -</code> ouvre une session complète de root (mot de passe de root) ; <code>sudo</code> exécute une commande en root avec son propre mot de passe, selon /etc/sudoers, journalisée : préférable.</p>' }
        ]
      },
      {
        title: 'Processus et services', min: 7, src: 'Plan S7 · Ex. 3',
        parts: [
          { q: 'a) Trouver le PID de nginx, l\'arrêter proprement, puis de force.', pts: 0.75, corr: code(`pgrep nginx            # ou : ps aux | grep nginx
kill 1234              # SIGTERM (ou systemctl stop nginx)
kill -9 1234           # SIGKILL, en dernier recours`) },
          { q: 'b) Relancer SSH après modification et vérifier qu\'il démarrera au prochain redémarrage.', pts: 0.75, corr: code(`systemctl restart ssh   # (ou reload)
systemctl enable ssh ; systemctl is-enabled ssh`) },
          { q: 'c) Journaux d\'erreurs de postgresql depuis ce matin.', pts: 0.5, fields: [{ kind: 'code', ci: true, wide: true, a: ['journalctl -u postgresql -p err --since today', 'journalctl -p err -u postgresql --since today', 'journalctl -u postgresql --since today -p err'] }], corr: '<p><code>journalctl -u postgresql -p err --since today</code></p>' },
          { q: 'd) Processus qui consomme le plus de CPU ; lancer une sauvegarde lourde en priorité la plus basse.', pts: 0.5, corr: code(`top                      # trier par %CPU ; ou : ps aux --sort=-%cpu | head
nice -n 19 /opt/sauvegarde.sh /srv/budget`) },
          { q: 'e) Qu\'est-ce qu\'un processus zombie ?', pts: 0.5, corr: '<p>Processus terminé dont le parent n\'a pas encore lu le code de retour : il n\'utilise plus de ressources mais occupe une entrée dans la table des processus. On le fait disparaître en corrigeant ou redémarrant le parent.</p>' }
        ]
      },
      {
        title: 'Crontab', min: 6, src: 'Plan S7 · Ex. 4',
        parts: [
          { q: 'a) (1) sauvegarde tous les jours à 23 h 30 ; (2) vérif toutes les 10 min du lundi au vendredi de 7 h à 18 h ; (3) rapport le 1er de chaque mois à 6 h ; (4) purge chaque dimanche à minuit. (5 champs)', pts: 2, fields: [{ label: '(1)', kind: 'cron', a: '30 23 * * *' }, { label: '(2)', kind: 'cron', a: '*/10 7-17 * * 1-5' }, { label: '(3)', kind: 'cron', a: '0 6 1 * *' }, { label: '(4)', kind: 'cron', a: '0 0 * * 0' }], corr: code(`30 23 * * *         /opt/sauvegarde.sh
*/10 7-17 * * 1-5   /opt/verif_liens.sh
0 6 1 * *           /opt/rapport_mensuel.sh
0 0 * * 0           /opt/purge.sh`) + '<p>Pour (2), 7-17 lance jusqu\'à 17 h 50 ; 7-18 irait jusqu\'à 18 h 50 : les deux acceptées si justifiées.</p>' },
          { q: 'b) Traduis : 0 */4 * * 6,0 /opt/sync.sh et 15 3 1,15 * * /opt/stats.sh', pts: 1, corr: '<p>À la minute 0, toutes les 4 heures (0 h, 4 h … 20 h), le samedi et le dimanche. · À 3 h 15, le 1er et le 15 de chaque mois.</p>' }
        ]
      },
      {
        title: 'Écrire un script de sauvegarde', min: 12, src: 'Plan S7 · Ex. 5',
        statement: '<p>Écris /opt/sauvegarde.sh qui : (1) prend un argument (le dossier) et s\'arrête si l\'argument manque ou si le dossier n\'existe pas ; (2) crée /backup/&lt;nom&gt;_AAAA-MM-JJ.tar.gz ; (3) écrit « OK » ou « ECHEC » daté dans /var/log/sauvegarde.log ; (4) supprime les archives de plus de 7 jours. Indices : basename "$1" ; date +%F ; find /backup -name "*.tar.gz" -mtime +7 -delete.</p>',
        parts: [
          { q: 'Contrôle des arguments (argument manquant, dossier inexistant).', pts: 1, corr: code(`if [ $# -ne 1 ]; then
   echo "Usage : $0 dossier" ; exit 1
fi
if [ ! -d "$1" ]; then
   echo "Erreur : $1 n'est pas un dossier" ; exit 2
fi`) },
          { q: 'Nom de l\'archive.', pts: 1, corr: code(`NOM=$(basename "$1")
ARCHIVE="$DEST/\${NOM}_$(date +%F).tar.gz"
mkdir -p "$DEST"`) },
          { q: 'Création de l\'archive et journal OK / ECHEC.', pts: 1.5, corr: code(`if tar -czf "$ARCHIVE" "$1" 2>/dev/null; then
   echo "$(date '+%F %T') OK $ARCHIVE" >> "$LOG"
else
   echo "$(date '+%F %T') ECHEC $1" >> "$LOG"
   exit 3
fi`) },
          { q: 'Rotation des archives de plus de 7 jours.', pts: 1, corr: code(`find "$DEST" -name "*.tar.gz" -mtime +7 -delete
exit 0`) },
          { q: 'Shebang, variables (LOG, DEST), guillemets, codes de sortie, planification.', pts: 0.5, corr: '<p><code>#!/bin/bash</code>, <code>LOG=/var/log/sauvegarde.log</code>, <code>DEST=/backup</code>, variables entre guillemets, codes de sortie. Planification : <code>30 23 * * * /opt/sauvegarde.sh /srv/budget</code> ; <code>chmod +x</code>. Copie hors du serveur (rsync) et test de restauration.</p>' }
        ]
      },
      {
        title: 'Serveur Linux injoignable en SSH', min: 7, src: 'Plan S7 · Ex. 6',
        statement: '<p>Le serveur de paie (Ubuntu, 10.20.0.80) ne répond plus en SSH depuis le LAN Admin.</p>',
        parts: [
          { q: 'a) Depuis la console : commandes de vérification dans l\'ordre (IP, passerelle, service, port, pare-feu, journaux).', pts: 1, corr: '<p><code>ip a</code> (bonne IP, interface UP ?) → <code>ip route</code> (passerelle ?) → <code>ping 10.20.0.1</code> → <code>systemctl status ssh</code> → <code>ss -tlnp | grep :22</code> → <code>ufw status</code> → <code>journalctl -u ssh</code> / /var/log/auth.log.</p>' },
          { q: 'b) Fichier netplan : 10.20.0.80/23, passerelle 10.20.0.1, DNS 10.20.0.10, interface ens18 ; commande pour appliquer.', pts: 1, corr: code(`# /etc/netplan/01-reseau.yaml
network:
  version: 2
  ethernets:
    ens18:
      dhcp4: false
      addresses: [10.20.0.80/23]
      routes:
        - to: default
          via: 10.20.0.1
      nameservers:
        addresses: [10.20.0.10]
# puis : sudo netplan apply    (ou netplan try)`) },
          { q: 'c) Trois réglages pour sécuriser SSH.', pts: 1, corr: '<p>PermitRootLogin no ; authentification par clés et PasswordAuthentication no ; AllowUsers / AllowGroups ; port 22 filtré sur le seul LAN Admin ; fail2ban ; mises à jour.</p>' }
        ]
      }
    ],

    phrases: [
      'r = 4, w = 2, x = 1 ; umask retiré de 666 (fichiers) et 777 (dossiers) : 022 → 644/755, 027 → 640/750.',
      'SUID 4000 (droits du propriétaire), SGID 2000 (héritage du groupe), sticky 1000 (pas de suppression des fichiers des autres).',
      '/etc/passwd (7 champs), /etc/shadow (mots de passe), /etc/group ; usermod -aG avec le a.',
      'kill = SIGTERM 15, -9 = SIGKILL ; systemctl enable/restart/status ; journalctl -u.',
      'Crontab : minute, heure, jour du mois, mois, jour de la semaine (0 = dimanche), commande.'
    ]
  });
})();
