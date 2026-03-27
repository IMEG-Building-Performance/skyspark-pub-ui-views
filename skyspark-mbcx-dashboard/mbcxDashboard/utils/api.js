// utils/api.js
// SkySpark REST API helpers — wraps Axon eval over HTTP.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.api = window.mbcxDashboard.api || {};

(function (API) {

  /**
   * POST an Axon expression to the SkySpark REST eval endpoint.
   *
   * @param {string} attestKey   - Session attest key from view.session().attestKey()
   * @param {string} projectName - Project name from view.session().proj().name()
   * @param {string} axonExpr    - Axon expression to evaluate
   * @returns {Promise<object>}  - Resolves with the parsed JSON response (Haystack grid)
   */
  API.evalAxon = function (attestKey, projectName, axonExpr) {
    // SkySpark eval endpoint expects a Zinc grid with an "expr" column
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
      return r.json();
    }).then(function (grid) {
      return API.unwrapGrid(grid);
    });
  };

  // The eval endpoint wraps results in a single-row grid with a 'val' column.
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

})(window.mbcxDashboard.api);
