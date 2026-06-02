// components/FaultList.js — MBCx Active Fault List section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

var FL_DEMO_FAULTS = [
  { id:1,  equip:'AHU-1',     fault:'Cooling valve stuck open — valve 94% at low load',     sev:8, dur:98,   pct:68, status:'Active' },
  { id:2,  equip:'VAV-L1-02', fault:'Faulty reheat coil — SAT 95°F at low zone temp',       sev:9, dur:136,  pct:94, status:'Active' },
  { id:3,  equip:'CUP-CHW-1', fault:'Chiller differential pressure below threshold',         sev:7, dur:255,  pct:88, status:'Active' },
  { id:4,  equip:'VAV-L1-05', fault:'Faulty reheat coil — SAT 88°F, reheat valve 85%',      sev:6, dur:72,   pct:50, status:'Active' },
  { id:5,  equip:'AHU-2',     fault:'OA damper not responding to setpoint',                  sev:5, dur:167,  pct:58, status:'Active' },
  { id:6,  equip:'VAV-L2-04', fault:'Leaking reheat valve — RH 88% at warm zone temp',      sev:4, dur:64,   pct:22, status:'Active' },
  { id:7,  equip:'AHU-2',     fault:'Discharge air temp elevated — 62°F setpoint',          sev:3, dur:42,   pct:15, status:'Active' },
  { id:8,  equip:'VAV-L1-01', fault:'Zone temp above setpoint by 4°F for >2h occupied',     sev:5, dur:61,   pct:21, status:'Active' },
  { id:9,  equip:'AHU-3',     fault:'Supply air temp sensor drift — reading 12°F off avg',  sev:2, dur:223,  pct:77, status:'Acknowledged' },
  { id:10, equip:'AHU-1',     fault:'VFD speed oscillation >15% within 5-min window',       sev:2, dur:193,  pct:67, status:'Acknowledged' },
  { id:11, equip:'VAV-L2-06', fault:'Damper at minimum — airflow 10 CFM vs 300 SP',         sev:4, dur:24,   pct:8,  status:'Active' },
  { id:12, equip:'CUP-HW-1',  fault:'HW supply temp below setpoint by 8°F',                 sev:1, dur:340,  pct:47, status:'Acknowledged' },
];

var FL_COLS = ['equip', 'fault', 'sev', 'dur', 'pct', 'status'];
var FL_LABELS = { equip:'Equipment', fault:'Fault', sev:'Severity', dur:'Duration', pct:'%', status:'Status' };

var FL_CONDITIONS = [
  { id: 'sevHigh',  label: 'Severity ≥ 7',  test: function (r) { return typeof r.sev === 'number' && r.sev >= 7; }, color: '#FEE2E2', activeColor: '#DC2626', activeText: '#fff' },
  { id: 'sevMed',   label: 'Severity 4–6',  test: function (r) { return typeof r.sev === 'number' && r.sev >= 4 && r.sev <= 6; }, color: '#FEF3C7', activeColor: '#D97706', activeText: '#fff' },
  { id: 'pctHigh',  label: '% ≥ 75',        test: function (r) { return typeof r.pct === 'number' && r.pct >= 75; }, color: '#FEE2E2', activeColor: '#DC2626', activeText: '#fff' },
];

function _flFormatHours(v) {
  if (typeof v === 'number') return v.toFixed(0) + 'h';
  if (typeof v === 'string') {
    var n = parseFloat(v);
    if (!isNaN(n)) return n.toFixed(0) + 'h';
  }
  return v !== null && v !== undefined ? String(v) : '—';
}

function _flSevClass(v) {
  if (typeof v !== 'number') return '';
  if (v >= 8) return ' tu-cf-hot';
  if (v >= 5) return ' tu-cf-warm';
  return '';
}

