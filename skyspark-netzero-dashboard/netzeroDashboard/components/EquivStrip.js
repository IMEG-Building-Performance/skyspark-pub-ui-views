// components/EquivStrip.js
// Carbon equivalencies calculated from solar generation kWh
// using EPA Greenhouse Gas Equivalencies Calculator factors.
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.EquivStrip = {

  _fmt: function (n) {
    if (n === null || n === undefined) return '\u2014';
    return Math.round(n).toLocaleString('en-US');
  },

  _fmtDec: function (n, d) {
    if (n === null || n === undefined) return '\u2014';
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  },

  _cell: function (icon, label, value, unit) {
    return [
      '<div class="nz-equiv-cell">',
      '  <div class="nz-equiv-icon">' + icon + '</div>',
      '  <div>',
      '    <div class="nz-equiv-label">' + label + '</div>',
      '    <div class="nz-equiv-primary">' + value + '</div>',
      '    <div class="nz-equiv-secondary">' + unit + '</div>',
      '  </div>',
      '</div>'
    ].join('\n');
  },

  render: function (data) {
    var e = data.equiv;
    var fmt = this._fmt;
    var fmtDec = this._fmtDec;
    var cell = this._cell;
    return [
      '<div class="nz-equiv-strip">',
      cell('\uD83C\uDF3F', 'CO\u2082 Avoided',   fmtDec(e.co2AvoidedMT, 1), 'metric tons'),
      cell('\uD83C\uDF33', 'Trees Equivalent',    fmt(e.trees),              'seedlings grown 10 yrs'),
      cell('\u26FD',       'Gasoline Saved',       fmt(e.gasolineGallons),    'gallons'),
      cell('\uD83C\uDFE0', 'Homes Powered',       fmtDec(e.homesPowered, 1), 'homes for 1 year'),
      cell('\uD83D\uDE97', 'Driving Offset',       fmt(e.milesDriven),        'miles'),
      '</div>'
    ].join('\n');
  }
};
