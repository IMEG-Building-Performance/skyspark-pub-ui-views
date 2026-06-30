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
    prep:       '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>',
    chevron:    '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>',
    tenantAlloc:'<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9zm-5 2a1 1 0 100 2h3a1 1 0 100-2h-3z"/></svg>',
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
    { key: 'meetings',   label: 'Meetings' },
    { key: 'tenant-allocation', label: 'Tenant Usage Allocation' },
    // TODO(auth): meeting-prep is an internal view — once user roles are
    // available, hide it for non-elevated users instead of listing it here.
    { key: 'meeting-prep', label: 'Meeting Prep' }
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

  var _defaultVisibleTabs = { summary: true, faults: true, equipment: true };

  function _applyDefaults(cfg) {
    if (!cfg.tabVisibility) {
      cfg.tabVisibility = {};
      _defaultTabOrder.forEach(function (t) {
        cfg.tabVisibility[t.key] = !!_defaultVisibleTabs[t.key];
      });
    }
    if (!cfg.tabOrder) cfg.tabOrder = _defaultTabOrder.map(function (t) { return t.key; });
    // Merge in tabs added after the user's config was saved (e.g. a new
    // view) so they appear in the sidebar and on the Configuration page.
    _defaultTabOrder.forEach(function (t) {
      if (cfg.tabOrder.indexOf(t.key) === -1) cfg.tabOrder.push(t.key);
      if (cfg.tabVisibility[t.key] === undefined) cfg.tabVisibility[t.key] = !!_defaultVisibleTabs[t.key];
    });
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
      var axon = 'do ' +
        'username: context()->username; ' +
        'existing: readAll(mbcxUserConfig and username==username).first; ' +
        'if (existing != null) ' +
          'commit(diff(existing, {mbcxPrefs: "' + json + '"})) ' +
        'else ' +
          'commit(diff(null, {mbcxUserConfig, username: username, mbcxPrefs: "' + json + '"}, {add})) ' +
        'end';
      NS.api.evalAxon(ctx.attestKey, ctx.projectName, axon).catch(function (e) {
        console.warn('[mbcxDashboard] Config save failed:', e);
      });
    }, 500);
  }

  function _loadConfigRemote(ctx) {
    if (!ctx || !ctx.attestKey) return Promise.resolve(null);
    var axon = 'do ' +
      'rec: readAll(mbcxUserConfig and username==context()->username).first; ' +
      'if (rec != null) rec->mbcxPrefs else null ' +
      'end';
    return NS.api.evalAxonVal(ctx.attestKey, ctx.projectName, axon)
      .then(function (val) {
        if (!val) return null;
        var str = typeof val === 'string' ? val : (val.val || null);
        if (!str) return null;
        try { return JSON.parse(str); } catch (e) { return null; }
      }).catch(function () { return null; });
  }

  // Build the Axon site argument from ctx.
  // Single site  → "@ref"
  // Multi-site   → "[@ref1, @ref2]"  (Axon list literal)
  NS.siteAxonArg = function (ctx) {
    var refs = ctx.siteRefs;
    if (!refs || !refs.length) { console.info('[siteAxonArg] no siteRefs, using siteRef:', ctx.siteRef); return ctx.siteRef || ''; }
    if (refs.length === 1 && refs[0] !== '__all__') { console.info('[siteAxonArg] single ref:', refs[0]); return refs[0]; }
    var concrete = refs.filter(function (r) { return r !== '__all__'; });
    if (!concrete.length) { console.info('[siteAxonArg] no concrete, using siteRef:', ctx.siteRef); return ctx.siteRef || ''; }
    if (concrete.length === 1) { console.info('[siteAxonArg] one concrete:', concrete[0]); return concrete[0]; }
    var result = '[' + concrete.join(', ') + ']';
    console.info('[siteAxonArg] multi:', result);
    return result;
  };

  NS.App = {
    _lastData:  null,
    _lastCtx:   null,
    _activeTab: null,
    _activeFault: null,
    _history:   [],   // in-tool back stack: [{tab, fault?}]
    _navBack:   false,
    _config: _getConfig(),

    _refreshBackBtn: function (container) {
      var b = container.querySelector('#mbcxTopBack');
      if (b) b.style.display = NS.App._history.length ? '' : 'none';
    },

    // Record the current view before navigating away, so the Back button
    // can walk in-tool view history.
    _pushHistory: function () {
      if (NS.App._navBack) return;
      var t = NS.App._activeTab;
      if (!t) return;
      var entry;
      if (t === 'fault-detail' && NS.App._activeFault) {
        entry = { tab: 'fault-detail', fault: NS.App._activeFault };
      } else if (t === 'cup-plant-detail' || t === 'cup-equip-detail') {
        entry = { tab: 'summary' };
      } else {
        entry = { tab: (t === 'fault-list' || t === 'fault-log') ? 'faults' : t };
      }
      var h = NS.App._history;
      if (h.length && h[h.length - 1].tab === entry.tab && entry.tab !== 'fault-detail') return;
      h.push(entry);
      if (h.length > 25) h.shift();
    },

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
      var key = 'mbcxDashboard_state_' + (c.projectName || 'unknown');
      try {
        sessionStorage.setItem(key, JSON.stringify({
          projectName: c.projectName, siteRef: c.siteRef,
          datesStart: c.datesStart, datesEnd: c.datesEnd,
          siteName: c.siteName, tab: NS.App._activeTab
        }));
      } catch (e) {}
    },

    _loadDefOfSuccess: function (container, ctx) {
      var el = container.querySelector('#mbcxDosBanner');
      if (!el || !ctx || !ctx.attestKey || !ctx.siteRef) return;
      var API = NS.api;
      var siteRef = '@' + (ctx.siteRef || '').replace(/^@/, '');

      function esc(s) {
        return String(s == null ? '' : s)
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      }

      function renderCard(val) {
        var hasVal = val && typeof val === 'string' && val.trim();
        el.innerHTML = '<div class="dos-card">' +
          '<div class="dos-hd"><div class="dos-label">Definition of Success</div>' +
          '<button class="dos-edit-btn" id="dosEditBtn">' + (hasVal ? '&#9998; Edit' : '+ Add') + '</button></div>' +
          (hasVal ? '<div class="dos-text">' + esc(val) + '</div>'
                  : '<div class="dos-empty">No definition of success set for this site.</div>') +
          '</div>';
        var editBtn = el.querySelector('#dosEditBtn');
        if (editBtn) editBtn.addEventListener('click', function () { showEditor(val || ''); });
      }

      function showEditor(current) {
        el.innerHTML = '<div class="dos-card dos-card--editing">' +
          '<div class="dos-label">Definition of Success</div>' +
          '<textarea class="dos-textarea" id="dosTextarea" rows="3" placeholder="Enter the definition of success for this site&hellip;">' + esc(current) + '</textarea>' +
          '<div class="dos-edit-actions">' +
          '<button class="dos-save-btn" id="dosSaveBtn">Save to SkySpark</button>' +
          '<button class="dos-cancel-btn" id="dosCancelBtn">Cancel</button>' +
          '</div></div>';
        var ta = el.querySelector('#dosTextarea');
        if (ta) ta.focus();
        var cancelBtn = el.querySelector('#dosCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', function () { renderCard(current); });
        var saveBtn = el.querySelector('#dosSaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', function () {
          var newVal = (ta ? ta.value : '').trim();
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving…';
          var q = '"' + newVal.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n') + '"';
          var axon = 'do s: read(site and id==' + siteRef + ', false); if (s != null) commit(diff(s, {defOfSuccess: ' + q + '})) end';
          API.evalAxon(ctx.attestKey, ctx.projectName, axon)
            .then(function () { renderCard(newVal); })
            .catch(function (err) {
              console.warn('[DoS] Save failed:', err);
              window.alert('Could not save — check permissions (details in console).');
              saveBtn.disabled = false;
              saveBtn.textContent = 'Save to SkySpark';
            });
        });
      }

      API.evalAxon(ctx.attestKey, ctx.projectName, 'do s: read(site and id==' + siteRef + ', false); if (s != null) s->defOfSuccess else null end')
        .then(function (grid) {
          var HP = NS.haystackParser;
          var parsed = HP.parseGrid(grid);
          var val = parsed.rows.length ? parsed.rows[0][parsed.cols[0]] : null;
          renderCard(val);
        })
        .catch(function () { renderCard(''); });
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
        FaultSummaries: window.mbcxDashboard.components.FaultSummaries,
        FaultDetail:    window.mbcxDashboard.components.FaultDetail,
        EquipmentView:  window.mbcxDashboard.components.EquipmentView,
        MeetingView:    window.mbcxDashboard.components.MeetingView,
        MeetingPrep:    window.mbcxDashboard.components.MeetingPrep,
        TrendingView:   window.mbcxDashboard.components.TrendingView,
        Compliance:     window.mbcxDashboard.components.Compliance,
        FaultLog:       window.mbcxDashboard.components.FaultLog,
        TenantAllocation: window.mbcxDashboard.components.TenantAllocation,
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
        '    <button class="dash-sb-nav-item" data-tab="compliance">' + _icons.compliance + '<span>Compliance</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="equipment">'  + _icons.equipment  + '<span>Equipment</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="trends">'   + _icons.trends   + '<span>Trends</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="meetings">' + _icons.meetings + '<span>Meetings</span></button>',
        '    <button class="dash-sb-nav-item" data-tab="tenant-allocation">' + _icons.tenantAlloc + '<span>Tenant Usage Allocation</span></button>',
        // TODO(auth): only render Meeting Prep for elevated users — and
        // enforce the role server-side in any Axon funcs the view calls.
        '    <button class="dash-sb-nav-item" data-tab="meeting-prep">' + _icons.prep + '<span>Meeting Prep</span></button>',
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
        '    <button class="dash-topbar-back" id="mbcxTopBack" style="display:none" title="Back to previous view">&#8592; Back</button>',
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

      var initRefs = ctx.isAllSites ? ['__all__']
        : ctx.siteRefs ? ctx.siteRefs.slice()
        : ctx.siteRef  ? [ctx.siteRef]
        : [];
      var siteSelector = NS.siteSelector.create({
        container:     siteMountEl,
        selectedRefs:  initRefs,
        selectedLabel: ctx.siteName || '— Select site —',
        onChange: function () { doLoad(); }
      });

      // ── In-tool Back (topbar) ─────────────────────────────────────────
      // Walks view history; only visible when there is somewhere to go.
      // The hover-reveal escape button stays a pure exit to SkySpark.
      NS.App._history = [];
      var topBack = container.querySelector('#mbcxTopBack');
      if (topBack) {
        topBack.addEventListener('click', function () {
          var h = NS.App._history;
          if (!h.length) return;
          var entry = h.pop();
          NS.App._navBack = true;
          try {
            if (entry.tab === 'fault-detail' && entry.fault) {
              NS.App.showFaultDetail(container, entry.fault, NS.Components);
            } else {
              NS.App._showTab(container, entry.tab, NS.Components, NS.App._lastData, NS.App._lastCtx);
            }
          } finally { NS.App._navBack = false; }
          NS.App._refreshBackBtn(container);
        });
      }

      // ── Sidebar collapse ──────────────────────────────────────────────
      if (collapseBtn) {
        collapseBtn.addEventListener('click', function () {
          sidebar.classList.toggle('dash-sidebar--collapsed');
        });
      }

      // ── Populate site list ────────────────────────────────────────────
      if (ctx && ctx.attestKey && ctx.projectName) {
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
            // Store all site refs so "All Sites" can resolve at query time
            NS.App._allSiteRefs = siteList.map(function (s) { return s.ref; });
            siteSelector.setSites(siteList, ctx.siteRef);
          })
          .catch(function (err) {
            console.warn('[mbcxDashboard] Could not load site list:', err);
            if (ctx.siteRef) {
              NS.App._allSiteRefs = [ctx.siteRef];
              siteSelector.setSites([{ ref: ctx.siteRef, dis: ctx.siteName || ctx.siteRef }], ctx.siteRef);
            }
          });
      } else {
        console.warn('[mbcxDashboard] No credentials — demo mode.');
      }

      // ── Load handler ──────────────────────────────────────────────────
      var picker; // assigned after doLoad is defined

      function doLoad() {
        var newSiteRefs = siteSelector.getSelectedRefs ? siteSelector.getSelectedRefs() : [siteSelector.getSelectedRef()];
        var newSiteRef  = newSiteRefs[0] || '';   // first ref (legacy single-site; Step 2 will use the full array)
        var newStart    = picker ? picker.getStartDate() : startVal;
        var newEnd      = picker ? picker.getEndDate()   : endVal;

        if (!newSiteRefs.length) {
          _showNoSitePrompt(content);
          return;
        }

        if (spinner) spinner.style.display = 'inline-block';

        // Resolve "All Sites" to concrete refs for query building
        var resolvedRefs = newSiteRefs;
        var isAll = siteSelector.isAllSites ? siteSelector.isAllSites() : false;
        if (isAll && NS.App._allSiteRefs) resolvedRefs = NS.App._allSiteRefs;

        var newCtx = {
          attestKey:   ctx && ctx.attestKey,
          projectName: ctx && ctx.projectName,
          siteRef:     newSiteRef || (ctx && ctx.siteRef),
          siteRefs:    resolvedRefs,               // concrete refs (never __all__)
          isAllSites:  isAll,
          allSiteRefs: NS.App._allSiteRefs || [],  // full site list for reference
          datesStart:  newStart   || (ctx && ctx.datesStart),
          datesEnd:    newEnd     || (ctx && ctx.datesEnd),
          siteName:    siteSelector.getSelectedDis() || (ctx && ctx.siteName)
        };

        var preserveTab = NS.App._activeTab;
        function finish(d) {
          if (spinner) spinner.style.display = 'none';
          NS.App.init(container, d, newCtx);
          if (preserveTab && preserveTab !== 'config') {
            NS.App._showTab(container, preserveTab,
              NS.Components, d, newCtx);
          }
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
      NS.App._pushHistory();
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
      NS.App._refreshBackBtn(container);
    },

    showCupEquipDetail: function (container, equipName, systemKey, co, data, ctx) {
      NS.App._pushHistory();
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
      NS.App._refreshBackBtn(container);
    },

    showFaultDetail: function (container, fault, co, opts) {
      opts = opts || {};
      NS.App._pushHistory();
      if (NS.App._activeTab === 'trends' && co.TrendingView) co.TrendingView.destroy();
      if (NS.App._activeTab === 'fault-detail' && co.FaultDetail) co.FaultDetail.destroy();
      NS.App._activeTab = 'fault-detail';
      NS.App._activeFault = fault;
      container.querySelectorAll('.dash-sb-nav-item').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === 'faults');
      });
      var content = container.querySelector('#mbcxContent');
      // Remember the fault-list scroll position and the opened fault so
      // Back returns to the same place with the viewed row highlighted.
      if (co.FaultList) {
        co.FaultList._returnScroll = content.scrollTop;
        co.FaultList._returnFid = fault.id;
      }
      content.classList.remove('dash-content--fixed');
      var allFaults = co.FaultList && co.FaultList._state ? co.FaultList._state.rows : [];
      if (co.FaultDetail) {
        co.FaultDetail.show(content, fault, allFaults, NS.App._lastCtx, opts.onBack || function () {
          NS.App._showTab(container, 'faults', co, NS.App._lastData, NS.App._lastCtx);
        }, opts.backLabel ? { backLabel: opts.backLabel } : undefined);
      }
      NS.App._refreshBackBtn(container);
    },

    _showTab: function (container, tab, co, data, ctx) {
      NS.App._pushHistory();
      NS.App._activeFault = null;
      if (NS.App._activeTab === 'trends' && co.TrendingView && co.TrendingView.destroy) {
        co.TrendingView.destroy();
      }
      if (NS.App._activeTab === 'fault-detail' && co.FaultDetail && co.FaultDetail.destroy) {
        co.FaultDetail.destroy();
      }
      if (NS.App._activeTab === 'meetings' && co.MeetingView && co.MeetingView.destroy) {
        co.MeetingView.destroy(co);
      }
      if (NS.App._activeTab === 'compliance' && co.Compliance && co.Compliance.destroy) {
        co.Compliance.destroy();
      }
      if (NS.App._activeTab === 'meeting-prep' && co.MeetingPrep && co.MeetingPrep.destroy) {
        co.MeetingPrep.destroy();
      }
      if (NS.App._activeTab === 'tenant-allocation' && co.TenantAllocation && co.TenantAllocation.destroy) {
        co.TenantAllocation.destroy();
      }
      NS.App._activeTab = tab;
      NS.App._persistState();

      var faultTabs = ['faults', 'fault-list'];
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
          '<div class="dos-banner" id="mbcxDosBanner"></div>',
          co.CUP            ? co.CUP.render(data)            : '',
          co.AHU            ? co.AHU.render(data)            : '',
          co.TerminalUnits  ? co.TerminalUnits.render()      : '',
          '</div>'
        ].join('\n');
        NS.App._loadDefOfSuccess(container, ctx);
        if (co.CUP && co.CUP.initCard) co.CUP.initCard(content, container, co, data, ctx || null);
        if (co.AHU)                     co.AHU.initLive(container, ctx || null);
        if (co.TerminalUnits)           co.TerminalUnits.initLive(container, ctx || null);
      }
      // 'fault-log' is a legacy tab key (old sidebar sub-item, also restored
      // from saved session state) — it now lives as a sub-tab of Faults.
      else if (tab === 'faults' || tab === 'fault-list' || tab === 'fault-log') {
        var initialFlTab = tab === 'fault-log' ? 'fault-log' : 'list';
        NS.App._activeTab = 'fault-list';
        NS.App._persistState();
        content.innerHTML = [
          '<div class="fl-page-outer">',
          '  <div class="fl-page-tabs">',
          '    <button class="fl-page-tab fl-page-tab--active" data-fltab="list">Fault List</button>',
          '    <button class="fl-page-tab" data-fltab="summaries">Fault Summaries</button>',
          '    <button class="fl-page-tab" data-fltab="fault-log">Fault Log</button>',
          '  </div>',
          '  <div id="flTabContent"></div>',
          '</div>'
        ].join('\n');

        var flTabContent = content.querySelector('#flTabContent');
        var flTabs = content.querySelectorAll('.fl-page-tab');

        function showFlTab(which) {
          flTabs.forEach(function (t) { t.classList.toggle('fl-page-tab--active', t.getAttribute('data-fltab') === which); });
          if (which === 'list') {
            flTabContent.innerHTML = co.FaultList ? co.FaultList.renderPage() : '<div class="tu-loading">Fault List not loaded.</div>';
            if (co.FaultList) {
              co.FaultList.onFaultClick = function (fault) { NS.App.showFaultDetail(container, fault, co); };
              co.FaultList.initLive(container, ctx || null);
            }
          } else if (which === 'summaries') {
            flTabContent.innerHTML = co.FaultSummaries ? co.FaultSummaries.renderPage() : '<div class="tu-loading">Fault Summaries not loaded.</div>';
            if (co.FaultSummaries) co.FaultSummaries.initLive(flTabContent, ctx || null);
          } else if (which === 'fault-log') {
            flTabContent.innerHTML = co.FaultLog ? co.FaultLog.renderPage() : '<div class="tu-loading">Fault Log not loaded.</div>';
            if (co.FaultLog) co.FaultLog.initLive(flTabContent, ctx || null);
          }
        }

        flTabs.forEach(function (t) {
          t.addEventListener('click', function () { showFlTab(t.getAttribute('data-fltab')); });
        });

        showFlTab(initialFlTab);
      }
      else if (tab === 'trends') {
        if (co.TrendingView) co.TrendingView.showInContent(content, ctx || {});
      }
      else if (tab === 'meetings') {
        if (co.MeetingView) co.MeetingView.showInContent(content, ctx || {}, co);
      }
      else if (tab === 'meeting-prep') {
        // TODO(auth): internal view — verify the user's role before showing
        // once roles are plumbed through (see MeetingPrep.js header).
        if (co.MeetingPrep) {
          content.innerHTML = co.MeetingPrep.renderPage();
          co.MeetingPrep.initLive(content, ctx || null, co, container);
        }
      }
      else if (tab === 'compliance') {
        if (co.Compliance) {
          content.innerHTML = co.Compliance.render();
          co.Compliance.initLive(container, ctx || null);
        }
      }
      else if (tab === 'equipment') {
        NS.App._activeTab = 'equipment';
        NS.App._persistState();
        if (co.EquipmentView) {
          content.innerHTML = co.EquipmentView.renderPage();
          co.EquipmentView.initLive(content, ctx || null);
        } else {
          content.innerHTML = '<div class="page" style="padding:32px;color:#9ca3af;">Equipment view not loaded.</div>';
        }
      }
      else if (tab === 'tenant-allocation') {
        if (co.TenantAllocation) {
          content.innerHTML = co.TenantAllocation.renderPage();
          co.TenantAllocation.initLive(content, ctx || null);
        } else {
          content.innerHTML = '<div class="page" style="padding:32px;color:#9ca3af;">Tenant Usage Allocation not loaded.</div>';
        }
      }
      else if (tab === 'config') {
        content.innerHTML = NS.App._renderConfigPage(ctx);
        NS.App._initConfigPage(container, content, co, data, ctx);
      }

      NS.App._refreshBackBtn(container);
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

      var superSection = [
        '<div class="cfg-section">',
        '  <h3 class="cfg-section-title">Superuser</h3>',
        '  <p class="cfg-section-desc">Push your current configuration to every user in this project.</p>',
        '  <button class="cfg-btn cfg-btn-warn" id="cfgUpdateAllUsers">Update for All Users</button>',
        '  <span id="cfgUpdateAllStatus" style="margin-left:8px;font-size:0.85em;"></span>',
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
        superSection,
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

      // Update for All Users button
      var updateAllBtn = content.querySelector('#cfgUpdateAllUsers');
      var updateAllStatus = content.querySelector('#cfgUpdateAllStatus');
      if (updateAllBtn) {
        updateAllBtn.addEventListener('click', function () {
          if (!confirm("This will overwrite every user\u0027s configuration with your current settings. Continue?")) return;
          updateAllBtn.disabled = true;
          updateAllStatus.textContent = 'Updating...';
          var cfgCtx = NS.App._lastCtx;
          if (!cfgCtx || !cfgCtx.attestKey) {
            updateAllStatus.textContent = 'No session context.';
            updateAllBtn.disabled = false;
            return;
          }
          var json = JSON.stringify(NS.App._config).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          var axon = 'do ' +
            'recs: readAll(mbcxUserConfig); ' +
            'recs.each(rec => commit(diff(rec, {mbcxPrefs: "' + json + '"}))); ' +
            'recs.size ' +
            'end';
          NS.api.evalAxon(cfgCtx.attestKey, cfgCtx.projectName, axon).then(function () {
            updateAllStatus.textContent = 'Done - all users updated.';
            updateAllBtn.disabled = false;
          }).catch(function (e) {
            console.warn('[mbcxDashboard] Update all users failed:', e);
            updateAllStatus.textContent = 'Failed: ' + e.message;
            updateAllBtn.disabled = false;
          });
        });
      }
    }
  };

})(window.mbcxDashboard);
