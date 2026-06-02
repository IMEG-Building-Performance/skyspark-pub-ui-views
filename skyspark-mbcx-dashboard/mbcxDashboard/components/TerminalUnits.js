// components/TerminalUnits.js — VAV Terminal Units section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

/* ── Column display labels ── */
var TU_COL_LABELS = {
  vav:              'VAV',
  areaserved:       'Area Served',
  zoneTempAvg:      'Zone Temp Avg',
  satAvg:           'SAT Avg',
  reheatValveAvg:   'Reheat Valve Avg',
  airflowAvg:       'Airflow Avg',
  airflowSpAvg:     'Airflow SP Avg',
  damperAvg:        'Damper Avg',
  occPct:           'Occ %',
};

/* ── Distribution bar metric definitions ── */
var TU_DIST_METRICS = [
  { patterns: ['zonetemp', 'zone_temp'], label: 'Zone Temp',    unit: '°F', goodLo: 70, goodHi: 75, watchLo: 68, watchHi: 77 },
  { patterns: ['reheat'],                label: 'Reheat Valve', unit: '%',        goodLo: 0,  goodHi: 20, watchLo: 0,  watchHi: 50 },
  { patterns: ['damper'],                label: 'Damper',        unit: '%',        goodLo: 20, goodHi: 80, watchLo: 10, watchHi: 95 },
];

function _tuAvg(rows, key) {
  var vals = rows.map(function(r) { return r[key]; }).filter(function(v) {
    return v !== null && v !== undefined && !isNaN(+v);
  });
  return vals.length ? vals.reduce(function(s, v) { return s + (+v); }, 0) / vals.length : null;
}

function _tuFindCol(cols, patterns) {
  for (var i = 0; i < patterns.length; i++) {
    for (var j = 0; j < cols.length; j++) {
      if (cols[j].toLowerCase().indexOf(patterns[i]) !== -1) return cols[j];
    }
  }
  return null;
}

function _tuClassify(val, m) {
  if (val === null || val === undefined || isNaN(+val)) return null;
  var v = +val;
  if (v >= m.goodLo && v <= m.goodHi) return 'good';
  if (v >= m.watchLo && v <= m.watchHi) return 'watch';
  return 'problem';
}

