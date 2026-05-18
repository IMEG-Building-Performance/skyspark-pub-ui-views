// utils/api.js
// Utility functions for SkySpark Haystack API calls
window.siteSummary = window.siteSummary || {};

(function (NS) {
  NS.api = {};

  NS.api.evalAxon = function (axonExpr, attestKey, projectName) {
    var body = 'ver: "3.0"\nexpr\n"' + axonExpr.replace(/"/g, '\\"') + '"';
    return fetch('/api/' + projectName + '/eval', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/zinc',
        'Accept': 'application/json',
        'Attest-Key': attestKey
      },
      body: body
    }).then(function (r) {
      if (!r.ok) throw new Error('Server returned HTTP ' + r.status);
      return r.json();
    });
  };

  // Unwrap a single-row, single-col grid whose inner value is itself a grid.
  NS.api.unwrapGrid = function (data) {
    if (
      data.rows && data.rows.length === 1 &&
      data.cols && data.cols.length === 1 &&
      data.cols[0].name === 'val'
    ) {
      var inner = data.rows[0].val;
      if (inner && inner.rows && inner.cols) return inner;
    }
    return data;
  };

  NS.api.extractValue = function (val) {
    if (val == null) return null;
    if (val._kind === 'number') return val.val;
    if (val._kind === 'dateTime') return val.val;
    if (val._kind === 'ref') return val.dis || val.val;
    if (val.val !== undefined) return val.val;
    return val;
  };

})(window.siteSummary);
