window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};

window.mbcxDashboard.eventCost.chart = {};

window.mbcxDashboard.eventCost.chart.createChart = function(canvas, utilityData, events, dateRange) {
  if (window.mbcxDashboard.eventCost.state.chartInstance) {
    window.mbcxDashboard.eventCost.state.chartInstance.destroy();
  }
  var ctx = canvas.getContext('2d');
  var state = window.mbcxDashboard.eventCost.state;
  var utilityConfig = state.utilityConfig;
  var activeUtility = state.activeUtility || 'Electric';
  var activeCfg = utilityConfig[activeUtility] || utilityConfig.Electric;
  var dataPoints = [];
  if (Array.isArray(utilityData)) {
    dataPoints = utilityData;
  } else if (utilityData && typeof utilityData === 'object') {
    dataPoints = utilityData[activeUtility] || [];
  }
  var datasets = [];
  if (dataPoints.length > 0) {
    datasets.push({
      label: activeCfg.label + ' (' + activeCfg.unit + ')',
      data: dataPoints,
      borderColor: activeCfg.color,
      backgroundColor: 'transparent',
      tension: 0.4,
      pointRadius: 1,
      pointHoverRadius: 5,
      borderWidth: 2,
      fill: false
    });
  } else {
    datasets.push({
      label: activeCfg.label + ' (' + activeCfg.unit + ')',
      data: [],
      borderColor: activeCfg.color,
      backgroundColor: 'transparent',
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: false
    });
  }
  var annotations = {};
  events.forEach(function(event, index) {
    annotations['event' + index] = {
      type: 'line',
      scaleID: 'y',
      xMin: event.time,
      xMax: event.time,
      borderColor: event.color,
      borderWidth: 3,
      borderDash: [],
      label: {
        display: true,
        content: event.label,
        position: 'end',
        backgroundColor: event.color,
        color: 'white',
        font: { size: 11, weight: 'bold' },
        padding: 6,
        rotation: 0,
        yAdjust: -10
      }
    };
  });
  var s = (state.responsiveScaling || {}).vhScale || 1.0;
  var titleFontSize = Math.round(14 + 4 * s);
  var titlePadding = Math.round(12 + 8 * s);
  var axisFontSize = Math.round(12 + 2 * s);
  state.chartInstance = new Chart(ctx, {
    type: 'line',
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      elements: { line: { fill: false } },
      plugins: {
        title: {
          display: true,
          text: 'Building Power Consumption with Event Annotations',
          font: { size: titleFontSize, weight: 'bold' },
          padding: titlePadding
        },
        legend: { display: false },
        filler: { propagate: false },
        tooltip: {
          callbacks: {
            title: function(context) {
              var date = new Date(context[0].parsed.x);
              return date.toLocaleString();
            },
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + ' ' + activeCfg.unit;
            }
          }
        },
        annotation: { annotations: annotations }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'day', displayFormats: { day: 'MMM dd' } },
          title: { display: true, text: 'Date', font: { size: axisFontSize, weight: 'bold' } },
          grid: { display: true, color: 'rgba(0, 0, 0, 0.05)' },
          min: dateRange && dateRange.startDate ? new Date(dateRange.startDate).getTime() : undefined,
          max: dateRange && dateRange.endDate ? new Date(dateRange.endDate + 'T23:59:59').getTime() : undefined
        },
        y: {
          title: { display: true, text: activeCfg.yLabel, font: { size: axisFontSize, weight: 'bold' } },
          grid: { display: true, color: 'rgba(0, 0, 0, 0.05)' }
        }
      }
    }
  });
};

window.mbcxDashboard.eventCost.annotations = {};

