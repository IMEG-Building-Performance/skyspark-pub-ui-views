// components/EquipmentView.js — Equipment detail view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.EquipmentView = (function () {

  var _container = null;
  var _ctx = null;
  var _equipList = [];
  var _selectedId = null;
  var _preselectDis = null; // set via preselect() before navigating here
  var _charts = [];
  var _selectorOpen = false;
  var _lastPoints = [];
  var _lastFaults = null;

  var CHART_COLORS = [
    '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
    '#0891B2', '#BE185D', '#4F46E5', '#CA8A04', '#15803D'
  ];
  var SEV_COLORS = { critical: '#ef4444', warning: '#f59e0b', info: '#9ca3af' };

  // ── Crosshair plugin (mirrors Compliance.js) ───────────────────────

  function _closestDataIndex(chart, px) {
    var meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data.length) return -1;
    var best = -1, bestDist = Infinity;
    meta.data.forEach(function (pt, i) {
      var d = Math.abs(pt.x - px);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function _nearestDatasetIndex(chart, px, py) {
    var best = -1, bestDist = Infinity;
    chart.data.datasets.forEach(function (ds, di) {
      var meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach(function (pt) {
        if (Math.abs(pt.x - px) > 10) return;
        var d = Math.abs(pt.y - py);
        if (d < bestDist) { bestDist = d; best = di; }
      });
    });
    return best;
  }

  function _getChartUnit(chart) {
    var yScale = chart.scales.y;
    if (yScale && yScale.options && yScale.options.ticks && yScale.options.ticks.callback) {
      return yScale.options.ticks.callback(0, 0, []).replace('0', '');
    }
    return '';
  }

  function _dismissPinnedPanel(chart) {
    if (chart._crosshair._panel) { chart._crosshair._panel.remove(); chart._crosshair._panel = null; }
    chart._crosshair.pinned = false;
  }

  function _showPinnedPanel(chart, dataIdx, clickX, clickY) {
    var ch = chart._crosshair;
    var unit = _getChartUnit(chart);
    var label = chart.data.labels[dataIdx] || '';
    var items = [];
    chart.data.datasets.forEach(function (ds, di) {
      var meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      var v = ds.data[dataIdx];
      items.push({
        color: ds.borderColor || CHART_COLORS[di % CHART_COLORS.length],
        name: ds.label || ('Series ' + di),
        val: v,
        valStr: v !== null && v !== undefined ? (typeof v === 'number' ? v.toFixed(2) + unit : String(v)) : '—'
      });
    });
    items.sort(function (a, b) { return ((b.val || 0) - (a.val || 0)); });

    var panel = document.createElement('div');
    panel.className = 'comp-pin-panel';
    var header = '<div class="comp-pin-header"><span class="comp-pin-ts-label">Timestamp</span><span class="comp-pin-ts-val">' + label + '</span></div>';
    var rows = items.map(function (it) {
      return '<div class="comp-pin-row"><span class="comp-pin-dot" style="background:' + it.color + '"></span><span class="comp-pin-name">' + it.name + '</span><span class="comp-pin-val">' + it.valStr + '</span></div>';
    }).join('');
    panel.innerHTML = header + '<div class="comp-pin-rows">' + rows + '</div>';

    var wrapEl = chart.canvas.parentElement;
    wrapEl.style.position = 'relative';
    panel.style.position = 'absolute';
    panel.style.zIndex = '50';
    panel.style.left = clickX + 'px';
    panel.style.top = clickY + 'px';
    panel.style.maxHeight = (wrapEl.clientHeight - clickY) + 'px';
    wrapEl.appendChild(panel);

    var panelRect = panel.getBoundingClientRect();
    var wrapRect = wrapEl.getBoundingClientRect();
    if (panelRect.right > wrapRect.right - 4) panel.style.left = Math.max(0, clickX - panel.offsetWidth) + 'px';
    if (panelRect.bottom > wrapRect.bottom - 4) { panel.style.top = Math.max(0, clickY - panel.offsetHeight) + 'px'; panel.style.maxHeight = ''; }
    ch._panel = panel;
  }

  var crosshairPlugin = {
    id: 'crosshair',
    afterInit: function (chart) { chart._crosshair = { x: null, y: null, pinned: false, _panel: null }; },
    beforeDestroy: function (chart) { if (chart._crosshair) _dismissPinnedPanel(chart); },
    afterEvent: function (chart, args) {
      var evt = args.event;
      var area = chart.chartArea;
      if (!area) return;
      var x = evt.x, y = evt.y;
      var inside = x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;
      if (evt.type === 'click') {
        if (chart._crosshair.pinned) { _dismissPinnedPanel(chart); chart._crosshair.x = inside ? x : null; chart._crosshair.y = inside ? y : null; chart.draw(); return; }
        if (inside) { var idx = _closestDataIndex(chart, x); if (idx === -1) return; chart._crosshair.pinned = true; chart._crosshair.x = x; chart._crosshair.y = y; _showPinnedPanel(chart, idx, x, y); }
        return;
      }
      if (evt.type === 'mousemove') { if (chart._crosshair.pinned) return; chart._crosshair.x = inside ? x : null; chart._crosshair.y = inside ? y : null; chart.draw(); }
      if (evt.type === 'mouseout') { if (chart._crosshair.pinned) return; chart._crosshair.x = null; chart._crosshair.y = null; chart.draw(); }
    },
    afterDraw: function (chart) {
      var ch = chart._crosshair;
      if (!ch || ch.x === null) return;
      var area = chart.chartArea;
      var ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ch.x, area.top);
      ctx.lineTo(ch.x, area.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.restore();
      if (ch.pinned) return;
      var di = _nearestDatasetIndex(chart, ch.x, ch.y || (area.top + area.bottom) / 2);
      if (di === -1) di = 0;
      var meta = chart.getDatasetMeta(di);
      if (!meta || !meta.data.length) return;
      var closestPt = null, closestIdx = -1, closestDist = Infinity;
      meta.data.forEach(function (pt, pi) { var d = Math.abs(pt.x - ch.x); if (d < closestDist) { closestDist = d; closestPt = pt; closestIdx = pi; } });
      if (!closestPt || closestIdx === -1) return;
      var label = chart.data.labels[closestIdx] || '';
      var val = chart.data.datasets[di].data[closestIdx];
      var unit = _getChartUnit(chart);
      var valStr = val !== null && val !== undefined ? (typeof val === 'number' ? val.toFixed(2) : val) : '—';
      var text = label + ' • ' + valStr + unit;
      var color = chart.data.datasets[di].borderColor || '#2563EB';
      ctx.save();
      ctx.beginPath();
      ctx.arc(closestPt.x, closestPt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      var tw = ctx.measureText(text).width;
      var pad = 6, bw = tw + pad * 2, bh = 20;
      var bx = closestPt.x - bw / 2, by = area.top - bh - 4;
      if (bx < area.left) bx = area.left;
      if (bx + bw > area.right) bx = area.right - bw;
      if (by < 0) by = area.top + 4;
      ctx.fillStyle = 'rgba(50,50,50,0.85)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + pad, by + bh / 2);
      ctx.restore();
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────

  function _strVal(v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (v.dis) return v.dis;
    if (v.val !== undefined) return String(v.val);
    return String(v);
  }

  function _numVal(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object' && v._kind === 'number') return v.val;
    if (typeof v === 'number') return v;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  function _skysparkEquipLink(equipId) {
    return '';
  }

  function _inferType(dis) {
    var d = (dis || '').toLowerCase();
    if (d.indexOf('ahu') !== -1) return 'AHU';
    if (d.indexOf('chiller') !== -1) return 'Chiller';
    if (d.indexOf('boiler') !== -1) return 'Boiler';
    if (d.indexOf('vav') !== -1) return 'VAV';
    if (d.indexOf('pump') !== -1) return 'Pump';
    if (d.indexOf('fan') !== -1) return 'Fan';
    if (d.indexOf('cooling') !== -1 || d.indexOf('tower') !== -1) return 'Cooling Tower';
    return 'Equipment';
  }

  function _fmtLabel(l) {
    try { var d = new Date(l); if (!isNaN(d)) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); } catch (e) {}
    return l;
  }

  // ── Render skeleton ────────────────────────────────────────────────

  function renderPage() {
    return '<div class="eq-page" id="eqPage">' +
      '<div class="eq-header" id="eqHeader"></div>' +
      '<div class="eq-kpi-strip" id="eqKpiStrip"></div>' +
      '<div class="eq-curval-card" id="eqCurvalCard"></div>' +
      '<div class="eq-trend-card" id="eqTrendCard"></div>' +
      '<div class="eq-faults-card" id="eqFaultsCard"></div>' +
      '<div class="eq-notes-card">' +
        '<div class="eq-construction-banner">🚧 In Construction</div>' +
        '<div class="eq-notes-body">' +
          '<div class="eq-section-title">Notes</div>' +
          '<div class="eq-empty-msg">User notes will appear here in a future release.</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Init ───────────────────────────────────────────────────────────

  function initLive(container, ctx) {
    _container = container;
    _ctx = ctx;
    _equipList = [];
    _selectedId = null;
    _selectorOpen = false;
    _lastPoints = [];
    _lastFaults = null;

    _renderHeader();
    _renderKpis();
    _renderCurvals();
    _renderTrend();
    _renderFaults();

    if (ctx && ctx.attestKey && ctx.siteRef) {
      _loadEquipList();
    }
  }

  // ── Equipment list ─────────────────────────────────────────────────

  function _loadEquipList() {
    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var _evRefs = (_ctx.siteRefs && _ctx.siteRefs.length && _ctx.siteRefs[0] !== '__all__')
      ? _ctx.siteRefs
      : (_ctx.siteRef ? [_ctx.siteRef] : []);
    var addLink = '.addCol("sparksLink", r => uiLink({view:"sparkEquip", state:{equip:r->id}}))';
    var axon = _evRefs.length > 1
      ? 'readAll(equip and (' + _evRefs.map(function (r) { return 'siteRef==@' + r.replace(/^@/, ''); }).join(' or ') + '))' + addLink
      : 'readAll(equip and siteRef==@' + (_evRefs[0] || _ctx.siteRef || '').replace(/^@/, '') + ')' + addLink;
    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        _equipList = parsed.rows.map(function (r) {
          var id = r.id && r.id.val ? r.id.val : (r.id || '');
          var dis = _strVal(r.navName) || _strVal(r.dis) || (r.id && r.id.dis ? r.id.dis : '') || id;
          var equipType = r.equipType ? _strVal(r.equipType) : _inferType(dis);
          var sparksLink = _strVal(r.sparksLink) || '';
          return { id: id, dis: dis, type: equipType, sparksLink: sparksLink, _raw: r };
        }).filter(function (e) { return e.id; });
        _equipList.sort(function (a, b) { return a.dis.localeCompare(b.dis); });
        if (_equipList.length) {
          _selectedId = _equipList[0].id;
          // Honor a preselect request (e.g. clicking a VAV in the summary
          // table) — exact match first, then substring.
          if (_preselectDis) {
            var want = _preselectDis.toLowerCase();
            var hit = _equipList.filter(function (e) { return e.dis.toLowerCase() === want; })[0] ||
                      _equipList.filter(function (e) { return e.dis.toLowerCase().indexOf(want) !== -1; })[0];
            if (hit) _selectedId = hit.id;
            _preselectDis = null;
          }
          _renderHeader();
          _loadEquipDetail();
        } else {
          _showNoEquip();
        }
      })
      .catch(function (err) {
        console.warn('[EquipmentView] equip list failed:', err);
        _showNoEquip();
      });
  }

  // ── Header / selector ──────────────────────────────────────────────

  function _renderHeader() {
    var el = _container && _container.querySelector('#eqHeader');
    if (!el) return;
    var equip = _equipList.find(function (e) { return e.id === _selectedId; });
    var selDis = equip ? equip.dis : 'Select equipment…';
    var dropHtml = _selectorOpen ? (
      '<div class="eq-selector-dropdown">' +
      (_equipList.length ? _equipList.map(function (e) {
        return '<button class="eq-selector-opt' + (e.id === _selectedId ? ' eq-selector-opt--sel' : '') + '" data-eid="' + e.id + '">' +
          '<strong>' + e.dis + '</strong>' +
          (e.type ? '<span class="eq-selector-opt-type">' + e.type + '</span>' : '') +
        '</button>';
      }).join('') : '<div class="eq-selector-opt eq-empty-msg">No equipment found</div>') +
      '</div>'
    ) : '';

    el.innerHTML = '<div class="eq-selector-wrap">' +
      '<button class="eq-selector-btn" id="eqSelectorBtn"><span>' + selDis + '</span><span class="eq-selector-arrow">▼</span></button>' +
      dropHtml +
    '</div>' +
    (equip ? '<div class="eq-title">' + equip.dis +
      (equip.sparksLink ? ' <a class="fd-sparks-link fd-sparks-link-sm" href="' + equip.sparksLink + '" target="_blank" title="Open in SkySpark">SkySpark &#8599;</a>' : '') +
      '</div><div class="eq-subtitle">' + (equip.type || '') + '</div>' : '<div class="eq-title">—</div>');

    var btn = el.querySelector('#eqSelectorBtn');
    if (btn) btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _selectorOpen = !_selectorOpen;
      _renderHeader();
    });
    el.querySelectorAll('.eq-selector-opt[data-eid]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        _selectedId = opt.getAttribute('data-eid');
        _selectorOpen = false;
        _lastPoints = [];
        _lastFaults = null;
        _renderHeader();
        _renderKpis();
        _renderCurvals();
        _renderTrend();
        _renderFaults();
        _loadEquipDetail();
      });
    });
    if (_selectorOpen) {
      setTimeout(function () {
        document.addEventListener('click', function _close() {
          _selectorOpen = false;
          _renderHeader();
          document.removeEventListener('click', _close);
        });
      }, 0);
    }
  }

  // ── Load points + current values ───────────────────────────────────

  function _loadEquipDetail() {
    if (!_ctx || !_selectedId) return;
    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var equipRef = '@' + _selectedId.replace(/^@/, '');

    // Show loading states
    _renderCurvals(null);
    _renderTrend([]);
    _renderFaults(null);

    API.evalAxon(_ctx.attestKey, _ctx.projectName, 'readAll(point and equipRef==' + equipRef + ')')
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        var points = parsed.rows.map(function (r) {
          var id = r.id && r.id.val ? r.id.val : String(r.id || '');
          var dis = _strVal(r.navName) || _strVal(r.dis) || (r.id && r.id.dis ? r.id.dis : '') || id;
          var unit = r.unit ? _strVal(r.unit) : '';
          var hasCurVal = r.curVal !== undefined || r.curStatus !== undefined;
          var curVal = r.curVal !== undefined ? _numVal(r.curVal) : null;
          var curStr = r.curVal !== undefined ? _strVal(r.curVal) : null;
          var kind = _strVal(r.kind) || '';
          var isBool = kind === 'Bool' || (r.enum !== undefined && !unit);
          var isCmd = r.cmd !== undefined || r.writable !== undefined;
          var isSp = r.sp !== undefined;
          var isSensor = r.sensor !== undefined;
          return { id: id, name: dis, unit: unit, hasCurVal: hasCurVal, curVal: curVal, curStr: curStr, kind: kind, isBool: isBool, isCmd: isCmd, isSp: isSp, isSensor: isSensor, _raw: r };
        }).filter(function (p) { return p.id; });

        _lastPoints = points;
        _renderKpis();
        _renderTrend(points);
        _loadFaults();

        // Sync current values if any points have curVal tag
        var curValPoints = points.filter(function (p) { return p.hasCurVal; });
        if (curValPoints.length) {
          _syncCurVals(curValPoints);
        } else {
          _renderCurvals([]);
        }
      })
      .catch(function (err) {
        console.warn('[EquipmentView] points load failed:', err);
        _renderCurvals([]);
        _renderTrend([]);
      });
  }

  function _syncCurVals(points) {
    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var refs = points.map(function (p) { return '@' + p.id.replace(/^@/, ''); });
    var axon = 'readAll(point and id==[' + refs.join(',') + ']).connSyncCur';
    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        // Merge curVal back into _lastPoints
        parsed.rows.forEach(function (r) {
          var rid = r.id && r.id.val ? r.id.val : String(r.id || '');
          var match = _lastPoints.find(function (p) { return p.id === rid; });
          if (match) {
            match.curVal = _numVal(r.curVal);
            match.curStr = r.curVal !== undefined ? _fmtCurVal(r.curVal, match.unit) : null;
            match.curStatus = r.curStatus ? _strVal(r.curStatus) : null;
          }
        });
        _renderCurvals(_lastPoints.filter(function (p) { return p.hasCurVal; }));
      })
      .catch(function (err) {
        console.warn('[EquipmentView] connSyncCur failed:', err);
        // Fall back to static curVal from point read
        _renderCurvals(_lastPoints.filter(function (p) { return p.hasCurVal; }));
      });
  }

  function _fmtCurVal(v, unit) {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') {
      if (v._kind === 'number') return _roundNum(v.val) + (unit || (v.unit ? ' ' + v.unit : ''));
      if (v.dis) return v.dis;
      if (v.val !== undefined) return String(v.val);
    }
    if (typeof v === 'number') return _roundNum(v) + (unit ? ' ' + unit : '');
    return String(v);
  }

  function _roundNum(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (Math.abs(n) >= 100) return Math.round(n).toString();
    if (Math.abs(n) >= 10) return n.toFixed(1);
    return n.toFixed(2);
  }

  // ── Current Values section ─────────────────────────────────────────

  function _fmtCurDisplay(p) {
    var raw = p.curStr || (p.curVal !== null && p.curVal !== undefined ? String(p.curVal) : null);
    if (!raw && raw !== 0) return { html: '<span class="eq-cv-val eq-cv-na">—</span>', isNull: true };
    if (raw === 'true' || raw === 'false') {
      var on = raw === 'true';
      return { html: '<span class="eq-cv-pill eq-cv-pill--' + (on ? 'on' : 'off') + '">' + (on ? 'ON' : 'OFF') + '</span>', isNull: false };
    }
    var n = _numVal(raw);
    if (n !== null && !isNaN(n)) {
      return { html: '<span class="eq-cv-val">' + _roundNum(n) + '</span>' + (p.unit ? '<span class="eq-cv-unit">' + p.unit + '</span>' : ''), isNull: false };
    }
    return { html: '<span class="eq-cv-val">' + raw + '</span>', isNull: false };
  }

  function _groupByUnit(points) {
    var groups = {}, order = [];
    points.forEach(function (p) {
      var u = p.unit || (p.isBool ? 'Status' : 'Other');
      if (!groups[u]) { groups[u] = []; order.push(u); }
      groups[u].push(p);
    });
    order.forEach(function (u) {
      groups[u].sort(function (a, b) { return a.name.localeCompare(b.name); });
    });
    return order.map(function (u) { return { unit: u, items: groups[u] }; });
  }

  function _renderCurvals(points) {
    var el = _container && _container.querySelector('#eqCurvalCard');
    if (!el) return;

    if (points === null) {
      el.innerHTML = '<div class="eq-card-header"><div class="eq-section-title">Current Values</div></div><div class="eq-loading">Loading…</div>';
      return;
    }
    if (!points || !points.length) {
      el.innerHTML = '';
      el.style.display = 'none';
      return;
    }
    el.style.display = '';

    var groups = _groupByUnit(points);
    var cards = groups.map(function (g) {
      var rows = g.items.map(function (p) {
        var fmt = _fmtCurDisplay(p);
        return '<tr class="eq-cv-tr' + (fmt.isNull ? ' eq-cv-tr--na' : '') + '">' +
          '<td class="eq-cv-td-name" title="' + p.name + '">' + p.name + '</td>' +
          '<td class="eq-cv-td-val">' + fmt.html + '</td>' +
        '</tr>';
      }).join('');
      return '<div class="eq-cv-card">' +
        '<div class="eq-cv-card-label">' + g.unit + '<span class="eq-cv-card-count">' + g.items.length + '</span></div>' +
        '<table class="eq-cv-table"><tbody>' + rows + '</tbody></table>' +
      '</div>';
    }).join('');

    el.innerHTML = '<div class="eq-card-header"><div class="eq-section-title">Current Values</div></div>' +
      '<div class="eq-cv-carousel">' + cards + '</div>';
  }

  // ── KPI strip ─────────────────────────────────────────────────────

  function _renderKpis() {
    var el = _container && _container.querySelector('#eqKpiStrip');
    if (!el) return;
    var f = _lastFaults;
    var critCount = f ? f.filter(function (x) { return x.severity === 'critical'; }).length : 0;
    var faultCount = f ? f.length : null;
    el.innerHTML =
      '<div class="eq-kpi-card">' +
        '<div class="eq-kpi-label">Active Faults</div>' +
        '<div class="eq-kpi-val" style="color:' + (faultCount ? (critCount ? '#ef4444' : '#f59e0b') : '#9ca3af') + '">' + (faultCount !== null ? faultCount : '—') + '</div>' +
        '<div class="eq-kpi-sub">' + (faultCount === null ? 'Loading…' : faultCount > 0 ? critCount + ' critical' : 'All clear') + '</div>' +
      '</div>' +
      '<div class="eq-kpi-card">' +
        '<div class="eq-kpi-label">Points Monitored</div>' +
        '<div class="eq-kpi-val">' + (_lastPoints.length || '—') + '</div>' +
        '<div class="eq-kpi-sub">points</div>' +
      '</div>';
  }

  // ── Trend card ─────────────────────────────────────────────────────

  function _renderTrend(points) {
    if (points !== undefined) _lastPoints = points || [];
    var el = _container && _container.querySelector('#eqTrendCard');
    if (!el) return;

    var pts = _lastPoints;
    if (!pts.length) {
      el.innerHTML = '<div class="eq-card-header"><div class="eq-section-title">Trends</div></div><div class="eq-loading">Loading points…</div>';
      return;
    }

    el.innerHTML = '<div class="eq-card-header"><div class="eq-section-title">Trends</div></div>' +
      '<div class="eq-charts-area" id="eqChartsArea"><div class="eq-loading" id="eqTrendLoading">Loading trend data…</div></div>';

    _loadTrendData();
  }

  function _loadTrendData() {
    if (!_ctx || !_selectedId || !_lastPoints.length) return;
    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var dateArg = (_ctx.datesStart && _ctx.datesEnd) ? _ctx.datesStart + '..' + _ctx.datesEnd : 'today()';
    var refs = _lastPoints.map(function (p) { return '@' + p.id.replace(/^@/, ''); });
    var axon = 'hisRead([' + refs.join(', ') + '], ' + dateArg + ')';

    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        _buildUnitSplitCharts(grid);
      })
      .catch(function (err) {
        console.warn('[EquipmentView] trend load failed:', err);
        var loading = _container && _container.querySelector('#eqTrendLoading');
        if (loading) { loading.textContent = 'Failed to load trend data.'; loading.style.display = ''; }
      });
  }

  function _buildUnitSplitCharts(grid) {
    _destroyCharts();
    var area = _container && _container.querySelector('#eqChartsArea');
    if (!area || !window.Chart) return;
    area.innerHTML = '';

    var cols = grid.cols || [];
    var rows = grid.rows || [];

    if (!rows.length) {
      area.innerHTML = '<div class="eq-loading">No trend data for this period.</div>';
      return;
    }

    // Build labels from ts column
    var labels = rows.map(function (r) {
      var ts = r.ts;
      if (typeof ts === 'string') return _fmtLabel(ts);
      if (ts && ts.val) return _fmtLabel(ts.val);
      return '';
    });

    // Match grid cols back to _lastPoints to get unit/name info
    var dataCols = cols.filter(function (c) { return c.name !== 'ts' && c.name !== 'id'; });

    // Group cols by unit — match via meta.id ref, column name, or positional index
    var groups = {}, groupOrder = [];
    dataCols.forEach(function (c, idx) {
      var metaId = c.meta && c.meta.id ? (c.meta.id.val || String(c.meta.id)).replace(/^@/, '') : '';
      var ptMatch = _lastPoints.find(function (p) {
        var pid = p.id.replace(/^@/, '');
        return pid === c.name || pid === c.name.replace(/^@/, '') || pid === metaId;
      }) || (_lastPoints[idx] || null);
      var unit = (ptMatch && ptMatch.unit) || (c.meta && c.meta.unit ? _strVal(c.meta.unit) : '') || 'other';
      if (!groups[unit]) { groups[unit] = []; groupOrder.push(unit); }
      groups[unit].push({ col: c, point: ptMatch });
    });

    if (!groupOrder.length) {
      area.innerHTML = '<div class="eq-loading">No plottable data in response.</div>';
      return;
    }

    // Separate boolean columns from numeric — only use point tag, not data guessing
    var boolMembers = [];
    var numericGroups = {}, numericOrder = [];
    groupOrder.forEach(function (unit) {
      groups[unit].forEach(function (m) {
        var isBool = m.point && m.point.isBool;
        if (isBool) {
          var data = rows.map(function (r) {
            var v = r[m.col.name];
            if (v === null || v === undefined) return null;
            if (v === true || v === 1 || v === 'true') return 1;
            if (v === false || v === 0 || v === 'false') return 0;
            if (typeof v === 'object') {
              if (v._kind === 'marker' || v._kind === 'bool') return v.val === false ? 0 : 1;
              if (v._kind === 'number') return v.val ? 1 : 0;
              if (v.val !== undefined) return v.val ? 1 : 0;
            }
            var s = String(v).toLowerCase();
            if (s === 'true' || s === 'on' || s === '1' || s === 'm:') return 1;
            if (s === 'false' || s === 'off' || s === '0') return 0;
            return null;
          });
          boolMembers.push({ col: m.col, point: m.point, data: data });
        } else {
          var data = rows.map(function (r) { return _numVal(r[m.col.name]); });
          if (!numericGroups[unit]) { numericGroups[unit] = []; numericOrder.push(unit); }
          numericGroups[unit].push({ col: m.col, point: m.point, data: data });
        }
      });
    });

    // Render numeric line charts
    var colorIdx = 0;
    numericOrder.forEach(function (unit) {
      var members = numericGroups[unit];

      var wrap = document.createElement('div');
      wrap.className = 'eq-chart-panel';

      var titleEl = document.createElement('div');
      titleEl.className = 'eq-panel-title';
      titleEl.textContent = unit === 'other' ? 'Values' : unit;
      wrap.appendChild(titleEl);

      var canvasWrap = document.createElement('div');
      canvasWrap.className = 'eq-canvas-wrap';
      var canvas = document.createElement('canvas');
      canvasWrap.appendChild(canvas);
      wrap.appendChild(canvasWrap);
      area.appendChild(wrap);

      var datasets = members.map(function (m) {
        var ci = colorIdx++;
        var name = (m.point && m.point.name) ? m.point.name : (m.col.meta && m.col.meta.dis ? _strVal(m.col.meta.dis) : m.col.name);
        var isDashed = /\bsp\b|setpoint|limit|max|min/i.test(name);
        return {
          label: name,
          data: m.data,
          borderColor: CHART_COLORS[ci % CHART_COLORS.length],
          backgroundColor: CHART_COLORS[ci % CHART_COLORS.length],
          borderWidth: 1.5,
          borderDash: isDashed ? [5, 3] : [],
          pointRadius: 0, pointHitRadius: 4, fill: false, tension: 0.2
        };
      });

      var chart = new window.Chart(canvas, {
        type: 'line',
        plugins: [crosshairPlugin],
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          events: ['mousemove', 'mouseout', 'click'],
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 45, autoSkip: true, maxTicksLimit: 10 }, grid: { display: false } },
            y: {
              ticks: { font: { size: 10 }, color: '#9ca3af', callback: function (v) { return v + (unit !== 'other' ? unit : ''); } },
              grid: { color: '#F3F4F6' }
            }
          },
          plugins: {
            legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', font: { size: 10 }, padding: 12, boxWidth: 7 } },
            tooltip: { enabled: false }
          }
        }
      });
      _charts.push(chart);
    });

    // Render boolean runtime bars
    if (boolMembers.length) {
      _buildRuntimeBars(area, labels, rows, boolMembers);
    }
  }

  // ── Runtime bars (boolean points) ──────────────────────────────────

  function _buildRuntimeBars(area, labels, rows, members) {
    var wrap = document.createElement('div');
    wrap.className = 'eq-chart-panel';

    var titleEl = document.createElement('div');
    titleEl.className = 'eq-panel-title';
    titleEl.textContent = 'Runtime';
    wrap.appendChild(titleEl);

    var inner = document.createElement('div');
    inner.className = 'eq-rt-wrap';

    // Parse timestamps for proportional positioning
    var timestamps = rows.map(function (r) {
      var ts = r.ts;
      var s = typeof ts === 'string' ? ts : (ts && ts.val ? ts.val : '');
      var d = new Date(s);
      return isNaN(d) ? 0 : d.getTime();
    });
    var tMin = timestamps[0] || 0;
    var tMax = timestamps[timestamps.length - 1] || 1;
    var tSpan = tMax - tMin || 1;

    members.forEach(function (m) {
      var name = (m.point && m.point.name) ? m.point.name : m.col.name;
      var row = document.createElement('div');
      row.className = 'eq-rt-row';

      var label = document.createElement('div');
      label.className = 'eq-rt-label';
      label.textContent = name;
      label.title = name;
      row.appendChild(label);

      var bar = document.createElement('div');
      bar.className = 'eq-rt-bar';

      // Build segments of contiguous on/off
      var data = m.data;
      var i = 0;
      while (i < data.length) {
        var val = data[i] === 1 ? 1 : 0;
        var start = i;
        while (i < data.length && ((data[i] === 1 ? 1 : 0) === val || data[i] === null)) {
          if (data[i] !== null) val = data[i] === 1 ? 1 : 0;
          i++;
        }
        var x0 = (timestamps[start] - tMin) / tSpan * 100;
        var x1 = (timestamps[Math.min(i, data.length - 1)] - tMin) / tSpan * 100;
        var seg = document.createElement('div');
        seg.className = 'eq-rt-seg' + (val ? ' eq-rt-seg--on' : '');
        seg.style.left = x0 + '%';
        seg.style.width = Math.max(x1 - x0, 0.3) + '%';
        bar.appendChild(seg);
      }
      row.appendChild(bar);
      inner.appendChild(row);
    });

    wrap.appendChild(inner);

    // Time axis labels
    var axis = document.createElement('div');
    axis.className = 'eq-rt-axis';
    var tickCount = Math.min(6, labels.length);
    for (var t = 0; t < tickCount; t++) {
      var idx = Math.round(t * (labels.length - 1) / (tickCount - 1));
      var tick = document.createElement('span');
      tick.className = 'eq-rt-tick';
      tick.textContent = labels[idx];
      tick.style.left = (idx / (labels.length - 1) * 100) + '%';
      axis.appendChild(tick);
    }
    wrap.appendChild(axis);

    // Legend
    var legend = document.createElement('div');
    legend.className = 'eq-rt-legend';
    legend.innerHTML = '<span class="eq-rt-leg-item"><span class="eq-rt-leg-swatch eq-rt-seg--on"></span>On</span>' +
      '<span class="eq-rt-leg-item"><span class="eq-rt-leg-swatch"></span>Off</span>';
    wrap.appendChild(legend);

    area.appendChild(wrap);
  }

  // ── Faults card ────────────────────────────────────────────────────

  function _loadFaults() {
    if (!_ctx || !_selectedId) return;
    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var sel = _equipList.filter(function (e) { return e.id === _selectedId; })[0];
    var selDis = sel ? sel.dis : '';
    var dateArg = (_ctx.datesStart && _ctx.datesEnd) ? _ctx.datesStart + '..' + _ctx.datesEnd : 'today()';
    // Site-wide fault list filtered by equipment name — same source and
    // shape as the Faults tab, so rows can open the full Fault Detail.
    var _evSiteArg = window.mbcxDashboard.siteAxonArg ? window.mbcxDashboard.siteAxonArg(_ctx) : _ctx.siteRef;
    var axon = 'view_MBCxReport_CustomerView_Output(' + _evSiteArg + ', ' + dateArg + ', 10%, @nav:rule.all, "Fault List", "", "Show All")';
    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        var faults = parsed.rows.map(function (r, i) {
          return {
            id: 'eq-fault-' + i,
            equipment: _strVal(r.equipment),
            faultName: _strVal(r.faultName),
            sevNorm: _numVal(r.sevNorm),
            faultActive: _numVal(r.faultActive),
            sumDur: _numVal(r.sumDur),
            descriptionofFault: _strVal(r.descriptionofFault),
            recommendedActions: _strVal(r.recommendedActions),
            sparksLink: _strVal(r.sparksLink),
            _raw: r,
            severity: _sevFromScore(_numVal(r.sevNorm))
          };
        }).filter(function (f) {
          return selDis && f.equipment === selDis;
        }).sort(function (a, b) {
          var ord = { critical: 0, warning: 1, info: 2 };
          return (ord[a.severity] || 2) - (ord[b.severity] || 2);
        });
        _lastFaults = faults;
        _renderFaults(faults);
        _renderKpis();
      })
      .catch(function (err) {
        console.warn('[EquipmentView] faults load failed:', err);
        _lastFaults = [];
        _renderFaults([]);
      });
  }

  function _sevFromScore(n) {
    if (n === null) return 'info';
    if (n >= 7) return 'critical';
    if (n >= 4) return 'warning';
    return 'info';
  }

  function _renderFaults(faults) {
    if (faults !== undefined) _lastFaults = faults;
    var el = _container && _container.querySelector('#eqFaultsCard');
    if (!el) return;
    var f = _lastFaults;
    var body;
    if (f === null) {
      body = '<div class="eq-loading">Loading faults…</div>';
    } else if (!f.length) {
      body = '<div class="eq-empty-center"><span class="eq-check">✓</span><div class="eq-empty-msg">No active faults.</div></div>';
    } else {
      body = f.map(function (fault, i) {
        var pct = typeof fault.faultActive === 'number' ? fault.faultActive.toFixed(0) + '%' : '';
        return '<div class="eq-fault-row eq-fault-row--link" data-eqfault="' + i + '" title="Open fault detail">' +
          '<span class="eq-fault-dot" style="background:' + (SEV_COLORS[fault.severity] || '#9ca3af') + '"></span>' +
          '<div class="eq-fault-info"><div class="eq-fault-name">' + fault.faultName + '</div>' +
            (pct ? '<div class="eq-fault-point">' + pct + ' active</div>' : '') +
          '</div>' +
          (fault.sumDur !== null ? '<div class="eq-fault-dur">' + parseFloat(fault.sumDur).toFixed(0) + 'h</div>' : '') +
        '</div>';
      }).join('');
    }
    var count = f && f.length ? f.length : 0;
    el.innerHTML = '<div class="eq-card-header"><div class="eq-section-title">Active Faults</div>' +
      (f && f.length ? '<span class="eq-fault-badge">' + count + '</span>' : '') + '</div>' + body;

    // Open the full Fault Detail; Back returns to this equipment page.
    el.querySelectorAll('[data-eqfault]').forEach(function (rowEl) {
      rowEl.addEventListener('click', function () {
        var fault = _lastFaults[parseInt(rowEl.getAttribute('data-eqfault'), 10)];
        var NSd = window.mbcxDashboard;
        var appRoot = document.getElementById('mbcxDashboard');
        if (!fault || !NSd.App || !NSd.App.showFaultDetail || !appRoot) return;
        NSd.App.showFaultDetail(appRoot, fault, NSd.Components, {
          backLabel: '&#8592; Equipment',
          onBack: function () {
            NSd.App._showTab(appRoot, 'equipment', NSd.Components, NSd.App._lastData, NSd.App._lastCtx);
          }
        });
      });
    });
  }

  function _showNoEquip() {
    var header = _container && _container.querySelector('#eqHeader');
    if (header) header.innerHTML = '<div class="eq-empty-msg">No equipment found for this site.</div>';
  }

  function _destroyCharts() {
    _charts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    _charts = [];
  }

  function destroy() {
    _destroyCharts();
    _container = null;
    _ctx = null;
    _equipList = [];
    _selectedId = null;
  }

  return {
    renderPage: renderPage,
    initLive: initLive,
    destroy: destroy,
    preselect: function (dis) { _preselectDis = dis || null; }
  };

})();
