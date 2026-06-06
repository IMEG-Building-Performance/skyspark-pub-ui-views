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
  var _plotRollup = 1;

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
      '</div>' +
      _constructionPlaceholder('Audit Report — Under Construction') +
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

    var ringEl = _container.querySelector('#compRing' + which);
    var datesEl = _container.querySelector('#compDates' + which);
    if (ringEl) ringEl.innerHTML = _ring(pct, 64);
    if (datesEl) datesEl.textContent = subtitle || '—';
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

  // ── Equipment list ─────────────────────────────────────────────────

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

    // Infer which group a setpoint/limit column belongs to by name pattern.
    // Only match short, specific names (Max Temp, Min Humidity, Zero Pressure, Minimum Total ACH).
    // Skip long descriptive names like "ZONE - Pressure Out of Compliance Range".
    var UNIT_HINTS = [
      { re: /\btemp\b/i,                unit: '°F' },
      { re: /\bhumidity\b/i,            unit: '%RH' },
      { re: /\bach\b|air change/i,       unit: '%' },
      { re: /\bzero pressure\b/i,        unit: 'inH₂O' }
    ];

    function _inferUnit(colName) {
      if (colName.length > 30) return null;
      for (var i = 0; i < UNIT_HINTS.length; i++) {
        if (UNIT_HINTS[i].re.test(colName)) return UNIT_HINTS[i].unit;
      }
      return null;
    }

    // First pass: find all units that have explicit metadata
    var knownUnits = {};
    dataCols.forEach(function (c) {
      var u = _colUnit(c);
      if (u) knownUnits[u] = true;
    });

    // Group columns by unit; infer unit for setpoint/limit columns
    var groups = {};
    var groupOrder = [];
    dataCols.forEach(function (c) {
      var unit = _colUnit(c);
      if (!unit) {
        var inferred = _inferUnit(_colDisplayName(c) || c.name);
        if (inferred && knownUnits[inferred]) unit = inferred;
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
        data: { labels: fmtLabels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
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
        _plotRollup = parseFloat(rollupSelect.value);
        if (_equipList.length) _loadEquipPlot();
      });
    }

    _loadEquipTable();
    _loadComplianceCards();
    _loadPieChart(null);
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
