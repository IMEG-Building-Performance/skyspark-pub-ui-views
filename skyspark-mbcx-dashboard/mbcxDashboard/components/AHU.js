// components/AHU.js — Air Handling Units section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.AHU = {
  renderTable: function (container, metricKey, metrics) {
    var ds = metrics[metricKey];
    var tbody = container.querySelector('#mbcxAhuTableBody');
    var titleEl = container.querySelector('#mbcxAhuTableTitle');
    if (titleEl) titleEl.textContent = ds.tblTitle;
    if (!tbody) return;
    var maxDiff = Math.max.apply(null, ds.rows.map(function (r) { return Math.abs(r.diff); }));
    tbody.innerHTML = ds.rows.map(function (row) {
      var barW  = Math.max(2, Math.round((Math.abs(row.diff) / (maxDiff || 1)) * 60));
      var dCls  = row.diff > 3 ? 'diff-pos' : row.diff < -3 ? 'diff-neg' : '';
      var barCls = row.diff < 0 ? 'diff-bar-neg' : 'diff-bar-pos';
      var sign  = row.diff > 0 ? '+' : '';
      var bg    = Math.abs(row.diff) > 20 ? ' style="background:#FEF2F2"' : '';
      return '<tr' + bg + '>' +
        '<td>' + row.name + '</td>' +
        '<td>' + row.v26.toFixed(2) + ds.unit + '</td>' +
        '<td>' + row.v25.toFixed(2) + ds.unit + '</td>' +
        '<td class="' + dCls + '">' + sign + row.diff.toFixed(2) + ds.unit + '</td>' +
        '<td><div style="display:flex;align-items:center;justify-content:flex-end;"><div class="diff-bar ' + barCls + '" style="width:' + barW + 'px;"></div></div></td>' +
        '</tr>';
    }).join('');
  },

  render: function (d) {
    var ahu = d.ahu;
    return [
      '<div class="equip-section">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--imeg-green-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5C8A3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Air Handling Units</div><div class="equip-meta">' + ahu.unitCount + ' AHUs &nbsp;&middot;&nbsp; Fleet avg trends &amp; unit-level table</div></div>',
      '    </div>',
      '  </div>',
      '  <div class="metric-toggle-bar" id="mbcxAhuMetricToggle">',
      '    <button class="metric-btn active" data-metric="vfd">VFD Speed</button>',
      '    <button class="metric-btn" data-metric="oad">OAD</button>',
      '    <button class="metric-btn" data-metric="clg">Cooling Valve</button>',
      '    <button class="metric-btn" data-metric="htg">Heating Valve</button>',
      '    <button class="metric-btn" data-metric="hum">Humidifier</button>',
      '  </div>',
      '  <div class="card" style="margin-bottom:14px;">',
      '    <div class="card-title" id="mbcxAhuChartTitle">Fleet Avg VFD Speed by Month</div>',
      '    <div class="card-sub">% output &mdash; 2025 vs. 2026 &nbsp;&middot;&nbsp; fleet average across all AHUs</div>',
      '    <div class="chart-h180"><canvas id="mbcxAhuFleetChart"></canvas></div>',
      '    <div class="legend-sm">',
      '      <span class="legend-item-sm"><span class="lsw" style="background:#9CA3AF"></span>2025</span>',
      '      <span class="legend-item-sm"><span class="lsw" style="background:#5C8A3C"></span>2026</span>',
      '    </div>',
      '  </div>',
      '  <div class="card">',
      '    <div class="card-title" id="mbcxAhuTableTitle">AHU Unit Summary &mdash; VFD Speed</div>',
      '    <div class="card-sub">YTD 2026 vs. YTD 2025 &nbsp;&middot;&nbsp; rows highlighted red exceed &plusmn;20%</div>',
      '    <table class="data-tbl">',
      '      <thead><tr>',
      '        <th>AHU</th><th>YTD 2026</th><th>YTD 2025</th><th>&Delta; vs. Prior</th><th style="width:80px;"></th>',
      '      </tr></thead>',
      '      <tbody id="mbcxAhuTableBody"></tbody>',
      '    </table>',
      '  </div>',
      '</div>'
    ].join('\n');
  }
};
