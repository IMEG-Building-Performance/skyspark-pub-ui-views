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

function _flGuessType(equipName) {
  var s = String(equipName).toUpperCase();
  if (s.indexOf('AHU') !== -1 || s.indexOf('FCU') !== -1 || s.indexOf('RTU') !== -1 || s.indexOf('MAU') !== -1) return 'AHU';
  if (s.indexOf('VAV') !== -1 || s.indexOf('TERM') !== -1 || s.indexOf('FPB') !== -1) return 'VAV';
  if (s.indexOf('CHP') !== -1 || s.indexOf('CHIL') !== -1 || s.indexOf('CUP') !== -1 || s.indexOf('COOL') !== -1 || s.indexOf('BOIL') !== -1 || s.indexOf('HW') !== -1) return 'CUP';
  return 'Other';
}

function _flFormatDur(v) {
  if (typeof v === 'string' && v) return v;
  if (typeof v === 'number') {
    var total = Math.round(v);
    var days = Math.floor(total / 1440);
    var hrs  = Math.floor((total % 1440) / 60);
    var mins = total % 60;
    if (days > 0) return days + 'd ' + hrs + 'h';
    if (hrs > 0)  return hrs + 'h ' + mins + 'm';
    return mins + 'm';
  }
  return String(v || '');
}

function _flFindCol(cols, patterns) {
  for (var i = 0; i < patterns.length; i++)
    for (var j = 0; j < cols.length; j++)
      if (cols[j].toLowerCase().indexOf(patterns[i]) !== -1) return cols[j];
  return null;
}

