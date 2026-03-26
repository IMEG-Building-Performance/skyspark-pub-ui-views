// reheatDashboardUI.js
// UI module — loads CSS, reads SkySpark variables, fetches live data,
// and initializes the app. Prompts for site selection when variables are missing.
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  var CSS_ID   = 'reheatDashboardCSS';
  var CSS_PATH = '/pub/ui/reheatDashboard/reheatDashboardStyles.css';

  // Generation counter — discard stale in-flight responses
  var _fetchGen = 0;

  // ── Load CSS ──
  function loadStyles() {
    if (document.getElementById(CSS_ID)) return;
    var link  = document.createElement('link');
    link.id   = CSS_ID;
    link.rel  = 'stylesheet';
    link.href = CSS_PATH + '?_v=' + Date.now();
    document.head.appendChild(link);
  }

  /**
   * Read a named VarNode from the SkySpark view.
   * Returns the Axon string representation, or null if not set.
   */
  function tryReadVar(view, varName) {
    try {
      var val = view.var(varName);
      if (val == null) return null;
      if (typeof val.toAxon === 'function') return val.toAxon();
      var s;
      try { s = typeof val.toStr === 'function' ? val.toStr() : String(val); }
      catch (e) { s = String(val); }

      // Bracket-wrapped value: single ref [id:display] or list [ref1, ref2, ...]
      if (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']') {
        var inner = s.slice(1, -1);
        // List of refs (comma-separated) → Axon list [@ref1, @ref2]
        if (inner.indexOf(',') !== -1) {
          var parts = inner.split(',').map(function (p) {
            p = p.trim();
            return p.charAt(0) === '@' ? p : '@' + p;
          });
          return '[' + parts.join(', ') + ']';
        }
        // Single ref
        return '@' + inner;
      }
      // Fantom Ref bare ID: nav:equip.all → @nav:equip.all
      if (/^[a-z][a-z0-9]*:[a-z]/i.test(s)) {
        return '@' + s;
      }
      // Base64-encoded Haystack ref ID (e.g. aWQ6QHA6...) — prefix with @
      if (/^[A-Za-z0-9+/=]{16,}$/.test(s) && !/\s/.test(s)) {
        return '@' + s;
      }
      // Fantom DateSpan comma form: 2026-02-01,2026-03-01 → 2026-02-01..2026-03-01
      if (/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/.test(s)) {
        return s.replace(',', '..');
      }
      return s;
    } catch (e) { /* variable not set */ }
    return null;
  }

  // ── Render "select a site" prompt when variables are missing ──
  function renderSitePrompt(container, attestKey, targets, dates) {
    var missing = [];
    if (!targets) missing.push('targets (site/equip selection)');
    if (!dates)   missing.push('dates (date range)');
    if (!attestKey) missing.push('SkySpark session');

    container.innerHTML = [
      '<div class="page-header">',
      '  <h1>Reheat KPI Scatter Plot</h1>',
      '</div>',
      '<div style="display:flex;align-items:center;justify-content:center;flex:1;padding:3rem 1rem">',
      '  <div style="text-align:center;max-width:420px">',
      '    <svg width="48" height="48" fill="none" stroke="#94a3b8" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:1rem">',
      '      <path d="M3 21V7l9-4 9 4v14"/>',
      '      <path d="M9 21V11h6v10"/>',
      '      <rect x="10" y="13" width="4" height="3" fill="#cbd5e1" stroke="none"/>',
      '    </svg>',
      '    <h2 style="margin:0 0 0.5rem;font-size:1.1rem;color:#334155">No Site Selected</h2>',
      '    <p style="margin:0 0 1rem;color:#64748b;font-size:0.875rem;line-height:1.5">',
      '      Select a site and date range from the navigation panel to load reheat diagnostics.',
      '    </p>',
      '    <div style="color:#94a3b8;font-size:0.8rem">',
      '      Missing: ' + missing.join(', '),
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // ── onUpdate — called by the entry file's handler on each view refresh ──
  NS.onUpdate = function (arg) {
    var view = arg.view;
    var elem = arg.elem;
    view.removeAll();

    loadStyles();

    // Force elem to fill the SkySpark view pane
    elem.style.width  = '100%';
    elem.style.height = '100%';

    // Create scoped container
    var container = document.createElement('div');
    container.id = 'reheatDashboard';
    elem.appendChild(container);

    // ── Session credentials ──
    var session, attestKey, projectName;
    try {
      session     = view.session();
      attestKey   = session.attestKey();
      projectName = session.proj().name();
    } catch (e) {
      console.warn('[reheatDashboard] No SkySpark session.');
      attestKey = null;
    }

    // ── View variables ──
    var parentView = null;
    try { parentView = view.parent(); } catch (e) {}

    var targets = tryReadVar(view, 'targets') || (parentView && tryReadVar(parentView, 'targets'));
    var dates   = tryReadVar(view, 'dates')   || (parentView && tryReadVar(parentView, 'dates'));

    console.log('[reheatDashboard] onUpdate — targets:', targets, '| dates:', dates);

    // ── Fetch live data or fall back to demo ──
    if (attestKey && targets && dates) {
      var gen = ++_fetchGen;

      // Show loading state
      container.innerHTML = '<div style="padding:2rem;color:#888">Loading\u2026</div>';

      NS.evals.loadReheatData(attestKey, projectName, targets, dates)
        .then(function (vavData) {
          if (gen !== _fetchGen) return; // stale — discard
          container.innerHTML = '';
          NS.App.init(container, vavData);
        })
        .catch(function (err) {
          if (gen !== _fetchGen) return;
          console.error('[reheatDashboard] Error:', err);
          container.innerHTML = '';
          var errEl = document.createElement('div');
          errEl.style.cssText = 'padding:0.5rem 1rem;color:#b91c1c;background:#fef2f2;border-radius:6px;margin:1rem;font-size:0.85rem';
          errEl.textContent = 'Data load error: ' + err.message;
          container.appendChild(errEl);
        });
    } else {
      // No session or missing variables — prompt user to select a site
      renderSitePrompt(container, attestKey, targets, dates);
    }
  };

  // Expose under the app global that the entry file delegates to
  window.reheatDashboardApp = NS;
  console.log('[reheatDashboard] UI module ready. window.reheatDashboardApp exposed.');
})(window.reheatDashboard);
