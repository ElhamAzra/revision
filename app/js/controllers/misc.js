/* Contrôleurs : labs interactifs, fiche dernière heure, glossaire, recherche, profil & réglages. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const R = App.router;

  const LABS = [
    { id: 'bits8', icon: '🔢', title: 'L\'octet interactif', desc: 'Allume les bits, vois le décimal et l\'hexa. Défis de composition.', mod: 'm0' },
    { id: 'masks', icon: '🪜', title: 'Échelle des masques', desc: 'Les 8 valeurs à connaître et leur bloc.', mod: 'm0' },
    { id: 'ipviz', icon: '🔬', title: 'Visualiseur de sous-réseau', desc: 'ET logique en couleur + méthode du nombre magique, curseur de préfixe.', mod: 's1' },
    { id: 'vlsm', icon: '🏗️', title: 'Planificateur VLSM', desc: 'Vérifie tes plans d\'adressage, avec la carte d\'allocation.', mod: 's1' },
    { id: 'summ', icon: '🧲', title: 'Agrégation de routes', desc: 'Bits communs et détection de sur-agrégation.', mod: 's1' },
    { id: 'ipv6', icon: '🛰️', title: 'Atelier IPv6', desc: 'Compression, type d\'adresse, EUI-64 pas à pas.', mod: 's1' },
    { id: 'switchsim', icon: '🔀', title: 'Simulateur de switch', desc: 'Apprentissage des MAC, filtrage et inondation en direct.', mod: 's3' },
    { id: 'stp', icon: '🌳', title: 'Élection STP', desc: 'Calcule le pont racine et les rôles des ports.', mod: 's3' },
    { id: 'tcpcalc', icon: '🤝', title: 'Calculateur TCP', desc: 'Numéros de séquence / ACK et débit fenêtre ÷ RTT.', mod: 's4' },
    { id: 'aclsim', icon: '🧱', title: 'Simulateur d\'ACL', desc: 'Teste un paquet contre une ACL : première correspondance, deny implicite.', mod: 's5' },
    { id: 'db', icon: '📡', title: 'Décibels & bilan de liaison', desc: 'Convertisseur dB / dBm / mW et bilan radio.', mod: 's6' },
    { id: 'voip', icon: '☎️', title: 'Bande passante VoIP', desc: 'G.711 / G.729, en-têtes, nombre d\'appels.', mod: 's6' },
    { id: 'chmod', icon: '🔐', title: 'Calculateur chmod', desc: 'Cases rwx ↔ octal ↔ symbolique, droits spéciaux.', mod: 's7' },
    { id: 'cron', icon: '⏰', title: 'Traducteur crontab', desc: 'Lis une ligne cron en français.', mod: 's7' },
    { id: 'raid', icon: '💽', title: 'Calculateur RAID', desc: 'Capacité utile et pannes tolérées.', mod: 's8' }
  ];
  App.labs = LABS;

  R.add('/labs', () => {
    App.layout.setTitle('Labs interactifs');
    const groups = {};
    LABS.forEach((l) => (groups[l.mod] = groups[l.mod] || []).push(l));
    App.ui.mount(`<div class="page-head"><h1>🧪 Labs interactifs</h1><div class="sub">Manipule pour comprendre : chaque outil montre le calcul, pas seulement le résultat.</div></div>
      ${Object.entries(groups).map(([mid, ls]) => { const m = App.content.mod(mid); return `<h3 class="mt2" style="color:${m ? m.color : ''}">${m ? m.icon + ' ' + (m.short || m.title) : ''}</h3><div class="grid auto">${ls.map((l) => `<a class="card hover" href="#/lab/${l.id}" style="color:inherit;text-decoration:none"><div class="row nowrap"><span style="font-size:1.7rem">${l.icon}</span><div class="grow"><b>${l.title}</b><div class="small muted">${l.desc}</div></div></div></a>`).join('')}</div>`; }).join('')}`);
  });

  R.add('/lab/:id', (p) => {
    const l = LABS.find((x) => x.id === p.id);
    if (!l) return R.go('/labs');
    App.layout.setTitle(l.title);
    App.ui.mount(`${App.ui.crumbs([['Labs', '#/labs'], [l.title]])}<div class="page-head"><h1>${l.icon} ${l.title}</h1><div class="sub">${l.desc}</div></div><div data-w="${l.id}"></div>
      <div class="row mt2"><a class="btn" href="#/labs">◀ Tous les labs</a>${App.gen.forModule(l.mod).length ? `<a class="btn soft" href="#/cours/${l.mod}?tab=pratique">S'entraîner sur ce thème ▶</a>` : ''}</div>`);
  });

  /* ---------- Fiche dernière heure ---------- */
  R.add('/fiche', () => {
    App.layout.setTitle('Fiche dernière heure');
    const f = App.content.extras.fiche;
    App.ui.mount(`<div class="page-head"><h1>⚡ Fiche « dernière heure »</h1><div class="sub">À relire le matin du concours. Imprimable (Ctrl + P).</div></div>
      ${f ? f.map((s) => `<div class="card mt2"><h2>${s.title}</h2><div class="prose">${s.html}</div></div>`).join('') : '<p class="muted">Fiche indisponible.</p>'}
      ${App.content.extras.reflexes ? `<div class="card mt2"><h2>🧭 Le jour J : 8 réflexes</h2><ol class="steps">${App.content.extras.reflexes.map((r) => `<li>${r}</li>`).join('')}</ol></div>` : ''}
      <div class="row mt2"><button class="btn" onclick="window.print()">🖨️ Imprimer</button></div>`);
  });

  /* ---------- Glossaire ---------- */
  R.add('/glossaire', (p, query) => {
    App.layout.setTitle('Glossaire');
    const g = App.content.extras.glossary.slice().sort((a, b) => U.norm(a[0]).localeCompare(U.norm(b[0])));
    const v = App.ui.mount(`<div class="page-head"><h1>🔤 Glossaire</h1><div class="sub">${g.length} sigles et termes, de AAA à WPA3.</div></div>
      <input class="input" id="gq" placeholder="Filtrer : OSPF, DHCP, RAID…" value="${U.esc(decodeURIComponent(query.q || ''))}">
      <div id="gl" class="mt2"></div>`);
    const draw = () => {
      const t = U.norm(v.querySelector('#gq').value);
      const list = g.filter((x) => !t || U.norm(x[0] + ' ' + x[1]).includes(t));
      v.querySelector('#gl').innerHTML = list.length ? App.md.table(['Terme', 'Définition'], list.map((x) => [`<b>${x[0]}</b>`, x[1]])) : '<p class="muted">Aucun résultat.</p>';
    };
    v.querySelector('#gq').addEventListener('input', draw);
    draw();
  });

  /* ---------- Recherche ---------- */
  R.add('/recherche', (p, query) => {
    App.layout.setTitle('Recherche');
    const v = App.ui.mount(`<div class="page-head"><h1>🔎 Recherche</h1></div>
      <input class="input" id="sq" placeholder="ex. : wildcard, DORA, SUID, Shannon, RODC…" value="${U.esc(decodeURIComponent(query.q || ''))}" autofocus>
      <div class="search-res mt2" id="sr"></div>`);
    const draw = () => {
      const q = v.querySelector('#sq').value;
      const res = App.content.search(q);
      const terms = U.norm(q).split(' ').filter((t) => t.length > 1);
      const hl = (s) => {
        let out = U.esc(s);
        terms.forEach((t) => { out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
        return out;
      };
      v.querySelector('#sr').innerHTML = !q.trim() ? '<p class="muted">Tape un mot-clé pour chercher dans les leçons, les cartes et le glossaire.</p>' : res.length ? res.map((r) => `<a href="${r.href}"><div class="row between"><b>${hl(r.title)}</b><span class="chip">${r.kind}</span></div><div class="tiny muted">${r.sub || ''}</div><div class="small mt1">${hl(r.snippet)}</div></a>`).join('') : '<p class="muted">Aucun résultat.</p>';
    };
    v.querySelector('#sq').addEventListener('input', U.debounce(draw, 150));
    draw();
    setTimeout(() => v.querySelector('#sq').focus(), 50);
  });

  /* ---------- Profil, badges, réglages, sauvegarde ---------- */
  R.add('/profil', () => {
    App.layout.setTitle('Profil');
    const st = App.store.state;
    const L = App.game.level();
    const tot = App.progress.totals();
    const days = [];
    for (let i = 13; i >= 0; i--) days.push(U.addDays(U.dayKey(), -i));
    const maxXp = Math.max(1, ...days.map((d) => (st.daily[d] || {}).xp || 0));
    const v = App.ui.mount(`
      <div class="page-head"><h1>👤 Profil & réglages</h1></div>
      <div class="card pad-lg">
        <div class="row nowrap">
          ${App.ui.ring(L.pct, 96, 9, 'var(--primary)', `${L.level}<small>niveau</small>`)}
          <div class="grow"><h2 class="mb0">${L.title}</h2><div class="muted">${U.fmtNum(st.xp)} XP · prochain niveau à ${U.fmtNum(L.next)} XP</div>
          <div class="row mt1"><span class="chip acc">🔥 série ${App.game.streakNow()} j (record ${st.streak.best})</span><span class="chip ok">${Object.keys(st.badges).length}/${App.game.BADGES.length} badges</span></div></div>
        </div>
      </div>
      <div class="grid k4 mt2">
        <div class="card kpi"><span class="ico">✅</span><div><div class="v">${U.fmtNum(tot.answered)}</div><div class="l">réponses</div></div></div>
        <div class="card kpi"><span class="ico">🎯</span><div><div class="v">${tot.answered ? Math.round((tot.correct / tot.answered) * 100) : 0} %</div><div class="l">de réussite</div></div></div>
        <div class="card kpi"><span class="ico">📖</span><div><div class="v">${tot.lessons}/${App.content.lessonCount()}</div><div class="l">leçons</div></div></div>
        <div class="card kpi"><span class="ico">🃏</span><div><div class="v">${U.fmtNum(st.counters.cardsReviewed || 0)}</div><div class="l">cartes révisées</div></div></div>
      </div>
      <div class="card mt2"><h3>📅 Activité (14 jours)</h3>
        <div style="display:flex;align-items:flex-end;gap:5px;height:110px;margin-top:.6rem">${days.map((d) => { const x = (st.daily[d] || {}).xp || 0; return `<div title="${U.fmtDay(d)} : ${x} XP" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px;height:100%"><div style="width:100%;border-radius:6px 6px 3px 3px;background:${(st.daily[d] || {}).goalHit ? 'linear-gradient(180deg,#ff7a1a,#ff4d6d)' : 'var(--primary)'};opacity:${x ? 1 : .15};height:${Math.max(4, (x / maxXp) * 90)}%"></div><span class="tiny muted">${U.parseDay(d).getDate()}</span></div>`; }).join('')}</div>
        <div class="tiny muted mt1">Orange = objectif du jour atteint.</div></div>
      <div class="card mt2"><h3>📊 Maîtrise par module</h3>${App.content.modules.map((m) => `<div class="row nowrap mt1"><span style="width:1.6rem">${m.icon}</span><span class="small" style="width:9rem">${m.short || m.title}</span><div class="grow">${App.ui.bar(App.progress.mastery(m.id))}</div><span class="small mono" style="width:3rem;text-align:right">${Math.round(App.progress.mastery(m.id) * 100)}%</span></div>`).join('')}</div>
      <h2 class="mt3">🏅 Badges</h2>
      <div class="badge-grid">${App.game.BADGES.map((b) => `<div class="bdg ${st.badges[b.id] ? '' : 'off'}"><div class="e">${b.e}</div><div class="n">${b.n}</div><div class="d">${b.d}</div></div>`).join('')}</div>
      <h2 class="mt3">⚙️ Réglages</h2>
      <div class="card stack" id="typoBox">
        <h3 class="mb0">🎨 Affichage et lecture</h3>
        ${App.ui.typoControls()}
        <div class="row"><span class="set-lbl">Menu sur ordinateur :</span><div class="seg" id="sNav">${[['auto', 'Automatique'], ['full', 'Complet'], ['rail', 'Replié (icônes)']].map(([k, l]) => `<button data-n="${k}" class="${(st.settings.nav || 'auto') === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div class="row"><span class="set-lbl">Thème :</span><div class="seg" id="sTheme">${[['auto', '🌗 Auto'], ['light', '☀️ Clair'], ['dark', '🌙 Sombre']].map(([k, l]) => `<button data-t="${k}" class="${st.settings.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        ${App.ui.fullscreen.supported() ? '<div class="row"><span class="set-lbl">Plein écran :</span><button class="btn sm" id="sFs">⛶ Activer / quitter (touche F)</button></div>' : ''}
      </div>
      <div class="card stack mt2">
        <div class="grid c2">
          <div><label class="lbl">Ton prénom (affiché sur l'accueil)</label><input class="input" id="sName" value="${U.esc(st.settings.name)}"></div>
          <div><label class="lbl">Date du concours</label><input class="input" type="date" id="sDate" value="${st.settings.examDate}"></div>
          <div><label class="lbl">Objectif quotidien (XP)</label><select class="input" id="sGoal">${[100, 150, 200, 300, 400, 600].map((x) => `<option ${x === st.settings.dailyGoal ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div><label class="lbl">Nouvelles cartes par session</label><select class="input" id="sNew">${[10, 15, 20, 30, 50].map((x) => `<option ${x === st.settings.newCardsPerSession ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        </div>
        <label class="switch"><input type="checkbox" id="sSound" ${st.settings.sound ? 'checked' : ''}> Sons de réussite / erreur</label>
      </div>
      <h2 class="mt3">💾 Sauvegarde de ma progression</h2>
      <div class="card stack" id="bkBox">
        <p class="small muted mb0">${App.store.persistent ? 'Ta progression est enregistrée automatiquement dans ce navigateur, sur cet appareil.' : '⚠️ Le stockage local est bloqué dans ce navigateur : télécharge une sauvegarde à la fin de chaque séance.'} Une <b>sauvegarde en fichier</b> te protège si le navigateur est nettoyé, et permet de passer du PC au téléphone (et inversement).</p>
        <div class="bk-status"><span>🕒</span><div>Dernière sauvegarde : <b>${App.backup.lastLabel()}</b></div></div>
        <div class="row"><button class="btn primary" id="exp">💾 Sauvegarder maintenant</button><button class="btn" id="imp">📂 Restaurer une sauvegarde</button><span class="grow"></span><button class="btn ghost" id="rst">Réinitialiser…</button></div>
        <div class="row"><span class="set-lbl">Me rappeler :</span>${App.backup.everyControl()}</div>
        <div class="tiny muted">Sur ordinateur, tu peux aussi glisser-déposer un fichier de sauvegarde sur la fenêtre. Sur téléphone, le fichier arrive dans « Téléchargements » : envoie-le-toi (WhatsApp, e-mail) pour le garder ailleurs.</div>
      </div>
      <a class="card hover mt2 row nowrap" href="#/apropos" style="color:inherit;text-decoration:none"><span style="font-size:1.6rem">ℹ️</span><div class="grow"><b>À propos de l'application</b><div class="small muted">Développeur, contact, sources et méthodes · version ${App.version}</div></div><span class="muted">›</span></a>`);
    const set = (k, val) => { st.settings[k] = val; App.store.save(); App.layout.refresh(); };
    v.querySelector('#sName').addEventListener('input', (e) => set('name', e.target.value.trim()));
    v.querySelector('#sDate').addEventListener('change', (e) => e.target.value && set('examDate', e.target.value));
    v.querySelector('#sGoal').addEventListener('change', (e) => set('dailyGoal', +e.target.value));
    v.querySelector('#sNew').addEventListener('change', (e) => set('newCardsPerSession', +e.target.value));
    v.querySelector('#sSound').addEventListener('change', (e) => { set('sound', e.target.checked); if (e.target.checked) App.fx.sound('ok'); });
    U.$$('#sTheme button').forEach((b) => b.addEventListener('click', () => { set('theme', b.dataset.t); App.ui.applyTheme(); U.$$('#sTheme button').forEach((x) => x.classList.toggle('on', x === b)); }));
    App.ui.bindTypo(v.querySelector('#typoBox'));
    U.$$('#sNav button').forEach((b) => b.addEventListener('click', () => { set('nav', b.dataset.n); App.layout.applyNav(); U.$$('#sNav button').forEach((x) => x.classList.toggle('on', x === b)); }));
    const fsb = v.querySelector('#sFs');
    if (fsb) fsb.addEventListener('click', () => App.ui.fullscreen.toggle());
    v.querySelector('#exp').addEventListener('click', () => { App.backup.download(); v.querySelector('.bk-status b').textContent = App.backup.lastLabel(); });
    v.querySelector('#imp').addEventListener('click', () => App.backup.pick());
    App.backup.bindEvery(v.querySelector('#bkBox'));
    v.querySelector('#rst').addEventListener('click', () => App.ui.confirm('<h3>Tout réinitialiser ?</h3><p>XP, cartes, erreurs, badges et réglages seront effacés. Pense à exporter avant.</p>', 'Réinitialiser', () => { App.store.reset(); App.ui.applyTheme(); App.ui.applyTypo(); App.layout.applyNav(); App.layout.refresh(); R.go('/'); setTimeout(App.home.onboard, 300); }, true));
  });

  /* ---------- À propos & développeur ---------- */
  R.add('/apropos', () => {
    App.layout.setTitle('À propos');
    const D = App.DEV;
    const nm = App.backup.name();
    const ex = App.store.state.settings.examDate;
    const dl = U.daysBetween(U.dayKey(), ex);
    App.ui.mount(`
      <div class="page-head"><h1>ℹ️ À propos</h1><div class="sub">Révision Concours MEF Niger — option Systèmes &amp; Réseaux · version ${App.version}</div></div>
      <section class="luck">
        <div class="luck-clover">🍀</div>
        <div>
          <div class="luck-t">Bonne chance pour le concours${nm ? ', ' + nm : ''}&nbsp;!</div>
          <p class="mb0">${dl > 0 ? `Encore <b>${dl} jour${dl > 1 ? 's' : ''}</b> : chaque séance compte. ` : dl === 0 ? 'C\'est le jour J : respire, lis tout le sujet et commence par ce que tu maîtrises. ' : ''}Révise un peu chaque jour, refais tes erreurs, dors bien la veille. Tu as toutes les clés pour réussir. 💪</p>
        </div>
      </section>
      <div class="grid c2 mt2">
        <div class="card dev-card">
          <div class="dev-head"><span class="dev-av">${D.initials}</span><div><div class="tiny muted dev-role">Développeur de l'application</div><h2 class="mb0">${D.name}</h2></div></div>
          <div class="dev-links mt2">
            <a class="dev-link" href="mailto:${D.email}?subject=${encodeURIComponent('Application Révision MEF')}"><span>✉️</span><div><small>E-mail</small><b>${D.email}</b></div></a>
            <a class="dev-link" href="tel:${D.phone}"><span>📞</span><div><small>Téléphone</small><b>${D.phoneDisplay}</b></div></a>
            <a class="dev-link" href="https://wa.me/${D.phone.replace('+', '')}" target="_blank" rel="noopener"><span>💬</span><div><small>WhatsApp</small><b>${D.phoneDisplay}</b></div></a>
          </div>
          <p class="small muted mt2 mb0">Une question, une erreur dans un cours ou une idée d'amélioration ? Écris-moi : ça aide aussi les prochains candidats.</p>
        </div>
        <div class="card">
          <h3>📚 L'application</h3>
          <ul class="small mb0" style="padding-left:1.1rem">
            <li><b>100 % hors ligne</b> : un seul fichier, rien à installer, aucune donnée envoyée sur Internet.</li>
            <li><b>Sources</b> : plan « Concours MEF Niger — 9 séances » et supports de cours de l'ESTN (M. M. Maazou), complétés et vérifiés ; les erreurs relevées dans les supports sont signalées.</li>
            <li><b>Méthodes</b> : rappel actif, répétition espacée, pré-test, alternance des thèmes, exemples résolus pas à pas, carnet d'erreurs.</li>
            <li><b>Contenu</b> : ${App.content.lessonCount()} leçons, ${Object.keys(App.content.cards).length} cartes, ${App.gen.list.length} générateurs d'exercices infinis, ${App.labs ? App.labs.length : 15} labs, examens blancs.</li>
            <li><b>Polices</b> : Lexend, Nunito, JetBrains Mono (licence SIL Open Font License 1.1).</li>
            <li><b>Confidentialité</b> : ta progression reste sur ton appareil ; seules tes sauvegardes en fichier la transportent.</li>
          </ul>
        </div>
      </div>
      <p class="center small muted mt3">© ${new Date().getFullYear()} ${D.name} · Fait avec ❤️ pour les candidats du concours MEF.</p>`);
  });
})();
