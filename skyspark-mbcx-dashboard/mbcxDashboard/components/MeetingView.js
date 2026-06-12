// components/MeetingView.js — Meeting facilitation tab
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  // ── Shared agenda store ───────────────────────────────────────────────────
  var _agenda = []; // [{ fault, discussed, addedAt }]
  var _nextId  = 9000; // IDs for manually-added items

  // Persist the agenda so a refresh mid-prep (or mid-meeting) doesn't lose
  // it. _raw grid rows are stripped from storage to keep it small — trend
  // fetches fall back to ctx dates without them.
  // TODO(data): move to an mbcxMeeting rec alongside the prep draft.
  var AGENDA_KEY = 'mbcxMeetingAgenda';
  function _saveAgenda() {
    try {
      localStorage.setItem(AGENDA_KEY, JSON.stringify(_agenda, function (k, v) {
        return k === '_raw' ? undefined : v;
      }));
    } catch (e) {}
  }
  (function _loadAgenda() {
    try {
      var s = localStorage.getItem(AGENDA_KEY);
      if (s) {
        var saved = JSON.parse(s);
        if (Object.prototype.toString.call(saved) === '[object Array]') {
          _agenda = saved.filter(function (i) { return i && i.fault; });
        }
      }
    } catch (e) {}
  })();

  NS.meeting = {
    add: function (fault) {
      if (_agenda.some(function (i) { return i.fault.id === fault.id; })) return;
      _agenda.push({ fault: fault, discussed: false, addedAt: Date.now() });
      _saveAgenda();
      _refreshBadge();
    },
    remove: function (faultId) {
      _agenda = _agenda.filter(function (i) { return i.fault.id !== faultId; });
      _saveAgenda();
      _refreshBadge();
    },
    has: function (faultId) {
      return _agenda.some(function (i) { return i.fault.id === faultId; });
    },
    count: function () { return _agenda.length; },
    list:  function () { return _agenda.slice(); },
    move:  function (faultId, delta) {
      var idx = -1;
      _agenda.forEach(function (i, n) { if (i.fault.id === faultId) idx = n; });
      var j = idx + delta;
      if (idx === -1 || j < 0 || j >= _agenda.length) return;
      var tmp = _agenda[idx]; _agenda[idx] = _agenda[j]; _agenda[j] = tmp;
      _saveAgenda();
    }
  };

  function _refreshBadge() {
    var btn = document.querySelector('#mbcxDashboard .dash-sb-nav-item[data-tab="meetings"]');
    if (!btn) return;
    var n    = _agenda.length;
    var span = btn.querySelector('span');
    if (span) span.textContent = n > 0 ? 'Meetings (' + n + ')' : 'Meetings';
  }

  function _guessType(equip) {
    var s = String(equip || '').toUpperCase();
    if (s.indexOf('AHU') !== -1 || s.indexOf('FCU') !== -1 || s.indexOf('RTU') !== -1 || s.indexOf('MAU') !== -1) return 'AHU';
    if (s.indexOf('VAV') !== -1 || s.indexOf('FPB') !== -1) return 'VAV';
    if (s.indexOf('CHIL') !== -1 || s.indexOf('CUP') !== -1 || s.indexOf('BOIL') !== -1 || s.indexOf('HW') !== -1) return 'CUP';
    return 'Other';
  }

  // ── Agenda view ───────────────────────────────────────────────────────────
  function _showAgenda(contentEl, ctx, co) {
    if (co && co.FaultDetail) co.FaultDetail.destroy();

    var discussed = _agenda.filter(function (i) { return i.discussed; }).length;
    var pct = _agenda.length ? Math.round(discussed / _agenda.length * 100) : 0;

    contentEl.innerHTML = [
      '<div class="mtg-page">',

      // Header — always shown
      '<div class="mtg-hd">',
      '  <div>',
      '    <div class="mtg-hd-title">Meeting Agenda</div>',
      _agenda.length
        ? '<div class="mtg-hd-meta">' + _agenda.length + ' item' + (_agenda.length !== 1 ? 's' : '') +
          ' &nbsp;&middot;&nbsp; ' + discussed + ' discussed</div>'
        : '',
      '  </div>',
      '  <div class="mtg-hd-actions">',
      '    <button class="mtg-add-btn" id="mtgAddBtn">+ Add Item</button>',
      (_agenda.length && ctx && ctx.attestKey)
        ? '<button class="mtg-add-btn mtg-end-btn" id="mtgEndBtn" title="Save this agenda as a meeting record in SkySpark and start the next cycle">End Meeting &amp; Save</button>' : '',
      _agenda.length ? '<button class="mtg-clear-btn" id="mtgClearBtn">Clear All</button>' : '',
      '  </div>',
      '</div>',

      // Inline add form (hidden by default)
      '<div class="mtg-add-area" id="mtgAddArea" style="display:none;">',
      '  <div class="mtg-add-form">',
      '    <div class="mtg-add-row">',
      '      <input class="mtg-add-input" id="mtgAddEquip" type="text" placeholder="Equipment (e.g. AHU-1)" autocomplete="off" />',
      '      <select class="mtg-add-select" id="mtgAddSev">',
      '        <option value="warning">Warning</option>',
      '        <option value="critical">Critical</option>',
      '      </select>',
      '    </div>',
      '    <textarea class="mtg-add-textarea" id="mtgAddIssue" placeholder="Describe the issue…" rows="2"></textarea>',
      '    <div class="mtg-add-footer">',
      '      <button class="mtg-add-submit" id="mtgAddSubmit">Add to Agenda</button>',
      '      <button class="mtg-add-cancel" id="mtgAddCancel">Cancel</button>',
      '    </div>',
      '  </div>',
      '</div>',

      // Progress bar
      _agenda.length ? [
        '<div class="mtg-progress-track">',
        '  <div class="mtg-progress-fill" style="width:' + pct + '%"></div>',
        '</div>'
      ].join('\n') : '',

      // Empty state or item list
      !_agenda.length ? [
        '<div class="mtg-empty">',
        '  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
        '    <rect x="8" y="2" width="8" height="4" rx="1"/>',
        '    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
        '    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>',
        '  </svg>',
        '  <div class="mtg-empty-title">No items in your meeting agenda</div>',
        '  <div class="mtg-empty-body">',
        '    Click <strong>+ Add Item</strong> above, or browse the <strong>Faults</strong> tab',
        '    and click the <span class="mtg-inline-badge">+</span> button on any fault.',
        '  </div>',
        '</div>'
      ].join('\n') : [
        '<div class="mtg-list" id="mtgList">',
        _agenda.map(function (item, idx) {
          var f   = item.fault;
          // Items come from two shapes: the manual add form (equip/fault/sev)
          // and the fault list / Meeting Prep (equipment/faultName/sevNorm).
          var equipTxt = f.equip || f.equipment || '';
          var faultTxt = f.fault || f.faultName || '';
          var isCrit = f.sev === 'critical' || (typeof f.sevNorm === 'number' && f.sevNorm >= 6);
          var cls = isCrit ? 'fl-badge-critical' : 'fl-badge-warning';
          var lbl = isCrit ? 'Critical' : 'Warning';
          var esc = function (s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
              .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          };
          var manualTag = f._manual ? '<span class="mtg-manual-tag">Custom</span>' : '';
          return '<div class="mtg-item' + (item.discussed ? ' mtg-item-done' : '') + '" data-idx="' + idx + '">' +
            '<div class="mtg-drag-handle" title="Drag to reorder">&#8942;&#8942;</div>' +
            '<div class="mtg-item-num">' + (idx + 1) + '</div>' +
            '<div class="mtg-item-body">' +
            '  <div class="mtg-item-equip">' + esc(equipTxt) + manualTag + '</div>' +
            '  <div class="mtg-item-fault">' + esc(faultTxt) + '</div>' +
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
      ].join('\n'),

      '</div>'
    ].join('\n');

    _wireAddForm(contentEl, ctx, co);

    if (_agenda.length) {
      var clearBtn = contentEl.querySelector('#mtgClearBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          _agenda = [];
          _saveAgenda();
          _refreshBadge();
          _showAgenda(contentEl, ctx, co);
        });
      }

      // End Meeting & Save — commit this meeting (agenda + prep draft) as a
      // unique mbcxMeeting rec, then reset for the next cycle. Prep skips
      // are kept (they persist across meetings by design).
      // TODO(auth): server-side role check before this ships to clients.
      // TODO(data): once meeting recs drive Meeting Prep, "last meeting"
      // dates and the carried-items queue should read from these records.
      var endBtn = contentEl.querySelector('#mtgEndBtn');
      if (endBtn) {
        endBtn.addEventListener('click', function () {
          if (!window.confirm('Save this agenda as a meeting record and clear it for the next cycle?')) return;
          var agendaJson = JSON.stringify(_agenda, function (k, v) {
            return k === '_raw' ? undefined : v;
          });
          var prepJson = '';
          try { prepJson = localStorage.getItem('mbcxMeetingPrep_draft') || ''; } catch (e) {}
          function q(s) {
            return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
          }
          var discussed = _agenda.filter(function (i) { return i.discussed; }).length;
          var axon = 'commit(diff(null, {mbcxMeeting' +
            ', dis: ' + q('MBCx Meeting ' + new Date().toISOString().slice(0, 10) + (ctx.siteName ? ' — ' + ctx.siteName : '')) +
            ', date: today()' +
            (ctx.siteRef ? ', siteRef: ' + ctx.siteRef : '') +
            ', mbcxItemCount: ' + _agenda.length +
            ', mbcxDiscussedCount: ' + discussed +
            ', mbcxAgenda: ' + q(agendaJson) +
            (prepJson ? ', mbcxPrepDraft: ' + q(prepJson) : '') +
            '}, {add}))';
          endBtn.disabled = true;
          endBtn.textContent = 'Saving…';
          NS.api.evalAxon(ctx.attestKey, ctx.projectName, axon)
            .then(function () {
              _agenda = [];
              _saveAgenda();
              _refreshBadge();
              // New cycle: clear prep review progress, keep persistent skips
              try {
                var draft = JSON.parse(localStorage.getItem('mbcxMeetingPrep_draft')) || {};
                draft.reviewed = {};
                localStorage.setItem('mbcxMeetingPrep_draft', JSON.stringify(draft));
              } catch (e) {}
              _showAgenda(contentEl, ctx, co);
            })
            .catch(function (err) {
              console.warn('[MeetingView] Meeting record save failed:', err);
              endBtn.disabled = false;
              endBtn.textContent = 'End Meeting & Save';
              window.alert('Could not save the meeting record — check permissions (details in console).');
            });
        });
      }

      var listEl = contentEl.querySelector('#mtgList');
      if (listEl) {
        _wireListClicks(listEl, contentEl, ctx, co);
        _wireDragAndDrop(listEl, contentEl, ctx, co);
      }
    }
  }

  // ── Add Item form ─────────────────────────────────────────────────────────
  function _wireAddForm(contentEl, ctx, co) {
    var addBtn    = contentEl.querySelector('#mtgAddBtn');
    var addArea   = contentEl.querySelector('#mtgAddArea');
    var submitBtn = contentEl.querySelector('#mtgAddSubmit');
    var cancelBtn = contentEl.querySelector('#mtgAddCancel');

    function showForm() {
      addArea.style.display = '';
      addArea.style.animation = 'mtgSlideDown 0.18s ease';
      var eq = contentEl.querySelector('#mtgAddEquip');
      if (eq) setTimeout(function () { eq.focus(); }, 50);
    }
    function hideForm() {
      addArea.style.display = 'none';
      contentEl.querySelector('#mtgAddEquip').value  = '';
      contentEl.querySelector('#mtgAddIssue').value  = '';
      contentEl.querySelector('#mtgAddSev').value    = 'warning';
    }

    if (addBtn) addBtn.addEventListener('click', showForm);
    if (cancelBtn) cancelBtn.addEventListener('click', hideForm);

    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        var equip = contentEl.querySelector('#mtgAddEquip').value.trim();
        var issue = contentEl.querySelector('#mtgAddIssue').value.trim();
        var sev   = contentEl.querySelector('#mtgAddSev').value;
        if (!equip && !issue) { contentEl.querySelector('#mtgAddEquip').focus(); return; }
        var fault = {
          id:      _nextId++,
          equip:   equip || 'Unknown Equipment',
          type:    _guessType(equip),
          fault:   issue || 'Custom agenda item',
          sev:     sev,
          dur:     '',
          status:  'Active',
          ts:      '',
          _manual: true
        };
        _agenda.push({ fault: fault, discussed: false, addedAt: Date.now() });
        _refreshBadge();
        _showAgenda(contentEl, ctx, co);
      });
    }

    // Submit on Ctrl/Cmd+Enter inside textarea
    var textarea = contentEl.querySelector('#mtgAddIssue');
    if (textarea) {
      textarea.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitBtn && submitBtn.click();
      });
    }
  }

  // ── List item clicks (present / remove) ───────────────────────────────────
  function _wireListClicks(listEl, contentEl, ctx, co) {
    listEl.addEventListener('click', function (e) {
      var removeBtn  = e.target.closest('.mtg-remove-btn');
      var presentBtn = e.target.closest('.mtg-present-btn');
      var handle     = e.target.closest('.mtg-drag-handle');
      var row        = e.target.closest('.mtg-item[data-idx]');

      if (handle) return; // ignore handle clicks

      if (removeBtn) {
        var ridx = parseInt(removeBtn.getAttribute('data-idx'), 10);
        if (!isNaN(ridx)) {
          var removed = _agenda[ridx];
          _agenda.splice(ridx, 1);
          _saveAgenda();
          // keep NS.meeting store in sync for non-manual items
          if (removed && !removed.fault._manual) NS.meeting.remove(removed.fault.id);
          else _refreshBadge();
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

  // ── Drag-and-drop reordering ──────────────────────────────────────────────
  function _wireDragAndDrop(listEl, contentEl, ctx, co) {
    var draggingIdx = null;

    listEl.querySelectorAll('.mtg-item').forEach(function (item) {
      var handle = item.querySelector('.mtg-drag-handle');

      // Only initiate drag from the handle
      if (handle) {
        handle.addEventListener('mousedown', function () {
          item.setAttribute('draggable', 'true');
        });
      }
      item.addEventListener('dragend', function () {
        item.removeAttribute('draggable');
      });

      item.addEventListener('dragstart', function (e) {
        draggingIdx = parseInt(item.getAttribute('data-idx'), 10);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(function () { item.classList.add('mtg-item-dragging'); }, 0);
      });

      item.addEventListener('dragend', function () {
        item.classList.remove('mtg-item-dragging');
        listEl.querySelectorAll('.mtg-item').forEach(function (el) {
          el.classList.remove('mtg-item-over');
        });
        draggingIdx = null;
      });

      item.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (draggingIdx === null) return;
        var toIdx = parseInt(item.getAttribute('data-idx'), 10);
        if (toIdx === draggingIdx) return;
        listEl.querySelectorAll('.mtg-item').forEach(function (el) { el.classList.remove('mtg-item-over'); });
        item.classList.add('mtg-item-over');
      });

      item.addEventListener('dragleave', function () {
        item.classList.remove('mtg-item-over');
      });

      item.addEventListener('drop', function (e) {
        e.preventDefault();
        item.classList.remove('mtg-item-over');
        if (draggingIdx === null) return;
        var toIdx = parseInt(item.getAttribute('data-idx'), 10);
        if (isNaN(toIdx) || toIdx === draggingIdx) return;
        var moved = _agenda.splice(draggingIdx, 1)[0];
        _agenda.splice(toIdx, 0, moved);
        _saveAgenda();
        draggingIdx = null;
        _showAgenda(contentEl, ctx, co);
      });
    });
  }

  // ── Present mode ──────────────────────────────────────────────────────────
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
            _saveAgenda();
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
