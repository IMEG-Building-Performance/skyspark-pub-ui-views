// mbcxDashboardUI.js
// Bootstrap module — loads CSS, reads SkySpark session, fetches data, renders app.
//
// TODO(links): shareable deep links — design notes (2026-06-12, on hold).
// The app lives inside SkySpark's view shell, so the URL belongs to SkySpark.
// Options considered, in preference order:
//   1. View vars (recommended). The trio already declares site/datesStart/
//      datesEnd and SkySpark natively deep-links views with var values.
//      Add one more var (e.g. viewState: Str) carrying a compact encoded
//      state ("tab=equipment;equip=VAV 2-1 AW" or a fault key
//      equipment::faultName), parse it in onUpdate below where the other
//      vars are read, and add a "Copy link" button that builds the SkySpark
//      view URL from the current vars. Robust; survives SkySpark routing;
//      also covers "open this exact fault from a meeting record".
//   2. URL hash fragment — simplest, but SkySpark's UI uses hash routing
//      itself; collision risk must be tested before committing.
//   3. mbcxLink recs — "Copy link" commits a rec holding the state JSON and
//      shares a short id (?mbcxLink=<id>). Nicest URLs, most future-proof,
//      but adds server writes and link management.
window.mbcxDashboard = window.mbcxDashboard || {};

