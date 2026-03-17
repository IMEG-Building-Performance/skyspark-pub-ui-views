/**
 * loadSiteName.js
 *
 * Loads the display name for a site ref.
 * Returns a string.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.api = window.EventAnnotationsPlot.api || {};

window.EventAnnotationsPlot.api.loadSiteName = function(siteRef) {
  var evalAxon = window.EventAnnotationsPlot.evalAxon;
  var axonExpr = 'readById(@' + siteRef + ').dis';

  return evalAxon(axonExpr).then(function(data) {
    if (data.rows && data.rows[0]) {
      return data.rows[0].val || 'Building';
    }
    return 'Building';
  }).catch(function() {
    return 'Building';
  });
};
