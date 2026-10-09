/* ============================================================================
 *  FEATURE — Vue : zoom et déplacement (menu Affichage + boutons flottants)
 *    Ctrl+Plus / Plus      zoom avant
 *    Ctrl+Minus / Minus    zoom arrière
 *    Ctrl+0 / F            ajuster la grille à l'écran
 *    Ctrl+1                zoom 100 %
 *    H                     outil main (glisser = déplacer la vue)
 *  Souris : molette = déplacer · Ctrl+molette = zoom · glisser le fond,
 *  clic molette ou clic droit = déplacer. Tactile : 1 doigt sur le fond =
 *  déplacer, 2 doigts = pincer pour zoomer.
 *  La logique de vue est dans js/ui/workspace.js (App.view).
 * ========================================================================== */
App.module({
  id: 'feature.view',

  setup(App) {
    const step = CONFIG.view.zoomStep;
    const ready = () => !!App.view;

    App.commands.add({
      id: 'view.zoomIn', label: 'Zoom avant', icon: 'zoom-in', repeat: true,
      keys: ['Mod+Plus', 'Mod+=', 'Plus'],
      enabled: () => ready() && App.view.canZoomIn(),
      run: () => App.view.zoomBy(step),
    });
    App.commands.add({
      id: 'view.zoomOut', label: 'Zoom arrière', icon: 'zoom-out', repeat: true,
      keys: ['Mod+Minus', 'Minus'],
      enabled: () => ready() && App.view.canZoomOut(),
      run: () => App.view.zoomBy(1 / step),
    });
    App.commands.add({
      id: 'view.fit', label: "Ajuster à l'écran", icon: 'fit', keys: ['Mod+0', 'F'],
      enabled: ready, run: () => App.view.fit(),
    });
    App.commands.add({
      id: 'view.reset', label: 'Zoom 100 %', keys: ['Mod+1'],
      enabled: ready, run: () => App.view.zoomTo(1),
    });
    App.commands.add({
      id: 'view.hand', label: 'Outil main (déplacer la vue)', icon: 'hand', keys: ['H'],
      enabled: ready,
      pressed: () => ready() && App.view.isHand(),
      run: () => App.view.setHand(!App.view.isHand()),
    });

    App.menus.add({ id: 'view', label: 'Affichage', order: 30 });
    App.menuItems.add({ id: 'view.zoomIn',  menu: 'view', command: 'view.zoomIn',  group: 'zoom', order: 1 });
    App.menuItems.add({ id: 'view.zoomOut', menu: 'view', command: 'view.zoomOut', group: 'zoom', order: 2 });
    App.menuItems.add({ id: 'view.reset',   menu: 'view', command: 'view.reset',   group: 'zoom', order: 3 });
    App.menuItems.add({ id: 'view.fit',     menu: 'view', command: 'view.fit',     group: 'zoom', order: 4 });
    App.menuItems.add({ id: 'view.hand',    menu: 'view', command: 'view.hand',    group: 'tool', order: 10 });
  },

  /* Boutons flottants en bas à droite de la zone de travail. */
  start(App) {
    const { el, icon } = App.ui;

    const btn = (id) => {
      const cmd = App.commands.get(id);
      const key = cmd.keys ? App.keys.format(cmd.keys[0]) : '';
      return el('button', {
        type: 'button', class: 'icon-btn', dataset: { command: id },
        title: key ? `${cmd.label} (${key})` : cmd.label, 'aria-label': cmd.label,
        onclick: () => App.run(id),
      }, icon(cmd.icon));
    };

    const label = el('button', {
      type: 'button', class: 'zoom-label', title: `Zoom 100 % (${App.keys.format('Mod+1')})`,
      onclick: () => App.run('view.reset'),
    });
    const hand = btn('view.hand');
    const bar = el('div', { class: 'view-controls', role: 'toolbar', 'aria-label': 'Vue' },
      btn('view.zoomOut'), label, btn('view.zoomIn'),
      el('span', { class: 'vc-sep' }), btn('view.fit'), hand);
    bar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    App.workspace.root.append(bar);

    const update = () => {
      const v = App.view.get();
      label.textContent = `${Math.round(v.zoom * 100)} %`;
      hand.setAttribute('aria-pressed', String(v.hand));
      App.requestRefresh();
    };
    App.on('view', update);
    update();
  },
});
