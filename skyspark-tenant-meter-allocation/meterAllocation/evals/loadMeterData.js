// evals/loadMeterData.js
// Calls report_meterValidation_meterData(site, dates, utility) and maps the grid
// to the internal row format used by App.js.
window.meterAllocation = window.meterAllocation || {};

(function (NS) {
  NS.evals = NS.evals || {};

  var api = NS.api;
  var HP  = NS.haystackParser;

  // Map a raw Haystack grid to the internal row array.
  function _parseGrid(grid) {
    if (!grid || !grid.rows) return [];
    if (grid.meta && grid.meta.err) {
      var msg = grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid';
      throw new Error(msg);
    }

    return (grid.rows || []).map(function (row) {
      var id     = HP.ref(row.id)     || { id: '', dis: '' };
      var meter  = HP.ref(row.meter)  || { id: '', dis: '' };
      var usage  = HP.num(row.usage);
      var perc   = HP.num(row.percOfPlant);
      var cost   = HP.num(row.cost);

      return {
        groupId:     id.id,
        groupName:   id.dis,
        meterId:     meter.id,
        meterName:   meter.dis,
        usage:       usage.val,
        usageUnit:   usage.unit || 'BTU',
        percOfPlant: perc.val,
        cost:        cost.val
      };
    });
  }

  /**
   * Load meter allocation data for one utility.
   * @param {string} attestKey    - SkySpark session attest key
   * @param {string} projectName  - SkySpark project name
   * @param {string} siteRef      - Axon ref expression, e.g. "@p:proj:r:..."
   * @param {string} dates        - Axon date range expression, e.g. "2025-01-01..2025-01-31"
   * @param {string} utility      - "Cooling" | "Heating" | "Flow"
   * @returns {Promise<Array>}
   */
  NS.evals.loadMeterData = function (attestKey, projectName, siteRef, dates, utility) {
    var axon = 'report_meterValidation_meterData(' + siteRef + ', ' + dates + ', "' + utility + '")';
    console.log('[meterAllocation] Eval:', axon);

    return api.evalAxon(axon, attestKey, projectName)
      .then(function (data) {
        var grid = api.unwrapGrid(data);
        return _parseGrid(grid);
      });
  };

  /**
   * Load all three utilities in parallel.
   * Returns Promise<{ Cooling: [], Heating: [], Flow: [], _errors: { ... } }>
   * Each utility that fails resolves to [] and records the error message so the
   * UI can surface it rather than silently showing an empty table.
   */
  NS.evals.loadAllUtilities = function (attestKey, projectName, siteRef, dates) {
    var UTILS = ['Cooling', 'Heating', 'Flow'];

    var errors = {};
    var promises = UTILS.map(function (u) {
      return NS.evals.loadMeterData(attestKey, projectName, siteRef, dates, u)
        .catch(function (err) {
          var msg = err.message || String(err);
          console.warn('[meterAllocation] ' + u + ' load failed:', msg);
          errors[u] = msg;
          return [];
        });
    });

    return Promise.all(promises).then(function (results) {
      var out = { _errors: errors };
      UTILS.forEach(function (u, i) { out[u] = results[i]; });
      return out;
    });
  };

  // ── Summary data (report_meterValidation_totalsTable) ──────────────────────

  // Parse a group-level totals grid (no meter column).
  function _parseSummaryGrid(grid) {
    if (!grid || !grid.rows) return [];
    if (grid.meta && grid.meta.err) {
      var msg = grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid';
      throw new Error(msg);
    }
    return (grid.rows || []).map(function (row) {
      var id   = HP.ref(row.id)   || { id: '', dis: '' };
      var usage = HP.num(row.usage);
      var perc  = HP.num(row.percOfPlant);
      var cost  = HP.num(row.cost);
      return {
        groupId:     id.id,
        groupName:   id.dis,
        usage:       usage.val,
        usageUnit:   usage.unit || 'BTU',
        percOfPlant: perc.val,
        cost:        cost.val
      };
    });
  }

  /**
   * Load summary totals for one utility.
   * Calls report_meterValidation_totalsTable(site, dates, false, utility)
   */
  NS.evals.loadSummaryData = function (attestKey, projectName, siteRef, dates, utility) {
    var axon = 'report_meterValidation_totalsTable(' + siteRef + ', ' + dates + ', false, "' + utility + '")';
    console.log('[meterAllocation] Eval:', axon);
    return api.evalAxon(axon, attestKey, projectName)
      .then(function (data) {
        var grid = api.unwrapGrid(data);
        return _parseSummaryGrid(grid);
      });
  };

  /**
   * Load summary totals for all three utilities in parallel.
   * Returns Promise<{ Cooling: [], Heating: [], Flow: [], _errors: { ... } }>
   */
  NS.evals.loadAllSummaryUtilities = function (attestKey, projectName, siteRef, dates) {
    var UTILS = ['Cooling', 'Heating', 'Flow'];
    var errors = {};
    var promises = UTILS.map(function (u) {
      return NS.evals.loadSummaryData(attestKey, projectName, siteRef, dates, u)
        .catch(function (err) {
          var msg = err.message || String(err);
          console.warn('[meterAllocation] summary ' + u + ' load failed:', msg);
          errors[u] = msg;
          return [];
        });
    });
    return Promise.all(promises).then(function (results) {
      var out = { _errors: errors };
      UTILS.forEach(function (u, i) { out[u] = results[i]; });
      return out;
    });
  };

})(window.meterAllocation);