window.mbcxDashboard.eventCost.annotations.drawAnnotationOverlay = function(chartInstance, overlayCanvas, events) {
  var ctx = overlayCanvas.getContext('2d');
  var rawChartArea = chartInstance.chartArea;
  var yScale = chartInstance.scales.y;
  var dpr = window.devicePixelRatio || 1;
  var chartArea = {
    top: rawChartArea.top * dpr,
    bottom: rawChartArea.bottom * dpr,
    left: rawChartArea.left * dpr,
    right: rawChartArea.right * dpr
  };
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  var xScale = chartInstance.scales.x;
  function getScaledX(value) {
    return xScale.getPixelForValue(value) * dpr;
  }
  var labelPositions = window.mbcxDashboard.eventCost.labels.calculateLabelPositions(
    events, xScale, rawChartArea
  );
  var hoverState = window.mbcxDashboard.eventCost.state.hoverState;
  var visibilityState = window.mbcxDashboard.eventCost.state.visibilityState;
  var anyHighlighted = hoverState.hoveredIndex >= 0 || hoverState.selectedIndex >= 0;
  events.forEach(function(event, index) {
    if (visibilityState[index] === false) return;
    var isHovered = hoverState.hoveredIndex === index;
    var isSelected = hoverState.selectedIndex === index;
    var isHighlighted = isHovered || isSelected;
    if (isHighlighted) return;
    var isSpanEvent = event.startTime && event.endTime;
    if (isSpanEvent) {
      var startPixel = getScaledX(event.startTime);
      var endPixel = getScaledX(event.endTime);
      if (!isFinite(startPixel) || !isFinite(endPixel)) {
        return;
      }
      window.mbcxDashboard.eventCost.annotations.drawSpanAnnotation(
        ctx, startPixel, endPixel, chartArea, event.color, isHighlighted, anyHighlighted
      );
    } else {
      var xPixel = getScaledX(event.time);
      var rawXPixel = xScale.getPixelForValue(event.time);
      if (rawXPixel >= rawChartArea.left && rawXPixel <= rawChartArea.right) {
        var labelPos = labelPositions[index] * dpr;
        window.mbcxDashboard.eventCost.annotations.drawAnnotationLine(
          ctx, xPixel, chartArea, event.color, isHighlighted
        );
        window.mbcxDashboard.eventCost.labels.drawAnnotationLabel(
          ctx, xPixel, labelPos, event.label, event.color, chartArea, isHighlighted
        );
      }
    }
  });
  var highlightedIndex = hoverState.hoveredIndex >= 0 ? hoverState.hoveredIndex : hoverState.selectedIndex;
  if (highlightedIndex >= 0 && visibilityState[highlightedIndex] !== false) {
    var highlightedEvent = events[highlightedIndex];
    if (!highlightedEvent) return;
    var isSpanEvent = highlightedEvent.startTime && highlightedEvent.endTime;
    if (isSpanEvent) {
      var startPixel = getScaledX(highlightedEvent.startTime);
      var endPixel = getScaledX(highlightedEvent.endTime);
      if (isFinite(startPixel) && isFinite(endPixel)) {
        window.mbcxDashboard.eventCost.annotations.drawSpanAnnotation(
          ctx, startPixel, endPixel, chartArea, highlightedEvent.color, true, anyHighlighted
        );
      }
    } else {
      var xPixel = getScaledX(highlightedEvent.time);
      var rawXPixel = xScale.getPixelForValue(highlightedEvent.time);
      if (rawXPixel >= rawChartArea.left && rawXPixel <= rawChartArea.right) {
        var labelPos = labelPositions[highlightedIndex] * dpr;
        window.mbcxDashboard.eventCost.annotations.drawAnnotationLine(
          ctx, xPixel, chartArea, highlightedEvent.color, true
        );
        window.mbcxDashboard.eventCost.labels.drawAnnotationLabel(
          ctx, xPixel, labelPos, highlightedEvent.label, highlightedEvent.color, chartArea, true
        );
        window.mbcxDashboard.eventCost.tooltips.drawHoverMarker(
          ctx, chartInstance, xPixel, highlightedEvent
        );
      }
    }
  }
  if (hoverState.hoveredEvent) {
    window.mbcxDashboard.eventCost.tooltips.drawRichTooltip(
      ctx, hoverState.hoveredEvent, hoverState.mouseX * dpr, hoverState.mouseY * dpr, chartArea
    );
  }
};

