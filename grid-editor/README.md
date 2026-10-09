# Grid Editor

Éditeur de grille en HTML / CSS / JS, sans dépendance ni serveur.
**Lancer : double-cliquez sur `index.html`** (Chrome ou Edge recommandés pour les vraies boîtes de dialogue Enregistrer / Ouvrir).

```
index.html            ← ordre de chargement des scripts (retirer une ligne = retirer une feature)
css/style.css         ← thème (variables de couleurs en haut) + mise en page
img/                  ← images des items
js/config.js          ← ★ LISTE DES ITEMS + réglages (taille par défaut, limites…)
js/core/              ← noyau : état, commandes, registres, drag & drop, clavier, helpers UI
js/ui/                ← les 4 zones de l'écran (barre du haut, panneau gauche, grille, menu du bas)
js/features/          ← une feature = un fichier
js/main.js            ← démarrage
```

## Ajouter un item

Dans `js/config.js`, ajoutez une ligne au tableau `ITEMS` :

```js
{ id: 7, name: 'Lampe', image: 'img/lampe.png' },
```

- `id` : entier unique, c'est lui qui est écrit dans les sauvegardes. Ne réutilisez pas l'id d'un item supprimé.
- L'id `0` est réservé : quand on charge une sauvegarde contenant un id qui n'existe plus, l'item passe à l'id 0 (affiché avec un « ? » rouge) et un message indique combien d'items sont concernés.

## Principe de modularité

Tout passe par l'objet global `App`. Une feature est un module :

```js
App.module({
  id: 'feature.ma-feature',
  setup(App) { /* enregistrer commandes, menus, onglets… */ },
  start(App) { /* optionnel : code qui a besoin du DOM prêt */ },
});
```

Créez le fichier dans `js/features/`, ajoutez sa ligne `<script>` dans `index.html` (section 4). Pour retirer une feature, supprimez sa ligne : les menus, boutons et raccourcis qu'elle déclarait disparaissent avec elle.

### Commande (+ raccourci clavier)

```js
App.commands.add({
  id: 'item.flip',
  label: 'Retourner',
  icon: 'swap',                 // nom d'icône de App.ui.icons (extensible)
  keys: ['X', 'Mod+Shift+X'],   // Mod = Ctrl (ou ⌘ sur Mac)
  enabled: (App) => App.selectedUids().length > 0,
  run: (App) => App.ops.rotateMany(App.selectedUids(), 180),
});
```

Options : `repeat: true` (touche maintenue), `allowInInputs: true` (actif pendant la saisie). Le raccourci apparaît automatiquement dans les menus, les infobulles et l'aide (F1).

### Menu de la barre du haut

```js
App.menus.add({ id: 'tools', label: 'Outils', order: 40 });                         // nouveau menu
App.menuItems.add({ id: 'tools.flip', menu: 'tools', command: 'item.flip', group: 'a', order: 1 });
```

Un changement de `group` insère un séparateur. Un menu sans entrée n'est pas affiché.

### Bouton de la barre du haut / indicateur de statut

```js
App.toolbar.add({ id: 'flip', command: 'item.flip', order: 30, showLabel: true });
App.statusItems.add({ id: 'zoom', order: 50, render: (App) => App.ui.el('span', { class: 'status-chip' }, '100 %') });
```

### Action du menu du bas (item sélectionné)

```js
App.itemActions.add({ id: 'flip', command: 'item.flip', order: 40 });
```

### Onglet du panneau de gauche

```js
App.tabs.add({
  id: 'infos', label: 'Infos', icon: 'info', order: 30,
  render(panel, App) {
    panel.append(App.ui.el('p', null, 'Contenu de l’onglet'));
    App.on('change', () => { /* se mettre à jour */ });
  },
});
```

### Modifier l'environnement

Ne modifiez jamais `App.store.get()` directement : utilisez `App.ops` ou `App.store.commit('Libellé', (draft) => { … })`. Ainsi l'annulation (Ctrl+Z) et la sauvegarde automatique fonctionnent toutes seules.

