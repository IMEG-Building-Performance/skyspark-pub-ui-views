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

  var HEADER_BG = '#3d4f7c';

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
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Strip the site display name prefix from a meter or group name.
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

  // Collect unique groups across all utilities (for summary page).
  function _getAllGroups() {
    var map = {}, order = [];
    UTIL_KEYS.forEach(function (u) {
      var rows = (_state.allData && _state.allData[u]) || [];
      rows.forEach(function (r) {
        if (!map[r.groupId]) { map[r.groupId] = r.groupName; order.push(r.groupId); }
      });
    });
    return order.map(function (id) { return { id: id, name: map[id] }; });
  }

  // Group rows by groupId; preserve insertion order.
  function _groupRows(rows) {
    var map = {}, order = [];
    rows.forEach(function (row) {
      if (!map[row.groupId]) {
        map[row.groupId] = { id: row.groupId, name: row.groupName, meters: [],
                             totalUsage: 0, totalPercOfPlant: 0, totalCost: 0 };
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

  // Sort groups and their inner meters by the current sort state.
  function _buildDisplayGroups(rows) {
    var col = _state.sortCol, dir = _state.sortAsc ? 1 : -1;
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

  // ── Render: KPI strip (Details page) ─────────────────────────────────────────
  function _renderKpis(rows) {
    var cfg = UTILS[_state.selectedUtil] || UTILS.Cooling;
    var totalCost    = rows.reduce(function (s, r) { return s + (r.cost  || 0); }, 0);
    var totalUsage   = rows.reduce(function (s, r) { return s + (r.usage || 0); }, 0);
    var totalMeters  = rows.length;
    var activeMeters = rows.filter(function (r) { return r.usage > 0; }).length;
    var topRow  = rows.slice().sort(function (a, b) { return b.percOfPlant - a.percOfPlant; })[0];
    var topPct  = topRow ? fmtPct(topRow.percOfPlant) : '—';
    var topName = topRow ? _shortName(topRow.meterName, _state.siteName) : '—';

    var cards = [
      { label: 'Total Metered Cost',  value: fmtCost(totalCost),  sub: '' },
      { label: 'Total Metered Usage', value: fmtNum(totalUsage),  sub: rows.length ? (rows[0].usageUnit || 'BTU') : '' },
      { label: 'Active Meters',       value: activeMeters + ' / ' + totalMeters, sub: 'reporting non-zero usage' },
      { label: 'Top Consumer',        value: topPct, sub: topName }
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

  // ── Render: detail table (Details page) ──────────────────────────────────────
  function _renderTable(rows) {
    var cfg = UTILS[_state.selectedUtil] || UTILS.Cooling;

    if (rows.length === 0) {
      var errMsg = _state.allData && _state.allData._errors && _state.allData._errors[_state.selectedUtil];
      return (
        '<div class="ma-card ma-empty">' +
          '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c0c0b8" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
          (errMsg
            ? '<div style="color:#b91c1c">Error loading ' + _esc(_state.selectedUtil) + ' data</div>' +
              '<div class="ma-empty-hint" style="color:#b91c1c;max-width:480px">' + _esc(errMsg) + '</div>'
            : '<div>No ' + _esc(_state.selectedUtil) + ' meter data for this site and date range.</div>' +
              '<div class="ma-empty-hint">The function returned zero rows — check that ' + _esc(_state.selectedUtil) + ' meters are configured for this site.</div>'
          ) +
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
          return (
            '<div class="ma-meter-row' + (idx % 2 === 0 ? '' : ' stripe') + '">' +
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
        '<div class="ma-rows">' + rowsHtml + '</div>' +
      '</div>'
    );
  }

  // ── Render: Summary page ──────────────────────────────────────────────────────
  function _renderSummaryPage() {
    var summary  = (_state.allData && _state.allData._summary) || {};
    var siteName = _state.siteName;

    // Build per-utility lookup maps: groupId → row
    var byUtil = {};
    UTIL_KEYS.forEach(function (u) {
      var map = {};
      ((summary[u]) || []).forEach(function (r) { map[r.groupId] = r; });
      byUtil[u] = map;
    });

    // Collect all unique groups across all summary utilities (fall back to detail data)
    var groupMap = {}, groupOrder = [];
    UTIL_KEYS.forEach(function (u) {
      ((summary[u]) || []).forEach(function (r) {
        if (!groupMap[r.groupId]) { groupMap[r.groupId] = r.groupName; groupOrder.push(r.groupId); }
      });
    });
    if (groupOrder.length === 0) {
      // No summary data yet — fall back to groups from detail data
      _getAllGroups().forEach(function (g) {
        if (!groupMap[g.id]) { groupMap[g.id] = g.name; groupOrder.push(g.id); }
      });
    }

    // Compute per-utility totals and grand total cost
    var utilTotals = {};
    UTIL_KEYS.forEach(function (u) {
      var rows = (summary[u]) || [];
      utilTotals[u] = {
        usage: rows.reduce(function (s, r) { return s + (r.usage || 0); }, 0),
        cost:  rows.reduce(function (s, r) { return s + (r.cost  || 0); }, 0),
        unit:  rows.length ? (rows[0].usageUnit || '') : ''
      };
    });
    var grandCost = UTIL_KEYS.reduce(function (s, u) { return s + utilTotals[u].cost; }, 0);

    // Check if any summary data loaded at all
    var hasSummaryData = UTIL_KEYS.some(function (u) { return (summary[u] || []).length > 0; });
    var summaryErrors  = summary._errors || {};
    var pendingUtils   = UTIL_KEYS.filter(function (u) { return !(summary[u] || []).length; });

    // ── KPI cards ──────────────────────────────────────────────────────────────
    var kpiCards = [
      { label: 'Total Plant Cost', value: hasSummaryData ? fmtCost(grandCost) : '—', color: HEADER_BG },
      { label: 'Cooling Cost',     value: utilTotals.Cooling.cost  ? fmtCost(utilTotals.Cooling.cost)  : '—', color: UTILS.Cooling.color },
      { label: 'Heating Cost',     value: utilTotals.Heating.cost  ? fmtCost(utilTotals.Heating.cost)  : '—', color: UTILS.Heating.color },
      { label: 'Flow Cost',        value: utilTotals.Flow.cost     ? fmtCost(utilTotals.Flow.cost)     : '—', color: UTILS.Flow.color }
    ];
    var kpiHtml = '<div class="ma-kpi-strip">' +
      kpiCards.map(function (k) {
        return '<div class="ma-kpi-card">' +
          '<div class="ma-kpi-label">' + k.label + '</div>' +
          '<div class="ma-kpi-value" style="color:' + k.color + '">' + k.value + '</div>' +
        '</div>';
      }).join('') +
    '</div>';

    // ── Table headers ──────────────────────────────────────────────────────────
    var utilHeads = UTIL_KEYS.map(function (u) {
      var cfg = UTILS[u];
      var hasErr = !!summaryErrors[u];
      var label = cfg.icon + '&nbsp;' + cfg.label + (hasErr ? '&nbsp;<span style="font-size:10px;font-weight:400;opacity:0.6" title="' + _esc(summaryErrors[u]) + '">⚠</span>' : '');
      return '<th colspan="2" class="ma-sum-util-head" style="color:' + cfg.color + '">' + label + '</th>';
    }).join('') + '<th class="ma-sum-total-head">Total Cost</th>';

    var subHeads = UTIL_KEYS.map(function (u) {
      var unit = utilTotals[u].unit ? '&nbsp;<span style="font-weight:400;color:#c4c4bc">(' + _esc(utilTotals[u].unit) + ')</span>' : '';
      return '<th class="ma-sum-sub-head">Usage' + unit + '</th><th class="ma-sum-sub-head">Cost</th>';
    }).join('') + '<th></th>';

    // ── Body rows ──────────────────────────────────────────────────────────────
    var NUM_COLS = UTIL_KEYS.length * 2 + 2;
    var bodyRows = groupOrder.length === 0
      ? '<tr><td colspan="' + NUM_COLS + '" class="ma-sum-no-data">No meter groups found — select a site with meter data.</td></tr>'
      : groupOrder.map(function (gid, i) {
          var name = _shortName(groupMap[gid], siteName);
          var rowCost = 0;
          var hasAny  = false;
          var cells = UTIL_KEYS.map(function (u) {
            var r = byUtil[u][gid];
            if (r) { rowCost += r.cost || 0; hasAny = true; }
            return '<td class="ma-sum-num">' + (r ? fmtNum(r.usage)  : '—') + '</td>' +
                   '<td class="ma-sum-num">' + (r ? fmtCost(r.cost) : '—') + '</td>';
          }).join('');
          var totalCell = '<td class="ma-sum-total">' + (hasAny ? fmtCost(rowCost) : '—') + '</td>';
          return '<tr class="ma-sum-row' + (i % 2 === 0 ? '' : ' stripe') + '">' +
            '<td class="ma-sum-name" title="' + _esc(groupMap[gid]) + '">' + _esc(name) + '</td>' +
            cells + totalCell +
          '</tr>';
        }).join('');

    // ── Footer totals ──────────────────────────────────────────────────────────
    var footerCells = UTIL_KEYS.map(function (u) {
      var t = utilTotals[u];
      return '<td class="ma-sum-num ma-sum-foot">' + (t.usage ? fmtNum(t.usage) : '—') + '</td>' +
             '<td class="ma-sum-num ma-sum-foot">' + (t.cost  ? fmtCost(t.cost) : '—') + '</td>';
    }).join('') + '<td class="ma-sum-total ma-sum-foot">' + (hasSummaryData ? fmtCost(grandCost) : '—') + '</td>';

    // ── Pending-utility notice (only when some utilities haven't returned data) ─
    var noticeHtml = '';
    if (pendingUtils.length > 0) {
      var pendingLabels = pendingUtils.map(function (u) { return UTILS[u].label; }).join(', ');
      noticeHtml = '<div class="ma-sum-notice">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '<span>' + _esc(pendingLabels) + (pendingUtils.length === 1 ? ' data is' : ' data are') +
        ' not yet available — those columns will populate once&nbsp;<code>report_meterValidation_totalsTable</code>&nbsp;returns results for those utilities.</span>' +
      '</div>';
    }

    return (
      '<div class="ma-page">' +
      noticeHtml +
      kpiHtml +
      '<div class="ma-card ma-table-card">' +
        '<div class="ma-table-titlebar">' +
          '<span class="ma-table-title">Tenant Billing Overview</span>' +
          '<span class="ma-table-hint">Group-level totals by utility</span>' +
        '</div>' +
        '<div style="overflow-x:auto">' +
          '<table class="ma-sum-table">' +
            '<thead>' +
              '<tr><th class="ma-sum-name-head">Meter Group</th>' + utilHeads + '</tr>' +
              '<tr><th></th>' + subHeads + '</tr>' +
            '</thead>' +
            '<tbody>' + bodyRows + '</tbody>' +
            '<tfoot><tr><td class="ma-sum-foot ma-sum-name">Total</td>' + footerCells + '</tr></tfoot>' +
          '</table>' +
        '</div>' +
      '</div>' +
      '<div class="ma-footer">Cost&nbsp;=&nbsp;(Meter&nbsp;Usage&nbsp;÷&nbsp;Plant&nbsp;Output)&nbsp;&times;&nbsp;Rate&nbsp;&nbsp;&middot;&nbsp;&nbsp;SkySpark&nbsp;pUb</div>' +
      '</div>'
    );
  }

  // ── Render: header (sticky) ───────────────────────────────────────────────────
  function _renderHeader() {
    var siteLine = _state.siteName ? _esc(_state.siteName) : 'Demo Site';
    var dateLine = _state.dateLabel ? '&nbsp;&bull;&nbsp;' + _esc(_state.dateLabel) : '';

    // Page tabs: Summary | Details
    var pageTabs = ['summary', 'details'].map(function (p) {
      var lbl = p === 'summary' ? 'Summary' : 'Details';
      var isActive = _state.page === p;
      var style = isActive
        ? 'color:#fff;background:rgba(255,255,255,0.18);border-bottom:2px solid #fff;'
        : 'color:rgba(255,255,255,0.55);';
      return '<button class="ma-page-tab' + (isActive ? ' is-active' : '') + '" data-page="' + p + '" style="' + style + '">' + lbl + '</button>';
    }).join('');

    return (
      '<div class="ma-header" style="background:' + HEADER_BG + '">' +
        '<div class="ma-header-top">' +
          '<div class="ma-header-site">' + siteLine + '</div>' +
          '<div class="ma-header-subtitle">Tenant Meter Allocation' + dateLine + '</div>' +
        '</div>' +
        '<div class="ma-header-nav">' +
          '<div class="ma-page-tabs">' + pageTabs + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Render: full body ─────────────────────────────────────────────────────────
  function _renderBody() {
    var body = _container && _container.querySelector('#ma-body');
    if (!body) return;
    if (_state.page === 'summary') {
      body.innerHTML = _renderSummaryPage();
    } else {
      var rows = _getRows();
      var utilSelector = '<div class="ma-util-selector">' +
        UTIL_KEYS.map(function (k) {
          var u = UTILS[k];
          var isActive = k === _state.selectedUtil;
          return '<button class="ma-util-pill' + (isActive ? ' is-active' : '') + '" data-util-tab="' + k + '" ' +
            'style="' + (isActive ? 'background:' + u.color + ';color:#fff;border-color:' + u.color + ';' : '') + '">' +
            u.icon + '&nbsp;' + u.label +
          '</button>';
        }).join('') +
      '</div>';
      body.innerHTML = (
        '<div class="ma-page">' +
          utilSelector +
          _renderKpis(rows) +
          _renderTable(rows) +
          '<div class="ma-footer">Cost&nbsp;=&nbsp;(Meter&nbsp;Usage&nbsp;÷&nbsp;Plant&nbsp;Output)&nbsp;&times;&nbsp;Rate&nbsp;&nbsp;&middot;&nbsp;&nbsp;SkySpark&nbsp;pUb</div>' +
        '</div>'
      );
    }
  }

  // ── Render: full page (header + body) ────────────────────────────────────────
  function _renderAll() {
    _container.innerHTML = _renderHeader() + '<div id="ma-body"></div>';
    _renderBody();
  }

  // ── Event handling ───────────────────────────────────────────────────────────
  function _attachListeners() {
    if (!_container) return;
    _container.addEventListener('click', function (e) {

      // Page tab (Summary / Details)
      var pageTab = e.target.closest('[data-page]');
      if (pageTab) {
        var pg = pageTab.getAttribute('data-page');
        if (pg && pg !== _state.page) {
          _state.page = pg;
          _renderAll(); // header changes (util tabs appear/disappear)
        }
        return;
      }

      // Utility tab
      var tab = e.target.closest('[data-util-tab]');
      if (tab) {
        var util = tab.getAttribute('data-util-tab');
        if (util && util !== _state.selectedUtil) {
          _state.selectedUtil = util;
          _state.expandedGroups = {};
          _renderAll(); // header active state changes
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
          if (_state.sortCol === col) { _state.sortAsc = !_state.sortAsc; }
          else { _state.sortCol = col; _state.sortAsc = false; }
          _renderBody();
        }
        return;
      }
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  NS.App = {
    init: function (container, allData, ctx) {
      _container = container;
      _state = {
        page:           'summary',
        selectedUtil:   'Cooling',
        expandedGroups: {},
        sortCol:        'pct',
        sortAsc:        false,
        allData:        allData || { Cooling: [], Heating: [], Flow: [] },
        siteName:       (ctx && ctx.siteName)  || '',
        dateLabel:      (ctx && ctx.dateLabel) || ''
      };
      _renderAll();
      _attachListeners();
    },

    updateSiteName: function (name) {
      _state.siteName = name;
      var el = _container && _container.querySelector('.ma-header-site');
      if (el) el.textContent = name;
    }
  };

})(window.meterAllocation);
