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
    if (typeof obj === 'string' && obj.charAt(0) === '@') return obj;
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
    console.log('[FaultDetail] Grid cols:', JSON.stringify(grid.cols.map(function(c) { return { name: c.name, meta: c.meta, dis: c.dis }; })));
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

    // Toggle bar
    var toggleBar = document.createElement('div');
    toggleBar.className = 'fd-chart-toggles';
    container.appendChild(toggleBar);

    var panels = {};
    var chartInstances = [];
    var colorIdx = 0;
    groupOrder.forEach(function (unit) {
      var members = groups[unit];

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

      chartInstances.push(chartInst);

      chip.addEventListener('click', function () {
        var visible = panelDiv.style.display !== 'none';
        panelDiv.style.display = visible ? 'none' : '';
        chip.classList.toggle('fd-chart-toggle--on', !visible);
        chartInstances.forEach(function (ci) { ci.resize(); });
      });
    });
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

  // ── Public API ─────────────────────────────────────────────────────────────
  NS.components.FaultDetail = {

    show: function (contentEl, fault, allFaults, ctx, onBack, options) {
      var opts     = options || {};
      var nav      = opts.agendaNav || null;
      var backLabel = nav ? '&#8592; Agenda' : '&#8592; Fault List';
      var inAgenda = !!(NS.meeting && NS.meeting.has(fault.id));

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
        '        <div class="fd-card-title">Fault Trend' +
          (fault.sparksLink ? ' <a class="fd-sparks-link fd-sparks-link-sm" href="' + fault.sparksLink + '" target="_blank">SkySpark &#8599;</a>' : '') +
        '</div>',
        '        <div class="fd-chart-wrap" id="fdChartWrap">',
        '          <div class="fd-chart-loading" id="fdChartLoading">Loading trend data…</div>',
        '        </div>',
        '      </div>',
        '    </div>',

        '    <div class="fd-col-right">',
        '      <div class="fd-card">',
        '        <div class="fd-card-title">Diagnostics</div>',
        '        <div class="fd-diag-list">' + renderDiag(fault) + '</div>',
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

      // Fetch point history for chart
      this._loadTrendChart(contentEl, fault, ctx);
    },

    _loadTrendChart: function (contentEl, fault, ctx) {
      var API = NS.api;
      var loadingEl = contentEl.querySelector('#fdChartLoading');
      var wrapEl = contentEl.querySelector('#fdChartWrap');
      var raw = fault._raw || {};

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

      var startDate = _extractDate(raw.reportStartDate) || ctx.datesStart;
      var endDate = _extractDate(raw.reportEndDate) || ctx.datesEnd;
      var dateRange = (startDate && endDate) ? startDate + '..' + endDate : 'pastMonth';

      var axon = 'readAll(point and his and equipRef->navName=="' + equipName + '" and siteRef==' + siteRef + ').hisRead(' + dateRange + ')';
      console.log('[FaultDetail] Chart axon:', axon);

      API.evalAxon(ctx.attestKey, ctx.projectName, axon)
        .then(function (grid) {
          console.log('[FaultDetail] Chart grid:', grid && grid.cols && grid.cols.length, 'cols,', grid && grid.rows && grid.rows.length, 'rows');
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

    destroy: function () {}
  };

})(window.mbcxDashboard);
