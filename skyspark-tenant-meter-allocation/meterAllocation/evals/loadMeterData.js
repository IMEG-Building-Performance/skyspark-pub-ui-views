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
      // Diagnostic: log first row of each utility to verify correct data is loaded
      UTILS.forEach(function (u) {
        var rows = out[u] || [];
        console.log('[meterAllocation] tenantTotals.' + u + ' (' + rows.length + ' rows):', rows.length ? JSON.stringify(rows[0]) : '(empty)');
      });
      return out;
    });
  };

  // ── Summary data (report_meterValidation_totalsTable) ──────────────────────

  // Parse a plant-level totals grid (one row, columns: site, utility,
  // plantTotalBillUsage, plantTotalCost, plantTotalBTUUsage).
  // Returns a plain object, or null if the grid is empty.
  function _parseSummaryGrid(grid) {
    if (!grid || !grid.rows) return null;
    if (grid.meta && grid.meta.err) {
      var msg = grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid';
      throw new Error(msg);
    }
    if (!grid.rows.length) return null;
    var row  = grid.rows[0];
    var bill = HP.num(row.plantTotalBillUsage);
    var btu  = HP.num(row.plantTotalBTUUsage);
    var cost = HP.num(row.plantTotalCost);
    return {
      billUsage: bill.val,
      billUnit:  bill.unit || 'therm',
      btuUsage:  btu.val,
      btuUnit:   btu.unit || 'BTU',
      cost:      cost.val
    };
  }

  /**
   * Load summary totals for one utility.
   * Calls report_meterValidation_totalsTable(site, dates, false, utility)
   */
  NS.evals.loadSummaryData = function (attestKey, projectName, siteRef, dates, utility) {
    var axon = 'report_meterValidation_plantTotalsTable(' + siteRef + ', ' + dates + ', false, "' + utility + '")';
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
          return null;
        });
    });
    return Promise.all(promises).then(function (results) {
      var out = { _errors: errors };
      UTILS.forEach(function (u, i) { out[u] = results[i]; }); // null when unavailable
      return out;
    });
  };

  // ── Tenant totals (report_meterValidation_tenantTotalsTable) ──────────────

  // Parse tenant totals grid: rows have { tenant (string), totalTenanteUsage (number) }.
  // Returns array of { tenantName, usage, usageUnit }.
  function _parseTenantGrid(grid) {
    if (!grid || !grid.rows) return [];
    if (grid.meta && grid.meta.err) {
      var msg = grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid';
      throw new Error(msg);
    }
    return (grid.rows || []).map(function (row) {
      var usage = HP.num(row.totalTenanteUsage); // note: column has typo 'e' in source
      return {
        tenantName: typeof row.tenant === 'string' ? row.tenant : String(row.tenant || ''),
        usage:      usage.val,
        usageUnit:  usage.unit || 'BTU'
      };
    });
  }

  /**
   * Load tenant totals for one utility.
   * Calls report_meterValidation_tenantTotalsTable(site, dates, utility)
   */
  NS.evals.loadTenantTotals = function (attestKey, projectName, siteRef, dates, utility) {
    var axon = 'report_meterValidation_tenantTotalsTable(' + siteRef + ', ' + dates + ', "' + utility + '")';
    console.log('[meterAllocation] Eval:', axon);
    return api.evalAxon(axon, attestKey, projectName)
      .then(function (data) {
        var grid = api.unwrapGrid(data);
        return _parseTenantGrid(grid);
      });
  };

  /**
   * Load tenant totals for all three utilities in parallel.
   * Returns Promise<{ Cooling: [], Heating: [], Flow: [], _errors: { ... } }>
   */
  NS.evals.loadAllTenantTotals = function (attestKey, projectName, siteRef, dates) {
    var UTILS = ['Cooling', 'Heating', 'Flow'];
    var errors = {};
    var promises = UTILS.map(function (u) {
      return NS.evals.loadTenantTotals(attestKey, projectName, siteRef, dates, u)
        .catch(function (err) {
          var msg = err.message || String(err);
          console.warn('[meterAllocation] tenantTotals ' + u + ' load failed:', msg);
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
