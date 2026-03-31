// hwMeterTable/evals/loadDetailPage.js
//
// Single eval wrapper for all three site detail page modes.
// All calls share the same Axon function signature:
//
//   view_pubUI_helper_DetailPage(selectedTarget, dates, mode)
//
// Modes and what they return:
//   "Trends"           — ts + value columns, each column tagged with a unit.
//                        Columns are grouped by unit in the UI to produce
//                        one chart per unit group (kBTU/h, kBTU, °F, gpm, …)
//
//   "Building Metrics" — one row per metric; columns describe the metric name,
//                        measured value, calculated/estimated value, and unit.
//
//   "Data Management"  — ts + interleaved raw/treated columns per quantity.
//                        The UI pairs raw vs treated columns by unit to build
//                        overlay charts, and counts removed samples from the
//                        difference in non-null values between paired columns.

window.hwMeterTable = window.hwMeterTable || {};
window.hwMeterTable.evals = window.hwMeterTable.evals || {};

(function (evals) {
  var utils = window.hwMeterTable.utils;

  /**
   * Fetch data for one tab of the site detail page.
   *
   * @param {string} attestKey   - Session attest key
   * @param {string} projectName - SkySpark project name
   * @param {string} siteId      - Axon-encoded site ref, e.g. "@p:proj:r:abc"
   * @param {string} dates       - Date range expression, e.g. "pastMonth"
   * @param {string} mode        - "Trends" | "Building Metrics" | "Data Management"
   * @returns {Promise<Object>}  - Resolved, unwrapped Haystack grid
   */
  evals.loadDetailPage = function (attestKey, projectName, siteId, dates, mode) {
    var axon = 'view_pubUI_helper_DetailPage(' + siteId + ', ' + dates + ', "' + mode + '")';

    console.log('[hwMeterTable] loadDetailPage eval:', axon);

    return utils.evalAxon(axon, attestKey, projectName)
      .then(function (data) {
        var grid = utils.unwrapGrid(data);
        if (grid.meta && grid.meta.err) {
          var msg = grid.meta.dis ? String(grid.meta.dis) : 'SkySpark error grid';
          throw new Error('[loadDetailPage/' + mode + '] ' + msg);
        }
        // Detect missing/empty grid in two forms:
        //   (a) cols:[]          — unwrapGrid normalised a 0-row wrapper
        //   (b) cols:[{name:"val"}] — wrapper leaked through (0 rows, different runtime)
        var noGrid = (
          !grid.cols || grid.cols.length === 0 ||
          (grid.cols.length === 1 && grid.cols[0].name === 'val' &&
           (!grid.rows || grid.rows.length === 0))
        );
        if (noGrid) {
          throw new Error(
            '[loadDetailPage/' + mode + '] view_pubUI_helper_DetailPage returned no grid — ' +
            'verify the function exists on the server and accepts (ref, dateRange, str) parameters'
          );
        }
        console.log('[hwMeterTable] DetailPage "' + mode + '" cols:',
          (grid.cols || []).map(function (c) { return c.name; }),
          '| rows:', (grid.rows || []).length);
        return grid;
      });
  };

})(window.hwMeterTable.evals);
