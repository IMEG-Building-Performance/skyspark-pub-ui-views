// components/FaultList.js — MBCx Active Fault List section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

var FL_DEMO_FAULTS = [
  { id:1,  ts:'2026-03-24 14:32', equip:'AHU-1',      type:'AHU', fault:'Cooling valve stuck open — valve 94% at low load',     sev:'critical', dur:'4d 2h',  status:'Active' },
  { id:2,  ts:'2026-03-23 08:15', equip:'VAV-L1-02',  type:'VAV', fault:'Faulty reheat coil — SAT 95°F at low zone temp',        sev:'critical', dur:'5d 16h', status:'Active' },
  { id:3,  ts:'2026-03-19 09:00', equip:'CUP-CHW-1',  type:'CUP', fault:'Chiller differential pressure below threshold',          sev:'critical', dur:'10d 15h',status:'Active' },
  { id:4,  ts:'2026-03-25 09:00', equip:'VAV-L1-05',  type:'VAV', fault:'Faulty reheat coil — SAT 88°F, reheat valve 85%',        sev:'critical', dur:'3d 0h',  status:'Active' },
  { id:5,  ts:'2026-03-22 11:00', equip:'AHU-2',      type:'AHU', fault:'OA damper not responding to setpoint',                   sev:'warning',  dur:'6d 23h', status:'Active' },
  { id:6,  ts:'2026-03-26 07:30', equip:'VAV-L2-04',  type:'VAV', fault:'Leaking reheat valve — RH 88% at warm zone temp',        sev:'warning',  dur:'2d 16h', status:'Active' },
  { id:7,  ts:'2026-03-27 06:00', equip:'AHU-2',      type:'AHU', fault:'Discharge air temp elevated — 62°F setpoint',            sev:'warning',  dur:'1d 18h', status:'Active' },
  { id:8,  ts:'2026-03-26 11:00', equip:'VAV-L1-01',  type:'VAV', fault:'Zone temp above setpoint by 4°F for >2h occupied',       sev:'warning',  dur:'2d 13h', status:'Active' },
  { id:9,  ts:'2026-03-20 16:45', equip:'AHU-3',      type:'AHU', fault:'Supply air temp sensor drift — reading 12°F off avg',    sev:'warning',  dur:'9d 7h',  status:'Acknowledged' },
  { id:10, ts:'2026-03-21 13:15', equip:'AHU-1',      type:'AHU', fault:'VFD speed oscillation >15% within 5-min window',         sev:'warning',  dur:'8d 1h',  status:'Acknowledged' },
  { id:11, ts:'2026-03-28 05:00', equip:'VAV-L2-06',  type:'VAV', fault:'Damper at minimum — airflow 10 CFM vs 300 SP',           sev:'warning',  dur:'1d 0h',  status:'Active' },
  { id:12, ts:'2026-03-15 10:00', equip:'CUP-HW-1',   type:'CUP', fault:'HW supply temp below setpoint by 8°F',                   sev:'warning',  dur:'14d 4h', status:'Acknowledged' },
];

var FL_COLS = ['ts', 'equip', 'type', 'fault', 'sev', 'dur', 'status'];
var FL_LABELS = { ts:'Timestamp', equip:'Equipment', type:'Type', fault:'Fault', sev:'Severity', dur:'Duration', status:'Status' };

function _flSevOrder(s) { return s === 'critical' ? 0 : s === 'warning' ? 1 : 2; }

