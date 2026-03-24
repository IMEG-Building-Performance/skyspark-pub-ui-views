// reheatDashboardUI.js
// UI module — loads CSS, reads SkySpark variables, fetches live data,
// falls back to demo data, and initializes the app.
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
    link.href = CSS_PATH;
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
      // Fantom Ref display: [nav:equip.all] → @nav:equip.all
      if (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']') {
        return '@' + s.slice(1, -1);
      }
      // Fantom Ref bare ID: nav:equip.all → @nav:equip.all
      if (/^[a-z][a-z0-9]*:[a-z]/i.test(s)) {
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
      console.warn('[reheatDashboard] No SkySpark session — using demo data.');
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
          // Show error then fall back to demo data
          var errEl = document.createElement('div');
          errEl.style.cssText = 'padding:0.5rem 1rem;color:#b91c1c;background:#fef2f2;border-radius:6px;margin-bottom:1rem;font-size:0.85rem';
          errEl.textContent = 'Live data error: ' + err.message + ' — showing demo data.';
          container.appendChild(errEl);
          var inner = document.createElement('div');
          container.appendChild(inner);
          NS.App.init(inner, NS.generateDemoData());
        });
    } else {
      // No session or variables — use demo data
      NS.App.init(container, NS.generateDemoData());
    }
  };

  // Expose under the app global that the entry file delegates to
  window.reheatDashboardApp = NS;
  console.log('[reheatDashboard] UI module ready. window.reheatDashboardApp exposed.');
})(window.reheatDashboard);
