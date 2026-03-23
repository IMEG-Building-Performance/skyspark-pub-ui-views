// reheatDashboardUI.js
// UI module — loads CSS, initializes app, exposes onUpdate for the entry file
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  // ── Load CSS ──
  function loadStyles() {
    if (document.getElementById('reheatDashboardCSS')) return;
    var link = document.createElement('link');
    link.id = 'reheatDashboardCSS';
    link.rel = 'stylesheet';
    link.href = '/pub/ui/reheatDashboard/reheatDashboardStyles.css';
    document.head.appendChild(link);
  }

  // ── onUpdate — called by the entry file's handler ──
  NS.onUpdate = function (arg) {
    var view = arg.view;
    var elem = arg.elem;
    view.removeAll();

    loadStyles();

    // Create scoped container
    var container = document.createElement('div');
    container.id = 'reheatDashboard';
    elem.appendChild(container);

    // Generate demo data (swap with real API fetch later)
    var vavData = NS.generateDemoData();

    // Initialize the app
    NS.App.init(container, vavData);
  };

  // Expose under the app global that the entry file delegates to
  window.reheatDashboardApp = NS;
  console.log('[reheatDashboard] UI module ready. window.reheatDashboardApp exposed.');
})(window.reheatDashboard);
