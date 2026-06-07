// components/FaultSummaries.js — Fault Summaries table
console.log('[FaultSummaries] Script loading…');
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.FaultSummaries = (function () {
  console.log('[FaultSummaries] IIFE executing…');

  var _state = null;

  function _strVal(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object' && v.dis) return v.dis;
    if (typeof v === 'object' && v.val !== undefined) return String(v.val);
    return String(v);
  }

  function _numVal(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object' && v._kind === 'number') return v.val;
    if (typeof v === 'number') return v;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  function renderPage() {
    return [
      '<div class="fl-page">',
      '  <div class="fl-page-header">',
      '    <div class="fl-page-title">Fault Summaries</div>',
      '    <div class="fl-page-meta" id="fsMeta"></div>',
      '    <button class="fl-copy-btn" id="fsCopyBtn" title="Copy table to clipboard (paste into Excel/Sheets)">',
      '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
      '      Copy List',
      '    </button>',
      '  </div>',

      '  <div class="tu-filter-bar">',
      '    <input class="tu-filter-input" id="fsFilterInput" type="text" placeholder="Filter faults…" autocomplete="off" />',
      '    <span class="tu-filter-count" id="fsFilterCount"></span>',
      '  </div>',

      '  <div class="tu-table-scroll">',
      '    <table class="tu-table fs-table">',
      '      <thead id="fsThead"></thead>',
      '      <tbody id="fsTbody"></tbody>',
      '    </table>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  var COLS = [
    { key: 'faultName',         label: 'Fault Name' },
    { key: 'faultName_q0',      label: 'Total Faults' },
    { key: 'percentAllFaults',  label: 'Percent of All Faults' },
    { key: 'energyScore',       label: 'Max Energy Score' }
  ];

  function _buildThead(container) {
    var thead = container.querySelector('#fsThead');
    if (!thead) return;
    thead.innerHTML = '<tr>' +
      '<th class="tu-th" style="width:28px"></th>' +
      COLS.map(function (c) {
        return '<th class="tu-th tu-th-sort fs-th" data-col="' + c.key + '">' +
          c.label + '<span class="tu-sort-ind" data-col="' + c.key + '"></span></th>';
      }).join('') +
    '</tr>';

    thead.querySelectorAll('.tu-th-sort').forEach(function (th) {
      th.addEventListener('click', function () {
        var col = th.getAttribute('data-col');
        if (_state.sortCol === col) { _state.sortDir *= -1; }
        else { _state.sortCol = col; _state.sortDir = 1; }
        _rebuildTbody(container);
      });
    });
  }

  function _rebuildTbody(container) {
    if (!_state) return;
    var rows = _state.rows;

    if (_state.filter) {
      var q = _state.filter.toLowerCase();
      rows = rows.filter(function (r) {
        return COLS.some(function (c) { return String(r[c.key] || '').toLowerCase().indexOf(q) !== -1; });
      });
    }

    if (_state.sortCol) {
      var col = _state.sortCol, dir = _state.sortDir;
      rows = rows.slice().sort(function (a, b) {
        var av = a[col], bv = b[col];
        if (av === null || av === undefined) return dir;
        if (bv === null || bv === undefined) return -dir;
        var an = parseFloat(av), bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    var tbody = container.querySelector('#fsTbody');
    if (!tbody) return;

    tbody.innerHTML = rows.map(function (r, ri) {
      var infoId = 'fsInfo_' + ri;
      var pct = r.percentAllFaults;
      var pctStr = pct !== null && pct !== undefined ? (parseFloat(pct)).toFixed(0) + '%' : '—';
      var energy = r.energyScore !== null && r.energyScore !== undefined ? parseFloat(r.energyScore).toFixed(3) : '—';
      var totalFaults = r.faultName_q0 !== null && r.faultName_q0 !== undefined ? r.faultName_q0 : '—';

      var hasDetail = !!(r.faultName || r.percentAllFaults !== null || r.energyScore !== null);
      var infoBtn = hasDetail
        ? '<button class="fs-info-btn" data-row="' + ri + '" title="Show details">&#x24D8;</button>'
        : '';

      return '<tr class="fs-row" data-row="' + ri + '">' +
        '<td class="tu-td fs-td-info">' + infoBtn + '</td>' +
        '<td class="tu-td fs-td-name">' + (r.faultName || '—') + '</td>' +
        '<td class="tu-td">' + totalFaults + '</td>' +
        '<td class="tu-td">' + pctStr + '</td>' +
        '<td class="tu-td">' + energy + '</td>' +
      '</tr>';
    }).join('');

    // Info popover on click
    tbody.querySelectorAll('.fs-info-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var ri2 = parseInt(btn.getAttribute('data-row'), 10);
        var r2 = rows[ri2];
        if (!r2) return;
        _showInfoPopover(btn, r2);
      });
    });

    container.querySelectorAll('#fsThead .tu-sort-ind').forEach(function (ind) {
      var col = ind.getAttribute('data-col');
      ind.textContent = _state.sortCol === col ? (_state.sortDir === 1 ? ' ▲' : ' ▼') : '';
    });

    var countEl = container.querySelector('#fsFilterCount');
    if (countEl) countEl.textContent = rows.length + ' / ' + _state.rows.length + ' faults';
  }

  function _showInfoPopover(btn, r) {
    document.querySelectorAll('.fs-popover').forEach(function (p) { p.remove(); });

    var fields = [
      { label: 'faultName',        val: r.faultName },
      { label: 'faultName_q0',     val: r.faultName_q0 },
      { label: 'percentAllFaults', val: r.percentAllFaults !== null ? parseFloat(r.percentAllFaults).toFixed(0) + '%' : null },
      { label: 'energyScore',      val: r.energyScore !== null ? parseFloat(r.energyScore).toFixed(3) : null }
    ].filter(function (f) { return f.val !== null && f.val !== undefined && f.val !== ''; });

    var pop = document.createElement('div');
    pop.className = 'fs-popover';
    pop.innerHTML = fields.map(function (f) {
      return '<div class="fs-popover-row">' +
        '<span class="fs-popover-key">' + f.label + '</span>' +
        '<span class="fs-popover-type">· · ·</span>' +
        '<span class="fs-popover-val">' + f.val + '</span>' +
      '</div>';
    }).join('');

    document.body.appendChild(pop);
    var btnRect = btn.getBoundingClientRect();
    pop.style.top  = (btnRect.bottom + window.scrollY + 4) + 'px';
    pop.style.left = (btnRect.left  + window.scrollX) + 'px';

    function dismiss(e) {
      if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', dismiss); }
    }
    setTimeout(function () { document.addEventListener('click', dismiss); }, 0);
  }

  function _populate(container, rows) {
    _state = { rows: rows, sortCol: null, sortDir: 1, filter: '' };
    var meta = container.querySelector('#fsMeta');
    if (meta) meta.textContent = rows.length + ' fault types';
    _buildThead(container);
    _rebuildTbody(container);
  }

  function _copyTable(container) {
    if (!_state || !_state.rows) return;
    var headers = COLS.map(function (c) { return c.label; });
    var rows = _state.rows.map(function (r) {
      return COLS.map(function (c) {
        var v = r[c.key];
        if (v === null || v === undefined) return '';
        if (c.key === 'percentAllFaults') { var n = parseFloat(v); return isNaN(n) ? v : n.toFixed(0) + '%'; }
        if (c.key === 'energyScore')      { var n2 = parseFloat(v); return isNaN(n2) ? v : n2.toFixed(3); }
        return String(v);
      });
    });
    var tsv = [headers].concat(rows).map(function (row) { return row.join('\t'); }).join('\n');
    navigator.clipboard.writeText(tsv).then(function () {
      var btn = container.querySelector('#fsCopyBtn');
      if (btn) { btn.textContent = '✓ Copied!'; setTimeout(function () { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy List'; }, 2000); }
    }).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = tsv; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  function initLive(container, ctx) {
    console.log('[FaultSummaries] initLive called, ctx:', ctx ? { attestKey: !!ctx.attestKey, siteRef: ctx.siteRef, projectName: ctx.projectName } : null);
    var copyBtn = container.querySelector('#fsCopyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () { _copyTable(container); });

    var filterInput = container.querySelector('#fsFilterInput');
    if (filterInput) {
      filterInput.addEventListener('input', function () {
        if (_state) { _state.filter = filterInput.value; _rebuildTbody(container); }
      });
    }

    if (!ctx || !ctx.attestKey || !ctx.siteRef) {
      _populate(container, []);
      return;
    }

    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var dateArg = (ctx.datesStart && ctx.datesEnd)
      ? ctx.datesStart + '..' + ctx.datesEnd
      : 'today()';

    var tbody = container.querySelector('#fsTbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding:24px;color:#9CA3AF;font-size:12px;text-align:center;">Loading fault summaries…</td></tr>';

    var axon = 'view_MBCxReport_CustomerView_Output(' +
      ctx.siteRef + ', ' + dateArg +
      ', 10%, @nav:rule.all, "Fault Summaries", "", "Show All")';

    console.log('[FaultSummaries] Axon query:', axon);
    API.evalAxon(ctx.attestKey, ctx.projectName, axon)
      .then(function (grid) {
        console.log('[FaultSummaries] Grid received:', grid ? { cols: grid.cols ? grid.cols.length : 0, rows: grid.rows ? grid.rows.length : 0 } : null);
        var parsed = HP.parseGrid(grid);
        if (!parsed.rows.length) {
          if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding:24px;color:#9CA3AF;font-size:12px;text-align:center;">No fault summary data returned for this site and date range.</td></tr>';
          return;
        }
        var rows = parsed.rows.map(function (r) {
          return {
            faultName:        _strVal(r.faultName),
            faultName_q0:     _numVal(r.faultName_q0),
            percentAllFaults: _numVal(r.percentAllFaults),
            energyScore:      _numVal(r.energyScore),
            _raw:             r
          };
        });
        _populate(container, rows);
      })
      .catch(function (err) {
        console.error('[FaultSummaries] fetch failed:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding:24px;color:#9B2335;font-size:12px;text-align:center;">Failed to load — ' + (err && err.message ? err.message : 'see console') + '</td></tr>';
      });
  }

  return { renderPage: renderPage, initLive: initLive };

})();
