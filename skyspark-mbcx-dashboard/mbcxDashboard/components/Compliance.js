// components/Compliance.js — MBCx Compliance view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.Compliance = (function () {

  var _charts = [];
  var _selectedIdx = 0;

  var DEMO_SPACES = [
    { site: 'Huntington', equip: 'VAV 2-05 (AHU-5)', area: 'G153 Anesth-Work, G154 Central Sterile (1/2)', pct: 98.2 },
    { site: 'Huntington', equip: 'VAV 2-06 (AHU-5)', area: 'OR-2 (G148,149)', pct: 100 },
    { site: 'Huntington', equip: 'VAV 4-06',          area: 'F135 Pharmacy', pct: 95.7 },
    { site: 'Huntington', equip: 'VAV 2-11 (AHU-5)', area: 'G134 Work, G135 Toilet, G136 Procedure', pct: 99.1 },
    { site: 'Huntington', equip: 'VAV 2-03 (AHU-5)', area: 'OR-1 (G144)', pct: 100 },
    { site: 'Huntington', equip: 'VAV 2-02 (AHU-5)', area: 'G155 Central Decon, G154 Central Sterile (1/2)', pct: 97.8 }
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
    var interval = 60 * 60000;
    for (var t = start.getTime(); t <= now.getTime(); t += interval) {
      var d = new Date(t);
      labels.push(d);
    }
    return labels;
  }

  function _fmtAxisLabel(d) {
    return DAY_NAMES[d.getDay()] + ' ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getDate();
  }

  function _generateValues(labels, baseVal, variance) {
    return labels.map(function () {
      return baseVal + (Math.random() - 0.5) * variance;
    });
  }

  function _constValues(labels, val) {
    return labels.map(function () { return val; });
  }

  function _getDemoChartData(idx) {
    var sp = DEMO_SPACES[idx];
    var prefix = sp.site + ' ' + sp.equip + ' ' + sp.area.split(',')[0];
    var labels = _generateLabels(7);
    var fmtLabels = labels.map(_fmtAxisLabel);

    return {
      labels: fmtLabels,
      panels: [
        {
          title: prefix + ' Zone Temperature',
          unit: '°F',
          datasets: [
            { label: prefix + ' Zone Temperature', data: _generateValues(labels, 68, 4), color: '#1565c0' },
            { label: 'Max Temp', data: _constValues(labels, 75), color: '#dc2626', dash: [6, 3] },
            { label: 'Min Temp', data: _constValues(labels, 65), color: '#16a34a', dash: [6, 3] }
          ]
        },
        {
          title: prefix + ' Zone Air Humidity',
          unit: '%',
          datasets: [
            { label: prefix + ' Zone Air Humidity', data: _generateValues(labels, 55, 15), color: '#1565c0' },
            { label: 'Max Humidity', data: _constValues(labels, 60), color: '#dc2626', dash: [6, 3] },
            { label: 'Min Humidity', data: _constValues(labels, 40), color: '#16a34a', dash: [6, 3] }
          ]
        },
        {
          title: prefix + ' Air Change Rate (Computed)',
          unit: 'ACH',
          datasets: [
            { label: prefix + ' Air Change Rate (Computed)', data: _generateValues(labels, 20, 2), color: '#1565c0' },
            { label: 'Minimum Total ACH', data: _constValues(labels, 15), color: '#16a34a', dash: [6, 3] }
          ]
        },
        {
          title: prefix + ' Zone Pressure',
          unit: 'inH₂O',
          datasets: [
            { label: prefix + ' Zone Pressure', data: _generateValues(labels, 0.02, 0.04), color: '#1565c0' },
            { label: 'Zero Pressure', data: _constValues(labels, 0), color: '#16a34a', dash: [6, 3] }
          ]
        }
      ]
    };
  }

  // ── Rendering ──────────────────────────────────────────────────────

  function _renderTable() {
    var rows = DEMO_SPACES.map(function (s, i) {
      var activeClass = i === _selectedIdx ? ' comp-row--active' : '';
      return '<tr class="comp-row' + activeClass + '" data-idx="' + i + '">' +
        '<td class="comp-cell comp-cell-icon"><span class="comp-info-icon">&#9432;</span></td>' +
        '<td class="comp-cell comp-cell-site">' + s.site + '</td>' +
        '<td class="comp-cell comp-cell-equip">' + s.equip + '</td>' +
        '<td class="comp-cell comp-cell-area">' + s.area + '</td>' +
        '<td class="comp-cell comp-cell-pct">' +
          '<div class="comp-bar-wrap">' +
            '<div class="comp-bar" style="width:' + Math.max(s.pct, 0) + '%"></div>' +
          '</div>' +
          '<span class="comp-pct-label">' + s.pct.toFixed(1) + '%</span>' +
        '</td>' +
      '</tr>';
    }).join('');

    return '<div class="comp-table-wrap"><table class="comp-table">' +
      '<thead><tr>' +
        '<th class="comp-th" style="width:28px"></th>' +
        '<th class="comp-th">Site</th>' +
        '<th class="comp-th">Equip</th>' +
        '<th class="comp-th">Area Served</th>' +
        '<th class="comp-th" style="width:160px">Percent</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div>';
  }

  function _renderKPIs() {
    var now = new Date();
    var weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    var twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    return '<div class="comp-kpis">' +
      '<div class="comp-kpi-card">' +
        '<div class="comp-kpi-header">' +
          '<div class="comp-kpi-title">Huntington MBCx Compliance Rating</div>' +
          '<div class="comp-kpi-dates">' + _fmtDate(weekAgo) + ' to ' + _fmtDate(now) + '</div>' +
        '</div>' +
        '<div class="comp-kpi-value">100%</div>' +
      '</div>' +
      '<div class="comp-kpi-card">' +
        '<div class="comp-kpi-header">' +
          '<div class="comp-kpi-title">Huntington MBCx Compliance Rating - Previous Period</div>' +
          '<div class="comp-kpi-dates">' + _fmtDate(twoWeeksAgo) + ' to ' + _fmtDate(weekAgo) + '</div>' +
        '</div>' +
        '<div class="comp-kpi-value">100%</div>' +
      '</div>' +
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
          '<div class="comp-chart-toolbar">' +
            '<label class="comp-chart-dropdown-label">Compliance by Space ' +
              '<select class="comp-chart-dropdown" id="compSpaceSelect">' +
                '<option value="1">1</option>' +
                '<option value="2">2</option>' +
                '<option value="all">All</option>' +
              '</select>' +
            '</label>' +
            '<button class="comp-download-btn">Download Options</button>' +
          '</div>' +
          '<h3 class="comp-chart-heading">Huntington Compliance</h3>' +
          '<div class="comp-charts" id="compCharts"></div>' +
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

    var Chart = window.Chart;
    if (!Chart) {
      chartsEl.innerHTML = '<div style="padding:24px;color:#6b7280;">Chart.js not loaded.</div>';
      return;
    }

    var chartData = _getDemoChartData(_selectedIdx);
    var labels = chartData.labels;

    // Thin labels: show ~7 evenly spaced
    var step = Math.max(1, Math.floor(labels.length / 7));
    var tickLabels = labels.map(function (l, i) {
      return i % step === 0 ? l : '';
    });

    chartData.panels.forEach(function (panel) {
      var wrap = document.createElement('div');
      wrap.className = 'comp-chart-panel';
      var canvas = document.createElement('canvas');
      wrap.appendChild(canvas);
      chartsEl.appendChild(wrap);

      var datasets = panel.datasets.map(function (ds) {
        return {
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color,
          borderWidth: 1.5,
          borderDash: ds.dash || [],
          pointRadius: 0,
          pointHitRadius: 4,
          fill: false,
          tension: 0
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
              ticks: {
                font: { size: 10 },
                color: '#6b7280',
                maxRotation: 0,
                autoSkip: false
              },
              grid: { display: false }
            },
            y: {
              ticks: {
                font: { size: 10 },
                color: '#6b7280',
                callback: function (v) { return v + panel.unit; }
              },
              grid: { color: 'rgba(0,0,0,0.06)' }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              align: 'center',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                font: { size: 11 },
                padding: 14,
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

  return { render: render, initLive: initLive, destroy: destroy };

})();
