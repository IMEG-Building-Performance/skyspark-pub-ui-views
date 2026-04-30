/**
 * App.js - Root Application
 *
 * Adds event detail slide-over panel.
 * 
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

  // ── Compute responsive scaling on init ─────────────────────────────
  window.EventAnnotationsPlot.computeScaling();
  var rs = state.responsiveScaling;

  // ── Build DOM layout ─────────────────────────────────────────────────
  var mainPad = Math.round(12 + 8 * rs.vhScale);
  var mainContainer = document.createElement('div');
  mainContainer.style.cssText = 'padding:' + mainPad + 'px;font-family:Arial,sans-serif;width:100%;height:100%;overflow:auto;box-sizing:border-box;';
  elem.appendChild(mainContainer);

  // Summary widgets
  var widgetRefs = widgets.createSummaryWidgets(mainContainer);
  var titleDiv = widgetRefs.titleDiv;
  var totalEventCostValueDiv = widgetRefs.totalEventCostValueDiv;
  var utilityCostValueDiv = widgetRefs.utilityCostValueDiv;

  // "View All Events" button — inserted into summary bar after title
  if (eventsDatabase) {
    var viewEventsBtn = document.createElement('button');
    viewEventsBtn.textContent = 'View All Events';
    viewEventsBtn.style.cssText = 'padding:8px 18px;border:1px solid #1565c0;border-radius:6px;background:#1565c0;color:white;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap;';
    viewEventsBtn.onmouseover = function() { viewEventsBtn.style.background = '#1976d2'; };
    viewEventsBtn.onmouseout = function() { viewEventsBtn.style.background = '#1565c0'; };
    viewEventsBtn.onclick = function() {
      eventsDatabase.openPanel(mainContainer, state);
    };
    // Insert after titleDiv (before cost widgets)
    widgetRefs.summaryContainer.insertBefore(viewEventsBtn, titleDiv.nextSibling);
  }

  // "Documentation" button — always added to summary bar
  var docBtn = document.createElement('button');
  docBtn.textContent = 'Documentation';
  docBtn.style.cssText = 'padding:8px 18px;border:1px solid #43a047;border-radius:6px;background:#43a047;color:white;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap;flex-shrink:0;';
  docBtn.onmouseover = function() { docBtn.style.background = '#4caf50'; };
  docBtn.onmouseout = function() { docBtn.style.background = '#43a047'; };
  docBtn.onclick = function() {
    var doc = window.EventAnnotationsPlot.documentation;
    if (doc) {
      doc.openPanel(mainContainer);
    }
  };
  // Insert after viewEventsBtn (or after titleDiv if no viewEventsBtn)
  var docInsertAfter = viewEventsBtn || titleDiv;
  if (docInsertAfter && docInsertAfter.nextSibling) {
    widgetRefs.summaryContainer.insertBefore(docBtn, docInsertAfter.nextSibling);
  } else {
    widgetRefs.summaryContainer.appendChild(docBtn);
  }

  // Layout container
  var layoutContainer = document.createElement('div');
  layoutContainer.style.cssText = 'display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;';
  mainContainer.appendChild(layoutContainer);

  // Chart container - responsive height with min/max constraints
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

  // Expand button (top-right of chart)
  var expandBtn = document.createElement('button');
  expandBtn.title = 'Expand chart';
  expandBtn.textContent = '\u26F6';
  expandBtn.style.cssText = 'width:32px;height:32px;border:1px solid #dee2e6;border-radius:6px;background:white;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:#6c757d;box-shadow:0 1px 3px rgba(0,0,0,0.08);';
  expandBtn.onmouseover = function() { expandBtn.style.backgroundColor = '#e8f4fd'; expandBtn.style.color = '#1565c0'; expandBtn.style.borderColor = '#1565c0'; };
  expandBtn.onmouseout = function() { expandBtn.style.backgroundColor = 'white'; expandBtn.style.color = '#6c757d'; expandBtn.style.borderColor = '#dee2e6'; };
  expandBtn.onclick = function() {
    if (window.EventAnnotationsPlot.expandView) {
      window.EventAnnotationsPlot.expandView.open(state, interactions, annotations, timeline, chart);
    }
  };
  btnGroup.appendChild(expandBtn);

  // Canvas wrapper - flex-grow to fill available space
  var canvasMinH = Math.round(200 + 100 * rs.vhScale);
  var canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = 'width:100%;flex:1;min-height:' + canvasMinH + 'px;position:relative;';
  chartContainer.appendChild(canvasWrapper);

  var canvas = document.createElement('canvas');
  canvas.id = 'eventAnnotationsChart';
  canvasWrapper.appendChild(canvas);

  // Timeline wrapper with header bar and collapsible content
  var timelineMinH = Math.round(60 + 60 * rs.vhScale);
  var timelineMaxH = Math.round(160 + 80 * rs.vhScale);
  var timelineWrapper = document.createElement('div');
  timelineWrapper.style.cssText = 'width:100%;margin-top:4px;flex-shrink:0;';
  chartContainer.appendChild(timelineWrapper);

  // Timeline header bar with label and close button
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

  // Timeline content container
  var timelineContainer = document.createElement('div');
  timelineContainer.style.cssText = 'width:100%;height:' + timelineMinH + 'px;max-height:' + timelineMaxH + 'px;position:relative;overflow-y:auto;overflow-x:hidden;';
  timelineWrapper.appendChild(timelineContainer);

  // Toggle logic
  function applyTimelineToggle() {
    timelineContainer.style.display = state.timelineHidden ? 'none' : 'block';
    timelineToggleBtn.textContent = state.timelineHidden ? 'Show' : 'Hide';
  }
  applyTimelineToggle();

  timelineHeader.onclick = function() {
    state.timelineHidden = !state.timelineHidden;
    applyTimelineToggle();
    // Redraw overlays after toggling so chart resizes correctly
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

  // Events sidebar - responsive height matching chart
  var eventsContainer = document.createElement('div');
  eventsContainer.style.cssText = 'flex:1;min-width:280px;max-width:400px;height:' + chartH + 'px;display:flex;flex-direction:column;position:relative;z-index:10;';
  layoutContainer.appendChild(eventsContainer);

  // Sidebar re-show button (appears on chart edge when sidebar is hidden)
  var showSidebarBtn = document.createElement('button');
  showSidebarBtn.title = 'Show event filter panel';
  showSidebarBtn.textContent = 'Event Filter \u25B6';
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

  // Store ref so interactions.js can toggle it when hiding the sidebar
  state._showSidebarBtn = showSidebarBtn;

  // Apply initial sidebar state (must be after eventsContainer is created)
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

    // Create empty chart (no date range yet)
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
      // Timeline buffer must match the CHART canvas buffer width exactly
      // so that chartArea.left/right coordinates align correctly
      var chartCanvas = state.refs && state.refs.canvas ? state.refs.canvas : canvas;
      var bufferWidth = chartCanvas.width;  // Already DPR-scaled by Chart.js

      // Get CSS height from container
      var timelineContainerRect = timelineContainer.getBoundingClientRect();
      var cssHeight = Math.round(timelineContainerRect.height) || 56;

      // Set canvas pixel buffer size to match chart canvas width
      timelineCanvas.width = bufferWidth;
      timelineCanvas.height = cssHeight * dpr;

      // CSS display size must match chart canvas CSS size
      var chartRect = chartCanvas.getBoundingClientRect();
      timelineCanvas.style.width = chartRect.width + 'px';
      timelineCanvas.style.height = cssHeight + 'px';
    }
    updateTimelineSize();

    // Resize timeline container to fit event lanes
    function resizeTimelineForEvents(evts) {
      if (!evts || evts.length === 0) {
        timelineContainer.style.height = timelineMinH + 'px';
        return;
      }
      var laneInfo = timeline.calculateEventLanes(evts);
      var totalLanes = Math.max(laneInfo.totalLanes, 1);
      var sc = (state.responsiveScaling || {}).vhScale || 1.0;
      var laneH = Math.round(20 + 8 * sc);  // desired height per lane
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

    // Resize handler — recompute scaling and update container sizes
    window.addEventListener('resize', function() {
      window.EventAnnotationsPlot.computeScaling();
      var newScale = state.responsiveScaling.vhScale;
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

    // Click handler for selecting/deselecting events on chart overlay
    overlayCanvas.addEventListener('click', function(e) {
      var rect = overlayCanvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var currentEvents = state.currentEvents || [];
      var clickResult = interactions.detectHover(mouseX, mouseY, currentEvents, state.chartInstance.scales.x, state.chartInstance.chartArea);

      if (clickResult) {
        // Toggle selection: if already selected, deselect; otherwise select
        if (state.hoverState.selectedIndex === clickResult.index) {
          state.hoverState.selectedIndex = -1;
        } else {
          state.hoverState.selectedIndex = clickResult.index;
        }
      } else {
        // Click on empty area deselects
        state.hoverState.selectedIndex = -1;
      }

      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
    });

    // Click handler for selecting/deselecting events on timeline
    timelineCanvas.addEventListener('click', function(e) {
      var rect = timelineCanvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var currentEvents = state.currentEvents || [];
      var clickedIndex = timeline.detectTimelineClick(mouseX, mouseY, currentEvents, state.chartInstance);

      if (clickedIndex >= 0) {
        // Toggle selection: if already selected, deselect; otherwise select
        if (state.hoverState.selectedIndex === clickedIndex) {
          state.hoverState.selectedIndex = -1;
        } else {
          state.hoverState.selectedIndex = clickedIndex;
        }
      } else {
        // Click on empty area deselects
        state.hoverState.selectedIndex = -1;
      }

      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, currentEvents);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, currentEvents);
    });

    // Hover handler for timeline (show pointer cursor on event blocks)
    timelineCanvas.addEventListener('mousemove', function(e) {
      var rect = timelineCanvas.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var currentEvents = state.currentEvents || [];
      var hoveredIndex = timeline.detectTimelineClick(mouseX, mouseY, currentEvents, state.chartInstance);

      if (hoveredIndex >= 0) {
        timelineCanvas.style.cursor = 'pointer';
        // Update hover state to sync with chart
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

      // Pass date range to set explicit x-axis bounds
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

      if (!selectedSite || !startDate || !endDate) {
        return;
      }

      var activeUtility = state.activeUtility;

      // Parallel API calls — each wrapped with .catch() so one failure
      // doesn't prevent the rest of the view from rendering
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

        // Check if dates are already included in exec summary
        var hasInlineDates = execSummary.events.length > 0 &&
          (execSummary.events[0].eventStart || execSummary.events[0].eventEnd);

        if (hasInlineDates) {
          // Dates included — no extra API call needed
          return {
            powerData: powerData,
            siteName: siteName,
            execSummary: execSummary,
            activeUtility: activeUtility,
            totalEventCost: totalEventCost,
            utilityCost: utilityCost
          };
        }

        // Dates not included — fetch separately
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

        // Store raw data for detail panel
        state.siteName = data.siteName;
        state.rawExecSummaryEvents = data.execSummary.events;

        // Update title
        titleDiv.textContent = 'Event Utility Cost Tracking - ' + data.siteName;

        // Update cost widgets from dedicated API calls (modes 2 and 3)
        totalEventCostValueDiv.textContent = '$' + Math.round(data.totalEventCost).toLocaleString();
        utilityCostValueDiv.textContent = '$' + Math.round(data.utilityCost).toLocaleString();

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

          // Calculate duration string
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

          // Format area (square footage)
          var areaStr = null;
          if (evt.eventSF) {
            var sf = parseFloat(evt.eventSF);
            if (!isNaN(sf)) {
              areaStr = sf.toLocaleString() + ' sq ft';
            }
          }

          // Format cost for tooltip display
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
            // Tooltip fields
            duration: durationStr,
            area: areaStr,
            costDisplay: costStr,
            // Raw data for detail panel (preserves per-utility cost breakdown)
            rawData: evt
          };
        }).filter(function(evt) {
          return evt.startTime && !isNaN(evt.startTime.getTime());
        });

        state.currentEvents = chartEvents;

        // Reset visibility
        state.visibilityState = {};
        chartEvents.forEach(function(evt, index) {
          state.visibilityState[index] = true;
        });

        // Build chart data
        var utilityDataObj = {};
        utilityDataObj[data.activeUtility] = data.powerData;
        state.refs.timeSeriesData = utilityDataObj;

        // Store date range for rebuilding chart later
        state.currentDateRange = { startDate: startDate, endDate: endDate };

        // Create chart with explicit date range bounds
        chart.createChart(state.refs.canvas, utilityDataObj, chartEvents, state.currentDateRange);

        // Redraw overlays
        syncOverlaySize();
        resizeTimelineForEvents(chartEvents);
        annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, chartEvents);
        timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, chartEvents);

        // Create events list (with costs shown inline)
        state.refs.eventsContainer.innerHTML = '';
        interactions.createEventList(state.refs.eventsContainer, chartEvents, state.chartInstance);
      })
      .catch(function(error) {
        console.error('loadDataForSite error:', error);
      });
    }

    // If the Events Database was open before this refresh, re-open it.
    // Clear stale saved content first (old DOM nodes were destroyed by view.removeAll())
    if (eventsDatabase && state.eventsDatabaseState && state.eventsDatabaseState.isOpen) {
      state.eventsDatabaseState._savedContent = null;
      eventsDatabase.openPanel(mainContainer, state);
    } else {
      loadDataForSite();
    }

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

      // If Events Database is open, stay in it (user can Search again)
      if (!(eventsDatabase && state.eventsDatabaseState && state.eventsDatabaseState.isOpen)) {
        loadDataForSite();
      }
    });
  });
};
