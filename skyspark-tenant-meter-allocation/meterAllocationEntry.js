// meterAllocationEntry.js
// Deploy to: {var}/pub/ui/   (root — SkySpark only auto-discovers JS at pub/ui/ root)
// View record jsHandler should point to: meterAllocationHandler

var meterAllocationHandler = {};

(function () {
  var BASE = '/pub/ui/meterAllocation/';
  var BUST = '?_v=' + Date.now();

  var modules = [
    { src: 'constants/demoData.js' },
    { src: 'utils/api.js' },
    { src: 'utils/haystackParser.js' },
    { src: 'evals/loadMeterData.js' },
    { src: 'App.js' },
    { src: 'meterAllocationUI.js' }
  ];

  var loading = false;

  function loadModules(cb) {
    var i = 0;
    function next() {
      if (i >= modules.length) { cb(); return; }
      var m = modules[i];
      var s = document.createElement('script');
      s.src = BASE + m.src + BUST;
      s.async = false;
      s.onload = function () { i++; next(); };
      s.onerror = function () {
        console.error('[meterAllocation] Failed to load:', s.src);
        i++; next();
      };
      document.head.appendChild(s);
    }
    next();
  }

  meterAllocationHandler.onUpdate = function (arg) {
    if (loading) return;
    loading = true;
    BUST = '?_v=' + Date.now();
    loadModules(function () {
      loading = false;
      window.meterAllocationApp.onUpdate(arg);
    });
  };
})();
