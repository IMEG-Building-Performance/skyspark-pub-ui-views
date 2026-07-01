window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};
window.mbcxDashboard.eventCost.interactions = {};

window.mbcxDashboard.eventCost.interactions.detectHover = function(mouseX, mouseY, events, xScale, chartArea) {
  var state = window.mbcxDashboard.eventCost.state;
  if (!xScale || !chartArea || !events || events.length === 0) return null;
  for (var i = 0; i < events.length; i++) {
    if (state.visibilityState[i] === false) continue;
    var evt = events[i];
    if (!evt.startTime || !evt.endTime) continue;
    var x1 = xScale.getPixelForValue(evt.startTime.getTime());
    var x2 = xScale.getPixelForValue(evt.endTime.getTime());
    var y1 = chartArea.top;
    var y2 = chartArea.bottom;
    if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) return { event: evt, index: i };
  }
  return null;
};

window.mbcxDashboard.eventCost.interactions.createUtilityToggle = function(onSelect) {
  var state = window.mbcxDashboard.eventCost.state;
  var cfg = window.mbcxDashboard.eventCost.config;
  var utilities = ['Electric', 'CHW', 'Steam', 'Gas', 'Water'];
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:4px;padding:6px 0;flex-wrap:wrap;';
  var buttons = {};
  function setActive(name) {
    utilities.forEach(function(u) {
      var btn = buttons[u]; var ucfg = cfg.utilityConfig[u];
      if (u === name) { btn.style.background = ucfg.color; btn.style.color = 'white'; btn.style.borderColor = ucfg.color; }
      else { btn.style.background = 'white'; btn.style.color = ucfg.color; btn.style.borderColor = ucfg.color; }
    });
  }
  utilities.forEach(function(u) {
    var ucfg = cfg.utilityConfig[u];
    var btn = document.createElement('button');
    btn.textContent = ucfg.label;
    btn.style.cssText = 'padding:5px 14px;border:1px solid;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
    btn.onclick = function() { state.activeUtility = u; setActive(u); if (onSelect) onSelect(u); };
    bar.appendChild(btn); buttons[u] = btn;
  });
  setActive(state.activeUtility || 'Electric');
  return bar;
};

window.mbcxDashboard.eventCost.interactions.createCostUtilityToggle = function(activeUtility, onSelect) {
  var cfg = window.mbcxDashboard.eventCost.config;
  var utilities = ['Electric', 'CHW', 'Steam', 'Gas'];
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
  var buttons = {};
  var current = activeUtility || 'Electric';
  function setActive(name) {
    utilities.forEach(function(u) {
      var btn = buttons[u]; var ucfg = cfg.utilityConfig[u];
      if (u === name) { btn.style.background = ucfg.color; btn.style.color = 'white'; btn.style.borderColor = ucfg.color; }
      else { btn.style.background = 'white'; btn.style.color = ucfg.color; btn.style.borderColor = ucfg.color; }
    });
  }
  utilities.forEach(function(u) {
    var ucfg = cfg.utilityConfig[u];
    var btn = document.createElement('button');
    btn.textContent = ucfg.label;
    btn.style.cssText = 'padding:4px 12px;border:1px solid;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
    btn.onclick = function() { current = u; setActive(u); if (onSelect) onSelect(u); };
    bar.appendChild(btn); buttons[u] = btn;
  });
  setActive(current);
  return bar;
};
