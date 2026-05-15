/**
 * axon.js — SkySpark eval API helpers for Event Cost V2
 *
 * Exposes:
 *   window.EventCostV2.evalAxon(axonExpr)     → Promise<grid>
 *   window.EventCostV2.extractValue(val)      → raw JS value
 *   window.EventCostV2.parseCurrencyValue(v)  → number
 */

window.EventCostV2 = window.EventCostV2 || {};

window.EventCostV2.evalAxon = function(axonExpr) {
  var state = window.EventCostV2.state;
  var body = 'ver: "3.0"\nexpr\n"' + axonExpr.replace(/"/g, '\\"') + '"';

  return fetch('/api/' + state.projectName + '/eval', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/zinc',
      'Accept': 'application/json',
      'Attest-Key': state.attestKey
    },
    body: body
  })
  .then(function(response) {
    if (!response.ok) throw new Error('API error: ' + response.statusText);
    return response.json();
  })
  .then(function(data) {
    if (data.meta && data.meta.err) {
      throw new Error(data.meta.dis || 'Query error');
    }
    // Unwrap nested grid if present
    if (data.rows && data.rows.length === 1 &&
        data.cols && data.cols.length === 1 &&
        data.cols[0].name === 'val') {
      var inner = data.rows[0].val;
      if (inner && inner.rows && inner.cols) return inner;
    }
    return data;
  });
};

window.EventCostV2.extractValue = function(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && val.val !== undefined) return val.val;
  return val;
};

window.EventCostV2.parseCurrencyValue = function(raw) {
  var val = window.EventCostV2.extractValue(raw);
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    return parseFloat(val.replace(/[\$,\s]/g, '')) || 0;
  }
  return 0;
};
