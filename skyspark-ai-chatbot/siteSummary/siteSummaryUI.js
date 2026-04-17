// siteSummaryUI.js
// Bootstrap module — called by the entry handler on each view refresh.
// Loads CSS, reads SkySpark session, initializes the app, and fetches sites.
window.siteSummary = window.siteSummary || {};

(function (NS) {
  var CSS_ID   = 'siteSummaryCSS';
  var CSS_PATH = '/pub/ui/siteSummary/siteSummaryStyles.css';

  function loadStyles() {
    if (document.getElementById(CSS_ID)) return;
    var link  = document.createElement('link');
    link.id   = CSS_ID;
    link.rel  = 'stylesheet';
    link.href = CSS_PATH + '?_v=' + Date.now();
    document.head.appendChild(link);
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
    container.id = 'siteSummary';
    elem.appendChild(container);

    // ── Session credentials ──
    var attestKey, projectName;
    try {
      var session = view.session();
      attestKey   = session.attestKey();
      projectName = session.proj().name();
    } catch (e) {
      console.warn('[siteSummary] No SkySpark session available.');
    }

    if (!attestKey || !projectName) {
      container.innerHTML = [
        '<div class="ss-wrap">',
        '  <div class="ss-card" style="text-align:center;padding:3rem 2rem;color:#8a8f96">',
        '    <p style="margin:0;font-size:14px">No SkySpark session detected.</p>',
        '    <p style="margin:8px 0 0;font-size:13px">This view must be loaded inside a SkySpark project.</p>',
        '  </div>',
        '</div>'
      ].join('\n');
      return;
    }

    // ── Initialize app shell ──
    NS.App.init(container, attestKey, projectName);

    // ── Load sites ──
    NS.evals.loadSites(attestKey, projectName)
      .then(function (sites) {
        NS.App.populateSites(sites);
      })
      .catch(function (err) {
        console.error('[siteSummary] Failed to load sites:', err);
        NS.App.showLoadError(err.message || 'unknown error');
      });
  };

  window.siteSummaryApp = NS;
  console.log('[siteSummary] UI module ready.');
})(window.siteSummary);
