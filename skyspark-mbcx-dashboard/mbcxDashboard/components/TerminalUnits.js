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

/* ── Histogram metrics ── */
var TU_HIST_METRICS = [
  { patterns: ['zonetemp', 'zone_temp'], label: 'Zone Temp',    unit: '°F' },
  { patterns: ['reheat'],                label: 'Reheat Valve', unit: '%'   },
  { patterns: ['damper'],                label: 'Damper Cmd',   unit: '%'   },
];

var TU_NUM_BINS = 5;

// Accent palette: 5 shades from light to dark orange
var TU_BIN_COLORS = ['#FDE8D0', '#F9C78E', '#E8943A', '#C2410C', '#8B2E08'];

function _tuAvg(rows, key) {
  var vals = rows.map(function(r) { return r[key]; }).filter(function(v) {
    return v !== null && v !== undefined && !isNaN(+v);
  });
  return vals.length ? vals.reduce(function(s, v) { return s + (+v); }, 0) / vals.length : null;
}

function _tuMedian(rows, key) {
  var vals = rows.map(function(r) { return r[key]; }).filter(function(v) {
    return v !== null && v !== undefined && !isNaN(+v);
  }).map(Number).sort(function (a, b) { return a - b; });
  if (!vals.length) return null;
  var mid = Math.floor(vals.length / 2);
  return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
}

function _tuSparkSvg(points, w, h, color) {
  if (!points || points.length < 2) return '';
  var filtered = points.filter(function (v) { return v !== null; });
  if (filtered.length < 2) return '';
  var min = Math.min.apply(null, filtered);
  var max = Math.max.apply(null, filtered);
  if (max === min) { max = min + 1; }
  var step = w / (points.length - 1);
  var coords = [];
  points.forEach(function (v, i) {
    if (v === null) return;
    var x = (i * step).toFixed(1);
    var y = (h - (v - min) / (max - min) * h).toFixed(1);
    coords.push(x + ',' + y);
  });
  return '<svg class="tu-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
    + '<polyline points="' + coords.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>';
}

function _tuFindCol(cols, patterns) {
  for (var i = 0; i < patterns.length; i++) {
    for (var j = 0; j < cols.length; j++) {
      if (cols[j].toLowerCase().indexOf(patterns[i]) !== -1) return cols[j];
    }
  }
  return null;
}

function _tuBuildBins(rows, col, numBins) {
  var vals = [];
  rows.forEach(function (r) {
    var v = r[col];
    if (v !== null && v !== undefined && !isNaN(+v)) vals.push(+v);
  });
  if (!vals.length) return null;

  vals.sort(function (a, b) { return a - b; });
  var lo = vals[0], hi = vals[vals.length - 1];
  if (hi === lo) hi = lo + 1;
  var step = (hi - lo) / numBins;

  var bins = [];
  for (var i = 0; i < numBins; i++) {
    var bLo = lo + step * i;
    var bHi = (i === numBins - 1) ? hi : lo + step * (i + 1);
    bins.push({ lo: bLo, hi: bHi, count: 0, idx: i });
  }

  vals.forEach(function (v) {
    var idx = Math.min(Math.floor((v - lo) / step), numBins - 1);
    bins[idx].count++;
  });

  return { bins: bins, lo: lo, hi: hi, total: vals.length };
}

