/* ============================================================================
 *  BARRE DU HAUT — menus déroulants, boutons, indicateurs de statut.
 *  Tout est construit depuis les registres App.menus / App.menuItems /
 *  App.toolbar / App.statusItems : ce fichier n'a pas à être modifié pour
 *  ajouter un menu ou un bouton.
 * ========================================================================== */
App.module({
  id: 'ui.topbar',

  start(App) {
    const { el, icon } = App.ui;
    const root = document.getElementById('topbar');

    const menubar = el('nav', { class: 'menubar', role: 'menubar' });
    const toolbar = el('div', { class: 'toolbar' });
    const status = el('div', { class: 'status' });

    root.append(
      el('div', { class: 'brand' }, el('span', { class: 'brand-mark' }, icon('grid')),
        el('span', { class: 'brand-name' }, CONFIG.appName)),
      menubar,
      el('div', { class: 'topbar-sep' }),
      toolbar,
      el('div', { class: 'spacer' }),
      status,
    );

    /* Les boutons de barre ne prennent pas le focus à la souris : ainsi
       Espace / Suppr continuent d'agir sur l'item sélectionné. */
    root.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) e.preventDefault();
    });

    const shortcut = (cmd) => (cmd.keys && cmd.keys.length ? App.keys.format(cmd.keys[0]) : '');

    /* ------------------------------------------------------ Menus -- */
    let openId = null;

    function openMenu(id) {
      openId = id;
      menubar.querySelectorAll('.menu').forEach((m) => {
        const isOpen = m.dataset.menu === id;
        m.classList.toggle('open', isOpen);
        m.querySelector('.menu-btn').setAttribute('aria-expanded', String(isOpen));
      });
    }
    const closeMenus = () => openMenu(null);

    function renderEntry(entry) {
      const cmd = App.commands.get(entry.command);
      const b = el('button', {
        type: 'button', class: 'dropdown-item', role: 'menuitem',
        dataset: { command: cmd.id },
      },
      el('span', { class: 'dropdown-icon' }, cmd.icon ? icon(cmd.icon) : null),
      el('span', { class: 'dropdown-label' }, entry.label || cmd.label),
      el('kbd', null, shortcut(cmd)));
      b.addEventListener('click', () => { closeMenus(); App.run(cmd.id); });
      return b;
    }

    function renderMenus() {
      menubar.replaceChildren();
      for (const menu of App.menus.list()) {
        const entries = App.menuItems.list((e) => e.menu === menu.id && App.commands.has(e.command));
        if (!entries.length) continue; // menu vide = masqué

        const dropdown = el('div', { class: 'dropdown', role: 'menu' });
        let group;
        entries.forEach((entry, i) => {
          if (i > 0 && entry.group !== group) dropdown.append(el('div', { class: 'dropdown-sep', role: 'separator' }));
          group = entry.group;
          dropdown.append(renderEntry(entry));
        });

        const btn = el('button', {
          type: 'button', class: 'menu-btn', 'aria-haspopup': 'true', 'aria-expanded': 'false',
        }, menu.label);
        btn.addEventListener('click', () => openMenu(openId === menu.id ? null : menu.id));
        btn.addEventListener('pointerenter', () => { if (openId && openId !== menu.id) openMenu(menu.id); });

        menubar.append(el('div', { class: 'menu', dataset: { menu: menu.id } }, btn, dropdown));
      }
      if (openId) openMenu(openId);
      App.requestRefresh();
    }

    document.addEventListener('pointerdown', (e) => {
      if (openId && !e.target.closest('.menubar')) closeMenus();
    });
    window.addEventListener('keydown', (e) => {
      if (openId && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenus(); }
    }, true);
    window.addEventListener('blur', closeMenus);

    /* ---------------------------------------------------- Toolbar -- */
    function renderToolbar() {
      toolbar.replaceChildren(
        ...App.toolbar.list((t) => App.commands.has(t.command)).map((t) => {
          const cmd = App.commands.get(t.command);
          const label = t.label || cmd.shortLabel || cmd.label;
          const key = shortcut(cmd);
          return el('button', {
            type: 'button', class: `tool-btn${t.showLabel ? ' with-label' : ''}`,
            title: key ? `${label} (${key})` : label, 'aria-label': label,
            dataset: { command: cmd.id }, onclick: () => App.run(cmd.id),
          }, cmd.icon ? icon(cmd.icon) : null, t.showLabel ? el('span', null, label) : null);
        }),
      );
      App.requestRefresh();
    }

    /* ----------------------------------------------------- Statut -- */
    function renderStatus() {
      status.replaceChildren(
        ...App.statusItems.list().map((s) => {
          try { return s.render(App); } catch (err) { console.error(err); return null; }
        }).filter(Boolean),
      );
    }

    renderMenus();
    renderToolbar();
    renderStatus();
    App.on('registry:menus', renderMenus);
    App.on('registry:menuItems', renderMenus);
    App.on('registry:commands', () => { renderMenus(); renderToolbar(); });
    App.on('registry:toolbar', renderToolbar);
    App.on('registry:statusItems', renderStatus);
  },
});