window.mbcxDashboard.eventCost.annotations.drawAnnotationLine = function(ctx, xPixel, chartArea, color, isHovered) {
  var style = window.mbcxDashboard.eventCost.state.annotationStyle;
  var s = (window.mbcxDashboard.eventCost.state.responsiveScaling || {}).vhScale || 1.0;
  var baseLineWidth = Math.round((2 + 2 * s) * 10) / 10;
  var baseGlowWidth = Math.round(8 + 4 * s);
  var lineWidth = isHovered ? baseLineWidth * 1.5 : baseLineWidth;
  var glowWidth = isHovered ? baseGlowWidth * 1.8 : baseGlowWidth;
  var glowOpacity = isHovered ? style.glowOpacity * 1.5 : style.glowOpacity;
  if (style.useGlow) {
    var glowGradient = ctx.createLinearGradient(
      xPixel - glowWidth / 2, chartArea.top, xPixel + glowWidth / 2, chartArea.top
    );
    glowGradient.addColorStop(0, color.replace('0.8', '0'));
    glowGradient.addColorStop(0.5, color.replace('0.8', Math.min(glowOpacity, 0.5).toString()));
    glowGradient.addColorStop(1, color.replace('0.8', '0'));
    ctx.fillStyle = glowGradient;
    ctx.fillRect(xPixel - glowWidth / 2, chartArea.top, glowWidth, chartArea.bottom - chartArea.top);
  }
  var lineGradient = ctx.createLinearGradient(xPixel, chartArea.top, xPixel, chartArea.bottom);
  var midOpacity = isHovered ? '1.0' : '0.95';
  lineGradient.addColorStop(0, color.replace('0.8', '0.4'));
  lineGradient.addColorStop(0.1, color.replace('0.8', midOpacity));
  lineGradient.addColorStop(0.9, color.replace('0.8', midOpacity));
  lineGradient.addColorStop(1, color.replace('0.8', '0.4'));
  if (style.useShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, ' + style.shadowOpacity + ')';
    ctx.shadowBlur = isHovered ? style.shadowBlur * 1.5 : style.shadowBlur;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }
  ctx.beginPath();
  ctx.strokeStyle = lineGradient;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.moveTo(xPixel, chartArea.top);
  ctx.lineTo(xPixel, chartArea.bottom);
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.strokeStyle = color.replace('0.8', '1.0');
  ctx.lineWidth = isHovered ? 2.5 : 1.5;
  ctx.moveTo(xPixel - 0.5, chartArea.top);
  ctx.lineTo(xPixel - 0.5, chartArea.bottom);
  ctx.stroke();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};

