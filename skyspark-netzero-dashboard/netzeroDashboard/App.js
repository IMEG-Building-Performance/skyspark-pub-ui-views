// App.js — assembles all components, injects HTML, initializes Chart.js charts
window.netzeroDashboard = window.netzeroDashboard || {};

(function (NS) {

  NS.App = {
    init: function (container, data, ctx) {
      var co = NS.components;

      container.innerHTML = [
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
