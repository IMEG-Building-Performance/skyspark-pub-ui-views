/**
 * SiteStatus.js — Tab 4: Live utility consumption with event annotations
 *
 * Wraps the V1 chart infrastructure (Chart.js, overlay canvas, event timeline)
 * into a self-contained tab component.
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.siteStatus = {};

window.EventCostV2.siteStatus.render = function(container, onChartReady) {
  var state        = window.EventCostV2.state;
  var interactions = window.EventCostV2.interactions;
  var annotations  = window.EventCostV2.annotations;
  var timeline     = window.EventCostV2.timeline;
  var chart        = window.EventCostV2.chart;
  var loader       = window.EventCostV2.loader;
  var api          = window.EventCostV2.api;

  container.innerHTML = '';
  container.style.padding = '24px 28px';

  var rs = state.responsiveScaling;

  // ── Plot card ────────────────────────────────────────────────────
  var plotSection = document.createElement('div');
  plotSection.className = 'ss-plot-card';
  container.appendChild(plotSection);

  var plotHeader = document.createElement('div');
  plotHeader.className = 'ss-plot-header';
  plotSection.appendChild(plotHeader);

  var plotTitle = document.createElement('div');
  plotTitle.className = 'ss-plot-title';
  plotTitle.textContent = 'Utility Consumption with Event Annotations';
  plotHeader.appendChild(plotTitle);

  var plotBtns = document.createElement('div');
  plotBtns.className = 'ss-header-btns';
  plotHeader.appendChild(plotBtns);

  function makeHeaderBtn(label, onClick) {
    var b = document.createElement('button');
    b.className = 'ss-header-btn';
    b.textContent = label;
    b.onclick = onClick;
    plotBtns.appendChild(b);
    return b;
  }

  makeHeaderBtn('Show All', function() {
    var evts = state.currentEvents || [];
    evts.forEach(function(_, i) { state.visibilityState[i] = true; });
    redraw();
  });
  makeHeaderBtn('Hide All', function() {
    var evts = state.currentEvents || [];
    evts.forEach(function(_, i) { state.visibilityState[i] = false; });
    redraw();
  });

  var plotBody = document.createElement('div');
  plotBody.className = 'ss-plot-body';
  plotSection.appendChild(plotBody);

  // ── Chart container ───────────────────────────────────────────
  var chartH = Math.max(450, Math.min(Math.round(window.innerHeight * 0.6), 800));
  var chartContainer = document.createElement('div');
  chartContainer.style.cssText = 'width:100%;height:' + chartH + 'px;box-sizing:border-box;position:relative;display:flex;flex-direction:column;';
  plotBody.appendChild(chartContainer);

  var utilityToggleBar = interactions.createUtilityToggle(function(utilityName) {
    state.activeUtility = utilityName;
    if (state._siteStatus_refreshUtility) state._siteStatus_refreshUtility();
  });
  chartContainer.appendChild(utilityToggleBar);

  // Expand button
  var btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'position:absolute;top:4px;right:4px;z-index:20;display:flex;gap:6px;';
  chartContainer.appendChild(btnGroup);

  var expandBtn = document.createElement('button');
  expandBtn.className = 'ss-expand-btn';
  expandBtn.title = 'Expand chart';
  expandBtn.textContent = '⛶';
  expandBtn.onclick = function() {
    if (window.EventCostV2.expandView) {
      window.EventCostV2.expandView.open(state, interactions, annotations, timeline, chart);
    }
  };
  btnGroup.appendChild(expandBtn);

  var canvasMinH = Math.round(200 + 60 * rs.vhScale);
  var canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = 'width:100%;flex:1;min-height:' + canvasMinH + 'px;position:relative;';
  chartContainer.appendChild(canvasWrapper);

  var canvas = document.createElement('canvas');
  canvas.id = 'ecv2-siteStatusChart';
  canvasWrapper.appendChild(canvas);

  // Timeline
  var timelineMinH = Math.round(60 + 60 * rs.vhScale);
  var timelineMaxH = Math.round(160 + 80 * rs.vhScale);
  var timelineWrapper = document.createElement('div');
  timelineWrapper.style.cssText = 'width:100%;margin-top:4px;flex-shrink:0;';
  chartContainer.appendChild(timelineWrapper);

  var timelineHeader = document.createElement('div');
  timelineHeader.className = 'ss-timeline-header';
  timelineWrapper.appendChild(timelineHeader);

  var timelineLabel = document.createElement('span');
  timelineLabel.className = 'ss-timeline-label';
  timelineLabel.textContent = 'Event Timeline';
  timelineHeader.appendChild(timelineLabel);

  var timelineToggle = document.createElement('button');
  timelineToggle.className = 'ss-timeline-toggle';
  timelineHeader.appendChild(timelineToggle);

  var timelineContainer = document.createElement('div');
  timelineContainer.style.cssText = 'width:100%;height:' + timelineMinH + 'px;max-height:' + timelineMaxH + 'px;position:relative;overflow-y:auto;overflow-x:hidden;';
  timelineWrapper.appendChild(timelineContainer);

  function applyTimelineToggle() {
    timelineContainer.style.display = state.timelineHidden ? 'none' : 'block';
    timelineToggle.textContent = state.timelineHidden ? 'Show' : 'Hide';
  }
  applyTimelineToggle();

  timelineHeader.onclick = function() {
    state.timelineHidden = !state.timelineHidden;
    applyTimelineToggle();
    setTimeout(function() {
      if (state.chartInstance) state.chartInstance.resize();
      if (state._syncOverlaySize) state._syncOverlaySize();
      var ce = state.currentEvents || [];
      if (state.chartInstance && state.overlayCanvas) annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, ce);
      if (!state.timelineHidden && state.chartInstance && state.timelineCanvas) {
        if (state._resizeTimelineForEvents) state._resizeTimelineForEvents(ce);
        timeline.drawTimeline(state.timelineCanvas, state.chartInstance, ce);
      }
    }, 50);
  };

  // Loading placeholder
  var loadingMsg = document.createElement('div');
  loadingMsg.className = 'ss-loading';
  loadingMsg.innerHTML = '<div class="edb-spinner" style="width:36px;height:36px;margin:0 auto;"></div><div class="ss-loading-text">Loading chart data…</div>';
  chartContainer.appendChild(loadingMsg);

  function redraw() {
    if (state.chartInstance && state.overlayCanvas) {
      var ce = state.currentEvents || [];
      annotations.drawAnnotationOverlay(state.chartInstance, state.overlayCanvas, ce);
      if (state.refs) timeline.drawTimeline(state.refs.timelineCanvas, state.chartInstance, ce);
    }
  }

  // ── Init Chart.js ─────────────────────────────────────────────
  loader.loadChartJs(function() {
    if (loadingMsg.parentNode) loadingMsg.parentNode.removeChild(loadingMsg);

    var placeholder = document.createElement('div');
    placeholder.className = 'ss-placeholder';
    placeholder.innerHTML = '<div class="ss-placeholder-icon">▦</div><div class="ss-placeholder-text">Select a site and date range</div>';
    chartContainer.appendChild(placeholder);
    state.siteStatusPlaceholder = placeholder;

    chart.createChart(canvas, [], [], null);

    // Overlay canvas
    var overlayCanvas = document.createElement('canvas');
    overlayCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;cursor:default;pointer-events:auto;';
    canvasWrapper.appendChild(overlayCanvas);
    state.overlayCanvas = overlayCanvas;

    function syncOverlaySize() {
      var c = state.refs && state.refs.canvas ? state.refs.canvas : canvas;
      var o = overlayCanvas;
      if (o.width !== c.width || o.height !== c.height) { o.width = c.width; o.height = c.height; }
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
      var cssH = Math.round(timelineContainer.getBoundingClientRect().height) || 56;
      timelineCanvas.width = bufferWidth;
      timelineCanvas.height = cssH * dpr;
      var chartRect = chartCanvas.getBoundingClientRect();
      timelineCanvas.style.width = chartRect.width + 'px';
      timelineCanvas.style.height = cssH + 'px';
    }
    updateTimelineSize();

    function resizeTimelineForEvents(evts) {
      if (!evts || evts.length === 0) { timelineContainer.style.height = timelineMinH + 'px'; return; }
      var laneInfo = timeline.calculateEventLanes(evts);
      var totalLanes = Math.max(laneInfo.totalLanes, 1);
      var sc = (state.responsiveScaling || {}).vhScale || 1.0;
      var laneH = Math.round(20 + 8 * sc);
      var pad = Math.round(4 + 4 * sc);
      var needed = totalLanes * laneH + (totalLanes - 1) * 2 + pad * 2;
      var h = Math.max(timelineMinH, Math.min(needed, timelineMaxH));
      timelineContainer.style.height = h + 'px';
      updateTimelineSize();
    }
    state._resizeTimelineForEvents = resizeTimelineForEvents;

    // Mouse events
    overlayCanvas.addEventListener('mousemove', function(e) {
      var rect = overlayCanvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var ce = state.currentEvents || [];
      var hover = interactions.detectHover(mx, my, ce, state.chartInstance.scales.x, state.chartInstance.chartArea);
      state.hoverState.hoveredEvent = hover ? hover.event : null;
      state.hoverState.hoveredIndex = hover ? hover.index : -1;
      state.hoverState.mouseX = mx; state.hoverState.mouseY = my;
      overlayCanvas.style.cursor = hover ? 'pointer' : 'default';
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, ce);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, ce);
    });

    overlayCanvas.addEventListener('mouseleave', function() {
      state.hoverState.hoveredEvent = null; state.hoverState.hoveredIndex = -1;
      var ce = state.currentEvents || [];
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, ce);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, ce);
    });

    overlayCanvas.addEventListener('click', function(e) {
      var rect = overlayCanvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var ce = state.currentEvents || [];
      var click = interactions.detectHover(mx, my, ce, state.chartInstance.scales.x, state.chartInstance.chartArea);
      if (click) {
        state.hoverState.selectedIndex = state.hoverState.selectedIndex === click.index ? -1 : click.index;
      } else { state.hoverState.selectedIndex = -1; }
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, ce);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, ce);
    });

    timelineCanvas.addEventListener('click', function(e) {
      var rect = timelineCanvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var ce = state.currentEvents || [];
      var idx = timeline.detectTimelineClick(mx, my, ce, state.chartInstance);
      state.hoverState.selectedIndex = (idx >= 0 && state.hoverState.selectedIndex !== idx) ? idx : -1;
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, ce);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, ce);
    });

    timelineCanvas.addEventListener('mousemove', function(e) {
      var rect = timelineCanvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var ce = state.currentEvents || [];
      var idx = timeline.detectTimelineClick(mx, my, ce, state.chartInstance);
      timelineCanvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
      state.hoverState.hoveredIndex = idx >= 0 ? idx : -1;
      state.hoverState.hoveredEvent = idx >= 0 ? ce[idx] : null;
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, ce);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, ce);
    });

    timelineCanvas.addEventListener('mouseleave', function() {
      state.hoverState.hoveredEvent = null; state.hoverState.hoveredIndex = -1;
      var ce = state.currentEvents || [];
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, ce);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, ce);
    });

    state.refs = {
      canvas: canvas,
      overlayCanvas: overlayCanvas,
      timelineCanvas: timelineCanvas,
      canvasWrapper: canvasWrapper
    };

    // Refresh utility data function
    function refreshUtilityData() {
      var site = state._selectedSite;
      var startDate = state._startDate;
      var endDate   = state._endDate;
      if (!site || !startDate || !endDate) return;
      var active = state.activeUtility;

      if (state.utilityData[active]) {
        rebuildChart();
      } else {
        api.loadPowerData(site, startDate, endDate, active).then(function(data) {
          state.utilityData[active] = data;
          rebuildChart();
        }).catch(function() {});
      }
    }
    state._siteStatus_refreshUtility = refreshUtilityData;

    function rebuildChart() {
      if (state.siteStatusPlaceholder) state.siteStatusPlaceholder.style.display = 'none';
      var active = state.activeUtility;
      var activeData = {};
      if (state.utilityData[active]) activeData[active] = state.utilityData[active];
      var ce = state.currentEvents || [];
      var dr = state.currentDateRange || { startDate: state._startDate, endDate: state._endDate };
      chart.createChart(canvas, activeData, ce, dr);
      state.refs.timeSeriesData = activeData;
      syncOverlaySize();
      resizeTimelineForEvents(ce);
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, ce);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, ce);
    }

    // Initial draw
    timeline.drawTimeline(timelineCanvas, state.chartInstance, []);
    annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, []);

    window.addEventListener('resize', function() {
      window.EventCostV2.computeScaling();
      var newH = Math.max(450, Math.min(Math.round(window.innerHeight * 0.6), 800));
      chartContainer.style.height = newH + 'px';
      syncOverlaySize();
      updateTimelineSize();
      var ce = state.currentEvents || [];
      annotations.drawAnnotationOverlay(state.chartInstance, overlayCanvas, ce);
      timeline.drawTimeline(timelineCanvas, state.chartInstance, ce);
    });

    if (onChartReady) onChartReady({ refreshUtilityData: refreshUtilityData, rebuildChart: rebuildChart, syncOverlaySize: syncOverlaySize, resizeTimelineForEvents: resizeTimelineForEvents });
  });
};
