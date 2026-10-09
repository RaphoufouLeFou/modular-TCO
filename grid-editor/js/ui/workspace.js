/* ============================================================================
 *  ZONE DE TRAVAIL — quadrillage central.
 * ----------------------------------------------------------------------------
 *  Vue (App.view)
 *    - glisser le fond (hors grille), clic molette ou clic droit : déplacer
 *    - molette / pavé tactile : déplacer · Ctrl+molette ou pincer : zoomer
 *    - outil main (App.view.setHand) : glisser n'importe où déplace la vue
 *  Items
 *    - clic : sélectionner · Maj/Ctrl+clic : ajouter/retirer de la sélection
 *    - glisser sur une case vide : sélection rectangulaire (Maj/Ctrl = ajout)
 *    - glisser un item : déplace toute la sélection (aperçu des cases)
 *    - lâcher sur le panneau de gauche : supprime la sélection
 *    - double-clic : pivoter
 *    - mode « move » : cliquer une case pour y amener la sélection
 *  Expose App.view et App.workspace.
 * ========================================================================== */
App.module({
  id: 'ui.workspace',

  start(App) {
    const { el } = App.ui;
    const M = App.model;
    const V = CONFIG.view;
    const root = document.getElementById('workspace');
    const gridEl = el('div', { class: 'grid', role: 'grid', 'aria-label': 'Zone de travail' });
    const stage = el('div', { class: 'stage' }, gridEl);
    const marquee = el('div', { class: 'marquee', hidden: true });
    root.append(stage, marquee);

    let cols = 0;
    let rows = 0;
    let cells = [];
    const itemEls = new Map(); // uid → { el, inner, id, rot, angle }

    /* ======================================================== VUE ===== */
    const view = { zoom: 1, panX: 0, panY: 0, hand: false };
    let autoFit = true; // tant que l'utilisateur n'a pas zoomé/déplacé : ajuster auto

    const cell = () => Math.max(4, Math.round(V.baseCell * view.zoom));
    const clampZoom = (z) => Math.min(V.maxZoom, Math.max(V.minZoom, z));
    const gridPx = () => ({ w: cols * cell() + 1, h: rows * cell() + 1 });

    function local(ev) {
      const r = root.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    function apply() {
      const c = cell();
      root.style.setProperty('--cell', `${c}px`);
      stage.style.transform = `translate(${Math.round(view.panX)}px, ${Math.round(view.panY)}px)`;
      const dots = Math.max(8, Math.round(18 * view.zoom));
      root.style.backgroundSize = `${dots}px ${dots}px`;
      root.style.backgroundPosition = `${Math.round(view.panX)}px ${Math.round(view.panY)}px`;
      root.classList.toggle('hand', view.hand);
      App.emit('view', { ...view, cell: c });
    }

    /** Garde toujours un morceau de grille visible. */
    function clampPan() {
      const m = 48;
      const { w, h } = gridPx();
      view.panX = Math.min(root.clientWidth - m, Math.max(m - w, view.panX));
      view.panY = Math.min(root.clientHeight - m, Math.max(m - h, view.panY));
    }

    function fit() {
      const W = root.clientWidth;
      const H = root.clientHeight;
      if (!W || !H || !cols) return;
      const pad = 32;
      const size = Math.min((W - 2 * pad) / cols, (H - 2 * pad) / rows);
      view.zoom = clampZoom(size / V.baseCell);
      const { w, h } = gridPx();
      view.panX = (W - w) / 2;
      view.panY = (H - h) / 2;
      autoFit = true;
      apply();
    }

    /** Zoom en gardant fixe le point (ax, ay) de la zone (défaut : centre). */
    function zoomTo(z, ax, ay) {
      if (ax == null) { ax = root.clientWidth / 2; ay = root.clientHeight / 2; }
      const old = cell();
      z = clampZoom(z);
      if (z === view.zoom) return;
      const ux = (ax - view.panX) / old;
      const uy = (ay - view.panY) / old;
      view.zoom = z;
      view.panX = ax - ux * cell();
      view.panY = ay - uy * cell();
      autoFit = false;
      clampPan();
      apply();
    }

    function panBy(dx, dy) {
      view.panX += dx;
      view.panY += dy;
      autoFit = false;
      clampPan();
      apply();
    }

    function setHand(on) {
      view.hand = !!on;
      apply();
    }

    new ResizeObserver(() => {
      if (autoFit) fit();
      else { clampPan(); apply(); }
    }).observe(root);

    /* ======================================================= GRILLE ===== */
    function buildCells(c, r) {
      cols = c;
      rows = r;
      gridEl.style.setProperty('--cols', c);
      gridEl.style.setProperty('--rows', r);
      cells = [];
      const frag = document.createDocumentFragment();
      for (let y = 0; y < r; y++) {
        for (let x = 0; x < c; x++) {
          const cellEl = el('div', { class: 'cell', role: 'gridcell', dataset: { drop: 'cell', x, y } });
          cells.push(cellEl);
          frag.append(cellEl);
        }
      }
      gridEl.replaceChildren(frag);
      previewed = [];
      if (autoFit) fit();
      else { clampPan(); apply(); }
    }

    const cellOf = (t) => ({ x: Number(t.dataset.x), y: Number(t.dataset.y) });

    function createItemEl(it) {
      const def = M.getDef(it.id);
      const inner = el('div', { class: 'item-inner', style: { transform: `rotate(${it.rot}deg)` } },
        App.ui.itemImage(def));
      const node = el('div', {
        class: `item${it.id === 0 ? ' item-unknown' : ''}`,
        dataset: { uid: it.uid },
      }, inner);
      node.addEventListener('pointerdown', (e) => onItemPointerDown(e, it.uid));
      node.addEventListener('dblclick', (e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey || view.hand) return;
        App.select(it.uid);
        App.ops.rotate(it.uid, 90);
      });
      return { el: node, inner, id: it.id, rot: it.rot, angle: it.rot };
    }

    function render() {
      const s = App.store.get();
      if (s.grid.cols !== cols || s.grid.rows !== rows) buildCells(s.grid.cols, s.grid.rows);

      const seen = new Set();
      for (const it of s.items) {
        seen.add(it.uid);
        let rec = itemEls.get(it.uid);
        if (!rec || rec.id !== it.id) {
          rec?.el.remove();
          rec = createItemEl(it);
          itemEls.set(it.uid, rec);
        }
        if (rec.rot !== it.rot) {
          // plus court chemin : 270° → 0° tourne de +90° et non de −270°
          const delta = ((((it.rot - rec.rot) % 360) + 540) % 360) - 180;
          rec.angle += delta;
          rec.rot = it.rot;
          rec.inner.style.transform = `rotate(${rec.angle}deg)`;
        }
        rec.el.title = `${M.getDef(it.id).name} — (${it.x}, ${it.y}) ${it.rot}°`;
        const target = cells[it.y * cols + it.x];
        if (target && rec.el.parentNode !== target) target.append(rec.el);
      }
      for (const [uid, rec] of itemEls) {
        if (!seen.has(uid)) { rec.el.remove(); itemEls.delete(uid); }
      }
      renderSelection();
    }

    function renderSelection() {
      for (const [uid, rec] of itemEls) rec.el.classList.toggle('selected', App.isSelected(uid));
      gridEl.classList.toggle('mode-move', App.getMode() === 'move');
      if (App.getMode() !== 'move') setPreview([]);
    }

    /* ------------------------------------------ Aperçu des cases cibles -- */
    let previewed = [];
    function setPreview(list) {
      previewed.forEach((c) => c.classList.remove('drop-preview'));
      previewed = list.map(({ x, y }) => cells[y * cols + x]).filter(Boolean);
      previewed.forEach((c) => c.classList.add('drop-preview'));
    }
    const targetsOf = (uids, d) =>
      M.itemsByUids(App.store.get(), uids).map((i) => ({ x: i.x + d.dx, y: i.y + d.dy }));

    /** Amène la sélection pour que l'item principal arrive en (x, y). */
    function moveSelectionTo(x, y) {
      const anchor = App.selectedItem();
      const uids = App.selectedUids();
      App.setMode(null);
      if (!anchor) return;
      const d = M.clampDelta(App.store.get(), uids, x - anchor.x, y - anchor.y);
      if (d.dx || d.dy) App.ops.moveMany(uids, d.dx, d.dy);
    }

    // survol en mode déplacement : aperçu de l'arrivée
    gridEl.addEventListener('pointermove', (e) => {
      if (App.getMode() !== 'move' || gesture || App.dnd.active()) return;
      const c = e.target.closest('.cell');
      const anchor = App.selectedItem();
      if (!c || !anchor) { setPreview([]); return; }
      const { x, y } = cellOf(c);
      const uids = App.selectedUids();
      setPreview(targetsOf(uids, M.clampDelta(App.store.get(), uids, x - anchor.x, y - anchor.y)));
    });
    gridEl.addEventListener('pointerleave', () => { if (App.getMode() === 'move') setPreview([]); });

    /* ============================================== GLISSER DES ITEMS ===== */
    function buildGroupGhost(uids, anchor) {
      const c = cell();
      const wrap = el('div', { class: 'group-ghost' });
      for (const i of M.itemsByUids(App.store.get(), uids)) {
        const def = M.getDef(i.id);
        const img = App.ui.itemImage(def);
        wrap.append(el('div', {
          class: 'ghost-item',
          style: {
            left: `${(i.x - anchor.x) * c}px`, top: `${(i.y - anchor.y) * c}px`,
            width: `${c}px`, height: `${c}px`, transform: `rotate(${i.rot}deg)`,
          },
        }, img));
      }
      return wrap;
    }

    function onItemPointerDown(e, uid) {
      if (e.button !== 0 || view.hand || pinch) return; // laisse la vue gérer
      e.stopPropagation();
      const it = M.findItem(App.store.get(), uid);
      if (!it) return;
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;

      // Mode déplacement : cliquer un autre item = y amener la sélection
      if (App.getMode() === 'move' && App.selectedUids().length && !App.isSelected(uid)) {
        e.preventDefault();
        moveSelectionTo(it.x, it.y);
        return;
      }

      const rec = itemEls.get(uid);
      const r = rec.el.parentNode.getBoundingClientRect();
      let group = [];

      App.dnd.press(e, {
        offset: { x: e.clientX - r.left, y: e.clientY - r.top },
        hoverClass: null,
        accepts: (t) => t.dataset.drop === 'cell' || t.dataset.drop === 'trash',
        onStart: () => {
          if (!App.isSelected(uid)) {
            if (additive) App.addToSelection(uid); else App.select(uid);
          } else {
            App.setSelection(App.selectedUids(), uid); // devient l'item principal
          }
          App.setMode(null);
          group = App.selectedUids();
          group.forEach((g) => itemEls.get(g)?.el.classList.add('drag-source'));
        },
        buildGhost: () => buildGroupGhost(group, it),
        onHover: (t) => {
          if (t && t.dataset.drop === 'cell') {
            const { x, y } = cellOf(t);
            setPreview(targetsOf(group, M.clampDelta(App.store.get(), group, x - it.x, y - it.y)));
          } else {
            setPreview([]);
          }
        },
        onClick: () => (additive ? App.toggleSelect(uid) : App.select(uid)),
        onDrop: (t) => {
          if (t.dataset.drop === 'trash') { App.ops.removeMany(group); return; }
          const { x, y } = cellOf(t);
          const d = M.clampDelta(App.store.get(), group, x - it.x, y - it.y);
          if (d.dx || d.dy) App.ops.moveMany(group, d.dx, d.dy);
        },
        onEnd: () => {
          setPreview([]);
          group.forEach((g) => itemEls.get(g)?.el.classList.remove('drag-source'));
        },
      });
    }

    /* ======================================== GESTES SUR LA ZONE ===== */
    let gesture = null; // geste en cours (déplacement de vue ou lasso)

    function track(e, { move, end }) {
      const id = e.pointerId;
      const onMove = (ev) => { if (ev.pointerId === id) move(ev); };
      const onUp = (ev) => { if (ev.pointerId === id) finish(ev, false); };
      const onCancel = (ev) => { if (ev.pointerId === id) finish(ev, true); };
      let done = false;
      function finish(ev, cancelled) {
        if (done) return;
        done = true;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        gesture = null;
        end(ev, cancelled);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      gesture = { cancel: () => finish(null, true) };
    }

    function startPan(e, clickDeselects) {
      const sx = e.clientX;
      const sy = e.clientY;
      let lx = sx;
      let ly = sy;
      let moved = false;
      track(e, {
        move(ev) {
          if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 3) return;
          if (!moved) { moved = true; root.classList.add('panning'); }
          panBy(ev.clientX - lx, ev.clientY - ly);
          lx = ev.clientX;
          ly = ev.clientY;
        },
        end(ev, cancelled) {
          root.classList.remove('panning');
          if (moved || cancelled || !clickDeselects) return;
          if (App.getMode()) App.setMode(null);
          else App.select(null);
        },
      });
    }

    function itemsInRect(x0, y0, x1, y1) {
      const c = cell();
      const cx0 = Math.floor((x0 - view.panX - 1) / c);
      const cx1 = Math.floor((x1 - view.panX - 1) / c);
      const cy0 = Math.floor((y0 - view.panY - 1) / c);
      const cy1 = Math.floor((y1 - view.panY - 1) / c);
      return App.store.get().items
        .filter((i) => i.x >= cx0 && i.x <= cx1 && i.y >= cy0 && i.y <= cy1)
        .map((i) => i.uid);
    }

    function startMarquee(e, startCell) {
      const start = local(e);
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;
      const base = additive ? App.selectedUids() : [];
      let active = false;
      track(e, {
        move(ev) {
          const p = local(ev);
          if (!active) {
            if (Math.hypot(p.x - start.x, p.y - start.y) < 4) return;
            active = true;
            marquee.hidden = false;
            root.classList.add('selecting');
            if (App.getMode()) App.setMode(null);
          }
          const x0 = Math.min(start.x, p.x);
          const y0 = Math.min(start.y, p.y);
          const x1 = Math.max(start.x, p.x);
          const y1 = Math.max(start.y, p.y);
          Object.assign(marquee.style, {
            left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px`,
          });
          App.setSelection([...base, ...itemsInRect(x0, y0, x1, y1)]);
        },
        end(ev, cancelled) {
          marquee.hidden = true;
          root.classList.remove('selecting');
          if (active || cancelled) return;
          // simple clic sur une case
          const { x, y } = cellOf(startCell);
          if (App.getMode() === 'move' && App.selectedUids().length) moveSelectionTo(x, y);
          else if (!additive) App.select(null);
        },
      });
    }

    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.view-controls') || pinch) return;
      if (e.pointerType === 'touch' && touches.size > 1) return;
      const onCell = e.target.closest('.cell');
      if (e.button === 1 || e.button === 2 || view.hand || (e.button === 0 && !onCell)) {
        e.preventDefault();
        startPan(e, e.button === 0 && !onCell && !view.hand);
      } else if (e.button === 0) {
        startMarquee(e, onCell);
      }
    });
    root.addEventListener('contextmenu', (e) => e.preventDefault());
    root.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });

    /* ------------------------------------------------------ Molette -- */
    root.addEventListener('wheel', (e) => {
      if (e.target.closest('.view-controls')) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? root.clientHeight : 1;
      let dx = e.deltaX * unit;
      let dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey || V.wheelZooms) {
        const p = local(e);
        const d = Math.max(-100, Math.min(100, dy));
        zoomTo(view.zoom * Math.exp(-d * 0.0025), p.x, p.y);
      } else {
        if (e.shiftKey && !dx) { dx = dy; dy = 0; }
        panBy(-dx, -dy);
      }
    }, { passive: false });

    /* ----------------------------------------------- Pincer (tactile) -- */
    const touches = new Map();
    let pinch = null;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) startPinch();
    }, true);

    function startPinch() {
      gesture?.cancel();
      App.dnd.cancel();
      marquee.hidden = true;
      const [a, b] = [...touches.values()];
      const r = root.getBoundingClientRect();
      const m = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
      pinch = {
        d0: Math.max(1, dist(a, b)),
        z0: view.zoom,
        ux: (m.x - view.panX) / cell(),
        uy: (m.y - view.panY) / cell(),
      };
    }

    window.addEventListener('pointermove', (e) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!pinch || touches.size < 2) return;
      const [a, b] = [...touches.values()];
      const r = root.getBoundingClientRect();
      const m = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
      view.zoom = clampZoom(pinch.z0 * dist(a, b) / pinch.d0);
      view.panX = m.x - pinch.ux * cell();
      view.panY = m.y - pinch.uy * cell();
      autoFit = false;
      clampPan();
      apply();
    });
    const lift = (e) => {
      if (touches.delete(e.pointerId) && touches.size < 2) pinch = null;
    };
    window.addEventListener('pointerup', lift);
    window.addEventListener('pointercancel', lift);

    /* ======================================================= INIT ===== */
    App.on('change', render);
    App.on('selection', renderSelection);
    App.on('mode', renderSelection);
    render();
    fit();

    App.view = {
      get: () => ({ ...view, cell: cell() }),
      zoomTo,
      zoomBy: (factor, ax, ay) => zoomTo(view.zoom * factor, ax, ay),
      panBy,
      fit,
      setHand,
      isHand: () => view.hand,
      canZoomIn: () => view.zoom < V.maxZoom - 1e-6,
      canZoomOut: () => view.zoom > V.minZoom + 1e-6,
    };
    App.workspace = { cellSize: cell, root, gridElement: gridEl };
  },
});
