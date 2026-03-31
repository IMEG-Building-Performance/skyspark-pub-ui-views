// components/MeterBreakdown.js
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.MeterBreakdown = {

  _fmt: function (n) {
    if (n === null || n === undefined) return '\u2014';
    var s = Math.abs(n).toLocaleString('en-US');
    return n < 0 ? '\u2212' + s : s;
  },

  _row: function (item, cls) {
    var self = this;
    cls = cls || '';
    var cells = item.values.map(function (v) { return '<td>' + self._fmt(v) + '</td>'; }).join('');
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' +
      '<td>' + item.name + '</td>' +
      cells +
      '<td class="nz-col-total">' + self._fmt(item.total) + '</td>' +
      '</tr>';
  },

  _netRow: function (item) {
    var self = this;
    var cells = item.values.map(function (v) {
      var cls = v < 0 ? 'nz-heat-neg' : (v > 0 ? 'nz-heat-pos' : '');
      return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + self._fmt(v) + '</td>';
    }).join('');
    var totalCls = item.total < 0 ? 'nz-col-total nz-heat-neg' : 'nz-col-total nz-heat-pos';
    return '<tr class="nz-net-row">' +
      '<td>' + item.name + '</td>' +
      cells +
      '<td class="' + totalCls + '">' + self._fmt(item.total) + '</td>' +
      '</tr>';
  },

  render: function (data) {
    var mb = data.meterBreakdown;
    var self = this;

    // Column definitions
    var colgroup = [
      '<colgroup>',
      '<col class="nz-col-label">'
    ];
    for (var i = 0; i < 12; i++) colgroup.push('<col class="nz-col-month">');
    colgroup.push('<col class="nz-col-total">');
    colgroup.push('</colgroup>');

    // Header
    var months = mb.months;
    var thead = '<thead><tr><th>Meter type</th>' +
      months.map(function (m) { return '<th>' + m + '</th>'; }).join('') +
      '<th class="nz-col-total">Total</th></tr></thead>';

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
      colgroup.join(''),
      thead,
      '<tbody>',
      consumptionRows,
      consumptionSubtotal,
      '<tr class="nz-spacer"><td colspan="14"></td></tr>',
      generationRows,
      generationSubtotal,
      netRow,
      '</tbody>',
      '</table>',
      '</div>'
    ].join('\n');
  }
};
