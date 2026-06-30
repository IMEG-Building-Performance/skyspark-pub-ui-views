// components/FaultList.js — MBCx Active Fault List section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

var FL_DEMO_FAULTS = [
  { id:1,  equipment:'AHU-1',     site:'Demo Site A', faultName:'Cooling valve stuck open',                   sevNorm:8, sumDur:98,   faultActive:68 },
  { id:2,  equipment:'VAV-L1-02', site:'Demo Site A', faultName:'Faulty reheat coil — SAT 95°F',   sevNorm:9, sumDur:136,  faultActive:94 },
  { id:3,  equipment:'CUP-CHW-1', site:'Demo Site B', faultName:'Differential pressure not at setpoint',      sevNorm:7, sumDur:255,  faultActive:88 },
  { id:4,  equipment:'VAV-L1-05', site:'Demo Site A', faultName:'Faulty reheat coil — SAT 88°F',   sevNorm:6, sumDur:72,   faultActive:50 },
  { id:5,  equipment:'AHU-2',     site:'Demo Site B', faultName:'OA damper not responding to setpoint',       sevNorm:5, sumDur:167,  faultActive:58 },
  { id:6,  equipment:'VAV-L2-04', site:'Demo Site B', faultName:'Leaking reheat valve',                       sevNorm:4, sumDur:64,   faultActive:22 },
  { id:7,  equipment:'AHU-2',     site:'Demo Site A', faultName:'Discharge air temp elevated',                sevNorm:3, sumDur:42,   faultActive:15 },
  { id:8,  equipment:'VAV-L1-01', site:'Demo Site A', faultName:'Zone temp above setpoint >2h occupied',      sevNorm:5, sumDur:61,   faultActive:21 },
  { id:9,  equipment:'AHU-3',     site:'Demo Site B', faultName:'Supply air temp sensor drift',               sevNorm:2, sumDur:223,  faultActive:77 },
  { id:10, equipment:'AHU-1',     site:'Demo Site A', faultName:'VFD speed oscillation >15%',                 sevNorm:2, sumDur:193,  faultActive:67 },
  { id:11, equipment:'VAV-L2-06', site:'Demo Site B', faultName:'Damper at minimum — low airflow',       sevNorm:4, sumDur:24,   faultActive:8 },
  { id:12, equipment:'CUP-HW-1',  site:'Demo Site B', faultName:'HW supply temp below setpoint',              sevNorm:1, sumDur:340,  faultActive:47 },
];

var FL_COLS = ['faultName', 'equipment', 'site', 'sumDur', 'sevNorm', 'faultActive'];
var FL_LABELS = { faultName:'Fault Name', equipment:'Equipment', site:'Site', sumDur:'Duration (hours)', sevNorm:'Severity', faultActive:'Fault Active %' };

var FL_CONDITIONS = [
  { id: 'sevHigh',  label: 'Severity ≥ 7',  test: function (r) { return typeof r.sevNorm === 'number' && r.sevNorm >= 7; }, color: '#FEE2E2', activeColor: '#DC2626', activeText: '#fff',
    tip: 'Faults with normalized severity 7 or higher' },
  { id: 'sevMed',   label: 'Severity 4–6',  test: function (r) { return typeof r.sevNorm === 'number' && r.sevNorm >= 4 && r.sevNorm <= 6; }, color: '#FEF3C7', activeColor: '#D97706', activeText: '#fff',
    tip: 'Faults with normalized severity between 4 and 6' },
  { id: 'pctHigh',  label: '% ≥ 75',        test: function (r) { return typeof r.faultActive === 'number' && r.faultActive >= 75; }, color: '#FEE2E2', activeColor: '#DC2626', activeText: '#fff',
    tip: 'Faults active for at least 75% of the report period' },
  { id: 'isNew',    label: 'New',           test: function (r) { return !!r._isNew; },  color: '#DBEAFE', activeColor: '#2563EB', activeText: '#fff',
    tip: 'Not present in the previous report period (the same-length window immediately before the current date range)' },
  { id: 'recent',   label: 'Recent',        test: function (r) { return !!r._recent; }, color: '#DBEAFE', activeColor: '#2563EB', activeText: '#fff',
    tip: 'At least 75% of this fault\'s hours occurred within the last 2 weeks' },
];

