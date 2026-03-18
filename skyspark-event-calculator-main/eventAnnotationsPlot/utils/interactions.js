/**
 * interactions.js
 * Mouse hover detection and event filter panel UI interactions
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.interactions = {};

/**
 * Detect hover over event annotations (point and span events)
 * @param {number} mouseX - Mouse X coordinate in pixels
 * @param {number} mouseY - Mouse Y coordinate in pixels
 * @param {Array} events - Array of event objects
 * @param {Object} xScale - Chart.js x-axis scale
 * @param {Object} chartArea - Chart.js chart area bounds
 * @returns {Object|null} - Hovered event info or null
 */
window.EventAnnotationsPlot.interactions.detectHover = function(mouseX, mouseY, events, xScale, chartArea) {
  var hoverThreshold = 15; // pixels

  for (var i = 0; i < events.length; i++) {
    // Skip hidden events — no hover detection if toggled off
    if (window.EventAnnotationsPlot.state.visibilityState[i] === false) continue;

    var event = events[i];
    var isSpanEvent = event.startTime && event.endTime;

    if (isSpanEvent) {
      // For time-span events, check if mouse is within the span region
      var startX = xScale.getPixelForValue(event.startTime);
      var endX = xScale.getPixelForValue(event.endTime);
      var x1 = Math.min(startX, endX);
      var x2 = Math.max(startX, endX);

      if (mouseX >= x1 && mouseX <= x2 &&
          mouseY >= chartArea.top &&
          mouseY <= chartArea.bottom) {
        return { event: event, index: i };
      }
    } else {
      // For point events, check proximity to the line
      var xPixel = xScale.getPixelForValue(event.time);

      if (Math.abs(mouseX - xPixel) < hoverThreshold &&
          mouseY >= chartArea.top &&
          mouseY <= chartArea.bottom) {
        return { event: event, index: i };
      }
    }
  }

  return null;
};

/**
 * Create collapsible filter panel UI
 * @param {HTMLElement} container - Parent container element
 * @param {Array} events - Array of event objects
 * @param {Object} chartInstance - Chart.js instance
 */
