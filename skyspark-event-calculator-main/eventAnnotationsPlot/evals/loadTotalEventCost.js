/**
 * loadTotalEventCost.js
 *
 * Loads the total event cost using view_eventTracking_execSummary (mode 2).
 * Returns a single dollar amount as a number.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.api = window.EventAnnotationsPlot.api || {};

window.EventAnnotationsPlot.api.loadTotalEventCost = function(siteRef, startDate, endDate) {
  var evalAxon          = window.EventAnnotationsPlot.evalAxon;
  var parseCurrencyValue = window.EventAnnotationsPlot.parseCurrencyValue;
  var axonExpr = 'view_eventTracking_execSummary(@' + siteRef + ', ' + startDate + '..' + endDate + ', 2)';

  return evalAxon(axonExpr).then(function(data) {
    console.log('Total Event Cost (mode 2) raw response:', JSON.stringify(data));
    if (data.rows && data.rows.length > 0) {
      var row = data.rows[0];
      var val = row.val !== undefined ? row.val : row[data.cols[0].name];
      return parseCurrencyValue(val);
    }
    return 0;
  }).catch(function(err) {
    console.error('loadTotalEventCost error:', err);
    return 0;
  });
};
