// components/MeterBreakdown.js
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.MeterBreakdown = {

  _fmt: function (n) {
    if (n === null || n === undefined) return '\u2014';
    var s = Math.abs(Math.round(n)).toLocaleString('en-US');
    return n < 0 ? '\u2212' + s : s;
  },

  _row: function (item, cls) {
    var self = this;
    cls = cls || '';
    var cells = item.values.map(function (v) { return '<td>' + self._fmt(v) + '</td>'; }).join('');
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' +
      '<td>' + item.name + '</td>' +
      cells +
      '</tr>';
  },

  _netRow: function (item) {
    var self = this;
    var cells = item.values.map(function (v) {
      var cls = v !== null && v < 0 ? 'nz-heat-neg' : (v !== null && v > 0 ? 'nz-heat-pos' : '');
      return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + self._fmt(v) + '</td>';
    }).join('');
    return '<tr class="nz-net-row">' +
      '<td>' + item.name + '</td>' +
      cells +
      '</tr>';
  },

  render: function (data) {
    var mb = data.meterBreakdown;
    var self = this;
    var months = mb.months;

    // Single col for label, rest auto-distribute
    var thead = '<thead><tr><th></th>' +
      months.map(function (m) { return '<th>' + m + '</th>'; }).join('') +
      '</tr></thead>';

    // Consumption rows
    var consumptionRows = mb.consumption.map(function (item) { return self._row(item); }).join('');
    var consumptionSubtotal = this._row(mb.consumptionTotal, 'nz-subtotal');

    // Generation rows
    var generationRows = mb.generation.map(function (item) { return self._row(item); }).join('');
    var generationSubtotal = this._row(mb.generationTotal, 'nz-subtotal');

    // Net row
    var netRow = this._netRow(mb.netPerformance);

    return [
      '<div class="nz-section-rule">Meter breakdown</div>',
      '<div class="nz-meter-scroll">',
      '<table class="nz-meter-table">',
      '<col class="nz-col-label">',
      thead,
      '<tbody>',
      consumptionRows,
      consumptionSubtotal,
      '<tr class="nz-spacer"><td colspan="13"></td></tr>',
      generationRows,
      generationSubtotal,
      netRow,
      '</tbody>',
      '</table>',
      '</div>'
    ].join('\n');
  }
};
