/*
 * Application principale du module SCORM.
 * Charge le sommaire (db/chapitres.json), construit la navigation,
 * injecte les pages (fragments HTML de pages/) dans la zone de contenu,
 * initialise les exercices auto-corrigés et pilote la progression SCORM.
 */
(function (window, document) {
  'use strict';

  var state = {
    chapitres: [],
    currentId: null,
    progression: {}
  };

  var els = {};

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
  }

  function updateScormCompletion() {
    var chapitresAvecExercice = state.chapitres.filter(function (c) {
      return c.aExercice;
    });
    var total = chapitresAvecExercice.length;
    var doneCount = 0;
    var scoreSum = 0;
    chapitresAvecExercice.forEach(function (c) {
      var prog = state.progression[c.id];
      if (prog && prog.checked) {
        doneCount++;
        scoreSum += prog.scorePercent || 0;
      }
    });
    if (window.SCORM && window.SCORM.isAvailable()) {
      if (total > 0) {
        window.SCORM.setScore(Math.round(scoreSum / total), 100);
      }
      if (doneCount >= total && total > 0) {
        window.SCORM.setStatus('completed');
      } else if (doneCount > 0) {
        window.SCORM.setStatus('incomplete');
      }
    }
  }

  function computeGlobalProgress() {
    var total = state.chapitres.length;
    var visited = 0;
    state.chapitres.forEach(function (c) {
      if (state.progression[c.id] && state.progression[c.id].visited) {
        visited++;
      }
    });
    return total ? Math.round((visited / total) * 100) : 0;
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
      var prog = state.progression[chap.id];
      var isDone = prog && (chap.aExercice ? prog.checked : prog.visited);
      a.innerHTML =
        iconMarkup(chap.icone, 'sidebar-link__icon') +
        '<span>' + (chap.numero ? chap.numero + '. ' : '') + chap.titre + '</span>' +
        iconMarkup('check-circle-2', 'sidebar-link__status' + (isDone ? '' : ' is-empty'));
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

  function initExerciseIfPresent(chap) {
    var container = qs('#exercise-container');
    if (!container || !chap.aExercice) {
      return Promise.resolve();
    }
    return fetchJSON(chap.exerciceSrc).then(function (data) {
      var savedProg = state.progression[chap.id];
      window.Exercises.create(container, data, {
        onComplete: function (result) {
          if (!state.progression[chap.id]) {
            state.progression[chap.id] = {};
          }
          state.progression[chap.id].visited = true;
          state.progression[chap.id].checked = true;
          state.progression[chap.id].scorePercent = result.scorePercent;
          state.progression[chap.id].correct = result.correct;
          state.progression[chap.id].total = result.total;
          renderSidebar();
          updateProgressUI();
          persistProgress();
        }
      });
      if (savedProg && savedProg.checked) {
        var badge = container.querySelector('.exercise-score');
        if (badge) {
          badge.classList.add('is-visible');
          badge.querySelector('.score-text').textContent = savedProg.correct + ' / ' + savedProg.total;
        }
      }
    }).catch(function (err) {
      container.innerHTML = '<p class="text-soft">Exercice indisponible pour le moment.</p>';
      if (window.console) {
        window.console.error(err);
      }
    });
  }

  function loadChapter(chapId, options) {
    options = options || {};
    var chap = findChapter(chapId) || state.chapitres[0];
    state.currentId = chap.id;

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
      if (!options.silentScroll) {
        els.content.scrollTop = 0;
      }
      return initExerciseIfPresent(chap);
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
      }
    }
  }

  function init() {
    cacheEls();
    if (window.SCORM) {
      window.SCORM.initialize();
    }
    restoreProgress();
    fetchJSON('db/chapitres.json').then(function (data) {
      state.chapitres = data.chapitres;
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
    }).catch(function (err) {
      if (window.console) {
        window.console.error(err);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
