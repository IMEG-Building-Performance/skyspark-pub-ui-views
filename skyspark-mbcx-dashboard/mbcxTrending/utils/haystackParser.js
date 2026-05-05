// utils/haystackParser.js
// Utilities for parsing Haystack 3.0 JSON grid responses.
window.mbcxTrending = window.mbcxTrending || {};
window.mbcxTrending.haystackParser = window.mbcxTrending.haystackParser || {};

(function (HP) {

  // Unwrap a single Haystack value to a plain JS value.
  HP.val = function (v) {
    if (v === null || v === undefined) return null;
    if (typeof v !== 'object') return v;
    switch (v._kind) {
      case 'Number':   return v.val;
      case 'Ref':      return { id: v.val, dis: v.dis || v.val };
      case 'Date':     return v.val;
      case 'DateTime': return v.val;
      case 'Str':      return v.val;
      case 'Marker':   return true;
      case 'NA':       return null;
      default:         return v.val !== undefined ? v.val : v;
    }
  };

  // Parse a Haystack JSON grid into { cols: [string], rows: [object] }
  // where each row is a plain object keyed by column name with unwrapped values.
  HP.parseGrid = function (grid) {
    if (!grid || !grid.cols) return { cols: [], rows: [] };
    var cols = grid.cols.map(function (c) { return c.name; });
    var rows = (grid.rows || []).map(function (row) {
      var obj = {};
      cols.forEach(function (col) { obj[col] = HP.val(row[col]); });
      return obj;
    });
    return { cols: cols, rows: rows };
  };

  // Return the display string for a column — uses meta.dis if present, else the name.
  HP.colDis = function (grid, colName) {
    if (!grid || !grid.cols) return colName;
    var col = grid.cols.filter(function (c) { return c.name === colName; })[0];
    return (col && col.meta && col.meta.dis) ? col.meta.dis : colName;
  };

})(window.mbcxTrending.haystackParser);
