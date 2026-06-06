// ecapChannelManagerUI.js
// Bootstrap module — loads CSS, reads SkySpark session variables,
// then hands off to App.js for rendering.
window.ecapChannelManager = window.ecapChannelManager || {};

(function (NS) {
  var CSS_ID   = 'ecapChannelManagerCSS';
  var CSS_PATH = '/pub/ui/ecapChannelManager/ecapChannelManagerStyles.css';

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
  function tryReadVar(view, varName) {
    try {
      var val = view.var(varName);
      if (val == null) return null;

      if (typeof val.toAxon === 'function') {
        try {
          var ax = val.toAxon();
          console.log('[ecapChannelMgr] ' + varName + ' toAxon()=', ax);
          if (ax) return ax;
        } catch (e2) { /* fall through */ }
      }

      if (val.start != null && val.end != null) {
        try {
          var st = typeof val.start.toStr === 'function' ? val.start.toStr() : String(val.start);
          var en = typeof val.end.toStr   === 'function' ? val.end.toStr()   : String(val.end);
          if (st && en) {
            st = st.replace(/T.*$/, '');
            en = en.replace(/T.*$/, '');
            if (/^\d{4}-\d{2}-\d{2}$/.test(st) && /^\d{4}-\d{2}-\d{2}$/.test(en)) {
              return st + '..' + en;
            }
          }
        } catch (e3) { /* fall through */ }
      }

      var s;
      try { s = typeof val.toStr === 'function' ? val.toStr() : String(val); }
      catch (e) { try { s = String(val); } catch (e4) { s = ''; } }
      console.log('[ecapChannelMgr] ' + varName + ' toStr()=', s);
      return s || null;
    } catch (e) {
      console.log('[ecapChannelMgr] tryReadVar(' + varName + ') error:', e.message || e);
    }
    return null;
  }

  function _dateLabel(datesAxon) {
    if (!datesAxon) return '';
    var SPAN_LABELS = {
      pastDay: 'Past Day', today: 'Today', yesterday: 'Yesterday',
      pastWeek: 'Past Week', thisWeek: 'This Week', lastWeek: 'Last Week',
      pastMonth: 'Past Month', thisMonth: 'This Month', lastMonth: 'Last Month',
      pastYear: 'Past Year', thisYear: 'This Year', lastYear: 'Last Year'
    };
    if (SPAN_LABELS[datesAxon]) return SPAN_LABELS[datesAxon];
    return datesAxon.replace('..', ' – ');
  }

  // ── "No site" prompt ────────────────────────────────────────────────────────
  function renderNoSite(container) {
    container.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;color:#78796f;text-align:center">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a8a7a1" stroke-width="1.5" stroke-linecap="round">' +
          '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' +
        '</svg>' +
        '<div style="font-size:16px;font-weight:700;margin-top:12px;color:#2a2a28">No Site Selected</div>' +
        '<div style="font-size:13px;margin-top:6px">Use the Site Selector above to choose a site.</div>' +
      '</div>';
  }

  // ── onUpdate — called by the entry handler on every view refresh ────────────
  NS.onUpdate = function (arg) {
    var view = arg.view;
    var elem = arg.elem;
    view.removeAll();
    loadStyles();

    elem.style.width    = '100%';
    elem.style.height   = '100%';
    elem.style.overflow = 'auto';

    var container = document.createElement('div');
    container.id = 'ecapChannelManagerRoot';
    elem.appendChild(container);

    // ── Session ──────────────────────────────────────────────────────────────
    var attestKey = null, projectName = null;
    try {
      var session = view.session();
      attestKey   = session.attestKey();
      projectName = session.proj().name();
      console.log('[ecapChannelMgr] session OK, project:', projectName);
    } catch (e) {
      console.log('[ecapChannelMgr] no session:', e.message || e);
    }

    // ── View variables ────────────────────────────────────────────────────────
    var parentView = null;
    try { parentView = view.parent(); } catch (e) {}

    var siteRef = tryReadVar(view, 'site') || (parentView && tryReadVar(parentView, 'site'));
    var dates   = tryReadVar(view, 'dates') || (parentView && tryReadVar(parentView, 'dates'));
    var datesExpr = dates || 'pastWeek';

    console.log('[ecapChannelMgr] siteRef:', siteRef, '| dates:', dates, '| datesExpr:', datesExpr);

    var ctx = {
      siteRef:     siteRef,
      siteName:    null,
      dateLabel:   _dateLabel(datesExpr),
      attestKey:   attestKey,
      projectName: projectName
    };

    if (attestKey && projectName && siteRef) {
      NS.App.init(container, ctx);
    } else if (attestKey && projectName) {
      renderNoSite(container);
    } else {
      console.log('[ecapChannelMgr] no session — using demo data');
      NS.App.init(container, ctx);
    }
  };

  window.ecapChannelManagerApp = NS;
  console.log('[ecapChannelMgr] UI module ready. window.ecapChannelManagerApp exposed.');
})(window.ecapChannelManager);
