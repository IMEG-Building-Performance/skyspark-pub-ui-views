/**
 * SkySpark Variable Reading and Polling
 *
 * Handles reading SkySpark variables (site, dateRange) from the view context
 * and polling for changes to trigger data reloads.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.skyspark = {};

/**
 * Helper function to safely read a SkySpark variable from a view object
 */
window.EventAnnotationsPlot.skyspark.tryReadVar = function(viewObj, varName) {
  if (!viewObj) {
    return null;
  }
  try {
    // Use bracket notation for 'var' (reserved keyword in JavaScript)
    if (typeof viewObj['var'] === 'function') {
      var result = viewObj['var'](varName);
      return result;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
};

/**
 * Read SkySpark variables from the view context
 * Tries data parameter first, then falls back to parent view variables
 *
 * @param {Object} arg - The SkySpark onUpdate argument
 * @param {Object} view - The current SkySpark view object
 * @returns {Object} {selectedSite, startDate, endDate}
 */
window.EventAnnotationsPlot.skyspark.readVariables = function(arg, view) {
  var tryReadVar = window.EventAnnotationsPlot.skyspark.tryReadVar;
  var data = arg.data;

  var selectedSite = null;
  var startDate = '2025-12-01';
  var endDate = '2025-12-07';

  // APPROACH 1: Try to read from data parameter (if view has data expression)
  // CRITICAL: data.rows() is a FUNCTION in SkySpark's Haystack API, not a property!
  // CRITICAL: rows is a Fantom List, use .size() not .length, and .get(index) not [index]
  if (data && typeof data.rows === 'function') {
    var rows = data.rows();

    // Fantom List uses size() method instead of .length
    var rowCount = (rows && typeof rows.size === 'function') ? rows.size() : 0;

    if (rows && rowCount > 0) {
      // Fantom List uses get(index) method instead of [index]
      var row = (typeof rows.get === 'function') ? rows.get(0) : rows[0];

      // Extract site from data
      if (row.site) {
        if (typeof row.site === 'object' && row.site.val) {
          selectedSite = row.site.val;  // Haystack Ref format
        } else if (typeof row.site === 'string') {
          selectedSite = row.site;
        }
      }

      // Extract dateRange from data
      if (row.dateRange) {
        if (row.dateRange.start && typeof row.dateRange.start === 'function') {
          var startDateObj = row.dateRange.start();
          var startDateStr = startDateObj.toStr();
          if (startDateStr && startDateStr.match(/\d{4}-\d{2}-\d{2}/)) {
            startDate = startDateStr.substring(0, 10);
          }
        }
        if (row.dateRange.end && typeof row.dateRange.end === 'function') {
          var endDateObj = row.dateRange.end();
          var endDateStr = endDateObj.toStr();
          if (endDateStr && endDateStr.match(/\d{4}-\d{2}-\d{2}/)) {
            endDate = endDateStr.substring(0, 10);
          }
        }
      }
    }
  }

  // APPROACH 2: Try to read from parent view variables (fallback)
  try {
    // Get parent or root view (where variables are declared)
    var parentView = null;
    if (typeof view.parent === 'function') {
      parentView = view.parent();
    } else if (typeof view.root === 'function') {
      parentView = view.root();
    }

    // Try to read 'site' variable (Ref type)
    var siteVar = tryReadVar(view, 'site') || tryReadVar(parentView, 'site');
    if (siteVar && siteVar.id && typeof siteVar.id === 'function') {
      selectedSite = siteVar.id();
    } else if (siteVar && typeof siteVar === 'string') {
      selectedSite = siteVar;
    }

    // Try to read 'dateRange' variable (Span type)
    var dateRangeVar = tryReadVar(view, 'dateRange') || tryReadVar(parentView, 'dateRange');
    if (dateRangeVar) {
      // Extract start date
      if (dateRangeVar.start && typeof dateRangeVar.start === 'function') {
        var startDateObj2 = dateRangeVar.start();
        var startDateStr2 = startDateObj2.toStr();
        if (startDateStr2 && startDateStr2.match(/\d{4}-\d{2}-\d{2}/)) {
          startDate = startDateStr2.substring(0, 10);
        }
      }
      // Extract end date
      if (dateRangeVar.end && typeof dateRangeVar.end === 'function') {
        var endDateObj2 = dateRangeVar.end();
        var endDateStr2 = endDateObj2.toStr();
        if (endDateStr2 && endDateStr2.match(/\d{4}-\d{2}-\d{2}/)) {
          endDate = endDateStr2.substring(0, 10);
        }
      }
    }
  } catch (e) {
    // Silent fallback to defaults
  }

  // Store attestKey and projectName from the SkySpark session
  var attestKey = '';
  var projectName = '';
  try {
    // Use view.session() which is the reliable way to get session in SkySpark pub UI
    var session = view.session();
    if (session) {
      attestKey = session.attestKey();
      projectName = session.proj().name();
    }
  } catch (e) {
    // Silent fallback
  }

  return {
    selectedSite: selectedSite,
    startDate: startDate,
    endDate: endDate,
    attestKey: attestKey,
    projectName: projectName
  };
};

/**
 * Start polling for SkySpark variable changes
 * Checks every 2 seconds for site or dateRange changes and calls the callback
 *
 * @param {Object} view - The SkySpark view object
 * @param {Object} initialValues - {selectedSite, startDate, endDate}
 * @param {Function} onChangeCallback - Called with (selectedSite, startDate, endDate) when values change
 */
window.EventAnnotationsPlot.skyspark.startPolling = function(view, initialValues, onChangeCallback) {
  var tryReadVar = window.EventAnnotationsPlot.skyspark.tryReadVar;

  var lastSite = initialValues.selectedSite;
  var lastStartDate = initialValues.startDate;
  var lastEndDate = initialValues.endDate;

  setInterval(function() {
    // Re-read variables from parent/root view
    var currentSite = null;
    var currentStartDate = '2025-12-01';
    var currentEndDate = '2025-12-07';

    try {
      // Get parent or root view
      var parentView = null;
      if (typeof view.parent === 'function') {
        parentView = view.parent();
      } else if (typeof view.root === 'function') {
        parentView = view.root();
      }

      // Try to read 'site' variable
      var siteVar = tryReadVar(view, 'site') || tryReadVar(parentView, 'site');
      if (siteVar && siteVar.id && typeof siteVar.id === 'function') {
        currentSite = siteVar.id();
      } else if (siteVar && typeof siteVar === 'string') {
        currentSite = siteVar;
      }

      // Try to read 'dateRange' variable
      var dateRangeVar = tryReadVar(view, 'dateRange') || tryReadVar(parentView, 'dateRange');
      if (dateRangeVar) {
        if (dateRangeVar.start && typeof dateRangeVar.start === 'function') {
          var startDateObj = dateRangeVar.start();
          var startDateStr = startDateObj.toStr();
          if (startDateStr && startDateStr.match(/\d{4}-\d{2}-\d{2}/)) {
            currentStartDate = startDateStr.substring(0, 10);
          }
        }
        if (dateRangeVar.end && typeof dateRangeVar.end === 'function') {
          var endDateObj = dateRangeVar.end();
          var endDateStr = endDateObj.toStr();
          if (endDateStr && endDateStr.match(/\d{4}-\d{2}-\d{2}/)) {
            currentEndDate = endDateStr.substring(0, 10);
          }
        }
      }

      // Check if variables have changed
      if (currentSite !== lastSite || currentStartDate !== lastStartDate || currentEndDate !== lastEndDate) {
        // Update last known values
        lastSite = currentSite;
        lastStartDate = currentStartDate;
        lastEndDate = currentEndDate;

        // Call the change handler
        onChangeCallback(currentSite, currentStartDate, currentEndDate);
      }
    } catch (e) {
      // Silent error handling during polling
    }
  }, 2000); // Check every 2 seconds
};
