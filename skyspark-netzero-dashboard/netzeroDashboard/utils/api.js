// utils/api.js
// SkySpark REST API helpers — wraps Axon eval over HTTP.
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.api = window.netzeroDashboard.api || {};

(function (API) {

  API.evalAxon = function (attestKey, projectName, axonExpr) {
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
          throw new Error('HTTP ' + r.status + ' \u2014 ' + body.slice(0, 300));
        });
      }
      return r.json();
    }).then(function (grid) {
      return API.unwrapGrid(grid);
    });
  };

  API.unwrapGrid = function (data) {
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

})(window.netzeroDashboard.api);
