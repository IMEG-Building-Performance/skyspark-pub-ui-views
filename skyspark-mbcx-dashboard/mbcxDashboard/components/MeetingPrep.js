// components/MeetingPrep.js — Meeting Preparation workspace (demo)
//
// Guided two-step flow:
//   Step 1 — Fault Log review: tabular checklist of open log items; mark
//            each reviewed (or use Mark All) and add any to the agenda.
//            Step 2 unlocks once every item is reviewed.
//   Step 2 — new-fault triage: the ENTIRE fault list, always. Grouped by
//            equipment or flat, sortable (severity is just the default),
//            searchable. Handled items dim in place rather than leaving
//            the list — the engineer decides what matters, the tool only
//            offers ordering. Skips persist across prep sessions.
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

  // ── Draft state ───────────────────────────────────────────────────────────
  // TODO(data): replace localStorage with an mbcxMeeting draft rec; skips
  // should live server-side so the team shares them across meetings.
  var STORAGE_KEY = 'mbcxMeetingPrep_draft';
  var _state = null;
  var _stage = 1;
  var _expanded = {};     // equipment key -> bool (in-memory)
  var _searchQ = '';            // search text (in-memory)
  var _typeFilter = '';   // '', 'AHU', 'VAV', 'CUP', 'Other'
  var _view = 'grouped';  // 'grouped' | 'flat'
  var _sortKey = 'sev';   // 'sev' | 'active' | 'seen' | 'equip'
  var _hideHandled = false;

  // Live fault list (replaces _DEMO.newFaults when a session is available).
  var _live = null;
  var _loading = false;
  var _co = null;   // component registry, for embedded MeetingView teardown

  // Active meeting (draft mbcxMeeting rec) and the landing-page lists.
  // Lifecycle: New Meeting -> draft rec -> prep (stages 1-3) -> End Meeting
  // & Save flips the same rec to mbcxStatus:"held".
  var _meeting = null;                       // {id, dis, date, notes}
  var _landRecs = { drafts: [], held: [] };

  function _q(s) {
    return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  // Parsed-grid ref values arrive as {id,dis} or bare strings.
  function _refVal(v) {
    if (!v) return '';
    if (typeof v === 'string') return v.replace(/^@/, '');
    if (v.id) return String(v.id).replace(/^@/, '');
    if (v.val) return String(v.val).replace(/^@/, '');
    return '';
  }

  function _faults() {
    return _live !== null ? _live : _DEMO.newFaults;
  }

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
    var lock = ' <span class="mp-step-lock" title="Finish reviewing the Fault Log first">&#128274;</span>';
    return '<div class="mp-steps">' +
      '<button class="mp-step' + (_stage === 1 ? ' mp-step--active' : ' mp-step--done') + '" data-step="1">' +
        '<span class="mp-step-num">' + (_stage === 1 ? '1' : '&#10003;') + '</span> Review Fault Log' +
      '</button>' +
      '<div class="mp-step-line"></div>' +
      '<button class="mp-step' + (_stage === 2 ? ' mp-step--active' : (_stage > 2 ? ' mp-step--done' : '')) + (unlocked ? '' : ' mp-step--locked') + '" data-step="2"' + (unlocked ? '' : ' disabled') + '>' +
        '<span class="mp-step-num">' + (_stage > 2 ? '&#10003;' : '2') + '</span> New Faults' +
        (unlocked ? '' : lock) +
      '</button>' +
      '<div class="mp-step-line"></div>' +
      '<button class="mp-step' + (_stage === 3 ? ' mp-step--active' : '') + (unlocked ? '' : ' mp-step--locked') + '" data-step="3"' + (unlocked ? '' : ' disabled') + '>' +
        '<span class="mp-step-num">3</span> Agenda &amp; Present' +
        (unlocked ? '' : lock) +
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
      '  <button class="mp-act mp-link" data-gotab="fault-log">Open full Fault Log &#8599;</button>',
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
    _faults().forEach(function (f) {
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
    if (_searchQ) {
      var q = _searchQ.toLowerCase();
      var hit = g.equip.toLowerCase().indexOf(q) !== -1 ||
        g.faults.some(function (f) { return f.faultName.toLowerCase().indexOf(q) !== -1; });
      if (!hit) return false;
    }
    return true;
  }

  function _sortGroups(groups) {
    var k = _sortKey;
    return groups.sort(function (a, b) {
      if (k === 'equip')  return a.equip.localeCompare(b.equip);
      if (k === 'active') return (b.maxActive - a.maxActive) || (b.maxSev - a.maxSev);
      if (k === 'seen') {
        var as = a.faults.reduce(function (m, f) { return f.firstSeen > m ? f.firstSeen : m; }, '');
        var bs = b.faults.reduce(function (m, f) { return f.firstSeen > m ? f.firstSeen : m; }, '');
        return bs.localeCompare(as);
      }
      return (b.maxSev - a.maxSev) || (b.maxActive - a.maxActive); // 'sev'
    });
  }

  function _sortFaults(faults) {
    var k = _sortKey;
    return faults.sort(function (a, b) {
      if (k === 'equip')  return a.equipment.localeCompare(b.equipment) || (b.sevNorm - a.sevNorm);
      if (k === 'active') return (b.faultActive - a.faultActive) || (b.sevNorm - a.sevNorm);
      if (k === 'seen')   return b.firstSeen.localeCompare(a.firstSeen);
      return (b.sevNorm - a.sevNorm) || (b.faultActive - a.faultActive); // 'sev'
    });
  }

  function _faultMatches(f) {
    if (_typeFilter && _equipType(f.equipment) !== _typeFilter) return false;
    if (_searchQ) {
      var q = _searchQ.toLowerCase();
      if (f.equipment.toLowerCase().indexOf(q) === -1 &&
          f.faultName.toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  }

  function _faultRow(f, showEquip) {
    var skipped = !!_state.skipped[f.id];
    var inAg = _inAgenda(f.id);
    return '<div class="mp-row' + (showEquip ? '' : ' mp-row--nested') + (skipped ? ' mp-row--dismissed' : '') + '">' +
      '<div class="mp-row-main">' +
      '  <div class="mp-row-title">' + (showEquip ? _esc(f.equipment) + ' ' : '') +
           '<span class="mp-row-fault">' + _esc(f.faultName) + '</span></div>' +
      '  <div class="mp-row-sub">' + [
            f.firstSeen ? 'First seen ' + f.firstSeen : '',
            f.faultActive ? f.faultActive + '% active' : '',
            f.sumDur ? Math.round(f.sumDur) + ' h' : ''
          ].filter(function (x) { return x; }).join(' · ') + '</div>' +
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
    var onAgenda = _inAgenda(_groupId(g));
    var allSkipped = g.faults.every(function (f) { return _state.skipped[f.id]; });
    var handled = _groupDecided(g);
    var stateChip = onAgenda ? '<span class="mp-state mp-state--agenda">On agenda</span>'
      : allSkipped ? '<span class="mp-state mp-state--skip">Skipped</span>'
      : handled ? '<span class="mp-state mp-state--agenda">Handled</span>' : '';

    return '<div class="mp-group' + (open ? ' mp-group--open' : '') + (handled ? ' mp-group--handled' : '') + '">' +
      '<div class="mp-group-hd">' +
      '  <button class="mp-group-expand" data-expand="' + _esc(g.equip) + '" aria-expanded="' + open + '">' +
      '    <span class="mp-group-caret">' + (open ? '&#9662;' : '&#9656;') + '</span>' +
      '    <span class="mp-group-equip">' + _esc(g.equip) + '</span>' +
      '    <span class="mp-group-count">' + g.faults.length + ' fault' + (g.faults.length !== 1 ? 's' : '') + '</span>' +
      '  </button>' +
      '  ' + _sevChip(g.maxSev) +
      '  <span class="mp-group-active">' + g.maxActive + '% max</span>' +
      (!open ? '<span class="mp-group-preview">' + _esc(topFault.faultName) + '</span>' : '<span class="mp-group-preview"></span>') +
      stateChip +
      '  <div class="mp-row-acts">' +
      '    <button class="mp-act mp-act--primary' + (onAgenda ? ' mp-act--on' : '') + '" data-gagenda="' + _esc(g.equip) + '">' + (onAgenda ? '&#10003; Agenda' : '+ Agenda') + '</button>' +
      '    <button class="mp-act" data-gskip="' + _esc(g.equip) + '">' + (allSkipped ? 'Unskip all' : 'Skip all') + '</button>' +
      '  </div>' +
      '</div>' +
      (open ? '<div class="mp-group-body">' + g.faults.map(function (f) { return _faultRow(f, false); }).join('') + '</div>' : '') +
      '</div>';
  }

  function _queueHtml() {
    if (_loading) {
      return '<div class="mp-rail-empty mp-loading">Loading fault list&hellip;</div>';
    }
    var allFaults = _faults();
    var skippedCount = allFaults.filter(function (f) { return _state.skipped[f.id]; }).length;
    var agendaCount = allFaults.filter(function (f) { return _inAgenda(f.id); }).length;
    var html = [];
    var body;

    if (_view === 'flat') {
      var faults = _sortFaults(allFaults.filter(_faultMatches).slice());
      if (_hideHandled) {
        faults = faults.filter(function (f) { return !_state.skipped[f.id] && !_inAgenda(f.id); });
      }
      html.push('<div class="mp-queue-meta">Showing <strong>' + faults.length + '</strong> of ' + allFaults.length + ' faults' +
        (skippedCount || agendaCount ? ' · ' + agendaCount + ' on agenda · ' + skippedCount + ' skipped' : '') + '</div>');
      body = faults.map(function (f) { return _faultRow(f, true); }).join('');
      html.push(body || '<div class="mp-rail-empty">No faults match the current filters.</div>');
    } else {
      var groups = _sortGroups(_buildGroups().filter(_matchesFilters));
      if (_hideHandled) {
        groups = groups.filter(function (g) { return !_groupDecided(g); });
      }
      html.push('<div class="mp-queue-meta">Showing <strong>' + groups.length + '</strong> equipment group' + (groups.length !== 1 ? 's' : '') +
        ' · ' + allFaults.length + ' faults total' +
        (skippedCount || agendaCount ? ' · ' + agendaCount + ' on agenda · ' + skippedCount + ' skipped' : '') + '</div>');
      body = groups.map(_groupRow).join('');
      html.push(body || '<div class="mp-rail-empty">No equipment matches the current filters.</div>');
    }

    return html.join('\n');
  }

  function _newStage() {
    return [
      '<div class="mp-section">',
      '  <h3 class="mp-section-title">New faults <span class="mp-section-sub">' +
           (_live !== null ? 'live fault list &middot; dashboard date range' : 'sample data &middot; since ' + _DEMO.lastMeeting) + '</span>',
      '    <button class="mp-act mp-link" data-gotab="fault-list">Full Fault List &#8599;</button>',
      '    <button class="mp-act mp-link" data-gotab="fault-log">Fault Log &#8599;</button>',
      '  </h3>',
      '  <div class="mp-triage-toolbar">',
      '    <input type="text" class="mp-search" id="mpSearch" placeholder="Search equipment or fault&hellip;" value="' + _esc(_searchQ) + '">',
      '    <div class="mp-type-chips">',
      ['AHU', 'VAV', 'CUP', 'Other'].map(function (t) {
        return '<button class="mp-act mp-type-chip' + (_typeFilter === t ? ' mp-act--on' : '') + '" data-typefilter="' + t + '">' + t + '</button>';
      }).join(''),
      '    </div>',
      '  </div>',
      '  <div class="mp-triage-toolbar mp-triage-toolbar--row2">',
      '    <div class="mp-type-chips">',
      '      <button class="mp-act mp-view-btn' + (_view === 'grouped' ? ' mp-act--on' : '') + '" data-view="grouped">Grouped</button>',
      '      <button class="mp-act mp-view-btn' + (_view === 'flat' ? ' mp-act--on' : '') + '" data-view="flat">Flat list</button>',
      '    </div>',
      '    <select class="mp-select" id="mpSort">',
      '      <option value="sev"'    + (_sortKey === 'sev'    ? ' selected' : '') + '>Sort: Severity</option>',
      '      <option value="active"' + (_sortKey === 'active' ? ' selected' : '') + '>Sort: Active %</option>',
      '      <option value="seen"'   + (_sortKey === 'seen'   ? ' selected' : '') + '>Sort: Newest</option>',
      '      <option value="equip"'  + (_sortKey === 'equip'  ? ' selected' : '') + '>Sort: Equipment</option>',
      '    </select>',
      '    <label class="mp-hide-handled"><input type="checkbox" id="mpHideHandled"' + (_hideHandled ? ' checked' : '') + '> Hide handled</label>',
      '  </div>',
      '  <div id="mpQueue">' + _queueHtml() + '</div>',
      '  <button class="mp-act mp-back-link" data-step="1">&#8592; Revisit Fault Log review</button>',
      '</div>'
    ].join('\n');
  }

  function _stageHtml() {
    // Stage 0: landing — start a new meeting, resume drafts, browse past.
    if (_stage === 0) return _landingHtml();
    var bar = '<div class="mp-meeting-bar">' +
      '<button class="mp-act mp-link" data-step="0">&#8592; All meetings</button>' +
      (_meeting ? '<span class="mp-meeting-name">' + _esc(_meeting.dis || '') + '</span>' +
        (_meeting.date ? '<span class="mp-meeting-date">' + _esc(String(_meeting.date)) + '</span>' : '') : '') +
      '<span class="mp-draft-chip">Draft &mdash; auto-saved</span>' +
      '<button class="mp-btn mp-save-close" data-saveclose="1">Save &amp; Close</button>' +
      '</div>';
    // Stage 3 hosts the full MeetingView agenda (add items, drag-reorder,
    // present mode) — mounted by initLive after the HTML lands.
    var body = _stage === 3 ? '<div class="mp-agenda-host" id="mpAgendaHost"></div>'
             : _stage === 2 ? _newStage()
             : _reviewStage();
    return bar + _stepper() + body;
  }

  function _landingHtml() {
    var today = new Date().toISOString().slice(0, 10);
    return [
      '<div class="mp-landing">',
      '  <div class="mp-land-hd">',
      '    <div class="mp-land-blurb">Start a new meeting, resume a draft, or review past meetings.</div>',
      '    <button class="mp-btn mp-btn--primary" data-newmeeting="1">+ New Meeting</button>',
      '  </div>',
      '  <div class="mp-new-form" id="mpNewForm" style="display:none;">',
      '    <input type="text" class="mp-search" id="mpNewName" placeholder="Meeting name" value="MBCx Meeting ' + today + '">',
      '    <div class="mp-new-row">',
      '      <input type="date" class="mp-search mp-new-date" id="mpNewDate" value="' + today + '">',
      '      <input type="text" class="mp-search" id="mpNewNotes" placeholder="Notes (optional — attendees, focus areas…)">',
      '    </div>',
      '    <div class="mp-new-actions">',
      '      <button class="mp-btn mp-btn--primary" data-createmeeting="1">Create &amp; Start Prep &#8594;</button>',
      '      <button class="mp-btn" data-cancelnew="1">Cancel</button>',
      '    </div>',
      '  </div>',
      '  <h3 class="mp-section-title">Drafts <span class="mp-section-sub">meetings being prepared</span></h3>',
      '  <div id="mpDrafts"><div class="mp-rail-empty mp-loading">Loading&hellip;</div></div>',
      '  <h3 class="mp-section-title" style="margin-top:18px;">Past Meetings</h3>',
      '  <div id="mpPast"><div class="mp-rail-empty mp-loading">Loading&hellip;</div></div>',
      '</div>'
    ].join('\n');
  }

  function _loadMeetingLists(contentEl, ctx) {
    var draftsEl = contentEl.querySelector('#mpDrafts');
    var pastEl   = contentEl.querySelector('#mpPast');
    if (!draftsEl || !pastEl) return;

    if (!(ctx && ctx.attestKey && ctx.projectName)) {
      draftsEl.innerHTML = '<div class="mp-rail-empty">Demo mode — meeting records need a SkySpark session.<br>Use + New Meeting to run an unsaved prep.</div>';
      pastEl.innerHTML = '<div class="mp-rail-empty">&mdash;</div>';
      return;
    }

    NS.api.evalAxon(ctx.attestKey, ctx.projectName, 'readAll(mbcxMeeting)')
      .then(function (grid) {
        var parsed = NS.haystackParser.parseGrid(grid);
        var siteVal = String((ctx && ctx.siteRef) || '').replace(/^@/, '');
        var recs = parsed.rows.map(function (r) {
          var dateVal = (r.date && typeof r.date === 'object') ? (r.date.val || '') : (r.date || '');
          return {
            id: _refVal(r.id),
            dis: r.dis || '',
            status: r.mbcxStatus || 'held',
            date: String(dateVal),
            user: r.mbcxUser || '',
            notes: r.mbcxNotes || '',
            items: r.mbcxItemCount,
            discussed: r.mbcxDiscussedCount,
            agenda: r.mbcxAgenda || '',
            site: _refVal(r.siteRef)
          };
        // Lenient site filter: keep records with no siteRef rather than
        // hiding them (older saves may predate the tag).
        }).filter(function (m) { return !siteVal || !m.site || m.site === siteVal; });
        console.info('[MeetingPrep] mbcxMeeting recs:', parsed.rows.length, '→ for this site:', recs.length);

        _landRecs.drafts = recs.filter(function (m) { return m.status === 'draft'; })
          .sort(function (a, b) { return b.date.localeCompare(a.date); });
        _landRecs.held = recs.filter(function (m) { return m.status !== 'draft'; })
          .sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 20);

        // CRUD affordances: ✎ edit name/notes, ↺ reopen (held → draft),
        // × delete. Action buttons sit beside (not inside) the main button.
        function actBtns(m, isHeld) {
          return '<span class="mtg-past-acts">' +
            '<button class="mp-rec-act" data-pmedit="' + _esc(m.id) + '" title="Edit name / notes">&#9998;</button>' +
            (isHeld ? '<button class="mp-rec-act" data-pmreopen="' + _esc(m.id) + '" title="Reopen as draft">&#8634;</button>' : '') +
            '<button class="mp-rec-act mp-rec-act--del" data-pmdel="' + _esc(m.id) + '" title="Delete record">&times;</button>' +
            '</span>';
        }

        draftsEl.innerHTML = _landRecs.drafts.length ? _landRecs.drafts.map(function (m) {
          return '<div class="mtg-draft-card"><div class="mtg-past-line">' +
            '<span class="mtg-draft-badge">DRAFT</span>' +
            '<button class="mtg-past-hd" data-draft="' + _esc(m.id) + '">' +
            '<span class="mtg-past-date">' + _esc(m.date) + '</span>' +
            '<span class="mtg-past-meta">' + _esc(m.dis) +
              (m.user ? ' · ' + _esc(m.user) : '') +
              (m.notes ? ' · ' + _esc(m.notes) : '') + '</span>' +
            '<span class="mp-resume">Resume prep &#8594;</span>' +
            '</button>' + actBtns(m, false) +
            '</div></div>';
        }).join('') : '<div class="mp-rail-empty">No drafts — start a new meeting above.</div>';

        if (_landRecs.held.length) {
          var rows = _landRecs.held.map(function (m, i) {
            return '<tr class="mtg-ptbl-row" data-pastexp="' + i + '">' +
              '<td class="mtg-ptbl-td mtg-ptbl-date">' + _esc(m.date) + '</td>' +
              '<td class="mtg-ptbl-td mtg-ptbl-name"><button class="mtg-past-hd" data-pastexp="' + i + '">' + _esc(m.dis) + '</button></td>' +
              '<td class="mtg-ptbl-td mtg-ptbl-by">' + _esc(m.user || '—') + '</td>' +
              '<td class="mtg-ptbl-td mtg-ptbl-counts">' +
                (m.items != null && m.items !== '' ? m.items + ' items' : '—') +
                (m.discussed != null && m.discussed !== '' ? ' / ' + m.discussed + ' discussed' : '') +
              '</td>' +
              '<td class="mtg-ptbl-td mtg-ptbl-acts">' + actBtns(m, true) + '</td>' +
              '</tr>' +
              '<tr class="mtg-ptbl-body-row" id="mpPastBodyRow' + i + '" style="display:none;">' +
                '<td colspan="5"><div class="mtg-past-body" id="mpPastBody' + i + '"></div></td>' +
              '</tr>';
          }).join('');
          pastEl.innerHTML = '<table class="mtg-ptbl">' +
            '<thead><tr>' +
              '<th class="mtg-ptbl-th">Date</th>' +
              '<th class="mtg-ptbl-th">Meeting</th>' +
              '<th class="mtg-ptbl-th">Created by</th>' +
              '<th class="mtg-ptbl-th">Coverage</th>' +
              '<th class="mtg-ptbl-th"></th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>';
        } else {
          pastEl.innerHTML = '<div class="mp-rail-empty">No past meetings yet.</div>';
        }
      })
      .catch(function (err) {
        console.warn('[MeetingPrep] Meeting list load failed:', err);
        draftsEl.innerHTML = '<div class="mp-rail-empty">Could not load meetings (details in console).</div>';
        pastEl.innerHTML = '';
      });
  }

  function _findRec(id) {
    return _landRecs.drafts.filter(function (m) { return m.id === id; })[0] ||
           _landRecs.held.filter(function (m) { return m.id === id; })[0] || null;
  }

  // TODO(auth): all meeting-record writes rely on SkySpark permissions until
  // role checks are added server-side.
  function _commitMeeting(ctx, axon, refresh) {
    NS.api.evalAxon(ctx.attestKey, ctx.projectName, axon)
      .then(refresh)
      .catch(function (err) {
        console.warn('[MeetingPrep] Meeting record write failed:', err, '\nExpr:', axon);
        window.alert('Could not update the meeting record — check permissions (details in console).');
      });
  }

  function _editMeetingRec(rec, ctx, refresh) {
    var name = window.prompt('Meeting name:', rec.dis || '');
    if (name == null) return;
    var notes = window.prompt('Notes:', rec.notes || '');
    if (notes == null) return;
    name = name.trim() || rec.dis;
    notes = notes.trim();
    _commitMeeting(ctx, 'commit(diff(readById(@' + rec.id + '), {dis: ' + _q(name) +
      ', mbcxNotes: ' + (notes ? _q(notes) : 'removeMarker()') + '}))', refresh);
  }

  function _deleteMeetingRec(rec, ctx, refresh) {
    if (!window.confirm('Delete "' + (rec.dis || rec.date) + '"? This removes the record from SkySpark.')) return;
    _commitMeeting(ctx, 'commit(diff(readById(@' + rec.id + '), null, {remove}))', refresh);
  }

  function _reopenMeetingRec(rec, ctx, refresh) {
    _commitMeeting(ctx, 'commit(diff(readById(@' + rec.id + '), {mbcxStatus: "draft"}))', refresh);
  }

  function _createMeeting(contentEl, ctx, done) {
    var name  = ((contentEl.querySelector('#mpNewName')  || {}).value || '').trim() ||
      ('MBCx Meeting ' + new Date().toISOString().slice(0, 10));
    var date  = ((contentEl.querySelector('#mpNewDate')  || {}).value || '').trim();
    var notes = ((contentEl.querySelector('#mpNewNotes') || {}).value || '').trim();
    var dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date);

    function start(id) {
      console.info('[MeetingPrep] Starting prep for "' + name + '"' + (id ? ' (rec @' + id + ')' : ' (unsaved)'));
      _meeting = { id: id || '', dis: name, date: dateOk ? date : '', notes: notes };
      NS.activeMeeting = _meeting;
      // Fresh cycle: clear review progress; persistent skips are kept.
      if (!_state) _loadState();
      _state.reviewed = {};
      _saveState();
      _stage = 1;
      done();
    }

    if (!(ctx && ctx.attestKey && ctx.projectName)) { start(''); return; } // demo
    console.info('[MeetingPrep] Creating draft meeting rec…');

    // TODO(auth): server-side role check before clients can create records.
    var axon = 'commit(diff(null, {mbcxMeeting, mbcxStatus: "draft"' +
      ', dis: ' + _q(name) +
      ', date: ' + (dateOk ? date : 'today()') +
      (notes ? ', mbcxNotes: ' + _q(notes) : '') +
      (ctx.siteRef ? ', siteRef: ' + ctx.siteRef : '') +
      ', mbcxUser: context()->username}, {add}))';
    NS.api.evalAxon(ctx.attestKey, ctx.projectName, axon)
      .then(function (grid) {
        var id = '';
        try {
          var rid = grid.rows && grid.rows[0] && grid.rows[0].id;
          id = (rid && rid.val) ? rid.val : _refVal(rid);
        } catch (e) {}
        if (!id) console.warn('[MeetingPrep] Draft created but id not parsed — End Meeting will save a new rec.');
        start(id);
      })
      .catch(function (err) {
        console.warn('[MeetingPrep] Draft meeting create failed — continuing unsaved:', err);
        start('');
      });
  }

  // ── Agenda rail ───────────────────────────────────────────────────────────
  function _railHtml() {
    var items = (NS.meeting && NS.meeting.list) ? NS.meeting.list() : [];
    var body;
    if (!items.length) {
      body = '<div class="mp-rail-empty">No agenda items yet.<br>Add items as you review.</div>';
    } else {
      body = items.map(function (it, idx) {
        var f = it.fault;
        return '<div class="mp-rail-item">' +
          '<span class="mp-rail-num">' + (idx + 1) + '</span>' +
          '<div class="mp-rail-item-main">' +
          '  <div class="mp-rail-item-equip">' + _esc(f.equipment || '') + '</div>' +
          '  <div class="mp-rail-item-fault">' + _esc(f.faultName || '') + '</div>' +
          '</div>' +
          '<span class="mp-rail-arrows">' +
          '  <button class="mp-rail-move" data-railmove="up|' + _esc(String(f.id)) + '"' + (idx === 0 ? ' disabled' : '') + ' title="Move up">&#9650;</button>' +
          '  <button class="mp-rail-move" data-railmove="down|' + _esc(String(f.id)) + '"' + (idx === items.length - 1 ? ' disabled' : '') + ' title="Move down">&#9660;</button>' +
          '</span>' +
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
    var pool = _faults();
    for (i = 0; i < pool.length; i++) {
      if (pool[i].id === id) return pool[i];
    }
    if (id.indexOf('equip-') === 0) {
      var equip = id.slice(6);
      var faults = pool.filter(function (f) { return f.equipment === equip; });
      if (faults.length) {
        var maxSev = Math.max.apply(null, faults.map(function (f) { return f.sevNorm; }));
        return { id: id, equipment: equip,
          faultName: faults.length + ' new fault' + (faults.length !== 1 ? 's' : '') + ' (max Sev ' + maxSev + ')',
          sevNorm: maxSev,
          // FaultDetail renders group items as an equipment-level page with
          // one row + activity bar per member fault.
          groupFaults: faults };
      }
    }
    return null;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  NS.components.MeetingPrep = {

    renderPage: function () {
      _loadState();
      _stage = _meeting ? (_allReviewed() ? 2 : 1) : 0;
      _searchQ = '';
      _typeFilter = '';
      _view = 'grouped';
      _sortKey = 'sev';
      _hideHandled = false;
      _live = null;     // refetched per visit (site/date range may change)
      _loading = false;
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
        (_live !== null ? '' : '        <span class="mp-badge mp-badge--demo" title="All data on this page is sample data">Demo data</span>'),
        '      </div>',
        '    </div>',
        '    <div id="mpStage">' + _stageHtml() + '</div>',
        '  </div>',
        '  <aside class="mp-rail" id="mpRail">' + _railHtml() + '</aside>',
        '</div>'
      ].join('\n');
    },

    initLive: function (contentEl, ctx, co, container) {
      _co = co;

      // Fetch the live fault list — same eval the Fault List tab uses.
      // Falls back to demo data when there's no session or the call fails.
      // TODO(data): the range should be "since the last meeting" once
      // meeting recs exist; for now it follows the dashboard date range.
      var _hasSite = ctx && (ctx.siteRef || (ctx.siteRefs && ctx.siteRefs.length));
      if (ctx && ctx.attestKey && ctx.projectName && _hasSite && !_live) {
        _loading = true;
        var _siteArg = NS.siteAxonArg ? NS.siteAxonArg(ctx) : ctx.siteRef;
        var dateArg = (ctx.datesStart && ctx.datesEnd)
          ? ctx.datesStart + '..' + ctx.datesEnd
          : 'today()';
        var axon = 'view_MBCxReport_CustomerView_Output(' +
          _siteArg + ', ' + dateArg +
          ', 10%, @nav:rule.all, "Fault List", "", "Show All")';
        NS.api.evalAxon(ctx.attestKey, ctx.projectName, axon)
          .then(function (grid) {
            var parsed = NS.haystackParser.parseGrid(grid);
            function str(v) { if (v == null) return ''; if (typeof v === 'object') return v.dis || v.val || ''; return String(v); }
            function num(v) {
              if (typeof v === 'number') return v;
              if (v && typeof v === 'object' && typeof v.val === 'number') return v.val;
              var n = parseFloat(v); return isNaN(n) ? 0 : n;
            }
            var faults = parsed.rows.map(function (r) {
              var equipment = str(r.equipment);
              var faultName = str(r.faultName);
              return {
                // Deterministic id so persisted skips survive refetches
                id: 'f:' + equipment + '::' + faultName,
                equipment: equipment,
                faultName: faultName,
                sevNorm: num(r.sevNorm),
                faultActive: num(r.faultActive),
                sumDur: num(r.sumDur),
                firstSeen: '',
                _raw: r
              };
            }).filter(function (f) { return f.equipment || f.faultName; });
            _live = faults.length ? faults : [];
            _loading = false;
            rerenderStage();
          })
          .catch(function (err) {
            console.warn('[MeetingPrep] Live fault list failed — using demo data:', err);
            _loading = false;
            rerenderStage();
          });
      }

      function rerenderStage() {
        var el = contentEl.querySelector('#mpStage');
        if (el) el.innerHTML = _stageHtml();
        // Stage 3 embeds the full Meetings agenda (rail would duplicate it)
        // and stage 0 is the landing page — hide the rail on both.
        var rail = contentEl.querySelector('#mpRail');
        if (rail) rail.style.display = (_stage === 3 || _stage === 0) ? 'none' : '';
        if (_stage === 0) _loadMeetingLists(contentEl, ctx);
        if (_stage === 3 && co && co.MeetingView) {
          var host = contentEl.querySelector('#mpAgendaHost');
          if (host) co.MeetingView.showInContent(host, ctx || {}, co);
        }
        rerenderRail();
      }

      // When End Meeting & Save completes inside the embedded agenda,
      // return to the landing page.
      NS.meetingSavedHook = function () {
        _meeting = null;
        NS.activeMeeting = null;
        _stage = 0;
        rerenderStage();
      };

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
          _searchQ = e.target.value;
          var el = contentEl.querySelector('#mpQueue');
          if (el) el.innerHTML = _queueHtml();
        }
      });

      contentEl.addEventListener('change', function (e) {
        if (!e.target) return;
        if (e.target.id === 'mpSort') {
          _sortKey = e.target.value;
          rerenderQueue();
        } else if (e.target.id === 'mpHideHandled') {
          _hideHandled = e.target.checked;
          rerenderQueue();
        }
      });

      contentEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn || btn.disabled) return;

        if (btn.getAttribute('data-saveclose')) {
          if (_stage === 3 && co && co.MeetingView) co.MeetingView.destroy(co);
          _stage = 0;
          rerenderStage();
          return;
        }

        var step = btn.getAttribute('data-step');
        if (step) {
          var newStage = parseInt(step, 10);
          if (_stage === 3 && newStage !== 3 && co && co.MeetingView) co.MeetingView.destroy(co);
          if (newStage === 0) { _meeting = null; NS.activeMeeting = null; }
          _stage = newStage;
          rerenderStage();
          return;
        }

        // ── Landing page actions ──────────────────────────────────────
        if (btn.getAttribute('data-newmeeting')) {
          var nf = contentEl.querySelector('#mpNewForm');
          if (nf) { nf.style.display = ''; var ni = nf.querySelector('#mpNewName'); if (ni) ni.focus(); }
          return;
        }
        if (btn.getAttribute('data-cancelnew')) {
          var nf2 = contentEl.querySelector('#mpNewForm');
          if (nf2) nf2.style.display = 'none';
          return;
        }
        if (btn.getAttribute('data-createmeeting')) {
          btn.disabled = true;
          btn.textContent = 'Creating…';
          try {
            _createMeeting(contentEl, ctx, rerenderStage);
          } catch (err) {
            console.error('[MeetingPrep] Create meeting failed:', err);
            btn.disabled = false;
            btn.textContent = 'Create & Start Prep →';
          }
          return;
        }

        // Meeting record CRUD (landing page)
        var editId = btn.getAttribute('data-pmedit');
        if (editId) {
          var er = _findRec(editId);
          if (er) _editMeetingRec(er, ctx, function () { _loadMeetingLists(contentEl, ctx); });
          return;
        }
        var delId = btn.getAttribute('data-pmdel');
        if (delId) {
          var dr = _findRec(delId);
          if (dr) _deleteMeetingRec(dr, ctx, function () { _loadMeetingLists(contentEl, ctx); });
          return;
        }
        var reopenId = btn.getAttribute('data-pmreopen');
        if (reopenId) {
          var rr = _findRec(reopenId);
          if (rr) _reopenMeetingRec(rr, ctx, function () { _loadMeetingLists(contentEl, ctx); });
          return;
        }
        var draftId = btn.getAttribute('data-draft');
        if (draftId) {
          var d = _landRecs.drafts.filter(function (m) { return m.id === draftId; })[0];
          if (d) {
            _meeting = d;
            NS.activeMeeting = d;
            _stage = _allReviewed() ? 2 : 1;
            rerenderStage();
          }
          return;
        }
        var pastIdx = btn.getAttribute('data-pastexp');
        if (pastIdx !== null && pastIdx !== undefined) {
          var pbody = contentEl.querySelector('#mpPastBody' + pastIdx);
          var pbodyRow = contentEl.querySelector('#mpPastBodyRow' + pastIdx);
          var rec = _landRecs.held[parseInt(pastIdx, 10)];
          if (!pbody || !rec) return;
          var isOpen = pbodyRow ? pbodyRow.style.display !== 'none' : pbody.style.display !== 'none';
          if (isOpen) {
            if (pbodyRow) pbodyRow.style.display = 'none';
            else pbody.style.display = 'none';
            return;
          }
          if (pbodyRow) pbodyRow.style.display = '';
          pbody.style.display = '';
          if (!pbody.innerHTML) {
            var items = [];
            try { items = JSON.parse(rec.agenda) || []; } catch (e) {}
            pbody.innerHTML = items.length ? items.map(function (it, n) {
              var f = (it && it.fault) || {};
              return '<div class="mtg-past-row">' + (n + 1) + '. ' +
                _esc(f.equip || f.equipment || '') + ' — ' + _esc(f.fault || f.faultName || '') +
                (it.discussed ? ' <span class="mtg-disc-tag">Discussed</span>' : '') + '</div>';
            }).join('') : '<div class="mtg-past-row">No items recorded.</div>';
          }
          return;
        }

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

        var viewKey = btn.getAttribute('data-view');
        if (viewKey) {
          _view = viewKey;
          contentEl.querySelectorAll('.mp-view-btn').forEach(function (c) {
            c.classList.toggle('mp-act--on', c.getAttribute('data-view') === _view);
          });
          rerenderQueue();
          return;
        }

        var goTab = btn.getAttribute('data-gotab');
        if (goTab && container && co && NS.App && NS.App._showTab) {
          NS.App._showTab(container, goTab, co, NS.App._lastData, NS.App._lastCtx);
          return;
        }

        var gAgenda = btn.getAttribute('data-gagenda');
        if (gAgenda && NS.meeting) {
          var gid = 'equip-' + gAgenda;
          if (NS.meeting.has(gid)) {
            NS.meeting.remove(gid);
          } else {
            var gItem = _itemForId(gid);
            if (gItem) NS.meeting.add(gItem);
          }
          rerenderQueue();
          return;
        }

        var gSkip = btn.getAttribute('data-gskip');
        if (gSkip) {
          var gFaults = _faults().filter(function (f) { return f.equipment === gSkip; });
          var unskip = gFaults.every(function (f) { return _state.skipped[f.id]; });
          gFaults.forEach(function (f) {
            _state.skipped[f.id] = !unskip;
            if (!unskip && NS.meeting && NS.meeting.has(f.id)) NS.meeting.remove(f.id);
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

        rail.querySelectorAll('[data-railmove]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var parts = btn.getAttribute('data-railmove').split('|');
            var id = parts.slice(1).join('|');
            var numId = parseInt(id, 10);
            NS.meeting.move(String(numId) === id ? numId : id, parts[0] === 'up' ? -1 : 1);
            rerenderRail();
          });
        });

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
          // Step 3 hosts the full agenda + presenter inside this tab.
          _stage = 3;
          rerenderStage();
        });
      }

      rerenderStage(); // initial render: loads landing lists / mounts stage
    },

    destroy: function () {
      if (_stage === 3 && _co && _co.MeetingView) _co.MeetingView.destroy(_co);
      NS.meetingSavedHook = null;
    }
  };

})(window.mbcxDashboard);
