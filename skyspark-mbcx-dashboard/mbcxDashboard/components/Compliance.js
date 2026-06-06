// components/Compliance.js — MBCx Compliance view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.Compliance = (function () {

  var _charts = [];
  var _pieChart = null;
  var _selectedIdx = 0;
  var _searchQuery = '';

  var DEMO_SPACES = [
    { site: 'Huntington', equip: 'VAV 2-05', ahu: 'AHU-5', area: 'G153 Anesth-Work, G154 Central Sterile (1/2)', pct: 98.2 },
    { site: 'Huntington', equip: 'VAV 2-06', ahu: 'AHU-5', area: 'OR-2 (G148,149)',                              pct: 100 },
    { site: 'Huntington', equip: 'VAV 4-06', ahu: '',       area: 'F135 Pharmacy',                                pct: 95.7 },
    { site: 'Huntington', equip: 'VAV 2-11', ahu: 'AHU-5', area: 'G134 Work, G135 Toilet, G136 Procedure',       pct: 99.1 },
    { site: 'Huntington', equip: 'VAV 2-03', ahu: 'AHU-5', area: 'OR-1 (G144)',                                   pct: 100 },
    { site: 'Huntington', equip: 'VAV 2-02', ahu: 'AHU-5', area: 'G155 Central Decon, G154 Central Sterile (1/2)', pct: 97.8 }
  ];

  var DEMO_FAULTS = [
    { name: 'High Temperature',  hours: 42, color: '#ef4444' },
    { name: 'Low Humidity',      hours: 28, color: '#f97316' },
    { name: 'Low Pressure',      hours: 15, color: '#eab308' },
    { name: 'Low Air Changes',   hours: 8,  color: '#3b82f6' },
    { name: 'Sensor Fault',      hours: 3,  color: '#8b5cf6' }
  ];

  var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function _fmtDate(d) {
    return String(d.getMonth() + 1).padStart(2, '0') + '/' +
           String(d.getDate()).padStart(2, '0') + '/' +
           String(d.getFullYear()).slice(2);
  }

  function _generateLabels(days) {
    var labels = [];
    var now = new Date();
    var start = new Date(now);
    start.setDate(start.getDate() - days);
    for (var t = start.getTime(); t <= now.getTime(); t += 60 * 60000) {
      labels.push(new Date(t));
    }
    return labels;
  }

  function _fmtAxisLabel(d) {
    return DAY_NAMES[d.getDay()] + ' ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getDate();
  }

  function _gen(labels, base, variance) {
    return labels.map(function () { return base + (Math.random() - 0.5) * variance; });
  }

  function _flat(labels, val) {
    return labels.map(function () { return val; });
  }

  function _getDemoChartData(idx) {
    var sp = DEMO_SPACES[idx];
    var prefix = sp.equip + (sp.ahu ? ' (' + sp.ahu + ')' : '');
    var labels = _generateLabels(7);
    var fmtLabels = labels.map(_fmtAxisLabel);
    var step = Math.max(1, Math.floor(labels.length / 7));
    var tickLabels = fmtLabels.map(function (l, i) { return i % step === 0 ? l : ''; });

    return {
      labels: tickLabels,
      panels: [
        {
          title: 'Zone Temperature',
          unit: '°F',
          datasets: [
            { label: prefix + ' Zone Temp', data: _gen(labels, 68, 4), color: '#3b82f6' },
            { label: 'Max Temp', data: _flat(labels, 75), color: '#ef4444', dash: [5, 3] },
            { label: 'Min Temp', data: _flat(labels, 65), color: '#22c55e', dash: [5, 3] }
          ]
        },
        {
          title: 'Zone Air Humidity',
          unit: '%',
          datasets: [
            { label: prefix + ' Humidity', data: _gen(labels, 55, 15), color: '#3b82f6' },
            { label: 'Max Humidity', data: _flat(labels, 60), color: '#ef4444', dash: [5, 3] },
            { label: 'Min Humidity', data: _flat(labels, 40), color: '#22c55e', dash: [5, 3] }
          ]
        },
        {
          title: 'Air Change Rate',
          unit: 'ACH',
          datasets: [
            { label: prefix + ' ACH', data: _gen(labels, 20, 2), color: '#3b82f6' },
            { label: 'Minimum Total ACH', data: _flat(labels, 15), color: '#22c55e', dash: [5, 3] }
          ]
        },
        {
          title: 'Zone Pressure',
          unit: 'inH₂O',
          datasets: [
            { label: prefix + ' Pressure', data: _gen(labels, 0.02, 0.04), color: '#3b82f6' },
            { label: 'Zero Pressure', data: _flat(labels, 0), color: '#22c55e', dash: [5, 3] }
          ]
        }
      ]
    };
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
    var now = new Date();
    var weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    var twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    var avg = DEMO_SPACES.reduce(function (s, sp) { return s + sp.pct; }, 0) / DEMO_SPACES.length;

    return '<div class="comp-overview">' +
      '<div class="comp-ov-kpi">' +
        _ring(avg, 64) +
        '<div class="comp-ov-kpi-text">' +
          '<div class="comp-ov-kpi-label">Current Period</div>' +
          '<div class="comp-ov-kpi-dates">' + _fmtDate(weekAgo) + ' — ' + _fmtDate(now) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="comp-ov-kpi">' +
        _ring(100, 64) +
        '<div class="comp-ov-kpi-text">' +
          '<div class="comp-ov-kpi-label">Previous Period</div>' +
          '<div class="comp-ov-kpi-dates">' + _fmtDate(twoWeeksAgo) + ' — ' + _fmtDate(weekAgo) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="comp-ov-stat">' +
        '<span class="comp-ov-stat-val">' + DEMO_SPACES.length + '</span>' +
        '<span class="comp-ov-stat-label">Spaces Monitored</span>' +
      '</div>' +
    '</div>';
  }

  function _renderSpaceList() {
    var rows = DEMO_SPACES.map(function (sp, i) {
      var active = i === _selectedIdx ? ' comp-space--active' : '';
      var pctColor = sp.pct >= 99 ? '#22c55e' : sp.pct >= 95 ? '#eab308' : '#ef4444';
      return '<button class="comp-space' + active + '" data-idx="' + i + '">' +
        '<div class="comp-space-left">' +
          '<div class="comp-space-ring">' + _ring(sp.pct, 36) + '</div>' +
          '<div class="comp-space-info">' +
            '<div class="comp-space-equip">' + sp.equip + (sp.ahu ? ' <span class="comp-space-ahu">(' + sp.ahu + ')</span>' : '') + '</div>' +
            '<div class="comp-space-area">' + sp.area + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="comp-space-pct" style="color:' + pctColor + '">' + sp.pct.toFixed(1) + '%</div>' +
      '</button>';
    }).join('');

    return '<div class="comp-sidebar">' +
      '<div class="comp-pie-section">' +
        '<h4 class="comp-section-label">Time by Fault</h4>' +
        '<div class="comp-pie-wrap"><canvas id="compPieChart"></canvas></div>' +
      '</div>' +
      '<div class="comp-space-section">' +
        '<h4 class="comp-section-label">Equipment</h4>' +
        '<div class="comp-search-wrap">' +
          '<input type="text" class="comp-search" id="compSearch" placeholder="Search equipment..." autocomplete="off">' +
        '</div>' +
        '<div class="comp-space-list" id="compSpaceList">' + rows + '</div>' +
      '</div>' +
    '</div>';
  }

  function _renderAuditSection() {
    return '<div class="comp-audit-section">' +
      '<div class="comp-audit-header">' +
        '<h3 class="comp-section-heading">Compliance Audit Report</h3>' +
      '</div>' +
      '<div class="comp-audit-body">' +
        '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#9ca3af" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="2" y="6" width="20" height="12" rx="2"/>' +
          '<path d="M12 6V4m-4 2V5m8 1V5"/>' +
          '<circle cx="12" cy="12" r="2.5"/>' +
          '<path d="M14.5 12H18m-12 0h3.5"/>' +
        '</svg>' +
        '<div class="comp-audit-uc-title">Under Construction</div>' +
        '<div class="comp-audit-uc-sub">Audit report features coming soon.</div>' +
      '</div>' +
    '</div>';
  }

  function render() {
    return '<div class="comp-page">' +
      _renderOverviewKPIs() +
      '<div class="comp-body">' +
        _renderSpaceList() +
        '<div class="comp-main">' +
          '<div class="comp-chart-section">' +
            '<div class="comp-chart-header">' +
              '<h3 class="comp-chart-heading" id="compChartHeading">—</h3>' +
              '<button class="comp-download-btn">Export</button>' +
            '</div>' +
            '<div class="comp-charts" id="compCharts"></div>' +
          '</div>' +
          _renderAuditSection() +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Pie chart ──────────────────────────────────────────────────────

  function _buildPieChart(container) {
    if (_pieChart) { try { _pieChart.destroy(); } catch (e) {} _pieChart = null; }
    var canvas = container.querySelector('#compPieChart');
    if (!canvas || !window.Chart) return;

    _pieChart = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: DEMO_FAULTS.map(function (f) { return f.name; }),
        datasets: [{
          data: DEMO_FAULTS.map(function (f) { return f.hours; }),
          backgroundColor: DEMO_FAULTS.map(function (f) { return f.color; }),
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
                return ' ' + ctx.label + ': ' + ctx.parsed + 'h';
              }
            }
          }
        }
      }
    });
  }

  // ── Line charts ────────────────────────────────────────────────────

  function _buildCharts(container) {
    _destroyLineCharts();
    var chartsEl = container.querySelector('#compCharts');
    if (!chartsEl) return;
    chartsEl.innerHTML = '';

    var heading = container.querySelector('#compChartHeading');
    var sp = DEMO_SPACES[_selectedIdx];
    if (heading) heading.textContent = sp.equip + (sp.ahu ? ' (' + sp.ahu + ')' : '') + ' — ' + sp.area;

    var Chart = window.Chart;
    if (!Chart) {
      chartsEl.innerHTML = '<div style="padding:24px;color:#6b7280;">Chart.js not loaded.</div>';
      return;
    }

    var chartData = _getDemoChartData(_selectedIdx);

    chartData.panels.forEach(function (panel) {
      var wrap = document.createElement('div');
      wrap.className = 'comp-chart-panel';

      var titleEl = document.createElement('div');
      titleEl.className = 'comp-panel-title';
      titleEl.textContent = panel.title;
      wrap.appendChild(titleEl);

      var canvasWrap = document.createElement('div');
      canvasWrap.className = 'comp-canvas-wrap';
      var canvas = document.createElement('canvas');
      canvasWrap.appendChild(canvas);
      wrap.appendChild(canvasWrap);
      chartsEl.appendChild(wrap);

      var datasets = panel.datasets.map(function (ds) {
        return {
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color + '18',
          borderWidth: 1.5,
          borderDash: ds.dash || [],
          pointRadius: 0,
          pointHitRadius: 4,
          fill: !ds.dash,
          tension: 0.2
        };
      });

      var chart = new Chart(canvas, {
        type: 'line',
        data: { labels: chartData.labels, datasets: datasets },
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
                callback: function (v) { return v + panel.unit; }
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

  function _filterSpaces(container) {
    var q = _searchQuery.toLowerCase();
    container.querySelectorAll('.comp-space').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      var sp = DEMO_SPACES[idx];
      var text = (sp.equip + ' ' + sp.ahu + ' ' + sp.area).toLowerCase();
      el.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
    });
  }

  function _selectSpace(container, idx) {
    _selectedIdx = idx;
    container.querySelectorAll('.comp-space').forEach(function (el) {
      el.classList.toggle('comp-space--active', parseInt(el.getAttribute('data-idx'), 10) === idx);
    });
    _buildCharts(container);
  }

  // ── Init ───────────────────────────────────────────────────────────

  function initLive(container) {
    container.querySelectorAll('.comp-space').forEach(function (el) {
      el.addEventListener('click', function () {
        _selectSpace(container, parseInt(el.getAttribute('data-idx'), 10));
      });
    });

    var searchInput = container.querySelector('#compSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        _searchQuery = searchInput.value;
        _filterSpaces(container);
      });
    }

    _buildPieChart(container);
    _buildCharts(container);
  }

  function destroy() {
    _destroyLineCharts();
    if (_pieChart) { try { _pieChart.destroy(); } catch (e) {} _pieChart = null; }
    _selectedIdx = 0;
    _searchQuery = '';
  }

  return { render: render, initLive: initLive, destroy: destroy };

})();
