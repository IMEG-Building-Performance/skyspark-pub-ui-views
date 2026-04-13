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

    return [
      '<div class="nz-kpi-strip">',

      // 1 — Building Usage
      '  <div class="nz-kpi">',
      '    <div class="nz-kpi-label">Building Usage</div>',
      '    <div class="nz-kpi-num">' + fmt(k.buildingUsage) + '</div>',
      '    <div class="nz-kpi-unit">kWh</div>',
      '  </div>',

      // 2 — Solar Generation
      '  <div class="nz-kpi">',
      '    <div class="nz-kpi-label">Solar Generation</div>',
      '    <div class="nz-kpi-num">' + fmt(k.solarGeneration) + '</div>',
      '    <div class="nz-kpi-unit">kWh</div>',
      '  </div>',

      // 3 — Building Net Zero
      '  <div class="nz-kpi">',
      '    <div class="nz-kpi-label">Building Net Zero</div>',
      '    <div class="nz-kpi-num nz-kpi-num--hint" title="Metric is equal to the Solar Generation minus the Building Usage. Goal is to be greater than zero, indicating that more energy has been generated than used.">' + fmt(k.netPerformance) + '</div>',
      '    <div class="nz-kpi-unit">kWh</div>',
      '  </div>',

      // 4 — Coverage ratio
      '  <div class="nz-kpi">',
      '    <div class="nz-kpi-label">Coverage ratio</div>',
      '    <div class="nz-kpi-num">' + (k.coverageRatio !== null ? k.coverageRatio + '%' : '\u2014') + '</div>',
      '    <div class="nz-kpi-unit"></div>',
      '  </div>',

      '</div>'
    ].join('\n');
  },

  initDonut: function () { /* removed — Source Mix card no longer rendered */ }
};
