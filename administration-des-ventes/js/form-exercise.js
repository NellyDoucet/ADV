/*
 * Moteur de correction automatique des exercices "Analyse document"
 * (formulaires a champs courts : texte, nombre, choix). Correction
 * entierement realisee dans le navigateur, sans envoi a un serveur.
 */
(function (window, document) {
  'use strict';

  function normalizeText(str) {
    if (typeof str !== 'string') {
      return '';
    }
    return str
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function gradeField(field, rawValue) {
    var value = (rawValue || '').trim();
    if (field.type === 'numeric') {
      var num = parseFloat(value.replace(',', '.'));
      var tol = field.tolerance != null ? field.tolerance : Math.max(0.05, Math.abs(field.answer) * 0.01);
      var ok = !isNaN(num) && Math.abs(num - field.answer) <= tol;
      return { ok: ok, got: value === '' ? null : value, expected: field.answer, explanation: field.explanation };
    }
    if (field.type === 'select') {
      var ok2 = normalizeText(value) === normalizeText(field.answer);
      return { ok: ok2, got: value === '' ? null : value, expected: field.answer, explanation: field.explanation };
    }
    if (field.type === 'keywords') {
      var normVal = normalizeText(value);
      var allFound = field.required.every(function (kw) {
        return normVal.indexOf(normalizeText(kw)) !== -1;
      });
      return { ok: allFound, got: value === '' ? null : value, expected: field.required.join(', '), explanation: field.explanation };
    }
    // text
    var normInput = normalizeText(value);
    var accepted = field.accepted || [field.answer];
    var ok3 = accepted.some(function (a) { return normalizeText(a) === normInput; });
    return { ok: ok3, got: value === '' ? null : value, expected: field.answer, explanation: field.explanation };
  }

  function renderField(field) {
    var wrap = document.createElement('div');
    wrap.className = 'form-exercise__field';
    wrap.setAttribute('data-key', field.key);

    var label = document.createElement('label');
    label.textContent = field.label;
    label.setAttribute('for', 'fe-' + field.key);
    wrap.appendChild(label);

    var input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.id = 'fe-' + field.key;
      var blank = document.createElement('option');
      blank.value = '';
      blank.textContent = '--';
      input.appendChild(blank);
      field.options.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        input.appendChild(o);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type === 'numeric' ? 'text' : 'text';
      input.id = 'fe-' + field.key;
      input.autocomplete = 'off';
    }
    wrap.appendChild(input);

    var feedback = document.createElement('span');
    feedback.className = 'form-exercise__feedback';
    wrap.appendChild(feedback);

    return wrap;
  }

  function allFields(answerKey) {
    if (answerKey.groups) {
      var out = [];
      answerKey.groups.forEach(function (g) {
        g.fields.forEach(function (f) { out.push(f); });
      });
      return out;
    }
    return answerKey.fields;
  }

  function renderFields(answerKey, fieldsContainer) {
    if (answerKey.groups) {
      fieldsContainer.classList.add('form-exercise__fields--grouped');
      answerKey.groups.forEach(function (g) {
        var group = document.createElement('fieldset');
        group.className = 'form-exercise__group';
        var legend = document.createElement('legend');
        legend.textContent = g.title;
        group.appendChild(legend);
        g.fields.forEach(function (field) {
          group.appendChild(renderField(field));
        });
        fieldsContainer.appendChild(group);
      });
    } else {
      answerKey.fields.forEach(function (field) {
        fieldsContainer.appendChild(renderField(field));
      });
    }
  }

  function runCorrection(answerKey, fieldsContainer, summary, chapId) {
    var correct = 0;
    var fields = allFields(answerKey);
    var gradedFields = fields.filter(function (f) { return !f.ungraded; });
    var total = gradedFields.length;
    var values = {};
    fields.forEach(function (field) {
      var fieldEl = fieldsContainer.querySelector('[data-key="' + field.key + '"]');
      var input = fieldEl.querySelector('input, select');
      values[field.key] = input.value;
      fieldEl.classList.remove('is-correct', 'is-incorrect');
      var feedback = fieldEl.querySelector('.form-exercise__feedback');
      if (field.ungraded) {
        feedback.textContent = '';
        return;
      }
      var result = gradeField(field, input.value);
      fieldEl.classList.add(result.ok ? 'is-correct' : 'is-incorrect');
      feedback.textContent = result.ok ? '' : 'Attendu : ' + result.expected + (result.explanation ? ' — ' + result.explanation : '');
      if (result.ok) {
        correct++;
      }
    });
    var pct = total ? Math.round((correct / total) * 100) : 0;
    summary.innerHTML = '<div class="excel-result__score' + (pct === 100 ? ' is-perfect' : '') + '">' +
      correct + ' / ' + total + ' champs corrects (' + pct + ' %)</div>';
    summary.hidden = false;
    if (window.AppProgress) {
      window.AppProgress.markChecked(chapId, correct, total);
    }
    if (window.StudentIdentity) {
      window.StudentIdentity.saveProgress(chapId, { values: values, correct: correct, total: total });
    }
  }

  function restoreSaved(answerKey, fieldsContainer, chapId, block) {
    if (!window.StudentIdentity) {
      return;
    }
    var saved = window.StudentIdentity.loadProgress(chapId);
    if (!saved || !saved.values) {
      return;
    }
    Object.keys(saved.values).forEach(function (key) {
      var input = document.getElementById('fe-' + key);
      if (input) {
        input.value = saved.values[key];
      }
    });
    var notice = document.createElement('div');
    notice.className = 'form-exercise__restored';
    notice.textContent = 'Votre saisie precedente a ete restauree (derniere correction : ' + saved.correct + ' / ' + saved.total + ').';
    block.insertBefore(notice, block.firstChild);
  }

  function initBlock(block) {
    var exerciseUrl = block.getAttribute('data-exercise');
    var fieldsContainer = block.querySelector('.form-exercise__fields');
    var correctBtn = block.querySelector('.form-exercise__correct-btn');
    var summary = block.querySelector('.form-exercise__summary');
    var chapId = window.location.hash.replace('#', '');

    fetch(exerciseUrl, { cache: 'no-store' }).then(function (res) {
      return res.json();
    }).then(function (answerKey) {
      renderFields(answerKey, fieldsContainer);
      restoreSaved(answerKey, fieldsContainer, chapId, block);
      correctBtn.disabled = false;
      correctBtn.addEventListener('click', function () {
        runCorrection(answerKey, fieldsContainer, summary, chapId);
      });
    });
  }

  function init() {
    var blocks = document.querySelectorAll('.form-exercise');
    blocks.forEach ? blocks.forEach(initBlock) : Array.prototype.forEach.call(blocks, initBlock);
  }

  window.FormExercise = { init: init };
})(window, document);
