/**
 * loadExecSummary.js
 *
 * Loads the executive summary table using view_eventTracking_execSummary (mode 1).
 * Returns: { events: [...], totals: {...} }
 *
 * Columns: event, eventID, eventSF, eventStartDate, eventEndDate, totalCost,
 *          elec_energyCost, elec_demandCost,
 *          chw_energyCost,  chw_demandCost,
 *          steam_energyCost, steam_demandCost,
 *          gas_energyCost,   gas_demandCost
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.api = window.EventAnnotationsPlot.api || {};

window.EventAnnotationsPlot.api.loadExecSummary = function(siteRef, startDate, endDate) {
  var evalAxon    = window.EventAnnotationsPlot.evalAxon;
  var extractValue = window.EventAnnotationsPlot.extractValue;
  var axonExpr = 'view_eventTracking_execSummary(@' + siteRef + ', ' + startDate + '..' + endDate + ', 1)';

  return evalAxon(axonExpr).then(function(data) {
    if (!data.rows || data.rows.length === 0) {
      return { events: [], totals: {} };
    }

    var events = data.rows.map(function(row) {
      return {
        event:             extractValue(row.event),
        eventID:           extractValue(row.eventID),
        eventSF:           extractValue(row.eventSF),
        totalCost:         extractValue(row.totalCost),
        eventStart:        extractValue(row.eventStartDate),
        eventEnd:          extractValue(row.eventEndDate),
        elec_energyCost:   extractValue(row.elec_energyCost),
        elec_demandCost:   extractValue(row.elec_demandCost),
        chw_energyCost:    extractValue(row.chw_energyCost),
        chw_demandCost:    extractValue(row.chw_demandCost),
        steam_energyCost:  extractValue(row.steam_energyCost),
        steam_demandCost:  extractValue(row.steam_demandCost),
        gas_energyCost:    extractValue(row.gas_energyCost),
        gas_demandCost:    extractValue(row.gas_demandCost)
      };
    });

    var totals = {
      totalCost: 0,
      elec_energyCost: 0, elec_demandCost: 0,
      chw_energyCost:  0, chw_demandCost:  0,
      steam_energyCost:0, steam_demandCost:0,
      gas_energyCost:  0, gas_demandCost:  0
    };

    events.forEach(function(evt) {
      totals.totalCost        += parseFloat(evt.totalCost)        || 0;
      totals.elec_energyCost  += parseFloat(evt.elec_energyCost)  || 0;
      totals.elec_demandCost  += parseFloat(evt.elec_demandCost)  || 0;
      totals.chw_energyCost   += parseFloat(evt.chw_energyCost)   || 0;
      totals.chw_demandCost   += parseFloat(evt.chw_demandCost)   || 0;
      totals.steam_energyCost += parseFloat(evt.steam_energyCost) || 0;
      totals.steam_demandCost += parseFloat(evt.steam_demandCost) || 0;
      totals.gas_energyCost   += parseFloat(evt.gas_energyCost)   || 0;
      totals.gas_demandCost   += parseFloat(evt.gas_demandCost)   || 0;
    });

    return { events: events, totals: totals };
  });
};
