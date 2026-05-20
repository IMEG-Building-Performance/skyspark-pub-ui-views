// App.js — sidebar layout: Summary | Faults | Trends | Meetings
window.mbcxDashboard = window.mbcxDashboard || {};

(function (NS) {

  // ── Inline SVG icons (16×16) ──────────────────────────────────────────────
  var _icons = {
    summary:  '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M2 4a2 2 0 012-2h4v7H2V4zm0 7h6v7H4a2 2 0 01-2-2v-5zm8 7v-7h8v5a2 2 0 01-2 2h-6zm0-9V2h4a2 2 0 012 2v5h-6z"/></svg>',
    faults:   '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
    trends:   '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    meetings: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>'
  };

  function _fmtDate(s) {
    if (!s) return '';
    var m = String(s).match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }

  NS.Components = {};

  NS.App = {
    _lastData:  null,
    _lastCtx:   null,
    _activeTab: null,

    init: function (container, data, ctx) {
      NS.App._lastData  = data;
      NS.App._lastCtx   = ctx;
      NS.App._activeTab = null;

      var co = {
        HealthBanner:  window.mbcxDashboard.components.HealthBanner,
        BuildingMeters:window.mbcxDashboard.components.BuildingMeters,
        CUP:           window.mbcxDashboard.components.CUP,
        AHU:           window.mbcxDashboard.components.AHU,
        TerminalUnits: window.mbcxDashboard.components.TerminalUnits,
        FaultList:     window.mbcxDashboard.components.FaultList,
        FaultDetail:   window.mbcxDashboard.components.FaultDetail,
        MeetingView:   window.mbcxDashboard.components.MeetingView,
        TrendingView:  window.mbcxDashboard.components.TrendingView,
        Footer:        window.mbcxDashboard.components.Footer
      };
      NS.Components = co;

      ['HealthBanner','BuildingMeters','CUP','AHU','TerminalUnits','FaultList','TrendingView'].forEach(function (n) {
        if (!co[n]) console.warn('[mbcxDashboard] Component not loaded:', n);
      });

      var startVal = _fmtDate(ctx && ctx.datesStart);
      var endVal   = _fmtDate(ctx && ctx.datesEnd);

      container.innerHTML = [
        '<div class="dash-shell">',

        // ── Sidebar ──────────────────────────────────────────────────────
        '<aside class="dash-sidebar">',

        '  <div class="dash-sb-brand">',
        '    <svg class="dash-sb-brand-icon" viewBox="0 0 24 24" aria-hidden="true">',
        '      <rect x="3"  y="3"  width="8" height="8"  rx="1.5" fill="#fff" fill-opacity=".95"/>',
        '      <rect x="13" y="3"  width="8" height="8"  rx="1.5" fill="#fff" fill-opacity=".95"/>',
        '      <rect x="3"  y="13" width="8" height="8"  rx="1.5" fill="#fff" fill-opacity=".95"/>',
        '      <rect x="13" y="13" width="8" height="8"  rx="1.5" fill="#fff" fill-opacity=".5"/>',
        '    </svg>',
        '    <div>',
        '      <div class="dash-sb-brand-title">MBCx</div>',
        '      <div class="dash-sb-brand-sub">Dashboard</div>',
        '    </div>',
        '  </div>',

        '  <div class="dash-sb-context">',
        '    <label class="dash-sb-field-label" for="sbSiteSelect">Site</label>',
        '    <select class="dash-sb-select" id="sbSiteSelect">',
        '      <option value="">Loading sites…</option>',
        '    </select>',
        '    <div class="dash-sb-date-row">',
        '      <div class="dash-sb-date-group">',
        '        <label class="dash-sb-field-label" for="sbDateStart">From</label>',
        '        <input type="date" class="dash-sb-date" id="sbDateStart"' + (startVal ? ' value="' + startVal + '"' : '') + ' />',
        '      </div>',
        '      <div class="dash-sb-date-group">',
        '        <label class="dash-sb-field-label" for="sbDateEnd">To</label>',
        '        <input type="date" class="dash-sb-date" id="sbDateEnd"' + (endVal ? ' value="' + endVal + '"' : '') + ' />',
        '      </div>',
        '    </div>',
        '    <button class="dash-sb-load-btn" id="sbLoadBtn">Load</button>',
        '    <div class="dash-sb-loaded-site" id="sbLoadedSite"' + (ctx && ctx.siteName ? '' : ' style="display:none"') + '>',
        (ctx && ctx.siteName ? ctx.siteName : ''),
        '    </div>',
        '  </div>',

        '  <nav class="dash-sb-nav">',
        '    <button class="dash-sb-nav-item" data-tab="summary">'  + _icons.summary  + '<span>Summary</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="faults">'   + _icons.faults   + '<span>Faults</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="trends">'   + _icons.trends   + '<span>Trends</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="meetings">' + _icons.meetings + '<span>Meetings</span></button>',
        '  </nav>',

        '</aside>',

        // ── Main ─────────────────────────────────────────────────────────
        '<div class="dash-main">',
        '  <div class="dash-content" id="mbcxContent"></div>',
        '</div>',

        '</div>'
      ].join('\n');

      // ── Populate site list ────────────────────────────────────────────
      var siteSelect = container.querySelector('#sbSiteSelect');
      var dateStart  = container.querySelector('#sbDateStart');
      var dateEnd    = container.querySelector('#sbDateEnd');
      var loadBtn    = container.querySelector('#sbLoadBtn');
      var loadedSite = container.querySelector('#sbLoadedSite');

      if (ctx && ctx.attestKey && ctx.projectName) {
        NS.api.evalAxon(ctx.attestKey, ctx.projectName, 'readAll(site).sortCol("dis")')
          .then(function (grid) {
            siteSelect.innerHTML = '<option value="">— Select site —</option>';
            (grid.rows || []).forEach(function (row) {
              var refObj = row.id;
              var ref    = refObj && (refObj.val || String(refObj));
              var dis    = row.dis || (refObj && refObj.dis) || ref || '?';
              var opt    = document.createElement('option');
              opt.value       = String(ref);
              opt.textContent = String(dis);
              if (ctx.siteRef && String(ref) === ctx.siteRef) opt.selected = true;
              siteSelect.appendChild(opt);
            });
          })
          .catch(function (err) {
            console.warn('[mbcxDashboard] Could not load site list:', err);
            siteSelect.innerHTML = '<option value="' + (ctx.siteRef || '') + '">' +
              (ctx.siteName || ctx.siteRef || 'Current site') + '</option>';
          });
      } else {
        siteSelect.innerHTML = '<option value="">Demo mode</option>';
      }

      // ── Load button ───────────────────────────────────────────────────
      loadBtn.addEventListener('click', function () {
        var newSiteRef = siteSelect.value;
        var newStart   = dateStart.value;
        var newEnd     = dateEnd.value;
        if (!newSiteRef && ctx && ctx.attestKey) { siteSelect.focus(); return; }

        loadBtn.disabled    = true;
        loadBtn.textContent = 'Loading…';

        var selOpt = siteSelect.options[siteSelect.selectedIndex];
        var newCtx = {
          attestKey:   ctx && ctx.attestKey,
          projectName: ctx && ctx.projectName,
          siteRef:     newSiteRef || (ctx && ctx.siteRef),
          datesStart:  newStart   || (ctx && ctx.datesStart),
          datesEnd:    newEnd     || (ctx && ctx.datesEnd),
          siteName:    selOpt && selOpt.value ? selOpt.textContent : (ctx && ctx.siteName)
        };

        function doLaunch(d) {
          loadBtn.disabled    = false;
          loadBtn.textContent = 'Load';
          NS.App.init(container, d, newCtx);
        }

        if (newCtx.attestKey && newCtx.projectName) {
          NS.evals.loadData(newCtx.attestKey, newCtx.projectName)
            .then(doLaunch)
            .catch(function (err) {
              console.warn('[mbcxDashboard] Load failed, using demo data:', err);
              doLaunch(NS.demoData);
            });
        } else {
          doLaunch(NS.demoData);
        }
      });

      // ── Nav ───────────────────────────────────────────────────────────
      container.querySelectorAll('.dash-sb-nav-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          NS.App._showTab(container, btn.getAttribute('data-tab'), co, data, ctx);
        });
      });

      NS.App._showTab(container, 'summary', co, data, ctx);

      // ── Resolve site name if not known ────────────────────────────────
      if (ctx && ctx.attestKey && ctx.siteRef && !ctx.siteName) {
        NS.api.evalAxonVal(ctx.attestKey, ctx.projectName, 'readById(' + ctx.siteRef + ').dis')
          .then(function (val) {
            var dis = val && (typeof val === 'string' ? val : (val.val || null));
            if (!dis) return;
            ctx.siteName = dis;
            if (loadedSite) { loadedSite.textContent = dis; loadedSite.style.display = ''; }
          })
          .catch(function () {});
      }
    },

    showFaultDetail: function (container, fault, co) {
      if (NS.App._activeTab === 'trends' && co.TrendingView) co.TrendingView.destroy();
      if (NS.App._activeTab === 'fault-detail' && co.FaultDetail) co.FaultDetail.destroy();
      NS.App._activeTab = 'fault-detail';
      container.querySelectorAll('.dash-sb-nav-item').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === 'faults');
      });
      var content = container.querySelector('#mbcxContent');
      content.classList.remove('dash-content--fixed');
      var allFaults = co.FaultList && co.FaultList._state ? co.FaultList._state.rows : [];
      if (co.FaultDetail) {
        co.FaultDetail.show(content, fault, allFaults, NS.App._lastCtx, function () {
          NS.App._showTab(container, 'faults', co, NS.App._lastData, NS.App._lastCtx);
        });
      }
    },

    _showTab: function (container, tab, co, data, ctx) {
      if (NS.App._activeTab === 'trends' && co.TrendingView && co.TrendingView.destroy) {
        co.TrendingView.destroy();
      }
      if (NS.App._activeTab === 'fault-detail' && co.FaultDetail && co.FaultDetail.destroy) {
        co.FaultDetail.destroy();
      }
      if (NS.App._activeTab === 'meetings' && co.MeetingView && co.MeetingView.destroy) {
        co.MeetingView.destroy(co);
      }
      NS.App._activeTab = tab;

      container.querySelectorAll('.dash-sb-nav-item').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
      });

      var content = container.querySelector('#mbcxContent');
      content.classList.toggle('dash-content--fixed', tab === 'trends');

      if (tab === 'summary') {
        content.innerHTML = [
          '<div class="page">',
          co.HealthBanner   ? co.HealthBanner.render(data)   : '',
          co.BuildingMeters ? co.BuildingMeters.render(data)  : '',
          co.CUP            ? co.CUP.render(data)             : '',
          co.AHU            ? co.AHU.render(data)             : '',
          co.TerminalUnits  ? co.TerminalUnits.render()       : '',
          '</div>'
        ].join('\n');
        if (co.AHU)           co.AHU.initLive(container, ctx || null);
        if (co.TerminalUnits) co.TerminalUnits.initLive(container, ctx || null);
      }
      else if (tab === 'faults') {
        content.innerHTML = co.FaultList
          ? co.FaultList.renderPage()
          : '<div class="tu-loading">Fault List not loaded.</div>';
        if (co.FaultList) {
          co.FaultList.onFaultClick = function (fault) {
            NS.App.showFaultDetail(container, fault, co);
          };
          co.FaultList.initLive(container, ctx || null);
        }
      }
      else if (tab === 'trends') {
        if (co.TrendingView) co.TrendingView.showInContent(content, ctx || {});
      }
      else if (tab === 'meetings') {
        if (co.MeetingView) co.MeetingView.showInContent(content, ctx || {}, co);
      }
    }
  };

})(window.mbcxDashboard);
