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
   * Build the Axon expression for the KPI eval.
   */
  function _kpiExpr(siteRef, dateRange) {
    return 'view_pubUI_Source_netZeroDashboard(' + siteRef + ', ' + dateRange + ', "view_pubUI_netZeroKpis")';
  }

  /**
   * Parse the KPI grid: single row with buildingUsage and solarGeneration columns.
   */
  function _parseKpiGrid(rawGrid) {
    if (!rawGrid || !rawGrid.rows || rawGrid.rows.length === 0) return null;
    if (rawGrid.meta && rawGrid.meta.err) return null;
    var row = rawGrid.rows[0];
    if (!row) return null;

    function numVal(cell) {
      if (cell === null || cell === undefined) return null;
      if (typeof cell === 'object' && cell._kind === 'number') return cell.val || 0;
      if (typeof cell === 'number') return cell;
      return parseFloat(cell) || null;
    }

    var building = numVal(row.buildingUsage);
    var solar = numVal(row.solarGeneration);
    if (building === null && solar === null) return null;
    return { buildingUsage: building, solarGeneration: solar };
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
      if (label === 'actual' || label === 'nzactual') actualRow = row;
      else if (label === 'model' || label === 'nzmodel') modelRow = row;
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

    // Pad to 12 months so the view always shows a full year
    var ALL_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var padded = _padTo12(ALL_MONTHS, months, { actual: actual, model: model, diff: diff });

    return padded;
  }

  /**
   * Pad parsed monthly data to a full 12-month array.
   * Maps existing data into the correct month slots; fills gaps with null.
   */
  function _padTo12(allMonths, dataMonths, series) {
    // Build a lookup: short month name -> index in dataMonths
    var lookup = {};
    for (var i = 0; i < dataMonths.length; i++) {
      lookup[dataMonths[i]] = i;
    }

    var result = { months: allMonths, actual: [], model: [], diff: [] };
    for (var m = 0; m < allMonths.length; m++) {
      var idx = lookup[allMonths[m]];
      if (idx !== undefined) {
        result.actual.push(series.actual[idx]);
        result.model.push(series.model[idx]);
        result.diff.push(series.diff[idx]);
      } else {
        result.actual.push(null);
        result.model.push(null);
        result.diff.push(null);
      }
    }
    return result;
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
    var kpiP      = api.evalAxon(attestKey, projectName, _kpiExpr(siteRef, dateRange)).catch(function (e) { console.log('[nzDiag] kpi eval FAILED:', e.message || e); return null; });

    return Promise.all([buildingP, solarP, netZeroP, kpiP]).then(function (results) {
      console.log('[nzDiag] building raw grid:', JSON.stringify(results[0]).substring(0, 500));
      console.log('[nzDiag] solar raw grid:', results[1] ? JSON.stringify(results[1]).substring(0, 200) : 'null');
      console.log('[nzDiag] netzero raw grid:', results[2] ? JSON.stringify(results[2]).substring(0, 200) : 'null');
      console.log('[nzDiag] kpi raw grid:', results[3] ? JSON.stringify(results[3]).substring(0, 300) : 'null');

      var buildingData = _parseMonthlyGrid(results[0]);
      console.log('[nzDiag] buildingData parsed:', buildingData ? { months: buildingData.months, actualLen: buildingData.actual.length, firstActual: buildingData.actual[0] } : 'null');
      var solarData    = _parseMonthlyGrid(results[1]);
      var netZeroData  = _parseMonthlyGrid(results[2]);
      var kpiData      = _parseKpiGrid(results[3]);

      // Start with demo data as the base, override sections that have live data
      var data = JSON.parse(JSON.stringify(demo));

      // Track which sections have live data (vs no data returned)
      data._live = { building: !!buildingData, solar: !!solarData, netZero: !!netZeroData, kpi: !!kpiData };

      // Clear KPI demo data — show blanks for anything not provided by live eval
      data.kpis.buildingUsage = null;
      data.kpis.solarGeneration = null;
      data.kpis.netPerformance = null;
      data.kpis.coverageRatio = null;
      data.kpis.surplusNote = '';
      data.kpis.sourceMix = { water: null, wind: null, fossil: null };
      data.equiv = { trees: { total: null, unit: '', monthly: null }, water: { total: null, unit: '', monthly: null }, gas: { total: null, unit: '', monthly: null }, methane: { total: null, unit: '', monthly: null } };

      // Fill in KPIs from live data
      if (kpiData) {
        var bldg = kpiData.buildingUsage || 0;
        var sol  = kpiData.solarGeneration || 0;
        var net  = bldg - sol;
        var coverage = bldg > 0 ? Math.round((sol / bldg) * 100) : 0;
        data.kpis.buildingUsage = Math.round(bldg);
        data.kpis.solarGeneration = Math.round(sol);
        data.kpis.netPerformance = Math.round(net);
        data.kpis.coverageRatio = coverage;
        data.kpis.surplusNote = net <= 0 ? 'Net zero achieved!' : '';
      }

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
        // Store net zero values for chart (actual=nzActual, model=nzModel)
        data.charts.netZero = { actual: netZeroData.actual, model: netZeroData.model };
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
