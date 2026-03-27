// components/HealthBanner.js
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.HealthBanner = {
  render: function (d) {
    var hb = d.healthBanner;
    return [
      '<div class="health-banner">',
      '  <div>',
      '    <div class="hb-label">Health Score</div>',
      '    <div class="hb-score-num">' + hb.score + '</div>',
      '    <div class="hb-sub">/ 100 &nbsp;&middot;&nbsp; ' + hb.riskLabel + '</div>',
      '  </div>',
      '  <div class="hb-divider"></div>',
      '  <div class="hb-stats">',
      '    <div><div class="hb-label">Critical</div><div class="hbs-num crit">' + hb.critical + '</div><div class="hbs-sub">active faults</div></div>',
      '    <div><div class="hb-label">Warnings</div><div class="hbs-num warn">' + hb.warnings + '</div><div class="hbs-sub">need review</div></div>',
      '    <div><div class="hb-label">Normal</div><div class="hbs-num ok">' + hb.normal + '</div><div class="hbs-sub">of ' + hb.totalUnits + ' units</div></div>',
      '    <div><div class="hb-label">Est. Waste</div><div class="hbs-num plain">' + hb.estWasteKwh.toLocaleString() + '</div><div class="hbs-sub">kWh this week</div></div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }
};
