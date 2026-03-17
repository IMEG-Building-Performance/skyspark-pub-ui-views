window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.annotations = {};

/**
 * Draw the annotation overlay with all events
 * Handles rendering order so hovered events appear on top
 */
window.EventAnnotationsPlot.annotations.drawAnnotationOverlay = function(chartInstance, overlayCanvas, events) {
  var ctx = overlayCanvas.getContext('2d');
  var rawChartArea = chartInstance.chartArea;
  var yScale = chartInstance.scales.y;

  // Chart.js reports chartArea in CSS coordinates, but the overlay canvas
  // pixel buffer is scaled by devicePixelRatio. Scale the coordinates.
  var dpr = window.devicePixelRatio || 1;
  var chartArea = {
    top: rawChartArea.top * dpr,
    bottom: rawChartArea.bottom * dpr,
    left: rawChartArea.left * dpr,
    right: rawChartArea.right * dpr
  };

  // Clear the overlay
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  // Get the x-axis scale
  var xScale = chartInstance.scales.x;

  // Helper to get scaled pixel value from xScale
  function getScaledX(value) {
    return xScale.getPixelForValue(value) * dpr;
  }

  // Calculate label positions to avoid overlaps (uses raw chartArea for layout)
  var labelPositions = window.EventAnnotationsPlot.labels.calculateLabelPositions(
    events,
    xScale,
    rawChartArea
  );

  var hoverState = window.EventAnnotationsPlot.state.hoverState;
  var visibilityState = window.EventAnnotationsPlot.state.visibilityState;

  // Check for both hover and selection
  var anyHighlighted = hoverState.hoveredIndex >= 0 || hoverState.selectedIndex >= 0;

  // Draw non-highlighted events first (so highlighted event appears on top)
  events.forEach(function(event, index) {
    // Skip hidden events
    if (visibilityState[index] === false) return;

    var isHovered = hoverState.hoveredIndex === index;
    var isSelected = hoverState.selectedIndex === index;
    var isHighlighted = isHovered || isSelected;
    if (isHighlighted) return; // Skip highlighted event for now

    var isSpanEvent = event.startTime && event.endTime;

    if (isSpanEvent) {
      // Get scaled pixel coordinates
      var startPixel = getScaledX(event.startTime);
      var endPixel = getScaledX(event.endTime);

      if (!isFinite(startPixel) || !isFinite(endPixel)) {
        return;
      }

      // Draw time-span annotation (shaded region)
      window.EventAnnotationsPlot.annotations.drawSpanAnnotation(
        ctx,
        startPixel,
        endPixel,
        chartArea,
        event.color,
        isHighlighted,
        anyHighlighted
      );
    } else {
      // Draw point annotation (vertical line)
      var xPixel = getScaledX(event.time);
      var rawXPixel = xScale.getPixelForValue(event.time);

      if (rawXPixel >= rawChartArea.left && rawXPixel <= rawChartArea.right) {
        var labelPos = labelPositions[index] * dpr;

        window.EventAnnotationsPlot.annotations.drawAnnotationLine(
          ctx,
          xPixel,
          chartArea,
          event.color,
          isHighlighted
        );

        window.EventAnnotationsPlot.labels.drawAnnotationLabel(
          ctx,
          xPixel,
          labelPos,
          event.label,
          event.color,
          chartArea,
          isHighlighted
        );
      }
    }
  });

  // Determine which event to draw on top (hovered takes priority over selected)
  var highlightedIndex = hoverState.hoveredIndex >= 0 ? hoverState.hoveredIndex : hoverState.selectedIndex;

  // Now draw highlighted event on top (if any)
  if (highlightedIndex >= 0 && visibilityState[highlightedIndex] !== false) {
    var highlightedEvent = events[highlightedIndex];
    if (!highlightedEvent) return; // Guard against invalid index
    var isSpanEvent = highlightedEvent.startTime && highlightedEvent.endTime;

    if (isSpanEvent) {
      // Get scaled pixel coordinates
      var startPixel = getScaledX(highlightedEvent.startTime);
      var endPixel = getScaledX(highlightedEvent.endTime);

      if (isFinite(startPixel) && isFinite(endPixel)) {
        window.EventAnnotationsPlot.annotations.drawSpanAnnotation(
          ctx,
          startPixel,
          endPixel,
          chartArea,
          highlightedEvent.color,
          true,
          anyHighlighted
        );
      }
    } else {
      var xPixel = getScaledX(highlightedEvent.time);
      var rawXPixel = xScale.getPixelForValue(highlightedEvent.time);

      if (rawXPixel >= rawChartArea.left && rawXPixel <= rawChartArea.right) {
        var labelPos = labelPositions[highlightedIndex] * dpr;

        window.EventAnnotationsPlot.annotations.drawAnnotationLine(
          ctx,
          xPixel,
          chartArea,
          highlightedEvent.color,
          true
        );

        window.EventAnnotationsPlot.labels.drawAnnotationLabel(
          ctx,
          xPixel,
          labelPos,
          highlightedEvent.label,
          highlightedEvent.color,
          chartArea,
          true
        );

        // Draw bold marker on hover (pass scaled xPixel)
        window.EventAnnotationsPlot.tooltips.drawHoverMarker(
          ctx,
          chartInstance,
          xPixel,
          highlightedEvent
        );
      }
    }
  }

  // Draw rich tooltip on hover (mouse coords are in CSS space, scale them)
  if (hoverState.hoveredEvent) {
    window.EventAnnotationsPlot.tooltips.drawRichTooltip(
      ctx,
      hoverState.hoveredEvent,
      hoverState.mouseX * dpr,
      hoverState.mouseY * dpr,
      chartArea
    );
  }
};

