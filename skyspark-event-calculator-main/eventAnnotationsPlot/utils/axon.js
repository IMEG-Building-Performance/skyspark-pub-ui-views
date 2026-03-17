/**
 * axon.js
 *
 * Shared helpers for executing Axon expressions via the SkySpark eval endpoint
 * and extracting values from Haystack-formatted responses.
 *
 * Exposes:
 *   window.EventAnnotationsPlot.evalAxon(axonExpr)    → Promise<grid>
 *   window.EventAnnotationsPlot.extractValue(val)     → raw JS value
 *   window.EventAnnotationsPlot.parseCurrencyValue(v) → number
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};

/**
 * Execute an Axon expression via the eval endpoint.
 * Reads attestKey and projectName from shared state.
 */
window.EventAnnotationsPlot.evalAxon = function(axonExpr) {
  var state = window.EventAnnotationsPlot.state;
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
      if (inner && inner.rows && inner.cols) {
        return inner;
      }
    }
    return data;
  });
};

/**
 * Extract a raw JS value from a Haystack-wrapped object.
 * Handles: {val: ...}, {_kind: "dateTime", val: "..."}, {_kind: "number", val: N}, etc.
 */
window.EventAnnotationsPlot.extractValue = function(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && val.val !== undefined) return val.val;
  return val;
};

/**
 * Parse a Haystack currency value that may be a number, a string like "$215,663",
 * or a wrapped {_kind:"number", val:215663, unit:"$"} object.
 */
window.EventAnnotationsPlot.parseCurrencyValue = function(raw) {
  var val = window.EventAnnotationsPlot.extractValue(raw);
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    var cleaned = val.replace(/[\$,\s]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
};
