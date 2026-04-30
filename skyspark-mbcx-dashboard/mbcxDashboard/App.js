// App.js — tab-based layout: Summary | Faults | Trends
window.mbcxDashboard = window.mbcxDashboard || {};

(function (NS) {

  function initCharts(container, data) {
    if (!window.Chart) console.warn('[mbcxDashboard] Chart.js not loaded.');
  }

  NS.Components = {};

  NS.App = {
    _lastData:   null,
    _lastCtx:    null,
    _activeTab:  null,

    init: function (container, data, ctx) {
      NS.App._lastData  = data;
      NS.App._lastCtx   = ctx;
      NS.App._activeTab = null;

      var co = {
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

      ['HealthBanner','BuildingMeters','CUP','AHU','TerminalUnits','FaultList','TrendingView'].forEach(function (n) {
        if (!co[n]) console.warn('[mbcxDashboard] Component not loaded:', n);
      });

      var dateStr = '';
      if (ctx && ctx.datesStart && ctx.datesEnd) dateStr = ctx.datesStart + ' – ' + ctx.datesEnd;
      else if (ctx && ctx.datesStart) dateStr = ctx.datesStart;

      container.innerHTML = [
        '<div class="dash-title-bar">',
        '  <div class="dash-title-site" id="mbcxDashTitleSite">' + (ctx && ctx.siteName ? ctx.siteName : 'Loading…') + '</div>',
        dateStr ? '<div class="dash-title-dates">' + dateStr + '</div>' : '',
        '</div>',
        '<div class="dash-tab-bar">',
        '  <button class="dash-tab" data-tab="summary">Summary</button>',
        '  <button class="dash-tab" data-tab="faults">Faults</button>',
        '  <button class="dash-tab" data-tab="trends">Trends</button>',
        '</div>',
        '<div class="dash-content" id="mbcxContent"></div>'
      ].join('\n');

      initCharts(container, data);

      container.querySelectorAll('.dash-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          NS.App._showTab(container, btn.getAttribute('data-tab'), co, data, ctx);
        });
      });

      NS.App._showTab(container, 'summary', co, data, ctx);
    },

    _showTab: function (container, tab, co, data, ctx) {
      // Cleanup outgoing tab
      if (NS.App._activeTab === 'trends' && co.TrendingView && co.TrendingView.destroy) {
        co.TrendingView.destroy();
      }
      NS.App._activeTab = tab;

      container.querySelectorAll('.dash-tab').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
      });

      var content = container.querySelector('#mbcxContent');
      content.classList.toggle('dash-content--fixed', tab === 'trends');

      if (tab === 'summary') {
        content.innerHTML = [
          '<div class="page">',
          co.HealthBanner   ? co.HealthBanner.render(data)   : '',
          co.BuildingMeters ? co.BuildingMeters.render(data)  : '',
          co.CUP            ? co.CUP.render(data)             : '',
          co.AHU            ? co.AHU.render(data)             : '',
          co.TerminalUnits  ? co.TerminalUnits.render()       : '',
          '</div>'
        ].join('\n');
        if (co.AHU)           co.AHU.initLive(container, ctx || null);
        if (co.TerminalUnits) co.TerminalUnits.initLive(container, ctx || null);
      }
      else if (tab === 'faults') {
        content.innerHTML = co.FaultList ? co.FaultList.renderPage() : '<div class="tu-loading">Fault List not loaded.</div>';
        if (co.FaultList) co.FaultList.initLive(container, ctx || null);
      }
      else if (tab === 'trends') {
        if (co.TrendingView) co.TrendingView.showInContent(content, ctx || {});
      }
    }
  };

})(window.mbcxDashboard);
