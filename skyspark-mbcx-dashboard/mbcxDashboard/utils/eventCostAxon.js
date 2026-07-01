/**
 * eventCostAxon.js — SkySpark eval API helpers for Event Cost (MBCx Dashboard)
 *
 * Delegates to the dashboard's shared API layer:
 *   window.mbcxDashboard.api.evalAxon(attestKey, projectName, axonExpr)
 *
 * Exposes:
 *   window.mbcxDashboard.eventCost.evalAxon(axonExpr)     → Promise<grid>
 *   window.mbcxDashboard.eventCost.extractValue(val)      → raw JS value
 *   window.mbcxDashboard.eventCost.parseCurrencyValue(v)  → number
 */

window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};

window.mbcxDashboard.eventCost.evalAxon = function(axonExpr) {
  var state = window.mbcxDashboard.eventCost.state;
  return window.mbcxDashboard.api.evalAxon(state.attestKey, state.projectName, axonExpr);
};

window.mbcxDashboard.eventCost.extractValue = function(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && val.val !== undefined) return val.val;
  return val;
};

window.mbcxDashboard.eventCost.parseCurrencyValue = function(raw) {
  var val = window.mbcxDashboard.eventCost.extractValue(raw);
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    return parseFloat(val.replace(/[\$,\s]/g, '')) || 0;
  }
  return 0;
};
