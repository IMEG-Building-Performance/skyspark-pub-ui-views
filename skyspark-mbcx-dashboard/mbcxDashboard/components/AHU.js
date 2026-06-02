// components/AHU.js — Air Handling Units section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

var CHART_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Heat-map bg: white → red as |value| approaches ±75
function _diffBg(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  var ratio = Math.min(Math.abs(v) / 75, 1);
  var g = Math.round(255 - 196 * ratio);
  var b = Math.round(255 - 207 * ratio);
  return 'background:rgb(255,' + g + ',' + b + ');';
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

window.mbcxDashboard.components.AHU = {

  render: function (d) {
    return [
      '<div class="equip-section equip-section--collapsible equip-section--open" id="mbcxAhuSection" style="border-left-color:#5C8A3C;">',
      '  <div class="equip-header equip-header--clickable" onclick="this.closest(\'.equip-section\').classList.toggle(\'equip-section--open\');">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--imeg-green-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5C8A3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Air Handling Units</div><div class="equip-meta" id="mbcxAhuCount">\u2014 AHUs</div></div>',
      '    </div>',
      '    <div style="display:flex;align-items:center;gap:8px;">',
      '      <button class="ahu-fs-btn" id="mbcxAhuFsBtn" title="Toggle fullscreen" onclick="event.stopPropagation();">',
      '        <svg id="mbcxAhuFsIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>',
      '          <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
      '        </svg>',
      '      </button>',
      '      <div class="equip-collapse-btn" title="Expand / Collapse">',
      '        <svg class="equip-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="equip-body" id="mbcxAhuContent">',
      '    <div class="ahu-loading">Loading AHU data\u2026</div>',
      '  </div>',
      '</div>'
    ].join('\n');
  },

  initLive: function (container, ctx) {
    var self = this;
    var contentEl = container.querySelector('#mbcxAhuContent');
    if (!contentEl) return;

    if (!ctx || !ctx.attestKey || !ctx.siteRef) {
      contentEl.innerHTML = self._noData('No site configured.');
      return;
    }

    // Wire fullscreen button (exists in static render shell)
    var fsBtn   = container.querySelector('#mbcxAhuFsBtn');
    var section = container.querySelector('#mbcxAhuSection');
    var fsIcon  = container.querySelector('#mbcxAhuFsIcon');
    if (fsBtn && section) {
      fsBtn.addEventListener('click', function () {
        if (!document.fullscreenElement) {
          section.requestFullscreen && section.requestFullscreen();
          if (fsIcon) fsIcon.innerHTML =
            '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>' +
            '<line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>';
        } else {
          document.exitFullscreen && document.exitFullscreen();
          if (fsIcon) fsIcon.innerHTML =
            '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>' +
            '<line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
        }
      });
    }

    window.mbcxDashboard.evals.loadAllAhuMetrics(ctx.attestKey, ctx.projectName, ctx.siteRef)
      .then(function (results) {
        self._renderAll(contentEl, results);
      })
      .catch(function (err) {
        console.error('[mbcxDashboard] AHU data failed:', err);
        contentEl.innerHTML = self._noData('Could not load AHU data: ' + (err && err.message ? err.message : String(err)));
      });
  },

  _renderAll: function (contentEl, results) {
    var self = this;
    var HP   = window.mbcxDashboard.haystackParser;
    var C    = window.Chart;

    // Toggle bar
    var toggleHtml = '<div class="ahu-toggle" id="mbcxAhuToggle" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">' +
      results.map(function (r, i) {
        var active = i === 0 ? ' ahu-toggle-btn--active' : '';
        return '<button class="ahu-toggle-btn' + active + '" data-ahu-metric="' + r.metric.id + '">'
          + _esc(r.metric.label) + '</button>';
      }).join('') +
    '</div>';

    // Metric blocks — chart left, table right
    var blocksHtml = results.map(function (r, i) {
      var canvasId = 'mbcxAhuChart-' + r.metric.id;
      var tParsed  = HP.parseGrid(r.tableGrid);
      var hidden   = i === 0 ? '' : ' ahu-metric-block--hidden';
      return [
        '<div class="ahu-metric-block' + hidden + '" data-ahu-block="' + r.metric.id + '">',
        '  <div class="ahu-chart-wrap">',
        '    <canvas id="' + canvasId + '" height="220"></canvas>',
        '  </div>',
        '  <div class="ahu-table-wrap">',
        self._tableHTML(tParsed, r.tableGrid),
        '  </div>',
        '</div>'
      ].join('\n');
    }).join('\n');

    contentEl.innerHTML = toggleHtml + blocksHtml;

    // Update AHU count from first result's table row count
    var countEl = document.getElementById('mbcxAhuCount');
    if (countEl && results.length) {
      var HP2 = window.mbcxDashboard.haystackParser;
      var firstTable = HP2.parseGrid(results[0].tableGrid);
      if (firstTable.rows.length) countEl.textContent = firstTable.rows.length + ' AHUs';
    }

    // Toggle click handler
    var toggle = contentEl.querySelector('#mbcxAhuToggle');
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-ahu-metric]');
        if (!btn) return;
        var id = btn.getAttribute('data-ahu-metric');
        contentEl.querySelectorAll('.ahu-toggle-btn').forEach(function (b) { b.classList.remove('ahu-toggle-btn--active'); });
        btn.classList.add('ahu-toggle-btn--active');
        contentEl.querySelectorAll('.ahu-metric-block').forEach(function (bl) {
          bl.classList.toggle('ahu-metric-block--hidden', bl.getAttribute('data-ahu-block') !== id);
        });
      });
    }

    // Init each chart after DOM is set
    results.forEach(function (r) {
      if (!C) return;
      var parsed   = HP.parseGrid(r.plotGrid);
      var canvasId = 'mbcxAhuChart-' + r.metric.id;
      var canvas   = contentEl.querySelector('#' + canvasId);
      if (canvas && parsed.rows.length > 0) {
        self._initChart(canvas, parsed, r.metric);
      }
    });
  },

  _initChart: function (canvas, parsed, metric) {
    var C    = window.Chart;
    var cols = parsed.cols;
    var rows = parsed.rows;

    // Find timestamp column — scan all rows
    var tsCol = null;
    cols.forEach(function (col) {
      if (tsCol) return;
      if (col === 'ts') { tsCol = col; return; }
      for (var i = 0; i < rows.length; i++) {
        var v = rows[i][col];
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) { tsCol = col; return; }
      }
    });

    // Find numeric data columns — scan all rows
    var dataCols = [];
    cols.forEach(function (col) {
      if (col === tsCol || col === 'id') return;
      for (var i = 0; i < rows.length; i++) {
        var v = rows[i][col];
        if (v !== null && v !== undefined && typeof v === 'number') { dataCols.push(col); return; }
      }
    });

    if (!dataCols.length) {
      console.warn('[mbcxDashboard] AHU chart ' + metric.id + ': no numeric columns. Cols:', cols);
      return;
    }

    // Group by (year, month), fleet average; values ÷ 100 so 1.0 = 100%
    var byYear = {};
    rows.forEach(function (r) {
      var tsVal = tsCol ? r[tsCol] : null;
      if (!tsVal) return;
      var d = new Date(tsVal);
      if (isNaN(d.getTime())) return;

      var yr  = String(d.getFullYear());
      var mon = d.getMonth() + 1;
      var sum = 0, n = 0;
      dataCols.forEach(function (c) {
        var v = r[c];
        if (v !== null && v !== undefined && typeof v === 'number') { sum += v; n++; }
      });
      if (n > 0) {
        if (!byYear[yr]) byYear[yr] = {};
        byYear[yr][mon] = +(sum / n / 100).toFixed(4);
      }
    });

    var years = Object.keys(byYear).sort();
    var prevPalette = { bg: 'rgba(156,163,175,0.45)', border: 'rgba(156,163,175,0.7)' };

    var datasets = years.map(function (yr, i) {
      var isLatest = (i === years.length - 1);
      var c = isLatest ? { bg: metric.cur, border: metric.curB } : prevPalette;
      return {
        label: yr,
        data: CHART_MONTHS.map(function (_, mi) {
          var v = byYear[yr][mi + 1];
          return v !== undefined ? v : null;
        }),
        backgroundColor: c.bg,
        borderColor: c.border,
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.85
      };
    });

    new C(canvas, {
      type: 'bar',
      data: { labels: CHART_MONTHS, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: years.length > 1,
            position: 'top',
            labels: { font: { size: 10 }, color: '#6B7280', boxWidth: 12 }
          },
          tooltip: {
            backgroundColor: '#1F2937',
            titleFont: { size: 11 }, bodyFont: { size: 12 }, padding: 9, cornerRadius: 5,
            callbacks: {
              label: function (c) {
                return c.dataset.label + ': ' + (c.parsed.y * 100).toFixed(1) + '%';
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 10 }, color: '#9CA3AF' },
            grid: { display: false }, border: { display: false }
          },
          y: {
            min: 0,
            max: 1,
            ticks: {
              font: { size: 10 }, color: '#9CA3AF', maxTicksLimit: 6,
              callback: function (v) { return (v * 100).toFixed(0) + '%'; }
            },
            grid: { color: '#F3F4F6' }, border: { display: false }
          }
        }
      }
    });
  },

  _tableHTML: function (tParsed, rawGrid) {
    var HP = window.mbcxDashboard.haystackParser;
    if (!tParsed.rows.length) return '<p class="ahu-no-rows">No data returned.</p>';

    var cols    = tParsed.cols;
    var headers = cols.map(function (c) { return HP.colDis(rawGrid, c); });

    var rowsHtml = tParsed.rows.map(function (row) {
      var cells = cols.map(function (c) {
        var v = row[c];
        if (v === null || v === undefined) return '<td class="ahu-td">&mdash;</td>';

        if (c === 'diff' && typeof v === 'number') {
          var style = _diffBg(v);
          var sign  = v > 0 ? '+' : '';
          return '<td class="ahu-td ahu-td-num ahu-td-diff" style="' + style + '">'
            + sign + v.toFixed(1) + '%</td>';
        }

        if (typeof v === 'number') return '<td class="ahu-td ahu-td-num">' + v.toFixed(1) + '%</td>';
        if (typeof v === 'object' && v.dis) return '<td class="ahu-td">' + _esc(v.dis) + '</td>';
        return '<td class="ahu-td">' + _esc(String(v)) + '</td>';
      }).join('');
      return '<tr>' + cells + '</tr>';
    }).join('');

    return [
      '<table class="ahu-table">',
      '<thead><tr>' + headers.map(function (h) { return '<th class="ahu-th">' + _esc(h) + '</th>'; }).join('') + '</tr></thead>',
      '<tbody>' + rowsHtml + '</tbody>',
      '</table>'
    ].join('');
  },

  _noData: function (msg) {
    return '<div class="ahu-no-data">' + msg + '</div>';
  }
};
