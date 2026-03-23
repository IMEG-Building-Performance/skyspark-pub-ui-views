// reheatDashboardHandler.js
// Deploy to: cloud server at {var}/pub/ui/reheatDashboard/
// This is the main handler — loaded dynamically by reheatDashboardEntry.js
//
// View record (trio):
//   dis: "VAV Reheat Diagnostic"
//   view
//   jsHandler: { var defVal:"reheatDashboardHandler" }

window.reheatDashboardApp = window.reheatDashboardApp || {};

(function () {
  var NS = window.reheatDashboardApp;
  NS.state = {};

  // ── Deterministic pseudo-random ──
  function lcg(seed) {
    var s = seed >>> 0;
    return function () {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  // ── Classification ──
  function classify(dat, rh) {
    if (dat < 68 && rh > 60) return 'faulty';
    if (dat > 75 && rh < 30) return 'leaking';
    if (dat < 65 && rh > 42) return 'watch';
    return 'ok';
  }

  // ── Load CSS ──
  function loadStyles() {
    if (document.getElementById('reheatDashboardCSS')) return;
    var link = document.createElement('link');
    link.id = 'reheatDashboardCSS';
    link.rel = 'stylesheet';
    link.href = '/pub/ui/reheatDashboard/reheatDashboardStyles.css';
    document.head.appendChild(link);
  }

  // ── Generate demo VAV dataset ──
  function generateDemoData() {
    var rng = lcg(42);
    var prefixes = ['AHU-1.', 'AHU-2.', 'AHU-3.'];
    var templates = [];
    var i;

    for (i = 0; i < 28; i++) templates.push([55 + rng() * 6, rng() * 22]);
    for (i = 0; i < 52; i++) templates.push([60 + rng() * 9, 8 + rng() * 52]);
    for (i = 0; i < 48; i++) templates.push([65 + rng() * 9, 22 + rng() * 68]);
    for (i = 0; i < 22; i++) templates.push([58 + rng() * 11, 58 + rng() * 42]);
    for (i = 0; i < 32; i++) templates.push([72 + rng() * 11, 22 + rng() * 68]);
    for (i = 0; i < 14; i++) templates.push([76 + rng() * 10, 3 + rng() * 24]);
    for (i = 0; i < 12; i++) templates.push([84 + rng() * 9, 48 + rng() * 48]);

    return templates.map(function (t, idx) {
      var dat = Math.round(t[0] * 10) / 10;
      var rh = Math.min(100, Math.max(0, Math.round(t[1])));
      var pfx = prefixes[idx % 3];
      var num = String(Math.floor(idx / 3) + 1).padStart(2, '0');
      return { id: idx, name: pfx + 'VAV-' + num, dat: dat, rh: rh, flag: classify(dat, rh) };
    });
  }

  // ── Tip labels / classes ──
  var tipLabels = { faulty: 'Faulty Reheat', leaking: 'Leaking Valve', watch: 'Watch', ok: 'Normal' };
  var tipCls = { faulty: 'flag-faulty', leaking: 'flag-leaking', watch: 'flag-watch', ok: 'flag-ok' };
  var badgeCls = {
    faulty: 'badge badge-faulty',
    leaking: 'badge badge-leaking',
    ok: 'badge badge-ok',
    watch: 'badge badge-watch'
  };

  // ── SVG helpers ──
  function svgNS(tag, attrs, parent) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) {
      if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  }

  function svgText(content, attrs, parent) {
    var e = svgNS('text', attrs, parent);
    e.textContent = content;
    return e;
  }

  function dotFill(flag, sel) {
    if (sel) return '#f59e0b';
    if (flag === 'faulty') return '#ef4444';
    if (flag === 'leaking') return '#8b5cf6';
    return '#3b82f6';
  }

  function dotStroke(flag, sel) {
    if (sel) return '#b45309';
    if (flag === 'faulty') return '#b91c1c';
    if (flag === 'leaking') return '#5b21b6';
    return '#1d4ed8';
  }

  // ── Build HTML ──
  function buildDOM(container) {
    container.innerHTML = [
      '<div class="page-header">',
      '  <h1>VAV Reheat Diagnostic</h1>',
      '  <div class="meta">',
      '    <span>VAV Air Terminal Units</span>',
      '    <span class="meta-sep">&middot;</span>',
      '    <span>Daily averages</span>',
      '    <span class="meta-sep">&middot;</span>',
      '    <span>Building Analytics</span>',
      '    <span class="date-badge" style="margin-left:auto">Current Period</span>',
      '  </div>',
      '</div>',
      '<div class="kpi-row" id="rdKpiRow"></div>',
      '<div class="main-body">',
      '  <div class="card">',
      '    <div class="card-header">',
      '      <h2>VAV Units</h2>',
      '      <span class="subtitle" id="rdRowCount"></span>',
      '    </div>',
      '    <div class="table-search">',
      '      <div class="search-wrap">',
      '        <svg class="ico" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">',
      '          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      '        </svg>',
      '        <input type="text" id="rdSearch" placeholder="Search name or status\u2026">',
      '      </div>',
      '    </div>',
      '    <div class="table-scroll">',
      '      <table>',
      '        <thead>',
      '          <tr>',
      '            <th data-col="name">VAV Unit</th>',
      '            <th data-col="dat">Avg DAT</th>',
      '            <th data-col="rh">Avg RH%</th>',
      '            <th data-col="flag">Status</th>',
      '          </tr>',
      '        </thead>',
      '        <tbody id="rdTableBody"></tbody>',
      '      </table>',
      '    </div>',
      '  </div>',
      '  <div class="card">',
      '    <div class="card-header">',
      '      <h2>KPI Scatter &mdash; Avg Discharge Air Temp vs. Avg Reheat Valve Output</h2>',
      '      <div class="legend-row" style="margin:0">',
      '        <span class="leg"><span class="leg-dot" style="background:#3b82f6"></span>Normal</span>',
      '        <span class="leg"><span class="leg-dot" style="background:#ef4444"></span>Faulty Reheat</span>',
      '        <span class="leg"><span class="leg-dot" style="background:#8b5cf6"></span>Leaking Valve</span>',
      '        <span class="leg"><span class="leg-dot" style="background:#f59e0b;border:1.5px solid #b45309"></span>Selected</span>',
      '      </div>',
      '    </div>',
      '    <div class="chart-inner">',
      '      <svg class="rd-scatter" style="cursor:crosshair"></svg>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="rd-tooltip"></div>'
    ].join('\n');
  }

  // ── Render KPIs ──
  function renderKPIs(vavData) {
    var total = vavData.length;
    var faulty = vavData.filter(function (d) { return d.flag === 'faulty'; }).length;
    var leaking = vavData.filter(function (d) { return d.flag === 'leaking'; }).length;
    var avgRH = Math.round(vavData.reduce(function (s, d) { return s + d.rh; }, 0) / total);
    var avgDAT = (vavData.reduce(function (s, d) { return s + d.dat; }, 0) / total).toFixed(1);

    var kpis = [
      { label: 'Total VAVs', value: total, unit: 'monitored units', cls: '' },
      { label: 'Faulty Reheat', value: faulty, unit: Math.round(faulty / total * 100) + '% of fleet', cls: 'red' },
      { label: 'Leaking Valve', value: leaking, unit: Math.round(leaking / total * 100) + '% of fleet', cls: 'amber' },
      { label: 'Fleet Avg RH', value: avgRH + '%', unit: 'avg heating valve output', cls: 'blue' },
      { label: 'Fleet Avg DAT', value: avgDAT + '\u00B0F', unit: 'avg discharge air temp', cls: '' }
    ];

    var kpiRow = document.getElementById('rdKpiRow');
    if (!kpiRow) return;
    kpiRow.innerHTML = kpis.map(function (k) {
      return '<div class="kpi-card">' +
        '<div class="label">' + k.label + '</div>' +
        '<div class="value ' + k.cls + '">' + k.value + '</div>' +
        '<div class="unit">' + k.unit + '</div>' +
        '</div>';
    }).join('');
  }

  // ── Scatter chart ──
  var M = { top: 20, right: 32, bottom: 44, left: 52 };
  var XD = [50, 100], YD = [0, 100];

  function toX(v, W) { return M.left + (v - XD[0]) / (XD[1] - XD[0]) * (W - M.left - M.right); }
  function toY(v, H) { return M.top + (1 - (v - YD[0]) / (YD[1] - YD[0])) * (H - M.top - M.bottom); }

  function renderScatter(svgEl, tipEl, vavData, selectedId) {
    // Read size from parent container, not the SVG itself, to avoid feedback loops
    var parent = svgEl.parentElement;
    var rect = parent ? parent.getBoundingClientRect() : svgEl.getBoundingClientRect();
    var W = Math.max(rect.width || 600, 380);
    var H = Math.max(rect.height || 420, 320);
    svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svgEl.innerHTML = '';

    var plotW = W - M.left - M.right;
    var plotH = H - M.top - M.bottom;

    // Background
    svgNS('rect', { x: M.left, y: M.top, width: plotW, height: plotH, fill: '#fafbfc' }, svgEl);

    // Zone: faulty reheat (top-left)
    var fx = toX(68, W);
    var fy60 = toY(60, H);
    svgNS('rect', {
      x: M.left, y: M.top, width: fx - M.left, height: fy60 - M.top,
      fill: '#fde8e8', opacity: 0.35, stroke: '#ef444428', 'stroke-width': 1
    }, svgEl);

    // Zone: leaking valve (bottom-right)
    var lx = toX(75, W);
    var ly30 = toY(30, H);
    svgNS('rect', {
      x: lx, y: ly30, width: W - M.right - lx, height: H - M.bottom - ly30,
      fill: '#ede9fe', opacity: 0.35, stroke: '#8b5cf628', 'stroke-width': 1
    }, svgEl);

    // Grid lines
    [0, 20, 40, 60, 80, 100].forEach(function (v) {
      var y = toY(v, H);
      svgNS('line', {
        x1: M.left, x2: W - M.right, y1: y, y2: y,
        stroke: v === 0 || v === 100 ? '#c8cdd2' : '#e4e7ea', 'stroke-width': 1
      }, svgEl);
      svgText(v + '%', {
        x: M.left - 7, y: y + 4, 'text-anchor': 'end',
        'font-family': 'Segoe UI,Arial,sans-serif', 'font-size': 10, fill: '#8a8f96'
      }, svgEl);
    });

    [50, 60, 70, 80, 90, 100].forEach(function (v) {
      var x = toX(v, W);
      svgNS('line', {
        x1: x, x2: x, y1: M.top, y2: H - M.bottom,
        stroke: v === 50 || v === 100 ? '#c8cdd2' : '#e4e7ea', 'stroke-width': 1
      }, svgEl);
      svgText(v + '\u00B0F', {
        x: x, y: H - M.bottom + 14, 'text-anchor': 'middle',
        'font-family': 'Segoe UI,Arial,sans-serif', 'font-size': 10, fill: '#8a8f96'
      }, svgEl);
    });

    // Axis labels
    var yLbl = svgNS('text', {
      transform: 'rotate(-90)',
      x: -(M.top + plotH / 2), y: 15,
      'text-anchor': 'middle', 'font-family': 'Segoe UI,Arial,sans-serif',
      'font-size': 10, fill: '#6b6b6b', 'letter-spacing': '0.04em'
    }, svgEl);
    yLbl.textContent = 'AVG REHEAT VALVE OUTPUT (%)';

    svgText('AVG DISCHARGE AIR TEMPERATURE (\u00B0F)', {
      x: M.left + plotW / 2, y: H - 5, 'text-anchor': 'middle',
      'font-family': 'Segoe UI,Arial,sans-serif',
      'font-size': 10, fill: '#6b6b6b', 'letter-spacing': '0.04em'
    }, svgEl);

    // Reference diagonal
    svgNS('line', {
      x1: toX(50, W), y1: toY(0, H), x2: toX(100, W), y2: toY(100, H),
      stroke: '#e05252', 'stroke-width': 1.5, 'stroke-dasharray': '5,4', opacity: 0.45
    }, svgEl);

    // Zone annotations
    svgText('FAULTY REHEAT', {
      x: M.left + 7, y: M.top + 12,
      'font-family': 'Segoe UI,Arial,sans-serif', 'font-size': 9.5, 'font-weight': 700,
      fill: '#c0392b', opacity: 0.6, 'letter-spacing': '0.06em'
    }, svgEl);
    svgText('LEAKING VALVE', {
      x: W - M.right - 7, y: H - M.bottom - 8, 'text-anchor': 'end',
      'font-family': 'Segoe UI,Arial,sans-serif', 'font-size': 9.5, 'font-weight': 700,
      fill: '#7c3aed', opacity: 0.6, 'letter-spacing': '0.06em'
    }, svgEl);

    // Dots — normal first, anomalies on top, selected last
    var order = ['ok', 'watch', 'faulty', 'leaking'];
    var groups = [];
    order.forEach(function (f) {
      vavData.forEach(function (d) {
        if (d.flag === f && d.id !== selectedId) groups.push(d);
      });
    });
    if (selectedId !== null) {
      var sel = vavData.find(function (d) { return d.id === selectedId; });
      if (sel) groups.push(sel);
    }

    groups.forEach(function (d) {
      var cx = toX(d.dat, W), cy = toY(d.rh, H);
      var isSel = d.id === selectedId;
      var c = svgNS('circle', {
        cx: cx, cy: cy,
        r: isSel ? 7.5 : 5.5,
        fill: dotFill(d.flag, isSel),
        opacity: isSel ? 1 : (d.flag === 'ok' ? 0.75 : 0.88),
        stroke: dotStroke(d.flag, isSel),
        'stroke-width': isSel ? 2.5 : 1
      }, svgEl);
      c.style.cursor = 'pointer';
      c.addEventListener('mouseenter', function (e) { showTip(tipEl, e, d); });
      c.addEventListener('mouseleave', function () { hideTip(tipEl); });
      c.addEventListener('click', function () { NS.selectVAV(d.id); });
    });
  }

  // ── Tooltip ──
  function showTip(tipEl, e, d) {
    tipEl.innerHTML =
      '<strong>' + d.name + '</strong>' +
      '<div class="tip-row"><span>Avg DAT</span><span class="tip-val">' + d.dat + ' \u00B0F</span></div>' +
      '<div class="tip-row"><span>Avg Reheat</span><span class="tip-val">' + d.rh + '%</span></div>' +
      '<div class="tip-flag ' + tipCls[d.flag] + '">' + tipLabels[d.flag] + '</div>';
    tipEl.classList.add('visible');
    moveTip(tipEl, e);
  }

  function hideTip(tipEl) { tipEl.classList.remove('visible'); }

  function moveTip(tipEl, e) {
    tipEl.style.left = (e.clientX + 16) + 'px';
    tipEl.style.top = (e.clientY - 12) + 'px';
  }

  // ── Table ──
  function renderTable(vavData, selectedId, sortCol, sortDir, searchVal) {
    var q = searchVal.toLowerCase();
    var rows = vavData.filter(function (d) {
      return d.name.toLowerCase().indexOf(q) !== -1 ||
        tipLabels[d.flag].toLowerCase().indexOf(q) !== -1;
    });
    rows.sort(function (a, b) {
      var av = a[sortCol], bv = b[sortCol];
      return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * sortDir;
    });

    var rowCountEl = document.getElementById('rdRowCount');
    if (rowCountEl) rowCountEl.textContent = rows.length + ' of ' + vavData.length;

    var tbody = document.getElementById('rdTableBody');
    if (!tbody) return;
    tbody.innerHTML = rows.map(function (d) {
      return '<tr data-id="' + d.id + '" class="' + (d.id === selectedId ? 'selected' : '') + '">' +
        '<td class="name-cell">' + d.name + '</td>' +
        '<td>' + d.dat + ' \u00B0F</td>' +
        '<td>' + d.rh + '%</td>' +
        '<td><span class="' + badgeCls[d.flag] + '">' + tipLabels[d.flag] + '</span></td>' +
        '</tr>';
    }).join('');

    // Attach click handlers
    var trEls = tbody.querySelectorAll('tr[data-id]');
    for (var i = 0; i < trEls.length; i++) {
      (function (tr) {
        tr.addEventListener('click', function () {
          NS.selectVAV(parseInt(tr.getAttribute('data-id'), 10));
        });
      })(trEls[i]);
    }
  }

  // ── Main onUpdate ──
  NS.onUpdate = function (arg) {
    var view = arg.view;
    var elem = arg.elem;
    view.removeAll();

    loadStyles();

    // Create scoped container
    var container = document.createElement('div');
    container.id = 'reheatDashboard';
    elem.appendChild(container);

    // Generate demo data
    var vavData = generateDemoData();
    var state = { selectedId: null, sortCol: 'name', sortDir: 1, searchVal: '' };

    buildDOM(container);

    var svgEl = container.querySelector('.rd-scatter');
    var tipEl = container.querySelector('.rd-tooltip');

    // Mousemove for tooltip tracking
    svgEl.addEventListener('mousemove', function (e) { moveTip(tipEl, e); });

    renderKPIs(vavData);

    function refresh() {
      renderScatter(svgEl, tipEl, vavData, state.selectedId);
      renderTable(vavData, state.selectedId, state.sortCol, state.sortDir, state.searchVal);
    }

    // Selection handler
    NS.selectVAV = function (id) {
      state.selectedId = state.selectedId === id ? null : id;
      refresh();
      if (state.selectedId !== null) {
        var row = container.querySelector('#rdTableBody tr[data-id="' + state.selectedId + '"]');
        if (row) row.scrollIntoView({ block: 'nearest' });
      }
    };

    // Sort headers
    var ths = container.querySelectorAll('thead th[data-col]');
    for (var i = 0; i < ths.length; i++) {
      (function (th) {
        th.addEventListener('click', function () {
          var col = th.getAttribute('data-col');
          state.sortDir = state.sortCol === col ? state.sortDir * -1 : 1;
          state.sortCol = col;
          var allTh = container.querySelectorAll('thead th');
          for (var j = 0; j < allTh.length; j++) {
            allTh[j].classList.remove('sort-asc', 'sort-desc');
          }
          th.classList.add(state.sortDir === 1 ? 'sort-asc' : 'sort-desc');
          renderTable(vavData, state.selectedId, state.sortCol, state.sortDir, state.searchVal);
        });
      })(ths[i]);
    }

    // Search
    var searchInput = container.querySelector('#rdSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.searchVal = e.target.value;
        renderTable(vavData, state.selectedId, state.sortCol, state.sortDir, state.searchVal);
      });
    }

    // Resize handler
    var resizeHandler = function () {
      renderScatter(svgEl, tipEl, vavData, state.selectedId);
    };
    window.addEventListener('resize', resizeHandler);

    // Initial render
    refresh();
  };

  // Expose under the app global that the entry file delegates to
  console.log('[reheatDashboard] Handler ready. window.reheatDashboardApp exposed.');
})();
