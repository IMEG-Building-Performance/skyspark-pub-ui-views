// evals/loadData.js
// Data loader — calls Axon evals for live data, falls back to demo per section.
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.evals = window.netzeroDashboard.evals || {};

(function (NS) {

  var api = window.netzeroDashboard.api;
  var HP  = window.netzeroDashboard.haystackParser;
  var demo = window.netzeroDashboard.demoData;

  // Map full or abbreviated month names to 3-letter short form
  var MONTH_MAP = {
    'january': 'Jan', 'february': 'Feb', 'march': 'Mar', 'april': 'Apr',
    'may': 'May', 'june': 'Jun', 'july': 'Jul', 'august': 'Aug',
    'september': 'Sep', 'october': 'Oct', 'november': 'Nov', 'december': 'Dec',
    'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr',
    'jun': 'Jun', 'jul': 'Jul', 'aug': 'Aug', 'sep': 'Sep',
    'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec'
  };
  function _shortMonth(dis) {
    var raw = dis.split('-')[0].toLowerCase();
    return MONTH_MAP[raw] || dis.split('-')[0];
  }

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
   * Parse a Meter Breakdown grid.
   * Same transposed format — each row is a meter/category, columns are months.
   * Returns { months, rows: [{ name, values }] } or null.
   */
  function _parseMeterGrid(rawGrid) {
    if (!rawGrid || !rawGrid.cols || !rawGrid.rows || rawGrid.rows.length === 0) return null;
    if (rawGrid.meta && rawGrid.meta.err) return null;

    var months = [];
    var valueCols = [];
    for (var c = 0; c < rawGrid.cols.length; c++) {
      var col = rawGrid.cols[c];
      if (col.name === 'dis') continue;
      valueCols.push(col.name);
      var monthDis = (col.meta && col.meta.dis) ? col.meta.dis : col.name;
      months.push(_shortMonth(monthDis));
    }
    if (months.length === 0) return null;
    console.log('[nzDiag] _parseMeterGrid — months:', JSON.stringify(months), 'valueCols:', JSON.stringify(valueCols));
    // Log raw values before padding
    var rawFirst = rawGrid.rows[0];
    console.log('[nzDiag] _parseMeterGrid — raw row0 v0:', JSON.stringify(rawFirst.v0), 'v1:', JSON.stringify(rawFirst.v1));

    function extractValues(row) {
      var vals = [];
      for (var i = 0; i < valueCols.length; i++) {
        var cell = row[valueCols[i]];
        if (cell === null || cell === undefined) vals.push(null);
        else if (typeof cell === 'object' && cell._kind === 'number') vals.push(cell.val || 0);
        else if (typeof cell === 'number') vals.push(cell);
        else vals.push(parseFloat(cell) || null);
      }
      return vals;
    }

    var rows = [];
    for (var r = 0; r < rawGrid.rows.length; r++) {
      var row = rawGrid.rows[r];
      rows.push({ name: row.dis || ('Row ' + r), values: extractValues(row) });
    }
    console.log('[nzDiag] _parseMeterGrid — row0 extracted:', JSON.stringify(rows[0]));

    // Pad to 12 months
    var ALL_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var lookup = {};
    for (var m = 0; m < months.length; m++) lookup[months[m]] = m;
    console.log('[nzDiag] _parseMeterGrid — lookup:', JSON.stringify(lookup));

    var paddedRows = rows.map(function (row) {
      var padded = [];
      for (var j = 0; j < ALL_MONTHS.length; j++) {
        var idx = lookup[ALL_MONTHS[j]];
        padded.push(idx !== undefined ? row.values[idx] : null);
      }
      return { name: row.name, values: padded };
    });

    return { months: ALL_MONTHS, rows: paddedRows };
  }

  /**
   * Calculate carbon equivalencies from solar generation kWh.
   * Based on EPA Greenhouse Gas Equivalencies Calculator:
   *   https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator
   *
   * Factors:
   *   - CO2 avoided:      0.000709 metric tons per kWh (eGRID national avg)
   *   - Trees equivalent:  0.06 MT CO2 sequestered per tree per year (10-yr seedling)
   *   - Gasoline gallons:  0.008887 MT CO2 per gallon combusted
   *   - Homes powered:     10,500 kWh per US household per year (EIA)
   *   - Miles driven:      0.0004035 MT CO2 per mile (avg passenger vehicle)
   */
  function _calcEquivalencies(solarKWh) {
    if (!solarKWh || solarKWh <= 0) return null;
    var co2MT = solarKWh * 0.000709;
    return {
      co2AvoidedMT:    co2MT,
      trees:           co2MT / 0.06,
      gasolineGallons: co2MT / 0.008887,
      homesPowered:    solarKWh / 10500,
      milesDriven:     co2MT / 0.0004035
    };
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
      months.push(_shortMonth(monthDis));
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
    var meterP    = api.evalAxon(attestKey, projectName, _monthlyExpr(siteRef, dateRange, 'Meter Breakdown')).catch(function (e) { console.log('[nzDiag] meter eval FAILED:', e.message || e); return null; });

    return Promise.all([buildingP, solarP, netZeroP, kpiP, meterP]).then(function (results) {
      console.log('[nzDiag] building raw grid:', JSON.stringify(results[0]).substring(0, 500));
      console.log('[nzDiag] solar raw grid:', results[1] ? JSON.stringify(results[1]).substring(0, 200) : 'null');
      console.log('[nzDiag] netzero raw grid:', results[2] ? JSON.stringify(results[2]).substring(0, 200) : 'null');
      console.log('[nzDiag] kpi raw grid:', results[3] ? JSON.stringify(results[3]).substring(0, 300) : 'null');

      var buildingData = _parseMonthlyGrid(results[0]);
      console.log('[nzDiag] buildingData parsed:', buildingData ? { months: buildingData.months, actualLen: buildingData.actual.length, firstActual: buildingData.actual[0] } : 'null');
      var solarData    = _parseMonthlyGrid(results[1]);
      var netZeroData  = _parseMonthlyGrid(results[2]);
      var meterData    = _parseMeterGrid(results[4]);
      console.log('[nzDiag] meter raw grid:', results[4] ? JSON.stringify(results[4]).substring(0, 500) : 'null');
      console.log('[nzDiag] meterData parsed:', meterData ? { rowCount: meterData.rows.length, names: meterData.rows.map(function(r){return r.name}), firstRowValues: meterData.rows[0] ? meterData.rows[0].values.slice(0,4) : 'none' } : 'null');
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
      data.equiv = { co2AvoidedMT: null, trees: null, gasolineGallons: null, homesPowered: null, milesDriven: null };

      // Clear meter breakdown demo data — load nulls until live eval returns data
      data.meterBreakdown = {
        months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        rows: []
      };

      // Fill in KPIs from live data
      if (kpiData) {
        var bldg = kpiData.buildingUsage || 0;
        var sol  = kpiData.solarGeneration || 0;
        var net  = sol - bldg;
        var coverage = bldg > 0 ? Math.round((sol / bldg) * 100) : 0;
        data.kpis.buildingUsage = Math.round(bldg);
        data.kpis.solarGeneration = Math.round(sol);
        data.kpis.netPerformance = Math.round(net);
        data.kpis.coverageRatio = coverage;
        data.kpis.surplusNote = net <= 0 ? 'Net zero achieved!' : '';

        // Calculate carbon equivalencies from solar generation
        var equiv = _calcEquivalencies(sol);
        if (equiv) data.equiv = equiv;
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

      // Override meter breakdown if we have live data
      if (meterData && meterData.rows.length > 0) {
        console.log('[nzDiag] meter override — first row:', meterData.rows[0].name, 'vals:', JSON.stringify(meterData.rows[0].values));
        data.meterBreakdown = {
          months: meterData.months,
          rows: meterData.rows
        };
      } else {
        console.log('[nzDiag] meter override SKIPPED — meterData:', meterData);
      }

      return data;
    });
  };

})(window.netzeroDashboard.evals);
