window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};
window.mbcxDashboard.eventCost.api = window.mbcxDashboard.eventCost.api || {};

window.mbcxDashboard.eventCost.api.loadEventCostResults = function(siteRef, startDate, endDate) {
  var evalAxon = window.mbcxDashboard.eventCost.evalAxon;
  var extractValue = window.mbcxDashboard.eventCost.extractValue;
  var axonExpr = 'readAll(eventCostResult and siteRef == @' + siteRef + ')';
  return evalAxon(axonExpr).then(function(grid) {
    var rows = grid.rows || [];
    var rangeStart = startDate ? new Date(startDate).getTime() : null;
    var rangeEnd = endDate ? new Date(endDate + 'T23:59:59').getTime() : null;
    var results = [];
    rows.forEach(function(row) {
      var eventStart = extractValue(row.eventStart);
      var ts = eventStart ? new Date(eventStart).getTime() : null;
      if (ts !== null && rangeStart !== null && (ts < rangeStart || ts > rangeEnd)) return;
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
        eventID: extractValue(row.eventID), eventName: extractValue(row.eventName) || extractValue(row.dis) || ('Event ' + extractValue(row.eventID)),
        siteRef: extractValue(row.siteRef), utilityType: extractValue(row.utilityType),
        costType: extractValue(row.costType) || 'Usage', usage: usage, rate: rate, cost: cost, eventSF: eventSF,
        metersUsed: extractValue(row.metersUsed), calculatedOn: extractValue(row.calculatedOn),
        dataQuality: extractValue(row.dataQuality), errorCount: extractValue(row.errorCount),
        mostCommonError: extractValue(row.mostCommonError), eventStart: eventStart, eventEnd: extractValue(row.eventEnd)
      });
    });
    return results;
  });
};

window.mbcxDashboard.eventCost.api.aggregateEventSummaries = function(results) {
  var eventMap = {};
  results.forEach(function(r) {
    var id = r.eventID;
    if (!id) return;
    if (!eventMap[id]) {
      eventMap[id] = { eventID: id, eventName: r.eventName, eventStart: r.eventStart, eventEnd: r.eventEnd, eventSF: r.eventSF, electricCost: 0, chwCost: 0, steamCost: 0, gasCost: 0, totalCost: 0, dataQuality: null, errorCount: 0, metersUsed: 0 };
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
      if (!isNaN(dq)) { ev.dataQuality = ev.dataQuality === null ? dq : Math.min(ev.dataQuality, dq); }
    }
    if (r.errorCount) ev.errorCount += parseInt(r.errorCount) || 0;
    if (r.metersUsed) ev.metersUsed += parseInt(r.metersUsed) || 0;
    if (r.eventStart && (!ev.eventStart || new Date(r.eventStart) < new Date(ev.eventStart))) ev.eventStart = r.eventStart;
    if (r.eventEnd && (!ev.eventEnd || new Date(r.eventEnd) > new Date(ev.eventEnd))) ev.eventEnd = r.eventEnd;
  });
  return Object.values(eventMap).sort(function(a, b) { return new Date(b.eventStart || 0) - new Date(a.eventStart || 0); });
};

window.mbcxDashboard.eventCost.api.loadPowerData = function(siteRef, startDate, endDate, utilityType) {
  var evalAxon = window.mbcxDashboard.eventCost.evalAxon;
  var extractValue = window.mbcxDashboard.eventCost.extractValue;
  utilityType = utilityType || 'Electric';
  var axonExpr = utilityType === 'Water'
    ? 'view_performanceImprovement_waterDashboard(@' + siteRef + ', ' + startDate + '..' + endDate + ', 4, "Combined Water").table'
    : 'view_demandByMeter_plot(@' + siteRef + ', ' + startDate + '..' + endDate + ', "Combined Power", "' + utilityType + '")';
  return evalAxon(axonExpr).then(function(data) {
    if (!data.rows || data.rows.length === 0) return [];
    var valueColName = data.cols && data.cols.length >= 2 ? data.cols[1].name : null;
    return data.rows.map(function(row) {
      var ts = extractValue(row.Timestamp || row.ts);
      var val = valueColName ? extractValue(row[valueColName]) : null;
      if (val === null) { for (var key in row) { if (key !== 'Timestamp' && key !== 'ts') { val = extractValue(row[key]); break; } } }
      return { x: new Date(ts), y: parseFloat(val) };
    }).filter(function(pt) { return !isNaN(pt.y); });
  });
};

