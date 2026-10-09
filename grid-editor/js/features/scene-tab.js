/* ============================================================================
 *  FEATURE — Onglet « Scène » : liste des items posés sur la grille.
 *  Exemple d'onglet supplémentaire : supprimez ce fichier de index.html
 *  pour le retirer.
 * ========================================================================== */
App.module({
  id: 'feature.scene-tab',

  setup(App) {
    const { el } = App.ui;

    App.tabs.add({
      id: 'scene',
      label: 'Scène',
      icon: 'layers',
      order: 20,

      render(panel, App) {
        const list = el('ul', { class: 'scene-list', role: 'list' });
        const empty = el('p', { class: 'panel-empty' }, 'Aucun item sur la grille.');
        panel.append(list, empty);

        function render() {
          const items = App.store.get().items.slice().sort((a, b) => a.y - b.y || a.x - b.x);
          empty.hidden = items.length > 0;
          list.replaceChildren(...items.map((it) => {
            const def = App.model.getDef(it.id);
            const li = el('li', {
              class: `scene-row${App.isSelected(it.uid) ? ' selected' : ''}${it.id === 0 ? ' unknown' : ''}`,
              tabindex: '0',
              title: 'Maj/Ctrl+clic : ajouter à la sélection',
              onclick: (e) => (e.shiftKey || e.ctrlKey || e.metaKey ? App.toggleSelect(it.uid) : App.select(it.uid)),
            },
            el('span', { class: 'thumb small' },
              el('span', { class: 'thumb-rot', style: { transform: `rotate(${it.rot}deg)` } }, App.ui.itemImage(def))),
            el('span', { class: 'scene-name' }, def.name),
            el('span', { class: 'scene-meta' }, `(${it.x}, ${it.y}) ${it.rot}°`));
            return li;
          }));
        }

        App.on('change', render);
        App.on('selection', render);
        render();
      },
    });
  },
});
