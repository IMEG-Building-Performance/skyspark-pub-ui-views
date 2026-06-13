// components/TerminalUnits.js — VAV Terminal Units section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

/* ── Column display labels ── */
var TU_COL_LABELS = {
  vav:              'VAV',
  areaserved:       'Area Served',
  zoneTempAvg:      'Zone Temp Avg',
  zoneTempSPDiff:   'Zone Temp SP Diff',
  zoneTempSP:       'Zone Temp SP',
  satAvg:           'SAT Avg',
  reheatValveAvg:   'Reheat Valve Avg',
  airflowAvg:       'Airflow Avg',
  airflowSpAvg:     'Airflow SP Avg',
  damperAvg:        'Damper Avg',
  occPct:           'Occ %',
  datHisAvg:        'DAT Avg',
};

function _tuMedian(rows, key) {
  var vals = rows.map(function(r) { return r[key]; }).filter(function(v) {
    return v !== null && v !== undefined && !isNaN(+v);
  }).map(Number).sort(function (a, b) { return a - b; });
  if (!vals.length) return null;
  var mid = Math.floor(vals.length / 2);
  return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
}

var TU_CONDITIONS = [
  { id: 'zoneHigh',  label: 'Zone > 75°F',    color: '#FEE2E2', activeColor: '#DC2626', activeText: '#fff' },
  { id: 'zoneLow',   label: 'Zone < 67°F',    color: '#DBEAFE', activeColor: '#2563EB', activeText: '#fff' },
  { id: 'spDiff',    label: 'SP Diff ≥ 3',     color: '#FEF3C7', activeColor: '#D97706', activeText: '#fff' },
  { id: 'damperHi',  label: 'Damper > 90%',   color: '#FEF3C7', activeColor: '#D97706', activeText: '#fff' },
  { id: 'reheatHi',  label: 'Reheat > 90%',   color: '#FEF3C7', activeColor: '#D97706', activeText: '#fff' },
  { id: 'datMismatch', label: 'DAT Mismatch', color: '#FEE2E2', activeColor: '#DC2626', activeText: '#fff' },
];

function _tuRowMatchesCondition(row, condId, cf) {
  var v, reheat;
  switch (condId) {
    case 'zoneHigh':
      v = cf.zoneTemp ? +row[cf.zoneTemp] : NaN;
      return !isNaN(v) && v > 75;
    case 'zoneLow':
      v = cf.zoneTemp ? +row[cf.zoneTemp] : NaN;
      return !isNaN(v) && v < 67;
    case 'spDiff':
      v = cf.spDiff ? +row[cf.spDiff] : NaN;
      return !isNaN(v) && Math.abs(v) >= 3;
    case 'damperHi':
      v = cf.damper ? +row[cf.damper] : NaN;
      return !isNaN(v) && v > 90;
    case 'reheatHi':
      v = cf.reheat ? +row[cf.reheat] : NaN;
      return !isNaN(v) && v > 90;
    case 'datMismatch':
      v = cf.dat ? +row[cf.dat] : NaN;
      reheat = cf.reheat ? +row[cf.reheat] : NaN;
      if (isNaN(v) || isNaN(reheat)) return false;
      return (v >= 85 && reheat < 5) || (v <= 65 && reheat >= 90);
    default: return false;
  }
}

function _tuFindCol(cols, patterns) {
  for (var i = 0; i < patterns.length; i++) {
    for (var j = 0; j < cols.length; j++) {
      if (cols[j].toLowerCase().indexOf(patterns[i]) !== -1) return cols[j];
    }
  }
  return null;
}

