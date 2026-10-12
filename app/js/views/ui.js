/* Vue : composants d'interface réutilisables (montage, toasts, modales, anneaux, barres, binaire). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const ui = (App.ui = {
    root: () => document.getElementById('view'),

    /* Monte le HTML d'une page puis hydrate les widgets interactifs */
    /* opts : { wide, narrow, focus } — focus = plein écran pour la question (sans navigation) */
    mount(html, opts) {
      opts = opts || {};
      const v = ui.root();
      v.className = 'view' + (opts.wide ? ' wide' : '') + (opts.narrow ? ' narrow' : '') + (opts.focus ? ' focus' : '');
      ui.setFocus(!!opts.focus);
      v.innerHTML = html;
      ui.hydrate(v);
      if (App.layout.applyBack) App.layout.applyBack();
      return v;
    },

    setFocus(on) {
      const r = document.documentElement;
      if (on) r.dataset.focus = '1'; else delete r.dataset.focus;
      const v = ui.root();
      if (v && !on) v.classList.remove('focus');
    },

    /* Plein écran natif (Fullscreen API) quand le navigateur le permet */
    fullscreen: {
      supported() {
        const d = document;
        return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
      },
      is() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
      toggle() {
        const d = document, el = d.documentElement;
        try {
          if (ui.fullscreen.is()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
          else {
            const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
            if (p && p.catch) p.catch(() => {});
          }
        } catch (e) { /* refus du navigateur : on ignore */ }
      }
    },

    /* Contrôles « Affichage » réutilisés par le profil et l'écran d'accueil du premier lancement */
    typoControls() {
      const st = App.store.state.settings;
      const fonts = [['nunito', 'Nunito', 'ronde et chaleureuse'], ['lexend', 'Lexend', 'conçue pour lire plus vite'], ['system', 'Système', 'police de l\'appareil']];
      const sizes = [['s', 'A', '.85rem'], ['m', 'A', '1rem'], ['l', 'A', '1.2rem'], ['xl', 'A', '1.4rem']];
      return `<div class="typo-ctl">
        <div><div class="lbl">Police</div><div class="font-pick">${fonts.map(([k, n, d]) => `<button type="button" data-font="${k}" class="${(st.font || 'nunito') === k ? 'on' : ''}"><span class="fp-a fp-${k}">Aa</span><span><b>${n}</b><small>${d}</small></span></button>`).join('')}</div></div>
        <div><div class="lbl">Taille du texte</div><div class="seg size-pick">${sizes.map(([k, a, fs]) => `<button type="button" data-size="${k}" class="${(st.textSize || 'm') === k ? 'on' : ''}" style="font-size:${fs}" aria-label="Taille ${k.toUpperCase()}">${a}</button>`).join('')}</div></div>
      </div>`;
    },
    bindTypo(root) {
      const st = App.store.state.settings;
      U.$$('[data-font]', root).forEach((b) => b.addEventListener('click', () => { st.font = b.dataset.font; App.store.save(); ui.applyTypo(); U.$$('[data-font]', root).forEach((x) => x.classList.toggle('on', x === b)); }));
      U.$$('[data-size]', root).forEach((b) => b.addEventListener('click', () => { st.textSize = b.dataset.size; App.store.save(); ui.applyTypo(); U.$$('[data-size]', root).forEach((x) => x.classList.toggle('on', x === b)); }));
    },

    /* Police et taille du texte (réglages du profil) */
    applyTypo() {
      const st = App.store.state.settings;
      const r = document.documentElement;
      r.dataset.font = st.font || 'nunito';
      r.style.setProperty('--fsr', { s: 0.9375, m: 1, l: 1.1, xl: 1.2 }[st.textSize || 'm'] || 1);
    },

    hydrate(root) {
      if (App.widgets) App.widgets.hydrate(root);
      U.$$('.reveal-btn', root).forEach((b) => {
        if (b._bound) return;
        b._bound = true;
        b.addEventListener('click', () => {
          const box = b.closest('.reveal');
          box.classList.toggle('on');
          b.textContent = box.classList.contains('on') ? 'Masquer' : 'Voir la réponse';
        });
      });
    },

    toast(icon, html, kind, ms) {
      let wrap = document.querySelector('.toasts');
      if (!wrap) {
        wrap = U.el('<div class="toasts" aria-live="polite"></div>');
        document.body.appendChild(wrap);
      }
      const t = U.el(`<div class="toast ${kind || ''}"><div class="ti">${icon}</div><div>${html}</div></div>`);
      wrap.appendChild(t);
      setTimeout(() => {
        t.classList.add('out');
        setTimeout(() => t.remove(), 320);
      }, ms || 3200);
    },

    modal(html, opts) {
      opts = opts || {};
      const bg = U.el(`<div class="modal-bg"><div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`);
      const close = () => {
        bg.remove();
        document.removeEventListener('keydown', onKey);
        if (opts.onClose) opts.onClose();
      };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      bg.addEventListener('click', (e) => {
        if (e.target === bg && !opts.locked) close();
        if (e.target.closest('[data-close]')) close();
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(bg);
      ui.hydrate(bg);
      const btn = bg.querySelector('.btn.primary');
      if (btn) setTimeout(() => btn.focus(), 50);
      return { el: bg, close };
    },

    confirm(html, okLabel, onOk, danger) {
      const m = ui.modal(`${html}<div class="row mt2" style="justify-content:flex-end"><button class="btn ghost" data-close>Annuler</button><button class="btn ${danger ? 'ko' : 'primary'}" data-ok>${okLabel}</button></div>`);
      m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); onOk(); });
      return m;
    },

    ring(pct, size, stroke, color, label) {
      size = size || 64; stroke = stroke || 7;
      const r = (size - stroke) / 2, c = 2 * Math.PI * r;
      const off = c * (1 - U.clamp(pct || 0, 0, 1));
      return `<span class="ring" style="width:${size}px;height:${size}px">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
          <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color || 'var(--primary)'}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
        </svg><span class="ring-label" style="font-size:${Math.max(11, size / 4.6)}px">${label != null ? label : Math.round((pct || 0) * 100) + '%'}</span></span>`;
    },

    bar(pct, cls) {
      return `<div class="bar ${cls || ''}"><i style="width:${Math.round(U.clamp(pct || 0, 0, 1) * 100)}%"></i></div>`;
    },

    /* Binaire coloré d'une adresse 32 bits selon un préfixe */
    bits32(n, prefix, opts) {
      return App.md.bits(App.ip.bin(n), prefix, opts);
    },

    modIcon(m) {
      return `<span class="m-ico" style="--mc:${m.color}">${m.icon}</span>`;
    },

    /* Applique le thème (auto = préférence du système) */
    applyTheme() {
      const pref = App.store.state.settings.theme;
      const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name=theme-color]');
      if (meta) meta.setAttribute('content', dark ? '#0b0e1d' : '#5b4bff');
    },

    /* Petite aide : bouton « retour » cohérent */
    crumbs(items) {
      const lk = items.filter((i) => i[1]);
      if (lk.length && App.layout.setBack) App.layout.setBack(lk[lk.length - 1][1]);
      return '<div class="crumbs">' + items.map((i) => (i[1] ? `<a href="${i[1]}">${i[0]}</a>` : `<span>${i[0]}</span>`)).join(' › ') + '</div>';
    },

    /* Lier des raccourcis clavier pour la page courante */
    keys(map) {
      const h = (e) => {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.key !== 'Enter' && e.key !== 'Escape') return;
        if (e.target && /^(BUTTON|A|SUMMARY)$/.test(e.target.tagName) && (e.key === 'Enter' || e.key === ' ')) return; // activation native
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const fn = map[e.key] || map[e.key.toLowerCase()];
        if (fn) { fn(e); }
      };
      document.addEventListener('keydown', h);
      const off = () => document.removeEventListener('keydown', h);
      App.router.onLeave(off);
      return off;
    }
  });
})();
