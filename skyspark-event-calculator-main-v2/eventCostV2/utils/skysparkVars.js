/**
 * skysparkVars.js — SkySpark variable reading and polling for Event Cost V2
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.skyspark = {};

window.EventCostV2.skyspark.tryReadVar = function(viewObj, varName) {
  if (!viewObj) return null;
  try {
    if (typeof viewObj['var'] === 'function') return viewObj['var'](varName);
    return null;
  } catch (e) { return null; }
};

window.EventCostV2.skyspark.readVariables = function(arg, view) {
  var tryReadVar = window.EventCostV2.skyspark.tryReadVar;
  var data = arg.data;

  var selectedSite = null;
  var startDate = '2025-12-01';
  var endDate = '2025-12-07';

  // Approach 1: read from data parameter rows
  if (data && typeof data.rows === 'function') {
    var rows = data.rows();
    var rowCount = (rows && typeof rows.size === 'function') ? rows.size() : 0;
    if (rows && rowCount > 0) {
      var row = (typeof rows.get === 'function') ? rows.get(0) : rows[0];
      if (row.site) {
        if (typeof row.site === 'object' && row.site.val) selectedSite = row.site.val;
        else if (typeof row.site === 'string') selectedSite = row.site;
      }
      if (row.dateRange) {
        if (row.dateRange.start && typeof row.dateRange.start === 'function') {
          var s = row.dateRange.start().toStr();
          if (s && s.match(/\d{4}-\d{2}-\d{2}/)) startDate = s.substring(0, 10);
        }
        if (row.dateRange.end && typeof row.dateRange.end === 'function') {
          var e = row.dateRange.end().toStr();
          if (e && e.match(/\d{4}-\d{2}-\d{2}/)) endDate = e.substring(0, 10);
        }
      }
    }
  }

  // Approach 2: read from parent/root view variables
  try {
    var parentView = null;
    if (typeof view.parent === 'function') parentView = view.parent();
    else if (typeof view.root === 'function') parentView = view.root();

    var siteVar = tryReadVar(view, 'site') || tryReadVar(parentView, 'site');
    if (siteVar && siteVar.id && typeof siteVar.id === 'function') selectedSite = siteVar.id();
    else if (siteVar && typeof siteVar === 'string') selectedSite = siteVar;

    var dateRangeVar = tryReadVar(view, 'dateRange') || tryReadVar(parentView, 'dateRange');
    if (dateRangeVar) {
      if (dateRangeVar.start && typeof dateRangeVar.start === 'function') {
        var s2 = dateRangeVar.start().toStr();
        if (s2 && s2.match(/\d{4}-\d{2}-\d{2}/)) startDate = s2.substring(0, 10);
      }
      if (dateRangeVar.end && typeof dateRangeVar.end === 'function') {
        var e2 = dateRangeVar.end().toStr();
        if (e2 && e2.match(/\d{4}-\d{2}-\d{2}/)) endDate = e2.substring(0, 10);
      }
    }
  } catch (e) {}

  var attestKey = '';
  var projectName = '';
  try {
    var session = view.session();
    if (session) {
      attestKey = session.attestKey();
      projectName = session.proj().name();
    }
  } catch (e) {}

  return { selectedSite: selectedSite, startDate: startDate, endDate: endDate, attestKey: attestKey, projectName: projectName };
};

window.EventCostV2.skyspark.startPolling = function(view, initialValues, onChangeCallback) {
  var tryReadVar = window.EventCostV2.skyspark.tryReadVar;
  var lastSite = initialValues.selectedSite;
  var lastStart = initialValues.startDate;
  var lastEnd = initialValues.endDate;

  setInterval(function() {
    var currentSite = null;
    var currentStart = '2025-12-01';
    var currentEnd = '2025-12-07';
    try {
      var parentView = null;
      if (typeof view.parent === 'function') parentView = view.parent();
      else if (typeof view.root === 'function') parentView = view.root();

      var siteVar = tryReadVar(view, 'site') || tryReadVar(parentView, 'site');
      if (siteVar && siteVar.id && typeof siteVar.id === 'function') currentSite = siteVar.id();
      else if (siteVar && typeof siteVar === 'string') currentSite = siteVar;

      var drVar = tryReadVar(view, 'dateRange') || tryReadVar(parentView, 'dateRange');
      if (drVar) {
        if (drVar.start && typeof drVar.start === 'function') {
          var s = drVar.start().toStr();
          if (s && s.match(/\d{4}-\d{2}-\d{2}/)) currentStart = s.substring(0, 10);
        }
        if (drVar.end && typeof drVar.end === 'function') {
          var e = drVar.end().toStr();
          if (e && e.match(/\d{4}-\d{2}-\d{2}/)) currentEnd = e.substring(0, 10);
        }
      }

      if (currentSite !== lastSite || currentStart !== lastStart || currentEnd !== lastEnd) {
        lastSite = currentSite;
        lastStart = currentStart;
        lastEnd = currentEnd;
        onChangeCallback(currentSite, currentStart, currentEnd);
      }
    } catch (e) {}
  }, 2000);
};
