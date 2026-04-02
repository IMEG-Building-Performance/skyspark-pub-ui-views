// components/Charts.js
// Monthly Trends with toggle (Building / Solar / Net Zero), chart + detail table per tab
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.Charts = {

  _noData: function (label) {
    return [
      '<div class="nz-no-data">',
      '  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      '  <div class="nz-no-data-label">No Data Returned</div>',
      '  <div class="nz-no-data-sub">' + label + ' data is not yet available for this site.</div>',
      '</div>'
    ].join('\n');
  },

  render: function (data) {
    var d = data.detail;
    var DT = window.netzeroDashboard.components.DetailTables;
    var MB = window.netzeroDashboard.components.MeterBreakdown;
    var live = data._live || {};

    // Building content
    var buildingContent;
    if (live.building) {
      var buildingTable = DT._table('Building consumption (kWh)', d.months, [
        DT._dataRow('nz-dot-a', 'Actual', d.buildingConsumption.actual, DT._fmtAbs),
        DT._dataRow('nz-dot-m', 'Model',  d.buildingConsumption.model, DT._fmtAbs),
        DT._diffRow('Diff', d.buildingConsumption.diff)
      ]);
      buildingContent = [
        '<div class="nz-chart-card">',
        '  <div class="nz-chart-header">',
        '    <div class="nz-chart-name">Building Consumption</div>',
        this._legend(),
        '  </div>',
        '  <div class="nz-chart-wrap"><canvas id="nzBuildingChart"></canvas></div>',
        '</div>',
        '<div class="nz-trend-detail">' + buildingTable + '</div>',
        MB.render(data)
      ].join('\n');
    } else {
      buildingContent = this._noData('Building');
    }

    // Solar content
    var solarContent;
    if (live.solar) {
      var solarTable = DT._table('Solar generation', d.months, [
        DT._dataRow('nz-dot-a', 'Actual', d.solarGeneration.actual, DT._fmtAbs),
        DT._dataRow('nz-dot-m', 'Model',  d.solarGeneration.model, DT._fmtAbs),
        DT._diffRow('Diff', d.solarGeneration.diff)
      ]);
      solarContent = [
        '<div class="nz-chart-card">',
        '  <div class="nz-chart-header">',
        '    <div class="nz-chart-name">Solar Generation</div>',
        this._legend(),
        '  </div>',
        '  <div class="nz-chart-wrap"><canvas id="nzSolarChart"></canvas></div>',
        '</div>',
        '<div class="nz-trend-detail">' + solarTable + '</div>'
      ].join('\n');
    } else {
      solarContent = this._noData('Solar');
    }

    // Net Zero content
    var netZeroContent;
    if (live.netZero) {
      var netZeroTable = DT._table('Net zero', d.months, [
        DT._dataRow('nz-dot-a', 'Actual', d.actualNetZero.net, DT._fmt),
        DT._dataRow('nz-dot-m', 'Modeled', d.modeledNetZero.net, DT._fmt),
        DT._diffRow('Diff', d.actualNetZero.net.map(function (v, i) { return (v === null || d.modeledNetZero.net[i] === null) ? null : v - (d.modeledNetZero.net[i] || 0); }))
      ]);
      netZeroContent = [
        '<div class="nz-chart-card">',
        '  <div class="nz-chart-header">',
        '    <div class="nz-chart-name">Net Zero &mdash; Actual vs. Modeled</div>',
        '    <div class="nz-legend">',
        '      <span class="nz-legend-item"><span class="nz-legend-swatch" style="background:var(--nz-bar-ink)"></span>Actual Net</span>',
        '      <span class="nz-legend-item"><span class="nz-legend-swatch" style="background:var(--nz-green)"></span>Modeled Net</span>',
        '    </div>',
        '  </div>',
        '  <div class="nz-chart-wrap"><canvas id="nzNetZeroChart"></canvas></div>',
        '</div>',
        '<div class="nz-trend-detail">' + netZeroTable + '</div>'
      ].join('\n');
    } else {
      netZeroContent = this._noData('Net Zero');
    }

    return [
      '<div class="nz-toggle-bar" id="nzTrendsToggle">',
      '  <button class="nz-toggle-btn nz-toggle-btn--active" data-nz-tab="building">Building</button>',
      '  <button class="nz-toggle-btn" data-nz-tab="solar">Solar</button>',
      '  <button class="nz-toggle-btn" data-nz-tab="netzero">Net Zero</button>',
      '</div>',
      '<div class="nz-trend-tab nz-trend-tab--active" data-nz-panel="building">' + buildingContent + '</div>',
      '<div class="nz-trend-tab" data-nz-panel="solar">' + solarContent + '</div>',
      '<div class="nz-trend-tab" data-nz-panel="netzero">' + netZeroContent + '</div>'
    ].join('\n');
  },

  _legend: function () {
    return [
      '<div class="nz-legend">',
      '  <span class="nz-legend-item"><span class="nz-legend-swatch" style="background:var(--nz-bar-ink)"></span>Actual</span>',
      '  <span class="nz-legend-item"><span class="nz-legend-swatch" style="background:var(--nz-green)"></span>Model</span>',
      '</div>'
    ].join('');
  },

  _makeOpts: function () {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 0, right: 0, top: 0, bottom: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1F2937',
          titleFont: { size: 11 },
          bodyFont: { size: 12 },
          padding: 9,
          cornerRadius: 5,
          callbacks: {
            label: function (ctx) {
              return ' ' + ctx.dataset.label + ': ' + (ctx.parsed.y / 1000).toFixed(1) + 'k kWh';
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 10 }, color: '#9CA3AF' },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          ticks: {
            font: { size: 10 }, color: '#9CA3AF',
            callback: function (v) { return (v / 1000).toFixed(0) + 'k'; },
            maxTicksLimit: 5, mirror: true, padding: 4
          },
          grid: { color: '#F3F4F6' },
          border: { display: false },
          afterFit: function (axis) { axis.width = 0; }
        }
      }
    };
  },

  initCharts: function (container, data) {
    var C = window.Chart;
    if (!C) return;
    var self = this;
    var months = data.charts.months;
    var opts = this._makeOpts();
    // pastel green for model bars (dark ink stays for actual)
    var greenColor = '#8FB574';
    var live = data._live || {};

    // Building chart
    if (live.building) {
      var bEl = container.querySelector('#nzBuildingChart');
      if (bEl) {
        new C(bEl, {
          type: 'bar',
          data: {
            labels: months,
            datasets: [
              { label: 'Actual', data: data.charts.building.actual, backgroundColor: '#2e3a4e', borderRadius: 2, barPercentage: 1.0, categoryPercentage: 0.5 },
              { label: 'Model',  data: data.charts.building.model,  backgroundColor: '#8FB574', borderRadius: 2, barPercentage: 1.0, categoryPercentage: 0.5 }
            ]
          },
          options: opts
        });
      }
    }

    // Solar chart
    if (live.solar) {
      var sEl = container.querySelector('#nzSolarChart');
      if (sEl) {
        new C(sEl, {
          type: 'bar',
          data: {
            labels: months,
            datasets: [
              { label: 'Actual', data: data.charts.solar.actual, backgroundColor: '#2e3a4e', borderRadius: 2, barPercentage: 1.0, categoryPercentage: 0.5 },
              { label: 'Model',  data: data.charts.solar.model,  backgroundColor: '#8FB574', borderRadius: 2, barPercentage: 1.0, categoryPercentage: 0.5 }
            ]
          },
          options: opts
        });
      }
    }

    // Net Zero chart
    if (live.netZero) {
      var nEl = container.querySelector('#nzNetZeroChart');
      if (nEl) {
        // Use direct net zero values from eval if available, else compute from building-solar
        var actualNet, modeledNet;
        if (data.charts.netZero) {
          actualNet = data.charts.netZero.actual;
          modeledNet = data.charts.netZero.model;
        } else {
          actualNet = [];
          modeledNet = [];
          for (var i = 0; i < months.length; i++) {
            actualNet.push(data.charts.building.actual[i] - data.charts.solar.actual[i]);
            modeledNet.push(data.charts.building.model[i] - data.charts.solar.model[i]);
          }
        }
        new C(nEl, {
          type: 'bar',
          data: {
            labels: months,
            datasets: [
              { label: 'Actual Net', data: actualNet, backgroundColor: '#2e3a4e', borderRadius: 2, barPercentage: 1.0, categoryPercentage: 0.5 },
              { label: 'Modeled Net', data: modeledNet, backgroundColor: '#8FB574', borderRadius: 2, barPercentage: 1.0, categoryPercentage: 0.5 }
            ]
          },
          options: self._makeOpts()
        });
      }
    }

    // Bind toggle buttons
    var toggleBar = container.querySelector('#nzTrendsToggle');
    if (toggleBar) {
      toggleBar.addEventListener('click', function (e) {
        var btn = e.target.closest('.nz-toggle-btn');
        if (!btn) return;
        var tab = btn.getAttribute('data-nz-tab');

        var btns = toggleBar.querySelectorAll('.nz-toggle-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('nz-toggle-btn--active');
        btn.classList.add('nz-toggle-btn--active');

        var section = toggleBar.closest('.nz-section-body') || toggleBar.parentNode;
        var panels = section.querySelectorAll('.nz-trend-tab');
        for (var j = 0; j < panels.length; j++) {
          if (panels[j].getAttribute('data-nz-panel') === tab) {
            panels[j].classList.add('nz-trend-tab--active');
          } else {
            panels[j].classList.remove('nz-trend-tab--active');
          }
        }
      });
    }
  }
};
