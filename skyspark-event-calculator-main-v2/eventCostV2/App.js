/**
 * App.js — Root Application for Event Cost V2
 *
 * 6-tab structure:
 *   Tab 1 (tracker)        — Project Tracker (kanban, static)
 *   Tab 2 (monthly)        — Monthly Overview
 *   Tab 3 (reconciliation) — Utility Reconciliation
 *   Tab 4 (detail)         — Event Detail (navigated to from Tab 2 or Tab 5)
 *   Tab 5 (siteStatus)     — Site Status (live chart)
 *   Tab 6 (docs)           — Documentation
 */

window.EventCostV2 = window.EventCostV2 || {};

window.EventCostV2.onUpdate = function(arg) {
  var view  = arg.view;
  var elem  = arg.elem;

  var state              = window.EventCostV2.state;
  var skyspark           = window.EventCostV2.skyspark;
  var api                = window.EventCostV2.api;
  var projectTracker     = window.EventCostV2.projectTracker;
  var monthlyOverview    = window.EventCostV2.monthlyOverview;
  var utilReconciliation = window.EventCostV2.utilityReconciliation;
  var eventDetailV2      = window.EventCostV2.eventDetailV2;
  var siteStatus         = window.EventCostV2.siteStatus;
  var documentation      = window.EventCostV2.documentation;

  view.removeAll();

  // ── Read SkySpark variables ────────────────────────────────────────
  var vars = skyspark.readVariables(arg, view);
  var selectedSite = vars.selectedSite;
  var startDate    = vars.startDate;
  var endDate      = vars.endDate;

  state.attestKey    = vars.attestKey;
  state.projectName  = vars.projectName;
  state._selectedSite = selectedSite;
  state._startDate    = startDate;
  state._endDate      = endDate;

  window.EventCostV2.computeScaling();

  // ══════════════════════════════════════════════════════════════════
  // PAGE SHELL
  // ══════════════════════════════════════════════════════════════════

  var root = document.createElement('div');
  root.className = 'eap-root';
  elem.appendChild(root);

  // Title bar
  var titleBar = document.createElement('div');
  titleBar.className = 'eap-title-bar';
  root.appendChild(titleBar);

  var titleSite = document.createElement('span');
  titleSite.className = 'eap-title-site';
  titleSite.textContent = 'Event Utility Cost Tracking';
  titleBar.appendChild(titleSite);

  // Tab bar
  var tabBar = document.createElement('div');
  tabBar.className = 'eap-tab-bar';
  titleBar.appendChild(tabBar);

  var TAB_IDS    = ['tracker', 'monthly', 'reconciliation', 'detail', 'siteStatus', 'docs'];
  var TAB_LABELS = ['Project Tracker', 'Monthly Overview', 'Utility Reconciliation', 'Event Detail', 'Site Status', 'Documentation'];

  // Restore last active tab (skip 'detail' on fresh load — it requires a selected event)
  var initialTab = state.activeTab || 'tracker';
  if (initialTab === 'detail' && !state.selectedEventID) initialTab = 'tracker';

  var tabBtns   = {};
  var tabPanels = {};

  TAB_IDS.forEach(function(id, i) {
    var btn = document.createElement('button');
    btn.className = 'eap-tab-btn' + (id === initialTab ? ' eap-tab-btn--active' : '');
    btn.textContent = TAB_LABELS[i];
    btn.setAttribute('data-tab', id);
    tabBar.appendChild(btn);
    tabBtns[id] = btn;
  });

  var tabContent = document.createElement('div');
  tabContent.className = 'eap-tab-content';
  root.appendChild(tabContent);

  TAB_IDS.forEach(function(id) {
    var panel = document.createElement('div');
    panel.className = 'eap-tab-panel' + (id === initialTab ? ' eap-tab-panel--active' : '');
    panel.setAttribute('data-tab-panel', id);
    tabContent.appendChild(panel);
    tabPanels[id] = panel;
  });

  // Track which tabs have been initialized
  var tabInited = {};
  TAB_IDS.forEach(function(id) { tabInited[id] = false; });
  tabInited[initialTab] = true;

  state.activeTab = initialTab;

  // Tracker is static — render it immediately regardless of initial tab
  projectTracker.renderTab(tabPanels.tracker);
  tabInited.tracker = true;

  // ── Tab switching ────────────────────────────────────────────────
  function switchTab(tabId, eventSummary) {
    if (state.activeTab === tabId && !eventSummary) return;
    state.activeTab = tabId;

    TAB_IDS.forEach(function(id) {
      var isActive = id === tabId;
      tabBtns[id].className   = 'eap-tab-btn'   + (isActive ? ' eap-tab-btn--active' : '');
      tabPanels[id].className = 'eap-tab-panel'  + (isActive ? ' eap-tab-panel--active' : '');
    });

    if (tabId === 'tracker' && !tabInited.tracker) {
      tabInited.tracker = true;
      projectTracker.renderTab(tabPanels.tracker);
    } else if (tabId === 'detail') {
      // Re-render detail for the (possibly new) selected event
      renderDetailTab(eventSummary || null);
    } else if (tabId === 'reconciliation' && !tabInited.reconciliation) {
      tabInited.reconciliation = true;
      renderReconciliationTab();
    } else if (tabId === 'siteStatus' && !tabInited.siteStatus) {
      tabInited.siteStatus = true;
      renderSiteStatusTab();
    } else if (tabId === 'docs' && !tabInited.docs) {
      tabInited.docs = true;
      documentation.renderTab(tabPanels.docs);
    }

    // If returning to siteStatus, force chart resize
    if (tabId === 'siteStatus' && state.chartInstance) {
      setTimeout(function() {
        state.chartInstance.resize();
        if (state._syncOverlaySize) state._syncOverlaySize();
        var ce = state.currentEvents || [];
        if (state._resizeTimelineForEvents) state._resizeTimelineForEvents(ce);
        if (window.EventCostV2.annotations) window.EventCostV2.annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, ce);
        if (state.refs) window.EventCostV2.timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, ce);
      }, 50);
    }
  }

  tabBar.addEventListener('click', function(e) {
    var btn = e.target.closest('.eap-tab-btn');
    if (!btn) return;
    var id = btn.getAttribute('data-tab');
    if (id === 'detail' && !state.selectedEventID) return; // require selection first
    switchTab(id);
  });

  // ══════════════════════════════════════════════════════════════════
  // TAB 1: MONTHLY OVERVIEW
  // ══════════════════════════════════════════════════════════════════

  var monthlyPanel = tabPanels.monthly;

  // Loading state
  var monthlyLoading = document.createElement('div');
  monthlyLoading.style.cssText = 'text-align:center;padding:100px 20px;color:#6c757d;';
  monthlyLoading.innerHTML = '<div class="edb-spinner" style="width:36px;height:36px;margin:0 auto 14px;"></div><div style="font-size:14px;font-weight:600;">Loading event cost data…</div>';
  monthlyPanel.appendChild(monthlyLoading);

  function renderMonthlyTab(eventSummaries) {
    monthlyPanel.innerHTML = '';
    monthlyOverview.render(monthlyPanel, eventSummaries, function(ev) {
      state.selectedEventID = ev.eventID;
      state.detailReturnTab = 'monthly';
      switchTab('detail', ev);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // TAB 2: UTILITY RECONCILIATION
  // ══════════════════════════════════════════════════════════════════

  function renderReconciliationTab() {
    var results = state.eventCostResults || [];
    utilReconciliation.render(tabPanels.reconciliation, results);
  }

  // ══════════════════════════════════════════════════════════════════
  // TAB 3: EVENT DETAIL
  // ══════════════════════════════════════════════════════════════════

  function renderDetailTab(eventSummary) {
    var panel = tabPanels.detail;
    panel.innerHTML = '';

    // If no summary passed, try to find it from state
    if (!eventSummary && state.selectedEventID && state.eventSummaries) {
      eventSummary = state.eventSummaries.find(function(ev) {
        return String(ev.eventID) === String(state.selectedEventID);
      });
    }

    if (!eventSummary) {
      panel.style.padding = '24px 28px';
      panel.innerHTML = '<div style="text-align:center;padding:80px 20px;color:#6c757d;font-size:14px;">Select an event from the Monthly Overview tab to view details.</div>';
      return;
    }

    eventDetailV2.render(
      panel,
      eventSummary,
      state.eventCostResults || [],
      function() {
        // Back button: return to originating tab
        switchTab(state.detailReturnTab || 'monthly');
      },
      function(concurrentEvent) {
        // Navigate to a concurrent event's detail
        var matched = (state.eventSummaries || []).find(function(ev) {
          return String(ev.eventID) === String(concurrentEvent.eventID);
        }) || concurrentEvent;
        state.selectedEventID = matched.eventID;
        renderDetailTab(matched);
      }
    );
  }

  // ── Init detail tab if it was the last active tab ────────────────
  if (initialTab === 'detail') {
    renderDetailTab(null);
  }

  // ══════════════════════════════════════════════════════════════════
  // TAB 4: SITE STATUS
  // ══════════════════════════════════════════════════════════════════

  function renderSiteStatusTab() {
    siteStatus.render(tabPanels.siteStatus, function(refs) {
      // Chart is ready — load power data if site is available
      if (selectedSite && startDate && endDate) {
        loadSiteStatusData();
      }
    });
  }

  function loadSiteStatusData() {
    if (!selectedSite) return;
    state.utilityData = {};
    var active = state.activeUtility;
    api.loadPowerData(selectedSite, startDate, endDate, active).then(function(powerData) {
      state.utilityData[active] = powerData;
      if (state._siteStatus_refreshUtility) state._siteStatus_refreshUtility();
    }).catch(function(err) { console.warn('loadPowerData:', err); });
  }

  // Init if siteStatus was initial tab
  if (initialTab === 'siteStatus') {
    renderSiteStatusTab();
  }

  // ══════════════════════════════════════════════════════════════════
  // TAB 5: DOCUMENTATION
  // ══════════════════════════════════════════════════════════════════

  if (initialTab === 'docs') {
    documentation.renderTab(tabPanels.docs);
  }

  // ══════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════════════

  function loadData() {
    if (!selectedSite) {
      monthlyPanel.innerHTML = '<div style="text-align:center;padding:100px 20px;color:#6c757d;font-size:14px;">Select a site to load event cost data.</div>';
      return;
    }

    // Show loading state in monthly tab
    monthlyPanel.innerHTML = '';
    monthlyPanel.appendChild(monthlyLoading);

    Promise.all([
      api.loadSiteName(selectedSite),
      api.loadEventCostResults(selectedSite, startDate, endDate)
        .catch(function(err) { console.error('loadEventCostResults:', err); return []; })
    ]).then(function(results) {
      var siteName    = results[0];
      var rawResults  = results[1];

      state.siteName          = siteName;
      state.eventCostResults  = rawResults;

      var eventSummaries = api.aggregateEventSummaries(rawResults);
      state.eventSummaries = eventSummaries;

      // Build chart event objects for the Site Status tab
      var chartColors = [
        'rgba(54,162,235,0.8)', 'rgba(255,99,132,0.8)', 'rgba(75,192,192,0.8)',
        'rgba(255,159,64,0.8)', 'rgba(153,102,255,0.8)', 'rgba(255,205,86,0.8)',
        'rgba(201,203,207,0.8)'
      ];
      state.currentEvents = eventSummaries.map(function(ev, i) {
        var start = ev.eventStart ? new Date(ev.eventStart) : null;
        var end   = ev.eventEnd   ? new Date(ev.eventEnd)   : null;
        var durationMs = (start && end) ? end - start : 0;
        var hrs = Math.floor(durationMs / 3600000);
        var durationStr = hrs >= 24 ? Math.floor(hrs/24) + 'd ' + (hrs%24) + 'h' : hrs + 'h';
        return {
          label:       ev.eventName || 'Event ' + ev.eventID,
          startTime:   start,
          endTime:     end,
          time:        start,
          color:       chartColors[i % chartColors.length],
          cost:        ev.totalCost,
          duration:    durationStr,
          area:        ev.eventSF ? Math.round(ev.eventSF).toLocaleString() + ' sq ft' : null,
          costDisplay: ev.totalCost ? '$' + Math.round(ev.totalCost).toLocaleString() : null,
          rawData:     ev
        };
      }).filter(function(e) { return e.startTime && !isNaN(e.startTime.getTime()); });

      state.currentDateRange = { startDate: startDate, endDate: endDate };
      state.visibilityState  = {};
      state.currentEvents.forEach(function(_, i) { state.visibilityState[i] = false; });

      // Update title bar
      titleSite.textContent = 'Event Utility Cost Tracking — ' + siteName;

      // Render Monthly Overview (always)
      renderMonthlyTab(eventSummaries);

      // Re-render reconciliation if it was already open
      if (tabInited.reconciliation) {
        renderReconciliationTab();
      }

      // Update Site Status chart if it was already open
      if (tabInited.siteStatus && state._siteStatus_refreshUtility) {
        state.utilityData = {};
        loadSiteStatusData();
      }

      // Re-render detail if it was the active tab
      if (state.activeTab === 'detail' && state.selectedEventID) {
        var matched = eventSummaries.find(function(ev) {
          return String(ev.eventID) === String(state.selectedEventID);
        });
        if (matched) renderDetailTab(matched);
      }
    }).catch(function(err) {
      console.error('loadData error:', err);
      monthlyPanel.innerHTML = '<div style="text-align:center;padding:80px;color:#dc3545;font-size:14px;">Failed to load data. Check the browser console for details.</div>';
    });
  }

  loadData();

  // ── Variable polling ─────────────────────────────────────────────
  skyspark.startPolling(view, { selectedSite: selectedSite, startDate: startDate, endDate: endDate },
    function(newSite, newStart, newEnd) {
      selectedSite = newSite;
      startDate    = newStart;
      endDate      = newEnd;
      state._selectedSite = newSite;
      state._startDate    = newStart;
      state._endDate      = newEnd;

      // Clear caches
      state.eventCostResults = null;
      state.eventSummaries   = null;
      state.utilityData      = {};

      loadData();
    }
  );
};
