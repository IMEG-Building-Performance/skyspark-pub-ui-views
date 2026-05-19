// utils/api.js
// SkySpark REST API helpers — wraps Axon eval over HTTP.
window.meterAllocation = window.meterAllocation || {};

(function (NS) {
  NS.api = {};

  NS.api.evalAxon = function (axonExpr, attestKey, projectName, cacheKey) {
    var body = 'ver: "3.0"\nexpr\n"' + axonExpr.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    // Append a cache-busting query param so the service worker doesn't serve a
    // cached response from a prior eval when only the POST body differs.
    var url = '/api/' + projectName + '/eval' + (cacheKey ? '?_u=' + encodeURIComponent(cacheKey) : '');
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'text/zinc',
        'Accept': 'application/json',
        'Attest-Key': attestKey,
        'Cache-Control': 'no-cache, no-store'
      },
      body: body
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (b) {
          throw new Error('HTTP ' + r.status + ' — ' + b.slice(0, 300));
        });
      }
      return r.json();
    });
  };

  // Unwrap a single-row/single-col "val" wrapper grid that SkySpark sometimes returns
  NS.api.unwrapGrid = function (data) {
    if (
      data && data.rows && data.rows.length === 1 &&
      data.cols && data.cols.length === 1 &&
      data.cols[0].name === 'val'
    ) {
      var inner = data.rows[0].val;
      if (inner && inner.rows && inner.cols) return inner;
    }
    return data;
  };

})(window.meterAllocation);
