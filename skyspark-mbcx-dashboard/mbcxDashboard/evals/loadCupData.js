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

  // Parse a CUPSummary grid into { vals: [12 nulls/numbers], unit: string|null }.
  // Uses the first non-ts column dynamically so the column name doesn't matter.
  function _parseMonthlyGrid(grid) {
    var vals = [null, null, null, null, null, null, null, null, null, null, null, null];
    var unit = null;

    // Find the first non-ts column
    var cols = (grid && grid.cols) || [];
    var valCol = null;
    for (var ci = 0; ci < cols.length; ci++) {
      if (cols[ci].name !== 'ts') { valCol = cols[ci].name; break; }
    }
    if (!valCol) return { vals: vals, unit: unit };

    var rows = (grid && grid.rows) || [];
    rows.forEach(function (row) {
      var tsObj = row.ts;
      var tsStr = (tsObj && typeof tsObj === 'object') ? (tsObj.val || '') : String(tsObj || '');
      var m = tsStr.match(/^(\d{4})-(\d{2})/);
      if (!m) return;
      var monthIdx = parseInt(m[2], 10) - 1;
      if (monthIdx < 0 || monthIdx > 11) return;

      var v = row[valCol];
      if (v === null || v === undefined) return;
      if (typeof v === 'object' && v.val !== undefined) {
        vals[monthIdx] = v.val;
        if (!unit && v.unit) unit = v.unit;
      } else if (typeof v === 'number') {
        vals[monthIdx] = v;
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

    console.log('[mbcxDashboard] loadCupSummary — firing', calls.length, 'API calls for siteRef:', siteRef);

    return Promise.all(calls.map(function (c) {
      return API.evalAxon(attestKey, projectName, c.expr)
        .then(function (grid) {
          return { sys: c.sys, slot: c.slot, grid: grid };
        })
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

      // Summary diagnostic — shows which system/year combos have real data
      var summary = {};
      Object.keys(out).forEach(function (sys) {
        summary[sys] = {
          current: out[sys].current ? out[sys].current.filter(function(v){return v!==null;}).length + ' months' : 'null',
          prior:   out[sys].prior   ? out[sys].prior.filter(function(v){return v!==null;}).length   + ' months' : 'null',
          unit:    out[sys].unit
        };
      });
      console.log('[mbcxDashboard] CUPSummary parsed results:', JSON.stringify(summary));

      return out;
    });
  };

})(window.mbcxDashboard);
