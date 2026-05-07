// App.js
// Main rendering engine for the Meter Allocation dashboard.
// Vanilla JS — no framework dependencies.
window.meterAllocation = window.meterAllocation || {};

(function (NS) {

  // ── Utility config ──────────────────────────────────────────────────────────
  var UTILS = {
    Cooling: { color: '#4a7f96', light: '#dcedf3', label: 'Cooling', icon: '❄' },
    Heating: { color: '#c0564b', light: '#fae8e6', label: 'Heating', icon: '🔥' },
    Flow:    { color: '#5b8c6f', light: '#e0ede6', label: 'Flow',    icon: '💧' }
  };
  var UTIL_KEYS = ['Cooling', 'Heating', 'Flow'];

  var HEADER_BG   = '#3d4f7c';
  var BODY_BG     = '#f2f2ee';
  var CARD_BG     = '#ffffff';
  var TEXT_PRI    = '#1a1a1a';
  var TEXT_SEC    = '#6b7280';
  var TEXT_MUTED  = '#9ca3af';
  var BORDER      = '#e5e7eb';
  var BORDER_LT   = '#f3f4f6';
  var RADIUS      = '6px';
  var SHADOW      = '0 1px 3px rgba(0,0,0,0.07)';

  // ── Shared state ─────────────────────────────────────────────────────────────
  var _state = {};
  var _container = null;

  // ── Formatters ───────────────────────────────────────────────────────────────
  function fmtNum(v) {
    if (v == null || isNaN(v)) return '—';
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }

  function fmtCost(v) {
    if (v == null || isNaN(v)) return '—';
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(v) {
    if (v == null || isNaN(v)) return '0.00%';
    return v.toFixed(2) + '%';
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Strip the site display name prefix from a meter or group name.
  // e.g. siteName="2200 Westlake", name="2200 Westlake BTU-23 ..." → "BTU-23 ..."
  function _shortName(name, siteName) {
    if (!name) return '(unknown)';
    if (siteName && name.toLowerCase().indexOf(siteName.toLowerCase()) === 0) {
      return name.slice(siteName.length).replace(/^\s+/, '') || name;
    }
    return name;
  }

  // ── Data helpers ─────────────────────────────────────────────────────────────
  function _getRows() {
    return (_state.allData && _state.allData[_state.selectedUtil]) || [];
  }

  // Group rows by groupId; preserve insertion order.
  function _groupRows(rows) {
    var map = {};
    var order = [];
    rows.forEach(function (row) {
      if (!map[row.groupId]) {
        map[row.groupId] = {
          id: row.groupId,
          name: row.groupName,
          meters: [],
          totalUsage: 0,
          totalPercOfPlant: 0,
          totalCost: 0
        };
        order.push(row.groupId);
      }
      var g = map[row.groupId];
      g.meters.push(row);
      g.totalUsage       += row.usage;
      g.totalPercOfPlant += row.percOfPlant;
      g.totalCost        += row.cost;
    });
    return order.map(function (id) { return map[id]; });
  }

  // Sort and group in one pass, sorting both groups and their inner meters.
  function _buildDisplayGroups(rows) {
    var col = _state.sortCol;
    var dir = _state.sortAsc ? 1 : -1;

    function cmp(a, b, isGroup) {
      if (col === 'name')  return (isGroup ? a.name : a.meterName).localeCompare(isGroup ? b.name : b.meterName) * dir;
      if (col === 'usage') return ((isGroup ? a.totalUsage : a.usage) - (isGroup ? b.totalUsage : b.usage)) * dir;
      if (col === 'pct')   return ((isGroup ? a.totalPercOfPlant : a.percOfPlant) - (isGroup ? b.totalPercOfPlant : b.percOfPlant)) * dir;
      if (col === 'cost')  return ((isGroup ? a.totalCost : a.cost) - (isGroup ? b.totalCost : b.cost)) * dir;
      return 0;
    }

    var groups = _groupRows(rows);
    groups.forEach(function (g) { g.meters.sort(function (a, b) { return cmp(a, b, false); }); });
    groups.sort(function (a, b) { return cmp(a, b, true); });
    return groups;
  }

  // ── Render: pct bar ──────────────────────────────────────────────────────────
  function _pctBar(pct, color) {
    var w = Math.min(Math.max(pct || 0, 0), 100);
    return (
      '<div class="ma-pct-wrap">' +
        '<div class="ma-pct-track"><div class="ma-pct-fill" style="width:' + w + '%;background:' + color + '"></div></div>' +
        '<span class="ma-pct-label" style="color:' + color + '">' + fmtPct(pct) + '</span>' +
      '</div>'
    );
  }

  // ── Render: KPI strip ────────────────────────────────────────────────────────
  function _renderKpis(rows) {
    var cfg = UTILS[_state.selectedUtil] || UTILS.Cooling;
    var totalCost  = rows.reduce(function (s, r) { return s + (r.cost || 0); }, 0);
    var totalUsage = rows.reduce(function (s, r) { return s + (r.usage || 0); }, 0);
    var totalMeters = rows.length;
    var activeMeters = rows.filter(function (r) { return r.usage > 0; }).length;
    var topRow = rows.slice().sort(function (a, b) { return b.percOfPlant - a.percOfPlant; })[0];
    var topPct  = topRow ? fmtPct(topRow.percOfPlant) : '—';
    var topName = topRow ? _shortName(topRow.meterName, _state.siteName) : '—';

    var cards = [
      {
        label: 'Total Metered Cost',
        value: fmtCost(totalCost),
        sub:   ''
      },
      {
        label: 'Total Metered Usage',
        value: fmtNum(totalUsage),
        sub:   rows.length ? (rows[0].usageUnit || 'BTU') : ''
      },
      {
        label: 'Active Meters',
        value: activeMeters + ' / ' + totalMeters,
        sub:   'reporting non-zero usage'
      },
      {
        label: 'Top Consumer',
        value: topPct,
        sub:   topName
      }
    ];

    var html = '<div class="ma-kpi-strip">';
    cards.forEach(function (k, i) {
      html += (
        '<div class="ma-kpi-card">' +
          '<div class="ma-kpi-label">' + _esc(k.label) + '</div>' +
          '<div class="ma-kpi-value" style="color:' + cfg.color + '">' + _esc(k.value) +
            (k.sub && i === 1 ? '<span class="ma-kpi-unit">&nbsp;' + _esc(k.sub) + '</span>' : '') +
          '</div>' +
          (k.sub && i !== 1 ? '<div class="ma-kpi-sub" title="' + _esc(k.sub) + '">' + _esc(k.sub) + '</div>' : '') +
        '</div>'
      );
    });
    html += '</div>';
    return html;
  }

  // ── Render: main table ───────────────────────────────────────────────────────
  function _renderTable(rows) {
    var cfg = UTILS[_state.selectedUtil] || UTILS.Cooling;

    if (rows.length === 0) {
      return (
        '<div class="ma-card ma-empty">' +
          '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c0c0b8" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
          '<div>No data available for ' + _esc(_state.selectedUtil) + '.</div>' +
          '<div class="ma-empty-hint">Configure a site and date range in the view properties.</div>' +
        '</div>'
      );
    }

    function sortArrow(col) {
      if (_state.sortCol !== col) return '<span class="ma-sort-na">⇅</span>';
      return '<span class="ma-sort-active">' + (_state.sortAsc ? '↑' : '↓') + '</span>';
    }

    var groups = _buildDisplayGroups(rows);
    var siteName = _state.siteName;

    var rowsHtml = groups.map(function (g) {
      var gId = _esc(g.id);
      var isOpen = !!_state.expandedGroups[g.id];
      var displayName = _shortName(g.name, siteName);

      var groupRow = (
        '<div class="ma-group-row' + (isOpen ? ' is-open' : '') + '" data-group-id="' + gId + '">' +
          '<span class="ma-chevron">' + (isOpen ? '▼' : '▶') + '</span>' +
          '<span class="ma-group-name" title="' + _esc(g.name) + '">' + _esc(displayName) + '</span>' +
          '<span class="ma-group-count">' + g.meters.length + '&nbsp;meter' + (g.meters.length !== 1 ? 's' : '') + '</span>' +
          '<span class="ma-group-usage" style="color:' + cfg.color + '">' +
            fmtNum(g.totalUsage) + '<small>&nbsp;' + _esc(g.meters[0] ? g.meters[0].usageUnit : '') + '</small>' +
          '</span>' +
          '<span class="ma-group-pct">' + _pctBar(g.totalPercOfPlant, cfg.color) + '</span>' +
          '<span class="ma-group-cost">' + fmtCost(g.totalCost) + '</span>' +
        '</div>'
      );

      var meterRows = '';
      if (isOpen) {
        meterRows = g.meters.map(function (m, idx) {
          var mName = _shortName(m.meterName, siteName);
          var stripe = idx % 2 === 0 ? '' : ' stripe';
          return (
            '<div class="ma-meter-row' + stripe + '">' +
              '<span class="ma-meter-indent"></span>' +
              '<span class="ma-meter-name" title="' + _esc(m.meterName) + '">' + _esc(mName) + '</span>' +
              '<span></span>' +
              '<span class="ma-meter-usage" style="color:' + cfg.color + '">' +
                fmtNum(m.usage) + '<small>&nbsp;' + _esc(m.usageUnit) + '</small>' +
              '</span>' +
              '<span class="ma-meter-pct">' + _pctBar(m.percOfPlant, cfg.color) + '</span>' +
              '<span class="ma-meter-cost">' + fmtCost(m.cost) + '</span>' +
            '</div>'
          );
        }).join('');
      }

      return groupRow + meterRows;
    }).join('');

    return (
      '<div class="ma-card ma-table-card">' +
        '<div class="ma-table-titlebar">' +
          '<span class="ma-table-title">Meter Allocation Detail</span>' +
          '<span class="ma-table-hint">Click a group to expand individual meters</span>' +
        '</div>' +
        '<div class="ma-col-headers">' +
          '<span></span>' +
          '<span class="ma-col-h sortable" data-sort="name">Meter / Group ' + sortArrow('name') + '</span>' +
          '<span class="ma-col-h">Meters</span>' +
          '<span class="ma-col-h sortable right" data-sort="usage">Usage ' + sortArrow('usage') + '</span>' +
          '<span class="ma-col-h sortable" data-sort="pct">% of Plant ' + sortArrow('pct') + '</span>' +
          '<span class="ma-col-h sortable right" data-sort="cost">Cost ' + sortArrow('cost') + '</span>' +
        '</div>' +
        '<div class="ma-rows" id="ma-rows">' + rowsHtml + '</div>' +
      '</div>'
    );
  }

  // ── Render: header ───────────────────────────────────────────────────────────
  function _renderHeader() {
    var tabsHtml = UTIL_KEYS.map(function (k) {
      var u = UTILS[k];
      var isActive = k === _state.selectedUtil;
      var cls = 'ma-util-tab' + (isActive ? ' is-active' : '');
      var style = isActive
        ? 'background:' + u.color + ';color:#fff;border-bottom:2px solid #fff;'
        : 'color:rgba(255,255,255,0.55);';
      return (
        '<button class="' + cls + '" data-util-tab="' + k + '" style="' + style + '">' +
          u.icon + '&nbsp;' + u.label +
        '</button>'
      );
    }).join('');

    var siteLine = _state.siteName ? _esc(_state.siteName) : 'Demo Site';
    var dateLine = _state.dateLabel ? '&nbsp;&bull;&nbsp;' + _esc(_state.dateLabel) : '';

    return (
      '<div class="ma-header" style="background:' + HEADER_BG + '">' +
        '<div class="ma-header-top">' +
          '<div>' +
            '<div class="ma-header-site">' + siteLine + '</div>' +
            '<div class="ma-header-subtitle">Tenant Meter Allocation' + dateLine + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ma-header-tabs">' +
          tabsHtml +
        '</div>' +
      '</div>'
    );
  }

  // ── Render: full body (below header) ─────────────────────────────────────────
  function _renderBody() {
    var body = _container && _container.querySelector('#ma-body');
    if (!body) return;
    var rows = _getRows();
    body.innerHTML = (
      '<div class="ma-page">' +
        _renderKpis(rows) +
        _renderTable(rows) +
        '<div class="ma-footer">Cost&nbsp;=&nbsp;(Meter&nbsp;Usage&nbsp;÷&nbsp;Plant&nbsp;Output)&nbsp;&times;&nbsp;Rate&nbsp;&nbsp;&middot;&nbsp;&nbsp;SkySpark&nbsp;pUb</div>' +
      '</div>'
    );
  }

  // ── Update utility tab active styles without full re-render ──────────────────
  function _syncTabStyles() {
    if (!_container) return;
    _container.querySelectorAll('[data-util-tab]').forEach(function (btn) {
      var k = btn.getAttribute('data-util-tab');
      var u = UTILS[k];
      if (!u) return;
      var isActive = k === _state.selectedUtil;
      btn.className = 'ma-util-tab' + (isActive ? ' is-active' : '');
      if (isActive) {
        btn.style.cssText = 'background:' + u.color + ';color:#fff;border-bottom:2px solid #fff;';
      } else {
        btn.style.cssText = 'color:rgba(255,255,255,0.55);';
      }
    });
  }

  // ── Event handling ───────────────────────────────────────────────────────────
  function _attachListeners() {
    if (!_container) return;
    _container.addEventListener('click', function (e) {

      // Utility tab
      var tab = e.target.closest('[data-util-tab]');
      if (tab) {
        var util = tab.getAttribute('data-util-tab');
        if (util && util !== _state.selectedUtil) {
          _state.selectedUtil = util;
          _state.expandedGroups = {};
          _syncTabStyles();
          _renderBody();
        }
        return;
      }

      // Group header — expand / collapse
      var group = e.target.closest('[data-group-id]');
      if (group) {
        var gid = group.getAttribute('data-group-id');
        if (gid) {
          _state.expandedGroups[gid] = !_state.expandedGroups[gid];
          _renderBody();
        }
        return;
      }

      // Sort column header
      var sortBtn = e.target.closest('[data-sort]');
      if (sortBtn) {
        var col = sortBtn.getAttribute('data-sort');
        if (col) {
          if (_state.sortCol === col) {
            _state.sortAsc = !_state.sortAsc;
          } else {
            _state.sortCol = col;
            _state.sortAsc = false;
          }
          _renderBody();
        }
        return;
      }
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  NS.App = {
    /**
     * Initialise and render the dashboard.
     *
     * @param {HTMLElement} container - Scoped root element
     * @param {Object}      allData   - { Cooling: [], Heating: [], Flow: [] }
     * @param {Object}      ctx       - { siteName, dateLabel }
     */
    init: function (container, allData, ctx) {
      _container = container;
      _state = {
        selectedUtil:   'Cooling',
        expandedGroups: {},
        sortCol:        'pct',
        sortAsc:        false,
        allData:        allData || { Cooling: [], Heating: [], Flow: [] },
        siteName:       (ctx && ctx.siteName)  || '',
        dateLabel:      (ctx && ctx.dateLabel) || ''
      };

      container.innerHTML = _renderHeader() + '<div id="ma-body"></div>';
      _renderBody();
      _attachListeners();
    },

    // Called after async site-name lookup resolves to update the header label.
    updateSiteName: function (name) {
      _state.siteName = name;
      var el = _container && _container.querySelector('.ma-header-site');
      if (el) el.textContent = name;
    }
  };

})(window.meterAllocation);
