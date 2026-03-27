// evals/loadData.js
// Data loader — currently returns demo data as a stub.
// TODO: Replace each section with real Axon eval calls via window.mbcxDashboard.api.evalAxon().
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.evals = window.mbcxDashboard.evals || {};

(function (NS) {

  /**
   * Load all dashboard data for the given SkySpark project.
   *
   * @param {string} attestKey   - SkySpark session attest key
   * @param {string} projectName - SkySpark project name
   * @returns {Promise<object>}  - Resolves with a data object matching the demoData contract
   */
  NS.loadData = function (attestKey, projectName) {
    // TODO: Replace stub sections with real Axon evals, e.g.:
    //
    //   return window.mbcxDashboard.api.evalAxon(
    //     attestKey, projectName,
    //     'readAll(site and dis=="Main Campus")'
    //   ).then(function (grid) {
    //     return transformToDataContract(grid);
    //   });
    //
    // Each section (healthBanner, buildingMeters, cup, ahu, terminalUnits)
    // should be fetched and mapped into the shape defined in constants/demoData.js.

    return Promise.resolve(window.mbcxDashboard.demoData);
  };

})(window.mbcxDashboard.evals);
