/**
 * eventCostV2Entry.js
 *
 * Thin entry file for SkySpark pub UI (Event Cost V2).
 *
 * SETUP:
 *   1. Copy this file to the client's {var}/pub/ui/ directory.
 *   2. Set the view record's jsHandler to: eventCostHandler
 *   3. Update BASE_URL to point to the cloud server hosting eventCostV2/
 */

window.eventCostHandler = {};

(function() {
  var BASE_URL = 'https://imeg-skyspark.com/pub/ui/eventCostV2/';

  var loaded = false;
  var loading = false;
  var pendingCalls = [];

  function loadUI(callback) {
    window.__eventCostV2Ready = callback;

    var script = document.createElement('script');
    script.src = BASE_URL + 'eventCostV2UI.js';
    script.onerror = function() {
      console.error('Failed to load eventCostV2UI.js');
    };
    document.head.appendChild(script);
  }

  window.eventCostHandler.onUpdate = function(arg) {
    if (loaded) {
      window.EventCostV2.onUpdate(arg);
      return;
    }

    pendingCalls.push(arg);

    if (!loading) {
      loading = true;
      console.log('Loading Event Cost V2 modules...');

      loadUI(function(failedModules) {
        loading = false;

        if (!window.EventCostV2 || typeof window.EventCostV2.onUpdate !== 'function') {
          console.error(
            'Event Cost V2 failed to initialise.' +
            (failedModules && failedModules.length ? ' Failed: ' + failedModules.join(', ') : '')
          );
          pendingCalls = [];
          return;
        }

        loaded = true;
        console.log('Event Cost V2 ready');

        pendingCalls.forEach(function(pendingArg) {
          window.EventCostV2.onUpdate(pendingArg);
        });
        pendingCalls = [];
      });
    }
  };
})();
