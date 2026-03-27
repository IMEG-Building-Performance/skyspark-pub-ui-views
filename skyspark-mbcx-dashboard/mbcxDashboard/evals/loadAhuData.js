// evals/loadAhuData.js
// Fetch AHU Cooling Valve Output plot and table grids from SkySpark.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.evals = window.mbcxDashboard.evals || {};

(function (NS) {

  // siteRef: Axon ref literal string including @ prefix (e.g. "@p:myProj:r:xxxx")
  // Returns Promise<{ plotGrid: grid, tableGrid: grid }>
  NS.loadAhuData = function (attestKey, projectName, siteRef) {
    var API = window.mbcxDashboard.api;
    var plotExpr  = 'view_pub_mbcxDashboard_AHUs(' + siteRef + ',1,false,false)';
    var tableExpr = 'view_pub_mbcxDashboard_AHUs(' + siteRef + ',1,false,true)';
    console.log('[mbcxDashboard] AHU plot expr:', plotExpr);

    return Promise.all([
      API.evalAxon(attestKey, projectName, plotExpr),
      API.evalAxon(attestKey, projectName, tableExpr)
    ]).then(function (results) {
      return { plotGrid: results[0], tableGrid: results[1] };
    });
  };

})(window.mbcxDashboard.evals);
