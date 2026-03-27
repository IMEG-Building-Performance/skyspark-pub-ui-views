// components/BuildingMeters.js
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.BuildingMeters = {
  render: function (d) {
    var bm = d.buildingMeters;
    var varDir = bm.euiVariancePct > 0 ? '+' : '';
    return [
      '<div class="equip-section">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--imeg-blue-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Building Meters</div><div class="equip-meta">Site EUI &amp; normalized energy use</div></div>',
      '    </div>',
      '  </div>',
      '  <div class="grid-1-2">',
      '    <div class="card">',
      '      <div class="card-title">Site EUI</div>',
      '      <div class="card-sub">kBtu/sf/yr &middot; YTD annualized</div>',
      '      <div class="eui-display">',
      '        <div class="eui-val">' + bm.eui + '</div>',
      '        <div class="eui-detail">',
      '          <div class="eui-unit">kBtu / sf / yr</div>',
      '          <div class="eui-context">Target <span class="ok">' + bm.euiTarget + '</span> &nbsp;&middot;&nbsp; &Delta; <span class="warn">' + varDir + bm.euiVariancePct + '%</span></div>',
      '        </div>',
      '      </div>',
      '      <div class="kpi-group" style="margin-top:4px;">',
      '        <div class="kpi-row"><span class="kpi-name">Gross Area</span><span class="kpi-val blue">' + bm.grossAreaSf.toLocaleString() + '<span class="kpi-unit-sm">sf</span></span></div>',
      '        <div class="kpi-row"><span class="kpi-name">YTD Usage</span><span class="kpi-val">' + bm.ytdUsageKwh.toLocaleString() + '<span class="kpi-unit-sm">kWh</span></span></div>',
      '        <div class="kpi-row"><span class="kpi-name">CBECS Median</span><span class="kpi-val ok">' + bm.cbecsMedian + '<span class="kpi-unit-sm">kBtu/sf/yr</span></span></div>',
      '        <div class="kpi-row"><span class="kpi-name">Energy Star Score</span><span class="kpi-val warn">' + bm.energyStarScore + '</span></div>',
      '      </div>',
      '    </div>',
      '    <div class="card">',
      '      <div class="card-title">Normalized Monthly Usage</div>',
      '      <div class="card-sub">kBtu/sf &mdash; weather normalized &nbsp;&middot;&nbsp; 2025 vs. 2026</div>',
      '      <div class="chart-h200"><canvas id="mbcxEuiChart"></canvas></div>',
      '      <div class="legend-sm">',
      '        <span class="legend-item-sm"><span class="lsw" style="background:#9CA3AF"></span>2025</span>',
      '        <span class="legend-item-sm"><span class="lsw" style="background:#4A6FA5"></span>2026</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }
};
