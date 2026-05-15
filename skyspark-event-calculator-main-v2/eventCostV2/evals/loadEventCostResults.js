/**
 * loadEventCostResults.js
 *
 * Queries pre-computed eventCostResult records from SkySpark Folio.
 * One record per event / site / utility / costType.
 *
 * Returns an array of plain objects with normalized fields.
 * Filtered client-side by date range (eventStart within startDate..endDate).
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.api = window.EventCostV2.api || {};

window.EventCostV2.api.loadEventCostResults = function(siteRef, startDate, endDate) {
  var evalAxon = window.EventCostV2.evalAxon;
  var extractValue = window.EventCostV2.extractValue;

  var axonExpr = 'readAll(eventCostResult and siteRef == @' + siteRef + ')';

  return evalAxon(axonExpr).then(function(grid) {
    var rows = grid.rows || [];
    var rangeStart = startDate ? new Date(startDate).getTime() : null;
    var rangeEnd   = endDate   ? new Date(endDate + 'T23:59:59').getTime() : null;

    var results = [];
    rows.forEach(function(row) {
      var eventStart = extractValue(row.eventStart);
      var ts = eventStart ? new Date(eventStart).getTime() : null;

      // Filter by date range
      if (ts !== null && rangeStart !== null && (ts < rangeStart || ts > rangeEnd)) return;

      // Parse cost — may be a Haystack number object
      var rawCost = row.cost;
      var cost = 0;
      if (rawCost !== null && rawCost !== undefined) {
        if (typeof rawCost === 'number') cost = rawCost;
        else if (typeof rawCost === 'object' && rawCost.val !== undefined) cost = parseFloat(rawCost.val) || 0;
        else cost = parseFloat(rawCost) || 0;
      }

      var rawUsage = row.usage;
      var usage = 0;
      if (rawUsage !== null && rawUsage !== undefined) {
        if (typeof rawUsage === 'number') usage = rawUsage;
        else if (typeof rawUsage === 'object' && rawUsage.val !== undefined) usage = parseFloat(rawUsage.val) || 0;
        else usage = parseFloat(rawUsage) || 0;
      }

      var rawRate = row.rate;
      var rate = 0;
      if (rawRate !== null && rawRate !== undefined) {
        if (typeof rawRate === 'number') rate = rawRate;
        else if (typeof rawRate === 'object' && rawRate.val !== undefined) rate = parseFloat(rawRate.val) || 0;
        else rate = parseFloat(rawRate) || 0;
      }

      var rawSF = row.eventSF;
      var eventSF = 0;
      if (rawSF !== null && rawSF !== undefined) {
        if (typeof rawSF === 'number') eventSF = rawSF;
        else if (typeof rawSF === 'object' && rawSF.val !== undefined) eventSF = parseFloat(rawSF.val) || 0;
        else eventSF = parseFloat(rawSF) || 0;
      }

      results.push({
        eventID:       extractValue(row.eventID),
        eventName:     extractValue(row.eventName) || extractValue(row.dis) || ('Event ' + extractValue(row.eventID)),
        siteRef:       extractValue(row.siteRef),
        utilityType:   extractValue(row.utilityType),
        costType:      extractValue(row.costType) || 'Usage',
        usage:         usage,
        rate:          rate,
        cost:          cost,
        eventSF:       eventSF,
        metersUsed:    extractValue(row.metersUsed),
        calculatedOn:  extractValue(row.calculatedOn),
        dataQuality:   extractValue(row.dataQuality),
        errorCount:    extractValue(row.errorCount),
        mostCommonError: extractValue(row.mostCommonError),
        eventStart:    eventStart,
        eventEnd:      extractValue(row.eventEnd)
      });
    });

    return results;
  });
};

/**
 * Aggregate raw eventCostResult rows into per-event summary objects.
 * Returns an array of event objects sorted by eventStart descending.
 */
window.EventCostV2.api.aggregateEventSummaries = function(results) {
  var eventMap = {};

  results.forEach(function(r) {
    var id = r.eventID;
    if (!id) return;

    if (!eventMap[id]) {
      eventMap[id] = {
        eventID:      id,
        eventName:    r.eventName,
        eventStart:   r.eventStart,
        eventEnd:     r.eventEnd,
        eventSF:      r.eventSF,
        electricCost: 0,
        chwCost:      0,
        steamCost:    0,
        gasCost:      0,
        totalCost:    0,
        dataQuality:  null,
        errorCount:   0,
        metersUsed:   0
      };
    }

    var ev = eventMap[id];
    var cost = r.cost || 0;

    if (r.utilityType === 'Electric') ev.electricCost += cost;
    else if (r.utilityType === 'CHW') ev.chwCost += cost;
    else if (r.utilityType === 'Steam') ev.steamCost += cost;
    else if (r.utilityType === 'Gas') ev.gasCost += cost;

    ev.totalCost += cost;

    if (r.dataQuality !== null && r.dataQuality !== undefined) {
      var dq = parseFloat(r.dataQuality);
      if (!isNaN(dq)) {
        ev.dataQuality = ev.dataQuality === null ? dq : Math.min(ev.dataQuality, dq);
      }
    }
    if (r.errorCount) ev.errorCount += parseInt(r.errorCount) || 0;
    if (r.metersUsed) ev.metersUsed += parseInt(r.metersUsed) || 0;

    // Keep the widest date range
    if (r.eventStart && (!ev.eventStart || new Date(r.eventStart) < new Date(ev.eventStart)))
      ev.eventStart = r.eventStart;
    if (r.eventEnd && (!ev.eventEnd || new Date(r.eventEnd) > new Date(ev.eventEnd)))
      ev.eventEnd = r.eventEnd;
  });

  return Object.values(eventMap).sort(function(a, b) {
    return new Date(b.eventStart || 0) - new Date(a.eventStart || 0);
  });
};
