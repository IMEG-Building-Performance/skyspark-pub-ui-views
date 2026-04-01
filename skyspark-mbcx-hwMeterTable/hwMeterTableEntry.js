// hwMeterTableEntry.js
//
// Deploy to: {var}/pub/ui/ ROOT on every server (local and cloud)
// SkySpark only auto-discovers JS at pub/ui/ root — subdirs are ignored.
// Modules are loaded dynamically so they can live in a subdirectory on the cloud.
//
// View record (trio) jsHandler should point to: hwMeterTableHandler

console.log('[hwMeterTable] Entry file parsed.');

var hwMeterTableHandler = {};

(function () {
  var BASE_URL = '/pub/ui/hwMeterTable/';
  var VERSION  = '36';  // bump this when deploying updated module files

  // Expose version so modules (handler) can append it to CSS/asset URLs
  window.hwMeterTable = window.hwMeterTable || {};
  window.hwMeterTable._version = VERSION;
  var modules = [
    'utils/api.js',
    'evals/loadDemandData.js',
    'evals/loadDetailPage.js',
    'components/SiteTable.js',
    'components/SiteDetail.js',
    'hwMeterTableHandler.js'
  ];
  var loaded = false;
  var loading = false;
  var pendingCalls = [];

  function loadModules(cb) {
    var i = 0;
    function next() {
      if (i >= modules.length) { cb(); return; }
      var url = BASE_URL + modules[i] + '?v=' + VERSION;
      var s = document.createElement('script');
      s.src = url;
      s.onload = function () { i++; next(); };
      s.onerror = function () {
        console.error('[hwMeterTable] Failed to load module:', url);
        i++;
        next();
      };
      document.head.appendChild(s);
    }
    next();
  }

  hwMeterTableHandler.onUpdate = function (arg) {
    if (loaded) {
      if (window.hwMeterTableApp && typeof window.hwMeterTableApp.onUpdate === 'function') {
        window.hwMeterTableApp.onUpdate(arg);
      }
      return;
    }
    pendingCalls.push(arg);
    if (!loading) {
      loading = true;
      loadModules(function () {
        loaded = true;
        loading = false;
        pendingCalls.forEach(function (a) {
          if (window.hwMeterTableApp && typeof window.hwMeterTableApp.onUpdate === 'function') {
            window.hwMeterTableApp.onUpdate(a);
          }
        });
        pendingCalls = [];
      });
    }
  };
})();