window.EventAnnotationsPlot.interactions.createEventList = function(container, events, chartInstance) {
  var s = (window.EventAnnotationsPlot.state.responsiveScaling || {}).vhScale || 1.0;
  var listContainer = document.createElement('div');
  listContainer.style.backgroundColor = 'white';
  listContainer.style.borderRadius = '8px';
  listContainer.style.border = '1px solid #e0e0e0';
  listContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  listContainer.style.flex = '1 1 auto';
  listContainer.style.minHeight = '0';
  listContainer.style.maxHeight = '100%';
  listContainer.style.boxSizing = 'border-box';
  listContainer.style.position = 'relative';
  listContainer.style.zIndex = '10';
  listContainer.style.pointerEvents = 'auto';
  listContainer.style.display = 'flex';
  listContainer.style.flexDirection = 'column';

  // Header with collapse button
  var header = document.createElement('div');
  header.style.padding = Math.round(10 + 6 * s) + 'px ' + Math.round(14 + 6 * s) + 'px';
  header.style.borderBottom = '2px solid #1565c0';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.cursor = 'pointer';
  header.style.backgroundColor = '#f8f9fa';
  header.style.borderRadius = '8px 8px 0 0';
  header.style.transition = 'background-color 0.2s';

  header.onmouseover = function() {
    header.style.backgroundColor = '#e9ecef';
  };
  header.onmouseout = function() {
    header.style.backgroundColor = '#f8f9fa';
  };

  var title = document.createElement('h4');
  title.textContent = 'Event Filter';
  title.style.margin = '0';
  title.style.color = '#1565c0';
  title.style.fontSize = '16px';
  title.style.fontWeight = '700';

  var headerButtons = document.createElement('div');
  headerButtons.style.display = 'flex';
  headerButtons.style.alignItems = 'center';
  headerButtons.style.gap = '2px';

  var collapseButton = document.createElement('button');
  collapseButton.textContent = window.EventAnnotationsPlot.state.filterPanelCollapsed ? '\u25B6' : '\u25BC';
  collapseButton.style.border = 'none';
  collapseButton.style.backgroundColor = 'transparent';
  collapseButton.style.fontSize = '14px';
  collapseButton.style.cursor = 'pointer';
  collapseButton.style.padding = '4px 8px';
  collapseButton.style.color = '#1565c0';
  collapseButton.style.transition = 'transform 0.2s';

  var hideButton = document.createElement('button');
  hideButton.textContent = '\u00D7';
  hideButton.title = 'Hide event filter panel';
  hideButton.style.cssText = 'border:none;background:transparent;font-size:18px;cursor:pointer;padding:2px 6px;color:#adb5bd;transition:color 0.2s;line-height:1;';
  hideButton.onmouseover = function() { hideButton.style.color = '#d32f2f'; };
  hideButton.onmouseout = function() { hideButton.style.color = '#adb5bd'; };
  hideButton.onclick = function(e) {
    e.stopPropagation();
    var st = window.EventAnnotationsPlot.state;
    st.filterSidebarHidden = true;
    container.style.display = 'none';
    if (st._showSidebarBtn) st._showSidebarBtn.style.display = 'block';
    // Resize chart to fill space
    setTimeout(function() {
      if (st.chartInstance) st.chartInstance.resize();
      if (st._syncOverlaySize) st._syncOverlaySize();
      var currentEvents = st.currentEvents || [];
      if (st._resizeTimelineForEvents) st._resizeTimelineForEvents(currentEvents);
      if (st.chartInstance && st.overlayCanvas) {
        window.EventAnnotationsPlot.annotations.drawAnnotationOverlay(st.chartInstance, st.overlayCanvas, currentEvents);
      }
      if (st.chartInstance && st.timelineCanvas) {
        window.EventAnnotationsPlot.timeline.drawTimeline(st.timelineCanvas, st.chartInstance, currentEvents);
      }
    }, 50);
  };

  headerButtons.appendChild(collapseButton);
  headerButtons.appendChild(hideButton);

  header.appendChild(title);
  header.appendChild(headerButtons);
  listContainer.appendChild(header);

  // Content container (collapsible)
  var contentContainer = document.createElement('div');
  contentContainer.style.padding = Math.round(12 + 8 * s) + 'px';
  contentContainer.style.overflowY = 'auto';
  contentContainer.style.overflowX = 'hidden';
  contentContainer.style.flex = '1 1 auto';
  contentContainer.style.display = window.EventAnnotationsPlot.state.filterPanelCollapsed ? 'none' : 'block';

  // Collapse/expand handler
  header.onclick = function() {
    window.EventAnnotationsPlot.state.filterPanelCollapsed = !window.EventAnnotationsPlot.state.filterPanelCollapsed;
    collapseButton.textContent = window.EventAnnotationsPlot.state.filterPanelCollapsed ? '\u25B6' : '\u25BC';
    contentContainer.style.display = window.EventAnnotationsPlot.state.filterPanelCollapsed ? 'none' : 'block';
  };

  listContainer.appendChild(contentContainer);

  // Initialize visibility state for all events (all visible by default)
  events.forEach(function(event, index) {
    if (window.EventAnnotationsPlot.state.visibilityState[index] === undefined) {
      window.EventAnnotationsPlot.state.visibilityState[index] = true;
    }
  });

  // Helper functions for redrawing
  var redrawCharts = function() {
    if (window.EventAnnotationsPlot.state.overlayCanvas && window.EventAnnotationsPlot.state.chartInstance) {
      window.EventAnnotationsPlot.annotations.drawAnnotationOverlay(
        window.EventAnnotationsPlot.state.chartInstance,
        window.EventAnnotationsPlot.state.overlayCanvas,
        events
      );
    }
    if (window.EventAnnotationsPlot.state.timelineCanvas && window.EventAnnotationsPlot.state.chartInstance) {
      window.EventAnnotationsPlot.timeline.drawTimeline(
        window.EventAnnotationsPlot.state.timelineCanvas,
        window.EventAnnotationsPlot.state.chartInstance,
        events
      );
    }
  };

  var updateAllEventToggles = function() {
    var toggleButtons = contentContainer.querySelectorAll('.event-toggle-button');
    toggleButtons.forEach(function(btn) {
      var eventIndex = parseInt(btn.getAttribute('data-index'));
      var isVisible = window.EventAnnotationsPlot.state.visibilityState[eventIndex] !== false;
      btn.textContent = isVisible ? '\uD83D\uDC41' : '\u2297';
      btn.style.opacity = isVisible ? '1' : '0.4';
      var eventItem = btn.closest('.event-item');
      if (eventItem) {
        eventItem.style.opacity = isVisible ? '1' : '0.5';
      }
    });
  };

  // === QUICK ACTIONS SECTION ===
  var actionsSection = document.createElement('div');
  actionsSection.style.marginBottom = '20px';

  var actionTitle = document.createElement('div');
  actionTitle.textContent = 'Quick Actions';
  actionTitle.style.fontSize = '13px';
  actionTitle.style.fontWeight = '700';
  actionTitle.style.color = '#495057';
  actionTitle.style.marginBottom = '10px';
  actionTitle.style.textTransform = 'uppercase';
  actionTitle.style.letterSpacing = '0.5px';
  actionsSection.appendChild(actionTitle);

  var buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';

  var showAllButton = document.createElement('button');
  showAllButton.textContent = 'Show All';
  showAllButton.style.flex = '1';
  showAllButton.style.padding = Math.round(7 + 3 * s) + 'px ' + Math.round(9 + 3 * s) + 'px';
  showAllButton.style.border = '1px solid #1565c0';
  showAllButton.style.borderRadius = '4px';
  showAllButton.style.backgroundColor = '#1565c0';
  showAllButton.style.color = 'white';
  showAllButton.style.cursor = 'pointer';
  showAllButton.style.fontSize = '12px';
  showAllButton.style.fontWeight = '600';
  showAllButton.style.transition = 'all 0.2s';

  showAllButton.onmouseover = function() {
    showAllButton.style.backgroundColor = '#1976d2';
    showAllButton.style.transform = 'translateY(-1px)';
  };
  showAllButton.onmouseout = function() {
    showAllButton.style.backgroundColor = '#1565c0';
    showAllButton.style.transform = 'translateY(0)';
  };

  showAllButton.onclick = function() {
    events.forEach(function(event, index) {
      window.EventAnnotationsPlot.state.visibilityState[index] = true;
    });
    updateAllEventToggles();
    redrawCharts();
  };

  var hideAllButton = document.createElement('button');
  hideAllButton.textContent = 'Hide All';
  hideAllButton.style.flex = '1';
  hideAllButton.style.padding = Math.round(7 + 3 * s) + 'px ' + Math.round(9 + 3 * s) + 'px';
  hideAllButton.style.border = '1px solid #d32f2f';
  hideAllButton.style.borderRadius = '4px';
  hideAllButton.style.backgroundColor = 'white';
  hideAllButton.style.color = '#d32f2f';
  hideAllButton.style.cursor = 'pointer';
  hideAllButton.style.fontSize = '12px';
  hideAllButton.style.fontWeight = '600';
  hideAllButton.style.transition = 'all 0.2s';

  hideAllButton.onmouseover = function() {
    hideAllButton.style.backgroundColor = '#ffebee';
    hideAllButton.style.transform = 'translateY(-1px)';
  };
  hideAllButton.onmouseout = function() {
    hideAllButton.style.backgroundColor = 'white';
    hideAllButton.style.transform = 'translateY(0)';
  };

  hideAllButton.onclick = function() {
    events.forEach(function(event, index) {
      window.EventAnnotationsPlot.state.visibilityState[index] = false;
    });
    updateAllEventToggles();
    redrawCharts();
  };

  buttonContainer.appendChild(showAllButton);
  buttonContainer.appendChild(hideAllButton);
  actionsSection.appendChild(buttonContainer);
  contentContainer.appendChild(actionsSection);

  // === EVENTS LIST SECTION ===
  var eventsListSection = document.createElement('div');

  var eventsListTitle = document.createElement('div');
  eventsListTitle.textContent = 'Events (' + events.length + ')';
  eventsListTitle.style.fontSize = '13px';
  eventsListTitle.style.fontWeight = '700';
  eventsListTitle.style.color = '#495057';
  eventsListTitle.style.marginBottom = '4px';
  eventsListTitle.style.textTransform = 'uppercase';
  eventsListTitle.style.letterSpacing = '0.5px';
  eventsListSection.appendChild(eventsListTitle);

  var eventsListHint = document.createElement('div');
  eventsListHint.textContent = 'Click an event for cost breakdown';
  eventsListHint.style.fontSize = '11px';
  eventsListHint.style.color = '#adb5bd';
  eventsListHint.style.marginBottom = '10px';
  eventsListHint.style.fontStyle = 'italic';
  eventsListSection.appendChild(eventsListHint);

  // Create compact event items
  events.forEach(function(event, index) {
    var eventItem = document.createElement('div');
    eventItem.className = 'event-item';
    eventItem.style.padding = Math.round(5 + 3 * s) + 'px ' + Math.round(7 + 3 * s) + 'px';
    eventItem.style.marginBottom = Math.round(3 + 3 * s) + 'px';
    eventItem.style.backgroundColor = 'white';
    eventItem.style.borderRadius = '4px';
    eventItem.style.border = '1px solid #e0e0e0';
    eventItem.style.borderLeft = '3px solid ' + event.color;
    eventItem.style.display = 'flex';
    eventItem.style.alignItems = 'center';
    eventItem.style.gap = '8px';
    eventItem.style.cursor = 'pointer';
    eventItem.style.transition = 'all 0.15s';

    // Hover effects are applied below after chevron is created

    // Visibility toggle button
    var toggleButton = document.createElement('button');
    toggleButton.className = 'event-toggle-button';
    toggleButton.setAttribute('data-index', index);
    toggleButton.style.width = '24px';
    toggleButton.style.height = '24px';
    toggleButton.style.border = '1px solid #ccc';
    toggleButton.style.borderRadius = '3px';
    toggleButton.style.backgroundColor = 'white';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.fontSize = '14px';
    toggleButton.style.display = 'flex';
    toggleButton.style.alignItems = 'center';
    toggleButton.style.justifyContent = 'center';
    toggleButton.style.padding = '0';
    toggleButton.style.flexShrink = '0';
    toggleButton.style.transition = 'all 0.2s';
    toggleButton.title = 'Toggle visibility';

    var updateToggleButton = function() {
      var isVisible = window.EventAnnotationsPlot.state.visibilityState[index] !== false;
      toggleButton.textContent = isVisible ? '\uD83D\uDC41' : '\u2297';
      toggleButton.style.opacity = isVisible ? '1' : '0.4';
      eventItem.style.opacity = isVisible ? '1' : '0.5';
    };

    toggleButton.onclick = function(e) {
      e.stopPropagation();
      var currentState = window.EventAnnotationsPlot.state.visibilityState[index];
      window.EventAnnotationsPlot.state.visibilityState[index] = currentState === false ? true : false;
      updateToggleButton();
      redrawCharts();
    };

    updateToggleButton();

    // Event info container
    var infoContainer = document.createElement('div');
    infoContainer.style.flex = '1';
    infoContainer.style.minWidth = '0';
    infoContainer.style.display = 'flex';
    infoContainer.style.flexDirection = 'column';
    infoContainer.style.gap = '2px';

    // Event title
    var titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.gap = '6px';

    var colorDot = document.createElement('div');
    colorDot.style.width = '8px';
    colorDot.style.height = '8px';
    colorDot.style.borderRadius = '50%';
    colorDot.style.backgroundColor = event.color;
    colorDot.style.border = '1px solid ' + event.color.replace('0.8', '1.0');
    colorDot.style.flexShrink = '0';

    var titleText = document.createElement('div');
    titleText.textContent = event.label;
    titleText.style.fontSize = '13px';
    titleText.style.fontWeight = '600';
    titleText.style.color = '#212529';
    titleText.style.overflow = 'hidden';
    titleText.style.textOverflow = 'ellipsis';
    titleText.style.whiteSpace = 'nowrap';

    titleContainer.appendChild(colorDot);
    titleContainer.appendChild(titleText);
    infoContainer.appendChild(titleContainer);

    // Event time (compact)
    var timeText = document.createElement('div');
    timeText.style.fontSize = '11px';
    timeText.style.color = '#6c757d';
    timeText.style.overflow = 'hidden';
    timeText.style.textOverflow = 'ellipsis';
    timeText.style.whiteSpace = 'nowrap';

    if (event.startTime && event.endTime) {
      var startStr = event.startTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      timeText.textContent = startStr;
      if (event.duration) {
        timeText.textContent += ' \u2022 ' + event.duration;
      }
    } else {
      timeText.textContent = event.time.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }

    infoContainer.appendChild(timeText);

    eventItem.appendChild(toggleButton);
    eventItem.appendChild(infoContainer);

    // Cost badge on the right
    if (event.costDisplay) {
      var costBadge = document.createElement('div');
      costBadge.textContent = event.costDisplay;
      costBadge.style.fontSize = '12px';
      costBadge.style.fontWeight = '600';
      costBadge.style.color = '#2c3e50';
      costBadge.style.backgroundColor = '#f0f0f0';
      costBadge.style.padding = '3px 8px';
      costBadge.style.borderRadius = '4px';
      costBadge.style.flexShrink = '0';
      costBadge.style.marginLeft = 'auto';
      eventItem.appendChild(costBadge);
    }

    // Chevron arrow indicating clickable detail
    var chevron = document.createElement('span');
    chevron.textContent = '\u203A';
    chevron.style.cssText = 'font-size:20px;color:#adb5bd;flex-shrink:0;transition:all 0.2s;line-height:1;margin-left:4px;';
    eventItem.appendChild(chevron);

    // Enhanced hover: highlight + chevron slides
    (function(item, chev) {
      item.onmouseover = function() {
        item.style.backgroundColor = '#e8f4fd';
        item.style.borderColor = event.color.replace('0.8', '0.4');
        item.style.transform = 'translateX(3px)';
        chev.style.color = '#1565c0';
        chev.style.transform = 'translateX(3px)';
      };
      item.onmouseout = function() {
        item.style.backgroundColor = 'white';
        item.style.borderColor = '#e0e0e0';
        item.style.transform = 'translateX(0)';
        chev.style.color = '#adb5bd';
        chev.style.transform = 'translateX(0)';
      };
    })(eventItem, chevron);

    // Click handler to open event detail panel
    eventItem.onclick = function() {
      if (window.EventAnnotationsPlot.eventDetail) {
        window.EventAnnotationsPlot.state.selectedEventForDetail = event;
        window.EventAnnotationsPlot.eventDetail.renderPanel(container, event);
      }
    };

    eventsListSection.appendChild(eventItem);
  });

  contentContainer.appendChild(eventsListSection);
  container.appendChild(listContainer);
};

