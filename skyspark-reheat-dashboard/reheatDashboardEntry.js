// reheatDashboardEntry.js
// Deploy to: {var}/pub/ui/ ROOT on every server (local and cloud)
// SkySpark only auto-discovers JS at pub/ui/ root — subdirs are ignored.
//
// View record (trio) jsHandler should point to: reheatDashboardHandler

var reheatDashboardHandler = {};

(function () {
  var BASE = '/pub/ui/reheatDashboard/';
  var modules = [
    'constants/fields.js',
    'utils/classify.js',
    'utils/demoData.js',
    'utils/svg.js',
    'components/KpiRow.js',
    'components/ScatterChart.js',
    'components/VavTable.js',
    'App.js',
    'reheatDashboardUI.js'
  ];
  var loaded = false, loading = false, pendingCalls = [];

  function loadModules(cb) {
    var i = 0;
    function next() {
      if (i >= modules.length) { cb(); return; }
      var s = document.createElement('script');
      s.src = BASE + modules[i];
      s.async = false;
      s.onload = function () { i++; next(); };
      s.onerror = function () {
        console.error('[reheatDashboard] Failed to load:', BASE + modules[i]);
        i++; next();
      };
      document.head.appendChild(s);
    }
    next();
  }

  reheatDashboardHandler.onUpdate = function (arg) {
    if (loaded) {
      window.reheatDashboardApp.onUpdate(arg);
      return;
    }
    pendingCalls.push(arg);
    if (!loading) {
      loading = true;
      loadModules(function () {
        loaded = true;
        loading = false;
        console.log('[reheatDashboard] All modules loaded.');
        pendingCalls.forEach(function (a) { window.reheatDashboardApp.onUpdate(a); });
        pendingCalls = [];
      });
    }
  };
})();