window.mbcxDashboard.components.FaultList = {

  _state: null,

  render: function () {
    return [
      '<div class="equip-section equip-section--collapsible" id="mbcxFaultListSection" style="border-left-color:#9B2335;">',
      '  <div class="equip-header equip-header--clickable" onclick="this.closest(\'.equip-section\').classList.toggle(\'equip-section--open\');">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--imeg-red-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9B2335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
      '          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      '        </svg>',
      '      </div>',
      '      <div><div class="equip-title">MBCx Fault List</div><div class="equip-meta" id="flMeta">Active faults</div></div>',
      '    </div>',
      '    <div class="equip-collapse-btn" title="Expand / Collapse">',
      '      <svg class="equip-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
      '    </div>',
      '  </div>',
      '  <div class="equip-body">',

      /* KPI strip */
      '    <div class="tu-kpi-strip fl-kpi-strip">',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Total Faults</div><div class="tu-kpi-val" id="flKpiTotal">&mdash;</div><div class="tu-kpi-unit">active</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Critical</div><div class="tu-kpi-val fl-kpi-critical" id="flKpiCritical">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Warnings</div><div class="tu-kpi-val fl-kpi-warning" id="flKpiWarning">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">AHU Faults</div><div class="tu-kpi-val" id="flKpiAhu">&mdash;</div><div class="tu-kpi-unit">units</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">VAV Faults</div><div class="tu-kpi-val" id="flKpiVav">&mdash;</div><div class="tu-kpi-unit">units</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Acknowledged</div><div class="tu-kpi-val" id="flKpiAck">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '    </div>',

      /* Filter bar */
      '    <div class="tu-filter-bar">',
      '      <input class="tu-filter-input" id="flFilterInput" type="text" placeholder="Filter faults…" autocomplete="off" />',
      '      <span class="tu-filter-count" id="flFilterCount"></span>',
      '    </div>',

      /* Fault table */
      '    <div style="overflow-x:auto;">',
      '      <table class="tu-table fl-table">',
      '        <thead id="flThead"></thead>',
      '        <tbody id="flTbody"></tbody>',
      '      </table>',
      '    </div>',

      '  </div>',
      '</div>'
    ].join('\n');
  },

  renderPage: function () {
    return [
      '<div class="fl-page">',
      '  <div class="fl-page-header">',
      '    <div class="fl-page-title">MBCx Fault List</div>',
      '    <div class="fl-page-meta" id="flMeta">Active faults</div>',
      '  </div>',

      '  <div class="tu-kpi-strip fl-kpi-strip">',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Total Faults</div><div class="tu-kpi-val" id="flKpiTotal">&mdash;</div><div class="tu-kpi-unit">active</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Critical</div><div class="tu-kpi-val fl-kpi-critical" id="flKpiCritical">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Warnings</div><div class="tu-kpi-val fl-kpi-warning" id="flKpiWarning">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">AHU Faults</div><div class="tu-kpi-val" id="flKpiAhu">&mdash;</div><div class="tu-kpi-unit">units</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">VAV Faults</div><div class="tu-kpi-val" id="flKpiVav">&mdash;</div><div class="tu-kpi-unit">units</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Acknowledged</div><div class="tu-kpi-val" id="flKpiAck">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '  </div>',

      '  <div class="tu-filter-bar">',
      '    <input class="tu-filter-input" id="flFilterInput" type="text" placeholder="Filter faults…" autocomplete="off" />',
      '    <span class="tu-filter-count" id="flFilterCount"></span>',
      '  </div>',

      '  <div style="overflow-x:auto;">',
      '    <table class="tu-table fl-table">',
      '      <thead id="flThead"></thead>',
      '      <tbody id="flTbody"></tbody>',
      '    </table>',
      '  </div>',
      '</div>'
    ].join('\n');
  },

  initLive: function (container, ctx) {
    var self = this;
    var faults = FL_DEMO_FAULTS;

    /* KPIs */
    var active = faults.filter(function(f){ return f.status !== 'Acknowledged'; });
    var set = function(id, v){ var el = container.querySelector('#'+id); if(el) el.textContent = v; };
    set('flKpiTotal',    active.length);
    set('flKpiCritical', active.filter(function(f){ return f.sev==='critical'; }).length);
    set('flKpiWarning',  active.filter(function(f){ return f.sev==='warning';  }).length);
    set('flKpiAhu',      active.filter(function(f){ return f.type==='AHU'; }).length);
    set('flKpiVav',      active.filter(function(f){ return f.type==='VAV'; }).length);
    set('flKpiAck',      faults.filter(function(f){ return f.status==='Acknowledged'; }).length);
    set('flMeta',        active.length + ' active faults · ' + faults.filter(function(f){ return f.sev==='critical'; }).length + ' critical');

    /* Sort by severity then timestamp by default */
    var sorted = faults.slice().sort(function(a,b){
      var sd = _flSevOrder(a.sev) - _flSevOrder(b.sev);
      return sd !== 0 ? sd : b.ts.localeCompare(a.ts);
    });
    this._state = { rows: sorted, sortCol: null, sortDir: 1, filter: '' };

    this._buildTable(container);

    /* Filter */
    var filterInput = container.querySelector('#flFilterInput');
    if (filterInput) {
      filterInput.addEventListener('input', function(){
        self._state.filter = filterInput.value;
        self._rebuildTbody(container);
      });
    }
  },

  _buildTable: function (container) {
    var self = this;
    var thead = container.querySelector('#flThead');
    if (!thead) return;

    thead.innerHTML = '<tr>' + FL_COLS.map(function(k){
      return '<th class="tu-th tu-th-sort fl-th" data-col="' + k + '">' + FL_LABELS[k] + '<span class="tu-sort-ind" data-col="' + k + '"></span></th>';
    }).join('') + '</tr>';

    thead.querySelectorAll('.tu-th-sort').forEach(function(th){
      th.addEventListener('click', function(){
        var col = th.getAttribute('data-col');
        if (self._state.sortCol === col) { self._state.sortDir *= -1; }
        else { self._state.sortCol = col; self._state.sortDir = 1; }
        self._rebuildTbody(container);
      });
    });

    this._rebuildTbody(container);
  },

  _rebuildTbody: function (container) {
    var s = this._state;
    var rows = s.rows;

    if (s.filter) {
      var q = s.filter.toLowerCase();
      rows = rows.filter(function(r){
        return FL_COLS.some(function(k){ return String(r[k]).toLowerCase().indexOf(q) !== -1; });
      });
    }

    if (s.sortCol) {
      var col = s.sortCol, dir = s.sortDir;
      rows = rows.slice().sort(function(a, b){
        var av = a[col], bv = b[col];
        if (col === 'sev') { av = _flSevOrder(av); bv = _flSevOrder(bv); }
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    var tbody = container.querySelector('#flTbody');
    if (!tbody) return;
    tbody.innerHTML = rows.map(function(r){
      var sevBadge = r.sev === 'critical'
        ? '<span class="fl-badge fl-badge-critical">Critical</span>'
        : '<span class="fl-badge fl-badge-warning">Warning</span>';
      var statusBadge = r.status === 'Active'
        ? '<span class="fl-badge fl-badge-active">Active</span>'
        : '<span class="fl-badge fl-badge-ack">Ack</span>';
      return '<tr class="fl-row fl-row-' + r.sev + '">' +
        '<td class="tu-td fl-td-mono">' + r.ts + '</td>' +
        '<td class="tu-td tu-td-name">' + r.equip + '</td>' +
        '<td class="tu-td">' + r.type + '</td>' +
        '<td class="tu-td fl-td-fault">' + r.fault + '</td>' +
        '<td class="tu-td">' + sevBadge + '</td>' +
        '<td class="tu-td fl-td-mono">' + r.dur + '</td>' +
        '<td class="tu-td">' + statusBadge + '</td>' +
        '</tr>';
    }).join('');

    /* Sort indicators */
    container.querySelectorAll('#flThead .tu-sort-ind').forEach(function(ind){
      var col = ind.getAttribute('data-col');
      ind.textContent = s.sortCol === col ? (s.sortDir === 1 ? ' ▲' : ' ▼') : '';
    });

    var countEl = container.querySelector('#flFilterCount');
    if (countEl) countEl.textContent = rows.length + ' / ' + s.rows.length + ' faults';
  }
};
