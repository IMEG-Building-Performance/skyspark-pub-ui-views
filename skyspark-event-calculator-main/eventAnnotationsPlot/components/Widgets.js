window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.widgets = {};

/**
 * Creates the summary container with title display and cost widgets.
 * @param {HTMLElement} container - The parent container to append the summary to.
 * @returns {{ titleDiv: HTMLElement, totalEventCostValueDiv: HTMLElement, utilityCostValueDiv: HTMLElement }}
 */
window.EventAnnotationsPlot.widgets.createSummaryWidgets = function (container) {
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var containerGap = Math.round(15 + 15 * s);
  var containerPad = Math.round(12 + 8 * s);

  var summaryContainer = document.createElement('div');
  summaryContainer.style.display = 'flex';
  summaryContainer.style.flexWrap = 'wrap';
  summaryContainer.style.gap = containerGap + 'px';
  summaryContainer.style.marginBottom = containerPad + 'px';
  summaryContainer.style.justifyContent = 'flex-end';
  summaryContainer.style.alignItems = 'center';
  summaryContainer.style.padding = containerPad + 'px';
  summaryContainer.style.backgroundColor = 'white';
  summaryContainer.style.borderRadius = '8px';
  summaryContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  container.appendChild(summaryContainer);

  // Function to create a cost summary widget
  function createCostWidget(label, value) {
    var widget = document.createElement('div');
    var widgetPad = Math.round(10 + 10 * s);
    widget.style.display = 'flex';
    widget.style.flexDirection = 'column';
    widget.style.alignItems = 'flex-end';
    widget.style.padding = '0 ' + widgetPad + 'px';
    widget.style.borderLeft = '1px solid #e0e0e0';

    var labelDiv = document.createElement('div');
    labelDiv.textContent = label;
    labelDiv.style.fontSize = '12px';
    labelDiv.style.fontWeight = '600';
    labelDiv.style.color = '#6c757d';
    labelDiv.style.textTransform = 'uppercase';
    labelDiv.style.letterSpacing = '1px';
    labelDiv.style.marginBottom = Math.round(4 + 4 * s) + 'px';
    widget.appendChild(labelDiv);

    var valueDiv = document.createElement('div');
    valueDiv.textContent = value;
    valueDiv.style.fontSize = 'clamp(24px, 3vw, 36px)';
    valueDiv.style.fontWeight = '700';
    valueDiv.style.color = '#2c3e50';
    valueDiv.style.lineHeight = '1';
    widget.appendChild(valueDiv);

    return {
      container: widget,
      valueDiv: valueDiv
    };
  }

  // Add site name title on the left
  var titleDiv = document.createElement('div');
  titleDiv.textContent = 'Event Utility Cost Tracking';
  titleDiv.style.fontSize = 'clamp(16px, 2vw, 20px)';
  titleDiv.style.fontWeight = '700';
  titleDiv.style.color = '#2c3e50';
  titleDiv.style.flex = '1';
  titleDiv.style.paddingLeft = '20px';
  summaryContainer.appendChild(titleDiv);

  // Add cost widgets
  var totalEventCostWidget = createCostWidget('TOTAL EVENT COST', '\u2014');
  var utilityCostWidget = createCostWidget('UTILITY COST', '\u2014');
  summaryContainer.appendChild(totalEventCostWidget.container);
  summaryContainer.appendChild(utilityCostWidget.container);

  return {
    summaryContainer: summaryContainer,
    titleDiv: titleDiv,
    totalEventCostValueDiv: totalEventCostWidget.valueDiv,
    utilityCostValueDiv: utilityCostWidget.valueDiv
  };
};