window.mbcxDashboard.eventCost.api.loadSiteName = function(siteRef) {
  var evalAxon = window.mbcxDashboard.eventCost.evalAxon;
  return evalAxon('readById(@' + siteRef + ').dis').then(function(data) {
    if (data.rows && data.rows[0]) return data.rows[0].val || 'Building';
    return 'Building';
  }).catch(function() { return 'Building'; });
};

window.mbcxDashboard.eventCost.api.loadBookingTable = function(eventID) {
  var evalAxon = window.mbcxDashboard.eventCost.evalAxon;
  var extractValue = window.mbcxDashboard.eventCost.extractValue;
  var axonExpr = 'eventCost_bookings(' + eventID + ')';
  return evalAxon(axonExpr).then(function(grid) {
    var rows = grid.rows || [];
    var spaceSeen = {}, meterSeen = {};
    var spaces = [], meters = [];
    rows.forEach(function(row) {
      var spaceCode = extractValue(row.spaceCode);
      var site = extractValue(row.site);
      var spaceSF = extractValue(row.spaceSF);
      var bookingStart = extractValue(row.bookingStart);
      var bookingEnd = extractValue(row.bookingEnd);
      var meterID = extractValue(row.meterID);
      var valveRef = extractValue(row.valveRef);
      var chwMeterID = extractValue(row.chwMeterID);
      var spaceKey = (spaceCode || '') + '|' + (site || '');
      if (spaceCode && !spaceSeen[spaceKey]) {
        spaceSeen[spaceKey] = true;
        spaces.push({ spaceCode: spaceCode, site: site, spaceSF: typeof spaceSF === 'object' && spaceSF && spaceSF.val !== undefined ? parseFloat(spaceSF.val) : parseFloat(spaceSF) || 0, bookingStart: bookingStart, bookingEnd: bookingEnd });
      }
      if (meterID) { var mk = meterID + '|Electric'; if (!meterSeen[mk]) { meterSeen[mk] = true; meters.push({ id: meterID, type: 'Electric', site: site }); } }
      var chwId = valveRef || chwMeterID;
      if (chwId) { var ck = chwId + '|CHW'; if (!meterSeen[ck]) { meterSeen[ck] = true; meters.push({ id: chwId, type: 'CHW', site: site }); } }
    });
    return { spaces: spaces, meters: meters };
  }).catch(function(err) { console.warn('loadBookingTable error:', err); return { spaces: [], meters: [] }; });
};

window.mbcxDashboard.eventCost.api.loadConcurrentEvents = function(startDate, endDate) {
  var evalAxon = window.mbcxDashboard.eventCost.evalAxon;
  var extractValue = window.mbcxDashboard.eventCost.extractValue;
  var axonExpr = 'report_EventsByDate(' + startDate + '..' + endDate + ')';
  return evalAxon(axonExpr).then(function(grid) {
    var rows = grid.rows || [];
    return rows.map(function(row) {
      return { eventID: extractValue(row.eventID), eventName: extractValue(row.legalName) || extractValue(row.eventName) || extractValue(row.dis) || extractValue(row.event), eventStart: extractValue(row.eventStart) || extractValue(row.startDate), eventEnd: extractValue(row.eventEnd) || extractValue(row.endDate), eventSF: extractValue(row.eventSF) };
    }).filter(function(e) { return e.eventID; });
  }).catch(function() { return []; });
};
