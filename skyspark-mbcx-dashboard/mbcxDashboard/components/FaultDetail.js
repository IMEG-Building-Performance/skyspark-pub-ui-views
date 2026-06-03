// components/FaultDetail.js — Fault detail full-page view
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  var CONSTRUCTION_SVG = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2 20h20"/>' +
    '<path d="M5 20V8l7-5 7 5v12"/>' +
    '<path d="M9 20v-4h6v4"/>' +
    '<path d="M3 20l2-2"/><path d="M19 20l2-2"/>' +
    '<rect x="9" y="10" width="6" height="4" rx="0.5"/>' +
    '<path d="M10 10V8"/><path d="M14 10V8"/>' +
    '</svg>';

  function renderDiag(fault) {
    var items = [];

    items.push({
      label: 'Description of Fault',
      text: fault.descriptionofFault || '—'
    });

    items.push({
      label: 'Recommended Actions',
      text: fault.recommendedActions || '—'
    });

    // TODO: wire severity basis to live data
    var sevVal = typeof fault.sevNorm === 'number' ? fault.sevNorm : null;
    items.push({
      label: 'Severity Basis',
      text: sevVal !== null
        ? 'Severity ' + sevVal + ' of 10. Importance factor: ' + (fault.importanceFactor || '—') + '.'
        : 'TODO'
    });

    return items.map(function (d) {
      return '<div class="fd-diag-item">' +
        '<div class="fd-diag-label">' + d.label + '</div>' +
        '<div class="fd-diag-text">' + d.text + '</div>' +
        '</div>';
    }).join('');
  }

  function renderRelated(fault, allFaults) {
    var equipName = String(fault.equipment || '');
    var related = (allFaults || []).filter(function (f) {
      return String(f.equipment) === equipName && f.id !== fault.id;
    });
    if (!related.length) return '<div class="fd-empty">No other active faults on this equipment.</div>';
    return related.map(function (f) {
      var sev = typeof f.sevNorm === 'number' ? f.sevNorm : '—';
      var pct = typeof f.faultActive === 'number' ? f.faultActive.toFixed(1) + '%' : '—';
      return '<div class="fd-related-item">' +
        '<span class="fd-related-sev">Sev ' + sev + '</span>' +
        '<span class="fd-related-fault">' + (f.faultName || '') + '</span>' +
        '<span class="fd-related-pct">' + pct + '</span>' +
        '</div>';
    }).join('');
  }

  function renderConstruction(title) {
    return [
      '<div class="fd-card fd-card-construction">',
      '  <div class="fd-card-title">' + title + '</div>',
      '  <div class="fd-construction">',
      '    ' + CONSTRUCTION_SVG,
      '    <div class="fd-construction-text">Under Construction</div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  NS.components.FaultDetail = {

    show: function (contentEl, fault, allFaults, ctx, onBack, options) {
      var opts     = options || {};
      var nav      = opts.agendaNav || null;
      var backLabel = nav ? '&#8592; Agenda' : '&#8592; Fault List';
      var inAgenda = !!(NS.meeting && NS.meeting.has(fault.id));

      var sevVal = typeof fault.sevNorm === 'number' ? fault.sevNorm : '—';
      var durVal = typeof fault.sumDur === 'number' ? fault.sumDur + 'h' : (fault.sumDur || '—');
      var pctVal = typeof fault.faultActive === 'number' ? fault.faultActive.toFixed(1) + '%' : '';

      var sparksHtml = '';
      if (fault.sparksLink) {
        sparksHtml = '<a class="fd-sparks-link" href="' + fault.sparksLink + '" target="_blank" title="Open in SkySpark">View in SkySpark &#8599;</a>';
      }

      contentEl.innerHTML = [
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
        '      <div class="fd-hd-equip">' + (fault.equipment || '') + '</div>',
        '      <div class="fd-hd-fault">' + (fault.faultName || '') + '</div>',
        '    </div>',
        '    <div class="fd-hd-badges">',
        '      <span class="fd-sev-badge">Sev ' + sevVal + '</span>',
        '      <span class="fd-dur">' + durVal + '</span>',
        pctVal ? '<span class="fd-pct">' + pctVal + '</span>' : '',
        sparksHtml,
        !nav ? '<button class="fd-agenda-toggle' + (inAgenda ? ' fd-agenda-in' : '') + '" id="fdAgendaToggle">' +
               (inAgenda ? '&#10003; In Agenda' : '+ Add to Meeting') + '</button>' : '',
        '    </div>',
        '  </div>',

        '  <div class="fd-body">',

        renderConstruction('Fault Trend'),

        '    <div class="fd-cols">',

        '      <div class="fd-card">',
        '        <div class="fd-card-title">Diagnostics</div>',
        '        <div class="fd-diag-list">' + renderDiag(fault) + '</div>',
        '      </div>',

        '      <div class="fd-card">',
        '        <div class="fd-card-title">Related Equipment Issues <span class="fd-card-sub">' + (fault.equipment || '') + '</span></div>',
        '        <div class="fd-related">' + renderRelated(fault, allFaults) + '</div>',
        '      </div>',

        renderConstruction('Activity &amp; Notes'),

        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n');

      // Back button
      contentEl.querySelector('#fdBackBtn').addEventListener('click', function () { onBack(); });

      // Meeting nav buttons
      if (nav) {
        var prevBtn = contentEl.querySelector('#fdNavPrev');
        var nextBtn = contentEl.querySelector('#fdNavNext');
        var discBtn = contentEl.querySelector('#fdDiscussBtn');
        if (prevBtn && nav.onPrev) prevBtn.addEventListener('click', function () { nav.onPrev(); });
        if (nextBtn && nav.onNext) nextBtn.addEventListener('click', function () { nav.onNext(); });
        if (discBtn) discBtn.addEventListener('click', function () {
          if (nav.onMarkDiscussed) nav.onMarkDiscussed();
        });
      }

      // "Add to Meeting" toggle
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
    },

    destroy: function () {}
  };

})(window.mbcxDashboard);
