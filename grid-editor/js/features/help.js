/* ============================================================================
 *  FEATURE — Aide : liste des raccourcis (générée depuis les commandes).
 * ========================================================================== */
App.module({
  id: 'feature.help',

  setup(App) {
    const { el } = App.ui;

    function shortcutsDialog() {
      const rows = App.commands
        .list((c) => Array.isArray(c.keys) && c.keys.length && !c.hidden)
        .map((c) => el('tr', null,
          el('td', null, c.label.replace(/…$/, '')),
          el('td', { class: 'keys' },
            c.keys.map((k, i) => [i ? el('span', { class: 'muted' }, ' ou ') : null, el('kbd', null, App.keys.format(k))]))));

      return App.ui.dialog({
        title: 'Raccourcis clavier',
        className: 'dialog-wide',
        content: [
          el('table', { class: 'shortcuts' }, el('tbody', null, rows)),
          el('ul', { class: 'muted small help-list' },
            el('li', null, 'Glisser depuis la gauche : poser un item · double-clic : pivoter'),
            el('li', null, 'Glisser sur une case vide : sélection rectangulaire (Maj/Ctrl : ajouter)'),
            el('li', null, 'Maj/Ctrl+clic : ajouter ou retirer un item de la sélection'),
            el('li', null, 'Glisser un item sélectionné : déplacer toute la sélection · lâcher à gauche : supprimer'),
            el('li', null, 'Glisser le fond, clic molette ou clic droit : déplacer la vue · molette : défiler'),
            el('li', null, 'Ctrl+molette ou pincer (2 doigts) : zoomer')),
        ],
        buttons: [{ label: 'Fermer', value: true, primary: true }],
      });
    }

    function aboutDialog() {
      return App.ui.dialog({
        title: CONFIG.appName,
        content: [
          el('p', null, `${ITEMS.filter((d) => !d.hidden).length} items disponibles · grille ${CONFIG.grid.min} à ${CONFIG.grid.max}.`),
          el('p', { class: 'muted small' },
            'Les items se déclarent en haut de js/config.js. Chaque feature est un fichier de js/features/ : ' +
            'retirez sa ligne <script> dans index.html pour la désactiver. Voir README.md.'),
        ],
        buttons: [{ label: 'OK', value: true, primary: true }],
      });
    }

    App.commands.add({ id: 'help.shortcuts', label: 'Raccourcis clavier', icon: 'keyboard', keys: ['F1', '?'], run: shortcutsDialog });
    App.commands.add({ id: 'help.about', label: 'À propos', icon: 'info', run: aboutDialog });

    App.menuItems.add({ id: 'help.shortcuts', menu: 'help', command: 'help.shortcuts', order: 1 });
    App.menuItems.add({ id: 'help.about', menu: 'help', command: 'help.about', order: 2 });
    App.toolbar.add({ id: 'help', command: 'help.shortcuts', order: 90 });
  },
});
