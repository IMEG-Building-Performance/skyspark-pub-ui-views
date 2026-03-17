/**
 * loadEventDates.js
 *
 * Loads event start/end dates for a list of event IDs.
 * Returns a map of { eventId: { startDate, endDate } }.
 *
 * TODO: Replace readAll(event) with a filtered server-side query.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.api = window.EventAnnotationsPlot.api || {};

window.EventAnnotationsPlot.api.loadEventDates = function(eventIds) {
  var evalAxon    = window.EventAnnotationsPlot.evalAxon;
  var extractValue = window.EventAnnotationsPlot.extractValue;

  if (!eventIds || eventIds.length === 0) {
    return Promise.resolve({});
  }

  return evalAxon('readAll(event)').then(function(data) {
    var eventDatesMap = {};

    if (data.rows) {
      data.rows.forEach(function(row) {
        var eventId  = extractValue(row.event);
        var startDate = extractValue(row.startDate);
        var endDate   = extractValue(row.endDate);

        if (!eventId) return;

        var startObj = startDate ? new Date(startDate) : null;
        var endObj   = endDate   ? new Date(endDate)   : null;

        if (!eventDatesMap[eventId]) {
          eventDatesMap[eventId] = { startDate: startDate, endDate: endDate, startObj: startObj, endObj: endObj };
        } else {
          if (startObj && (!eventDatesMap[eventId].startObj || startObj < eventDatesMap[eventId].startObj)) {
            eventDatesMap[eventId].startDate = startDate;
            eventDatesMap[eventId].startObj  = startObj;
          }
          if (endObj && (!eventDatesMap[eventId].endObj || endObj > eventDatesMap[eventId].endObj)) {
            eventDatesMap[eventId].endDate = endDate;
            eventDatesMap[eventId].endObj  = endObj;
          }
        }
      });
    }

    return eventDatesMap;
  }).catch(function() {
    return {};
  });
};
