// components/Compliance.js — MBCx Compliance view (redesigned)
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.Compliance = (function () {

  var _charts = [];
  var _selectedIdx = 0;

  var DEMO_SPACES = [
    { site: 'Huntington', equip: 'VAV 2-05', ahu: 'AHU-5', area: 'G153 Anesth-Work, G154 Central Sterile (1/2)', pct: 98.2 },
    { site: 'Huntington', equip: 'VAV 2-06', ahu: 'AHU-5', area: 'OR-2 (G148,149)',                              pct: 100 },
    { site: 'Huntington', equip: 'VAV 4-06', ahu: '',       area: 'F135 Pharmacy',                                pct: 95.7 },
    { site: 'Huntington', equip: 'VAV 2-11', ahu: 'AHU-5', area: 'G134 Work, G135 Toilet, G136 Procedure',       pct: 99.1 },
    { site: 'Huntington', equip: 'VAV 2-03', ahu: 'AHU-5', area: 'OR-1 (G144)',                                   pct: 100 },
    { site: 'Huntington', equip: 'VAV 2-02', ahu: 'AHU-5', area: 'G155 Central Decon, G154 Central Sterile (1/2)', pct: 97.8 }
  ];

  var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function _fmtShortDate(d) {
    return MONTH_NAMES[d.getMonth()] + ' ' + d.getDate();
  }

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
    var prefix = sp.equip + (sp.ahu ? ' (' + sp.ahu + ')' : '') + ' — ' + sp.area.split(',')[0];
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
      '<div class="comp-ov-stat">' +
        '<span class="comp-ov-stat-val">' + DEMO_SPACES.filter(function (s) { return s.pct >= 99; }).length + '</span>' +
        '<span class="comp-ov-stat-label">Fully Compliant</span>' +
      '</div>' +
    '</div>';
  }

  function _renderSpaceCards() {
    var cards = DEMO_SPACES.map(function (sp, i) {
      var active = i === _selectedIdx ? ' comp-card--active' : '';
      return '<button class="comp-card' + active + '" data-idx="' + i + '">' +
        '<div class="comp-card-ring">' + _ring(sp.pct, 44) + '</div>' +
        '<div class="comp-card-info">' +
          '<div class="comp-card-equip">' + sp.equip + (sp.ahu ? ' <span class="comp-card-ahu">(' + sp.ahu + ')</span>' : '') + '</div>' +
          '<div class="comp-card-area">' + sp.area + '</div>' +
        '</div>' +
      '</button>';
    }).join('');

    return '<div class="comp-cards-section">' +
      '<div class="comp-cards-header">' +
        '<h3 class="comp-cards-title">Compliance by Space</h3>' +
      '</div>' +
      '<div class="comp-cards-scroll">' + cards + '</div>' +
    '</div>';
  }

  function render() {
    return '<div class="comp-page">' +
      _renderOverviewKPIs() +
      _renderSpaceCards() +
      '<div class="comp-chart-section">' +
        '<div class="comp-chart-header">' +
          '<h3 class="comp-chart-heading" id="compChartHeading">—</h3>' +
          '<button class="comp-download-btn">Export</button>' +
        '</div>' +
        '<div class="comp-charts" id="compCharts"></div>' +
      '</div>' +
    '</div>';
  }

  // ── Chart.js rendering ─────────────────────────────────────────────

  function _buildCharts(container) {
    _destroyCharts();
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
          borderWidth: ds.dash ? 1.5 : 1.5,
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

  function _destroyCharts() {
    _charts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    _charts = [];
  }

  function _selectCard(container, idx) {
    _selectedIdx = idx;
    container.querySelectorAll('.comp-card').forEach(function (c) {
      c.classList.toggle('comp-card--active', parseInt(c.getAttribute('data-idx'), 10) === idx);
    });
    _buildCharts(container);
  }

  // ── Init ───────────────────────────────────────────────────────────

  function initLive(container) {
    container.querySelectorAll('.comp-card').forEach(function (card) {
      card.addEventListener('click', function () {
        _selectCard(container, parseInt(card.getAttribute('data-idx'), 10));
      });
    });
    _buildCharts(container);
  }

  function destroy() {
    _destroyCharts();
    _selectedIdx = 0;
  }

  return { render: render, initLive: initLive, destroy: destroy };

})();
