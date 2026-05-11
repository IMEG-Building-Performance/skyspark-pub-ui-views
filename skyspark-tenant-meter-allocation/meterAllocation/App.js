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
    var neg = v < 0;
    var abs = Math.abs(v);
    var s;
    if (abs >= 1e9) s = (abs / 1e9).toFixed(2) + 'B';
    else if (abs >= 1e6) s = (abs / 1e6).toFixed(2) + 'M';
    else if (abs >= 1e3) s = (abs / 1e3).toFixed(1) + 'K';
    else s = abs.toLocaleString('en-US', { maximumFractionDigits: 1 });
    return neg ? '-' + s : s;
  }
  function fmtCost(v) {
    if (v == null || isNaN(v)) return '—';
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtPct(v) {
    if (v == null || isNaN(v)) return '0.00%';
    return v.toFixed(2) + '%';
  }
  // Convert raw BTU → kBTU for display; pass through other units unchanged.
  function fmtBtu(val, unit) {
    if (val == null || isNaN(val)) return '—';
    return (!unit || unit === 'BTU') ? fmtNum(val / 1000) : fmtNum(val);
  }
  function btuUnit(unit) {
    return (!unit || unit === 'BTU') ? 'kBTU' : unit;
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

  // ── Render: collapsible section wrapper ──────────────────────────────────────
  function _collapseSection(key, title, isOpen, content) {
    return (
      '<div class="ma-collapse-section">' +
        '<button class="ma-section-toggle" data-collapse="' + key + '">' +
          '<span class="ma-section-toggle-title">' + title + '</span>' +
          '<span class="ma-toggle-chevron">' + (isOpen ? '&#9660;' : '&#9658;') + '</span>' +
        '</button>' +
        (isOpen ? '<div class="ma-section-body">' + content + '</div>' : '') +
      '</div>'
    );
  }

  // ── Render: KPI strip (Details page) ─────────────────────────────────────────
  function _renderKpis(rows) {
    var cfg = UTILS[_state.selectedUtil] || UTILS.Cooling;
    var totalUsage   = rows.reduce(function (s, r) { return s + (r.usage || 0); }, 0);
    var totalMeters  = rows.length;
    var activeMeters = rows.filter(function (r) { return r.usage > 0; }).length;
    var topRow  = rows.slice().sort(function (a, b) { return b.percOfPlant - a.percOfPlant; })[0];
    var topPct  = topRow ? fmtPct(topRow.percOfPlant) : '—';
    var topName = topRow ? _shortName(topRow.meterName, _state.siteName) : '—';

    var usageUnit = rows.length ? (rows[0].usageUnit || 'BTU') : 'BTU';
    var cards = [
      { label: 'Total Metered Usage', value: fmtBtu(totalUsage, usageUnit), sub: btuUnit(usageUnit), isUnit: true },
      { label: 'Active Meters',       value: activeMeters + ' / ' + totalMeters, sub: 'reporting non-zero usage', isUnit: false },
      { label: 'Top Consumer',        value: topPct, sub: topName, isUnit: false }
    ];
    var html = '<div class="ma-kpi-strip" style="grid-template-columns:repeat(3,1fr)">';
    cards.forEach(function (k) {
      html += (
        '<div class="ma-kpi-card">' +
          '<div class="ma-kpi-label">' + _esc(k.label) + '</div>' +
          '<div class="ma-kpi-value" style="color:' + cfg.color + '">' + _esc(k.value) +
            (k.isUnit ? '<span class="ma-kpi-unit">&nbsp;' + _esc(k.sub) + '</span>' : '') +
          '</div>' +
          (!k.isUnit && k.sub ? '<div class="ma-kpi-sub" title="' + _esc(k.sub) + '">' + _esc(k.sub) + '</div>' : '') +
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

    var col = _state.sortCol, dir = _state.sortAsc ? 1 : -1;
    var sorted = rows.slice().sort(function (a, b) {
      if (col === 'name')  return a.meterName.localeCompare(b.meterName) * dir;
      if (col === 'usage') return (a.usage - b.usage) * dir;
      if (col === 'pct')   return (a.percOfPlant - b.percOfPlant) * dir;
      return 0;
    });

    var siteName = _state.siteName;
    var rowsHtml = sorted.map(function (m, idx) {
      var mName = _shortName(m.meterName, siteName);
      return (
        '<div class="ma-meter-row' + (idx % 2 === 0 ? '' : ' stripe') + '">' +
          '<span class="ma-meter-name" title="' + _esc(m.meterName) + '">' + _esc(mName) + '</span>' +
          '<span class="ma-meter-usage" style="color:' + cfg.color + '">' +
            fmtBtu(m.usage, m.usageUnit) + '<small>&nbsp;' + _esc(btuUnit(m.usageUnit)) + '</small>' +
          '</span>' +
          '<span class="ma-meter-pct">' + _pctBar(m.percOfPlant, cfg.color) + '</span>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="ma-card ma-table-card">' +
        '<div class="ma-table-titlebar">' +
          '<span class="ma-table-title">Meter Allocation Detail</span>' +
          '<span class="ma-table-hint">All meters sorted by % of plant</span>' +
        '</div>' +
        '<div class="ma-col-headers">' +
          '<span class="ma-col-h sortable" data-sort="name">Meter ' + sortArrow('name') + '</span>' +
          '<span class="ma-col-h sortable right" data-sort="usage">Usage ' + sortArrow('usage') + '</span>' +
          '<span class="ma-col-h sortable" data-sort="pct">% of Plant ' + sortArrow('pct') + '</span>' +
        '</div>' +
        '<div class="ma-rows">' + rowsHtml + '</div>' +
      '</div>'
    );
  }

  // ── Render: Summary page ──────────────────────────────────────────────────────
  function _renderSummaryPage() {
    var summary      = (_state.allData && _state.allData._summary)      || {};
    var tenantTotals = (_state.allData && _state.allData._tenantTotals) || {};
    var summaryErrors = summary._errors || {};

    // ── KPI cards — plant-level cost totals ──────────────────────────────────
    var grandCost = UTIL_KEYS.reduce(function (s, u) {
      return s + ((summary[u] && summary[u].cost) || 0);
    }, 0);
    var hasSummaryData = UTIL_KEYS.some(function (u) { return summary[u] != null; });

    var kpiCards = [
      { label: 'Total Plant Cost', value: hasSummaryData ? fmtCost(grandCost) : '—', color: HEADER_BG },
      { label: 'Cooling Cost',  value: summary.Cooling  ? fmtCost(summary.Cooling.cost)  : '—', color: UTILS.Cooling.color },
      { label: 'Heating Cost',  value: summary.Heating  ? fmtCost(summary.Heating.cost)  : '—', color: UTILS.Heating.color },
      { label: 'Flow Cost',     value: summary.Flow     ? fmtCost(summary.Flow.cost)     : '—', color: UTILS.Flow.color }
    ];
    var kpiHtml = '<div class="ma-kpi-strip">' +
      kpiCards.map(function (k) {
        return '<div class="ma-kpi-card">' +
          '<div class="ma-kpi-label">' + k.label + '</div>' +
          '<div class="ma-kpi-value" style="color:' + k.color + '">' + k.value + '</div>' +
        '</div>';
      }).join('') +
    '</div>';

    // ── Notice — pending utilities ────────────────────────────────────────────
    var pendingUtils = UTIL_KEYS.filter(function (u) { return summary[u] == null && !summaryErrors[u]; });
    var noticeHtml = '';
    if (pendingUtils.length > 0) {
      var labels = pendingUtils.map(function (u) { return UTILS[u].label; }).join(', ');
      noticeHtml = '<div class="ma-sum-notice">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '<span>KPI totals for ' + _esc(labels) + ' are pending — ' +
        '<code>report_meterValidation_plantTotalsTable</code> not yet available for those utilities.</span>' +
      '</div>';
    }

    // ── Tenant name collection ────────────────────────────────────────────────
    var tenantNames = [], tenantNameSet = {};
    UTIL_KEYS.forEach(function (u) {
      ((tenantTotals[u]) || []).forEach(function (r) {
        if (!tenantNameSet[r.tenantName]) { tenantNameSet[r.tenantName] = true; tenantNames.push(r.tenantName); }
      });
    });

    // Per-utility lookup: tenantName → row
    var tenantByUtil = {};
    UTIL_KEYS.forEach(function (u) {
      var map = {};
      ((tenantTotals[u]) || []).forEach(function (r) { map[r.tenantName] = r; });
      tenantByUtil[u] = map;
    });

    // Default tenant selection
    if (!_state.selectedTenant && tenantNames.length) _state.selectedTenant = tenantNames[0];
    var selected = _state.selectedTenant;

    // ── Tenant selector pills ─────────────────────────────────────────────────
    var tenantSelector = tenantNames.length === 0
      ? '<div class="ma-util-selector"><span style="color:#888;font-size:12px">No tenant data loaded yet.</span></div>'
      : '<div class="ma-util-selector">' +
          tenantNames.map(function (name) {
            var isActive = name === selected;
            return '<button class="ma-util-pill' + (isActive ? ' is-active' : '') + '" data-tenant-tab="' + _esc(name) + '" ' +
              'style="' + (isActive ? 'background:' + HEADER_BG + ';color:#fff;border-color:' + HEADER_BG + ';' : '') + '">' +
              _esc(name) +
            '</button>';
          }).join('') +
        '</div>';

    // ── Per-tenant billing detail table ───────────────────────────────────────
    var detailRows = '', totalCost = 0, hasCost = false;
    UTIL_KEYS.forEach(function (u) {
      var rows = (tenantTotals[u]) || [];
      var r = null;
      rows.forEach(function (row) { if (row.tenantName === selected) r = row; });

      var plantBtu  = summary[u] ? summary[u].btuUsage : null;
      var plantCost = summary[u] ? summary[u].cost      : null;
      var tenantCost = (r && plantBtu && plantCost) ? (r.usage / plantBtu) * plantCost : null;
      if (tenantCost != null) { totalCost += tenantCost; hasCost = true; }

      var pct     = (r && plantBtu) ? (r.usage / plantBtu * 100) : null;
      var cfg     = UTILS[u];
      var rawUnit = r ? (r.usageUnit || 'BTU') : 'BTU';

      detailRows += '<tr class="ma-recon-row">' +
        '<td style="padding:10px 16px;font-weight:600;color:' + cfg.color + '">' + cfg.icon + '&nbsp;' + cfg.label + '</td>' +
        '<td class="ma-recon-num">' + (r ? fmtBtu(r.usage, rawUnit) + '<small>&nbsp;' + btuUnit(rawUnit) + '</small>' : '—') + '</td>' +
        '<td class="ma-recon-num">' + (pct != null ? fmtPct(pct) : '—') + '</td>' +
        '<td class="ma-recon-num">' + (tenantCost != null ? fmtCost(tenantCost) : '—') + '</td>' +
      '</tr>';
    });

    var detailCard = selected
      ? '<div class="ma-card ma-table-card">' +
          '<div class="ma-table-titlebar">' +
            '<span class="ma-table-title">' + _esc(selected) + '</span>' +
            '<span class="ma-table-hint">Cost = (tenant kBTU &divide; plant kBTU) &times; plant cost</span>' +
          '</div>' +
          '<table class="ma-recon-table">' +
            '<thead><tr>' +
              '<th class="ma-recon-head">Utility</th>' +
              '<th class="ma-recon-head right">Usage</th>' +
              '<th class="ma-recon-head right">% of Plant</th>' +
              '<th class="ma-recon-head right">Cost</th>' +
            '</tr></thead>' +
            '<tbody>' + detailRows + '</tbody>' +
            '<tfoot><tr>' +
              '<td class="ma-recon-util ma-sum-foot" style="color:#374151">Total</td>' +
              '<td class="ma-recon-num ma-sum-foot">—</td>' +
              '<td class="ma-recon-num ma-sum-foot">—</td>' +
              '<td class="ma-recon-num ma-sum-foot">' + (hasCost ? fmtCost(totalCost) : '—') + '</td>' +
            '</tr></tfoot>' +
          '</table>' +
        '</div>'
      : '<div class="ma-card ma-empty"><div>Select a tenant above to view their billing detail.</div></div>';

    var billingContent = tenantSelector + detailCard;
    var billingSectionHtml = _collapseSection('billing', 'Tenant Billing', _state.summaryExpanded.billing, billingContent);

    // ── BTU reconciliation table ──────────────────────────────────────────────
    var reconcRows = UTIL_KEYS.map(function (u) {
      var cfg        = UTILS[u];
      var plantBtu   = summary[u] ? (summary[u].btuUsage || 0) : null;
      var rawBtuUnit = summary[u] ? (summary[u].btuUnit || 'BTU') : 'BTU';
      var dispUnit   = btuUnit(rawBtuUnit);
      var tenantBtu  = ((tenantTotals[u]) || []).reduce(function (s, r) { return s + (r.usage || 0); }, 0);
      var coverage   = (plantBtu && tenantBtu) ? (tenantBtu / plantBtu * 100) : null;
      var variance   = (plantBtu != null) ? (plantBtu - tenantBtu) : null;

      var barColor = coverage == null ? '#d1d5db'
                   : coverage >= 95   ? '#16a34a'
                   : coverage >= 80   ? '#d97706'
                   : '#dc2626';
      var barWidth = coverage != null ? Math.min(coverage, 100).toFixed(1) : '0';

      return '<tr class="ma-recon-row">' +
        '<td class="ma-recon-util" style="color:' + cfg.color + '">' + cfg.icon + '&nbsp;' + cfg.label + '</td>' +
        '<td class="ma-recon-num">' + (plantBtu  != null ? fmtBtu(plantBtu, rawBtuUnit)  + '<small>&nbsp;' + dispUnit + '</small>' : '—') + '</td>' +
        '<td class="ma-recon-num">' + (tenantBtu  !== 0  ? fmtBtu(tenantBtu, rawBtuUnit) + '<small>&nbsp;' + dispUnit + '</small>' : '—') + '</td>' +
        '<td class="ma-recon-num" style="color:' + (variance != null && variance > 0 ? '#6b7280' : '#16a34a') + '">' +
          (variance != null ? (variance >= 0 ? '+' : '') + fmtBtu(variance, rawBtuUnit) + '<small>&nbsp;' + dispUnit + '</small>' : '—') +
        '</td>' +
        '<td class="ma-recon-bar">' +
          (coverage != null
            ? '<div class="ma-recon-bar-wrap">' +
                '<div class="ma-pct-track" style="min-width:80px">' +
                  '<div class="ma-pct-fill" style="width:' + barWidth + '%;background:' + barColor + '"></div>' +
                '</div>' +
                '<span class="ma-recon-pct" style="color:' + barColor + '">' + coverage.toFixed(1) + '%</span>' +
              '</div>'
            : '—') +
        '</td>' +
      '</tr>';
    }).join('');

    var reconcTableHtml = '<div class="ma-card ma-table-card">' +
      '<div class="ma-table-titlebar">' +
        '<span class="ma-table-title">BTU Reconciliation</span>' +
        '<span class="ma-table-hint">Plant total vs. authoritative tenant totals</span>' +
      '</div>' +
      '<table class="ma-recon-table">' +
        '<thead><tr>' +
          '<th class="ma-recon-head">Utility</th>' +
          '<th class="ma-recon-head right">Plant Total</th>' +
          '<th class="ma-recon-head right">Tenant Sum</th>' +
          '<th class="ma-recon-head right">Variance</th>' +
          '<th class="ma-recon-head">Coverage</th>' +
        '</tr></thead>' +
        '<tbody>' + reconcRows + '</tbody>' +
      '</table>' +
    '</div>';

    var reconcSectionHtml = _collapseSection('reconciliation', 'BTU Reconciliation', _state.summaryExpanded.reconciliation, reconcTableHtml);

    return (
      '<div class="ma-page">' +
      noticeHtml +
      kpiHtml +
      billingSectionHtml +
      reconcSectionHtml +
      '<div class="ma-footer">Cost&nbsp;=&nbsp;(Tenant&nbsp;kBTU&nbsp;&divide;&nbsp;Plant&nbsp;kBTU)&nbsp;&times;&nbsp;Plant&nbsp;Cost&nbsp;&nbsp;&middot;&nbsp;&nbsp;SkySpark&nbsp;pUb</div>' +
      '</div>'
    );
  }

  // ── Render: header (sticky) ───────────────────────────────────────────────────
  function _renderHeader() {
    var siteLine  = _state.siteName ? _esc(_state.siteName) : 'Demo Site';
    var dateLabel = _state.dateLabel || 'Last Month';

    var pageTabs = [
      { id: 'summary', lbl: 'Summary' },
      { id: 'details', lbl: 'Details' }
    ].map(function (p) {
      var isActive = _state.page === p.id;
      var style = isActive
        ? 'color:#fff;background:rgba(255,255,255,0.18);border-bottom:2px solid #fff;'
        : 'color:rgba(255,255,255,0.55);';
      return '<button class="ma-page-tab' + (isActive ? ' is-active' : '') + '" data-page="' + p.id + '" style="' + style + '">' + p.lbl + '</button>';
    }).join('');

    return (
      '<div class="ma-header" style="background:' + HEADER_BG + '">' +
        '<div class="ma-header-top">' +
          '<div class="ma-header-left">' +
            '<div class="ma-header-site">' + siteLine + '</div>' +
            '<div class="ma-header-subtitle">Tenant Meter Allocation</div>' +
          '</div>' +
          '<div class="ma-header-date-badge">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;opacity:0.8">' +
              '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' +
            '</svg>' +
            '<span>' + _esc(dateLabel) + '</span>' +
          '</div>' +
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
      return;
    }

    // Details page
    var rows = _getRows();
    var cfg  = UTILS[_state.selectedUtil] || UTILS.Cooling;
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
          _renderAll();
        }
        return;
      }

      // Collapsible section toggle
      var collapseBtn = e.target.closest('[data-collapse]');
      if (collapseBtn) {
        var section = collapseBtn.getAttribute('data-collapse');
        if (section && _state.summaryExpanded) {
          _state.summaryExpanded[section] = !_state.summaryExpanded[section];
          _renderBody();
        }
        return;
      }

      // Tenant tab
      var tenantTab = e.target.closest('[data-tenant-tab]');
      if (tenantTab) {
        var tenant = tenantTab.getAttribute('data-tenant-tab');
        if (tenant && tenant !== _state.selectedTenant) {
          _state.selectedTenant = tenant;
          _renderBody();
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
          _renderAll();
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
        page:             'summary',
        selectedUtil:     'Cooling',
        selectedTenant:   null,
        expandedGroups:   {},
        sortCol:          'pct',
        sortAsc:          false,
        summaryExpanded:  { billing: true, reconciliation: false },
        allData:          allData || { Cooling: [], Heating: [], Flow: [] },
        siteName:         (ctx && ctx.siteName)  || '',
        dateLabel:        (ctx && ctx.dateLabel) || ''
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
