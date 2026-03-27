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
    return new Promise(function (resolve, reject) {
      var url = '/api/' + projectName + '/eval';
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'text/zinc; charset=utf-8');
      xhr.setRequestHeader('X-Auth-Token', attestKey);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('JSON parse error: ' + e.message));
          }
        } else {
          reject(new Error('HTTP ' + xhr.status + ': ' + xhr.statusText));
        }
      };
      xhr.onerror = function () { reject(new Error('Network error')); };
      xhr.send(axonExpr);
    });
  };

})(window.mbcxDashboard.api);
