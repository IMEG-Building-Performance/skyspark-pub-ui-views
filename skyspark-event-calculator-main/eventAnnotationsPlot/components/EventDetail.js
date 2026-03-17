/**
 * eventDetail.js
 * Slide-over detail panel for individual event cost breakdown.
 * Matches the Event Utility Cost Statement HTML mockup design.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.eventDetail = {};

/**
 * Format a number as currency: $1,234
 */
window.EventAnnotationsPlot.eventDetail.formatCurrency = function(val) {
  var num = parseFloat(val) || 0;
  return '$' + Math.round(num).toLocaleString('en-US');
};

/**
 * Format a number as currency with cents: $1,234.56
 */
window.EventAnnotationsPlot.eventDetail.formatCurrencyCents = function(val) {
  var num = parseFloat(val) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Render the event detail slide-over panel into the sidebar container.
 * @param {HTMLElement} container - The eventsContainer element
 * @param {Object} chartEvent - The chart event object (with .rawData attached)
 */
window.EventAnnotationsPlot.eventDetail.renderPanel = function(container, chartEvent) {
  var state = window.EventAnnotationsPlot.state;
  var colors = state.detailColors;
  var raw = chartEvent.rawData;

  if (!raw) return;

  state.detailPanelOpen = true;
  container.innerHTML = '';

  // ── Main panel container ──────────────────────────────────────────
  var panel = document.createElement('div');
  panel.style.cssText = 'background:' + colors.bgLight + ';border-radius:8px;border:1px solid ' + colors.border + ';box-shadow:0 2px 8px rgba(0,0,0,0.1);height:100%;display:flex;flex-direction:column;overflow:hidden;animation:slideIn 0.3s ease;';
  container.appendChild(panel);


  // ── Back button header ────────────────────────────────────────────
  var backHeader = document.createElement('div');
  backHeader.style.cssText = 'padding:12px 16px;border-bottom:1px solid ' + colors.border + ';background:white;display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;';
  backHeader.onmouseover = function() { backHeader.style.backgroundColor = colors.bgLight; };
  backHeader.onmouseout = function() { backHeader.style.backgroundColor = 'white'; };
  backHeader.onclick = function() {
    window.EventAnnotationsPlot.eventDetail.closePanel(container);
  };

  var backArrow = document.createElement('span');
  backArrow.textContent = '\u2190';
  backArrow.style.cssText = 'font-size:18px;color:' + colors.textMuted + ';';

  var backText = document.createElement('span');
  backText.textContent = 'Back to Events';
  backText.style.cssText = 'font-size:13px;font-weight:600;color:' + colors.textMuted + ';';

  backHeader.appendChild(backArrow);
  backHeader.appendChild(backText);
  panel.appendChild(backHeader);

  // ── Scrollable content ────────────────────────────────────────────
  var scrollContent = document.createElement('div');
  scrollContent.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;padding:0;';
  panel.appendChild(scrollContent);

  // ── Header: Event name + massive total ────────────────────────────
  var headerSection = document.createElement('div');
  headerSection.style.cssText = 'text-align:center;padding:32px 16px 28px;background:white;';

  var eventName = document.createElement('div');
  eventName.textContent = chartEvent.label;
  eventName.style.cssText = 'font-size:12px;text-transform:uppercase;letter-spacing:2px;color:' + colors.textMuted + ';margin-bottom:8px;';

  var totalAmount = document.createElement('div');
  var totalCost = parseFloat(raw.totalCost) || 0;
  totalAmount.textContent = window.EventAnnotationsPlot.eventDetail.formatCurrency(totalCost);
  totalAmount.style.cssText = 'font-size:56px;font-weight:900;color:' + colors.primary + ';line-height:1;margin-bottom:6px;font-family:"Source Sans Pro",-apple-system,sans-serif;';

  var totalLabel = document.createElement('div');
  totalLabel.textContent = 'Total Event Utility Cost';
  totalLabel.style.cssText = 'font-size:14px;color:' + colors.textMuted + ';font-weight:400;';

  headerSection.appendChild(eventName);
  headerSection.appendChild(totalAmount);
  headerSection.appendChild(totalLabel);
  scrollContent.appendChild(headerSection);

  // ── View Toggle ───────────────────────────────────────────────────
  var toggleContainer = document.createElement('div');
  toggleContainer.style.cssText = 'display:flex;justify-content:center;gap:8px;padding:0 16px 20px;background:white;';

  var summaryBtn = document.createElement('button');
  summaryBtn.textContent = 'Summary';
  summaryBtn.style.cssText = 'padding:8px 20px;border:2px solid ' + colors.primary + ';background:' + colors.primary + ';border-radius:8px;font-size:13px;font-weight:600;color:white;cursor:pointer;transition:all 0.2s;';

  var detailedBtn = document.createElement('button');
  detailedBtn.textContent = 'Detailed';
  detailedBtn.style.cssText = 'padding:8px 20px;border:2px solid ' + colors.border + ';background:white;border-radius:8px;font-size:13px;font-weight:600;color:' + colors.textMuted + ';cursor:pointer;transition:all 0.2s;';

  toggleContainer.appendChild(summaryBtn);
  toggleContainer.appendChild(detailedBtn);
  scrollContent.appendChild(toggleContainer);

  // ── Build utility data ────────────────────────────────────────────
  var utilities = [
    {
      name: 'Electric',
      color: colors.electric,
      energyCost: parseFloat(raw.elec_energyCost) || 0,
      demandCost: parseFloat(raw.elec_demandCost) || 0
    },
    {
      name: 'Chilled Water',
      color: colors.chw,
      energyCost: parseFloat(raw.chw_energyCost) || 0,
      demandCost: parseFloat(raw.chw_demandCost) || 0
    },
    {
      name: 'Steam',
      color: colors.steam,
      energyCost: parseFloat(raw.steam_energyCost) || 0,
      demandCost: parseFloat(raw.steam_demandCost) || 0
    },
    {
      name: 'Gas',
      color: colors.gas,
      energyCost: parseFloat(raw.gas_energyCost) || 0,
      demandCost: parseFloat(raw.gas_demandCost) || 0
    }
  ];

  // Calculate totals per utility and find the largest
  utilities.forEach(function(u) {
    u.total = u.energyCost + u.demandCost;
    u.percent = totalCost > 0 ? Math.round((u.total / totalCost) * 100) : 0;
  });

  // Sort by cost descending for display priority
  var sortedUtils = utilities.slice().sort(function(a, b) { return b.total - a.total; });

  // Filter out utilities with zero cost
  var activeUtils = sortedUtils.filter(function(u) { return u.total > 0; });

  // ── Summary View ──────────────────────────────────────────────────
  var summaryView = document.createElement('div');
  summaryView.style.cssText = 'padding:0 16px 16px;';

  if (activeUtils.length === 0) {
    var noData = document.createElement('div');
    noData.textContent = 'No utility cost data available';
    noData.style.cssText = 'text-align:center;padding:32px;color:' + colors.textMuted + ';font-size:14px;';
    summaryView.appendChild(noData);
  } else {
    activeUtils.forEach(function(util, idx) {
      var card = document.createElement('div');
      var isLargest = idx === 0;
      card.style.cssText = 'background:white;border-radius:12px;padding:' + (isLargest ? '24px' : '16px') + ';box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:12px;cursor:pointer;transition:all 0.3s ease;position:relative;overflow:hidden;border-top:4px solid ' + util.color + ';';

      card.onmouseover = function() {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
        detailRows.style.opacity = '1';
        detailRows.style.maxHeight = '200px';
        detailRows.style.marginTop = '12px';
        detailRows.style.paddingTop = '12px';
        detailRows.style.borderTop = '1px solid ' + colors.border;
      };
      card.onmouseout = function() {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
        detailRows.style.opacity = '0';
        detailRows.style.maxHeight = '0';
        detailRows.style.marginTop = '0';
        detailRows.style.paddingTop = '0';
        detailRows.style.borderTop = '1px solid transparent';
      };

      var cardLabel = document.createElement('div');
      cardLabel.textContent = util.name;
      cardLabel.style.cssText = 'font-size:12px;text-transform:uppercase;letter-spacing:1px;color:' + colors.textMuted + ';margin-bottom:6px;';

      var cardAmount = document.createElement('div');
      cardAmount.textContent = window.EventAnnotationsPlot.eventDetail.formatCurrency(util.total);
      cardAmount.style.cssText = 'font-size:' + (isLargest ? '40px' : '28px') + ';font-weight:700;color:' + colors.textDark + ';margin-bottom:4px;';

      var cardPercent = document.createElement('div');
      cardPercent.textContent = util.percent + '% of total';
      cardPercent.style.cssText = 'font-size:13px;color:' + colors.textMuted + ';';

      // Hover detail rows
      var detailRows = document.createElement('div');
      detailRows.style.cssText = 'opacity:0;max-height:0;overflow:hidden;transition:all 0.3s ease;margin-top:0;border-top:1px solid transparent;padding-top:0;';

      var rows = [
        { label: 'Energy Cost', value: window.EventAnnotationsPlot.eventDetail.formatCurrencyCents(util.energyCost) },
        { label: 'Demand Cost', value: window.EventAnnotationsPlot.eventDetail.formatCurrencyCents(util.demandCost) }
      ];

      rows.forEach(function(r) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;font-size:13px;padding:5px 0;';

        var rowLabel = document.createElement('span');
        rowLabel.textContent = r.label;
        rowLabel.style.color = colors.textMuted;

        var rowValue = document.createElement('span');
        rowValue.textContent = r.value;
        rowValue.style.fontWeight = '600';

        row.appendChild(rowLabel);
        row.appendChild(rowValue);
        detailRows.appendChild(row);
      });

      card.appendChild(cardLabel);
      card.appendChild(cardAmount);
      card.appendChild(cardPercent);
      card.appendChild(detailRows);
      summaryView.appendChild(card);
    });
  }

  scrollContent.appendChild(summaryView);

  // ── Detailed View ─────────────────────────────────────────────────
  var detailedView = document.createElement('div');
  detailedView.style.cssText = 'padding:0 16px 16px;display:none;';

  activeUtils.forEach(function(util) {
    var section = document.createElement('div');
    section.style.cssText = 'background:white;border-radius:12px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;';

    // Section header
    var sectionHeader = document.createElement('div');
    sectionHeader.style.cssText = 'padding:16px 20px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:background 0.2s;';
    sectionHeader.onmouseover = function() { sectionHeader.style.backgroundColor = colors.bgLight; };
    sectionHeader.onmouseout = function() { sectionHeader.style.backgroundColor = 'white'; };

    var headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display:flex;align-items:center;gap:12px;';

    var dot = document.createElement('div');
    dot.style.cssText = 'width:12px;height:12px;border-radius:50%;background:' + util.color + ';';

    var headerTitle = document.createElement('h3');
    headerTitle.textContent = util.name;
    headerTitle.style.cssText = 'font-size:15px;font-weight:600;margin:0;';

    headerLeft.appendChild(dot);
    headerLeft.appendChild(headerTitle);

    var headerRight = document.createElement('div');
    headerRight.style.cssText = 'display:flex;align-items:center;gap:12px;';

    var headerAmount = document.createElement('div');
    headerAmount.textContent = window.EventAnnotationsPlot.eventDetail.formatCurrencyCents(util.total);
    headerAmount.style.cssText = 'font-size:20px;font-weight:700;color:' + util.color + ';';

    var expandIcon = document.createElement('span');
    expandIcon.textContent = '\u25BC';
    expandIcon.style.cssText = 'font-size:12px;color:' + colors.textMuted + ';transition:transform 0.3s;display:inline-block;';

    headerRight.appendChild(headerAmount);
    headerRight.appendChild(expandIcon);

    sectionHeader.appendChild(headerLeft);
    sectionHeader.appendChild(headerRight);
    section.appendChild(sectionHeader);

    // Section content (collapsible)
    var sectionContent = document.createElement('div');
    sectionContent.style.cssText = 'max-height:0;overflow:hidden;transition:max-height 0.3s ease;';

    var innerContent = document.createElement('div');
    innerContent.style.cssText = 'padding:0 20px 20px;';

    // Cost breakdown boxes
    var breakdownGrid = document.createElement('div');
    breakdownGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;';

    var costItems = [
      { label: 'Energy Cost', value: util.energyCost },
      { label: 'Demand Cost', value: util.demandCost }
    ];

    costItems.forEach(function(item) {
      var costBox = document.createElement('div');
      costBox.style.cssText = 'background:' + colors.bgLight + ';padding:14px;border-radius:8px;';

      var costLabel = document.createElement('div');
      costLabel.textContent = item.label;
      costLabel.style.cssText = 'font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:' + colors.textMuted + ';margin-bottom:4px;';

      var costValue = document.createElement('div');
      costValue.textContent = window.EventAnnotationsPlot.eventDetail.formatCurrencyCents(item.value);
      costValue.style.cssText = 'font-size:18px;font-weight:700;color:' + colors.textDark + ';';

      costBox.appendChild(costLabel);
      costBox.appendChild(costValue);
      breakdownGrid.appendChild(costBox);
    });

    innerContent.appendChild(breakdownGrid);
    sectionContent.appendChild(innerContent);
    section.appendChild(sectionContent);

    // Toggle expand/collapse
    sectionHeader.onclick = function() {
      var isOpen = sectionContent.style.maxHeight !== '0px' && sectionContent.style.maxHeight !== '0';
      if (isOpen) {
        sectionContent.style.maxHeight = '0px';
        expandIcon.style.transform = 'rotate(0deg)';
      } else {
        sectionContent.style.maxHeight = '400px';
        expandIcon.style.transform = 'rotate(180deg)';
      }
    };

    detailedView.appendChild(section);
  });

  scrollContent.appendChild(detailedView);

  // ── Toggle view switching ─────────────────────────────────────────
  summaryBtn.onclick = function() {
    summaryView.style.display = 'block';
    detailedView.style.display = 'none';
    summaryBtn.style.background = colors.primary;
    summaryBtn.style.borderColor = colors.primary;
    summaryBtn.style.color = 'white';
    detailedBtn.style.background = 'white';
    detailedBtn.style.borderColor = colors.border;
    detailedBtn.style.color = colors.textMuted;
  };

  detailedBtn.onclick = function() {
    summaryView.style.display = 'none';
    detailedView.style.display = 'block';
    detailedBtn.style.background = colors.primary;
    detailedBtn.style.borderColor = colors.primary;
    detailedBtn.style.color = 'white';
    summaryBtn.style.background = 'white';
    summaryBtn.style.borderColor = colors.border;
    summaryBtn.style.color = colors.textMuted;
  };

  // ── Footer: Event info ────────────────────────────────────────────
  var footer = document.createElement('div');
  footer.style.cssText = 'padding:16px;border-top:1px solid ' + colors.border + ';background:white;flex-shrink:0;';

  var footerGrid = document.createElement('div');
  footerGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

  var footerItems = [];

  if (raw.eventID) {
    footerItems.push({ label: 'Event ID', value: raw.eventID });
  }

  if (state.siteName) {
    footerItems.push({ label: 'Venue', value: state.siteName });
  }

  if (raw.eventSF) {
    var sf = parseFloat(raw.eventSF);
    if (!isNaN(sf)) {
      footerItems.push({ label: 'Event Space', value: sf.toLocaleString() + ' ft\u00B2' });
    }
  }

  if (chartEvent.duration) {
    footerItems.push({ label: 'Duration', value: chartEvent.duration });
  }

  footerItems.forEach(function(item) {
    var footerItem = document.createElement('div');
    footerItem.style.cssText = 'text-align:center;padding:4px 0;';

    var footerLabel = document.createElement('div');
    footerLabel.textContent = item.label;
    footerLabel.style.cssText = 'font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:' + colors.textMuted + ';';

    var footerValue = document.createElement('div');
    footerValue.textContent = item.value;
    footerValue.style.cssText = 'font-size:14px;font-weight:600;margin-top:2px;color:' + colors.textDark + ';';

    footerItem.appendChild(footerLabel);
    footerItem.appendChild(footerValue);
    footerGrid.appendChild(footerItem);
  });

  footer.appendChild(footerGrid);
  panel.appendChild(footer);
};

/**
 * Close the detail panel and restore the event filter list.
 * @param {HTMLElement} container - The eventsContainer element
 */
window.EventAnnotationsPlot.eventDetail.closePanel = function(container) {
  var state = window.EventAnnotationsPlot.state;
  var interactions = window.EventAnnotationsPlot.interactions;

  state.detailPanelOpen = false;
  state.selectedEventForDetail = null;

  // Restore the event list
  container.innerHTML = '';
  var currentEvents = state.currentEvents || [];
  interactions.createEventList(container, currentEvents, state.chartInstance);
};
