window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};

window.mbcxDashboard.components.EventCostCalc = {
  _fetchGen: 0,

  renderPage: function() {
    return '<div class="ec-outer"></div>';
  },

  initLive: function(contentEl, ctx) {
    var self = this;
    var outer = contentEl.querySelector('.ec-outer');
    if (!outer) return;

    var ecState = window.mbcxDashboard.eventCost.state;
    var ecApi = window.mbcxDashboard.eventCost.api;
    var ecConfig = window.mbcxDashboard.eventCost.config;
    var ecLoader = window.mbcxDashboard.eventCost.loader;

    ecState._selectedSite = ctx.siteRef ? ctx.siteRef.replace(/^@/, '') : null;
    ecState._startDate = ctx.datesStart || null;
    ecState._endDate = ctx.datesEnd || null;
    ecState._attestKey = ctx.attestKey || null;
    ecState._projectName = ctx.projectName || null;
    ecState.siteName = ctx.siteName || '';

    ecState.activeUtility = 'Electric';
    ecState.utilityData = {};
    ecState.currentEvents = [];
    ecState.hoverState = { hoveredEvent: null, hoveredIndex: -1, selectedIndex: -1, mouseX: 0, mouseY: 0 };
    ecState.visibilityState = {};

    var tabs = [
      { key: 'monthly', label: 'Monthly Overview' },
      { key: 'reconciliation', label: 'Utility Reconciliation' },
      { key: 'detail', label: 'Event Detail', disabled: true },
      { key: 'siteStatus', label: 'Site Status' },
      { key: 'docs', label: 'Documentation' }
    ];

    var tabBar = document.createElement('div');
    tabBar.className = 'ec-page-tabs';
    var tabBtns = {};
    tabs.forEach(function(t) {
      var btn = document.createElement('button');
      btn.className = 'ec-page-tab';
      btn.textContent = t.label;
      btn.setAttribute('data-ectab', t.key);
      if (t.disabled) { btn.disabled = true; btn.classList.add('ec-page-tab--disabled'); }
      tabBar.appendChild(btn);
      tabBtns[t.key] = btn;
    });
    outer.appendChild(tabBar);

    var tabContent = document.createElement('div');
    tabContent.id = 'ecTabContent';
    outer.appendChild(tabContent);

    var activeTab = 'monthly';
    var eventSummaries = [];
    var eventCostResults = [];
    var selectedEvent = null;

    function showTab(which) {
      activeTab = which;
      Object.keys(tabBtns).forEach(function(k) {
        tabBtns[k].classList.toggle('ec-page-tab--active', k === which);
      });
      tabContent.innerHTML = '';

      if (which === 'monthly') {
        window.mbcxDashboard.eventCost.monthlyOverview.render(tabContent, eventSummaries, function(ev) {
          selectedEvent = ev;
          tabBtns.detail.disabled = false;
          tabBtns.detail.classList.remove('ec-page-tab--disabled');
          showTab('detail');
        });
      } else if (which === 'reconciliation') {
        window.mbcxDashboard.eventCost.utilityReconciliation.render(tabContent, eventCostResults);
      } else if (which === 'detail') {
        if (!selectedEvent) { showTab('monthly'); return; }
        window.mbcxDashboard.eventCost.eventDetailV2.render(tabContent, selectedEvent, eventCostResults, function() {
          showTab('monthly');
        }, function(ev) {
          selectedEvent = ev;
          showTab('detail');
        });
      } else if (which === 'siteStatus') {
        window.mbcxDashboard.eventCost.siteStatus.render(tabContent, function(chartApi) {
          if (ecState._selectedSite && ecState._startDate && ecState._endDate) {
            var active = ecState.activeUtility || 'Electric';
            ecApi.loadPowerData(ecState._selectedSite, ecState._startDate, ecState._endDate, active)
              .then(function(data) {
                ecState.utilityData[active] = data;
                var transformers = window.mbcxDashboard.eventCost.transformers;
                ecState.currentEvents = transformers.transformTableEventsToChartFormat(eventSummaries);
                ecState.currentDateRange = { startDate: ecState._startDate, endDate: ecState._endDate };
                if (chartApi.rebuildChart) chartApi.rebuildChart();
              }).catch(function() {});
          }
        });
      } else if (which === 'docs') {
        window.mbcxDashboard.eventCost.documentation.renderTab(tabContent);
      }
    }

    Object.keys(tabBtns).forEach(function(k) {
      tabBtns[k].addEventListener('click', function() {
        if (!tabBtns[k].disabled) showTab(k);
      });
    });

    var gen = ++self._fetchGen;
    var siteRef = ecState._selectedSite;
    var startDate = ecState._startDate;
    var endDate = ecState._endDate;

    if (!siteRef) {
      tabContent.innerHTML = '<div style="text-align:center;padding:80px;color:var(--muted);font-size:14px;">Select a site to view event cost data.</div>';
      return;
    }

    tabContent.innerHTML = '<div style="text-align:center;padding:80px;"><div class="edb-spinner" style="width:36px;height:36px;margin:0 auto;"></div><div style="margin-top:12px;color:var(--muted);font-size:13px;">Loading event cost data…</div></div>';

    ecLoader.loadChartJs(function() {
      ecApi.loadEventCostResults(siteRef, startDate, endDate).then(function(results) {
        if (gen !== self._fetchGen) return;
        eventCostResults = results;
        eventSummaries = ecApi.aggregateEventSummaries(results);

        ecApi.loadSiteName(siteRef).then(function(name) {
          ecState.siteName = name;
        }).catch(function() {});

        showTab('monthly');
      }).catch(function(err) {
        if (gen !== self._fetchGen) return;
        console.warn('[EventCostCalc] Failed to load data, using demo:', err);
        if (window.mbcxDashboard.eventCost.generators) {
          eventCostResults = window.mbcxDashboard.eventCost.generators.generateDemoEventCostResults();
          eventSummaries = ecApi.aggregateEventSummaries(eventCostResults);
        }
        showTab('monthly');
      });
    });
  },

  destroy: function() {
    var ecState = window.mbcxDashboard.eventCost.state;
    if (ecState.chartInstance && ecState.chartInstance.destroy) {
      ecState.chartInstance.destroy();
      ecState.chartInstance = null;
    }
    if (window._ecMonthlyChart) {
      try { window._ecMonthlyChart.destroy(); } catch(e) {}
      window._ecMonthlyChart = null;
    }
    if (window._ecReconcChart) {
      try { window._ecReconcChart.destroy(); } catch(e) {}
      window._ecReconcChart = null;
    }
  }
};
