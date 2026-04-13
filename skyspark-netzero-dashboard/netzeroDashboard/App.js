// App.js — assembles all sections into a single continuous page
window.netzeroDashboard = window.netzeroDashboard || {};

(function (NS) {

  // SVG icons for section headings
  var ICONS = {
    kpi:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="2" width="4" height="19"/></svg>'
  };

  NS.App = {
    init: function (container, data, ctx) {
      var co = NS.components;

      var siteName = (ctx && ctx.siteName) ? ctx.siteName : 'Demo Site';
      var dateStr = '';
      if (ctx && ctx.datesStart && ctx.datesEnd) dateStr = ctx.datesStart + '\u2009\u2013\u2009' + ctx.datesEnd;
      else if (ctx && ctx.datesStart) dateStr = ctx.datesStart;

      container.innerHTML = [
        // Title bar
        '<div class="nz-title-bar">',
        '  <div class="nz-title-site" id="nzTitleSite">' + siteName + '</div>',
        dateStr ? '  <div class="nz-title-dates">' + dateStr + '</div>' : '',
        '</div>',

        // Page content
        '<div class="nz-page">',

        // Page title
        '<div class="nz-page-titlebar">',
        '  <div>',
        '    <div class="nz-page-title">Building Energy \u2014 Actual vs. Modeled</div>',
        '    <div class="nz-page-subtitle">Year-to-date performance \u00b7 consumption vs. generation</div>',
        '  </div>',
        '</div>',

        // ── Performance Overview ──
        '<div class="nz-section-heading">',
        '  <div class="nz-section-icon" style="background:var(--nz-blue)">' + ICONS.kpi + '</div>',
        '  <div class="nz-section-title">Performance Overview</div>',
        '</div>',

        // Two-column layout: KPIs (left) | Equivalencies (right)
        '<div class="nz-overview-grid">',
        '  <div class="nz-overview-col">',
        '    <div class="nz-detail-label">Key Metrics</div>',
        co.KpiStrip.render(data),
        '  </div>',
        '  <div class="nz-overview-col">',
        '    <div class="nz-detail-label">Environmental Equivalency',
        '      <a class="nz-source-link" href="https://www.epa.gov/energy/greenhouse-gases-equivalencies-calculator-calculations-and-references" target="_blank" rel="noopener">Source: EPA</a>',
        '    </div>',
        co.EquivStrip.render(data),
        '  </div>',
        '</div>',

        // ── Monthly Trends ──
        '<div class="nz-section-heading">',
        '  <div class="nz-section-icon" style="background:var(--nz-bar-ink)">' + ICONS.chart + '</div>',
        '  <div class="nz-section-title">Monthly Trends</div>',
        '</div>',

        co.Charts.render(data),

        // Footer
        co.Footer.render(),

        '</div>'
      ].join('\n');

      // Initialize Chart.js charts after DOM
      co.Charts.initCharts(container, data);
    }
  };

})(window.netzeroDashboard);
