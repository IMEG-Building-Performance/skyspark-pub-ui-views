/**
 * MonthlyOverview.js — Tab 1: Monthly event cost summary
 *
 * Renders:
 *  - Month picker (nav arrows + month tabs)
 *  - 4 KPI summary cards (all-time stats)
 *  - Stacked bar chart by month × utility (future months dimmed)
 *  - Searchable, sortable event table filtered to selected month
 *
 * Clicking a table row fires onSelectEvent(eventSummary).
 * Clicking a chart bar updates the month picker and table filter.
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.monthlyOverview = {};

window.EventCostV2.monthlyOverview.render = function(container, eventSummaries, onSelectEvent) {
  var cfg    = window.EventCostV2.config;
  var colors = cfg.utilityCostColors;

  container.innerHTML = '';
  container.style.padding = '24px 28px';

  if (!eventSummaries || eventSummaries.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:80px;color:#6B7280;font-size:14px;">No event cost data found for this site and date range.</div>';
    return;
  }

  // ── Pure helpers ─────────────────────────────────────────────────
  function fmt(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }

  function getMonth(dateStr) { return dateStr ? String(dateStr).substring(0, 7) : null; }

  var _today = new Date(); _today.setHours(0, 0, 0, 0);
  function isFuture(dateStr) {
    return !!dateStr && new Date(String(dateStr).substring(0, 10)) > _today;
  }

  function isFutureMonth(m) {
    if (!m) return false;
    var d = new Date(m + '-01');
    d.setMonth(d.getMonth() + 1);
    return d > _today;
  }

  function qualityInfo(dq) {
    if (dq === null || dq === undefined) return { cls: 'mo-qdot-gray', pct: null };
    var raw = parseFloat(dq);
    var pct = Math.round(raw > 1 ? raw : raw * 100);
    return {
      cls: pct >= 95 ? 'mo-qdot-green' : pct >= 80 ? 'mo-qdot-amber' : 'mo-qdot-red',
      pct: pct
    };
  }

  function utilPillsHTML(ev) {
    var defs = [
      { cost: ev.electricCost, color: '#4CAF50' },
      { cost: ev.chwCost,      color: '#2196F3' },
      { cost: ev.steamCost,    color: '#FF9800' },
      { cost: ev.gasCost,      color: '#F44336' }
    ];
    return '<div class="mo-util-pills">' +
      defs.map(function(d) {
        return '<div class="mo-util-pill" style="background:' + (d.cost > 0 ? d.color : '#E5E7EB') + ';"></div>';
      }).join('') +
      '</div>';
  }

  // ── Derive months ───────────────────────────────────────────────
  var monthSet = {};
  var monthEventCounts = {};
  eventSummaries.forEach(function(ev) {
    var m = getMonth(ev.eventStart);
    if (!m) return;
    monthSet[m] = true;
    monthEventCounts[m] = (monthEventCounts[m] || 0) + 1;
  });
  var allMonths = Object.keys(monthSet).sort();

  // ── Mutable state ───────────────────────────────────────────────
  var selectedMonth    = null;
  var curMonthIndex    = 0;
  var sortKey          = 'eventStart';
  var sortDir          = 'desc';
  var searchQuery      = '';

  // DOM refs (assigned during build, used by closures)
  var monthDisplay, prevBtn, nextBtn, allTab, monthTabs;
  var tableTitle, countBadge, tableWrap;
  var chartCanvas;

  // ── Build: Month Picker ─────────────────────────────────────────
  var picker = document.createElement('div');
  picker.className = 'mo-picker';
  container.appendChild(picker);

  var pickerLabel = document.createElement('span');
  pickerLabel.className = 'mo-picker-label';
  pickerLabel.textContent = 'Showing:';
  picker.appendChild(pickerLabel);

  var monthNav = document.createElement('div');
  monthNav.className = 'mo-nav';
  picker.appendChild(monthNav);

  prevBtn = document.createElement('button');
  prevBtn.className = 'mo-nav-btn';
  prevBtn.innerHTML = '&#8249;';
  prevBtn.title = 'Previous month';
  monthNav.appendChild(prevBtn);

  monthDisplay = document.createElement('div');
  monthDisplay.className = 'mo-current';
  monthNav.appendChild(monthDisplay);

  nextBtn = document.createElement('button');
  nextBtn.className = 'mo-nav-btn';
  nextBtn.innerHTML = '&#8250;';
  nextBtn.title = 'Next month';
  monthNav.appendChild(nextBtn);

  var tabRow = document.createElement('div');
  tabRow.className = 'mo-tab-row';
  picker.appendChild(tabRow);

  allTab = document.createElement('button');
  allTab.className = 'mo-month-tab';
  allTab.textContent = 'All';
  tabRow.appendChild(allTab);

  monthTabs = {};
  allMonths.forEach(function(m) {
    var d = new Date(m + '-01');
    var btn = document.createElement('button');
    btn.className = 'mo-month-tab';
    btn.textContent = d.toLocaleDateString('en-US', { month: 'short' });
    btn.title = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    tabRow.appendChild(btn);
    monthTabs[m] = btn;
  });

  // ── Build: KPI Cards ────────────────────────────────────────────
  var cardsRow = document.createElement('div');
  cardsRow.className = 'eap-summary-cards';
  container.appendChild(cardsRow);

  function makeKpiCard(label, colorMod, subText) {
    var card = document.createElement('div');
    card.className = 'eap-summary-card';

    var lbl = document.createElement('div');
    lbl.className = 'eap-summary-card-label';
    lbl.textContent = label;
    card.appendChild(lbl);

    var val = document.createElement('div');
    val.className = 'eap-summary-card-value' + (colorMod ? ' eap-summary-card-value--' + colorMod : '');
    val.textContent = '—';
    card.appendChild(val);

    var sub = document.createElement('div');
    sub.className = 'eap-summary-card-sub';
    sub.textContent = subText || '';
    card.appendChild(sub);

    cardsRow.appendChild(card);
    return val;
  }

  // Compute all-time stats (cards never filtered by month)
  var eventsWithCost  = eventSummaries.filter(function(ev) { return ev.totalCost > 0; });
  var upcomingEvents  = eventSummaries.filter(function(ev) { return isFuture(ev.eventStart); });
  var completedEvents = eventSummaries.filter(function(ev) { return !isFuture(ev.eventStart) && ev.totalCost > 0; });
  var totalAllCost    = eventsWithCost.reduce(function(s, ev) { return s + (ev.totalCost || 0); }, 0);
  var avgCost         = completedEvents.length > 0 ? totalAllCost / completedEvents.length : 0;

  // Range sub-label
  var rangeLabel = '';
  if (allMonths.length > 0) {
    var fmtM = function(m) { return new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };
    rangeLabel = allMonths.length > 1
      ? fmtM(allMonths[0]) + ' — ' + fmtM(allMonths[allMonths.length - 1])
      : fmtM(allMonths[0]);
  }

  // Upcoming sub-label
  var upcomingLabel = 'no upcoming events';
  if (upcomingEvents.length > 0) {
    var upMonths = [];
    var upSeen = {};
    upcomingEvents.forEach(function(ev) {
      var m = getMonth(ev.eventStart);
      if (m && !upSeen[m]) { upSeen[m] = true; upMonths.push(m); }
    });
    upMonths.sort();
    var uf = new Date(upMonths[0] + '-01');
    var fmtShort = function(m) { return new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }); };
    upcomingLabel = upMonths.length > 1
      ? fmtShort(upMonths[0]) + ' — ' + fmtShort(upMonths[upMonths.length - 1]) + ' · pending cost calc'
      : fmtShort(upMonths[0]) + ' · pending cost calc';
  }

  makeKpiCard('Total Events',         '',      rangeLabel).textContent                           = String(eventSummaries.length);
  makeKpiCard('Total Event Cost',     'green', eventsWithCost.length + ' events with cost data').textContent = fmt(totalAllCost);
  makeKpiCard('Avg Cost / Event',     '',      'across completed events').textContent             = fmt(avgCost);
  makeKpiCard('Upcoming Events',      'blue',  upcomingLabel).textContent                        = String(upcomingEvents.length);

  // ── Build: Chart ────────────────────────────────────────────────
  var chartCard = document.createElement('div');
  chartCard.className = 'mo-chart-card';
  container.appendChild(chartCard);

  var chartCardHeader = document.createElement('div');
  chartCardHeader.className = 'mo-chart-card-header';
  chartCard.appendChild(chartCardHeader);

  var chartTitleEl = document.createElement('div');
  chartTitleEl.className = 'mo-chart-card-title';
  chartTitleEl.textContent = 'Monthly Event Cost by Utility';
  chartCardHeader.appendChild(chartTitleEl);

  var chartLegend = document.createElement('div');
  chartLegend.className = 'mo-chart-legend';
  chartLegend.innerHTML =
    '<span class="mo-legend-item"><span class="mo-legend-dot" style="background:#4CAF50;"></span> Electric</span>' +
    '<span class="mo-legend-item"><span class="mo-legend-dot" style="background:#2196F3;"></span> CHW</span>' +
    '<span class="mo-legend-item"><span class="mo-legend-dot" style="background:#FF9800;"></span> Steam</span>' +
    '<span class="mo-legend-item"><span class="mo-legend-dot" style="background:#F44336;"></span> Gas</span>' +
    '<span class="mo-legend-item"><span class="mo-legend-dot" style="background:#E5E7EB;border:1.5px dashed #9CA3AF;"></span> Upcoming</span>';
  chartCardHeader.appendChild(chartLegend);

  var chartBody = document.createElement('div');
  chartBody.style.cssText = 'padding:4px 4px 20px;height:280px;position:relative;';
  chartCard.appendChild(chartBody);

  chartCanvas = document.createElement('canvas');
  chartBody.appendChild(chartCanvas);

  // ── Build: Event Table ──────────────────────────────────────────
  var tableCard = document.createElement('div');
  tableCard.className = 'mo-event-card';
  container.appendChild(tableCard);

  var toolbar = document.createElement('div');
  toolbar.className = 'mo-table-toolbar';
  tableCard.appendChild(toolbar);

  var toolbarLeft = document.createElement('div');
  toolbarLeft.className = 'mo-toolbar-left';
  toolbar.appendChild(toolbarLeft);

  tableTitle = document.createElement('div');
  tableTitle.className = 'mo-table-title';
  toolbarLeft.appendChild(tableTitle);

  countBadge = document.createElement('span');
  countBadge.className = 'mo-table-count';
  toolbarLeft.appendChild(countBadge);

  var searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'mo-search';
  searchInput.placeholder = 'Search by name or ID…';
  searchInput.oninput = function() {
    searchQuery = (searchInput.value || '').toLowerCase().trim();
    renderTable();
  };
  toolbar.appendChild(searchInput);

  tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';
  tableCard.appendChild(tableWrap);

  // ── Logic functions ─────────────────────────────────────────────

  function getFilteredEvents() {
    return eventSummaries.filter(function(ev) {
      if (selectedMonth && getMonth(ev.eventStart) !== selectedMonth) return false;
      if (searchQuery) {
        var nm = (ev.eventName || '').toLowerCase().indexOf(searchQuery) >= 0;
        var id = String(ev.eventID || '').toLowerCase().indexOf(searchQuery) >= 0;
        if (!nm && !id) return false;
      }
      return true;
    });
  }

  function sortEvents(evs) {
    var mult = sortDir === 'asc' ? 1 : -1;
    return evs.slice().sort(function(a, b) {
      var av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'eventStart' || sortKey === 'eventEnd') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else if (typeof av === 'string') {
        av = av.toLowerCase(); bv = (bv || '').toLowerCase();
      } else {
        av = av || 0; bv = bv || 0;
      }
      return av < bv ? -mult : av > bv ? mult : 0;
    });
  }

  function selectMonth(m) {
    selectedMonth = m;
    if (m === null) {
      monthDisplay.textContent = 'All Months';
      allTab.classList.add('mo-month-tab--active');
      allMonths.forEach(function(k) { monthTabs[k].classList.remove('mo-month-tab--active'); });
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    } else {
      monthDisplay.textContent = new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      allTab.classList.remove('mo-month-tab--active');
      curMonthIndex = allMonths.indexOf(m);
      allMonths.forEach(function(k) { monthTabs[k].classList.toggle('mo-month-tab--active', k === m); });
      prevBtn.disabled = curMonthIndex <= 0;
      nextBtn.disabled = curMonthIndex >= allMonths.length - 1;
    }
    renderTable();
    rebuildChart();
  }

  function renderTable() {
    var filtered  = sortEvents(getFilteredEvents());
    var titleText = selectedMonth
      ? new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' — Events'
      : 'All Events';

    tableTitle.textContent  = titleText;
    countBadge.textContent  = filtered.length + (filtered.length === 1 ? ' event' : ' events');

    tableWrap.innerHTML = '';
    if (filtered.length === 0) {
      tableWrap.innerHTML = '<div style="text-align:center;padding:48px;color:#6B7280;font-size:13px;">No events match your filters.</div>';
      return;
    }

    var table = document.createElement('table');
    table.className = 'mo-event-table';

    // ── Header ─────────────────────────────────────────────
    var COLS = [
      { key: null,          label: '',           align: 'center', noSort: true, width: '28px'  },
      { key: 'eventName',   label: 'Event Name', align: 'left'                                 },
      { key: 'eventID',     label: 'ID',         align: 'left'                                 },
      { key: 'eventStart',  label: 'Start',      align: 'left'                                 },
      { key: 'eventEnd',    label: 'End',         align: 'left'                                },
      { key: 'eventSF',     label: 'Sq Ft',       align: 'right'                               },
      { key: null,          label: 'Utilities',   align: 'center', noSort: true, width: '70px' },
      { key: 'totalCost',   label: 'Total Cost',  align: 'right'                               },
      { key: 'dataQuality', label: 'Quality',     align: 'center', noSort: true                }
    ];

    var thead = document.createElement('thead');
    var trh   = document.createElement('tr');
    COLS.forEach(function(col) {
      var th = document.createElement('th');
      if (col.width)          th.style.width = col.width;
      if (col.align === 'right')  th.classList.add('right');
      if (col.align === 'center') th.classList.add('center');
      var lbl = col.label + (sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');
      th.textContent = lbl;
      if (col.key && !col.noSort) {
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

    // ── Body ───────────────────────────────────────────────
    var tbody = document.createElement('tbody');
    filtered.forEach(function(ev) {
      var future = isFuture(ev.eventStart);
      var qi     = qualityInfo(ev.dataQuality);

      var tr = document.createElement('tr');
      if (future) tr.classList.add('mo-future');
      if (!future && ev.totalCost > 0) {
        tr.style.cursor = 'pointer';
        tr.onclick = function() { if (onSelectEvent) onSelectEvent(ev); };
      }

      // Col 0: status dot
      var td0 = document.createElement('td');
      td0.style.textAlign = 'center';
      td0.innerHTML = '<span class="mo-quality-dot ' + qi.cls + '"></span>';
      tr.appendChild(td0);

      // Col 1: Event Name
      var td1 = document.createElement('td');
      td1.innerHTML = '<div class="mo-event-name">' + (ev.eventName || 'Unnamed') + '</div>';
      tr.appendChild(td1);

      // Col 2: ID
      var td2 = document.createElement('td');
      td2.innerHTML = '<span class="mo-event-id">' + (ev.eventID || '—') + '</span>';
      tr.appendChild(td2);

      // Col 3: Start
      var td3 = document.createElement('td');
      td3.textContent = ev.eventStart
        ? new Date(String(ev.eventStart).substring(0, 10)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—';
      tr.appendChild(td3);

      // Col 4: End
      var td4 = document.createElement('td');
      td4.textContent = ev.eventEnd
        ? new Date(String(ev.eventEnd).substring(0, 10)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—';
      tr.appendChild(td4);

      // Col 5: Sq Ft
      var td5 = document.createElement('td');
      td5.className = 'right';
      td5.textContent = ev.eventSF ? Math.round(ev.eventSF).toLocaleString() : '—';
      tr.appendChild(td5);

      // Col 6: Utility pills
      var td6 = document.createElement('td');
      td6.className = 'center';
      td6.innerHTML = utilPillsHTML(ev);
      tr.appendChild(td6);

      // Col 7: Total Cost
      var td7 = document.createElement('td');
      td7.className = 'right';
      if (future || !ev.totalCost) {
        td7.innerHTML = '<span class="mo-pending">Pending</span>';
      } else {
        var costEl = document.createElement('strong');
        costEl.textContent = fmt(ev.totalCost);
        td7.appendChild(costEl);
      }
      tr.appendChild(td7);

      // Col 8: Quality
      var td8 = document.createElement('td');
      td8.className = 'center';
      if (qi.pct !== null) {
        td8.innerHTML = '<span class="mo-quality-dot ' + qi.cls + '"></span>' + qi.pct + '%';
      } else {
        td8.textContent = '—';
      }
      tr.appendChild(td8);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  function buildChart() {
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
    if (months.length === 0) return;

    var labels = months.map(function(m) {
      var shortMon = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      var cnt = monthEventCounts[m] || 0;
      return [shortMon, cnt + ' event' + (cnt !== 1 ? 's' : '')];
    });

    var loader = window.EventCostV2.loader;
    loader.loadChartJs(function() {
      var Chart = window.Chart;
      if (!Chart) return;

      if (window._ecv2MonthlyChart) {
        try { window._ecv2MonthlyChart.destroy(); } catch(e) {}
        window._ecv2MonthlyChart = null;
      }

      var datasets = ['Electric', 'CHW', 'Steam', 'Gas'].map(function(u) {
        var base = colors[u];
        return {
          label: u,
          data: months.map(function(m) { return Math.round(monthMap[m][u] || 0); }),
          backgroundColor: months.map(function(m) {
            var fut = isFutureMonth(m);
            if (selectedMonth && m !== selectedMonth) {
              return fut ? base + '18' : base + '44';
            }
            return fut ? base + '44' : base + 'CC';
          }),
          borderColor: months.map(function(m) {
            return isFutureMonth(m) ? base + '55' : base;
          }),
          borderWidth: 1,
          borderRadius: 2
        };
      });

      window._ecv2MonthlyChart = new Chart(chartCanvas.getContext('2d'), {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function(ctx) {
                  var m = months[ctx[0].dataIndex];
                  return new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                },
                label: function(ctx) {
                  if (!ctx.parsed.y) return null;
                  return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString();
                },
                footer: function(ctx) {
                  var m = months[ctx[0].dataIndex];
                  var cnt = monthEventCounts[m] || 0;
                  return cnt + ' event' + (cnt !== 1 ? 's' : '');
                }
              }
            }
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { font: { size: 10 }, color: '#9CA3AF' }
            },
            y: {
              stacked: true,
              grid: { color: '#F3F4F6' },
              ticks: {
                font: { size: 10 },
                color: '#9CA3AF',
                callback: function(v) {
                  if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                  return '$' + (v / 1000).toFixed(0) + 'k';
                }
              }
            }
          },
          onClick: function(event, elements) {
            if (!elements || elements.length === 0) return;
            var clicked = months[elements[0].index];
            selectMonth(selectedMonth === clicked ? null : clicked);
          },
          onHover: function(event, elements) {
            chartCanvas.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
          }
        }
      });
    });
  }

  function rebuildChart() {
    buildChart();
  }

  // ── Wire up event listeners ─────────────────────────────────────
  allTab.onclick = function() { selectMonth(null); };
  allMonths.forEach(function(m) {
    monthTabs[m].onclick = function() { selectMonth(m); };
  });
  prevBtn.onclick = function() {
    if (curMonthIndex > 0) { curMonthIndex--; selectMonth(allMonths[curMonthIndex]); }
  };
  nextBtn.onclick = function() {
    if (curMonthIndex < allMonths.length - 1) { curMonthIndex++; selectMonth(allMonths[curMonthIndex]); }
  };

  // ── Initial render ──────────────────────────────────────────────
  // Default: most recent non-future month
  var initialMonth = null;
  for (var i = allMonths.length - 1; i >= 0; i--) {
    if (!isFutureMonth(allMonths[i])) { initialMonth = allMonths[i]; break; }
  }
  if (!initialMonth && allMonths.length > 0) initialMonth = allMonths[0];

  selectMonth(initialMonth);  // triggers renderTable() + rebuildChart()
  buildChart();               // build chart (selectMonth already called rebuildChart, this is for initial)
};
