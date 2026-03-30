// evals/loadData.js
// Data loader — currently returns demo data as a stub.
// TODO: Replace each section with real Axon eval calls via window.netzeroDashboard.api.evalAxon().
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.evals = window.netzeroDashboard.evals || {};

(function (NS) {

  /**
   * Load all dashboard data for the given SkySpark project.
   *
   * @param {string} attestKey   - SkySpark session attest key
   * @param {string} projectName - SkySpark project name
   * @returns {Promise<object>}  - Resolves with a data object matching the demoData contract
   */
  NS.loadData = function (attestKey, projectName) {
    // TODO: Replace stub with real Axon evals for each section
    // (kpis, equiv, charts, detail, meterBreakdown).
    return Promise.resolve(window.netzeroDashboard.demoData);
  };

})(window.netzeroDashboard.evals);
