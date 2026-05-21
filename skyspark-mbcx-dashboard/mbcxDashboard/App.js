// App.js — dark sidebar + topbar layout: Summary | Faults | Trends | Meetings
window.mbcxDashboard = window.mbcxDashboard || {};

(function (NS) {

  var _icons = {
    summary:  '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M2 4a2 2 0 012-2h4v7H2V4zm0 7h6v7H4a2 2 0 01-2-2v-5zm8 7v-7h8v5a2 2 0 01-2 2h-6zm0-9V2h4a2 2 0 012 2v5h-6z"/></svg>',
    faults:   '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
    trends:   '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    meetings: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
    chevron:  '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>'
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

      var startVal = _fmtDate(ctx && ctx.datesStart);
      var endVal   = _fmtDate(ctx && ctx.datesEnd);
      var titleTxt = (ctx && ctx.siteName)
        ? 'MBCx Dashboard — ' + ctx.siteName
        : 'MBCx Dashboard';
      var backHref = (ctx && ctx.projectName) ? '/ui/' + ctx.projectName : '/ui/';

      container.innerHTML = [
        '<div class="dash-shell">',

        // ── Hover-reveal back button ──────────────────────────────────────
        '<a class="dash-back-btn" href="' + backHref + '" title="Back to SkySpark">',
        '  <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M10.354 3.646a.5.5 0 0 1 0 .708L6.707 8l3.647 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0z"/></svg>',
        '  Back',
        '</a>',

        // ── Sidebar ──────────────────────────────────────────────────────
        '<aside class="dash-sidebar" id="mbcxSidebar">',
        '  <div class="dash-sb-logomark">',
        '    <svg class="dash-sb-logo-icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">',
        '      <rect x="3"  y="3"  width="8" height="8"  rx="1.5" fill="currentColor" opacity=".9"/>',
        '      <rect x="13" y="3"  width="8" height="8"  rx="1.5" fill="currentColor" opacity=".9"/>',
        '      <rect x="3"  y="13" width="8" height="8"  rx="1.5" fill="currentColor" opacity=".9"/>',
        '      <rect x="13" y="13" width="8" height="8"  rx="1.5" fill="currentColor" opacity=".4"/>',
        '    </svg>',
        '    <span class="dash-sb-logo-text">MBCx<br>Dashboard</span>',
        '  </div>',

        '  <nav class="dash-sb-nav">',
        '    <button class="dash-sb-nav-item" data-tab="summary">'  + _icons.summary  + '<span>Summary</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="faults">'   + _icons.faults   + '<span>Faults</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="trends">'   + _icons.trends   + '<span>Trends</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="meetings">' + _icons.meetings + '<span>Meetings</span></button>',
        '  </nav>',

        '  <div class="dash-sb-footer">',
        '    <button class="dash-sb-collapse-btn" id="sbCollapseBtn" title="Collapse sidebar">',
        _icons.chevron,
        '    </button>',
        '  </div>',
        '</aside>',

        // ── Main ─────────────────────────────────────────────────────────
        '<div class="dash-main">',

        '  <div class="dash-topbar">',
        '    <div class="dash-topbar-title" id="mbcxDashTitleSite">' + titleTxt + '</div>',
        '    <div class="dash-topbar-controls">',
        '      <select class="dash-topbar-site" id="sbSiteSelect">',
        '        <option value="">Loading sites…</option>',
        '      </select>',
        '      <div class="dash-topbar-daterange">',
        '        <button class="dash-topbar-arr" id="sbDatePrev" title="Previous period">‹</button>',
        '        <input type="date" class="dash-topbar-date" id="sbDateStart"' + (startVal ? ' value="' + startVal + '"' : '') + ' />',
        '        <span class="dash-topbar-dash">–</span>',
        '        <input type="date" class="dash-topbar-date" id="sbDateEnd"'   + (endVal   ? ' value="' + endVal   + '"' : '') + ' />',
        '        <button class="dash-topbar-arr" id="sbDateNext" title="Next period">›</button>',
        '      </div>',
        '      <button class="dash-topbar-load-btn" id="sbLoadBtn">Load</button>',
        '    </div>',
        '  </div>',

        '  <div class="dash-content" id="mbcxContent"></div>',
        '</div>',

        '</div>'
      ].join('\n');

      // ── Refs ──────────────────────────────────────────────────────────
      var siteSelect  = container.querySelector('#sbSiteSelect');
      var dateStart   = container.querySelector('#sbDateStart');
      var dateEnd     = container.querySelector('#sbDateEnd');
      var loadBtn     = container.querySelector('#sbLoadBtn');
      var collapseBtn = container.querySelector('#sbCollapseBtn');
      var sidebar     = container.querySelector('#mbcxSidebar');
      var titleEl     = container.querySelector('#mbcxDashTitleSite');

      // ── Sidebar collapse ──────────────────────────────────────────────
      if (collapseBtn) {
        collapseBtn.addEventListener('click', function () {
          sidebar.classList.toggle('dash-sidebar--collapsed');
        });
      }

      // ── Populate site list ────────────────────────────────────────────
      if (ctx && ctx.attestKey && ctx.projectName) {
        NS.api.evalAxon(ctx.attestKey, ctx.projectName, 'readAll(site).sortCol("dis")')
          .then(function (grid) {
            siteSelect.innerHTML = '<option value="">— Select site —</option>';
            var ctxRef = ctx.siteRef ? ctx.siteRef.replace(/^@/, '') : null;
            (grid.rows || []).forEach(function (row) {
              var refObj = row.id;
              var ref    = refObj && (refObj.val || String(refObj));
              var dis    = row.dis || (refObj && refObj.dis) || ref || '?';
              var opt    = document.createElement('option');
              opt.value       = String(ref);
              opt.textContent = String(dis);
              if (ctxRef && String(ref).replace(/^@/, '') === ctxRef) opt.selected = true;
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

      // ── Date navigation ───────────────────────────────────────────────
      function shiftDates(dir) {
        var s = dateStart.value, e = dateEnd.value;
        if (!s || !e) return;
        var d1   = new Date(s + 'T00:00:00');
        var d2   = new Date(e + 'T00:00:00');
        var span = d2 - d1 + 86400000;
        d1.setTime(d1.getTime() + dir * span);
        d2.setTime(d2.getTime() + dir * span);
        dateStart.value = d1.toISOString().slice(0, 10);
        dateEnd.value   = d2.toISOString().slice(0, 10);
      }

      // ── Load handler ──────────────────────────────────────────────────
      function doLoad() {
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

        function finish(d) {
          loadBtn.disabled    = false;
          loadBtn.textContent = 'Load';
          NS.App.init(container, d, newCtx);
        }

        if (newCtx.attestKey && newCtx.projectName) {
          NS.evals.loadData(newCtx.attestKey, newCtx.projectName)
            .then(finish)
            .catch(function () { finish(NS.demoData); });
        } else {
          finish(NS.demoData);
        }
      }

      loadBtn.addEventListener('click', doLoad);

      var prevBtn = container.querySelector('#sbDatePrev');
      var nextBtn = container.querySelector('#sbDateNext');
      if (prevBtn) prevBtn.addEventListener('click', function () { shiftDates(-1); doLoad(); });
      if (nextBtn) nextBtn.addEventListener('click', function () { shiftDates(1);  doLoad(); });

      // ── Nav ───────────────────────────────────────────────────────────
      container.querySelectorAll('.dash-sb-nav-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          NS.App._showTab(container, btn.getAttribute('data-tab'), co, data, ctx);
        });
      });

      NS.App._showTab(container, 'summary', co, data, ctx);

      // ── Resolve site display name if needed ───────────────────────────
      if (ctx && ctx.attestKey && ctx.siteRef && !ctx.siteName) {
        NS.api.evalAxonVal(ctx.attestKey, ctx.projectName, 'readById(' + ctx.siteRef + ').dis')
          .then(function (val) {
            var dis = val && (typeof val === 'string' ? val : (val.val || null));
            if (!dis) return;
            ctx.siteName = dis;
            if (titleEl) titleEl.textContent = 'MBCx Dashboard — ' + dis;
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
