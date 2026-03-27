// components/AHU.js — Air Handling Units section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.AHU = {
  renderTable: function (container, metricKey, metrics) {
    // TODO: implement live table rendering
  },

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
    var ahu = d.ahu;
    return [
      '<div class="equip-section">',
      '  <div class="equip-header">',
      '    <div class="equip-header-left">',
      '      <div class="equip-icon" style="background:var(--imeg-green-lt);">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5C8A3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg>',
      '      </div>',
      '      <div><div class="equip-title">Air Handling Units</div><div class="equip-meta">' + ahu.unitCount + ' AHUs &nbsp;&middot;&nbsp; Fleet avg trends &amp; unit-level table</div></div>',
      '    </div>',
      '  </div>',
      this._todo('Fleet avg chart by metric (VFD, OAD, cooling/heating valve, humidifier) &amp; unit summary table'),
      '</div>'
    ].join('\n');
  }
};
