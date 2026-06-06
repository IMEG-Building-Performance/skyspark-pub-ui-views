// components/Compliance.js — MBCx Compliance view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.Compliance = (function () {

  var _charts = [];
  var _selectedIdx = 0;

  // ── Demo data ──────────────────────────────────────────────────────
  var DEMO_SPACES = [
    { site: 'Huntington', equip: 'VAV 2-05 (AHU-5)', area: 'G153 Anesth-Work, G154 Central Sterile (1/2)', pct: 98.2 },
    { site: 'Huntington', equip: 'VAV 2-06 (AHU-5)', area: 'OR-2 (G148,149)', pct: 100 },
    { site: 'Huntington', equip: 'VAV 4-06',          area: 'F135 Pharmacy', pct: 95.7 },
    { site: 'Huntington', equip: 'VAV 2-11 (AHU-5)', area: 'G134 Work, G135 Toilet, G136 Procedure', pct: 99.1 },
    { site: 'Huntington', equip: 'VAV 2-03 (AHU-5)', area: 'OR-1 (G144)', pct: 100 },
    { site: 'Huntington', equip: 'VAV 2-02 (AHU-5)', area: 'G155 Central Decon, G154 Central Sterile (1/2)', pct: 97.8 }
  ];

  function _generateTimeSeries(days, baseVal, variance, interval) {
    var pts = [];
    var now = new Date();
    var start = new Date(now);
    start.setDate(start.getDate() - days);
    var ms = interval || 15 * 60000;
    for (var t = start.getTime(); t <= now.getTime(); t += ms) {
      pts.push({ x: t, y: baseVal + (Math.random() - 0.5) * variance });
    }
    return pts;
  }

  function _constLine(days, val, interval) {
    var pts = [];
    var now = new Date();
    var start = new Date(now);
    start.setDate(start.getDate() - days);
    var ms = interval || 60 * 60000;
    for (var t = start.getTime(); t <= now.getTime(); t += ms) {
      pts.push({ x: t, y: val });
    }
    return pts;
  }

  function _getDemoChartData(idx) {
    var sp = DEMO_SPACES[idx];
    var label = sp.site + ' ' + sp.equip + ' ' + sp.area.split(',')[0];
    return [
      {
        title: label + ' Zone Temperature',
        unit: '°F',
        datasets: [
          { label: label + ' Zone Temperature', data: _generateTimeSeries(7, 68, 4, 15 * 60000), color: '#1565c0', fill: false },
          { label: 'Max Temp', data: _constLine(7, 75), color: '#dc2626', dash: [6, 3] },
          { label: 'Min Temp', data: _constLine(7, 65), color: '#16a34a', dash: [6, 3] }
        ]
      },
      {
        title: label + ' Zone Air Humidity',
        unit: '%',
        datasets: [
          { label: label + ' Zone Air Humidity', data: _generateTimeSeries(7, 55, 15, 15 * 60000), color: '#1565c0', fill: false },
          { label: 'Max Humidity', data: _constLine(7, 60), color: '#dc2626', dash: [6, 3] },
          { label: 'Min Humidity', data: _constLine(7, 40), color: '#16a34a', dash: [6, 3] }
        ]
      },
      {
        title: label + ' Air Change Rate (Computed)',
        unit: 'ACH',
        datasets: [
          { label: label + ' Air Change Rate (Computed)', data: _generateTimeSeries(7, 20, 2, 15 * 60000), color: '#1565c0', fill: false },
          { label: 'Minimum Total ACH', data: _constLine(7, 15), color: '#16a34a', dash: [6, 3] }
        ]
      },
      {
        title: label + ' Zone Pressure',
        unit: 'inH₂O',
        datasets: [
          { label: label + ' Zone Pressure', data: _generateTimeSeries(7, 0.02, 0.04, 15 * 60000), color: '#1565c0', fill: false },
          { label: 'Zero Pressure', data: _constLine(7, 0), color: '#16a34a', dash: [6, 3] }
        ]
      }
    ];
  }

  // ── Rendering ──────────────────────────────────────────────────────
  function _renderTable() {
    var rows = DEMO_SPACES.map(function (s, i) {
      var barWidth = Math.max(s.pct, 0);
      var activeClass = i === _selectedIdx ? ' comp-row--active' : '';
      return '<tr class="comp-row' + activeClass + '" data-idx="' + i + '">' +
        '<td class="comp-cell comp-cell-icon"><span class="comp-info-icon">&#9432;</span></td>' +
        '<td class="comp-cell">' + s.site + '</td>' +
        '<td class="comp-cell comp-cell-equip">' + s.equip + '</td>' +
        '<td class="comp-cell">' + s.area + '</td>' +
        '<td class="comp-cell comp-cell-pct">' +
          '<div class="comp-bar-wrap">' +
            '<div class="comp-bar" style="width:' + barWidth + '%"></div>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    return '<table class="comp-table">' +
      '<thead><tr>' +
        '<th class="comp-th"></th>' +
        '<th class="comp-th">Site</th>' +
        '<th class="comp-th">Equip</th>' +
        '<th class="comp-th">Area Served</th>' +
        '<th class="comp-th">Percent</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
  }

  function _renderKPIs() {
    var now = new Date();
    var weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    var twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    function fmt(d) {
      return String(d.getMonth() + 1).padStart(2, '0') + '/' +
             String(d.getDate()).padStart(2, '0') + '/' +
             String(d.getFullYear()).slice(2);
    }

    return '<div class="comp-kpis">' +
      '<div class="comp-kpi-card">' +
        '<div class="comp-kpi-title">Huntington MBCx Compliance Rating</div>' +
        '<div class="comp-kpi-dates">' + fmt(weekAgo) + ' to ' + fmt(now) + '</div>' +
        '<div class="comp-kpi-value">100%</div>' +
      '</div>' +
      '<div class="comp-kpi-card">' +
        '<div class="comp-kpi-title">Huntington MBCx Compliance Rating - Previous Period</div>' +
        '<div class="comp-kpi-dates">' + fmt(twoWeeksAgo) + ' to ' + fmt(weekAgo) + '</div>' +
        '<div class="comp-kpi-value">100%</div>' +
      '</div>' +
    '</div>';
  }

  function _renderChartArea() {
    return '<div class="comp-chart-area">' +
      '<div class="comp-chart-toolbar">' +
        '<label class="comp-chart-dropdown-label">Compliance by Space' +
          '<select class="comp-chart-dropdown" id="compSpaceSelect">' +
            '<option value="1">1</option>' +
            '<option value="2">2</option>' +
            '<option value="all">All</option>' +
          '</select>' +
        '</label>' +
        '<button class="comp-download-btn">Download Options</button>' +
      '</div>' +
      '<h3 class="comp-chart-title">Huntington Compliance</h3>' +
      '<div class="comp-charts" id="compCharts"></div>' +
    '</div>';
  }

  function render() {
    return '<div class="comp-page">' +
      '<div class="comp-layout">' +
        '<div class="comp-left">' +
          _renderTable() +
          _renderKPIs() +
        '</div>' +
        '<div class="comp-right">' +
          _renderChartArea() +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Chart.js rendering ─────────────────────────────────────────────
  function _buildCharts(container) {
    _destroyCharts();
    var chartsEl = container.querySelector('#compCharts');
    if (!chartsEl) return;
    chartsEl.innerHTML = '';

    var panels = _getDemoChartData(_selectedIdx);
    var Chart = window.Chart;
    if (!Chart) {
      chartsEl.innerHTML = '<div style="padding:24px;color:#6b7280;">Chart.js not loaded.</div>';
      return;
    }

    panels.forEach(function (panel) {
      var wrap = document.createElement('div');
      wrap.className = 'comp-chart-panel';
      var canvas = document.createElement('canvas');
      canvas.height = 160;
      wrap.appendChild(canvas);
      chartsEl.appendChild(wrap);

      var datasets = panel.datasets.map(function (ds) {
        return {
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color,
          borderWidth: ds.dash ? 1.5 : 1.5,
          borderDash: ds.dash || [],
          pointRadius: 0,
          pointHitRadius: 4,
          fill: false,
          tension: 0
        };
      });

      var chart = new Chart(canvas, {
        type: 'line',
        data: { datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              type: 'time',
              time: { unit: 'day', displayFormats: { day: 'EEE d' } },
              ticks: { font: { size: 10 }, color: '#6b7280' },
              grid: { display: false }
            },
            y: {
              title: { display: true, text: panel.unit, font: { size: 10 }, color: '#6b7280' },
              ticks: { font: { size: 10 }, color: '#6b7280',
                callback: function (v) { return v + panel.unit; }
              },
              grid: { color: 'rgba(0,0,0,0.06)' }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                font: { size: 11 },
                padding: 12,
                boxWidth: 8
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

  // ── Init ───────────────────────────────────────────────────────────
  function initLive(container) {
    // Table row click
    container.querySelectorAll('.comp-row').forEach(function (row) {
      row.addEventListener('click', function () {
        _selectedIdx = parseInt(row.getAttribute('data-idx'), 10);
        container.querySelectorAll('.comp-row').forEach(function (r) {
          r.classList.toggle('comp-row--active', parseInt(r.getAttribute('data-idx'), 10) === _selectedIdx);
        });
        _buildCharts(container);
      });
    });

    _buildCharts(container);
  }

  function destroy() {
    _destroyCharts();
    _selectedIdx = 0;
  }

  return {
    render: render,
    initLive: initLive,
    destroy: destroy
  };

})();
