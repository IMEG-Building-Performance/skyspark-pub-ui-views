// utils/api.js
// SkySpark REST API helpers — wraps Axon eval over HTTP.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.api = window.mbcxDashboard.api || {};

(function (API) {

  function _doFetch(attestKey, projectName, axonExpr) {
    var body = 'ver: "3.0"\nexpr\n"' + axonExpr.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    return fetch('/api/' + projectName + '/eval', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'text/zinc',
        'Accept': 'application/json',
        'Attest-Key': attestKey
      },
      body: body
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (body) {
          throw new Error('HTTP ' + r.status + ' — ' + body.slice(0, 300));
        });
      }
      return r.text().then(function (txt) {
        if (!txt) throw new Error('Empty response from server');
        try { return JSON.parse(txt); }
        catch (e) { throw new Error('Invalid JSON: ' + txt.slice(0, 200)); }
      });
    });
  }

  /**
   * Evaluate an Axon expression that returns a grid.
   * Resolves with a Haystack grid (unwrapped from the eval envelope).
   */
  API.evalAxon = function (attestKey, projectName, axonExpr) {
    return _doFetch(attestKey, projectName, axonExpr).then(function (data) {
      return API.unwrapGrid(data);
    });
  };

  /**
   * Evaluate an Axon expression that returns a scalar value (Ref, Number, Str…).
   * Resolves with the raw Haystack JSON value (e.g. {_kind:"Ref", val:"xxx", dis:"…"}).
   */
  API.evalAxonVal = function (attestKey, projectName, axonExpr) {
    return _doFetch(attestKey, projectName, axonExpr).then(function (data) {
      if (data.rows && data.rows.length === 1 &&
          data.cols && data.cols.length === 1 &&
          data.cols[0].name === 'val') {
        return data.rows[0].val;
      }
      return null;
    });
  };

  // The eval endpoint wraps results in a single-row grid with a 'val' column.
  API.unwrapGrid = function (data) {
    if (data.meta && data.meta.err) {
      var msg = data.meta.dis || data.meta.err || 'Haystack error grid';
      throw new Error(String(msg));
    }
    if (
      data.rows && data.rows.length === 1 &&
      data.cols && data.cols.length === 1 &&
      data.cols[0].name === 'val'
    ) {
      var inner = data.rows[0].val;
      if (inner && inner.meta && inner.meta.err) {
        var innerMsg = inner.meta.dis || inner.meta.err || 'Haystack error grid';
        throw new Error(String(innerMsg));
      }
      if (inner && inner.rows && inner.cols) return inner;
      return { cols: [], rows: [] };
    }
    return data;
  };

})(window.mbcxDashboard.api);
