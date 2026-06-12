// components/FaultDetail.js — Fault detail full-page view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  var CONSTRUCTION_SVG = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2 20h20"/>' +
    '<path d="M5 20V8l7-5 7 5v12"/>' +
    '<path d="M9 20v-4h6v4"/>' +
    '<path d="M3 20l2-2"/><path d="M19 20l2-2"/>' +
    '<rect x="9" y="10" width="6" height="4" rx="0.5"/>' +
    '<path d="M10 10V8"/><path d="M14 10V8"/>' +
    '</svg>';

  var CHART_COLORS = [
    '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
    '#0891B2', '#BE185D', '#4F46E5', '#CA8A04', '#15803D'
  ];

  function _extractRef(obj) {
    if (!obj) return null;
    if (typeof obj === 'object' && (obj._kind === 'ref' || obj._kind === 'Ref')) return '@' + obj.val;
    // haystackParser.val() unwraps refs to {id, dis} or a bare id string
    if (typeof obj === 'object' && obj.id) return '@' + String(obj.id).replace(/^@/, '');
    if (typeof obj === 'string' && obj.charAt(0) === '@') return obj;
    if (typeof obj === 'string' && /^[rp]:[\w:.~-]+$/.test(obj)) return '@' + obj;
    return null;
  }

  function _extractDate(obj) {
    if (!obj) return null;
    if (typeof obj === 'object' && obj._kind === 'date') return obj.val;
    if (typeof obj === 'string') return obj;
    return null;
  }


  function _colDisplayName(col) {
    if (col.meta) {
      if (col.meta.dis) return col.meta.dis;
      if (col.meta.navName) return col.meta.navName;
      if (col.meta.id && typeof col.meta.id === 'object' && col.meta.id.dis) return col.meta.id.dis;
    }
    if (col.dis) return col.dis;
    return col.name;
  }

  function _colUnit(col) {
    if (col.meta) {
      if (col.meta.unit) return col.meta.unit;
      if (col.meta.kind && typeof col.meta.kind === 'string') {
        var m = col.meta.kind.match(/^Number\s+"(.+)"$/);
        if (m) return m[1];
      }
    }
    return null;
  }

  function _parseHisGrid(grid) {
    if (!grid || !grid.cols || !grid.rows || !grid.rows.length) return null;
    var tsCol = null;
    var dataCols = [];
    grid.cols.forEach(function (c) {
      if (c.name === 'ts') tsCol = c.name;
      else if (c.name !== 'id') dataCols.push(c);
    });
    if (!tsCol || !dataCols.length) return null;

    var labels = [];
    var datasets = {};
    dataCols.forEach(function (c) { datasets[c.name] = []; });

    grid.rows.forEach(function (row) {
      var ts = row[tsCol];
      var label = '';
      if (typeof ts === 'string') label = ts;
      else if (ts && ts._kind === 'dateTime') label = ts.val;
      else if (ts && ts.val) label = ts.val;
      labels.push(label);

      dataCols.forEach(function (c) {
        var v = row[c.name];
        var num = null;
        if (typeof v === 'number') num = v;
        else if (v && v._kind === 'number') num = v.val;
        else if (v !== null && v !== undefined) { var n = parseFloat(v); if (!isNaN(n)) num = n; }
        datasets[c.name].push(num);
      });
    });

    return { labels: labels, dataCols: dataCols, datasets: datasets };
  }

  var crosshairPlugin = {
    id: 'crosshair',
    afterEvent: function (chart, args) {
      var evt = args.event;
      if (evt.type === 'mousemove' && evt.x >= chart.chartArea.left && evt.x <= chart.chartArea.right &&
          evt.y >= chart.chartArea.top && evt.y <= chart.chartArea.bottom) {
        chart._crosshairX = evt.x;
      } else {
        chart._crosshairX = null;
      }
      chart.draw();
    },
    afterDraw: function (chart) {
      if (chart._crosshairX == null) return;
      var ctx = chart.ctx;
      var area = chart.chartArea;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(chart._crosshairX, area.top);
      ctx.lineTo(chart._crosshairX, area.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.restore();
    }
  };

  // ── Fault-active overlay ───────────────────────────────────────────────
  // Active windows from the fault record's own history (loaded by
  // _loadFaultActivityBar), shaded into every chart panel by the
  // sparkBands plugin so trend behavior can be correlated with the fault.
  var _sparkWins = null;   // [{s, e}] epoch-ms windows, or null if unavailable
  var _charts    = [];     // live Chart instances on this page

  function _q(s) {
    return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function _destroyAll() {
    _charts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    _charts = [];
    _sparkWins = null;
  }

  // Fractional position of epoch time t on a category axis whose ticks
  // correspond to the (sorted, possibly unevenly spaced) times array.
  function _fracPos(times, t) {
    var n = times.length;
    if (n < 2) return 0;
    if (t <= times[0]) return 0;
    if (t >= times[n - 1]) return n - 1;
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (times[mid] <= t) lo = mid; else hi = mid;
    }
    var span = times[hi] - times[lo];
    return lo + (span > 0 ? (t - times[lo]) / span : 0);
  }

  var sparkBandsPlugin = {
    id: 'sparkBands',
    beforeDatasetsDraw: function (chart) {
      var times = chart.$mbcxTimes;
      if (!_sparkWins || !_sparkWins.length || !times || times.length < 2) return;
      var area = chart.chartArea;
      var n = times.length - 1;
      var ctx = chart.ctx;
      ctx.save();
      _sparkWins.forEach(function (w) {
        if (w.e < times[0] || w.s > times[times.length - 1]) return;
        var x0 = area.left + (_fracPos(times, w.s) / n) * (area.right - area.left);
        var x1 = area.left + (_fracPos(times, w.e) / n) * (area.right - area.left);
        if (x1 - x0 < 1) x1 = x0 + 1;
        ctx.fillStyle = 'rgba(234, 88, 12, ' + (w.a != null ? w.a : 0.10) + ')';
        ctx.fillRect(x0, area.top, x1 - x0, area.bottom - area.top);
      });
      ctx.restore();
    }
  };

  // Indent the activity bar track so its time axis lines up with the chart
  // plot area (the y-axis labels inset the plot from the card edge).
  function _alignFaultBar() {
    var first = _charts[0];
    if (!first || !first.chartArea || !first.canvas) return;
    var canvasRect = first.canvas.getBoundingClientRect();
    var wrapEl = document.getElementById('fdFaultBar');
    if (!wrapEl) return;
    var wrapRect = wrapEl.getBoundingClientRect();
    var ml = Math.max(0, Math.round(canvasRect.left + first.chartArea.left - wrapRect.left));
    var mr = Math.max(0, Math.round(wrapRect.right - canvasRect.left - first.chartArea.right));
    wrapEl.querySelectorAll('.fd-fbar-track').forEach(function (track) {
      track.style.marginLeft  = ml + 'px';
      track.style.marginRight = mr + 'px';
    });
  }

  // Sparks are recorded per occupied day, so a continuously active fault
  // comes back as daily windows with overnight gaps. Merge windows whose
  // gap is under 16h into one span so multi-day runs render solid (matching
  // SkySpark's spark view); weekend-sized gaps stay split.
  function _mergeWins(wins) {
    wins.sort(function (a, b) { return a.s - b.s; });
    var MERGE_GAP = 1 * 3600000;
    var merged = [];
    wins.forEach(function (w) {
      var last = merged[merged.length - 1];
      if (last && w.s - last.e <= MERGE_GAP) {
        if (w.e > last.e) last.e = w.e;
        last.hours += w.hours;
        last.count++;
      } else {
        merged.push({ s: w.s, e: w.e, hours: w.hours, count: 1 });
      }
    });
    return merged;
  }

  function _renderCharts(containerId, parsed) {
    if (typeof Chart === 'undefined') return;
    var container = document.getElementById(containerId);
    if (!container) return;

    var fmtLabels = parsed.labels.map(function (l) {
      try {
        var d = new Date(l);
        if (!isNaN(d)) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } catch (e) {}
      return l;
    });

    // Epoch times per label — used to place fault-active bands on the
    // category axis.
    var labelTimes = parsed.labels.map(function (l) { return new Date(l).getTime(); });
    var timesValid = labelTimes.length > 1 && !labelTimes.some(isNaN);

    var UNIT_ORDER = ['°F', '%', 'cfm', '%RH', 'inH₂O', 'psi', 'bool'];
    function _unitRank(u) {
      var normalized = u.toLowerCase().replace(/\s/g, '');
      for (var i = 0; i < UNIT_ORDER.length; i++) {
        if (normalized === UNIT_ORDER[i].toLowerCase().replace(/\s/g, '')) return i;
      }
      if (normalized.indexOf('inh2o') !== -1 || normalized.indexOf('inh₂o') !== -1 || normalized.indexOf('inwc') !== -1) return 4;
      if (normalized === 'boolean' || normalized === 'bool') return 6;
      return UNIT_ORDER.length;
    }

    var groups = {};
    var groupOrder = [];
    parsed.dataCols.forEach(function (c, i) {
      var unit = _colUnit(c) || 'other';
      if (!groups[unit]) { groups[unit] = []; groupOrder.push(unit); }
      groups[unit].push({ col: c, idx: i });
    });
    groupOrder.sort(function (a, b) { return _unitRank(a) - _unitRank(b); });

    // Separate boolean columns for spark bar rendering
    var boolGroups = [];
    var numericGroupOrder = [];
    var numericGroups = {};
    groupOrder.forEach(function (unit) {
      var bools = [], nums = [];
      groups[unit].forEach(function (m) {
        var data = parsed.datasets[m.col.name];
        var allBool = data.every(function (v) { return v === null || v === 0 || v === 1; });
        var unitLower = (unit || '').toLowerCase();
        if (allBool && (unitLower === 'bool' || unitLower === 'boolean' || unitLower === 'other')) {
          bools.push(m);
        } else {
          nums.push(m);
        }
      });
      if (bools.length) boolGroups = boolGroups.concat(bools);
      if (nums.length) {
        numericGroups[unit] = nums;
        numericGroupOrder.push(unit);
      }
    });

    // Render fault spark bars at the top of the chart area
    if (boolGroups.length) {
      var sparkWrap = document.createElement('div');
      sparkWrap.className = 'fd-spark-section';
      var sparkTitle = document.createElement('div');
      sparkTitle.className = 'fd-spark-section-title';
      sparkTitle.textContent = 'Fault Activity';
      sparkWrap.appendChild(sparkTitle);

      var timestamps = parsed.labels.map(function (l) { var d = new Date(l); return isNaN(d) ? 0 : d.getTime(); });
      var tMin = timestamps[0] || 0, tMax = timestamps[timestamps.length - 1] || 1;
      var tSpan = tMax - tMin || 1;

      boolGroups.forEach(function (m) {
        var name = _colDisplayName(m.col);
        var data = parsed.datasets[m.col.name];
        var row = document.createElement('div');
        row.className = 'fd-spark-row';
        var label = document.createElement('div');
        label.className = 'fd-spark-label';
        label.textContent = name;
        label.title = name;
        row.appendChild(label);

        var bar = document.createElement('div');
        bar.className = 'fd-spark-bar';
        var i = 0;
        while (i < data.length) {
          var val = (data[i] === 1 || data[i] === true) ? 1 : 0;
          var start = i;
          while (i < data.length) {
            var cur = (data[i] === 1 || data[i] === true) ? 1 : 0;
            if (data[i] !== null && cur !== val) break;
            i++;
          }
          var x0 = (timestamps[start] - tMin) / tSpan * 100;
          var x1 = (timestamps[Math.min(i, data.length - 1)] - tMin) / tSpan * 100;
          var seg = document.createElement('div');
          seg.className = 'fd-spark-seg' + (val ? ' fd-spark-seg--fault' : '');
          seg.style.left = x0 + '%';
          seg.style.width = Math.max(x1 - x0, 0.3) + '%';
          bar.appendChild(seg);
        }
        row.appendChild(bar);
        sparkWrap.appendChild(row);
      });
      container.appendChild(sparkWrap);
    }

    // Toggle bar
    var toggleBar = document.createElement('div');
    toggleBar.className = 'fd-chart-toggles';
    container.appendChild(toggleBar);

    var panels = {};
    var chartInstances = [];
    var colorIdx = 0;
    numericGroupOrder.forEach(function (unit) {
      var members = numericGroups[unit];

      // Toggle chip
      var chip = document.createElement('button');
      chip.className = 'fd-chart-toggle fd-chart-toggle--on';
      chip.textContent = unit === 'other' ? 'Other' : unit;
      chip.setAttribute('data-unit', unit);
      toggleBar.appendChild(chip);

      var panelDiv = document.createElement('div');
      panelDiv.className = 'fd-chart-panel';
      panels[unit] = panelDiv;

      var canvasWrap = document.createElement('div');
      canvasWrap.className = 'fd-chart-canvas-wrap';
      var canvas = document.createElement('canvas');
      canvasWrap.appendChild(canvas);
      panelDiv.appendChild(canvasWrap);
      container.appendChild(panelDiv);

      var datasets = members.map(function (m) {
        var c = m.col;
        var ci = colorIdx++;
        return {
          label: _colDisplayName(c),
          data: parsed.datasets[c.name],
          borderColor: CHART_COLORS[ci % CHART_COLORS.length],
          backgroundColor: CHART_COLORS[ci % CHART_COLORS.length] + '18',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          fill: false
        };
      });

      var chartInst = new Chart(canvas, {
        type: 'line',
        data: { labels: fmtLabels, datasets: datasets },
        // Fault-active periods render in the bar above the charts only —
        // in-plot shading was removed as too noisy.
        plugins: [crosshairPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          events: ['click', 'mousemove', 'mouseout'],
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              enabled: false,
              bodyFont: { size: 11 },
              position: 'nearest'
            },
            _clickTooltip: true
          },
          onClick: function (evt, elements, chart) {
            if (chart._tooltipPinned) {
              chart._tooltipPinned = false;
              chart.options.plugins.tooltip.enabled = false;
              chart.update('none');
            } else if (elements.length) {
              chart._tooltipPinned = true;
              chart.options.plugins.tooltip.enabled = true;
              chart.update('none');
              chart.tooltip.setActiveElements(
                elements.map(function (e) { return { datasetIndex: e.datasetIndex, index: e.index }; }),
                { x: evt.x, y: evt.y }
              );
              chart.update('none');
            }
          },
          scales: {
            x: { ticks: { maxTicksLimit: 10, font: { size: 10 } }, grid: { display: false } },
            y: {
              title: { display: unit !== 'other', text: unit, font: { size: 11 } },
              ticks: { font: { size: 10 } },
              grid: { color: '#F3F4F6' }
            }
          }
        }
      });

      if (timesValid) chartInst.$mbcxTimes = labelTimes;
      chartInstances.push({ chart: chartInst, panel: panelDiv, canvas: canvas });
      _charts.push(chartInst);

      chip.addEventListener('click', function () {
        var visible = panelDiv.style.display !== 'none';
        panelDiv.style.display = visible ? 'none' : '';
        chip.classList.toggle('fd-chart-toggle--on', !visible);
        _resizeChartWrap(container, chartInstances);
      });
    });

    _resizeChartWrap(container, chartInstances);

    // Charts may render after the activity bar — align its track now.
    setTimeout(_alignFaultBar, 0);
  }

  function _resizeChartWrap(container, chartInstances) {
    var PANEL_H = 180;
    var TOGGLES_H = 40;
    var visibleCount = chartInstances.filter(function (ci) {
      return ci.panel.style.display !== 'none';
    }).length;
    var h = TOGGLES_H + (visibleCount * PANEL_H);
    container.style.height = h + 'px';
    setTimeout(function () {
      chartInstances.forEach(function (ci) {
        if (ci.panel.style.display !== 'none') ci.chart.resize();
      });
    }, 0);
  }

  // Group agenda items (one equipment, several faults) carry the member
  // faults in fault.groupFaults — render them as a clickable list.
  function renderGroupFaults(fault) {
    return (fault.groupFaults || []).map(function (f, i) {
      var sev = typeof f.sevNorm === 'number' ? f.sevNorm : '—';
      var pct = typeof f.faultActive === 'number' ? Math.round(f.faultActive) + '%' : '';
      return '<div class="fd-related-item fd-related-link" data-group-idx="' + i + '">' +
        '<span class="fd-related-sev">Sev ' + sev + '</span>' +
        '<span class="fd-related-fault">' + (f.faultName || '') + '</span>' +
        '<span class="fd-related-pct">' + pct + '</span>' +
        '</div>';
    }).join('');
  }

  function renderDiag(fault) {
    var items = [];

    items.push({
      label: 'Description of Fault',
      text: fault.descriptionofFault || '—'
    });

    items.push({
      label: 'Recommended Actions',
      text: fault.recommendedActions || '—'
    });

    items.push({
      label: 'Severity Basis',
      text: '—'
    });

    return items.map(function (d) {
      return '<div class="fd-diag-item">' +
        '<div class="fd-diag-label">' + d.label + '</div>' +
        '<div class="fd-diag-text">' + d.text + '</div>' +
        '</div>';
    }).join('');
  }

  function renderRelated(fault, allFaults) {
    var equipName = String(fault.equipment || '');
    var related = (allFaults || []).filter(function (f) {
      return String(f.equipment) === equipName && f.id !== fault.id;
    });
    if (!related.length) return '<div class="fd-empty">No other active faults on this equipment.</div>';
    return related.map(function (f) {
      var sev = typeof f.sevNorm === 'number' ? f.sevNorm : '—';
      var pct = typeof f.faultActive === 'number' ? f.faultActive.toFixed(1) + '%' : '—';
      return '<div class="fd-related-item fd-related-link" data-related-fid="' + f.id + '">' +
        '<span class="fd-related-sev">Sev ' + sev + '</span>' +
        '<span class="fd-related-fault">' + (f.faultName || '') + '</span>' +
        '<span class="fd-related-pct">' + pct + '</span>' +
        '</div>';
    }).join('');
  }

  function renderConstruction(title) {
    return [
      '<div class="fd-card fd-card-construction">',
      '  <div class="fd-card-title">' + title + '</div>',
      '  <div class="fd-construction">',
      '    ' + CONSTRUCTION_SVG,
      '    <div class="fd-construction-text">Under Construction</div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // ── Spark/fault bar ───────────────────────────────────────────────────────

  // ── Public API ─────────────────────────────────────────────────────────────
  NS.components.FaultDetail = {

    show: function (contentEl, fault, allFaults, ctx, onBack, options) {
      _destroyAll();
      var opts     = options || {};
      var nav      = opts.agendaNav || null;
      var backLabel = nav ? '&#8592; Agenda' : '&#8592; Fault List';
      var inAgenda = !!(NS.meeting && NS.meeting.has(fault.id));
      var isGroup  = !!(fault.groupFaults && fault.groupFaults.length);

      var sevVal = typeof fault.sevNorm === 'number' ? fault.sevNorm : '—';
      var durVal = '—';
      if (typeof fault.sumDur === 'number') {
        var totalH = fault.sumDur;
        if (totalH >= 48) {
          durVal = Math.round(totalH / 24) + 'd ' + Math.round(totalH % 24) + 'h';
        } else {
          durVal = Math.round(totalH) + 'h';
        }
      } else if (fault.sumDur) { durVal = fault.sumDur; }
      var pctVal = typeof fault.faultActive === 'number' ? fault.faultActive.toFixed(1) + '%' : '';

      var sparksHtml = '';
      if (fault.sparksLink) {
        sparksHtml = '<a class="fd-sparks-link" href="' + fault.sparksLink + '" target="_blank" title="Open in SkySpark">View in SkySpark &#8599;</a>';
      }

      contentEl.innerHTML = [
        nav ? [
          '<div class="fd-mtg-nav">',
          '  <span class="fd-mtg-pos">Item ' + nav.current + ' of ' + nav.total + '</span>',
          '  <div class="fd-mtg-arrows">',
          '    <button class="fd-mtg-arrow" id="fdNavPrev"' + (!nav.onPrev ? ' disabled' : '') + '>&#8592; Prev</button>',
          '    <button class="fd-mtg-arrow" id="fdNavNext"' + (!nav.onNext ? ' disabled' : '') + '>Next &#8594;</button>',
          '  </div>',
          '  <button class="fd-discuss-btn' + (nav.discussed ? ' fd-discuss-done' : '') + '" id="fdDiscussBtn">',
          nav.discussed ? '&#10003; Discussed' : 'Mark Discussed',
          '  </button>',
          '</div>'
        ].join('\n') : '',

        '<div class="fd-page">',

        '  <div class="fd-hd">',
        '    <button class="fd-back" id="fdBackBtn">' + backLabel + '</button>',
        '    <div class="fd-hd-center">',
        '      <div class="fd-hd-equip">' + (fault.equipment || '') + '</div>',
        '      <div class="fd-hd-fault">' + (fault.faultName || '') + '</div>',
        '      <div class="fd-hd-area" id="fdAreaServed" style="display:none"></div>',
        '    </div>',
        '    <div class="fd-hd-badges">',
        '      <span class="fd-sev-badge">Sev ' + sevVal + '</span>',
        '      <span class="fd-dur">' + durVal + '</span>',
        pctVal ? '<span class="fd-pct">' + pctVal + '</span>' : '',
        sparksHtml,
        !nav ? '<button class="fd-agenda-toggle' + (inAgenda ? ' fd-agenda-in' : '') + '" id="fdAgendaToggle">' +
               (inAgenda ? '&#10003; In Agenda' : '+ Add to Meeting') + '</button>' : '',
        '    </div>',
        '  </div>',

        '  <div class="fd-body fd-body-split">',

        '    <div class="fd-col-left">',
        '      <div class="fd-card fd-card-chart">',
        '        <div class="fd-card-title">',
        '          <span>Fault Trend</span>',
        '          <div class="fd-trend-range" id="fdTrendRange">',
        '            <button class="fd-range-btn fd-range-btn--active" data-range="pastMonth">Past Month</button>',
        '            <button class="fd-range-btn" data-range="pastWeek">Past Week</button>',
        '            <button class="fd-range-btn" data-range="report">Report Period</button>',
          (fault.sparksLink ? '<a class="fd-sparks-link fd-sparks-link-sm" href="' + fault.sparksLink + '" target="_blank">SkySpark &#8599;</a>' : '') +
        '          </div>',
        '        </div>',
        '        <div class="fd-fault-bar-wrap" id="fdFaultBar"></div>',
        '        <div class="fd-chart-wrap" id="fdChartWrap">',
        '          <div class="fd-chart-loading" id="fdChartLoading">Loading trend data…</div>',
        '        </div>',
        '      </div>',
        '    </div>',

        '    <div class="fd-col-right">',
        '      <div class="fd-card">',
        isGroup
          ? '<div class="fd-card-title">Faults on this Equipment <span class="fd-card-sub">click to inspect</span></div>' +
            '<div class="fd-related">' + renderGroupFaults(fault) + '</div>'
          : '<div class="fd-card-title">Diagnostics</div>' +
            '<div class="fd-diag-list">' + renderDiag(fault) + '</div>',
        '      </div>',

        '      <div class="fd-card">',
        '        <div class="fd-card-title">Related Equipment Issues <span class="fd-card-sub">' + (fault.equipment || '') + '</span></div>',
        '        <div class="fd-related">' + renderRelated(fault, allFaults) + '</div>',
        '      </div>',

        renderConstruction('Activity &amp; Notes'),
        '    </div>',

        '  </div>',
        '</div>'
      ].join('\n');

      // Back button
      contentEl.querySelector('#fdBackBtn').addEventListener('click', function () { onBack(); });

      // Group member links — open the member fault's own detail page with
      // Back returning to this equipment-level view (meeting nav stays on
      // the group item).
      var self0 = this;
      contentEl.querySelectorAll('[data-group-idx]').forEach(function (el) {
        el.addEventListener('click', function () {
          var member = fault.groupFaults[parseInt(el.getAttribute('data-group-idx'), 10)];
          if (!member) return;
          self0.show(contentEl, member, allFaults, ctx, function () {
            self0.show(contentEl, fault, allFaults, ctx, onBack, options);
          });
        });
      });

      // Related fault links
      var self = this;
      contentEl.querySelectorAll('.fd-related-link').forEach(function (el) {
        el.addEventListener('click', function () {
          var fid = parseInt(el.getAttribute('data-related-fid'), 10);
          var target = (allFaults || []).filter(function (f) { return f.id === fid; })[0];
          if (target) self.show(contentEl, target, allFaults, ctx, onBack, options);
        });
      });

      // Meeting nav buttons
      if (nav) {
        var prevBtn = contentEl.querySelector('#fdNavPrev');
        var nextBtn = contentEl.querySelector('#fdNavNext');
        var discBtn = contentEl.querySelector('#fdDiscussBtn');
        if (prevBtn && nav.onPrev) prevBtn.addEventListener('click', function () { nav.onPrev(); });
        if (nextBtn && nav.onNext) nextBtn.addEventListener('click', function () { nav.onNext(); });
        if (discBtn) discBtn.addEventListener('click', function () {
          if (nav.onMarkDiscussed) nav.onMarkDiscussed();
        });
      }

      // "Add to Meeting" toggle
      if (!nav) {
        var agBtn = contentEl.querySelector('#fdAgendaToggle');
        if (agBtn) {
          agBtn.addEventListener('click', function () {
            if (!NS.meeting) return;
            if (NS.meeting.has(fault.id)) {
              NS.meeting.remove(fault.id);
              agBtn.textContent = '+ Add to Meeting';
              agBtn.classList.remove('fd-agenda-in');
            } else {
              NS.meeting.add(fault);
              agBtn.textContent = '✓ In Agenda';
              agBtn.classList.add('fd-agenda-in');
            }
          });
        }
      }

      // Trend range buttons
      var self = this;
      var trendRangeEl = contentEl.querySelector('#fdTrendRange');
      if (trendRangeEl) {
        trendRangeEl.querySelectorAll('.fd-range-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            trendRangeEl.querySelectorAll('.fd-range-btn').forEach(function (b) { b.classList.remove('fd-range-btn--active'); });
            btn.classList.add('fd-range-btn--active');
            self._loadAll(contentEl, fault, ctx, btn.getAttribute('data-range'));
          });
        });
      }

      // Fetch fault activity bar and point trend chart (same date range)
      this._currentRangeKey = 'pastMonth';
      this._loadAll(contentEl, fault, ctx, 'pastMonth');
    },

    _computeDateRange: function (fault, ctx, rangeKey) {
      var raw = fault._raw || {};
      if (rangeKey === 'report') {
        var startDate = _extractDate(raw.reportStartDate) || ctx.datesStart;
        var endDate = _extractDate(raw.reportEndDate) || ctx.datesEnd;
        return (startDate && endDate) ? startDate + '..' + endDate : 'pastMonth';
      } else if (rangeKey === 'pastWeek') {
        return 'pastWeek';
      }
      return 'pastMonth';
    },

    // Area served — from the fault row when present, else fetched off the
    // equip rec. Hidden when unavailable.
    _loadAreaServed: function (contentEl, fault, ctx) {
      var el = contentEl.querySelector('#fdAreaServed');
      if (!el || el.textContent) return; // already resolved (range re-load)
      function showArea(v) {
        var s = (v && typeof v === 'object') ? (v.dis || v.val || '') : (v || '');
        if (!s) return;
        el.textContent = 'Serves: ' + s;
        el.style.display = '';
      }
      var raw = fault._raw || {};
      var inline = raw.areaserved || raw.areaServed;
      if (inline) { showArea(inline); return; }

      if (!ctx || !ctx.attestKey || !ctx.projectName) return;
      var equipName = raw.equipment || fault.equipment;
      var siteRef = _extractRef(raw.siteRef) || ctx.siteRef;
      if (!equipName || !siteRef) return;
      // The tag is lowercase "areaserved" on equip recs (camelCase fallback).
      var axon = 'do e: read(equip and navName==' + _q(equipName) + ' and siteRef==' + siteRef +
        ', false); if (e == null) null else if (e["areaserved"] != null) e["areaserved"] else e["areaServed"] end';
      NS.api.evalAxonVal(ctx.attestKey, ctx.projectName, axon)
        .then(showArea)
        .catch(function () { /* optional metadata — stay hidden */ });
    },

    _loadAll: function (contentEl, fault, ctx, rangeKey) {
      var dateRange = this._computeDateRange(fault, ctx, rangeKey);
      // Clear previous spark data
      _sparkWins = null;
      var barEl = contentEl.querySelector('#fdFaultBar');
      if (barEl) barEl.innerHTML = '';
      if (barEl) barEl.classList.remove('fd-fault-bar-wrap--loaded');
      this._loadAreaServed(contentEl, fault, ctx);
      this._loadFaultActivityBar(contentEl, fault, ctx, dateRange);
      this._loadTrendChart(contentEl, fault, ctx, rangeKey);
    },

    _loadFaultActivityBar: function (contentEl, fault, ctx, dateRange) {
      var barEl = contentEl.querySelector('#fdFaultBar');
      if (!barEl) return;
      if (!ctx || !ctx.attestKey || !ctx.projectName) return;

      var self = this;
      var raw = fault._raw || {};
      var idRef = _extractRef(raw.id);

      // Group items: one labeled spark bar per member fault.
      if (fault.groupFaults && fault.groupFaults.length) {
        fault.groupFaults.forEach(function (member) {
          self._loadRuleSparksBar(barEl, {
            equipment: member.equipment || fault.equipment,
            faultName: member.faultName,
            _raw: member._raw || {}
          }, ctx, dateRange);
        });
        return;
      }

      if (!idRef) {
        console.warn('[FaultDetail] Fault row has no id ref — using ruleSparks daily bar.');
        self._loadRuleSparksBar(barEl, fault, ctx, dateRange);
        return;
      }

      var axon = 'read(id==' + idRef + ').hisRead(' + dateRange + ')';

      NS.api.evalAxon(ctx.attestKey, ctx.projectName, axon)
        .then(function (grid) {
          var parsed = _parseHisGrid(grid);
          if (!parsed || !parsed.dataCols.length) {
            console.warn('[FaultDetail] Fault record has no history — using ruleSparks daily bar.');
            self._loadRuleSparksBar(barEl, fault, ctx, dateRange);
            return;
          }
          var col = parsed.dataCols[0];
          var rawData = parsed.datasets[col.name];
          var hasAnyTrue = rawData.some(function (v) { return v === 1 || v === true; });
          if (!hasAnyTrue) return;

          var timestamps = parsed.labels.map(function (l) {
            var d = new Date(l); return isNaN(d) ? 0 : d.getTime();
          });
          var tMin = timestamps[0] || 0;
          var tMax = timestamps[timestamps.length - 1] || 1;
          var tSpan = tMax - tMin || 1;

          var label = document.createElement('div');
          label.className = 'fd-fbar-label';
          label.textContent = fault.faultName || 'Fault Active';
          barEl.appendChild(label);

          var bar = document.createElement('div');
          bar.className = 'fd-fbar-track';

          var wins = [];
          var i = 0;
          while (i < rawData.length) {
            var isOn = rawData[i] === 1 || rawData[i] === true;
            var start = i;
            while (i < rawData.length) {
              var cur = rawData[i] === 1 || rawData[i] === true;
              if (rawData[i] !== null && cur !== isOn) break;
              i++;
            }
            var endIdx = Math.min(i, rawData.length - 1);
            var x0 = (timestamps[start] - tMin) / tSpan * 100;
            var x1 = (timestamps[endIdx] - tMin) / tSpan * 100;
            var seg = document.createElement('div');
            seg.className = 'fd-fbar-seg' + (isOn ? ' fd-fbar-seg--on' : '');
            seg.style.left  = x0 + '%';
            seg.style.width = Math.max(x1 - x0, 0.2) + '%';
            bar.appendChild(seg);
            if (isOn) wins.push({ s: timestamps[start], e: timestamps[endIdx] });
          }
          barEl.appendChild(bar);
          barEl.classList.add('fd-fault-bar-wrap--loaded');
          _alignFaultBar();

          // Shade the same active windows into the trend charts (sparkBands
          // plugin); charts may render before or after this data arrives.
          _sparkWins = wins;
          _charts.forEach(function (c) { try { c.update('none'); } catch (e) {} });
        })
        .catch(function (err) {
          console.warn('[FaultDetail] Fault record hisRead failed — using ruleSparks daily bar.', err);
          self._loadRuleSparksBar(barEl, fault, ctx, dateRange);
        });
    },

    // Fallback: spark periods via ruleSparks().ruleSparkHis — one row per
    // spark with ts = start time and value = duration (hours).
    _loadRuleSparksBar: function (barEl, fault, ctx, dateRange) {
      var raw = fault._raw || {};
      var equipName = raw.equipment || fault.equipment;
      var siteRef = _extractRef(raw.siteRef) || ctx.siteRef;
      if (!equipName || !fault.faultName) return;

      var axon = 'ruleSparks(read(equip and navName==' + _q(equipName) +
        (siteRef ? ' and siteRef==' + siteRef : '') + ', false), ' + dateRange +
        ', read(rule and dis==' + _q(fault.faultName) + ', false)).ruleSparkHis';

      NS.api.evalAxon(ctx.attestKey, ctx.projectName, axon)
        .then(function (grid) {
          // Value column is the first non-ts column.
          var valCol = null;
          ((grid && grid.cols) || []).forEach(function (c) {
            if (!valCol && c.name !== 'ts') valCol = c.name;
          });
          var wins = [];
          (grid.rows || []).forEach(function (row) {
            var ts = row.ts;
            var s = Date.parse((ts && typeof ts === 'object') ? ts.val : ts);
            if (isNaN(s)) return;
            var d = valCol ? row[valCol] : null, hours = 0;
            if (typeof d === 'number') hours = d;
            else if (d && typeof d === 'object' && typeof d.val === 'number') {
              var u = String(d.unit || 'h').toLowerCase();
              hours = u.indexOf('min') === 0 ? d.val / 60
                    : (u === 's' || u === 'sec') ? d.val / 3600
                    : d.val;
            }
            if (hours <= 0) return;
            wins.push({ s: s, e: s + hours * 3600000, hours: hours });
          });
          if (!wins.length) {
            console.warn('[FaultDetail] ruleSparkHis returned no spark periods. Expr:', axon);
            return;
          }
          wins = _mergeWins(wins);

          // Domain: the explicit date range when we have one, else the data.
          var m = String(dateRange).match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
          var tMin, tMax;
          if (m) {
            tMin = Date.parse(m[1] + 'T00:00:00');
            tMax = Date.parse(m[2] + 'T00:00:00') + 86400000;
          } else {
            tMin = wins[0].s; tMax = wins[0].e;
            wins.forEach(function (w) {
              if (w.s < tMin) tMin = w.s;
              if (w.e > tMax) tMax = w.e;
            });
          }
          var tSpan = (tMax - tMin) || 1;

          var label = document.createElement('div');
          label.className = 'fd-fbar-label';
          label.textContent = fault.faultName || 'Fault Active';
          barEl.appendChild(label);

          var bar = document.createElement('div');
          bar.className = 'fd-fbar-track';
          wins.forEach(function (w) {
            var seg = document.createElement('div');
            seg.className = 'fd-fbar-seg fd-fbar-seg--on';
            seg.style.left  = (Math.max(w.s - tMin, 0) / tSpan * 100) + '%';
            seg.style.width = Math.max((w.e - w.s) / tSpan * 100, 0.2) + '%';
            var fmtT = function (t) {
              return new Date(t).toLocaleString(undefined,
                { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            };
            seg.title = fmtT(w.s) + ' – ' + fmtT(w.e) +
              ' · ' + Math.round(w.hours * 10) / 10 + ' h active' +
              (w.count > 1 ? ' (' + w.count + ' sparks)' : '');
            bar.appendChild(seg);
          });
          barEl.appendChild(bar);
          barEl.classList.add('fd-fault-bar-wrap--loaded');
          _alignFaultBar();

          // Shade the same periods into the trend charts (accumulate — a
          // group item loads one bar per member fault).
          _sparkWins = (_sparkWins || []).concat(wins);
          _charts.forEach(function (c) { try { c.update('none'); } catch (e) {} });
        })
        .catch(function (err) {
          console.warn('[FaultDetail] ruleSparkHis fetch failed (bar hidden):', err, '\nExpr:', axon);
        });
    },

    _loadTrendChart: function (contentEl, fault, ctx, rangeKey) {
      var API = NS.api;
      var loadingEl = contentEl.querySelector('#fdChartLoading');
      var wrapEl = contentEl.querySelector('#fdChartWrap');
      var raw = fault._raw || {};

      // Clear previous charts
      wrapEl.querySelectorAll('canvas').forEach(function (c) {
        var ci = Chart.getChart(c);
        if (ci) ci.destroy();
      });
      _charts = [];
      wrapEl.innerHTML = '<div class="fd-chart-loading" id="fdChartLoading">Loading trend data…</div>';
      loadingEl = wrapEl.querySelector('#fdChartLoading');

      if (!ctx || !ctx.attestKey || !ctx.projectName) {
        this._showChartFallback(wrapEl, loadingEl, fault);
        return;
      }

      var equipName = raw.equipment || fault.equipment;
      var siteRef = _extractRef(raw.siteRef) || ctx.siteRef;
      if (!equipName || !siteRef) {
        this._showChartFallback(wrapEl, loadingEl, fault);
        return;
      }

      var dateRange = this._computeDateRange(fault, ctx, rangeKey);

      var axon = 'readAll(point and his and equipRef->navName==' + _q(equipName) + ' and siteRef==' + siteRef + ').hisRead(' + dateRange + ')';

      API.evalAxon(ctx.attestKey, ctx.projectName, axon)
        .then(function (grid) {
          var parsed = _parseHisGrid(grid);
          if (!parsed) {
            this._showChartFallback(wrapEl, loadingEl, fault);
            return;
          }
          if (loadingEl) loadingEl.style.display = 'none';
          _renderCharts('fdChartWrap', parsed);
        }.bind(this))
        .catch(function (err) {
          console.warn('[FaultDetail] Trend chart fetch failed:', err);
          this._showChartFallback(wrapEl, loadingEl, fault);
        }.bind(this));
    },

    _showChartFallback: function (wrapEl, loadingEl, fault) {
      if (!wrapEl) return;
      var html = '';
      if (fault.sparksLink) {
        html = '<div class="fd-chart-fallback">' +
          '<span>Trend data unavailable.</span>' +
          '<a class="fd-sparks-link" href="' + fault.sparksLink + '" target="_blank">View in SkySpark &#8599;</a>' +
          '</div>';
      } else {
        html = '<div class="fd-chart-fallback"><span>No trend data available for this fault.</span></div>';
      }
      if (loadingEl) loadingEl.style.display = 'none';
      var fb = document.createElement('div');
      fb.innerHTML = html;
      wrapEl.appendChild(fb.firstChild);
    },

    destroy: function () { _destroyAll(); }
  };

})(window.mbcxDashboard);
