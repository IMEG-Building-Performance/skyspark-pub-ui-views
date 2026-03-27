// components/CUP.js — Central Utility Plant section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.CUP = {
  _kpiRows: function (kpis) {
    return kpis.map(function (k) {
      return '<div class="kpi-row"><span class="kpi-name">' + k.name + '</span><span class="kpi-val ' + k.cls + '">' + k.val + '</span></div>';
    }).join('');
  },

  _panel: function (id, sys, activeClass) {
    var kpiRows = this._kpiRows(sys.kpis);
    var pumpLegendB = sys.pump.dataB
      ? '<span class="legend-item-sm"><span class="lsw" style="background:' + sys.pump.colorB + '"></span>' + sys.pump.legendB + '</span>'
      : '';
    var dtLegendB = sys.dt.legendB
      ? '<span class="legend-item-sm"><span class="lsw" style="background:#9CA3AF;opacity:0.5;"></span>' + sys.dt.legendB + '</span>'
      : '';
    return [
      '<div class="cup-panel ' + activeClass + '" id="cup-' + id + '">',
      '  <div class="card">',
      '    <div class="card-title">' + sys.pump.title.replace('Pump Speed', '').replace('DHW', 'Domestic HW').trim() + ' &mdash; Avg Output</div>',
      '    <div class="big-stat-num ' + (sys.avgOutputCls || 'blue') + '" style="margin:8px 0 4px;">' + sys.avgOutput + '</div>',
      '    <div class="big-stat-unit">' + sys.avgOutputUnit + '</div>',
      '    <div style="height:12px;"></div>',
      '    <div class="kpi-group">' + kpiRows + '</div>',
      '  </div>',
      '  <div class="card">',
      '    <div class="card-title">' + sys.pump.title + '</div>',
      '    <div class="card-sub">' + sys.pump.sub + '</div>',
      '    <div class="chart-h180"><canvas id="mbcxPump-' + id + '"></canvas></div>',
      '    <div class="legend-sm">',
      '      <span class="legend-item-sm"><span class="lsw" style="background:' + sys.pump.colorA + '"></span>' + sys.pump.legendA + '</span>',
      '      ' + pumpLegendB,
      '    </div>',
      '  </div>',
      '  <div class="card">',
      '    <div class="card-title">' + sys.dt.title + '</div>',
      '    <div class="card-sub">' + sys.dt.sub + '</div>',
      '    <div class="chart-h180"><canvas id="mbcxDt-' + id + '"></canvas></div>',
      '    <div class="legend-sm">',
      '      <span class="legend-item-sm"><span class="lsw" style="background:' + sys.dt.color + '"></span>' + sys.dt.legendA + '</span>',
      '      ' + dtLegendB,
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  },

  render: function (d) {
    var cup = d.cup;
    var self = this;
    var panels = [
      self._panel('cooling',  cup.cooling,  'active'),
      self._panel('heating',  cup.heating,  ''),
      self._panel('condenser',cup.condenser,''),
      self._panel('dhw',      cup.dhw,      '')
    ].join('\n');
    return [
      '<div class="equip-section">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:#EDE9FE;">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Central Utility Plant</div><div class="equip-meta">Chillers &middot; Heating &middot; Condenser &middot; Domestic Hot Water</div></div>',
      '    </div>',
      '  </div>',
      '  <div class="toggle-bar" id="mbcxCupToggle">',
      '    <button class="toggle-btn active" data-cup="cooling">Cooling</button>',
      '    <button class="toggle-btn" data-cup="heating">Heating</button>',
      '    <button class="toggle-btn" data-cup="condenser">Condenser</button>',
      '    <button class="toggle-btn" data-cup="dhw">Domestic HW</button>',
      '  </div>',
      panels,
      '</div>'
    ].join('\n');
  }
};
