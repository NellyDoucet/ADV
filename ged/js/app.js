/*
 * Application principale du module SCORM "Administration des ventes".
 * Charge le sommaire (db/chapitres.json), construit la navigation,
 * injecte les pages (fragments HTML de pages/) et suit la progression
 * (pages visitees) via le SCORM API quand un LMS est present.
 */
(function (window, document) {
  'use strict';

  var state = {
    chapitres: [],
    codeGlobalHash: null,
    currentId: null,
    progression: {}
  };

  var els = {};

  var MODULE_NS = 'ged-';

  function isUnlocked(key) {
    try {
      return window.sessionStorage.getItem(MODULE_NS + 'code-' + key) === '1';
    } catch (e) {
      return false;
    }
  }

  function markUnlocked(key) {
    try {
      window.sessionStorage.setItem(MODULE_NS + 'code-' + key, '1');
    } catch (e) { /* sessionStorage indisponible : le code sera redemande a chaque page. */ }
  }

  function normalizeCode(raw) {
    return String(raw || '').trim();
  }

  function sha256Hex(text) {
    var data = new TextEncoder().encode(text);
    return window.crypto.subtle.digest('SHA-256', data).then(function (buffer) {
      var bytes = Array.prototype.slice.call(new Uint8Array(buffer));
      return bytes.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  function cacheEls() {
    els.sidebarList = qs('#sidebar-nav-list');
    els.content = qs('#app-content');
    els.progressFill = qs('#header-progress-fill');
    els.progressLabel = qs('#header-progress-label');
    els.menuToggle = qs('#menu-toggle');
    els.sidebar = qs('#app-sidebar');
  }

  function fetchJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) {
        throw new Error('Impossible de charger ' + url);
      }
      return res.json();
    });
  }

  function fetchHTML(url) {
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) {
        throw new Error('Impossible de charger ' + url);
      }
      return res.text();
    });
  }

  function persistProgress() {
    if (window.SCORM && window.SCORM.isAvailable()) {
      window.SCORM.setSuspendData(state.progression);
      window.SCORM.setLocation(state.currentId || '');
      updateScormCompletion();
    }
    if (window.StudentIdentity) {
      window.StudentIdentity.saveProgress('_sommaire', state.progression);
    }
  }

  function updateScormCompletion() {
    var total = state.chapitres.length;
    var done = 0;
    state.chapitres.forEach(function (c) {
      if (isChapterCompleted(c.id)) {
        done++;
      }
    });
    if (window.SCORM && window.SCORM.isAvailable()) {
      if (done >= total && total > 0) {
        window.SCORM.setStatus('completed');
      } else if (done > 0) {
        window.SCORM.setStatus('incomplete');
      }
    }
  }

  function isChapterCompleted(chapId) {
    var chap = findChapter(chapId);
    var prog = state.progression[chapId];
    if (!prog) {
      return false;
    }
    if (chap && chap.hasExercise) {
      return !!prog.checked;
    }
    return !!prog.visited;
  }

  function computeGlobalProgress() {
    var total = state.chapitres.length;
    var done = 0;
    state.chapitres.forEach(function (c) {
      if (isChapterCompleted(c.id)) {
        done++;
      }
    });
    return total ? Math.round((done / total) * 100) : 0;
  }

  function updateProgressUI() {
    var pct = computeGlobalProgress();
    if (els.progressFill) {
      els.progressFill.style.width = pct + '%';
    }
    if (els.progressLabel) {
      els.progressLabel.textContent = 'Progression : ' + pct + ' %';
    }
  }

  function markVisited(chapId) {
    if (!state.progression[chapId]) {
      state.progression[chapId] = {};
    }
    state.progression[chapId].visited = true;
    updateProgressUI();
    renderSidebar();
    persistProgress();
  }

  function markChecked(chapId, correct, total) {
    if (!state.progression[chapId]) {
      state.progression[chapId] = {};
    }
    state.progression[chapId].visited = true;
    state.progression[chapId].checked = true;
    state.progression[chapId].correct = correct;
    state.progression[chapId].total = total;
    updateProgressUI();
    renderSidebar();
    persistProgress();
  }

  function iconMarkup(name, extraClass) {
    return '<span data-lucide="' + name + '" class="' + (extraClass || '') + '"></span>';
  }

  function renderSidebar() {
    if (!els.sidebarList) {
      return;
    }
    els.sidebarList.innerHTML = '';
    state.chapitres.forEach(function (chap) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + chap.id;
      a.className = 'sidebar-link' + (chap.id === state.currentId ? ' is-active' : '');
      var isDone = isChapterCompleted(chap.id);
      var isLocked = chap.codeHash && !isUnlocked(chap.id);
      var statusIcon = isLocked
        ? iconMarkup('lock', 'sidebar-link__status sidebar-link__lock')
        : iconMarkup('check-circle-2', 'sidebar-link__status' + (isDone ? '' : ' is-empty'));
      a.innerHTML =
        iconMarkup(chap.icone, 'sidebar-link__icon') +
        '<span>' + (chap.numero ? chap.numero + '. ' : '') + chap.titre + '</span>' +
        statusIcon;
      li.appendChild(a);
      els.sidebarList.appendChild(li);
    });
    if (window.Icons) {
      window.Icons.refresh();
    }
  }

  function findChapter(id) {
    var found = null;
    state.chapitres.forEach(function (c) {
      if (c.id === id) {
        found = c;
      }
    });
    return found;
  }

  function buildPageNav(chapId) {
    var index = state.chapitres.findIndex(function (c) {
      return c.id === chapId;
    });
    var prev = index > 0 ? state.chapitres[index - 1] : null;
    var next = index < state.chapitres.length - 1 ? state.chapitres[index + 1] : null;

    var nav = document.createElement('div');
    nav.className = 'page-nav';

    if (prev) {
      var prevBtn = document.createElement('a');
      prevBtn.href = '#' + prev.id;
      prevBtn.className = 'btn btn-ghost';
      prevBtn.innerHTML = iconMarkup('arrow-left', 'icon') + ' ' + prev.titre;
      nav.appendChild(prevBtn);
    } else {
      nav.appendChild(document.createElement('span'));
    }

    if (next) {
      var nextBtn = document.createElement('a');
      nextBtn.href = '#' + next.id;
      nextBtn.className = 'btn btn-primary';
      nextBtn.innerHTML = next.titre + ' ' + iconMarkup('arrow-right', 'icon');
      nav.appendChild(nextBtn);
    }

    return nav;
  }

  function renderSectionGate(chap) {
    els.content.innerHTML =
      '<div class="section-gate-wrap">' +
      '<div class="gate-card">' +
      '<div class="gate-card__icon">' + iconMarkup('lock') + '</div>' +
      '<h2 class="gate-card__title">' + (chap.numero ? chap.numero + '. ' : '') + chap.titre + '</h2>' +
      '<p class="gate-card__text">Cette section est verrouillée. Demandez le code à votre formateur pour l’ouvrir.</p>' +
      '<form class="gate-card__form" id="section-gate-form">' +
      '<input type="text" inputmode="numeric" class="gate-input" id="section-gate-input" placeholder="Code" autocomplete="off" aria-label="Code de la section">' +
      '<button type="submit" class="btn btn-primary">Déverrouiller</button>' +
      '</form>' +
      '<p class="gate-card__error" id="section-gate-error" hidden>Code incorrect, réessayez.</p>' +
      '</div></div>';

    if (window.Icons) {
      window.Icons.refresh();
    }

    var form = qs('#section-gate-form');
    var input = qs('#section-gate-input');
    var error = qs('#section-gate-error');
    if (input) {
      input.focus();
    }
    if (form) {
      form.addEventListener('submit', function (evt) {
        evt.preventDefault();
        sha256Hex(normalizeCode(input.value)).then(function (hash) {
          if (hash === chap.codeHash) {
            markUnlocked(chap.id);
            renderSidebar();
            loadChapter(chap.id);
          } else {
            error.hidden = false;
            input.value = '';
            input.focus();
          }
        });
      });
    }
  }

  function loadChapter(chapId) {
    var chap = findChapter(chapId) || state.chapitres[0];
    state.currentId = chap.id;

    if (chap.codeHash && !isUnlocked(chap.id)) {
      renderSectionGate(chap);
      renderSidebar();
      return Promise.resolve();
    }

    return fetchHTML(chap.fichier).then(function (html) {
      els.content.innerHTML = '<div class="app-main-inner"><div class="page">' + html + '</div></div>';
      var page = els.content.querySelector('.page');
      if (page) {
        page.appendChild(buildPageNav(chap.id));
      }
      markVisited(chap.id);
      renderSidebar();
      if (window.Icons) {
        window.Icons.refresh();
      }
      if (window.ExcelExercise) {
        window.ExcelExercise.init();
      }
      if (window.FormExercise) {
        window.FormExercise.init();
      }
      els.content.scrollTop = 0;
    }).catch(function (err) {
      els.content.innerHTML = '<div class="app-main-inner"><div class="page"><p>Contenu introuvable.</p></div></div>';
      if (window.console) {
        window.console.error(err);
      }
    });
  }

  function onHashChange() {
    var id = window.location.hash.replace('#', '') || state.chapitres[0].id;
    if (els.sidebar) {
      els.sidebar.classList.remove('is-open');
    }
    loadChapter(id);
  }

  function bindGlobalEvents() {
    window.addEventListener('hashchange', onHashChange);
    if (els.menuToggle) {
      els.menuToggle.addEventListener('click', function () {
        els.sidebar.classList.toggle('is-open');
      });
    }
  }

  function restoreProgress() {
    if (window.SCORM && window.SCORM.isAvailable()) {
      var saved = window.SCORM.getSuspendData();
      if (saved) {
        state.progression = saved;
        return;
      }
    }
    if (window.StudentIdentity) {
      var localSaved = window.StudentIdentity.loadProgress('_sommaire');
      if (localSaved) {
        state.progression = localSaved;
      }
    }
  }

  function startApp() {
    renderSidebar();
    bindGlobalEvents();
    updateProgressUI();
    var startId = window.location.hash.replace('#', '');
    if (!startId && window.SCORM) {
      startId = window.SCORM.getLocation();
    }
    if (!startId) {
      startId = state.chapitres[0].id;
    }
    if (window.location.hash.replace('#', '') === startId) {
      loadChapter(startId);
    } else {
      window.location.hash = startId;
    }
  }

  function showGlobalGate() {
    var overlay = qs('#global-gate');
    var form = qs('#global-gate-form');
    var input = qs('#global-gate-input');
    var error = qs('#global-gate-error');
    if (!overlay) {
      startApp();
      return;
    }
    overlay.hidden = false;
    if (input) {
      input.focus();
    }
    form.addEventListener('submit', function (evt) {
      evt.preventDefault();
      sha256Hex(normalizeCode(input.value)).then(function (hash) {
        if (hash === state.codeGlobalHash) {
          markUnlocked('global');
          overlay.hidden = true;
          startApp();
        } else {
          error.hidden = false;
          input.value = '';
          input.focus();
        }
      });
    });
  }

  function init() {
    cacheEls();
    if (window.SCORM) {
      window.SCORM.initialize();
    }
    if (window.StudentIdentity) {
      window.StudentIdentity.init();
    }
    restoreProgress();
    fetchJSON('db/chapitres.json').then(function (data) {
      state.chapitres = data.chapitres;
      state.codeGlobalHash = data.codeGlobalHash;
      if (state.codeGlobalHash && !isUnlocked('global')) {
        showGlobalGate();
      } else {
        startApp();
      }
    }).catch(function (err) {
      if (window.console) {
        window.console.error(err);
      }
    });
  }

  window.AppProgress = { markChecked: markChecked };

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
