/**
 * Tooltip rendering functions for event annotations.
 * Handles hover markers, text wrapping, and rich tooltip display.
 */
window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.tooltips = {};

/**
 * Draw bold marker on hovered annotation
 */
window.EventAnnotationsPlot.tooltips.drawHoverMarker = function(ctx, chartInstance, xPixel, event) {
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var yScale = chartInstance.scales.y;
  var chartArea = chartInstance.chartArea;

  // Get data point closest to this time
  var dataPoint = chartInstance.data.datasets[0].data.find(function(d) {
    return Math.abs(d.x - event.time) < 1000 * 60 * 30; // Within 30 minutes
  });

  if (dataPoint) {
    var yPixel = yScale.getPixelForValue(dataPoint.y);

    // Draw bold circular marker
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Outer circle
    var outerR = Math.round(7 + 3 * s);
    ctx.beginPath();
    ctx.arc(xPixel, yPixel, outerR, 0, Math.PI * 2);
    ctx.fillStyle = event.color.replace('0.8', '1.0');
    ctx.fill();

    // Inner circle (white)
    var innerR = Math.round(4 + 2 * s);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(xPixel, yPixel, innerR, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Center dot
    var centerR = Math.round(2 + 1 * s);
    ctx.beginPath();
    ctx.arc(xPixel, yPixel, centerR, 0, Math.PI * 2);
    ctx.fillStyle = event.color.replace('0.8', '1.0');
    ctx.fill();

    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
};

/**
 * Wrap text to fit within a maximum width
 */
window.EventAnnotationsPlot.tooltips.wrapText = function(ctx, text, maxWidth) {
  var words = text.split(' ');
  var lines = [];
  var currentLine = words[0];

  for (var i = 1; i < words.length; i++) {
    var testLine = currentLine + ' ' + words[i];
    var metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  return lines;
};

/**
 * Draw rich tooltip for hovered event
 */
window.EventAnnotationsPlot.tooltips.drawRichTooltip = function(ctx, event, mouseX, mouseY, chartArea) {
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var padding = Math.round(12 + 4 * s);
  var lineHeight = Math.round(18 + 4 * s);
  var titleLineHeight = Math.round(16 + 4 * s);
  var width = Math.round(260 + 60 * s);

  // Format time based on event type
  var timeStr;
  var isSpanEvent = event.startTime && event.endTime;

  if (isSpanEvent) {
    var startStr = event.startTime.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    var endStr = event.endTime.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    timeStr = startStr + ' - ' + endStr;
  } else {
    timeStr = event.time.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Wrap title text if needed
  var titleFontSize = Math.round(14 + 3 * s);
  ctx.font = 'bold ' + titleFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  var titleLines = window.EventAnnotationsPlot.tooltips.wrapText(ctx, event.label, width - (padding * 2));
  var titleHeight = titleLines.length * titleLineHeight + padding;

  // Build info lines with icons
  var lines = [];
  if (event.duration) {
    lines.push({ icon: '\u{23F1}', text: 'Duration: ' + event.duration });
  }
  if (event.area) {
    lines.push({ icon: '\u{1F4D0}', text: 'Area: ' + event.area });
  }
  if (event.costDisplay) {
    lines.push({ icon: '\u{1F4B0}', text: 'Cost: ' + event.costDisplay });
  }
  if (event.description) {
    lines.push({ icon: '\u{1F4C5}', text: event.description });
  }

  var contentHeight = titleHeight + 8 + lineHeight + (lines.length > 0 ? 8 + lines.length * lineHeight : 0);
  var height = padding * 2 + contentHeight;

  // Position tooltip (avoid going off-screen)
  var x = mouseX + 20;
  var y = mouseY - height / 2;

  if (x + width > chartArea.right) {
    x = mouseX - width - 20;
  }
  if (y < chartArea.top) {
    y = chartArea.top + 10;
  }
  if (y + height > chartArea.bottom) {
    y = chartArea.bottom - height - 10;
  }

  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  // Draw white background with border
  ctx.fillStyle = 'white';
  ctx.strokeStyle = event.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Draw colored header bar
  var headerHeight = titleHeight + padding;
  ctx.fillStyle = event.color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, headerHeight, [10, 10, 0, 0]);
  ctx.fill();

  // Draw title (wrapped if needed)
  ctx.fillStyle = 'white';
  ctx.font = 'bold ' + titleFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  titleLines.forEach(function(line, index) {
    ctx.fillText(line, x + padding, y + padding + titleFontSize + (index * titleLineHeight));
  });

  // Draw time period
  var contentFontSize = Math.round(11 + 2 * s);
  var timeY = y + headerHeight + 20;
  ctx.fillStyle = '#333';
  ctx.font = contentFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  ctx.fillText('\u{1F550} ' + timeStr, x + padding, timeY);

  // Draw info lines
  if (lines.length > 0) {
    ctx.fillStyle = '#555';
    ctx.font = contentFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    lines.forEach(function(line, index) {
      var lineY = timeY + 8 + (index + 1) * lineHeight;
      ctx.fillText(line.icon + ' ' + line.text, x + padding, lineY);
    });
  }
};
