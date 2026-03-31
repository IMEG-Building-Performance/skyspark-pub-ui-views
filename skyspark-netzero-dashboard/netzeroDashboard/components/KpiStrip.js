// components/KpiStrip.js
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.KpiStrip = {

  _fmt: function (n) {
    if (n === null || n === undefined) return '\u2014';
    var s = Math.abs(n).toLocaleString('en-US');
    return n < 0 ? '\u2212' + s : s;
  },

  render: function (data) {
    var k = data.kpis;
    var fmt = this._fmt;
    var mix = k.sourceMix;

    return [
      '<div class="nz-kpi-strip">',

      // 1 — Building Usage
      '  <div class="nz-kpi">',
      '    <div class="nz-kpi-label">Building Usage</div>',
      '    <div class="nz-kpi-num">' + fmt(k.buildingUsage) + '</div>',
      '    <div class="nz-kpi-unit">kWh \u00b7 YTD actual</div>',
      '  </div>',

      // 2 — Solar Generation
      '  <div class="nz-kpi">',
      '    <div class="nz-kpi-label">Solar Generation</div>',
      '    <div class="nz-kpi-num">' + fmt(k.solarGeneration) + '</div>',
      '    <div class="nz-kpi-unit">kWh \u00b7 YTD actual</div>',
      '  </div>',

      // 3 — Net Building Performance
      '  <div class="nz-kpi">',
      '    <div class="nz-kpi-label">Net Building Performance</div>',
      '    <div class="nz-kpi-num">' + fmt(k.netPerformance) + '</div>',
      '    <div class="nz-kpi-unit">kWh \u00b7 grid dependent</div>',
      '    <div class="nz-kpi-note">' + (k.surplusNote || '') + '</div>',
      '  </div>',

      // 4 — Coverage ratio
      '  <div class="nz-kpi">',
      '    <div class="nz-kpi-label">Coverage ratio</div>',
      '    <div class="nz-kpi-num">' + (k.coverageRatio !== null ? k.coverageRatio + '%' : '\u2014') + '</div>',
      '    <div class="nz-kpi-unit">solar / building usage</div>',
      '  </div>',

      // 5 — Source mix (donut rendered after DOM insert)
      '  <div class="nz-kpi">',
      '    <div class="nz-kpi-label">Source mix</div>',
      (mix.water !== null ?
      '    <div class="nz-kpi-with-donut">' +
      '      <div class="nz-kpi-donut-wrap"><canvas id="nzSourceMixDonut"></canvas></div>' +
      '      <div>' +
      '        <div class="nz-kpi-donut-legend">' +
      '          <div class="nz-kpi-donut-legend-item"><span class="nz-kpi-donut-swatch" style="background:#1a6e3f"></span>Water ' + mix.water + '%</div>' +
      '          <div class="nz-kpi-donut-legend-item"><span class="nz-kpi-donut-swatch" style="background:#a8c97e"></span>Wind ' + mix.wind + '%</div>' +
      '          <div class="nz-kpi-donut-legend-item"><span class="nz-kpi-donut-swatch" style="background:#5c5c58"></span>Fossil ' + mix.fossil + '%</div>' +
      '        </div>' +
      '      </div>' +
      '    </div>'
      : '    <div class="nz-kpi-num">\u2014</div>'),
      '  </div>',

      '</div>'
    ].join('\n');
  },

  initDonut: function (container, data) {
    var C = window.Chart;
    if (!C) return;
    var el = container.querySelector('#nzSourceMixDonut');
    if (!el) return;
    var mix = data.kpis.sourceMix;
    new C(el, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [mix.water, mix.wind, mix.fossil],
          backgroundColor: ['#1a6e3f', '#a8c97e', '#5c5c58'],
          borderWidth: 0,
          hoverOffset: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#181816',
            titleFont: { family: 'IBM Plex Mono', size: 10 },
            bodyFont: { family: 'IBM Plex Mono', size: 10 },
            padding: 8,
            cornerRadius: 0,
            callbacks: {
              label: function (ctx) {
                return ' ' + ['Water','Wind','Fossil'][ctx.dataIndex] + ': ' + ctx.parsed + '%';
              }
            }
          }
        }
      }
    });
  }
};
