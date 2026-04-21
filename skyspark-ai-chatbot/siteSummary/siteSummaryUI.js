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

  function loadMarked(cb) {
    if (window.marked) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/marked@9/marked.min.js';
    s.onload = cb;
    s.onerror = function () {
      console.warn('[siteSummary] marked.js failed to load — falling back to plain text.');
      cb();
    };
    document.head.appendChild(s);
  }

  function loadChartJs(cb) {
    if (window.Chart) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/chart.js@4/dist/chart.umd.min.js';
    s.onload = cb;
    s.onerror = function () {
      console.warn('[siteSummary] Chart.js failed to load — charts will be unavailable.');
      cb();
    };
    document.head.appendChild(s);
  }

  NS.onUpdate = function (arg) {
    var view = arg.view;
    var elem = arg.elem;
    view.removeAll();

    loadStyles();
    loadMarked(function () {});
    loadChartJs(function () {});

    elem.style.width  = '100%';
    elem.style.height = '100%';
    elem.style.overflow = 'hidden';

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
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#eef0f2">',
        '  <div style="text-align:center;color:#8a8f96;padding:3rem 2rem">',
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
