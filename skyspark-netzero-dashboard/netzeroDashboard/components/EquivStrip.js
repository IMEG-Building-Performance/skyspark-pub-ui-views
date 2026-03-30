// components/EquivStrip.js
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.EquivStrip = {

  _fmt: function (n) {
    return n != null ? n.toLocaleString('en-US') : '\u2014';
  },

  _cell: function (icon, label, primary, secondary, sub) {
    return [
      '<div class="nz-equiv-cell">',
      '  <div class="nz-equiv-icon">' + icon + '</div>',
      '  <div>',
      '    <div class="nz-equiv-label">' + label + '</div>',
      '    <div class="nz-equiv-primary">' + primary + '</div>',
      '    <div class="nz-equiv-secondary">' + secondary + '</div>',
      '    <div class="nz-equiv-sub">' + sub + '</div>',
      '  </div>',
      '</div>'
    ].join('\n');
  },

  render: function (data) {
    var e = data.equiv;
    var fmt = this._fmt;
    var cell = this._cell;
    return [
      '<div class="nz-equiv-strip">',
      cell('\uD83C\uDF33', 'Trees',   fmt(e.trees.total),   e.trees.unit,   fmt(e.trees.monthly) + ' this month'),
      cell('\uD83D\uDCA7', 'Water',   fmt(e.water.total),   e.water.unit,   fmt(e.water.monthly) + ' this month'),
      cell('\u26FD',       'Gas',     fmt(e.gas.total),     e.gas.unit,     fmt(e.gas.monthly) + ' this month'),
      cell('\uD83D\uDC04', 'Methane', fmt(e.methane.total), e.methane.unit, fmt(e.methane.monthly) + ' this month'),
      '</div>'
    ].join('\n');
  }
};
