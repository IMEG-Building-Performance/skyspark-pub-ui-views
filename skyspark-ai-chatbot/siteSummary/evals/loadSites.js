// evals/loadSites.js
// Fetches all site records from SkySpark via readAll(site).
// Returns a Promise resolving to an array of { id, dis } objects.
window.siteSummary = window.siteSummary || {};

(function (NS) {
  NS.evals = NS.evals || {};

  NS.evals.loadSites = function (attestKey, projectName) {
    return NS.api.evalAxon('readAll(site)', attestKey, projectName)
      .then(function (data) {
        var grid = NS.api.unwrapGrid(data);
        var rows = (grid && grid.rows) ? grid.rows : [];
        return rows.map(function (row) {
          var idObj = row.id;
          var id = idObj && idObj.val ? idObj.val : (typeof idObj === 'string' ? idObj : '');
          var dis = typeof row.dis === 'string'
            ? row.dis
            : (idObj && idObj.dis ? idObj.dis : id);
          return { id: id, dis: dis };
        }).filter(function (s) { return !!s.id; });
      });
  };

})(window.siteSummary);
