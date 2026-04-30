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

  // Nav refs (@nav:type.sub.BASE64) encode "id:@p:project:r:UUID" in base64.
  // Extract the full project-qualified ref (@p:project:r:UUID) — that is
  // what SkySpark Axon functions expect as a Ref argument.
  function _resolveNavRef(ref) {
    if (!ref || ref.indexOf('@nav:') !== 0) return ref;
    var parts = ref.slice(5).split('.'); // strip @nav: then split on dots
    var b64 = parts[parts.length - 1];  // last segment is the base64 payload
    try {
      var decoded = atob(b64); // "id:@p:waubonseeCommunityCollege:r:308c0427-5b3d45a7"
      console.log('[mbcxDashboard] nav decoded:', decoded);
      // Take everything from the first @ — that is the full Ref literal.
      // Trim any trailing whitespace or dis suffix (space + display name).
      var atIdx = decoded.indexOf('@');
      if (atIdx !== -1) {
        var r = decoded.slice(atIdx).trim();
        var sp = r.indexOf(' ');
        return sp !== -1 ? r.slice(0, sp) : r; // "@p:project:r:uuid"
      }
    } catch (e) { console.warn('[mbcxDashboard] nav decode failed:', e); }
    return ref;
  }

  NS.onUpdate = function (arg) {
    var view = arg.view;
    var elem = arg.elem;
    view.removeAll();
    loadStyles();

    elem.style.width  = '100%';
    elem.style.height = '100%';
    elem.style.overflow = 'hidden';

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
          // Log raw values to aid diagnosis
          var _toAxon = typeof siteVal.toAxon === 'function' ? siteVal.toAxon() : null;
          var _toStr  = typeof siteVal.toStr  === 'function' ? siteVal.toStr()  : String(siteVal);
          console.log('[mbcxDashboard] site toAxon:', _toAxon, '| toStr:', _toStr);

          if (_toAxon) {
            // Decode @nav: refs to plain @r:uuid; pass other refs through unchanged.
            siteRef = _resolveNavRef(_toAxon);
          } else {
            // Fallback: toStr() may return "@id", "id", or the dis name.
            // Strip the dis (anything after the first space) so we get a clean ref.
            var s = _toStr.trim();
            if (s.charAt(0) !== '@') s = '@' + s;
            var spaceIdx = s.indexOf(' ');
            if (spaceIdx !== -1) s = s.slice(0, spaceIdx);
            siteRef = s;
          }
          console.log('[mbcxDashboard] siteRef:', siteRef);
        }
      } catch (e) {
        console.warn('[mbcxDashboard] Could not read site var:', e);
      }
    }

    // Read date view variables
    var datesStart = null, datesEnd = null;
    try {
      var dsVal = view.var('datesStart');
      if (dsVal != null) datesStart = typeof dsVal.toStr === 'function' ? dsVal.toStr() : String(dsVal);
      var deVal = view.var('datesEnd');
      if (deVal != null) datesEnd = typeof deVal.toStr === 'function' ? deVal.toStr() : String(deVal);
    } catch (e) { /* not set */ }

    // No site configured — show prompt instead of dashboard
    if (attestKey && !siteRef) {
      renderNoSite(container);
      return;
    }

    var ctx = { attestKey: attestKey, projectName: projectName, siteRef: siteRef,
                datesStart: datesStart, datesEnd: datesEnd, siteName: null };
    console.log('[mbcxDashboard] ctx:', {
      hasAttestKey: !!attestKey, projectName: projectName,
      siteRef: siteRef, datesStart: datesStart, datesEnd: datesEnd
    });

    function launch(data) {
      container.innerHTML = '';
      try { NS.App.init(container, data, ctx); }
      catch (e) { console.error('[mbcxDashboard] App.init failed:', e); throw e; }
      // Fetch site name in parallel; update title bar when ready
      if (attestKey && ctx.siteRef) {
        NS.api.evalAxonVal(attestKey, projectName, 'readById(' + ctx.siteRef + ').dis')
          .then(function (val) {
            var dis = val && (typeof val === 'string' ? val : val.val || null);
            if (dis) {
              ctx.siteName = dis;
              var el = container.querySelector('#mbcxDashTitleSite');
              if (el) el.textContent = dis;
            }
          })
          .catch(function () {});
      }
    }

    if (attestKey && projectName) {
      var gen = ++_fetchGen;
      container.innerHTML = '<div style="padding:2rem;color:#888">Loading\u2026</div>';
      NS.evals.loadData(attestKey, projectName)
        .then(function (data) { if (gen !== _fetchGen) return; launch(data); })
        .catch(function (err) {
          if (gen !== _fetchGen) return;
          console.warn('[mbcxDashboard] Live data failed, falling back to demo:', err);
          launch(NS.demoData);
        });
    } else {
      launch(NS.demoData);
    }
  };

  window.mbcxDashboardApp = NS;
  console.log('[mbcxDashboard] UI module ready.');
})(window.mbcxDashboard);
