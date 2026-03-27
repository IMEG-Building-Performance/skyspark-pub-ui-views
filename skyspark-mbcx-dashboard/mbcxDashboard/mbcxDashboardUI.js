// mbcxDashboardUI.js
// Bootstrap module — loads CSS, reads SkySpark session, fetches data, renders app.
window.mbcxDashboard = window.mbcxDashboard || {};

(function (NS) {
  var CSS_ID   = 'mbcxDashboardCSS';
  var CSS_PATH = '/pub/ui/mbcxDashboard/mbcxDashboardStyles.css';
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
      '<div class="no-site-screen">',
      '  <div class="no-site-icon">',
      '    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
      '      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      '    </svg>',
      '  </div>',
      '  <div class="no-site-title">No Site Selected</div>',
      '  <div class="no-site-body">Configure a site in the view properties to load the MBCX dashboard.</div>',
      '  <div class="no-site-hint">View Properties &rarr; Variables &rarr; <code>site</code></div>',
      '</div>'
    ].join('\n');
  }

  // If toAxon() returns a nav: URI (@nav:site.site.<base64>), decode the base64
  // to extract the underlying plain ref (@p:proj:r:xxx).
  function _resolveNavRef(axon) {
    var m = axon && axon.match(/^@nav:[^.]+\.[^.]+\.(.+)$/);
    if (!m) return axon;
    try {
      var decoded = atob(m[1]);
      // decoded looks like "id:@p:saintFrancisHealthSystem:r:3120b1ad-815b8812"
      var refM = decoded.match(/@[a-zA-Z0-9:._\-]+/);
      if (refM) return refM[0];
    } catch (e) { /* atob failed — leave as-is */ }
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
    container.id = 'mbcxDashboard';
    elem.appendChild(container);

    // Attempt SkySpark session
    var attestKey = null, projectName = null, siteRef = null;
    try {
      var session = view.session();
      attestKey   = session.attestKey();
      projectName = session.proj().name();
    } catch (e) {
      console.warn('[mbcxDashboard] No SkySpark session — using demo data.');
    }

    // Read site view variable (Ref) — returns a Fantom proxy
    if (attestKey) {
      try {
        var siteVal = view.var('site');
        if (siteVal != null) {
          var axonStr;
          if (typeof siteVal.toAxon === 'function') {
            axonStr = siteVal.toAxon();
          } else {
            var s;
            try { s = typeof siteVal.toStr === 'function' ? siteVal.toStr() : String(siteVal); }
            catch (e2) { s = String(siteVal); }
            axonStr = (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']')
              ? '@' + s.slice(1, -1)
              : (s.charAt(0) === '@' ? s : '@' + s);
          }
          // toAxon() may return a nav: URI like @nav:site.site.<base64>
          // The base64 encodes "id:@p:proj:r:xxx" — extract the plain ref.
          siteRef = _resolveNavRef(axonStr);
          console.log('[mbcxDashboard] siteRef resolved:', siteRef);
        }
      } catch (e) {
        console.warn('[mbcxDashboard] Could not read site var:', e);
      }
    }

    // No site configured — show prompt instead of dashboard
    if (attestKey && !siteRef) {
      renderNoSite(container);
      return;
    }

    var ctx = { attestKey: attestKey, projectName: projectName, siteRef: siteRef };

    if (attestKey && projectName) {
      var gen = ++_fetchGen;
      container.innerHTML = '<div style="padding:2rem;color:#888">Loading\u2026</div>';
      NS.evals.loadData(attestKey, projectName)
        .then(function (data) {
          if (gen !== _fetchGen) return;
          container.innerHTML = '';
          NS.App.init(container, data, ctx);
        })
        .catch(function (err) {
          if (gen !== _fetchGen) return;
          console.warn('[mbcxDashboard] Live data failed, falling back to demo:', err);
          NS.App.init(container, NS.demoData, ctx);
        });
    } else {
      NS.App.init(container, NS.demoData, ctx);
    }
  };

  window.mbcxDashboardApp = NS;
  console.log('[mbcxDashboard] UI module ready.');
})(window.mbcxDashboard);
