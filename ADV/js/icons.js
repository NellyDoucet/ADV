/* Initialise les icônes Lucide sur l'ensemble des éléments [data-lucide]
   présents dans le document. À appeler après chaque injection de contenu. */
(function (window) {
  'use strict';

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  window.Icons = {
    refresh: refreshIcons
  };
})(window);
