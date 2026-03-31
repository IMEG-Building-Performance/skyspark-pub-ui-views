// netzeroDashboardUI.js
// Bootstrap module — loads CSS, reads SkySpark session, fetches data, renders app.
window.netzeroDashboard = window.netzeroDashboard || {};

(function (NS) {
  var CSS_ID   = 'netzeroDashboardCSS';
  var CSS_PATH = '/pub/ui/netzeroDashboard/netzeroDashboardStyles.css';
  var _fetchGen = 0;

  function loadStyles() {
    if (document.getElementById(CSS_ID)) return;
    var link  = document.createElement('link');
    link.id   = CSS_ID;
    link.rel  = 'stylesheet';
    link.href = CSS_PATH + '?_v=' + Date.now();
    document.head.appendChild(link);
  }

  function renderNoSite(container) {
    container.innerHTML = [
      '<div class="nz-no-site-screen">',
      '  <div class="nz-no-site-icon">',
      '    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a8a7a1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
      '      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      '    </svg>',
      '  </div>',
      '  <div class="nz-no-site-title">No Site Selected</div>',
      '  <div class="nz-no-site-body">Configure a site in the view properties to load the Net Zero dashboard.</div>',
      '  <div class="nz-no-site-hint">View Properties &rarr; Variables &rarr; <code>site</code></div>',
      '</div>'
    ].join('\n');
  }

  // If toAxon() returns a nav: URI (@nav:site.site.<base64>), decode the base64
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

  NS.onUpdate = function (arg) {
    var view = arg.view;
    var elem = arg.elem;
    view.removeAll();
    loadStyles();

    elem.style.width  = '100%';
    elem.style.height = '100%';
    elem.style.overflow = 'auto';

    var container = document.createElement('div');
    container.id = 'netzeroDashboard';
    elem.appendChild(container);

    // Attempt SkySpark session
    var attestKey = null, projectName = null, siteRef = null;
    try {
      var session = view.session();
      attestKey   = session.attestKey();
      projectName = session.proj().name();
      console.log('[nzDiag] session OK, attestKey:', !!attestKey, 'project:', projectName);
    } catch (e) {
      console.log('[nzDiag] no session:', e.message || e);
    }

    // Read site view variable (Ref)
    if (attestKey) {
      try {
        var siteVal = view.var('site');
        console.log('[nzDiag] raw site var:', siteVal, 'type:', typeof siteVal);
        if (siteVal != null) {
          // Log available methods
          var methods = [];
          if (typeof siteVal.toAxon === 'function') methods.push('toAxon');
          if (typeof siteVal.toStr === 'function') methods.push('toStr');
          if (typeof siteVal.toString === 'function') methods.push('toString');
          console.log('[nzDiag] site methods:', methods.join(', '));

          var axonStr;
          if (typeof siteVal.toAxon === 'function') {
            axonStr = siteVal.toAxon();
            console.log('[nzDiag] toAxon() =', axonStr);
          } else {
            var s;
            try { s = typeof siteVal.toStr === 'function' ? siteVal.toStr() : String(siteVal); }
            catch (e2) { s = String(siteVal); }
            console.log('[nzDiag] fallback string =', s);
            axonStr = (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']')
              ? '@' + s.slice(1, -1)
              : (s.charAt(0) === '@' ? s : '@' + s);
          }
          console.log('[nzDiag] axonStr before resolve:', axonStr);
          siteRef = _resolveNavRef(axonStr);
          console.log('[nzDiag] siteRef resolved:', siteRef);
        } else {
          console.log('[nzDiag] site var is null/undefined');
        }
      } catch (e) {
        console.log('[nzDiag] site var error:', e.message || e);
      }
    }

    // Read date view variables
    var datesStart = null, datesEnd = null;
    try {
      var dsVal = view.var('datesStart');
      var deVal = view.var('datesEnd');
      if (dsVal != null) datesStart = typeof dsVal.toStr === 'function' ? dsVal.toStr() : String(dsVal);
      if (deVal != null) datesEnd = typeof deVal.toStr === 'function' ? deVal.toStr() : String(deVal);
      console.log('[nzDiag] dates:', datesStart, datesEnd);
    } catch (e) { /* not set */ }

    console.log('[nzDiag] FINAL — attestKey:', !!attestKey, 'project:', projectName, 'siteRef:', siteRef, 'dates:', datesStart, datesEnd);
    console.log('[nzDiag] Will use live data:', !!(attestKey && projectName && siteRef));

    // No site configured — fall through to demo data instead of blocking
    // siteName defaults to null; App.js shows "Demo Site" when null
    var ctx = { attestKey: attestKey, projectName: projectName, siteRef: siteRef,
                datesStart: datesStart, datesEnd: datesEnd, siteName: null };

    function launch(data) {
      container.innerHTML = '';
      NS.App.init(container, data, ctx);
      // Fetch site name in parallel
      if (attestKey && siteRef) {
        NS.api.evalAxon(attestKey, projectName, 'readById(' + siteRef + ').dis')
          .then(function (grid) {
            var HP = NS.haystackParser;
            var parsed = HP.parseGrid(grid);
            if (parsed.rows.length) {
              var row = parsed.rows[0];
              var key = Object.keys(row)[0];
              ctx.siteName = row[key] || null;
            }
            var el = container.querySelector('#nzTitleSite');
            if (el && ctx.siteName) el.textContent = ctx.siteName;
          })
          .catch(function () {});
      }
    }

    if (attestKey && projectName && siteRef) {
      var gen = ++_fetchGen;
      container.innerHTML = '<div style="padding:2rem;color:#888">Loading\u2026</div>';
      NS.evals.loadData(attestKey, projectName, ctx)
        .then(function (data) {
          if (gen !== _fetchGen) return;
          launch(data);
        })
        .catch(function (err) {
          if (gen !== _fetchGen) return;
          launch(NS.demoData);
        });
    } else {
      launch(NS.demoData);
    }
  };

  window.netzeroDashboardApp = NS;
})(window.netzeroDashboard);
