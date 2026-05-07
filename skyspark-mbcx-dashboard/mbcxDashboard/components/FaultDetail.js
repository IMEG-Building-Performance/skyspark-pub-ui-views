// components/FaultDetail.js — Fault detail full-page view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {
  var _chart = null;

  function lcg(seed) {
    var s = (seed ^ 0x12345678) >>> 0;
    return function () { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
  }

  // 7 days × 6 readings (every 4 h) = 42 labels
  var LABELS = (function () {
    var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], out = [];
    days.forEach(function (d) {
      for (var h = 0; h < 24; h += 4) out.push(d + ' ' + (h < 10 ? '0' + h : h) + ':00');
    });
    return out;
  })();

  function wave(rng, base, amp, noise, lo, hi) {
    return LABELS.map(function (_, i) {
      var occ = (i % 6 === 0 || i % 6 === 5) ? 0.2 : 1;
      var v = base + amp * Math.sin(i / 6 * Math.PI) * occ + (rng() - 0.5) * noise;
      v = Math.round(v * 10) / 10;
      if (lo !== undefined) v = Math.max(lo, v);
      if (hi !== undefined) v = Math.min(hi, v);
      return v;
    });
  }

  function stuck(rng, nominal, noise, lo, hi) {
    return LABELS.map(function () {
      var v = nominal + (rng() - 0.5) * noise;
      v = Math.round(v * 10) / 10;
      if (lo !== undefined) v = Math.max(lo, v);
      if (hi !== undefined) v = Math.min(hi, v);
      return v;
    });
  }

  function constant(val) { return LABELS.map(function () { return val; }); }

  function genSignals(fault) {
    var rng  = lcg((fault.id || 0) * 7919 + 42);
    var desc = (fault.fault || '').toLowerCase();
    var type = (fault.type || '').toUpperCase();

    if (type === 'AHU') {
      if (desc.indexOf('cool') !== -1 || (desc.indexOf('valve') !== -1 && desc.indexOf('reheat') === -1)) {
        return [
          { key:'cv',  label:'Cooling Valve',  unit:'%',  color:'#06b6d4', data:stuck(rng, 88, 8, 0, 100) },
          { key:'sat', label:'Supply Air Temp', unit:'°F', color:'#ef4444', data:wave(rng, 53, 4, 2) },
          { key:'zt',  label:'Zone Temp',       unit:'°F', color:'#3b82f6', data:wave(rng, 68, 3, 1.5) },
          { key:'oat', label:'OA Temp',         unit:'°F', color:'#10b981', data:wave(rng, 57, 9, 3) }
        ];
      }
      if (desc.indexOf('damper') !== -1) {
        return [
          { key:'oad', label:'OA Damper',       unit:'%',  color:'#10b981', data:stuck(rng, 8, 5, 0, 100) },
          { key:'mat', label:'Mixed Air Temp',  unit:'°F', color:'#f59e0b', data:wave(rng, 68, 6, 2) },
          { key:'sat', label:'Supply Air Temp', unit:'°F', color:'#ef4444', data:wave(rng, 65, 5, 2) }
        ];
      }
      if (desc.indexOf('vfd') !== -1 || desc.indexOf('speed') !== -1 || desc.indexOf('oscil') !== -1) {
        return [
          { key:'vfd', label:'VFD Speed',         unit:'%',    color:'#8b5cf6', data:wave(rng, 60, 50, 22, 10, 100) },
          { key:'dsp', label:'Duct Static Pres.', unit:'inWC', color:'#3b82f6', data:wave(rng, 1.1, 0.7, 0.25, 0) }
        ];
      }
      if (desc.indexOf('sensor') !== -1 || desc.indexOf('drift') !== -1) {
        return [
          { key:'sat', label:'SAT (sensor)',  unit:'°F', color:'#ef4444', data:wave(rng, 62, 5, 9) },
          { key:'avg', label:'Avg Zone Temp', unit:'°F', color:'#3b82f6', data:wave(rng, 70, 2, 1) }
        ];
      }
      return [
        { key:'sat', label:'Supply Air Temp', unit:'°F', color:'#ef4444', data:wave(rng, 62, 6, 2) },
        { key:'zt',  label:'Zone Temp',       unit:'°F', color:'#3b82f6', data:wave(rng, 71, 3, 1.5) },
        { key:'cv',  label:'Cooling Valve',   unit:'%',  color:'#06b6d4', data:wave(rng, 42, 35, 10, 0, 100) }
      ];
    }

    if (type === 'VAV') {
      if (desc.indexOf('reheat') !== -1 || (desc.indexOf('heat') !== -1 && desc.indexOf('coil') !== -1)) {
        return [
          { key:'rh',  label:'Reheat Valve',   unit:'%',  color:'#ef4444', data:stuck(rng, 82, 10, 0, 100) },
          { key:'sat', label:'Supply Air Temp',unit:'°F', color:'#f97316', data:stuck(rng, 91, 5) },
          { key:'zt',  label:'Zone Temp',      unit:'°F', color:'#3b82f6', data:wave(rng, 71, 2, 1) },
          { key:'sp',  label:'Zone Setpoint',  unit:'°F', color:'#94a3b8', data:constant(70) }
        ];
      }
      if (desc.indexOf('damper') !== -1 || desc.indexOf('cfm') !== -1 || desc.indexOf('airflow') !== -1) {
        return [
          { key:'dm',  label:'Damper',        unit:'%',   color:'#8b5cf6', data:stuck(rng, 6, 4, 0, 100) },
          { key:'af',  label:'Airflow',       unit:'CFM', color:'#10b981', data:stuck(rng, 30, 20, 0) },
          { key:'zt',  label:'Zone Temp',     unit:'°F',  color:'#3b82f6', data:wave(rng, 74, 3, 1.5) },
          { key:'sp',  label:'Zone Setpoint', unit:'°F',  color:'#94a3b8', data:constant(70) }
        ];
      }
      return [
        { key:'zt',  label:'Zone Temp',     unit:'°F',  color:'#ef4444', data:wave(rng, 73.5, 2, 1) },
        { key:'sp',  label:'Zone Setpoint', unit:'°F',  color:'#94a3b8', data:constant(70) },
        { key:'af',  label:'Airflow',       unit:'CFM', color:'#10b981', data:wave(rng, 350, 200, 50, 50) },
        { key:'rh',  label:'Reheat Valve',  unit:'%',   color:'#f97316', data:wave(rng, 20, 20, 8, 0, 100) }
      ];
    }

    return [
      { key:'st', label:'Supply Temp',   unit:'°F',  color:'#06b6d4', data:wave(rng, 44, 4, 2) },
      { key:'rt', label:'Return Temp',   unit:'°F',  color:'#ef4444', data:wave(rng, 57, 5, 2) },
      { key:'dp', label:'Diff Pressure', unit:'psi', color:'#8b5cf6', data:wave(rng, 11, 3, 1.5, 0) }
    ];
  }

  function genDiagnostics(fault) {
    var desc = (fault.fault || '').toLowerCase();
    var sev  = fault.sev || 'warning';
    var items = [];

    if (desc.indexOf('stuck') !== -1 || desc.indexOf('valve') !== -1) {
      items.push({ type:'cause',  label:'Root Cause',
        text:'Valve actuator failure or control loop instability. Output signal consistently outside normal range for >24 hours.' });
    } else if (desc.indexOf('sensor') !== -1 || desc.indexOf('drift') !== -1) {
      items.push({ type:'cause',  label:'Root Cause',
        text:'Sensor calibration drift. Readings deviate from correlated equipment values beyond the fault threshold.' });
    } else if (desc.indexOf('damper') !== -1) {
      items.push({ type:'cause',  label:'Root Cause',
        text:'Actuator or mechanical linkage failure. Damper not responding to control command.' });
    } else if (desc.indexOf('vfd') !== -1 || desc.indexOf('speed') !== -1) {
      items.push({ type:'cause',  label:'Root Cause',
        text:'PID control loop tuning issue. Speed oscillation exceeds ±15% of setpoint within 5-minute windows.' });
    } else {
      items.push({ type:'cause',  label:'Root Cause',
        text:'Performance deviation detected outside normal operating envelope by MBCx rule engine.' });
    }

    items.push({
      type: sev === 'critical' ? 'critical' : 'warning',
      label: 'Severity Basis',
      text: sev === 'critical'
        ? 'Critical — fault duration exceeds 48 hours with measurable impact on comfort and energy performance.'
        : 'Warning — active condition that may escalate without intervention. Recommend inspection within 2 weeks.'
    });

    items.push({ type:'info', label:'Estimated Energy Impact',
      text: sev === 'critical'
        ? 'High — estimated 15–25% excess energy consumption for this system during fault period.'
        : 'Moderate — estimated 5–12% excess energy consumption for this system during fault period.'
    });

    if (desc.indexOf('valve') !== -1 || desc.indexOf('stuck') !== -1) {
      items.push({ type:'action', label:'Recommended Action',
        text:'Inspect valve actuator and calibration. Compare position feedback vs control command in BAS.' });
    } else if (desc.indexOf('sensor') !== -1) {
      items.push({ type:'action', label:'Recommended Action',
        text:'Calibrate or replace sensor. Verify installation location, wiring, and signal scaling.' });
    } else if (desc.indexOf('damper') !== -1) {
      items.push({ type:'action', label:'Recommended Action',
        text:'Inspect damper linkage and actuator. Verify control signal output and position feedback.' });
    } else if (desc.indexOf('vfd') !== -1) {
      items.push({ type:'action', label:'Recommended Action',
        text:'Retune PID control loop. Review acceleration/deceleration ramp settings with BAS contractor.' });
    } else {
      items.push({ type:'action', label:'Recommended Action',
        text:'Schedule equipment inspection. Verify operation against design intent and commissioning records.' });
    }

    return items;
  }

  var DEMO_COMMENTS = [
    { initials:'JM', author:'J. Martinez', date:'2026-03-28 08:14',
      text:'Work order submitted to mechanical contractor. Actuator inspection scheduled for next Tuesday.' },
    { initials:'AP', author:'A. Patel',    date:'2026-03-27 14:32',
      text:'Confirmed in BAS — command at 0% but position feedback still 92%. Actuator has likely failed.' },
    { initials:'TW', author:'T. Williams', date:'2026-03-26 09:05',
      text:'Flagged during weekly MBCx review. Zone comfort complaints received on floors 3–4.' }
  ];

  function renderDiag(items) {
    return items.map(function (d) {
      return '<div class="fd-diag-item fd-diag-' + d.type + '">' +
        '<div class="fd-diag-label">' + d.label + '</div>' +
        '<div class="fd-diag-text">'  + d.text  + '</div>' +
        '</div>';
    }).join('');
  }

  function renderRelated(fault, allFaults) {
    var related = (allFaults || []).filter(function (f) {
      return String(f.equip) === String(fault.equip) && f.id !== fault.id;
    });
    if (!related.length) return '<div class="fd-empty">No other active faults on this equipment.</div>';
    return related.map(function (f) {
      var cls = f.sev === 'critical' ? 'fl-badge-critical' : 'fl-badge-warning';
      return '<div class="fd-related-item">' +
        '<span class="fl-badge ' + cls + '">' + (f.sev === 'critical' ? 'Critical' : 'Warning') + '</span>' +
        '<span class="fd-related-fault">' + f.fault + '</span>' +
        '<div class="fd-related-dur">' + (f.dur || '') + '</div>' +
        '</div>';
    }).join('');
  }

  function renderComments() {
    return DEMO_COMMENTS.map(function (c) {
      return '<div class="fd-comment">' +
        '<div class="fd-comment-hd">' +
        '<div class="fd-avatar">' + c.initials + '</div>' +
        '<div class="fd-comment-meta">' +
        '<div class="fd-comment-author">' + c.author + '</div>' +
        '<div class="fd-comment-date">'   + c.date   + '</div>' +
        '</div></div>' +
        '<div class="fd-comment-body">' + c.text + '</div>' +
        '</div>';
    }).join('');
  }

  function buildChart(root, signals) {
    if (_chart) { _chart.destroy(); _chart = null; }
    var canvas = root.querySelector('#fdCanvas');
    if (!canvas || !window.Chart) return;
    _chart = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: LABELS,
        datasets: signals.map(function (s) {
          return {
            label: s.label + ' (' + s.unit + ')',
            data: s.data,
            borderColor: s.color, backgroundColor: s.color + '18',
            fill: false, tension: 0.3, borderWidth: 2,
            pointRadius: 0, pointHoverRadius: 4
          };
        })
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 10, padding: 14 } },
          tooltip: { mode:'index', intersect:false, backgroundColor:'#1F2937',
            titleFont:{size:11}, bodyFont:{size:11}, padding:10, cornerRadius:6 }
        },
        scales: {
          x: { ticks:{font:{size:10},color:'#9CA3AF',maxTicksLimit:14,maxRotation:0}, grid:{color:'#F3F4F6'} },
          y: { ticks:{font:{size:10},color:'#9CA3AF'}, grid:{color:'#F3F4F6'} }
        },
        interaction: { mode:'index', intersect:false },
        elements: { point:{radius:0,hoverRadius:4}, line:{borderWidth:2} }
      }
    });
  }

  function wireChips(root, signals) {
    var hidden = {};
    root.querySelectorAll('.fd-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        hidden[key] = !hidden[key];
        btn.classList.toggle('fd-chip-active', !hidden[key]);
        btn.classList.toggle('fd-chip-off',    !!hidden[key]);
        if (_chart) {
          signals.forEach(function (s, i) { _chart.data.datasets[i].hidden = !!hidden[s.key]; });
          _chart.update('none');
        }
      });
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  NS.components.FaultDetail = {

    // options.agendaNav = { current, total, discussed, onPrev, onNext, onMarkDiscussed }
    show: function (contentEl, fault, allFaults, ctx, onBack, options) {
      if (_chart) { _chart.destroy(); _chart = null; }

      var opts     = options || {};
      var nav      = opts.agendaNav || null;
      var signals  = genSignals(fault);
      var diags    = genDiagnostics(fault);
      var sevCls   = fault.sev === 'critical' ? 'fl-badge-critical' : 'fl-badge-warning';
      var sevLabel = fault.sev === 'critical' ? 'Critical' : 'Warning';
      var sta      = fault.status || 'Active';
      var staCls   = sta === 'Active' ? 'fl-badge-active' : 'fl-badge-ack';
      var backLabel = nav ? '&#8592; Agenda' : '&#8592; Fault List';
      var inAgenda = !!(NS.meeting && NS.meeting.has(fault.id));

      contentEl.innerHTML = [
        // Meeting nav bar — sticky top, only in meeting/present mode
        nav ? [
          '<div class="fd-mtg-nav">',
          '  <span class="fd-mtg-pos">Item ' + nav.current + ' of ' + nav.total + '</span>',
          '  <div class="fd-mtg-arrows">',
          '    <button class="fd-mtg-arrow" id="fdNavPrev"' + (!nav.onPrev ? ' disabled' : '') + '>&#8592; Prev</button>',
          '    <button class="fd-mtg-arrow" id="fdNavNext"' + (!nav.onNext ? ' disabled' : '') + '>Next &#8594;</button>',
          '  </div>',
          '  <button class="fd-discuss-btn' + (nav.discussed ? ' fd-discuss-done' : '') + '" id="fdDiscussBtn">',
          nav.discussed ? '&#10003; Discussed' : 'Mark Discussed',
          '  </button>',
          '</div>'
        ].join('\n') : '',

        '<div class="fd-page">',

        '  <div class="fd-hd">',
        '    <button class="fd-back" id="fdBackBtn">' + backLabel + '</button>',
        '    <div class="fd-hd-center">',
        '      <div class="fd-hd-equip">' + (fault.equip || '') + '</div>',
        '      <div class="fd-hd-fault">' + (fault.fault  || '') + '</div>',
        '    </div>',
        '    <div class="fd-hd-badges">',
        '      <span class="fl-badge ' + sevCls + '">' + sevLabel + '</span>',
        '      <span class="fl-badge ' + staCls + '">' + sta + '</span>',
        fault.dur ? '<span class="fd-dur">' + fault.dur + '</span>' : '',
        // "Add to Meeting" button — hidden when already in meeting nav mode
        !nav ? '<button class="fd-agenda-toggle' + (inAgenda ? ' fd-agenda-in' : '') + '" id="fdAgendaToggle">' +
               (inAgenda ? '&#10003; In Agenda' : '+ Add to Meeting') + '</button>' : '',
        '    </div>',
        '  </div>',

        '  <div class="fd-body">',

        '    <div class="fd-card fd-card-chart">',
        '      <div class="fd-card-title">Fault Trend <span class="fd-card-sub">7-day demo</span></div>',
        '      <div class="fd-chips">',
        signals.map(function (s) {
          return '<button class="fd-chip fd-chip-active" data-key="' + s.key +
            '" style="--chip-color:' + s.color + ';">' + s.label + '</button>';
        }).join(''),
        '      </div>',
        '      <div class="fd-chart-wrap"><canvas id="fdCanvas"></canvas></div>',
        '    </div>',

        '    <div class="fd-cols">',

        '      <div class="fd-card">',
        '        <div class="fd-card-title">Diagnostics</div>',
        '        <div class="fd-diag-list">' + renderDiag(diags) + '</div>',
        '      </div>',

        '      <div class="fd-card">',
        '        <div class="fd-card-title">Related Equipment Issues <span class="fd-card-sub">' + (fault.equip || '') + '</span></div>',
        '        <div class="fd-related">' + renderRelated(fault, allFaults) + '</div>',
        '      </div>',

        '      <div class="fd-card">',
        '        <div class="fd-card-title">Activity &amp; Notes</div>',
        '        <div class="fd-comments">' + renderComments() + '</div>',
        '        <div class="fd-note-area">',
        '          <textarea class="fd-note-input" id="fdNoteInput" placeholder="Add a note…" rows="2"></textarea>',
        '          <button class="fd-note-btn" id="fdNoteBtn">Add Note</button>',
        '        </div>',
        '      </div>',

        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n');

      // Back button
      contentEl.querySelector('#fdBackBtn').addEventListener('click', function () {
        if (_chart) { _chart.destroy(); _chart = null; }
        onBack();
      });

      // Meeting nav buttons
      if (nav) {
        var prevBtn = contentEl.querySelector('#fdNavPrev');
        var nextBtn = contentEl.querySelector('#fdNavNext');
        var discBtn = contentEl.querySelector('#fdDiscussBtn');
        if (prevBtn && nav.onPrev) prevBtn.addEventListener('click', function () {
          if (_chart) { _chart.destroy(); _chart = null; } nav.onPrev();
        });
        if (nextBtn && nav.onNext) nextBtn.addEventListener('click', function () {
          if (_chart) { _chart.destroy(); _chart = null; } nav.onNext();
        });
        if (discBtn) discBtn.addEventListener('click', function () {
          if (_chart) { _chart.destroy(); _chart = null; }
          if (nav.onMarkDiscussed) nav.onMarkDiscussed();
        });
      }

      // "Add to Meeting" toggle (Fault List / Fault Detail context, not meeting mode)
      if (!nav) {
        var agBtn = contentEl.querySelector('#fdAgendaToggle');
        if (agBtn) {
          agBtn.addEventListener('click', function () {
            if (!NS.meeting) return;
            if (NS.meeting.has(fault.id)) {
              NS.meeting.remove(fault.id);
              agBtn.textContent = '+ Add to Meeting';
              agBtn.classList.remove('fd-agenda-in');
            } else {
              NS.meeting.add(fault);
              agBtn.textContent = '✓ In Agenda';
              agBtn.classList.add('fd-agenda-in');
            }
          });
        }
      }

      // Add note
      contentEl.querySelector('#fdNoteBtn').addEventListener('click', function () {
        var input = contentEl.querySelector('#fdNoteInput');
        var text  = input && input.value.trim();
        if (!text) return;
        var now = new Date();
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        var ts  = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
                  ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
        var el  = document.createElement('div');
        el.className = 'fd-comment fd-comment-new';
        el.innerHTML = '<div class="fd-comment-hd">' +
          '<div class="fd-avatar fd-avatar-me">Me</div>' +
          '<div class="fd-comment-meta">' +
          '<div class="fd-comment-author">You</div>' +
          '<div class="fd-comment-date">' + ts + '</div>' +
          '</div></div>' +
          '<div class="fd-comment-body">' + text + '</div>';
        var comments = contentEl.querySelector('.fd-comments');
        if (comments) comments.insertBefore(el, comments.firstChild);
        input.value = '';
      });

      buildChart(contentEl, signals);
      wireChips(contentEl, signals);
    },

    destroy: function () {
      if (_chart) { _chart.destroy(); _chart = null; }
    }
  };

})(window.mbcxDashboard);
