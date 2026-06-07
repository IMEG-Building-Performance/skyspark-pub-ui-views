// components/EquipmentView.js — Equipment detail view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.EquipmentView = (function () {

  var _container = null;
  var _ctx = null;
  var _equipList = [];
  var _selectedId = null;
  var _charts = [];
  var _activePoints = null;
  var _range = 7;
  var _selectorOpen = false;

  var POINT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

  var SEV_COLORS = { critical: '#ef4444', warning: '#f59e0b', info: '#9ca3af' };
  var STATUS_COLORS = { running: '#10b981', off: '#9ca3af', fault: '#ef4444' };
  var STATUS_LABELS = { running: 'Running', off: 'Off', fault: 'Fault' };

  // ── Render skeleton ────────────────────────────────────────────────

  function renderPage() {
    return '<div class="eq-page" id="eqPage">' +
      '<div class="eq-header" id="eqHeader"></div>' +
      '<div class="eq-kpi-strip" id="eqKpiStrip"></div>' +
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
    _activePoints = null;
    _range = 7;
    _selectorOpen = false;

    _renderHeader();
    _renderKpis();
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
    var axon = 'readAll(equip and siteRef==@' + _ctx.siteRef.replace(/^@/, '') + ')';
    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        _equipList = parsed.rows.map(function (r) {
          var id = r.id && r.id.val ? r.id.val : (r.id || '');
          var dis = (r.dis && typeof r.dis === 'string') ? r.dis
                  : (r.id && r.id.dis) ? r.id.dis
                  : id;
          var equipType = r.equipType ? _strVal(r.equipType) : _inferType(dis);
          return { id: id, dis: dis, type: equipType, _raw: r };
        }).filter(function (e) { return e.id; });

        if (_equipList.length) {
          _selectedId = _equipList[0].id;
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

  // ── Header ─────────────────────────────────────────────────────────

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
      '<button class="eq-selector-btn" id="eqSelectorBtn">' +
        '<span>' + selDis + '</span>' +
        '<span class="eq-selector-arrow">▼</span>' +
      '</button>' +
      dropHtml +
    '</div>' +
    (equip ? (
      '<div class="eq-title">' + equip.dis + '</div>' +
      '<div class="eq-subtitle">' + (equip.type || '') + '</div>'
    ) : '<div class="eq-title">—</div>');

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
        _activePoints = null;
        _renderHeader();
        _renderKpis();
        _renderTrend();
        _renderFaults();
        _loadEquipDetail();
      });
    });

    // Close dropdown on outside click
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

  // ── Detail load ────────────────────────────────────────────────────

  function _loadEquipDetail() {
    if (!_ctx || !_selectedId) return;
    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var equipRef = '@' + _selectedId.replace(/^@/, '');
    var axon = 'readAll(point and equipRef==' + equipRef + ')';
    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        var points = parsed.rows.map(function (r) {
          var id = r.id && r.id.val ? r.id.val : String(r.id || '');
          var dis = (r.dis && typeof r.dis === 'string') ? r.dis
                  : (r.id && r.id.dis) ? r.id.dis : id;
          var unit = r.unit ? _strVal(r.unit) : '';
          return { id: id, name: dis, unit: unit, _raw: r };
        }).filter(function (p) { return p.id; });

        _renderKpis(null, points);
        _renderTrend(points);
        _renderFaults(null);
        _loadFaults(points);
      })
      .catch(function (err) {
        console.warn('[EquipmentView] points load failed:', err);
      });
  }

  function _loadFaults(points) {
    if (!_ctx) return;
    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var equipRef = '@' + _selectedId.replace(/^@/, '');
    var dateArg = (_ctx.datesStart && _ctx.datesEnd) ? _ctx.datesStart + '..' + _ctx.datesEnd : 'today()';
    var axon = 'view_MBCxReport_CustomerView_Output(' +
      _ctx.siteRef + ', ' + dateArg +
      ', 10%, ' + equipRef + ', "Fault List", "", "Show All")';
    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        var faults = parsed.rows.map(function (r) {
          return {
            name: _strVal(r.faultName),
            point: _strVal(r.equipment || ''),
            severity: _sevFromScore(_numVal(r.sevNorm)),
            dur: _numVal(r.sumDur)
          };
        }).sort(function (a, b) {
          var ord = { critical: 0, warning: 1, info: 2 };
          return (ord[a.severity] || 2) - (ord[b.severity] || 2);
        });
        _renderFaults(faults);
        _renderKpis(faults, points);
      })
      .catch(function (err) {
        console.warn('[EquipmentView] faults load failed:', err);
        _renderFaults([]);
      });
  }

  var _lastPoints = [];
  function _loadTrendData() {
    if (!_ctx || !_selectedId || !_lastPoints.length) return;
    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var sel = _activePoints || _lastPoints.slice(0, 3).map(function (p) { return p.id; });
    var pts = _lastPoints.filter(function (p) { return sel.indexOf(p.id) !== -1; });
    if (!pts.length) return;

    var dateArg = (_ctx.datesStart && _ctx.datesEnd) ? _ctx.datesStart + '..' + _ctx.datesEnd : 'today()';
    var rollup = _range <= 1 ? '15min' : _range <= 7 ? '1h' : '4h';

    var refs = pts.map(function (p) { return '@' + p.id.replace(/^@/, ''); }).join(', ');
    var axon = 'hisRead([' + refs + '], ' + dateArg + ')';

    API.evalAxon(_ctx.attestKey, _ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        _renderTrendChart(pts, parsed);
      })
      .catch(function (err) {
        console.warn('[EquipmentView] trend load failed:', err);
      });
  }

  function _sevFromScore(n) {
    if (n === null) return 'info';
    if (n >= 7) return 'critical';
    if (n >= 4) return 'warning';
    return 'info';
  }

  // ── KPI Strip ─────────────────────────────────────────────────────

  var _lastFaults = null;

  function _renderKpis(faults, points) {
    if (faults !== undefined) _lastFaults = faults;
    if (points !== undefined) _lastPoints = points || [];
    var el = _container && _container.querySelector('#eqKpiStrip');
    if (!el) return;

    var f = _lastFaults;
    var critCount = f ? f.filter(function (x) { return x.severity === 'critical'; }).length : 0;
    var faultCount = f ? f.length : null;

    el.innerHTML =
      '<div class="eq-kpi-card">' +
        '<div class="eq-kpi-label">Active Faults</div>' +
        '<div class="eq-kpi-val" style="color:' + (faultCount ? (critCount ? '#ef4444' : '#f59e0b') : '#9ca3af') + '">' +
          (faultCount !== null ? faultCount : '—') +
        '</div>' +
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
    var sel = _activePoints || pts.slice(0, 3).map(function (p) { return p.id; });

    var rangeButtons = [{ label: '24h', val: 1 }, { label: '7d', val: 7 }, { label: '30d', val: 30 }].map(function (r) {
      var act = _range === r.val;
      return '<button class="eq-range-btn' + (act ? ' eq-range-btn--active' : '') + '" data-range="' + r.val + '">' + r.label + '</button>';
    }).join('');

    var pointChips = pts.map(function (p, i) {
      var active = sel.indexOf(p.id) !== -1;
      var color = POINT_COLORS[i % POINT_COLORS.length];
      return '<button class="eq-point-chip' + (active ? ' eq-point-chip--active' : '') + '" data-pid="' + p.id + '" data-color="' + color + '" style="' + (active ? 'border-color:' + color + ';color:' + color + ';background:' + color + '18;' : '') + '">' +
        '<span class="eq-point-chip-dot" style="background:' + (active ? color : '#d1d5db') + '"></span>' +
        p.name +
      '</button>';
    }).join('');

    el.innerHTML =
      '<div class="eq-card-header">' +
        '<div class="eq-section-title">Trends</div>' +
        '<div class="eq-range-btns">' + rangeButtons + '</div>' +
      '</div>' +
      '<div class="eq-point-chips" id="eqPointChips">' + (pts.length ? pointChips : '<span class="eq-empty-msg">No points found.</span>') + '</div>' +
      '<div class="eq-canvas-wrap"><canvas id="eqTrendCanvas"></canvas><div class="eq-loading" id="eqTrendLoading">Select equipment to load trends.</div></div>';

    el.querySelectorAll('.eq-range-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _range = parseInt(btn.getAttribute('data-range'), 10);
        _renderTrend();
        _loadTrendData();
      });
    });

    el.querySelectorAll('.eq-point-chip[data-pid]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var pid = chip.getAttribute('data-pid');
        var cur = (_activePoints || pts.slice(0, 3).map(function (p) { return p.id; })).slice();
        var idx = cur.indexOf(pid);
        if (idx !== -1) { if (cur.length > 1) cur.splice(idx, 1); }
        else cur.push(pid);
        _activePoints = cur;
        _renderTrend();
        _loadTrendData();
      });
    });

    if (pts.length && _ctx && _ctx.attestKey) {
      _loadTrendData();
    }
  }

  function _renderTrendChart(pts, parsed) {
    _destroyCharts();
    var canvas = _container && _container.querySelector('#eqTrendCanvas');
    var loading = _container && _container.querySelector('#eqTrendLoading');
    if (!canvas || !window.Chart) return;
    if (loading) loading.style.display = 'none';
    canvas.style.display = '';

    var rows = parsed.rows || [];
    if (!rows.length) {
      if (loading) { loading.textContent = 'No trend data for this period.'; loading.style.display = ''; }
      return;
    }

    var sel = _activePoints || pts.slice(0, 3).map(function (p) { return p.id; });
    var labels = rows.map(function (r) {
      var ts = r.ts;
      if (typeof ts === 'string') return ts;
      if (ts && ts.val) return ts.val;
      return '';
    }).map(function (l) {
      try { var d = new Date(l); if (!isNaN(d)) return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) {}
      return l;
    });

    var datasets = pts.filter(function (p) { return sel.indexOf(p.id) !== -1; }).map(function (p, i) {
      var color = POINT_COLORS[_lastPoints.indexOf(p) % POINT_COLORS.length];
      return {
        label: p.name + (p.unit ? ' (' + p.unit + ')' : ''),
        data: rows.map(function (r) {
          var v = r[p.id] !== undefined ? r[p.id] : r['v' + _lastPoints.indexOf(p)];
          return _numVal(v);
        }),
        borderColor: color, backgroundColor: color,
        borderWidth: 1.5, pointRadius: 0, pointHitRadius: 4, fill: false, tension: 0.2
      };
    });

    var chart = new window.Chart(canvas, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 45, autoSkip: true, maxTicksLimit: 10 }, grid: { display: false } },
          y: { ticks: { font: { size: 10 }, color: '#9ca3af' }, grid: { color: '#f3f4f6' } }
        },
        plugins: {
          legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', font: { size: 10 }, padding: 12, boxWidth: 7 } },
          tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y; } } }
        }
      }
    });
    _charts.push(chart);
  }

  // ── Faults card ────────────────────────────────────────────────────

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
      body = f.map(function (fault) {
        return '<div class="eq-fault-row">' +
          '<span class="eq-fault-dot" style="background:' + (SEV_COLORS[fault.severity] || '#9ca3af') + '"></span>' +
          '<div class="eq-fault-info">' +
            '<div class="eq-fault-name">' + fault.name + '</div>' +
            (fault.point ? '<div class="eq-fault-point">' + fault.point + '</div>' : '') +
          '</div>' +
          (fault.dur !== null ? '<div class="eq-fault-dur">' + parseFloat(fault.dur).toFixed(0) + 'h</div>' : '') +
        '</div>';
      }).join('');
    }

    var count = f && f.length ? f.length : 0;
    el.innerHTML =
      '<div class="eq-card-header">' +
        '<div class="eq-section-title">Active Faults</div>' +
        (f && f.length ? '<span class="eq-fault-badge">' + count + '</span>' : '') +
      '</div>' +
      body;
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

  return { renderPage: renderPage, initLive: initLive, destroy: destroy };

})();