/**
 * Draw vertical annotation line with enhanced highlight effect
 * Supports both point markers and future time-span ranges
 */
window.EventAnnotationsPlot.annotations.drawAnnotationLine = function(ctx, xPixel, chartArea, color, isHovered) {
  var style = window.EventAnnotationsPlot.state.annotationStyle;
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var baseLineWidth = Math.round((2 + 2 * s) * 10) / 10;
  var baseGlowWidth = Math.round(8 + 4 * s);
  var lineWidth = isHovered ? baseLineWidth * 1.5 : baseLineWidth;
  var glowWidth = isHovered ? baseGlowWidth * 1.8 : baseGlowWidth;
  var glowOpacity = isHovered ? style.glowOpacity * 1.5 : style.glowOpacity;

  // Draw wide highlight glow behind the line (optional)
  if (style.useGlow) {
    var glowGradient = ctx.createLinearGradient(
      xPixel - glowWidth / 2,
      chartArea.top,
      xPixel + glowWidth / 2,
      chartArea.top
    );
    glowGradient.addColorStop(0, color.replace('0.8', '0'));
    glowGradient.addColorStop(0.5, color.replace('0.8', Math.min(glowOpacity, 0.5).toString()));
    glowGradient.addColorStop(1, color.replace('0.8', '0'));

    ctx.fillStyle = glowGradient;
    ctx.fillRect(
      xPixel - glowWidth / 2,
      chartArea.top,
      glowWidth,
      chartArea.bottom - chartArea.top
    );
  }

  // Create vertical gradient for the main line
  var lineGradient = ctx.createLinearGradient(xPixel, chartArea.top, xPixel, chartArea.bottom);
  var midOpacity = isHovered ? '1.0' : '0.95';
  lineGradient.addColorStop(0, color.replace('0.8', '0.4'));
  lineGradient.addColorStop(0.1, color.replace('0.8', midOpacity));
  lineGradient.addColorStop(0.9, color.replace('0.8', midOpacity));
  lineGradient.addColorStop(1, color.replace('0.8', '0.4'));

  // Draw shadow for depth (optional)
  if (style.useShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, ' + style.shadowOpacity + ')';
    ctx.shadowBlur = isHovered ? style.shadowBlur * 1.5 : style.shadowBlur;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  // Draw the main line with gradient
  ctx.beginPath();
  ctx.strokeStyle = lineGradient;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.moveTo(xPixel, chartArea.top);
  ctx.lineTo(xPixel, chartArea.bottom);
  ctx.stroke();

  // Draw bright highlight line on top
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.strokeStyle = color.replace('0.8', '1.0');
  ctx.lineWidth = isHovered ? 2.5 : 1.5;
  ctx.moveTo(xPixel - 0.5, chartArea.top);
  ctx.lineTo(xPixel - 0.5, chartArea.bottom);
  ctx.stroke();

  // Reset shadow
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};

