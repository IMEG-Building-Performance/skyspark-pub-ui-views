// App.js — assembles all components and initializes Chart.js charts
window.mbcxDashboard = window.mbcxDashboard || {};

(function (NS) {
  var C = null;

  function initCharts(container, data) {
    C = window.Chart;
    if (!C) { console.warn('[mbcxDashboard] Chart.js not loaded.'); return; }
  }

  function bindEvents(container, data) {}

  NS.Components = {};

  NS.App = {
    _lastData: null,
    _lastCtx:  null,

    init: function (container, data, ctx) {
      NS.App._lastData = data;
      NS.App._lastCtx  = ctx;

      var co = {
        Header:        window.mbcxDashboard.components.Header,
        HealthBanner:  window.mbcxDashboard.components.HealthBanner,
        BuildingMeters:window.mbcxDashboard.components.BuildingMeters,
        CUP:           window.mbcxDashboard.components.CUP,
        AHU:           window.mbcxDashboard.components.AHU,
        TerminalUnits: window.mbcxDashboard.components.TerminalUnits,
        FaultList:     window.mbcxDashboard.components.FaultList,
        TrendingView:  window.mbcxDashboard.components.TrendingView,
        Footer:        window.mbcxDashboard.components.Footer
      };
      NS.Components = co;

      ['Header','HealthBanner','BuildingMeters','CUP','AHU','TerminalUnits','FaultList','TrendingView','Footer'].forEach(function (name) {
        if (!co[name]) console.warn('[mbcxDashboard] Component not loaded:', name);
      });

      var dateStr = '';
      if (ctx && ctx.datesStart && ctx.datesEnd) dateStr = ctx.datesStart + ' – ' + ctx.datesEnd;
      else if (ctx && ctx.datesStart) dateStr = ctx.datesStart;

      var sections = [
        co.HealthBanner   ? co.HealthBanner.render(data)   : '',
        co.BuildingMeters ? co.BuildingMeters.render(data)  : '',
        co.CUP            ? co.CUP.render(data)             : '',
        co.AHU            ? co.AHU.render(data)             : '',
        co.TerminalUnits  ? co.TerminalUnits.render()       : '',
        co.FaultList      ? co.FaultList.render()           : '',
      ];

      container.innerHTML = [
        '<div class="dash-title-bar">',
        '  <div class="dash-title-site" id="mbcxDashTitleSite">' + (ctx && ctx.siteName ? ctx.siteName : 'Loading…') + '</div>',
        dateStr ? '<div class="dash-title-dates">' + dateStr + '</div>' : '',
        '  <a class="dash-title-link" id="mbcxTrendsBtn" href="#">Trends →</a>',
        '</div>',
        '<div class="page">',
        sections.join('\n'),
        '</div>'
      ].join('\n');

      initCharts(container, data);
      bindEvents(container, data);

      if (co.AHU)           co.AHU.initLive(container, ctx || null);
      if (co.TerminalUnits) co.TerminalUnits.initLive(container, ctx || null);
      if (co.FaultList)     co.FaultList.initLive(container, ctx || null);

      if (co.TrendingView) {
        var trendsBtn = container.querySelector('#mbcxTrendsBtn');
        if (trendsBtn) {
          trendsBtn.addEventListener('click', function (e) {
            e.preventDefault();
            co.TrendingView.show(container, ctx || {}, function () {
              NS.App.init(container, NS.App._lastData, NS.App._lastCtx);
            });
          });
        }
      }
    }
  };

})(window.mbcxDashboard);
