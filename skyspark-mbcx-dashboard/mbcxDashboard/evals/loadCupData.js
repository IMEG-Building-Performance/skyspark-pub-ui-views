// evals/loadCupData.js
// Fetch monthly CUP energy data via view_pub_mbcxDashboard_CUPSummary.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.evals = window.mbcxDashboard.evals || {};

(function (NS) {

  var _SYSTEM_ARGS = {
    cooling:   'Cooling',
    heating:   'Heating',
    condenser: 'Condenser',
    dhw:       'DHW'
  };

  // Parse a CUPSummary grid into { vals: [12 nulls/numbers], unit: string|null }
  // Grid rows have: ts (Haystack dateTime) and v0 (Haystack number with unit)
  function _parseMonthlyGrid(grid) {
    var vals = [null, null, null, null, null, null, null, null, null, null, null, null];
    var unit = null;
    var rows = (grid && grid.rows) || [];
    rows.forEach(function (row) {
      // Extract month index from ts — supports both raw {_kind:"dateTime",val:"..."} and plain string
      var tsObj = row.ts;
      var tsStr = (tsObj && typeof tsObj === 'object') ? (tsObj.val || '') : String(tsObj || '');
      var m = tsStr.match(/^(\d{4})-(\d{2})/);
      if (!m) return;
      var monthIdx = parseInt(m[2], 10) - 1; // 0-based Jan=0
      if (monthIdx < 0 || monthIdx > 11) return;

      var v0 = row.v0;
      if (v0 === null || v0 === undefined) return;
      if (typeof v0 === 'object' && v0.val !== undefined) {
        vals[monthIdx] = v0.val;
        if (!unit && v0.unit) unit = v0.unit;
      } else if (typeof v0 === 'number') {
        vals[monthIdx] = v0;
      }
    });
    return { vals: vals, unit: unit };
  }

  /**
   * Load monthly CUP energy data for all 4 systems × 2 years.
   *
   * Returns Promise<{
   *   cooling:   { current: [12], prior: [12], unit: string },
   *   heating:   { ... },
   *   condenser: { ... },
   *   dhw:       { ... }
   * }>
   *
   * Any individual call failure silently returns nulls for that system/year.
   */
  NS.evals.loadCupSummary = function (attestKey, projectName, siteRef) {
    var API = NS.api;
    var thisYear = new Date().getFullYear();
    var lastYear = thisYear - 1;
    var systems  = Object.keys(_SYSTEM_ARGS);

    var calls = [];
    systems.forEach(function (sys) {
      var arg = _SYSTEM_ARGS[sys];
      calls.push({
        sys:  sys,
        slot: 'current',
        expr: 'view_pub_mbcxDashboard_CUPSummary(' + siteRef + ',' + thisYear + ',"' + arg + '")'
      });
      calls.push({
        sys:  sys,
        slot: 'prior',
        expr: 'view_pub_mbcxDashboard_CUPSummary(' + siteRef + ',' + lastYear + ',"' + arg + '")'
      });
    });

    return Promise.all(calls.map(function (c) {
      return API.evalAxon(attestKey, projectName, c.expr)
        .then(function (grid) { return { sys: c.sys, slot: c.slot, grid: grid }; })
        .catch(function (err) {
          console.warn('[mbcxDashboard] CUPSummary failed (' + c.sys + '/' + c.slot + '):', err);
          return { sys: c.sys, slot: c.slot, grid: { rows: [] } };
        });
    })).then(function (results) {
      var out = {};
      results.forEach(function (r) {
        if (!out[r.sys]) out[r.sys] = { current: null, prior: null, unit: null };
        var parsed = _parseMonthlyGrid(r.grid);
        out[r.sys][r.slot] = parsed.vals;
        if (parsed.unit && !out[r.sys].unit) out[r.sys].unit = parsed.unit;
      });
      return out;
    });
  };

})(window.mbcxDashboard);
