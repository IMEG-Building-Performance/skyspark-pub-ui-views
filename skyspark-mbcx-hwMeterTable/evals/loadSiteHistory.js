// hwMeterTable/evals/loadSiteHistory.js
//
// Fetches raw time-series history for a single site's hot water meter points.
//
// ── Axon expression ────────────────────────────────────────────────────────
// Default:
//   readAll(hotWaterMeter and siteRef == @siteId).hisRead(dates)
//
// This is the standard SkySpark pattern for reading history from all points
// tagged {hotWaterMeter} that belong to the given site. Each point becomes
// one value column in the returned grid (ts + v0, v1, …).
//
// If your project uses a different tagging scheme or a custom Axon function,
// edit the `axon` variable in `evals.loadSiteHistory` below.
// ── ────────────────────────────────────────────────────────────────────────

window.hwMeterTable = window.hwMeterTable || {};
window.hwMeterTable.evals = window.hwMeterTable.evals || {};

(function (evals) {
  var utils = window.hwMeterTable.utils;

  /**
   * Load raw hot water meter history for a single site.
   *
   * Returns a Haystack grid where:
   *   - The first column is `ts` (DateTime values)
   *   - Remaining columns are one per matched point (Number values with units)
   *
   * If no hotWaterMeter points are tagged for the site, the grid will have
   * no value columns or no rows — the chart will display "No history data found".
   *
   * @param {string} attestKey   - Session attest key
   * @param {string} projectName - SkySpark project name
   * @param {string} siteId      - Axon-encoded site ref, e.g. "@p:proj:r:abc123"
   * @param {string} dates       - Date range expression, e.g. "pastMonth"
   * @returns {Promise<Object>}  - Resolved Haystack grid
   */
  evals.loadSiteHistory = function (attestKey, projectName, siteId, dates) {
    // TODO: replace with your project-specific Axon function if needed.
    var axon = 'readAll(hotWaterMeter and siteRef == ' + siteId + ').hisRead(' + dates + ')';

    console.log('[hwMeterTable] loadSiteHistory eval:', axon);

    return utils.evalAxon(axon, attestKey, projectName)
      .then(function (data) {
        var grid = utils.unwrapGrid(data);
        if (grid.meta && grid.meta.err) {
          var msg = grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid';
          throw new Error('[loadSiteHistory] ' + msg);
        }
        console.log('[hwMeterTable] History grid:',
          (grid.cols || []).map(function (c) { return c.name; }),
          '| rows:', (grid.rows || []).length);
        return grid;
      });
  };

})(window.hwMeterTable.evals);
