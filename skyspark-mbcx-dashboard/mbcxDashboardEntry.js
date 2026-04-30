// mbcxDashboardEntry.js
// Deploy to: {var}/pub/ui/ ROOT on every server (local and cloud)
// SkySpark only auto-discovers JS at pub/ui/ root — subdirs are ignored.
//
// View record (trio) jsHandler should point to: mbcxDashboardHandler

var mbcxDashboardHandler = {};

(function () {
  var BASE = '/pub/ui/mbcxDashboard/';
  // Bump MODULE_VERSION whenever the module list changes — forces a fresh load
  // even if SkySpark reuses this closure across navigations.
  var MODULE_VERSION = 'v8';

  var modules = [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', abs: true },
    { src: 'constants/demoData.js' },
    { src: 'utils/api.js' },
    { src: 'utils/haystackParser.js' },
    { src: 'evals/loadData.js' },
    { src: 'evals/loadAhuData.js' },
    { src: 'components/Header.js' },
    { src: 'components/HealthBanner.js' },
    { src: 'components/BuildingMeters.js' },
    { src: 'components/CUP.js' },
    { src: 'components/AHU.js' },
    { src: 'components/ReheatScatter.js' },
    { src: 'components/TerminalUnits.js' },
    { src: 'components/FaultList.js' },
    { src: 'components/TrendingView.js' },
    { src: 'components/Footer.js' },
    { src: 'App.js' },
    { src: 'mbcxDashboardUI.js' }
  ];

  var loadedVersion = null, loading = false, pendingCalls = [];

  function loadModules(cb) {
    var bust = '?_v=' + MODULE_VERSION + '.' + Date.now();
    var i = 0;
    function next() {
      if (i >= modules.length) { cb(); return; }
      var m = modules[i];
      if (m.abs && window.Chart) { i++; next(); return; }
      var s = document.createElement('script');
      s.src = m.abs ? m.src : (BASE + m.src + bust);
      s.async = false;
      s.onload = function () { i++; next(); };
      s.onerror = function () {
        console.error('[mbcxDashboard] Failed to load:', s.src);
        i++; next();
      };
      document.head.appendChild(s);
    }
    next();
  }

  mbcxDashboardHandler.onUpdate = function (arg) {
    if (loadedVersion === MODULE_VERSION) {
      window.mbcxDashboardApp.onUpdate(arg);
      return;
    }
    pendingCalls.push(arg);
    if (!loading) {
      loading = true;
      loadModules(function () {
        loadedVersion = MODULE_VERSION;
        loading = false;
        var comps = Object.keys((window.mbcxDashboard || {}).components || {});
        console.log('[mbcxDashboard] ' + MODULE_VERSION + ' loaded. Components: ' + comps.join(', '));
        pendingCalls.forEach(function (a) { window.mbcxDashboardApp.onUpdate(a); });
        pendingCalls = [];
      });
    }
  };
})();
