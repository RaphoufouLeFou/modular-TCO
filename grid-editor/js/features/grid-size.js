/* ============================================================================
 *  FEATURE — Taille de la grille  (Fichier › Taille de la grille…, Ctrl+G)
 * ========================================================================== */
App.module({
  id: 'feature.grid-size',

  setup(App) {
    const { el, icon } = App.ui;
    const G = CONFIG.grid;

    async function openDialog() {
      const state = App.store.get();
      const field = (label, value, name) => el('label', { class: 'field' },
        el('span', { class: 'field-label' }, label),
        el('input', {
          class: 'input', type: 'number', name, min: G.min, max: G.max, step: 1,
          value, required: true, inputmode: 'numeric',
        }));

      const fx = field('X — colonnes', state.grid.cols, 'cols');
      const fy = field('Y — lignes', state.grid.rows, 'rows');
      const inX = fx.querySelector('input');
      const inY = fy.querySelector('input');
      const swap = el('button', { type: 'button', class: 'icon-btn swap-btn', title: 'Inverser X et Y (paysage / portrait)' }, icon('swap'));
      const preview = el('div', { class: 'grid-preview' });
      const warning = el('p', { class: 'warning', hidden: true });

      const read = () => ({
        cols: App.model.toInt(inX.value, G.min, G.max, state.grid.cols),
        rows: App.model.toInt(inY.value, G.min, G.max, state.grid.rows),
      });

      function update() {
        const { cols, rows } = read();
        preview.style.setProperty('--pc', cols);
        preview.style.setProperty('--pr', rows);
        preview.replaceChildren(...Array.from({ length: cols * rows }, (_, i) => {
          const x = i % cols;
          const y = Math.floor(i / cols);
          return el('span', { class: App.model.itemAt(state, x, y) ? 'filled' : '' });
        }));
        const lost = App.model.countOutside(state, cols, rows);
        warning.hidden = lost === 0;
        warning.textContent = `⚠ ${lost} item${lost > 1 ? 's' : ''} hors de la nouvelle grille ${lost > 1 ? 'seront supprimés' : 'sera supprimé'}.`;
      }

      swap.addEventListener('click', () => {
        [inX.value, inY.value] = [inY.value, inX.value];
        update();
      });
      inX.addEventListener('input', update);
      inY.addEventListener('input', update);
      update();

      const result = await App.ui.dialog({
        title: 'Taille de la grille',
        className: 'dialog-grid-size',
        content: [
          el('div', { class: 'field-row' }, fx, swap, fy),
          el('p', { class: 'muted small' }, `Entiers de ${G.min} à ${G.max}.`),
          preview,
          warning,
        ],
        buttons: [
          { label: 'Annuler', value: null },
          { label: 'Appliquer', value: read, primary: true },
        ],
        onOpen: () => { inX.focus(); inX.select(); },
      });

      if (result && App.ops.resize(result.cols, result.rows)) {
        App.ui.toast(`Grille : ${result.cols} × ${result.rows}`, 'success');
      }
    }

    App.commands.add({
      id: 'grid.size',
      label: 'Taille de la grille…',
      shortLabel: 'Grille',
      icon: 'grid',
      keys: ['Mod+G'],
      run: openDialog,
    });
    App.menuItems.add({ id: 'file.grid-size', menu: 'file', command: 'grid.size', group: 'grid', order: 10 });

    App.statusItems.add({
      id: 'grid-size',
      order: 10,
      render(App) {
        const chip = el('button', {
          type: 'button', class: 'status-chip', title: `Taille de la grille (${App.keys.format('Mod+G')})`,
          onclick: () => App.run('grid.size'),
        });
        const upd = () => {
          const s = App.store.get();
          chip.replaceChildren(icon('grid'), `${s.grid.cols} × ${s.grid.rows}`,
            el('span', { class: 'muted' }, ` · ${s.items.length} item${s.items.length > 1 ? 's' : ''}`));
        };
        App.on('change', upd);
        upd();
        return chip;
      },
    });
  },
});
