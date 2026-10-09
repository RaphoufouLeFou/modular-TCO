/* ============================================================================
 *  FEATURE — Actions sur la sélection (menu du bas + raccourcis)
 *  Toutes les actions s'appliquent à TOUS les items sélectionnés.
 *    Espace / R          pivoter +90° (chaque item sur place)
 *    Maj+Espace / Maj+R  pivoter −90°
 *    M                   mode déplacement (puis cliquer une case)
 *    Flèches             déplacer d'une case
 *    Ctrl+D              dupliquer
 *    Suppr / ⌫           supprimer
 *    Ctrl+A              tout sélectionner
 *    Échap               annuler le mode / désélectionner
 *    N / Maj+N           item suivant / précédent
 * ========================================================================== */
App.module({
  id: 'feature.item-actions',

  setup(App) {
    const uids = () => App.selectedUids();
    const hasSel = () => App.selectedUids().length > 0;
    const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

    /* ---------------------------------------------------- Commandes -- */
    App.commands.add({
      id: 'item.rotateCcw', label: 'Pivoter de −90°', shortLabel: '−90°', icon: 'rotate-ccw',
      keys: ['Shift+Space', 'Shift+R'], enabled: hasSel,
      run: () => App.ops.rotateMany(uids(), -90),
    });
    App.commands.add({
      id: 'item.rotateCw', label: 'Pivoter de +90°', shortLabel: '+90°', icon: 'rotate-cw',
      keys: ['Space', 'R'], enabled: hasSel,
      run: () => App.ops.rotateMany(uids(), 90),
    });
    App.commands.add({
      id: 'item.move', label: 'Déplacer (cliquer une case)', shortLabel: 'Déplacer', icon: 'move',
      keys: ['M'], enabled: hasSel,
      pressed: () => App.getMode() === 'move',
      run: () => App.setMode(App.getMode() === 'move' ? null : 'move'),
    });
    App.commands.add({
      id: 'item.duplicate', label: 'Dupliquer', icon: 'copy', keys: ['Mod+D'], enabled: hasSel,
      run: () => {
        const created = App.ops.duplicateMany(uids());
        if (created && created.length) App.setSelection(created);
        else App.ui.toast('Pas assez de cases libres pour dupliquer.', 'warn');
      },
    });
    App.commands.add({
      id: 'item.delete', label: 'Supprimer', icon: 'trash', keys: ['Delete', 'Backspace'], enabled: hasSel,
      run: () => {
        const n = uids().length;
        App.ops.removeMany(uids());
        if (n > 1) App.ui.toast(`${plural(n, 'item')} supprimés`, 'info', 1600);
      },
    });

    const NUDGES = [
      ['Up', 'Déplacer vers le haut', 0, -1],
      ['Down', 'Déplacer vers le bas', 0, 1],
      ['Left', 'Déplacer vers la gauche', -1, 0],
      ['Right', 'Déplacer vers la droite', 1, 0],
    ];
    for (const [dir, label, dx, dy] of NUDGES) {
      App.commands.add({
        id: `item.nudge${dir}`, label, keys: [`Arrow${dir}`], repeat: true, enabled: hasSel,
        run: () => App.ops.moveMany(uids(), dx, dy),
      });
    }

    /* --------------------------------------------------- Sélection -- */
    const hasItems = () => App.store.get().items.length > 0;
    App.commands.add({
      id: 'select.all', label: 'Tout sélectionner', icon: 'select-all', keys: ['Mod+A'], enabled: hasItems,
      run: () => App.setSelection(App.store.get().items.map((i) => i.uid)),
    });

    function cycle(step) {
      const items = App.store.get().items.slice().sort((a, b) => a.y - b.y || a.x - b.x);
      if (!items.length) return;
      const i = items.findIndex((it) => it.uid === App.selectedUid());
      const next = i < 0 ? (step > 0 ? 0 : items.length - 1) : (i + step + items.length) % items.length;
      App.select(items[next].uid);
    }
    App.commands.add({ id: 'select.next', label: "Sélectionner l'item suivant",   keys: ['N'],       enabled: hasItems, repeat: true, run: () => cycle(1) });
    App.commands.add({ id: 'select.prev', label: "Sélectionner l'item précédent", keys: ['Shift+N'], enabled: hasItems, repeat: true, run: () => cycle(-1) });

    App.commands.add({
      id: 'ui.escape', label: 'Annuler le mode / désélectionner', keys: ['Escape'], allowInInputs: true,
      run: () => {
        const a = document.activeElement;
        if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { a.blur(); return; }
        if (App.getMode()) App.setMode(null);
        else App.select(null);
      },
    });

    /* ------------------------------------------ Menu du bas & Édition -- */
    App.itemActions.add({ id: 'rotate-ccw', command: 'item.rotateCcw', order: 10 });
    App.itemActions.add({ id: 'rotate-cw',  command: 'item.rotateCw',  order: 11 });
    App.itemActions.add({ id: 'move',       command: 'item.move',      order: 20 });
    App.itemActions.add({ id: 'duplicate',  command: 'item.duplicate', order: 30 });
    App.itemActions.add({ id: 'delete',     command: 'item.delete',    order: 90, danger: true });

    App.menuItems.add({ id: 'edit.select-all', menu: 'edit', command: 'select.all',     group: 'select', order: 5 });
    App.menuItems.add({ id: 'edit.rotate-cw',  menu: 'edit', command: 'item.rotateCw',  group: 'item', order: 10 });
    App.menuItems.add({ id: 'edit.rotate-ccw', menu: 'edit', command: 'item.rotateCcw', group: 'item', order: 11 });
    App.menuItems.add({ id: 'edit.move',       menu: 'edit', command: 'item.move',      group: 'item', order: 12 });
    App.menuItems.add({ id: 'edit.duplicate',  menu: 'edit', command: 'item.duplicate', group: 'item', order: 13 });
    App.menuItems.add({ id: 'edit.delete',     menu: 'edit', command: 'item.delete',    group: 'item', order: 14 });
  },
});
