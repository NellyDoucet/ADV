/* Redimensionne automatiquement les iframes d'exercice (meme origine) a
   la hauteur reelle de leur contenu, au chargement et quand l'utilisateur
   verifie ses reponses. */
(function (window, document) {
  'use strict';

  function resize(iframe) {
    try {
      var doc = iframe.contentWindow.document;
      var h = doc.documentElement.scrollHeight;
      iframe.style.height = (h + 40) + 'px';
    } catch (e) { /* cross-origin : hauteur par defaut conservee */ }
  }

  function init() {
    var frames = document.querySelectorAll('iframe.exercise-frame');
    frames.forEach(function (iframe) {
      iframe.addEventListener('load', function () {
        resize(iframe);
        try {
          iframe.contentWindow.document.body.addEventListener('click', function () {
            setTimeout(function () { resize(iframe); }, 50);
          });
        } catch (e) { /* ignore */ }
      });
    });
  }

  window.ExerciseFrame = { init: init };
})(window, document);
