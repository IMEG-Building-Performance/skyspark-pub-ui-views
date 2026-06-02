// mbcxDashboardEntry.js
// Deploy to: {var}/pub/ui/ ROOT on every server (local and cloud)
// SkySpark only auto-discovers JS at pub/ui/ root — subdirs are ignored.
//
// View record (trio) jsHandler should point to: mbcxDashboardHandler

var mbcxDashboardHandler = {};

(function () {
  var BASE = '/pub/ui/mbcxDashboard/';

  var modules = [
    { src: 'vendor/chart.umd.min.js' },
    { src: 'constants/demoData.js' },
    { src: 'utils/api.js' },
    { src: 'utils/haystackParser.js' },
    { src: 'evals/loadData.js' },
    { src: 'evals/loadAhuData.js' },
    { src: 'evals/loadCupData.js' },
    { src: 'components/Header.js' },
    { src: 'components/BuildingMeters.js' },
    { src: 'components/CUP.js' },
    { src: 'components/CUPPlantDetail.js' },
    { src: 'components/CUPEquipDetail.js' },
    { src: 'components/AHU.js' },
    { src: 'components/ReheatScatter.js' },
    { src: 'components/TerminalUnits.js' },
    { src: 'components/FaultList.js' },
    { src: 'components/FaultDetail.js' },
    { src: 'components/MeetingView.js' },
    { src: 'components/TrendingView.js' },
    { src: 'components/Footer.js' },
    { src: 'components/DateRangePicker.js' },
    { src: 'App.js' },
    { src: 'mbcxDashboardUI.js' }
  ];

  var loaded = false, loading = false, pendingCalls = [];

  function loadModules(cb) {
    var bust = '?_v=' + Date.now();
    var i = 0;
    function next() {
      if (i >= modules.length) { cb(); return; }
      var m = modules[i];
      var s = document.createElement('script');
      s.src = BASE + m.src + bust;
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
    if (loaded) {
      window.mbcxDashboardApp.onUpdate(arg);
      return;
    }
    pendingCalls.push(arg);
    if (!loading) {
      loading = true;
      loadModules(function () {
        loaded = true;
        loading = false;
        var comps = Object.keys((window.mbcxDashboard || {}).components || {});
        console.log('[mbcxDashboard] loaded. Components: ' + comps.join(', '));
        pendingCalls.forEach(function (a) { window.mbcxDashboardApp.onUpdate(a); });
        pendingCalls = [];
      });
    }
  };
})();
