// components/FaultList.js — MBCx Active Fault List section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

var FL_DEMO_FAULTS = [
  { id:1,  equipment:'AHU-1',     faultName:'Cooling valve stuck open',                   sevNorm:8, sumDur:98,   faultActive:68 },
  { id:2,  equipment:'VAV-L1-02', faultName:'Faulty reheat coil — SAT 95°F',              sevNorm:9, sumDur:136,  faultActive:94 },
  { id:3,  equipment:'CUP-CHW-1', faultName:'Differential pressure not at setpoint',       sevNorm:7, sumDur:255,  faultActive:88 },
  { id:4,  equipment:'VAV-L1-05', faultName:'Faulty reheat coil — SAT 88°F',              sevNorm:6, sumDur:72,   faultActive:50 },
  { id:5,  equipment:'AHU-2',     faultName:'OA damper not responding to setpoint',        sevNorm:5, sumDur:167,  faultActive:58 },
  { id:6,  equipment:'VAV-L2-04', faultName:'Leaking reheat valve',                        sevNorm:4, sumDur:64,   faultActive:22 },
  { id:7,  equipment:'AHU-2',     faultName:'Discharge air temp elevated',                 sevNorm:3, sumDur:42,   faultActive:15 },
  { id:8,  equipment:'VAV-L1-01', faultName:'Zone temp above setpoint >2h occupied',       sevNorm:5, sumDur:61,   faultActive:21 },
  { id:9,  equipment:'AHU-3',     faultName:'Supply air temp sensor drift',                sevNorm:2, sumDur:223,  faultActive:77 },
  { id:10, equipment:'AHU-1',     faultName:'VFD speed oscillation >15%',                  sevNorm:2, sumDur:193,  faultActive:67 },
  { id:11, equipment:'VAV-L2-06', faultName:'Damper at minimum — low airflow',             sevNorm:4, sumDur:24,   faultActive:8 },
  { id:12, equipment:'CUP-HW-1',  faultName:'HW supply temp below setpoint',               sevNorm:1, sumDur:340,  faultActive:47 },
];

var FL_COLS = ['equipment', 'faultName', 'sevNorm', 'sumDur', 'faultActive'];
var FL_LABELS = { equipment:'Equipment', faultName:'Fault', sevNorm:'Severity', sumDur:'Duration', faultActive:'%' };

