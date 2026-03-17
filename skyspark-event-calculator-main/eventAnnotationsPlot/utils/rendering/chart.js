/**
 * chart.js - Chart Creation and Configuration
 *
 * Creates and configures the Chart.js line chart with event annotations.
 * Supports multiple utility datasets (Electric, CHW, Steam, Gas).
 * Stores the chart instance in window.EventAnnotationsPlot.state.chartInstance.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.chart = {};

/**
 * Create the chart with annotations.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element to render into.
 * @param {Object|Array} utilityData - Either:
 *   - An object keyed by utility name: { Electric: [{x,y},...] }
 *   - A flat array of {x, y} for backwards compatibility (treated as "Electric")
 * @param {Array} events - Array of event objects with time/label/color.
 * @param {Object} dateRange - Optional {startDate, endDate} to set explicit x-axis bounds.
 */
window.EventAnnotationsPlot.chart.createChart = function(canvas, utilityData, events, dateRange) {
  // Destroy existing chart if it exists
  if (window.EventAnnotationsPlot.state.chartInstance) {
    window.EventAnnotationsPlot.state.chartInstance.destroy();
  }

  var ctx = canvas.getContext('2d');
  var state = window.EventAnnotationsPlot.state;
  var utilityConfig = state.utilityConfig;
  var activeUtility = state.activeUtility || 'Electric';

  // ── Resolve active utility config ──────────────────────────────────
  var activeCfg = utilityConfig[activeUtility] || utilityConfig.Electric;

  // ── Normalise input ────────────────────────────────────────────────
  var dataPoints = [];
  if (Array.isArray(utilityData)) {
    dataPoints = utilityData;
  } else if (utilityData && typeof utilityData === 'object') {
    dataPoints = utilityData[activeUtility] || [];
  }

  // ── Build single dataset ───────────────────────────────────────────
  var datasets = [];
  if (dataPoints.length > 0) {
    datasets.push({
      label: activeCfg.label + ' (' + activeCfg.unit + ')',
      data: dataPoints,
      borderColor: activeCfg.color,
      backgroundColor: 'transparent',  // No fill color
      tension: 0.4,
      pointRadius: 1,
      pointHoverRadius: 5,
      borderWidth: 2,
      fill: false  // No shading under line
    });
  } else {
    datasets.push({
      label: activeCfg.label + ' (' + activeCfg.unit + ')',
      data: [],
      borderColor: activeCfg.color,
      backgroundColor: 'transparent',  // No fill color
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: false  // No shading under line
    });
  }

  // ── Annotation plugin config ───────────────────────────────────────
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

  // ── Responsive font sizes ──────────────────────────────────────────
  var s = (state.responsiveScaling || {}).vhScale || 1.0;
  var titleFontSize = Math.round(14 + 4 * s);
  var titlePadding = Math.round(12 + 8 * s);
  var axisFontSize = Math.round(12 + 2 * s);

  // ── Create chart ───────────────────────────────────────────────────
  state.chartInstance = new Chart(ctx, {
    type: 'line',
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      elements: {
        line: { fill: false }  // Globally disable line fill
      },
      plugins: {
        title: {
          display: true,
          text: 'Building Power Consumption with Event Annotations',
          font: { size: titleFontSize, weight: 'bold' },
          padding: titlePadding
        },
        legend: { display: false },
        filler: { propagate: false },  // Disable fill plugin propagation
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
          // Set explicit min/max if dateRange provided to ensure full range is shown
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
