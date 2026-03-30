// App.js — assembles all components, injects HTML, initializes Chart.js charts
window.netzeroDashboard = window.netzeroDashboard || {};

(function (NS) {

  NS.App = {
    init: function (container, data, ctx) {
      var co = NS.components;

      var siteName = (ctx && ctx.siteName) ? ctx.siteName : 'Demo Site';
      var dateStr = '';
      if (ctx && ctx.datesStart && ctx.datesEnd) dateStr = ctx.datesStart + '\u2009\u2013\u2009' + ctx.datesEnd;
      else if (ctx && ctx.datesStart) dateStr = ctx.datesStart;

      container.innerHTML = [
        '<div class="nz-title-bar">',
        '  <div class="nz-title-site" id="nzTitleSite">' + siteName + '</div>',
        dateStr ? '  <div class="nz-title-dates">' + dateStr + '</div>' : '',
        '</div>',
        '<div class="nz-page-narrow">',
        co.Header.render(data),
        co.KpiStrip.render(data),
        co.EquivStrip.render(data),
        co.Charts.render(),
        co.DetailTables.render(data),
        '</div>',
        '<div class="nz-page-full">',
        '  <div class="nz-meter-section">',
        co.MeterBreakdown.render(data),
        '  </div>',
        '</div>',
        '<div class="nz-page-narrow-bottom">',
        co.Footer.render(),
        '</div>'
      ].join('\n');

      // Initialize Chart.js charts after DOM is populated
      co.KpiStrip.initDonut(container, data);
      co.Charts.initCharts(container, data);
    }
  };

})(window.netzeroDashboard);
