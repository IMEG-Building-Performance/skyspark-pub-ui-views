// hwMeterTable/evals/loadSiteHistory.js
//
// Fetches raw time-series history for a single site's hot water meter points.
//
// ── Axon expression ────────────────────────────────────────────────────────
//   view_pubUI_Source_hwMeterTable(siteId, dates, "Detail Page")
//
// The siteId ref (from the clicked table row) is passed as the `targets`
// argument so the function can filter to a single site.
// ── ────────────────────────────────────────────────────────────────────────

window.hwMeterTable = window.hwMeterTable || {};
window.hwMeterTable.evals = window.hwMeterTable.evals || {};

(function (evals) {
  var utils = window.hwMeterTable.utils;

  /**
   * Load raw hot water meter history for a single site.
   *
   * Calls view_pubUI_Source_hwMeterTable with the site ref as `targets` and
   * mode "Detail Page". Returns a Haystack grid where:
   *   - The first column is `ts` (DateTime values)
   *   - Remaining columns are the history series for the site
   *
   * @param {string} attestKey   - Session attest key
   * @param {string} projectName - SkySpark project name
   * @param {string} siteId      - Axon-encoded site ref, e.g. "@p:proj:r:abc123"
   * @param {string} dates       - Date range expression, e.g. "pastMonth"
   * @returns {Promise<Object>}  - Resolved Haystack grid
   */
  evals.loadSiteHistory = function (attestKey, projectName, siteId, dates) {
    var axon = 'view_pubUI_Source_hwMeterTable(' + siteId + ', ' + dates + ', "Detail Page")';

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
