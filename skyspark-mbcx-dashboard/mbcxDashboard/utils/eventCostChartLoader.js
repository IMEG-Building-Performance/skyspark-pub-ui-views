window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};

window.mbcxDashboard.eventCost.loader = {

  _resolveBasePath: function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      var marker = 'mbcxDashboard/';
      var idx = src.indexOf(marker);
      if (idx !== -1) return src.substring(0, idx + marker.length);
    }
    return '/pub/ui/mbcxDashboard/';
  },

  _loadScript: function(url, onLoad, onError) {
    var script = document.createElement('script');
    script.src = url;
    script.onload = onLoad;
    script.onerror = onError || function() {};
    document.head.appendChild(script);
  },

  loadChartJs: function(callback) {
    var state = window.mbcxDashboard.eventCost.state;
    if (state.chartJsLoaded) { callback(); return; }
    if (typeof Chart !== 'undefined' && window._chartJsDateAdapterLoaded) {
      state.chartJsLoaded = true; callback(); return;
    }
    var basePath = this._resolveBasePath();
    var vendorPath = basePath + 'vendor/';
    var self = this;

    function loadPlugins() {
      self._loadScript(vendorPath + 'chartjs-adapter-date-fns.bundle.min.js', function() {
        self._loadScript(vendorPath + 'chartjs-plugin-annotation.min.js',
          function() { finishLoading(); },
          function() { finishLoading(); }
        );
      }, function() { console.warn('[eventCost] Date adapter failed to load'); });
    }

    function finishLoading() {
      window._chartJsDateAdapterLoaded = true;
      state.chartJsLoaded = true;
      callback();
    }

    if (typeof Chart !== 'undefined') {
      loadPlugins();
    } else {
      self._loadScript(vendorPath + 'chart.umd.min.js', function() {
        loadPlugins();
      }, function() { console.warn('[eventCost] Chart.js failed to load'); });
    }
  }
};
