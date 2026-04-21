// evals/loadEquip.js
// Equipment list, AI analysis, and 24-hour history for chart rendering.
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

  NS.evals.loadEquipHistory = function (equipId, attestKey, projectName) {
    var expr = 'hisRead(readAll(point and equipRef == @' + equipId + '), (now()-1day)..now()).table';
    return NS.api.evalAxon(expr, attestKey, projectName)
      .then(function (data) {
        var grid = NS.api.unwrapGrid(data);
        if (!grid || !grid.cols || !grid.rows || grid.rows.length === 0) {
          return { labels: [], datasets: [] };
        }

        // Columns after ts are v0, v1, … with optional dis metadata for point name
        var valueCols = grid.cols.filter(function (c) { return c.name !== 'ts'; });
        if (valueCols.length === 0) return { labels: [], datasets: [] };

        var labels = [];
        var seriesData = valueCols.map(function () { return []; });

        grid.rows.forEach(function (row) {
          labels.push(_formatTs(row.ts));
          valueCols.forEach(function (col, idx) {
            seriesData[idx].push(_parseNum(row[col.name]));
          });
        });

        var palette = [
          '#1d6fa4', '#e05c00', '#00875a', '#7c3aed',
          '#b91c1c', '#0891b2', '#ca8a04', '#4f46e5'
        ];

        var datasets = valueCols.map(function (col, idx) {
          return {
            label: col.dis || col.name,
            data: seriesData[idx],
            borderColor: palette[idx % palette.length],
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
            spanGaps: true
          };
        });

        return { labels: labels, datasets: datasets };
      });
  };

  function _formatTs(raw) {
    if (!raw) return '';
    var iso = '';
    if (raw && raw._kind === 'dateTime') {
      iso = raw.val;
    } else if (typeof raw === 'string') {
      // ZINC-style "t:2024-04-19T01:00:00-04:00 EDT"
      iso = raw.indexOf('t:') === 0 ? raw.slice(2).split(' ')[0] : raw;
    }
    if (!iso) return String(raw);
    try {
      var d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return iso;
    }
  }

  function _parseNum(raw) {
    if (raw === null || raw === undefined) return null;
    if (raw && raw._kind === 'na') return null;
    if (raw && raw._kind === 'number') return raw.val;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string' && raw.indexOf('n:') === 0) return parseFloat(raw.slice(2));
    if (raw && typeof raw === 'object' && raw.val !== undefined) {
      var n = parseFloat(raw.val);
      return isNaN(n) ? null : n;
    }
    return null;
  }

})(window.siteSummary);