window.mbcxDashboard.components.TerminalUnits = {

  _state: null,

  render: function () {
    return [
      '<div class="equip-section" id="mbcxTerminalUnitsSection">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--orange-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Terminal Units</div><div class="equip-meta" id="tuMeta">&mdash; VAVs</div></div>',
      '    </div>',
      '    <button class="ahu-fs-btn" id="tuFsBtn" title="Toggle fullscreen">',
      '      <svg id="tuFsIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>',
      '        <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
      '      </svg>',
      '    </button>',
      '  </div>',
      '  <div class="equip-body">',

      '    <div class="tu-kpi-strip">',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Total VAVs</div><div class="tu-kpi-val" id="tuKpiTotal">&mdash;</div><div class="tu-kpi-unit">units</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Zone Temp</div><div class="tu-kpi-val" id="tuKpiZone">&mdash;</div><div class="tu-kpi-unit">&deg;F median</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Supply Air Temp</div><div class="tu-kpi-val" id="tuKpiDat">&mdash;</div><div class="tu-kpi-unit">&deg;F median</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Reheat Valve</div><div class="tu-kpi-val" id="tuKpiReheat">&mdash;</div><div class="tu-kpi-unit">% median</div></div>',
      '    </div>',

      '    <div id="tuTableView">',
      '      <div class="tu-loading">Loading VAV data…</div>',
      '    </div>',

      '  </div>',
      '</div>'
    ].join('\n');
  },

  initLive: function (container, ctx) {
    var self = this;
    var loaded = false;

    function load() {
      if (loaded) return;
      loaded = true;
      if (ctx && ctx.attestKey && ctx.siteRef) {
        self._fetchLive(container, ctx);
      } else {
        self._showEmpty(container, 'No site selected — configure a site to load VAV data.');
      }
    }

    load();

    // Fullscreen button
    var fsBtn    = container.querySelector('#tuFsBtn');
    var fsIcon   = container.querySelector('#tuFsIcon');
    var section  = container.querySelector('#mbcxTerminalUnitsSection');
    if (fsBtn && section) {
      fsBtn.addEventListener('click', function () {
        var expand = '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
        var collapse = '<polyline points="4 14 10 14 10 20"/><polyline points="20 4 14 4 14 10"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>';
        if (document.fullscreenElement) {
          document.exitFullscreen();
          if (fsIcon) fsIcon.innerHTML = expand;
        } else {
          var req = section.requestFullscreen || section.webkitRequestFullscreen;
          if (req) req.call(section);
          if (fsIcon) fsIcon.innerHTML = collapse;
        }
      });
      document.addEventListener('fullscreenchange', function () {
        if (!document.fullscreenElement && fsIcon) {
          fsIcon.innerHTML = '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
        }
      });
    }
  },

  _fetchLive: function (container, ctx) {
    var self = this;
    var API  = window.mbcxDashboard.api;
    var HP   = window.mbcxDashboard.haystackParser;

    var dateArg = (ctx.datesStart && ctx.datesEnd)
      ? ctx.datesStart + '..' + ctx.datesEnd
      : 'today()';
    var expr = 'view_pub_mbcxDashboard_VAVs_table(' + ctx.siteRef + ', ' + dateArg + ')';

    API.evalAxon(ctx.attestKey, ctx.projectName, expr)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        if (!parsed.rows.length) {
          self._showEmpty(container, 'No VAV data returned for this site and date range.');
        } else {
          self._populate(container, parsed.rows, parsed.cols);
        }
      })
      .catch(function (err) {
        console.error('[TU] VAV table fetch failed:', err);
        self._showEmpty(container, 'Failed to load VAV data. See console for details.');
      });
  },

  _showEmpty: function (container, msg) {
    var el = container.querySelector('#tuTableView');
    if (el) el.innerHTML = '<div class="tu-loading">' + msg + '</div>';
    var el2 = container.querySelector('#tuMeta');
    if (el2) el2.textContent = '— VAVs';
  },

  _populate: function (container, rows, cols) {
    var set = function (id, val) { var el = container.querySelector('#' + id); if (el) el.textContent = val; };

    var zoneCol   = _tuFindCol(cols, ['zonetemp', 'zone_temp']);
    var satCol    = _tuFindCol(cols, ['satavg', 'sat_f', 'supplyair', 'sat']);
    var reheatCol = _tuFindCol(cols, ['reheat']);

    var fmt = function (v) { return v !== null ? v.toFixed(1) : '—'; };
    set('tuKpiTotal',  rows.length);
    set('tuKpiZone',   zoneCol   ? fmt(_tuMedian(rows, zoneCol))   : '—');
    set('tuKpiDat',    satCol    ? fmt(_tuMedian(rows, satCol))    : '—');
    set('tuKpiReheat', reheatCol ? fmt(_tuMedian(rows, reheatCol)) : '—');
    set('tuMeta', rows.length + ' VAVs');

    this._buildTable(container, rows, cols);
  },

  _buildTable: function (container, rows, cols) {
    var self = this;
    var zoneTempCol  = _tuFindCol(cols, ['zonetempavg', 'zonetemp', 'zone_temp']);
    var spDiffCol    = _tuFindCol(cols, ['zonetempsp', 'tempspdiff', 'spdiff']);
    var damperCol    = _tuFindCol(cols, ['damper']);
    var reheatCol    = _tuFindCol(cols, ['reheat']);
    var datCol       = _tuFindCol(cols, ['dathis', 'datavg', 'dat']);

    // Derived Zone Temp SP column = zoneTemp − SP diff. Assumes the diff
    // column is signed (zoneTemp - setpoint); if the server view ever
    // exports a real setpoint column, prefer that and drop this.
    if (zoneTempCol && spDiffCol && cols.indexOf('zoneTempSP') === -1) {
      rows.forEach(function (r) {
        var z = +r[zoneTempCol], d = +r[spDiffCol];
        r.zoneTempSP = (!isNaN(z) && !isNaN(d)) ? +(z - d).toFixed(1) : null;
      });
      cols = cols.slice();
      cols.splice(cols.indexOf(spDiffCol) + 1, 0, 'zoneTempSP');
    }

    var cfCols = { zoneTemp: zoneTempCol, spDiff: spDiffCol, damper: damperCol, reheat: reheatCol, dat: datCol };
    this._state = {
      rows: rows, cols: cols, sortCol: null, sortDir: 1, filter: '',
      cfCols: cfCols, activeConditions: {}
    };

    // Pre-count how many rows match each condition
    var condCounts = {};
    TU_CONDITIONS.forEach(function (c) {
      condCounts[c.id] = rows.filter(function (r) { return _tuRowMatchesCondition(r, c.id, cfCols); }).length;
    });

    var chipHtml = TU_CONDITIONS.map(function (c) {
      if (!condCounts[c.id]) return '';
      return '<button class="tu-cond-chip" data-cond="' + c.id + '"'
        + ' data-color="' + c.color + '" data-active-color="' + c.activeColor + '" data-active-text="' + c.activeText + '"'
        + ' style="background:' + c.color + ';">'
        + c.label + '<span class="tu-cond-count">' + condCounts[c.id] + '</span></button>';
    }).filter(Boolean).join('');

    var tableView = container.querySelector('#tuTableView');
    if (!tableView) return;

    tableView.innerHTML = [
      '<div class="tu-filter-bar">',
      '  <input class="tu-filter-input" id="tuFilterInput" type="text" placeholder="Filter VAVs…" autocomplete="off" />',
      '  <span class="tu-filter-count" id="tuFilterCount"></span>',
      '</div>',
      chipHtml ? '<div class="tu-cond-bar" id="tuCondBar">' + chipHtml + '</div>' : '',
      '<div class="tu-table-scroll">',
      '  <table class="tu-table">',
      '    <thead id="tuThead"></thead>',
      '    <tbody id="tuTbody"></tbody>',
      '  </table>',
      '</div>'
    ].join('\n');

    var thead = container.querySelector('#tuThead');
    thead.innerHTML = '<tr>' + cols.map(function (k) {
      return '<th class="tu-th tu-th-sort" data-col="' + k + '">' +
        (TU_COL_LABELS[k] || k) +
        '<span class="tu-sort-ind" data-col="' + k + '"></span>' +
        '</th>';
    }).join('') + '</tr>';

    var ths = thead.querySelectorAll('.tu-th-sort');
    ths.forEach(function (th) {
      th.addEventListener('click', function () {
        var col = th.getAttribute('data-col');
        if (self._state.sortCol === col) {
          self._state.sortDir *= -1;
        } else {
          self._state.sortCol = col;
          self._state.sortDir = 1;
        }
        self._rebuildTbody(container);
      });
    });

    var filterInput = container.querySelector('#tuFilterInput');
    if (filterInput) {
      filterInput.addEventListener('input', function () {
        self._state.filter = filterInput.value;
        self._rebuildTbody(container);
      });
    }

    // VAV name → Equipment page
    var tbodyEl = container.querySelector('#tuTbody');
    if (tbodyEl) {
      tbodyEl.addEventListener('click', function (e) {
        var link = e.target.closest('.tu-vav-link');
        if (!link) return;
        var NSd = window.mbcxDashboard;
        if (NSd.components.EquipmentView && NSd.components.EquipmentView.preselect) {
          NSd.components.EquipmentView.preselect(link.getAttribute('data-vavequip'));
        }
        if (NSd.App && NSd.App._showTab) {
          NSd.App._showTab(container, 'equipment', NSd.Components, NSd.App._lastData, NSd.App._lastCtx);
        }
      });
    }

    var condBar = container.querySelector('#tuCondBar');
    if (condBar) {
      condBar.addEventListener('click', function (e) {
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

    this._rebuildTbody(container);
  },

  _rebuildTbody: function (container) {
    var s    = this._state;
    var rows = this._getDisplayRows();
    var tbody = container.querySelector('#tuTbody');
    if (!tbody) return;

    var cf = s.cfCols;
    tbody.innerHTML = rows.map(function (row) {
      var reheatVal = cf.reheat ? +row[cf.reheat] : NaN;
      var datVal    = cf.dat    ? +row[cf.dat]     : NaN;

      return '<tr>' + s.cols.map(function (k, i) {
        var val = row[k];
        if (val && typeof val === 'object' && val.dis) val = val.dis;
        var cls = i === 0 ? 'tu-td tu-td-name' : 'tu-td';

        // VAV name links to the Equipment page
        if (i === 0 && val !== null && val !== undefined) {
          var nameEsc = String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          return '<td class="' + cls + '"><button class="tu-vav-link" data-vavequip="' +
            nameEsc + '" title="Open in Equipment view">' + nameEsc + '</button></td>';
        }
        var style = '';
        var num = (val !== null && val !== undefined) ? +val : NaN;

        if (!isNaN(num)) {
          if (k === cf.zoneTemp) {
            if (num > 75) style = ' tu-cf-hot';
            else if (num < 67) style = ' tu-cf-cold';
          } else if (k === cf.spDiff) {
            var abs = Math.abs(num);
            if (abs >= 5) style = ' tu-cf-hot';
            else if (abs >= 3) style = ' tu-cf-warm';
          } else if (k === cf.damper && num > 90) {
            style = ' tu-cf-warn';
          } else if (k === cf.reheat && num > 90) {
            style = ' tu-cf-warn';
          } else if (k === cf.dat) {
            if (num >= 85 && !isNaN(reheatVal) && reheatVal < 5) style = ' tu-cf-hot';
            else if (num <= 65 && !isNaN(reheatVal) && reheatVal >= 90) style = ' tu-cf-warn';
          }
        }

        return '<td class="' + cls + style + '">' + (val !== null && val !== undefined ? val : '—') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    var inds = container.querySelectorAll('#tuThead .tu-sort-ind');
    inds.forEach(function (ind) {
      var col = ind.getAttribute('data-col');
      ind.textContent = s.sortCol === col ? (s.sortDir === 1 ? ' ▲' : ' ▼') : '';
    });

    var countEl = container.querySelector('#tuFilterCount');
    if (countEl) countEl.textContent = rows.length + ' / ' + s.rows.length + ' VAVs';
  },

  _getDisplayRows: function () {
    var s = this._state;
    var rows = s.rows;

    var activeIds = Object.keys(s.activeConditions);
    if (activeIds.length) {
      var cf = s.cfCols;
      rows = rows.filter(function (row) {
        return activeIds.some(function (id) { return _tuRowMatchesCondition(row, id, cf); });
      });
    }

    if (s.filter) {
      var q = s.filter.toLowerCase();
      rows = rows.filter(function (row) {
        return s.cols.some(function (col) {
          var v = row[col];
          if (v === null || v === undefined) return false;
          var str = (v && v.dis) ? v.dis : String(v);
          return str.toLowerCase().indexOf(q) !== -1;
        });
      });
    }

    if (s.sortCol) {
      var col = s.sortCol, dir = s.sortDir;
      rows = rows.slice().sort(function (a, b) {
        var av = a[col], bv = b[col];
        if (av === null || av === undefined) return dir;
        if (bv === null || bv === undefined) return -dir;
        var an = parseFloat(av), bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    return rows;
  }
};
