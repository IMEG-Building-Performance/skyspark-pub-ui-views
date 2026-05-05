// mbcxTrending/mbcxTrendingUI.js
window.mbcxTrending = window.mbcxTrending || {};

(function (NS) {
  var CSS_ID   = 'mbcxTrendingCSS';
  var CSS_PATH = '/pub/ui/mbcxTrending/mbcxTrendingStyles.css';

  function loadStyles() {
    if (document.getElementById(CSS_ID)) return;
    var link = document.createElement('link');
    link.id = CSS_ID; link.rel = 'stylesheet';
    link.href = CSS_PATH + '?_v=' + Date.now();
    document.head.appendChild(link);
  }

  function resolveNavRef(axon) {
    var m = axon && axon.match(/^@nav:[^.]+\.[^.]+\.(.+)$/);
    if (!m) return axon;
    try { var d = atob(m[1]); var r = d.match(/@[a-zA-Z0-9:._\-]+/); if (r) return r[0]; } catch(e) {}
    return axon;
  }

  NS.onUpdate = function (arg) {
    var view = arg.view, elem = arg.elem;
    view.removeAll();
    loadStyles();

    elem.style.width = '100%'; elem.style.height = '100%'; elem.style.overflow = 'hidden';
    var container = document.createElement('div');
    container.id = 'mbcxTrending';
    elem.appendChild(container);

    var attestKey = null, projectName = null, siteRef = null;
    try {
      var session = view.session();
      attestKey = session.attestKey();
      projectName = session.proj().name();
    } catch(e) {}

    if (attestKey) {
      try {
        var sv = view.var('site');
        if (sv != null) siteRef = resolveNavRef(typeof sv.toAxon === 'function' ? sv.toAxon() : String(sv));
      } catch(e) {}
    }

    var datesStart = null, datesEnd = null;
    try {
      var ds = view.var('datesStart'); if (ds != null) datesStart = typeof ds.toStr === 'function' ? ds.toStr() : String(ds);
      var de = view.var('datesEnd');   if (de != null) datesEnd   = typeof de.toStr === 'function' ? de.toStr() : String(de);
    } catch(e) {}

    var ctx = { attestKey: attestKey, projectName: projectName, siteRef: siteRef,
                datesStart: datesStart, datesEnd: datesEnd, siteName: null };

    NS.App.init(container, ctx);

    // Fetch site name
    if (attestKey && siteRef) {
      NS.api.evalAxon(attestKey, projectName, 'readById(' + siteRef + ').dis')
        .then(function(grid) {
          var p = NS.haystackParser.parseGrid(grid);
          if (p.rows.length) { var k = Object.keys(p.rows[0])[0]; ctx.siteName = p.rows[0][k] || null; }
          var el = container.querySelector('#trTitleSite');
          if (el && ctx.siteName) el.textContent = ctx.siteName;
        }).catch(function(){});
    }
  };

  window.mbcxTrendingApp = NS;
})(window.mbcxTrending);
