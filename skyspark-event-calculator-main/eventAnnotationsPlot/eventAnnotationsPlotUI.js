/**
 * eventAnnotationsPlotUI.js
 *
 * UI module for Event Annotations Plot.
 * Loads all app modules in dependency order, then signals ready.
 * Loaded by eventAnnotationsPlotEntry.js from the cloud server.
 */

(function() {
  var BASE_URL = (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      var marker = 'eventAnnotationsPlot/';
      var idx = src.indexOf(marker);
      if (idx !== -1) {
        return src.substring(0, idx + marker.length);
      }
    }
    return 'eventAnnotationsPlot/';
  })();

  var modules = [
    // Config & state (config must load before state)
    'constants/config.js',
    'constants/state.js',

    // Shared utilities
    'utils/chartLoader.js',
    'utils/axon.js',
    'utils/transformers.js',
    'utils/interactions.js',
    'utils/skysparkVars.js',

    // Axon eval wrappers
    'evals/loadExecSummary.js',
    'evals/loadTotalEventCost.js',
    'evals/loadUtilityCost.js',
    'evals/loadPowerData.js',
    'evals/loadSiteName.js',
    'evals/loadEventDates.js',

    // Rendering
    'utils/rendering/chart.js',
    'utils/rendering/annotations.js',
    'utils/rendering/timeline.js',
    'utils/rendering/labels.js',
    'utils/rendering/tooltips.js',

    // UI components
    'components/Table.js',
    'components/Widgets.js',
    'components/EventDetail.js',
    'components/ExpandView.js',
    'components/EventsDatabase.js',

    // Sample data (used for dev/testing)
    'fixtures/generators.js',

    // Root application
    'App.js'
  ];

  // Inject app styles
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'eventAnnotationsPlotStyles.css';
  document.head.appendChild(link);

  var index = 0;
  var failedModules = [];

  function loadNext() {
    if (index >= modules.length) {
      if (failedModules.length > 0) {
        console.error('Event Annotations Plot: failed to load modules:', failedModules);
      } else {
        console.log('All Event Annotations Plot modules loaded');
      }
      // Pass failed-module list so the entry file can decide whether to proceed.
      if (typeof window.__eventAnnotationsPlotReady === 'function') {
        window.__eventAnnotationsPlotReady(failedModules);
        window.__eventAnnotationsPlotReady = null;
      }
      return;
    }

    var script = document.createElement('script');
    script.src = BASE_URL + modules[index];
    script.onload = function() {
      index++;
      loadNext();
    };
    script.onerror = function() {
      failedModules.push(modules[index]);
      console.error('Failed to load module:', modules[index]);
      index++;
      loadNext();
    };
    document.head.appendChild(script);
  }

  loadNext();
})();
