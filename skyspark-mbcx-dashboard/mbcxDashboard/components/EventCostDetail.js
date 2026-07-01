window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};
window.mbcxDashboard.eventCost.eventDetailV2 = {};

window.mbcxDashboard.eventCost.eventDetailV2.render = function(container, eventSummary, allResults, onBack, onSelectEvent) {
  var cfg = window.mbcxDashboard.eventCost.config;
  var colors = cfg.utilityCostColors;
  var api = window.mbcxDashboard.eventCost.api;

  container.innerHTML = '';
  container.style.padding = '24px 28px';

  function fmt(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }
  function fmtDec(n) {
    return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  var sectionStyle = 'background:white;border:1px solid #E5E7EB;border-radius:8px;padding:20px 24px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);';
  var sectionTitleStyle = 'font-size:14px;font-weight:700;color:#374151;margin:0 0 16px 0;padding-bottom:10px;border-bottom:1px solid #E5E7EB;';
  var thStyle = 'text-align:left;padding:8px 12px;font-weight:600;color:#6c757d;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #E5E7EB;white-space:nowrap;';
  var tdStyle = 'padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;font-size:13px;';

  var ev = eventSummary;
  var totalCost = ev.totalCost || 0;

  var backBtn = document.createElement('button');
  backBtn.textContent = '← Back';
  backBtn.style.cssText = 'padding:8px 18px;border:1px solid #dee2e6;border-radius:6px;background:white;color:#495057;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;margin-bottom:20px;';
  backBtn.onmouseover = function() { backBtn.style.background = '#e8f4fd'; backBtn.style.borderColor = '#4A6FA5'; backBtn.style.color = '#4A6FA5'; };
  backBtn.onmouseout  = function() { backBtn.style.background = 'white';  backBtn.style.borderColor = '#dee2e6'; backBtn.style.color = '#495057'; };
  backBtn.onclick = function() { if (onBack) onBack(); };
  container.appendChild(backBtn);

  var headerCard = document.createElement('div');
  headerCard.style.cssText = sectionStyle + 'text-align:center;';

  var evName = document.createElement('div');
  evName.textContent = ev.eventName || 'Unnamed Event';
  evName.style.cssText = 'font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#6c757d;margin-bottom:8px;';
  headerCard.appendChild(evName);

  var evTotal = document.createElement('div');
  evTotal.textContent = fmt(totalCost);
  evTotal.style.cssText = 'font-size:48px;font-weight:900;color:#17a2b8;line-height:1;margin-bottom:4px;';
  headerCard.appendChild(evTotal);

  var evLabel = document.createElement('div');
  evLabel.textContent = 'Total Event Utility Cost';
  evLabel.style.cssText = 'font-size:13px;color:#6c757d;margin-bottom:20px;';
  headerCard.appendChild(evLabel);

  var metaGrid = document.createElement('div');
  metaGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;text-align:center;';
  var duration = '';
  if (ev.eventStart && ev.eventEnd) {
    var ms = new Date(ev.eventEnd) - new Date(ev.eventStart);
    var hrs = Math.floor(ms / 3600000);
    duration = hrs >= 24 ? Math.floor(hrs/24) + 'd ' + (hrs%24) + 'h' : hrs + 'h';
  }
  var metaItems = [
    { label: 'Event ID',  value: ev.eventID || '—' },
    { label: 'Start',     value: ev.eventStart ? new Date(ev.eventStart).toLocaleDateString() : '—' },
    { label: 'End',       value: ev.eventEnd   ? new Date(ev.eventEnd).toLocaleDateString()   : '—' },
    { label: 'Duration',  value: duration || '—' },
    { label: 'Area',      value: ev.eventSF ? Math.round(ev.eventSF).toLocaleString() + ' sq ft' : '—' }
  ];
  metaItems.forEach(function(m) {
    var item = document.createElement('div');
    item.style.cssText = 'padding:10px;background:#f8f9fa;border-radius:8px;';
    item.innerHTML = '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#6c757d;margin-bottom:2px;">' + m.label + '</div>' +
      '<div style="font-size:13px;font-weight:600;color:#2c3e50;">' + m.value + '</div>';
    metaGrid.appendChild(item);
  });
  headerCard.appendChild(metaGrid);
  container.appendChild(headerCard);

  var breakdownCard = document.createElement('div');
  breakdownCard.style.cssText = sectionStyle;
  var breakdownTitle = document.createElement('h3');
  breakdownTitle.textContent = 'Utility Cost Breakdown';
  breakdownTitle.style.cssText = sectionTitleStyle;
  breakdownCard.appendChild(breakdownTitle);

  var utilGrid = document.createElement('div');
  utilGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;';
  breakdownCard.appendChild(utilGrid);

  var utilities = [
    { key: 'Electric', costKey: 'electricCost' },
    { key: 'CHW',      costKey: 'chwCost'      },
    { key: 'Steam',    costKey: 'steamCost'    },
    { key: 'Gas',      costKey: 'gasCost'      }
  ];

  utilities.forEach(function(u) {
    var cost = ev[u.costKey] || 0;
    var color = colors[u.key];
    var pct = totalCost > 0 ? (cost / totalCost * 100) : 0;

    var detailRows = (allResults || []).filter(function(r) {
      return String(r.eventID) === String(ev.eventID) && r.utilityType === u.key;
    });
    var usageRow = detailRows.find(function(r) { return r.costType === 'Usage'; }) || {};
    var ratesCfg = cfg.utilityRates[u.key] || {};

    var isComingSoon = (u.key === 'Steam' || u.key === 'Gas') && cost === 0;

    var card = document.createElement('div');
    card.style.cssText = 'background:#f8f9fa;border-radius:10px;padding:18px;border-left:4px solid ' + color + ';' + (isComingSoon ? 'opacity:0.55;' : '');

    var cHeader = document.createElement('div');
    cHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    cHeader.innerHTML = '<span style="font-size:15px;font-weight:700;color:#374151;">' + u.key + '</span>' +
      '<span style="font-size:18px;font-weight:700;color:' + color + ';">' + fmt(cost) + '</span>';
    card.appendChild(cHeader);

    if (isComingSoon) {
      var cs = document.createElement('div');
      cs.style.cssText = 'font-size:12px;color:#6c757d;font-style:italic;text-align:center;padding:8px 0;';
      cs.textContent = 'Calculation coming soon';
      card.appendChild(cs);
    } else if (cost > 0) {
      var pBar = document.createElement('div');
      pBar.style.cssText = 'height:4px;background:#E5E7EB;border-radius:2px;margin-bottom:12px;overflow:hidden;';
      pBar.innerHTML = '<div style="height:100%;background:' + color + ';border-radius:2px;width:' + pct.toFixed(1) + '%;"></div>';
      card.appendChild(pBar);

      var rows = [];
      if (usageRow.usage) rows.push({ label: 'Usage', value: parseFloat(usageRow.usage).toFixed(1) + ' ' + (ratesCfg.usageUnit || '') });
      if (usageRow.rate)  rows.push({ label: 'Rate', value: '$' + parseFloat(usageRow.rate).toFixed(4) + ' / ' + (ratesCfg.usageUnit || 'unit'), dimmed: true });
      rows.push({ label: 'Usage Cost', value: fmtDec(cost) });
      rows.push({ label: 'Demand Cost', value: '— (TBD)', dimmed: true });
      rows.push({ label: '% of Total', value: pct.toFixed(1) + '%', dimmed: true });

      var dq = usageRow.dataQuality;
      if (dq !== null && dq !== undefined) {
        var dqPct = parseFloat(dq) * 100;
        var dqColor = dqPct >= 95 ? '#28a745' : dqPct >= 80 ? '#ffc107' : '#dc3545';
        rows.push({ label: 'Data Quality', value: Math.round(dqPct) + '%', color: dqColor });
      }
      if (usageRow.mostCommonError) {
        rows.push({ label: 'Error', value: usageRow.mostCommonError, dimmed: true });
      }

      rows.forEach(function(r) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;font-size:12px;padding:3px 0;';
        row.innerHTML = '<span style="color:' + (r.dimmed ? '#9CA3AF' : '#6c757d') + ';' + (r.dimmed ? 'font-style:italic;' : '') + '">' + r.label + '</span>' +
          '<span style="font-weight:600;color:' + (r.color || (r.dimmed ? '#9CA3AF' : '#374151')) + ';' + (r.dimmed ? 'font-style:italic;' : '') + '">' + r.value + '</span>';
        card.appendChild(row);
      });
    }

    utilGrid.appendChild(card);
  });

  container.appendChild(breakdownCard);

  var twoCol = document.createElement('div');
  twoCol.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;';

  var spacesCard = document.createElement('div');
  spacesCard.style.cssText = sectionStyle + 'margin-bottom:0;';
  var spacesTitle = document.createElement('h3');
  spacesTitle.textContent = 'Spaces Occupied';
  spacesTitle.style.cssText = sectionTitleStyle;
  spacesCard.appendChild(spacesTitle);
  var spacesLoading = document.createElement('div');
  spacesLoading.innerHTML = '<div class="edb-spinner" style="width:24px;height:24px;margin:16px auto;"></div>';
  spacesCard.appendChild(spacesLoading);
  twoCol.appendChild(spacesCard);

  var metersCard = document.createElement('div');
  metersCard.style.cssText = sectionStyle + 'margin-bottom:0;';
  var metersTitle = document.createElement('h3');
  metersTitle.textContent = 'Meters / Valves';
  metersTitle.style.cssText = sectionTitleStyle;
  metersCard.appendChild(metersTitle);
  var metersLoading = document.createElement('div');
  metersLoading.innerHTML = '<div class="edb-spinner" style="width:24px;height:24px;margin:16px auto;"></div>';
  metersCard.appendChild(metersLoading);
  twoCol.appendChild(metersCard);

  container.appendChild(twoCol);

  api.loadBookingTable(ev.eventID).then(function(booking) {
    spacesCard.removeChild(spacesLoading);
    metersCard.removeChild(metersLoading);

    if (booking.spaces.length === 0) {
      spacesCard.innerHTML += '<div style="color:#6c757d;font-size:13px;text-align:center;padding:16px;">No booking records found.</div>';
    } else {
      var stbl = document.createElement('table');
      stbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
      stbl.innerHTML = '<thead><tr><th style="' + thStyle + '">Space Code</th><th style="' + thStyle + 'text-align:right;">Sq Ft</th><th style="' + thStyle + '">Site</th></tr></thead>';
      var stbody = document.createElement('tbody');
      var totalSF = 0;
      booking.spaces.forEach(function(sp, i) {
        var sf = sp.spaceSF || 0;
        totalSF += sf;
        var tr = document.createElement('tr');
        tr.style.cssText = 'background:' + (i%2===0?'white':'#f9fafb') + ';';
        tr.innerHTML = '<td style="' + tdStyle + 'font-family:monospace;font-size:12px;">' + (sp.spaceCode || '—') + '</td>' +
          '<td style="' + tdStyle + 'text-align:right;">' + (sf ? Math.round(sf).toLocaleString() : '—') + '</td>' +
          '<td style="' + tdStyle + '">' + (sp.site || '—') + '</td>';
        stbody.appendChild(tr);
      });
      var foot = document.createElement('tr');
      foot.innerHTML = '<td style="' + tdStyle + 'font-weight:700;">Total</td><td style="' + tdStyle + 'text-align:right;font-weight:700;">' + Math.round(totalSF).toLocaleString() + '</td><td style="' + tdStyle + 'color:#6c757d;">' + booking.spaces.length + ' spaces</td>';
      stbody.appendChild(foot);
      stbl.appendChild(stbody);
      spacesCard.appendChild(stbl);
    }

    var typeColors = { Electric: '#4CAF50', CHW: '#2196F3', Steam: '#FF9800', Gas: '#F44336' };
    if (booking.meters.length === 0) {
      metersCard.innerHTML += '<div style="color:#6c757d;font-size:13px;text-align:center;padding:16px;">No meter records found.</div>';
    } else {
      var mtbl = document.createElement('table');
      mtbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
      mtbl.innerHTML = '<thead><tr><th style="' + thStyle + '">Meter / Valve ID</th><th style="' + thStyle + '">Type</th><th style="' + thStyle + '">Site</th></tr></thead>';
      var mtbody = document.createElement('tbody');
      booking.meters.forEach(function(mt, i) {
        var tc = typeColors[mt.type] || '#6c757d';
        var tr = document.createElement('tr');
        tr.style.cssText = 'background:' + (i%2===0?'white':'#f9fafb') + ';';
        tr.innerHTML = '<td style="' + tdStyle + 'font-family:monospace;font-size:12px;">' + (mt.id || '—') + '</td>' +
          '<td style="' + tdStyle + '"><span style="padding:2px 8px;background:' + tc + '20;color:' + tc + ';border-radius:4px;font-size:11px;font-weight:600;">' + mt.type + '</span></td>' +
          '<td style="' + tdStyle + 'font-size:12px;color:#6c757d;">' + (mt.site || '—') + '</td>';
        mtbody.appendChild(tr);
      });
      mtbl.appendChild(mtbody);
      metersCard.appendChild(mtbl);
    }
  }).catch(function() {
    spacesLoading.innerHTML = '<div style="color:#dc3545;font-size:12px;padding:8px;">Failed to load booking data.</div>';
    metersLoading.innerHTML = '<div style="color:#dc3545;font-size:12px;padding:8px;">Failed to load booking data.</div>';
  });

  var concCard = document.createElement('div');
  concCard.style.cssText = sectionStyle;
  var concTitle = document.createElement('h3');
  concTitle.textContent = 'Other Events During This Period';
  concTitle.style.cssText = sectionTitleStyle;
  concCard.appendChild(concTitle);
  var concLoading = document.createElement('div');
  concLoading.innerHTML = '<div class="edb-spinner" style="width:24px;height:24px;margin:16px auto;"></div>';
  concCard.appendChild(concLoading);
  container.appendChild(concCard);

  if (ev.eventStart && ev.eventEnd) {
    api.loadConcurrentEvents(ev.eventStart.substring(0, 10), ev.eventEnd.substring(0, 10))
      .then(function(concurrentEvents) {
        concCard.removeChild(concLoading);
        var others = concurrentEvents.filter(function(ce) {
          return String(ce.eventID) !== String(ev.eventID);
        });
        if (others.length === 0) {
          concCard.innerHTML += '<div style="text-align:center;padding:20px;color:#6c757d;font-size:13px;">No other events overlap with this period.</div>';
        } else {
          var ctbl = document.createElement('table');
          ctbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
          ctbl.innerHTML = '<thead><tr>' +
            '<th style="' + thStyle + '">Event</th>' +
            '<th style="' + thStyle + '">Start</th>' +
            '<th style="' + thStyle + '">End</th>' +
            '<th style="' + thStyle + 'text-align:right;">Sq Ft</th>' +
            '<th style="' + thStyle + '">Overlap</th>' +
            '</tr></thead>';
          var ctbody = document.createElement('tbody');
          others.forEach(function(ce, i) {
            var ceStart = ce.eventStart ? new Date(ce.eventStart) : null;
            var ceEnd   = ce.eventEnd   ? new Date(ce.eventEnd)   : null;
            var myStart = new Date(ev.eventStart);
            var myEnd   = new Date(ev.eventEnd);
            var overlapMs = Math.max(0, Math.min(ceEnd ? ceEnd.getTime() : Infinity, myEnd.getTime()) -
              Math.max(ceStart ? ceStart.getTime() : 0, myStart.getTime()));
            var overlapHrs = Math.round(overlapMs / 3600000);
            var overlapStr = overlapHrs >= 24 ? Math.floor(overlapHrs/24) + 'd ' + (overlapHrs%24) + 'h' : overlapHrs + 'h';

            var tr = document.createElement('tr');
            tr.style.cssText = 'cursor:pointer;background:' + (i%2===0?'white':'#f9fafb') + ';';
            tr.onmouseover = function() { tr.style.background = '#EBF5FB'; };
            tr.onmouseout  = function() { tr.style.background = i%2===0?'white':'#f9fafb'; };
            tr.onclick = function() {
              if (onSelectEvent && ce.eventID) {
                var matched = { eventID: ce.eventID, eventName: ce.eventName, eventStart: ce.eventStart, eventEnd: ce.eventEnd, eventSF: ce.eventSF };
                onSelectEvent(matched);
              }
            };
            tr.innerHTML = '<td style="' + tdStyle + 'font-weight:600;">' + (ce.eventName || 'Unnamed') + '</td>' +
              '<td style="' + tdStyle + '">' + (ceStart ? ceStart.toLocaleDateString() : '—') + '</td>' +
              '<td style="' + tdStyle + '">' + (ceEnd   ? ceEnd.toLocaleDateString()   : '—') + '</td>' +
              '<td style="' + tdStyle + 'text-align:right;">' + (ce.eventSF ? Math.round(ce.eventSF).toLocaleString() : '—') + '</td>' +
              '<td style="' + tdStyle + '"><span style="padding:2px 8px;background:#FEF3C7;color:#92400E;border-radius:4px;font-size:11px;font-weight:600;">' + overlapStr + '</span></td>';
            ctbody.appendChild(tr);
          });
          ctbl.appendChild(ctbody);
          concCard.appendChild(ctbl);
        }
      }).catch(function() {
        concLoading.innerHTML = '<div style="color:#dc3545;font-size:12px;padding:8px;">Failed to load concurrent events.</div>';
      });
  } else {
    concCard.removeChild(concLoading);
    concCard.innerHTML += '<div style="color:#6c757d;font-size:13px;padding:8px;">Event dates unavailable.</div>';
  }
};
