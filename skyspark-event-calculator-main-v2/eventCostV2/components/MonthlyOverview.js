/**
 * MonthlyOverview.js — Tab 1: Monthly event cost summary
 *
 * Renders:
 *  - 3 summary cards (Total Events, Total Cost, Avg Cost/Event)
 *  - Stacked bar chart by month × utility (Chart.js)
 *  - Searchable, sortable event table with per-utility cost columns
 *
 * Clicking a table row fires onSelectEvent(eventSummary).
 * Clicking a bar in the chart filters the table to that month.
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.monthlyOverview = {};

window.EventCostV2.monthlyOverview.render = function(container, eventSummaries, onSelectEvent) {
  var cfg = window.EventCostV2.config;
  var colors = cfg.utilityCostColors;

  container.innerHTML = '';
  container.style.padding = '24px 28px';

  // ── Helper: format currency ──────────────────────────────────────────
  function fmt(n) {
    return '$' + Math.round(n || 0).toLocaleString('en-US');
  }

  function fmtDec(n) {
    return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ── Data quality dot ────────────────────────────────────────────────
  function qualityDot(dq) {
    if (dq === null || dq === undefined) return '<span style="color:#adb5bd;">—</span>';
    var pct = parseFloat(dq) * 100;
    var color = pct >= 95 ? '#28a745' : pct >= 80 ? '#ffc107' : '#dc3545';
    return '<span title="' + Math.round(pct) + '% data quality" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + color + ';"></span>';
  }

  // ── Sort state ───────────────────────────────────────────────────────
  var sortKey = 'eventStart';
  var sortDir = 'desc';
  var searchQuery = '';
  var selectedMonth = null;  // 'YYYY-MM' or null

  // ── Summary Cards ───────────────────────────────────────────────────
  var cardsRow = document.createElement('div');
  cardsRow.className = 'eap-summary-cards';
  container.appendChild(cardsRow);

  function makeCard(label, id) {
    var card = document.createElement('div');
    card.className = 'eap-summary-card';
    var lbl = document.createElement('div');
    lbl.className = 'eap-summary-card-label';
    lbl.textContent = label;
    card.appendChild(lbl);
    var val = document.createElement('div');
    val.className = 'eap-summary-card-value';
    val.id = id;
    val.textContent = '—';
    card.appendChild(val);
    cardsRow.appendChild(card);
    return val;
  }

  var cardTotalEvents = makeCard('Total Events', 'ecv2-card-total-events');
  var cardTotalCost   = makeCard('Total Event Cost', 'ecv2-card-total-cost');
  var cardAvgCost     = makeCard('Avg Cost / Event', 'ecv2-card-avg-cost');

  // ── Monthly bar chart ────────────────────────────────────────────────
  var chartSection = document.createElement('div');
  chartSection.style.cssText = 'background:white;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:20px;overflow:hidden;';
  container.appendChild(chartSection);

  var chartHeader = document.createElement('div');
  chartHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #E5E7EB;';
  chartSection.appendChild(chartHeader);

  var chartTitle = document.createElement('h3');
  chartTitle.textContent = 'Monthly Event Cost by Utility';
  chartTitle.style.cssText = 'font-size:14px;font-weight:700;color:#374151;margin:0;';
  chartHeader.appendChild(chartTitle);

  var clearMonthBtn = document.createElement('button');
  clearMonthBtn.textContent = 'Show All Months';
  clearMonthBtn.style.cssText = 'padding:4px 12px;border:1px solid #dee2e6;border-radius:6px;background:white;color:#6c757d;font-size:12px;font-weight:600;cursor:pointer;display:none;';
  clearMonthBtn.onclick = function() {
    selectedMonth = null;
    clearMonthBtn.style.display = 'none';
    renderTable();
    updateCards();
  };
  chartHeader.appendChild(clearMonthBtn);

  var chartBody = document.createElement('div');
  chartBody.style.cssText = 'padding:16px 20px;height:280px;position:relative;';
  chartSection.appendChild(chartBody);

  var chartCanvas = document.createElement('canvas');
  chartBody.appendChild(chartCanvas);

  // ── Table section ─────────────────────────────────────────────────
  var tableSection = document.createElement('div');
  tableSection.style.cssText = 'background:white;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;';
  container.appendChild(tableSection);

  var tableHeader = document.createElement('div');
  tableHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #E5E7EB;';
  tableSection.appendChild(tableHeader);

  var tableTitle = document.createElement('h3');
  tableTitle.id = 'ecv2-table-title';
  tableTitle.textContent = 'Event Summary';
  tableTitle.style.cssText = 'font-size:14px;font-weight:700;color:#374151;margin:0;';
  tableHeader.appendChild(tableTitle);

  var searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by name or ID…';
  searchInput.style.cssText = 'padding:7px 14px;border:1px solid #dee2e6;border-radius:6px;font-size:13px;width:240px;outline:none;transition:border-color 0.15s;';
  searchInput.onfocus = function() { searchInput.style.borderColor = '#4A6FA5'; };
  searchInput.onblur  = function() { searchInput.style.borderColor = '#dee2e6'; };
  searchInput.oninput = function() {
    searchQuery = (searchInput.value || '').toLowerCase().trim();
    renderTable();
    updateCards();
  };
  tableHeader.appendChild(searchInput);

  var tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'overflow-x:auto;';
  tableSection.appendChild(tableWrap);

  // ── Build monthly aggregation ────────────────────────────────────
  function getMonth(dateStr) {
    if (!dateStr) return null;
    return String(dateStr).substring(0, 7); // 'YYYY-MM'
  }

  function getFilteredEvents() {
    return eventSummaries.filter(function(ev) {
      if (selectedMonth && getMonth(ev.eventStart) !== selectedMonth) return false;
      if (searchQuery) {
        var nameMatch = (ev.eventName || '').toLowerCase().indexOf(searchQuery) >= 0;
        var idMatch   = String(ev.eventID || '').toLowerCase().indexOf(searchQuery) >= 0;
        if (!nameMatch && !idMatch) return false;
      }
      return true;
    });
  }

  function sortEvents(events) {
    var multiplier = sortDir === 'asc' ? 1 : -1;
    return events.slice().sort(function(a, b) {
      var av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'eventStart' || sortKey === 'eventEnd') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else if (typeof av === 'string') {
        av = av.toLowerCase(); bv = (bv || '').toLowerCase();
      } else {
        av = av || 0; bv = bv || 0;
      }
      return av < bv ? -multiplier : av > bv ? multiplier : 0;
    });
  }

  // ── Build chart ──────────────────────────────────────────────────
  function buildMonthlyChart() {
    var monthMap = {};
    eventSummaries.forEach(function(ev) {
      var m = getMonth(ev.eventStart);
      if (!m) return;
      if (!monthMap[m]) monthMap[m] = { Electric: 0, CHW: 0, Steam: 0, Gas: 0 };
      monthMap[m].Electric += ev.electricCost || 0;
      monthMap[m].CHW      += ev.chwCost      || 0;
      monthMap[m].Steam    += ev.steamCost    || 0;
      monthMap[m].Gas      += ev.gasCost      || 0;
    });

    var months = Object.keys(monthMap).sort();
    var labels = months.map(function(m) {
      var d = new Date(m + '-01');
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    var loader = window.EventCostV2.loader;
    loader.loadChartJs(function() {
      var Chart = window.Chart;
      if (!Chart) return;

      var datasets = ['Electric', 'CHW', 'Steam', 'Gas'].map(function(u) {
        return {
          label: u,
          data: months.map(function(m) { return Math.round(monthMap[m][u] || 0); }),
          backgroundColor: colors[u] + 'CC',
          borderColor: colors[u],
          borderWidth: 1,
          borderRadius: 3
        };
      });

      if (window._ecv2MonthlyChart) {
        try { window._ecv2MonthlyChart.destroy(); } catch(e) {}
      }

      window._ecv2MonthlyChart = new Chart(chartCanvas.getContext('2d'), {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString();
                }
              }
            }
          },
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: {
              stacked: true,
              ticks: {
                callback: function(v) { return '$' + (v/1000).toFixed(0) + 'k'; }
              }
            }
          },
          onClick: function(event, elements) {
            if (!elements || elements.length === 0) return;
            var idx = elements[0].index;
            var clickedMonth = months[idx];
            if (selectedMonth === clickedMonth) {
              selectedMonth = null;
              clearMonthBtn.style.display = 'none';
            } else {
              selectedMonth = clickedMonth;
              var d = new Date(clickedMonth + '-01');
              clearMonthBtn.textContent = 'Clear: ' + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              clearMonthBtn.style.display = '';
            }
            renderTable();
            updateCards();
          },
          onHover: function(event, elements) {
            chartCanvas.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
          }
        }
      });
    });
  }

  // ── Render table ────────────────────────────────────────────────
  var COLS = [
    { key: 'eventName',    label: 'Event Name',   align: 'left' },
    { key: 'eventID',      label: 'ID',            align: 'left' },
    { key: 'eventStart',   label: 'Start',         align: 'left' },
    { key: 'eventEnd',     label: 'End',           align: 'left' },
    { key: 'eventSF',      label: 'Sq Ft',         align: 'right' },
    { key: 'electricCost', label: 'Electric',      align: 'right', isUtility: true },
    { key: 'chwCost',      label: 'CHW',           align: 'right', isUtility: true },
    { key: 'steamCost',    label: 'Steam',         align: 'right', isUtility: true },
    { key: 'gasCost',      label: 'Gas',           align: 'right', isUtility: true },
    { key: 'totalCost',    label: 'Total Cost',    align: 'right' },
    { key: 'dataQuality',  label: 'Quality',       align: 'center', noSort: true }
  ];

  function renderTable() {
    var filtered = sortEvents(getFilteredEvents());
    tableTitle.textContent = 'Event Summary' + (selectedMonth ? ' — ' + new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '') + ' (' + filtered.length + ' events)';

    tableWrap.innerHTML = '';
    if (filtered.length === 0) {
      tableWrap.innerHTML = '<div style="text-align:center;padding:48px;color:#6c757d;font-size:13px;">No events match your filters.</div>';
      return;
    }

    var table = document.createElement('table');
    table.className = 'eap-summary-table';
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';

    // Header
    var thead = document.createElement('thead');
    var trh = document.createElement('tr');
    COLS.forEach(function(col) {
      var th = document.createElement('th');
      th.textContent = col.label + (sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');
      th.style.cssText = 'padding:10px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;background:#1565c0;color:white;text-align:' + col.align + ';cursor:' + (col.noSort ? 'default' : 'pointer') + ';user-select:none;';
      if (col.isUtility) th.style.color = colors[col.key.replace('Cost', '')] ? 'white' : 'white';
      if (!col.noSort) {
        th.onclick = function() {
          if (sortKey === col.key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          else { sortKey = col.key; sortDir = col.key === 'eventStart' ? 'desc' : 'asc'; }
          renderTable();
        };
      }
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    filtered.forEach(function(ev, i) {
      var tr = document.createElement('tr');
      tr.style.cssText = 'cursor:pointer;background:' + (i % 2 === 0 ? 'white' : '#f9fafb') + ';';
      tr.onmouseover = function() { tr.style.background = '#EBF5FB'; };
      tr.onmouseout  = function() { tr.style.background = i % 2 === 0 ? 'white' : '#f9fafb'; };
      tr.onclick     = function() { if (onSelectEvent) onSelectEvent(ev); };

      var tdStyle = 'padding:9px 12px;border-bottom:1px solid #f0f0f0;color:#374151;';
      var cells = [
        { val: ev.eventName || 'Unnamed', style: 'font-weight:600;' },
        { val: ev.eventID || '—' },
        { val: ev.eventStart ? new Date(ev.eventStart).toLocaleDateString() : '—' },
        { val: ev.eventEnd   ? new Date(ev.eventEnd).toLocaleDateString()   : '—' },
        { val: ev.eventSF    ? Math.round(ev.eventSF).toLocaleString()       : '—', align: 'right' },
        { val: ev.electricCost ? fmt(ev.electricCost) : '—', align: 'right', color: ev.electricCost ? colors.Electric : '' },
        { val: ev.chwCost      ? fmt(ev.chwCost)      : '—', align: 'right', color: ev.chwCost      ? colors.CHW      : '' },
        { val: ev.steamCost    ? fmt(ev.steamCost)    : '—', align: 'right', color: ev.steamCost    ? colors.Steam    : '' },
        { val: ev.gasCost      ? fmt(ev.gasCost)      : '—', align: 'right', color: ev.gasCost      ? colors.Gas      : '' },
        { val: fmt(ev.totalCost), align: 'right', style: 'font-weight:700;' },
        { val: qualityDot(ev.dataQuality), isHtml: true, align: 'center' }
      ];

      cells.forEach(function(c) {
        var td = document.createElement('td');
        td.style.cssText = tdStyle + 'text-align:' + (c.align || 'left') + ';' + (c.style || '') + (c.color ? 'color:' + c.color + ';font-weight:600;' : '');
        if (c.isHtml) td.innerHTML = c.val;
        else td.textContent = c.val;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  // ── Update cards ────────────────────────────────────────────────
  function updateCards() {
    var filtered = getFilteredEvents();
    var totalCost = filtered.reduce(function(s, e) { return s + (e.totalCost || 0); }, 0);
    var avg = filtered.length > 0 ? totalCost / filtered.length : 0;
    cardTotalEvents.textContent = String(filtered.length);
    cardTotalCost.textContent   = fmt(totalCost);
    cardAvgCost.textContent     = fmt(avg);
  }

  // ── Init ─────────────────────────────────────────────────────────
  if (!eventSummaries || eventSummaries.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:80px;color:#6c757d;font-size:14px;">No event cost data found for this site and date range.</div>';
    return;
  }

  updateCards();
  buildMonthlyChart();
  renderTable();
};
