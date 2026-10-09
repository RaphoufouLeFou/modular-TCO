/* ============================================================================
 *  FEATURE — Sauvegarde automatique dans le localStorage
 *  - au démarrage : recharge le dernier environnement (ids inconnus → 0)
 *  - à chaque modification : réécrit le localStorage (avec un petit délai)
 *  - indicateur d'état dans la barre du haut
 * ========================================================================== */
App.module({
  id: 'feature.autosave',

  setup(App) {
    const { el } = App.ui;
    const KEY = CONFIG.storageKey;
    let timer = null;
    let startupNote = null;
    let setStatus = () => {};

    /* Restauration (avant l'affichage de l'interface). */
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const { state, report } = App.model.deserialize(JSON.parse(raw));
        App.store.reset(state, { source: 'autosave' });
        if (report.unknown) {
          startupNote = `${report.unknown} item${report.unknown > 1 ? 's' : ''} à l'id inconnu remis à 0`;
        }
      }
    } catch (err) {
      console.warn('[autosave] restauration impossible', err);
      startupNote = 'Sauvegarde automatique illisible : environnement vide.';
    }

    function write() {
      clearTimeout(timer);
      timer = null;
      try {
        localStorage.setItem(KEY, JSON.stringify(App.model.serialize(App.store.get())));
        setStatus('saved');
      } catch (err) {
        console.warn('[autosave] écriture impossible', err);
        setStatus('error');
      }
    }

    App.on('change', ({ meta }) => {
      if (meta && meta.source === 'autosave') return;
      clearTimeout(timer);
      setStatus('pending');
      timer = setTimeout(write, CONFIG.autosaveDelay);
    });

    const flush = () => { if (timer) write(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

    App.statusItems.add({
      id: 'autosave',
      order: 90,
      render() {
        const chip = el('span', { class: 'status-chip autosave', 'aria-live': 'polite' });
        const LABELS = {
          saved:   ['ok',    'Sauvegardé'],
          pending: ['busy',  'Sauvegarde…'],
          error:   ['error', 'Stockage indisponible'],
        };
        setStatus = (s) => {
          const [cls, text] = LABELS[s];
          chip.dataset.state = cls;
          chip.title = 'Sauvegarde automatique (localStorage)';
          chip.replaceChildren(el('span', { class: 'dot' }), text);
        };
        setStatus('saved');
        return chip;
      },
    });

    App.autosave = {
      flush,
      clear() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
      getNote: () => startupNote,
    };
  },

  start(App) {
    const note = App.autosave.getNote();
    if (note) App.ui.toast(note, 'warn', 5000);
  },
});
