/* ============================================================================
 *  DRAG & DROP — App.dnd.press(pointerEvent, options)
 * ----------------------------------------------------------------------------
 *  Basé sur les Pointer Events : fonctionne à la souris ET au doigt.
 *  À appeler dans un 'pointerdown'. Si le pointeur bouge de plus de
 *  quelques pixels, un fantôme suit le curseur ; sinon c'est un clic.
 *
 *  Les zones de dépôt sont les éléments qui ont un attribut [data-drop].
 *
 *  options = {
 *    image, size, rotation,      // fantôme par défaut (une image)
 *    buildGhost() → Element,     // ou fantôme personnalisé
 *    offset: { x, y },           // point saisi dans le fantôme (défaut : centre)
 *    accepts(targetEl) → bool,   // zone acceptée ?
 *    hoverClass: 'drop-hover',   // classe posée sur la zone survolée (null = aucune)
 *    onStart(), onHover(targetEl|null), onDrop(targetEl, ev),
 *    onCancel(), onClick(ev), onEnd()
 *  }
 *  App.dnd.cancel() annule le glisser en cours ; App.dnd.active() → bool.
 * ========================================================================== */
(function (App) {
  'use strict';

  const THRESHOLD = 5; // px
  let current = null;  // { finish }

  function defaultGhost({ image, size = 56, rotation = 0 }) {
    const ghost = document.createElement('div');
    ghost.style.width = ghost.style.height = `${size}px`;
    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = '';
      img.draggable = false;
      img.style.transform = `rotate(${rotation}deg)`;
      ghost.append(img);
    }
    return ghost;
  }

  function targetAt(x, y) {
    const hit = document.elementFromPoint(x, y);
    return hit ? hit.closest('[data-drop]') : null;
  }

  function press(e, opts = {}) {
    if (e.button !== undefined && e.button !== 0) return;
    current?.finish(null, true);

    const { pointerId } = e;
    const startX = e.clientX;
    const startY = e.clientY;
    const hoverClass = opts.hoverClass === undefined ? 'drop-hover' : opts.hoverClass;
    const accepts = (t) => !!t && (!opts.accepts || opts.accepts(t));
    let dragging = false;
    let ghost = null;
    let offset = null;
    let hover = null;
    let finished = false;

    const setHover = (t) => {
      t = accepts(t) ? t : null;
      if (t === hover) return;
      if (hoverClass) hover?.classList.remove(hoverClass);
      hover = t;
      if (hoverClass) hover?.classList.add(hoverClass);
      if (dragging) opts.onHover?.(hover);
    };

    const place = (x, y) => {
      ghost.style.transform = `translate(${x - offset.x}px, ${y - offset.y}px)`;
    };

    function onMove(ev) {
      if (ev.pointerId !== pointerId) return;
      if (!dragging) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < THRESHOLD) return;
        dragging = true;
        opts.onStart?.();
        ghost = opts.buildGhost ? opts.buildGhost() : defaultGhost(opts);
        ghost.classList.add('drag-ghost');
        document.body.append(ghost);
        const size = opts.size || 56;
        offset = opts.offset || { x: size / 2, y: size / 2 };
        document.body.classList.add('is-dragging');
      }
      ev.preventDefault();
      place(ev.clientX, ev.clientY);
      setHover(targetAt(ev.clientX, ev.clientY));
    }

    function finish(ev, cancelled) {
      if (finished) return;
      finished = true;
      current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      ghost?.remove();
      setHover(null);
      document.body.classList.remove('is-dragging');

      if (!dragging) {
        if (!cancelled) opts.onClick?.(ev);
      } else if (cancelled || !ev) {
        opts.onCancel?.();
      } else {
        const t = targetAt(ev.clientX, ev.clientY);
        if (accepts(t)) opts.onDrop?.(t, ev);
        else opts.onCancel?.();
      }
      if (dragging) opts.onEnd?.();
    }

    const onUp = (ev) => { if (ev.pointerId === pointerId) finish(ev, false); };
    const onCancel = (ev) => { if (ev.pointerId === pointerId) finish(ev, true); };
    const onKey = (ev) => {
      if (ev.key === 'Escape' && dragging) {
        ev.preventDefault();
        ev.stopPropagation();
        finish(null, true);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    current = { finish };
  }

  App.dnd = {
    press,
    cancel: () => current?.finish(null, true),
    active: () => !!current,
  };
})(window.App);
