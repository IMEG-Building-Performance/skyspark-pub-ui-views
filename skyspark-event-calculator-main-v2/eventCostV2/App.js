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

  var TAB_IDS    = ['tracker', 'monthly', 'reconciliation', 'detail', 'siteStatus', 'docs'];
  var TAB_LABELS = ['Project Tracker', 'Monthly Overview', 'Utility Reconciliation', 'Event Detail', 'Site Status', 'Documentation'];
  var TAB_ICONS  = [
    '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.5" y="1.5" width="6" height="6" rx="1"/><rect x="9.5" y="1.5" width="6" height="6" rx="1"/><rect x="1.5" y="9.5" width="6" height="6" rx="1"/><rect x="9.5" y="9.5" width="6" height="6" rx="1"/></svg>',
    '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.5" y="3" width="14" height="12" rx="1.5"/><path d="M1.5 6.5h14"/><path d="M5.5 1v3M11.5 1v3"/></svg>',
    '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 5.5h12M10.5 2.5l4 3-4 3M14.5 11.5h-12M6.5 8.5l-4 3 4 3"/></svg>',
    '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2.5" y="1.5" width="12" height="14" rx="1.5"/><path d="M5.5 5.5h6M5.5 8.5h6M5.5 11.5h3"/></svg>',
    '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8.5h2.5l2-5 3.5 9.5 2.5-7 2 5 1-2.5h2.5"/></svg>',
    '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.5" y="2" width="14" height="13" rx="1.5"/><path d="M5 6h7M5 9h7M5 12h4"/></svg>'
  ];

  // Restore last active tab (skip 'detail' on fresh load — it requires a selected event)
  var initialTab = state.activeTab || 'tracker';
  if (initialTab === 'detail' && !state.selectedEventID) initialTab = 'tracker';

  // ── Dark mode (persisted in localStorage) ───────────────────────
  var darkMode = localStorage.getItem('eap-v2-dark') === '1';
  if (darkMode) root.classList.add('eap-dark');

  // ── Left nav sidebar ─────────────────────────────────────────────
  var nav = document.createElement('nav');
  nav.className = 'eap-nav';
  root.appendChild(nav);

  // Header: logo + site name (two-line) + collapse button
  var navHeader = document.createElement('div');
  navHeader.className = 'eap-nav-header';
  nav.appendChild(navHeader);

  var navLogo = document.createElement('div');
  navLogo.className = 'eap-nav-logo';
  navHeader.appendChild(navLogo);

  var navLogoLabel = document.createElement('span');
  navLogoLabel.className = 'eap-nav-logo-label';
  navLogoLabel.textContent = 'Event Cost Calc';
  navLogo.appendChild(navLogoLabel);

  // titleSite lives here; loadData() fills it with the site name
  var titleSite = document.createElement('span');
  titleSite.className = 'eap-nav-site-name';
  navLogo.appendChild(titleSite);

  var collapseBtn = document.createElement('button');
  collapseBtn.className = 'eap-nav-collapse-btn';
  collapseBtn.title = 'Collapse sidebar';
  collapseBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M8 1.5L3 6.5l5 5"/></svg>';
  navHeader.appendChild(collapseBtn);

  // ── Site & date range controls ────────────────────────────────────
  var navControls = document.createElement('div');
  navControls.className = 'eap-nav-controls';
  nav.appendChild(navControls);

  // Site selector
  var siteGroup = document.createElement('div');
  siteGroup.className = 'eap-ctrl-group';
  navControls.appendChild(siteGroup);

  var siteLbl = document.createElement('label');
  siteLbl.className = 'eap-ctrl-label';
  siteLbl.textContent = 'Site';
  siteGroup.appendChild(siteLbl);

  var siteSelectEl = document.createElement('select');
  siteSelectEl.className = 'eap-ctrl-select';
  siteSelectEl.disabled = true;
  var siteOptEl = document.createElement('option');
  siteOptEl.textContent = '— Select site —';
  siteSelectEl.appendChild(siteOptEl);
  siteGroup.appendChild(siteSelectEl);

  // Date range
  var dateGroup = document.createElement('div');
  dateGroup.className = 'eap-ctrl-group';
  navControls.appendChild(dateGroup);

  var dateLbl = document.createElement('label');
  dateLbl.className = 'eap-ctrl-label';
  dateLbl.textContent = 'Date Range';
  dateGroup.appendChild(dateLbl);

  // Navigation row: ‹  Past Week  ›  Refresh
  var dateNav = document.createElement('div');
  dateNav.className = 'eap-date-nav';
  dateGroup.appendChild(dateNav);

  var datePrevBtn = document.createElement('button');
  datePrevBtn.className = 'eap-date-arrow';
  datePrevBtn.innerHTML = '&#8249;';
  dateNav.appendChild(datePrevBtn);

  var dateDisplay = document.createElement('span');
  dateDisplay.className = 'eap-date-display';
  dateDisplay.textContent = 'Past Week';
  dateNav.appendChild(dateDisplay);

  var dateNextBtn = document.createElement('button');
  dateNextBtn.className = 'eap-date-arrow';
  dateNextBtn.innerHTML = '&#8250;';
  dateNav.appendChild(dateNextBtn);

  var refreshBtn = document.createElement('button');
  refreshBtn.className = 'eap-date-refresh';
  refreshBtn.title = 'Refresh';
  refreshBtn.textContent = 'Refresh';
  dateNav.appendChild(refreshBtn);

  // Period buttons: Day / Week / Month / Quarter / Year / Other / Recent
  var periodRow = document.createElement('div');
  periodRow.className = 'eap-period-btns';
  dateGroup.appendChild(periodRow);

  var PERIODS = ['Day', 'Week', 'Month', 'Quarter', 'Year', 'Other', 'Recent'];
  var _activePeriod = 'Other';
  var _periodBtns = {};

  PERIODS.forEach(function(p) {
    var pb = document.createElement('button');
    pb.className = 'eap-period-btn' + (p === _activePeriod ? ' eap-period-btn--active' : '');
    pb.textContent = p;
    pb.addEventListener('click', function() {
      if (_activePeriod === p) return;
      _periodBtns[_activePeriod].classList.remove('eap-period-btn--active');
      _activePeriod = p;
      pb.classList.add('eap-period-btn--active');
    });
    periodRow.appendChild(pb);
    _periodBtns[p] = pb;
  });

  // Nav items (one per tab)
  var navItems = document.createElement('div');
  navItems.className = 'eap-nav-items';
  nav.appendChild(navItems);

  var tabBtns   = {};
  var tabPanels = {};

  TAB_IDS.forEach(function(id, i) {
    var item = document.createElement('button');
    item.className = 'eap-nav-item' + (id === initialTab ? ' eap-nav-item--active' : '');
    item.setAttribute('data-tab', id);
    item.title = TAB_LABELS[i];
    item.innerHTML = '<span class="eap-nav-item-icon">' + TAB_ICONS[i] + '</span>' +
                     '<span class="eap-nav-item-label">' + TAB_LABELS[i] + '</span>';
    navItems.appendChild(item);
    tabBtns[id] = item;
  });

  // Footer: dark mode toggle
  var navFooter = document.createElement('div');
  navFooter.className = 'eap-nav-footer';
  nav.appendChild(navFooter);

  var darkBtn = document.createElement('button');
  darkBtn.className = 'eap-dark-btn';
  darkBtn.title = 'Toggle dark mode';
  function _updateDarkBtn() {
    darkBtn.innerHTML = darkMode
      ? '<span class="eap-dark-btn-icon">&#9728;</span><span class="eap-dark-btn-label">Light Mode</span>'
      : '<span class="eap-dark-btn-icon">&#9682;</span><span class="eap-dark-btn-label">Dark Mode</span>';
  }
  _updateDarkBtn();
  navFooter.appendChild(darkBtn);

  darkBtn.addEventListener('click', function() {
    darkMode = !darkMode;
    root.classList.toggle('eap-dark', darkMode);
    localStorage.setItem('eap-v2-dark', darkMode ? '1' : '0');
    _updateDarkBtn();
  });

  // Sidebar collapse/expand
  var navCollapsed = false;
  collapseBtn.addEventListener('click', function() {
    navCollapsed = !navCollapsed;
    nav.classList.toggle('eap-nav--collapsed', navCollapsed);
    collapseBtn.title = navCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    collapseBtn.innerHTML = navCollapsed
      ? '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M5 1.5l5 5-5 5"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M8 1.5L3 6.5l5 5"/></svg>';
  });

  // ── Main content area (no topbar — title lives in sidebar) ────────
  var mainArea = document.createElement('div');
  mainArea.className = 'eap-main';
  root.appendChild(mainArea);

  // Tab content panels
  var tabContent = document.createElement('div');
  tabContent.className = 'eap-tab-content';
  mainArea.appendChild(tabContent);

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
      tabBtns[id].className   = 'eap-nav-item'  + (isActive ? ' eap-nav-item--active'  : '');
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

  navItems.addEventListener('click', function(e) {
    var item = e.target.closest('.eap-nav-item');
    if (!item) return;
    var id = item.getAttribute('data-tab');
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

      // Update site name in sidebar header
      titleSite.textContent = siteName;

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
