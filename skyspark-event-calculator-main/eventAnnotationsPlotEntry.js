/**
 * eventAnnotationsPlotEntry.js
 *
 * Thin entry file for SkySpark pub UI.
 * Loads the UI module from the cloud server, then delegates to onUpdate.
 *
 * SETUP:
 *   1. Copy this file to the client's {var}/pub/ui/ directory.
 *   2. Set the view record's jsHandler to: eventAnnotationsPlotHandler
 *   3. Restart SkySpark if needed.
 */

var eventAnnotationsPlotHandler = {};

(function() {
  var BASE_URL = 'https://imeg-skyspark.com/pub/ui/eventAnnotationsPlot/';

  var loaded = false;
  var loading = false;
  var pendingCalls = [];

  function loadUI(callback) {
    // Register the ready callback BEFORE injecting the script.
    // eventAnnotationsPlotUI.js calls window.__eventAnnotationsPlotReady()
    // only after every module (including App.js) has finished loading.
    window.__eventAnnotationsPlotReady = callback;

    var script = document.createElement('script');
    script.src = BASE_URL + 'eventAnnotationsPlotUI.js';
    script.onerror = function() {
      console.error('Failed to load eventAnnotationsPlotUI.js');
    };
    document.head.appendChild(script);
  }

  eventAnnotationsPlotHandler.onUpdate = function(arg) {
    if (loaded) {
      window.EventAnnotationsPlot.onUpdate(arg);
      return;
    }

    pendingCalls.push(arg);

    if (!loading) {
      loading = true;
      console.log('Loading Event Annotations Plot modules...');

      loadUI(function(failedModules) {
        loading = false;

        if (!window.EventAnnotationsPlot || typeof window.EventAnnotationsPlot.onUpdate !== 'function') {
          console.error(
            'Event Annotations Plot failed to initialise.' +
            (failedModules && failedModules.length ? ' Failed modules: ' + failedModules.join(', ') : '')
          );
          pendingCalls = [];
          return;
        }

        loaded = true;
        console.log('Event Annotations Plot ready');

        pendingCalls.forEach(function(pendingArg) {
          window.EventAnnotationsPlot.onUpdate(pendingArg);
        });
        pendingCalls = [];
      });
    }
  };
})();
