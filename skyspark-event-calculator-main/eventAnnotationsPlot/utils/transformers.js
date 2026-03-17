window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.transformers = {};

/**
 * Transform SkySpark event records to chart format
 * Expected SkySpark format: { startDate, startTime, endDate, endTime, legalName, siteRef }
 * Chart format: { startTime: Date, endTime: Date, label: string, color: string }
 */
window.EventAnnotationsPlot.transformers.transformEventsToChartFormat = function(skysparkEvents) {
  var colors = [
    'rgba(54, 162, 235, 0.8)',   // Blue
    'rgba(255, 99, 132, 0.8)',   // Red
    'rgba(75, 192, 192, 0.8)',   // Teal
    'rgba(255, 159, 64, 0.8)',   // Orange
    'rgba(153, 102, 255, 0.8)',  // Purple
    'rgba(255, 205, 86, 0.8)',   // Yellow
    'rgba(201, 203, 207, 0.8)'   // Grey
  ];

  return skysparkEvents.map(function(event, index) {
    // Helper to extract value from Haystack format
    function extractValue(val) {
      if (val && typeof val === 'object' && val.val !== undefined) {
        return val.val;
      }
      return val;
    }

    // Extract and parse date/time fields
    var startDate = extractValue(event.startDate);
    var startTime = extractValue(event.startTime);
    var endDate = extractValue(event.endDate);
    var endTime = extractValue(event.endTime);
    var eventName = extractValue(event.legalName) || 'Unnamed Event';

    // Handle date/time combination
    // SkySpark may store dates in different formats:
    // - Date only: "2025-12-01" + Time: "08:00:00" -> combine with 'T'
    // - DateTime: "2025-12-01T08:00:00" -> use directly
    var startDateTimeStr, endDateTimeStr;

    if (startDate && startDate.indexOf('T') !== -1) {
      // Date already includes time component
      startDateTimeStr = startDate;
    } else {
      // Combine date and time
      startDateTimeStr = startDate + 'T' + startTime;
    }

    if (endDate && endDate.indexOf('T') !== -1) {
      // Date already includes time component
      endDateTimeStr = endDate;
    } else {
      // Combine date and time
      endDateTimeStr = endDate + 'T' + endTime;
    }

    var startDateTime = new Date(startDateTimeStr);
    var endDateTime = new Date(endDateTimeStr);

    // Validate dates - errors are silent in production
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      // Invalid date - will be filtered out
    }

    // Calculate duration
    var durationMs = endDateTime - startDateTime;
    var durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    var durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    var durationStr;

    if (durationHours > 0 && durationMinutes > 0) {
      durationStr = durationHours + 'h ' + durationMinutes + 'm';
    } else if (durationHours > 0) {
      durationStr = durationHours + 'h';
    } else if (durationMinutes > 0) {
      durationStr = durationMinutes + 'm';
    } else {
      var durationSeconds = Math.floor(durationMs / 1000);
      durationStr = durationSeconds + 's';
    }

    // Format date range for description
    var startDateFormatted = startDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var endDateFormatted = endDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var dateRangeStr = startDateFormatted === endDateFormatted
      ? startDateFormatted
      : startDateFormatted + ' - ' + endDateFormatted;

    return {
      startTime: startDateTime,
      endTime: endDateTime,
      label: eventName,
      description: dateRangeStr,
      duration: durationStr,
      color: colors[index % colors.length]
    };
  });
};

/**
 * Transform events table data to chart format
 * Table has fields: event, eventID, startDate, endDate, totalCost, etc.
 * Note: Column names may vary - this function uses dynamic detection
 */
window.EventAnnotationsPlot.transformers.transformTableEventsToChartFormat = function(tableEvents) {
  var colors = [
    'rgba(54, 162, 235, 0.8)',   // Blue
    'rgba(255, 99, 132, 0.8)',   // Red
    'rgba(75, 192, 192, 0.8)',   // Teal
    'rgba(255, 159, 64, 0.8)',   // Orange
    'rgba(153, 102, 255, 0.8)',  // Purple
    'rgba(255, 205, 86, 0.8)',   // Yellow
    'rgba(201, 203, 207, 0.8)'   // Grey
  ];

  return tableEvents.map(function(event, index) {
    // Helper to extract value from Haystack format
    // Handles: {val: "value"}, {_kind: "Date", val: "2025-01-15"}, or plain strings
    function extractValue(val) {
      if (val === undefined || val === null) {
        return null;
      }
      if (typeof val === 'object') {
        // Haystack JSON format often wraps values in {val: ...} or {_kind: ..., val: ...}
        if (val.val !== undefined) {
          return val.val;
        }
        // Sometimes it's just {_kind: "...", ...} without val
        if (val._kind === 'Date' && val.val === undefined) {
          // Date might be in a different property
          return val.date || val.toString();
        }
      }
      return val;
    }

    // Try multiple possible column names for each field
    // Event name: could be 'event', 'Event', 'eventName', 'name', 'dis'
    var eventName = extractValue(event.event) ||
                    extractValue(event.Event) ||
                    extractValue(event.eventName) ||
                    extractValue(event.name) ||
                    extractValue(event.dis) ||
                    'Unnamed Event';

    // Start date: could be 'eventStart' (from eventEvent records), 'startDate', 'StartDate', etc.
    var startDateVal = extractValue(event.eventStart) ||
                       extractValue(event.startDate) ||
                       extractValue(event.StartDate) ||
                       extractValue(event.start) ||
                       extractValue(event.Start) ||
                       extractValue(event.startTs) ||
                       extractValue(event.beginDate) ||
                       extractValue(event['Start Date']);

    // End date: could be 'eventEnd' (from eventEvent records), 'endDate', 'EndDate', etc.
    var endDateVal = extractValue(event.eventEnd) ||
                     extractValue(event.endDate) ||
                     extractValue(event.EndDate) ||
                     extractValue(event.end) ||
                     extractValue(event.End) ||
                     extractValue(event.endTs) ||
                     extractValue(event.stopDate) ||
                     extractValue(event['End Date']);

    // Parse dates - table returns dates as strings in YYYY-MM-DD format
    var startDateTime = new Date(startDateVal);
    var endDateTime = new Date(endDateVal);

    // Validate dates
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      // Return null for invalid events, we'll filter them out
      return null;
    }

    // Calculate duration
    var durationMs = endDateTime - startDateTime;
    var durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    var durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    var durationDays = Math.floor(durationHours / 24);
    var remainingHours = durationHours % 24;
    var durationStr;

    if (durationDays > 0) {
      durationStr = durationDays + 'd ' + remainingHours + 'h';
    } else if (durationHours > 0 && durationMinutes > 0) {
      durationStr = durationHours + 'h ' + durationMinutes + 'm';
    } else if (durationHours > 0) {
      durationStr = durationHours + 'h';
    } else if (durationMinutes > 0) {
      durationStr = durationMinutes + 'm';
    } else {
      var durationSeconds = Math.floor(durationMs / 1000);
      durationStr = durationSeconds + 's';
    }

    // Format date range for description
    var startDateFormatted = startDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var endDateFormatted = endDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var dateRangeStr = startDateFormatted === endDateFormatted
      ? startDateFormatted
      : startDateFormatted + ' - ' + endDateFormatted;

    return {
      startTime: startDateTime,
      endTime: endDateTime,
      label: eventName,
      description: dateRangeStr,
      duration: durationStr,
      color: colors[index % colors.length]
    };
  }).filter(function(event) {
    return event !== null; // Remove any invalid events
  });
};
