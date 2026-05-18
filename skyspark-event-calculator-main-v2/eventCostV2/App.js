/**
 * App.js — Root Application for Event Cost V2
 *
 * Layout: collapsible left sidebar + main content area.
 * Sidebar: site selector, compact date picker, nav buttons, dark mode toggle.
 * Main: thin title bar + tab panels.
 */

window.EventCostV2 = window.EventCostV2 || {};

window.EventCostV2.onUpdate = function(arg) {
  var view  = arg.view;
  var elem  = arg.elem;

  var state              = window.EventCostV2.state;
  var skyspark           = window.EventCostV2.skyspark;
  var api                = window.EventCostV2.api;
  var monthlyOverview    = window.EventCostV2.monthlyOverview;
  var utilReconciliation = window.EventCostV2.utilityReconciliation;
  var eventDetailV2      = window.EventCostV2.eventDetailV2;
  var siteStatus         = window.EventCostV2.siteStatus;
  var documentation      = window.EventCostV2.documentation;
  var dpFactory          = window.EventCostV2.datePicker;

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

  // ── Dark mode ──────────────────────────────────────────────────────
  var darkMode = localStorage.getItem('eap-v2-dark') === '1';

  // ══════════════════════════════════════════════════════════════════
  // PAGE SHELL
  // ══════════════════════════════════════════════════════════════════

  var root = document.createElement('div');
  root.className = 'eap-root' + (darkMode ? ' eap-root--dark' : '');
  elem.appendChild(root);

  // ── Sidebar ────────────────────────────────────────────────────────
  var navCollapsed = state.navCollapsed || false;

  var nav = document.createElement('div');
  nav.className = 'eap-nav' + (navCollapsed ? ' eap-nav--collapsed' : '');
  root.appendChild(nav);

  // -- Controls: site + date range --
  var navControls = document.createElement('div');
  navControls.className = 'eap-nav-controls';
  nav.appendChild(navControls);

  // Site label
  var siteLabel = document.createElement('div');
  siteLabel.className = 'eap-nav-section-label';
  siteLabel.textContent = 'Site';
  navControls.appendChild(siteLabel);

  // Site selector (scaffolding — populated when SkySpark provides sites)
  var siteSelect = document.createElement('select');
  siteSelect.className = 'eap-site-select';
  var siteOpt = document.createElement('option');
  siteOpt.value = selectedSite || '';
  siteOpt.textContent = selectedSite ? selectedSite : '— Select site —';
  siteSelect.appendChild(siteOpt);
  siteSelect.disabled = true;
  navControls.appendChild(siteSelect);

  // Date range label
  var dateLabel = document.createElement('div');
  dateLabel.className = 'eap-nav-section-label';
  dateLabel.style.marginTop = '6px';
  dateLabel.textContent = 'Date Range';
  navControls.appendChild(dateLabel);

  // Compact date picker
  var dpContainer = document.createElement('div');
  navControls.appendChild(dpContainer);

  var datePicker = dpFactory.create({
    container: dpContainer,
    startDate:  startDate,
    endDate:    endDate,
    onChange: function(newStart, newEnd) {
      startDate = newStart;
      endDate   = newEnd;
      state._startDate = newStart;
      state._endDate   = newEnd;
      state.eventCostResults = null;
      state.eventSummaries   = null;
      state.utilityData      = {};
      loadData();
    }
  });

  // Sync initial dates from the picker's resolved range (e.g. "Past Week")
  startDate = datePicker.getStartDate();
  endDate   = datePicker.getEndDate();
  state._startDate = startDate;
  state._endDate   = endDate;

  // -- Header: logo + site name --
  var navHeader = document.createElement('div');
  navHeader.className = 'eap-nav-header';
  nav.appendChild(navHeader);

  var navLogo = document.createElement('div');
  navLogo.className = 'eap-nav-logo';

  var navLogoTitle = document.createElement('div');
  navLogoTitle.className = 'eap-nav-logo-title';
  navLogoTitle.textContent = 'Event Cost Calc';

  var navLogoSite = document.createElement('div');
  navLogoSite.className = 'eap-nav-logo-site';
  navLogoSite.textContent = selectedSite || '';

  navLogo.appendChild(navLogoTitle);
  navLogo.appendChild(navLogoSite);
  navHeader.appendChild(navLogo);

  var collapseBtn = document.createElement('button');
  collapseBtn.className = 'eap-nav-collapse-btn';
  collapseBtn.title = navCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
  collapseBtn.textContent = navCollapsed ? '›' : '‹';
  collapseBtn.addEventListener('click', function() {
    navCollapsed = !navCollapsed;
    state.navCollapsed = navCollapsed;
    nav.classList.toggle('eap-nav--collapsed', navCollapsed);
    collapseBtn.textContent = navCollapsed ? '›' : '‹';
    collapseBtn.title = navCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
  });
  navHeader.appendChild(collapseBtn);

  // -- Nav items --
  var TAB_IDS    = ['monthly', 'reconciliation', 'detail', 'siteStatus', 'docs'];
  var TAB_LABELS = ['Monthly Overview', 'Utility Reconciliation', 'Event Detail', 'Site Status', 'Documentation'];
  var TAB_ICONS  = [
    // Monthly: calendar grid
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="14" height="12" rx="1.5"/><path d="M1 7h14M5 1v4M11 1v4"/></svg>',
    // Reconciliation: arrows swap
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 5h12M11 2l3 3-3 3M14 11H2M5 8l-3 3 3 3"/></svg>',
    // Detail: doc lines
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="1" width="12" height="14" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h4"/></svg>',
    // Site Status: chart
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 13 5 7l4 3 3-6 3 3"/><path d="M1 13h14"/></svg>',
    // Docs: book
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 1h10v14H3zM8 1v14"/><path d="M3 5h5M3 9h5"/></svg>'
  ];

  var initialTab = state.activeTab || 'monthly';
  if (initialTab === 'detail' && !state.selectedEventID) initialTab = 'monthly';

  var navItems = document.createElement('div');
  navItems.className = 'eap-nav-items';
  nav.appendChild(navItems);

  var navBtns = {};

  TAB_IDS.forEach(function(id, i) {
    var btn = document.createElement('button');
    btn.className = 'eap-nav-btn' +
      (id === initialTab ? ' eap-nav-btn--active' : '') +
      (id === 'detail' && !state.selectedEventID ? ' eap-nav-btn--disabled' : '');

    var icon = document.createElement('span');
    icon.className = 'eap-nav-btn-icon';
    icon.innerHTML = TAB_ICONS[i];

    var lbl = document.createElement('span');
    lbl.className = 'eap-nav-btn-label';
    lbl.textContent = TAB_LABELS[i];

    btn.appendChild(icon);
    btn.appendChild(lbl);
    btn.setAttribute('data-tab', id);
    navItems.appendChild(btn);
    navBtns[id] = btn;
  });

  // -- Footer: dark mode --
  var navFooter = document.createElement('div');
  navFooter.className = 'eap-nav-footer';
  nav.appendChild(navFooter);

  var darkToggle = document.createElement('button');
  darkToggle.className = 'eap-dark-toggle';
  darkToggle.innerHTML = (darkMode ? '☀' : '☾') + '<span>' + (darkMode ? ' Light mode' : ' Dark mode') + '</span>';
  darkToggle.addEventListener('click', function() {
    darkMode = !darkMode;
    localStorage.setItem('eap-v2-dark', darkMode ? '1' : '0');
    root.classList.toggle('eap-root--dark', darkMode);
    darkToggle.innerHTML = (darkMode ? '☀' : '☾') + '<span>' + (darkMode ? ' Light mode' : ' Dark mode') + '</span>';
  });
  navFooter.appendChild(darkToggle);

  // ── Main area ──────────────────────────────────────────────────────
  var main = document.createElement('div');
  main.className = 'eap-main';
  root.appendChild(main);

  // Thin title bar
  var titleBar = document.createElement('div');
  titleBar.className = 'eap-title-bar';
  main.appendChild(titleBar);

  var titleSite = document.createElement('span');
  titleSite.className = 'eap-title-site';
  titleSite.textContent = 'Event Utility Cost Tracking';
  titleBar.appendChild(titleSite);

  // Tab panels
  var tabContent = document.createElement('div');
  tabContent.className = 'eap-tab-content';
  main.appendChild(tabContent);

  var tabPanels = {};
  TAB_IDS.forEach(function(id) {
    var panel = document.createElement('div');
    panel.className = 'eap-tab-panel' + (id === initialTab ? ' eap-tab-panel--active' : '');
    panel.setAttribute('data-tab-panel', id);
    tabContent.appendChild(panel);
    tabPanels[id] = panel;
  });

  var tabInited = {};
  TAB_IDS.forEach(function(id) { tabInited[id] = false; });
  tabInited[initialTab] = true;

  state.activeTab = initialTab;

  // ── Tab switching ────────────────────────────────────────────────
  function switchTab(tabId, eventSummary) {
    if (state.activeTab === tabId && !eventSummary) return;
    state.activeTab = tabId;

    TAB_IDS.forEach(function(id) {
      var isActive = id === tabId;
      navBtns[id].classList.toggle('eap-nav-btn--active', isActive);
      tabPanels[id].classList.toggle('eap-tab-panel--active', isActive);
    });

    if (tabId === 'detail') {
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
    var btn = e.target.closest('.eap-nav-btn');
    if (!btn || btn.classList.contains('eap-nav-btn--disabled')) return;
    var id = btn.getAttribute('data-tab');
    if (id === 'detail' && !state.selectedEventID) return;
    switchTab(id);
  });

  // ══════════════════════════════════════════════════════════════════
  // TAB RENDER FUNCTIONS (unchanged from original)
  // ══════════════════════════════════════════════════════════════════

  var monthlyPanel = tabPanels.monthly;

  var monthlyLoading = document.createElement('div');
  monthlyLoading.style.cssText = 'text-align:center;padding:100px 20px;color:#6c757d;';
  monthlyLoading.innerHTML = '<div class="edb-spinner" style="width:36px;height:36px;margin:0 auto 14px;"></div><div style="font-size:14px;font-weight:600;">Loading event cost data…</div>';
  monthlyPanel.appendChild(monthlyLoading);

  function renderMonthlyTab(eventSummaries) {
    monthlyPanel.innerHTML = '';
    monthlyOverview.render(monthlyPanel, eventSummaries, function(ev) {
      state.selectedEventID = ev.eventID;
      state.detailReturnTab = 'monthly';
      // Unlock detail nav button
      navBtns.detail.classList.remove('eap-nav-btn--disabled');
      switchTab('detail', ev);
    });
  }

  function renderReconciliationTab() {
    var results = state.eventCostResults || [];
    utilReconciliation.render(tabPanels.reconciliation, results);
  }

  function renderDetailTab(eventSummary) {
    var panel = tabPanels.detail;
    panel.innerHTML = '';

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
      function() { switchTab(state.detailReturnTab || 'monthly'); },
      function(concurrentEvent) {
        var matched = (state.eventSummaries || []).find(function(ev) {
          return String(ev.eventID) === String(concurrentEvent.eventID);
        }) || concurrentEvent;
        state.selectedEventID = matched.eventID;
        renderDetailTab(matched);
      }
    );
  }

  if (initialTab === 'detail') renderDetailTab(null);

  function renderSiteStatusTab() {
    siteStatus.render(tabPanels.siteStatus, function() {
      if (selectedSite && startDate && endDate) loadSiteStatusData();
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

  if (initialTab === 'siteStatus') renderSiteStatusTab();
  if (initialTab === 'docs') documentation.renderTab(tabPanels.docs);

  // ══════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════════════

  function loadData() {
    if (!selectedSite) {
      monthlyPanel.innerHTML = '<div style="text-align:center;padding:100px 20px;color:#6c757d;font-size:14px;">Select a site to load event cost data.</div>';
      return;
    }

    monthlyPanel.innerHTML = '';
    monthlyPanel.appendChild(monthlyLoading);

    Promise.all([
      api.loadSiteName(selectedSite),
      api.loadEventCostResults(selectedSite, startDate, endDate)
        .catch(function(err) { console.error('loadEventCostResults:', err); return []; })
    ]).then(function(results) {
      var siteName    = results[0];
      var rawResults  = results[1];

      state.siteName         = siteName;
      state.eventCostResults = rawResults;

      var eventSummaries = api.aggregateEventSummaries(rawResults);
      state.eventSummaries = eventSummaries;

      // Chart event objects for Site Status
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

      // Update sidebar site name + title bar
      navLogoSite.textContent = siteName;
      titleSite.textContent = 'Event Utility Cost Tracking — ' + siteName;

      renderMonthlyTab(eventSummaries);

      if (tabInited.reconciliation) renderReconciliationTab();

      if (tabInited.siteStatus && state._siteStatus_refreshUtility) {
        state.utilityData = {};
        loadSiteStatusData();
      }

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

  // ── SkySpark variable polling (external date/site changes) ─────────
  skyspark.startPolling(view, { selectedSite: selectedSite, startDate: startDate, endDate: endDate },
    function(newSite, newStart, newEnd) {
      selectedSite = newSite;
      startDate    = newStart;
      endDate      = newEnd;
      state._selectedSite = newSite;
      state._startDate    = newStart;
      state._endDate      = newEnd;

      state.eventCostResults = null;
      state.eventSummaries   = null;
      state.utilityData      = {};

      loadData();
    }
  );
};
