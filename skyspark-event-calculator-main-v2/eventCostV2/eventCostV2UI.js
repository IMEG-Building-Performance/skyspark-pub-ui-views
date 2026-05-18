/**
 * eventCostV2UI.js
 *
 * Module loader for Event Cost V2.
 * Loads all JS modules in dependency order, injects CSS, then signals ready.
 * Loaded by eventCostV2Entry.js from the cloud server.
 */

(function() {
  var BASE_URL = (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      var marker = 'eventCostV2/';
      var idx = src.indexOf(marker);
      if (idx !== -1) return src.substring(0, idx + marker.length);
    }
    return 'eventCostV2/';
  })();

  var modules = [
    // Config & state (config before state)
    'constants/config.js',
    'constants/state.js',

    // Shared utilities
    'utils/chartLoader.js',
    'utils/axon.js',
    'utils/transformers.js',
    'utils/interactions.js',
    'utils/skysparkVars.js',

    // Eval wrappers
    'evals/loadEventCostResults.js',
    'evals/loadBookingTable.js',
    'evals/loadPowerData.js',
    'evals/loadSiteName.js',

    // Rendering (V1 carry-forward)
    'utils/rendering/chart.js',
    'utils/rendering/annotations.js',
    'utils/rendering/timeline.js',
    'utils/rendering/labels.js',
    'utils/rendering/tooltips.js',

    // UI components
    'components/DateRangePicker.js',
    'components/MonthlyOverview.js',
    'components/UtilityReconciliation.js',
    'components/EventDetailV2.js',
    'components/SiteStatus.js',
    'components/ExpandView.js',
    'components/Documentation.js',

    // Root application
    'App.js'
  ];

  // Inject styles
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'eventCostV2Styles.css';
  document.head.appendChild(link);

  var index = 0;
  var failedModules = [];

  function loadNext() {
    if (index >= modules.length) {
      if (failedModules.length > 0) {
        console.error('Event Cost V2: failed modules:', failedModules);
      } else {
        console.log('Event Cost V2: all modules loaded');
      }
      if (typeof window.__eventCostV2Ready === 'function') {
        window.__eventCostV2Ready(failedModules);
        window.__eventCostV2Ready = null;
      }
      return;
    }

    var script = document.createElement('script');
    script.src = BASE_URL + modules[index];
    script.onload = function() { index++; loadNext(); };
    script.onerror = function() {
      failedModules.push(modules[index]);
      console.error('Event Cost V2: failed to load', modules[index]);
      index++; loadNext();
    };
    document.head.appendChild(script);
  }

  loadNext();
})();
