/**
 * interactions.js — Mouse interactions and utility toggle for Event Cost V2
 * Adapted from V1; namespace updated to EventCostV2.
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.interactions = {};

/**
 * Detect which event the mouse is hovering over on the annotation overlay canvas.
 */
window.EventCostV2.interactions.detectHover = function(mouseX, mouseY, events, xScale, chartArea) {
  var state = window.EventCostV2.state;
  if (!xScale || !chartArea || !events || events.length === 0) return null;

  for (var i = 0; i < events.length; i++) {
    if (state.visibilityState[i] === false) continue;
    var evt = events[i];
    if (!evt.startTime || !evt.endTime) continue;

    var x1 = xScale.getPixelForValue(evt.startTime.getTime());
    var x2 = xScale.getPixelForValue(evt.endTime.getTime());
    var y1 = chartArea.top;
    var y2 = chartArea.bottom;

    if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) {
      return { event: evt, index: i };
    }
  }
  return null;
};

/**
 * Create a utility toggle bar (pill buttons) for Electric / CHW / Steam / Gas / Water.
 * @param {Function} onSelect  called with the utility name string
 * @returns {HTMLElement}
 */
window.EventCostV2.interactions.createUtilityToggle = function(onSelect) {
  var state = window.EventCostV2.state;
  var cfg = window.EventCostV2.config;

  var utilities = ['Electric', 'CHW', 'Steam', 'Gas', 'Water'];
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:4px;padding:6px 0;flex-wrap:wrap;';

  var buttons = {};

  function setActive(name) {
    utilities.forEach(function(u) {
      var btn = buttons[u];
      var ucfg = cfg.utilityConfig[u];
      if (u === name) {
        btn.style.background = ucfg.color;
        btn.style.color = 'white';
        btn.style.borderColor = ucfg.color;
      } else {
        btn.style.background = 'white';
        btn.style.color = ucfg.color;
        btn.style.borderColor = ucfg.color;
      }
    });
  }

  utilities.forEach(function(u) {
    var ucfg = cfg.utilityConfig[u];
    var btn = document.createElement('button');
    btn.textContent = ucfg.label;
    btn.style.cssText = 'padding:5px 14px;border:1px solid;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
    btn.onclick = function() {
      state.activeUtility = u;
      setActive(u);
      if (onSelect) onSelect(u);
    };
    bar.appendChild(btn);
    buttons[u] = btn;
  });

  setActive(state.activeUtility || 'Electric');
  return bar;
};

/**
 * Create a compact utility toggle (Electric / CHW / Steam / Gas only — no Water).
 */
window.EventCostV2.interactions.createCostUtilityToggle = function(activeUtility, onSelect) {
  var cfg = window.EventCostV2.config;
  var utilities = ['Electric', 'CHW', 'Steam', 'Gas'];
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';

  var buttons = {};
  var current = activeUtility || 'Electric';

  function setActive(name) {
    utilities.forEach(function(u) {
      var btn = buttons[u];
      var ucfg = cfg.utilityConfig[u];
      if (u === name) {
        btn.style.background = ucfg.color;
        btn.style.color = 'white';
        btn.style.borderColor = ucfg.color;
      } else {
        btn.style.background = 'white';
        btn.style.color = ucfg.color;
        btn.style.borderColor = ucfg.color;
      }
    });
  }

  utilities.forEach(function(u) {
    var ucfg = cfg.utilityConfig[u];
    var btn = document.createElement('button');
    btn.textContent = ucfg.label;
    btn.style.cssText = 'padding:4px 12px;border:1px solid;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
    btn.onclick = function() {
      current = u;
      setActive(u);
      if (onSelect) onSelect(u);
    };
    bar.appendChild(btn);
    buttons[u] = btn;
  });

  setActive(current);
  return bar;
};
