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

      if (typeof val.toAxon === 'function') {
        var ax = val.toAxon();
        // Resolve nav: URI refs (@nav:site.site.<base64>) → bare @ref
        ax = _resolveNavRef(ax);
        return ax;
      }

      var s;
      try { s = typeof val.toStr === 'function' ? val.toStr() : String(val); }
      catch (e) { s = String(val); }

      // Bracket-wrapped Ref: [id:display] or [id]
      if (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']') {
        var inner = s.slice(1, -1);
        if (inner.indexOf(',') !== -1) {
          // List of refs
          var parts = inner.split(',').map(function (p) {
            p = p.trim();
            return p.charAt(0) === '@' ? p : '@' + p;
          });
          return '[' + parts.join(', ') + ']';
        }
        return '@' + inner;
      }

      // Fantom DateSpan comma form: 2026-02-01,2026-03-01 → 2026-02-01..2026-03-01
      if (/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/.test(s)) {
        return s.replace(',', '..');
      }
      // Month span: 2026-01,2026-03 (no day)
      if (/^\d{4}-\d{2},\d{4}-\d{2}$/.test(s)) {
        return s.replace(',', '..');
      }

      // Bare ref id (e.g. p:proj:r:xxx)
      if (/^p:[^,\s]+$/.test(s)) return '@' + s;

      return s;
    } catch (e) { /* var not set */ }
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
    // e.g. "2025-01-01..2025-01-31" → "2025-01-01 – 2025-01-31"
    return datesAxon.replace('..', ' – ');
  }

  // ── "No site" prompt ─────────────────────────────────────────────────────────
  function renderNoSite(container, attestKey, siteRef, dates) {
    var missing = [];
    if (!attestKey) missing.push('SkySpark session');
    if (!siteRef)   missing.push('site (view variable)');
    if (!dates)     missing.push('dates (view variable)');

    container.innerHTML = [
      '<div class="ma-no-site">',
      '  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a8a7a1" stroke-width="1.5" stroke-linecap="round">',
      '    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      '  </svg>',
      '  <div class="ma-no-site-title">No Site Selected</div>',
      '  <div class="ma-no-site-body">',
      '    Configure a site and date range in the view properties to load the Meter Allocation dashboard.',
      '  </div>',
      '  <div class="ma-no-site-hint">',
      '    View Properties &rarr; Variables &rarr; <code>site</code> and <code>dates</code>',
      '  </div>',
      missing.length ? '<div class="ma-no-site-missing">Missing: ' + missing.join(', ') + '</div>' : '',
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
    var dates   = tryReadVar(view, 'dates') || (parentView && tryReadVar(parentView, 'dates'));

    console.log('[meterAlloc] siteRef:', siteRef, '| dates:', dates);

    var ctx = {
      siteName:  null,
      dateLabel: _dateLabel(dates)
    };

    // ── Fetch live data or use demo ──────────────────────────────────────────
    if (attestKey && projectName && siteRef && dates) {
      var gen = ++_fetchGen;
      container.innerHTML = '<div style="padding:2rem;color:#888">Loading…</div>';

      NS.evals.loadAllUtilities(attestKey, projectName, siteRef, dates)
        .then(function (allData) {
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
      // Session present but vars missing — show prompt
      renderNoSite(container, attestKey, siteRef, dates);
    } else {
      // No session — render demo data
      console.log('[meterAlloc] no session — using demo data');
      NS.App.init(container, NS.demoData, ctx);
    }
  };

  window.meterAllocationApp = NS;
  console.log('[meterAlloc] UI module ready. window.meterAllocationApp exposed.');
})(window.meterAllocation);