// Same-length window immediately before the current range — matches the
// Fault Summaries "Change from Last Report" convention.
function _flPrevDateArg(ctx) {
  if (!ctx.datesStart || !ctx.datesEnd) return null;
  var s = new Date(ctx.datesStart + 'T00:00:00');
  var e = new Date(ctx.datesEnd + 'T00:00:00');
  if (isNaN(s) || isNaN(e)) return null;
  var spanMs = e.getTime() - s.getTime();
  var prevEnd = new Date(s.getTime() - 86400000); // day before start
  var prevStart = new Date(prevEnd.getTime() - spanMs);
  function fmt(d) {
    return d.getFullYear() + '-' +
      (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' +
      (d.getDate() < 10 ? '0' : '') + d.getDate();
  }
  return fmt(prevStart) + '..' + fmt(prevEnd);
}

function _flFormatHours(v) {
  if (typeof v === 'number') return v.toFixed(0) + 'h';
  if (typeof v === 'string') {
    var n = parseFloat(v);
    if (!isNaN(n)) return n.toFixed(0) + 'h';
  }
  return v !== null && v !== undefined ? String(v) : '—';
}

function _flSevClass(v) {
  if (typeof v !== 'number') return '';
  if (v >= 8) return ' tu-cf-hot';
  if (v >= 5) return ' tu-cf-warm';
  return '';
}

function _flPctClass(v) {
  if (typeof v !== 'number') return '';
  if (v >= 75) return ' tu-cf-hot';
  if (v >= 50) return ' tu-cf-warm';
  return '';
}


window.mbcxDashboard.components.FaultList = {

  _state: null,
  onFaultClick: null,

  render: function () {
    return [
      '<div class="equip-section" id="mbcxFaultListSection">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--imeg-red-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9B2335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
      '          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      '        </svg>',
      '      </div>',
      '      <div><div class="equip-title">MBCx Fault List</div><div class="equip-meta" id="flMeta">Active faults</div></div>',
      '    </div>',
      '  </div>',
      '  <div class="equip-body">',

      /* KPI strip */
      '    <div class="tu-kpi-strip fl-kpi-strip">',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Equipment Monitored</div><div class="tu-kpi-val" id="flKpiEquip">&mdash;</div><div class="tu-kpi-unit">sparking</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Total Faults</div><div class="tu-kpi-val" id="flKpiTotal">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Month Hours</div><div class="tu-kpi-val" id="flKpiHours">&mdash;</div><div class="tu-kpi-unit">hours</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Avg Severity</div><div class="tu-kpi-val" id="flKpiAvgSev">&mdash;</div><div class="tu-kpi-unit">of 10</div></div>',
      '      <div class="tu-kpi"><div class="tu-kpi-label">Max Severity</div><div class="tu-kpi-val" id="flKpiMaxSev">&mdash;</div><div class="tu-kpi-unit">of 10</div></div>',
      '    </div>',

      /* Filter bar */
      '    <div class="tu-filter-bar">',
      '      <input class="tu-filter-input" id="flFilterInput" type="text" placeholder="Filter faults…" autocomplete="off" />',
      '      <span class="tu-filter-count" id="flFilterCount"></span>',
      '    </div>',

      /* Fault table */
      '    <div class="tu-table-scroll">',
      '      <table class="tu-table fl-table">',
      '        <thead id="flThead"></thead>',
      '        <tbody id="flTbody"></tbody>',
      '      </table>',
      '    </div>',

      '  </div>',
      '</div>'
    ].join('\n');
  },

  renderPage: function () {
    return [
      '<div class="fl-page">',
      '  <div class="fl-page-header">',
      '    <div class="fl-page-title">MBCx Fault List</div>',
      '    <div class="fl-page-meta" id="flMeta">Active faults</div>',
      '    <button class="fl-copy-btn" id="flCopyBtn" title="Copy table to clipboard (paste into Excel/Sheets)">',
      '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
      '      Copy List',
      '    </button>',
      '  </div>',

      '  <div class="tu-kpi-strip fl-kpi-strip">',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Equipment Monitored</div><div class="tu-kpi-val" id="flKpiEquip">&mdash;</div><div class="tu-kpi-unit">sparking</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Total Faults</div><div class="tu-kpi-val" id="flKpiTotal">&mdash;</div><div class="tu-kpi-unit">faults</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Month Hours</div><div class="tu-kpi-val" id="flKpiHours">&mdash;</div><div class="tu-kpi-unit">hours</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Avg Severity</div><div class="tu-kpi-val" id="flKpiAvgSev">&mdash;</div><div class="tu-kpi-unit">of 10</div></div>',
      '    <div class="tu-kpi"><div class="tu-kpi-label">Max Severity</div><div class="tu-kpi-val" id="flKpiMaxSev">&mdash;</div><div class="tu-kpi-unit">of 10</div></div>',
      '  </div>',

      '  <div class="tu-filter-bar">',
      '    <input class="tu-filter-input" id="flFilterInput" type="text" placeholder="Filter faults…" autocomplete="off" />',
      '    <span class="tu-filter-count" id="flFilterCount"></span>',
      '  </div>',

      '  <div class="tu-table-scroll">',
      '    <table class="tu-table fl-table">',
      '      <thead id="flThead"></thead>',
      '      <tbody id="flTbody"></tbody>',
      '    </table>',
      '  </div>',
      '</div>'
    ].join('\n');
  },

  _copyTable: function (container) {
    if (!this._state || !this._state.rows) return;
    var headers = FL_COLS.map(function (k) { return FL_LABELS[k]; });
    var rows = this._state.rows.map(function (r) {
      return FL_COLS.map(function (k) {
        var v = r[k];
        if (v === null || v === undefined || v === '') return '';
        if (k === 'faultActive') { var n = parseFloat(v); return isNaN(n) ? v : n.toFixed(1) + '%'; }
        if (k === 'sumDur')      { var n2 = parseFloat(v); return isNaN(n2) ? v : n2.toFixed(0); }
        return String(v);
      });
    });
    var tsv = [headers].concat(rows).map(function (row) { return row.join('\t'); }).join('\n');
    navigator.clipboard.writeText(tsv).then(function () {
      var btn = container.querySelector('#flCopyBtn');
      if (btn) { btn.textContent = '✓ Copied!'; setTimeout(function () { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy List'; }, 2000); }
    }).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = tsv; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    });
  },

  initLive: function (container, ctx) {
    var self = this;

    var copyBtn = container.querySelector('#flCopyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () { self._copyTable(container); });

    // Wire filter input regardless of data source
    var filterInput = container.querySelector('#flFilterInput');
    if (filterInput) {
      filterInput.addEventListener('input', function () {
        if (self._state) { self._state.filter = filterInput.value; self._rebuildTbody(container); }
      });
    }

    if (ctx && ctx.attestKey && (ctx.siteRef || (ctx.siteRefs && ctx.siteRefs.length))) {
      // Loading state
      var tbody = container.querySelector('#flTbody');
      var thead = container.querySelector('#flThead');
      if (thead) thead.innerHTML = '';
      if (tbody) tbody.innerHTML = '<tr><td class="fl-td-loading" style="padding:24px;color:#9CA3AF;font-size:12px;text-align:center;">Loading faults…</td></tr>';
      this._fetchLive(container, ctx);
    } else {
      this._populate(container, FL_DEMO_FAULTS);
    }
  },

  // Annotate rows with:
  //  _isNew   — absent from the previous report period (the same-length
  //             window before the current range, fetched live)
  //  _recent  — the fault's duration mostly just occurred: its trailing
  //             2-week duration is >= 75% of its full-range duration
  _annotateNewRecent: function (rows, recentDur, prevKeys) {
    try {
      if (prevKeys) {
        rows.forEach(function (r) {
          r._isNew = !prevKeys[r.equipment + '::' + r.faultName];
        });
      }
      if (recentDur) {
        rows.forEach(function (r) {
          var d2 = recentDur[r.equipment + '::' + r.faultName];
          if (typeof d2 === 'number' && typeof r.sumDur === 'number' && r.sumDur > 0 &&
              d2 / r.sumDur >= 0.75) {
            r._recent = true;
            r._recentTip = Math.round(d2) + ' of ' + Math.round(r.sumDur) +
              ' fault hours occurred within the last 2 weeks';
          }
        });
      }
    } catch (e) { /* annotation is best-effort */ }
  },

  _populate: function (container, faults) {
    var set = function (id, v) { var el = container.querySelector('#' + id); if (el) el.textContent = v; };
    set('flKpiTotal', faults.length);
    set('flMeta',     faults.length + ' faults');

    var sorted = faults.slice().sort(function (a, b) {
      var an = String(a.faultName || ''), bn = String(b.faultName || '');
      return an.localeCompare(bn);
    });
    this._state = { rows: sorted, sortCol: 'faultName', sortDir: 1, filter: '' };
    this._buildTable(container);

    // Restore the scroll position saved when a fault detail was opened.
    var sc = this._returnScroll;
    if (sc) {
      this._returnScroll = null;
      var scroller = container.querySelector('#mbcxContent') || container;
      requestAnimationFrame(function () { scroller.scrollTop = sc; });
    }
  },

  _fetchLive: function (container, ctx) {
    var self = this;
    var API  = window.mbcxDashboard.api;
    var HP   = window.mbcxDashboard.haystackParser;
    var siteArg = window.mbcxDashboard.siteAxonArg
      ? window.mbcxDashboard.siteAxonArg(ctx)
      : ctx.siteRef;

    console.info('[FaultList] siteArg:', siteArg, '| siteRefs:', JSON.stringify(ctx.siteRefs), '| isAllSites:', ctx.isAllSites);

    var dateArg = (ctx.datesStart && ctx.datesEnd)
      ? ctx.datesStart + '..' + ctx.datesEnd
      : 'today()';

    // Fetch summary info (KPIs)
    var infoAxon = 'view_MBCxRandomInfo_CustomerView_Output(' +
      siteArg + ', ' + dateArg +
      ', 10%, @nav:rule.all, "Fault List", "", "Show All")';
    API.evalAxonVal(ctx.attestKey, ctx.projectName, infoAxon)
      .then(function (val) {
        if (val) self._parseSummary(container, String(val));
      })
      .catch(function (err) {
        console.warn('[FaultList] Summary info fetch failed:', err);
      });

    // Fetch fault list
    var axon = 'view_MBCxReport_CustomerView_Output(' +
      siteArg + ', ' + dateArg +
      ', 10%, @nav:rule.all, "Fault List", "", "Show All")';
    console.info('[FaultList] axon query:', axon);

    // Trailing 2-week window — used to flag "recent" faults (faults whose
    // duration mostly just occurred). Only fetched when the report window
    // is meaningfully longer than the slice.
    function isoDaysAgo(n) {
      var d = new Date(); d.setDate(d.getDate() - n);
      return d.toISOString().slice(0, 10);
    }
    var rangeStart = Date.parse(String(ctx.datesStart || '').slice(0, 10));
    var wantRecent = !isNaN(rangeStart) && (Date.now() - rangeStart) > 21 * 86400000;
    var recentPromise = wantRecent
      ? API.evalAxon(ctx.attestKey, ctx.projectName,
          'view_MBCxReport_CustomerView_Output(' + siteArg + ', ' +
          isoDaysAgo(13) + '..' + isoDaysAgo(0) +
          ', 10%, @nav:rule.all, "Fault List", "", "Show All")')
        .catch(function (err) {
          console.warn('[FaultList] Recent-window fetch failed (Recent flags skipped):', err);
          return null;
        })
      : Promise.resolve(null);

    // Previous report period (same-length window before the current range) —
    // used for "New" flags, matching the Fault Summaries change column.
    var prevDateArg = _flPrevDateArg(ctx);
    var prevPromise = prevDateArg
      ? API.evalAxon(ctx.attestKey, ctx.projectName,
          'view_MBCxReport_CustomerView_Output(' + siteArg + ', ' + prevDateArg +
          ', 10%, @nav:rule.all, "Fault List", "", "Show All")')
        .catch(function (err) {
          console.warn('[FaultList] Previous-period fetch failed (New flags skipped):', err);
          return null;
        })
      : Promise.resolve(null);

    Promise.all([API.evalAxon(ctx.attestKey, ctx.projectName, axon), recentPromise, prevPromise])
      .then(function (results) {
        var parsed = HP.parseGrid(results[0]);
        console.info('[FaultList] grid cols:', JSON.stringify(parsed.cols));
        if (parsed.rows[0]) console.info('[FaultList] first row full:', JSON.stringify(parsed.rows[0]));
        if (!parsed.rows.length) {
          var tbody = container.querySelector('#flTbody');
          if (tbody) tbody.innerHTML = '<tr><td style="padding:24px;color:#9CA3AF;font-size:12px;text-align:center;">No faults returned for this site and date range.</td></tr>';
          return;
        }
        var rows = self._mapLiveRows(parsed.rows, parsed.cols);
        var recentDur = null;
        if (results[1]) {
          recentDur = {};
          var rparsed = HP.parseGrid(results[1]);
          self._mapLiveRows(rparsed.rows, rparsed.cols).forEach(function (r) {
            if (typeof r.sumDur === 'number') {
              recentDur[r.equipment + '::' + r.faultName] = r.sumDur;
            }
          });
        }
        var prevKeys = null;
        if (results[2]) {
          var pparsed = HP.parseGrid(results[2]);
          prevKeys = {};
          self._mapLiveRows(pparsed.rows, pparsed.cols).forEach(function (r) {
            prevKeys[r.equipment + '::' + r.faultName] = true;
          });
        }
        self._annotateNewRecent(rows, recentDur, prevKeys);
        self._populate(container, rows);
      })
      .catch(function (err) {
        console.error('[FaultList] Live fetch failed:', err);
        var tbody = container.querySelector('#flTbody');
        if (tbody) tbody.innerHTML = '<tr><td style="padding:24px;color:#9B2335;font-size:12px;text-align:center;">Failed to load faults — ' + (err && err.message ? err.message : 'see console') + '</td></tr>';
      });
  },

  _parseSummary: function (container, text) {
    var set = function (id, v) { var el = container.querySelector('#' + id); if (el) el.textContent = v; };
    function extract(label) {
      var re = new RegExp(label + '\\s*:\\s*(\\S+)', 'i');
      var m = text.match(re);
      return m ? m[1] : null;
    }

    var equip   = extract('Equipment Sparking');
    var total   = extract('Total Faults');
    var hours   = extract('Month Hours');
    var avgSev  = extract('Average Severity');
    var maxSev  = extract('Maximum Severity');

    if (equip)  set('flKpiEquip',  equip);
    if (total)  set('flKpiTotal',  total);
    if (hours)  set('flKpiHours',  hours);
    if (avgSev) set('flKpiAvgSev', avgSev);
    if (maxSev) set('flKpiMaxSev', maxSev);

    var meta = [];
    if (total) meta.push(total + ' faults');
    if (equip) meta.push(equip + ' equipment');
    set('flMeta', meta.join(' · ') || 'Active faults');
  },

  _mapLiveRows: function (rows, cols) {
    return rows.map(function (r, i) {
      function numVal(col) {
        var v = r[col];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && v._kind === 'number') return v.val;
        if (typeof v === 'number') return v;
        var n = parseFloat(v);
        return isNaN(n) ? v : n;
      }
      function strVal(col) {
        var v = r[col];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && v.dis) return v.dis;
        if (typeof v === 'object' && v.val !== undefined) return v.val;
        return String(v);
      }

      var siteDisVal = '';
      try {
        var _idObj = r.id;
        if (_idObj && _idObj.siteRef && _idObj.siteRef.dis) siteDisVal = _idObj.siteRef.dis;
      } catch (e) {}
      if (!siteDisVal) siteDisVal = strVal('siteRef');

      return {
        id:            i,
        equipment:     strVal('equipment'),
        faultName:     strVal('faultName'),
        site:          siteDisVal,
        sevNorm:       numVal('sevNorm'),
        sumDur:        numVal('sumDur'),
        faultActive:   numVal('faultActive'),
        descriptionofFault: strVal('descriptionofFault'),
        recommendedActions: strVal('recommendedActions'),
        sparksLink:    strVal('sparksLink'),
        importanceFactor: strVal('importanceFactor'),
        energyScore:   numVal('energyScore'),
        _raw:          r
      };
    });
  },

  _buildTable: function (container) {
    var self = this;
    this._state.activeConditions = {};

    // Condition filter chips
    var condCounts = {};
    var stateRows = this._state.rows;
    FL_CONDITIONS.forEach(function (c) {
      condCounts[c.id] = stateRows.filter(c.test).length;
    });
    var chipHtml = FL_CONDITIONS.map(function (c) {
      if (!condCounts[c.id]) return '';
      return '<button class="tu-cond-chip" data-cond="' + c.id + '"'
        + (c.tip ? ' title="' + c.tip + '"' : '')
        + ' data-color="' + c.color + '" data-active-color="' + c.activeColor + '" data-active-text="' + c.activeText + '"'
        + ' style="background:' + c.color + ';">'
        + c.label + '<span class="tu-cond-count">' + condCounts[c.id] + '</span></button>';
    }).filter(Boolean).join('');

    var condBar = container.querySelector('#flCondBar');
    if (!condBar) {
      var filterBar = container.querySelector('#flFilterInput');
      if (filterBar && filterBar.parentNode && chipHtml) {
        var bar = document.createElement('div');
        bar.className = 'tu-cond-bar';
        bar.id = 'flCondBar';
        bar.innerHTML = chipHtml;
        filterBar.parentNode.parentNode.insertBefore(bar, filterBar.parentNode);
      }
    }

    var condBarEl = container.querySelector('#flCondBar');
    if (condBarEl) {
      condBarEl.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-cond]');
        if (!chip) return;
        var id = chip.getAttribute('data-cond');
        var active = self._state.activeConditions;
        if (active[id]) {
          delete active[id];
          chip.classList.remove('tu-cond-chip--on');
          chip.style.background = chip.getAttribute('data-color');
          chip.style.color = '';
        } else {
          active[id] = true;
          chip.classList.add('tu-cond-chip--on');
          chip.style.background = chip.getAttribute('data-active-color');
          chip.style.color = chip.getAttribute('data-active-text');
        }
        self._rebuildTbody(container);
      });
    }

    var thead = container.querySelector('#flThead');
    if (!thead) return;

    thead.innerHTML = '<tr>' + FL_COLS.map(function(k){
      return '<th class="tu-th tu-th-sort fl-th" data-col="' + k + '">' + FL_LABELS[k] + '<span class="tu-sort-ind" data-col="' + k + '"></span></th>';
    }).join('') + '<th class="tu-th fl-th-act" title="Meeting Agenda"></th></tr>';

    thead.querySelectorAll('.tu-th-sort').forEach(function(th){
      th.addEventListener('click', function(){
        var col = th.getAttribute('data-col');
        if (self._state.sortCol === col) { self._state.sortDir *= -1; }
        else { self._state.sortCol = col; self._state.sortDir = 1; }
        self._rebuildTbody(container);
      });
    });

    this._rebuildTbody(container);

    var tbody = container.querySelector('#flTbody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        // Agenda dropdown item — add fault and update button
        var ddItem = e.target.closest('.fd-agenda-dd-item');
        if (ddItem) {
          var dd = ddItem.closest('.fl-agenda-dd');
          var fid3 = dd ? parseInt(dd.getAttribute('data-fid'), 10) : NaN;
          var row3 = self._state && self._state.rows
            ? self._state.rows.filter(function (f) { return f.id === fid3; })[0]
            : null;
          if (row3 && window.mbcxDashboard) {
            var action3 = ddItem.getAttribute('data-action');
            if (action3 === 'queue' && window.mbcxDashboard.queue) {
              window.mbcxDashboard.queue.add(row3);
              var btn3q = dd.parentElement.querySelector('.fl-agenda-btn');
              if (btn3q) { btn3q.textContent = 'Q'; btn3q.title = 'In Queue — click to remove'; btn3q.classList.add('fl-agenda-btn-queued'); }
            } else if (window.mbcxDashboard.meeting) {
              window.mbcxDashboard.meeting.add(row3);
              var btn3 = dd.parentElement.querySelector('.fl-agenda-btn');
              if (btn3) { btn3.textContent = '✓'; btn3.title = 'Remove from Meeting Agenda'; btn3.classList.add('fl-agenda-btn-in'); }
            }
            dd.style.display = 'none';
          }
          return;
        }

        // Agenda button — toggle or show dropdown
        var agendaBtn = e.target.closest('.fl-agenda-btn');
        if (agendaBtn) {
          var fid2 = parseInt(agendaBtn.getAttribute('data-fid'), 10);
          var row2 = self._state && self._state.rows
            ? self._state.rows.filter(function (f) { return f.id === fid2; })[0]
            : null;
          if (row2 && window.mbcxDashboard) {
            var mtg = window.mbcxDashboard.meeting;
            var qu = window.mbcxDashboard.queue;
            if (mtg && mtg.has(fid2)) {
              mtg.remove(fid2);
              agendaBtn.textContent = '+';
              agendaBtn.title = 'Add to Meeting Agenda';
              agendaBtn.classList.remove('fl-agenda-btn-in');
            } else if (qu && qu.has(fid2)) {
              qu.remove(fid2);
              agendaBtn.textContent = '+';
              agendaBtn.title = 'Add to Meeting Agenda';
              agendaBtn.classList.remove('fl-agenda-btn-queued');
            } else if (mtg) {
              var dd2 = agendaBtn.parentElement.querySelector('.fl-agenda-dd');
              if (dd2) {
                e.stopPropagation();
                container.querySelectorAll('.fl-agenda-dd').forEach(function (d) { d.style.display = 'none'; });
                dd2.style.display = 'flex';
                setTimeout(function () {
                  document.addEventListener('click', function _close() {
                    dd2.style.display = 'none';
                    document.removeEventListener('click', _close);
                  });
                }, 0);
              } else {
                mtg.add(row2);
                agendaBtn.textContent = '✓';
                agendaBtn.title = 'Remove from Meeting Agenda';
                agendaBtn.classList.add('fl-agenda-btn-in');
              }
            }
          }
          return;
        }

        var tr = e.target.closest('tr[data-fid]');
        if (!tr || !self.onFaultClick) return;
        var fid = parseInt(tr.getAttribute('data-fid'), 10);
        var row = self._state && self._state.rows
          ? self._state.rows.filter(function (f) { return f.id === fid; })[0]
          : null;
        if (row) self.onFaultClick(row);
      });
    }
  },

  _rebuildTbody: function (container) {
    if (!this._state) return;
    var s = this._state;
    var rows = s.rows;

    // Condition filters
    var activeIds = Object.keys(s.activeConditions || {});
    if (activeIds.length) {
      rows = rows.filter(function (r) {
        return activeIds.some(function (id) {
          var cond = FL_CONDITIONS.filter(function (c) { return c.id === id; })[0];
          return cond && cond.test(r);
        });
      });
    }

    if (s.filter) {
      var q = s.filter.toLowerCase();
      rows = rows.filter(function(r){
        return FL_COLS.some(function(k){ return String(r[k]).toLowerCase().indexOf(q) !== -1; });
      });
    }

    if (s.sortCol) {
      var col = s.sortCol, dir = s.sortDir;
      rows = rows.slice().sort(function(a, b){
        var av = a[col], bv = b[col];
        if (av === null || av === undefined) return dir;
        if (bv === null || bv === undefined) return -dir;
        var an = parseFloat(av), bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    var tbody = container.querySelector('#flTbody');
    if (!tbody) return;
    var lastFid = this._returnFid;
    tbody.innerHTML = rows.map(function(r){
      var inAgenda = !!(window.mbcxDashboard && window.mbcxDashboard.meeting && window.mbcxDashboard.meeting.has(r.id));
      var rowCls = 'fl-row fl-row-clickable' + (r._recent ? ' fl-row-recent' : '') +
        (lastFid !== undefined && lastFid !== null && r.id === lastFid ? ' fl-row-last' : '');
      var rowTitle = r._recentTip ? ' title="' + r._recentTip + '"' : '';
      return '<tr class="' + rowCls + '" data-fid="' + r.id + '"' + rowTitle + '>' +
        FL_COLS.map(function (k) {
          var val = r[k];
          if (val && typeof val === 'object' && val.dis) val = val.dis;
          var cls = k === 'equipment' ? 'tu-td tu-td-name' : k === 'faultName' ? 'tu-td fl-td-fault' : 'tu-td';
          var cf = '';
          var display = val;

          if (k === 'sevNorm') cf = _flSevClass(typeof val === 'number' ? val : parseFloat(val));
          if (k === 'faultActive') {
            var pctNum = typeof val === 'number' ? val : parseFloat(val);
            cf = _flPctClass(pctNum);
            if (!isNaN(pctNum)) display = pctNum.toFixed(1) + '%';
          }
          if (k === 'sumDur') display = _flFormatHours(val);

          var cellHtml = (display !== null && display !== undefined && display !== '' ? display : '—');
          if (k === 'faultName' && r._isNew) {
            cellHtml += ' <span class="fl-new-badge" title="Not present in the previous report period">New</span>';
          }
          return '<td class="' + cls + cf + '">' + cellHtml + '</td>';
        }).join('') +
        '<td class="tu-td fl-td-act"><div class="fl-agenda-cell">' +
          (function () {
            var inQ = window.mbcxDashboard && window.mbcxDashboard.queue && window.mbcxDashboard.queue.has(r.id);
            if (inAgenda) return '<button class="fl-agenda-btn fl-agenda-btn-in" data-fid="' + r.id + '" title="Remove from Meeting Agenda">&#10003;</button>';
            if (inQ) return '<button class="fl-agenda-btn fl-agenda-btn-queued" data-fid="' + r.id + '" title="In Queue — click to remove">Q</button>';
            return '<button class="fl-agenda-btn" data-fid="' + r.id + '" title="Add to Meeting Agenda">+</button>' +
              '<div class="fl-agenda-dd" data-fid="' + r.id + '" style="display:none"><button class="fd-agenda-dd-item" data-action="queue">Queue</button><button class="fd-agenda-dd-item" data-action="existing">Current Agenda</button></div>';
          })() +
          '</div></td>' +
        '</tr>';
    }).join('');

    /* Sort indicators */
    container.querySelectorAll('#flThead .tu-sort-ind').forEach(function(ind){
      var col = ind.getAttribute('data-col');
      ind.textContent = s.sortCol === col ? (s.sortDir === 1 ? ' ▲' : ' ▼') : '';
    });

    var countEl = container.querySelector('#flFilterCount');
    if (countEl) countEl.textContent = rows.length + ' / ' + s.rows.length + ' faults';
  }
};
