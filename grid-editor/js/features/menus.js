/* ============================================================================
 *  MENUS DE LA BARRE DU HAUT
 *  Un menu sans entrée n'est pas affiché. Les features ajoutent leurs
 *  entrées avec App.menuItems.add({ id, menu: 'file', command, group, order }).
 * ========================================================================== */
App.module({
  id: 'feature.menus',
  setup(App) {
    App.menus.add({ id: 'file', label: 'Fichier', order: 10 });
    App.menus.add({ id: 'edit', label: 'Édition', order: 20 });
    App.menus.add({ id: 'help', label: 'Aide',    order: 90 });
  },
});
