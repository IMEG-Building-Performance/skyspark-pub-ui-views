// evals/loadEquip.js
// Fetches AHU and RTU equipment for a given site, and calls equipTrend() for analysis.
window.siteSummary = window.siteSummary || {};

(function (NS) {
  NS.evals = NS.evals || {};

  NS.evals.loadEquip = function (siteId, attestKey, projectName) {
    var expr = 'readAll((ahu or rtu) and siteRef == @' + siteId + ')';
    return NS.api.evalAxon(expr, attestKey, projectName)
      .then(function (data) {
        var grid = NS.api.unwrapGrid(data);
        var rows = (grid && grid.rows) ? grid.rows : [];
        return rows.map(function (row) {
          var idObj = row.id;
          var id = idObj && idObj.val ? idObj.val : '';
          var navName = typeof row.navName === 'string' ? row.navName
            : (row.navName && row.navName.val ? row.navName.val : '');
          var dis = idObj && idObj.dis ? idObj.dis : navName;
          return { id: id, navName: navName, dis: dis };
        }).filter(function (e) { return !!e.id; });
      });
  };

  NS.evals.analyzeEquip = function (equipId, attestKey, projectName) {
    return NS.api.evalAxon('equipTrend(@' + equipId + ')', attestKey, projectName)
      .then(function (data) {
        var rows = data && data.rows;
        var raw = rows && rows.length > 0 ? rows[0].val : null;
        var text = (raw !== null && typeof raw === 'object') ? NS.api.extractValue(raw) : raw;
        if (typeof text !== 'string' || !text.trim()) {
          throw new Error('equipTrend() returned empty. Ensure the function is defined in this project.');
        }
        return text;
      });
  };

})(window.siteSummary);
