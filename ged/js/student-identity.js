/*
 * Identification simple du stagiaire (prenom + nom), stockee dans le
 * navigateur (localStorage). Permet de retrouver son travail sur le
 * meme ordinateur. Pas de compte, pas de mot de passe, pas d envoi
 * a un serveur.
 */
(function (window, document) {
  'use strict';

  var NAME_KEY = 'adv-student-name';

  function slugify(str) {
    return (str || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getName() {
    try {
      return window.localStorage.getItem(NAME_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setName(name) {
    try {
      window.localStorage.setItem(NAME_KEY, name.trim());
    } catch (e) { /* stockage indisponible, on ignore */ }
  }

  function studentKey() {
    return slugify(getName()) || 'anonyme';
  }

  function progressStorageKey(exerciseId) {
    return 'adv-progress-' + studentKey() + '-' + exerciseId;
  }

  function saveProgress(exerciseId, data) {
    try {
      window.localStorage.setItem(progressStorageKey(exerciseId), JSON.stringify(data));
    } catch (e) { /* stockage indisponible ou plein, on ignore */ }
  }

  function loadProgress(exerciseId) {
    try {
      var raw = window.localStorage.getItem(progressStorageKey(exerciseId));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function renderBanner() {
    var existing = document.getElementById('student-identity-banner');
    if (existing) {
      existing.remove();
    }
    var banner = document.createElement('div');
    banner.id = 'student-identity-banner';
    banner.className = 'student-identity-banner';
    var name = getName();
    banner.innerHTML = name
      ? '<span>Connecte en tant que <strong>' + name + '</strong></span><button type="button" class="student-identity-banner__change">Changer</button>'
      : '<span>Aucun prenom renseigne</span><button type="button" class="student-identity-banner__change">Indiquer mon nom</button>';
    document.body.appendChild(banner);
    banner.querySelector('button').addEventListener('click', function () {
      promptName(true);
    });
  }

  function promptName(forceShow) {
    if (!forceShow && getName()) {
      return;
    }
    var overlay = document.createElement('div');
    overlay.className = 'student-identity-overlay';
    overlay.innerHTML =
      '<div class="student-identity-modal">' +
      '<h2>Qui etes-vous ?</h2>' +
      '<p>Indiquez votre prenom et votre nom pour retrouver votre travail sur cet ordinateur.</p>' +
      '<input type="text" class="student-identity-modal__input" placeholder="Prenom Nom" autocomplete="off">' +
      '<button type="button" class="btn btn-primary student-identity-modal__submit">Valider</button>' +
      '</div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector('input');
    input.value = getName();
    input.focus();

    function submit() {
      var value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      setName(value);
      overlay.remove();
      renderBanner();
    }
    overlay.querySelector('.student-identity-modal__submit').addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        submit();
      }
    });
  }

  function init() {
    renderBanner();
    promptName(false);
  }

  window.StudentIdentity = {
    getName: getName,
    setName: setName,
    studentKey: studentKey,
    saveProgress: saveProgress,
    loadProgress: loadProgress,
    init: init
  };
})(window, document);