window.mbcxDashboard.components.TerminalUnits = {

  _state: null,
  _histMeta: [],

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
      '      <div class="tu-kpi"><div class="tu-kpi-label">Total VAVs</div><div class="tu-kpi-row"><div class="tu-kpi-val" id="tuKpiTotal">&mdash;</div></div><div class="tu-kpi-unit">units</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Zone Temp</div><div class="tu-kpi-row"><div class="tu-kpi-val" id="tuKpiZone">&mdash;</div><div id="tuSparkZone"></div></div><div class="tu-kpi-unit">&deg;F median</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Supply Air Temp</div><div class="tu-kpi-row"><div class="tu-kpi-val" id="tuKpiDat">&mdash;</div><div id="tuSparkDat"></div></div><div class="tu-kpi-unit">&deg;F median</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Reheat Valve</div><div class="tu-kpi-row"><div class="tu-kpi-val" id="tuKpiReheat">&mdash;</div><div id="tuSparkReheat"></div></div><div class="tu-kpi-unit">% median</div></div>',
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
    var setHtml = function (id, html) { var el = container.querySelector('#' + id); if (el) el.innerHTML = html; };

    var zoneCol   = _tuFindCol(cols, ['zonetemp', 'zone_temp']);
    var satCol    = _tuFindCol(cols, ['satavg', 'sat_f', 'supplyair', 'sat']);
    var reheatCol = _tuFindCol(cols, ['reheat']);

    var fmt = function (v) { return v !== null ? v.toFixed(1) : '—'; };
    set('tuKpiTotal',  rows.length);
    set('tuKpiZone',   zoneCol   ? fmt(_tuMedian(rows, zoneCol))   : '—');
    set('tuKpiDat',    satCol    ? fmt(_tuMedian(rows, satCol))    : '—');
    set('tuKpiReheat', reheatCol ? fmt(_tuMedian(rows, reheatCol)) : '—');
    set('tuMeta', rows.length + ' VAVs');

    // Sparklines — demo trend data until a historical Axon query is wired
    this._renderSparklines(container, rows, zoneCol, satCol, reheatCol);

    this._renderHistograms(container, rows, cols);
    this._buildTable(container, rows, cols);
  },

  _renderSparklines: function (container, rows, zoneCol, satCol, reheatCol) {
    var setHtml = function (id, html) { var el = container.querySelector('#' + id); if (el) el.innerHTML = html; };
    var color = '#C2410C';

    // Generate plausible 12-month trend centered on the current fleet value
    function demoTrend(currentVal, variance) {
      if (currentVal === null) return null;
      var pts = [];
      for (var i = 0; i < 12; i++) {
        pts.push(currentVal + (Math.sin(i * 0.8) * variance) + (Math.random() - 0.5) * variance * 0.5);
      }
      pts[11] = currentVal;
      return pts;
    }

    var zoneAvg   = zoneCol   ? _tuAvg(rows, zoneCol)   : null;
    var satAvg    = satCol    ? _tuAvg(rows, satCol)    : null;
    var reheatAvg = reheatCol ? _tuAvg(rows, reheatCol) : null;

    setHtml('tuSparkZone',   _tuSparkSvg(demoTrend(zoneAvg, 1.5),   60, 24, color));
    setHtml('tuSparkDat',    _tuSparkSvg(demoTrend(satAvg, 3),      60, 24, color));
    setHtml('tuSparkReheat', _tuSparkSvg(demoTrend(reheatAvg, 5),   60, 24, color));
  },

  _renderHistograms: function (container, rows, cols) {
    var self = this;
    var el = container.querySelector('#tuDistBars');
    if (!el) return;

    self._histMeta = [];
    var barRows = [];

    TU_HIST_METRICS.forEach(function (m) {
      var col = _tuFindCol(cols, m.patterns);
      if (!col) return;

      var result = _tuBuildBins(rows, col, TU_NUM_BINS);
      if (!result) return;

      self._histMeta.push({ col: col, metric: m, bins: result.bins });

      var segs = result.bins.map(function (bin) {
        var pct = (bin.count / result.total * 100).toFixed(1);
        var pctInt = Math.round(+pct);
        var color = TU_BIN_COLORS[bin.idx];
        var textColor = bin.idx >= 3 ? '#fff' : '#4B5563';
        var label = pctInt >= 8
          ? '<span class="tu-dist-pct" style="color:' + textColor + ';">' + bin.count + '</span>'
          : '';
        var loLabel = bin.lo.toFixed(0);
        var hiLabel = bin.hi.toFixed(0);
        return bin.count
          ? '<div class="tu-dist-seg" style="width:' + pct + '%;background:' + color + ';"'
            + ' data-hist-col="' + col + '" data-hist-bin="' + bin.idx + '"'
            + ' title="' + loLabel + '–' + hiLabel + m.unit + ': ' + bin.count + ' units (' + pct + '%) — click to filter">'
            + label + '</div>'
          : '';
      }).join('');

      var minLabel = result.lo.toFixed(0) + m.unit;
      var maxLabel = result.hi.toFixed(0) + m.unit;
      var avgVal = _tuAvg(rows, col);
      var medVal = _tuMedian(rows, col);
      var span   = result.hi - result.lo;

      // Center label: show median (and avg if they diverge)
      var centerParts = [];
      if (medVal !== null) centerParts.push('med ' + medVal.toFixed(1) + m.unit);
      if (avgVal !== null && medVal !== null && Math.abs(avgVal - medVal) > span * 0.03) {
        centerParts.push('avg ' + avgVal.toFixed(1) + m.unit);
      }
      var centerLabel = centerParts.join(' · ');

      // Median tick on bar
      var medTick = '';
      if (medVal !== null && span > 0) {
        var medPos = ((medVal - result.lo) / span * 100);
        if (medPos > 2 && medPos < 98) {
          medTick = '<div class="tu-hist-med-tick" style="left:' + medPos.toFixed(1) + '%;" title="Median: ' + medVal.toFixed(1) + m.unit + '"></div>';
        }
      }

      barRows.push([
        '<div class="tu-dist-row">',
        '  <div class="tu-dist-label">' + m.label + '</div>',
        '  <div class="tu-dist-bar-outer">',
        '    <div class="tu-dist-bar">' + segs + '</div>',
        medTick,
        '    <div class="tu-hist-range">',
        '      <span>' + minLabel + '</span>',
        '      <span class="tu-hist-avg">' + centerLabel + '</span>',
        '      <span>' + maxLabel + '</span>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n'));
    });

    if (!barRows.length) { el.innerHTML = ''; return; }

    el.innerHTML = [
      '<div class="tu-dist-section">',
      '  <div class="tu-dist-header">',
      '    <span class="tu-dist-title">Fleet Distribution</span>',
      '    <span class="tu-hist-hint">Click a segment to filter the table</span>',
      '  </div>',
      barRows.join('\n'),
      '</div>'
    ].join('\n');

    // Click-to-filter
    el.addEventListener('click', function (e) {
      var seg = e.target.closest('[data-hist-col]');
      if (!seg) return;
      var col = seg.getAttribute('data-hist-col');
      var binIdx = parseInt(seg.getAttribute('data-hist-bin'), 10);

      var st = self._state;
      if (!st) return;

      if (st.histCol === col && st.histBin === binIdx) {
        st.histCol = null;
        st.histBin = null;
      } else {
        st.histCol = col;
        st.histBin = binIdx;
      }

      var details = container.querySelector('#tuTableDetails');
      if (details && !details.open) details.open = true;

      self._updateHistHighlight(container);
      self._rebuildTbody(container);
    });
  },

  _updateHistHighlight: function (container) {
    var st = this._state;
    var segs = container.querySelectorAll('#tuDistBars [data-hist-col]');
    var hasFilter = st.histCol !== null && st.histBin !== null;
    segs.forEach(function (seg) {
      var isMatch = seg.getAttribute('data-hist-col') === st.histCol
                 && parseInt(seg.getAttribute('data-hist-bin'), 10) === st.histBin;
      seg.classList.toggle('tu-dist-seg--active', isMatch);
      seg.classList.toggle('tu-dist-seg--dim', hasFilter && !isMatch);
    });

    // Filter chip
    var chip = container.querySelector('#tuDistChip');
    if (!chip) return;
    if (hasFilter) {
      var hm = this._histMeta.filter(function (d) { return d.col === st.histCol; })[0];
      if (hm) {
        var bin = hm.bins[st.histBin];
        var rangeLabel = bin.lo.toFixed(0) + '–' + bin.hi.toFixed(0) + hm.metric.unit;
        chip.innerHTML = hm.metric.label + ': ' + rangeLabel + ' (' + bin.count + ')'
          + '<span class="tu-dist-chip-x" title="Clear filter">&times;</span>';
        chip.style.display = '';
      }
    } else {
      chip.style.display = 'none';
      chip.innerHTML = '';
    }
  },

  _buildTable: function (container, rows, cols) {
    var self = this;
    this._state = { rows: rows, cols: cols, sortCol: null, sortDir: 1, filter: '', histCol: null, histBin: null };

    var tableView = container.querySelector('#tuTableView');
    if (!tableView) return;

    tableView.innerHTML = [
      '<details class="tu-table-details" id="tuTableDetails">',
      '  <summary class="tu-table-toggle">',
      '    <svg class="tu-table-toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
      '    <span>View Details</span>',
      '    <span class="tu-table-toggle-sub">' + rows.length + ' VAVs</span>',
      '  </summary>',
      '  <div class="tu-table-content">',
      '    <div class="tu-filter-bar">',
      '      <input class="tu-filter-input" id="tuFilterInput" type="text" placeholder="Filter…" autocomplete="off" />',
      '      <span class="tu-dist-chip" id="tuDistChip" style="display:none;"></span>',
      '      <span class="tu-filter-count" id="tuFilterCount"></span>',
      '    </div>',
      '    <div style="overflow-x:auto;">',
      '      <table class="tu-table">',
      '        <thead id="tuThead"></thead>',
      '        <tbody id="tuTbody"></tbody>',
      '      </table>',
      '    </div>',
      '  </div>',
      '</details>'
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
        self._state.histCol = null;
        self._state.histBin = null;
        self._updateHistHighlight(container);
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
      ind.textContent = s.sortCol === col ? (s.sortDir === 1 ? ' ▲' : ' ▼') : '';
    });

    var countEl = container.querySelector('#tuFilterCount');
    if (countEl) countEl.textContent = rows.length + ' / ' + s.rows.length + ' VAVs';
  },

  _getDisplayRows: function () {
    var self = this;
    var s = this._state;
    var rows = s.rows;

    // Histogram bin filter
    if (s.histCol !== null && s.histBin !== null) {
      var hm = self._histMeta.filter(function (d) { return d.col === s.histCol; })[0];
      if (hm) {
        var bin = hm.bins[s.histBin];
        rows = rows.filter(function (row) {
          var v = row[s.histCol];
          if (v === null || v === undefined || isNaN(+v)) return false;
          var n = +v;
          return n >= bin.lo && n <= bin.hi;
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
