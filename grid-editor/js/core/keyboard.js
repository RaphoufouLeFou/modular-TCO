/* ============================================================================
 *  RACCOURCIS CLAVIER — App.keys
 * ----------------------------------------------------------------------------
 *  Les raccourcis sont déclarés sur les commandes :  keys: ['Mod+S']
 *    Mod   = Ctrl (Windows/Linux) ou ⌘ (Mac)
 *    Alt, Shift, puis la touche : A…Z, 0…9, Space, Delete, Backspace,
 *    Escape, Enter, ArrowUp/Down/Left/Right, F1…F12, Plus, Minus,
 *    ou un symbole ('?', '=').
 *  Les chiffres marchent aussi sur AZERTY (Ctrl+0 = Ctrl+à).
 *
 *  Options de commande utiles :
 *    repeat: true         → la touche maintenue répète la commande
 *    allowInInputs: true  → marche aussi quand on tape dans un champ
 * ========================================================================== */
(function (App) {
  'use strict';

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const MODS = ['Mod', 'Alt', 'Shift'];

  function normalizeKey(key) {
    if (key === ' ' || key === 'Spacebar') return 'Space';
    if (key === '+') return 'Plus';
    if (key === '-') return 'Minus';
    if (key === 'Esc') return 'Escape';
    if (key === 'Del') return 'Delete';
    if (key.length === 1) return key.toUpperCase();
    return key;
  }


  /** 'ctrl+shift+s' → 'Mod+Shift+S' (ordre canonique). */
  function normalizeCombo(combo) {
    const plus = combo.endsWith('++') || combo === '+';
    const parts = (plus ? combo.slice(0, -1) : combo).split('+').map((p) => p.trim()).filter(Boolean);
    const key = plus ? 'Plus' : normalizeKey(parts.pop() || '');
    const mods = new Set(parts.map((p) => {
      const l = p.toLowerCase();
      if (['ctrl', 'control', 'cmd', 'meta', 'mod'].includes(l)) return 'Mod';
      if (l === 'alt' || l === 'option') return 'Alt';
      if (l === 'shift') return 'Shift';
      return p;
    }));
    return [...MODS.filter((m) => mods.has(m)), key].join('+');
  }

  function buildCombo(e, rawKey) {
    const key = normalizeKey(rawKey || '');
    if (!key || ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'].includes(key)) return null;
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('Mod');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey && !isSymbol(rawKey)) parts.push('Shift'); // '?' = Maj+… implicite
    parts.push(key);
    return parts.join('+');
  }

  const isSymbol = (raw) => raw.length === 1 && raw !== ' ' && !/[a-z0-9]/i.test(raw);

  /** Combinaisons candidates : par caractère, et par position pour les chiffres. */
  function combosFromEvent(e) {
    const list = [buildCombo(e, e.key)];
    const m = /^Digit(\d)$/.exec(e.code || '');
    if (m && e.key !== m[1]) list.push(buildCombo(e, m[1]));
    return list.filter(Boolean);
  }

  const comboFromEvent = (e) => combosFromEvent(e)[0] || null;

  const LABELS = {
    Mod: isMac ? '⌘' : 'Ctrl', Alt: isMac ? '⌥' : 'Alt', Shift: isMac ? '⇧' : 'Maj',
    Space: 'Espace', Delete: 'Suppr', Backspace: '⌫', Escape: 'Échap', Enter: 'Entrée',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Plus: '+', Minus: '−',
  };

  /** 'Mod+Shift+S' → 'Ctrl+Maj+S' (ou '⌘⇧S' sur Mac). */
  function format(combo) {
    if (!combo) return '';
    const parts = normalizeCombo(combo).split('+').map((p) => LABELS[p] || p);
    return parts.join(isMac ? '' : '+');
  }

  function isTyping(t) {
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.isComposing) return;
    if (document.querySelector('dialog[open]')) return; // les dialogues gèrent leurs touches
    const combos = combosFromEvent(e);
    if (!combos.length) return;

    const typing = isTyping(e.target);
    const matches = App.commands.list((c) =>
      Array.isArray(c.keys) && c.keys.some((k) => combos.includes(normalizeCombo(k))));
    const cmd = matches.find((c) => (!typing || c.allowInInputs) && App.isEnabled(c));
    if (!cmd) return;

    e.preventDefault();
    if (e.repeat && !cmd.repeat) return;
    App.run(cmd.id);
  });

  App.keys = { format, normalizeCombo, comboFromEvent, combosFromEvent, isMac };
})(window.App);
