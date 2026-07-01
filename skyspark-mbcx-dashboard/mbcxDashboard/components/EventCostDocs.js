window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};
window.mbcxDashboard.eventCost.documentation = {};

window.mbcxDashboard.eventCost.documentation.renderTab = function(container) {
  container.innerHTML = '';
  container.style.padding = '24px 28px';

  var showMethodology = true;

  var sectionStyle = 'background:white;border:1px solid #E5E7EB;border-radius:8px;padding:24px 28px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);';
  var h2Style = 'font-size:18px;font-weight:700;color:#1565c0;margin:0 0 16px 0;padding-bottom:12px;border-bottom:2px solid #E5E7EB;';
  var h3Style = 'font-size:14px;font-weight:700;color:#374151;margin:20px 0 8px 0;';
  var pStyle  = 'font-size:13px;color:#4B5563;line-height:1.7;margin:0 0 10px 0;';
  var ulStyle = 'font-size:13px;color:#4B5563;line-height:1.7;margin:0 0 10px 0;padding-left:20px;';

  function section(title, buildFn) {
    var div = document.createElement('div');
    div.style.cssText = sectionStyle;
    var h2 = document.createElement('h2');
    h2.textContent = title;
    h2.style.cssText = h2Style;
    div.appendChild(h2);
    buildFn(div);
    container.appendChild(div);
  }

  function p(parent, text) {
    var el = document.createElement('p');
    el.style.cssText = pStyle;
    el.textContent = text;
    parent.appendChild(el);
  }

  function h3(parent, text) {
    var el = document.createElement('h3');
    el.style.cssText = h3Style;
    el.textContent = text;
    parent.appendChild(el);
  }

  function ul(parent, items) {
    var list = document.createElement('ul');
    list.style.cssText = ulStyle;
    items.forEach(function(item) {
      var li = document.createElement('li');
      if (typeof item === 'string') li.textContent = item;
      else { li.innerHTML = item; }
      list.appendChild(li);
    });
    parent.appendChild(list);
  }

  section('User Guide', function(div) {
    h3(div, 'Tab 1 — Monthly Overview');
    p(div, 'The landing page. Shows total event cost for the selected date range, broken down by month and utility. Use the summary cards at the top to get a quick sense of the period. Click a bar in the chart to filter the table to that month. Click any event row to open the Event Detail view.');

    h3(div, 'Tab 2 — Utility Reconciliation');
    p(div, 'Compares event-attributed utility costs to the total utility bill. Use the utility selector to switch between Electric, CHW, Steam, and Gas. The chart shows estimated bill cost (gray bars) vs. event cost (colored bars) with an attribution percentage line. Months flagged as "Flag" in the table have unusually high or low attribution compared to the historical average — investigate these for data quality issues or unusual events.');
    p(div, 'Note: Utility bill data is currently placeholder/estimated. The real data feed from the billing system will replace this when integrated.');

    h3(div, 'Tab 3 — Event Detail');
    p(div, 'Deep dive into a single event. Reached by clicking an event row in Tab 1. Shows the per-utility cost breakdown, a list of spaces occupied, the meters and valves serving the event, and any other events overlapping the same period. Click a concurrent event to navigate to its detail page.');

    h3(div, 'Tab 4 — Site Status');
    p(div, 'Live utility consumption time-series chart with events overlaid as shaded regions. Use the utility selector to switch between utility types. Toggle individual events on/off using the visibility buttons. Click an event region or a timeline bar to select it. Use the ⛶ button to expand the chart to full screen.');

    h3(div, 'Data Quality Indicators');
    ul(div, [
      '<strong style="color:#28a745;">Green dot</strong> — ≥95% of expected data intervals present and valid.',
      '<strong style="color:#ffc107;">Yellow dot</strong> — 80–95% data quality. Cost estimate is reasonable but may have minor gaps.',
      '<strong style="color:#dc3545;">Red dot</strong> — <80% data quality. Cost estimate may be unreliable. Investigate meter data gaps.'
    ]);
  });

  if (showMethodology) {
    section('Calculation Methodology', function(div) {
      h3(div, 'How Event Costs Are Calculated');
      p(div, 'Each event cost record is pre-computed by a nightly batch process that runs the eventCost_summary() Axon function for each event, site, and utility type. Results are stored as eventCostResult records in SkySpark Folio. This tool reads those pre-computed records rather than running live calculations (which are slow).');

      h3(div, 'Electric — SF Proration');
      p(div, 'Electric cost is attributed by comparing the event\'s square footage to the total active event square footage at each 15-minute interval. If Event A occupies 5,000 sq ft and Event B occupies 3,000 sq ft, Event A receives 5/8 of the shared meter\'s power reading for that interval.');
      p(div, 'Baseline subtraction: each interval\'s usage above the hourly historical baseline is treated as the "event increment." Only the increment is attributed; baseload usage is charged to building operations.');

      h3(div, 'CHW — Valve Load Proration');
      p(div, 'Chilled water cost is attributed by CHW valve load (MBH) rather than area. Each AHU/FCU valve serving the event space contributes load proportional to its valve position × design capacity. The event is charged the fraction (event valve load) / (total CHW plant load) of the chilled water meter reading.');

      h3(div, 'Steam & Gas');
      p(div, 'Steam and Gas attribution functions are not yet implemented. Cost records for these utilities show $0 and are marked "Coming Soon." The calculation approach will follow the same baseline-plus-increment method as Electric once implemented.');

      h3(div, 'Concurrent Events');
      p(div, 'When multiple events overlap in time, each event\'s SF-proration fraction is computed using the combined square footage of ALL active events at each interval, not just the event in question. This ensures no more than 100% of metered energy is attributed to events.');

      h3(div, 'Demand Costs');
      p(div, 'Demand cost calculations are not yet implemented. Only usage (kWh, ton-hr) × usage rate is shown in the current version. Demand columns are reserved for future implementation.');
    });

    section('Glossary', function(div) {
      var terms = [
        { term: 'Baseload', def: 'The minimum energy consumption level observed during similar non-event periods. Used as the baseline for calculating event increments.' },
        { term: 'Increment', def: 'The energy above the baseload during an event period. This is the portion attributed to events.' },
        { term: 'SF Proration', def: 'Dividing metered energy by the ratio of event square footage to total active event square footage.' },
        { term: 'Valve Load (MBH)', def: 'Thousands of BTU/hr of cooling capacity for a CHW valve or AHU coil. Used to prorate CHW costs.' },
        { term: 'eventCostResult', def: 'A pre-computed SkySpark Folio record storing one cost result per event/site/utility/costType combination.' },
        { term: 'Attribution %', def: 'Event-attributed cost as a percentage of total utility bill cost for that period.' },
        { term: 'Data Quality', def: 'Percentage of expected data intervals that have valid, non-NA readings. Low quality events have data gaps that may affect cost accuracy.' }
      ];

      var table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
      terms.forEach(function(t, i) {
        var tr = document.createElement('tr');
        tr.style.cssText = 'background:' + (i%2===0?'white':'#f9fafb') + ';';
        tr.innerHTML = '<td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-weight:700;color:#1565c0;white-space:nowrap;width:160px;">' + t.term + '</td>' +
          '<td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#374151;line-height:1.6;">' + t.def + '</td>';
        table.appendChild(tr);
      });
      div.appendChild(table);
    });
  }
};
