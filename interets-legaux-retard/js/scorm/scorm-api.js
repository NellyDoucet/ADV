/*
 * Moteur SCORM 1.2 minimal.
 * Recherche l'API LMS dans la fenêtre courante puis dans les fenêtres
 * parentes/ouvrantes (comportement standard d'un lanceur SCORM 1.2).
 * Expose window.SCORM avec des méthodes prêtes à l'emploi pour le reste
 * de l'application (progression, score, données de reprise).
 */
(function (window) {
  'use strict';

  var API = null;
  var initialized = false;
  var MAX_SEARCH_DEPTH = 500;

  function findAPI(win) {
    var depth = 0;
    while (win.API == null && win.parent != null && win.parent !== win && depth < MAX_SEARCH_DEPTH) {
      depth++;
      win = win.parent;
    }
    return win.API || null;
  }

  function locateAPI() {
    var found = null;
    if (window.API) {
      found = window.API;
    } else if (window.opener && !found) {
      found = findAPI(window.opener);
    }
    if (!found) {
      found = findAPI(window);
    }
    return found;
  }

  function log(message) {
    if (window.console && window.console.info) {
      window.console.info('[SCORM] ' + message);
    }
  }

  function initialize() {
    API = locateAPI();
    if (!API) {
      log('Aucune API LMS détectée. Mode autonome (hors LMS) activé.');
      return false;
    }
    var result = API.LMSInitialize('');
    initialized = result === 'true' || result === true;
    if (initialized) {
      API.LMSSetValue('cmi.core.lesson_status', getRawStatus() === 'not attempted' ? 'incomplete' : getRawStatus());
      API.LMSCommit('');
      log('Session SCORM initialisée.');
    } else {
      log('Échec de LMSInitialize.');
    }
    return initialized;
  }

  function withApi(fn, fallback) {
    if (!API || !initialized) {
      return fallback;
    }
    try {
      return fn();
    } catch (err) {
      log('Erreur API : ' + err.message);
      return fallback;
    }
  }

  function getRawStatus() {
    return withApi(function () {
      var status = API.LMSGetValue('cmi.core.lesson_status');
      return status || 'not attempted';
    }, 'not attempted');
  }

  function setStatus(status) {
    return withApi(function () {
      API.LMSSetValue('cmi.core.lesson_status', status);
      API.LMSCommit('');
      return true;
    }, false);
  }

  function setScore(scoreRaw, scoreMax) {
    return withApi(function () {
      API.LMSSetValue('cmi.core.score.raw', String(scoreRaw));
      API.LMSSetValue('cmi.core.score.min', '0');
      API.LMSSetValue('cmi.core.score.max', String(scoreMax));
      API.LMSCommit('');
      return true;
    }, false);
  }

  function setSuspendData(dataObject) {
    return withApi(function () {
      var serialized = JSON.stringify(dataObject);
      API.LMSSetValue('cmi.suspend_data', serialized);
      API.LMSCommit('');
      return true;
    }, false);
  }

  function getSuspendData() {
    return withApi(function () {
      var raw = API.LMSGetValue('cmi.suspend_data');
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw);
      } catch (err) {
        return null;
      }
    }, null);
  }

  function setLocation(location) {
    return withApi(function () {
      API.LMSSetValue('cmi.core.lesson_location', String(location));
      API.LMSCommit('');
      return true;
    }, false);
  }

  function getLocation() {
    return withApi(function () {
      return API.LMSGetValue('cmi.core.lesson_location') || '';
    }, '');
  }

  function finish() {
    return withApi(function () {
      API.LMSCommit('');
      API.LMSFinish('');
      return true;
    }, false);
  }

  function isAvailable() {
    return initialized;
  }

  window.SCORM = {
    initialize: initialize,
    isAvailable: isAvailable,
    getStatus: getRawStatus,
    setStatus: setStatus,
    setScore: setScore,
    setSuspendData: setSuspendData,
    getSuspendData: getSuspendData,
    setLocation: setLocation,
    getLocation: getLocation,
    finish: finish
  };

  window.addEventListener('beforeunload', function () {
    if (initialized) {
      finish();
    }
  });
})(window);
