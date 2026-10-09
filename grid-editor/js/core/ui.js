/* ============================================================================
 *  HELPERS D'INTERFACE — App.ui
 *    el(tag, attrs, ...enfants)   créer un élément
 *    icon(nom)                    icône SVG (App.ui.icons est extensible)
 *    itemImage(def)               <img> d'un item avec repli si introuvable
 *    toast(msg, type)             notification ('info' | 'success' | 'warn' | 'error')
 *    dialog({...}) → Promise      boîte de dialogue modale
 *    confirm(titre, message)      → Promise<boolean>
 * ========================================================================== */
(function (App) {
  'use strict';

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (k === 'html') node.innerHTML = v;
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  /* ------------------------------------------------------------ Icônes -- */
  const icons = {
    save:     '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h8V3"/><rect x="8" y="13" width="8" height="6"/>',
    open:     '<path d="M3 6h6l2 2h10v11H3z"/>',
    file:     '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    grid:     '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
    'rotate-cw':  '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>',
    'rotate-ccw': '<path d="M4 12a8 8 0 1 0 2.34-5.66"/><path d="M4 4v5h5"/>',
    move:     '<path d="M12 3v18M3 12h18"/><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    trash:    '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    copy:     '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>',
    undo:     '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/>',
    redo:     '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h4"/>',
    help:     '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><path d="M12 17.5v.01"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    search:   '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    x:        '<path d="M6 6l12 12M18 6L6 18"/>',
    swap:     '<path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/>',
    layers:   '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    box:      '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    info:     '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    'zoom-in':  '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6M11 8v6"/>',
    'zoom-out': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
    fit:      '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    hand:     '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V5.5a1.5 1.5 0 0 1 3 0V12M17 10a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.6 15a1.5 1.5 0 0 1 2.3-1.9L8 15"/>',
    'select-all': '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  };

  function icon(name) {
    const span = document.createElement('span');
    span.className = 'icon';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
      `stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.info}</svg>`;
    return span;
  }

  /* ---------------------------------------------------- Image d'item -- */
  function itemImage(def) {
    const fallback = () =>
      el('span', { class: 'item-fallback', title: def.name },
        (def.name || '?').slice(0, 2).toUpperCase());
    if (!def.image) return fallback();
    const img = el('img', { src: def.image, alt: def.name, draggable: 'false', loading: 'lazy' });
    img.addEventListener('error', () => img.replaceWith(fallback()), { once: true });
    return img;
  }

  /* ------------------------------------------------------------ Toasts -- */
  function toast(message, type = 'info', duration = 2800) {
    const host = document.getElementById('toasts');
    if (!host) { console.log(`[toast] ${message}`); return; }
    const t = el('div', { class: `toast toast-${type}`, role: 'status' }, message);
    host.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 250);
    }, duration);
  }

  /* ----------------------------------------------------------- Dialogs -- */
  /**
   * buttons : [{ label, value, primary?, danger? }]
   *   value peut être une fonction (appelée à la fermeture).
   *   Le bouton primary soumet le formulaire (validation HTML native).
   * Résout avec la valeur du bouton, ou null si annulé (Échap, ✕, fond).
   */
  function dialog({ title, content, buttons, className = '', onOpen } = {}) {
    buttons = buttons || [{ label: 'OK', value: true, primary: true }];
    return new Promise((resolve) => {
      const val = (b) => (typeof b.value === 'function' ? b.value() : b.value);
      const form = el('form', { method: 'dialog', class: 'dialog-form', novalidate: false });
      const dlg = el('dialog', { class: `dialog ${className}` }, form);
      let done = false;

      function close(value) {
        if (done) return;
        done = true;
        dlg.close();
        dlg.remove();
        resolve(value);
      }

      form.append(
        el('header', { class: 'dialog-header' },
          el('h2', null, title || ''),
          el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Fermer', onclick: () => close(null) }, icon('x'))),
        el('div', { class: 'dialog-body' }, content || null),
        el('footer', { class: 'dialog-footer' },
          buttons.map((b) =>
            el('button', {
              type: b.primary ? 'submit' : 'button',
              class: `btn${b.primary ? ' btn-primary' : ''}${b.danger ? ' btn-danger' : ''}`,
              onclick: b.primary ? null : () => close(val(b)),
            }, b.label))),
      );

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const primary = buttons.find((b) => b.primary);
        close(primary ? val(primary) : true);
      });
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(null); });
      dlg.addEventListener('pointerdown', (e) => { if (e.target === dlg) close(null); });

      document.body.append(dlg);
      dlg.showModal();
      if (onOpen) onOpen(dlg);
    });
  }

  function confirm(title, message, { okLabel = 'Confirmer', danger = false } = {}) {
    return dialog({
      title,
      content: el('p', null, message),
      buttons: [
        { label: 'Annuler', value: false },
        { label: okLabel, value: true, primary: true, danger },
      ],
    }).then((v) => v === true);
  }

  /* Boutons liés à une commande : data-command="id" → désactivés auto. */
  App.on('refresh', () => {
    document.querySelectorAll('[data-command]').forEach((b) => {
      b.disabled = !App.isEnabled(b.dataset.command);
    });
  });

  /* Empêche le « drag » natif des images du navigateur. */
  document.addEventListener('dragstart', (e) => {
    if (e.target instanceof HTMLImageElement) e.preventDefault();
  });

  App.ui = { el, icon, icons, itemImage, toast, dialog, confirm };
})(window.App);
