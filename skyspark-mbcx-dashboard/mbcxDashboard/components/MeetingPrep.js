// components/MeetingPrep.js — Meeting Preparation workspace (demo scaffold)
//
// INTERNAL VIEW — intended for elevated (superuser) users only.
// TODO(auth): role gating is NOT implemented yet. Before client deployment:
//   1. Hide the sidebar item unless the user's record carries an elevated role.
//   2. Enforce server-side: any Axon funcs that read/write prep or meeting
//      recs must verify the role via context() — hiding the tab is cosmetic.
//
// Data: demo only. Each _DEMO block models the contract the live queries
// (and later the arc / Fault Log integration) need to satisfy:
//   carried   <- open arcs with last-meeting disposition + current status
//   newFaults <- live fault list minus faults already linked to an arc
//   systems   <- headline KPIs from the existing summary/compliance views
// TODO(data): persist draft state as an mbcxMeeting rec (status: draft) in
// SkySpark instead of localStorage, so prep survives across machines and
// becomes the publish queue into the Fault Log.
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
    improvedCount: 4,
    carried: [
      { id: 'c1', equipment: 'AHU-2',      faultName: 'OA damper not responding to setpoint',
        disposition: 'Carry forward', note: 'Actuator replacement quoted — awaiting PO.',
        decidedOn: '2026-05-14', statusNow: 'active',  trendPct: 9 },
      { id: 'c2', equipment: 'CUP-CHW-1',  faultName: 'Differential pressure not at setpoint',
        disposition: 'Monitor', note: 'Suspected sensor drift; verify after recal.',
        decidedOn: '2026-05-14', statusNow: 'active',  trendPct: -31 },
      { id: 'c3', equipment: 'VAV-L1-02',  faultName: 'Faulty reheat coil — SAT 95°F',
        disposition: 'Client action', note: 'Valve scheduled for replacement 5/22.',
        decidedOn: '2026-05-14', statusNow: 'cleared', trendPct: -100 },
      { id: 'c4', equipment: 'AHU-1',      faultName: 'Cooling valve stuck open',
        disposition: 'Resolved', note: 'Rebuilt 4/30 — verified closed.',
        decidedOn: '2026-05-14', statusNow: 'active',  trendPct: 42, regressed: true }
    ],
    newFaults: [
      { id: 'n1', equipment: 'VAV 2-1 AW', faultName: 'VAV - Damper At 100%',                sevNorm: 7, faultActive: 64, sumDur: 212, firstSeen: '2026-05-19' },
      { id: 'n2', equipment: 'AHU-3',      faultName: 'Supply air temp sensor drift',        sevNorm: 4, faultActive: 77, sumDur: 198, firstSeen: '2026-05-27' },
      { id: 'n3', equipment: 'VAV-L2-06',  faultName: 'Zone temp above setpoint >2h occupied', sevNorm: 5, faultActive: 21, sumDur: 36,  firstSeen: '2026-06-02' },
      { id: 'n4', equipment: 'CUP-HW-1',   faultName: 'HW supply temp below setpoint',       sevNorm: 2, faultActive: 12, sumDur: 18,  firstSeen: '2026-06-05' },
      { id: 'n5', equipment: 'AHU-1',      faultName: 'VFD speed oscillation >15%',          sevNorm: 3, faultActive: 31, sumDur: 88,  firstSeen: '2026-06-07' }
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
    return { dispositions: {}, triage: {}, dismissReasons: {}, reviewed: {}, obsSeq: 1 };
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
  function _sevBadge(sev) {
    var cls = sev >= 6 ? 'mp-sev--hi' : sev >= 4 ? 'mp-sev--med' : 'mp-sev--lo';
    return '<span class="mp-sev ' + cls + '">Sev ' + sev + '</span>';
  }

  function _deltaStrip() {
    var dismissed = 0, agendaed = 0;
    _DEMO.newFaults.forEach(function (f) {
      if (_state.triage[f.id] === 'dismissed') dismissed++;
      if (_state.triage[f.id] === 'agenda') agendaed++;
    });
    var worse = _DEMO.carried.filter(function (c) { return c.statusNow === 'active' && c.trendPct > 0 && !c.regressed; }).length;
    var regressed = _DEMO.carried.filter(function (c) { return c.regressed; }).length;
    var cells = [
      { label: 'New',       val: _DEMO.newFaults.length - dismissed, cls: 'mp-delta--new',  sub: agendaed + ' triaged to agenda' },
      { label: 'Worse',     val: worse,                              cls: 'mp-delta--bad',  sub: 'since last meeting' },
      { label: 'Improved',  val: _DEMO.improvedCount,                cls: 'mp-delta--good', sub: 'verify & report' },
      { label: 'Regressed', val: regressed,                          cls: 'mp-delta--reg',  sub: 'previously resolved' }
    ];
    return '<div class="mp-delta">' + cells.map(function (c) {
      return '<div class="mp-delta-cell ' + c.cls + '">' +
        '<div class="mp-delta-val">' + c.val + '</div>' +
        '<div class="mp-delta-label">' + c.label + '</div>' +
        '<div class="mp-delta-sub">' + c.sub + '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function _carriedRows() {
    return _DEMO.carried.map(function (c) {
      var decided = _state.dispositions[c.id];
      var status = c.regressed
        ? '<span class="mp-status mp-status--reg">Regressed ' + (c.trendPct > 0 ? '+' + c.trendPct + '%' : '') + '</span>'
        : c.statusNow === 'cleared'
          ? '<span class="mp-status mp-status--ok">Cleared</span>'
          : '<span class="mp-status mp-status--on">Active ' + (c.trendPct > 0 ? '+' : '') + c.trendPct + '%</span>';
      var btn = function (key, label) {
        return '<button class="mp-act' + (decided === key ? ' mp-act--on' : '') +
          '" data-carried="' + c.id + '" data-disp="' + key + '">' + label + '</button>';
      };
      return '<div class="mp-row' + (decided ? ' mp-row--done' : '') + '">' +
        '<div class="mp-row-main">' +
        '  <div class="mp-row-title">' + _esc(c.equipment) + ' <span class="mp-row-fault">' + _esc(c.faultName) + '</span></div>' +
        '  <div class="mp-row-sub">On ' + c.decidedOn + ': <strong>' + _esc(c.disposition) + '</strong> — ' + _esc(c.note) + '</div>' +
        '</div>' +
        status +
        '<div class="mp-row-acts">' + btn('resolved', 'Resolved') + btn('carry', 'Carry') + btn('escalate', 'Escalate') + '</div>' +
        '</div>';
    }).join('');
  }

  function _triageRows() {
    var rows = _DEMO.newFaults.slice().sort(function (a, b) { return b.sevNorm - a.sevNorm; });
    return rows.map(function (f) {
      var t = _state.triage[f.id];
      if (t === 'dismissed') {
        return '<div class="mp-row mp-row--dismissed">' +
          '<div class="mp-row-main"><div class="mp-row-title">' + _esc(f.equipment) +
          ' <span class="mp-row-fault">' + _esc(f.faultName) + '</span></div>' +
          '<div class="mp-row-sub">Dismissed: ' + _esc(_state.dismissReasons[f.id] || '') + '</div></div>' +
          '<div class="mp-row-acts"><button class="mp-act" data-fault="' + f.id + '" data-triage="undo">Undo</button></div>' +
          '</div>';
      }
      var btn = function (key, label, extraCls) {
        return '<button class="mp-act' + (t === key ? ' mp-act--on' : '') + (extraCls || '') +
          '" data-fault="' + f.id + '" data-triage="' + key + '">' + label + '</button>';
      };
      return '<div class="mp-row' + (t ? ' mp-row--done' : '') + '">' +
        '<div class="mp-row-main">' +
        '  <div class="mp-row-title">' + _esc(f.equipment) + ' <span class="mp-row-fault">' + _esc(f.faultName) + '</span></div>' +
        '  <div class="mp-row-sub">First seen ' + f.firstSeen + ' · ' + f.faultActive + '% active · ' + f.sumDur + ' h</div>' +
        '</div>' +
        _sevBadge(f.sevNorm) +
        '<div class="mp-row-acts">' +
          btn('agenda', '+ Agenda', ' mp-act--primary') + btn('monitor', 'Monitor') + btn('dismissed', 'Dismiss') +
        '</div>' +
        '</div>';
    }).join('');
  }

  function _systemCards() {
    return _DEMO.systems.map(function (s) {
      var done = !!_state.reviewed[s.key];
      return '<div class="mp-sys' + (done ? ' mp-sys--done' : '') + '" data-sys="' + s.key + '">' +
        '<div class="mp-sys-hd">' +
        '  <label class="mp-sys-check"><input type="checkbox" data-sysreview="' + s.key + '"' + (done ? ' checked' : '') + '> ' + s.label + '</label>' +
        '  <button class="mp-act" data-flag="' + s.key + '">Flag observation</button>' +
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
      body = '<div class="mp-rail-empty">No agenda items yet.<br>Triage faults or flag observations to build the agenda.</div>';
    } else {
      body = items.map(function (it) {
        var f = it.fault;
        return '<div class="mp-rail-item">' +
          '<div class="mp-rail-item-main">' +
          '  <div class="mp-rail-item-equip">' + _esc(f.equipment || '') + '</div>' +
          '  <div class="mp-rail-item-fault">' + _esc(f.faultName || '') + '</div>' +
          '</div>' +
          '<button class="mp-rail-remove" data-railremove="' + f.id + '" title="Remove from agenda">&times;</button>' +
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
        '    ' + _deltaStrip(),
        '    <div class="mp-section">',
        '      <h3 class="mp-section-title">1 &middot; Review carried items <span class="mp-section-sub">prior dispositions vs. current status</span></h3>',
        '      <div id="mpCarried">' + _carriedRows() + '</div>',
        '    </div>',
        '    <div class="mp-section">',
        '      <h3 class="mp-section-title">2 &middot; Triage new faults <span class="mp-section-sub">since ' + _DEMO.lastMeeting + '</span></h3>',
        '      <div id="mpTriage">' + _triageRows() + '</div>',
        '    </div>',
        '    <div class="mp-section">',
        '      <h3 class="mp-section-title">3 &middot; Systems walkthrough <span class="mp-section-sub">review each, flag anything meeting-worthy</span></h3>',
        '      <div class="mp-sys-grid" id="mpSystems">' + _systemCards() + '</div>',
        '    </div>',
        '  </div>',
        '  <aside class="mp-rail" id="mpRail">' + _railHtml() + '</aside>',
        '</div>'
      ].join('\n');
    },

    initLive: function (contentEl, ctx, co, container) {
      var self = this;

      function rerenderRail() {
        var rail = contentEl.querySelector('#mpRail');
        if (rail) { rail.innerHTML = _railHtml(); wireRail(); }
      }

      function rerenderSection(id, html) {
        var el = contentEl.querySelector(id);
        if (el) el.innerHTML = html;
      }

      // Carried-item dispositions
      contentEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;

        // Disposition buttons
        var carriedId = btn.getAttribute('data-carried');
        if (carriedId) {
          var disp = btn.getAttribute('data-disp');
          _state.dispositions[carriedId] = (_state.dispositions[carriedId] === disp) ? null : disp;
          if (disp === 'escalate' && _state.dispositions[carriedId]) {
            var c = _DEMO.carried.filter(function (x) { return x.id === carriedId; })[0];
            if (c && NS.meeting) NS.meeting.add({ id: 'carried-' + c.id, equipment: c.equipment, faultName: c.faultName });
          }
          _saveState();
          rerenderSection('#mpCarried', _carriedRows());
          rerenderRail();
          return;
        }

        // Triage buttons
        var faultId = btn.getAttribute('data-fault');
        if (faultId) {
          var action = btn.getAttribute('data-triage');
          var f = _DEMO.newFaults.filter(function (x) { return x.id === faultId; })[0];
          if (action === 'undo') {
            delete _state.triage[faultId];
            delete _state.dismissReasons[faultId];
          } else if (action === 'dismissed') {
            var reason = window.prompt('Dismiss reason (required) — e.g. false positive, known condition:');
            if (!reason) return;
            _state.triage[faultId] = 'dismissed';
            _state.dismissReasons[faultId] = reason;
            if (f && NS.meeting && NS.meeting.has(f.id)) NS.meeting.remove(f.id);
          } else {
            _state.triage[faultId] = (_state.triage[faultId] === action) ? null : action;
            if (f && NS.meeting) {
              if (_state.triage[faultId] === 'agenda') NS.meeting.add(f);
              else if (NS.meeting.has(f.id)) NS.meeting.remove(f.id);
            }
          }
          _saveState();
          rerenderSection('#mpTriage', _triageRows());
          rerenderRail();
          var deltaEl = contentEl.querySelector('.mp-delta');
          if (deltaEl) deltaEl.outerHTML = _deltaStrip();
          return;
        }

        // Flag observation
        var sysKey = btn.getAttribute('data-flag');
        if (sysKey) {
          var sys = _DEMO.systems.filter(function (x) { return x.key === sysKey; })[0];
          var note = window.prompt('Observation for ' + (sys ? sys.label : sysKey) + ':');
          if (!note || !NS.meeting) return;
          NS.meeting.add({ id: 'obs-' + (_state.obsSeq++), equipment: (sys ? sys.label : sysKey), faultName: note, manual: true });
          _saveState();
          rerenderRail();
          return;
        }
      });

      // Systems reviewed checkboxes
      contentEl.addEventListener('change', function (e) {
        var key = e.target.getAttribute && e.target.getAttribute('data-sysreview');
        if (!key) return;
        _state.reviewed[key] = e.target.checked;
        _saveState();
        var card = contentEl.querySelector('.mp-sys[data-sys="' + key + '"]');
        if (card) card.classList.toggle('mp-sys--done', e.target.checked);
      });

      function wireRail() {
        var rail = contentEl.querySelector('#mpRail');
        if (!rail) return;

        rail.querySelectorAll('[data-railremove]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-railremove');
            // ids of fault items are numbers; observation/carried ids are strings
            var numId = parseInt(id, 10);
            NS.meeting.remove(String(numId) === id ? numId : id);
            // Clear triage flag if this was a triaged fault
            _DEMO.newFaults.forEach(function (f) {
              if (String(f.id) === id && _state.triage[f.id] === 'agenda') delete _state.triage[f.id];
            });
            _saveState();
            rerenderSection('#mpTriage', _triageRows());
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
