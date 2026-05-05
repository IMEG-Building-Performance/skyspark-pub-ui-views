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

window.mbcxDashboard.components.TerminalUnits = {

  _state: null, // { rows, cols, sortCol, sortDir, filter }

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

      '    <div class="toggle-bar" style="margin-bottom:16px;">',
      '      <button class="toggle-btn active" id="tuBtnTable">VAV Table</button>',
      '      <button class="toggle-btn" id="tuBtnScatter">VAV Reheat Scatter</button>',
      '    </div>',

      '    <div id="tuTableView">',
      '      <div class="tu-loading">Loading VAV data\u2026</div>',
      '    </div>',

      '    <div id="tuScatterView" style="display:none;">',
      '      <div class="rs-legend" id="tuScatterLegend"></div>',
      '      <div class="rs-summary" id="tuScatterSummary"></div>',
      '      <div style="position:relative;">',
      '        <svg class="rs-svg" id="tuScatterSvg"></svg>',
      '      </div>',
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
        self._showEmpty(container, 'No site selected \u2014 configure a site to load VAV data.');
      }
    }

    // Section is open by default — load immediately
    load();

    // Re-trigger is a no-op after first load
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

    // Toggle wiring (done once, before data arrives)
    var btnTable    = container.querySelector('#tuBtnTable');
    var btnScatter  = container.querySelector('#tuBtnScatter');
    var tableView   = container.querySelector('#tuTableView');
    var scatterView = container.querySelector('#tuScatterView');
    var scatterInited = false;

    if (btnTable) {
      btnTable.addEventListener('click', function () {
        btnTable.classList.add('active'); btnScatter.classList.remove('active');
        tableView.style.display = ''; scatterView.style.display = 'none';
      });
    }
    if (btnScatter) {
      btnScatter.addEventListener('click', function () {
        btnScatter.classList.add('active'); btnTable.classList.remove('active');
        tableView.style.display = 'none'; scatterView.style.display = '';
        if (!scatterInited) {
          scatterInited = true;
          setTimeout(function () { self._initScatter(container, ctx); }, 30);
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
    if (el2) el2.textContent = '\u2014 VAVs';
  },

  _populate: function (container, rows, cols) {
    var set = function (id, val) { var el = container.querySelector('#' + id); if (el) el.textContent = val; };

    var zoneCol   = _tuFindCol(cols, ['zonetemp', 'zone_temp']);
    var satCol    = _tuFindCol(cols, ['satavg', 'sat_f', 'supplyair', 'sat']);
    var reheatCol = _tuFindCol(cols, ['reheat']);

    var fmt = function (v) { return v !== null ? v.toFixed(1) : '\u2014'; };
    set('tuKpiTotal',  rows.length);
    set('tuKpiZone',   zoneCol   ? fmt(_tuAvg(rows, zoneCol))   : '\u2014');
    set('tuKpiDat',    satCol    ? fmt(_tuAvg(rows, satCol))    : '\u2014');
    set('tuKpiReheat', reheatCol ? fmt(_tuAvg(rows, reheatCol)) : '\u2014');
    set('tuMeta', rows.length + ' VAVs');

    this._buildTable(container, rows, cols);
  },

  _buildTable: function (container, rows, cols) {
    var self = this;
    this._state = { rows: rows, cols: cols, sortCol: null, sortDir: 1, filter: '' };

    var tableView = container.querySelector('#tuTableView');
    if (!tableView) return;

    tableView.innerHTML = [
      '<div class="tu-filter-bar">',
      '  <input class="tu-filter-input" id="tuFilterInput" type="text" placeholder="Filter\u2026" autocomplete="off" />',
      '  <span class="tu-filter-count" id="tuFilterCount">' + rows.length + '\u2009/\u2009' + rows.length + ' VAVs</span>',
      '</div>',
      '<div style="overflow-x:auto;">',
      '  <table class="tu-table">',
      '    <thead id="tuThead"></thead>',
      '    <tbody id="tuTbody"></tbody>',
      '  </table>',
      '</div>'
    ].join('\n');

    // Build sortable header
    var thead = container.querySelector('#tuThead');
    thead.innerHTML = '<tr>' + cols.map(function (k) {
      return '<th class="tu-th tu-th-sort" data-col="' + k + '">' +
        (TU_COL_LABELS[k] || k) +
        '<span class="tu-sort-ind" data-col="' + k + '"></span>' +
        '</th>';
    }).join('') + '</tr>';

    // Sort click handlers
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

    // Filter input handler
    var filterInput = container.querySelector('#tuFilterInput');
    if (filterInput) {
      filterInput.addEventListener('input', function () {
        self._state.filter = filterInput.value;
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
        return '<td class="' + cls + '">' + (val !== null && val !== undefined ? val : '\u2014') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    // Update sort indicators
    var inds = container.querySelectorAll('#tuThead .tu-sort-ind');
    inds.forEach(function (ind) {
      var col = ind.getAttribute('data-col');
      ind.textContent = s.sortCol === col ? (s.sortDir === 1 ? '\u00a0\u25b2' : '\u00a0\u25bc') : '';
    });

    // Update count
    var countEl = container.querySelector('#tuFilterCount');
    if (countEl) countEl.textContent = rows.length + '\u2009/\u2009' + s.rows.length + ' VAVs';
  },

  _getDisplayRows: function () {
    var s = this._state;
    var rows = s.rows;

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
  },

  _initScatter: function (container, ctx) {
    var RS  = window.mbcxDashboard.components.ReheatScatter;
    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    if (!RS) return;

    var svgEl  = container.querySelector('#tuScatterSvg');
    var legEl  = container.querySelector('#tuScatterLegend');
    var sumEl  = container.querySelector('#tuScatterSummary');
    var viewEl = container.querySelector('#tuScatterView');
    if (!svgEl) return;

    // Tooltip appended to body so it isn't clipped by any overflow:hidden ancestor
    var tipEl = document.getElementById('tuScatterTip');
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.id = 'tuScatterTip';
      tipEl.className = 'rs-tooltip';
      document.body.appendChild(tipEl);
    }

    function renderData(data) {
      if (legEl) legEl.innerHTML = RS.legendHTML();
      if (sumEl) sumEl.innerHTML = RS.summaryHTML(data);
      var selectedId = null;
      function redraw() {
        RS.render(svgEl, tipEl, data, selectedId, function (id) {
          selectedId = id === selectedId ? null : id;
          redraw();
        });
      }
      redraw();
    }

    function showError(msg) {
      if (legEl) legEl.innerHTML = '';
      if (sumEl) sumEl.innerHTML = '';
      svgEl.innerHTML = '';
      if (viewEl) {
        var errDiv = viewEl.querySelector('.rs-error-screen');
        if (!errDiv) { errDiv = document.createElement('div'); errDiv.className = 'rs-error-screen'; viewEl.appendChild(errDiv); }
        errDiv.innerHTML =
          '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9B2335" stroke-width="1.5">' +
          '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="#9B2335"/></svg>' +
          '<div class="rs-error-title">Unable to Load Reheat Data</div>' +
          '<div class="rs-error-msg">' + msg + '</div>';
      }
    }

    function clearError() {
      if (viewEl) { var e = viewEl.querySelector('.rs-error-screen'); if (e) e.remove(); }
    }

    if (ctx && ctx.attestKey && ctx.siteRef) {
      // Loading state
      clearError();
      if (legEl) legEl.innerHTML = '<span style="color:#9CA3AF;font-size:12px">Loading\u2026</span>';
      if (sumEl) sumEl.innerHTML = '';
      svgEl.innerHTML = '';

      var dateArg = (ctx.datesStart && ctx.datesEnd)
        ? ctx.datesStart + '..' + ctx.datesEnd
        : 'today()';
      var axon = 'view_reheatReport_pubUI(readAll(vav and siteRef==' + ctx.siteRef + '), ' + dateArg + ')';
      console.log('[ReheatScatter] Axon:', axon);

      API.evalAxon(ctx.attestKey, ctx.projectName, axon)
        .then(function (grid) {
          var parsed = HP.parseGrid(grid);
          if (!parsed.rows.length) {
            showError('No reheat data returned for this site and date range.');
            return;
          }
          clearError();
          renderData(RS.fromReheatGrid(parsed.rows));
        })
        .catch(function (err) {
          console.error('[TU] Reheat scatter fetch failed:', err);
          showError(err && err.message ? err.message : 'Failed to load reheat data. Check console for details.');
        });
    } else {
      renderData(RS.generateDemo());
    }
  }
};
