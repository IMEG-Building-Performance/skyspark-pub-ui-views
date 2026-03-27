// components/TerminalUnits.js — VAV Terminal Units section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.TerminalUnits = {
  render: function (d) {
    var tu = d.terminalUnits;
    var co = tu.compliance;
    var op = tu.operation;
    var en = tu.energy;
    var cm = tu.comfort;

    var faultRows = op.faults.map(function (f) {
      return [
        '<div class="fault-row">',
        '  <span class="sev-dot sev-' + f.sev + '"></span>',
        '  <div><div class="fr-equip">' + f.equip + '</div><div class="fr-desc">' + f.desc + '</div></div>',
        '  <span class="fr-dur">' + f.dur + '</span>',
        '</div>'
      ].join('');
    }).join('');

    return [
      '<div class="equip-section">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--orange-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Terminal Units</div><div class="equip-meta">' + tu.totalVavs + ' VAVs &nbsp;&middot;&nbsp; Compliance &middot; Operation &middot; Energy &middot; Comfort</div></div>',
      '    </div>',
      '  </div>',
      '  <div class="grid-4" style="margin-bottom:8px;">',
      '    <div class="dim-label">Compliance</div>',
      '    <div class="dim-label">Operation</div>',
      '    <div class="dim-label">Energy</div>',
      '    <div class="dim-label">Comfort</div>',
      '  </div>',
      '  <div class="grid-4">',

      // Compliance
      '    <div class="card">',
      '      <div class="card-title">Critical Space Coverage</div>',
      '      <div class="card-sub">% of critical zones with active monitoring &amp; no open faults</div>',
      '      <div class="big-stat-num ok" style="margin:10px 0 4px;">' + co.coveragePct + '%</div>',
      '      <div class="big-stat-unit">of critical spaces compliant</div>',
      '      <div style="height:10px;"></div>',
      '      <div class="kpi-group">',
      '        <div class="kpi-row"><span class="kpi-name">Critical Zones</span><span class="kpi-val">' + co.criticalZones + '</span></div>',
      '        <div class="kpi-row"><span class="kpi-name">Compliant</span><span class="kpi-val ok">' + co.compliant + '</span></div>',
      '        <div class="kpi-row"><span class="kpi-name">With Open Fault</span><span class="kpi-val neg">' + co.openFaults + '</span></div>',
      '        <div class="kpi-row"><span class="kpi-name">No Data</span><span class="kpi-val warn">' + co.noData + '</span></div>',
      '      </div>',
      '      <div class="prog-strip" style="margin-top:12px;"><div class="prog-fill" style="width:' + co.coveragePct + '%;background:var(--imeg-green);opacity:0.7;"></div></div>',
      '    </div>',

      // Operation
      '    <div class="card">',
      '      <div class="card-title">Fault Count</div>',
      '      <div class="card-sub">Active faults by type &mdash; fleet of ' + tu.totalVavs + ' VAVs</div>',
      '      <div style="display:flex;gap:14px;margin:10px 0 14px;">',
      '        <div><div class="big-stat-num neg" style="font-size:36px;">' + op.faultyReheat + '</div><div class="big-stat-unit">Faulty Reheat</div></div>',
      '        <div style="width:1px;background:var(--gray-200);"></div>',
      '        <div><div class="big-stat-num warn" style="font-size:36px;">' + op.leakingValves + '</div><div class="big-stat-unit">Leaking Valve</div></div>',
      '      </div>',
      '      <div class="fault-rows">' + faultRows + '</div>',
      '    </div>',

      // Energy
      '    <div class="card">',
      '      <div class="card-title">Reheat &amp; Flow</div>',
      '      <div class="card-sub">Fleet totals this period</div>',
      '      <div class="kpi-group" style="margin-bottom:14px;">',
      '        <div class="kpi-row"><span class="kpi-name">Total Reheat kWh</span><span class="kpi-val neg">' + en.totalReheatKwh.toLocaleString() + '<span class="kpi-unit-sm">kWh</span></span></div>',
      '        <div class="kpi-row"><span class="kpi-name">From Faulty Reheat</span><span class="kpi-val neg">' + en.faultyReheatKwh.toLocaleString() + '<span class="kpi-unit-sm">kWh</span></span></div>',
      '        <div class="kpi-row"><span class="kpi-name">From Leaking Valves</span><span class="kpi-val warn">' + en.leakingValveKwh.toLocaleString() + '<span class="kpi-unit-sm">kWh</span></span></div>',
      '        <div class="kpi-row"><span class="kpi-name">Fleet Avg Flow</span><span class="kpi-val blue">' + en.fleetAvgFlowCfm + '<span class="kpi-unit-sm">cfm</span></span></div>',
      '        <div class="kpi-row"><span class="kpi-name">Max Zone Flow</span><span class="kpi-val warn">' + en.maxZoneFlow + '</span></div>',
      '      </div>',
      '      <div class="chart-h120"><canvas id="mbcxReheatChart"></canvas></div>',
      '    </div>',

      // Comfort
      '    <div class="card">',
      '      <div class="card-title">Zone Comfort</div>',
      '      <div class="card-sub">Avg temp &amp; humidity &mdash; ' + tu.totalVavs + ' zones</div>',
      '      <div style="display:flex;gap:14px;margin:10px 0 14px;">',
      '        <div><div class="big-stat-num blue" style="font-size:36px;">' + cm.avgTempF + '</div><div class="big-stat-unit">&deg;F avg zone temp</div></div>',
      '        <div style="width:1px;background:var(--gray-200);"></div>',
      '        <div><div class="big-stat-num warn" style="font-size:36px;">' + cm.avgRhPct + '%</div><div class="big-stat-unit">avg relative humidity</div></div>',
      '      </div>',
      '      <div class="kpi-group">',
      '        <div class="kpi-row"><span class="kpi-name">Zones in range</span><span class="kpi-val ok">' + cm.zonesInRange + ' / ' + tu.totalVavs + '</span></div>',
      '        <div class="kpi-row"><span class="kpi-name">Too warm (&gt;75&deg;F)</span><span class="kpi-val neg">' + cm.tooWarm + '<span class="kpi-unit-sm">zones</span></span></div>',
      '        <div class="kpi-row"><span class="kpi-name">Too cool (&lt;68&deg;F)</span><span class="kpi-val blue">' + cm.tooCool + '<span class="kpi-unit-sm">zones</span></span></div>',
      '        <div class="kpi-row"><span class="kpi-name">RH out of range</span><span class="kpi-val warn">' + cm.rhOutOfRange + '<span class="kpi-unit-sm">zones</span></span></div>',
      '      </div>',
      '    </div>',

      '  </div>',
      '</div>'
    ].join('\n');
  }
};