window.mbcxDashboard.eventCost.annotations.drawSpanAnnotation = function(ctx, startX, endX, chartArea, color, isHovered, anyHovered) {
  var style = window.mbcxDashboard.eventCost.state.annotationStyle;
  var s = (window.mbcxDashboard.eventCost.state.responsiveScaling || {}).vhScale || 1.0;
  if (!isFinite(startX) || !isFinite(endX)) {
    return;
  }
  var x1 = Math.min(startX, endX);
  var x2 = Math.max(startX, endX);
  var width = x2 - x1;
  if (x2 < chartArea.left || x1 > chartArea.right) return;
  x1 = Math.max(x1, chartArea.left);
  x2 = Math.min(x2, chartArea.right);
  width = x2 - x1;
  var fillOpacityLow, fillOpacityHigh, borderOpacity, barOpacity;
  if (isHovered) {
    fillOpacityLow = 0.6;
    fillOpacityHigh = 0.8;
    borderOpacity = 1.0;
    barOpacity = 1.0;
  } else if (anyHovered) {
    fillOpacityLow = 0.08;
    fillOpacityHigh = 0.12;
    borderOpacity = 0.2;
    barOpacity = 0.25;
  } else {
    fillOpacityLow = 0.15;
    fillOpacityHigh = 0.25;
    borderOpacity = 0.8;
    barOpacity = 0.7;
  }
  if (style.useShadow && isHovered) {
    ctx.shadowColor = 'rgba(0, 0, 0, ' + style.shadowOpacity + ')';
    ctx.shadowBlur = style.shadowBlur;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }
  var fillGradient = ctx.createLinearGradient(x1, chartArea.top, x2, chartArea.top);
  fillGradient.addColorStop(0, color.replace('0.8', fillOpacityLow.toString()));
  fillGradient.addColorStop(0.5, color.replace('0.8', fillOpacityHigh.toString()));
  fillGradient.addColorStop(1, color.replace('0.8', fillOpacityLow.toString()));
  ctx.fillStyle = fillGradient;
  ctx.fillRect(x1, chartArea.top, width, chartArea.bottom - chartArea.top);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = color.replace('0.8', borderOpacity.toString());
  ctx.lineWidth = isHovered ? Math.round(2 + 1 * s) : Math.round(1.5 + 0.5 * s);
  ctx.beginPath();
  ctx.moveTo(x1, chartArea.top);
  ctx.lineTo(x1, chartArea.bottom);
  ctx.moveTo(x2, chartArea.top);
  ctx.lineTo(x2, chartArea.bottom);
  ctx.stroke();
  var barHeight = isHovered ? Math.round(3 + 2 * s) : Math.round(2 + 2 * s);
  var barGradient = ctx.createLinearGradient(x1, 0, x2, 0);
  barGradient.addColorStop(0, color.replace('0.8', (barOpacity * 0.7).toString()));
  barGradient.addColorStop(0.5, color.replace('0.8', barOpacity.toString()));
  barGradient.addColorStop(1, color.replace('0.8', (barOpacity * 0.7).toString()));
  ctx.fillStyle = barGradient;
  ctx.fillRect(x1, chartArea.top - barHeight, width, barHeight);
};

window.mbcxDashboard.eventCost.timeline = {};

window.mbcxDashboard.eventCost.timeline.detectTimelineClick = function(mouseX, mouseY, events, chartInstance) {
  var xScale = chartInstance.scales.x;
  var chartArea = chartInstance.chartArea;
  var visibilityState = window.mbcxDashboard.eventCost.state.visibilityState;
  var timelineCanvas = window.mbcxDashboard.eventCost.state.timelineCanvas;
  if (!timelineCanvas || !events || events.length === 0) return -1;
  var cssHeight = parseFloat(timelineCanvas.style.height) || 56;
  var laneInfo = window.mbcxDashboard.eventCost.timeline.calculateEventLanes(events);
  var eventLanes = laneInfo.eventLanes;
  var totalLanes = Math.max(laneInfo.totalLanes, 1);
  var s = (window.mbcxDashboard.eventCost.state.responsiveScaling || {}).vhScale || 1.0;
  var topPad = Math.round(2 + 2 * s);
  var bottomPad = Math.round(2 + 2 * s);
  var laneGap = 2;
  var usableHeight = cssHeight - topPad - bottomPad;
  var maxLaneHeight = Math.round(24 + 8 * s);
  var laneHeight = Math.min((usableHeight - laneGap * (totalLanes - 1)) / totalLanes, maxLaneHeight);
  for (var i = 0; i < events.length; i++) {
    if (visibilityState[i] === false) continue;
    var event = events[i];
    var lane = eventLanes[i];
    var startTime = event.startTime || event.time;
    var endTime = event.endTime || event.time;
    var x1 = xScale.getPixelForValue(startTime);
    var x2 = xScale.getPixelForValue(endTime);
    if (x2 < chartArea.left || x1 > chartArea.right) continue;
    x1 = Math.max(x1, chartArea.left + 1);
    x2 = Math.min(x2, chartArea.right - 1);
    var blockWidth = Math.max(x2 - x1, 4);
    var y = topPad + lane * (laneHeight + laneGap);
    var bh = laneHeight;
    if (mouseX >= x1 && mouseX <= x1 + blockWidth &&
        mouseY >= y && mouseY <= y + bh) {
      return i;
    }
  }
  return -1;
};

