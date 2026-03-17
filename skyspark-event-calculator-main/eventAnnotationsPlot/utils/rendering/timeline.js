window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.timeline = {};

/**
 * Detect click on timeline event blocks.
 *
 * COORDINATE SYSTEM:
 * - mouseX, mouseY: CSS pixels relative to timeline canvas
 * - chartArea: CSS pixels from Chart.js
 * - xScale.getPixelForValue(): CSS pixels from Chart.js
 * - Timeline canvas buffer is DPR-scaled, but we work in CSS coords here
 *
 * Returns the event index if clicked, or -1 if no event was clicked
 */
window.EventAnnotationsPlot.timeline.detectTimelineClick = function(mouseX, mouseY, events, chartInstance) {
  var xScale = chartInstance.scales.x;
  var chartArea = chartInstance.chartArea;  // CSS pixels
  var visibilityState = window.EventAnnotationsPlot.state.visibilityState;
  var timelineCanvas = window.EventAnnotationsPlot.state.timelineCanvas;

  if (!timelineCanvas || !events || events.length === 0) return -1;

  // Get CSS dimensions of timeline
  var cssHeight = parseFloat(timelineCanvas.style.height) || 56;

  // Calculate lane info
  var laneInfo = window.EventAnnotationsPlot.timeline.calculateEventLanes(events);
  var eventLanes = laneInfo.eventLanes;
  var totalLanes = Math.max(laneInfo.totalLanes, 1);

  // Dimensions in CSS pixels (scaled)
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var topPad = Math.round(2 + 2 * s);
  var bottomPad = Math.round(2 + 2 * s);
  var laneGap = 2;
  var usableHeight = cssHeight - topPad - bottomPad;
  var maxLaneHeight = Math.round(16 + 6 * s);
  var laneHeight = Math.min((usableHeight - laneGap * (totalLanes - 1)) / totalLanes, maxLaneHeight);

  for (var i = 0; i < events.length; i++) {
    if (visibilityState[i] === false) continue;

    var event = events[i];
    var lane = eventLanes[i];
    var startTime = event.startTime || event.time;
    var endTime = event.endTime || event.time;

    // Get x positions in CSS pixels from Chart.js scale
    var x1 = xScale.getPixelForValue(startTime);
    var x2 = xScale.getPixelForValue(endTime);

    // Clip to chart area
    if (x2 < chartArea.left || x1 > chartArea.right) continue;
    x1 = Math.max(x1, chartArea.left + 1);
    x2 = Math.min(x2, chartArea.right - 1);

    var blockWidth = Math.max(x2 - x1, 4);
    var y = topPad + lane * (laneHeight + laneGap);
    var bh = laneHeight;

    // Check if click is within this block (all in CSS pixels)
    if (mouseX >= x1 && mouseX <= x1 + blockWidth &&
        mouseY >= y && mouseY <= y + bh) {
      return i;
    }
  }

  return -1;
};

/**
 * Calculate lane assignments for overlapping events
 */
window.EventAnnotationsPlot.timeline.calculateEventLanes = function(events) {
  var lanes = [];
  var eventLanes = new Array(events.length);

  events.forEach(function(event, index) {
    var startTime = event.startTime ? event.startTime.getTime() : event.time.getTime();
    var endTime = event.endTime ? event.endTime.getTime() : startTime;

    // Find the first available lane
    var laneIndex = 0;
    while (true) {
      var conflict = false;

      // Check if this lane has any conflicts
      if (lanes[laneIndex]) {
        for (var i = 0; i < lanes[laneIndex].length; i++) {
          var otherIndex = lanes[laneIndex][i];
          var otherEvent = events[otherIndex];
          var otherStart = otherEvent.startTime ? otherEvent.startTime.getTime() : otherEvent.time.getTime();
          var otherEnd = otherEvent.endTime ? otherEvent.endTime.getTime() : otherStart;

          // Check for overlap
          if (!(endTime <= otherStart || startTime >= otherEnd)) {
            conflict = true;
            break;
          }
        }
      }

      if (!conflict) {
        // Found an available lane
        if (!lanes[laneIndex]) {
          lanes[laneIndex] = [];
        }
        lanes[laneIndex].push(index);
        eventLanes[index] = laneIndex;
        break;
      }

      laneIndex++;
    }
  });

  return {
    eventLanes: eventLanes,
    totalLanes: lanes.length
  };
};

/**
 * Draw event timeline track aligned to the chart's x-axis.
 *
 * COORDINATE SYSTEM:
 * - Canvas buffer is DPR-scaled for sharp rendering
 * - Chart.js chartArea and xScale are in CSS pixels
 * - We scale all drawing operations by DPR
 */
