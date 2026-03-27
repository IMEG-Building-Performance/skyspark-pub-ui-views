// components/CUP.js — Central Utility Plant section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.CUP = {
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
      '      <div class="equip-icon" style="background:#EDE9FE;">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Central Utility Plant</div><div class="equip-meta">Chillers &middot; Heating &middot; Condenser &middot; Domestic Hot Water</div></div>',
      '    </div>',
      '  </div>',
      this._todo('Cooling, heating, condenser, and DHW KPIs &amp; trend charts'),
      '</div>'
    ].join('\n');
  }
};
