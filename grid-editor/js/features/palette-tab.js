/* ============================================================================
 *  FEATURE — Onglet « Items » : la palette glisser-déposer (items de ITEMS).
 *  - glisser un item sur une case pour le poser (remplace l'occupant)
 *  - double-clic ou Entrée : pose sur la première case libre
 * ========================================================================== */
App.module({
  id: 'feature.palette',

  setup(App) {
    const { el, icon } = App.ui;

    function quickPlace(def) {
      const cell = App.model.freeCell(App.store.get());
      if (!cell) { App.ui.toast('La grille est pleine.', 'warn'); return; }
      const uid = App.ops.place(def.id, cell.x, cell.y);
      if (uid) App.select(uid);
    }

    App.tabs.add({
      id: 'items',
      label: 'Items',
      icon: 'box',
      order: 10,

      render(panel, App) {
        const search = el('input', {
          type: 'search', class: 'input', placeholder: 'Rechercher…', 'aria-label': 'Rechercher un item',
        });
        const list = el('ul', { class: 'palette', role: 'list' });
        const empty = el('p', { class: 'panel-empty', hidden: true }, 'Aucun item trouvé.');

        panel.append(
          el('div', { class: 'panel-head search-box' }, icon('search'), search),
          list,
          empty,
          el('p', { class: 'panel-foot' }, 'Glissez un item sur la grille. Double-clic : première case libre.'),
        );

        const rows = ITEMS.filter((d) => !d.hidden).map((def) => {
          const li = el('li', {
            class: 'palette-item', tabindex: '0', title: `${def.name} (id ${def.id})`,
            dataset: { itemId: def.id },
          },
          el('span', { class: 'thumb' }, App.ui.itemImage(def)),
          el('span', { class: 'palette-name' }, def.name),
          el('span', { class: 'palette-id' }, `#${def.id}`));

          li.addEventListener('pointerdown', (e) => {
            App.dnd.press(e, {
              image: def.image,
              size: App.workspace ? App.workspace.cellSize() : 56,
              accepts: (t) => t.dataset.drop === 'cell',
              onStart: () => li.classList.add('drag-source'),
              onEnd: () => li.classList.remove('drag-source'),
              onDrop: (t) => {
                const uid = App.ops.place(def.id, Number(t.dataset.x), Number(t.dataset.y));
                if (uid) App.select(uid);
              },
            });
          });
          li.addEventListener('dblclick', () => quickPlace(def));
          li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); quickPlace(def); }
          });
          return { def, li };
        });

        list.append(...rows.map((r) => r.li));

        search.addEventListener('input', () => {
          const q = search.value.trim().toLowerCase();
          let visible = 0;
          for (const r of rows) {
            const show = !q || r.def.name.toLowerCase().includes(q) || String(r.def.id) === q;
            r.li.hidden = !show;
            if (show) visible++;
          }
          empty.hidden = visible > 0;
        });
      },
    });
  },
});