window.mbcxDashboard.components.FaultList = {

  _state: null,
  onFaultClick: null,

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

    // Wire filter input regardless of data source
    var filterInput = container.querySelector('#flFilterInput');
    if (filterInput) {
      filterInput.addEventListener('input', function () {
        if (self._state) { self._state.filter = filterInput.value; self._rebuildTbody(container); }
      });
    }

    if (ctx && ctx.attestKey && ctx.siteRef) {
      // Loading state
      var tbody = container.querySelector('#flTbody');
      var thead = container.querySelector('#flThead');
      if (thead) thead.innerHTML = '';
      if (tbody) tbody.innerHTML = '<tr><td style="padding:24px;color:#9CA3AF;font-size:12px;text-align:center;">Loading faults…</td></tr>';
      this._fetchLive(container, ctx);
    } else {
      this._populate(container, FL_DEMO_FAULTS);
    }
  },

  _populate: function (container, faults) {
    var active = faults.filter(function (f) { return f.status !== 'Acknowledged'; });
    var set = function (id, v) { var el = container.querySelector('#' + id); if (el) el.textContent = v; };
    set('flKpiTotal',    active.length);
    set('flKpiCritical', active.filter(function (f) { return f.sev === 'critical'; }).length);
    set('flKpiWarning',  active.filter(function (f) { return f.sev === 'warning';  }).length);
    set('flKpiAhu',      active.filter(function (f) { return f.type === 'AHU';     }).length);
    set('flKpiVav',      active.filter(function (f) { return f.type === 'VAV';     }).length);
    set('flKpiAck',      faults.filter(function (f) { return f.status === 'Acknowledged'; }).length);
    set('flMeta',        active.length + ' active faults · ' + faults.filter(function (f) { return f.sev === 'critical'; }).length + ' critical');

    var sorted = faults.slice().sort(function (a, b) {
      var sd = _flSevOrder(a.sev) - _flSevOrder(b.sev);
      return sd !== 0 ? sd : b.ts.localeCompare(a.ts);
    });
    this._state = { rows: sorted, sortCol: null, sortDir: 1, filter: '' };
    this._buildTable(container);
  },

  _fetchLive: function (container, ctx) {
    var self = this;
    var API  = window.mbcxDashboard.api;
    var HP   = window.mbcxDashboard.haystackParser;

    var dateArg = (ctx.datesStart && ctx.datesEnd)
      ? ctx.datesStart + '..' + ctx.datesEnd
      : 'today()';
    var axon = 'view_MBCxReport_CustomerView_Output(' +
      ctx.siteRef + ', ' + dateArg +
      ', 10%, @nav:rule.all, "Fault List", "", "Show All")';
    console.log('[FaultList] Axon:', axon);

    API.evalAxon(ctx.attestKey, ctx.projectName, axon)
      .then(function (grid) {
        console.log('[FaultList] Raw grid:', JSON.stringify(grid).slice(0, 400));
        var parsed = HP.parseGrid(grid);
        console.log('[FaultList] Live cols:', parsed.cols.map(function(c){return typeof c==='string'?c:c.name;}), '(' + parsed.rows.length + ' rows)');
        if (!parsed.rows.length) {
          var tbody = container.querySelector('#flTbody');
          if (tbody) tbody.innerHTML = '<tr><td style="padding:24px;color:#9CA3AF;font-size:12px;text-align:center;">No faults returned for this site and date range.</td></tr>';
          return;
        }
        self._populate(container, self._mapLiveRows(parsed.rows, parsed.cols));
      })
      .catch(function (err) {
        console.error('[FaultList] Live fetch failed:', err);
        var tbody = container.querySelector('#flTbody');
        if (tbody) tbody.innerHTML = '<tr><td style="padding:24px;color:#9B2335;font-size:12px;text-align:center;">Failed to load faults — ' + (err && err.message ? err.message : 'see console') + '</td></tr>';
      });
  },

  _mapLiveRows: function (rows, cols) {
    var tsCol     = _flFindCol(cols, ['ts', 'start', 'time', 'date']);
    var equipCol  = _flFindCol(cols, ['equip', 'dis', 'target', 'name', 'ref']);
    var typeCol   = _flFindCol(cols, ['equiptype', 'type', 'kind']);
    var faultCol  = _flFindCol(cols, ['fault', 'rule', 'msg', 'desc', 'detail', 'issue']);
    var sevCol    = _flFindCol(cols, ['sev', 'severity', 'priority', 'level', 'rank']);
    var durCol    = _flFindCol(cols, ['dur', 'duration', 'elapsed', 'age']);
    var statusCol = _flFindCol(cols, ['status', 'state', 'ack']);

    return rows.map(function (r, i) {
      function strVal(col) {
        if (!col) return '';
        var v = r[col];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && v.dis) return v.dis;
        if (typeof v === 'object' && v.id)  return v.id;
        return String(v);
      }

      var equip  = equipCol ? strVal(equipCol) : ('Unit-' + (i + 1));
      var rawSev = sevCol ? r[sevCol] : null;
      var rawSta = statusCol ? r[statusCol] : null;

      var sev = 'warning';
      if (rawSev !== null && rawSev !== undefined) {
        var ss = String(rawSev).toLowerCase();
        if (ss.indexOf('crit') !== -1 || ss === '1' || ss === 'high') sev = 'critical';
      }

      var status = 'Active';
      if (rawSta !== null && rawSta !== undefined) {
        var st = String(rawSta).toLowerCase();
        if (st.indexOf('ack') !== -1 || st.indexOf('clos') !== -1 || st === 'resolved') status = 'Acknowledged';
      }

      var type = typeCol ? strVal(typeCol) : _flGuessType(equip);
      if (!type) type = _flGuessType(equip);

      return {
        id:     i,
        ts:     tsCol    ? strVal(tsCol)    : '',
        equip:  equip,
        type:   type,
        fault:  faultCol ? strVal(faultCol) : strVal(cols[0]),
        sev:    sev,
        dur:    durCol   ? _flFormatDur(r[durCol]) : '',
        status: status
      };
    });
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

    var tbody = container.querySelector('#flTbody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var tr = e.target.closest('tr[data-fid]');
        if (!tr || !self.onFaultClick) return;
        var fid = parseInt(tr.getAttribute('data-fid'), 10);
        var row = self._state && self._state.rows
          ? self._state.rows.filter(function (f) { return f.id === fid; })[0]
          : null;
        if (row) self.onFaultClick(row);
      });
    }
  },

  _rebuildTbody: function (container) {
    if (!this._state) return;
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
      return '<tr class="fl-row fl-row-' + r.sev + ' fl-row-clickable" data-fid="' + r.id + '">' +
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
