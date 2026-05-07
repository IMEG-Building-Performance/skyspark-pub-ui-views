/**
 * App.js - Root Application
 *
 * Tabbed interface: Summary | Event Lookup | Event Database | Documentation
 * Page shell matches MBCx Dashboard styling with IMEG blue title bar.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};

window.EventAnnotationsPlot.onUpdate = function(arg) {
  var view = arg.view;
  var elem = arg.elem;

  var state = window.EventAnnotationsPlot.state;
  var loader = window.EventAnnotationsPlot.loader;
  var api = window.EventAnnotationsPlot.api;
  var chart = window.EventAnnotationsPlot.chart;
  var annotations = window.EventAnnotationsPlot.annotations;
  var timeline = window.EventAnnotationsPlot.timeline;
  var interactions = window.EventAnnotationsPlot.interactions;
  var transformers = window.EventAnnotationsPlot.transformers;
  var widgets = window.EventAnnotationsPlot.widgets;
  var eventDetail = window.EventAnnotationsPlot.eventDetail;
  var eventsDatabase = window.EventAnnotationsPlot.eventsDatabase;
  var documentation = window.EventAnnotationsPlot.documentation;
  var skyspark = window.EventAnnotationsPlot.skyspark;

  // ── Clear existing content ───────────────────────────────────────────
  view.removeAll();

  // ── Read SkySpark variables ──────────────────────────────────────────
  var vars = skyspark.readVariables(arg, view);
  var selectedSite = vars.selectedSite;
  var startDate = vars.startDate;
  var endDate = vars.endDate;

  state.attestKey = vars.attestKey;
  state.projectName = vars.projectName;
  state._selectedSite = selectedSite;
  state._startDate = startDate;
  state._endDate = endDate;

  // ── Compute responsive scaling ───────────────────────────────────────
  window.EventAnnotationsPlot.computeScaling();
  var rs = state.responsiveScaling;

  // ══════════════════════════════════════════════════════════════════════
  // ── PAGE SHELL
  // ══════════════════════════════════════════════════════════════════════

  var root = document.createElement('div');
  root.className = 'eap-root';
  elem.appendChild(root);

  // ── Title Bar (IMEG blue, contains tabs) ──────────────────────────────
  var titleBar = document.createElement('div');
  titleBar.className = 'eap-title-bar';
  root.appendChild(titleBar);

  var titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex;align-items:baseline;gap:20px;';
  titleBar.appendChild(titleRow);

  var titleSite = document.createElement('span');
  titleSite.className = 'eap-title-site';
  titleSite.textContent = 'Event Utility Cost Tracking';
  titleRow.appendChild(titleSite);

  var titleDates = document.createElement('span');
  titleDates.className = 'eap-title-dates';
  if (startDate && endDate) {
    titleDates.textContent = startDate + ' – ' + endDate;
  }
  titleRow.appendChild(titleDates);

  // Tab bar inside title bar
  var tabBar = document.createElement('div');
  tabBar.className = 'eap-tab-bar';
  titleBar.appendChild(tabBar);

  var TAB_IDS = ['summary', 'lookup', 'database', 'docs'];
  var TAB_LABELS = ['Summary', 'Event Lookup', 'Event Database', 'Documentation'];
  var tabBtns = {};
  var tabPanels = {};
  var initialTab = state.activeTab || 'summary';

  TAB_IDS.forEach(function(id, i) {
    var btn = document.createElement('button');
    btn.className = 'eap-tab-btn' + (id === initialTab ? ' eap-tab-btn--active' : '');
    btn.textContent = TAB_LABELS[i];
    btn.setAttribute('data-tab', id);
    tabBar.appendChild(btn);
    tabBtns[id] = btn;
  });

  // ── Tab Content ──────────────────────────────────────────────────────
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

  // ── Tab Switching ────────────────────────────────────────────────────
  state.activeTab = initialTab;
  var tabInited = { summary: true, lookup: true, database: false, docs: false };

  function switchTab(tabId) {
    if (state.activeTab === tabId) return;
    state.activeTab = tabId;

    TAB_IDS.forEach(function(id) {
      var isActive = id === tabId;
      tabBtns[id].className = 'eap-tab-btn' + (isActive ? ' eap-tab-btn--active' : '');
      tabPanels[id].className = 'eap-tab-panel' + (isActive ? ' eap-tab-panel--active' : '');
    });

    if (tabId === 'database' && !tabInited.database) {
      tabInited.database = true;
      if (eventsDatabase) eventsDatabase.renderTab(tabPanels.database, state);
    }

    if (tabId === 'docs' && !tabInited.docs) {
      tabInited.docs = true;
      if (documentation) documentation.renderTab(tabPanels.docs);
    }

    if (tabId === 'lookup') {
      setTimeout(function() {
        if (state.chartInstance) {
          state.chartInstance.resize();
          if (state._syncOverlaySize) state._syncOverlaySize();
          var currentEvents = state.currentEvents || [];
          if (state._resizeTimelineForEvents) state._resizeTimelineForEvents(currentEvents);
          annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, currentEvents);
          timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, currentEvents);
        }
      }, 50);
    }
  }

  tabBar.addEventListener('click', function(e) {
    var btn = e.target.closest('.eap-tab-btn');
    if (btn) switchTab(btn.getAttribute('data-tab'));
  });

  // Lazy-init persisted tabs on restore
  if (initialTab === 'database') {
    tabInited.database = true;
    if (eventsDatabase) eventsDatabase.renderTab(tabPanels.database, state);
  } else if (initialTab === 'docs') {
    tabInited.docs = true;
    if (documentation) documentation.renderTab(tabPanels.docs);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── TAB 1: SUMMARY
  // ══════════════════════════════════════════════════════════════════════

  var summaryPanel = tabPanels.summary;
  summaryPanel.style.padding = '24px 28px';

  // Summary list view (cards + table)
  var summaryListView = document.createElement('div');
  summaryPanel.appendChild(summaryListView);

  // Summary detail view (hidden until event clicked)
  var summaryDetailView = document.createElement('div');
  summaryDetailView.style.display = 'none';
  summaryPanel.appendChild(summaryDetailView);

  var summaryLoading = document.createElement('div');
  summaryLoading.style.cssText = 'text-align:center;padding:80px 20px;color:#6c757d;';
  summaryLoading.innerHTML = '<div class="edb-spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div><div style="font-size:14px;font-weight:600;">Loading summary data…</div>';
  summaryListView.appendChild(summaryLoading);

  var summaryCards = document.createElement('div');
  summaryCards.className = 'eap-summary-cards';
  summaryCards.style.display = 'none';
  summaryListView.appendChild(summaryCards);

  function createSummaryCard(label, value) {
    var card = document.createElement('div');
    card.className = 'eap-summary-card';
    var lbl = document.createElement('div');
    lbl.className = 'eap-summary-card-label';
    lbl.textContent = label;
    card.appendChild(lbl);
    var val = document.createElement('div');
    val.className = 'eap-summary-card-value';
    val.textContent = value;
    card.appendChild(val);
    summaryCards.appendChild(card);
    return val;
  }

  var summaryTotalCostVal = createSummaryCard('Total Event Cost', '—');
  var summaryUtilityCostVal = createSummaryCard('Utility Cost', '—');
  var summaryEventCountVal = createSummaryCard('Events Tracked', '—');

  var summaryTableSection = document.createElement('div');
  summaryTableSection.className = 'eap-summary-table-section';
  summaryTableSection.style.display = 'none';
  summaryListView.appendChild(summaryTableSection);

  var summaryTableTitle = document.createElement('h3');
  summaryTableTitle.className = 'eap-summary-table-title';
  summaryTableTitle.textContent = 'Event Summary';
  summaryTableSection.appendChild(summaryTableTitle);

  var summaryTableWrap = document.createElement('div');
  summaryTableSection.appendChild(summaryTableWrap);

  function showEventDetail(evt) {
    summaryListView.style.display = 'none';
    summaryDetailView.style.display = '';
    summaryDetailView.innerHTML = '';

    var detailModule = window.EventAnnotationsPlot.eventDetail;
    var colors = state.detailColors;
    var formatCurrency = detailModule.formatCurrency;
    var formatCents = detailModule.formatCurrencyCents;
    var raw = evt;
    var totalCost = parseFloat(raw.totalCost) || 0;

    // Back button
    var backBtn = document.createElement('button');
    backBtn.innerHTML = '← Back to Summary';
    backBtn.style.cssText = 'padding:10px 20px;border:1px solid #dee2e6;border-radius:6px;background:white;color:#495057;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;margin-bottom:20px;';
    backBtn.onmouseover = function() { backBtn.style.background = '#e8f4fd'; backBtn.style.borderColor = '#4A6FA5'; backBtn.style.color = '#4A6FA5'; };
    backBtn.onmouseout = function() { backBtn.style.background = 'white'; backBtn.style.borderColor = '#dee2e6'; backBtn.style.color = '#495057'; };
    backBtn.onclick = function() {
      summaryDetailView.style.display = 'none';
      summaryListView.style.display = '';
    };
    summaryDetailView.appendChild(backBtn);

    // Event header card
    var headerCard = document.createElement('div');
    headerCard.className = 'eap-summary-table-section';
    headerCard.style.textAlign = 'center';
    headerCard.style.marginBottom = '20px';

    var evtName = document.createElement('div');
    evtName.textContent = raw.event || 'Unnamed Event';
    evtName.style.cssText = 'font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#6c757d;margin-bottom:8px;';
    headerCard.appendChild(evtName);

    var evtTotal = document.createElement('div');
    evtTotal.textContent = formatCurrency(totalCost);
    evtTotal.style.cssText = 'font-size:48px;font-weight:900;color:#17a2b8;line-height:1;margin-bottom:6px;';
    headerCard.appendChild(evtTotal);

    var evtLabel = document.createElement('div');
    evtLabel.textContent = 'Total Event Utility Cost';
    evtLabel.style.cssText = 'font-size:14px;color:#6c757d;margin-bottom:16px;';
    headerCard.appendChild(evtLabel);

    // Event metadata
    var metaGrid = document.createElement('div');
    metaGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;text-align:center;';

    function addMeta(label, value) {
      var item = document.createElement('div');
      item.style.cssText = 'padding:10px;background:#f8f9fa;border-radius:8px;';
      var l = document.createElement('div');
      l.textContent = label;
      l.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#6c757d;margin-bottom:2px;';
      var v = document.createElement('div');
      v.textContent = value;
      v.style.cssText = 'font-size:14px;font-weight:600;color:#2c3e50;';
      item.appendChild(l);
      item.appendChild(v);
      metaGrid.appendChild(item);
    }

    if (raw.eventID) addMeta('Event ID', raw.eventID);
    if (raw.eventSF) addMeta('Area', parseFloat(raw.eventSF).toLocaleString() + ' sq ft');
    if (raw.eventStart) addMeta('Start', new Date(raw.eventStart).toLocaleDateString());
    if (raw.eventEnd) addMeta('End', new Date(raw.eventEnd).toLocaleDateString());

    headerCard.appendChild(metaGrid);
    summaryDetailView.appendChild(headerCard);

    // Utility cost breakdown
    var utilities = [
      { name: 'Electric', color: colors.electric, energyCost: parseFloat(raw.elec_energyCost) || 0, demandCost: parseFloat(raw.elec_demandCost) || 0 },
      { name: 'Chilled Water', color: colors.chw, energyCost: parseFloat(raw.chw_energyCost) || 0, demandCost: parseFloat(raw.chw_demandCost) || 0 },
      { name: 'Steam', color: colors.steam, energyCost: parseFloat(raw.steam_energyCost) || 0, demandCost: parseFloat(raw.steam_demandCost) || 0 },
      { name: 'Gas', color: colors.gas, energyCost: parseFloat(raw.gas_energyCost) || 0, demandCost: parseFloat(raw.gas_demandCost) || 0 }
    ];

    utilities.forEach(function(u) {
      u.total = u.energyCost + u.demandCost;
      u.percent = totalCost > 0 ? Math.round((u.total / totalCost) * 100) : 0;
    });

    var activeUtils = utilities.filter(function(u) { return u.total > 0; })
      .sort(function(a, b) { return b.total - a.total; });

    if (activeUtils.length > 0) {
      var breakdownSection = document.createElement('div');
      breakdownSection.className = 'eap-summary-table-section';

      var breakdownTitle = document.createElement('h3');
      breakdownTitle.className = 'eap-summary-table-title';
      breakdownTitle.textContent = 'Utility Cost Breakdown';
      breakdownSection.appendChild(breakdownTitle);

      var breakdownGrid = document.createElement('div');
      breakdownGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;';

      activeUtils.forEach(function(util) {
        var card = document.createElement('div');
        card.style.cssText = 'background:#f8f9fa;border-radius:10px;padding:18px 20px;border-left:4px solid ' + util.color + ';';

        var cName = document.createElement('div');
        cName.textContent = util.name;
        cName.style.cssText = 'font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6c757d;margin-bottom:6px;';
        card.appendChild(cName);

        var cTotal = document.createElement('div');
        cTotal.textContent = formatCurrency(util.total);
        cTotal.style.cssText = 'font-size:24px;font-weight:700;color:#2c3e50;margin-bottom:4px;';
        card.appendChild(cTotal);

        var cPct = document.createElement('div');
        cPct.textContent = util.percent + '% of total';
        cPct.style.cssText = 'font-size:12px;color:#6c757d;margin-bottom:12px;';
        card.appendChild(cPct);

        var rows = [
          { label: 'Energy Cost', value: formatCents(util.energyCost) },
          { label: 'Demand Cost', value: formatCents(util.demandCost) }
        ];
        rows.forEach(function(r) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;font-size:13px;padding:3px 0;';
          var rl = document.createElement('span');
          rl.textContent = r.label;
          rl.style.color = '#6c757d';
          var rv = document.createElement('span');
          rv.textContent = r.value;
          rv.style.fontWeight = '600';
          row.appendChild(rl);
          row.appendChild(rv);
          card.appendChild(row);
        });

        breakdownGrid.appendChild(card);
      });

      breakdownSection.appendChild(breakdownGrid);
      summaryDetailView.appendChild(breakdownSection);
    }
  }

  function updateSummaryTab(data) {
    summaryLoading.style.display = 'none';
    summaryCards.style.display = '';
    summaryTableSection.style.display = '';
    summaryDetailView.style.display = 'none';
    summaryListView.style.display = '';

    summaryTotalCostVal.textContent = '$' + Math.round(data.totalEventCost).toLocaleString();
    summaryUtilityCostVal.textContent = '$' + Math.round(data.utilityCost).toLocaleString();
    summaryEventCountVal.textContent = String(data.execSummary.events.length);

    var events = data.execSummary.events;
    if (events.length === 0) {
      summaryTableWrap.innerHTML = '<div style="text-align:center;padding:40px;color:#6c757d;">No events found for this date range.</div>';
      return;
    }

    summaryTableWrap.innerHTML = '';
    var table = document.createElement('table');
    table.className = 'eap-summary-table';

    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Event</th><th>Start</th><th>End</th><th>Sq Ft</th><th>Total Cost</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    events.forEach(function(evt) {
      var tr = document.createElement('tr');
      tr.style.cursor = 'pointer';

      var startStr = evt.eventStart ? new Date(evt.eventStart).toLocaleDateString() : '—';
      var endStr = evt.eventEnd ? new Date(evt.eventEnd).toLocaleDateString() : '—';
      var sfStr = evt.eventSF ? parseFloat(evt.eventSF).toLocaleString() : '—';
      var costVal = parseFloat(evt.totalCost) || 0;
      var costStr = '$' + costVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

      tr.innerHTML = '<td>' + (evt.event || 'Unnamed') + '</td><td>' + startStr + '</td><td>' + endStr + '</td><td>' + sfStr + '</td><td>' + costStr + '</td>';
      tr.onclick = function() { showEventDetail(evt); };
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    summaryTableWrap.appendChild(table);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── TAB 2: EVENT LOOKUP (Chart + Sidebar)
  // ══════════════════════════════════════════════════════════════════════

  var lookupPanel = tabPanels.lookup;
  var lookupPad = Math.round(12 + 8 * rs.vhScale);
  lookupPanel.style.padding = lookupPad + 'px';

  var layoutContainer = document.createElement('div');
  layoutContainer.style.cssText = 'display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;';
  lookupPanel.appendChild(layoutContainer);

  // Chart container
  var chartH = Math.max(400, Math.min(Math.round(window.innerHeight * 0.65), 800));
  var chartPad = Math.round(12 + 8 * rs.vhScale);
  var chartContainer = document.createElement('div');
  chartContainer.style.cssText = 'flex:2;min-width:500px;min-height:400px;height:' + chartH + 'px;box-sizing:border-box;background:white;padding:' + chartPad + 'px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);position:relative;display:flex;flex-direction:column;transition:flex 0.2s ease;';
  layoutContainer.appendChild(chartContainer);

  // Utility toggle
  var utilityToggleBar = interactions.createUtilityToggle(function(utilityName) {
    state.activeUtility = utilityName;
    if (state._refreshUtilityData) state._refreshUtilityData();
  });
  chartContainer.appendChild(utilityToggleBar);

  // Top-right button group (expand only)
  var btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'position:absolute;top:12px;right:12px;z-index:20;display:flex;gap:6px;';
  chartContainer.appendChild(btnGroup);

  var expandBtn = document.createElement('button');
  expandBtn.title = 'Expand chart';
  expandBtn.textContent = '⛶';
  expandBtn.style.cssText = 'width:32px;height:32px;border:1px solid #dee2e6;border-radius:6px;background:white;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:#6c757d;box-shadow:0 1px 3px rgba(0,0,0,0.08);';
  expandBtn.onmouseover = function() { expandBtn.style.backgroundColor = '#e8f4fd'; expandBtn.style.color = '#1565c0'; expandBtn.style.borderColor = '#1565c0'; };
  expandBtn.onmouseout = function() { expandBtn.style.backgroundColor = 'white'; expandBtn.style.color = '#6c757d'; expandBtn.style.borderColor = '#dee2e6'; };
  expandBtn.onclick = function() {
    if (window.EventAnnotationsPlot.expandView) {
      window.EventAnnotationsPlot.expandView.open(state, interactions, annotations, timeline, chart);
    }
  };
  btnGroup.appendChild(expandBtn);

  // Canvas wrapper
  var canvasMinH = Math.round(200 + 100 * rs.vhScale);
  var canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = 'width:100%;flex:1;min-height:' + canvasMinH + 'px;position:relative;';
  chartContainer.appendChild(canvasWrapper);

  var canvas = document.createElement('canvas');
  canvas.id = 'eventAnnotationsChart';
  canvasWrapper.appendChild(canvas);

  // Timeline wrapper
  var timelineMinH = Math.round(60 + 60 * rs.vhScale);
  var timelineMaxH = Math.round(160 + 80 * rs.vhScale);
  var timelineWrapper = document.createElement('div');
  timelineWrapper.style.cssText = 'width:100%;margin-top:4px;flex-shrink:0;';
  chartContainer.appendChild(timelineWrapper);

  var timelineHeader = document.createElement('div');
  timelineHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:2px 4px;cursor:pointer;';
  timelineWrapper.appendChild(timelineHeader);

  var timelineLabel = document.createElement('span');
  timelineLabel.textContent = 'Event Timeline';
  timelineLabel.style.cssText = 'font-size:10px;font-weight:600;color:#adb5bd;text-transform:uppercase;letter-spacing:0.5px;';
  timelineHeader.appendChild(timelineLabel);

  var timelineToggleBtn = document.createElement('button');
  timelineToggleBtn.style.cssText = 'border:none;background:transparent;cursor:pointer;font-size:11px;color:#adb5bd;padding:2px 6px;transition:color 0.2s;';
  timelineToggleBtn.onmouseover = function() { timelineToggleBtn.style.color = '#1565c0'; };
  timelineToggleBtn.onmouseout = function() { timelineToggleBtn.style.color = '#adb5bd'; };
  timelineHeader.appendChild(timelineToggleBtn);

  var timelineContainer = document.createElement('div');
  timelineContainer.style.cssText = 'width:100%;height:' + timelineMinH + 'px;max-height:' + timelineMaxH + 'px;position:relative;overflow-y:auto;overflow-x:hidden;';
  timelineWrapper.appendChild(timelineContainer);

  function applyTimelineToggle() {
    timelineContainer.style.display = state.timelineHidden ? 'none' : 'block';
    timelineToggleBtn.textContent = state.timelineHidden ? 'Show' : 'Hide';
  }
  applyTimelineToggle();

  timelineHeader.onclick = function() {
    state.timelineHidden = !state.timelineHidden;
    applyTimelineToggle();
    setTimeout(function() {
      if (state.chartInstance) state.chartInstance.resize();
      if (state._syncOverlaySize) state._syncOverlaySize();
      var currentEvents = state.currentEvents || [];
      if (state.chartInstance && state.overlayCanvas) {
        annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, currentEvents);
      }
      if (!state.timelineHidden && state.chartInstance && state.timelineCanvas) {
        if (state._resizeTimelineForEvents) state._resizeTimelineForEvents(currentEvents);
        timeline.drawTimeline(state.timelineCanvas, state.chartInstance, currentEvents);
      }
    }, 50);
  };

  // Events sidebar
  var eventsContainer = document.createElement('div');
  eventsContainer.style.cssText = 'flex:1;min-width:280px;max-width:400px;height:' + chartH + 'px;display:flex;flex-direction:column;position:relative;z-index:10;';
  layoutContainer.appendChild(eventsContainer);

  // Sidebar re-show button
  var showSidebarBtn = document.createElement('button');
  showSidebarBtn.title = 'Show event filter panel';
  showSidebarBtn.textContent = 'Event Filter ▶';
  showSidebarBtn.style.cssText = 'position:absolute;top:50%;right:-1px;transform:translateY(-50%);z-index:15;padding:8px 6px;border:1px solid #dee2e6;border-right:none;border-radius:6px 0 0 6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#6c757d;box-shadow:-2px 0 4px rgba(0,0,0,0.08);transition:all 0.2s;writing-mode:vertical-lr;letter-spacing:0.5px;';
  showSidebarBtn.onmouseover = function() { showSidebarBtn.style.backgroundColor = '#e8f4fd'; showSidebarBtn.style.color = '#1565c0'; showSidebarBtn.style.borderColor = '#1565c0'; };
  showSidebarBtn.onmouseout = function() { showSidebarBtn.style.backgroundColor = 'white'; showSidebarBtn.style.color = '#6c757d'; showSidebarBtn.style.borderColor = '#dee2e6'; };
  showSidebarBtn.onclick = function() {
    state.filterSidebarHidden = false;
    eventsContainer.style.display = 'flex';
    showSidebarBtn.style.display = 'none';
    setTimeout(function() {
      if (state.chartInstance) state.chartInstance.resize();
      if (state._syncOverlaySize) state._syncOverlaySize();
      var currentEvents = state.currentEvents || [];
      if (state._resizeTimelineForEvents) state._resizeTimelineForEvents(currentEvents);
      if (state.chartInstance && state.overlayCanvas) {
        annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, currentEvents);
      }
      if (state.chartInstance && state.timelineCanvas) {
        timeline.drawTimeline(state.timelineCanvas, state.chartInstance, currentEvents);
      }
    }, 50);
  };
  chartContainer.appendChild(showSidebarBtn);

  state._showSidebarBtn = showSidebarBtn;

  if (state.filterSidebarHidden) {
    eventsContainer.style.display = 'none';
    showSidebarBtn.style.display = 'block';
  } else {
    showSidebarBtn.style.display = 'none';
  }

  // Loading animation
  var loadingMsg = document.createElement('div');
  loadingMsg.style.cssText = 'text-align:center;padding:40px;color:#666;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);';
  var loadingSpinner = document.createElement('div');
  loadingSpinner.className = 'edb-spinner';
  loadingSpinner.style.cssText += 'width:40px;height:40px;margin:0 auto 16px;';
  loadingMsg.appendChild(loadingSpinner);
  var loadingText = document.createElement('div');
  loadingText.textContent = 'Loading…';
  loadingText.style.cssText = 'font-size:15px;font-weight:600;';
  loadingMsg.appendChild(loadingText);
  chartContainer.appendChild(loadingMsg);

  // ── Load Chart.js and initialize ─────────────────────────────────────
  loader.loadChartJs(function() {
    if (loadingMsg.parentNode) loadingMsg.parentNode.removeChild(loadingMsg);

    // Placeholder
    var placeholderMsg = document.createElement('div');
    placeholderMsg.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#666;font-size:16px;';
    placeholderMsg.innerHTML = '<div style="font-size:48px;margin-bottom:16px;">📊</div><div style="font-weight:600;margin-bottom:8px;">No Data Loaded</div><div>Select a site and date range</div>';
    chartContainer.appendChild(placeholderMsg);
    state.placeholderMsg = placeholderMsg;

    chart.createChart(canvas, [], [], null);

    // Overlay canvas
    var overlayCanvas = document.createElement('canvas');
    overlayCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;cursor:default;pointer-events:auto;';
    canvasWrapper.appendChild(overlayCanvas);
    state.overlayCanvas = overlayCanvas;

    function syncOverlaySize() {
      var c = state.refs && state.refs.canvas ? state.refs.canvas : canvas;
      var o = state.overlayCanvas || overlayCanvas;
      if (o.width !== c.width || o.height !== c.height) {
        o.width = c.width;
        o.height = c.height;
      }
      var rect = c.getBoundingClientRect();
      o.style.width = rect.width + 'px';
      o.style.height = rect.height + 'px';
    }
    state._syncOverlaySize = syncOverlaySize;
    syncOverlaySize();

    // Timeline canvas
    var timelineCanvas = document.createElement('canvas');
    timelineCanvas.style.cssText = 'display:block;cursor:pointer;';
    timelineContainer.appendChild(timelineCanvas);
    state.timelineCanvas = timelineCanvas;

    function updateTimelineSize() {
      var dpr = window.devicePixelRatio || 1;
      var chartCanvas = state.refs && state.refs.canvas ? state.refs.canvas : canvas;
      var bufferWidth = chartCanvas.width;
      var timelineContainerRect = timelineContainer.getBoundingClientRect();
      var cssHeight = Math.round(timelineContainerRect.height) || 56;
      timelineCanvas.width = bufferWidth;
      timelineCanvas.height = cssHeight * dpr;
      var chartRect = chartCanvas.getBoundingClientRect();
      timelineCanvas.style.width = chartRect.width + 'px';
      timelineCanvas.style.height = cssHeight + 'px';
    }
    updateTimelineSize();

    function resizeTimelineForEvents(evts) {
      if (!evts || evts.length === 0) {
        timelineContainer.style.height = timelineMinH + 'px';
        return;
      }
      var laneInfo = timeline.calculateEventLanes(evts);
      var totalLanes = Math.max(laneInfo.totalLanes, 1);
      var sc = (state.responsiveScaling || {}).vhScale || 1.0;
      var laneH = Math.round(20 + 8 * sc);
      var pad = Math.round(4 + 4 * sc);
      var gap = 2;
      var needed = totalLanes * laneH + (totalLanes - 1) * gap + pad * 2;
      var h = Math.max(timelineMinH, Math.min(needed, timelineMaxH));
      timelineContainer.style.height = h + 'px';
      updateTimelineSize();
    }
    state._resizeTimelineForEvents = resizeTimelineForEvents;

    var events = [];
    timeline.drawTimeline(timelineCanvas, state.chartInstance, events);
    annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, events);

    // Resize handler
    window.addEventListener('resize', function() {
      window.EventAnnotationsPlot.computeScaling();
      var newChartH = Math.max(400, Math.min(Math.round(window.innerHeight * 0.65), 800));
      chartContainer.style.height = newChartH + 'px';
      eventsContainer.style.height = newChartH + 'px';
      resizeTimelineForEvents(state.currentEvents || []);
      syncOverlaySize();
      updateTimelineSize();
      var currentEvents = state.currentEvents || [];
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
    });

    // Mouse handlers for overlay
    overlayCanvas.addEventListener('mousemove', function(e) {
      var rect = overlayCanvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var currentEvents = state.currentEvents || [];
      var hoverResult = interactions.detectHover(mouseX, mouseY, currentEvents, state.chartInstance.scales.x, state.chartInstance.chartArea);

      if (hoverResult) {
        state.hoverState.hoveredEvent = hoverResult.event;
        state.hoverState.hoveredIndex = hoverResult.index;
        state.hoverState.mouseX = mouseX;
        state.hoverState.mouseY = mouseY;
        overlayCanvas.style.cursor = 'pointer';
      } else {
        state.hoverState.hoveredEvent = null;
        state.hoverState.hoveredIndex = -1;
        overlayCanvas.style.cursor = 'default';
      }

      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
    });

    overlayCanvas.addEventListener('mouseleave', function() {
      state.hoverState.hoveredEvent = null;
      state.hoverState.hoveredIndex = -1;
      var currentEvents = state.currentEvents || [];
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
    });

    overlayCanvas.addEventListener('click', function(e) {
      var rect = overlayCanvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var currentEvents = state.currentEvents || [];
      var clickResult = interactions.detectHover(mouseX, mouseY, currentEvents, state.chartInstance.scales.x, state.chartInstance.chartArea);

      if (clickResult) {
        if (state.hoverState.selectedIndex === clickResult.index) {
          state.hoverState.selectedIndex = -1;
        } else {
          state.hoverState.selectedIndex = clickResult.index;
        }
      } else {
        state.hoverState.selectedIndex = -1;
      }

      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
    });

    timelineCanvas.addEventListener('click', function(e) {
      var rect = timelineCanvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var currentEvents = state.currentEvents || [];
      var clickedIndex = timeline.detectTimelineClick(mouseX, mouseY, currentEvents, state.chartInstance);

      if (clickedIndex >= 0) {
        if (state.hoverState.selectedIndex === clickedIndex) {
          state.hoverState.selectedIndex = -1;
        } else {
          state.hoverState.selectedIndex = clickedIndex;
        }
      } else {
        state.hoverState.selectedIndex = -1;
      }

      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
    });

    timelineCanvas.addEventListener('mousemove', function(e) {
      var rect = timelineCanvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var currentEvents = state.currentEvents || [];
      var hoveredIndex = timeline.detectTimelineClick(mouseX, mouseY, currentEvents, state.chartInstance);

      if (hoveredIndex >= 0) {
        timelineCanvas.style.cursor = 'pointer';
        state.hoverState.hoveredIndex = hoveredIndex;
        state.hoverState.hoveredEvent = currentEvents[hoveredIndex];
      } else {
        timelineCanvas.style.cursor = 'default';
        state.hoverState.hoveredIndex = -1;
        state.hoverState.hoveredEvent = null;
      }

      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
    });

    timelineCanvas.addEventListener('mouseleave', function() {
      state.hoverState.hoveredEvent = null;
      state.hoverState.hoveredIndex = -1;
      var currentEvents = state.currentEvents || [];
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
    });

    // Store refs
    state.refs = {
      canvas: canvas,
      overlayCanvas: overlayCanvas,
      timelineCanvas: timelineCanvas,
      canvasWrapper: canvasWrapper,
      eventsContainer: eventsContainer,
      _selectedSite: selectedSite,
      _startDate: startDate,
      _endDate: endDate
    };

    // ── Utility toggle refresh ─────────────────────────────────────────
    function refreshUtilityData() {
      if (!selectedSite || !startDate || !endDate) return;
      var active = state.activeUtility;

      if (state.utilityData[active]) {
        rebuildChartFromCache();
      } else {
        api.loadPowerData(selectedSite, startDate, endDate, active)
          .then(function(data) {
            state.utilityData[active] = data;
            rebuildChartFromCache();
          })
          .catch(function(err) {
            // Silent error handling
          });
      }
    }
    state._refreshUtilityData = refreshUtilityData;

    function rebuildChartFromCache() {
      var active = state.activeUtility;
      var activeData = {};
      if (state.utilityData[active]) {
        activeData[active] = state.utilityData[active];
      }
      var currentEvents = state.currentEvents || [];
      var dateRange = state.currentDateRange || { startDate: startDate, endDate: endDate };
      chart.createChart(state.refs.canvas, activeData, currentEvents, dateRange);
      state.refs.timeSeriesData = activeData;
      syncOverlaySize();
      resizeTimelineForEvents(currentEvents);
      annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, currentEvents);
      timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, currentEvents);
    }

    // ── Main data loading ──────────────────────────────────────────────
    function loadDataForSite() {
      state.utilityData = {};

      if (!selectedSite || !startDate || !endDate) return;

      var activeUtility = state.activeUtility;

      Promise.all([
        api.loadPowerData(selectedSite, startDate, endDate, activeUtility)
          .catch(function(err) { console.error('loadPowerData error:', err); return []; }),
        api.loadSiteName(selectedSite),
        api.loadExecSummary(selectedSite, startDate, endDate)
          .catch(function(err) { console.error('loadExecSummary error:', err); return { events: [], totals: {} }; }),
        api.loadTotalEventCost(selectedSite, startDate, endDate),
        api.loadUtilityCost(selectedSite, startDate, endDate)
      ])
      .then(function(results) {
        var powerData = results[0];
        var siteName = results[1];
        var execSummary = results[2];
        var totalEventCost = results[3];
        var utilityCost = results[4];

        state.utilityData[activeUtility] = powerData;

        var hasInlineDates = execSummary.events.length > 0 &&
          (execSummary.events[0].eventStart || execSummary.events[0].eventEnd);

        if (hasInlineDates) {
          return {
            powerData: powerData,
            siteName: siteName,
            execSummary: execSummary,
            activeUtility: activeUtility,
            totalEventCost: totalEventCost,
            utilityCost: utilityCost
          };
        }

        var eventIds = execSummary.events.map(function(evt) {
          return evt.eventID;
        }).filter(function(id) {
          return id !== undefined && id !== null;
        });

        return api.loadEventDates(eventIds).then(function(eventDatesMap) {
          execSummary.events.forEach(function(evt) {
            if (eventDatesMap[evt.eventID]) {
              evt.eventStart = eventDatesMap[evt.eventID].startDate;
              evt.eventEnd = eventDatesMap[evt.eventID].endDate;
            }
          });

          return {
            powerData: powerData,
            siteName: siteName,
            execSummary: execSummary,
            activeUtility: activeUtility,
            totalEventCost: totalEventCost,
            utilityCost: utilityCost
          };
        });
      })
      .then(function(data) {
        // Remove placeholder
        if (state.placeholderMsg && state.placeholderMsg.parentNode) {
          state.placeholderMsg.parentNode.removeChild(state.placeholderMsg);
          state.placeholderMsg = null;
        }

        // Store raw data
        state.siteName = data.siteName;
        state.rawExecSummaryEvents = data.execSummary.events;

        // Update title bar
        titleSite.textContent = 'Event Utility Cost Tracking — ' + data.siteName;

        // Update Summary tab
        updateSummaryTab(data);

        // Transform events for chart/timeline
        var chartEvents = data.execSummary.events.map(function(evt, index) {
          var colors = [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(201, 203, 207, 0.8)'
          ];

          var evtStartDate = evt.eventStart ? new Date(evt.eventStart) : null;
          var evtEndDate = evt.eventEnd ? new Date(evt.eventEnd) : null;

          var durationStr = null;
          if (evtStartDate && evtEndDate) {
            var durationMs = evtEndDate.getTime() - evtStartDate.getTime();
            var durationHours = Math.floor(durationMs / (1000 * 60 * 60));
            var durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            if (durationHours >= 24) {
              var days = Math.floor(durationHours / 24);
              var remainingHours = durationHours % 24;
              durationStr = days + 'd ' + remainingHours + 'h';
            } else if (durationHours > 0) {
              durationStr = durationHours + 'h ' + durationMins + 'm';
            } else {
              durationStr = durationMins + ' min';
            }
          }

          var areaStr = null;
          if (evt.eventSF) {
            var sf = parseFloat(evt.eventSF);
            if (!isNaN(sf)) {
              areaStr = sf.toLocaleString() + ' sq ft';
            }
          }

          var costStr = null;
          if (evt.totalCost) {
            var costVal = parseFloat(evt.totalCost);
            if (!isNaN(costVal)) {
              costStr = '$' + costVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            }
          }

          return {
            label: evt.event || 'Unnamed Event',
            startTime: evtStartDate,
            endTime: evtEndDate,
            time: evtStartDate,
            color: colors[index % colors.length],
            cost: evt.totalCost,
            duration: durationStr,
            area: areaStr,
            costDisplay: costStr,
            rawData: evt
          };
        }).filter(function(evt) {
          return evt.startTime && !isNaN(evt.startTime.getTime());
        });

        state.currentEvents = chartEvents;

        state.visibilityState = {};
        chartEvents.forEach(function(evt, index) {
          state.visibilityState[index] = true;
        });

        var utilityDataObj = {};
        utilityDataObj[data.activeUtility] = data.powerData;
        state.refs.timeSeriesData = utilityDataObj;
        state.currentDateRange = { startDate: startDate, endDate: endDate };

        chart.createChart(state.refs.canvas, utilityDataObj, chartEvents, state.currentDateRange);

        syncOverlaySize();
        resizeTimelineForEvents(chartEvents);
        annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, chartEvents);
        timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, chartEvents);

        state.refs.eventsContainer.innerHTML = '';
        interactions.createEventList(state.refs.eventsContainer, chartEvents, state.chartInstance);
      })
      .catch(function(error) {
        console.error('loadDataForSite error:', error);
      });
    }

    loadDataForSite();

    // Start polling for variable changes
    skyspark.startPolling(view, {
      selectedSite: selectedSite,
      startDate: startDate,
      endDate: endDate
    }, function(newSite, newStartDate, newEndDate) {
      selectedSite = newSite;
      startDate = newStartDate;
      endDate = newEndDate;
      state._selectedSite = newSite;
      state._startDate = newStartDate;
      state._endDate = newEndDate;

      if (newStartDate && newEndDate) {
        titleDates.textContent = newStartDate + ' – ' + newEndDate;
      }

      // Show loading state on summary tab
      summaryLoading.style.display = '';
      summaryCards.style.display = 'none';
      summaryTableSection.style.display = 'none';

      loadDataForSite();
    });
  });
};
