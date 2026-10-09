/* ============================================================================
 *  FEATURE — Annuler / Rétablir     Ctrl+Z / Ctrl+Y (ou Ctrl+Maj+Z)
 * ========================================================================== */
App.module({
  id: 'feature.history',

  setup(App) {
    const undoStack = [];
    const redoStack = [];

    App.on('commit', ({ prev, label }) => {
      undoStack.push({ state: prev, label });
      if (undoStack.length > CONFIG.historyLimit) undoStack.shift();
      redoStack.length = 0;
      App.emit('history');
    });

    function travel(from, to, verb) {
      const entry = from.pop();
      if (!entry) return;
      to.push({ state: App.store.get(), label: entry.label });
      App.store.reset(entry.state, { source: 'history' });
      App.emit('history');
      App.ui.toast(`${verb} : ${entry.label}`, 'info', 1400);
    }

    App.commands.add({
      id: 'edit.undo', label: 'Annuler', icon: 'undo', keys: ['Mod+Z'], repeat: true,
      enabled: () => undoStack.length > 0,
      run: () => travel(undoStack, redoStack, 'Annulé'),
    });
    App.commands.add({
      id: 'edit.redo', label: 'Rétablir', icon: 'redo', keys: ['Mod+Y', 'Mod+Shift+Z'], repeat: true,
      enabled: () => redoStack.length > 0,
      run: () => travel(redoStack, undoStack, 'Rétabli'),
    });

    App.menuItems.add({ id: 'edit.undo', menu: 'edit', command: 'edit.undo', group: 'history', order: 1 });
    App.menuItems.add({ id: 'edit.redo', menu: 'edit', command: 'edit.redo', group: 'history', order: 2 });
    App.toolbar.add({ id: 'undo', command: 'edit.undo', order: 20 });
    App.toolbar.add({ id: 'redo', command: 'edit.redo', order: 21 });
  },
});
