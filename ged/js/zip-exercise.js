/*
 * Moteur de correction automatique des exercices "vrais fichiers" (renommer,
 * ranger, supprimer des doublons). Le stagiaire telecharge un zip de depart,
 * travaille dans son explorateur de fichiers, puis redepose un zip avec le
 * resultat : la lecture et la comparaison se font entierement dans le
 * navigateur (bibliotheque JSZip), sans envoi a un serveur.
 */
(function (window, document) {
  'use strict';

  function normalizePath(path) {
    return String(path || '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function stripFirstSegment(path) {
    var idx = path.indexOf('/');
    return idx === -1 ? null : path.slice(idx + 1);
  }

  function loadEntriesFromFile(file) {
    return file.arrayBuffer().then(function (buffer) {
      return window.JSZip.loadAsync(buffer);
    }).then(function (zip) {
      var paths = [];
      zip.forEach(function (relPath, entry) {
        if (!entry.dir) {
          paths.push(relPath);
        }
      });
      return paths;
    });
  }

  function buildCandidateSet(rawPaths) {
    var set = {};
    rawPaths.forEach(function (raw) {
      var norm = normalizePath(raw);
      set[norm] = true;
      var stripped = stripFirstSegment(norm);
      if (stripped) {
        set[stripped] = true;
      }
    });
    return set;
  }

  function grade(rawPaths, answerKey) {
    var set = buildCandidateSet(rawPaths);
    var expectedResults = answerKey.expected.map(function (item) {
      var norm = normalizePath(item.path);
      return { path: item.path, note: item.note, ok: !!set[norm] };
    });
    var forbiddenFound = (answerKey.forbidden || []).map(function (item) {
      var norm = normalizePath(item.path);
      return { path: item.path, note: item.note, present: !!set[norm] };
    }).filter(function (item) { return item.present; });
    return { expectedResults: expectedResults, forbiddenFound: forbiddenFound };
  }

  function renderResults(container, graded) {
    var correct = graded.expectedResults.filter(function (r) { return r.ok; }).length;
    var total = graded.expectedResults.length;
    var pct = total ? Math.round((correct / total) * 100) : 0;
    var perfect = pct === 100 && graded.forbiddenFound.length === 0;

    var html = '<div class="zip-result">';
    html += '<div class="zip-result__score' + (perfect ? ' is-perfect' : '') + '">' +
      correct + ' / ' + total + ' fichiers conformes (' + pct + ' %)</div>';

    var missing = graded.expectedResults.filter(function (r) { return !r.ok; });
    if (missing.length === 0 && graded.forbiddenFound.length === 0) {
      html += '<p class="zip-result__all-good"><span data-lucide="check-circle-2" class="icon"></span> Tout est conforme, bravo !</p>';
    } else {
      if (missing.length) {
        html += '<p class="zip-result__section-title">Fichiers manquants ou mal nommes/ranges</p><ul class="zip-result__list">';
        missing.forEach(function (r) {
          html += '<li>Attendu : <code>' + r.path + '</code>' +
            (r.note ? '<div class="excel-result__explanation">' + r.note + '</div>' : '') +
            '</li>';
        });
        html += '</ul>';
      }
      if (graded.forbiddenFound.length) {
        html += '<p class="zip-result__section-title">A supprimer, encore presents</p><ul class="zip-result__list">';
        graded.forbiddenFound.forEach(function (r) {
          html += '<li><code>' + r.path + '</code>' +
            (r.note ? '<div class="excel-result__explanation">' + r.note + '</div>' : '') +
            '</li>';
        });
        html += '</ul>';
      }
    }
    html += '</div>';
    container.innerHTML = html;
    if (window.Icons) {
      window.Icons.refresh();
    }
    return { correct: correct, total: total };
  }

  function initBlock(block) {
    var exerciseUrl = block.getAttribute('data-exercise');
    var templateUrl = block.getAttribute('data-template');
    var resultEl = block.querySelector('.zip-exercise__result');
    var fileInput = block.querySelector('.zip-exercise__input');
    var correctBtn = block.querySelector('.zip-exercise__correct-btn');
    var status = block.querySelector('.zip-exercise__status');
    var chapId = window.location.hash.replace('#', '');

    if (window.StudentIdentity) {
      var saved = window.StudentIdentity.loadProgress(chapId);
      if (saved) {
        var notice = document.createElement('div');
        notice.className = 'zip-exercise__restored';
        notice.textContent = 'Derniere correction enregistree sur cet ordinateur : ' + saved.correct + ' / ' + saved.total + '.';
        block.insertBefore(notice, block.firstChild);
      }
    }

    fetch(exerciseUrl, { cache: 'no-store' }).then(function (res) {
      return res.json();
    }).then(function (answerKey) {
      correctBtn.disabled = false;
      correctBtn.addEventListener('click', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) {
          status.textContent = 'Choisissez d\'abord votre fichier zip complete.';
          status.hidden = false;
          return;
        }
        status.hidden = true;
        loadEntriesFromFile(file).then(function (paths) {
          var graded = grade(paths, answerKey);
          var score = renderResults(resultEl, graded);
          if (window.AppProgress) {
            window.AppProgress.markChecked(chapId, score.correct, score.total);
          }
          if (window.StudentIdentity) {
            window.StudentIdentity.saveProgress(chapId, { correct: score.correct, total: score.total });
          }
        }).catch(function () {
          status.textContent = 'Le fichier n\'a pas pu etre lu. Verifiez que c\'est bien un .zip, non renomme.';
          status.hidden = false;
        });
      });
    }).catch(function () {
      status.textContent = 'Le corrige de cet exercice n\'a pas pu etre charge.';
      status.hidden = false;
    });

    var downloadLink = block.querySelector('.zip-exercise__download');
    if (downloadLink && templateUrl) {
      downloadLink.href = templateUrl;
    }
  }

  function init() {
    var blocks = document.querySelectorAll('.zip-exercise');
    blocks.forEach ? blocks.forEach(initBlock) : Array.prototype.forEach.call(blocks, initBlock);
  }

  window.ZipExercise = { init: init };
})(window, document);
