// App.js — dark sidebar + topbar layout: Summary | Faults | Trends | Meetings
window.mbcxDashboard = window.mbcxDashboard || {};

(function (NS) {

  var _icons = {
    summary:    '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M2 4a2 2 0 012-2h4v7H2V4zm0 7h6v7H4a2 2 0 01-2-2v-5zm8 7v-7h8v5a2 2 0 01-2 2h-6zm0-9V2h4a2 2 0 012 2v5h-6z"/></svg>',
    faults:     '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
    compliance: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    equipment:  '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
    trends:     '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    meetings:   '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
    chevron:    '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>',
    config:     '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zm6 0a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zm5 2a1 1 0 112 0v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-.268a2 2 0 010-3.464V6z"/></svg>'
  };

  function _fmtDate(s) {
    if (!s) return '';
    var m = String(s).match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }

  function _isoDate(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  NS.Components = {};

  var _defaultTabOrder = [
    { key: 'summary',    label: 'Summary' },
    { key: 'faults',     label: 'Faults' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'equipment',  label: 'Equipment' },
    { key: 'trends',     label: 'Trends' },
    { key: 'meetings',   label: 'Meetings' }
  ];

  var _dateRangeOptions = [
    { value: 7,  label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' }
  ];

  var _themeOptions = [
    { value: 'auto', label: 'Auto (System)' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' }
  ];

  function _loadConfigLocal() {
    try {
      var raw = localStorage.getItem('mbcxDashboard_config');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function _saveConfigLocal(cfg) {
    try { localStorage.setItem('mbcxDashboard_config', JSON.stringify(cfg)); } catch (e) {}
  }

  function _applyDefaults(cfg) {
    if (!cfg.tabVisibility) {
      cfg.tabVisibility = {};
      _defaultTabOrder.forEach(function (t) { cfg.tabVisibility[t.key] = true; });
    }
    if (!cfg.tabOrder) cfg.tabOrder = _defaultTabOrder.map(function (t) { return t.key; });
    if (!cfg.defaultTab) cfg.defaultTab = 'summary';
    if (!cfg.dateRange) cfg.dateRange = 30;
    if (!cfg.theme) cfg.theme = 'auto';
    return cfg;
  }

  function _getConfig() {
    return _applyDefaults(_loadConfigLocal() || {});
  }

  function _saveConfig(cfg) {
    _saveConfigLocal(cfg);
    _saveConfigRemote(cfg);
  }

  var _saveTimer = null;
  function _saveConfigRemote(cfg) {
    // Debounce writes to SkySpark (500ms)
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function () {
      var ctx = NS.App._lastCtx;
      if (!ctx || !ctx.attestKey) return;
      var json = JSON.stringify(cfg).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      var axon = 'commit(diff(readById(context()->id), {mbcxPrefs: "' + json + '"}))';
      NS.api.evalAxon(ctx.attestKey, ctx.projectName, axon).then(function () {
        console.log('[mbcxDashboard] Config saved to user record.');
      }).catch(function (e) {
        console.warn('[mbcxDashboard] Config save to user failed:', e);
      });
    }, 500);
  }

  function _loadConfigRemote(ctx) {
    if (!ctx || !ctx.attestKey) return Promise.resolve(null);
    return NS.api.evalAxonVal(ctx.attestKey, ctx.projectName, 'readById(context()->id)->mbcxPrefs')
      .then(function (val) {
        if (!val) return null;
        var str = typeof val === 'string' ? val : (val.val || null);
        if (!str) return null;
        try { return JSON.parse(str); } catch (e) { return null; }
      }).catch(function () { return null; });
  }

  NS.App = {
    _lastData:  null,
    _lastCtx:   null,
    _activeTab: null,
    _config: _getConfig(),

    _syncConfigFromServer: function (container) {
      var ctx = NS.App._lastCtx;
      _loadConfigRemote(ctx).then(function (remote) {
        if (!remote) return;
        var merged = _applyDefaults(remote);
        NS.App._config = merged;
        _saveConfigLocal(merged);
        NS.App._applyTabVisibility(container);
        NS.App._applyTheme(container);
      });
    },

    _persistState: function () {
      var c = NS.App._lastCtx;
      if (!c) return;
      try {
        sessionStorage.setItem('mbcxDashboard_state', JSON.stringify({
          siteRef: c.siteRef, datesStart: c.datesStart, datesEnd: c.datesEnd,
          siteName: c.siteName, tab: NS.App._activeTab
        }));
      } catch (e) {}
    },

    init: function (container, data, ctx) {
      NS.App._lastData  = data;
      NS.App._lastCtx   = ctx;
      NS.App._activeTab = null;

      var co = {
        BuildingMeters: window.mbcxDashboard.components.BuildingMeters,
        CUP:            window.mbcxDashboard.components.CUP,
        CUPPlantDetail: window.mbcxDashboard.components.CUPPlantDetail,
        CUPEquipDetail: window.mbcxDashboard.components.CUPEquipDetail,
        AHU:            window.mbcxDashboard.components.AHU,
        TerminalUnits:  window.mbcxDashboard.components.TerminalUnits,
        FaultList:      window.mbcxDashboard.components.FaultList,
        FaultDetail:    window.mbcxDashboard.components.FaultDetail,
        MeetingView:    window.mbcxDashboard.components.MeetingView,
        TrendingView:   window.mbcxDashboard.components.TrendingView,
        Footer:         window.mbcxDashboard.components.Footer
      };
      NS.Components = co;

      var startVal = _fmtDate(ctx && ctx.datesStart) || _isoDate(-(NS.App._config.dateRange || 30));
      var endVal   = _fmtDate(ctx && ctx.datesEnd)   || _isoDate(0);
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
        '    <button class="dash-sb-nav-item" data-tab="faults">'     + _icons.faults     + '<span>Faults</span></button>',
        '    <div class="dash-sb-sub" data-parent="faults">',
        '      <button class="dash-sb-sub-item" data-tab="fault-summary">Summary</button>',
        '      <button class="dash-sb-sub-item" data-tab="fault-list">Fault List</button>',
        '      <button class="dash-sb-sub-item" data-tab="fault-summaries">Fault Summaries</button>',
        '      <button class="dash-sb-sub-item" data-tab="fault-log">Fault Log</button>',
        '    </div>',
        '    <button class="dash-sb-nav-item" data-tab="compliance">' + _icons.compliance + '<span>Compliance</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="equipment">'  + _icons.equipment  + '<span>Equipment</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="trends">'   + _icons.trends   + '<span>Trends</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="meetings">' + _icons.meetings + '<span>Meetings</span></button>',
        '  </nav>',

        '  <div class="dash-sb-footer">',
        '    <button class="dash-sb-nav-item dash-sb-config-btn" data-tab="config">' + _icons.config + '<span>Configuration</span></button>',
        '    <button class="dash-sb-collapse-btn" id="sbCollapseBtn" title="Collapse sidebar">',
        _icons.chevron,
        '    </button>',
        '  </div>',
        '</aside>',

        // ── Main ─────────────────────────────────────────────────────────
        '<div class="dash-main">',

        '  <div class="dash-topbar" style="background:#1e2337 !important;">',
        '    <div class="dash-topbar-title" id="mbcxDashTitleSite" style="color:#fff !important;">',
        '      ' + titleTxt,
        '      <span class="dash-topbar-spinner" id="mbcxSpinner" style="display:none" aria-label="Loading"></span>',
        '    </div>',
        '    <div class="dash-topbar-controls">',
        '      <div class="dash-topbar-site-mount" id="sbSiteMount"></div>',
        '      <div class="dash-topbar-daterange" id="sbDateRangePicker"></div>',
        '    </div>',
        '  </div>',

        '  <div class="dash-content" id="mbcxContent"></div>',
        '</div>',

        '</div>'
      ].join('\n');

      // ── Refs ──────────────────────────────────────────────────────────
      var siteMountEl = container.querySelector('#sbSiteMount');
      var pickerEl    = container.querySelector('#sbDateRangePicker');
      var spinner     = container.querySelector('#mbcxSpinner');
      var collapseBtn = container.querySelector('#sbCollapseBtn');
      var sidebar     = container.querySelector('#mbcxSidebar');
      var titleEl     = container.querySelector('#mbcxDashTitleSite');
      var content     = container.querySelector('#mbcxContent');

      var siteSelector = NS.siteSelector.create({
        container:    siteMountEl,
        selectedRef:  ctx.siteRef || '',
        selectedLabel: ctx.siteName || '— Select site —',
        onChange: function () { doLoad(); }
      });

      // ── Sidebar collapse ──────────────────────────────────────────────
      if (collapseBtn) {
        collapseBtn.addEventListener('click', function () {
          sidebar.classList.toggle('dash-sidebar--collapsed');
        });
      }

      // ── Populate site list ────────────────────────────────────────────
      if (ctx && ctx.attestKey && ctx.projectName) {
        console.log('[mbcxDashboard] Loading sites — project:', ctx.projectName, 'siteRef:', ctx.siteRef);
        NS.api.evalAxon(ctx.attestKey, ctx.projectName, 'readAll(site)')
          .then(function (grid) {
            var rows = (grid.rows || []).slice();
            rows.sort(function (a, b) {
              var da = String(a.dis || a.navName || '');
              var db = String(b.dis || b.navName || '');
              return da.localeCompare(db);
            });
            var siteList = rows.map(function (row) {
              var refObj = row.id;
              var refVal = '';
              if (refObj && typeof refObj === 'object') {
                refVal = refObj.val || refObj.id || String(refObj);
              } else if (refObj) {
                refVal = String(refObj);
              }
              var refStr = refVal.replace(/^@/, '');
              var dis = row.dis || (refObj && (refObj.dis || refObj.val)) || refStr || '?';
              return { ref: '@' + refStr, dis: String(dis) };
            });
            siteSelector.setSites(siteList, ctx.siteRef);
          })
          .catch(function (err) {
            console.warn('[mbcxDashboard] Could not load site list:', err);
            if (ctx.siteRef) {
              siteSelector.setSites([{ ref: ctx.siteRef, dis: ctx.siteName || ctx.siteRef }], ctx.siteRef);
            }
          });
      } else {
        console.warn('[mbcxDashboard] No credentials — demo mode.');
      }

      // ── Load handler ──────────────────────────────────────────────────
      var picker; // assigned after doLoad is defined

      function doLoad() {
        var newSiteRef = siteSelector.getSelectedRef();
        var newStart   = picker ? picker.getStartDate() : startVal;
        var newEnd     = picker ? picker.getEndDate()   : endVal;

        if (!newSiteRef) {
          _showNoSitePrompt(content);
          return;
        }

        if (spinner) spinner.style.display = 'inline-block';

        var newCtx = {
          attestKey:   ctx && ctx.attestKey,
          projectName: ctx && ctx.projectName,
          siteRef:     newSiteRef || (ctx && ctx.siteRef),
          datesStart:  newStart   || (ctx && ctx.datesStart),
          datesEnd:    newEnd     || (ctx && ctx.datesEnd),
          siteName:    siteSelector.getSelectedDis() || (ctx && ctx.siteName)
        };

        function finish(d) {
          if (spinner) spinner.style.display = 'none';
          NS.App.init(container, d, newCtx);
          NS.App._persistState();
        }

        if (newCtx.attestKey && newCtx.projectName) {
          NS.evals.loadData(newCtx.attestKey, newCtx.projectName)
            .then(finish)
            .catch(function (err) {
              if (spinner) spinner.style.display = 'none';
              console.warn('[mbcxDashboard] Data load failed:', err);
              finish(null);
            });
        } else {
          finish(null);
        }
      }

      // ── Date range picker ─────────────────────────────────────────────
      picker = NS.datePicker.create({
        container:  pickerEl,
        startDate:  startVal,
        endDate:    endVal,
        onChange:   doLoad
      });

      // ── "Select a site" prompt ────────────────────────────────────────
      function _showNoSitePrompt(contentEl) {
        if (!contentEl) return;
        contentEl.innerHTML =
          '<div class="dash-no-site">' +
            // Arrow anchored top-right, pointing up toward the site dropdown
            '<div class="dash-no-site-hint">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
                ' stroke-linecap="round" stroke-linejoin="round" width="22" height="22">' +
                '<line x1="12" y1="19" x2="12" y2="5"/>' +
                '<polyline points="5 12 12 5 19 12"/>' +
              '</svg>' +
              'Select a site above to get started' +
            '</div>' +
            // Centred body
            '<div class="dash-no-site-body">' +
              '<div class="dash-no-site-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"' +
                  ' stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' +
                  '<polyline points="9 22 9 12 15 12 15 22"/>' +
                '</svg>' +
              '</div>' +
              '<div class="dash-no-site-title">No Site Selected</div>' +
              '<div class="dash-no-site-sub">' +
                'Use the <strong>site dropdown</strong> in the top right corner to load the MBCx Dashboard for a building.' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      // ── Nav ───────────────────────────────────────────────────────────
      container.querySelectorAll('.dash-sb-nav-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tab = btn.getAttribute('data-tab');
          if (tab !== 'config' && !ctx.siteRef) {
            _showNoSitePrompt(content);
            return;
          }
          var sub = btn.nextElementSibling;
          if (sub && sub.classList.contains('dash-sb-sub')) {
            sub.classList.toggle('dash-sb-sub--open');
          }
          NS.App._showTab(container, tab, co, data, ctx);
        });
      });
      container.querySelectorAll('.dash-sb-sub-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!ctx.siteRef) { _showNoSitePrompt(content); return; }
          NS.App._showTab(container, btn.getAttribute('data-tab'), co, data, ctx);
        });
      });

      NS.App._applyTabVisibility(container);
      NS.App._applyTheme(container);
      NS.App._syncConfigFromServer(container);

      if (ctx.siteRef) {
        NS.App._showTab(container, NS.App.getDefaultTab(), co, data, ctx);
      } else {
        _showNoSitePrompt(content);
      }

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

    showCupPlantDetail: function (container, systemKey, co, data, ctx) {
      if (NS.App._activeTab === 'trends'       && co.TrendingView) co.TrendingView.destroy();
      if (NS.App._activeTab === 'fault-detail' && co.FaultDetail)  co.FaultDetail.destroy();
      if (NS.App._activeTab === 'meetings'     && co.MeetingView)  co.MeetingView.destroy(co);
      NS.App._activeTab = 'cup-plant-detail';
      container.querySelectorAll('.dash-sb-nav-item').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === 'summary');
      });
      if (co.CUPPlantDetail) {
        co.CUPPlantDetail.show(container, systemKey, co, data, ctx);
      }
    },

    showCupEquipDetail: function (container, equipName, systemKey, co, data, ctx) {
      if (NS.App._activeTab === 'trends'       && co.TrendingView) co.TrendingView.destroy();
      if (NS.App._activeTab === 'fault-detail' && co.FaultDetail)  co.FaultDetail.destroy();
      if (NS.App._activeTab === 'meetings'     && co.MeetingView)  co.MeetingView.destroy(co);
      NS.App._activeTab = 'cup-equip-detail';
      container.querySelectorAll('.dash-sb-nav-item').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === 'summary');
      });
      if (co.CUPEquipDetail) {
        co.CUPEquipDetail.show(container, equipName, systemKey, co, data, ctx);
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
      NS.App._persistState();

      var faultTabs = ['faults', 'fault-summary', 'fault-list', 'fault-summaries', 'fault-log'];
      var isFaultTab = faultTabs.indexOf(tab) !== -1;

      container.querySelectorAll('.dash-sb-nav-item').forEach(function (btn) {
        var t = btn.getAttribute('data-tab');
        btn.classList.toggle('active', t === tab || (t === 'faults' && isFaultTab));
      });
      container.querySelectorAll('.dash-sb-sub-item').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
      });
      var faultSub = container.querySelector('.dash-sb-sub[data-parent="faults"]');
      if (faultSub) faultSub.classList.toggle('dash-sb-sub--open', isFaultTab);

      var content = container.querySelector('#mbcxContent');
      content.classList.toggle('dash-content--fixed', tab === 'trends');

      if (tab === 'summary') {
        content.innerHTML = [
          '<div class="page">',
          co.BuildingMeters ? co.BuildingMeters.render(data) : '',
          co.CUP            ? co.CUP.render(data)            : '',
          co.AHU            ? co.AHU.render(data)            : '',
          co.TerminalUnits  ? co.TerminalUnits.render()      : '',
          '</div>'
        ].join('\n');
        if (co.BuildingMeters && co.BuildingMeters.initLive) co.BuildingMeters.initLive(container, ctx || null);
        if (co.CUP && co.CUP.initCard) co.CUP.initCard(content, container, co, data, ctx || null);
        if (co.AHU)                     co.AHU.initLive(container, ctx || null);
        if (co.TerminalUnits)           co.TerminalUnits.initLive(container, ctx || null);
      }
      else if (tab === 'faults' || tab === 'fault-list') {
        NS.App._activeTab = 'fault-list';
        NS.App._persistState();
        container.querySelectorAll('.dash-sb-sub-item').forEach(function (btn) {
          btn.classList.toggle('active', btn.getAttribute('data-tab') === 'fault-list');
        });
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
      else if (tab === 'fault-summary' || tab === 'fault-summaries' || tab === 'fault-log') {
        var subLabels = { 'fault-summary': 'Summary', 'fault-summaries': 'Fault Summaries', 'fault-log': 'Fault Log' };
        content.innerHTML = [
          '<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:70vh;">',
          '  <div style="text-align:center;">',
          '    <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="#5a6070" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px;">',
          '      <rect x="2" y="6" width="20" height="12" rx="2"/>',
          '      <path d="M12 6V4m-4 2V5m8 1V5"/>',
          '      <circle cx="12" cy="12" r="2.5"/>',
          '      <path d="M14.5 12H18m-12 0h3.5"/>',
          '    </svg>',
          '    <div style="font-size:1.15rem;font-weight:600;color:#8b95a5;margin-bottom:6px;">Under Construction</div>',
          '    <div style="font-size:.85rem;color:#5a6070;">' + subLabels[tab] + ' coming soon.</div>',
          '  </div>',
          '</div>'
        ].join('\n');
      }
      else if (tab === 'trends') {
        if (co.TrendingView) co.TrendingView.showInContent(content, ctx || {});
      }
      else if (tab === 'meetings') {
        if (co.MeetingView) co.MeetingView.showInContent(content, ctx || {}, co);
      }
      else if (tab === 'compliance' || tab === 'equipment') {
        var label = tab === 'compliance' ? 'Compliance' : 'Equipment';
        content.innerHTML = [
          '<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:70vh;">',
          '  <div style="text-align:center;">',
          '    <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="#5a6070" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px;">',
          '      <rect x="2" y="6" width="20" height="12" rx="2"/>',
          '      <path d="M12 6V4m-4 2V5m8 1V5"/>',
          '      <circle cx="12" cy="12" r="2.5"/>',
          '      <path d="M14.5 12H18m-12 0h3.5"/>',
          '    </svg>',
          '    <div style="font-size:1.15rem;font-weight:600;color:#8b95a5;margin-bottom:6px;">Under Construction</div>',
          '    <div style="font-size:.85rem;color:#5a6070;">' + label + ' features coming soon.</div>',
          '  </div>',
          '</div>'
        ].join('\n');
      }
      else if (tab === 'config') {
        content.innerHTML = NS.App._renderConfigPage(ctx);
        NS.App._initConfigPage(container, content, co, data, ctx);
      }
    },

    _applyTabVisibility: function (container) {
      var cfg = NS.App._config;
      var nav = container.querySelector('.dash-sb-nav');
      if (!nav) return;

      // Reorder and show/hide
      var order = cfg.tabOrder || _defaultTabOrder.map(function (t) { return t.key; });
      var vis = cfg.tabVisibility || {};

      order.forEach(function (key) {
        var btn = nav.querySelector('.dash-sb-nav-item[data-tab="' + key + '"]');
        if (!btn) return;
        var show = vis[key] !== false;
        btn.style.display = show ? '' : 'none';
        nav.appendChild(btn);
        var sub = btn.nextElementSibling;
        if (!sub || !sub.classList.contains('dash-sb-sub')) {
          sub = nav.querySelector('.dash-sb-sub[data-parent="' + key + '"]');
        }
        if (sub && sub.classList.contains('dash-sb-sub')) {
          sub.style.display = show ? '' : 'none';
          nav.appendChild(sub);
        }
      });
    },

    _applyTheme: function (container) {
      var theme = NS.App._config.theme || 'auto';
      var shell = container.querySelector('.dash-shell') || container;
      shell.classList.remove('dash-theme-dark', 'dash-theme-light');
      if (theme === 'dark') shell.classList.add('dash-theme-dark');
      else if (theme === 'light') shell.classList.add('dash-theme-light');
    },

    getDefaultDateRange: function () {
      return NS.App._config.dateRange || 30;
    },

    getDefaultTab: function () {
      return NS.App._config.defaultTab || 'summary';
    },

    _renderConfigPage: function (ctx) {
      var cfg = NS.App._config;
      var vis = cfg.tabVisibility;
      var order = cfg.tabOrder || _defaultTabOrder.map(function (t) { return t.key; });

      var tabLabelMap = {};
      _defaultTabOrder.forEach(function (t) { tabLabelMap[t.key] = t.label; });

      // Section 1: User info
      var userName = (ctx && ctx.userName) || 'Unknown';
      var userSection = [
        '<div class="cfg-section">',
        '  <h3 class="cfg-section-title">Current User</h3>',
        '  <div class="cfg-user-card">',
        '    <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" class="cfg-user-icon"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>',
        '    <span class="cfg-user-name">' + userName + '</span>',
        '  </div>',
        '</div>'
      ].join('\n');

      // Section 2: Tab visibility with ordering arrows
      var tabRows = order.map(function (key, idx) {
        var checked = vis[key] !== false ? ' checked' : '';
        var label = tabLabelMap[key] || key;
        var upDisabled = idx === 0 ? ' disabled' : '';
        var downDisabled = idx === order.length - 1 ? ' disabled' : '';
        return '<div class="cfg-tab-row" data-key="' + key + '">' +
          '<div class="cfg-tab-arrows">' +
            '<button class="cfg-arrow-btn cfg-arrow-up" data-dir="up" data-key="' + key + '"' + upDisabled + '>&#9650;</button>' +
            '<button class="cfg-arrow-btn cfg-arrow-down" data-dir="down" data-key="' + key + '"' + downDisabled + '>&#9660;</button>' +
          '</div>' +
          '<span class="cfg-toggle-label">' + label + '</span>' +
          '<label class="cfg-toggle-wrap">' +
            '<input type="checkbox" class="cfg-toggle-input" data-key="' + key + '"' + checked + '>' +
            '<span class="cfg-toggle-slider"></span>' +
          '</label>' +
        '</div>';
      }).join('');

      var tabSection = [
        '<div class="cfg-section">',
        '  <h3 class="cfg-section-title">Sidebar Tabs</h3>',
        '  <p class="cfg-section-desc">Toggle visibility and reorder tabs using arrows.</p>',
        '  <div class="cfg-toggles">' + tabRows + '</div>',
        '</div>'
      ].join('\n');

      // Section 3: Default landing tab
      var landingOpts = order.filter(function (k) { return vis[k] !== false; }).map(function (key) {
        var sel = cfg.defaultTab === key ? ' selected' : '';
        return '<option value="' + key + '"' + sel + '>' + (tabLabelMap[key] || key) + '</option>';
      }).join('');

      var landingSection = [
        '<div class="cfg-section">',
        '  <h3 class="cfg-section-title">Default Landing Tab</h3>',
        '  <p class="cfg-section-desc">Which tab loads when the dashboard opens.</p>',
        '  <select class="cfg-select" id="cfgDefaultTab">' + landingOpts + '</select>',
        '</div>'
      ].join('\n');

      // Section 4: Date range default
      var dateOpts = _dateRangeOptions.map(function (o) {
        var sel = cfg.dateRange === o.value ? ' selected' : '';
        return '<option value="' + o.value + '"' + sel + '>' + o.label + '</option>';
      }).join('');

      var dateSection = [
        '<div class="cfg-section">',
        '  <h3 class="cfg-section-title">Default Date Range</h3>',
        '  <p class="cfg-section-desc">Lookback period when no date is specified.</p>',
        '  <select class="cfg-select" id="cfgDateRange">' + dateOpts + '</select>',
        '</div>'
      ].join('\n');

      // Section 5: Theme
      var themeOpts = _themeOptions.map(function (o) {
        var sel = cfg.theme === o.value ? ' selected' : '';
        return '<option value="' + o.value + '"' + sel + '>' + o.label + '</option>';
      }).join('');

      var themeSection = [
        '<div class="cfg-section">',
        '  <h3 class="cfg-section-title">Theme</h3>',
        '  <p class="cfg-section-desc">Control the dashboard appearance.</p>',
        '  <select class="cfg-select" id="cfgTheme">' + themeOpts + '</select>',
        '</div>'
      ].join('\n');

      return [
        '<div class="page cfg-page">',
        '  <h2 class="cfg-title">Configuration</h2>',
        userSection,
        tabSection,
        landingSection,
        dateSection,
        themeSection,
        '</div>'
      ].join('\n');
    },

    _initConfigPage: function (container, content, co, data, ctx) {
      // Tab visibility toggles
      content.querySelectorAll('.cfg-toggle-input').forEach(function (input) {
        input.addEventListener('change', function () {
          var key = input.getAttribute('data-key');
          NS.App._config.tabVisibility[key] = input.checked;
          _saveConfig(NS.App._config);
          NS.App._applyTabVisibility(container);
        });
      });

      // Tab reorder arrows
      content.querySelectorAll('.cfg-arrow-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-key');
          var dir = btn.getAttribute('data-dir');
          var order = NS.App._config.tabOrder;
          var idx = order.indexOf(key);
          if (idx === -1) return;
          var swapIdx = dir === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= order.length) return;
          var tmp = order[idx];
          order[idx] = order[swapIdx];
          order[swapIdx] = tmp;
          _saveConfig(NS.App._config);
          NS.App._applyTabVisibility(container);
          // Re-render config page to update arrow states
          content.innerHTML = NS.App._renderConfigPage(ctx);
          NS.App._initConfigPage(container, content, co, data, ctx);
        });
      });

      // Default tab select
      var tabSelect = content.querySelector('#cfgDefaultTab');
      if (tabSelect) {
        tabSelect.addEventListener('change', function () {
          NS.App._config.defaultTab = tabSelect.value;
          _saveConfig(NS.App._config);
        });
      }

      // Date range select
      var dateSelect = content.querySelector('#cfgDateRange');
      if (dateSelect) {
        dateSelect.addEventListener('change', function () {
          NS.App._config.dateRange = parseInt(dateSelect.value, 10);
          _saveConfig(NS.App._config);
        });
      }

      // Theme select
      var themeSelect = content.querySelector('#cfgTheme');
      if (themeSelect) {
        themeSelect.addEventListener('change', function () {
          NS.App._config.theme = themeSelect.value;
          _saveConfig(NS.App._config);
          NS.App._applyTheme(container);
        });
      }
    }
  };

})(window.mbcxDashboard);
