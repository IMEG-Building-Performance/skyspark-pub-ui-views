/**
 * loader.js - Chart.js Static Loading
 *
 * Loads Chart.js, the date adapter, and the annotation plugin from local
 * vendor/ files (no CDN dependency).  Scripts are loaded sequentially
 * because the date-adapter and annotation plugin depend on Chart being
 * available first.
 *
 * References window.EventAnnotationsPlot.state for shared state.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};

window.EventAnnotationsPlot.loader = {

  /**
   * Resolve the base path to the eventAnnotationsPlot directory.
   * Works by finding the <script> tag whose src contains
   * "eventAnnotationsPlot/" and walking up from there.
   * Falls back to a sensible default.
   */
  _resolveBasePath: function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      var marker = 'eventAnnotationsPlot/';
      var idx = src.indexOf(marker);
      if (idx !== -1) {
        return src.substring(0, idx + marker.length);
      }
    }
    // Fallback: assume vendor is a sibling of the current page
    return 'eventAnnotationsPlot/';
  },

  /**
   * Load a script from a given URL and call back when done.
   * @param {string} url       Absolute or relative URL to the script file.
   * @param {Function} onLoad  Called on successful load.
   * @param {Function} onError Called on failure (optional).
   */
  _loadScript: function(url, onLoad, onError) {
    var script = document.createElement('script');
    script.src = url;
    script.onload = onLoad;
    script.onerror = onError || function() {
      // Silent error handling
    };
    document.head.appendChild(script);
  },

  /**
   * Load Chart.js and its plugins from local vendor/ files.
   * @param {Function} callback  Called once all libraries are ready.
   */
  loadChartJs: function(callback) {
    var state = window.EventAnnotationsPlot.state;

    // Already loaded — skip
    if (state.chartJsLoaded) {
      callback();
      return;
    }

    // Another page/view may have loaded Chart globally already
    if (typeof Chart !== 'undefined' && window._chartJsDateAdapterLoaded) {
      state.chartJsLoaded = true;
      callback();
      return;
    }

    var basePath = this._resolveBasePath();
    var vendorPath = basePath + 'vendor/';
    var self = this;

    // Step 1: Chart.js core
    self._loadScript(vendorPath + 'chart.umd.min.js', function() {
      // Step 2: Date adapter (depends on Chart)
      self._loadScript(vendorPath + 'chartjs-adapter-date-fns.bundle.min.js', function() {
        // Step 3: Annotation plugin (optional — chart works without it)
        self._loadScript(
          vendorPath + 'chartjs-plugin-annotation.min.js',
          function() {
            finishLoading();
          },
          function() {
            // Annotation plugin failed to load — chart will work without annotations
            finishLoading();
          }
        );
      }, function() {
        // Date adapter failed to load — chart will not work properly
      });
    }, function() {
      // Chart.js failed to load — chart will not work
    });

    function finishLoading() {
      window._chartJsDateAdapterLoaded = true;
      state.chartJsLoaded = true;
      callback();
    }
  }

};
