/**
 * App.js - Root Application
 *
 * Tabbed interface: Summary | Event Database | Documentation
 * Summary tab includes collapsible utility plot, summary cards, and event table.
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

  var titleSite = document.createElement('span');
  titleSite.className = 'eap-title-site';
  titleSite.textContent = 'Event Utility Cost Tracking';
  titleBar.appendChild(titleSite);

  // Tab bar inside title bar
  var tabBar = document.createElement('div');
  tabBar.className = 'eap-tab-bar';
  titleBar.appendChild(tabBar);

  var TAB_IDS = ['summary', 'database', 'docs'];
  var TAB_LABELS = ['Summary', 'Event Database', 'Documentation'];
  var tabBtns = {};
  var tabPanels = {};
  var initialTab = state.activeTab || 'summary';
  if (initialTab === 'lookup') initialTab = 'summary';

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
  var tabInited = { summary: true, database: false, docs: false };
  var plotHidden = true;

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

    if (tabId === 'summary' && !plotHidden) {
      setTimeout(function() {
        if (state.chartInstance) {
          state.chartInstance.resize();
          if (state._syncOverlaySize) state._syncOverlaySize();
          var currentEvents = state.currentEvents || [];
          if (state._resizeTimelineForEvents) state._resizeTimelineForEvents(currentEvents);
          annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, currentEvents);
          if (state.refs) timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, currentEvents);
        }
      }, 50);
    }
  }

  tabBar.addEventListener('click', function(e) {
    var btn = e.target.closest('.eap-tab-btn');
    if (btn) switchTab(btn.getAttribute('data-tab'));
  });

  if (initialTab === 'database') {
    tabInited.database = true;
    if (eventsDatabase) eventsDatabase.renderTab(tabPanels.database, state);
  } else if (initialTab === 'docs') {
    tabInited.docs = true;
    if (documentation) documentation.renderTab(tabPanels.docs);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── SUMMARY TAB (cards + plot + table)
  // ══════════════════════════════════════════════════════════════════════

  var summaryPanel = tabPanels.summary;
  summaryPanel.style.padding = '24px 28px';

  var summaryListView = document.createElement('div');
  summaryPanel.appendChild(summaryListView);

  var summaryDetailView = document.createElement('div');
  summaryDetailView.style.display = 'none';
  summaryPanel.appendChild(summaryDetailView);

  var summaryLoading = document.createElement('div');
  summaryLoading.style.cssText = 'text-align:center;padding:80px 20px;color:#6c757d;';
  summaryLoading.innerHTML = '<div class="edb-spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div><div style="font-size:14px;font-weight:600;">Loading summary data…</div>';
  summaryListView.appendChild(summaryLoading);

  // ── Summary Cards ────────────────────────────────────────────────────
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

  // ── Plot Section (collapsible card) ──────────────────────────────────
  var plotSection = document.createElement('div');
  plotSection.style.cssText = 'background:white;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:20px;display:none;overflow:hidden;';
  summaryListView.appendChild(plotSection);

  var plotHeader = document.createElement('div');
  plotHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #E5E7EB;';
  plotSection.appendChild(plotHeader);

  var plotTitleEl = document.createElement('h3');
  plotTitleEl.textContent = 'Utility Plot';
  plotTitleEl.style.cssText = 'font-size:14px;font-weight:700;color:#374151;margin:0;';
  plotHeader.appendChild(plotTitleEl);

  var plotBtnGroup = document.createElement('div');
  plotBtnGroup.style.cssText = 'display:flex;gap:6px;';
  plotHeader.appendChild(plotBtnGroup);

  function makePlotHeaderBtn(label) {
    var b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:5px 14px;border:1px solid #dee2e6;border-radius:6px;background:white;color:#6c757d;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
    b.onmouseover = function() { b.style.borderColor = '#4A6FA5'; b.style.color = '#4A6FA5'; };
    b.onmouseout = function() { b.style.borderColor = '#dee2e6'; b.style.color = '#6c757d'; };
    return b;
  }

  var showAllBtn = makePlotHeaderBtn('Show All');
  var hideAllBtn = makePlotHeaderBtn('Hide All');
  var plotToggleBtn = makePlotHeaderBtn('Show Plot');

  showAllBtn.onclick = function() {
    var evts = state.currentEvents || [];
    evts.forEach(function(_, i) { state.visibilityState[i] = true; });
    redrawChart();
    syncVisIcons();
  };

  hideAllBtn.onclick = function() {
    var evts = state.currentEvents || [];
    evts.forEach(function(_, i) { state.visibilityState[i] = false; });
    redrawChart();
    syncVisIcons();
  };

  plotBtnGroup.appendChild(showAllBtn);
  plotBtnGroup.appendChild(hideAllBtn);
  plotBtnGroup.appendChild(plotToggleBtn);

  var plotBody = document.createElement('div');
  plotBody.style.cssText = 'padding:16px 20px;display:none;';
  plotSection.appendChild(plotBody);

  plotToggleBtn.onclick = function() {
    plotHidden = !plotHidden;
    plotBody.style.display = plotHidden ? 'none' : '';
    plotToggleBtn.textContent = plotHidden ? 'Show Plot' : 'Hide';
    if (!plotHidden) {
      setTimeout(function() {
        if (state.chartInstance) {
          state.chartInstance.resize();
          if (state._syncOverlaySize) state._syncOverlaySize();
          var currentEvents = state.currentEvents || [];
          if (state._resizeTimelineForEvents) state._resizeTimelineForEvents(currentEvents);
          annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, currentEvents);
          if (state.refs) timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, currentEvents);
        }
      }, 50);
    }
  };

  function redrawChart() {
    if (state.chartInstance && state.overlayCanvas) {
      var currentEvents = state.currentEvents || [];
      annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, currentEvents);
      if (state.refs) timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, currentEvents);
    }
  }

  var visIconElements = [];

  function syncVisIcons() {
    visIconElements.forEach(function(item) {
      var visible = state.visibilityState[item.index] !== false;
      item.el.textContent = visible ? '●' : '○';
      item.el.style.opacity = visible ? '1' : '0.35';
      item.row.style.opacity = visible ? '1' : '0.5';
    });
  }

  // ── Chart container inside plot body ─────────────────────────────────
  var chartH = Math.max(350, Math.min(Math.round(window.innerHeight * 0.45), 550));
  var chartContainer = document.createElement('div');
  chartContainer.style.cssText = 'width:100%;height:' + chartH + 'px;box-sizing:border-box;position:relative;display:flex;flex-direction:column;';
  plotBody.appendChild(chartContainer);

  var utilityToggleBar = interactions.createUtilityToggle(function(utilityName) {
    state.activeUtility = utilityName;
    if (state._refreshUtilityData) state._refreshUtilityData();
  });
  chartContainer.appendChild(utilityToggleBar);

  var btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'position:absolute;top:4px;right:4px;z-index:20;display:flex;gap:6px;';
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

  var canvasMinH = Math.round(200 + 60 * rs.vhScale);
  var canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = 'width:100%;flex:1;min-height:' + canvasMinH + 'px;position:relative;';
  chartContainer.appendChild(canvasWrapper);

  var canvas = document.createElement('canvas');
  canvas.id = 'eventAnnotationsChart';
  canvasWrapper.appendChild(canvas);

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

  // ── Event Summary Table ──────────────────────────────────────────────
  var summaryTableSection = document.createElement('div');
  summaryTableSection.className = 'eap-summary-table-section';
  summaryTableSection.style.display = 'none';
  summaryListView.appendChild(summaryTableSection);

  var summaryTableHeader = document.createElement('div');
  summaryTableHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
  summaryTableSection.appendChild(summaryTableHeader);

  var summaryTableTitle = document.createElement('h3');
  summaryTableTitle.className = 'eap-summary-table-title';
  summaryTableTitle.textContent = 'Event Summary';
  summaryTableTitle.style.marginBottom = '0';
  summaryTableHeader.appendChild(summaryTableTitle);

  var searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search events…';
  searchInput.style.cssText = 'padding:7px 14px;border:1px solid #dee2e6;border-radius:6px;font-size:13px;width:220px;outline:none;transition:border-color 0.15s;';
  searchInput.onfocus = function() { searchInput.style.borderColor = '#4A6FA5'; };
  searchInput.onblur = function() { searchInput.style.borderColor = '#dee2e6'; };
  searchInput.oninput = function() { filterSummaryTable(); };
  summaryTableHeader.appendChild(searchInput);

  var summaryTableWrap = document.createElement('div');
  summaryTableSection.appendChild(summaryTableWrap);

  var lastRenderedEvents = [];

  function filterSummaryTable() {
    var query = (searchInput.value || '').toLowerCase().trim();
    var rows = summaryTableWrap.querySelectorAll('tbody tr');
    rows.forEach(function(tr, i) {
      if (!query) {
        tr.style.display = '';
        return;
      }
      var evt = lastRenderedEvents[i];
      if (!evt) { tr.style.display = ''; return; }
      var name = (evt.event || '').toLowerCase();
      var id = (evt.eventID || '').toLowerCase();
      var match = name.indexOf(query) >= 0 || id.indexOf(query) >= 0;
      tr.style.display = match ? '' : 'none';
    });
  }

  // ── Event Detail Sub-view ────────────────────────────────────────────

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
    var eventSF = parseFloat(raw.eventSF) || 0;

    // ── Demo data (will be replaced by API calls) ──────────────────
    var demoSpaces = [
      { name: 'Ballroom A', sqft: Math.round(eventSF * 0.45) || 4500, floor: '1st Floor', type: 'Event Space' },
      { name: 'Ballroom B', sqft: Math.round(eventSF * 0.30) || 3000, floor: '1st Floor', type: 'Event Space' },
      { name: 'Pre-Function Lobby', sqft: Math.round(eventSF * 0.15) || 1500, floor: '1st Floor', type: 'Common Area' },
      { name: 'Kitchen / Catering', sqft: Math.round(eventSF * 0.10) || 1000, floor: '1st Floor', type: 'Support' }
    ];

    var demoMeters = [
      { id: 'EM-101', name: 'Main Electrical Panel A', type: 'Electric', serves: 'Ballroom A, Pre-Function Lobby', unit: 'kW' },
      { id: 'EM-102', name: 'Main Electrical Panel B', type: 'Electric', serves: 'Ballroom B, Kitchen', unit: 'kW' },
      { id: 'CHW-201', name: 'CHW AHU-1 Loop', type: 'CHW', serves: 'Ballroom A & B', unit: 'Ton' },
      { id: 'STM-301', name: 'Steam AHU-1 Coil', type: 'Steam', serves: 'Ballroom A & B', unit: 'Mlb/hr' },
      { id: 'GAS-401', name: 'Kitchen Gas Meter', type: 'Gas', serves: 'Kitchen / Catering', unit: 'Therms' }
    ];

    var allEvents = state.rawExecSummaryEvents || [];
    var concurrentEvents = allEvents.filter(function(other) {
      if (!other.eventStart || !other.eventEnd || !raw.eventStart || !raw.eventEnd) return false;
      if ((other.eventID || other.event) === (raw.eventID || raw.event)) return false;
      var oStart = new Date(other.eventStart).getTime();
      var oEnd = new Date(other.eventEnd).getTime();
      var rStart = new Date(raw.eventStart).getTime();
      var rEnd = new Date(raw.eventEnd).getTime();
      return oStart < rEnd && oEnd > rStart;
    });

    var sectionStyle = 'background:white;border:1px solid #E5E7EB;border-radius:8px;padding:20px 24px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);';
    var sectionTitleStyle = 'font-size:14px;font-weight:700;color:#374151;margin:0 0 16px 0;padding-bottom:10px;border-bottom:1px solid #E5E7EB;';
    var tableStyle = 'width:100%;border-collapse:collapse;font-size:13px;';
    var thStyle = 'text-align:left;padding:8px 12px;font-weight:600;color:#6c757d;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #E5E7EB;';
    var tdStyle = 'padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;';

    var backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Summary';
    backBtn.style.cssText = 'padding:10px 20px;border:1px solid #dee2e6;border-radius:6px;background:white;color:#495057;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;margin-bottom:20px;';
    backBtn.onmouseover = function() { backBtn.style.background = '#e8f4fd'; backBtn.style.borderColor = '#4A6FA5'; backBtn.style.color = '#4A6FA5'; };
    backBtn.onmouseout = function() { backBtn.style.background = 'white'; backBtn.style.borderColor = '#dee2e6'; backBtn.style.color = '#495057'; };
    backBtn.onclick = function() {
      summaryDetailView.style.display = 'none';
      summaryListView.style.display = '';
    };
    summaryDetailView.appendChild(backBtn);

    var headerCard = document.createElement('div');
    headerCard.style.cssText = sectionStyle + 'text-align:center;';

    var evtName = document.createElement('div');
    evtName.textContent = raw.event || 'Unnamed Event';
    evtName.style.cssText = 'font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#6c757d;margin-bottom:8px;';
    headerCard.appendChild(evtName);

    var evtTotal = document.createElement('div');
    evtTotal.textContent = formatCurrency(totalCost);
    evtTotal.style.cssText = 'font-size:48px;font-weight:900;color:#17a2b8;line-height:1;margin-bottom:6px;';
    headerCard.appendChild(evtTotal);

    var evtLabel = document.createElement('div');
    evtLabel.textContent = 'Total Event Utility Cost';
    evtLabel.style.cssText = 'font-size:14px;color:#6c757d;margin-bottom:18px;';
    headerCard.appendChild(evtLabel);

    var metaGrid = document.createElement('div');
    metaGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;text-align:center;';

    var metaItems = [];
    if (raw.eventID) metaItems.push({ label: 'Event ID', value: raw.eventID });
    if (eventSF) metaItems.push({ label: 'Area', value: eventSF.toLocaleString() + ' sq ft' });
    if (raw.eventStart) metaItems.push({ label: 'Start', value: new Date(raw.eventStart).toLocaleDateString() });
    if (raw.eventEnd) metaItems.push({ label: 'End', value: new Date(raw.eventEnd).toLocaleDateString() });
    if (state.siteName) metaItems.push({ label: 'Site', value: state.siteName });

    metaItems.forEach(function(m) {
      var item = document.createElement('div');
      item.style.cssText = 'padding:10px;background:#f8f9fa;border-radius:8px;';
      var l = document.createElement('div');
      l.textContent = m.label;
      l.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#6c757d;margin-bottom:2px;';
      var v = document.createElement('div');
      v.textContent = m.value;
      v.style.cssText = 'font-size:14px;font-weight:600;color:#2c3e50;';
      item.appendChild(l);
      item.appendChild(v);
      metaGrid.appendChild(item);
    });

    headerCard.appendChild(metaGrid);
    summaryDetailView.appendChild(headerCard);

    var twoCol = document.createElement('div');
    twoCol.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;';

    var spacesCard = document.createElement('div');
    spacesCard.style.cssText = sectionStyle + 'margin-bottom:0;';
    var spacesTitle = document.createElement('h3');
    spacesTitle.textContent = 'Spaces Served';
    spacesTitle.style.cssText = sectionTitleStyle;
    spacesCard.appendChild(spacesTitle);

    var spacesTable = document.createElement('table');
    spacesTable.style.cssText = tableStyle;
    var spacesHead = document.createElement('thead');
    spacesHead.innerHTML = '<tr><th style="' + thStyle + '">Space</th><th style="' + thStyle + '">Sq Ft</th><th style="' + thStyle + '">Type</th></tr>';
    spacesTable.appendChild(spacesHead);
    var spacesBody = document.createElement('tbody');
    var totalSpaceSF = 0;
    demoSpaces.forEach(function(sp) {
      totalSpaceSF += sp.sqft;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td style="' + tdStyle + '">' + sp.name + '</td>' +
        '<td style="' + tdStyle + '">' + sp.sqft.toLocaleString() + '</td>' +
        '<td style="' + tdStyle + '"><span style="padding:2px 8px;background:#EBF5FB;color:#2980B9;border-radius:4px;font-size:11px;font-weight:600;">' + sp.type + '</span></td>';
      spacesBody.appendChild(tr);
    });
    var spacesFootTr = document.createElement('tr');
    spacesFootTr.innerHTML = '<td style="' + tdStyle + 'font-weight:700;">Total</td><td style="' + tdStyle + 'font-weight:700;">' + totalSpaceSF.toLocaleString() + '</td><td style="' + tdStyle + '">' + demoSpaces.length + ' spaces</td>';
    spacesBody.appendChild(spacesFootTr);
    spacesTable.appendChild(spacesBody);
    spacesCard.appendChild(spacesTable);
    twoCol.appendChild(spacesCard);

    var metersCard = document.createElement('div');
    metersCard.style.cssText = sectionStyle + 'margin-bottom:0;';
    var metersTitle = document.createElement('h3');
    metersTitle.textContent = 'Meters Serving Event';
    metersTitle.style.cssText = sectionTitleStyle;
    metersCard.appendChild(metersTitle);

    var metersTable = document.createElement('table');
    metersTable.style.cssText = tableStyle;
    var metersHead = document.createElement('thead');
    metersHead.innerHTML = '<tr><th style="' + thStyle + '">Meter ID</th><th style="' + thStyle + '">Type</th><th style="' + thStyle + '">Serves</th></tr>';
    metersTable.appendChild(metersHead);
    var metersBody = document.createElement('tbody');
    var typeColors = { Electric: '#27AE60', CHW: '#2980B9', Steam: '#E74C3C', Gas: '#F39C12', Water: '#5DADE2' };
    demoMeters.forEach(function(mt) {
      var tr = document.createElement('tr');
      var tc = typeColors[mt.type] || '#6c757d';
      tr.innerHTML = '<td style="' + tdStyle + 'font-family:monospace;font-size:12px;">' + mt.id + '</td>' +
        '<td style="' + tdStyle + '"><span style="padding:2px 8px;background:' + tc + '15;color:' + tc + ';border-radius:4px;font-size:11px;font-weight:600;">' + mt.type + '</span></td>' +
        '<td style="' + tdStyle + 'font-size:12px;color:#6c757d;">' + mt.serves + '</td>';
      metersBody.appendChild(tr);
    });
    metersTable.appendChild(metersBody);
    metersCard.appendChild(metersTable);
    twoCol.appendChild(metersCard);

    summaryDetailView.appendChild(twoCol);

    var concurrentCard = document.createElement('div');
    concurrentCard.style.cssText = sectionStyle;
    var concurrentTitle = document.createElement('h3');
    concurrentTitle.textContent = 'Other Events in Space During This Period';
    concurrentTitle.style.cssText = sectionTitleStyle;
    concurrentCard.appendChild(concurrentTitle);

    if (concurrentEvents.length === 0) {
      var noOverlap = document.createElement('div');
      noOverlap.style.cssText = 'text-align:center;padding:24px;color:#6c757d;font-size:13px;';
      noOverlap.textContent = 'No other events overlap with this event period.';
      concurrentCard.appendChild(noOverlap);
    } else {
      var concTable = document.createElement('table');
      concTable.style.cssText = tableStyle;
      var concHead = document.createElement('thead');
      concHead.innerHTML = '<tr><th style="' + thStyle + '">Event</th><th style="' + thStyle + '">Start</th><th style="' + thStyle + '">End</th><th style="' + thStyle + '">Sq Ft</th><th style="' + thStyle + '">Cost</th><th style="' + thStyle + '">Overlap</th></tr>';
      concTable.appendChild(concHead);
      var concBody = document.createElement('tbody');
      concurrentEvents.forEach(function(ce) {
        var ceStart = new Date(ce.eventStart);
        var ceEnd = new Date(ce.eventEnd);
        var rStart = new Date(raw.eventStart);
        var rEnd = new Date(raw.eventEnd);
        var overlapStart = Math.max(ceStart.getTime(), rStart.getTime());
        var overlapEnd = Math.min(ceEnd.getTime(), rEnd.getTime());
        var overlapHrs = Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60));
        var overlapStr = overlapHrs >= 24 ? Math.round(overlapHrs / 24) + 'd' : overlapHrs + 'h';
        var ceCost = parseFloat(ce.totalCost) || 0;
        var tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onmouseover = function() { tr.style.backgroundColor = '#f8f9fa'; };
        tr.onmouseout = function() { tr.style.backgroundColor = ''; };
        tr.onclick = function() { showEventDetail(ce); };
        tr.innerHTML = '<td style="' + tdStyle + 'font-weight:600;">' + (ce.event || 'Unnamed') + '</td>' +
          '<td style="' + tdStyle + '">' + ceStart.toLocaleDateString() + '</td>' +
          '<td style="' + tdStyle + '">' + ceEnd.toLocaleDateString() + '</td>' +
          '<td style="' + tdStyle + '">' + (ce.eventSF ? parseFloat(ce.eventSF).toLocaleString() : '—') + '</td>' +
          '<td style="' + tdStyle + 'font-weight:600;">' + formatCurrency(ceCost) + '</td>' +
          '<td style="' + tdStyle + '"><span style="padding:2px 8px;background:#FEF3C7;color:#92400E;border-radius:4px;font-size:11px;font-weight:600;">' + overlapStr + '</span></td>';
        concBody.appendChild(tr);
      });
      concTable.appendChild(concBody);
      concurrentCard.appendChild(concTable);
    }
    summaryDetailView.appendChild(concurrentCard);

    var utilities = [
      { name: 'Electric', key: 'elec', color: colors.electric, unit: 'kWh', demandUnit: 'kW', rate: 0.085, demandRate: 12.50,
        energyCost: parseFloat(raw.elec_energyCost) || 0, demandCost: parseFloat(raw.elec_demandCost) || 0 },
      { name: 'Chilled Water', key: 'chw', color: colors.chw, unit: 'Ton-hr', demandUnit: 'Ton', rate: 0.145, demandRate: 18.00,
        energyCost: parseFloat(raw.chw_energyCost) || 0, demandCost: parseFloat(raw.chw_demandCost) || 0 },
      { name: 'Steam', key: 'steam', color: colors.steam, unit: 'Mlb', demandUnit: 'Mlb/hr', rate: 22.50, demandRate: 35.00,
        energyCost: parseFloat(raw.steam_energyCost) || 0, demandCost: parseFloat(raw.steam_demandCost) || 0 },
      { name: 'Gas', key: 'gas', color: colors.gas, unit: 'Therms', demandUnit: 'Therms/hr', rate: 1.05, demandRate: 8.75,
        energyCost: parseFloat(raw.gas_energyCost) || 0, demandCost: parseFloat(raw.gas_demandCost) || 0 }
    ];

    utilities.forEach(function(u) {
      u.total = u.energyCost + u.demandCost;
      u.percent = totalCost > 0 ? Math.round((u.total / totalCost) * 100) : 0;
      u.energyUsage = u.rate > 0 ? (u.energyCost / u.rate) : 0;
      u.demandPeak = u.demandRate > 0 ? (u.demandCost / u.demandRate) : 0;
    });

    var activeUtils = utilities.filter(function(u) { return u.total > 0; })
      .sort(function(a, b) { return b.total - a.total; });

    if (activeUtils.length > 0) {
      var derivCard = document.createElement('div');
      derivCard.style.cssText = sectionStyle;
      var derivTitle = document.createElement('h3');
      derivTitle.textContent = 'Utility Usage Derivation';
      derivTitle.style.cssText = sectionTitleStyle;
      derivCard.appendChild(derivTitle);

      var derivGrid = document.createElement('div');
      derivGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;';

      activeUtils.forEach(function(util) {
        var card = document.createElement('div');
        card.style.cssText = 'background:#f8f9fa;border-radius:10px;padding:20px;border-left:4px solid ' + util.color + ';';

        var cHeader = document.createElement('div');
        cHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
        var cName = document.createElement('div');
        cName.textContent = util.name;
        cName.style.cssText = 'font-size:15px;font-weight:700;color:#374151;';
        var cTotal = document.createElement('div');
        cTotal.textContent = formatCurrency(util.total);
        cTotal.style.cssText = 'font-size:20px;font-weight:700;color:' + util.color + ';';
        cHeader.appendChild(cName);
        cHeader.appendChild(cTotal);
        card.appendChild(cHeader);

        var pctBar = document.createElement('div');
        pctBar.style.cssText = 'height:4px;background:#E5E7EB;border-radius:2px;margin-bottom:16px;overflow:hidden;';
        var pctFill = document.createElement('div');
        pctFill.style.cssText = 'height:100%;background:' + util.color + ';border-radius:2px;width:' + util.percent + '%;';
        pctBar.appendChild(pctFill);
        card.appendChild(pctBar);

        var calcRows = [
          { label: 'Energy Usage', value: Math.round(util.energyUsage).toLocaleString() + ' ' + util.unit, dimmed: false },
          { label: 'Energy Rate', value: '$' + util.rate.toFixed(3) + ' / ' + util.unit, dimmed: true },
          { label: 'Energy Cost', value: formatCents(util.energyCost), dimmed: false },
          { label: '', value: '', separator: true },
          { label: 'Peak Demand', value: util.demandPeak.toFixed(1) + ' ' + util.demandUnit, dimmed: false },
          { label: 'Demand Rate', value: '$' + util.demandRate.toFixed(2) + ' / ' + util.demandUnit, dimmed: true },
          { label: 'Demand Cost', value: formatCents(util.demandCost), dimmed: false }
        ];

        calcRows.forEach(function(r) {
          if (r.separator) {
            var sep = document.createElement('div');
            sep.style.cssText = 'border-top:1px dashed #dee2e6;margin:8px 0;';
            card.appendChild(sep);
            return;
          }
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;font-size:13px;padding:4px 0;';
          var rl = document.createElement('span');
          rl.textContent = r.label;
          rl.style.cssText = 'color:' + (r.dimmed ? '#9CA3AF' : '#6c757d') + ';' + (r.dimmed ? 'font-style:italic;' : '');
          var rv = document.createElement('span');
          rv.textContent = r.value;
          rv.style.cssText = 'font-weight:600;color:' + (r.dimmed ? '#9CA3AF' : '#374151') + ';' + (r.dimmed ? 'font-style:italic;' : '');
          row.appendChild(rl);
          row.appendChild(rv);
          card.appendChild(row);
        });

        derivGrid.appendChild(card);
      });

      derivCard.appendChild(derivGrid);
      summaryDetailView.appendChild(derivCard);
    }
  }

  // ── Update Summary Tab ───────────────────────────────────────────────

  function updateSummaryTab(data) {
    summaryLoading.style.display = 'none';
    summaryCards.style.display = '';
    plotSection.style.display = '';
    summaryTableSection.style.display = '';
    summaryDetailView.style.display = 'none';
    summaryListView.style.display = '';

    summaryTotalCostVal.textContent = '$' + Math.round(data.totalEventCost).toLocaleString();
    summaryUtilityCostVal.textContent = '$' + Math.round(data.utilityCost).toLocaleString();
    summaryEventCountVal.textContent = String(data.execSummary.events.length);

    var events = data.execSummary.events;
    lastRenderedEvents = events;
    searchInput.value = '';

    if (events.length === 0) {
      summaryTableWrap.innerHTML = '<div style="text-align:center;padding:40px;color:#6c757d;">No events found for this date range.</div>';
      return;
    }

    visIconElements = [];

    var chartColors = [
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 205, 86, 0.8)',
      'rgba(201, 203, 207, 0.8)'
    ];

    var chartEventMap = {};
    (state.currentEvents || []).forEach(function(ce, ci) {
      if (ce.rawData) {
        var key = (ce.rawData.eventID || '') + '|' + (ce.rawData.event || '');
        chartEventMap[key] = ci;
      }
    });

    summaryTableWrap.innerHTML = '';
    var table = document.createElement('table');
    table.className = 'eap-summary-table';

    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th style="width:40px;text-align:center;">Vis</th><th>Event</th><th>Start</th><th>End</th><th>Sq Ft</th><th>Total Cost</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    events.forEach(function(evt, idx) {
      var evtKey = (evt.eventID || '') + '|' + (evt.event || '');
      var chartIdx = chartEventMap[evtKey];
      var color = chartIdx !== undefined ? chartColors[chartIdx % chartColors.length] : '#adb5bd';

      var tr = document.createElement('tr');
      tr.style.cursor = 'pointer';

      var visTd = document.createElement('td');
      visTd.style.cssText = 'text-align:center;font-size:16px;cursor:pointer;user-select:none;';
      var visIcon = document.createElement('span');
      visIcon.textContent = '●';
      visIcon.style.cssText = 'color:' + color + ';transition:opacity 0.15s;';
      visTd.appendChild(visIcon);

      if (chartIdx !== undefined) {
        visIconElements.push({ el: visIcon, row: tr, index: chartIdx });
        visTd.onclick = function(e) {
          e.stopPropagation();
          var isVis = state.visibilityState[chartIdx] !== false;
          state.visibilityState[chartIdx] = !isVis;
          redrawChart();
          syncVisIcons();
        };
      }

      tr.appendChild(visTd);

      var startStr = evt.eventStart ? new Date(evt.eventStart).toLocaleDateString() : '—';
      var endStr = evt.eventEnd ? new Date(evt.eventEnd).toLocaleDateString() : '—';
      var sfStr = evt.eventSF ? parseFloat(evt.eventSF).toLocaleString() : '—';
      var costVal = parseFloat(evt.totalCost) || 0;
      var costStr = '$' + costVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

      var nameTd = document.createElement('td');
      nameTd.textContent = evt.event || 'Unnamed';
      var startTd = document.createElement('td');
      startTd.textContent = startStr;
      var endTd = document.createElement('td');
      endTd.textContent = endStr;
      var sfTd = document.createElement('td');
      sfTd.textContent = sfStr;
      var costTd = document.createElement('td');
      costTd.textContent = costStr;

      tr.appendChild(nameTd);
      tr.appendChild(startTd);
      tr.appendChild(endTd);
      tr.appendChild(sfTd);
      tr.appendChild(costTd);

      tr.onclick = function() { showEventDetail(evt); };
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    summaryTableWrap.appendChild(table);
    syncVisIcons();
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── CHART.JS INIT & DATA LOADING
  // ══════════════════════════════════════════════════════════════════════

  loader.loadChartJs(function() {
    if (loadingMsg.parentNode) loadingMsg.parentNode.removeChild(loadingMsg);

    var placeholderMsg = document.createElement('div');
    placeholderMsg.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#666;font-size:16px;';
    placeholderMsg.innerHTML = '<div style="font-size:48px;margin-bottom:16px;">📊</div><div style="font-weight:600;margin-bottom:8px;">No Data Loaded</div><div>Select a site and date range</div>';
    chartContainer.appendChild(placeholderMsg);
    state.placeholderMsg = placeholderMsg;

    chart.createChart(canvas, [], [], null);

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

    window.addEventListener('resize', function() {
      window.EventAnnotationsPlot.computeScaling();
      var newChartH = Math.max(350, Math.min(Math.round(window.innerHeight * 0.45), 550));
      chartContainer.style.height = newChartH + 'px';
      if (!plotHidden) {
        resizeTimelineForEvents(state.currentEvents || []);
        syncOverlaySize();
        updateTimelineSize();
        var currentEvents = state.currentEvents || [];
        annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
        timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
      }
    });

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

    state.refs = {
      canvas: canvas,
      overlayCanvas: overlayCanvas,
      timelineCanvas: timelineCanvas,
      canvasWrapper: canvasWrapper,
      _selectedSite: selectedSite,
      _startDate: startDate,
      _endDate: endDate
    };

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
          .catch(function(err) {});
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
        if (state.placeholderMsg && state.placeholderMsg.parentNode) {
          state.placeholderMsg.parentNode.removeChild(state.placeholderMsg);
          state.placeholderMsg = null;
        }

        state.siteName = data.siteName;
        state.rawExecSummaryEvents = data.execSummary.events;

        titleSite.textContent = 'Event Utility Cost Tracking — ' + data.siteName;

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
          state.visibilityState[index] = false;
        });

        updateSummaryTab(data);

        var utilityDataObj = {};
        utilityDataObj[data.activeUtility] = data.powerData;
        state.refs.timeSeriesData = utilityDataObj;
        state.currentDateRange = { startDate: startDate, endDate: endDate };

        chart.createChart(state.refs.canvas, utilityDataObj, chartEvents, state.currentDateRange);

        syncOverlaySize();
        resizeTimelineForEvents(chartEvents);
        annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, chartEvents);
        timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, chartEvents);
      })
      .catch(function(error) {
        console.error('loadDataForSite error:', error);
      });
    }

    loadDataForSite();

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

      summaryLoading.style.display = '';
      summaryCards.style.display = 'none';
      plotSection.style.display = 'none';
      summaryTableSection.style.display = 'none';

      loadDataForSite();
    });
  });
};
