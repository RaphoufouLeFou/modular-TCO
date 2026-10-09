/* ============================================================================
 *  MENU DU BAS — infos de l'item sélectionné + actions (App.itemActions).
 * ========================================================================== */
App.module({
  id: 'ui.bottombar',

  start(App) {
    const { el, icon } = App.ui;
    const root = document.getElementById('bottombar');
    const info = el('div', { class: 'sel-info' });
    const actions = el('div', { class: 'sel-actions', role: 'toolbar', 'aria-label': "Actions sur l'item" });
    root.append(info, actions);

    // les boutons ne volent pas le focus (Espace/Suppr restent actifs)
    root.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });

    function renderInfo() {
      const it = App.selectedItem();
      root.classList.toggle('has-selection', !!it);
      if (!it) {
        info.replaceChildren(el('span', { class: 'hint' },
          'Glissez un item depuis la gauche · cliquez ou encadrez des items pour les sélectionner'));
        return;
      }
      const def = App.model.getDef(it.id);
      const moving = App.getMode() === 'move';
      const moveHint = moving ? el('span', { class: 'mode-hint' }, 'Cliquez la case de destination · Échap pour annuler') : null;
      const all = App.selectedItems();

      if (all.length > 1) {
        const thumbs = all.slice(0, 4).map((i) => el('span', { class: 'sel-thumb stacked' },
          el('span', { class: 'sel-thumb-inner', style: { transform: `rotate(${i.rot}deg)` } },
            App.ui.itemImage(App.model.getDef(i.id)))));
        info.replaceChildren(...[
          el('span', { class: 'sel-stack' }, thumbs),
          el('span', { class: 'sel-text' },
            el('strong', null, `${all.length} items sélectionnés`),
            el('span', { class: 'muted' }, ' · Maj+clic pour ajouter / retirer')),
          moveHint,
        ].filter(Boolean));
        return;
      }

      info.replaceChildren(...[
        el('span', { class: 'sel-thumb' },
          el('span', { class: 'sel-thumb-inner', style: { transform: `rotate(${it.rot}deg)` } }, App.ui.itemImage(def))),
        el('span', { class: 'sel-text' },
          el('strong', null, def.name),
          el('span', { class: 'muted' }, ` #${def.id} · (${it.x}, ${it.y}) · ${it.rot}°`)),
        moveHint,
      ].filter(Boolean));
    }

    function renderActions() {
      actions.replaceChildren(
        ...App.itemActions.list((a) => App.commands.has(a.command)).map((a) => {
          const cmd = App.commands.get(a.command);
          const key = cmd.keys && cmd.keys.length ? App.keys.format(cmd.keys[0]) : '';
          const label = a.label || cmd.shortLabel || cmd.label;
          return el('button', {
            type: 'button',
            class: `action-btn${a.danger ? ' danger' : ''}`,
            title: key ? `${cmd.label} (${key})` : cmd.label,
            dataset: { command: cmd.id, action: a.id },
            onclick: () => App.run(cmd.id),
          }, cmd.icon ? icon(cmd.icon) : null, el('span', { class: 'action-label' }, label));
        }),
      );
      syncPressed();
      App.requestRefresh();
    }

    function syncPressed() {
      actions.querySelectorAll('[data-command]').forEach((b) => {
        const cmd = App.commands.get(b.dataset.command);
        if (cmd && cmd.pressed) b.setAttribute('aria-pressed', String(!!cmd.pressed(App)));
      });
    }

    renderInfo();
    renderActions();
    App.on('change', renderInfo);
    App.on('selection', renderInfo);
    App.on('mode', () => { renderInfo(); syncPressed(); });
    App.on('registry:itemActions', renderActions);
    App.on('registry:commands', renderActions);
  },
});
