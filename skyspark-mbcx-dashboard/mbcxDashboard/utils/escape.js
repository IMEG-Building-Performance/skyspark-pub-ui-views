// utils/escape.js
// Shared HTML escaping helpers for string-template render paths.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.utils = window.mbcxDashboard.utils || {};

(function (UTILS) {
  UTILS.escapeHtml = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  UTILS.escapeAttr = UTILS.escapeHtml;
})(window.mbcxDashboard.utils);
