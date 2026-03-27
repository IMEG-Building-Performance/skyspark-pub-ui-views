// components/BuildingMeters.js
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.BuildingMeters = {
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
    return [
      '<div class="equip-section">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--imeg-blue-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Building Meters</div><div class="equip-meta">Site EUI &amp; normalized energy use</div></div>',
      '    </div>',
      '  </div>',
      this._todo('Site EUI, normalized usage chart, Energy Star score'),
      '</div>'
    ].join('\n');
  }
};