| Opération | Effet |
|---|---|
| `place(id, x, y, rot)` | pose un item (remplace l'occupant), retourne son uid |
| `moveMany(uids, dx, dy)` / `move(uid, x, y)` | décale ; refusé si ça sort de la grille ; les items déjà sur les cases d'arrivée glissent dans les cases libérées (1 item = échange) |
| `rotateMany(uids, ±90)` | pivote chaque item sur place |
| `removeMany(uids)` | supprime |
| `duplicateMany(uids)` | copie le groupe à l'emplacement libre le plus proche |
| `resize(cols, rows)` / `replace(state)` | taille de grille / tout remplacer |

### Sélection et vue

- Sélection : `App.selectedUids()`, `App.selectedItems()`, `App.selectedItem()` (item principal = dernier cliqué, sinon le plus en haut à gauche), `App.select(uid)`, `App.setSelection([uids])`, `App.toggleSelect(uid)`.
- Vue : `App.view.zoomTo(1)`, `App.view.zoomBy(1.25)`, `App.view.panBy(dx, dy)`, `App.view.fit()`, `App.view.setHand(true)`. Réglages dans `CONFIG.view` (zoom min/max, pas, `wheelZooms: true` pour que la molette zoome au lieu de défiler).

Événements utiles : `App.on('change' | 'selection' | 'mode' | 'view' | 'ready', fn)`.

## Raccourcis clavier

| Action | Touches |
|---|---|
| Enregistrer / Ouvrir | Ctrl+S / Ctrl+O |
| Taille de la grille | Ctrl+G |
| Annuler / Rétablir | Ctrl+Z / Ctrl+Y (ou Ctrl+Maj+Z) |
| Pivoter +90° / −90° | Espace ou R / Maj+Espace ou Maj+R |
| Supprimer | Suppr ou ⌫ |
| Déplacer d'une case | Flèches |
| Mode déplacement | M, puis cliquer une case |
| Dupliquer | Ctrl+D |
| Tout sélectionner | Ctrl+A |
| Item suivant / précédent | N / Maj+N |
| Désélectionner / annuler | Échap |
| Zoom avant / arrière | Ctrl+Plus / Ctrl+Moins (ou + / − seuls) |
| Ajuster à l'écran / 100 % | Ctrl+0 ou F / Ctrl+1 |
| Outil main | H |
| Aide | F1 ou ? |

Les actions (pivoter, déplacer, dupliquer, supprimer) s'appliquent à **toute la sélection**.

**Souris**

- Poser : glisser depuis la gauche (remplace l'item de la case) · double-clic sur un item : pivoter.
- Sélectionner : clic · Maj/Ctrl+clic pour ajouter/retirer · glisser sur une case vide = rectangle de sélection (Maj/Ctrl pour ajouter).
- Déplacer : glisser un item sélectionné emmène toute la sélection (les cases d'arrivée s'allument ; le groupe reste dans la grille). Lâcher sur le panneau de gauche = supprimer.
- Vue : glisser le fond hors de la grille, clic molette ou clic droit = déplacer · molette / pavé tactile = défiler · Ctrl+molette ou pincement = zoom (centré sur le curseur). Boutons de zoom en bas à droite.
- Tactile : 1 doigt sur le fond = déplacer, 2 doigts = pincer pour zoomer.
- Glisser un fichier `.json` sur la fenêtre l'ouvre.

## Sauvegardes

- **Automatique** : chaque modification est écrite dans le `localStorage` (clé `CONFIG.storageKey`) et rechargée à l'ouverture.
- **Fichier** : Enregistrer / Ouvrir. Chrome, Edge et Opera ouvrent la boîte de dialogue système pour choisir l'emplacement. Firefox et Safari n'ont pas cette API : le nom est demandé puis le fichier est téléchargé (activez « Toujours demander où enregistrer les fichiers » dans le navigateur pour choisir le dossier).

Format :

```json
{
  "format": "grid-editor",
  "version": 1,
  "savedAt": "2026-09-23T17:00:00.000Z",
  "grid": { "cols": 10, "rows": 5 },
  "items": [ { "id": 2, "x": 0, "y": 0, "rot": 90 } ]
}
```

`x` = colonne (0 à cols−1), `y` = ligne (0 à rows−1), `rot` ∈ {0, 90, 180, 270}. Au chargement, les items hors grille ou en double sur une même case sont ignorés.
