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
      return { ok: ok, got: value === '' ? null : value, expected: field.answer };
    }
    if (field.type === 'select') {
      var ok2 = normalizeText(value) === normalizeText(field.answer);
      return { ok: ok2, got: value === '' ? null : value, expected: field.answer };
    }
    if (field.type === 'keywords') {
      var normVal = normalizeText(value);
      var allFound = field.required.every(function (kw) {
        return normVal.indexOf(normalizeText(kw)) !== -1;
      });
      return { ok: allFound, got: value === '' ? null : value, expected: field.required.join(', ') };
    }
    // text
    var normInput = normalizeText(value);
    var accepted = field.accepted || [field.answer];
    var ok3 = accepted.some(function (a) { return normalizeText(a) === normInput; });
    return { ok: ok3, got: value === '' ? null : value, expected: field.answer };
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

  function initBlock(block) {
    var exerciseUrl = block.getAttribute('data-exercise');
    var fieldsContainer = block.querySelector('.form-exercise__fields');
    var correctBtn = block.querySelector('.form-exercise__correct-btn');
    var summary = block.querySelector('.form-exercise__summary');

    fetch(exerciseUrl, { cache: 'no-store' }).then(function (res) {
      return res.json();
    }).then(function (answerKey) {
      answerKey.fields.forEach(function (field) {
        fieldsContainer.appendChild(renderField(field));
      });
      correctBtn.disabled = false;
      correctBtn.addEventListener('click', function () {
        var correct = 0;
        var total = answerKey.fields.length;
        answerKey.fields.forEach(function (field) {
          var fieldEl = fieldsContainer.querySelector('[data-key="' + field.key + '"]');
          var input = fieldEl.querySelector('input, select');
          var result = gradeField(field, input.value);
          fieldEl.classList.remove('is-correct', 'is-incorrect');
          fieldEl.classList.add(result.ok ? 'is-correct' : 'is-incorrect');
          var feedback = fieldEl.querySelector('.form-exercise__feedback');
          feedback.textContent = result.ok ? '' : 'Attendu : ' + result.expected;
          if (result.ok) {
            correct++;
          }
        });
        var pct = total ? Math.round((correct / total) * 100) : 0;
        summary.innerHTML = '<div class="excel-result__score' + (pct === 100 ? ' is-perfect' : '') + '">' +
          correct + ' / ' + total + ' champs corrects (' + pct + ' %)</div>';
        summary.hidden = false;
        if (window.AppProgress) {
          var chapId = window.location.hash.replace('#', '');
          window.AppProgress.markChecked(chapId, correct, total);
        }
      });
    });
  }

  function init() {
    var blocks = document.querySelectorAll('.form-exercise');
    blocks.forEach ? blocks.forEach(initBlock) : Array.prototype.forEach.call(blocks, initBlock);
  }

  window.FormExercise = { init: init };
})(window, document);
