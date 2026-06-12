// components/MeetingPrep.js — Meeting Preparation workspace (demo)
//
// Guided two-step flow:
//   Step 1 — Fault Log review: tabular checklist of open log items; mark
//            each reviewed (or use Mark All) and add any to the agenda.
//            Step 2 unlocks once every item is reviewed.
//   Step 2 — new-fault triage inbox: faults grouped by equipment, ranked
//            by severity/active%, worked from the top. One-click Agenda /
//            Skip at group or fault level; decided groups leave the queue;
//            skips persist across prep sessions so the inbox shrinks over
//            time instead of resetting.
// The agenda rail is visible throughout and hands off to the Meetings
// presenter.
//
// INTERNAL VIEW — intended for elevated (superuser) users only.
// TODO(auth): role gating is NOT implemented yet. Before client deployment:
//   1. Hide the sidebar item unless the user's record carries an elevated role.
//   2. Enforce server-side: any Axon funcs that read/write prep or meeting
//      recs must verify the role via context() — hiding the tab is cosmetic.
//
// TODO(data): demo data only. Live sources when wired:
//   logItems  <- Fault Log rows with status=="Open"
//   newFaults <- live fault list minus faults already in the Fault Log
// Draft state persists to localStorage for now; should move to an
// mbcxMeeting draft rec so prep survives across machines and becomes the
// publish queue into the Fault Log. Persistent skips belong on the fault/
// rule-target pair server-side so the whole team shares them.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Demo data ─────────────────────────────────────────────────────────────
  var _DEMO = {
    lastMeeting: '2026-05-14',
    logItems: [
      { id: 'log-14', equipment: 'AHU-2',     faultName: 'OA damper not responding to setpoint', priority: 'High',   assignedTo: 'J. Miller', dateAdded: '2026-04-16',
        comments: 'Actuator replacement quoted — awaiting PO.' },
      { id: 'log-17', equipment: 'CUP-CHW-1', faultName: 'Differential pressure not at setpoint', priority: 'Medium', assignedTo: 'Controls',  dateAdded: '2026-04-30',
        comments: 'Suspected sensor drift; verify after recalibration.' },
      { id: 'log-21', equipment: 'VAV-L1-02', faultName: 'Faulty reheat coil — SAT 95°F',        priority: 'High',   assignedTo: '',          dateAdded: '2026-05-14',
        comments: 'Valve scheduled for replacement 5/22.' },
      { id: 'log-22', equipment: 'AHU-1',     faultName: 'Cooling valve stuck open',             priority: 'Low',    assignedTo: 'J. Miller', dateAdded: '2026-05-14',
        comments: 'Rebuilt 4/30 — monitoring for recurrence.' }
    ],
    newFaults: [
      { id: 'n1',  equipment: 'AHU-3',      faultName: 'Supply air temp sensor drift',          sevNorm: 7, faultActive: 77, firstSeen: '2026-05-27' },
      { id: 'n2',  equipment: 'AHU-3',      faultName: 'Cooling valve hunting',                 sevNorm: 5, faultActive: 41, firstSeen: '2026-05-29' },
      { id: 'n3',  equipment: 'AHU-3',      faultName: 'Discharge static below setpoint',       sevNorm: 4, faultActive: 33, firstSeen: '2026-06-01' },
      { id: 'n4',  equipment: 'VAV 2-1 AW', faultName: 'VAV - Damper At 100%',                  sevNorm: 7, faultActive: 64, firstSeen: '2026-05-19' },
      { id: 'n5',  equipment: 'VAV 2-1 AW', faultName: 'Zone temp below setpoint',              sevNorm: 4, faultActive: 28, firstSeen: '2026-05-21' },
      { id: 'n6',  equipment: 'CUP-CHW-2',  faultName: 'Chiller surge detected',                sevNorm: 8, faultActive: 12, firstSeen: '2026-06-06' },
      { id: 'n7',  equipment: 'VAV-L2-06',  faultName: 'Zone temp above setpoint >2h occupied', sevNorm: 5, faultActive: 21, firstSeen: '2026-06-02' },
      { id: 'n8',  equipment: 'VAV-L2-06',  faultName: 'Damper at minimum — low airflow',       sevNorm: 3, faultActive: 18, firstSeen: '2026-06-03' },
      { id: 'n9',  equipment: 'CUP-HW-1',   faultName: 'HW supply temp below setpoint',         sevNorm: 2, faultActive: 12, firstSeen: '2026-06-05' },
      { id: 'n10', equipment: 'AHU-1',      faultName: 'VFD speed oscillation >15%',            sevNorm: 3, faultActive: 31, firstSeen: '2026-06-07' },
      { id: 'n11', equipment: 'AHU-4',      faultName: 'Humidifier output at limit',            sevNorm: 4, faultActive: 52, firstSeen: '2026-05-30' },
      { id: 'n12', equipment: 'AHU-4',      faultName: 'Preheat valve leaking',                 sevNorm: 3, faultActive: 24, firstSeen: '2026-06-04' },
      { id: 'n13', equipment: 'VAV-L1-08',  faultName: 'Reheat valve stuck open',               sevNorm: 5, faultActive: 47, firstSeen: '2026-05-26' },
      { id: 'n14', equipment: 'VAV-L3-01',  faultName: 'No airflow during occupied hours',      sevNorm: 6, faultActive: 38, firstSeen: '2026-06-01' },
      { id: 'n15', equipment: 'VAV-L3-04',  faultName: 'Zone temp sensor flatline',             sevNorm: 4, faultActive: 90, firstSeen: '2026-05-22' },
      { id: 'n16', equipment: 'CUP-CT-1',   faultName: 'Tower fan short-cycling',               sevNorm: 4, faultActive: 26, firstSeen: '2026-06-03' },
      { id: 'n17', equipment: 'AHU-2',      faultName: 'Mixed air temp out of range',           sevNorm: 3, faultActive: 19, firstSeen: '2026-06-06' },
      { id: 'n18', equipment: 'VAV-L1-05',  faultName: 'Damper position vs airflow mismatch',   sevNorm: 2, faultActive: 15, firstSeen: '2026-06-07' },
      { id: 'n19', equipment: 'EF-7',       faultName: 'Exhaust fan run hours abnormal',        sevNorm: 2, faultActive: 22, firstSeen: '2026-06-04' },
      { id: 'n20', equipment: 'CUP-CHW-2',  faultName: 'Condenser water dT low',                sevNorm: 3, faultActive: 17, firstSeen: '2026-06-08' }
    ]
  };

  var TOP_N = 8; // groups shown before "Show more" (demo value; ~15 in prod)

  // ── Draft state ───────────────────────────────────────────────────────────
  // TODO(data): replace localStorage with an mbcxMeeting draft rec; skips
  // should live server-side so the team shares them across meetings.
  var STORAGE_KEY = 'mbcxMeetingPrep_draft';
  var _state = null;
  var _stage = 1;
  var _expanded = {};     // equipment key -> bool (in-memory)
  var _showAll = false;
  var _showSkipped = false;
  var _q = '';            // search text (in-memory)
  var _typeFilter = '';   // '', 'AHU', 'VAV', 'CUP', 'Other'

  function _defaultState() {
    return { reviewed: {}, skipped: {} };
  }

  function _loadState() {
    _state = _defaultState();
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        var saved = JSON.parse(s);
        for (var k in _state) if (saved[k] !== undefined) _state[k] = saved[k];
      }
    } catch (e) { /* corrupt draft — start fresh */ }
  }

  function _saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch (e) {}
  }

  function _reviewedCount() {
    return _DEMO.logItems.filter(function (it) { return _state.reviewed[it.id]; }).length;
  }

  function _allReviewed() {
    return _reviewedCount() === _DEMO.logItems.length;
  }

  // ── Shared helpers ────────────────────────────────────────────────────────
  function _inAgenda(id) {
    return !!(NS.meeting && NS.meeting.has(id));
  }

  function _prioChip(p) {
    var cls = p === 'High' ? 'mp-sev--hi' : p === 'Medium' ? 'mp-sev--med' : 'mp-sev--lo';
    return '<span class="mp-sev ' + cls + '">' + _esc(p) + '</span>';
  }

  function _sevChip(sev) {
    var cls = sev >= 6 ? 'mp-sev--hi' : sev >= 4 ? 'mp-sev--med' : 'mp-sev--lo';
    return '<span class="mp-sev ' + cls + '">Sev ' + sev + '</span>';
  }

  function _equipType(name) {
    var s = String(name || '').toUpperCase();
    if (/AHU|RTU|MAU|FCU/.test(s)) return 'AHU';
    if (/VAV|FPB/.test(s)) return 'VAV';
    if (/CUP|CHW|CHIL|BOIL|HW-|CT-/.test(s)) return 'CUP';
    return 'Other';
  }

  function _stepper() {
    var unlocked = _allReviewed();
    return '<div class="mp-steps">' +
      '<button class="mp-step' + (_stage === 1 ? ' mp-step--active' : ' mp-step--done') + '" data-step="1">' +
        '<span class="mp-step-num">' + (_stage === 1 ? '1' : '&#10003;') + '</span> Review Fault Log' +
      '</button>' +
      '<div class="mp-step-line"></div>' +
      '<button class="mp-step' + (_stage === 2 ? ' mp-step--active' : '') + (unlocked ? '' : ' mp-step--locked') + '" data-step="2"' + (unlocked ? '' : ' disabled') + '>' +
        '<span class="mp-step-num">2</span> New Faults' +
        (unlocked ? '' : ' <span class="mp-step-lock" title="Finish reviewing the Fault Log first">&#128274;</span>') +
      '</button>' +
      '</div>';
  }

  // ── Step 1: tabular log review ────────────────────────────────────────────
  function _reviewStage() {
    var items = _DEMO.logItems;
    var n = items.length;
    if (!n) return '<div class="mp-rail-empty">No open Fault Log items — nothing to review.</div>';
    var reviewed = _reviewedCount();
    var done = _allReviewed();

    var rowsHtml = items.map(function (it) {
      var isRev = !!_state.reviewed[it.id];
      var inAg = _inAgenda(it.id);
      return '<div class="mp-row' + (isRev ? ' mp-row--reviewed' : '') + '">' +
        '<button class="mp-check' + (isRev ? ' mp-check--on' : '') + '" data-check="' + _esc(it.id) + '"' +
        ' title="Mark reviewed" aria-pressed="' + isRev + '">' + (isRev ? '&#10003;' : '') + '</button>' +
        '<span class="mp-id">' + _esc(it.id.replace('log-', '#')) + '</span>' +
        '<div class="mp-row-main">' +
        '  <div class="mp-row-title">' + _esc(it.equipment) + ' <span class="mp-row-fault">' + _esc(it.faultName) + '</span></div>' +
        '  <div class="mp-row-sub">Added ' + it.dateAdded +
             (it.assignedTo ? ' · ' + _esc(it.assignedTo) : ' · Unassigned') +
             (it.comments ? ' · ' + _esc(it.comments) : '') + '</div>' +
        '</div>' +
        _prioChip(it.priority) +
        '<div class="mp-row-acts">' +
          '<button class="mp-act mp-act--primary' + (inAg ? ' mp-act--on' : '') + '" data-agenda="' + _esc(it.id) + '">' + (inAg ? '&#10003; Agenda' : '+ Agenda') + '</button>' +
        '</div>' +
        '</div>';
    }).join('');

    return [
      '<div class="mp-review-toolbar">',
      '  <div class="mp-review-toolbar-left">',
      '    <div class="mp-review-progress mp-review-progress--inline"><div class="mp-review-progress-fill" style="width:' + Math.round(reviewed / n * 100) + '%"></div></div>',
      '    <span class="mp-review-count-inline">' + reviewed + ' of ' + n + ' reviewed</span>',
      '  </div>',
      '  <button class="mp-act" data-markall="1">' + (done ? 'Unmark all' : 'Mark all reviewed') + '</button>',
      '</div>',
      rowsHtml,
      '<div class="mp-review-continue">',
      '  <button class="mp-btn mp-btn--primary" data-step="2"' + (done ? '' : ' disabled') + '>' +
           (done ? 'Continue to New Faults &#8594;' : 'Review all items to continue &#8594;') + '</button>',
      '</div>'
    ].join('\n');
  }

  // ── Step 2: triage inbox grouped by equipment ─────────────────────────────
  function _buildGroups() {
    var byEquip = {};
    var order = [];
    _DEMO.newFaults.forEach(function (f) {
      if (!byEquip[f.equipment]) { byEquip[f.equipment] = []; order.push(f.equipment); }
      byEquip[f.equipment].push(f);
    });
    return order.map(function (equip) {
      var faults = byEquip[equip].slice().sort(function (a, b) { return b.sevNorm - a.sevNorm; });
      var maxSev = 0, maxActive = 0;
      faults.forEach(function (f) {
        if (f.sevNorm > maxSev) maxSev = f.sevNorm;
        if (f.faultActive > maxActive) maxActive = f.faultActive;
      });
      return { equip: equip, faults: faults, maxSev: maxSev, maxActive: maxActive, type: _equipType(equip) };
    }).sort(function (a, b) {
      return (b.maxSev - a.maxSev) || (b.maxActive - a.maxActive);
    });
  }

  function _groupId(g) { return 'equip-' + g.equip; }

  // A group is decided when it's on the agenda as a whole, or every fault
  // in it has been individually skipped or added.
  function _groupDecided(g) {
    if (_inAgenda(_groupId(g))) return true;
    return g.faults.every(function (f) { return _state.skipped[f.id] || _inAgenda(f.id); });
  }

  function _matchesFilters(g) {
    if (_typeFilter && g.type !== _typeFilter) return false;
    if (_q) {
      var q = _q.toLowerCase();
      var hit = g.equip.toLowerCase().indexOf(q) !== -1 ||
        g.faults.some(function (f) { return f.faultName.toLowerCase().indexOf(q) !== -1; });
      if (!hit) return false;
    }
    return true;
  }

  function _faultRow(f) {
    var skipped = !!_state.skipped[f.id];
    var inAg = _inAgenda(f.id);
    return '<div class="mp-row mp-row--nested' + (skipped ? ' mp-row--dismissed' : '') + '">' +
      '<div class="mp-row-main">' +
      '  <div class="mp-row-title"><span class="mp-row-fault">' + _esc(f.faultName) + '</span></div>' +
      '  <div class="mp-row-sub">First seen ' + f.firstSeen + ' · ' + f.faultActive + '% active</div>' +
      '</div>' +
      _sevChip(f.sevNorm) +
      '<div class="mp-row-acts">' +
        (skipped ? '' : '<button class="mp-act mp-act--primary' + (inAg ? ' mp-act--on' : '') + '" data-agenda="' + _esc(f.id) + '">' + (inAg ? '&#10003; Agenda' : '+ Agenda') + '</button>') +
        '<button class="mp-act" data-skip="' + _esc(f.id) + '">' + (skipped ? 'Unskip' : 'Skip') + '</button>' +
      '</div>' +
      '</div>';
  }

  function _groupRow(g) {
    var open = !!_expanded[g.equip];
    var topFault = g.faults[0];
    return '<div class="mp-group' + (open ? ' mp-group--open' : '') + '">' +
      '<div class="mp-group-hd">' +
      '  <button class="mp-group-expand" data-expand="' + _esc(g.equip) + '" aria-expanded="' + open + '">' +
      '    <span class="mp-group-caret">' + (open ? '&#9662;' : '&#9656;') + '</span>' +
      '    <span class="mp-group-equip">' + _esc(g.equip) + '</span>' +
      '    <span class="mp-group-count">' + g.faults.length + ' fault' + (g.faults.length !== 1 ? 's' : '') + '</span>' +
      '  </button>' +
      '  ' + _sevChip(g.maxSev) +
      '  <span class="mp-group-active">' + g.maxActive + '% max</span>' +
      (!open ? '<span class="mp-group-preview">' + _esc(topFault.faultName) + '</span>' : '<span class="mp-group-preview"></span>') +
      '  <div class="mp-row-acts">' +
      '    <button class="mp-act mp-act--primary" data-gagenda="' + _esc(g.equip) + '">+ Agenda</button>' +
      '    <button class="mp-act" data-gskip="' + _esc(g.equip) + '">Skip all</button>' +
      '  </div>' +
      '</div>' +
      (open ? '<div class="mp-group-body">' + g.faults.map(_faultRow).join('') + '</div>' : '') +
      '</div>';
  }

  function _queueHtml() {
    var groups = _buildGroups();
    var visible = groups.filter(function (g) { return !_groupDecided(g) && _matchesFilters(g); });
    var skippedFaults = _DEMO.newFaults.filter(function (f) { return _state.skipped[f.id]; });
    var decidedCount = groups.length - groups.filter(function (g) { return !_groupDecided(g); }).length;

    var shown = _showAll ? visible : visible.slice(0, TOP_N);
    var hidden = visible.length - shown.length;

    var html = [];
    html.push('<div class="mp-queue-meta">' +
      (visible.length
        ? '<strong>' + visible.length + '</strong> equipment group' + (visible.length !== 1 ? 's' : '') + ' to triage' +
          (decidedCount ? ' · ' + decidedCount + ' handled' : '')
        : (_q || _typeFilter ? 'No matches for the current filter.' : '&#127881; Inbox zero — every new fault is triaged.')) +
      '</div>');

    html.push(shown.map(_groupRow).join(''));

    if (hidden > 0) {
      html.push('<button class="mp-act mp-showmore" data-showmore="1">Show ' + hidden + ' more &#9662;</button>');
    }

    if (skippedFaults.length) {
      html.push('<button class="mp-act mp-skipped-toggle" data-skiptoggle="1">' +
        (_showSkipped ? '&#9662;' : '&#9656;') + ' Skipped (' + skippedFaults.length + ')</button>');
      if (_showSkipped) {
        html.push('<div class="mp-skipped-list">' + skippedFaults.map(function (f) {
          return '<div class="mp-row mp-row--dismissed">' +
            '<div class="mp-row-main"><div class="mp-row-title">' + _esc(f.equipment) +
            ' <span class="mp-row-fault">' + _esc(f.faultName) + '</span></div></div>' +
            '<div class="mp-row-acts"><button class="mp-act" data-skip="' + _esc(f.id) + '">Unskip</button></div>' +
            '</div>';
        }).join('') + '</div>');
      }
    }

    return html.join('\n');
  }

  function _newStage() {
    return [
      '<div class="mp-section">',
      '  <h3 class="mp-section-title">New faults <span class="mp-section-sub">since ' + _DEMO.lastMeeting + ' &middot; grouped by equipment, worst first</span></h3>',
      '  <div class="mp-triage-toolbar">',
      '    <input type="text" class="mp-search" id="mpSearch" placeholder="Search equipment or fault&hellip;" value="' + _esc(_q) + '">',
      '    <div class="mp-type-chips">',
      ['AHU', 'VAV', 'CUP', 'Other'].map(function (t) {
        return '<button class="mp-act mp-type-chip' + (_typeFilter === t ? ' mp-act--on' : '') + '" data-typefilter="' + t + '">' + t + '</button>';
      }).join(''),
      '    </div>',
      '  </div>',
      '  <div id="mpQueue">' + _queueHtml() + '</div>',
      '  <button class="mp-act mp-back-link" data-step="1">&#8592; Revisit Fault Log review</button>',
      '</div>'
    ].join('\n');
  }

  function _stageHtml() {
    return _stepper() + (_stage === 2 ? _newStage() : _reviewStage());
  }

  // ── Agenda rail ───────────────────────────────────────────────────────────
  function _railHtml() {
    var items = (NS.meeting && NS.meeting.list) ? NS.meeting.list() : [];
    var body;
    if (!items.length) {
      body = '<div class="mp-rail-empty">No agenda items yet.<br>Add items as you review.</div>';
    } else {
      body = items.map(function (it) {
        var f = it.fault;
        return '<div class="mp-rail-item">' +
          '<div class="mp-rail-item-main">' +
          '  <div class="mp-rail-item-equip">' + _esc(f.equipment || '') + '</div>' +
          '  <div class="mp-rail-item-fault">' + _esc(f.faultName || '') + '</div>' +
          '</div>' +
          '<button class="mp-rail-remove" data-railremove="' + _esc(String(f.id)) + '" title="Remove from agenda">&times;</button>' +
          '</div>';
      }).join('');
    }
    return '<div class="mp-rail-hd">Agenda <span class="mp-rail-count">' + items.length + '</span></div>' +
      '<div class="mp-rail-body">' + body + '</div>' +
      '<div class="mp-rail-actions">' +
      '  <button class="mp-btn" id="mpExport"' + (items.length ? '' : ' disabled') + '>Copy Agenda</button>' +
      '  <button class="mp-btn mp-btn--primary" id="mpStartMeeting"' + (items.length ? '' : ' disabled') + '>Start Meeting &#8594;</button>' +
      '</div>';
  }

  function _itemForId(id) {
    var i;
    for (i = 0; i < _DEMO.logItems.length; i++) {
      if (_DEMO.logItems[i].id === id) return _DEMO.logItems[i];
    }
    for (i = 0; i < _DEMO.newFaults.length; i++) {
      if (_DEMO.newFaults[i].id === id) return _DEMO.newFaults[i];
    }
    if (id.indexOf('equip-') === 0) {
      var equip = id.slice(6);
      var faults = _DEMO.newFaults.filter(function (f) { return f.equipment === equip; });
      if (faults.length) {
        var maxSev = Math.max.apply(null, faults.map(function (f) { return f.sevNorm; }));
        return { id: id, equipment: equip,
          faultName: faults.length + ' new fault' + (faults.length !== 1 ? 's' : '') + ' (max Sev ' + maxSev + ')',
          sevNorm: maxSev };
      }
    }
    return null;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  NS.components.MeetingPrep = {

    renderPage: function () {
      _loadState();
      _stage = _allReviewed() ? 2 : 1;
      _showAll = false;
      _showSkipped = false;
      _q = '';
      _typeFilter = '';
      return [
        '<div class="mp-page">',
        '  <div class="mp-main">',
        '    <div class="mp-hd">',
        '      <div>',
        '        <h2 class="mp-title">Meeting Preparation</h2>',
        '        <div class="mp-hd-sub">Last meeting: ' + _DEMO.lastMeeting + '</div>',
        '      </div>',
        '      <div class="mp-badges">',
        '        <span class="mp-badge mp-badge--internal" title="Role gating not yet implemented — see TODO(auth) in MeetingPrep.js">Internal &middot; superuser only</span>',
        '        <span class="mp-badge mp-badge--demo" title="All data on this page is sample data">Demo data</span>',
        '      </div>',
        '    </div>',
        '    <div id="mpStage">' + _stageHtml() + '</div>',
        '  </div>',
        '  <aside class="mp-rail" id="mpRail">' + _railHtml() + '</aside>',
        '</div>'
      ].join('\n');
    },

    initLive: function (contentEl, ctx, co, container) {

      function rerenderStage() {
        var el = contentEl.querySelector('#mpStage');
        if (el) el.innerHTML = _stageHtml();
        rerenderRail();
      }

      // Queue-only refresh preserves the search box focus/value.
      function rerenderQueue() {
        var el = contentEl.querySelector('#mpQueue');
        if (el) el.innerHTML = _queueHtml();
        rerenderRail();
      }

      function rerenderRail() {
        var el = contentEl.querySelector('#mpRail');
        if (el) { el.innerHTML = _railHtml(); wireRail(); }
      }

      contentEl.addEventListener('input', function (e) {
        if (e.target && e.target.id === 'mpSearch') {
          _q = e.target.value;
          _showAll = false;
          var el = contentEl.querySelector('#mpQueue');
          if (el) el.innerHTML = _queueHtml();
        }
      });

      contentEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn || btn.disabled) return;

        var step = btn.getAttribute('data-step');
        if (step) { _stage = parseInt(step, 10); rerenderStage(); return; }

        var checkId = btn.getAttribute('data-check');
        if (checkId) {
          _state.reviewed[checkId] = !_state.reviewed[checkId];
          _saveState();
          rerenderStage();
          return;
        }

        if (btn.getAttribute('data-markall')) {
          var markOn = !_allReviewed();
          _DEMO.logItems.forEach(function (it) { _state.reviewed[it.id] = markOn; });
          _saveState();
          rerenderStage();
          return;
        }

        var expandKey = btn.getAttribute('data-expand');
        if (expandKey) {
          _expanded[expandKey] = !_expanded[expandKey];
          rerenderQueue();
          return;
        }

        var typeKey = btn.getAttribute('data-typefilter');
        if (typeKey) {
          _typeFilter = _typeFilter === typeKey ? '' : typeKey;
          _showAll = false;
          contentEl.querySelectorAll('.mp-type-chip').forEach(function (c) {
            c.classList.toggle('mp-act--on', c.getAttribute('data-typefilter') === _typeFilter);
          });
          rerenderQueue();
          return;
        }

        if (btn.getAttribute('data-showmore'))  { _showAll = true; rerenderQueue(); return; }
        if (btn.getAttribute('data-skiptoggle')) { _showSkipped = !_showSkipped; rerenderQueue(); return; }

        var gAgenda = btn.getAttribute('data-gagenda');
        if (gAgenda && NS.meeting) {
          var gid = 'equip-' + gAgenda;
          var gItem = _itemForId(gid);
          if (gItem && !NS.meeting.has(gid)) NS.meeting.add(gItem);
          rerenderQueue();
          return;
        }

        var gSkip = btn.getAttribute('data-gskip');
        if (gSkip) {
          _DEMO.newFaults.forEach(function (f) {
            if (f.equipment === gSkip) {
              _state.skipped[f.id] = true;
              if (NS.meeting && NS.meeting.has(f.id)) NS.meeting.remove(f.id);
            }
          });
          _saveState();
          rerenderQueue();
          return;
        }

        var agendaId = btn.getAttribute('data-agenda');
        if (agendaId && NS.meeting) {
          var item = _itemForId(agendaId);
          if (!item) return;
          if (NS.meeting.has(agendaId)) NS.meeting.remove(agendaId);
          else NS.meeting.add({ id: agendaId, equipment: item.equipment, faultName: item.faultName, sevNorm: item.sevNorm });
          if (_stage === 2) rerenderQueue(); else rerenderStage();
          return;
        }

        var skipId = btn.getAttribute('data-skip');
        if (skipId) {
          _state.skipped[skipId] = !_state.skipped[skipId];
          if (_state.skipped[skipId] && NS.meeting && NS.meeting.has(skipId)) {
            NS.meeting.remove(skipId);
          }
          _saveState();
          rerenderQueue();
          return;
        }
      });

      function wireRail() {
        var rail = contentEl.querySelector('#mpRail');
        if (!rail) return;

        rail.querySelectorAll('[data-railremove]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-railremove');
            var numId = parseInt(id, 10);
            NS.meeting.remove(String(numId) === id ? numId : id);
            var queueEl = contentEl.querySelector('#mpQueue');
            if (queueEl) queueEl.innerHTML = _queueHtml();
            else { var st = contentEl.querySelector('#mpStage'); if (st) st.innerHTML = _stageHtml(); }
            rerenderRail();
          });
        });

        var exportBtn = rail.querySelector('#mpExport');
        if (exportBtn) exportBtn.addEventListener('click', function () {
          var items = NS.meeting.list();
          var lines = ['MBCx Meeting Agenda — ' + new Date().toISOString().slice(0, 10), ''];
          items.forEach(function (it, i) {
            lines.push((i + 1) + '. ' + (it.fault.equipment || '') + ' — ' + (it.fault.faultName || ''));
          });
          var text = lines.join('\n');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
          } else {
            var ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
          }
          exportBtn.textContent = 'Copied ✓';
          setTimeout(function () { exportBtn.textContent = 'Copy Agenda'; }, 1500);
        });

        var startBtn = rail.querySelector('#mpStartMeeting');
        if (startBtn) startBtn.addEventListener('click', function () {
          if (container && co && NS.App && NS.App._showTab) {
            NS.App._showTab(container, 'meetings', co, NS.App._lastData, NS.App._lastCtx);
          }
        });
      }

      wireRail();
    },

    destroy: function () {}
  };

})(window.mbcxDashboard);