/**
 * Create the utility toggle bar (Electric / CHW / Steam / Gas).
 * Returns the container element so the caller can insert it into the DOM.
 *
 * @param {Function} onToggle - Called with (utilityName, isActive) when a toggle changes.
 * @returns {HTMLElement} The toggle bar container.
 */
window.EventAnnotationsPlot.interactions.createUtilityToggle = function(onSelect) {
  var state = window.EventAnnotationsPlot.state;
  var utilityConfig = state.utilityConfig;
  var s = (state.responsiveScaling || {}).vhScale || 1.0;

  var bar = document.createElement('div');
  bar.style.display = 'flex';
  bar.style.gap = '6px';
  bar.style.padding = Math.round(5 + 3 * s) + 'px 0';
  bar.style.alignItems = 'center';
  bar.style.flexWrap = 'wrap';

  var label = document.createElement('span');
  label.textContent = 'Utility';
  label.style.fontSize = '12px';
  label.style.fontWeight = '600';
  label.style.color = '#8c939a';
  label.style.textTransform = 'uppercase';
  label.style.letterSpacing = '0.5px';
  label.style.marginRight = '6px';
  bar.appendChild(label);

  var utilityNames = ['Electric', 'CHW', 'Steam', 'Gas'];
  var buttons = {};

  function applyAllStyles() {
    utilityNames.forEach(function(n) {
      var btn = buttons[n];
      var cfg = utilityConfig[n];
      if (state.activeUtility === n) {
        btn.style.backgroundColor = cfg.color;
        btn.style.color = '#fff';
        btn.style.border = '2px solid ' + cfg.color;
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';
      } else {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#6c757d';
        btn.style.border = '2px solid #dee2e6';
        btn.style.boxShadow = 'none';
      }
    });
  }

  utilityNames.forEach(function(name) {
    var cfg = utilityConfig[name];

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = cfg.label;
    btn.style.padding = Math.round(3 + 2 * s) + 'px ' + Math.round(10 + 4 * s) + 'px';
    btn.style.borderRadius = '16px';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.15s ease';
    btn.style.outline = 'none';
    btn.style.lineHeight = '1';

    buttons[name] = btn;

    btn.addEventListener('click', function() {
      if (state.activeUtility === name) return; // already selected
      state.activeUtility = name;
      applyAllStyles();
      if (onSelect) {
        onSelect(name);
      }
    });

    bar.appendChild(btn);
  });

  applyAllStyles();
  return bar;
};