var FL_CONDITIONS = [
  { id: 'sevHigh',  label: 'Severity ≥ 7',  test: function (r) { return typeof r.sevNorm === 'number' && r.sevNorm >= 7; }, color: '#FEE2E2', activeColor: '#DC2626', activeText: '#fff' },
  { id: 'sevMed',   label: 'Severity 4–6',  test: function (r) { return typeof r.sevNorm === 'number' && r.sevNorm >= 4 && r.sevNorm <= 6; }, color: '#FEF3C7', activeColor: '#D97706', activeText: '#fff' },
  { id: 'pctHigh',  label: '% ≥ 75',        test: function (r) { return typeof r.faultActive === 'number' && r.faultActive >= 75; }, color: '#FEE2E2', activeColor: '#DC2626', activeText: '#fff' },
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
      '    <div class="tu-kpi-strip fl-kpi-strip">',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Equipment Monitored</div><div class="tu-kpi-val" id="flKpiEquip">&mdash;</div><div class="tu-kpi-unit">sparking</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Total Faults</div><div class="tu-kpi-val" id="flKpiTotal">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Month Hours</div><div class="tu-kpi-val" id="flKpiHours">&mdash;</div><div class="tu-kpi-unit">hours</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Avg Severity</div><div class="tu-kpi-val" id="flKpiAvgSev">&mdash;</div><div class="tu-kpi-unit">of 10</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Max Severity</div><div class="tu-kpi-val" id="flKpiMaxSev">&mdash;</div><div class="tu-kpi-unit">of 10</div></div>',
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

      '  <div class="tu-kpi-strip fl-kpi-strip">',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Equipment Monitored</div><div class="tu-kpi-val" id="flKpiEquip">&mdash;</div><div class="tu-kpi-unit">sparking</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Total Faults</div><div class="tu-kpi-val" id="flKpiTotal">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Month Hours</div><div class="tu-kpi-val" id="flKpiHours">&mdash;</div><div class="tu-kpi-unit">hours</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Avg Severity</div><div class="tu-kpi-val" id="flKpiAvgSev">&mdash;</div><div class="tu-kpi-unit">of 10</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Max Severity</div><div class="tu-kpi-val" id="flKpiMaxSev">&mdash;</div><div class="tu-kpi-unit">of 10</div></div>',
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
      var as = typeof a.sevNorm === 'number' ? a.sevNorm : 0;
      var bs = typeof b.sevNorm === 'number' ? b.sevNorm : 0;
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

    // Fetch summary info (KPIs)
    var infoAxon = 'view_MBCxRandomInfo_CustomerView_Output(' +
      ctx.siteRef + ', ' + dateArg +
      ', 10%, @nav:rule.all, "Fault List", "", "Show All")';
    API.evalAxon(ctx.attestKey, ctx.projectName, infoAxon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        if (parsed.rows.length) {
          self._parseSummary(container, parsed.rows[0].val || '');
        }
      })
      .catch(function (err) {
        console.warn('[FaultList] Summary info fetch failed:', err);
      });

    // Fetch fault list
    var axon = 'view_MBCxReport_CustomerView_Output(' +
      ctx.siteRef + ', ' + dateArg +
      ', 10%, @nav:rule.all, "Fault List", "", "Show All")';

    API.evalAxon(ctx.attestKey, ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
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

  _parseSummary: function (container, text) {
    var set = function (id, v) { var el = container.querySelector('#' + id); if (el) el.textContent = v; };
    function extract(label) {
      var re = new RegExp(label + '\\s*:\\s*(\\S+)', 'i');
      var m = text.match(re);
      return m ? m[1] : null;
    }

    var equip   = extract('Equipment Sparking');
    var total   = extract('Total Faults');
    var hours   = extract('Month Hours');
    var avgSev  = extract('Average Severity');
    var maxSev  = extract('Maximum Severity');

    if (equip)  set('flKpiEquip',  equip);
    if (total)  set('flKpiTotal',  total);
    if (hours)  set('flKpiHours',  hours);
    if (avgSev) set('flKpiAvgSev', avgSev);
    if (maxSev) set('flKpiMaxSev', maxSev);

    var meta = [];
    if (total) meta.push(total + ' faults');
    if (equip) meta.push(equip + ' equipment');
    set('flMeta', meta.join(' · ') || 'Active faults');
  },

  _mapLiveRows: function (rows, cols) {
    return rows.map(function (r, i) {
      function numVal(col) {
        var v = r[col];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && v._kind === 'number') return v.val;
        if (typeof v === 'number') return v;
        var n = parseFloat(v);
        return isNaN(n) ? v : n;
      }
      function strVal(col) {
        var v = r[col];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && v.dis) return v.dis;
        if (typeof v === 'object' && v.val !== undefined) return v.val;
        return String(v);
      }

      return {
        id:            i,
        equipment:     strVal('equipment'),
        faultName:     strVal('faultName'),
        sevNorm:       numVal('sevNorm'),
        sumDur:        numVal('sumDur'),
        faultActive:   numVal('faultActive'),
        descriptionofFault: strVal('descriptionofFault'),
        recommendedActions: strVal('recommendedActions'),
        sparksLink:    strVal('sparksLink'),
        importanceFactor: strVal('importanceFactor'),
        energyScore:   numVal('energyScore'),
        _raw:          r
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
          var cls = k === 'equipment' ? 'tu-td tu-td-name' : k === 'faultName' ? 'tu-td fl-td-fault' : 'tu-td';
          var cf = '';
          var display = val;

          if (k === 'sevNorm') cf = _flSevClass(typeof val === 'number' ? val : parseFloat(val));
          if (k === 'faultActive') {
            var pctNum = typeof val === 'number' ? val : parseFloat(val);
            cf = _flPctClass(pctNum);
            if (!isNaN(pctNum)) display = pctNum.toFixed(1) + '%';
          }
          if (k === 'sumDur') display = _flFormatHours(val);

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