window.mbcxDashboard.components.TerminalUnits = {

  _state: null,

  render: function () {
    return [
      '<div class="equip-section equip-section--collapsible equip-section--open" id="mbcxTerminalUnitsSection" style="border-left-color:#C2410C;">',
      '  <div class="equip-header equip-header--clickable" onclick="this.closest(\'.equip-section\').classList.toggle(\'equip-section--open\');">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--orange-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Terminal Units</div><div class="equip-meta" id="tuMeta">&mdash; VAVs</div></div>',
      '    </div>',
      '    <div style="display:flex;align-items:center;gap:8px;">',
      '      <button class="ahu-fs-btn" id="tuFsBtn" title="Toggle fullscreen" onclick="event.stopPropagation();">',
      '        <svg id="tuFsIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>',
      '          <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
      '        </svg>',
      '      </button>',
      '      <div class="equip-collapse-btn" title="Expand / Collapse">',
      '        <svg class="equip-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="equip-body">',

      '    <div class="tu-kpi-strip">',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Total VAVs</div><div class="tu-kpi-val" id="tuKpiTotal">&mdash;</div><div class="tu-kpi-unit">units</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Avg Zone Temp</div><div class="tu-kpi-val" id="tuKpiZone">&mdash;</div><div class="tu-kpi-unit">&deg;F</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Avg Supply Air Temp</div><div class="tu-kpi-val" id="tuKpiDat">&mdash;</div><div class="tu-kpi-unit">&deg;F</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Avg Reheat Valve</div><div class="tu-kpi-val" id="tuKpiReheat">&mdash;</div><div class="tu-kpi-unit">%</div></div>',
      '    </div>',

      '    <div id="tuDistBars"></div>',

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

    var header = container.querySelector('#mbcxTerminalUnitsSection .equip-header--clickable');
    if (header) header.addEventListener('click', function () { setTimeout(load, 50); });

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
    set('tuKpiZone',   zoneCol   ? fmt(_tuAvg(rows, zoneCol))   : '—');
    set('tuKpiDat',    satCol    ? fmt(_tuAvg(rows, satCol))    : '—');
    set('tuKpiReheat', reheatCol ? fmt(_tuAvg(rows, reheatCol)) : '—');
    set('tuMeta', rows.length + ' VAVs');

    this._renderDistBars(container, rows, cols);
    this._buildTable(container, rows, cols);
  },

  _distMeta: [],

  _renderDistBars: function (container, rows, cols) {
    var self = this;
    var el = container.querySelector('#tuDistBars');
    if (!el) return;

    self._distMeta = [];
    var bars = [];
    TU_DIST_METRICS.forEach(function (m) {
      var col = _tuFindCol(cols, m.patterns);
      if (!col) return;
      self._distMeta.push({ col: col, metric: m });

      var counts = { good: 0, watch: 0, problem: 0, noData: 0 };
      rows.forEach(function (r) {
        var cls = _tuClassify(r[col], m);
        if (cls) counts[cls]++; else counts.noData++;
      });
      var total = counts.good + counts.watch + counts.problem;
      if (!total) return;

      var pGood  = (counts.good    / total * 100).toFixed(1);
      var pWatch = (counts.watch   / total * 100).toFixed(1);
      var pProb  = (counts.problem / total * 100).toFixed(1);

      var segHtml = function (cls, pct, count, rangeTip) {
        if (!count) return '';
        var pctInt = Math.round(+pct);
        var label = pctInt >= 8 ? '<span class="tu-dist-pct">' + pctInt + '%</span>' : '';
        return '<div class="tu-dist-seg tu-dist-' + cls + '" style="width:' + pct + '%"'
          + ' data-dist-col="' + col + '" data-dist-cls="' + cls + '"'
          + ' title="' + rangeTip + ' — ' + count + ' units (' + pct + '%) — click to filter table">'
          + label + '</div>';
      };

      // Tick positions: map threshold values to % position across the bar's data range
      var vals = rows.map(function (r) { return r[col]; }).filter(function (v) {
        return v !== null && v !== undefined && !isNaN(+v);
      }).map(Number).sort(function (a, b) { return a - b; });
      var lo = vals[0], hi = vals[vals.length - 1];
      var span = hi - lo;

      var tickHtml = '';
      if (span > 0) {
        var ticks = [
          { val: m.goodLo, label: m.goodLo + m.unit },
          { val: m.goodHi, label: m.goodHi + m.unit },
        ];
        if (m.watchLo !== m.goodLo) ticks.push({ val: m.watchLo, label: m.watchLo + m.unit });
        if (m.watchHi !== m.goodHi) ticks.push({ val: m.watchHi, label: m.watchHi + m.unit });

        // Deduplicate
        var seen = {};
        ticks = ticks.filter(function (t) {
          if (seen[t.val]) return false;
          seen[t.val] = true;
          return true;
        });

        ticks.forEach(function (t) {
          var pos = ((t.val - lo) / span * 100);
          if (pos < 2 || pos > 98) return;
          tickHtml += '<div class="tu-dist-tick" style="left:' + pos.toFixed(1) + '%">'
            + '<span class="tu-dist-tick-label">' + t.label + '</span></div>';
        });
      }

      bars.push([
        '<div class="tu-dist-row">',
        '  <div class="tu-dist-label">' + m.label + '</div>',
        '  <div class="tu-dist-bar-outer">',
        '    <div class="tu-dist-bar">',
             segHtml('good',    pGood,  counts.good,    'Good: ' + m.goodLo + '–' + m.goodHi + m.unit),
             segHtml('watch',   pWatch, counts.watch,   'Watch: ' + m.watchLo + '–' + m.watchHi + m.unit),
             segHtml('problem', pProb,  counts.problem, 'Problem: outside ' + m.watchLo + '–' + m.watchHi + m.unit),
        '    </div>',
             tickHtml,
        '  </div>',
        '</div>'
      ].join('\n'));
    });

    if (!bars.length) { el.innerHTML = ''; return; }

    el.innerHTML = [
      '<div class="tu-dist-section">',
      '  <div class="tu-dist-header">',
      '    <span class="tu-dist-title">Fleet Health</span>',
      '    <span class="tu-dist-legend">',
      '      <span class="tu-dist-dot tu-dist-dot--good"></span>Good',
      '      <span class="tu-dist-dot tu-dist-dot--watch"></span>Watch',
      '      <span class="tu-dist-dot tu-dist-dot--problem"></span>Problem',
      '    </span>',
      '  </div>',
      bars.join('\n'),
      '</div>'
    ].join('\n');

    // Click-to-filter wiring
    el.addEventListener('click', function (e) {
      var seg = e.target.closest('[data-dist-col]');
      if (!seg) return;
      var col = seg.getAttribute('data-dist-col');
      var cls = seg.getAttribute('data-dist-cls');

      var st = self._state;
      if (!st) return;

      // Toggle: clicking same segment again clears the filter
      if (st.distCol === col && st.distCls === cls) {
        st.distCol = null;
        st.distCls = null;
      } else {
        st.distCol = col;
        st.distCls = cls;
      }
      self._updateDistHighlight(container);
      self._rebuildTbody(container);
    });
  },

  _updateDistHighlight: function (container) {
    var st = this._state;
    var segs = container.querySelectorAll('#tuDistBars [data-dist-col]');
    segs.forEach(function (seg) {
      var active = st.distCol && st.distCls;
      var isMatch = seg.getAttribute('data-dist-col') === st.distCol
                 && seg.getAttribute('data-dist-cls') === st.distCls;
      seg.classList.toggle('tu-dist-seg--active', isMatch);
      seg.classList.toggle('tu-dist-seg--dim', active && !isMatch);
    });

    // Show/hide filter chip
    var chip = container.querySelector('#tuDistChip');
    if (!chip) return;
    if (st.distCol && st.distCls) {
      var dm = this._distMeta.filter(function (d) { return d.col === st.distCol; })[0];
      var label = dm ? dm.metric.label : st.distCol;
      var clsLabel = st.distCls.charAt(0).toUpperCase() + st.distCls.slice(1);
      chip.innerHTML = '<span class="tu-dist-chip-dot tu-dist-dot--' + st.distCls + '"></span>'
        + label + ': ' + clsLabel
        + '<span class="tu-dist-chip-x" title="Clear filter">&times;</span>';
      chip.style.display = '';
    } else {
      chip.style.display = 'none';
      chip.innerHTML = '';
    }
  },

  _buildTable: function (container, rows, cols) {
    var self = this;
    this._state = { rows: rows, cols: cols, sortCol: null, sortDir: 1, filter: '', distCol: null, distCls: null };

    var tableView = container.querySelector('#tuTableView');
    if (!tableView) return;

    tableView.innerHTML = [
      '<div class="tu-filter-bar">',
      '  <input class="tu-filter-input" id="tuFilterInput" type="text" placeholder="Filter…" autocomplete="off" />',
      '  <span class="tu-dist-chip" id="tuDistChip" style="display:none;"></span>',
      '  <span class="tu-filter-count" id="tuFilterCount">' + rows.length + ' / ' + rows.length + ' VAVs</span>',
      '</div>',
      '<div style="overflow-x:auto;">',
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

    var chip = container.querySelector('#tuDistChip');
    if (chip) {
      chip.addEventListener('click', function () {
        self._state.distCol = null;
        self._state.distCls = null;
        self._updateDistHighlight(container);
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

    tbody.innerHTML = rows.map(function (row) {
      return '<tr>' + s.cols.map(function (k, i) {
        var val = row[k];
        if (val && typeof val === 'object' && val.dis) val = val.dis;
        var cls = i === 0 ? 'tu-td tu-td-name' : 'tu-td';
        return '<td class="' + cls + '">' + (val !== null && val !== undefined ? val : '—') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    var inds = container.querySelectorAll('#tuThead .tu-sort-ind');
    inds.forEach(function (ind) {
      var col = ind.getAttribute('data-col');
      ind.textContent = s.sortCol === col ? (s.sortDir === 1 ? ' ▲' : ' ▼') : '';
    });

    var countEl = container.querySelector('#tuFilterCount');
    if (countEl) countEl.textContent = rows.length + ' / ' + s.rows.length + ' VAVs';
  },

  _getDisplayRows: function () {
    var self = this;
    var s = this._state;
    var rows = s.rows;

    // Distribution bar filter
    if (s.distCol && s.distCls) {
      var dm = self._distMeta.filter(function (d) { return d.col === s.distCol; })[0];
      if (dm) {
        rows = rows.filter(function (row) {
          return _tuClassify(row[s.distCol], dm.metric) === s.distCls;
        });
      }
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
