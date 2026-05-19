/**
 * App.js — Root Application for Event Cost V2
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ Event Utility Cost Tracking — Site    [Site ▼] [< Period >] │  ← header
 *   ├──────────────┬──────────────────────────────────────────────┤
 *   │ sidebar nav  │  tab content                                  │
 *   └──────────────┴──────────────────────────────────────────────┘
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
  var dpFactory          = window.EventCostV2.datePicker;

  view.removeAll();

  // ── Full-screen: expand html/body to fill the SkySpark frame ──────
  try {
    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
  } catch(e) {}

  // ── Read SkySpark variables ──────────────────────────────────────
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

  var darkMode        = localStorage.getItem('eap-v2-dark') === '1';
  var sidebarCollapsed = state.sidebarCollapsed || false;

  // ══════════════════════════════════════════════════════════════════
  // PAGE SHELL
  // ══════════════════════════════════════════════════════════════════

  var root = document.createElement('div');
  root.className = 'eap-root' + (darkMode ? ' eap-root--dark' : '');
  elem.appendChild(root);

  // ── Header bar ──────────────────────────────────────────────────
  var header = document.createElement('div');
  header.className = 'eap-header';
  root.appendChild(header);

  // Back button — top-left, visible only on header hover
  var backBtn = document.createElement('button');
  backBtn.className = 'eap-back-btn';
  backBtn.title = 'Back to home';
  backBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg> Home';
  backBtn.addEventListener('click', function() {
    // Navigate to the SkySpark project home
    var proj = state.projectName || '';
    window.location.href = proj ? '/proj/' + proj : '/';
  });
  header.appendChild(backBtn);

  // Left: title
  var headerLeft = document.createElement('div');
  headerLeft.className = 'eap-header-left';
  var titleSite = document.createElement('span');
  titleSite.className = 'eap-header-title';
  titleSite.textContent = 'Event Utility Cost Tracking';
  headerLeft.appendChild(titleSite);
  header.appendChild(headerLeft);

  // Right: site selector + date picker
  var headerRight = document.createElement('div');
  headerRight.className = 'eap-header-right';

  // Site selector — populated from SkySpark after mount
  var siteSelect = document.createElement('select');
  siteSelect.className = 'eap-site-select';
  var placeholderOpt = document.createElement('option');
  placeholderOpt.value = '';
  placeholderOpt.textContent = 'Loading sites…';
  siteSelect.appendChild(placeholderOpt);
  siteSelect.disabled = true;
  headerRight.appendChild(siteSelect);

  // Date picker
  var dpContainer = document.createElement('div');
  dpContainer.className = 'eap-dp-container';
  headerRight.appendChild(dpContainer);
  header.appendChild(headerRight);

  var datePicker = dpFactory.create({
    container: dpContainer,
    startDate: startDate,
    endDate:   endDate,
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

  startDate = datePicker.getStartDate();
  endDate   = datePicker.getEndDate();
  state._startDate = startDate;
  state._endDate   = endDate;

  // ── Body: sidebar nav + content ─────────────────────────────────
  var TAB_IDS    = ['monthly', 'reconciliation', 'detail', 'siteStatus', 'docs'];
  var TAB_LABELS = ['Monthly Overview', 'Utility Reconciliation', 'Event Detail', 'Site Status', 'Documentation'];
  var TAB_ICONS  = [
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="13" height="11.5" rx="1.5"/><path d="M1.5 7h13M5 1.5V4M11 1.5V4"/></svg>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h12M10.5 2.5 13 5l-2.5 2.5M14 11H2M5.5 8.5 3 11l2.5 2.5"/></svg>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="1.5" width="11" height="13" rx="1.5"/><path d="M5 5.5h6M5 8.5h6M5 11.5h3.5"/></svg>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12.5 5 7.5l3.5 2.5 3-5.5 3 3"/><path d="M1.5 12.5h13"/></svg>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5A6.5 6.5 0 1 1 8 14.5A6.5 6.5 0 0 1 8 1.5z"/><path d="M8 5.5v3l2 1.5"/></svg>'
  ];

  var initialTab = state.activeTab || 'monthly';
  if (initialTab === 'detail' && !state.selectedEventID) initialTab = 'monthly';

  var body = document.createElement('div');
  body.className = 'eap-body';
  root.appendChild(body);

  // Sidebar
  var sidebar = document.createElement('nav');
  sidebar.className = 'eap-sidebar' + (sidebarCollapsed ? ' eap-sidebar--collapsed' : '');

  var navList = document.createElement('div');
  navList.className = 'eap-sidebar-nav';

  var tabBtns = {};
  TAB_IDS.forEach(function(id, i) {
    var btn = document.createElement('button');
    btn.className = 'eap-tab-btn' +
      (id === initialTab ? ' eap-tab-btn--active' : '') +
      (id === 'detail' && !state.selectedEventID ? ' eap-tab-btn--disabled' : '');
    btn.setAttribute('data-tab', id);
    btn.title = TAB_LABELS[i];

    var iconEl = document.createElement('span');
    iconEl.className = 'eap-tab-btn-icon';
    iconEl.innerHTML = TAB_ICONS[i];

    var labelEl = document.createElement('span');
    labelEl.className = 'eap-tab-btn-label';
    labelEl.textContent = TAB_LABELS[i];

    btn.appendChild(iconEl);
    btn.appendChild(labelEl);
    navList.appendChild(btn);
    tabBtns[id] = btn;
  });

  sidebar.appendChild(navList);

  // Sidebar footer: dark mode + collapse
  var sidebarFooter = document.createElement('div');
  sidebarFooter.className = 'eap-sidebar-footer';

  var darkBtn = document.createElement('button');
  darkBtn.className = 'eap-sidebar-icon-btn';
  darkBtn.title = darkMode ? 'Switch to light mode' : 'Switch to dark mode';
  function setDarkIcon() {
    darkBtn.innerHTML = darkMode
      ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.2 3.2l1 1M11.8 11.8l1 1M12.8 3.2l-1 1M4.2 11.8l-1 1"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13.5 10A5.5 5.5 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z"/></svg>';
  }
  setDarkIcon();
  darkBtn.addEventListener('click', function() {
    darkMode = !darkMode;
    localStorage.setItem('eap-v2-dark', darkMode ? '1' : '0');
    root.classList.toggle('eap-root--dark', darkMode);
    darkBtn.title = darkMode ? 'Switch to light mode' : 'Switch to dark mode';
    setDarkIcon();
  });

  var collapseBtn = document.createElement('button');
  collapseBtn.className = 'eap-sidebar-icon-btn';
  function updateCollapseIcon() {
    collapseBtn.title = sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    collapseBtn.innerHTML = sidebarCollapsed
      ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>';
  }
  updateCollapseIcon();
  collapseBtn.addEventListener('click', function() {
    sidebarCollapsed = !sidebarCollapsed;
    state.sidebarCollapsed = sidebarCollapsed;
    sidebar.classList.toggle('eap-sidebar--collapsed', sidebarCollapsed);
    updateCollapseIcon();
  });

  sidebarFooter.appendChild(darkBtn);
  sidebarFooter.appendChild(collapseBtn);
  sidebar.appendChild(sidebarFooter);
  body.appendChild(sidebar);

  // ── Tab content ──────────────────────────────────────────────────
  var tabContent = document.createElement('div');
  tabContent.className = 'eap-tab-content';
  body.appendChild(tabContent);

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

  // ── Tab switching ──────────────────────────────────────────────
  function switchTab(tabId, eventSummary) {
    if (state.activeTab === tabId && !eventSummary) return;
    state.activeTab = tabId;

    TAB_IDS.forEach(function(id) {
      var isActive = id === tabId;
      tabBtns[id].classList.toggle('eap-tab-btn--active', isActive);
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

  sidebar.addEventListener('click', function(e) {
    var btn = e.target.closest('.eap-tab-btn');
    if (!btn || btn.classList.contains('eap-tab-btn--disabled')) return;
    var id = btn.getAttribute('data-tab');
    if (id === 'detail' && !state.selectedEventID) return;
    switchTab(id);
  });

  // ══════════════════════════════════════════════════════════════════
  // TAB RENDERS
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
      tabBtns.detail.classList.remove('eap-tab-btn--disabled');
      switchTab('detail', ev);
    });
  }

  function renderReconciliationTab() {
    utilReconciliation.render(tabPanels.reconciliation, state.eventCostResults || []);
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
      panel.innerHTML = '<div style="text-align:center;padding:80px 20px;color:#6c757d;font-size:14px;">Select an event from the Monthly Overview tab to view details.</div>';
      return;
    }

    eventDetailV2.render(
      panel, eventSummary, state.eventCostResults || [],
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
      var siteName   = results[0];
      var rawResults = results[1];

      state.siteName         = siteName;
      state.eventCostResults = rawResults;

      var eventSummaries = api.aggregateEventSummaries(rawResults);
      state.eventSummaries = eventSummaries;

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
          startTime:   start, endTime: end, time: start,
          color:       chartColors[i % chartColors.length],
          cost:        ev.totalCost, duration: durationStr,
          area:        ev.eventSF ? Math.round(ev.eventSF).toLocaleString() + ' sq ft' : null,
          costDisplay: ev.totalCost ? '$' + Math.round(ev.totalCost).toLocaleString() : null,
          rawData:     ev
        };
      }).filter(function(e) { return e.startTime && !isNaN(e.startTime.getTime()); });

      state.currentDateRange = { startDate: startDate, endDate: endDate };
      state.visibilityState  = {};
      state.currentEvents.forEach(function(_, i) { state.visibilityState[i] = false; });

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
      monthlyPanel.innerHTML = '<div style="text-align:center;padding:80px;color:#dc3545;font-size:14px;">Failed to load data. Check console for details.</div>';
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // SITE SELECTOR — load from SkySpark
  // ══════════════════════════════════════════════════════════════════

  function loadSites() {
    window.EventCostV2.evalAxon('readAll(site).sortDis').then(function(grid) {
      var rows = grid && grid.rows;
      if (!rows || !rows.length) {
        siteSelect.innerHTML = '<option value="">— No sites found —</option>';
        return;
      }

      siteSelect.innerHTML = '';

      // Blank placeholder
      var ph = document.createElement('option');
      ph.value = '';
      ph.textContent = '— Select site —';
      siteSelect.appendChild(ph);

      rows.forEach(function(row) {
        // Ref arrives as {_kind:"Ref", val:"p:proj:r:hex"} or plain string
        var ref = row.id;
        var refVal = (ref && typeof ref === 'object') ? (ref.val || ref.id || '') : (ref || '');
        var dis = row.dis || refVal;

        var opt = document.createElement('option');
        opt.value = refVal;
        opt.textContent = dis;
        if (refVal === selectedSite) opt.selected = true;
        siteSelect.appendChild(opt);
      });

      siteSelect.disabled = false;

      siteSelect.addEventListener('change', function() {
        var newSite = siteSelect.value;
        if (!newSite || newSite === selectedSite) return;
        selectedSite = newSite;
        state._selectedSite = newSite;
        state.eventCostResults = null;
        state.eventSummaries   = null;
        state.utilityData      = {};
        loadData();
      });

    }).catch(function(err) {
      console.warn('loadSites failed:', err);
      siteSelect.innerHTML = '<option value="">— Site load failed —</option>';
    });
  }

  loadSites();
  loadData();

  // ── SkySpark polling ─────────────────────────────────────────────
  skyspark.startPolling(view,
    { selectedSite: selectedSite, startDate: startDate, endDate: endDate },
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
      // Sync the site select if SkySpark changed it externally
      if (newSite) {
        for (var i = 0; i < siteSelect.options.length; i++) {
          if (siteSelect.options[i].value === newSite) {
            siteSelect.selectedIndex = i;
            break;
          }
        }
      }
      loadData();
    }
  );
};


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

  // ── Read SkySpark variables ──────────────────────────────────────
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

  // ── Header bar ──────────────────────────────────────────────────
  var header = document.createElement('div');
  header.className = 'eap-header';
  root.appendChild(header);

  // Left: title
  var headerLeft = document.createElement('div');
  headerLeft.className = 'eap-header-left';

  var titleSite = document.createElement('span');
  titleSite.className = 'eap-header-title';
  titleSite.textContent = 'Event Utility Cost Tracking';

  headerLeft.appendChild(titleSite);
  header.appendChild(headerLeft);

  // Right: site selector + date picker
  var headerRight = document.createElement('div');
  headerRight.className = 'eap-header-right';

  // Site selector
  var siteSelect = document.createElement('select');
  siteSelect.className = 'eap-site-select';
  var siteOpt = document.createElement('option');
  siteOpt.value = selectedSite || '';
  siteOpt.textContent = selectedSite ? selectedSite : '— Select site —';
  siteSelect.appendChild(siteOpt);
  siteSelect.disabled = true;
  headerRight.appendChild(siteSelect);

  // Date picker
  var dpContainer = document.createElement('div');
  dpContainer.className = 'eap-dp-container';
  headerRight.appendChild(dpContainer);

  header.appendChild(headerRight);

  var datePicker = dpFactory.create({
    container: dpContainer,
    startDate: startDate,
    endDate:   endDate,
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

  // Resolve the picker's initial dates (e.g. "Past Week")
  startDate = datePicker.getStartDate();
  endDate   = datePicker.getEndDate();
  state._startDate = startDate;
  state._endDate   = endDate;

  // ── Body: sidebar nav + content ─────────────────────────────────
  var TAB_IDS    = ['monthly', 'reconciliation', 'detail', 'siteStatus', 'docs'];
  var TAB_LABELS = ['Monthly Overview', 'Utility Reconciliation', 'Event Detail', 'Site Status', 'Documentation'];
  var TAB_ICONS  = [
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="13" height="11.5" rx="1.5"/><path d="M1.5 7h13M5 1.5V4M11 1.5V4"/></svg>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h12M10.5 2.5 13 5l-2.5 2.5M14 11H2M5.5 8.5 3 11l2.5 2.5"/></svg>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="1.5" width="11" height="13" rx="1.5"/><path d="M5 5.5h6M5 8.5h6M5 11.5h3.5"/></svg>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12.5 5 7.5l3.5 2.5 3-5.5 3 3"/><path d="M1.5 12.5h13"/></svg>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5A6.5 6.5 0 1 1 8 14.5A6.5 6.5 0 0 1 8 1.5z"/><path d="M8 5.5v3l2 1.5"/></svg>'
  ];

  var initialTab = state.activeTab || 'monthly';
  if (initialTab === 'detail' && !state.selectedEventID) initialTab = 'monthly';

  var darkMode = localStorage.getItem('eap-v2-dark') === '1';
  if (darkMode) root.classList.add('eap-root--dark');

  var sidebarCollapsed = state.sidebarCollapsed || false;

  var body = document.createElement('div');
  body.className = 'eap-body';
  root.appendChild(body);

  // Sidebar
  var sidebar = document.createElement('nav');
  sidebar.className = 'eap-sidebar' + (sidebarCollapsed ? ' eap-sidebar--collapsed' : '');

  // Nav items
  var navList = document.createElement('div');
  navList.className = 'eap-sidebar-nav';

  var tabBtns = {};
  TAB_IDS.forEach(function(id, i) {
    var btn = document.createElement('button');
    btn.className = 'eap-tab-btn' +
      (id === initialTab ? ' eap-tab-btn--active' : '') +
      (id === 'detail' && !state.selectedEventID ? ' eap-tab-btn--disabled' : '');
    btn.setAttribute('data-tab', id);
    btn.title = TAB_LABELS[i];

    var iconEl = document.createElement('span');
    iconEl.className = 'eap-tab-btn-icon';
    iconEl.innerHTML = TAB_ICONS[i];

    var labelEl = document.createElement('span');
    labelEl.className = 'eap-tab-btn-label';
    labelEl.textContent = TAB_LABELS[i];

    btn.appendChild(iconEl);
    btn.appendChild(labelEl);
    navList.appendChild(btn);
    tabBtns[id] = btn;
  });

  sidebar.appendChild(navList);

  // Sidebar footer: dark mode + collapse
  var sidebarFooter = document.createElement('div');
  sidebarFooter.className = 'eap-sidebar-footer';

  var darkBtn = document.createElement('button');
  darkBtn.className = 'eap-sidebar-icon-btn';
  darkBtn.title = darkMode ? 'Switch to light mode' : 'Switch to dark mode';
  darkBtn.innerHTML = darkMode
    ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.2 3.2l1 1M11.8 11.8l1 1M12.8 3.2l-1 1M4.2 11.8l-1 1"/></svg>'
    : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13.5 10A5.5 5.5 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z"/></svg>';

  darkBtn.addEventListener('click', function() {
    darkMode = !darkMode;
    localStorage.setItem('eap-v2-dark', darkMode ? '1' : '0');
    root.classList.toggle('eap-root--dark', darkMode);
    darkBtn.title = darkMode ? 'Switch to light mode' : 'Switch to dark mode';
    darkBtn.innerHTML = darkMode
      ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.2 3.2l1 1M11.8 11.8l1 1M12.8 3.2l-1 1M4.2 11.8l-1 1"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13.5 10A5.5 5.5 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z"/></svg>';
  });

  var collapseBtn = document.createElement('button');
  collapseBtn.className = 'eap-sidebar-icon-btn';
  collapseBtn.title = sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
  function updateCollapseIcon() {
    collapseBtn.innerHTML = sidebarCollapsed
      ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>';
  }
  updateCollapseIcon();

  collapseBtn.addEventListener('click', function() {
    sidebarCollapsed = !sidebarCollapsed;
    state.sidebarCollapsed = sidebarCollapsed;
    sidebar.classList.toggle('eap-sidebar--collapsed', sidebarCollapsed);
    collapseBtn.title = sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    updateCollapseIcon();
  });

  sidebarFooter.appendChild(darkBtn);
  sidebarFooter.appendChild(collapseBtn);
  sidebar.appendChild(sidebarFooter);

  body.appendChild(sidebar);

  // ── Tab content ──────────────────────────────────────────────────
  var tabContent = document.createElement('div');
  tabContent.className = 'eap-tab-content';
  body.appendChild(tabContent);

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

  // ── Tab switching ──────────────────────────────────────────────
  function switchTab(tabId, eventSummary) {
    if (state.activeTab === tabId && !eventSummary) return;
    state.activeTab = tabId;

    TAB_IDS.forEach(function(id) {
      var isActive = id === tabId;
      tabBtns[id].classList.toggle('eap-tab-btn--active', isActive);
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

  sidebar.addEventListener('click', function(e) {
    var btn = e.target.closest('.eap-tab-btn');
    if (!btn || btn.classList.contains('eap-tab-btn--disabled')) return;
    var id = btn.getAttribute('data-tab');
    if (id === 'detail' && !state.selectedEventID) return;
    switchTab(id);
  });

  // ══════════════════════════════════════════════════════════════════
  // TAB RENDERS
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
      tabBtns.detail.classList.remove('eap-tab-btn--disabled');
      switchTab('detail', ev);
    });
  }

  function renderReconciliationTab() {
    utilReconciliation.render(tabPanels.reconciliation, state.eventCostResults || []);
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
      panel.innerHTML = '<div style="text-align:center;padding:80px 20px;color:#6c757d;font-size:14px;">Select an event from the Monthly Overview tab to view details.</div>';
      return;
    }

    eventDetailV2.render(
      panel, eventSummary, state.eventCostResults || [],
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
      var siteName   = results[0];
      var rawResults = results[1];

      state.siteName         = siteName;
      state.eventCostResults = rawResults;

      var eventSummaries = api.aggregateEventSummaries(rawResults);
      state.eventSummaries = eventSummaries;

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
          startTime:   start, endTime: end, time: start,
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
      monthlyPanel.innerHTML = '<div style="text-align:center;padding:80px;color:#dc3545;font-size:14px;">Failed to load data. Check console for details.</div>';
    });
  }

  loadData();

  // ── SkySpark polling ─────────────────────────────────────────────
  skyspark.startPolling(view,
    { selectedSite: selectedSite, startDate: startDate, endDate: endDate },
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
