// siteSummaryEntry.js
// Deploy to: {var}/pub/ui/ ROOT on every server (local and cloud)
// SkySpark only auto-discovers JS at pub/ui/ root — subdirs are ignored.
//
// View record (trio) jsHandler should point to: siteSummaryHandler

var siteSummaryHandler = {};

(function () {
  var BASE = '/pub/ui/siteSummary/';
  var BUST = '?_v=' + Date.now();
  var modules = [
    'utils/api.js',
    'evals/loadSites.js',
    'App.js',
    'siteSummaryUI.js'
  ];
  var loaded = false, loading = false, pendingCalls = [];

  function loadModules(cb) {
    var i = 0;
    function next() {
      if (i >= modules.length) { cb(); return; }
      var s = document.createElement('script');
      s.src = BASE + modules[i] + BUST;
      s.async = false;
      s.onload = function () { i++; next(); };
      s.onerror = function () {
        console.error('[siteSummary] Failed to load:', BASE + modules[i]);
        i++; next();
      };
      document.head.appendChild(s);
    }
    next();
  }

  siteSummaryHandler.onUpdate = function (arg) {
    if (loaded) {
      window.siteSummaryApp.onUpdate(arg);
      return;
    }
    pendingCalls.push(arg);
    if (!loading) {
      loading = true;
      loadModules(function () {
        loaded = true;
        loading = false;
        console.log('[siteSummary] All modules loaded.');
        pendingCalls.forEach(function (a) { window.siteSummaryApp.onUpdate(a); });
        pendingCalls = [];
      });
    }
  };
})();