function _flPctClass(v) {
  if (typeof v !== 'number') return '';
  if (v >= 75) return ' tu-cf-hot';
  if (v >= 50) return ' tu-cf-warm';
  return '';
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
      '<div class="equip-section" id="mbcxFaultListSection">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--imeg-red-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9B2335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
      '          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      '        </svg>',
      '      </div>',
      '      <div><div class="equip-title">MBCx Fault List</div><div class="equip-meta" id="flMeta">Active faults</div></div>',
      '    </div>',
      '  </div>',
      '  <div class="equip-body">',

      /* KPI strip */
      '    <div class="tu-kpi-strip">',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Total Faults</div><div class="tu-kpi-val" id="flKpiTotal">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '    </div>',

      /* Filter bar */
      '    <div class="tu-filter-bar">',
      '      <input class="tu-filter-input" id="flFilterInput" type="text" placeholder="Filter faults…" autocomplete="off" />',
      '      <span class="tu-filter-count" id="flFilterCount"></span>',
      '    </div>',

      /* Fault table */
      '    <div class="tu-table-scroll">',
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

      '  <div class="tu-kpi-strip">',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Total Faults</div><div class="tu-kpi-val" id="flKpiTotal">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '  </div>',

      '  <div class="tu-filter-bar">',
      '    <input class="tu-filter-input" id="flFilterInput" type="text" placeholder="Filter faults…" autocomplete="off" />',
      '    <span class="tu-filter-count" id="flFilterCount"></span>',
      '  </div>',

      '  <div class="tu-table-scroll">',
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
    var set = function (id, v) { var el = container.querySelector('#' + id); if (el) el.textContent = v; };
    set('flKpiTotal', faults.length);
    set('flMeta',     faults.length + ' faults');

    // Default sort: severity descending (higher number = more severe)
    var sorted = faults.slice().sort(function (a, b) {
      var as = typeof a.sev === 'number' ? a.sev : 0;
      var bs = typeof b.sev === 'number' ? b.sev : 0;
      return bs - as;
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
    var equipCol  = _flFindCol(cols, ['equip', 'dis', 'target', 'name', 'ref']);
    var faultCol  = _flFindCol(cols, ['fault', 'rule', 'msg', 'desc', 'detail', 'issue']);
    var sevCol    = _flFindCol(cols, ['sev', 'severity', 'priority', 'level', 'rank']);
    var durCol    = _flFindCol(cols, ['dur', 'duration', 'elapsed', 'age']);
    var pctCol    = _flFindCol(cols, ['pct', 'percent', '%']);
    var statusCol = _flFindCol(cols, ['status', 'state', 'ack']);

    return rows.map(function (r, i) {
      function rawVal(col) {
        if (!col) return '';
        var v = r[col];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && v.dis) return v.dis;
        if (typeof v === 'object' && v.id)  return v.id;
        return v;
      }

      return {
        id:     i,
        equip:  equipCol  ? rawVal(equipCol)  : ('Unit-' + (i + 1)),
        fault:  faultCol  ? rawVal(faultCol)  : rawVal(cols[0]),
        sev:    sevCol    ? rawVal(sevCol)     : '',
        dur:    durCol    ? rawVal(durCol)     : '',
        pct:    pctCol    ? rawVal(pctCol)     : '',
        status: statusCol ? rawVal(statusCol) : ''
      };
    });
  },

  _buildTable: function (container) {
    var self = this;
    this._state.activeConditions = {};

    // Condition filter chips
    var condCounts = {};
    var stateRows = this._state.rows;
    FL_CONDITIONS.forEach(function (c) {
      condCounts[c.id] = stateRows.filter(c.test).length;
    });
    var chipHtml = FL_CONDITIONS.map(function (c) {
      if (!condCounts[c.id]) return '';
      return '<button class="tu-cond-chip" data-cond="' + c.id + '"'
        + ' data-color="' + c.color + '" data-active-color="' + c.activeColor + '" data-active-text="' + c.activeText + '"'
        + ' style="background:' + c.color + ';">'
        + c.label + '<span class="tu-cond-count">' + condCounts[c.id] + '</span></button>';
    }).filter(Boolean).join('');

    var condBar = container.querySelector('#flCondBar');
    if (!condBar) {
      var filterBar = container.querySelector('#flFilterInput');
      if (filterBar && filterBar.parentNode && chipHtml) {
        var bar = document.createElement('div');
        bar.className = 'tu-cond-bar';
        bar.id = 'flCondBar';
        bar.innerHTML = chipHtml;
        filterBar.parentNode.parentNode.insertBefore(bar, filterBar.parentNode);
      }
    }

    var condBarEl = container.querySelector('#flCondBar');
    if (condBarEl) {
      condBarEl.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-cond]');
        if (!chip) return;
        var id = chip.getAttribute('data-cond');
        var active = self._state.activeConditions;
        if (active[id]) {
          delete active[id];
          chip.classList.remove('tu-cond-chip--on');
          chip.style.background = chip.getAttribute('data-color');
          chip.style.color = '';
        } else {
          active[id] = true;
          chip.classList.add('tu-cond-chip--on');
          chip.style.background = chip.getAttribute('data-active-color');
          chip.style.color = chip.getAttribute('data-active-text');
        }
        self._rebuildTbody(container);
      });
    }

    var thead = container.querySelector('#flThead');
    if (!thead) return;

    thead.innerHTML = '<tr>' + FL_COLS.map(function(k){
      return '<th class="tu-th tu-th-sort fl-th" data-col="' + k + '">' + FL_LABELS[k] + '<span class="tu-sort-ind" data-col="' + k + '"></span></th>';
    }).join('') + '<th class="tu-th fl-th-act" title="Meeting Agenda"></th></tr>';

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
        // Agenda button — toggle without opening detail
        var agendaBtn = e.target.closest('.fl-agenda-btn');
        if (agendaBtn) {
          var fid2 = parseInt(agendaBtn.getAttribute('data-fid'), 10);
          var row2 = self._state && self._state.rows
            ? self._state.rows.filter(function (f) { return f.id === fid2; })[0]
            : null;
          if (row2 && window.mbcxDashboard && window.mbcxDashboard.meeting) {
            var mtg = window.mbcxDashboard.meeting;
            if (mtg.has(fid2)) {
              mtg.remove(fid2);
              agendaBtn.textContent = '+';
              agendaBtn.title = 'Add to Meeting Agenda';
              agendaBtn.classList.remove('fl-agenda-btn-in');
            } else {
              mtg.add(row2);
              agendaBtn.textContent = '✓';
              agendaBtn.title = 'Remove from Meeting Agenda';
              agendaBtn.classList.add('fl-agenda-btn-in');
            }
          }
          return;
        }

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

    // Condition filters
    var activeIds = Object.keys(s.activeConditions || {});
    if (activeIds.length) {
      rows = rows.filter(function (r) {
        return activeIds.some(function (id) {
          var cond = FL_CONDITIONS.filter(function (c) { return c.id === id; })[0];
          return cond && cond.test(r);
        });
      });
    }

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
        if (av === null || av === undefined) return dir;
        if (bv === null || bv === undefined) return -dir;
        var an = parseFloat(av), bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    var tbody = container.querySelector('#flTbody');
    if (!tbody) return;
    tbody.innerHTML = rows.map(function(r){
      var inAgenda = !!(window.mbcxDashboard && window.mbcxDashboard.meeting && window.mbcxDashboard.meeting.has(r.id));
      return '<tr class="fl-row fl-row-clickable" data-fid="' + r.id + '">' +
        FL_COLS.map(function (k) {
          var val = r[k];
          if (val && typeof val === 'object' && val.dis) val = val.dis;
          var cls = k === 'equip' ? 'tu-td tu-td-name' : k === 'fault' ? 'tu-td fl-td-fault' : 'tu-td';
          var cf = '';
          var display = val;

          if (k === 'sev') cf = _flSevClass(val);
          if (k === 'pct') {
            cf = _flPctClass(typeof val === 'number' ? val : parseFloat(val));
            if (typeof val === 'number') display = val.toFixed(0) + '%';
          }
          if (k === 'dur') display = _flFormatHours(val);

          return '<td class="' + cls + cf + '">' + (display !== null && display !== undefined && display !== '' ? display : '—') + '</td>';
        }).join('') +
        '<td class="tu-td fl-td-act"><button class="fl-agenda-btn' + (inAgenda ? ' fl-agenda-btn-in' : '') + '" data-fid="' + r.id + '" title="' + (inAgenda ? 'Remove from Meeting Agenda' : 'Add to Meeting Agenda') + '">' + (inAgenda ? '&#10003;' : '+') + '</button></td>' +
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
