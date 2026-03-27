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
    C = window.Chart;
    if (!C) { console.warn('[mbcxDashboard] Chart.js not loaded.'); return; }

    var bm = data.buildingMeters;
    var cup = data.cup;
    var en = data.terminalUnits.energy;

    // EUI bar chart
    new C(container.querySelector('#mbcxEuiChart'), {
      type: 'bar',
      data: {
        labels: MONTHS,
        datasets: [
          { label:'2025', data: bm.normalizedMonthly.y2025, backgroundColor:'rgba(156,163,175,0.5)', barPercentage:0.75, categoryPercentage:0.8 },
          { label:'2026', data: bm.normalizedMonthly.y2026, backgroundColor:'rgba(74,111,165,0.8)',  barPercentage:0.75, categoryPercentage:0.8 }
        ]
      },
      options: baseOpts(function (v) { return v.toFixed(1); }, MONTHS)
    });

    // CUP pump + delta-T charts for each system
    Object.keys(cup).forEach(function (key) {
      var sys = cup[key];
      var pumpEl = container.querySelector('#mbcxPump-' + key);
      var dtEl   = container.querySelector('#mbcxDt-' + key);

      if (pumpEl) {
        var pumpDs = [
          { label: sys.pump.legendA, data: sys.pump.dataA, borderColor: sys.pump.colorA, backgroundColor:'transparent', borderWidth:2, pointRadius:3, tension:0.3 }
        ];
        if (sys.pump.dataB) {
          pumpDs.push({ label: sys.pump.legendB, data: sys.pump.dataB, borderColor: sys.pump.colorB, backgroundColor:'transparent', borderWidth:2, pointRadius:3, tension:0.3 });
        }
        new C(pumpEl, { type:'line', data:{ labels:DAYS, datasets:pumpDs }, options: baseOpts(function (v) { return v + '%'; }, DAYS) });
      }

      if (dtEl) {
        var dtDs = [
          { label: sys.dt.legendA, data: sys.dt.data, borderColor: sys.dt.color, backgroundColor:'transparent', borderWidth:2, pointRadius:3, tension:0.3 }
        ];
        if (sys.dt.design != null) {
          dtDs.push({ label:'Design', data: DAYS.map(function () { return sys.dt.design; }), borderColor:'#9CA3AF', backgroundColor:'transparent', borderWidth:1, borderDash:[4,3], pointRadius:0 });
        }
        new C(dtEl, { type:'line', data:{ labels:DAYS, datasets:dtDs }, options: baseOpts(function (v) { return v + '\u00b0F'; }, DAYS) });
      }
    });

    // AHU fleet chart (stored for metric switching)
    var ahuMetrics = data.ahu.metrics;
    var ahuChartEl = container.querySelector('#mbcxAhuFleetChart');
    if (ahuChartEl) {
      NS._ahuChart = new C(ahuChartEl, {
        type: 'bar',
        data: {
          labels: MONTHS,
          datasets: [
            { label:'2025', data: ahuMetrics.vfd.y2025, backgroundColor:'rgba(156,163,175,0.5)', barPercentage:0.75, categoryPercentage:0.8 },
            { label:'2026', data: ahuMetrics.vfd.y2026, backgroundColor:'rgba(92,138,60,0.8)',   barPercentage:0.75, categoryPercentage:0.8 }
          ]
        },
        options: baseOpts(function (v) { return v + '%'; }, MONTHS)
      });
      NS.Components.AHU.renderTable(container, 'vfd', ahuMetrics);
    }

    // Reheat stacked bar chart
    var reheatEl = container.querySelector('#mbcxReheatChart');
    if (reheatEl) {
      new C(reheatEl, {
        type: 'bar',
        data: {
          labels: DAYS,
          datasets: [
            { label:'Faulty Reheat', data: en.reheatDaily.faultyReheat, backgroundColor:'rgba(155,35,53,0.7)',  barPercentage:0.75, categoryPercentage:0.85 },
            { label:'Leaking Valve', data: en.reheatDaily.leakingValve, backgroundColor:'rgba(217,119,6,0.6)', barPercentage:0.75, categoryPercentage:0.85 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend:{display:false}, tooltip:{ backgroundColor:'#1F2937', callbacks:{ label: function (c) { return c.dataset.label + ': ' + c.parsed.y + ' kWh'; } } } },
          scales: {
            x: { stacked:true, ticks:{font:{size:9},color:'#9CA3AF'}, grid:{display:false}, border:{display:false} },
            y: { stacked:true, ticks:{font:{size:9},color:'#9CA3AF',maxTicksLimit:3,callback:function(v){return v+'kWh';}}, grid:{color:'#F3F4F6'}, border:{display:false} }
          }
        }
      });
    }
  }

  function bindEvents(container, data) {
    var ahuMetrics = data.ahu.metrics;

    // CUP panel toggle
    var cupToggle = container.querySelector('#mbcxCupToggle');
    if (cupToggle) {
      cupToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cup]');
        if (!btn) return;
        var id = btn.dataset.cup;
        container.querySelectorAll('.cup-panel').forEach(function (p) { p.classList.remove('active'); });
        var panel = container.querySelector('#cup-' + id);
        if (panel) panel.classList.add('active');
        container.querySelectorAll('#mbcxCupToggle .toggle-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    }

    // AHU metric toggle
    var ahuToggle = container.querySelector('#mbcxAhuMetricToggle');
    if (ahuToggle) {
      ahuToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-metric]');
        if (!btn) return;
        var key = btn.dataset.metric;
        var ds  = ahuMetrics[key];

        container.querySelectorAll('#mbcxAhuMetricToggle .metric-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        var titleEl = container.querySelector('#mbcxAhuChartTitle');
        if (titleEl) titleEl.textContent = ds.title;

        if (NS._ahuChart) {
          NS._ahuChart.data.datasets[0].data = ds.y2025;
          NS._ahuChart.data.datasets[1].data = ds.y2026;
          NS._ahuChart.update();
        }

        NS.Components.AHU.renderTable(container, key, ahuMetrics);
      });
    }
  }

  // Expose components reference for use in bindEvents
  NS.Components = {
    Header:        window.mbcxDashboard.components.Header,
    HealthBanner:  window.mbcxDashboard.components.HealthBanner,
    BuildingMeters:window.mbcxDashboard.components.BuildingMeters,
    CUP:           window.mbcxDashboard.components.CUP,
    AHU:           window.mbcxDashboard.components.AHU,
    TerminalUnits: window.mbcxDashboard.components.TerminalUnits,
    Footer:        window.mbcxDashboard.components.Footer
  };

  NS.App = {
    init: function (container, data) {
      // Resolve component refs (modules loaded after App.js is parsed)
      NS.Components = {
        Header:        window.mbcxDashboard.components.Header,
        HealthBanner:  window.mbcxDashboard.components.HealthBanner,
        BuildingMeters:window.mbcxDashboard.components.BuildingMeters,
        CUP:           window.mbcxDashboard.components.CUP,
        AHU:           window.mbcxDashboard.components.AHU,
        TerminalUnits: window.mbcxDashboard.components.TerminalUnits,
        Footer:        window.mbcxDashboard.components.Footer
      };

      var co = NS.Components;
      container.innerHTML = [
        co.Header.render(data),
        '<div class="page">',
        co.HealthBanner.render(data),
        co.BuildingMeters.render(data),
        co.CUP.render(data),
        co.AHU.render(data),
        co.TerminalUnits.render(data),
        '</div>',
        co.Footer.render()
      ].join('\n');

      co.Header.initTimestamp();
      initCharts(container, data);
      bindEvents(container, data);
    }
  };

})(window.mbcxDashboard);
