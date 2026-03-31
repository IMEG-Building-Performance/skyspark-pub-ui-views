// App.js — assembles all sections in the mbcx equip-section card pattern
window.netzeroDashboard = window.netzeroDashboard || {};

(function (NS) {

  // SVG icons for section headers
  var ICONS = {
    kpi:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="2" width="4" height="19"/></svg>',
    table: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
    meter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>'
  };

  var CHEVRON_SVG = '<svg class="nz-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"/></svg>';

  /**
   * Build a section card matching mbcx equip-section pattern.
   * opts.collapsible  — adds collapsible behavior
   * opts.open         — starts expanded (only when collapsible)
   * opts.accentColor  — left border color for collapsible sections
   */
  function section(icon, iconBg, title, meta, bodyHtml, opts) {
    var cls = 'nz-section';
    var hdrAttr = '';
    var collapseBtn = '';
    var accentStyle = '';

    if (opts && opts.collapsible) {
      cls += ' nz-section--collapsible';
      if (opts.open) cls += ' nz-section--open';
      if (opts.accentColor) accentStyle = ' style="border-left-color:' + opts.accentColor + ';"';
      hdrAttr = ' onclick="this.closest(\'.nz-section\').classList.toggle(\'nz-section--open\');"';
      collapseBtn = '<div class="nz-collapse-btn" title="Expand / Collapse">' + CHEVRON_SVG + '</div>';
    }

    return [
      '<div class="' + cls + '"' + accentStyle + '>',
      '  <div class="nz-section-hdr"' + hdrAttr + '>',
      '    <div class="nz-section-hdr-left">',
      '      <div class="nz-section-icon" style="background:' + iconBg + '">' + icon + '</div>',
      '      <div>',
      '        <div class="nz-section-title">' + title + '</div>',
      meta ? '        <div class="nz-section-meta">' + meta + '</div>' : '',
      '      </div>',
      '    </div>',
      collapseBtn,
      '  </div>',
      '  <div class="nz-section-body">',
      bodyHtml,
      '  </div>',
      '</div>'
    ].join('\n');
  }

  NS.App = {
    init: function (container, data, ctx) {
      var co = NS.components;

      var siteName = (ctx && ctx.siteName) ? ctx.siteName : 'Demo Site';
      var dateStr = '';
      if (ctx && ctx.datesStart && ctx.datesEnd) dateStr = ctx.datesStart + '\u2009\u2013\u2009' + ctx.datesEnd;
      else if (ctx && ctx.datesStart) dateStr = ctx.datesStart;

      // Merged Performance Overview body: KPIs + divider + Equiv
      var overviewBody = [
        co.KpiStrip.render(data),
        '<hr class="nz-section-divider">',
        '<div style="margin-top:4px">',
        '  <div class="nz-detail-label">Environmental Equivalency</div>',
        co.EquivStrip.render(data),
        '</div>'
      ].join('\n');

      container.innerHTML = [
        // Title bar
        '<div class="nz-title-bar">',
        '  <div class="nz-title-site" id="nzTitleSite">' + siteName + '</div>',
        dateStr ? '  <div class="nz-title-dates">' + dateStr + '</div>' : '',
        '</div>',

        // Page content
        '<div class="nz-page">',

        // Page title
        '<div class="nz-page-titlebar">',
        '  <div>',
        '    <div class="nz-page-title">Building Energy \u2014 Actual vs. Modeled</div>',
        '    <div class="nz-page-subtitle">Year-to-date performance \u00b7 consumption vs. generation</div>',
        '  </div>',
        '</div>',

        // Performance Overview (merged KPIs + Equiv) — collapsible, default open
        section(ICONS.kpi, 'var(--nz-blue)', 'Performance Overview',
          'YTD key metrics \u00b7 environmental equivalents <span class="nz-status-badge nz-status-badge--wip">In Progress</span>',
          overviewBody,
          { collapsible: true, open: true, accentColor: '#4A6FA5' }),

        // Monthly Trends (charts + detail tables) — collapsible, default open
        section(ICONS.chart, 'var(--nz-bar-ink)', 'Monthly Trends',
          '',
          co.Charts.render(data),
          { collapsible: true, open: true, accentColor: '#2e3a4e' }),

        // Meter breakdown — collapsible, default collapsed
        section(ICONS.meter, 'var(--nz-amber)', 'Meter Breakdown',
          'Individual meter readings \u00b7 12-month view <span class="nz-status-badge nz-status-badge--demo">Demo</span>',
          co.MeterBreakdown.render(data),
          { collapsible: true, open: false, accentColor: '#D97706' }),

        // Footer
        co.Footer.render(),

        '</div>'
      ].join('\n');

      // Initialize Chart.js charts after DOM
      co.KpiStrip.initDonut(container, data);
      co.Charts.initCharts(container, data);
    }
  };

})(window.netzeroDashboard);
