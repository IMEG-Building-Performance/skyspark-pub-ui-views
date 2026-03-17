/**
 * expandView.js
 * Fullscreen expanded view of the chart with event sidebar.
 * Opens as an overlay modal with its own chart, timeline, and event list.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.expandView = {};

/**
 * Open the expanded chart view.
 * Rebuilds the chart at fullscreen size with event visibility toggles.
 */
window.EventAnnotationsPlot.expandView.open = function(state, interactions, annotations, timeline, chart) {
  // ── Backdrop overlay ─────────────────────────────────────────────
  var backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;animation:expandFadeIn 0.25s ease;';
  document.body.appendChild(backdrop);


  // Close on backdrop click
  backdrop.addEventListener('click', function(e) {
    if (e.target === backdrop) closeExpanded();
  });

  // Close on Escape key
  function onKeyDown(e) {
    if (e.key === 'Escape') closeExpanded();
  }
  document.addEventListener('keydown', onKeyDown);

  // ── Modal container ──────────────────────────────────────────────
  var modal = document.createElement('div');
  modal.style.cssText = 'width:95vw;height:90vh;background:white;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;overflow:hidden;animation:expandSlideUp 0.3s ease;';
  backdrop.appendChild(modal);

  // ── Header bar ───────────────────────────────────────────────────
  var headerBar = document.createElement('div');
  headerBar.style.cssText = 'padding:12px 20px;border-bottom:1px solid #e9ecef;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#f8f9fa;';

  var headerTitle = document.createElement('div');
  headerTitle.style.cssText = 'font-size:16px;font-weight:700;color:#1565c0;';
  headerTitle.textContent = state.siteName ? state.siteName + ' \u2014 Expanded View' : 'Expanded Chart View';

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '\u2715';
  closeBtn.title = 'Close (Esc)';
  closeBtn.style.cssText = 'width:36px;height:36px;border:1px solid #dee2e6;border-radius:8px;background:white;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:#6c757d;';
  closeBtn.onmouseover = function() { closeBtn.style.backgroundColor = '#fee2e2'; closeBtn.style.color = '#dc3545'; closeBtn.style.borderColor = '#dc3545'; };
  closeBtn.onmouseout = function() { closeBtn.style.backgroundColor = 'white'; closeBtn.style.color = '#6c757d'; closeBtn.style.borderColor = '#dee2e6'; };
  closeBtn.onclick = function() { closeExpanded(); };

  headerBar.appendChild(headerTitle);
  headerBar.appendChild(closeBtn);
  modal.appendChild(headerBar);

  // ── Body: chart + sidebar ────────────────────────────────────────
  var body = document.createElement('div');
  body.style.cssText = 'flex:1;display:flex;gap:0;overflow:hidden;';
  modal.appendChild(body);

  // Chart area (left)
  var chartArea = document.createElement('div');
  chartArea.style.cssText = 'flex:1;display:flex;flex-direction:column;padding:16px;min-width:0;';
  body.appendChild(chartArea);

  // Utility toggle for expanded view
  var expUtilityToggle = interactions.createUtilityToggle(function(utilityName) {
    state.activeUtility = utilityName;
    // Rebuild chart in expanded view with new utility
    if (state._refreshUtilityData) state._refreshUtilityData();
    // Also refresh the expanded chart
    rebuildExpandedChart();
  });
  chartArea.appendChild(expUtilityToggle);

  // Canvas wrapper
  var expCanvasWrapper = document.createElement('div');
  expCanvasWrapper.style.cssText = 'flex:1;position:relative;min-height:0;';
  chartArea.appendChild(expCanvasWrapper);

  var expCanvas = document.createElement('canvas');
  expCanvas.id = 'eventAnnotationsChart_expanded';
  expCanvasWrapper.appendChild(expCanvas);

  // Overlay canvas
  var expOverlay = document.createElement('canvas');
  expOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;cursor:default;pointer-events:auto;';
  expCanvasWrapper.appendChild(expOverlay);

  // Timeline
  var expTimelineContainer = document.createElement('div');
  var expS = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var expTimelineH = Math.round(35 + 15 * expS);
  expTimelineContainer.style.cssText = 'width:100%;height:' + expTimelineH + 'px;margin-top:4px;position:relative;overflow:hidden;flex-shrink:0;';
  chartArea.appendChild(expTimelineContainer);

  var expTimelineCanvas = document.createElement('canvas');
  expTimelineCanvas.style.cssText = 'display:block;cursor:pointer;';
  expTimelineContainer.appendChild(expTimelineCanvas);

  // Sidebar (right) — event list with toggles
  var sidebar = document.createElement('div');
  var expSidebarW = Math.round(240 + 80 * expS);
  sidebar.style.cssText = 'width:' + expSidebarW + 'px;border-left:1px solid #e9ecef;overflow-y:auto;flex-shrink:0;background:#f8f9fa;';
  body.appendChild(sidebar);

  // Build event list in sidebar (reuses interactions.createEventList)
  var currentEvents = state.currentEvents || [];
  interactions.createEventList(sidebar, currentEvents, null);

  // ── Build the expanded chart ─────────────────────────────────────
  var expChartInstance = null;

  function rebuildExpandedChart() {
    var currentEvents = state.currentEvents || [];
    var activeUtility = state.activeUtility;
    var utilityDataObj = {};
    if (state.utilityData[activeUtility]) {
      utilityDataObj[activeUtility] = state.utilityData[activeUtility];
    }
    var dateRange = state.currentDateRange || null;

    // Create chart on expanded canvas
    chart.createChart(expCanvas, utilityDataObj, currentEvents, dateRange);
    expChartInstance = state.chartInstance;

    // Sync overlay size
    syncExpOverlay();
    updateExpTimeline();

    // Redraw annotations
    annotations.drawAnnotationOverlay(expChartInstance, expOverlay, currentEvents);
    timeline.drawTimeline(expTimelineCanvas, expChartInstance, currentEvents);
  }

  function syncExpOverlay() {
    var c = expCanvas;
    var o = expOverlay;
    if (o.width !== c.width || o.height !== c.height) {
      o.width = c.width;
      o.height = c.height;
    }
    var rect = c.getBoundingClientRect();
    o.style.width = rect.width + 'px';
    o.style.height = rect.height + 'px';
  }

  function updateExpTimeline() {
    var dpr = window.devicePixelRatio || 1;
    var chartCanvas = expCanvas;
    var bufferWidth = chartCanvas.width;
    var timelineContainerRect = expTimelineContainer.getBoundingClientRect();
    var cssHeight = Math.round(timelineContainerRect.height) || 50;
    expTimelineCanvas.width = bufferWidth;
    expTimelineCanvas.height = cssHeight * dpr;
    var chartRect = chartCanvas.getBoundingClientRect();
    expTimelineCanvas.style.width = chartRect.width + 'px';
    expTimelineCanvas.style.height = cssHeight + 'px';
  }

  // Mouse handlers for expanded overlay
  expOverlay.addEventListener('mousemove', function(e) {
    var rect = expOverlay.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    var mouseY = e.clientY - rect.top;
    var evts = state.currentEvents || [];
    var hoverResult = interactions.detectHover(mouseX, mouseY, evts, expChartInstance.scales.x, expChartInstance.chartArea);

    if (hoverResult) {
      state.hoverState.hoveredEvent = hoverResult.event;
      state.hoverState.hoveredIndex = hoverResult.index;
      state.hoverState.mouseX = mouseX;
      state.hoverState.mouseY = mouseY;
      expOverlay.style.cursor = 'pointer';
    } else {
      state.hoverState.hoveredEvent = null;
      state.hoverState.hoveredIndex = -1;
      expOverlay.style.cursor = 'default';
    }

    annotations.drawAnnotationOverlay(expChartInstance, expOverlay, evts);
    timeline.drawTimeline(expTimelineCanvas, expChartInstance, evts);
  });

  expOverlay.addEventListener('mouseleave', function() {
    state.hoverState.hoveredEvent = null;
    state.hoverState.hoveredIndex = -1;
    var evts = state.currentEvents || [];
    annotations.drawAnnotationOverlay(expChartInstance, expOverlay, evts);
    timeline.drawTimeline(expTimelineCanvas, expChartInstance, evts);
  });

  expOverlay.addEventListener('click', function(e) {
    var rect = expOverlay.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    var mouseY = e.clientY - rect.top;
    var evts = state.currentEvents || [];
    var clickResult = interactions.detectHover(mouseX, mouseY, evts, expChartInstance.scales.x, expChartInstance.chartArea);

    if (clickResult) {
      if (state.hoverState.selectedIndex === clickResult.index) {
        state.hoverState.selectedIndex = -1;
      } else {
        state.hoverState.selectedIndex = clickResult.index;
      }
    } else {
      state.hoverState.selectedIndex = -1;
    }

    annotations.drawAnnotationOverlay(expChartInstance, expOverlay, evts);
    timeline.drawTimeline(expTimelineCanvas, expChartInstance, evts);
  });

  // Timeline hover + click
  expTimelineCanvas.addEventListener('mousemove', function(e) {
    var rect = expTimelineCanvas.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    var mouseY = e.clientY - rect.top;
    var evts = state.currentEvents || [];
    var hoveredIndex = timeline.detectTimelineClick(mouseX, mouseY, evts, expChartInstance);

    if (hoveredIndex >= 0) {
      expTimelineCanvas.style.cursor = 'pointer';
      state.hoverState.hoveredIndex = hoveredIndex;
      state.hoverState.hoveredEvent = evts[hoveredIndex];
    } else {
      expTimelineCanvas.style.cursor = 'default';
      state.hoverState.hoveredIndex = -1;
      state.hoverState.hoveredEvent = null;
    }

    annotations.drawAnnotationOverlay(expChartInstance, expOverlay, evts);
    timeline.drawTimeline(expTimelineCanvas, expChartInstance, evts);
  });

  expTimelineCanvas.addEventListener('click', function(e) {
    var rect = expTimelineCanvas.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    var mouseY = e.clientY - rect.top;
    var evts = state.currentEvents || [];
    var clickedIndex = timeline.detectTimelineClick(mouseX, mouseY, evts, expChartInstance);

    if (clickedIndex >= 0) {
      if (state.hoverState.selectedIndex === clickedIndex) {
        state.hoverState.selectedIndex = -1;
      } else {
        state.hoverState.selectedIndex = clickedIndex;
      }
    } else {
      state.hoverState.selectedIndex = -1;
    }

    annotations.drawAnnotationOverlay(expChartInstance, expOverlay, evts);
    timeline.drawTimeline(expTimelineCanvas, expChartInstance, evts);
  });

  expTimelineCanvas.addEventListener('mouseleave', function() {
    state.hoverState.hoveredEvent = null;
    state.hoverState.hoveredIndex = -1;
    var evts = state.currentEvents || [];
    annotations.drawAnnotationOverlay(expChartInstance, expOverlay, evts);
    timeline.drawTimeline(expTimelineCanvas, expChartInstance, evts);
  });

  // Resize handler for expanded view
  function onResize() {
    if (!backdrop.parentNode) return;
    syncExpOverlay();
    updateExpTimeline();
    var evts = state.currentEvents || [];
    annotations.drawAnnotationOverlay(expChartInstance, expOverlay, evts);
    timeline.drawTimeline(expTimelineCanvas, expChartInstance, evts);
  }
  window.addEventListener('resize', onResize);

  // ── Initial render (short delay to let modal layout settle) ──────
  setTimeout(function() {
    rebuildExpandedChart();
  }, 100);

  // ── Save refs for the original chart to restore on close ─────────
  var savedChartInstance = state.chartInstance;
  var savedOverlayCanvas = state.overlayCanvas;
  var savedTimelineCanvas = state.timelineCanvas;
  var savedRefs = state.refs;

  // ── Close handler ────────────────────────────────────────────────
  function closeExpanded() {
    // Remove event listeners
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);

    // Reset hover state
    state.hoverState.hoveredEvent = null;
    state.hoverState.hoveredIndex = -1;
    state.hoverState.selectedIndex = -1;

    // Destroy expanded chart if it exists
    if (expChartInstance && expChartInstance.destroy) {
      expChartInstance.destroy();
    }

    // Restore original chart references
    state.chartInstance = savedChartInstance;
    state.overlayCanvas = savedOverlayCanvas;
    state.timelineCanvas = savedTimelineCanvas;
    state.refs = savedRefs;

    // Remove modal
    if (backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }

    // Redraw original chart overlays to sync state
    if (savedChartInstance && savedOverlayCanvas) {
      var evts = state.currentEvents || [];
      if (state._syncOverlaySize) state._syncOverlaySize();
      annotations.drawAnnotationOverlay(savedChartInstance, savedOverlayCanvas, evts);
      if (savedTimelineCanvas) {
        timeline.drawTimeline(savedTimelineCanvas, savedChartInstance, evts);
      }
    }
  }
};
