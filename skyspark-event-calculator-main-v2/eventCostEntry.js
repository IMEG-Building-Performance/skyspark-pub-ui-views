/**
 * eventCostEntry.js
 *
 * Thin entry file for SkySpark pub UI (v2 Event Cost tool).
 * Loads the UI module from the cloud server, then delegates to onUpdate.
 *
 * SETUP:
 *   1. Copy this file to the client's {var}/pub/ui/ directory.
 *   2. Set the view record's jsHandler to: eventCostHandler
 *   3. Restart SkySpark if needed.
 */

var eventCostHandler = {};

(function() {
  var BASE_URL = 'https://imeg-skyspark.com/pub/ui/eventCost/';

  var loaded = false;
  var loading = false;
  var pendingCalls = [];

  function loadUI(callback) {
    window.__eventCostReady = callback;

    var script = document.createElement('script');
    script.src = BASE_URL + 'eventCostUI.js';
    script.onerror = function() {
      console.error('Failed to load eventCostUI.js');
    };
    document.head.appendChild(script);
  }

  eventCostHandler.onUpdate = function(arg) {
    if (loaded) {
      window.EventCost.onUpdate(arg);
      return;
    }

    pendingCalls.push(arg);

    if (!loading) {
      loading = true;
      console.log('Loading Event Cost modules...');

      loadUI(function(failedModules) {
        loading = false;

        if (!window.EventCost || typeof window.EventCost.onUpdate !== 'function') {
          console.error(
            'Event Cost failed to initialise.' +
            (failedModules && failedModules.length ? ' Failed modules: ' + failedModules.join(', ') : '')
          );
          pendingCalls = [];
          return;
        }

        loaded = true;
        console.log('Event Cost ready');

        pendingCalls.forEach(function(pendingArg) {
          window.EventCost.onUpdate(pendingArg);
        });
        pendingCalls = [];
      });
    }
  };
})();
