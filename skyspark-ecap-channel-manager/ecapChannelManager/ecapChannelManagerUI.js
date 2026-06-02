// ecapChannelManagerUI.js
// Bootstrap module — loads CSS, then hands off to App.js for rendering.
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

  // ── Public bootstrap ─────────────────────────────────────────────────────────
  window.ecapChannelManagerApp = {
    onUpdate: function (arg) {
      loadStyles();

      var rootId = 'ecapChannelManagerRoot';
      var root = document.getElementById(rootId);
      if (!root) {
        var viewEl = (arg && arg.el) ? arg.el : document.body;
        root = document.createElement('div');
        root.id = rootId;
        viewEl.appendChild(root);
      }

      NS.App.init(root);
    }
  };

})(window.ecapChannelManager);
