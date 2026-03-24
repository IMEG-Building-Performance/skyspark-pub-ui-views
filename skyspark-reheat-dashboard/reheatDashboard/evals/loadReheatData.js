// evals/loadReheatData.js
// Fetches reheat report data from SkySpark and maps to vavData format
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  NS.evals = {};

  var api = NS.api;

  /**
   * Fetch reheat report data via view_reheatReport_pubUI(targets, dates).
   *
   * Returns a Promise resolving to an array of VAV objects:
   *   { id, name, dat, rh, flag }
   *
   * @param {string} attestKey   - Session attest key
   * @param {string} projectName - SkySpark project name
   * @param {string} targets     - Axon expression for equipment set
   * @param {string} dates       - Axon expression for date range
   * @returns {Promise<Array>}
   */
  NS.evals.loadReheatData = function (attestKey, projectName, targets, dates) {
    var axon = 'view_reheatReport_pubUI(' + targets + ', ' + dates + ')';
    console.log('[reheatDashboard] Eval:', axon);

    return api.evalAxon(axon, attestKey, projectName)
      .then(function (data) {
        var grid = api.unwrapGrid(data);

        // Check for error grid
        if (grid.meta && grid.meta.err) {
          var msg = grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid';
          throw new Error(msg);
        }

        var cols = (grid.cols || []).map(function (c) { return c.name; });
        var rows = grid.rows || [];

        console.log('[reheatDashboard] Grid cols:', cols, '| rows:', rows.length);

        return rows.map(function (row, idx) {
          return {
            id:   idx,
            name: api.extractValue(row.navName || row.dis || row.name || row.equipRef) || ('VAV-' + idx),
            dat:  parseFloat(api.extractValue(row.avgDat || row.dat || row.avgDischargeAirTemp)) || 0,
            rh:   parseFloat(api.extractValue(row.avgRh || row.rh || row.avgReheatValve || row.avgReheatValveOutput)) || 0,
            flag: NS.classify(
              parseFloat(api.extractValue(row.avgDat || row.dat || row.avgDischargeAirTemp)) || 0,
              parseFloat(api.extractValue(row.avgRh || row.rh || row.avgReheatValve || row.avgReheatValveOutput)) || 0
            )
          };
        });
      });
  };

})(window.reheatDashboard);
