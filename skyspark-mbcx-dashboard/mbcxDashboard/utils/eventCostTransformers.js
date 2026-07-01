window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};
window.mbcxDashboard.eventCost.transformers = {};

window.mbcxDashboard.eventCost.transformers.transformEventsToChartFormat = function(skysparkEvents) {
  var colors = [
    'rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(75, 192, 192, 0.8)',
    'rgba(255, 159, 64, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 205, 86, 0.8)',
    'rgba(201, 203, 207, 0.8)'
  ];
  return skysparkEvents.map(function(event, index) {
    function extractValue(val) {
      if (val && typeof val === 'object' && val.val !== undefined) return val.val;
      return val;
    }
    var startDate = extractValue(event.startDate);
    var startTime = extractValue(event.startTime);
    var endDate = extractValue(event.endDate);
    var endTime = extractValue(event.endTime);
    var eventName = extractValue(event.legalName) || 'Unnamed Event';
    var startDateTimeStr = (startDate && startDate.indexOf('T') !== -1) ? startDate : startDate + 'T' + startTime;
    var endDateTimeStr = (endDate && endDate.indexOf('T') !== -1) ? endDate : endDate + 'T' + endTime;
    var startDateTime = new Date(startDateTimeStr);
    var endDateTime = new Date(endDateTimeStr);
    var durationMs = endDateTime - startDateTime;
    var durationHours = Math.floor(durationMs / 3600000);
    var durationMinutes = Math.floor((durationMs % 3600000) / 60000);
    var durationStr;
    if (durationHours > 0 && durationMinutes > 0) durationStr = durationHours + 'h ' + durationMinutes + 'm';
    else if (durationHours > 0) durationStr = durationHours + 'h';
    else if (durationMinutes > 0) durationStr = durationMinutes + 'm';
    else durationStr = Math.floor(durationMs / 1000) + 's';
    var startDateFormatted = startDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var endDateFormatted = endDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var dateRangeStr = startDateFormatted === endDateFormatted ? startDateFormatted : startDateFormatted + ' - ' + endDateFormatted;
    return { startTime: startDateTime, endTime: endDateTime, label: eventName, description: dateRangeStr, duration: durationStr, color: colors[index % colors.length] };
  });
};

window.mbcxDashboard.eventCost.transformers.transformTableEventsToChartFormat = function(tableEvents) {
  var colors = [
    'rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(75, 192, 192, 0.8)',
    'rgba(255, 159, 64, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 205, 86, 0.8)',
    'rgba(201, 203, 207, 0.8)'
  ];
  return tableEvents.map(function(event, index) {
    function extractValue(val) {
      if (val === undefined || val === null) return null;
      if (typeof val === 'object') { if (val.val !== undefined) return val.val; }
      return val;
    }
    var eventName = extractValue(event.event) || extractValue(event.eventName) || extractValue(event.name) || extractValue(event.dis) || 'Unnamed Event';
    var startDateVal = extractValue(event.eventStart) || extractValue(event.startDate) || extractValue(event.start);
    var endDateVal = extractValue(event.eventEnd) || extractValue(event.endDate) || extractValue(event.end);
    var startDateTime = new Date(startDateVal);
    var endDateTime = new Date(endDateVal);
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return null;
    var durationMs = endDateTime - startDateTime;
    var durationHours = Math.floor(durationMs / 3600000);
    var durationDays = Math.floor(durationHours / 24);
    var remainingHours = durationHours % 24;
    var durationStr;
    if (durationDays > 0) durationStr = durationDays + 'd ' + remainingHours + 'h';
    else if (durationHours > 0) durationStr = durationHours + 'h';
    else durationStr = Math.floor(durationMs / 60000) + 'm';
    var startDateFormatted = startDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var endDateFormatted = endDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var dateRangeStr = startDateFormatted === endDateFormatted ? startDateFormatted : startDateFormatted + ' - ' + endDateFormatted;
    return { startTime: startDateTime, endTime: endDateTime, label: eventName, description: dateRangeStr, duration: durationStr, color: colors[index % colors.length] };
  }).filter(function(e) { return e !== null; });
};
