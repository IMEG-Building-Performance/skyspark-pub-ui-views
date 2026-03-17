/**
 * Label rendering module for Event Annotations Plot
 * Handles label positioning calculations and label drawing with connector lines
 */
window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.labels = {};

/**
 * Calculate optimal label positions to avoid overlaps
 * Supports both point events and time-span events
 */
window.EventAnnotationsPlot.labels.calculateLabelPositions = function(events, xScale, chartArea) {
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var labelWidth = Math.round(90 + 20 * s);
  var labelHeight = Math.round(20 + 4 * s);
  var minSpacing = Math.round(3 + 2 * s);
  var positions = [];

  events.forEach(function(event, index) {
    // Calculate position based on event type
    var xPixel;
    var isSpanEvent = event.startTime && event.endTime;

    if (isSpanEvent) {
      // For time-span events, position label at the middle of the span
      var startX = xScale.getPixelForValue(event.startTime);
      var endX = xScale.getPixelForValue(event.endTime);
      xPixel = (startX + endX) / 2;
    } else {
      xPixel = xScale.getPixelForValue(event.time);
    }

    // Start with staggered positioning (scaled)
    var staggerOffset = Math.round(20 + 5 * s);
    var topMargin = Math.round(25 + 10 * s);
    var baseY = chartArea.top - topMargin - (index % 3) * staggerOffset;

    // Check for overlaps with previous labels
    var adjustedY = baseY;
    for (var i = 0; i < positions.length; i++) {
      var prevPos = positions[i];
      var prevEvent = events[i];
      var prevIsSpan = prevEvent.startTime && prevEvent.endTime;
      var prevXPixel;

      if (prevIsSpan) {
        var prevStartX = xScale.getPixelForValue(prevEvent.startTime);
        var prevEndX = xScale.getPixelForValue(prevEvent.endTime);
        prevXPixel = (prevStartX + prevEndX) / 2;
      } else {
        prevXPixel = xScale.getPixelForValue(prevEvent.time);
      }

      // Check horizontal and vertical overlap
      var xOverlap = Math.abs(xPixel - prevXPixel) < labelWidth + minSpacing;
      var yOverlap = Math.abs(adjustedY - prevPos.y) < labelHeight + minSpacing;

      if (xOverlap && yOverlap) {
        // Move down to avoid overlap
        adjustedY = prevPos.y - labelHeight - minSpacing;
      }
    }

    positions.push({
      x: xPixel - labelWidth / 2,
      y: adjustedY,
      width: labelWidth,
      height: labelHeight
    });
  });

  return positions;
};

/**
 * Draw annotation label with connector line
 * For time-span events, labels are positioned at the center with cleaner styling
 */
window.EventAnnotationsPlot.labels.drawAnnotationLabel = function(ctx, xPixel, labelPos, labelText, color, chartArea, isHovered) {
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var labelWidth = labelPos.width;
  var labelHeight = labelPos.height;
  var labelX = labelPos.x;
  var labelY = labelPos.y;
  var cornerRadius = Math.round(4 + 2 * s);

  // Draw connector line from label to annotation (dotted)
  ctx.strokeStyle = color.replace('0.8', '0.5');
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(xPixel, labelY + labelHeight);
  ctx.lineTo(xPixel, chartArea.top);
  ctx.stroke();
  ctx.setLineDash([]);

  // Shadow for label box
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = Math.round(4 + 2 * s);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  // Draw solid background (no gradient for cleaner look)
  ctx.fillStyle = color.replace('0.8', '0.96');
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, labelHeight, cornerRadius);
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw clean border
  ctx.strokeStyle = color.replace('0.8', '1.0');
  ctx.lineWidth = 2;
  ctx.stroke();

  // Truncate label text if too long
  var maxChars = 15;
  var displayText = labelText.length > maxChars
    ? labelText.substring(0, maxChars - 1) + '…'
    : labelText;

  // Draw label text centered
  var labelFontSize = Math.round(9 + 2 * s);
  ctx.fillStyle = 'white';
  ctx.font = 'bold ' + labelFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Subtle text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 1;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  ctx.fillText(displayText, labelX + labelWidth / 2, labelY + labelHeight / 2);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};
