/**
 * loadSiteName.js — Site display name for Event Cost V2
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.api = window.EventCostV2.api || {};

window.EventCostV2.api.loadSiteName = function(siteRef) {
  var evalAxon = window.EventCostV2.evalAxon;
  return evalAxon('readById(@' + siteRef + ').dis').then(function(data) {
    if (data.rows && data.rows[0]) return data.rows[0].val || 'Building';
    return 'Building';
  }).catch(function() { return 'Building'; });
};
