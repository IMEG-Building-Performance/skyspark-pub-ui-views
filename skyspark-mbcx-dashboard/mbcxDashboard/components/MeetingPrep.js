// components/MeetingPrep.js — Meeting Preparation workspace (demo)
//
// Guided two-step flow:
//   Step 1 — immersive Fault Log review: one open log item at a time,
//            full-page card. Every item must be reviewed (Next, or added
//            to the agenda) before step 2 unlocks.
//   Step 2 — triage new faults since the last meeting (one-click rows).
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
// publish queue into the Fault Log.
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
      { id: 'n1', equipment: 'VAV 2-1 AW', faultName: 'VAV - Damper At 100%',                  sevNorm: 7, faultActive: 64, firstSeen: '2026-05-19' },
      { id: 'n2', equipment: 'AHU-3',      faultName: 'Supply air temp sensor drift',          sevNorm: 4, faultActive: 77, firstSeen: '2026-05-27' },
      { id: 'n3', equipment: 'VAV-L2-06',  faultName: 'Zone temp above setpoint >2h occupied', sevNorm: 5, faultActive: 21, firstSeen: '2026-06-02' },
      { id: 'n4', equipment: 'CUP-HW-1',   faultName: 'HW supply temp below setpoint',         sevNorm: 2, faultActive: 12, firstSeen: '2026-06-05' },
      { id: 'n5', equipment: 'AHU-1',      faultName: 'VFD speed oscillation >15%',            sevNorm: 3, faultActive: 31, firstSeen: '2026-06-07' }
    ]
  };

  // ── Draft state ───────────────────────────────────────────────────────────
  // TODO(data): replace localStorage with an mbcxMeeting draft rec.
  var STORAGE_KEY = 'mbcxMeetingPrep_draft';
  var _state = null;
  var _idx = 0;       // current log item in step 1 (not persisted)
  var _stage = 1;     // 1 = log review, 2 = new faults (derived on load)

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

  function _firstUnreviewed() {
    for (var i = 0; i < _DEMO.logItems.length; i++) {
      if (!_state.reviewed[_DEMO.logItems[i].id]) return i;
    }
    return 0;
  }

  // ── Render helpers ────────────────────────────────────────────────────────
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

  // Step 1: immersive one-at-a-time log review
  function _reviewStage() {
    var items = _DEMO.logItems;
    var n = items.length;
    if (!n) return '<div class="mp-rail-empty">No open Fault Log items — nothing to review.</div>';
    if (_idx < 0) _idx = 0;
    if (_idx > n - 1) _idx = n - 1;
    var it = items[_idx];
    var reviewed = _reviewedCount();
    var inAg = _inAgenda(it.id);
    var isLast = _idx === n - 1;

    return [
      '<div class="mp-review">',
      '  <div class="mp-review-progress"><div class="mp-review-progress-fill" style="width:' + Math.round(reviewed / n * 100) + '%"></div></div>',
      '  <div class="mp-review-count">Item ' + (_idx + 1) + ' of ' + n + ' &middot; ' + reviewed + ' reviewed</div>',
      '  <div class="mp-review-card' + (_state.reviewed[it.id] ? ' mp-review-card--reviewed' : '') + '">',
      '    <div class="mp-review-chips">',
      '      <span class="mp-id">' + _esc(it.id.replace('log-', '#')) + '</span>',
      '      ' + _prioChip(it.priority),
      '      <span class="mp-review-assigned">' + (it.assignedTo ? _esc(it.assignedTo) : 'Unassigned') + '</span>',
      '    </div>',
      '    <div class="mp-review-equip">' + _esc(it.equipment) + '</div>',
      '    <div class="mp-review-fault">' + _esc(it.faultName) + '</div>',
      '    <div class="mp-review-meta">Added ' + it.dateAdded + '</div>',
      it.comments ? '<div class="mp-review-comments">&ldquo;' + _esc(it.comments) + '&rdquo;</div>' : '',
      '    <div class="mp-review-actions">',
      '      <button class="mp-btn' + (inAg ? ' mp-btn--added' : '') + '" data-agenda="' + _esc(it.id) + '">' + (inAg ? '&#10003; On Agenda' : '+ Add to Agenda') + '</button>',
      '    </div>',
      '  </div>',
      '  <div class="mp-review-nav">',
      '    <button class="mp-btn" data-nav="prev"' + (_idx === 0 ? ' disabled' : '') + '>&#8592; Prev</button>',
      '    <button class="mp-btn mp-btn--primary" data-nav="next">' + (isLast ? 'Finish Review &#8594;' : 'Reviewed &middot; Next &#8594;') + '</button>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // Step 2: one-click triage of new faults
  function _newStage() {
    var rows = _DEMO.newFaults.slice().sort(function (a, b) { return b.sevNorm - a.sevNorm; });
    var rowsHtml = rows.map(function (f) {
      var skipped = !!_state.skipped[f.id];
      var inAg = _inAgenda(f.id);
      return '<div class="mp-row' + (skipped ? ' mp-row--dismissed' : '') + '">' +
        '<div class="mp-row-main">' +
        '  <div class="mp-row-title">' + _esc(f.equipment) + ' <span class="mp-row-fault">' + _esc(f.faultName) + '</span></div>' +
        '  <div class="mp-row-sub">First seen ' + f.firstSeen + ' · ' + f.faultActive + '% active</div>' +
        '</div>' +
        _sevChip(f.sevNorm) +
        '<div class="mp-row-acts">' +
          (skipped ? '' : '<button class="mp-act mp-act--primary' + (inAg ? ' mp-act--on' : '') + '" data-agenda="' + _esc(f.id) + '">' + (inAg ? '&#10003; Agenda' : '+ Agenda') + '</button>') +
          '<button class="mp-act" data-skip="' + _esc(f.id) + '">' + (skipped ? 'Unskip' : 'Skip') + '</button>' +
        '</div>' +
        '</div>';
    }).join('');

    return [
      '<div class="mp-section">',
      '  <h3 class="mp-section-title">New faults <span class="mp-section-sub">since ' + _DEMO.lastMeeting + ' &middot; add to agenda or skip</span></h3>',
      '  ' + rowsHtml,
      '  <button class="mp-act mp-back-link" data-step="1">&#8592; Revisit Fault Log review</button>',
      '</div>'
    ].join('\n');
  }

  function _stageHtml() {
    return _stepper() + (_stage === 2 ? _newStage() : _reviewStage());
  }

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
    return null;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  NS.components.MeetingPrep = {

    renderPage: function () {
      _loadState();
      _stage = _allReviewed() ? 2 : 1;
      _idx = _firstUnreviewed();
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

      function rerender() {
        var el;
        if ((el = contentEl.querySelector('#mpStage'))) el.innerHTML = _stageHtml();
        if ((el = contentEl.querySelector('#mpRail'))) { el.innerHTML = _railHtml(); wireRail(); }
      }

      contentEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn || btn.disabled) return;

        var step = btn.getAttribute('data-step');
        if (step) {
          _stage = parseInt(step, 10);
          if (_stage === 1) _idx = _firstUnreviewed();
          rerender();
          return;
        }

        var nav = btn.getAttribute('data-nav');
        if (nav) {
          var items = _DEMO.logItems;
          if (nav === 'prev') {
            _idx = Math.max(0, _idx - 1);
          } else {
            // Advancing marks the current item reviewed
            _state.reviewed[items[_idx].id] = true;
            _saveState();
            if (_idx === items.length - 1) {
              _stage = _allReviewed() ? 2 : 1;
              if (_stage === 1) _idx = _firstUnreviewed();
            } else {
              _idx++;
            }
          }
          rerender();
          return;
        }

        var agendaId = btn.getAttribute('data-agenda');
        if (agendaId && NS.meeting) {
          var item = _itemForId(agendaId);
          if (!item) return;
          if (NS.meeting.has(agendaId)) {
            NS.meeting.remove(agendaId);
          } else {
            NS.meeting.add({ id: agendaId, equipment: item.equipment, faultName: item.faultName, sevNorm: item.sevNorm });
          }
          rerender();
          return;
        }

        var skipId = btn.getAttribute('data-skip');
        if (skipId) {
          _state.skipped[skipId] = !_state.skipped[skipId];
          if (_state.skipped[skipId] && NS.meeting && NS.meeting.has(skipId)) {
            NS.meeting.remove(skipId);
          }
          _saveState();
          rerender();
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
            rerender();
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
