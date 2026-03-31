// components/DetailTables.js
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.DetailTables = {

  _fmt: function (n) {
    if (n === null || n === undefined) return '\u2014';
    var s = Math.abs(Math.round(n)).toLocaleString('en-US');
    return n < 0 ? '\u2212' + s : (n > 0 ? '+' + s : s);
  },

  _fmtAbs: function (n) {
    if (n === null || n === undefined) return '\u2014';
    return Math.round(Math.abs(n)).toLocaleString('en-US');
  },

  _diffCls: function (n) {
    if (n > 0) return 'nz-pos';
    if (n < 0) return 'nz-neg';
    return '';
  },

  _thRow: function (months) {
    return '<thead><tr><th></th>' + months.map(function (m) { return '<th>' + m + '</th>'; }).join('') + '</tr></thead>';
  },

  _dataRow: function (dotCls, label, values, fmtFn) {
    var self = this;
    var cells = values.map(function (v) { return '<td>' + fmtFn.call(self, v) + '</td>'; }).join('');
    return '<tr><td><span class="nz-dot ' + dotCls + '"></span>' + label + '</td>' + cells + '</tr>';
  },

  _diffRow: function (label, values) {
    var self = this;
    var cells = values.map(function (v) {
      return '<td class="' + self._diffCls(v) + '">' + self._fmt(v) + '</td>';
    }).join('');
    return '<tr class="nz-diff-row"><td><span class="nz-dot nz-dot-d"></span>' + label + '</td>' + cells + '</tr>';
  },

  _table: function (name, months, rows) {
    return '<div><div class="nz-tbl-name">' + name + '</div><table>' +
      '<col class="nz-col-label">' +
      this._thRow(months) + '<tbody>' + rows.join('') + '</tbody></table></div>';
  },

  render: function (data) {
    var d = data.detail;
    var m = d.months;
    var fmtAbs = this._fmtAbs;

    return [
      '<div class="nz-tables-grid">',
      this._table('Building consumption', m, [
        this._dataRow('nz-dot-a', 'Actual', d.buildingConsumption.actual, fmtAbs),
        this._dataRow('nz-dot-m', 'Model',  d.buildingConsumption.model, fmtAbs),
        this._diffRow('Diff', d.buildingConsumption.diff)
      ]),
      this._table('Solar generation', m, [
        this._dataRow('nz-dot-a', 'Actual', d.solarGeneration.actual, fmtAbs),
        this._dataRow('nz-dot-m', 'Model',  d.solarGeneration.model, fmtAbs),
        this._diffRow('Diff', d.solarGeneration.diff)
      ]),
      this._table('Actual net zero', m, [
        this._dataRow('nz-dot-a', 'Building', d.actualNetZero.building, fmtAbs),
        this._dataRow('nz-dot-m', 'Solar',    d.actualNetZero.solar, fmtAbs),
        this._diffRow('Net', d.actualNetZero.net)
      ]),
      this._table('Modeled net zero', m, [
        this._dataRow('nz-dot-a', 'Building', d.modeledNetZero.building, fmtAbs),
        this._dataRow('nz-dot-m', 'Solar',    d.modeledNetZero.solar, fmtAbs),
        this._diffRow('Net', d.modeledNetZero.net)
      ]),
      '</div>'
    ].join('\n');
  }
};
