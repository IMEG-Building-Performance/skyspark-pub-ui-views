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

  // Parse a multi-year CUPSummary grid into { current:[12], prior:[12], unit }.
  // The grid has one row per calendar month spanning two years.
  // Rows are split into current/prior by comparing the ts year to currentYear.
  // Uses the first non-ts column for values so column name doesn't matter.
  function _parseMultiYearGrid(grid, currentYear, priorYear) {
    var current = [null,null,null,null,null,null,null,null,null,null,null,null];
    var prior   = [null,null,null,null,null,null,null,null,null,null,null,null];
    var unit    = null;

    var cols = (grid && grid.cols) || [];
    var valCol = null;
    for (var ci = 0; ci < cols.length; ci++) {
      if (cols[ci].name !== 'ts') { valCol = cols[ci].name; break; }
    }
    if (!valCol) return { current: current, prior: prior, unit: unit };

    var rows = (grid && grid.rows) || [];
    rows.forEach(function (row) {
      var tsObj = row.ts;
      var tsStr = (tsObj && typeof tsObj === 'object') ? (tsObj.val || '') : String(tsObj || '');
      var m = tsStr.match(/^(\d{4})-(\d{2})/);
      if (!m) return;

      var year     = parseInt(m[1], 10);
      var monthIdx = parseInt(m[2], 10) - 1;
      if (monthIdx < 0 || monthIdx > 11) return;

      var v = row[valCol];
      if (v === null || v === undefined) return;

      var numVal = null, valUnit = null;
      if (typeof v === 'object' && v.val !== undefined) {
        numVal  = v.val;
        valUnit = v.unit;
      } else if (typeof v === 'number') {
        numVal = v;
      }
      if (numVal === null) return;
      if (!unit && valUnit) unit = valUnit;

      if (year === currentYear)  current[monthIdx] = numVal;
      else if (year === priorYear) prior[monthIdx] = numVal;
    });

    return { current: current, prior: prior, unit: unit };
  }

  /**
   * Load monthly CUP energy data for all 4 systems.
   * Each call returns a single grid spanning priorYear + currentYear.
   *
   * Returns Promise<{
   *   cooling:   { current: [12], prior: [12], unit: string },
   *   heating:   { ... },
   *   condenser: { ... },
   *   dhw:       { ... }
   * }>
   */
  NS.evals.loadCupSummary = function (attestKey, projectName, siteRef) {
    var API       = NS.api;
    var thisYear  = new Date().getFullYear();
    var lastYear  = thisYear - 1;
    var systems   = Object.keys(_SYSTEM_ARGS);

    // One call per system; pass lastYear so the function returns both years.
    var calls = systems.map(function (sys) {
      var arg = _SYSTEM_ARGS[sys];
      return {
        sys:  sys,
        expr: 'view_pub_mbcxDashboard_CUPSummary(' + siteRef + ',' + lastYear + ',"' + arg + '")'
      };
    });

    return Promise.all(calls.map(function (c) {
      return API.evalAxon(attestKey, projectName, c.expr)
        .then(function (grid) {
          return { sys: c.sys, grid: grid };
        })
        .catch(function (err) {
          console.warn('[mbcxDashboard] CUPSummary failed (' + c.sys + '):', err);
          return { sys: c.sys, grid: { rows: [], cols: [] } };
        });
    })).then(function (results) {
      var out = {};
      results.forEach(function (r) {
        out[r.sys] = _parseMultiYearGrid(r.grid, thisYear, lastYear);
      });

      // Summary diagnostic
      var summary = {};
      Object.keys(out).forEach(function (sys) {
        summary[sys] = {
          current: out[sys].current.filter(function(v){return v!==null;}).length + ' months',
          prior:   out[sys].prior.filter(function(v){return v!==null;}).length   + ' months',
          unit:    out[sys].unit
        };
      });
      return out;
    });
  };

})(window.mbcxDashboard);
