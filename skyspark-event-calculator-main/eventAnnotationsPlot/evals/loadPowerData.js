/**
 * loadPowerData.js
 *
 * Loads time-series power data for chart rendering using view_demandByMeter_plot.
 * Returns an array of {x: Date, y: number} points.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.api = window.EventAnnotationsPlot.api || {};

window.EventAnnotationsPlot.api.loadPowerData = function(siteRef, startDate, endDate, utilityType) {
  var evalAxon    = window.EventAnnotationsPlot.evalAxon;
  var extractValue = window.EventAnnotationsPlot.extractValue;
  utilityType = utilityType || 'Electric';

  var axonExpr;
  if (utilityType === 'Water') {
    axonExpr = 'view_performanceImprovement_waterDashboard(@' + siteRef + ', ' + startDate + '..' + endDate + ', 4, "Combined Water").table';
  } else {
    axonExpr = 'view_demandByMeter_plot(@' + siteRef + ', ' + startDate + '..' + endDate + ', "Combined Power", "' + utilityType + '")';
  }

  return evalAxon(axonExpr).then(function(data) {
    if (!data.rows || data.rows.length === 0) return [];

    var valueColName = data.cols && data.cols.length >= 2 ? data.cols[1].name : null;

    return data.rows.map(function(row) {
      var ts  = extractValue(row.Timestamp || row.ts);
      var val = valueColName ? extractValue(row[valueColName]) : null;

      if (val === null) {
        for (var key in row) {
          if (key !== 'Timestamp' && key !== 'ts') {
            val = extractValue(row[key]);
            break;
          }
        }
      }

      return { x: new Date(ts), y: parseFloat(val) };
    }).filter(function(pt) {
      return !isNaN(pt.y);
    });
  });
};
