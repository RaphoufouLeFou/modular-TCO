/* ============================================================================
 *  PANNEAU DE GAUCHE — onglets construits depuis App.tabs.
 *  Le panneau entier est aussi une zone de dépôt « corbeille » :
 *  y lâcher un item de la grille le supprime.
 * ========================================================================== */
App.module({
  id: 'ui.sidebar',

  start(App) {
    const { el, icon } = App.ui;
    const root = document.getElementById('sidebar');
    root.dataset.drop = 'trash';

    const tabbar = el('div', { class: 'tabbar', role: 'tablist' });
    const panels = el('div', { class: 'tab-panels' });
    root.append(tabbar, panels, el('div', { class: 'trash-hint' }, icon('trash'), 'Déposer ici pour supprimer'));

    const PREF = `${CONFIG.storageKey}.tab`;
    let active = null;
    try { active = localStorage.getItem(PREF); } catch { /* stockage indisponible */ }

    const mounted = new Map(); // id → panneau

    function activate(id, remember = true) {
      active = id;
      tabbar.querySelectorAll('.tab-btn').forEach((b) => {
        const on = b.dataset.tab === id;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
      });
      for (const [tid, panel] of mounted) panel.hidden = tid !== id;
      if (remember) { try { localStorage.setItem(PREF, id); } catch { /* ignore */ } }
    }

    function render() {
      const tabs = App.tabs.list();
      for (const [id, panel] of mounted) {
        if (!App.tabs.has(id)) { panel.remove(); mounted.delete(id); }
      }
      tabbar.replaceChildren();
      for (const tab of tabs) {
        if (!mounted.has(tab.id)) {
          const panel = el('div', { class: 'tab-panel', role: 'tabpanel', id: `tab-${tab.id}` });
          panels.append(panel);
          mounted.set(tab.id, panel);
          try { tab.render(panel, App); } catch (err) { console.error(`[tab ${tab.id}]`, err); }
        }
        tabbar.append(el('button', {
          type: 'button', role: 'tab', class: 'tab-btn', dataset: { tab: tab.id },
          'aria-controls': `tab-${tab.id}`, onclick: () => activate(tab.id),
        }, tab.icon ? icon(tab.icon) : null, el('span', null, tab.label)));
      }
      tabbar.hidden = tabs.length < 2;
      if (!tabs.some((t) => t.id === active)) active = tabs[0]?.id ?? null;
      activate(active, false);
    }

    render();
    App.on('registry:tabs', render);
  },
});
