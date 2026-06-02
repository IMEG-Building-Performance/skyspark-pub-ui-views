// components/CUPEquipDetail.js — Equipment-level drill-down (Chiller / Boiler / etc.)
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  var _DEMO = {
    'cooling.CH-01': {
      equipLabel: 'CH-01',
      title: 'Chiller 1',
      titleSub: 'CH-01 · Central',
      subtitle: 'Central Utility Plant · Water-cooled centrifugal',
      status: 'running',
      kpis: [
        { label: 'Running Capacity',      value: '72.0',  unit: '%',   foot: 'Part-load operation',     footClass: '' },
        { label: 'Power Draw',            value: '395.2', unit: 'kW',  foot: '5.49 kW per % output',   footClass: '' },
        { label: 'CHW Supply / Setpoint', value: '44.1',  unit: '°F',  foot: '+0.1°F above setpoint',  footClass: 'warn' },
        { label: 'Compressor Lift',       value: '49',    unit: '°F',  foot: 'Sat cond − sat evap',     footClass: '' }
      ],
      diagnostics: [
        { metric: 'Evaporator Approach',     value: '2.1°F',  bench: '1–3°F',   status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Condenser Approach',      value: '2.2°F',  bench: '1–3°F',   status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Evaporator Range (ΔT)',   value: '12.2°F', bench: '8–14°F',  status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Condenser Range (ΔT)',    value: '9.1°F',  bench: '8–12°F',  status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Phase Current Imbalance', value: '2.1%',   bench: '< 10%',   status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Sat Temp Data Quality',   value: 'Good',   bench: '—',       status: 'ok',    statusLabel: 'Normal' }
      ],
      tempBlocks: [
        {
          name: 'Evaporator', approach: 'Approach 2.1°F',
          waterIn:  { label: 'Water In',  val: '56.3°', cls: 'warm' },
          waterOut: { label: 'Water Out', val: '44.1°', cls: 'cold' },
          refrig:   { label: 'Sat Refrig', val: '~42°' }
        },
        {
          name: 'Condenser', approach: 'Approach 2.2°F',
          waterIn:  { label: 'Water In',  val: '78.4°', cls: 'cold' },
          waterOut: { label: 'Water Out', val: '85.5°', cls: 'warm' },
          refrig:   { label: 'Sat Refrig', val: '~87.7°' }
        }
      ],
      findings: [
        { cls: '', title: 'Setpoint Control Good',     body: 'CHW supply is maintaining close to the 44.0°F setpoint. Minor 0.1°F deviation is well within normal variance.' },
        { cls: '', title: 'Evaporator Approach Normal', body: 'Evaporator approach of 2.1°F is within benchmark range. Heat transfer on the chilled water side is efficient.' },
        { cls: '', title: 'Condenser Approach Normal', body: 'Condenser approach of 2.2°F is well within the 1–3°F normal band. No scaling or fouling concerns indicated.' },
        { cls: '', title: 'Electrical Balanced',       body: 'Phase current imbalance of 2.1% is well under the 10% threshold. No electrical concerns.' }
      ]
    },

    'cooling.CH-02': {
      equipLabel: 'CH-02',
      title: 'Chiller 2',
      titleSub: 'CH-02 · Central',
      subtitle: 'Central Utility Plant · Water-cooled centrifugal',
      status: 'running',
      kpis: [
        { label: 'Running Capacity',      value: '68.0',  unit: '%',   foot: 'Part-load operation',    footClass: '' },
        { label: 'Power Draw',            value: '374.0', unit: 'kW',  foot: '5.50 kW per % output',  footClass: '' },
        { label: 'CHW Supply / Setpoint', value: '44.4',  unit: '°F',  foot: '+0.4°F above setpoint', footClass: 'warn' },
        { label: 'Compressor Lift',       value: '48',    unit: '°F',  foot: 'Sat cond − sat evap',    footClass: '' }
      ],
      diagnostics: [
        { metric: 'Evaporator Approach',     value: '2.3°F',  bench: '1–3°F',   status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Condenser Approach',      value: '1.8°F',  bench: '1–3°F',   status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Evaporator Range (ΔT)',   value: '11.4°F', bench: '8–14°F',  status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Condenser Range (ΔT)',    value: '7.2°F',  bench: '8–12°F',  status: 'watch', statusLabel: 'Low' },
        { metric: 'Phase Current Imbalance', value: '1.7%',   bench: '< 10%',   status: 'ok',    statusLabel: 'Normal' },
        { metric: 'CHW Supply Deviation',    value: '0.4°F',  bench: '< 0.5°F', status: 'watch', statusLabel: 'Watch' }
      ],
      tempBlocks: [
        {
          name: 'Evaporator', approach: 'Approach 2.3°F',
          waterIn:  { label: 'Water In',  val: '55.8°', cls: 'warm' },
          waterOut: { label: 'Water Out', val: '44.4°', cls: 'cold' },
          refrig:   { label: 'Sat Refrig', val: '~42.1°' }
        },
        {
          name: 'Condenser', approach: 'Approach 1.8°F',
          waterIn:  { label: 'Water In',  val: '78.1°', cls: 'cold' },
          waterOut: { label: 'Water Out', val: '85.3°', cls: 'warm' },
          refrig:   { label: 'Sat Refrig', val: '~87.1°' }
        }
      ],
      findings: [
        { cls: 'watch', title: 'CHW Supply Slightly Above Setpoint', body: 'Supply of 44.4°F is 0.4°F above the 44.0°F setpoint. Not a fault, but worth monitoring over the next few days to confirm it is not trending higher.' },
        { cls: '',      title: 'Evaporator Normal',      body: 'Evaporator approach of 2.3°F sits well within the benchmark. No evidence of fouling on the chilled water side.' },
        { cls: 'watch', title: 'Condenser Range Slightly Low', body: 'Condenser ΔT of 7.2°F is below the 8–12°F typical range, suggesting higher-than-design condenser flow. Review tower and pump staging.' },
        { cls: '',      title: 'Electrical Balanced',    body: 'Phase current imbalance of 1.7% is well under the 10% threshold. No electrical concerns.' }
      ]
    },

    'cooling.CH-04': {
      equipLabel: 'CH-04',
      title: 'Chiller 4',
      titleSub: 'CH-04 · 110002',
      subtitle: 'Central Utility Plant · Water-cooled centrifugal',
      status: 'running',
      kpis: [
        { label: 'Running Capacity',      value: '75.8',  unit: '%',   foot: 'Part-load operation',           footClass: '' },
        { label: 'Power Draw',            value: '415.9', unit: 'kW',  foot: '5.49 kW per % output',         footClass: '' },
        { label: 'CHW Supply / Setpoint', value: '42.0',  unit: '°F',  foot: 'On setpoint · 0.0°F deviation', footClass: 'good' },
        { label: 'Compressor Lift',       value: '51',    unit: '°F',  foot: 'Sat cond − sat evap',            footClass: '' }
      ],
      diagnostics: [
        { metric: 'Evaporator Approach',     value: '2.0°F', bench: '1–3°F',   status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Condenser Approach',      value: '3.0°F', bench: '1–3°F',   status: 'watch', statusLabel: 'Watch' },
        { metric: 'Evaporator Range (ΔT)',   value: '9.3°F', bench: '8–14°F',  status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Condenser Range (ΔT)',    value: '7.4°F', bench: '8–12°F',  status: 'watch', statusLabel: 'Low' },
        { metric: 'Phase Current Imbalance', value: '3.4%',  bench: '< 10%',   status: 'ok',    statusLabel: 'Normal' },
        { metric: 'Sat Temp Data Quality',   value: '—',     bench: '—',       status: 'flag',  statusLabel: 'Review' }
      ],
      tempBlocks: [
        {
          name: 'Evaporator', approach: 'Approach 2.0°F',
          waterIn:  { label: 'Water In',  val: '51.3°', cls: 'warm' },
          waterOut: { label: 'Water Out', val: '42.0°', cls: 'cold' },
          refrig:   { label: 'Sat Refrig', val: '~40°' }
        },
        {
          name: 'Condenser', approach: 'Approach 3.0°F',
          waterIn:  { label: 'Water In',  val: '80.6°', cls: 'cold' },
          waterOut: { label: 'Water Out', val: '88.0°', cls: 'warm' },
          refrig:   { label: 'Sat Refrig', val: '~91°' }
        }
      ],
      findings: [
        { cls: '',      title: 'Setpoint Control Tight',            body: 'CHW supply is holding exactly at the 42.0°F setpoint. No overshoot or hunting — the controller is maintaining stable discharge with no energy penalty.' },
        { cls: '',      title: 'Evaporator Transferring Well',      body: 'Evaporator approach of 2.0°F sits mid-benchmark. Tubes appear clean and heat transfer is efficient on the chilled water side.' },
        { cls: 'watch', title: 'Condenser Approach at Upper Edge',  body: 'Condenser approach of 3.0°F is at the top of the normal band. Not a fault, but worth trending — a steady climb over weeks would point to tube fouling or scaling.' },
        { cls: 'watch', title: 'Condenser Range Slightly Low',      body: 'Condenser ΔT of 7.4°F is just below the typical range, which can indicate higher-than-design condenser water flow. Confirm tower and pump staging.' },
        { cls: 'flag',  title: 'Saturated Temp Point Needs Review', body: 'The trended saturated refrigerant temps disagree with pressure-derived values, producing non-physical approach readings. Validate the sat-temp points or trend approach from pressure until resolved.' },
        { cls: '',      title: 'Electrical Balanced',               body: 'Line currents (574 / 580 / 594 A) are within 3.4% — well under the 10% imbalance threshold. No phase or motor concern indicated.' }
      ]
    },

    'heating.BLR-01': {
      equipLabel: 'BLR-01',
      title: 'Boiler 1',
      titleSub: 'BLR-01 · Fire-tube',
      subtitle: 'Central Utility Plant · Fire-tube · 4,000 MBH',
      status: 'running',
      kpis: [
        { label: 'Firing Rate',          value: '68',    unit: '%',   foot: 'Part-load operation',    footClass: '' },
        { label: 'Gas Input',            value: '2,720', unit: 'MBH', foot: 'of 4,000 MBH rated',    footClass: '' },
        { label: 'HW Supply / Setpoint', value: '162.4', unit: '°F',  foot: '+2.4°F above setpoint', footClass: 'warn' },
        { label: 'AFUE',                 value: '81',    unit: '%',   foot: 'Thermal efficiency',     footClass: '' }
      ],
      diagnostics: [
        { metric: 'Combustion Air Temp',   value: '68°F',   bench: '50–90°F',   status: 'ok', statusLabel: 'Normal' },
        { metric: 'Stack Temp Rise',       value: '242°F',  bench: '180–280°F', status: 'ok', statusLabel: 'Normal' },
        { metric: 'Firing Rate',           value: '68%',    bench: '30–100%',   status: 'ok', statusLabel: 'Normal' },
        { metric: 'Supply Temp Deviation', value: '2.4°F',  bench: '< 5°F',     status: 'ok', statusLabel: 'Normal' },
        { metric: 'Low Water Cutoff',      value: 'Tested', bench: '—',         status: 'ok', statusLabel: 'OK' },
        { metric: 'AFUE Trend',            value: '81%',    bench: '> 78%',     status: 'ok', statusLabel: 'Normal' }
      ],
      tempBlocks: [
        {
          name: 'Hot Water Loop', approach: 'ΔT 13.7°F',
          waterIn:  { label: 'Return (HWRT)', val: '148.7°', cls: 'cold' },
          waterOut: { label: 'Supply (HWST)', val: '162.4°', cls: 'warm' },
          refrig:   { label: 'Setpoint',      val: '160.0°' }
        }
      ],
      findings: [
        { cls: '',      title: 'Firing at Stable Rate',     body: 'Boiler is firing at 68% with no short-cycling detected. Part-load operation is within the expected range for the heating load.' },
        { cls: 'watch', title: 'Supply Temp Slightly High', body: 'HW supply of 162.4°F is 2.4°F above the 160°F setpoint. Still within normal limits (±5°F), but worth monitoring for an upward trend.' },
        { cls: '',      title: 'Stack Temp Normal',         body: 'Stack temperature rise of 242°F is within the 180–280°F benchmark. No flue gas concerns or scaling blockage indicated.' },
        { cls: '',      title: 'Efficiency Acceptable',     body: 'AFUE of 81% is above the minimum 78% threshold. Combustion air temp and firing rate are both in normal bands.' }
      ]
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _chipCls(s) {
    if (s === 'watch') return 'ced-chip-watch';
    if (s === 'flag')  return 'ced-chip-flag';
    return 'ced-chip-ok';
  }

  function _renderTempBlock(tb) {
    return '<div class="ced-temp-block">' +
      '<div class="ced-temp-head">' +
        '<span class="ced-temp-head-name">' + tb.name + '</span>' +
        '<span class="ced-temp-head-approach">' + tb.approach + '</span>' +
      '</div>' +
      '<div class="ced-temp-flow">' +
        '<div class="ced-temp-cell ' + (tb.waterIn.cls || '') + '">' +
          '<div class="tlabel">' + tb.waterIn.label + '</div>' +
          '<div class="tval">' + tb.waterIn.val + '</div>' +
        '</div>' +
        '<div class="ced-temp-arrow">→</div>' +
        '<div class="ced-temp-cell ' + (tb.waterOut.cls || '') + '">' +
          '<div class="tlabel">' + tb.waterOut.label + '</div>' +
          '<div class="tval">' + tb.waterOut.val + '</div>' +
        '</div>' +
        '<div class="ced-temp-divider"></div>' +
        '<div class="ced-temp-cell refrig">' +
          '<div class="tlabel">' + tb.refrig.label + '</div>' +
          '<div class="tval">' + tb.refrig.val + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function _render(ed, systemLabel) {
    var statusCls   = ed.status === 'running' ? 'ced-status-run' : 'ced-status-off';
    var statusLabel = ed.status === 'running' ? 'Running' : 'Off';

    var kpiHtml = (ed.kpis || []).map(function (k) {
      return '<div class="ced-stat">' +
        '<div class="ced-stat-label">' + k.label + '</div>' +
        '<div class="ced-stat-value">' + k.value + '<span class="ced-stat-u"> ' + k.unit + '</span></div>' +
        (k.foot ? '<div class="ced-stat-foot ' + (k.footClass || '') + '">' + k.foot + '</div>' : '') +
      '</div>';
    }).join('');

    var diagRows = (ed.diagnostics || []).map(function (d) {
      return '<tr>' +
        '<td class="metric">' + d.metric + '</td>' +
        '<td class="r">' + d.value + '</td>' +
        '<td class="r" style="color:var(--gray-400)">' + d.bench + '</td>' +
        '<td class="r"><span class="ced-chip ' + _chipCls(d.status) + '">' + d.statusLabel + '</span></td>' +
      '</tr>';
    }).join('');

    var tempHtml = (ed.tempBlocks || []).map(_renderTempBlock).join('');

    var findingsHtml = (ed.findings || []).map(function (f) {
      return '<div class="ced-finding ' + (f.cls || '') + '">' +
        '<h4>' + f.title + '</h4>' +
        '<p>' + f.body + '</p>' +
      '</div>';
    }).join('');

    return '<div class="ced-breadcrumb">' +
        '<button class="ced-back-btn" id="cedBackBtn">← ' + (systemLabel || 'Plant Details') + '</button>' +
        '<span class="ced-sep">/</span>' +
        '<span class="ced-current">' + ed.equipLabel + ' Detail</span>' +
      '</div>' +
      '<div class="ced-header">' +
        '<div class="ced-header-left">' +
          '<div class="ced-equip-icon">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 4v16"/>' +
            '</svg>' +
          '</div>' +
          '<div>' +
            '<div class="ced-title">' + ed.title +
              ' <span style="color:var(--gray-400);font-weight:500;font-size:14px">' + ed.titleSub + '</span>' +
            '</div>' +
            '<div class="ced-sub">' + ed.subtitle + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ced-header-right">' +
          '<span class="ced-status-pill ' + statusCls + '">' +
            '<span class="ced-status-dot"></span>' + statusLabel +
          '</span>' +
          '<span class="ced-date-badge">Last 24 hours</span>' +
        '</div>' +
      '</div>' +
      '<div class="ced-body">' +
        '<div class="ced-section-label">Operating Snapshot</div>' +
        '<div class="ced-stat-row">' + kpiHtml + '</div>' +

        '<div class="ced-section-label">Diagnostics</div>' +
        '<div class="ced-cols">' +
          '<div class="ced-panel">' +
            '<div class="ced-panel-title">Performance Metrics</div>' +
            '<div class="ced-panel-note">Derived from water temps and saturated refrigerant temps</div>' +
            '<table class="ced-diag-table">' +
              '<thead><tr>' +
                '<th>Metric</th><th class="r">Value</th><th class="r">Benchmark</th><th class="r">Status</th>' +
              '</tr></thead>' +
              '<tbody>' + diagRows + '</tbody>' +
            '</table>' +
          '</div>' +
          '<div class="ced-panel">' +
            '<div class="ced-panel-title">Water &amp; Refrigerant Temperatures</div>' +
            '<div class="ced-panel-note">Heat moves from warmer to cooler across each barrel</div>' +
            tempHtml +
          '</div>' +
        '</div>' +

        '<div class="ced-section-label">Diagnostic Findings</div>' +
        '<div class="ced-findings">' + findingsHtml + '</div>' +
      '</div>';
  }

  // ── Public API ───────────────────────────────────────────────────────────
  NS.components.CUPEquipDetail = {
    show: function (container, equipName, systemKey, co, data, ctx) {
      var key = systemKey + '.' + equipName;
      var ed  = _DEMO[key];
      var content = container.querySelector('#mbcxContent');
      content.classList.remove('dash-content--fixed');

      if (!ed) {
        content.innerHTML = '<div class="ced-page"><div style="padding:2rem;color:var(--gray-400)">No detail data available for ' + key + '</div></div>';
        return;
      }

      var systemLabels = {
        cooling:   'Chilled Water System',
        heating:   'Hot Water System',
        condenser: 'Condenser Water System',
        dhw:       'DHW System'
      };
      var systemLabel = systemLabels[systemKey] || 'Plant Details';

      content.innerHTML = '<div class="ced-page">' + _render(ed, systemLabel) + '</div>';

      var backBtn = content.querySelector('#cedBackBtn');
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          NS.App.showCupPlantDetail(container, systemKey, co, data, ctx);
        });
      }
    }
  };

})(window.mbcxDashboard);
