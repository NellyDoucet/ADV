/*
 * Moteur d'exercices auto-corrigés.
 * Lit un objet JSON décrivant une application (questions, réponses,
 * tolérances, explications) et construit l'interface, corrige les
 * réponses du stagiaire et affiche un explicatif en cas d'erreur.
 *
 * Types de questions gérés : "numeric", "text", "mcq", "table".
 */
(function (window) {
  'use strict';

  function normalizeNumber(raw) {
    if (raw === null || raw === undefined) {
      return NaN;
    }
    var cleaned = String(raw).trim().replace(/\s/g, '').replace(',', '.').replace('%', '').replace('€', '');
    return parseFloat(cleaned);
  }

  function normalizeText(raw) {
    return String(raw || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '');
  }

  function checkNumeric(inputValue, question) {
    var value = normalizeNumber(inputValue);
    if (isNaN(value)) {
      return false;
    }
    var tolerance = question.tolerance !== undefined ? question.tolerance : 0.01;
    return Math.abs(value - question.answer) <= tolerance;
  }

  function checkText(inputValue, question) {
    var value = normalizeText(inputValue);
    var accepted = question.answers || [question.answer];
    for (var i = 0; i < accepted.length; i++) {
      if (normalizeText(accepted[i]) === value) {
        return true;
      }
    }
    return false;
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (html !== undefined) {
      node.innerHTML = html;
    }
    return node;
  }

  function buildFeedback(isCorrect, explanation, correctionText) {
    var feedback = el('div', 'feedback is-visible feedback--' + (isCorrect ? 'success' : 'error'));
    var icon = el('span', 'feedback__icon');
    icon.setAttribute('data-lucide', isCorrect ? 'check-circle-2' : 'x-circle');
    var body = el('div');
    var title = el('span', 'feedback__title', isCorrect ? 'Bonne réponse.' : 'Ce n’est pas la bonne réponse.');
    body.appendChild(title);
    if (!isCorrect && explanation) {
      var text = el('p', 'feedback__text', explanation);
      body.appendChild(text);
    }
    if (!isCorrect && correctionText) {
      var correction = el('p', 'feedback__correction', correctionText);
      body.appendChild(correction);
    }
    feedback.appendChild(icon);
    feedback.appendChild(body);
    return feedback;
  }

  function formatAnswer(question) {
    if (question.type === 'numeric') {
      var val = question.answerDisplay || question.answer;
      return String(val).replace('.', ',') + (question.unit ? ' ' + question.unit : '');
    }
    if (question.type === 'text') {
      return question.answerDisplay || question.answer;
    }
    return '';
  }

  function renderNumeric(question, index, state) {
    var wrap = el('div', 'answer-field');
    var input = el('input', 'answer-input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.setAttribute('aria-label', 'Votre réponse');
    input.placeholder = '...';
    if (question.unit) {
      var unit = el('span', 'answer-unit', question.unit);
      wrap.appendChild(input);
      wrap.appendChild(unit);
    } else {
      wrap.appendChild(input);
    }
    state.getValue = function () {
      return input.value;
    };
    state.setDisabled = function (disabled) {
      input.disabled = disabled;
    };
    state.markState = function (correct) {
      input.classList.toggle('is-correct', correct === true);
    };
    return wrap;
  }

  function renderText(question, index, state) {
    var wrap = el('div', 'answer-field');
    var input = el('input', 'answer-input');
    input.type = 'text';
    input.setAttribute('aria-label', 'Votre réponse');
    input.placeholder = '...';
    if (question.unit) {
      wrap.appendChild(input);
      wrap.appendChild(el('span', 'answer-unit', question.unit));
    } else {
      wrap.appendChild(input);
    }
    state.getValue = function () {
      return input.value;
    };
    state.setDisabled = function (disabled) {
      input.disabled = disabled;
    };
    return wrap;
  }

  function renderMcq(question, index, state) {
    var list = el('div', 'choice-list');
    var name = 'q-' + question._uid;
    var inputs = [];
    question.choices.forEach(function (choiceLabel, choiceIndex) {
      var choice = el('label', 'choice');
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = String(choiceIndex);
      var span = el('span', null, choiceLabel);
      choice.appendChild(input);
      choice.appendChild(span);
      list.appendChild(choice);
      inputs.push({ input: input, wrapper: choice });
      input.addEventListener('change', function () {
        inputs.forEach(function (item) {
          item.wrapper.classList.toggle('is-selected', item.input.checked);
        });
      });
    });
    state.getValue = function () {
      var selected = inputs.filter(function (item) {
        return item.input.checked;
      });
      return selected.length ? selected[0].input.value : null;
    };
    state.setDisabled = function (disabled) {
      inputs.forEach(function (item) {
        item.input.disabled = disabled;
      });
    };
    state.markState = function (correct, selectedIndex) {
      inputs.forEach(function (item, i) {
        if (i === question.correctIndex) {
          item.wrapper.classList.toggle('is-correct-answer', !correct);
        }
      });
    };
    return list;
  }

  function renderSquares(question, index, state) {
    var wrap = el('div', 'squares-wrap');
    var cellRefs = [];
    question.squares.forEach(function (square) {
      var item = el('div', 'square-item');
      if (square.label) {
        item.appendChild(el('span', 'square-item__label', square.label));
      }
      var grid = el('div', 'square-grid');
      square.cells.forEach(function (cell) {
        var cellEl = el('div', 'square-cell' + (cell.input ? ' is-input' : ''));
        if (cell.input) {
          var input = el('input', 'answer-input');
          input.type = 'text';
          input.inputMode = 'decimal';
          cellEl.appendChild(input);
          cellRefs.push({ cell: cell, input: input });
        } else {
          cellEl.textContent = cell.value;
        }
        grid.appendChild(cellEl);
      });
      item.appendChild(grid);
      wrap.appendChild(item);
    });

    state.cellRefs = cellRefs;
    state.getValue = function () {
      return cellRefs.map(function (ref) {
        return ref.input.value;
      });
    };
    state.setDisabled = function (disabled) {
      cellRefs.forEach(function (ref) {
        ref.input.disabled = disabled;
      });
    };
    state.markState = function (allCorrect, results) {
      cellRefs.forEach(function (ref, i) {
        var ok = results ? results[i] : null;
        ref.input.classList.toggle('is-correct', ok === true);
        ref.input.classList.toggle('is-incorrect', ok === false);
      });
    };
    return wrap;
  }

  function renderTable(question, index, state) {
    var tableWrap = el('div', 'table-wrap');
    var table = el('table', 'fill-table');
    var thead = el('thead');
    var headRow = el('tr');
    question.columns.forEach(function (col) {
      headRow.appendChild(el('th', null, col));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el('tbody');
    var cellRefs = [];

    question.rows.forEach(function (row) {
      var tr = el('tr');
      if (row.label !== undefined) {
        tr.appendChild(el('th', null, row.label));
      }
      row.cells.forEach(function (cell) {
        var td = el('td');
        if (cell.input) {
          var cellWrap = el('span', 'cell-answer');
          var input = el('input', 'answer-input');
          input.type = 'text';
          input.inputMode = 'decimal';
          input.placeholder = '...';
          cellWrap.appendChild(input);
          if (cell.unit) {
            cellWrap.appendChild(el('span', 'cell-answer__unit', cell.unit));
          }
          td.appendChild(cellWrap);
          cellRefs.push({ cell: cell, input: input, td: td });
        } else {
          td.textContent = cell.value;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    state.getValue = function () {
      return cellRefs.map(function (ref) {
        return ref.input.value;
      });
    };
    state.setDisabled = function (disabled) {
      cellRefs.forEach(function (ref) {
        ref.input.disabled = disabled;
      });
    };
    state.cellRefs = cellRefs;
    state.markState = function (allCorrect, results) {
      cellRefs.forEach(function (ref, i) {
        var ok = results ? results[i] : null;
        ref.input.classList.toggle('is-correct', ok === true);
        ref.input.classList.toggle('is-incorrect', ok === false);
      });
    };
    return tableWrap;
  }

  function evaluateTable(question, state) {
    var results = [];
    var errorMessages = [];
    state.cellRefs.forEach(function (ref, i) {
      var cell = ref.cell;
      var ok;
      if (cell.type === 'text') {
        ok = checkText(ref.input.value, cell);
      } else {
        ok = checkNumeric(ref.input.value, cell);
      }
      results.push(ok);
      if (!ok) {
        var label = cell.label ? cell.label + ' : ' : '';
        var answerDisplay = cell.type === 'text' ? cell.answerDisplay || cell.answer : String(cell.answerDisplay || cell.answer).replace('.', ',') + (cell.unit ? ' ' + cell.unit : '');
        errorMessages.push(label + 'réponse attendue ' + answerDisplay + (cell.explanation ? ' (' + cell.explanation + ')' : ''));
      }
    });
    var allCorrect = results.every(function (r) {
      return r === true;
    });
    return { allCorrect: allCorrect, results: results, errorMessages: errorMessages };
  }

  function createExercise(container, data, options) {
    options = options || {};
    var onComplete = options.onComplete || function () {};
    var restored = options.restoredState || null;

    container.innerHTML = '';
    var header = el('div', 'exercise-header');
    header.appendChild(el('h2', 'exercise-header__title', data.title));
    var scoreBadge = el('div', 'exercise-score');
    scoreBadge.innerHTML = '<span data-lucide="target" class="progress-ring"></span><span class="score-text">0 / 0</span>';
    header.appendChild(scoreBadge);
    container.appendChild(header);

    if (data.intro) {
      container.appendChild(el('p', 'exercise-intro', data.intro));
    }

    var questionStates = [];

    data.questions.forEach(function (question, index) {
      question._uid = data.id + '-' + index;
      var qEl = el('div', 'question');
      qEl.dataset.index = String(index);
      var head = el('div', 'question-header');
      head.appendChild(el('span', 'question-number', String(index + 1)));
      head.appendChild(el('p', 'question-statement', question.statement));
      qEl.appendChild(head);

      var body = el('div', 'question-body');
      var state = { question: question, element: qEl, checked: false };

      var control;
      if (question.type === 'numeric') {
        control = renderNumeric(question, index, state);
      } else if (question.type === 'text') {
        control = renderText(question, index, state);
      } else if (question.type === 'mcq') {
        control = renderMcq(question, index, state);
      } else if (question.type === 'table') {
        control = renderTable(question, index, state);
      } else if (question.type === 'squares') {
        control = renderSquares(question, index, state);
      }
      body.appendChild(control);

      var feedbackHolder = el('div');
      body.appendChild(feedbackHolder);
      state.feedbackHolder = feedbackHolder;
      qEl.appendChild(body);
      container.appendChild(qEl);
      questionStates.push(state);

      if (restored && restored[question._uid]) {
        applyRestoredState(state, restored[question._uid]);
      }
    });

    var actions = el('div', 'exercise-actions');
    var checkBtn = el('button', 'btn btn-primary', '<span data-lucide="check" class="icon"></span> Vérifier mes réponses');
    var resetBtn = el('button', 'btn btn-ghost', '<span data-lucide="rotate-ccw" class="icon"></span> Recommencer');
    actions.appendChild(checkBtn);
    actions.appendChild(resetBtn);
    container.appendChild(actions);

    var resultBox = el('div', 'exercise-result');
    resultBox.innerHTML = '<div class="exercise-result__score"></div><div class="exercise-result__label"></div>';
    container.appendChild(resultBox);

    function applyRestoredState(state, saved) {
      state.checked = saved.checked;
    }

    function evaluateQuestion(state) {
      var question = state.question;
      var isCorrect;
      var errorText = question.explanation || '';
      var correctionText = '';

      if (question.type === 'numeric') {
        isCorrect = checkNumeric(state.getValue(), question);
        correctionText = 'Réponse attendue : ' + formatAnswer(question);
        state.markState(isCorrect);
      } else if (question.type === 'text') {
        isCorrect = checkText(state.getValue(), question);
        correctionText = 'Réponse attendue : ' + formatAnswer(question);
      } else if (question.type === 'mcq') {
        var selected = state.getValue();
        isCorrect = selected !== null && parseInt(selected, 10) === question.correctIndex;
        correctionText = 'Bonne réponse : ' + question.choices[question.correctIndex];
        state.markState(isCorrect);
      } else if (question.type === 'table' || question.type === 'squares') {
        var tableResult = evaluateTable(question, state);
        isCorrect = tableResult.allCorrect;
        errorText = tableResult.errorMessages.join(' — ');
        state.markState(isCorrect, tableResult.results);
      }

      state.element.classList.toggle('is-correct', isCorrect);
      state.element.classList.toggle('is-incorrect', !isCorrect);
      state.feedbackHolder.innerHTML = '';
      state.feedbackHolder.appendChild(buildFeedback(isCorrect, errorText, question.type === 'table' ? '' : correctionText));
      state.checked = true;
      state.lastCorrect = isCorrect;
      if (window.Icons) {
        window.Icons.refresh();
      }
      return isCorrect;
    }

    function updateScoreBadge(correctCount, total) {
      var text = scoreBadge.querySelector('.score-text');
      text.textContent = correctCount + ' / ' + total;
      scoreBadge.classList.add('is-visible');
    }

    function serializeState() {
      var out = {};
      questionStates.forEach(function (state) {
        out[state.question._uid] = { checked: state.checked, correct: state.lastCorrect };
      });
      return out;
    }

    checkBtn.addEventListener('click', function () {
      var correctCount = 0;
      questionStates.forEach(function (state) {
        var ok = evaluateQuestion(state);
        if (ok) {
          correctCount++;
        }
      });
      var total = questionStates.length;
      updateScoreBadge(correctCount, total);

      var scorePercent = total ? Math.round((correctCount / total) * 100) : 0;
      resultBox.classList.add('is-visible');
      resultBox.querySelector('.exercise-result__score').textContent = scorePercent + ' %';
      var label = scorePercent === 100
        ? 'Excellent, toutes les réponses sont correctes.'
        : 'Relisez l’explicatif sous chaque question en erreur, puis réessayez si besoin.';
      resultBox.querySelector('.exercise-result__label').textContent = correctCount + ' bonnes réponses sur ' + total + '. ' + label;

      onComplete({
        id: data.id,
        correct: correctCount,
        total: total,
        scorePercent: scorePercent,
        state: serializeState()
      });

      var firstQuestion = container.querySelector('.question');
      if (firstQuestion) {
        firstQuestion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    resetBtn.addEventListener('click', function () {
      questionStates.forEach(function (state) {
        state.element.classList.remove('is-correct', 'is-incorrect');
        state.feedbackHolder.innerHTML = '';
        state.checked = false;
        var inputs = state.element.querySelectorAll('input[type="text"]');
        inputs.forEach(function (input) {
          input.value = '';
          input.classList.remove('is-correct', 'is-incorrect');
        });
        var radios = state.element.querySelectorAll('input[type="radio"]');
        radios.forEach(function (input) {
          input.checked = false;
        });
        var choices = state.element.querySelectorAll('.choice');
        choices.forEach(function (choice) {
          choice.classList.remove('is-selected', 'is-correct-answer');
        });
      });
      resultBox.classList.remove('is-visible');
      scoreBadge.classList.remove('is-visible');
    });

    if (window.Icons) {
      window.Icons.refresh();
    }
  }

  window.Exercises = {
    create: createExercise
  };
})(window);
