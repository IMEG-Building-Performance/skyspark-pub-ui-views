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
   * Pattern: view_pubUI_Source_netZeroDashboard(siteRef, dateRange, view_pubUI_netZeroMonthly, "category")
   */
  function _monthlyExpr(siteRef, dateRange, category) {
    return 'view_pubUI_Source_netZeroDashboard(' + siteRef + ', ' + dateRange + ', view_pubUI_netZeroMonthly, "' + category + '")';
  }

  /**
   * Build an Axon date range expression from start/end date strings.
   * If both are present: start..end
   * If only start: start..today()
   * Fallback: thisYear()
   */
  function _dateRange(ctx) {
    if (ctx.datesStart && ctx.datesEnd) return ctx.datesStart + '..' + ctx.datesEnd;
    if (ctx.datesStart) return ctx.datesStart + '..today()';
    return 'thisYear()';
  }

  /**
   * Parse a Monthly Trends grid into chart + detail arrays.
   * Expected grid columns: month (or similar), actual, model
   * Returns { months, actual, model } arrays or null on failure.
   */
  function _parseMonthlyGrid(grid) {
    if (!grid || !grid.cols || !grid.rows || grid.rows.length === 0) return null;
    var parsed = HP.parseGrid(grid);
    if (!parsed.rows.length) return null;

    var cols = parsed.cols;
    var rows = parsed.rows;

    // Try to identify columns — look for month, actual, model columns
    var monthCol = null, actualCol = null, modelCol = null;
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i].toLowerCase();
      if (c === 'month' || c === 'ts' || c === 'date' || c === 'dis') monthCol = cols[i];
      else if (c === 'actual' || c === 'val' || c === 'actualval') actualCol = cols[i];
      else if (c === 'model' || c === 'modelval' || c === 'modeled') modelCol = cols[i];
    }

    // If we can't identify columns, try positional: first=label, second=actual, third=model
    if (!monthCol && cols.length >= 1) monthCol = cols[0];
    if (!actualCol && cols.length >= 2) actualCol = cols[1];
    if (!modelCol && cols.length >= 3) modelCol = cols[2];

    if (!monthCol || !actualCol) return null;

    var months = [];
    var actual = [];
    var model = [];
    var diff = [];

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var m = row[monthCol];
      var a = typeof row[actualCol] === 'number' ? row[actualCol] : parseFloat(row[actualCol]) || 0;
      var mod = modelCol && row[modelCol] != null ? (typeof row[modelCol] === 'number' ? row[modelCol] : parseFloat(row[modelCol]) || 0) : 0;

      months.push(m != null ? String(m) : '');
      actual.push(a);
      model.push(mod);
      diff.push(a - mod);
    }

    return { months: months, actual: actual, model: model, diff: diff };
  }

  /**
   * Load all dashboard data for the given SkySpark project.
   *
   * @param {string} attestKey   - SkySpark session attest key
   * @param {string} projectName - SkySpark project name
   * @param {object} ctx         - Context with siteRef, datesStart, datesEnd
   * @returns {Promise<object>}  - Resolves with a data object matching the demoData contract
   */
  NS.loadData = function (attestKey, projectName, ctx) {
    var dateRange = _dateRange(ctx);
    var siteRef = ctx.siteRef;

    // Fire Monthly Trends evals in parallel
    var buildingP = api.evalAxon(attestKey, projectName, _monthlyExpr(siteRef, dateRange, 'Building')).catch(function () { return null; });
    var solarP    = api.evalAxon(attestKey, projectName, _monthlyExpr(siteRef, dateRange, 'Solar')).catch(function () { return null; });
    var netZeroP  = api.evalAxon(attestKey, projectName, _monthlyExpr(siteRef, dateRange, 'Net Zero')).catch(function () { return null; });

    return Promise.all([buildingP, solarP, netZeroP]).then(function (results) {
      var buildingGrid = _parseMonthlyGrid(results[0]);
      var solarGrid    = _parseMonthlyGrid(results[1]);
      var netZeroGrid  = _parseMonthlyGrid(results[2]);

      // Start with demo data as the base, override sections that have live data
      var data = JSON.parse(JSON.stringify(demo));

      // Override charts if we have live monthly data
      if (buildingGrid) {
        data.charts.months = buildingGrid.months;
        data.charts.building = { actual: buildingGrid.actual, model: buildingGrid.model };
        data.detail.months = buildingGrid.months;
        data.detail.buildingConsumption = { actual: buildingGrid.actual, model: buildingGrid.model, diff: buildingGrid.diff };
      }

      if (solarGrid) {
        if (!buildingGrid) data.charts.months = solarGrid.months;
        data.charts.solar = { actual: solarGrid.actual, model: solarGrid.model };
        if (!buildingGrid) data.detail.months = solarGrid.months;
        data.detail.solarGeneration = { actual: solarGrid.actual, model: solarGrid.model, diff: solarGrid.diff };
      }

      if (netZeroGrid) {
        // Net zero grid may have actual net and modeled net
        data.detail.actualNetZero = {
          building: buildingGrid ? buildingGrid.actual : data.detail.actualNetZero.building,
          solar: solarGrid ? solarGrid.actual : data.detail.actualNetZero.solar,
          net: netZeroGrid.actual
        };
        data.detail.modeledNetZero = {
          building: buildingGrid ? buildingGrid.model : data.detail.modeledNetZero.building,
          solar: solarGrid ? solarGrid.model : data.detail.modeledNetZero.solar,
          net: netZeroGrid.model
        };
      }

      return data;
    });
  };

})(window.netzeroDashboard.evals);