(function (NS) {
  var CSS_ID   = 'mbcxDashboardCSS';
  var CSS_PATH = '/pub/ui/mbcxDashboard/mbcxDashboardStyles.css';
  var _fetchGen = 0;
  var STATE_KEY_PREFIX = 'mbcxDashboard_state';

  function _stateKey(projectName) {
    // Always require a project name — refuse to use the unscoped key
    return STATE_KEY_PREFIX + (projectName ? '_' + projectName : '_unknown');
  }

  function loadStyles() {
    if (document.getElementById(CSS_ID)) return;
    var link  = document.createElement('link');
    link.id   = CSS_ID;
    link.rel  = 'stylesheet';
    link.href = CSS_PATH + '?_v=' + Date.now();
    document.head.appendChild(link);
  }

  function _saveState(obj, projectName) {
    try { sessionStorage.setItem(_stateKey(projectName), JSON.stringify(obj)); } catch (e) {}
  }

  function _loadState(projectName) {
    try {
      var s = sessionStorage.getItem(_stateKey(projectName));
      if (!s) return null;
      var parsed = JSON.parse(s);
      // Guard: never restore state from a different project
      if (parsed && parsed.projectName && projectName && parsed.projectName !== projectName) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function _showLoadingOverlay(container) {
    container.innerHTML =
      '<div style="position:fixed;inset:0;z-index:99999;background:#1e2337;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;">' +
      '  <div style="display:flex;flex-direction:column;align-items:center;gap:16px;color:#fff;">' +
      '    <svg viewBox="0 0 24 24" width="40" height="40" style="color:rgba(255,255,255,0.8);">' +
      '      <rect x="3"  y="3"  width="8" height="8"  rx="1.5" fill="currentColor" opacity=".9"/>' +
      '      <rect x="13" y="3"  width="8" height="8"  rx="1.5" fill="currentColor" opacity=".9"/>' +
      '      <rect x="3"  y="13" width="8" height="8"  rx="1.5" fill="currentColor" opacity=".9"/>' +
      '      <rect x="13" y="13" width="8" height="8"  rx="1.5" fill="currentColor" opacity=".4"/>' +
      '    </svg>' +
      '    <div style="font-size:16px;font-weight:600;letter-spacing:0.02em;opacity:0.9;">MBCx Dashboard</div>' +
      '    <div style="width:24px;height:24px;border:2.5px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:mbcx-spin 0.8s linear infinite;"></div>' +
      '  </div>' +
      '</div>' +
      '<style>@keyframes mbcx-spin{to{transform:rotate(360deg)}}</style>';
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

    _showLoadingOverlay(container);

    // Attempt SkySpark session
    var attestKey = null, projectName = null, siteRef = null;
    try {
      var session = view.session();
      attestKey   = session.attestKey();
      projectName = session.proj().name();
    } catch (e) {
      console.warn('[mbcxDashboard] No SkySpark session — using demo data.');
    }

    // Purge legacy unscoped state key that could carry a foreign siteRef
    try { sessionStorage.removeItem('mbcxDashboard_state'); } catch (e) {}

    // Load state scoped to THIS project — never bleed across projects
    var saved = _loadState(projectName);

    // Read site view variable (Ref) — returns a Fantom proxy
    if (attestKey) {
      try {
        var siteVal = view.var('site');
        if (siteVal != null) {
          var _toAxon = typeof siteVal.toAxon === 'function' ? siteVal.toAxon() : null;
          var _toStr  = typeof siteVal.toStr  === 'function' ? siteVal.toStr()  : String(siteVal);

          if (_toAxon) {
            // Decode @nav: refs to plain @p:project:r:uuid; pass others through.
            siteRef = _resolveNavRef(_toAxon);
          } else {
            // Fallback: toStr() returns Fantom bracket form "[nav:...]", "@id",
            // plain "id", or the dis name. Normalize to "@ref" then resolve.
            var s = _toStr.trim();
            // Fantom bracket notation "[nav:site.site.BASE64]" → "@nav:site.site.BASE64"
            if (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']') {
              s = '@' + s.slice(1, s.length - 1);
            } else if (s.charAt(0) !== '@') {
              s = '@' + s;
            }
            var spaceIdx = s.indexOf(' ');
            if (spaceIdx !== -1) s = s.slice(0, spaceIdx);
            siteRef = _resolveNavRef(s);
          }
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

    if (saved) {
      if (!siteRef && saved.siteRef) siteRef = saved.siteRef;
      if (!datesStart && saved.datesStart) datesStart = saved.datesStart;
      if (!datesEnd && saved.datesEnd) datesEnd = saved.datesEnd;
    }

    var userName = null;
    try {
      var user = view.session().user();
      userName = typeof user.dis === 'function' ? user.dis() : (user.dis || null);
      if (!userName) userName = typeof user.toStr === 'function' ? user.toStr() : String(user);
    } catch (e) { /* no session or user */ }

    var ctx = { attestKey: attestKey, projectName: projectName, siteRef: siteRef,
                datesStart: datesStart, datesEnd: datesEnd, siteName: saved ? saved.siteName : null,
                userName: userName };
    function launch(data) {
      container.innerHTML = '';
      try { NS.App.init(container, data, ctx); }
      catch (e) { console.error('[mbcxDashboard] App.init failed:', e); throw e; }

      // Restore tab from saved state
      if (saved && saved.tab && saved.tab !== 'summary' && ctx.siteRef) {
        NS.App._showTab(container, saved.tab, NS.Components, data, ctx);
      }

      // Fetch site name in parallel; update title bar when ready
      if (attestKey && ctx.siteRef) {
        NS.api.evalAxonVal(attestKey, projectName, 'readById(' + ctx.siteRef + ').dis')
          .then(function (val) {
            var dis = val && (typeof val === 'string' ? val : val.val || null);
            if (dis) {
              ctx.siteName = dis;
              var el = container.querySelector('#mbcxDashTitleSite');
              if (el) el.textContent = 'MBCx Dashboard — ' + dis;
              _saveState({ projectName: projectName, siteRef: ctx.siteRef, datesStart: ctx.datesStart, datesEnd: ctx.datesEnd, siteName: dis, tab: NS.App._activeTab }, projectName);
            }
          })
          .catch(function () {});
      }
    }

    if (attestKey && projectName) {
      var gen = ++_fetchGen;
      NS.evals.loadData(attestKey, projectName)
        .then(function (data) { if (gen !== _fetchGen) return; launch(data); })
        .catch(function (err) {
          if (gen !== _fetchGen) return;
          console.warn('[mbcxDashboard] Data load failed:', err);
          launch(null);
        });
    } else {
      launch(null);
    }
  };

  window.mbcxDashboardApp = NS;
})(window.mbcxDashboard);