window.mbcxDashboard.eventCost.timeline.calculateEventLanes = function(events) {
  var lanes = [];
  var eventLanes = new Array(events.length);
  events.forEach(function(event, index) {
    var startTime = event.startTime ? event.startTime.getTime() : event.time.getTime();
    var endTime = event.endTime ? event.endTime.getTime() : startTime;
    var laneIndex = 0;
    while (true) {
      var conflict = false;
      if (lanes[laneIndex]) {
        for (var i = 0; i < lanes[laneIndex].length; i++) {
          var otherIndex = lanes[laneIndex][i];
          var otherEvent = events[otherIndex];
          var otherStart = otherEvent.startTime ? otherEvent.startTime.getTime() : otherEvent.time.getTime();
          var otherEnd = otherEvent.endTime ? otherEvent.endTime.getTime() : otherStart;
          if (!(endTime <= otherStart || startTime >= otherEnd)) {
            conflict = true;
            break;
          }
        }
      }
      if (!conflict) {
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

window.mbcxDashboard.eventCost.timeline.drawTimeline = function(timelineCanvas, chartInstance, events) {
  var ctx = timelineCanvas.getContext('2d');
  var xScale = chartInstance.scales.x;
  var chartArea = chartInstance.chartArea;
  var dpr = window.devicePixelRatio || 1;
  var bufferWidth = timelineCanvas.width;
  var bufferHeight = timelineCanvas.height;
  var cssHeight = parseFloat(timelineCanvas.style.height) || 56;
  ctx.clearRect(0, 0, bufferWidth, bufferHeight);
  if (!events || events.length === 0) return;
  var laneInfo = window.mbcxDashboard.eventCost.timeline.calculateEventLanes(events);
  var eventLanes = laneInfo.eventLanes;
  var totalLanes = Math.max(laneInfo.totalLanes, 1);
  var visibilityState = window.mbcxDashboard.eventCost.state.visibilityState;
  var hoverState = window.mbcxDashboard.eventCost.state.hoverState;
  var s = (window.mbcxDashboard.eventCost.state.responsiveScaling || {}).vhScale || 1.0;
  var topPad = Math.round(2 + 2 * s);
  var bottomPad = Math.round(2 + 2 * s);
  var laneGap = 2;
  var usableHeight = cssHeight - topPad - bottomPad;
  var maxLaneHeight = Math.round(24 + 8 * s);
  var laneHeight = Math.min((usableHeight - laneGap * (totalLanes - 1)) / totalLanes, maxLaneHeight);
  var blockRadius = 3;
  var plotLeft = chartArea.left;
  var plotRight = chartArea.right;
  var plotWidth = plotRight - plotLeft;
  ctx.fillStyle = '#f5f6f8';
  ctx.beginPath();
  ctx.roundRect(plotLeft * dpr, 0, plotWidth * dpr, bufferHeight, 4 * dpr);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1 * dpr;
  for (var i = 1; i < totalLanes; i++) {
    var lineY = (topPad + i * (laneHeight + laneGap) - laneGap / 2) * dpr;
    ctx.beginPath();
    ctx.moveTo((plotLeft + 4) * dpr, lineY);
    ctx.lineTo((plotRight - 4) * dpr, lineY);
    ctx.stroke();
  }
  events.forEach(function(event, index) {
    if (visibilityState[index] === false) return;
    var isHovered = hoverState.hoveredIndex === index;
    var isSelected = hoverState.selectedIndex === index;
    var isHighlighted = isHovered || isSelected;
    var anyHighlighted = hoverState.hoveredIndex >= 0 || hoverState.selectedIndex >= 0;
    var lane = eventLanes[index];
    var startTime = event.startTime || event.time;
    var endTime = event.endTime || event.time;
    var x1 = xScale.getPixelForValue(startTime);
    var x2 = xScale.getPixelForValue(endTime);
    if (x2 < plotLeft || x1 > plotRight) return;
    x1 = Math.max(x1, plotLeft + 1);
    x2 = Math.min(x2, plotRight - 1);
    var blockWidth = Math.max(x2 - x1, 4);
    var y = topPad + lane * (laneHeight + laneGap);
    var bh = laneHeight;
    var alpha = 1;
    if (anyHighlighted && !isHighlighted) alpha = 0.3;
    var baseColor = event.color || 'rgba(100,100,100,0.8)';
    ctx.save();
    ctx.globalAlpha = alpha;
    var dx1 = x1 * dpr;
    var dy = y * dpr;
    var dBlockWidth = blockWidth * dpr;
    var dBh = bh * dpr;
    var dRadius = blockRadius * dpr;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.roundRect(dx1, dy, dBlockWidth, dBh, dRadius);
    ctx.fill();
    var grad = ctx.createLinearGradient(0, dy, 0, dy + dBh);
    grad.addColorStop(0, 'rgba(255,255,255,0.25)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(dx1, dy, dBlockWidth, dBh, dRadius);
    ctx.fill();
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
    var minBlockForLabel = Math.round(30 + 10 * s);
    if (blockWidth > minBlockForLabel) {
      var labelFontSize = Math.round((9 + 3 * s) * dpr);
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
          metrics = ctx.measureText(labelText + '…');
        }
        labelText += '…';
      }
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

window.mbcxDashboard.eventCost.tooltips = {};

window.mbcxDashboard.eventCost.tooltips.drawHoverMarker = function(ctx, chartInstance, xPixel, event) {
  var s = (window.mbcxDashboard.eventCost.state.responsiveScaling || {}).vhScale || 1.0;
  var yScale = chartInstance.scales.y;
  var chartArea = chartInstance.chartArea;
  var dataPoint = chartInstance.data.datasets[0].data.find(function(d) {
    return Math.abs(d.x - event.time) < 1000 * 60 * 30;
  });
  if (dataPoint) {
    var yPixel = yScale.getPixelForValue(dataPoint.y);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    var outerR = Math.round(7 + 3 * s);
    ctx.beginPath();
    ctx.arc(xPixel, yPixel, outerR, 0, Math.PI * 2);
    ctx.fillStyle = event.color.replace('0.8', '1.0');
    ctx.fill();
    var innerR = Math.round(4 + 2 * s);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(xPixel, yPixel, innerR, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    var centerR = Math.round(2 + 1 * s);
    ctx.beginPath();
    ctx.arc(xPixel, yPixel, centerR, 0, Math.PI * 2);
    ctx.fillStyle = event.color.replace('0.8', '1.0');
    ctx.fill();
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
};

window.mbcxDashboard.eventCost.tooltips.wrapText = function(ctx, text, maxWidth) {
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

window.mbcxDashboard.eventCost.tooltips.drawRichTooltip = function(ctx, event, mouseX, mouseY, chartArea) {
  var s = (window.mbcxDashboard.eventCost.state.responsiveScaling || {}).vhScale || 1.0;
  var padding = Math.round(12 + 4 * s);
  var lineHeight = Math.round(18 + 4 * s);
  var titleLineHeight = Math.round(16 + 4 * s);
  var width = Math.round(260 + 60 * s);
  var timeStr;
  var isSpanEvent = event.startTime && event.endTime;
  if (isSpanEvent) {
    var startStr = event.startTime.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
    var endStr = event.endTime.toLocaleString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    timeStr = startStr + ' - ' + endStr;
  } else {
    timeStr = event.time.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
  }
  var titleFontSize = Math.round(14 + 3 * s);
  ctx.font = 'bold ' + titleFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  var titleLines = window.mbcxDashboard.eventCost.tooltips.wrapText(ctx, event.label, width - (padding * 2));
  var titleHeight = titleLines.length * titleLineHeight + padding;
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
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'white';
  ctx.strokeStyle = event.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  var headerHeight = titleHeight + padding;
  ctx.fillStyle = event.color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, headerHeight, [10, 10, 0, 0]);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = 'bold ' + titleFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  titleLines.forEach(function(line, index) {
    ctx.fillText(line, x + padding, y + padding + titleFontSize + (index * titleLineHeight));
  });
  var contentFontSize = Math.round(11 + 2 * s);
  var timeY = y + headerHeight + 20;
  ctx.fillStyle = '#333';
  ctx.font = contentFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  ctx.fillText('\u{1F550} ' + timeStr, x + padding, timeY);
  if (lines.length > 0) {
    ctx.fillStyle = '#555';
    ctx.font = contentFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    lines.forEach(function(line, index) {
      var lineY = timeY + 8 + (index + 1) * lineHeight;
      ctx.fillText(line.icon + ' ' + line.text, x + padding, lineY);
    });
  }
};

window.mbcxDashboard.eventCost.labels = {};

window.mbcxDashboard.eventCost.labels.calculateLabelPositions = function(events, xScale, chartArea) {
  var s = (window.mbcxDashboard.eventCost.state.responsiveScaling || {}).vhScale || 1.0;
  var labelWidth = Math.round(90 + 20 * s);
  var labelHeight = Math.round(20 + 4 * s);
  var minSpacing = Math.round(3 + 2 * s);
  var positions = [];
  events.forEach(function(event, index) {
    var xPixel;
    var isSpanEvent = event.startTime && event.endTime;
    if (isSpanEvent) {
      var startX = xScale.getPixelForValue(event.startTime);
      var endX = xScale.getPixelForValue(event.endTime);
      xPixel = (startX + endX) / 2;
    } else {
      xPixel = xScale.getPixelForValue(event.time);
    }
    var staggerOffset = Math.round(20 + 5 * s);
    var topMargin = Math.round(25 + 10 * s);
    var baseY = chartArea.top - topMargin - (index % 3) * staggerOffset;
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
      var xOverlap = Math.abs(xPixel - prevXPixel) < labelWidth + minSpacing;
      var yOverlap = Math.abs(adjustedY - prevPos.y) < labelHeight + minSpacing;
      if (xOverlap && yOverlap) {
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

window.mbcxDashboard.eventCost.labels.drawAnnotationLabel = function(ctx, xPixel, labelPos, labelText, color, chartArea, isHovered) {
  var s = (window.mbcxDashboard.eventCost.state.responsiveScaling || {}).vhScale || 1.0;
  var labelWidth = labelPos.width;
  var labelHeight = labelPos.height;
  var labelX = labelPos.x;
  var labelY = labelPos.y;
  var cornerRadius = Math.round(4 + 2 * s);
  ctx.strokeStyle = color.replace('0.8', '0.5');
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(xPixel, labelY + labelHeight);
  ctx.lineTo(xPixel, chartArea.top);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = Math.round(4 + 2 * s);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = color.replace('0.8', '0.96');
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, labelHeight, cornerRadius);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = color.replace('0.8', '1.0');
  ctx.lineWidth = 2;
  ctx.stroke();
  var maxChars = 15;
  var displayText = labelText.length > maxChars
    ? labelText.substring(0, maxChars - 1) + '…'
    : labelText;
  var labelFontSize = Math.round(9 + 2 * s);
  ctx.fillStyle = 'white';
  ctx.font = 'bold ' + labelFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 1;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillText(displayText, labelX + labelWidth / 2, labelY + labelHeight / 2);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};
