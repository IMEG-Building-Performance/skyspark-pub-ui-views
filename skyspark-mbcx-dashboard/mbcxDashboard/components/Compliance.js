// components/Compliance.js — MBCx Compliance view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.Compliance = (function () {

  var NS = window.mbcxDashboard;
  var _charts = [];
  var _pieChart = null;
  var _selectedIdx = 0;
  var _searchQuery = '';
  var _equipList = [];
  var _ctx = null;
  var _container = null;
  var _plotRollup = 8;

  var ROLLUP_OPTIONS = [1, 2, 4, 8, 12, 24];

  var CONSTRUCTION_SVG = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2 20h20"/>' +
    '<path d="M5 20V8l7-5 7 5v12"/>' +
    '<path d="M9 20v-4h6v4"/>' +
    '<path d="M3 20l2-2"/><path d="M19 20l2-2"/>' +
    '<rect x="9" y="10" width="6" height="4" rx="0.5"/>' +
    '<path d="M10 10V8"/><path d="M14 10V8"/>' +
    '</svg>';

  var CHART_COLORS = [
    '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
    '#0891B2', '#BE185D', '#4F46E5', '#CA8A04', '#15803D'
  ];

  // ── Helpers ────────────────────────────────────────────────────────

  function _extractNum(v) {
    if (typeof v === 'number') return v;
    if (v && v._kind === 'number') return v.val;
    if (v !== null && v !== undefined) { var n = parseFloat(v); if (!isNaN(n)) return n; }
    return null;
  }

  function _extractStr(v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (v.dis) return v.dis;
    if (v.val) return String(v.val);
    return String(v);
  }

  function _colDisplayName(col) {
    if (col.meta) {
      if (col.meta.dis) return col.meta.dis;
      if (col.meta.navName) return col.meta.navName;
      if (col.meta.id && typeof col.meta.id === 'object' && col.meta.id.dis) return col.meta.id.dis;
    }
    if (col.dis) return col.dis;
    return col.name;
  }

  function _colUnit(col) {
    if (col.meta) {
      if (col.meta.unit) return col.meta.unit;
      if (col.meta.kind && typeof col.meta.kind === 'string') {
        var m = col.meta.kind.match(/^Number\s+"(.+)"$/);
        if (m) return m[1];
      }
    }
    return null;
  }

  function _constructionPlaceholder(title) {
    return '<div class="comp-construction">' +
      CONSTRUCTION_SVG +
      '<div class="comp-construction-text">' + (title || 'Under Construction') + '</div>' +
    '</div>';
  }

  // ── Compliance ring SVG ────────────────────────────────────────────
  function _ring(pct, size) {
    var r = (size - 6) / 2;
    var circ = 2 * Math.PI * r;
    var offset = circ * (1 - pct / 100);
    var color = pct >= 99 ? '#22c55e' : pct >= 95 ? '#eab308' : '#ef4444';
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" class="comp-ring">' +
      '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="#e5e7eb" stroke-width="4"/>' +
      '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="4" ' +
        'stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '" stroke-linecap="round" ' +
        'transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')"/>' +
      '<text x="' + size/2 + '" y="' + (size/2 + 1) + '" text-anchor="middle" dominant-baseline="central" ' +
        'font-size="' + (size < 50 ? 10 : 13) + '" font-weight="700" fill="' + color + '">' + pct.toFixed(0) + '%</text>' +
    '</svg>';
  }

  // ── Rendering ──────────────────────────────────────────────────────

  function _renderOverviewKPIs() {
    return '<div class="comp-overview">' +
      _constructionPlaceholder('Overview KPIs — Under Construction') +
    '</div>';
  }

  function _renderSpaceList() {
    return '<div class="comp-sidebar">' +
      '<div class="comp-pie-section">' +
        '<h4 class="comp-section-label">Time by Fault</h4>' +
        '<div class="comp-pie-wrap">' + _constructionPlaceholder('') + '</div>' +
      '</div>' +
      '<div class="comp-space-section">' +
        '<h4 class="comp-section-label">Equipment</h4>' +
        '<div class="comp-search-wrap">' +
          '<input type="text" class="comp-search" id="compSearch" placeholder="Search equipment..." autocomplete="off">' +
        '</div>' +
        '<div class="comp-space-list" id="compSpaceList">' +
          '<div class="comp-loading">Loading equipment…</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function _renderAuditSection() {
    return '<div class="comp-audit-section">' +
      '<div class="comp-audit-header">' +
        '<h3 class="comp-section-heading">Compliance Audit Report</h3>' +
      '</div>' +
      _constructionPlaceholder('Audit Report — Under Construction') +
    '</div>';
  }

  function _renderRollupSelector() {
    var opts = ROLLUP_OPTIONS.map(function (h) {
      var sel = h === _plotRollup ? ' selected' : '';
      return '<option value="' + h + '"' + sel + '>' + h + 'h</option>';
    }).join('');
    return '<div class="comp-rollup-wrap">' +
      '<label class="comp-rollup-label">Rollup:</label>' +
      '<select class="comp-rollup-select" id="compRollupSelect">' + opts + '</select>' +
    '</div>';
  }

  function render() {
    return '<div class="comp-page">' +
      _renderOverviewKPIs() +
      '<div class="comp-body">' +
        _renderSpaceList() +
        '<div class="comp-chart-section">' +
          '<div class="comp-chart-header">' +
            '<h3 class="comp-chart-heading" id="compChartHeading">Select equipment to view charts</h3>' +
            _renderRollupSelector() +
          '</div>' +
          '<div class="comp-charts" id="compCharts">' +
            '<div class="comp-loading">Select an equipment item to view compliance charts.</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      _renderAuditSection() +
    '</div>';
  }

  // ── Equipment list from Axon ───────────────────────────────────────

  function _buildEquipListHTML() {
    var rows = _equipList.map(function (sp, i) {
      var active = i === _selectedIdx ? ' comp-space--active' : '';
      var pct = sp.pct;
      var pctColor = pct >= 99 ? '#22c55e' : pct >= 95 ? '#eab308' : '#ef4444';
      var pctText = pct !== null ? pct.toFixed(1) + '%' : '—';
      return '<button class="comp-space' + active + '" data-idx="' + i + '">' +
        '<div class="comp-space-left">' +
          (pct !== null ? '<div class="comp-space-ring">' + _ring(pct, 36) + '</div>' : '') +
          '<div class="comp-space-info">' +
            '<div class="comp-space-equip">' + (sp.equip || '') + '</div>' +
            '<div class="comp-space-area">' + (sp.area || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="comp-space-pct" style="color:' + pctColor + '">' + pctText + '</div>' +
      '</button>';
    }).join('');
    return rows;
  }

  function _loadEquipTable() {
    if (!_ctx || !_ctx.attestKey) return;
    var API = NS.api;
    var siteRef = _ctx.siteRef;
    var dates = _ctx.datesStart + '..' + _ctx.datesEnd;

    var axon = 'view_complianceSummary_Equiptable(' + siteRef + '.toEquips, ' + dates + ')';
    console.log('[Compliance] Equip table axon:', axon);

    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        console.log('[Compliance] Equip table response:', JSON.stringify(grid).slice(0, 500));
        if (!grid || !grid.rows || !grid.rows.length) {
          _showEquipEmpty();
          return;
        }
        _parseEquipGrid(grid);
        _renderEquipButtons();
      })
      .catch(function (err) {
        console.warn('[Compliance] Equipment table fetch failed:', err);
        _showEquipError(err);
      });
  }

  function _parseEquipGrid(grid) {
    _equipList = grid.rows.map(function (row) {
      var equip = _extractStr(row.navName || row.equip || row.dis || row.name || '');
      var area = _extractStr(row.area || row.areaServed || row.spaceRef || '');
      var pct = _extractNum(row.pct || row.compliance || row.compliancePct);
      return { equip: equip, area: area, pct: pct, _raw: row };
    });
  }

  function _renderEquipButtons() {
    if (!_container) return;
    var listEl = _container.querySelector('#compSpaceList');
    if (!listEl) return;
    listEl.innerHTML = _buildEquipListHTML();
    _bindEquipClicks();
    _filterSpaces();
  }

  function _showEquipEmpty() {
    if (!_container) return;
    var listEl = _container.querySelector('#compSpaceList');
    if (listEl) listEl.innerHTML = '<div class="comp-loading">No equipment found for this site/date range.</div>';
  }

  function _showEquipError(err) {
    if (!_container) return;
    var listEl = _container.querySelector('#compSpaceList');
    if (listEl) listEl.innerHTML = '<div class="comp-loading" style="color:#ef4444;">Error loading equipment: ' + (err.message || err) + '</div>';
  }

  // ── Chart rendering from Axon ──────────────────────────────────────

  function _loadEquipPlot() {
    if (!_ctx || !_ctx.attestKey || !_equipList.length) return;
    var API = NS.api;
    var sp = _equipList[_selectedIdx];
    if (!sp) return;

    var heading = _container.querySelector('#compChartHeading');
    if (heading) heading.textContent = sp.equip + (sp.area ? ' — ' + sp.area : '');

    var chartsEl = _container.querySelector('#compCharts');
    if (chartsEl) chartsEl.innerHTML = '<div class="comp-loading">Loading charts…</div>';

    var siteRef = _ctx.siteRef;
    var dates = _ctx.datesStart + '..' + _ctx.datesEnd;
    var equipName = sp.equip.replace(/"/g, '\\"');
    var rollup = _plotRollup + 'h';

    var axon = 'view_complianceDashboard_equipPlot(' + siteRef + '.toEquips, ' + dates + ', "' + equipName + '", "Compliance by Space", ' + rollup + ')';
    console.log('[Compliance] Plot axon:', axon);

    _destroyLineCharts();
    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        if (!grid || !grid.cols || !grid.rows || !grid.rows.length) {
          if (chartsEl) chartsEl.innerHTML = '<div class="comp-loading">No chart data returned.</div>';
          return;
        }
        _buildChartsFromGrid(grid);
      })
      .catch(function (err) {
        console.warn('[Compliance] Plot fetch failed:', err);
        if (chartsEl) chartsEl.innerHTML = '<div class="comp-loading" style="color:#ef4444;">Error loading chart: ' + (err.message || err) + '</div>';
      });
  }

  function _buildChartsFromGrid(grid) {
    var chartsEl = _container.querySelector('#compCharts');
    if (!chartsEl) return;
    chartsEl.innerHTML = '';

    var tsCol = null;
    var dataCols = [];
    grid.cols.forEach(function (c) {
      if (c.name === 'ts') tsCol = c.name;
      else if (c.name !== 'id') dataCols.push(c);
    });

    if (!tsCol || !dataCols.length) {
      chartsEl.innerHTML = '<div class="comp-loading">No plottable data in response.</div>';
      return;
    }

    // Group columns by unit for separate chart panels
    var groups = {};
    var groupOrder = [];
    dataCols.forEach(function (c) {
      var unit = _colUnit(c) || 'other';
      if (!groups[unit]) { groups[unit] = []; groupOrder.push(unit); }
      groups[unit].push(c);
    });

    // Parse labels
    var labels = grid.rows.map(function (row) {
      var ts = row[tsCol];
      if (typeof ts === 'string') return ts;
      if (ts && ts._kind === 'dateTime') return ts.val;
      if (ts && ts.val) return ts.val;
      return '';
    });

    var fmtLabels = labels.map(function (l) {
      try {
        var d = new Date(l);
        if (!isNaN(d)) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' });
      } catch (e) {}
      return l;
    });

    // Thin labels for x-axis readability
    var step = Math.max(1, Math.floor(fmtLabels.length / 8));
    var tickLabels = fmtLabels.map(function (l, i) { return i % step === 0 ? l : ''; });

    var Chart = window.Chart;
    if (!Chart) {
      chartsEl.innerHTML = '<div class="comp-loading">Chart.js not loaded.</div>';
      return;
    }

    var colorIdx = 0;
    groupOrder.forEach(function (unit) {
      var cols = groups[unit];

      var wrap = document.createElement('div');
      wrap.className = 'comp-chart-panel';

      var titleEl = document.createElement('div');
      titleEl.className = 'comp-panel-title';
      titleEl.textContent = unit === 'other' ? 'Values' : unit;
      wrap.appendChild(titleEl);

      var canvasWrap = document.createElement('div');
      canvasWrap.className = 'comp-canvas-wrap';
      var canvas = document.createElement('canvas');
      canvasWrap.appendChild(canvas);
      wrap.appendChild(canvasWrap);
      chartsEl.appendChild(wrap);

      var datasets = cols.map(function (c) {
        var data = grid.rows.map(function (row) { return _extractNum(row[c.name]); });
        var ci = colorIdx++;
        var isDashed = c.name.toLowerCase().indexOf('max') !== -1 || c.name.toLowerCase().indexOf('min') !== -1 ||
                       c.name.toLowerCase().indexOf('limit') !== -1 || c.name.toLowerCase().indexOf('sp') !== -1;
        return {
          label: _colDisplayName(c),
          data: data,
          borderColor: CHART_COLORS[ci % CHART_COLORS.length],
          backgroundColor: CHART_COLORS[ci % CHART_COLORS.length] + '18',
          borderWidth: 1.5,
          borderDash: isDashed ? [5, 3] : [],
          pointRadius: 0,
          pointHitRadius: 4,
          fill: !isDashed,
          tension: 0.2
        };
      });

      var chart = new Chart(canvas, {
        type: 'line',
        data: { labels: tickLabels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 0, autoSkip: false },
              grid: { color: 'rgba(0,0,0,0.04)' }
            },
            y: {
              ticks: {
                font: { size: 10 }, color: '#9ca3af',
                callback: function (v) { return v + (unit !== 'other' ? unit : ''); }
              },
              grid: { color: 'rgba(0,0,0,0.04)' }
            }
          },
          plugins: {
            legend: {
              position: 'top', align: 'end',
              labels: {
                usePointStyle: true, pointStyle: 'circle',
                font: { size: 10 }, padding: 12, boxWidth: 7
              }
            },
            tooltip: { enabled: true, mode: 'index', intersect: false }
          }
        }
      });
      _charts.push(chart);
    });
  }

  function _destroyLineCharts() {
    _charts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    _charts = [];
  }

  // ── Filtering ──────────────────────────────────────────────────────

  function _filterSpaces() {
    if (!_container) return;
    var q = _searchQuery.toLowerCase();
    _container.querySelectorAll('.comp-space').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      var sp = _equipList[idx];
      if (!sp) return;
      var text = (sp.equip + ' ' + sp.area).toLowerCase();
      el.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
    });
  }

  function _selectSpace(idx) {
    _selectedIdx = idx;
    if (!_container) return;
    _container.querySelectorAll('.comp-space').forEach(function (el) {
      el.classList.toggle('comp-space--active', parseInt(el.getAttribute('data-idx'), 10) === idx);
    });
    _loadEquipPlot();
  }

  function _bindEquipClicks() {
    if (!_container) return;
    _container.querySelectorAll('.comp-space').forEach(function (el) {
      el.addEventListener('click', function () {
        _selectSpace(parseInt(el.getAttribute('data-idx'), 10));
      });
    });
  }

  // ── Init ───────────────────────────────────────────────────────────

  function initLive(container, ctx) {
    _container = container;
    _ctx = ctx;
    _selectedIdx = 0;
    _searchQuery = '';
    _equipList = [];

    var searchInput = container.querySelector('#compSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        _searchQuery = searchInput.value;
        _filterSpaces();
      });
    }

    var rollupSelect = container.querySelector('#compRollupSelect');
    if (rollupSelect) {
      rollupSelect.addEventListener('change', function () {
        _plotRollup = parseInt(rollupSelect.value, 10);
        if (_equipList.length) _loadEquipPlot();
      });
    }

    _loadEquipTable();
  }

  function destroy() {
    _destroyLineCharts();
    if (_pieChart) { try { _pieChart.destroy(); } catch (e) {} _pieChart = null; }
    _selectedIdx = 0;
    _searchQuery = '';
    _equipList = [];
    _container = null;
    _ctx = null;
  }

  return { render: render, initLive: initLive, destroy: destroy };

})();
