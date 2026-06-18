// evals/loadAhuData.js
// Fetch all AHU metric plot and table grids from SkySpark.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.evals = window.mbcxDashboard.evals || {};

(function (NS) {

  // Metric definitions — id maps to the 2nd arg of view_pub_mbcxDashboard_AHUs
  NS.AHU_METRICS = [
    { id: 5, label: 'AHU VFD Speed',                cur: 'rgba(92,138,60,0.75)',    curB: 'rgba(92,138,60,0.95)'    },
    { id: 2, label: 'AHU Outside Air Damper Output', cur: 'rgba(107,114,128,0.65)',  curB: 'rgba(107,114,128,0.85)'  },
    { id: 1, label: 'AHU Cooling Valve Output',      cur: 'rgba(37,99,235,0.75)',    curB: 'rgba(37,99,235,0.95)'    },
    { id: 3, label: 'AHU Heating Valve Output',      cur: 'rgba(220,38,38,0.75)',    curB: 'rgba(220,38,38,0.95)'    },
    { id: 4, label: 'AHU Humidifier Output',         cur: 'rgba(234,88,12,0.75)',    curB: 'rgba(234,88,12,0.95)'    }
  ];

  // Returns Promise<Array<{ metric, plotGrid, tableGrid }>>
  NS.loadAllAhuMetrics = function (attestKey, projectName, siteRef) {
    var API = window.mbcxDashboard.api;

    return Promise.all(NS.AHU_METRICS.map(function (m) {
      var plotExpr  = 'view_pub_mbcxDashboard_AHUs(' + siteRef + ',' + m.id + ',true,false)';
      var tableExpr = 'view_pub_mbcxDashboard_AHUs(' + siteRef + ',' + m.id + ',true,true)';

      return Promise.all([
        API.evalAxon(attestKey, projectName, plotExpr),
        API.evalAxon(attestKey, projectName, tableExpr)
      ]).then(function (results) {
        return { metric: m, plotGrid: results[0], tableGrid: results[1] };
      });
    }));
  };

})(window.mbcxDashboard.evals);
