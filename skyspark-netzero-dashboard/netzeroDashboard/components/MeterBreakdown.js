// components/MeterBreakdown.js
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.MeterBreakdown = {

  _fmt: function (n) {
    if (n === null || n === undefined) return '\u2014';
    var s = Math.abs(Math.round(n)).toLocaleString('en-US');
    return n < 0 ? '\u2212' + s : s;
  },

  render: function (data) {
    var mb = data.meterBreakdown;
    var self = this;
    var months = mb.months;
    var rows = mb.rows || [];

    if (rows.length === 0) return '';

    var thead = '<thead><tr><th></th>' +
      months.map(function (m) { return '<th>' + m + '</th>'; }).join('') +
      '</tr></thead>';

    var tbody = rows.map(function (item) {
      var cells = item.values.map(function (v) { return '<td>' + self._fmt(v) + '</td>'; }).join('');
      return '<tr><td>' + item.name + '</td>' + cells + '</tr>';
    }).join('');

    return [
      '<div class="nz-section-rule">Meter breakdown (kWh)</div>',
      '<table class="nz-meter-table">',
      '<col class="nz-col-label">',
      thead,
      '<tbody>' + tbody + '</tbody>',
      '</table>'
    ].join('\n');
  }
};
