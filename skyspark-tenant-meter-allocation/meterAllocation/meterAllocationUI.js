// meterAllocationUI.js
// Bootstrap module — loads CSS, reads SkySpark session variables, fetches live
// data for all three utilities, then hands off to App.js for rendering.
window.meterAllocation = window.meterAllocation || {};

(function (NS) {
  var CSS_ID   = 'meterAllocationCSS';
  var CSS_PATH = '/pub/ui/meterAllocation/meterAllocationStyles.css';

  // Discard stale in-flight fetches when the view refreshes
  var _fetchGen = 0;

  // ── Load stylesheet (idempotent) ─────────────────────────────────────────────
  function loadStyles() {
    if (document.getElementById(CSS_ID)) return;
    var link  = document.createElement('link');
    link.id   = CSS_ID;
    link.rel  = 'stylesheet';
    link.href = CSS_PATH + '?_v=' + Date.now();
    document.head.appendChild(link);
  }

  // ── Read a SkySpark view variable as an Axon string ──────────────────────────
  // Handles Refs, DateSpans, Dates, raw strings, and nav: URI forms.
  function tryReadVar(view, varName) {
    try {
      var val = view.var(varName);
      if (val == null) return null;

      // 1. Try toAxon() — most reliable for Refs
      if (typeof val.toAxon === 'function') {
        try {
          var ax = val.toAxon();
          console.log('[meterAlloc] ' + varName + ' toAxon()=', ax);
          if (ax) {
            ax = _resolveNavRef(ax);
            // If this is a date-like result from toAxon(), normalise it
            var axNorm = _normDateStr(ax);
            if (axNorm) return axNorm;
            // Otherwise treat as ref / other literal
            if (ax) return ax;
          }
        } catch (e2) { /* fall through */ }
      }

      // 2. Try .start / .end properties (Fantom DateSpan object)
      try {
        if (val.start != null && val.end != null) {
          var st = typeof val.start.toStr === 'function' ? val.start.toStr() : String(val.start);
          var en = typeof val.end.toStr   === 'function' ? val.end.toStr()   : String(val.end);
          console.log('[meterAlloc] ' + varName + ' .start=', st, '.end=', en);
          if (st && en) {
            // Trim to YYYY-MM-DD if time component present
            st = st.replace(/T.*$/, '');
            en = en.replace(/T.*$/, '');
            if (/^\d{4}-\d{2}-\d{2}$/.test(st) && /^\d{4}-\d{2}-\d{2}$/.test(en)) {
              return st + '..' + en;
            }
          }
        }
      } catch (e3) { /* fall through */ }

      // 3. Try toStr() / String() and normalise the result
      var s;
      try { s = typeof val.toStr === 'function' ? val.toStr() : String(val); }
      catch (e) { try { s = String(val); } catch (e4) { s = ''; } }
      console.log('[meterAlloc] ' + varName + ' toStr()=', s);

      if (!s) return null;

      // Bracket-wrapped Ref: [id:display] or [id]
      if (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']') {
        var inner = s.slice(1, -1);
        if (inner.indexOf(',') !== -1) {
          var parts = inner.split(',').map(function (p) {
            p = p.trim();
            return p.charAt(0) === '@' ? p : '@' + p;
          });
          return '[' + parts.join(', ') + ']';
        }
        return '@' + inner;
      }

      // Date patterns
      var dateNorm = _normDateStr(s);
      if (dateNorm) return dateNorm;

      // Bare ref id (e.g. p:proj:r:xxx)
      if (/^p:[^,\s]+$/.test(s)) return '@' + s;

      return s || null;
    } catch (e) {
      console.log('[meterAlloc] tryReadVar(' + varName + ') error:', e.message || e);
    }
    return null;
  }

  // Normalise a string that might represent a date / DateSpan into Axon form.
  // Returns the normalised string, or null if it doesn't look like a date.
  function _normDateStr(s) {
    if (!s) return null;
    // Full date range with .. separator: 2026-02-01..2026-04-30
    if (/^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Full date range with comma: 2026-02-01,2026-04-30
    if (/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(',', '..');
    // Single date: 2026-02-01
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Month span with ..: 2026-01..2026-03
    if (/^\d{4}-\d{2}\.\.\d{4}-\d{2}$/.test(s)) return s;
    // Month span with comma: 2026-01,2026-03
    if (/^\d{4}-\d{2},\d{4}-\d{2}$/.test(s)) return s.replace(',', '..');
    // Single month: 2026-04
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    return null;
  }

  // nav:site.site.<base64> → decoded @ref string
  function _resolveNavRef(axon) {
    var m = axon && axon.match(/^@nav:[^.]+\.[^.]+\.(.+)$/);
    if (!m) return axon;
    try {
      var decoded = atob(m[1]);
      var refM = decoded.match(/@[a-zA-Z0-9:._\-]+/);
      if (refM) return refM[0];
    } catch (e) { /* atob failed */ }
    return axon;
  }

  // Build a human-readable date label from the Axon date expression
  function _dateLabel(datesAxon) {
    if (!datesAxon) return '';
    var SPAN_LABELS = {
      pastDay: 'Past Day', today: 'Today', yesterday: 'Yesterday',
      pastWeek: 'Past Week', thisWeek: 'This Week', lastWeek: 'Last Week',
      pastMonth: 'Past Month', thisMonth: 'This Month', lastMonth: 'Last Month',
      pastYear: 'Past Year', thisYear: 'This Year', lastYear: 'Last Year'
    };
    if (SPAN_LABELS[datesAxon]) return SPAN_LABELS[datesAxon];
    return datesAxon.replace('..', ' – ');
  }

  // ── "No site" prompt — only shown when site ref itself is missing ────────────
  function renderNoSite(container) {
    container.innerHTML = [
      '<div class="ma-no-site">',
      '  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a8a7a1" stroke-width="1.5" stroke-linecap="round">',
      '    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      '  </svg>',
      '  <div class="ma-no-site-title">No Site Selected</div>',
      '  <div class="ma-no-site-body">',
      '    Use the Site Selector above to choose a site.',
      '  </div>',
      '  <div class="ma-no-site-hint">',
      '    The date range will default to the current month if not yet set.',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // ── onUpdate — called by the entry handler on every view refresh ─────────────
  NS.onUpdate = function (arg) {
    var view = arg.view;
    var elem = arg.elem;
    view.removeAll();
    loadStyles();

    elem.style.width    = '100%';
    elem.style.height   = '100%';
    elem.style.overflow = 'auto';

    var container = document.createElement('div');
    container.id = 'meterAllocationRoot';
    elem.appendChild(container);

    // ── Session ──────────────────────────────────────────────────────────────
    var attestKey = null, projectName = null;
    try {
      var session = view.session();
      attestKey   = session.attestKey();
      projectName = session.proj().name();
      console.log('[meterAlloc] session OK, project:', projectName);
    } catch (e) {
      console.log('[meterAlloc] no session:', e.message || e);
    }

    // ── View variables ────────────────────────────────────────────────────────
    var parentView = null;
    try { parentView = view.parent(); } catch (e) {}

    var siteRef = tryReadVar(view, 'site') || (parentView && tryReadVar(parentView, 'site'));
    // dateRange is declared as kind:Span in the view definition
    var dates   = tryReadVar(view, 'dateRange');

    // Fall back to the view's default (pastWeek) when dateRange hasn't been set yet.
    var datesExpr = dates || 'pastWeek';

    console.log('[meterAlloc] siteRef:', siteRef, '| dates:', dates, '| datesExpr:', datesExpr);

    var ctx = {
      siteName:  null,
      dateLabel: _dateLabel(datesExpr)
    };

    // ── Fetch live data or use demo ──────────────────────────────────────────
    if (attestKey && projectName && siteRef) {
      var gen = ++_fetchGen;
      container.innerHTML = '<div style="padding:2rem;color:#888">Loading…</div>';

      Promise.all([
        NS.evals.loadAllUtilities(attestKey, projectName, siteRef, datesExpr),
        NS.evals.loadAllSummaryUtilities(attestKey, projectName, siteRef, datesExpr),
        NS.evals.loadAllTenantTotals(attestKey, projectName, siteRef, datesExpr),
        NS.evals.loadAllResidentialTotals(attestKey, projectName, siteRef, datesExpr)
      ]).then(function (results) {
          var allData       = results[0];
          allData._summary      = results[1];
          allData._tenantTotals = results[2];
          var resTotals         = results[3];

          // Replace residential row in _tenantTotals for Cooling & Heating with
          // the authoritative value from report_meterValidation_residentialMeterTotal.
          ['Cooling', 'Heating'].forEach(function (u) {
            var resVal = resTotals && resTotals[u];
            if (resVal == null) return;
            var rows = allData._tenantTotals[u] || [];
            var replaced = false;
            rows.forEach(function (r) {
              if (r.tenantName && r.tenantName.toLowerCase().indexOf('residential') !== -1) {
                r.usage     = resVal.val;
                r.usageUnit = resVal.unit;
                replaced = true;
              }
            });
            if (!replaced) {
              rows.push({ tenantName: 'Residential', usage: resVal.val, usageUnit: resVal.unit });
              allData._tenantTotals[u] = rows;
            }
          });

          if (gen !== _fetchGen) return;
          container.innerHTML = '';
          NS.App.init(container, allData, ctx);

          // Resolve site display name in background
          NS.api.evalAxon('readById(' + siteRef + ').dis', attestKey, projectName)
            .then(function (grid) {
              var g = NS.api.unwrapGrid(grid);
              if (g && g.rows && g.rows.length) {
                var row = g.rows[0];
                var key = Object.keys(row)[0];
                var name = typeof row[key] === 'string' ? row[key] : (row[key] && row[key].val ? row[key].val : null);
                if (name) NS.App.updateSiteName(name);
              }
            })
            .catch(function () {});
        })
        .catch(function (err) {
          if (gen !== _fetchGen) return;
          console.error('[meterAlloc] load error:', err);
          container.innerHTML = '';
          var msg = document.createElement('div');
          msg.style.cssText = 'padding:1rem 1.5rem;color:#b91c1c;background:#fef2f2;border-radius:6px;margin:1rem;font-size:0.85rem';
          msg.textContent = 'Data load error: ' + (err.message || String(err));
          container.appendChild(msg);
        });
    } else if (attestKey && projectName) {
      // Session present but site not selected — show prompt
      renderNoSite(container);
    } else {
      // No session — render demo data
      console.log('[meterAlloc] no session — using demo data');
      NS.App.init(container, NS.demoData, ctx);
    }
  };

  window.meterAllocationApp = NS;
  console.log('[meterAlloc] UI module ready. window.meterAllocationApp exposed.');
})(window.meterAllocation);
