// components/MeetingView.js — Meeting facilitation tab
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  // ── Shared agenda store ───────────────────────────────────────────────────
  var _agenda = []; // [{ fault, discussed, addedAt }]

  NS.meeting = {
    add: function (fault) {
      if (_agenda.some(function (i) { return i.fault.id === fault.id; })) return;
      _agenda.push({ fault: fault, discussed: false, addedAt: Date.now() });
      _refreshBadge();
    },
    remove: function (faultId) {
      _agenda = _agenda.filter(function (i) { return i.fault.id !== faultId; });
      _refreshBadge();
    },
    has: function (faultId) {
      return _agenda.some(function (i) { return i.fault.id === faultId; });
    },
    count: function () { return _agenda.length; }
  };

  function _refreshBadge() {
    var btn = document.querySelector('#mbcxDashboard .dash-tab[data-tab="meetings"]');
    if (!btn) return;
    var n = _agenda.length;
    btn.textContent = n > 0 ? 'Meetings (' + n + ')' : 'Meetings';
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  function _renderEmpty() {
    return [
      '<div class="mtg-empty">',
      '  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
      '    <rect x="8" y="2" width="8" height="4" rx="1"/>',
      '    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
      '    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>',
      '  </svg>',
      '  <div class="mtg-empty-title">No items in your meeting agenda</div>',
      '  <div class="mtg-empty-body">',
      '    Browse the <strong>Faults</strong> tab and click the',
      '    <span class="mtg-inline-badge">+</span> button on any fault to add it to the agenda.',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // ── Agenda list view ──────────────────────────────────────────────────────
  function _showAgenda(contentEl, ctx, co) {
    if (co && co.FaultDetail) co.FaultDetail.destroy();

    var discussed = _agenda.filter(function (i) { return i.discussed; }).length;
    var pct = _agenda.length ? Math.round(discussed / _agenda.length * 100) : 0;

    contentEl.innerHTML = [
      '<div class="mtg-page">',

      _agenda.length ? [
        '<div class="mtg-hd">',
        '  <div>',
        '    <div class="mtg-hd-title">Meeting Agenda</div>',
        '    <div class="mtg-hd-meta">' + _agenda.length + ' item' + (_agenda.length !== 1 ? 's' : '') +
             ' &nbsp;&middot;&nbsp; ' + discussed + ' discussed</div>',
        '  </div>',
        '  <button class="mtg-clear-btn" id="mtgClearBtn">Clear All</button>',
        '</div>',

        '<div class="mtg-progress-track">',
        '  <div class="mtg-progress-fill" style="width:' + pct + '%"></div>',
        '</div>',

        '<div class="mtg-list" id="mtgList">',
        _agenda.map(function (item, idx) {
          var f   = item.fault;
          var cls = f.sev === 'critical' ? 'fl-badge-critical' : 'fl-badge-warning';
          var lbl = f.sev === 'critical' ? 'Critical' : 'Warning';
          return '<div class="mtg-item' + (item.discussed ? ' mtg-item-done' : '') + '" data-idx="' + idx + '">' +
            '<div class="mtg-item-num">' + (idx + 1) + '</div>' +
            '<div class="mtg-item-body">' +
            '  <div class="mtg-item-equip">' + (f.equip || '') + '</div>' +
            '  <div class="mtg-item-fault">' + (f.fault  || '') + '</div>' +
            '</div>' +
            '<div class="mtg-item-actions">' +
            '  <span class="fl-badge ' + cls + '">' + lbl + '</span>' +
            (item.discussed ? '<span class="mtg-disc-tag">Discussed</span>' : '') +
            '  <button class="mtg-present-btn" data-idx="' + idx + '">Present</button>' +
            '  <button class="mtg-remove-btn" data-idx="' + idx + '" title="Remove from agenda">&times;</button>' +
            '</div>' +
            '</div>';
        }).join(''),
        '</div>'
      ].join('\n') : _renderEmpty(),

      '</div>'
    ].join('\n');

    if (!_agenda.length) return;

    contentEl.querySelector('#mtgClearBtn').addEventListener('click', function () {
      _agenda = [];
      _refreshBadge();
      _showAgenda(contentEl, ctx, co);
    });

    contentEl.querySelector('#mtgList').addEventListener('click', function (e) {
      var removeBtn  = e.target.closest('.mtg-remove-btn');
      var presentBtn = e.target.closest('.mtg-present-btn');
      var row        = e.target.closest('.mtg-item[data-idx]');

      if (removeBtn) {
        var ridx = parseInt(removeBtn.getAttribute('data-idx'), 10);
        if (!isNaN(ridx)) {
          var removed = _agenda[ridx];
          _agenda.splice(ridx, 1);
          _refreshBadge();
          if (removed) NS.meeting.remove(removed.fault.id); // keep store in sync
          _agenda = _agenda; // no-op, just for clarity
          _showAgenda(contentEl, ctx, co);
        }
        return;
      }

      var idx;
      if (presentBtn) {
        idx = parseInt(presentBtn.getAttribute('data-idx'), 10);
      } else if (row && !e.target.closest('button')) {
        idx = parseInt(row.getAttribute('data-idx'), 10);
      }
      if (idx !== undefined && !isNaN(idx)) _present(contentEl, idx, ctx, co);
    });
  }

  // ── Present mode (delegates to FaultDetail with meeting nav) ─────────────
  function _present(contentEl, idx, ctx, co) {
    if (!_agenda[idx] || !co || !co.FaultDetail) return;
    var item      = _agenda[idx];
    var fault     = item.fault;
    var allFaults = _agenda.map(function (i) { return i.fault; });

    co.FaultDetail.show(
      contentEl, fault, allFaults, ctx,
      function () { _showAgenda(contentEl, ctx, co); },
      {
        agendaNav: {
          current:  idx + 1,
          total:    _agenda.length,
          discussed: item.discussed,
          onPrev: idx > 0
            ? function () { _present(contentEl, idx - 1, ctx, co); }
            : null,
          onNext: idx < _agenda.length - 1
            ? function () { _present(contentEl, idx + 1, ctx, co); }
            : null,
          onMarkDiscussed: function () {
            _agenda[idx].discussed = !_agenda[idx].discussed;
            _refreshBadge();
            _present(contentEl, idx, ctx, co);
          }
        }
      }
    );
  }

  // ── Public API ────────────────────────────────────────────────────────────
  NS.components.MeetingView = {
    showInContent: function (contentEl, ctx, co) {
      _showAgenda(contentEl, ctx, co);
    },
    destroy: function (co) {
      if (co && co.FaultDetail) co.FaultDetail.destroy();
    }
  };

})(window.mbcxDashboard);
