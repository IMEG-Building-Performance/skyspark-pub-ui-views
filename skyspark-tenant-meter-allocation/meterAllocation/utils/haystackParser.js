// utils/haystackParser.js
// Helpers for parsing Haystack 3.0 JSON grid cells (lowercase _kind form).
window.meterAllocation = window.meterAllocation || {};

(function (NS) {
  NS.haystackParser = {

    // Extract a Ref → { id, dis }
    ref: function (v) {
      if (!v || typeof v !== 'object') return null;
      var kind = (v._kind || '').toLowerCase();
      if (kind === 'ref') return { id: v.val || '', dis: (v.dis || v.val || '').trim() };
      return null;
    },

    // Extract a Number → { val, unit }
    num: function (v) {
      if (v === null || v === undefined) return { val: 0, unit: '' };
      if (typeof v === 'number') return { val: v, unit: '' };
      if (typeof v === 'object') {
        var kind = (v._kind || '').toLowerCase();
        if (kind === 'number') {
          return { val: typeof v.val === 'number' ? v.val : parseFloat(v.val) || 0, unit: v.unit || '' };
        }
      }
      return { val: parseFloat(v) || 0, unit: '' };
    },

    // Parse a raw Haystack grid into typed row objects using a field-extractor map.
    // extractors: { fieldName: fn(rawCell) -> value }
    parseRows: function (grid, extractors) {
      if (!grid || !grid.rows) return [];
      return (grid.rows || []).map(function (row) {
        var out = {};
        Object.keys(extractors).forEach(function (key) {
          out[key] = extractors[key](row[key]);
        });
        return out;
      });
    }
  };
})(window.meterAllocation);
