// components/CUPPlantDetail.js — Plant-level drill-down (Cooling / Heating / Condenser / DHW)
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  // ── Demo data ────────────────────────────────────────────────────────────
  var _DEMO = {
    cooling: {
      systemLabel: 'Cooling',
      title: 'Chilled Water System',
      subtitle: 'Chillers · CHW pumps · Distribution',
      accentColor: '#4a90a4',
      iconBg: '#eaf2f5',
      iconSvg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 8l7 4 7-4M5 16l7-4 7 4"/></svg>',
      summaryPills: ['Chillers <strong>3&thinsp;/&thinsp;4</strong> running', 'Plant load <strong>72%</strong>'],
      loopLabel: 'Chilled Water Loop',
      loopStats: [
        { label: 'Supply (CHWS)', value: '44.2', unit: '°F' },
        { label: 'Return (CHWR)', value: '56.1', unit: '°F' },
        { label: 'Setpoint',      value: '44.0', unit: '°F', muted: true },
        { label: 'System ΔT',     value: '11.9', unit: '°F' },
        { label: 'System Flow',   value: '2,355', unit: ' gpm' }
      ],
      equipGroups: [
        {
          label: 'Chillers', note: '— click for detail',
          items: [
            { name: 'CH-01', type: 'Centrifugal', status: 'running',  metricValue: '72.0', metricUnit: '% load', barPct: 72,   sub: [{ k: 'LWT', v: '44.1°' }, { k: 'EWT', v: '56.3°' }], hasDetail: true },
            { name: 'CH-02', type: 'Centrifugal', status: 'running',  metricValue: '68.0', metricUnit: '% load', barPct: 68,   sub: [{ k: 'LWT', v: '44.4°' }, { k: 'EWT', v: '55.8°' }], hasDetail: true },
            { name: 'CH-03', type: 'Centrifugal', status: 'standby',  metricValue:  '0.0', metricUnit: '% load', barPct: 0,    sub: [{ k: 'LWT', v: '—' },     { k: 'EWT', v: '—' }],     hasDetail: false },
            { name: 'CH-04', type: 'Centrifugal', status: 'running',  metricValue: '75.8', metricUnit: '% load', barPct: 75.8, sub: [{ k: 'LWT', v: '42.0°' }, { k: 'EWT', v: '51.3°' }], hasDetail: true }
          ]
        },
        {
          label: 'Chilled Water Pumps',
          items: [
            { name: 'CHWP-1', type: 'Primary · Lead',    status: 'running', metricValue: '78', metricUnit: '% speed', barPct: 78, sub: [{ k: 'Flow', v: '1,180 gpm' }], hasDetail: false },
            { name: 'CHWP-2', type: 'Primary · Lag',     status: 'running', metricValue: '78', metricUnit: '% speed', barPct: 78, sub: [{ k: 'Flow', v: '1,175 gpm' }], hasDetail: false },
            { name: 'CHWP-3', type: 'Primary · Standby', status: 'off',     metricValue:  '0', metricUnit: '% speed', barPct: 0,  sub: [{ k: 'Flow', v: '0 gpm' }],      hasDetail: false }
          ]
        },
        {
          label: 'Valves & Pressure',
          items: [
            { name: 'CHW Bypass', type: 'Modulating valve',     status: null, metricValue: '12',   metricUnit: '% open', barPct: 12, sub: [{ k: 'Mode', v: 'Auto' }],    hasDetail: false },
            { name: 'Loop DP',    type: 'Plant sensor',         status: null, metricValue: '12.4', metricUnit: 'psi',    barPct: 62, sub: [{ k: 'SP', v: '12.0 psi' }], hasDetail: false },
            { name: 'Remote DP',  type: 'Critical zone sensor', status: null, metricValue:  '8.6', metricUnit: 'psi',    barPct: 72, sub: [{ k: 'SP', v: '8.0 psi' }],  hasDetail: false }
          ]
        }
      ]
    },

    heating: {
      systemLabel: 'Heating',
      title: 'Hot Water System',
      subtitle: 'Boilers · HW pumps · Distribution',
      accentColor: '#c0392b',
      iconBg: '#fbeae8',
      iconSvg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 0-6 4-6 10a6 6 0 0012 0c0-6-6-10-6-10z"/><path d="M12 12c0 0-3 2-3 5a3 3 0 006 0c0-3-3-5-3-5z"/></svg>',
      summaryPills: ['Boilers <strong>1&thinsp;/&thinsp;2</strong> running', 'Plant load <strong>54%</strong>'],
      loopLabel: 'Hot Water Loop',
      loopStats: [
        { label: 'Supply (HWST)', value: '162.4', unit: '°F' },
        { label: 'Return (HWRT)', value: '148.7', unit: '°F' },
        { label: 'Setpoint',      value: '160.0', unit: '°F', muted: true },
        { label: 'System ΔT',     value: '13.7',  unit: '°F' }
      ],
      equipGroups: [
        {
          label: 'Boilers', note: '— click for detail',
          items: [
            { name: 'BLR-01', type: 'Fire-tube · 4,000 MBH', status: 'running', metricValue: '68', metricUnit: '% load', barPct: 68, sub: [{ k: 'AFUE', v: '81%' },  { k: 'HHW Out', v: '162.4°' }], hasDetail: true },
            { name: 'BLR-02', type: 'Fire-tube · 4,000 MBH', status: 'off',     metricValue:  '0', metricUnit: '% load', barPct: 0,  sub: [{ k: 'AFUE', v: '—' },   { k: 'HHW Out', v: '—' }],       hasDetail: false }
          ]
        },
        {
          label: 'Hot Water Pumps',
          items: [
            { name: 'HWP-1', type: 'Primary · Lead',    status: 'running', metricValue: '64', metricUnit: '% speed', barPct: 64, sub: [{ k: 'DP', v: '18.2 psi' }], hasDetail: false },
            { name: 'HWP-2', type: 'Primary · Standby', status: 'off',     metricValue:  '0', metricUnit: '% speed', barPct: 0,  sub: [{ k: 'DP', v: '0 psi' }],    hasDetail: false }
          ]
        }
      ]
    },

    condenser: {
      systemLabel: 'Condenser Water',
      title: 'Condenser Water System',
      subtitle: 'Cooling towers · CW pumps · Distribution',
      accentColor: '#4a5568',
      iconBg: '#edf0f4',
      iconSvg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      summaryPills: ['Towers <strong>2&thinsp;/&thinsp;3</strong> running', 'Approach <strong>7.2°F</strong>'],
      loopLabel: 'Condenser Water Loop',
      loopStats: [
        { label: 'Supply (CWS)', value: '82.1',  unit: '°F' },
        { label: 'Return (CWR)', value: '74.6',  unit: '°F' },
        { label: 'WB Temp',      value: '68.4',  unit: '°F', muted: true },
        { label: 'System ΔT',    value: '7.5',   unit: '°F' },
        { label: 'System Flow',  value: '3,120', unit: ' gpm' }
      ],
      equipGroups: [
        {
          label: 'Cooling Towers',
          items: [
            { name: 'CT-01', type: 'Induced draft', status: 'running', metricValue: '72', metricUnit: '% fan', barPct: 72, sub: [{ k: 'Approach', v: '7.2°F' }, { k: 'Basin', v: 'OK' }],   hasDetail: false },
            { name: 'CT-02', type: 'Induced draft', status: 'running', metricValue: '68', metricUnit: '% fan', barPct: 68, sub: [{ k: 'Approach', v: '7.4°F' }, { k: 'Basin', v: 'OK' }],   hasDetail: false },
            { name: 'CT-03', type: 'Induced draft', status: 'off',     metricValue:  '0', metricUnit: '% fan', barPct: 0,  sub: [{ k: 'Approach', v: '—' },     { k: 'Basin', v: 'Fill' }], hasDetail: false }
          ]
        },
        {
          label: 'Condenser Water Pumps',
          items: [
            { name: 'CDWP-1', type: 'Primary · Lead',    status: 'running', metricValue: '82', metricUnit: '% speed', barPct: 82, sub: [{ k: 'Flow', v: '1,580 gpm' }], hasDetail: false },
            { name: 'CDWP-2', type: 'Primary · Lag',     status: 'running', metricValue: '80', metricUnit: '% speed', barPct: 80, sub: [{ k: 'Flow', v: '1,540 gpm' }], hasDetail: false },
            { name: 'CDWP-3', type: 'Primary · Standby', status: 'off',     metricValue:  '0', metricUnit: '% speed', barPct: 0,  sub: [{ k: 'Flow', v: '0 gpm' }],      hasDetail: false }
          ]
        }
      ]
    },

    dhw: {
      systemLabel: 'DHW',
      title: 'Domestic Hot Water System',
      subtitle: 'DHW heaters · Distribution',
      accentColor: '#d4853f',
      iconBg: '#fdf2e8',
      iconSvg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8l2 6H6z"/><path d="M6 8v11a1 1 0 001 1h10a1 1 0 001-1V8"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>',
      summaryPills: ['Heaters <strong>1&thinsp;/&thinsp;1</strong> running', 'Supply <strong>138.5°F</strong>'],
      loopLabel: 'DHW Loop',
      loopStats: [
        { label: 'Supply Temp', value: '138.5', unit: '°F' },
        { label: 'Setpoint',    value: '135.0', unit: '°F', muted: true },
        { label: 'Avg Flow',    value: '14.2',  unit: ' gpm' }
      ],
      equipGroups: [
        {
          label: 'DHW Heaters',
          items: [
            { name: 'DHW-HTR-01', type: 'Gas-fired storage', status: 'running', metricValue: 'Active', metricUnit: '', barPct: 100, sub: [{ k: 'Supply', v: '138.5°F' }, { k: 'ΔT', v: '62°F' }], hasDetail: false }
          ]
        }
      ]
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _statusClass(s) {
    if (!s) return '';
    return s === 'running' ? 'cpd-run' : s === 'standby' ? 'cpd-standby' : 'cpd-off';
  }
  function _statusLabel(s) {
    if (!s) return '';
    return s === 'running' ? 'Running' : s === 'standby' ? 'Standby' : 'Off';
  }

  function _renderEquipCard(item, accent) {
    var sc   = _statusClass(item.status);
    var sl   = _statusLabel(item.status);
    var pct  = item.barPct != null ? item.barPct : 0;
    var subH = (item.sub || []).map(function (s) {
      return '<span><span class="cpd-k">' + s.k + '</span> ' + (s.v || '—') + '</span>';
    }).join('');
    var isLink = !!item.hasDetail;
    return '<div class="cpd-eq-card' + (isLink ? ' cpd-eq-card--link' : '') + '"' +
      (isLink ? ' data-equip="' + item.name + '"' : '') + '>' +
        '<div class="cpd-eq-top">' +
          '<div>' +
            '<div class="cpd-eq-name">' + item.name + '</div>' +
            '<div class="cpd-eq-type">' + (item.type || '') + '</div>' +
          '</div>' +
          (item.status
            ? '<span class="cpd-eq-status ' + sc + '">' +
                '<span class="cpd-eq-dot"></span>' + sl +
              '</span>'
            : '') +
        '</div>' +
        '<div class="cpd-eq-metric">' +
          '<span class="cpd-eq-big">' + (item.metricValue || '—') + '</span>' +
          (item.metricUnit ? '<span class="cpd-eq-unit"> ' + item.metricUnit + '</span>' : '') +
        '</div>' +
        '<div class="cpd-eq-bar"><span class="cpd-eq-bar-fill" style="width:' + pct + '%;background:' + accent + ';"></span></div>' +
        '<div class="cpd-eq-sub">' + subH + '</div>' +
        (isLink ? '<span class="cpd-eq-chev">View detail →</span>' : '') +
      '</div>';
  }

  // ── HTML render ──────────────────────────────────────────────────────────
  function _render(systemKey) {
    var sd = _DEMO[systemKey];
    if (!sd) return '<div style="padding:2rem;color:#888">Unknown system: ' + systemKey + '</div>';
    var accent = sd.accentColor;

    var loopHtml = (sd.loopStats || []).map(function (ls) {
      return '<div class="cpd-loop-cell">' +
        '<div class="cpd-loop-l">' + ls.label + '</div>' +
        '<div class="cpd-loop-v' + (ls.muted ? ' cpd-muted' : '') + '">' +
          ls.value + '<span class="cpd-loop-u">' + ls.unit + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    var groupsHtml = (sd.equipGroups || []).map(function (grp) {
      var cards = (grp.items || []).map(function (item) {
        return _renderEquipCard(item, accent);
      }).join('');
      return '<div class="cpd-section-label">' +
          grp.label +
          (grp.note ? '<span class="cpd-section-count"> ' + grp.note + '</span>' : '') +
        '</div>' +
        '<div class="cpd-eq-grid">' + cards + '</div>';
    }).join('');

    var pillsHtml = (sd.summaryPills || []).map(function (p) {
      return '<span class="cpd-summary-pill">' + p + '</span>';
    }).join('');

    return '<div class="cpd-breadcrumb">' +
        '<button class="cpd-back-btn" id="cpdBackBtn">← Central Utility Plant</button>' +
        '<span class="cpd-sep">/</span>' +
        '<span class="cpd-current">' + sd.systemLabel + ' · Plant Details</span>' +
      '</div>' +
      '<div class="cpd-header">' +
        '<div class="cpd-header-left">' +
          '<div class="cpd-plant-icon" style="background:' + sd.iconBg + ';color:' + accent + ';">' + sd.iconSvg + '</div>' +
          '<div>' +
            '<div class="cpd-title">' + sd.title + '</div>' +
            '<div class="cpd-sub">' + sd.subtitle + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cpd-header-right">' +
          '<span class="cpd-sys-pill" style="background:' + accent + ';">' + sd.systemLabel + '</span>' +
          pillsHtml +
        '</div>' +
      '</div>' +
      '<div class="cpd-body">' +
        '<div class="cpd-section-label">' + sd.loopLabel + '</div>' +
        '<div class="cpd-loop-row" style="border-top-color:' + accent + ';">' + loopHtml + '</div>' +
        groupsHtml +
      '</div>';
  }

  // ── Public API ───────────────────────────────────────────────────────────
  NS.components.CUPPlantDetail = {
    show: function (container, systemKey, co, data, ctx) {
      var content = container.querySelector('#mbcxContent');
      content.classList.remove('dash-content--fixed');
      content.innerHTML = '<div class="cpd-page">' + _render(systemKey) + '</div>';

      var backBtn = content.querySelector('#cpdBackBtn');
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          NS.App._showTab(container, 'summary', co, data || NS.demoData || {}, ctx || {});
        });
      }

      content.querySelectorAll('.cpd-eq-card--link').forEach(function (card) {
        card.addEventListener('click', function () {
          var equipName = card.getAttribute('data-equip');
          NS.App.showCupEquipDetail(container, equipName, systemKey, co, data, ctx);
        });
      });
    }
  };

})(window.mbcxDashboard);
