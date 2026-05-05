// mbcxTrendingEntry.js
// Deploy to: {var}/pub/ui/ ROOT on every server (local and cloud)
// View record jsHandler: mbcxTrendingHandler

var mbcxTrendingHandler = {};

(function () {
  var BASE = '/pub/ui/mbcxTrending/';
  var BUST = '?_v=' + Date.now();

  var modules = [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', abs: true },
    { src: 'constants/demoData.js' },
    { src: 'utils/api.js' },
    { src: 'utils/haystackParser.js' },
    { src: 'App.js' },
    { src: 'mbcxTrendingUI.js' }
  ];

  var loaded = false, loading = false, pendingCalls = [];

  function loadModules(cb) {
    var i = 0;
    function next() {
      if (i >= modules.length) { cb(); return; }
      var m = modules[i];
      if (m.abs && window.Chart) { i++; next(); return; }
      var s = document.createElement('script');
      s.src = m.abs ? m.src : (BASE + m.src + BUST);
      s.async = false;
      s.onload = function () { i++; next(); };
      s.onerror = function () { console.error('[mbcxTrending] Failed:', s.src); i++; next(); };
      document.head.appendChild(s);
    }
    next();
  }

  mbcxTrendingHandler.onUpdate = function (arg) {
    if (loaded) { window.mbcxTrendingApp.onUpdate(arg); return; }
    pendingCalls.push(arg);
    if (!loading) {
      loading = true;
      loadModules(function () {
        loaded = true; loading = false;
        pendingCalls.forEach(function (a) { window.mbcxTrendingApp.onUpdate(a); });
        pendingCalls = [];
      });
    }
  };
})();
