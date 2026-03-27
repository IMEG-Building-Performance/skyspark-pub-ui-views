// components/TerminalUnits.js — VAV Terminal Units section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.TerminalUnits = {
  _todo: function (label) {
    return [
      '<div class="todo-placeholder">',
      '  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
      '    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>',
      '  </svg>',
      '  <div class="todo-label">TO DO</div>',
      '  <div class="todo-sub">' + label + '</div>',
      '</div>'
    ].join('\n');
  },

  render: function (d) {
    var tu = d.terminalUnits;
    return [
      '<div class="equip-section">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--orange-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Terminal Units</div><div class="equip-meta">' + tu.totalVavs + ' VAVs &nbsp;&middot;&nbsp; Compliance &middot; Operation &middot; Energy &middot; Comfort</div></div>',
      '    </div>',
      '  </div>',
      this._todo('Compliance coverage, fault counts, reheat energy, zone comfort'),
      '</div>'
    ].join('\n');
  }
};
