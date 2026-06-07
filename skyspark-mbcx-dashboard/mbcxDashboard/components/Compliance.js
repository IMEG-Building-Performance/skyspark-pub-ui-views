// components/Compliance.js — MBCx Compliance view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.Compliance = (function () {

  var NS = window.mbcxDashboard;
  var _charts = [];
  var _pieChart = null;
  var _selectedIdx = -1;
  var _searchQuery = '';
  var _equipList = [];
  var _ctx = null;
  var _container = null;
  var _plotRollup = 1;
  var _auditGrid = null;
  var _allChartsGen = 0;
  var _kpiPct = { current: null, previous: null };

  var ROLLUP_OPTIONS = [0.25, 1, 2, 4, 8, 12, 24];
  var ROLLUP_LABELS = { 0.25: '15min', 1: '1h', 2: '2h', 4: '4h', 8: '8h', 12: '12h', 24: '24h' };

  function _siteNavRef(siteRef) {
    try {
      var b64 = btoa('id:' + siteRef);
      return '@nav:equip.site.' + b64;
    } catch (e) {
      return siteRef;
    }
  }

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

  // ── Crosshair plugin — hover label + click-to-pin HTML panel ──

  function _closestDataIndex(chart, px) {
    var meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data.length) return -1;
    var best = -1, bestDist = Infinity;
    meta.data.forEach(function (pt, i) {
      var d = Math.abs(pt.x - px);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function _nearestDatasetIndex(chart, px, py) {
    var best = -1, bestDist = Infinity;
    chart.data.datasets.forEach(function (ds, di) {
      var meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach(function (pt) {
        if (Math.abs(pt.x - px) > 10) return;
        var d = Math.abs(pt.y - py);
        if (d < bestDist) { bestDist = d; best = di; }
      });
    });
    return best;
  }

  function _getChartUnit(chart) {
    var yScale = chart.scales.y;
    if (yScale && yScale.options && yScale.options.ticks && yScale.options.ticks.callback) {
      return yScale.options.ticks.callback(0, 0, []).replace('0', '');
    }
    return '';
  }

  function _dismissPinnedPanel(chart) {
    if (chart._crosshair._panel) {
      chart._crosshair._panel.remove();
      chart._crosshair._panel = null;
    }
    chart._crosshair.pinned = false;
  }

  function _showPinnedPanel(chart, dataIdx, clickX, clickY) {
    var ch = chart._crosshair;
    var unit = _getChartUnit(chart);
    var label = chart.data.labels[dataIdx] || '';

    var items = [];
    chart.data.datasets.forEach(function (ds, di) {
      var meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      var v = ds.data[dataIdx];
      items.push({
        color: ds.borderColor || CHART_COLORS[di % CHART_COLORS.length],
        name: ds.label || ('Series ' + di),
        val: v,
        valStr: v !== null && v !== undefined ? (typeof v === 'number' ? v.toFixed(2) + unit : String(v)) : '—'
      });
    });
    items.sort(function (a, b) { return ((b.val || 0) - (a.val || 0)); });

    var panel = document.createElement('div');
    panel.className = 'comp-pin-panel';

    var header = '<div class="comp-pin-header">' +
      '<span class="comp-pin-ts-label">Timestamp</span>' +
      '<span class="comp-pin-ts-val">' + label + '</span></div>';

    var rows = items.map(function (it) {
      return '<div class="comp-pin-row">' +
        '<span class="comp-pin-dot" style="background:' + it.color + '"></span>' +
        '<span class="comp-pin-name">' + it.name + '</span>' +
        '<span class="comp-pin-val">' + it.valStr + '</span>' +
      '</div>';
    }).join('');

    panel.innerHTML = header + '<div class="comp-pin-rows">' + rows + '</div>';

    // Position at the click location relative to the canvas wrapper
    var wrapEl = chart.canvas.parentElement;
    wrapEl.style.position = 'relative';
    panel.style.position = 'absolute';
    panel.style.zIndex = '50';
    panel.style.left = clickX + 'px';
    panel.style.top = clickY + 'px';
    panel.style.maxHeight = (wrapEl.clientHeight - clickY) + 'px';
    wrapEl.appendChild(panel);

    // Clamp so it doesn't overflow the wrapper
    var panelRect = panel.getBoundingClientRect();
    var wrapRect = wrapEl.getBoundingClientRect();
    if (panelRect.right > wrapRect.right - 4) {
      panel.style.left = Math.max(0, clickX - panel.offsetWidth) + 'px';
    }
    if (panelRect.bottom > wrapRect.bottom - 4) {
      panel.style.top = Math.max(0, clickY - panel.offsetHeight) + 'px';
      panel.style.maxHeight = '';
    }

    ch._panel = panel;
  }

  var crosshairPlugin = {
    id: 'crosshair',
    afterInit: function (chart) {
      chart._crosshair = { x: null, y: null, pinned: false, _panel: null };
    },
    beforeDestroy: function (chart) {
      if (chart._crosshair) _dismissPinnedPanel(chart);
    },
    afterEvent: function (chart, args) {
      var evt = args.event;
      var area = chart.chartArea;
      if (!area) return;
      var x = evt.x, y = evt.y;
      var inside = x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;

      if (evt.type === 'click') {
        if (chart._crosshair.pinned) {
          _dismissPinnedPanel(chart);
          chart._crosshair.x = inside ? x : null;
          chart._crosshair.y = inside ? y : null;
          chart.draw();
          return;
        }
        if (inside) {
          var idx = _closestDataIndex(chart, x);
          if (idx === -1) return;
          chart._crosshair.pinned = true;
          chart._crosshair.x = x;
          chart._crosshair.y = y;
          _showPinnedPanel(chart, idx, x, y);
        }
        return;
      }

      if (evt.type === 'mousemove') {
        if (chart._crosshair.pinned) return;
        chart._crosshair.x = inside ? x : null;
        chart._crosshair.y = inside ? y : null;
        chart.draw();
      }

      if (evt.type === 'mouseout') {
        if (chart._crosshair.pinned) return;
        chart._crosshair.x = null;
        chart._crosshair.y = null;
        chart.draw();
      }
    },
    afterDraw: function (chart) {
      var ch = chart._crosshair;
      if (!ch || ch.x === null) return;
      var area = chart.chartArea;
      var ctx = chart.ctx;

      // Vertical crosshair line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ch.x, area.top);
      ctx.lineTo(ch.x, area.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.restore();

      // When pinned, the HTML panel is showing — no canvas label needed
      if (ch.pinned) return;

      // Hover label: nearest dataset point
      var di = _nearestDatasetIndex(chart, ch.x, ch.y || (area.top + area.bottom) / 2);
      if (di === -1) di = 0;
      var meta = chart.getDatasetMeta(di);
      if (!meta || !meta.data.length) return;

      var closestPt = null, closestIdx = -1, closestDist = Infinity;
      meta.data.forEach(function (pt, pi) {
        var d = Math.abs(pt.x - ch.x);
        if (d < closestDist) { closestDist = d; closestPt = pt; closestIdx = pi; }
      });
      if (!closestPt || closestIdx === -1) return;

      var label = chart.data.labels[closestIdx] || '';
      var val = chart.data.datasets[di].data[closestIdx];
      var unit = _getChartUnit(chart);
      var valStr = val !== null && val !== undefined ? (typeof val === 'number' ? val.toFixed(2) : val) : '—';
      var text = label + ' • ' + valStr + unit;

      // Highlight dot
      var color = chart.data.datasets[di].borderColor || '#2563EB';
      ctx.save();
      ctx.beginPath();
      ctx.arc(closestPt.x, closestPt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Label box
      ctx.save();
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      var tw = ctx.measureText(text).width;
      var pad = 6;
      var bw = tw + pad * 2;
      var bh = 20;
      var bx = closestPt.x - bw / 2;
      var by = area.top - bh - 4;
      if (bx < area.left) bx = area.left;
      if (bx + bw > area.right) bx = area.right - bw;
      if (by < 0) by = area.top + 4;

      ctx.fillStyle = 'rgba(50,50,50,0.85)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + pad, by + bh / 2);
      ctx.restore();
    }
  };

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

  function _colFullName(col) {
    if (col.meta && col.meta.id && typeof col.meta.id === 'object' && col.meta.id.dis) {
      return col.meta.id.dis;
    }
    return _colDisplayName(col);
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
      '<div class="comp-ov-kpi" id="compKpiCurrent">' +
        '<div class="comp-ov-kpi-ring" id="compRingCurrent">' + _ring(0, 64) + '</div>' +
        '<div class="comp-ov-kpi-text">' +
          '<div class="comp-ov-kpi-label">Current Period</div>' +
          '<div class="comp-ov-kpi-dates" id="compDatesCurrent">—</div>' +
        '</div>' +
      '</div>' +
      '<div class="comp-ov-kpi" id="compKpiPrevious">' +
        '<div class="comp-ov-kpi-ring" id="compRingPrevious">' + _ring(0, 64) + '</div>' +
        '<div class="comp-ov-kpi-text">' +
          '<div class="comp-ov-kpi-label">Previous Period</div>' +
          '<div class="comp-ov-kpi-dates" id="compDatesPrevious">—</div>' +
        '</div>' +
      '</div>' +
      '<div class="comp-ov-delta" id="compDelta"></div>' +
      '<div class="comp-ov-stats" id="compStats"></div>' +
    '</div>';
  }

  function _renderSpaceList() {
    return '<div class="comp-sidebar">' +
      '<div class="comp-pie-section">' +
        '<h4 class="comp-section-label">Time by Fault</h4>' +
        '<div class="comp-pie-wrap"><canvas id="compPieChart"></canvas><div class="comp-loading" id="compPieLoading">Loading…</div></div>' +
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
        '<span class="comp-audit-count" id="compAuditCount"></span>' +
      '</div>' +
      '<div id="compAuditBody"><div class="comp-loading">Loading audit report…</div></div>' +
    '</div>';
  }

  function _renderRollupSelector() {
    var opts = ROLLUP_OPTIONS.map(function (h) {
      var sel = h === _plotRollup ? ' selected' : '';
      return '<option value="' + h + '"' + sel + '>' + (ROLLUP_LABELS[h] || h) + '</option>';
    }).join('');
    return '<div class="comp-rollup-wrap">' +
      '<label class="comp-rollup-label">Rollup:</label>' +
      '<select class="comp-rollup-select" id="compRollupSelect">' + opts + '</select>' +
    '</div>';
  }

  function render() {
    return '<div class="comp-page">' +
      _renderOverviewKPIs() +
      '<div class="comp-body" id="compBody">' +
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

  function _loadComplianceCards() {
    if (!_ctx || !_ctx.attestKey) return;
    var API = NS.api;
    var navRef = _siteNavRef(_ctx.siteRef);
    var dates = _ctx.datesStart + '..' + _ctx.datesEnd;

    API.evalAxon(_ctx.attestKey, _ctx.projectName,
      'view_complianceSummary_complianceCard(' + navRef + ', ' + dates + ', 1)')
      .then(function (grid) {
        _updateKpiCard('Current', grid);
      })
      .catch(function (err) {
        console.warn('[Compliance] Current card failed:', err);
      });

    API.evalAxon(_ctx.attestKey, _ctx.projectName,
      'view_complianceSummary_complianceCard(' + navRef + ', ' + dates + ', 2)')
      .then(function (grid) {
        _updateKpiCard('Previous', grid);
      })
      .catch(function (err) {
        console.warn('[Compliance] Previous card failed:', err);
      });
  }

  function _updateKpiCard(which, grid) {
    if (!_container || !grid || !grid.rows || !grid.rows.length) return;
    var row = grid.rows[0];
    var primaryStr = _extractStr(row.primary);
    var pct = parseFloat(primaryStr);
    if (isNaN(pct)) pct = 0;
    var subtitle = _extractStr(row.subtitle);

    _kpiPct[which.toLowerCase()] = pct;

    var ringEl = _container.querySelector('#compRing' + which);
    var datesEl = _container.querySelector('#compDates' + which);
    if (ringEl) ringEl.innerHTML = _ring(pct, 64);
    if (datesEl) datesEl.textContent = subtitle || '—';

    _updateDelta();
  }

  function _updateDelta() {
    if (!_container) return;
    var deltaEl = _container.querySelector('#compDelta');
    if (deltaEl && _kpiPct.current !== null && _kpiPct.previous !== null) {
      var diff = _kpiPct.current - _kpiPct.previous;
      var sign = diff > 0 ? '+' : '';
      var arrow = diff > 0 ? '&#9650;' : diff < 0 ? '&#9660;' : '';
      var color = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : 'var(--gray-500)';
      deltaEl.innerHTML = '<span class="comp-delta-arrow" style="color:' + color + '">' + arrow + '</span>' +
        '<span class="comp-delta-val" style="color:' + color + '">' + sign + diff.toFixed(1) + '%</span>' +
        '<span class="comp-delta-label">vs. previous</span>';
    }
    _updateOverviewStats();
  }

  function _updateOverviewStats() {
    if (!_container) return;
    var statsEl = _container.querySelector('#compStats');
    if (!statsEl) return;
    var total = _equipList.length;
    if (!total) { statsEl.innerHTML = ''; return; }
    var compliant = 0;
    var attention = 0;
    _equipList.forEach(function (sp) {
      if (sp.pct !== null && sp.pct >= 100) compliant++;
      else attention++;
    });
    statsEl.innerHTML =
      '<div class="comp-ov-stat"><div class="comp-ov-stat-val">' + total + '</div><div class="comp-ov-stat-label">Equipment</div></div>' +
      '<div class="comp-ov-stat"><div class="comp-ov-stat-val" style="color:#22c55e">' + compliant + '</div><div class="comp-ov-stat-label">Compliant</div></div>' +
      '<div class="comp-ov-stat"><div class="comp-ov-stat-val" style="color:' + (attention > 0 ? '#ef4444' : '#22c55e') + '">' + attention + '</div><div class="comp-ov-stat-label">Need Attention</div></div>';
  }

  // ── Pie chart — Time by Fault ───────────────────────────────────────

  var PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6',
                    '#06b6d4', '#ec4899', '#14b8a6', '#f43f5e', '#a855f7'];

  function _loadPieChart(equipRef) {
    if (!_ctx || !_ctx.attestKey) return;
    var API = NS.api;
    var navRef = _siteNavRef(_ctx.siteRef);
    var dates = _ctx.datesStart + '..' + _ctx.datesEnd;
    var equipArg = equipRef || 'null';

    var axon = 'view_complianceDashboard_equipPlot(' + navRef + ', ' + dates + ', ' + equipArg + ', "Time By Fault", 1)';

    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        if (!grid || !grid.cols || !grid.rows || !grid.rows.length) {
          _showPieEmpty();
          return;
        }
        _buildPieFromGrid(grid);
      })
      .catch(function (err) {
        console.warn('[Compliance] Pie chart fetch failed:', err);
        _showPieEmpty();
      });
  }

  function _buildPieFromGrid(grid) {
    // Grid format: cols are dis + v0,v1,… where each vN.meta.dis is the fault name
    // and vN.meta.color is the chart color. Row values are duration {_kind:"number", val:N, unit:"h"}.
    var row = grid.rows[0];
    if (!row) { _showPieEmpty(); return; }

    var faults = [];
    grid.cols.forEach(function (c) {
      if (c.name === 'dis') return;
      var name = _colDisplayName(c);
      var color = (c.meta && c.meta.color) || PIE_COLORS[faults.length % PIE_COLORS.length];
      var val = _extractNum(row[c.name]);
      if (val !== null && val > 0) {
        var unit = '';
        if (row[c.name] && row[c.name].unit) unit = row[c.name].unit;
        faults.push({ name: name, val: val, unit: unit, color: color });
      }
    });

    if (!faults.length) { _showPieEmpty(); return; }
    _renderPieChart(faults);
  }

  function _renderPieChart(faults) {
    if (!_container || !window.Chart) return;
    if (_pieChart) { try { _pieChart.destroy(); } catch (e) {} _pieChart = null; }

    var loadingEl = _container.querySelector('#compPieLoading');
    if (loadingEl) loadingEl.style.display = 'none';

    var canvas = _container.querySelector('#compPieChart');
    if (!canvas) return;
    canvas.style.display = '';

    _pieChart = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: faults.map(function (f) { return f.name; }),
        datasets: [{
          data: faults.map(function (f) { return f.val; }),
          backgroundColor: faults.map(function (f) { return f.color; }),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        animation: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 10 },
              padding: 8,
              boxWidth: 10,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var f = faults[ctx.dataIndex];
                var u = f && f.unit ? f.unit : 'h';
                return ' ' + ctx.label + ': ' + ctx.parsed + u;
              }
            }
          }
        }
      }
    });
  }

  function _showPieEmpty() {
    if (!_container) return;
    var loadingEl = _container.querySelector('#compPieLoading');
    if (!loadingEl) return;

    var ringEl = _container.querySelector('#compRingCurrent');
    var isFull = false;
    if (ringEl) {
      var txt = ringEl.textContent || '';
      isFull = txt.indexOf('100%') !== -1;
    }

    var canvas = _container.querySelector('#compPieChart');
    if (canvas) canvas.style.display = 'none';

    if (isFull) {
      loadingEl.innerHTML = '<div class="comp-compliant-msg">' +
        '<svg width="32" height="32" viewBox="0 0 20 20" fill="#22c55e"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' +
        '<div style="font-weight:600;color:#22c55e;">Fully Compliant</div>' +
        '<div style="font-size:.7rem;color:var(--gray-500);">No faults detected this period</div>' +
      '</div>';
    } else {
      loadingEl.textContent = 'No fault data available.';
    }
    loadingEl.style.display = '';
  }

  // ── Audit report ───────────────────────────────────────────────────

  function _loadAuditReport() {
    if (!_ctx || !_ctx.attestKey) return;
    var API = NS.api;
    var navRef = _siteNavRef(_ctx.siteRef);
    var dates = _ctx.datesStart + '..' + _ctx.datesEnd;

    var axon = 'view_ReportOR_Xq(' + navRef + ', ' + dates + ', 1hr)';

    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        if (!grid || !grid.cols || !grid.rows || !grid.rows.length) {
          _auditGrid = null;
          _showAuditEmpty();
          return;
        }
        _auditGrid = grid;
        _filterAuditTable();
      })
      .catch(function (err) {
        console.warn('[Compliance] Audit report fetch failed:', err);
        _showAuditError(err);
      });
  }

  function _renderAuditTable(grid) {
    if (!_container) return;
    var bodyEl = _container.querySelector('#compAuditBody');
    var countEl = _container.querySelector('#compAuditCount');
    if (!bodyEl) return;

    if (countEl) countEl.textContent = grid.rows.length + ' issues';

    var th = grid.cols.map(function (c) {
      return '<th class="tu-th">' + (_colDisplayName(c)) + '</th>';
    }).join('');

    var rows = grid.rows.map(function (row) {
      var tds = grid.cols.map(function (c) {
        var v = row[c.name];
        var text = '';
        if (v === null || v === undefined) {
          text = '';
        } else if (typeof v === 'object') {
          if (v._kind === 'number') {
            text = v.val + (v.unit ? v.unit : '');
          } else if (v._kind === 'ref' || v._kind === 'Ref') {
            text = v.dis || v.val || '';
          } else if (v._kind === 'dateTime') {
            try {
              var d = new Date(v.val);
              if (!isNaN(d)) text = d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
              else text = v.val;
            } catch (e) { text = v.val; }
          } else if (v._kind === 'date') {
            text = v.val || '';
          } else {
            text = v.dis || v.val || JSON.stringify(v);
          }
        } else {
          text = String(v);
        }
        return '<td class="tu-td">' + text + '</td>';
      }).join('');
      return '<tr>' + tds + '</tr>';
    }).join('');

    bodyEl.innerHTML = '<div class="tu-table-scroll">' +
      '<table class="tu-table">' +
        '<thead><tr>' + th + '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';
  }

  function _filterAuditTable() {
    if (!_auditGrid) return;
    if (_selectedIdx === -1) {
      _renderAuditTable(_auditGrid);
      return;
    }
    var sp = _equipList[_selectedIdx];
    if (!sp) { _renderAuditTable(_auditGrid); return; }

    var equipName = sp.equip.toLowerCase();
    var equipCol = null;
    _auditGrid.cols.forEach(function (c) {
      var n = c.name.toLowerCase();
      if (n === 'equip' || n === 'room' || n === 'equipment' || n === 'navname') equipCol = c.name;
    });
    if (!equipCol) {
      _auditGrid.cols.forEach(function (c) {
        var dis = (_colDisplayName(c) || '').toLowerCase();
        if (dis === 'equip' || dis === 'room' || dis === 'equipment') equipCol = c.name;
      });
    }

    if (!equipCol) {
      _renderAuditTable(_auditGrid);
      return;
    }

    var filtered = {
      cols: _auditGrid.cols,
      rows: _auditGrid.rows.filter(function (row) {
        var val = _extractStr(row[equipCol]).toLowerCase();
        return val.indexOf(equipName) !== -1;
      })
    };

    if (!filtered.rows.length) {
      _showAuditEmpty();
      var countEl = _container.querySelector('#compAuditCount');
      if (countEl) countEl.textContent = '0 issues';
      return;
    }
    _renderAuditTable(filtered);
  }

  function _showAuditEmpty() {
    if (!_container) return;
    var bodyEl = _container.querySelector('#compAuditBody');
    if (bodyEl) bodyEl.innerHTML = '<div class="comp-loading">No audit data for this period.</div>';
  }

  function _showAuditError(err) {
    if (!_container) return;
    var bodyEl = _container.querySelector('#compAuditBody');
    if (bodyEl) bodyEl.innerHTML = '<div class="comp-loading" style="color:#ef4444;">Error loading audit report: ' + (err.message || err) + '</div>';
  }

  // ── Equipment list ─────────────────────────────────────────────────

  function _buildEquipListHTML() {
    var allActive = _selectedIdx === -1 ? ' comp-space--active' : '';
    var allBtn = '<button class="comp-space comp-space-all' + allActive + '" data-idx="-1">' +
      '<div class="comp-space-left">' +
        '<div class="comp-space-info">' +
          '<div class="comp-space-equip">All Equipment</div>' +
        '</div>' +
      '</div>' +
    '</button>';

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
    return allBtn + rows;
  }

  function _loadEquipTable() {
    if (!_ctx || !_ctx.attestKey) return;
    var API = NS.api;
    var siteRef = _ctx.siteRef;
    var dates = _ctx.datesStart + '..' + _ctx.datesEnd;

    var navRef = _siteNavRef(siteRef);
    var axon = 'view_complianceSummary_Equiptable(' + navRef + ', ' + dates + ')';
    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        if (!grid || !grid.rows || !grid.rows.length) {
          _showEquipEmpty();
          return;
        }
        _parseEquipGrid(grid);
        _renderEquipButtons();
        _updateOverviewStats();
        _onSelectAll();
      })
      .catch(function (err) {
        console.warn('[Compliance] Equipment table fetch failed:', err);
        _showEquipError(err);
      });
  }

  function _parseEquipGrid(grid) {
    _equipList = grid.rows.map(function (row) {
      var equipDis = _extractStr(row.equip);
      var equipRef = null;
      if (row.id && typeof row.id === 'object' && (row.id._kind === 'ref' || row.id._kind === 'Ref')) {
        equipRef = '@' + row.id.val;
      }
      var area = _extractStr(row.areaserved || row.areaServed || row.area || '');
      var pct = _extractNum(row.percentCompliant || row.pct || row.compliance);
      return { equip: equipDis, equipRef: equipRef, area: area, pct: pct, _raw: row };
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
    var rollup = _plotRollup;

    var navRef = _siteNavRef(siteRef);
    var equipArg = sp.equipRef || ('"' + equipName + '"');
    var axon = 'view_complianceDashboard_equipPlot(' + navRef + ', ' + dates + ', ' + equipArg + ', "Compliance by Space", ' + rollup + ')';
    _destroyLineCharts();
    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        if (!grid || !grid.cols || !grid.rows || !grid.rows.length) {
          if (chartsEl) chartsEl.innerHTML = '<div class="comp-loading">No chart data returned.</div>';
          return;
        }
        _buildChartsFromGrid(grid);
        _loadPieChart(sp.equipRef);
        _filterAuditTable();
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
    var faultCols = [];
    grid.cols.forEach(function (c) {
      if (c.name === 'ts') { tsCol = c.name; return; }
      if (c.name === 'id') return;
      var dis = (_colDisplayName(c) || c.name).toLowerCase();
      if (dis.indexOf('zone -') !== -1 || dis.indexOf('compliance') !== -1 ||
          dis.indexOf('fault') !== -1 || dis.indexOf('out of') !== -1) {
        faultCols.push(c);
      } else {
        dataCols.push(c);
      }
    });

    if (!tsCol || !dataCols.length) {
      chartsEl.innerHTML = '<div class="comp-loading">No plottable data in response.</div>';
      return;
    }

    // Normalize units so related columns land in the same chart panel.
    // ACH data arrives as "ACH", "%", or null — all should group together.
    var UNIT_ALIASES = {
      'ach': 'ACH', 'ACH': 'ACH',
      '%RH': '%RH', '%rh': '%RH'
    };

    function _normalizeUnit(unit) {
      if (!unit) return null;
      return UNIT_ALIASES[unit] || unit;
    }

    // Infer unit for setpoint/limit columns by name pattern.
    var UNIT_HINTS = [
      { re: /\btemp\b/i,                unit: '°F' },
      { re: /\bhumidity\b/i,            unit: '%RH' },
      { re: /\bach\b|air change/i,       unit: 'ACH' },
      { re: /\bzero pressure\b/i,        unit: 'inH₂O' }
    ];

    function _inferUnit(colName) {
      if (colName.length > 30) return null;
      for (var i = 0; i < UNIT_HINTS.length; i++) {
        if (UNIT_HINTS[i].re.test(colName)) return UNIT_HINTS[i].unit;
      }
      return null;
    }

    // First pass: find all normalized units and detect ACH columns
    var knownUnits = {};
    dataCols.forEach(function (c) {
      var u = _normalizeUnit(_colUnit(c));
      if (u) knownUnits[u] = true;
    });
    // If any column name mentions ACH, ensure ACH is a known unit
    dataCols.forEach(function (c) {
      var dis = (_colDisplayName(c) || c.name).toLowerCase();
      if (dis.indexOf('ach') !== -1 || dis.indexOf('air change') !== -1) knownUnits['ACH'] = true;
    });

    // Group columns by unit; infer unit for setpoint/limit columns
    var groups = {};
    var groupOrder = [];
    dataCols.forEach(function (c) {
      var unit = _normalizeUnit(_colUnit(c));
      if (!unit) {
        var inferred = _inferUnit(_colDisplayName(c) || c.name);
        if (inferred && knownUnits[inferred]) unit = inferred;
      }
      // ACH sensor sometimes tagged as "%" — check name to override
      if ((unit === '%' || !unit) && /\bach\b|air change/i.test(_colDisplayName(c) || c.name)) {
        unit = 'ACH';
      }
      if (!unit) unit = 'other';
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
        if (!isNaN(d)) {
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
            ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        }
      } catch (e) {}
      return l;
    });

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
          backgroundColor: CHART_COLORS[ci % CHART_COLORS.length],
          borderWidth: 1.5,
          borderDash: isDashed ? [5, 3] : [],
          pointRadius: 0,
          pointHitRadius: 4,
          fill: false,
          tension: 0.2
        };
      });

      var chart = new Chart(canvas, {
        type: 'line',
        plugins: [crosshairPlugin],
        data: { labels: fmtLabels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          events: ['mousemove', 'mouseout', 'click'],
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 45, autoSkip: true, maxTicksLimit: 10 },
              grid: { display: false }
            },
            y: {
              ticks: {
                font: { size: 10 }, color: '#9ca3af',
                callback: function (v) { return v + (unit !== 'other' ? unit : ''); }
              },
              grid: { color: '#F3F4F6' }
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
            tooltip: { enabled: false }
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
    if (idx === -1) {
      _onSelectAll();
    } else {
      _loadEquipPlot();
    }
  }

  var ALL_CHART_TYPES = [
    { label: 'Temperatures', type: 'Temps' },
    { label: 'Humidities',   type: 'Humidities' },
    { label: 'Air Changes',  type: 'Air Change' },
    { label: 'Pressures',    type: 'Pressures' }
  ];

  function _onSelectAll() {
    var heading = _container.querySelector('#compChartHeading');
    if (heading) heading.textContent = 'All Equipment';
    _destroyLineCharts();
    var chartsEl = _container.querySelector('#compCharts');
    if (chartsEl) chartsEl.innerHTML = '<div class="comp-loading">Loading site-wide charts…</div>';

    _loadPieChart('read(equip)->id');
    _filterAuditTable();

    if (!_ctx || !_ctx.attestKey) return;
    var API = NS.api;
    var navRef = _siteNavRef(_ctx.siteRef);
    var dates = _ctx.datesStart + '..' + _ctx.datesEnd;

    var gen = ++_allChartsGen;
    var results = [];
    var chain = Promise.resolve();
    ALL_CHART_TYPES.forEach(function (ct, i) {
      results[i] = null;
      chain = chain.then(function () {
        if (gen !== _allChartsGen) return;
        var axon = 'view_complianceDashboard_equipPlot(' + navRef + ', ' + dates + ', read(equip)->id, "' + ct.type + '", 1hr)';
        return API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
          .then(function (grid) { results[i] = grid; })
          .catch(function (err) { console.warn('[Compliance] All chart "' + ct.type + '" failed:', err); });
      });
    });
    chain.then(function () {
      if (gen === _allChartsGen) _renderAllCharts(results);
    });
  }

  var _carouselIdx = 0;
  var _carouselPanels = [];

  function _renderAllCharts(results) {
    if (!_container || _selectedIdx !== -1) return;
    var chartsEl = _container.querySelector('#compCharts');
    if (!chartsEl) return;
    _destroyLineCharts();
    chartsEl.innerHTML = '';
    _carouselPanels = [];
    _carouselIdx = 0;

    var Chart = window.Chart;
    if (!Chart) { chartsEl.innerHTML = '<div class="comp-loading">Chart.js not loaded.</div>'; return; }

    var validCharts = [];
    ALL_CHART_TYPES.forEach(function (ct, i) {
      var grid = results[i];
      if (!grid || !grid.cols || !grid.rows || !grid.rows.length) return;
      var tsCol = null;
      var dataCols = [];
      grid.cols.forEach(function (c) {
        if (c.name === 'ts') { tsCol = c.name; return; }
        if (c.name === 'id') return;
        var dis = (_colDisplayName(c) || c.name).toLowerCase();
        if (dis.indexOf('zone -') !== -1 || dis.indexOf('compliance') !== -1 ||
            dis.indexOf('fault') !== -1 || dis.indexOf('out of') !== -1) return;
        dataCols.push(c);
      });
      if (!tsCol || !dataCols.length) return;
      validCharts.push({ ct: ct, grid: grid, tsCol: tsCol, dataCols: dataCols });
    });

    if (!validCharts.length) {
      chartsEl.innerHTML = '<div class="comp-loading">No site-wide chart data available.</div>';
      return;
    }

    // Build carousel wrapper
    var carousel = document.createElement('div');
    carousel.className = 'comp-carousel';

    var navLeft = document.createElement('button');
    navLeft.className = 'comp-carousel-arrow comp-carousel-left';
    navLeft.innerHTML = '&#9664;';
    var navRight = document.createElement('button');
    navRight.className = 'comp-carousel-arrow comp-carousel-right';
    navRight.innerHTML = '&#9654;';

    var viewport = document.createElement('div');
    viewport.className = 'comp-carousel-viewport';

    // Individual chart slides
    validCharts.forEach(function (vc) {
      var slide = _buildAllChartSlide(vc, Chart, false);
      viewport.appendChild(slide);
      _carouselPanels.push(slide);
    });

    // Final "All" slide — 2x2 grid of all charts
    var allSlide = document.createElement('div');
    allSlide.className = 'comp-carousel-slide';
    var allGrid = document.createElement('div');
    allGrid.className = 'comp-carousel-all-grid';
    validCharts.forEach(function (vc) {
      var mini = _buildAllChartSlide(vc, Chart, true);
      mini.className = 'comp-chart-panel';
      allGrid.appendChild(mini);
    });
    allSlide.appendChild(allGrid);
    viewport.appendChild(allSlide);
    _carouselPanels.push(allSlide);

    // Dot indicators
    var dots = document.createElement('div');
    dots.className = 'comp-carousel-dots';
    _carouselPanels.forEach(function (_, pi) {
      var dot = document.createElement('button');
      dot.className = 'comp-carousel-dot' + (pi === 0 ? ' comp-carousel-dot--active' : '');
      var isAll = pi === _carouselPanels.length - 1;
      dot.textContent = isAll ? 'All' : '';
      dot.setAttribute('data-pidx', pi);
      dot.addEventListener('click', function () { _goToSlide(pi); });
      dots.appendChild(dot);
    });

    carousel.appendChild(navLeft);
    carousel.appendChild(viewport);
    carousel.appendChild(navRight);
    chartsEl.appendChild(carousel);
    chartsEl.appendChild(dots);

    navLeft.addEventListener('click', function () { _goToSlide(_carouselIdx - 1); });
    navRight.addEventListener('click', function () { _goToSlide(_carouselIdx + 1); });

    _goToSlide(0);
  }

  function _buildAllChartSlide(vc, Chart, mini) {
    var grid = vc.grid;
    var tsCol = vc.tsCol;
    var dataCols = vc.dataCols;

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
        if (!isNaN(d)) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
          ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      } catch (e) {}
      return l;
    });

    var wrap = document.createElement('div');
    wrap.className = mini ? 'comp-chart-panel' : 'comp-carousel-slide';

    var titleEl = document.createElement('div');
    titleEl.className = 'comp-panel-title';
    titleEl.textContent = vc.ct.label;
    wrap.appendChild(titleEl);

    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'comp-canvas-wrap';
    var canvas = document.createElement('canvas');
    canvasWrap.appendChild(canvas);
    wrap.appendChild(canvasWrap);

    var colorIdx = 0;
    var datasets = dataCols.map(function (c) {
      var data = grid.rows.map(function (row) { return _extractNum(row[c.name]); });
      var ci = colorIdx++;
      var isDashed = c.name.toLowerCase().indexOf('max') !== -1 || c.name.toLowerCase().indexOf('min') !== -1 ||
                     c.name.toLowerCase().indexOf('limit') !== -1 || c.name.toLowerCase().indexOf('sp') !== -1;
      return {
        label: _colFullName(c),
        data: data,
        borderColor: CHART_COLORS[ci % CHART_COLORS.length],
        backgroundColor: CHART_COLORS[ci % CHART_COLORS.length],
        borderWidth: 1.5,
        borderDash: isDashed ? [5, 3] : [],
        pointRadius: 0,
        pointHitRadius: 4,
        fill: false,
        tension: 0.2
      };
    });

    var unit = _colUnit(dataCols[0]) || '';
    var chart = new Chart(canvas, {
      type: 'line',
      plugins: [crosshairPlugin],
      data: { labels: fmtLabels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        events: ['mousemove', 'mouseout', 'click'],
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            ticks: { font: { size: mini ? 8 : 10 }, color: '#9ca3af', maxRotation: 45, autoSkip: true, maxTicksLimit: mini ? 6 : 10 },
            grid: { display: false }
          },
          y: {
            ticks: {
              font: { size: mini ? 8 : 10 }, color: '#9ca3af',
              callback: function (v) { return v + unit; }
            },
            grid: { color: '#F3F4F6' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
    _charts.push(chart);
    return wrap;
  }

  function _goToSlide(idx) {
    if (!_carouselPanels.length) return;
    if (idx < 0) idx = _carouselPanels.length - 1;
    if (idx >= _carouselPanels.length) idx = 0;
    _carouselIdx = idx;

    _carouselPanels.forEach(function (slide, si) {
      slide.style.display = si === idx ? '' : 'none';
    });

    if (!_container) return;
    _container.querySelectorAll('.comp-carousel-dot').forEach(function (dot) {
      dot.classList.toggle('comp-carousel-dot--active',
        parseInt(dot.getAttribute('data-pidx'), 10) === idx);
    });

    var leftBtn = _container.querySelector('.comp-carousel-left');
    var rightBtn = _container.querySelector('.comp-carousel-right');
    if (leftBtn) leftBtn.style.visibility = '';
    if (rightBtn) rightBtn.style.visibility = '';
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
    _selectedIdx = -1;
    _searchQuery = '';
    _equipList = [];
    _auditGrid = null;
    _kpiPct = { current: null, previous: null };
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
        _plotRollup = parseFloat(rollupSelect.value);
        if (_equipList.length) _loadEquipPlot();
      });
    }

    setTimeout(function () { _sizeBody(true); }, 150);
    window.addEventListener('resize', _onResize);

    _loadEquipTable();
    _loadComplianceCards();
    _loadAuditReport();
  }

  function _onResize() { _sizeBody(false); }

  var _sizeBodyRaf = null;
  var _lastWindowW = 0;
  var _lastWindowH = 0;
  function _sizeBody(force) {
    if (_sizeBodyRaf) return;
    var ww = window.innerWidth, wh = window.innerHeight;
    if (!force && Math.abs(_lastWindowW - ww) < 20 && Math.abs(_lastWindowH - wh) < 20) return;
    _lastWindowW = ww;
    _lastWindowH = wh;
    _sizeBodyRaf = requestAnimationFrame(function () {
      _sizeBodyRaf = null;
      _sizeBodyNow();
    });
  }
  function _sizeBodyNow() {
    if (!_container) return;
    var body = _container.querySelector('#compBody');
    if (!body) return;

    var scrollParent = body.closest('.dash-content') || body.parentElement;
    var scrollH = scrollParent.clientHeight;

    // Scroll to top so getBoundingClientRect is stable
    var savedScroll = scrollParent.scrollTop;
    scrollParent.scrollTop = 0;

    var scrollRect = scrollParent.getBoundingClientRect();
    var bodyRect = body.getBoundingClientRect();
    var bodyTop = bodyRect.top - scrollRect.top;

    scrollParent.scrollTop = savedScroll;

    var available = scrollH - bodyTop;
    if (available < 300) available = 300;

    console.log('[Compliance _sizeBody]',
      'scrollH:', scrollH,
      'bodyTop:', bodyTop,
      'available:', available);

    body.style.height = available + 'px';
    body.classList.add('comp-body--sized');
  }

  function destroy() {
    window.removeEventListener('resize', _onResize);
    _destroyLineCharts();
    if (_pieChart) { try { _pieChart.destroy(); } catch (e) {} _pieChart = null; }
    _selectedIdx = -1;
    _searchQuery = '';
    _equipList = [];
    _auditGrid = null;
    _allChartsGen++;
    _container = null;
    _ctx = null;
  }

  return { render: render, initLive: initLive, destroy: destroy };

})();
