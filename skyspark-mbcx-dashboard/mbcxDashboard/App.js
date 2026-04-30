// App.js — assembles all components and initializes Chart.js charts
window.mbcxDashboard = window.mbcxDashboard || {};

(function (NS) {
  var C = null; // Chart.js reference, set on init

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // Shared Chart.js tooltip + axis config
  function baseOpts(yFmt, xLabels) {
    var tt = { backgroundColor:'#1F2937', titleFont:{size:11}, bodyFont:{size:12}, padding:9, cornerRadius:5 };
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tt },
      scales: {
        x: { labels: xLabels, ticks:{font:{size:10},color:'#9CA3AF'}, grid:{display:false}, border:{display:false} },
        y: { ticks:{font:{size:10},color:'#9CA3AF',maxTicksLimit:4,callback:yFmt}, grid:{color:'#F3F4F6'}, border:{display:false} }
      }
    };
  }

  function initCharts(container, data) {
    // Charts are only initialized when their canvas elements exist in the DOM.
    // Sections currently showing TODO placeholders will have no canvas elements.
    C = window.Chart;
    if (!C) { console.warn('[mbcxDashboard] Chart.js not loaded.'); return; }
    // No static charts to initialize — AHU chart is rendered dynamically via AHU.initLive().
  }

  function bindEvents(container, data) {
    // Event bindings are added per-section as sections are implemented.
    // CUP and AHU metric toggles will be wired here once those sections are built out.
  }

  // Expose components reference for use in bindEvents
  NS.Components = {
    Header:        window.mbcxDashboard.components.Header,
    HealthBanner:  window.mbcxDashboard.components.HealthBanner,
    BuildingMeters:window.mbcxDashboard.components.BuildingMeters,
    CUP:           window.mbcxDashboard.components.CUP,
    AHU:           window.mbcxDashboard.components.AHU,
    TerminalUnits: window.mbcxDashboard.components.TerminalUnits,
    FaultList:     window.mbcxDashboard.components.FaultList,
    Footer:        window.mbcxDashboard.components.Footer
  };

  NS.App = {
    init: function (container, data, ctx) {
      // Resolve component refs (modules loaded after App.js is parsed)
      var co = {
        Header:        window.mbcxDashboard.components.Header,
        HealthBanner:  window.mbcxDashboard.components.HealthBanner,
        BuildingMeters:window.mbcxDashboard.components.BuildingMeters,
        CUP:           window.mbcxDashboard.components.CUP,
        AHU:           window.mbcxDashboard.components.AHU,
        TerminalUnits: window.mbcxDashboard.components.TerminalUnits,
        FaultList:     window.mbcxDashboard.components.FaultList,
        Footer:        window.mbcxDashboard.components.Footer
      };
      NS.Components = co;

      // Warn about any missing components so the console shows the real cause
      ['Header','HealthBanner','BuildingMeters','CUP','AHU','TerminalUnits','FaultList','Footer'].forEach(function(name) {
        if (!co[name]) console.warn('[mbcxDashboard] Component not loaded:', name);
      });

      var dateStr = '';
      if (ctx && ctx.datesStart && ctx.datesEnd) dateStr = ctx.datesStart + '\u2009\u2013\u2009' + ctx.datesEnd;
      else if (ctx && ctx.datesStart) dateStr = ctx.datesStart;

      var sections = [
        co.HealthBanner  ? co.HealthBanner.render(data)  : '',
        co.BuildingMeters? co.BuildingMeters.render(data) : '',
        co.CUP           ? co.CUP.render(data)            : '',
        co.AHU           ? co.AHU.render(data)            : '',
        co.TerminalUnits ? co.TerminalUnits.render()      : '',
        co.FaultList     ? co.FaultList.render()          : '',
      ];

      container.innerHTML = [
        '<div class="dash-title-bar">',
        '  <div class="dash-title-site" id="mbcxDashTitleSite">' + (ctx && ctx.siteName ? ctx.siteName : 'Loading\u2026') + '</div>',
        dateStr ? '<div class="dash-title-dates">' + dateStr + '</div>' : '',
        '  <a class="dash-title-link" href="/ui/mbcxTrendingView" target="_blank">Trends \u2192</a>',
        '</div>',
        '<div class="page">',
        sections.join('\n'),
        '</div>'
      ].join('\n');

      initCharts(container, data);
      bindEvents(container, data);

      if (co.AHU)          co.AHU.initLive(container, ctx || null);
      if (co.TerminalUnits) co.TerminalUnits.initLive(container, ctx || null);
      if (co.FaultList)    co.FaultList.initLive(container, ctx || null);
    }
  };

})(window.mbcxDashboard);
