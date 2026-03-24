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
        if (rows.length > 0) console.log('[reheatDashboard] Sample row:', JSON.stringify(rows[0]));

        return rows.map(function (row, idx) {
          var dat = Math.round(parseFloat(api.extractValue(row.vav_SupplyAirTemperature)) || 0);
          var rh  = Math.round(parseFloat(api.extractValue(row.vav_HeatingValveOutput))   || 0);
          return {
            id:   idx,
            name: api.extractValue(row.targetRef) || ('VAV-' + idx),
            dat:  dat,
            rh:   rh,
            flag: NS.classify(dat, rh)
          };
        });
      });
  };

})(window.reheatDashboard);