/**
 * Draw time-span annotation (shaded region)
 * Supports hover-based priority with opacity adjustments
 */
window.EventAnnotationsPlot.annotations.drawSpanAnnotation = function(ctx, startX, endX, chartArea, color, isHovered, anyHovered) {
  var style = window.EventAnnotationsPlot.state.annotationStyle;
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;

  // Validate input coordinates
  if (!isFinite(startX) || !isFinite(endX)) {
    return;
  }

  // Ensure proper ordering
  var x1 = Math.min(startX, endX);
  var x2 = Math.max(startX, endX);
  var width = x2 - x1;

  // Clip to chart area
  if (x2 < chartArea.left || x1 > chartArea.right) return;
  x1 = Math.max(x1, chartArea.left);
  x2 = Math.min(x2, chartArea.right);
  width = x2 - x1;

  // Determine opacity based on hover state
  var fillOpacityLow, fillOpacityHigh, borderOpacity, barOpacity;

  if (isHovered) {
    // Hovered event: high opacity
    fillOpacityLow = 0.6;
    fillOpacityHigh = 0.8;
    borderOpacity = 1.0;
    barOpacity = 1.0;
  } else if (anyHovered) {
    // Non-hovered event when something else is hovered: very low opacity
    fillOpacityLow = 0.08;
    fillOpacityHigh = 0.12;
    borderOpacity = 0.2;
    barOpacity = 0.25;
  } else {
    // Normal state: medium opacity
    fillOpacityLow = 0.15;
    fillOpacityHigh = 0.25;
    borderOpacity = 0.8;
    barOpacity = 0.7;
  }

  // Draw shadow behind the span (optional)
  if (style.useShadow && isHovered) {
    ctx.shadowColor = 'rgba(0, 0, 0, ' + style.shadowOpacity + ')';
    ctx.shadowBlur = style.shadowBlur;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  // Draw semi-transparent filled region with dynamic opacity
  var fillGradient = ctx.createLinearGradient(x1, chartArea.top, x2, chartArea.top);
  fillGradient.addColorStop(0, color.replace('0.8', fillOpacityLow.toString()));
  fillGradient.addColorStop(0.5, color.replace('0.8', fillOpacityHigh.toString()));
  fillGradient.addColorStop(1, color.replace('0.8', fillOpacityLow.toString()));

  ctx.fillStyle = fillGradient;
  ctx.fillRect(x1, chartArea.top, width, chartArea.bottom - chartArea.top);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw border lines at start and end with dynamic opacity
  ctx.strokeStyle = color.replace('0.8', borderOpacity.toString());
  ctx.lineWidth = isHovered ? Math.round(2 + 1 * s) : Math.round(1.5 + 0.5 * s);

  ctx.beginPath();
  ctx.moveTo(x1, chartArea.top);
  ctx.lineTo(x1, chartArea.bottom);
  ctx.moveTo(x2, chartArea.top);
  ctx.lineTo(x2, chartArea.bottom);
  ctx.stroke();

  // Draw top bar connecting the span with dynamic opacity
  var barHeight = isHovered ? Math.round(3 + 2 * s) : Math.round(2 + 2 * s);
  var barGradient = ctx.createLinearGradient(x1, 0, x2, 0);
  barGradient.addColorStop(0, color.replace('0.8', (barOpacity * 0.7).toString()));
  barGradient.addColorStop(0.5, color.replace('0.8', barOpacity.toString()));
  barGradient.addColorStop(1, color.replace('0.8', (barOpacity * 0.7).toString()));

  ctx.fillStyle = barGradient;
  ctx.fillRect(x1, chartArea.top - barHeight, width, barHeight);
};
