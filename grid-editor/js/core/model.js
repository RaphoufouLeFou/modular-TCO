/* ============================================================================
 *  MODÈLE — structure de l'environnement de travail et opérations.
 * ----------------------------------------------------------------------------
 *  État :  { grid: { cols, rows }, items: [ { uid, id, x, y, rot } ] }
 *    uid : identifiant de l'instance (généré, non sauvegardé)
 *    id  : id de l'item dans ITEMS (config.js)
 *    rot : 0 | 90 | 180 | 270
 *
 *  App.model : fonctions pures (lecture, sérialisation, validation)
 *  App.ops   : opérations qui modifient l'état (annulables)
 * ========================================================================== */
(function (App) {
  'use strict';

  const G = CONFIG.grid;

  /* ------------------------------------------------ Définitions d'items -- */
  const defs = new Map();
  for (const d of ITEMS) {
    if (!Number.isInteger(d.id)) console.warn('[config] id non entier :', d);
    if (defs.has(d.id)) console.warn(`[config] id dupliqué : ${d.id}`);
    defs.set(d.id, d);
  }
  if (!defs.has(0)) defs.set(0, { id: 0, name: 'Inconnu', image: '', hidden: true });

  const getDef = (id) => defs.get(id) || defs.get(0);
  const hasDef = (id) => defs.has(id);

  /* ----------------------------------------------------------- Helpers -- */
  let seq = 0;
  const newUid = () => `u${Date.now().toString(36)}${(seq++).toString(36)}`;

  const toInt = (v, min, max, fallback) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const normRot = (r) => {
    const n = Number(r);
    if (!Number.isFinite(n)) return 0;
    return (((Math.round(n / 90) * 90) % 360) + 360) % 360;
  };

  const createEmpty = () => ({
    grid: { cols: G.defaultCols, rows: G.defaultRows },
    items: [],
  });

  const inBounds = (s, x, y) =>
    Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && y >= 0 && x < s.grid.cols && y < s.grid.rows;

  const itemAt   = (s, x, y) => s.items.find((i) => i.x === x && i.y === y) || null;
  const findItem = (s, uid) => s.items.find((i) => i.uid === uid) || null;

  /** Case libre : la plus proche de (fromX, fromY), ou la 1re en lecture. */
  function freeCell(s, fromX, fromY) {
    const near = Number.isInteger(fromX) && Number.isInteger(fromY);
    let best = null;
    let bestD = Infinity;
    for (let y = 0; y < s.grid.rows; y++) {
      for (let x = 0; x < s.grid.cols; x++) {
        if (itemAt(s, x, y)) continue;
        if (!near) return { x, y };
        const d = Math.abs(x - fromX) + Math.abs(y - fromY);
        if (d < bestD) { best = { x, y }; bestD = d; }
      }
    }
    return best;
  }

  const countOutside = (s, cols, rows) =>
    s.items.filter((i) => i.x >= cols || i.y >= rows).length;

  const itemsByUids = (s, uids) => {
    const set = new Set(uids);
    return s.items.filter((i) => set.has(i.uid));
  };

  /** Limite (dx, dy) pour que tout le groupe reste dans la grille. */
  function clampDelta(s, uids, dx, dy) {
    const sel = itemsByUids(s, uids);
    if (!sel.length) return { dx: 0, dy: 0 };
    const xs = sel.map((i) => i.x);
    const ys = sel.map((i) => i.y);
    return {
      dx: Math.max(-Math.min(...xs), Math.min(s.grid.cols - 1 - Math.max(...xs), dx)),
      dy: Math.max(-Math.min(...ys), Math.min(s.grid.rows - 1 - Math.max(...ys), dy)),
    };
  }

  /** Décalage le plus proche où une copie du groupe tient sur des cases libres. */
  function findGroupSlot(s, sel) {
    const occupied = new Set(s.items.map((i) => `${i.x},${i.y}`));
    const { cols, rows } = s.grid;
    const cands = [];
    for (let dy = -rows + 1; dy < rows; dy++) {
      for (let dx = -cols + 1; dx < cols; dx++) if (dx || dy) cands.push([dx, dy]);
    }
    const dist = ([dx, dy]) => Math.abs(dx) + Math.abs(dy);
    cands.sort((a, b) => dist(a) - dist(b) || b[0] - a[0] || b[1] - a[1]); // préfère droite, bas
    for (const [dx, dy] of cands) {
      if (sel.every((i) => inBounds(s, i.x + dx, i.y + dy) && !occupied.has(`${i.x + dx},${i.y + dy}`))) {
        return { dx, dy };
      }
    }
    return null;
  }

  /* ------------------------------------ Mutations (sur un brouillon) -- */
  const mutate = {
    place(d, id, x, y, rot = 0) {
      if (!inBounds(d, x, y)) return false;
      d.items = d.items.filter((i) => !(i.x === x && i.y === y)); // remplace
      const uid = newUid();
      d.items.push({ uid, id, x, y, rot: normRot(rot) });
      return uid;
    },
    move(d, uid, x, y) {
      const it = findItem(d, uid);
      if (!it) return false;
      return mutate.moveMany(d, [uid], x - it.x, y - it.y);
    },
    /**
     * Décale un groupe de (dx, dy). Refusé si un item sortirait de la grille.
     * Les autres items qui occupent les cases d'arrivée glissent dans les
     * cases libérées par le groupe (pour 1 item, c'est un simple échange).
     */
    moveMany(d, uids, dx, dy) {
      if (!dx && !dy) return false;
      const set = new Set(uids);
      const sel = d.items.filter((i) => set.has(i.uid));
      if (!sel.length || !sel.every((i) => inBounds(d, i.x + dx, i.y + dy))) return false;
      const key = (x, y) => `${x},${y}`;
      const targets = new Set(sel.map((i) => key(i.x + dx, i.y + dy)));
      for (const o of d.items) {
        if (set.has(o.uid) || !targets.has(key(o.x, o.y))) continue;
        let x = o.x - dx;
        let y = o.y - dy;
        while (targets.has(key(x, y))) { x -= dx; y -= dy; }
        o.x = x; o.y = y;
      }
      for (const i of sel) { i.x += dx; i.y += dy; }
      return true;
    },
    rotate: (d, uid, delta) => mutate.rotateMany(d, [uid], delta),
    rotateMany(d, uids, delta) {
      const set = new Set(uids);
      let n = 0;
      for (const it of d.items) if (set.has(it.uid)) { it.rot = normRot(it.rot + delta); n++; }
      return n > 0;
    },
    remove: (d, uid) => mutate.removeMany(d, [uid]),
    removeMany(d, uids) {
      const set = new Set(uids);
      const n = d.items.length;
      d.items = d.items.filter((i) => !set.has(i.uid));
      return d.items.length !== n;
    },
    resize(d, cols, rows) {
      if (d.grid.cols === cols && d.grid.rows === rows) return false;
      d.grid = { cols, rows };
      d.items = d.items.filter((i) => inBounds(d, i.x, i.y));
      return true;
    },
  };

  /* ---------------------------------------- Sérialisation / chargement -- */
  function serialize(s) {
    return {
      format: CONFIG.fileFormat,
      version: CONFIG.fileVersion,
      savedAt: new Date().toISOString(),
      grid: { cols: s.grid.cols, rows: s.grid.rows },
      items: s.items
        .slice()
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((i) => ({ id: i.id, x: i.x, y: i.y, rot: i.rot })),
    };
  }

  /**
   * Valide des données (objet JSON) et retourne { state, report }.
   * - id introuvable dans ITEMS → id 0   (report.unknown)
   * - hors grille / case en double → ignoré (report.dropped)
   */
  function deserialize(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Fichier invalide : un objet JSON est attendu.');
    }
    if (data.format && data.format !== CONFIG.fileFormat) {
      throw new Error(`Format non reconnu : "${data.format}".`);
    }
    const g = data.grid || {};
    const state = {
      grid: {
        cols: toInt(g.cols, G.min, G.max, G.defaultCols),
        rows: toInt(g.rows, G.min, G.max, G.defaultRows),
      },
      items: [],
    };
    const report = { unknown: 0, dropped: 0 };
    const taken = new Set();

    for (const raw of Array.isArray(data.items) ? data.items : []) {
      if (!raw || typeof raw !== 'object') { report.dropped++; continue; }
      const x = Number(raw.x);
      const y = Number(raw.y);
      const key = `${x},${y}`;
      if (!inBounds(state, x, y) || taken.has(key)) { report.dropped++; continue; }
      let id = Number(raw.id);
      if (!Number.isInteger(id) || !hasDef(id)) { id = 0; report.unknown++; }
      taken.add(key);
      state.items.push({ uid: newUid(), id, x, y, rot: normRot(raw.rot) });
    }
    return { state, report };
  }

  App.model = {
    getDef, hasDef, createEmpty, inBounds, itemAt, findItem, freeCell,
    countOutside, itemsByUids, clampDelta, findGroupSlot,
    normRot, toInt, serialize, deserialize, mutate,
  };

  /* ------------------------------------------- Opérations (annulables) -- */
  const get = () => App.store.get();

  App.ops = {
    /** Pose un item (remplace ce qui occupe la case). Retourne l'uid. */
    place(id, x, y, rot = 0) {
      let uid = null;
      App.store.commit('Ajouter', (d) => (uid = mutate.place(d, id, x, y, rot)));
      return uid || null;
    },
    /** Déplace ; si la case est occupée, les deux items sont échangés. */
    move: (uid, x, y) => App.store.commit('Déplacer', (d) => mutate.move(d, uid, x, y)),
    rotate: (uid, delta) => App.store.commit('Pivoter', (d) => mutate.rotate(d, uid, delta)),
    remove: (uid) => App.store.commit('Supprimer', (d) => mutate.remove(d, uid)),
    resize: (cols, rows) => App.store.commit('Taille de grille', (d) => mutate.resize(d, cols, rows)),
    duplicate(uid) {
      const s = get();
      const it = findItem(s, uid);
      if (!it) return null;
      const cell = freeCell(s, it.x, it.y);
      if (!cell) return null;
      return App.ops.place(it.id, cell.x, cell.y, it.rot);
    },

    /* --- Groupes (sélection multiple) --- */
    moveMany: (uids, dx, dy) =>
      App.store.commit(uids.length > 1 ? 'Déplacer la sélection' : 'Déplacer',
        (d) => mutate.moveMany(d, uids, dx, dy)),
    rotateMany: (uids, delta) =>
      App.store.commit('Pivoter', (d) => mutate.rotateMany(d, uids, delta)),
    removeMany: (uids) =>
      App.store.commit(uids.length > 1 ? `Supprimer ${uids.length} items` : 'Supprimer',
        (d) => mutate.removeMany(d, uids)),
    /** Copie le groupe sur l'emplacement libre le plus proche. Retourne les nouveaux uids. */
    duplicateMany(uids) {
      if (uids.length === 1) { const u = App.ops.duplicate(uids[0]); return u ? [u] : null; }
      const s = get();
      const sel = itemsByUids(s, uids);
      const off = findGroupSlot(s, sel);
      if (!sel.length || !off) return null;
      const created = [];
      App.store.commit('Dupliquer', (d) => {
        for (const i of sel) created.push(mutate.place(d, i.id, i.x + off.dx, i.y + off.dy, i.rot));
      });
      return created;
    },
    /** Remplace tout l'environnement (chargement, nouveau…). */
    replace(next, label = 'Remplacer') {
      return App.store.commit(label, (d) => { d.grid = next.grid; d.items = next.items; });
    },
  };
})(window.App);
