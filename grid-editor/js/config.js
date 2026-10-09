/* ============================================================================
 *  CONFIGURATION — c'est ici qu'on ajoute / retire des items.
 * ----------------------------------------------------------------------------
 *  id     : entier UNIQUE. C'est lui qui est écrit dans les sauvegardes.
 *           Ne réutilisez jamais l'id d'un item que vous avez supprimé.
 *  name   : nom affiché dans le menu de gauche.
 *  image  : chemin de l'image (relatif à index.html) ou URL.
 *  hidden : (optionnel) true = n'apparaît pas dans le menu de gauche.
 *
 *  L'id 0 est RÉSERVÉ : quand une sauvegarde contient un id introuvable
 *  dans cette liste, l'item est converti en id 0.
 * ========================================================================== */

const ITEMS = [
  { id: 0, name: 'Inconnu', image: 'img/unknown.svg', hidden: true },

  { id: 1, name: 'Vide', image: 'img/tco-pieces/vide.svg' },
  { id: 2, name: 'Droite', image: 'img/tco-pieces/droite.svg' },
  { id: 3, name: 'Diagonale', image: 'img/tco-pieces/diagonale.svg' },
  { id: 4, name: 'Aiguillage', image: 'img/tco-pieces/aiguillage.svg' },
  { id: 5, name: 'Aiguillage miroir', image: 'img/tco-pieces/aiguillage-miroir.svg' },
  { id: 6, name: 'Fin', image: 'img/tco-pieces/fin.svg' },

  { id: 11, name: 'Vide + bouton', image: 'img/tco-pieces/vide-bouton.svg' },
  { id: 12, name: 'Droite + bouton', image: 'img/tco-pieces/droite-bouton.svg' },
  { id: 13, name: 'Diagonale + bouton', image: 'img/tco-pieces/diagonale-bouton.svg' },
  { id: 14, name: 'Aiguillage + bouton', image: 'img/tco-pieces/aiguillage-bouton.svg' },
  { id: 15, name: 'Aiguillage miroir + bouton', image: 'img/tco-pieces/aiguillage-miroir-bouton.svg' },
  { id: 16, name: 'Fin + bouton', image: 'img/tco-pieces/fin-bouton.svg' },

  { id: 21, name: 'Vide + bouton vert', image: 'img/tco-pieces/vide-bouton-vert.svg' },
  { id: 22, name: 'Droite + bouton vert (haut g.)', image: 'img/tco-pieces/droite-bouton-vert-hg.svg' },
  { id: 41, name: 'Droite + bouton vert (haut d.)', image: 'img/tco-pieces/droite-bouton-vert-hd.svg' },
  { id: 23, name: 'Diagonale + bouton vert (haut g.)', image: 'img/tco-pieces/diagonale-bouton-vert-hg.svg' },
  { id: 42, name: 'Diagonale + bouton vert (bas g.)', image: 'img/tco-pieces/diagonale-bouton-vert-bg.svg' },
  { id: 43, name: 'Diagonale + bouton vert (bas d.)', image: 'img/tco-pieces/diagonale-bouton-vert-bd.svg' },
  { id: 26, name: 'Fin + bouton vert (gauche)', image: 'img/tco-pieces/fin-bouton-vert-g.svg' },
  { id: 44, name: 'Fin + bouton vert (haut d.)', image: 'img/tco-pieces/fin-bouton-vert-hd.svg' },
  { id: 45, name: 'Fin + bouton vert (bas d.)', image: 'img/tco-pieces/fin-bouton-vert-bd.svg' },

  { id: 31, name: 'Droite + feu (vert à droite)', image: 'img/tco-pieces/droite-feu.svg' },
  { id: 34, name: 'Droite + feu (vert à gauche)', image: 'img/tco-pieces/droite-feu-inverse.svg' },
];

/* Réglages généraux */
const CONFIG = {
  appName: 'Grid Editor',
  grid: {
    defaultCols: 10,   // X (paysage par défaut : 10 × 5)
    defaultRows: 5,    // Y
    min: 1,
    max: 15,
  },
  view: {
    baseCell: 64,      // taille d'une case à 100 % (px)
    minZoom: 0.25,     // 25 %
    maxZoom: 4,        // 400 %
    zoomStep: 1.25,    // facteur par clic / par touche
    wheelZooms: true, // false : molette = déplacer, Ctrl+molette = zoom
    // true  : molette = zoom
  },
  storageKey: 'grid-editor.workspace.v1', // clé localStorage
  autosaveDelay: 250,                      // ms après la dernière modification
  historyLimit: 200,                       // nombre d'annulations possibles
  saveFileName: 'environnement.json',
  fileFormat: 'grid-editor',
  fileVersion: 1,
};
