/* ============================================================================
 *  NOYAU — objet global `App`
 * ----------------------------------------------------------------------------
 *  - Bus d'événements  : App.on(evt, fn) / App.emit(evt, data)
 *  - État sauvegardé   : App.store.get() / .commit(label, fn) / .reset(state)
 *  - État d'interface  : App.select(uid), App.setSelection([uids]),
 *                        App.selectedUids(), App.selectedItems(),
 *                        App.selectedItem() (principal), App.setMode(m)
 *  - Registres         : App.commands, App.menus, App.menuItems, App.toolbar,
 *                        App.statusItems, App.tabs, App.itemActions
 *  - Modules           : App.module({ id, setup(App), start(App) })
 *
 *  Événements émis : 'change', 'commit', 'selection', 'mode', 'history',
 *                    'refresh', 'ready', 'registry:<nom>'
 * ========================================================================== */
(function () {
  'use strict';

  const clone = (o) =>
    typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));

  /* ---------------------------------------------------------------- Bus -- */
  const listeners = new Map();

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (err) { console.error(`[App] listener "${event}"`, err); }
    }
  }

  /* 'refresh' regroupe plusieurs changements en un seul rafraîchissement. */
  let refreshQueued = false;
  function requestRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => { refreshQueued = false; emit('refresh'); });
  }

  /* -------------------------------------------------------------- État -- */
  /*  L'état n'est JAMAIS modifié directement : on passe par commit(), qui
   *  travaille sur une copie. Cela permet l'annulation et l'autosave.     */
  let state = null;

  const store = {
    get: () => state,

    /** Remplace tout l'état sans créer d'entrée d'historique. */
    reset(next, meta = {}) {
      state = next;
      emit('change', { state, meta: { ...meta, reset: true } });
    },

    /** Modifie l'état via une fonction ; retourner `false` annule. */
    commit(label, mutator) {
      const prev = state;
      const draft = clone(state);
      if (mutator(draft) === false) return false;
      state = draft;
      emit('commit', { prev, next: state, label });
      emit('change', { state, meta: { label } });
      return true;
    },
  };

  /* ---------------------------------------- État d'interface (non sauvé) -- */
  /*  Sélection multiple : un ensemble d'uids + un item « principal »
   *  (le dernier cliqué ; sert d'ancre pour le mode déplacement).        */
  let selection = new Set();
  let primary = null;
  let mode = null;

  const isSelected = (uid) => selection.has(uid);
  const selectedUids = () => [...selection];
  const selectedItems = () => (state ? state.items.filter((i) => selection.has(i.uid)) : []);

  /** Item principal (ou, à défaut, le plus en haut à gauche). */
  function selectedItem() {
    const items = selectedItems();
    if (!items.length) return null;
    return items.find((i) => i.uid === primary) ||
      items.slice().sort((a, b) => a.y - b.y || a.x - b.x)[0];
  }

  function setSelection(uids, primaryUid) {
    const next = new Set((uids || []).filter(Boolean));
    let nextPrimary = primaryUid !== undefined ? primaryUid : primary;
    if (!next.has(nextPrimary)) nextPrimary = null; // → item le plus en haut à gauche
    const same = next.size === selection.size && [...next].every((u) => selection.has(u)) &&
      nextPrimary === primary;
    if (same) return;
    selection = next;
    primary = nextPrimary;
    if (!next.size) setMode(null);
    emit('selection', selectedUids());
  }

  const select = (uid) => setSelection(uid ? [uid] : [], uid || null);
  const addToSelection = (uid) => setSelection([...selection, uid], uid);
  function toggleSelect(uid) {
    if (selection.has(uid)) setSelection(selectedUids().filter((u) => u !== uid));
    else addToSelection(uid);
  }

  function setMode(next) {
    next = next || null;
    if (mode === next) return;
    mode = next;
    emit('mode', mode);
  }

  // retire de la sélection les items qui n'existent plus
  on('change', () => {
    if (!selection.size) return;
    const alive = new Set(state.items.map((i) => i.uid));
    const kept = selectedUids().filter((u) => alive.has(u));
    if (kept.length !== selection.size) setSelection(kept);
  });
  ['change', 'selection', 'mode', 'history'].forEach((e) => on(e, requestRefresh));

  /* --------------------------------------------------------- Registres -- */
  function createRegistry(name) {
    const entries = new Map();
    const changed = () => { emit(`registry:${name}`); requestRefresh(); };
    const registry = {
      add(def) {
        if (!def || def.id == null) throw new Error(`[App.${name}] "id" manquant`);
        entries.set(def.id, { order: 100, ...def });
        changed();
        return () => registry.remove(def.id);
      },
      remove(id) { if (entries.delete(id)) changed(); },
      get: (id) => entries.get(id),
      has: (id) => entries.has(id),
      list: (filter) =>
        [...entries.values()].filter(filter || (() => true)).sort((a, b) => a.order - b.order),
    };
    return registry;
  }

  /*  commands    { id, label, icon?, keys?: ['Mod+S'], run(App, ...args),
   *                enabled?(App), repeat?, allowInInputs?, hidden? }
   *  menus       { id, label, order }
   *  menuItems   { id, menu, command, group?, order, label? }
   *  toolbar     { id, command, order, showLabel? }
   *  statusItems { id, order, render(App) → Element }
   *  tabs        { id, label, icon?, order, render(panel, App) }
   *  itemActions { id, command, order, danger? }                          */
  const commands    = createRegistry('commands');
  const menus       = createRegistry('menus');
  const menuItems   = createRegistry('menuItems');
  const toolbar     = createRegistry('toolbar');
  const statusItems = createRegistry('statusItems');
  const tabs        = createRegistry('tabs');
  const itemActions = createRegistry('itemActions');

  function isEnabled(cmd) {
    if (typeof cmd === 'string') cmd = commands.get(cmd);
    if (!cmd) return false;
    try { return cmd.enabled ? !!cmd.enabled(App) : true; } catch { return false; }
  }

  function reportError(cmd, err) {
    console.error(`[App] commande "${cmd.id}"`, err);
    App.ui?.toast?.(`Erreur : ${err.message || err}`, 'error');
  }

  /** Exécute une commande par son id (respecte enabled()). */
  function run(id, ...args) {
    const cmd = commands.get(id);
    if (!cmd) { console.warn(`[App] commande inconnue : ${id}`); return; }
    if (!isEnabled(cmd)) return;
    try {
      const r = cmd.run(App, ...args);
      if (r && typeof r.catch === 'function') r.catch((err) => reportError(cmd, err));
      return r;
    } catch (err) { reportError(cmd, err); }
  }

  /* ----------------------------------------------------------- Modules -- */
  const modules = [];
  let started = false;

  function module(def) {
    if (started) console.warn(`[App] module "${def.id}" enregistré après le démarrage`);
    modules.push(def);
  }

  function callPhase(m, phase) {
    if (typeof m[phase] !== 'function') return;
    try { m[phase](App); } catch (err) { console.error(`[App] module "${m.id}" (${phase})`, err); }
  }

  /** 1) setup de tous les modules (enregistrements), 2) start (DOM). */
  function start() {
    if (started) return;
    started = true;
    if (!state) state = App.model.createEmpty();
    modules.forEach((m) => callPhase(m, 'setup'));
    modules.forEach((m) => callPhase(m, 'start'));
    emit('ready');
    requestRefresh();
  }

  const App = {
    on, emit, clone, requestRefresh,
    store,
    select, setSelection, addToSelection, toggleSelect, isSelected,
    selectedUids, selectedItems, selectedItem,
    selectedUid: () => (selectedItem() || {}).uid || null,
    setMode, getMode: () => mode,
    commands, menus, menuItems, toolbar, statusItems, tabs, itemActions,
    run, isEnabled,
    module, start,
  };

  window.App = App;
})();
