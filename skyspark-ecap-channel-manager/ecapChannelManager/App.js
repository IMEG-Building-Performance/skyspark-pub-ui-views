// App.js
// Main rendering engine for the ECAP Channel Manager.
// Vanilla JS — no framework dependencies.
window.ecapChannelManager = window.ecapChannelManager || {};

(function (NS) {

  var HEADER_BG = '#2f5233';

  var SITES = ['All Sites', 'STL-001 Main Campus', 'STL-002 West Wing', 'CHI-001 North Tower'];

  var INITIAL_POINTS = [
    { id: 1, name: 'AHU-1.ChW.Flow', site: 'STL-001 Main Campus', equip: 'AHU-1', meterID: 'M-4021', profileId: 'P-101', channelImportId: 10000, lastPush: '2026-06-01 14:00', status: 'ok' },
    { id: 2, name: 'AHU-1.ChW.Supply', site: 'STL-001 Main Campus', equip: 'AHU-1', meterID: 'M-4021', profileId: 'P-101', channelImportId: 10001, lastPush: '2026-06-01 14:00', status: 'ok' },
    { id: 3, name: 'AHU-1.ChW.Return', site: 'STL-001 Main Campus', equip: 'AHU-1', meterID: 'M-4021', profileId: 'P-101', channelImportId: 10002, lastPush: '2026-06-01 14:00', status: 'ok' },
    { id: 4, name: 'AHU-2.HW.Flow', site: 'STL-001 Main Campus', equip: 'AHU-2', meterID: 'M-4022', profileId: 'P-102', channelImportId: 10003, lastPush: '2026-06-01 14:00', status: 'error', error: 'ECAP 401: Token expired' },
    { id: 5, name: 'Boiler-1.Gas.Usage', site: 'STL-002 West Wing', equip: 'Boiler-1', meterID: 'M-4030', profileId: 'P-110', channelImportId: 10004, lastPush: '2026-06-01 14:00', status: 'ok' },
    { id: 6, name: 'CT-1.ElecMeter', site: 'CHI-001 North Tower', equip: 'CT-1', meterID: 'M-5001', profileId: 'P-200', channelImportId: 10005, lastPush: '2026-05-31 22:00', status: 'error', error: 'ECAP 404: Channel not found' }
  ];

  var UNTAGGED_POINTS = [
    { id: 101, name: 'AHU-3.ChW.Flow', site: 'STL-001 Main Campus', equip: 'AHU-3' },
    { id: 102, name: 'AHU-3.ChW.Supply', site: 'STL-001 Main Campus', equip: 'AHU-3' },
    { id: 103, name: 'Boiler-2.Gas.Usage', site: 'STL-002 West Wing', equip: 'Boiler-2' },
    { id: 104, name: 'CT-2.ElecMeter', site: 'CHI-001 North Tower', equip: 'CT-2' }
  ];

  var ERROR_LOG = [
    { ts: '2026-06-01 14:00:12', point: 'AHU-2.HW.Flow', channelId: 10003, msg: 'ECAP 401: Token expired', site: 'STL-001 Main Campus' },
    { ts: '2026-05-31 22:00:08', point: 'CT-1.ElecMeter', channelId: 10005, msg: 'ECAP 404: Channel not found', site: 'CHI-001 North Tower' },
    { ts: '2026-05-30 14:00:45', point: 'AHU-2.HW.Flow', channelId: 10003, msg: 'ECAP 401: Token expired', site: 'STL-001 Main Campus' }
  ];

  // ── Shared state ─────────────────────────────────────────────────────────────
  var _state = {};
  var _container = null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _getFiltered() {
    var site = _state.site;
    var pts = site === 'All Sites' ? _state.points : _state.points.filter(function (p) { return p.site === site; });
    if (_state.sortCol) {
      pts = pts.slice().sort(function (a, b) {
        var av = a[_state.sortCol], bv = b[_state.sortCol];
        var cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return _state.sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return pts;
  }

  function _getErrors() {
    var site = _state.site;
    return site === 'All Sites' ? ERROR_LOG : ERROR_LOG.filter(function (e) { return e.site === site; });
  }

  function _getUntagged() {
    var site = _state.site;
    return site === 'All Sites' ? UNTAGGED_POINTS : UNTAGGED_POINTS.filter(function (p) { return p.site === site; });
  }

  function _getKpis() {
    var site = _state.site;
    var f = site === 'All Sites' ? _state.points : _state.points.filter(function (p) { return p.site === site; });
    var untagged = _getUntagged();
    return {
      total: f.length,
      ok: f.filter(function (p) { return p.status === 'ok'; }).length,
      errors: f.filter(function (p) { return p.status === 'error'; }).length,
      untagged: untagged.length
    };
  }

  function _getNextChannelId() {
    var max = _state.points.reduce(function (m, p) { return Math.max(m, p.channelImportId); }, 9999);
    return max + 1;
  }

  // ── Render: Header ──────────────────────────────────────────────────────────
  function _renderHeader() {
    var siteOptions = SITES.map(function (s) {
      return '<option value="' + _esc(s) + '"' + (s === _state.site ? ' selected' : '') + '>' + _esc(s) + '</option>';
    }).join('');

    return (
      '<div class="ecm-header">' +
        '<div class="ecm-header-left">' +
          '<div class="ecm-header-title">ECAP Channel Manager</div>' +
          '<span class="ecm-header-badge">pUb Tool</span>' +
        '</div>' +
        '<div class="ecm-header-right">' +
          '<div class="ecm-site-selector">' +
            '<span class="ecm-site-label">Site</span>' +
            '<select class="ecm-site-select" data-action="site-select">' + siteOptions + '</select>' +
          '</div>' +
          '<div class="ecm-next-id">Next ID: <strong>' + _getNextChannelId() + '</strong></div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Render: KPIs ────────────────────────────────────────────────────────────
  function _renderKpis() {
    var kpis = _getKpis();
    var cards = [
      { label: 'Tagged Points', value: kpis.total, color: '#2a2a28' },
      { label: 'Pushing OK', value: kpis.ok, color: '#16a34a' },
      { label: 'Errors', value: kpis.errors, color: '#dc2626' },
      { label: 'Untagged', value: kpis.untagged, color: '#d97706' }
    ];
    var html = '<div class="ecm-kpi-grid">';
    cards.forEach(function (k) {
      html += '<div class="ecm-card">' +
        '<span class="ecm-kpi-label">' + _esc(k.label) + '</span>' +
        '<div class="ecm-kpi-value" style="color:' + k.color + '">' + k.value + '</div>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  // ── Render: Tabs ────────────────────────────────────────────────────────────
  function _renderTabs() {
    var tabs = [
      { id: 'registry', label: 'Channel Registry' },
      { id: 'new', label: 'New Channels' },
      { id: 'errors', label: 'Schedule & Errors' }
    ];
    var html = '<div class="ecm-tabs">';
    tabs.forEach(function (t) {
      html += '<button class="ecm-tab' + (t.id === _state.tab ? ' is-active' : '') + '" data-tab="' + t.id + '">' + _esc(t.label) + '</button>';
    });
    html += '</div>';
    return html;
  }

  // ── Render: Registry Tab ────────────────────────────────────────────────────
  function _renderRegistryTab() {
    var filtered = _getFiltered();
    var cols = [
      ['name', 'Point Name'],
      ['equip', 'Equip'],
      ['meterID', 'Meter ID'],
      ['profileId', 'Profile ID'],
      ['channelImportId', 'Channel ID'],
      ['lastPush', 'Last Push'],
      ['status', 'Status']
    ];

    var thead = '<tr>';
    cols.forEach(function (c) {
      var arrow = '';
      if (_state.sortCol === c[0]) arrow = _state.sortDir === 'asc' ? ' &uarr;' : ' &darr;';
      thead += '<th class="ecm-th" data-sort="' + c[0] + '">' + c[1] + arrow + '</th>';
    });
    thead += '<th class="ecm-th no-sort">Actions</th></tr>';

    var tbody = '';
    filtered.forEach(function (p) {
      var rowClass = p.status === 'error' ? ' class="ecm-row-error"' : '';
      var statusDotClass = p.status === 'ok' ? 'ok' : p.status === 'error' ? 'error' : 'unknown';
      var statusText = p.status === 'ok' ? 'OK' : _esc(p.error);
      var testResult = _state.testResults[p.id];
      var testBtnText = testResult === 'testing' ? 'Testing…' : 'Test POST';
      var testBadge = '';
      if (testResult === 'pass') testBadge = '<span class="ecm-test-pass">✓ Pass</span>';
      if (testResult === 'fail') testBadge = '<span class="ecm-test-fail">✗ Fail</span>';

      tbody += '<tr' + rowClass + '>' +
        '<td class="ecm-td bold">' + _esc(p.name) + '</td>' +
        '<td class="ecm-td">' + _esc(p.equip) + '</td>' +
        '<td class="ecm-td mono">' + _esc(p.meterID) + '</td>' +
        '<td class="ecm-td mono">' + _esc(p.profileId) + '</td>' +
        '<td class="ecm-td mono">' + p.channelImportId + '</td>' +
        '<td class="ecm-td muted">' + _esc(p.lastPush) + '</td>' +
        '<td class="ecm-td"><span class="ecm-status"><span class="ecm-status-dot ' + statusDotClass + '"></span><span class="ecm-status-text">' + statusText + '</span></span></td>' +
        '<td class="ecm-td">' +
          '<button class="ecm-btn secondary small" data-test-post="' + p.id + '">' + testBtnText + '</button>' +
          testBadge +
        '</td>' +
      '</tr>';
    });

    return '<div class="ecm-card"><div style="overflow-x:auto">' +
      '<table class="ecm-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>' +
    '</div></div>';
  }

  // ── Render: New Channels Tab ────────────────────────────────────────────────
  function _renderNewTab() {
    var untagged = _getUntagged();

    var thead = '<tr>' +
      '<th class="ecm-th">Point Name</th>' +
      '<th class="ecm-th">Equip</th>' +
      '<th class="ecm-th no-sort">Meter ID</th>' +
      '<th class="ecm-th no-sort">Profile ID</th>' +
      '<th class="ecm-th no-sort">Channel ID <span style="font-weight:400;text-transform:none;letter-spacing:0;margin-left:4px;color:#9ca3af;font-size:9px">(recommended)</span></th>' +
    '</tr>';

    var tbody = '';
    var readyCount = 0;
    untagged.forEach(function (p) {
      var tags = _state.pointTags[p.id] || {};
      var rowReady = tags.meterID && tags.profileId && tags.channelImportId;
      if (rowReady) readyCount++;
      var chClass = tags.channelImportId ? ' has-value' : '';

      tbody += '<tr>' +
        '<td class="ecm-td bold">' + _esc(p.name) + '</td>' +
        '<td class="ecm-td">' + _esc(p.equip) + '</td>' +
        '<td class="ecm-td" style="min-width:100px">' +
          '<input class="ecm-input" value="' + _esc(tags.meterID || '') + '" placeholder="M-XXXX" data-tag-id="' + p.id + '" data-tag-field="meterID">' +
        '</td>' +
        '<td class="ecm-td" style="min-width:90px">' +
          '<input class="ecm-input" value="' + _esc(tags.profileId || '') + '" placeholder="P-XXX" data-tag-id="' + p.id + '" data-tag-field="profileId">' +
        '</td>' +
        '<td class="ecm-td" style="min-width:100px">' +
          '<div class="ecm-channel-id-cell">' +
            '<input class="ecm-input' + chClass + '" value="' + _esc(tags.channelImportId || '') + '" data-tag-id="' + p.id + '" data-tag-field="channelImportId">' +
            (rowReady ? '<span class="ecm-row-check">✓</span>' : '') +
          '</div>' +
        '</td>' +
      '</tr>';
    });

    var hintText = readyCount > 0
      ? readyCount + ' point' + (readyCount !== 1 ? 's' : '') + ' ready to tag'
      : 'Fill in all three fields on a row to enable tagging';

    return '<div class="ecm-card">' +
      '<div class="ecm-new-header">' +
        '<div class="ecm-new-title">Assign ECAP Tags to Untagged Points</div>' +
        '<div class="ecm-new-subtitle">Each row is pre-filled with a recommended Channel ID. Edit any field inline.</div>' +
      '</div>' +
      '<div style="overflow-x:auto">' +
        '<table class="ecm-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>' +
      '</div>' +
      '<div class="ecm-apply-bar">' +
        '<button class="ecm-btn primary" data-action="apply-tags"' + (readyCount === 0 ? ' disabled' : '') + '>Apply Tags</button>' +
        '<span class="ecm-apply-hint">' + _esc(hintText) + '</span>' +
      '</div>' +
    '</div>';
  }

  // ── Render: Errors Tab ──────────────────────────────────────────────────────
  function _renderErrorsTab() {
    var errors = _getErrors();

    var scheduleCard = '<div class="ecm-card">' +
      '<div class="ecm-section-title">Task Schedule</div>' +
      '<div class="ecm-schedule-grid">' +
        '<div>' +
          '<span class="ecm-schedule-label">POST ALL Schedule</span>' +
          '<div class="ecm-schedule-value">Daily @ 02:00 UTC</div>' +
          '<div class="ecm-schedule-sub">Task: ecapPostAll</div>' +
        '</div>' +
        '<div>' +
          '<span class="ecm-schedule-label">Last Run</span>' +
          '<div class="ecm-schedule-value">2026-06-01 02:00:12 UTC</div>' +
          '<div class="ecm-schedule-status">' +
            '<span class="ecm-status-dot error"></span>' +
            '<span class="ecm-schedule-status-text">Completed with 2 errors</span>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<span class="ecm-schedule-label">Next Run</span>' +
          '<div class="ecm-schedule-value">2026-06-02 02:00 UTC</div>' +
          '<div style="margin-top:6px"><button class="ecm-btn secondary small" data-action="run-now">Run Now</button></div>' +
        '</div>' +
      '</div>' +
    '</div>';

    var errorThead = '<tr>' +
      '<th class="ecm-th">Timestamp</th>' +
      '<th class="ecm-th">Point</th>' +
      '<th class="ecm-th">Channel ID</th>' +
      '<th class="ecm-th">Error</th>' +
      '<th class="ecm-th no-sort">Actions</th>' +
    '</tr>';

    var errorTbody = '';
    errors.forEach(function (e, i) {
      errorTbody += '<tr>' +
        '<td class="ecm-td mono muted" style="font-size:11px">' + _esc(e.ts) + '</td>' +
        '<td class="ecm-td bold">' + _esc(e.point) + '</td>' +
        '<td class="ecm-td mono">' + e.channelId + '</td>' +
        '<td class="ecm-td ecm-error-msg">' + _esc(e.msg) + '</td>' +
        '<td class="ecm-td"><button class="ecm-btn secondary small" data-action="retry" data-idx="' + i + '">Retry</button></td>' +
      '</tr>';
    });

    var errorCard = '<div class="ecm-card">' +
      '<div class="ecm-error-header">' +
        '<div class="ecm-error-title">Error Log</div>' +
        '<button class="ecm-btn danger small" data-action="retry-all">Retry All Failed (' + errors.length + ')</button>' +
      '</div>' +
      '<table class="ecm-table"><thead>' + errorThead + '</thead><tbody>' + errorTbody + '</tbody></table>' +
    '</div>';

    return '<div class="ecm-errors-stack">' + scheduleCard + errorCard + '</div>';
  }

  // ── Render: body (below header) ─────────────────────────────────────────────
  function _renderBody() {
    var body = _container && _container.querySelector('#ecm-body');
    if (!body) return;

    var content = '';
    if (_state.tab === 'registry') content = _renderRegistryTab();
    else if (_state.tab === 'new') content = _renderNewTab();
    else if (_state.tab === 'errors') content = _renderErrorsTab();

    body.innerHTML = _renderKpis() + _renderTabs() + content;
  }

  // ── Render: full page ───────────────────────────────────────────────────────
  function _renderAll() {
    _container.innerHTML = _renderHeader() + '<div id="ecm-body" class="ecm-container"></div>';
    _renderBody();
  }

  // ── Event handling ──────────────────────────────────────────────────────────
  function _attachListeners() {
    if (!_container) return;

    _container.addEventListener('click', function (e) {
      // Tab switch
      var tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        var t = tabBtn.getAttribute('data-tab');
        if (t && t !== _state.tab) {
          _state.tab = t;
          _renderBody();
        }
        return;
      }

      // Sort column
      var sortBtn = e.target.closest('[data-sort]');
      if (sortBtn) {
        var col = sortBtn.getAttribute('data-sort');
        if (col) {
          if (_state.sortCol === col) {
            _state.sortDir = _state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            _state.sortCol = col;
            _state.sortDir = 'asc';
          }
          _renderBody();
        }
        return;
      }

      // Test POST
      var testBtn = e.target.closest('[data-test-post]');
      if (testBtn) {
        var id = Number(testBtn.getAttribute('data-test-post'));
        _state.testResults[id] = 'testing';
        _renderBody();
        setTimeout(function () {
          _state.testResults[id] = Math.random() > 0.3 ? 'pass' : 'fail';
          _renderBody();
        }, 1200);
        return;
      }
    });

    _container.addEventListener('change', function (e) {
      // Site selector
      if (e.target.matches('[data-action="site-select"]')) {
        _state.site = e.target.value;
        _renderAll();
        return;
      }
    });

    _container.addEventListener('input', function (e) {
      // Tag field inputs
      var tagId = e.target.getAttribute('data-tag-id');
      var tagField = e.target.getAttribute('data-tag-field');
      if (tagId && tagField) {
        var id = Number(tagId);
        if (!_state.pointTags[id]) _state.pointTags[id] = {};
        _state.pointTags[id][tagField] = e.target.value;
        _renderBody();
      }
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  NS.App = {
    init: function (container) {
      _container = container;

      var initTags = {};
      UNTAGGED_POINTS.forEach(function (p, i) {
        initTags[p.id] = { meterID: '', profileId: '', channelImportId: String(10006 + i) };
      });

      _state = {
        tab: 'registry',
        site: 'All Sites',
        points: INITIAL_POINTS,
        pointTags: initTags,
        testResults: {},
        sortCol: null,
        sortDir: 'asc'
      };

      _renderAll();
      _attachListeners();
    }
  };

})(window.ecapChannelManager);
