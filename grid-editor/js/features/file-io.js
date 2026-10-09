/* ============================================================================
 *  FEATURE — Enregistrer / Ouvrir un fichier (.json)   Ctrl+S / Ctrl+O
 * ----------------------------------------------------------------------------
 *  Chrome / Edge / Opera : vraie boîte de dialogue « Enregistrer sous » et
 *  « Ouvrir » (File System Access API).
 *  Firefox / Safari : repli → on demande le nom puis le fichier est
 *  téléchargé (le navigateur demande où l'enregistrer si l'option
 *  « Toujours demander où enregistrer » est activée).
 * ========================================================================== */
App.module({
  id: 'feature.file-io',

  setup(App) {
    const { el } = App.ui;
    const FILE_TYPES = [{
      description: 'Environnement de travail (JSON)',
      accept: { 'application/json': ['.json'] },
    }];
    let lastName = CONFIG.saveFileName;

    const toJSON = () => JSON.stringify(App.model.serialize(App.store.get()), null, 2);
    const withExt = (name) => (/\.json$/i.test(name) ? name : `${name}.json`);

    /* -------------------------------------------------------- Save -- */
    async function save() {
      const data = toJSON();

      if (typeof window.showSaveFilePicker === 'function') {
        try {
          const handle = await window.showSaveFilePicker({ suggestedName: lastName, types: FILE_TYPES });
          const writable = await handle.createWritable();
          await writable.write(data);
          await writable.close();
          lastName = handle.name;
          App.ui.toast(`Enregistré : ${handle.name}`, 'success');
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return; // l'utilisateur a annulé
          console.warn('[file-io] showSaveFilePicker indisponible, repli sur téléchargement', err);
        }
      }

      // Repli : demander un nom puis télécharger
      const input = el('input', { class: 'input', type: 'text', value: lastName, required: true, spellcheck: 'false' });
      const name = await App.ui.dialog({
        title: 'Enregistrer',
        content: [
          el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Nom du fichier'), input),
          el('p', { class: 'muted small' }, 'Le fichier sera téléchargé par le navigateur.'),
        ],
        buttons: [
          { label: 'Annuler', value: null },
          { label: 'Enregistrer', value: () => input.value.trim(), primary: true },
        ],
        onOpen: () => { input.focus(); input.setSelectionRange(0, input.value.replace(/\.json$/i, '').length); },
      });
      if (!name) return;
      lastName = withExt(name);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const a = el('a', { href: url, download: lastName });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      App.ui.toast(`Téléchargé : ${lastName}`, 'success');
    }

    /* -------------------------------------------------------- Load -- */
    function pickWithInput() {
      return new Promise((resolve) => {
        const input = el('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
        input.addEventListener('change', () => { resolve(input.files[0] || null); input.remove(); });
        input.addEventListener('cancel', () => { resolve(null); input.remove(); });
        document.body.append(input);
        input.click();
      });
    }

    async function pickFile() {
      if (typeof window.showOpenFilePicker === 'function') {
        try {
          const [handle] = await window.showOpenFilePicker({ types: FILE_TYPES, multiple: false });
          return await handle.getFile();
        } catch (err) {
          if (err && err.name === 'AbortError') return null;
          console.warn('[file-io] showOpenFilePicker indisponible, repli sur <input type=file>', err);
        }
      }
      return pickWithInput();
    }

    /** Charge un texte JSON dans l'environnement (annulable avec Ctrl+Z). */
    function loadText(text, name = 'fichier') {
      let data;
      try { data = JSON.parse(text); } catch {
        App.ui.toast(`« ${name} » n'est pas un JSON valide.`, 'error');
        return false;
      }
      let result;
      try { result = App.model.deserialize(data); } catch (err) {
        App.ui.toast(err.message, 'error');
        return false;
      }
      App.select(null);
      App.ops.replace(result.state, 'Ouvrir');
      lastName = name;
      const { unknown, dropped } = result.report;
      const notes = [];
      if (unknown) notes.push(`${unknown} id inconnu${unknown > 1 ? 's' : ''} → 0`);
      if (dropped) notes.push(`${dropped} ignoré${dropped > 1 ? 's' : ''} (hors grille / doublon)`);
      App.ui.toast(`Ouvert : ${name}${notes.length ? ` — ${notes.join(', ')}` : ''}`, notes.length ? 'warn' : 'success', notes.length ? 5000 : 2800);
      return true;
    }

    async function load() {
      const file = await pickFile();
      if (!file) return;
      loadText(await file.text(), file.name);
    }

    /* --------------------------------------------------------- New -- */
    async function newWorkspace() {
      if (App.store.get().items.length) {
        const ok = await App.ui.confirm('Nouvel environnement',
          "Vider la grille ? (Ctrl+Z permet d'annuler.)", { okLabel: 'Vider', danger: true });
        if (!ok) return;
      }
      App.select(null);
      const cur = App.store.get().grid;
      App.ops.replace({ grid: { ...cur }, items: [] }, 'Nouveau');
    }

    /* -------------------------------------------------- Déclaration -- */
    App.commands.add({ id: 'file.new',  label: 'Nouveau (vider la grille)', icon: 'file', run: newWorkspace });
    App.commands.add({ id: 'file.save', label: 'Enregistrer…', shortLabel: 'Enregistrer', icon: 'save', keys: ['Mod+S'], allowInInputs: true, run: save });
    App.commands.add({ id: 'file.load', label: 'Ouvrir…',      shortLabel: 'Ouvrir', icon: 'open', keys: ['Mod+O'], allowInInputs: true, run: load });

    App.menuItems.add({ id: 'file.new',  menu: 'file', command: 'file.new',  group: 'io', order: 20 });
    App.menuItems.add({ id: 'file.load', menu: 'file', command: 'file.load', group: 'io', order: 21 });
    App.menuItems.add({ id: 'file.save', menu: 'file', command: 'file.save', group: 'io', order: 22 });

    App.toolbar.add({ id: 'save', command: 'file.save', order: 10, showLabel: true });
    App.toolbar.add({ id: 'load', command: 'file.load', order: 11, showLabel: true });

    App.fileIO = { save, load, loadText };
  },

  /* Glisser un fichier .json sur la fenêtre l'ouvre aussi. */
  start(App) {
    window.addEventListener('dragover', (e) => {
      if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault();
    });
    window.addEventListener('drop', async (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      e.preventDefault();
      App.fileIO.loadText(await file.text(), file.name);
    });
  },
});