window.EventAnnotationsPlot.timeline.drawTimeline = function(timelineCanvas, chartInstance, events) {
  var ctx = timelineCanvas.getContext('2d');
  var xScale = chartInstance.scales.x;
  var chartArea = chartInstance.chartArea;  // CSS pixels
  var dpr = window.devicePixelRatio || 1;

  // Canvas buffer dimensions (DPR-scaled)
  var bufferWidth = timelineCanvas.width;
  var bufferHeight = timelineCanvas.height;

  // CSS dimensions
  var cssHeight = parseFloat(timelineCanvas.style.height) || 56;

  // Clear canvas
  ctx.clearRect(0, 0, bufferWidth, bufferHeight);

  if (!events || events.length === 0) return;

  // Calculate lane assignments
  var laneInfo = window.EventAnnotationsPlot.timeline.calculateEventLanes(events);
  var eventLanes = laneInfo.eventLanes;
  var totalLanes = Math.max(laneInfo.totalLanes, 1);

  var visibilityState = window.EventAnnotationsPlot.state.visibilityState;
  var hoverState = window.EventAnnotationsPlot.state.hoverState;

  // ── Dimensions in CSS pixels (scaled) ───────────────────────────────
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var topPad = Math.round(2 + 2 * s);
  var bottomPad = Math.round(2 + 2 * s);
  var laneGap = 2;
  var usableHeight = cssHeight - topPad - bottomPad;
  var maxLaneHeight = Math.round(16 + 6 * s);
  var laneHeight = Math.min((usableHeight - laneGap * (totalLanes - 1)) / totalLanes, maxLaneHeight);
  var blockRadius = 3;

  // Chart area bounds (CSS pixels)
  var plotLeft = chartArea.left;
  var plotRight = chartArea.right;
  var plotWidth = plotRight - plotLeft;

  // ── Subtle background behind the plot area ─────────────────────────
  ctx.fillStyle = '#f5f6f8';
  ctx.beginPath();
  ctx.roundRect(plotLeft * dpr, 0, plotWidth * dpr, bufferHeight, 4 * dpr);
  ctx.fill();

  // Thin lane separator lines
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1 * dpr;
  for (var i = 1; i < totalLanes; i++) {
    var lineY = (topPad + i * (laneHeight + laneGap) - laneGap / 2) * dpr;
    ctx.beginPath();
    ctx.moveTo((plotLeft + 4) * dpr, lineY);
    ctx.lineTo((plotRight - 4) * dpr, lineY);
    ctx.stroke();
  }

  // ── Draw event blocks ──────────────────────────────────────────────
  events.forEach(function(event, index) {
    if (visibilityState[index] === false) return;

    var isHovered = hoverState.hoveredIndex === index;
    var isSelected = hoverState.selectedIndex === index;
    var isHighlighted = isHovered || isSelected;
    var anyHighlighted = hoverState.hoveredIndex >= 0 || hoverState.selectedIndex >= 0;
    var lane = eventLanes[index];
    var startTime = event.startTime || event.time;
    var endTime = event.endTime || event.time;

    // Get x positions in CSS pixels from Chart.js scale
    var x1 = xScale.getPixelForValue(startTime);
    var x2 = xScale.getPixelForValue(endTime);

    // Clip to plot area (CSS pixels)
    if (x2 < plotLeft || x1 > plotRight) return;
    x1 = Math.max(x1, plotLeft + 1);
    x2 = Math.min(x2, plotRight - 1);

    // Calculate dimensions in CSS pixels
    var blockWidth = Math.max(x2 - x1, 4);
    var y = topPad + lane * (laneHeight + laneGap);
    var bh = laneHeight;

    // ── Determine opacity ────────────────────────────────────────
    var alpha = 1;
    if (anyHighlighted && !isHighlighted) alpha = 0.3;

    // ── Block fill (scale to DPR for drawing) ────────────────────
    var baseColor = event.color || 'rgba(100,100,100,0.8)';
    ctx.save();
    ctx.globalAlpha = alpha;

    // All drawing coords scaled by DPR
    var dx1 = x1 * dpr;
    var dy = y * dpr;
    var dBlockWidth = blockWidth * dpr;
    var dBh = bh * dpr;
    var dRadius = blockRadius * dpr;

    // Rounded rectangle block
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.roundRect(dx1, dy, dBlockWidth, dBh, dRadius);
    ctx.fill();

    // Subtle top highlight
    var grad = ctx.createLinearGradient(0, dy, 0, dy + dBh);
    grad.addColorStop(0, 'rgba(255,255,255,0.25)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(dx1, dy, dBlockWidth, dBh, dRadius);
    ctx.fill();

    // Highlight ring (for both hover and selection)
    if (isHighlighted) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.roundRect(dx1 - 1 * dpr, dy - 1 * dpr, dBlockWidth + 2 * dpr, dBh + 2 * dpr, dRadius + 1 * dpr);
      ctx.stroke();

      ctx.strokeStyle = baseColor.replace('0.8', '1.0');
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.roundRect(dx1 - 2 * dpr, dy - 2 * dpr, dBlockWidth + 4 * dpr, dBh + 4 * dpr, dRadius + 2 * dpr);
      ctx.stroke();
    }

    // ── Label ────────────────────────────────────────────────────
    var minBlockForLabel = Math.round(40 + 10 * s);
    if (blockWidth > minBlockForLabel) {
      var labelFontSize = Math.round((8 + 2 * s) * dpr);
      ctx.fillStyle = '#fff';
      ctx.font = '600 ' + labelFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      var labelText = event.label;
      var maxLabelWidth = (blockWidth - 10) * dpr;
      var metrics = ctx.measureText(labelText);
      if (metrics.width > maxLabelWidth) {
        while (metrics.width > maxLabelWidth && labelText.length > 0) {
          labelText = labelText.substring(0, labelText.length - 1);
          metrics = ctx.measureText(labelText + '\u2026');
        }
        labelText += '\u2026';
      }

      // Text shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 2 * dpr;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1 * dpr;
      ctx.fillText(labelText, dx1 + 5 * dpr, dy + dBh / 2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  });
};
