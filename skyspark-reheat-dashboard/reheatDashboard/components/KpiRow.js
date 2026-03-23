// components/KpiRow.js
// Renders the KPI summary cards
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  NS.KpiRow = {};

  NS.KpiRow.render = function (vavData) {
    var total = vavData.length;
    var faulty = vavData.filter(function (d) { return d.flag === 'faulty'; }).length;
    var leaking = vavData.filter(function (d) { return d.flag === 'leaking'; }).length;
    var avgRH = Math.round(vavData.reduce(function (s, d) { return s + d.rh; }, 0) / total);
    var avgDAT = (vavData.reduce(function (s, d) { return s + d.dat; }, 0) / total).toFixed(1);

    var kpis = [
      { label: 'Total VAVs', value: total, unit: 'monitored units', cls: '' },
      { label: 'Faulty Reheat', value: faulty, unit: Math.round(faulty / total * 100) + '% of fleet', cls: 'red' },
      { label: 'Leaking Valve', value: leaking, unit: Math.round(leaking / total * 100) + '% of fleet', cls: 'amber' },
      { label: 'Fleet Avg RH', value: avgRH + '%', unit: 'avg heating valve output', cls: 'blue' },
      { label: 'Fleet Avg DAT', value: avgDAT + '\u00B0F', unit: 'avg discharge air temp', cls: '' }
    ];

    var kpiRow = document.getElementById('rdKpiRow');
    if (!kpiRow) return;
    kpiRow.innerHTML = kpis.map(function (k) {
      return '<div class="kpi-card">' +
        '<div class="label">' + k.label + '</div>' +
        '<div class="value ' + k.cls + '">' + k.value + '</div>' +
        '<div class="unit">' + k.unit + '</div>' +
        '</div>';
    }).join('');
  };
})(window.reheatDashboard);
