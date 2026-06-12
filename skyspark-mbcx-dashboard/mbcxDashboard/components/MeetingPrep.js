// components/MeetingPrep.js — Meeting Preparation workspace (demo)
//
// Simplified flow: every action is a single click — check an item as
// reviewed, add it to the agenda, or skip it. Three passes:
//   1. Open Fault Log items (the carry-over from prior meetings)
//   2. New faults since the last meeting
//   3. Performance snapshot (headline KPIs per system)
// The agenda rail collects items and hands off to the Meetings presenter.
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
//   systems   <- headline KPIs from the existing summary/compliance views
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
      { id: 'log-14', equipment: 'AHU-2',     faultName: 'OA damper not responding to setpoint', priority: 'High',   assignedTo: 'J. Miller', dateAdded: '2026-04-16' },
      { id: 'log-17', equipment: 'CUP-CHW-1', faultName: 'Differential pressure not at setpoint', priority: 'Medium', assignedTo: 'Controls',  dateAdded: '2026-04-30' },
      { id: 'log-21', equipment: 'VAV-L1-02', faultName: 'Faulty reheat coil — SAT 95°F',        priority: 'High',   assignedTo: '',          dateAdded: '2026-05-14' },
      { id: 'log-22', equipment: 'AHU-1',     faultName: 'Cooling valve stuck open',             priority: 'Low',    assignedTo: 'J. Miller', dateAdded: '2026-05-14' }
    ],
    newFaults: [
      { id: 'n1', equipment: 'VAV 2-1 AW', faultName: 'VAV - Damper At 100%',                  sevNorm: 7, faultActive: 64, firstSeen: '2026-05-19' },
      { id: 'n2', equipment: 'AHU-3',      faultName: 'Supply air temp sensor drift',          sevNorm: 4, faultActive: 77, firstSeen: '2026-05-27' },
      { id: 'n3', equipment: 'VAV-L2-06',  faultName: 'Zone temp above setpoint >2h occupied', sevNorm: 5, faultActive: 21, firstSeen: '2026-06-02' },
      { id: 'n4', equipment: 'CUP-HW-1',   faultName: 'HW supply temp below setpoint',         sevNorm: 2, faultActive: 12, firstSeen: '2026-06-05' },
      { id: 'n5', equipment: 'AHU-1',      faultName: 'VFD speed oscillation >15%',            sevNorm: 3, faultActive: 31, firstSeen: '2026-06-07' }
    ],
    systems: [
      { key: 'cup', label: 'CUP Performance', kpis: [
        { name: 'Fleet kW/ton', val: '0.71',   cls: 'warn' },
        { name: 'Avg CHW ΔT', val: '10.2°F', cls: 'ok' },
        { name: 'Boiler AFUE', val: '81%',     cls: 'neg' }
      ] },
      { key: 'ahu', label: 'Air Handlers', kpis: [
        { name: 'Avg htg valve', val: '23%',   cls: 'ok' },
        { name: 'OA dampers >90%', val: '2',   cls: 'warn' },
        { name: 'Humidifier at limit', val: 'AHU-4', cls: 'warn' }
      ] },
      { key: 'vav', label: 'Terminal Units', kpis: [
        { name: 'Median SP diff', val: '1.4°F', cls: 'ok' },
        { name: 'Dampers pegged', val: '11',   cls: 'warn' },
        { name: 'Reheat >90%', val: '6',       cls: 'neg' }
      ] },
      { key: 'compliance', label: 'Compliance', kpis: [
        { name: 'Site compliance', val: '94%', cls: 'ok' },
        { name: 'Needs attention', val: '7',   cls: 'warn' }
      ] }
    ]
  };

  // ── Draft state ───────────────────────────────────────────────────────────
  // TODO(data): replace localStorage with an mbcxMeeting draft rec.
  var STORAGE_KEY = 'mbcxMeetingPrep_draft';
  var _state = null;

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

  function _checkBtn(id) {
    var on = !!_state.reviewed[id];
    return '<button class="mp-check' + (on ? ' mp-check--on' : '') + '" data-check="' + _esc(id) + '"' +
      ' title="Mark reviewed" aria-pressed="' + on + '">' +
      (on ? '&#10003;' : '') + '</button>';
  }

  function _agendaBtn(id) {
    var on = _inAgenda(id);
    return '<button class="mp-act mp-act--primary' + (on ? ' mp-act--on' : '') +
      '" data-agenda="' + _esc(id) + '">' + (on ? '&#10003; Agenda' : '+ Agenda') + '</button>';
  }

  function _statStrip() {
    var total = _DEMO.logItems.length + _DEMO.newFaults.length;
    var reviewed = 0;
    _DEMO.logItems.concat(_DEMO.newFaults).forEach(function (it) {
      if (_state.reviewed[it.id]) reviewed++;
    });
    var agendaCount = (NS.meeting && NS.meeting.count) ? NS.meeting.count() : 0;
    var cells = [
      { label: 'Open Log Items', val: _DEMO.logItems.length,  cls: 'mp-delta--bad',  sub: 'carried from prior meetings' },
      { label: 'New Faults',     val: _DEMO.newFaults.length, cls: 'mp-delta--new',  sub: 'since ' + _DEMO.lastMeeting },
      { label: 'Reviewed',       val: reviewed + ' / ' + total, cls: 'mp-delta--good', sub: 'prep progress' },
      { label: 'On Agenda',      val: agendaCount,            cls: 'mp-delta--reg',  sub: 'ready for meeting' }
    ];
    return '<div class="mp-delta" id="mpStats">' + cells.map(function (c) {
      return '<div class="mp-delta-cell ' + c.cls + '">' +
        '<div class="mp-delta-val">' + c.val + '</div>' +
        '<div class="mp-delta-label">' + c.label + '</div>' +
        '<div class="mp-delta-sub">' + c.sub + '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function _logRows() {
    return _DEMO.logItems.map(function (it) {
      return '<div class="mp-row' + (_state.reviewed[it.id] ? ' mp-row--reviewed' : '') + '">' +
        _checkBtn(it.id) +
        '<span class="mp-id">' + _esc(it.id.replace('log-', '#')) + '</span>' +
        '<div class="mp-row-main">' +
        '  <div class="mp-row-title">' + _esc(it.equipment) + ' <span class="mp-row-fault">' + _esc(it.faultName) + '</span></div>' +
        '  <div class="mp-row-sub">Added ' + it.dateAdded + (it.assignedTo ? ' · ' + _esc(it.assignedTo) : ' · Unassigned') + '</div>' +
        '</div>' +
        _prioChip(it.priority) +
        '<div class="mp-row-acts">' + _agendaBtn(it.id) + '</div>' +
        '</div>';
    }).join('');
  }

  function _newRows() {
    var rows = _DEMO.newFaults.slice().sort(function (a, b) { return b.sevNorm - a.sevNorm; });
    return rows.map(function (f) {
      var skipped = !!_state.skipped[f.id];
      return '<div class="mp-row' + (_state.reviewed[f.id] ? ' mp-row--reviewed' : '') + (skipped ? ' mp-row--dismissed' : '') + '">' +
        _checkBtn(f.id) +
        '<div class="mp-row-main">' +
        '  <div class="mp-row-title">' + _esc(f.equipment) + ' <span class="mp-row-fault">' + _esc(f.faultName) + '</span></div>' +
        '  <div class="mp-row-sub">First seen ' + f.firstSeen + ' · ' + f.faultActive + '% active</div>' +
        '</div>' +
        _sevChip(f.sevNorm) +
        '<div class="mp-row-acts">' +
          (skipped ? '' : _agendaBtn(f.id)) +
          '<button class="mp-act" data-skip="' + _esc(f.id) + '">' + (skipped ? 'Unskip' : 'Skip') + '</button>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  function _systemCards() {
    return _DEMO.systems.map(function (s) {
      var id = 'sys-' + s.key;
      return '<div class="mp-sys">' +
        '<div class="mp-sys-hd">' +
        '  <span class="mp-sys-label">' + s.label + '</span>' +
        '  ' + _agendaBtn(id) +
        '</div>' +
        '<div class="mp-sys-kpis">' + s.kpis.map(function (k) {
          return '<div class="mp-kpi mp-kpi--' + k.cls + '"><span class="mp-kpi-val">' + k.val + '</span><span class="mp-kpi-name">' + k.name + '</span></div>';
        }).join('') + '</div>' +
        '</div>';
    }).join('');
  }

  function _railHtml() {
    var items = (NS.meeting && NS.meeting.list) ? NS.meeting.list() : [];
    var body;
    if (!items.length) {
      body = '<div class="mp-rail-empty">No agenda items yet.<br>Add log items, new faults, or systems to discuss.</div>';
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

  // Find the agenda payload for an id (log item, new fault, or system).
  function _itemForId(id) {
    var i;
    for (i = 0; i < _DEMO.logItems.length; i++) {
      if (_DEMO.logItems[i].id === id) return _DEMO.logItems[i];
    }
    for (i = 0; i < _DEMO.newFaults.length; i++) {
      if (_DEMO.newFaults[i].id === id) return _DEMO.newFaults[i];
    }
    for (i = 0; i < _DEMO.systems.length; i++) {
      if ('sys-' + _DEMO.systems[i].key === id) {
        return { id: id, equipment: _DEMO.systems[i].label, faultName: 'Performance review', manual: true };
      }
    }
    return null;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  NS.components.MeetingPrep = {

    renderPage: function () {
      _loadState();
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
        '    ' + _statStrip(),
        '    <div class="mp-section">',
        '      <h3 class="mp-section-title">1 &middot; Fault Log items <span class="mp-section-sub">open items carried from prior meetings</span></h3>',
        '      <div id="mpLog">' + _logRows() + '</div>',
        '    </div>',
        '    <div class="mp-section">',
        '      <h3 class="mp-section-title">2 &middot; New faults <span class="mp-section-sub">since ' + _DEMO.lastMeeting + '</span></h3>',
        '      <div id="mpNew">' + _newRows() + '</div>',
        '    </div>',
        '    <div class="mp-section">',
        '      <h3 class="mp-section-title">3 &middot; Performance snapshot <span class="mp-section-sub">add any system worth discussing</span></h3>',
        '      <div class="mp-sys-grid" id="mpSystems">' + _systemCards() + '</div>',
        '    </div>',
        '  </div>',
        '  <aside class="mp-rail" id="mpRail">' + _railHtml() + '</aside>',
        '</div>'
      ].join('\n');
    },

    initLive: function (contentEl, ctx, co, container) {

      function rerender() {
        var el;
        if ((el = contentEl.querySelector('#mpLog')))      el.innerHTML = _logRows();
        if ((el = contentEl.querySelector('#mpNew')))      el.innerHTML = _newRows();
        if ((el = contentEl.querySelector('#mpSystems')))  el.innerHTML = _systemCards();
        if ((el = contentEl.querySelector('#mpStats')))    el.outerHTML = _statStrip();
        if ((el = contentEl.querySelector('#mpRail')))   { el.innerHTML = _railHtml(); wireRail(); }
      }

      contentEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;

        var checkId = btn.getAttribute('data-check');
        if (checkId) {
          _state.reviewed[checkId] = !_state.reviewed[checkId];
          _saveState();
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
            _state.reviewed[agendaId] = true; // acting on it counts as reviewed
          }
          _saveState();
          rerender();
          return;
        }

        var skipId = btn.getAttribute('data-skip');
        if (skipId) {
          _state.skipped[skipId] = !_state.skipped[skipId];
          if (_state.skipped[skipId]) {
            _state.reviewed[skipId] = true; // skipping counts as reviewed
            if (NS.meeting && NS.meeting.has(skipId)) NS.meeting.remove(skipId);
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
