// evals/loadData.js
// Data loader — calls Axon evals for live data, falls back to demo per section.
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.evals = window.netzeroDashboard.evals || {};

(function (NS) {

  var api = window.netzeroDashboard.api;
  var HP  = window.netzeroDashboard.haystackParser;
  var demo = window.netzeroDashboard.demoData;

  /**
   * Build the Axon expression for a Monthly Trends eval.
   */
  function _monthlyExpr(siteRef, dateRange, category) {
    return 'view_pubUI_Source_netZeroDashboard(' + siteRef + ', ' + dateRange + ', "view_pubUI_netZeroMonthly", "' + category + '")';
  }

  /**
   * Build an Axon date range expression from start/end date strings.
   */
  function _dateRange(ctx) {
    if (ctx.datesStart && ctx.datesEnd) return ctx.datesStart + '..' + ctx.datesEnd;
    if (ctx.datesStart) return ctx.datesStart + '..today()';
    return 'thisYear()';
  }

  /**
   * Parse a transposed Monthly Trends grid.
   *
   * Grid format (from SkySpark):
   *   cols: [dis, v0, v1, v2, ...]  where cols[n].meta.dis = "Jan-2026" etc.
   *   rows: [
   *     { dis: "Actual",     v0: {_kind:"number", val:X}, v1: ... },
   *     { dis: "Model",      v0: {_kind:"number", val:X}, v1: ... },
   *     { dis: "Difference", v0: {_kind:"number", val:X}, v1: ... }
   *   ]
   *
   * Returns { months, actual, model, diff } arrays or null on failure.
   */
  function _parseMonthlyGrid(rawGrid) {
    if (!rawGrid || !rawGrid.cols || !rawGrid.rows || rawGrid.rows.length === 0) return null;
    // Skip error grids returned by SkySpark
    if (rawGrid.meta && rawGrid.meta.err) return null;

    // Extract month labels from column meta.dis (skip first col which is "dis"/row label)
    var months = [];
    var valueCols = [];
    for (var c = 0; c < rawGrid.cols.length; c++) {
      var col = rawGrid.cols[c];
      if (col.name === 'dis') continue;
      valueCols.push(col.name);
      // Month display name from meta.dis, e.g. "Jan-2026" -> "Jan"
      var monthDis = (col.meta && col.meta.dis) ? col.meta.dis : col.name;
      // Shorten "Jan-2026" to "Jan" for chart labels
      var shortMonth = monthDis.split('-')[0];
      months.push(shortMonth);
    }

    if (months.length === 0) return null;

    // Find rows by dis label
    var actualRow = null, modelRow = null, diffRow = null;
    for (var r = 0; r < rawGrid.rows.length; r++) {
      var row = rawGrid.rows[r];
      var label = (row.dis || '').toLowerCase();
      if (label === 'actual') actualRow = row;
      else if (label === 'model') modelRow = row;
      else if (label === 'difference' || label === 'diff') diffRow = row;
    }

    if (!actualRow) return null;

    // Extract numeric values from each value column
    function extractValues(row) {
      if (!row) return null;
      var vals = [];
      for (var i = 0; i < valueCols.length; i++) {
        var cell = row[valueCols[i]];
        if (cell === null || cell === undefined) {
          vals.push(0);
        } else if (typeof cell === 'object' && cell._kind === 'number') {
          vals.push(cell.val || 0);
        } else if (typeof cell === 'number') {
          vals.push(cell);
        } else {
          vals.push(parseFloat(cell) || 0);
        }
      }
      return vals;
    }

    var actual = extractValues(actualRow);
    var model = extractValues(modelRow);
    var diff = extractValues(diffRow);

    // If no diff row, compute from actual - model
    if (!diff && model) {
      diff = [];
      for (var d = 0; d < actual.length; d++) {
        diff.push(actual[d] - (model[d] || 0));
      }
    }

    // If no model row, fill zeros
    if (!model) {
      model = actual.map(function () { return 0; });
    }
    if (!diff) {
      diff = actual.map(function () { return 0; });
    }

    return { months: months, actual: actual, model: model, diff: diff };
  }

  /**
   * Load all dashboard data for the given SkySpark project.
   */
  NS.loadData = function (attestKey, projectName, ctx) {
    var dateRange = _dateRange(ctx);
    var siteRef = ctx.siteRef;

    // Fire Monthly Trends evals in parallel
    console.log('[nzDiag] loadData — siteRef:', siteRef, 'dateRange:', dateRange);
    var buildingExpr = _monthlyExpr(siteRef, dateRange, 'Building');
    console.log('[nzDiag] building expr:', buildingExpr);

    var buildingP = api.evalAxon(attestKey, projectName, buildingExpr).catch(function (e) { console.log('[nzDiag] building eval FAILED:', e.message || e); return null; });
    var solarP    = api.evalAxon(attestKey, projectName, _monthlyExpr(siteRef, dateRange, 'Solar')).catch(function (e) { console.log('[nzDiag] solar eval FAILED:', e.message || e); return null; });
    var netZeroP  = api.evalAxon(attestKey, projectName, _monthlyExpr(siteRef, dateRange, 'Net Zero')).catch(function (e) { console.log('[nzDiag] netzero eval FAILED:', e.message || e); return null; });

    return Promise.all([buildingP, solarP, netZeroP]).then(function (results) {
      console.log('[nzDiag] building raw grid:', JSON.stringify(results[0]).substring(0, 500));
      console.log('[nzDiag] solar raw grid:', results[1] ? JSON.stringify(results[1]).substring(0, 200) : 'null');
      console.log('[nzDiag] netzero raw grid:', results[2] ? JSON.stringify(results[2]).substring(0, 200) : 'null');

      var buildingData = _parseMonthlyGrid(results[0]);
      console.log('[nzDiag] buildingData parsed:', buildingData ? { months: buildingData.months, actualLen: buildingData.actual.length, firstActual: buildingData.actual[0] } : 'null');
      var solarData    = _parseMonthlyGrid(results[1]);
      var netZeroData  = _parseMonthlyGrid(results[2]);

      // Start with demo data as the base, override sections that have live data
      var data = JSON.parse(JSON.stringify(demo));

      // Track which sections have live data (vs no data returned)
      data._live = { building: !!buildingData, solar: !!solarData, netZero: !!netZeroData };

      // Override charts + detail tables if we have live monthly data
      if (buildingData) {
        data.charts.months = buildingData.months;
        data.charts.building = { actual: buildingData.actual, model: buildingData.model };
        data.detail.months = buildingData.months;
        data.detail.buildingConsumption = { actual: buildingData.actual, model: buildingData.model, diff: buildingData.diff };
      }

      if (solarData) {
        if (!buildingData) data.charts.months = solarData.months;
        data.charts.solar = { actual: solarData.actual, model: solarData.model };
        if (!buildingData) data.detail.months = solarData.months;
        data.detail.solarGeneration = { actual: solarData.actual, model: solarData.model, diff: solarData.diff };
      }

      if (netZeroData) {
        data.detail.actualNetZero = {
          building: buildingData ? buildingData.actual : data.detail.actualNetZero.building,
          solar: solarData ? solarData.actual : data.detail.actualNetZero.solar,
          net: netZeroData.actual
        };
        data.detail.modeledNetZero = {
          building: buildingData ? buildingData.model : data.detail.modeledNetZero.building,
          solar: solarData ? solarData.model : data.detail.modeledNetZero.solar,
          net: netZeroData.model
        };
      }

      return data;
    });
  };

})(window.netzeroDashboard.evals);
