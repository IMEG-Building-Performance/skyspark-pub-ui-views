// components/FaultLog.js — MBCx Fault Log (remediation tracker)
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.FaultLog = (function () {

  var PRIORITY_LABELS = { 0: 'Info', 1: 'High', 2: 'Medium', 3: 'Low' };
  var PRIORITY_COLORS = { 0: '#6b7280', 1: '#ef4444', 2: '#f59e0b', 3: '#10b981' };

  var COLS = [
    { key: 'id',           label: 'ID',         width: '52px' },
    { key: 'name',         label: 'Fault Name',  minWidth: '200px' },
    { key: 'equipId',      label: 'Equipment',   width: '120px', filterable: true },
    { key: 'status',       label: 'Status',      width: '95px',  filterable: true },
    { key: 'priority',     label: 'Priority',    width: '105px', filterable: true },
    { key: 'dateAdded',    label: 'Added',       width: '82px' },
    { key: 'dateResolved', label: 'Resolved',    width: '82px' },
    { key: 'assignedTo',   label: 'Assigned',    width: '115px', filterable: true },
    { key: 'comments',     label: 'Comments',    minWidth: '200px' }
  ];

  // ── State ──────────────────────────────────────────────────────────────
  var _rows = [];
  var _sort = { key: 'id', dir: 'asc' };
  var _filters = { equipId: '', status: '', priority: '', assignedTo: '' };
  var _expandedId = null;
  var _container = null;

  // ── Helpers ────────────────────────────────────────────────────────────

  function _fmtDate(d) {
    if (!d) return '—';
    var dt = new Date(d + 'T00:00:00');
    return isNaN(dt) ? d : dt.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  }

  function _equipDis(row) {
    return row.equipDis || row.equipId || '';
  }

  function _priorityLabel(p) {
    return PRIORITY_LABELS[p] !== undefined ? PRIORITY_LABELS[p] : String(p);
  }

  function _priorityNum(label) {
    var found = Object.keys(PRIORITY_LABELS).filter(function (k) { return PRIORITY_LABELS[k] === label; });
    return found.length ? parseInt(found[0], 10) : null;
  }

  // ── KPIs ───────────────────────────────────────────────────────────────

  function _renderKPIs() {
    var open = _rows.filter(function (r) { return r.status === 'Open'; });
    var closed = _rows.filter(function (r) { return r.status === 'Closed'; });
    var unassigned = open.filter(function (r) { return !r.assignedTo; });
    var avgPriority = open.length
      ? (open.reduce(function (s, r) { return s + (r.priority || 0); }, 0) / open.length).toFixed(1)
      : '—';

    function kpi(label, value, accent, sub) {
      return '<div class="flog-kpi-card">' +
        '<div class="flog-kpi-label">' + label + '</div>' +
        '<div class="flog-kpi-value" style="color:' + accent + '">' + value + '</div>' +
        (sub ? '<div class="flog-kpi-sub">' + sub + '</div>' : '') +
        '</div>';
    }

    return '<div class="flog-kpi-row">' +
      kpi('Open Faults', open.length, '#ef4444', closed.length + ' closed') +
      kpi('Avg Priority', avgPriority, '#1a1a1a', '1 = High · 3 = Low') +
      kpi('Unassigned', unassigned.length, unassigned.length > 0 ? '#f59e0b' : '#10b981', 'Open faults') +
      kpi('Total Logged', _rows.length, '#2563eb', 'all time') +
      '</div>';
  }

  // ── Toolbar ────────────────────────────────────────────────────────────

  function _uniqueVals(key) {
    var seen = {};
    var vals = [];
    _rows.forEach(function (r) {
      var v = key === 'equipId' ? _equipDis(r)
            : key === 'priority' ? _priorityLabel(r.priority)
            : (r[key] || '');
      if (v && !seen[v]) { seen[v] = true; vals.push(v); }
    });
    return vals.sort();
  }

  function _renderFilterDropdown(col) {
    var vals = _uniqueVals(col.key);
    if (!vals.length) return '';
    var current = _filters[col.key] || '';
    var opts = '<option value="" style="color:#1a1a1a">All</option>' +
      vals.map(function (v) {
        return '<option value="' + _esc(v) + '" style="color:#1a1a1a"' + (v === current ? ' selected' : '') + '>' + _esc(v) + '</option>';
      }).join('');
    return '<select class="flog-filter-sel" data-filter="' + col.key + '">' + opts + '</select>';
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _renderToolbar(filteredLen) {
    var openFiltered = _getFiltered().filter(function (r) { return r.status === 'Open'; }).length;
    var hasFilters = _filters.status || _filters.priority || _filters.equipId || _filters.assignedTo;
    return '<div class="flog-toolbar">' +
      '<div class="flog-toolbar-left">' +
        '<span class="flog-badge flog-badge--open">' + openFiltered + ' open</span>' +
        '<span class="flog-badge flog-badge--closed">' + (filteredLen - openFiltered) + ' closed</span>' +
      '</div>' +
      '<div class="flog-toolbar-right">' +
        '<span class="flog-showing">Showing ' + filteredLen + ' of ' + _rows.length + '</span>' +
        (hasFilters ? '<button class="flog-clear-btn" id="flogClearFilters">Clear filters</button>' : '') +
      '</div>' +
    '</div>';
  }

  // ── Table ──────────────────────────────────────────────────────────────

  function _renderThead() {
    var cells = COLS.map(function (col) {
      var active = _sort.key === col.key;
      var arrow = active ? (_sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';
      var style = 'width:' + (col.width || 'auto') + ';' + (col.minWidth ? 'min-width:' + col.minWidth + ';' : '');
      return '<th class="flog-th" style="' + style + '" data-sortkey="' + col.key + '">' +
        '<div class="flog-th-label">' + col.label + '<span class="flog-sort-ind" style="opacity:' + (active ? 1 : 0.35) + '">' + arrow + '</span></div>' +
        (col.filterable ? '<div class="flog-th-filter">' + _renderFilterDropdown(col) + '</div>' : '') +
        '</th>';
    }).join('');
    return '<thead><tr>' + cells + '</tr></thead>';
  }

  function _renderRow(row, idx) {
    var isOpen = row.status === 'Open';
    var expanded = _expandedId === row.id;
    var commentLines = (row.comments || '').split('\n');
    var bg = idx % 2 === 1 ? '#fafbfc' : '#fff';

    var cells = COLS.map(function (col) {
      var k = col.key;
      var v = row[k];
      var cell = '';

      if (k === 'id') {
        cell = '<span style="font-weight:600;color:#6b7280">' + _esc(v) + '</span>';
      } else if (k === 'name') {
        cell = '<span style="font-weight:600;color:#1a1a1a">' + _esc(v) + '</span>';
      } else if (k === 'equipId') {
        cell = '<span style="color:#2563eb;font-weight:500">' + _esc(_equipDis(row)) + '</span>';
      } else if (k === 'status') {
        var sc = isOpen ? '#ef4444' : '#10b981';
        var sbg = isOpen ? '#fef2f2' : '#f0fdf4';
        cell = '<span class="flog-status-pill" style="background:' + sbg + ';color:' + sc + '">' + _esc(v) + '</span>';
      } else if (k === 'priority') {
        var color = PRIORITY_COLORS[row.priority] || '#6b7280';
        cell = '<span class="flog-priority-dot" style="background:' + color + '"></span>' +
               '<span style="font-size:12px;color:#4b5563">' + _esc(_priorityLabel(row.priority)) + '</span>';
      } else if (k === 'dateAdded') {
        cell = '<span style="font-size:12px;color:#4b5563;white-space:nowrap">' + _fmtDate(v) + '</span>';
      } else if (k === 'dateResolved') {
        cell = '<span style="font-size:12px;color:' + (v ? '#4b5563' : '#d1d5db') + ';white-space:nowrap">' + _fmtDate(v) + '</span>';
      } else if (k === 'assignedTo') {
        cell = '<span style="font-size:12px;color:' + (v ? '#4b5563' : '#d1d5db') + '">' + _esc(v || '—') + '</span>';
      } else if (k === 'comments') {
        var first = _esc(commentLines[0] || '');
        var more = commentLines.length > 1 && !expanded
          ? '<span class="flog-more-link">+' + (commentLines.length - 1) + ' more</span>'
          : '';
        var full = expanded
          ? commentLines.map(function (l) { return _esc(l); }).join('<br>')
          : first;
        cell = '<div class="flog-comment-cell" data-rowid="' + row.id + '" style="cursor:pointer">' +
          '<div class="flog-comment-text" style="white-space:' + (expanded ? 'normal' : 'nowrap') + ';overflow:' + (expanded ? 'visible' : 'hidden') + ';text-overflow:' + (expanded ? 'unset' : 'ellipsis') + '">' +
          full + '</div>' + more + '</div>';
        return '<td class="flog-td" style="max-width:320px">' + cell + '</td>';
      }

      var tdStyle = k === 'priority' ? 'display:flex;align-items:center;gap:6px;' : '';
      return '<td class="flog-td" style="' + tdStyle + '">' + cell + '</td>';
    }).join('');

    return '<tr class="flog-row" data-rowid="' + row.id + '" style="background:' + bg + ';border-bottom:1px solid #f3f4f6">' +
      cells + '</tr>';
  }

  function _getFiltered() {
    var rows = _rows.slice();

    if (_filters.status)   rows = rows.filter(function (r) { return r.status === _filters.status; });
    if (_filters.priority) {
      var pNum = _priorityNum(_filters.priority);
      if (pNum !== null) rows = rows.filter(function (r) { return r.priority === pNum; });
    }
    if (_filters.equipId)   rows = rows.filter(function (r) { return _equipDis(r) === _filters.equipId; });
    if (_filters.assignedTo) rows = rows.filter(function (r) { return r.assignedTo === _filters.assignedTo; });

    rows.sort(function (a, b) {
      var ak = _sort.key, dir = _sort.dir === 'asc' ? 1 : -1;
      var av = ak === 'equipId' ? _equipDis(a)
             : ak === 'priority' ? a.priority
             : a[ak];
      var bv = ak === 'equipId' ? _equipDis(b)
             : ak === 'priority' ? b.priority
             : b[ak];
      if (av == null) return dir;
      if (bv == null) return -dir;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    return rows;
  }

  function _renderTable() {
    var filtered = _getFiltered();
    var tbody = filtered.length
      ? filtered.map(function (r, i) { return _renderRow(r, i); }).join('')
      : '<tr><td colspan="' + COLS.length + '" class="flog-empty">No faults match the current filters.</td></tr>';

    return '<div class="flog-table-wrap">' +
      _renderToolbar(filtered.length) +
      '<div style="overflow-x:auto">' +
        '<table class="flog-table" style="min-width:1020px">' +
          _renderThead() +
          '<tbody>' + tbody + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
  }

  // ── Full page HTML ─────────────────────────────────────────────────────

  function renderPage() {
    return '<div class="flog-page">' +
      '<div class="flog-page-header">' +
        '<h1 class="flog-page-title">Fault Log</h1>' +
      '</div>' +
      '<div id="flogKpis"></div>' +
      '<div id="flogTable"></div>' +
    '</div>';
  }

  // ── Init / bind ────────────────────────────────────────────────────────

  function _render() {
    if (!_container) return;
    var kpisEl = _container.querySelector('#flogKpis');
    var tableEl = _container.querySelector('#flogTable');
    if (kpisEl) kpisEl.innerHTML = _renderKPIs();
    if (tableEl) tableEl.innerHTML = _renderTable();
    _bindEvents();
  }

  function _bindEvents() {
    if (!_container) return;

    // Sort
    _container.querySelectorAll('.flog-th[data-sortkey]').forEach(function (th) {
      th.addEventListener('click', function (e) {
        if (e.target.closest('select')) return;
        var key = th.getAttribute('data-sortkey');
        if (_sort.key === key) {
          _sort.dir = _sort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          _sort.key = key;
          _sort.dir = 'asc';
        }
        _render();
      });
    });

    // Filter dropdowns
    _container.querySelectorAll('.flog-filter-sel').forEach(function (sel) {
      sel.addEventListener('change', function (e) {
        e.stopPropagation();
        _filters[sel.getAttribute('data-filter')] = sel.value;
        _render();
      });
    });

    // Clear filters
    var clearBtn = _container.querySelector('#flogClearFilters');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        _filters = { equipId: '', status: '', priority: '', assignedTo: '' };
        _render();
      });
    }

    // Expand comments
    _container.querySelectorAll('.flog-comment-cell').forEach(function (cell) {
      cell.addEventListener('click', function () {
        var id = parseInt(cell.getAttribute('data-rowid'), 10);
        _expandedId = _expandedId === id ? null : id;
        _render();
      });
    });
  }

  // ── Live data mapping ──────────────────────────────────────────────────

  function _mapFromGrid(grid) {
    if (!grid || !grid.rows) return [];
    return grid.rows.map(function (row, i) {
      function s(k) {
        var v = row[k];
        if (v == null) return '';
        if (typeof v === 'object') return v.dis || v.val || String(v);
        return String(v);
      }
      function n(k) {
        var v = row[k];
        if (v == null) return null;
        if (typeof v === 'object' && v._kind === 'number') return v.val;
        var p = parseFloat(v);
        return isNaN(p) ? null : p;
      }
      // Map SkySpark priority strings to numbers
      var priStr = s('priority').toLowerCase();
      var pri = priStr === 'high' ? 1 : priStr === 'medium' ? 2 : priStr === 'low' ? 3 : 0;
      return {
        id:           i + 1,
        name:         s('faultName') || s('name') || s('dis'),
        equipId:      s('equipId') || s('equip'),
        equipDis:     s('equipDis') || s('equip') || s('equipId'),
        status:       s('status') || 'Open',
        priority:     pri,
        dateAdded:    s('dateAdded') || s('dateOpen') || '',
        dateResolved: s('dateResolved') || s('dateClosed') || '',
        assignedTo:   s('assignedTo') || s('assigned') || '',
        comments:     s('comments') || s('notes') || ''
      };
    });
  }

  // ── Demo data ──────────────────────────────────────────────────────────

  var _demoRows = [
    { id:1,  name:'Discharge Air Temp Out of Range',     equipId:'ahu-1',     equipDis:'AHU-1',     status:'Open',   priority:1, dateAdded:'2026-04-12', dateResolved:null,         assignedTo:'J. Martinez', comments:'4/12 - DAT consistently 8°F above setpoint during occupied hours. Checked valve actuator — appears functional.' },
    { id:2,  name:'Simultaneous Heating and Cooling',     equipId:'ahu-1',     equipDis:'AHU-1',     status:'Open',   priority:2, dateAdded:'2026-03-28', dateResolved:null,         assignedTo:'K. Patel',    comments:'3/28 - HtgVlv and ClgVlv both >20% open during mild OAT conditions. Likely sequencing issue.' },
    { id:3,  name:'Supply Fan VFD Hunting',               equipId:'ahu-1',     equipDis:'AHU-1',     status:'Closed', priority:3, dateAdded:'2026-02-10', dateResolved:'2026-03-15', assignedTo:'J. Martinez', comments:'2/10 - SF speed oscillating ±15% around setpoint.\n3/15 - PID loop retuned. Resolved.' },
    { id:4,  name:'Flow Modulates while Fan is Constant', equipId:'ahu-2',     equipDis:'AHU-2',     status:'Closed', priority:0, dateAdded:'2026-02-25', dateResolved:'2026-05-11', assignedTo:'',            comments:'2/25 - Total flow drops ~4k CFM each night. Pressure looks odd.\n3/2 - Ductwork issue confirmed. 80 Hz on SF.\n5/11 - Resolved after ductwork repair.' },
    { id:5,  name:'High CHW Supply Temp',                 equipId:'chiller-1', equipDis:'Chiller-1', status:'Open',   priority:2, dateAdded:'2026-05-20', dateResolved:null,         assignedTo:'R. Chen',     comments:'5/20 - CHWST running 3°F above setpoint at partial load. Possible refrigerant charge issue.' },
    { id:6,  name:'Zone Temp Exceeds Setpoint',           equipId:'vav-101',   equipDis:'VAV-101',   status:'Open',   priority:1, dateAdded:'2026-06-01', dateResolved:null,         assignedTo:'K. Patel',    comments:'6/1 - Zone consistently 5°F above setpoint. Reheat valve stuck open?\n6/8 - Still faulting. Consistently 5°F above setpoint. Reopen?' },
    { id:7,  name:'Low Airflow at Full Demand',           equipId:'vav-101',   equipDis:'VAV-101',   status:'Open',   priority:2, dateAdded:'2026-05-15', dateResolved:null,         assignedTo:'J. Martinez', comments:'5/15 - Airflow at ~60% of design max when damper fully open. Upstream static issue or damper linkage.' },
    { id:8,  name:'Condenser Pressure High',              equipId:'chiller-1', equipDis:'Chiller-1', status:'Closed', priority:1, dateAdded:'2026-01-18', dateResolved:'2026-02-05', assignedTo:'R. Chen',     comments:'1/18 - Head pressure elevated.\n2/5 - Condenser tubes cleaned. Resolved.' },
    { id:9,  name:'Economizer Not Modulating',            equipId:'ahu-1',     equipDis:'AHU-1',     status:'Open',   priority:2, dateAdded:'2026-05-30', dateResolved:null,         assignedTo:'',            comments:'5/30 - OA damper fixed at minimum position during favorable OAT. Actuator or signal issue.' },
    { id:10, name:'Short Cycling on Lead Boiler',         equipId:'boiler-1',  equipDis:'Boiler-1',  status:'Closed', priority:2, dateAdded:'2025-12-05', dateResolved:'2026-01-10', assignedTo:'K. Patel',    comments:'12/5 - Boiler cycling on/off every 3-4 min.\n1/10 - Differential setpoint widened. Stable now.' },
    { id:11, name:'HW Supply Temp Overshoot',             equipId:'boiler-1',  equipDis:'Boiler-1',  status:'Open',   priority:3, dateAdded:'2026-06-08', dateResolved:null,         assignedTo:'',            comments:'6/8 - HWST overshooting setpoint by 10°F on startup. Firing rate ramp too aggressive.' },
    { id:12, name:'Mixed Air Temp Sensor Drift',          equipId:'ahu-2',     equipDis:'AHU-2',     status:'Open',   priority:1, dateAdded:'2026-06-05', dateResolved:null,         assignedTo:'J. Martinez', comments:'6/5 - MAT reading doesn\'t reconcile with OAT/RAT blend. Sensor may need recalibration.' },
    { id:13, name:'Reheat Valve Stuck Closed',            equipId:'vav-102',   equipDis:'VAV-102',   status:'Open',   priority:1, dateAdded:'2026-06-09', dateResolved:null,         assignedTo:'K. Patel',    comments:'6/9 - Zone undershoot in morning warmup. Valve reading 0% despite demand.' },
    { id:14, name:'Cooling Valve Leaking Through',        equipId:'ahu-2',     equipDis:'AHU-2',     status:'Closed', priority:2, dateAdded:'2026-03-01', dateResolved:'2026-04-20', assignedTo:'R. Chen',     comments:'3/1 - DAT drops below setpoint when valve commanded closed.\n4/20 - Valve replaced. Verified.' },
    { id:15, name:'OAT Sensor Reading High',              equipId:'ahu-1',     equipDis:'AHU-1',     status:'Closed', priority:3, dateAdded:'2026-01-05', dateResolved:'2026-01-20', assignedTo:'J. Martinez', comments:'1/5 - OAT reading 12°F above NOAA. Sensor in direct sunlight.\n1/20 - Relocated sensor. Resolved.' }
  ];

  // ── Public API ─────────────────────────────────────────────────────────

  function initLive(container, ctx) {
    _container = container;
    _expandedId = null;
    _sort = { key: 'id', dir: 'asc' };
    _filters = { equipId: '', status: '', priority: '', assignedTo: '' };

    // Try to load from live SkySpark; fall back to demo data
    if (ctx && ctx.attestKey) {
      _rows = [];
      _render();
      // Placeholder — swap axon call below when a real endpoint exists
      // NS.api.evalAxon(ctx.attestKey, ctx.projectName, 'faultLog(...)').then(function(grid){
      //   _rows = _mapFromGrid(grid);
      //   _render();
      // }).catch(function() { _rows = _demoRows; _render(); });
      _rows = _demoRows;
      _render();
    } else {
      _rows = _demoRows;
      _render();
    }
  }

  function destroy() {
    _container = null;
    _rows = [];
    _expandedId = null;
  }

  return { renderPage: renderPage, initLive: initLive, destroy: destroy };

})();
