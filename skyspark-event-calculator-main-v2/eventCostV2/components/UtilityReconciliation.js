/**
 * UtilityReconciliation.js — Tab 2: Event cost vs. utility bill comparison
 *
 * Sections:
 *  1. Utility toggle (Electric / CHW / Steam / Gas)
 *  2. KPI summary cards (Bill Cost, Event Cost, Recovery %, Unrecovered)
 *  3. Monthly bar + recovery % line chart
 *  4. Annual Effective Rates panel (demo — TODO: real EnergyCAP API call)
 *  5. Monthly reconciliation table with recovery badges
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.utilityReconciliation = {};

window.EventCostV2.utilityReconciliation.render = function(container, eventCostResults) {
  var cfg          = window.EventCostV2.config;
  var colors       = cfg.utilityCostColors;
  var interactions = window.EventCostV2.interactions;

  container.innerHTML = '';
  container.style.padding = '24px 28px';

  var currentUtility = window.EventCostV2.state.reconciliationUtility || 'Electric';

  // ── Placeholder bill data ──────────────────────────────────────────
  // TODO: REAL API CALL — Replace getDemoBillData() with a query to the
  //   utility billing system (e.g. EnergyCAP). Return per-month total
  //   utility costs keyed as { 'YYYY-MM': dollarAmount }.
  function getDemoBillData(utility) {
    var monthlyEventCost = getMonthlyEventCost(utility);
    var months = Object.keys(monthlyEventCost);
    if (months.length === 0) {
      var now = new Date();
      for (var mi = 11; mi >= 0; mi--) {
        var d = new Date(now.getFullYear(), now.getMonth() - mi, 1);
        months.push(d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2));
      }
    }
    var baseCosts = { Electric: 180000, CHW: 65000, Steam: 42000, Gas: 18000 };
    var factors   = { Electric: 4.5,    CHW: 3.8,   Steam: 5.2,   Gas: 4.0 };
    var demo = {};
    months.forEach(function(m) {
      var eventCost = monthlyEventCost[m] || 0;
      if (eventCost > 0) {
        demo[m] = Math.round(eventCost * (factors[utility] || 4.0) * (0.9 + Math.random() * 0.2));
      } else {
        demo[m] = Math.round((baseCosts[utility] || 150000) * (0.85 + Math.random() * 0.3));
      }
    });
    return demo;
  }

  // ── Aggregate event costs by month ────────────────────────────────
  function getMonthlyEventCost(utility) {
    var map = {};
    (eventCostResults || []).forEach(function(r) {
      if (r.utilityType !== utility) return;
      var m = (r.eventStart || '').substring(0, 7);
      if (!m) return;
      map[m] = (map[m] || 0) + (r.cost || 0);
    });
    return map;
  }

  // Count distinct events per month for a utility
  function getMonthlyEventCounts(utility) {
    var seen = {};
    (eventCostResults || []).forEach(function(r) {
      if (r.utilityType !== utility) return;
      var m = (r.eventStart || '').substring(0, 7);
      if (!m) return;
      if (!seen[m]) seen[m] = {};
      if (r.eventID) seen[m][r.eventID] = true;
    });
    var counts = {};
    Object.keys(seen).forEach(function(m) { counts[m] = Object.keys(seen[m]).length; });
    return counts;
  }

  // Sum distinct event SF per month (each event counted once)
  function getMonthlyEventSF(utility) {
    var sfByEvent = {}, monthByEvent = {};
    (eventCostResults || []).forEach(function(r) {
      if (r.utilityType !== utility || !r.eventID) return;
      var m = (r.eventStart || '').substring(0, 7);
      if (!m) return;
      if (!sfByEvent[r.eventID]) {
        sfByEvent[r.eventID] = r.eventSF || 0;
        monthByEvent[r.eventID] = m;
      }
    });
    var map = {};
    Object.keys(sfByEvent).forEach(function(id) {
      var m = monthByEvent[id];
      map[m] = (map[m] || 0) + sfByEvent[id];
    });
    return map;
  }

  // ── Annual rate demo data ──────────────────────────────────────────
  // TODO: REAL API CALL — Replace with a query to EnergyCAP / billing system
  //   returning weighted-average effective rates per utility per year.
  function getAnnualRates(year) {
    var allRates = {
      2024: {
        Electric: { rate: 0.219, unit: 'per kWh',   trendVal: null,  trendDir: 0  },
        CHW:      { rate: 0.429, unit: 'per ton-hr', trendVal: null,  trendDir: 0  },
        Steam:    { rate: 19.02, unit: 'per Mlb',    trendVal: null,  trendDir: 0  },
        Gas:      { rate: 0.704, unit: 'per therm',  trendVal: null,  trendDir: 0  },
        Water:    { rate: 7.86,  unit: 'per kgal',   trendVal: null,  trendDir: 0  }
      },
      2025: {
        Electric: { rate: 0.228, unit: 'per kWh',   trendVal: 4.2,   trendDir: 1  },
        CHW:      { rate: 0.421, unit: 'per ton-hr', trendVal: -1.8,  trendDir: -1 },
        Steam:    { rate: 19.42, unit: 'per Mlb',    trendVal: 2.1,   trendDir: 1  },
        Gas:      { rate: 0.794, unit: 'per therm',  trendVal: 12.7,  trendDir: 1  },
        Water:    { rate: 7.89,  unit: 'per kgal',   trendVal: 0.3,   trendDir: 0  }
      },
      2026: {
        Electric: { rate: 0.236, unit: 'per kWh',   trendVal: 3.5,   trendDir: 1  },
        CHW:      { rate: 0.435, unit: 'per ton-hr', trendVal: 3.3,   trendDir: 1  },
        Steam:    { rate: 19.78, unit: 'per Mlb',    trendVal: 1.9,   trendDir: 1  },
        Gas:      { rate: 0.812, unit: 'per therm',  trendVal: 2.3,   trendDir: 1  },
        Water:    { rate: 8.12,  unit: 'per kgal',   trendVal: 2.9,   trendDir: 1  }
      }
    };
    return allRates[year] || allRates[2025];
  }

  // ── Utility toggle ─────────────────────────────────────────────────
  var utilityBar = interactions.createCostUtilityToggle(currentUtility, function(u) {
    currentUtility = u;
    window.EventCostV2.state.reconciliationUtility = u;
    renderContent();
  });
  utilityBar.style.marginBottom = '20px';
  container.appendChild(utilityBar);

  // ── KPI summary cards ──────────────────────────────────────────────
  var cardsRow = document.createElement('div');
  cardsRow.className = 'eap-summary-cards';
  container.appendChild(cardsRow);

  function makeKpiCard(label, colorMod, subText, parent) {
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

    parent.appendChild(card);
    return { val: val, sub: sub };
  }

  var cardBillCost    = makeKpiCard('Total Bill Cost',             'dark',  '',                          cardsRow);
  var cardEventCost   = makeKpiCard('Total Event-Attributed Cost', 'green', 'from eventCostResult records', cardsRow);
  var cardRecoveryPct = makeKpiCard('Recovery %',                  'amber', 'event cost ÷ bill cost',  cardsRow);
  var cardUnrecovered = makeKpiCard('Unrecovered Cost',            'dark',  'bill cost − event cost',  cardsRow);

  // ── Chart card ─────────────────────────────────────────────────────
  var chartCard = document.createElement('div');
  chartCard.className = 'ur-chart-card';
  container.appendChild(chartCard);

  var chartCardHeader = document.createElement('div');
  chartCardHeader.className = 'ur-chart-card-header';
  chartCard.appendChild(chartCardHeader);

  var chartTitle = document.createElement('div');
  chartTitle.className = 'ur-chart-card-title';
  chartCardHeader.appendChild(chartTitle);

  var chartLegend = document.createElement('div');
  chartLegend.className = 'ur-chart-legend';
  chartLegend.innerHTML =
    '<span class="ur-legend-item"><span class="ur-legend-dot" style="background:#D1D5DB;"></span> Bill Cost</span>' +
    '<span class="ur-legend-item"><span class="ur-legend-dot ur-legend-dot--event"></span> Event Cost</span>' +
    '<span class="ur-legend-item"><span class="ur-legend-dot ur-legend-dot--pct"></span> Recovery %</span>';
  chartCardHeader.appendChild(chartLegend);

  var chartBody = document.createElement('div');
  chartBody.style.cssText = 'padding:4px 4px 20px;height:300px;position:relative;';
  chartCard.appendChild(chartBody);

  var chartCanvas = document.createElement('canvas');
  chartBody.appendChild(chartCanvas);

  // ── Annual Effective Rates ─────────────────────────────────────────
  var rateCard = document.createElement('div');
  rateCard.className = 'ur-rate-card';
  container.appendChild(rateCard);

  var rateCardHeader = document.createElement('div');
  rateCardHeader.className = 'ur-rate-card-header';
  rateCard.appendChild(rateCardHeader);

  var rateTitleGroup = document.createElement('div');
  rateTitleGroup.innerHTML =
    '<div class="ur-rate-card-title">Annual Effective Rates</div>' +
    '<div class="ur-rate-card-sub">Weighted average from EnergyCAP billing data (demo — replace with real API)</div>';
  rateCardHeader.appendChild(rateTitleGroup);

  var rateYearTabs = document.createElement('div');
  rateYearTabs.className = 'ur-rate-year-tabs';

  var currentYear    = new Date().getFullYear();
  var years          = [currentYear - 1, currentYear, currentYear + 1];
  var activeRateYear = currentYear;
  var yearTabBtns    = {};

  years.forEach(function(y) {
    var btn = document.createElement('button');
    btn.className = 'ur-rate-year-tab' + (y === activeRateYear ? ' ur-rate-year-tab--active' : '');
    btn.textContent = y;
    btn.onclick = function() {
      activeRateYear = y;
      years.forEach(function(yr) {
        yearTabBtns[yr].classList.toggle('ur-rate-year-tab--active', yr === y);
      });
      renderRateTiles(y);
    };
    rateYearTabs.appendChild(btn);
    yearTabBtns[y] = btn;
  });
  rateCardHeader.appendChild(rateYearTabs);

  var rateGrid = document.createElement('div');
  rateGrid.className = 'ur-rate-grid';
  rateCard.appendChild(rateGrid);

  function renderRateTiles(year) {
    rateGrid.innerHTML = '';
    var rates = getAnnualRates(year);
    var utilOrder  = ['Electric', 'CHW', 'Steam', 'Gas', 'Water'];
    var utilLabels = { Electric: 'Electric', CHW: 'Chilled Water', Steam: 'Steam', Gas: 'Natural Gas', Water: 'Water' };
    var utilKeys   = { Electric: 'ur-rt-elec', CHW: 'ur-rt-chw', Steam: 'ur-rt-steam', Gas: 'ur-rt-gas', Water: 'ur-rt-water' };

    utilOrder.forEach(function(u) {
      var r = rates[u];
      if (!r) return;

      var rateStr = (r.rate < 1) ? '$' + r.rate.toFixed(3) : '$' + r.rate.toFixed(2);

      var trendHTML = '';
      if (r.trendVal !== null) {
        var t = r.trendVal;
        var cls   = t > 0.5 ? 'ur-trend-up' : (t < -0.5 ? 'ur-trend-down' : 'ur-trend-flat');
        var arrow = t > 0.5 ? '▲' : (t < -0.5 ? '▼' : '—');
        var sign  = t > 0 ? '+' : '';
        trendHTML = '<div class="ur-rate-trend ' + cls + '">' + arrow + ' ' + sign + Math.abs(t).toFixed(1) + '% vs ' + (year - 1) + '</div>';
      }

      var tile = document.createElement('div');
      tile.className = 'ur-rate-tile';
      tile.innerHTML =
        '<div class="ur-rt-utility ' + utilKeys[u] + '">' + utilLabels[u] + '</div>' +
        '<div class="ur-rt-rate">' + rateStr + '</div>' +
        '<div class="ur-rt-unit">' + r.unit + '</div>' +
        trendHTML;
      rateGrid.appendChild(tile);
    });
  }

  // ── Monthly detail table ───────────────────────────────────────────
  var tableCard = document.createElement('div');
  tableCard.className = 'ur-detail-card';
  container.appendChild(tableCard);

  var tableCardHeader = document.createElement('div');
  tableCardHeader.className = 'ur-detail-card-header';
  tableCard.appendChild(tableCardHeader);

  var tableTitleEl = document.createElement('div');
  tableTitleEl.className = 'ur-detail-card-title';
  tableCardHeader.appendChild(tableTitleEl);

  var tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';
  tableCard.appendChild(tableWrap);

  // ── Main render ────────────────────────────────────────────────────
  function renderContent() {
    var utility    = currentUtility;
    var utilColor  = colors[utility] || '#4CAF50';

    var eventCostByMonth  = getMonthlyEventCost(utility);
    var billCostByMonth   = getDemoBillData(utility);
    var eventCountByMonth = getMonthlyEventCounts(utility);
    var eventSFByMonth    = getMonthlyEventSF(utility);
    var months = Object.keys(Object.assign({}, eventCostByMonth, billCostByMonth)).sort();

    // Chart title + legend event color dot
    chartTitle.textContent = utility + ' — Monthly Bill vs. Event Attribution';
    var evtDot = chartLegend.querySelector('.ur-legend-dot--event');
    if (evtDot) evtDot.style.background = utilColor;

    // KPI cards
    var totalBill  = months.reduce(function(s, m) { return s + (billCostByMonth[m]  || 0); }, 0);
    var totalEvent = months.reduce(function(s, m) { return s + (eventCostByMonth[m] || 0); }, 0);
    var totalUnrec = Math.max(0, totalBill - totalEvent);
    var recovPct   = totalBill > 0 ? totalEvent / totalBill * 100 : 0;

    cardBillCost.val.textContent    = '$' + Math.round(totalBill).toLocaleString();
    cardEventCost.val.textContent   = '$' + Math.round(totalEvent).toLocaleString();
    cardRecoveryPct.val.textContent = recovPct.toFixed(1) + '%';
    cardUnrecovered.val.textContent = '$' + Math.round(totalUnrec).toLocaleString();
    cardBillCost.sub.textContent    = months.length + ' months · ' + utility;

    buildChart(months, eventCostByMonth, billCostByMonth, utilColor);
    renderRateTiles(activeRateYear);
    tableTitleEl.textContent = utility + ' — Monthly Reconciliation';
    buildTable(months, eventCostByMonth, billCostByMonth, eventCountByMonth, eventSFByMonth, utilColor);
  }

  function buildChart(months, eventCostByMonth, billCostByMonth, utilColor) {
    var loader = window.EventCostV2.loader;
    loader.loadChartJs(function() {
      var Chart = window.Chart;
      if (!Chart) return;

      if (window._ecv2ReconcChart) {
        try { window._ecv2ReconcChart.destroy(); } catch(e) {}
        window._ecv2ReconcChart = null;
      }

      var labels    = months.map(function(m) {
        return new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      });
      var billData  = months.map(function(m) { return Math.round(billCostByMonth[m]  || 0); });
      var eventData = months.map(function(m) { return Math.round(eventCostByMonth[m] || 0); });
      var pctData   = months.map(function(m, i) {
        var b = billData[i], e = eventData[i];
        return b > 0 ? parseFloat((e / b * 100).toFixed(1)) : 0;
      });

      window._ecv2ReconcChart = new Chart(chartCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              type: 'bar',
              label: 'Bill Cost',
              data: billData,
              backgroundColor: '#D1D5DB',
              borderColor: '#D1D5DB',
              borderWidth: 0,
              borderRadius: 2,
              yAxisID: 'yCost'
            },
            {
              type: 'bar',
              label: 'Event Cost',
              data: eventData,
              backgroundColor: utilColor,
              borderColor: utilColor,
              borderWidth: 0,
              borderRadius: 2,
              yAxisID: 'yCost'
            },
            {
              type: 'line',
              label: 'Recovery %',
              data: pctData,
              borderColor: '#DC2626',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 5,
              pointBackgroundColor: '#DC2626',
              pointBorderColor: '#fff',
              pointBorderWidth: 1.5,
              tension: 0.3,
              yAxisID: 'yPct'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  if (ctx.datasetIndex === 2) return 'Recovery: ' + ctx.parsed.y + '%';
                  return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString();
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11 }, color: '#9CA3AF' }
            },
            yCost: {
              type: 'linear',
              position: 'left',
              grid: { color: '#F3F4F6' },
              ticks: {
                font: { size: 10 },
                color: '#9CA3AF',
                callback: function(v) {
                  if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                  return '$' + (v / 1000).toFixed(0) + 'k';
                }
              }
            },
            yPct: {
              type: 'linear',
              position: 'right',
              min: 0,
              max: 100,
              grid: { drawOnChartArea: false },
              ticks: {
                font: { size: 10 },
                color: '#DC2626',
                callback: function(v) { return v + '%'; }
              }
            }
          }
        }
      });
    });
  }

  function buildTable(months, eventCostByMonth, billCostByMonth, eventCountByMonth, eventSFByMonth, utilColor) {
    tableWrap.innerHTML = '';
    if (months.length === 0) {
      tableWrap.innerHTML = '<div style="text-align:center;padding:40px;color:#6B7280;font-size:13px;">No data for this utility.</div>';
      return;
    }

    var table = document.createElement('table');
    table.className = 'ur-detail-table';

    var thead = document.createElement('thead');
    thead.innerHTML =
      '<tr>' +
        '<th>Month</th>' +
        '<th class="right">Bill Cost</th>' +
        '<th class="right">Event Cost</th>' +
        '<th class="right">Unrecovered</th>' +
        '<th class="right">Recovery %</th>' +
        '<th class="right">Events</th>' +
        '<th class="right">Event SF</th>' +
      '</tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    var totBill = 0, totEvent = 0, totEvents = 0;

    months.forEach(function(m) {
      var bill   = billCostByMonth[m]   || 0;
      var event  = eventCostByMonth[m]  || 0;
      var nonEvt = Math.max(0, bill - event);
      var pct    = bill > 0 ? event / bill * 100 : 0;
      var evtCnt = eventCountByMonth[m] || 0;
      var sf     = eventSFByMonth[m]    || 0;

      totBill   += bill;
      totEvent  += event;
      totEvents += evtCnt;

      var label     = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      var badgeCls  = pct >= 30 ? 'ur-recovery-high' : (pct >= 20 ? 'ur-recovery-mid' : 'ur-recovery-low');
      var pctCell   = pct ? '<span class="ur-recovery-badge ' + badgeCls + '">' + pct.toFixed(1) + '%</span>' : '—';

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="bold">' + label + '</td>' +
        '<td class="right">' + (bill  ? '$' + Math.round(bill).toLocaleString()  : '—') + '</td>' +
        '<td class="right" style="color:' + utilColor + ';font-weight:600;">' + (event ? '$' + Math.round(event).toLocaleString() : '—') + '</td>' +
        '<td class="right">' + (nonEvt ? '$' + Math.round(nonEvt).toLocaleString() : '—') + '</td>' +
        '<td class="right">' + pctCell + '</td>' +
        '<td class="right">' + (evtCnt || '—') + '</td>' +
        '<td class="right">' + (sf ? Math.round(sf).toLocaleString() : '—') + '</td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    var totUnrec   = Math.max(0, totBill - totEvent);
    var totPct     = totBill > 0 ? totEvent / totBill * 100 : 0;
    var totBadgeCls = totPct >= 30 ? 'ur-recovery-high' : (totPct >= 20 ? 'ur-recovery-mid' : 'ur-recovery-low');

    var tfoot = document.createElement('tfoot');
    tfoot.innerHTML =
      '<tr>' +
        '<td class="bold">Total</td>' +
        '<td class="right">$' + Math.round(totBill).toLocaleString() + '</td>' +
        '<td class="right">$' + Math.round(totEvent).toLocaleString() + '</td>' +
        '<td class="right">$' + Math.round(totUnrec).toLocaleString() + '</td>' +
        '<td class="right"><span class="ur-recovery-badge ' + totBadgeCls + '">' + totPct.toFixed(1) + '%</span></td>' +
        '<td class="right">' + totEvents + '</td>' +
        '<td class="right">—</td>' +
      '</tr>';
    table.appendChild(tfoot);

    tableWrap.appendChild(table);
  }

  renderContent();
};
