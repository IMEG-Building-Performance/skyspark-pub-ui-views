/**
 * UtilityReconciliation.js — Tab 2: Event cost vs. utility bill comparison
 *
 * Renders:
 *  - Utility selector (Electric / CHW / Steam / Gas)
 *  - Grouped bar chart: Bill Cost vs Event-Attributed Cost + attribution % line
 *  - Comparison table by month
 *
 * NOTE: Utility bill data uses placeholder/demo values.
 * Replace getDemoBillData() with a real API call when available.
 * Look for the comment "// TODO: REAL API CALL" below.
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.utilityReconciliation = {};

window.EventCostV2.utilityReconciliation.render = function(container, eventCostResults) {
  var cfg    = window.EventCostV2.config;
  var colors = cfg.utilityCostColors;
  var interactions = window.EventCostV2.interactions;

  container.innerHTML = '';
  container.style.padding = '24px 28px';

  var currentUtility = window.EventCostV2.state.reconciliationUtility || 'Electric';

  // ── Placeholder bill data ──────────────────────────────────────────
  // TODO: REAL API CALL — Replace this function with a call to the
  //   utility billing system. The real call should return per-month
  //   total utility costs for the selected utility type and site.
  //   Expected return: { 'YYYY-MM': dollarAmount, ... }
  function getDemoBillData(utility) {
    var monthlyEventCost = getMonthlyEventCost(utility);
    var months = Object.keys(monthlyEventCost);
    var demo = {};
    months.forEach(function(m) {
      var eventCost = monthlyEventCost[m] || 0;
      var factor = { Electric: 4.5, CHW: 3.8, Steam: 5.2, Gas: 4.0 }[utility] || 4.0;
      demo[m] = Math.round(eventCost * factor * (0.9 + Math.random() * 0.2));
    });
    return demo;
  }

  // ── Aggregate event costs by month/utility ──────────────────────
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

  // ── Summary card strip ──────────────────────────────────────────
  var utilityBar = interactions.createCostUtilityToggle(currentUtility, function(u) {
    currentUtility = u;
    window.EventCostV2.state.reconciliationUtility = u;
    renderContent();
  });
  utilityBar.style.marginBottom = '20px';
  container.appendChild(utilityBar);

  var cardsRow = document.createElement('div');
  cardsRow.className = 'eap-summary-cards';
  container.appendChild(cardsRow);

  var cardBillCost   = makeCard('Total Bill Cost (est.)', cardsRow);
  var cardEventCost  = makeCard('Event-Attributed Cost', cardsRow);
  var cardAttribPct  = makeCard('Attribution %', cardsRow);
  var cardMonths     = makeCard('Months w/ Data', cardsRow);

  function makeCard(label, parent) {
    var card = document.createElement('div');
    card.className = 'eap-summary-card';
    var lbl = document.createElement('div');
    lbl.className = 'eap-summary-card-label';
    lbl.textContent = label;
    card.appendChild(lbl);
    var val = document.createElement('div');
    val.className = 'eap-summary-card-value';
    val.textContent = '—';
    card.appendChild(val);
    parent.appendChild(card);
    return val;
  }

  // ── Chart section ───────────────────────────────────────────────
  var chartSection = document.createElement('div');
  chartSection.style.cssText = 'background:white;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:20px;overflow:hidden;';
  container.appendChild(chartSection);

  var chartHeader = document.createElement('div');
  chartHeader.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid #E5E7EB;';
  chartSection.appendChild(chartHeader);

  var chartTitle = document.createElement('h3');
  chartTitle.style.cssText = 'font-size:14px;font-weight:700;color:#374151;margin:0;flex:1;';
  chartHeader.appendChild(chartTitle);

  var demoBadge = document.createElement('span');
  demoBadge.textContent = '⚠ Bill data is placeholder — replace with real API call';
  demoBadge.style.cssText = 'font-size:11px;color:#856404;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:3px 8px;';
  chartHeader.appendChild(demoBadge);

  var chartBody = document.createElement('div');
  chartBody.style.cssText = 'padding:16px 20px;height:300px;position:relative;';
  chartSection.appendChild(chartBody);

  var chartCanvas = document.createElement('canvas');
  chartBody.appendChild(chartCanvas);

  // ── Table section ───────────────────────────────────────────────
  var tableSection = document.createElement('div');
  tableSection.style.cssText = 'background:white;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;';
  container.appendChild(tableSection);

  var tableTitleEl = document.createElement('div');
  tableTitleEl.style.cssText = 'padding:14px 20px;border-bottom:1px solid #E5E7EB;font-size:14px;font-weight:700;color:#374151;';
  tableSection.appendChild(tableTitleEl);

  var tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'overflow-x:auto;';
  tableSection.appendChild(tableWrap);

  // ── Render function ─────────────────────────────────────────────
  function renderContent() {
    var utility = currentUtility;
    var utilityCfg = cfg.utilityConfig[utility] || {};
    var eventCostByMonth = getMonthlyEventCost(utility);
    var billCostByMonth  = getDemoBillData(utility);
    var months = Object.keys(Object.assign({}, eventCostByMonth, billCostByMonth)).sort();

    chartTitle.textContent = utility + ' — Monthly Bill vs. Event Attribution';

    // Update cards
    var totalBill   = months.reduce(function(s, m) { return s + (billCostByMonth[m]  || 0); }, 0);
    var totalEvent  = months.reduce(function(s, m) { return s + (eventCostByMonth[m] || 0); }, 0);
    var pct = totalBill > 0 ? (totalEvent / totalBill * 100) : 0;
    cardBillCost.textContent  = '$' + Math.round(totalBill).toLocaleString();
    cardEventCost.textContent = '$' + Math.round(totalEvent).toLocaleString();
    cardAttribPct.textContent = pct.toFixed(1) + '%';
    cardMonths.textContent    = String(months.length);

    // Build chart
    buildChart(months, eventCostByMonth, billCostByMonth, utility, colors[utility]);

    // Build table
    buildTable(months, eventCostByMonth, billCostByMonth, utility);
    tableTitleEl.textContent = utility + ' Monthly Reconciliation Table';
  }

  function buildChart(months, eventCostByMonth, billCostByMonth, utility, utilColor) {
    var loader = window.EventCostV2.loader;
    loader.loadChartJs(function() {
      var Chart = window.Chart;
      if (!Chart) return;

      if (window._ecv2ReconcChart) {
        try { window._ecv2ReconcChart.destroy(); } catch(e) {}
      }

      var labels = months.map(function(m) {
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
              label: 'Bill Cost (est.)',
              data: billData,
              backgroundColor: '#9E9E9ECC',
              borderColor: '#9E9E9E',
              borderWidth: 1,
              borderRadius: 3,
              yAxisID: 'yCost'
            },
            {
              type: 'bar',
              label: 'Event Cost',
              data: eventData,
              backgroundColor: utilColor + 'CC',
              borderColor: utilColor,
              borderWidth: 1,
              borderRadius: 3,
              yAxisID: 'yCost'
            },
            {
              type: 'line',
              label: 'Attribution %',
              data: pctData,
              borderColor: '#E91E63',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: '#E91E63',
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
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  if (ctx.datasetIndex === 2) return ctx.dataset.label + ': ' + ctx.parsed.y + '%';
                  return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString();
                }
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            yCost: {
              type: 'linear', position: 'left',
              ticks: { callback: function(v) { return '$' + (v/1000).toFixed(0) + 'k'; } }
            },
            yPct: {
              type: 'linear', position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { callback: function(v) { return v + '%'; } },
              min: 0, max: 100
            }
          }
        }
      });
    });
  }

  function buildTable(months, eventCostByMonth, billCostByMonth, utility) {
    tableWrap.innerHTML = '';
    if (months.length === 0) {
      tableWrap.innerHTML = '<div style="text-align:center;padding:40px;color:#6c757d;font-size:13px;">No data for this utility.</div>';
      return;
    }

    // Compute historical average attribution % for variance flagging
    var attribPcts = months.map(function(m) {
      var b = billCostByMonth[m] || 0;
      var e = eventCostByMonth[m] || 0;
      return b > 0 ? e / b * 100 : 0;
    }).filter(function(p) { return p > 0; });
    var avgPct = attribPcts.length > 0 ? attribPcts.reduce(function(s, p) { return s + p; }, 0) / attribPcts.length : 0;

    var table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';

    var thStyle = 'padding:10px 14px;background:#1565c0;color:white;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;text-align:right;white-space:nowrap;';
    var thStyleLeft = thStyle + 'text-align:left;';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr>' +
      '<th style="' + thStyleLeft + '">Month</th>' +
      '<th style="' + thStyle + '">Bill Cost (est.)</th>' +
      '<th style="' + thStyle + '">Event Cost</th>' +
      '<th style="' + thStyle + '">Non-Event Cost</th>' +
      '<th style="' + thStyle + '">Attribution %</th>' +
      '<th style="' + thStyle + '">Flag</th>' +
      '</tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    months.forEach(function(m, i) {
      var bill   = billCostByMonth[m]  || 0;
      var event  = eventCostByMonth[m] || 0;
      var nonEvt = Math.max(0, bill - event);
      var pct    = bill > 0 ? event / bill * 100 : 0;
      var isHighVariance = avgPct > 0 && (pct > avgPct * 1.5 || pct < avgPct * 0.5) && pct > 0;
      var label = new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      var tr = document.createElement('tr');
      tr.style.cssText = 'background:' + (i % 2 === 0 ? 'white' : '#f9fafb') + ';';
      tr.onmouseover = function() { tr.style.background = '#EBF5FB'; };
      tr.onmouseout  = function() { tr.style.background = i % 2 === 0 ? 'white' : '#f9fafb'; };

      var tdStyle = 'padding:9px 14px;border-bottom:1px solid #f0f0f0;color:#374151;';
      tr.innerHTML =
        '<td style="' + tdStyle + 'font-weight:600;">' + label + '</td>' +
        '<td style="' + tdStyle + 'text-align:right;">' + (bill ? '$' + Math.round(bill).toLocaleString() : '—') + '</td>' +
        '<td style="' + tdStyle + 'text-align:right;color:' + (colors[utility] || '#374151') + ';font-weight:600;">' + (event ? '$' + Math.round(event).toLocaleString() : '—') + '</td>' +
        '<td style="' + tdStyle + 'text-align:right;">' + (nonEvt ? '$' + Math.round(nonEvt).toLocaleString() : '—') + '</td>' +
        '<td style="' + tdStyle + 'text-align:right;font-weight:600;">' + (pct ? pct.toFixed(1) + '%' : '—') + '</td>' +
        '<td style="' + tdStyle + 'text-align:center;">' + (isHighVariance ? '<span title="Unusual attribution %" style="padding:2px 8px;background:#FEF3C7;color:#92400E;border-radius:4px;font-size:11px;font-weight:600;">⚠ Flag</span>' : '<span style="color:#adb5bd;font-size:11px;">OK</span>') + '</td>';

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  // ── Initial render ──────────────────────────────────────────────
  renderContent();
};
