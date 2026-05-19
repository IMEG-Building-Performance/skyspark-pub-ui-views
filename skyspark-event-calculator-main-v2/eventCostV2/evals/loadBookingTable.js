/**
 * loadBookingTable.js
 *
 * Calls eventCost_bookings(eventID) to get the list of spaces and
 * meters/valves associated with an event booking.
 *
 * Returns: { spaces: [...], meters: [...] }
 *
 * spaces: [{ spaceCode, site, spaceSF, bookingStart, bookingEnd }]
 * meters: [{ id, type ('Electric'|'CHW'), site }]  — deduplicated
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.api = window.EventCostV2.api || {};

window.EventCostV2.api.loadBookingTable = function(eventID) {
  var evalAxon = window.EventCostV2.evalAxon;
  var extractValue = window.EventCostV2.extractValue;

  var axonExpr = 'eventCost_bookings(' + eventID + ')';

  return evalAxon(axonExpr).then(function(grid) {
    var rows = grid.rows || [];
    var spaceSeen = {};
    var meterSeen = {};
    var spaces = [];
    var meters = [];

    rows.forEach(function(row) {
      var spaceCode    = extractValue(row.spaceCode);
      var site         = extractValue(row.site);
      var spaceSF      = extractValue(row.spaceSF);
      var bookingStart = extractValue(row.bookingStart);
      var bookingEnd   = extractValue(row.bookingEnd);
      var meterID      = extractValue(row.meterID);
      var valveRef     = extractValue(row.valveRef);
      var chwMeterID   = extractValue(row.chwMeterID);

      // Collect unique spaces
      var spaceKey = (spaceCode || '') + '|' + (site || '');
      if (spaceCode && !spaceSeen[spaceKey]) {
        spaceSeen[spaceKey] = true;
        spaces.push({
          spaceCode:    spaceCode,
          site:         site,
          spaceSF:      typeof spaceSF === 'object' && spaceSF && spaceSF.val !== undefined ? parseFloat(spaceSF.val) : parseFloat(spaceSF) || 0,
          bookingStart: bookingStart,
          bookingEnd:   bookingEnd
        });
      }

      // Collect unique electric meters
      if (meterID) {
        var mk = meterID + '|Electric';
        if (!meterSeen[mk]) {
          meterSeen[mk] = true;
          meters.push({ id: meterID, type: 'Electric', site: site });
        }
      }

      // Collect unique CHW valves / meters
      var chwId = valveRef || chwMeterID;
      if (chwId) {
        var ck = chwId + '|CHW';
        if (!meterSeen[ck]) {
          meterSeen[ck] = true;
          meters.push({ id: chwId, type: 'CHW', site: site });
        }
      }
    });

    return { spaces: spaces, meters: meters };
  }).catch(function(err) {
    console.warn('loadBookingTable error:', err);
    return { spaces: [], meters: [] };
  });
};

/**
 * Calls report_EventsByDate(dates) to find events overlapping a date range.
 * Returns an array of event objects: { eventID, eventName, eventStart, eventEnd, eventSF }
 */
window.EventCostV2.api.loadConcurrentEvents = function(startDate, endDate) {
  var evalAxon = window.EventCostV2.evalAxon;
  var extractValue = window.EventCostV2.extractValue;

  var axonExpr = 'report_EventsByDate(' + startDate + '..' + endDate + ')';

  return evalAxon(axonExpr).then(function(grid) {
    var rows = grid.rows || [];
    return rows.map(function(row) {
      return {
        eventID:    extractValue(row.eventID),
        eventName:  extractValue(row.legalName) || extractValue(row.eventName) || extractValue(row.dis) || extractValue(row.event),
        eventStart: extractValue(row.eventStart) || extractValue(row.startDate),
        eventEnd:   extractValue(row.eventEnd) || extractValue(row.endDate),
        eventSF:    extractValue(row.eventSF)
      };
    }).filter(function(e) { return e.eventID; });
  }).catch(function() { return []; });
};
