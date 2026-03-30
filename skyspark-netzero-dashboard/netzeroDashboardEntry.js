// netzeroDashboardEntry.js
// Deploy to: {var}/pub/ui/ ROOT on every server (local and cloud)
// SkySpark only auto-discovers JS at pub/ui/ root — subdirs are ignored.
//
// View record (trio) jsHandler should point to: netzeroDashboardHandler

var netzeroDashboardHandler = {};

(function () {
  var BASE = '/pub/ui/netzeroDashboard/';
  var BUST = '?_v=' + Date.now();

  // Chart.js loaded first (absolute URL), then local modules in dependency order
  var modules = [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', abs: true },
    { src: 'constants/demoData.js' },
    { src: 'utils/api.js' },
    { src: 'utils/haystackParser.js' },
    { src: 'evals/loadData.js' },
    { src: 'components/Header.js' },
    { src: 'components/KpiStrip.js' },
    { src: 'components/EquivStrip.js' },
    { src: 'components/Charts.js' },
    { src: 'components/DetailTables.js' },
    { src: 'components/MeterBreakdown.js' },
    { src: 'components/Footer.js' },
    { src: 'App.js' },
    { src: 'netzeroDashboardUI.js' }
  ];

  var loaded = false, loading = false, pendingCalls = [];

  function loadModules(cb) {
    var i = 0;
    function next() {
      if (i >= modules.length) { cb(); return; }
      var m = modules[i];
      // Skip Chart.js if already present on the page
      if (m.abs && window.Chart) { i++; next(); return; }
      var s = document.createElement('script');
      s.src = m.abs ? m.src : (BASE + m.src + BUST);
      s.async = false;
      s.onload = function () { i++; next(); };
      s.onerror = function () {
        console.error('[netzeroDashboard] Failed to load:', s.src);
        i++; next();
      };
      document.head.appendChild(s);
    }
    next();
  }

  netzeroDashboardHandler.onUpdate = function (arg) {
    if (loaded) {
      window.netzeroDashboardApp.onUpdate(arg);
      return;
    }
    pendingCalls.push(arg);
    if (!loading) {
      loading = true;
      loadModules(function () {
        loaded = true;
        loading = false;
        console.log('[netzeroDashboard] All modules loaded.');
        pendingCalls.forEach(function (a) { window.netzeroDashboardApp.onUpdate(a); });
        pendingCalls = [];
      });
    }
  };
})();
