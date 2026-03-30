// components/Footer.js
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.Footer = {
  render: function () {
    return [
      '<footer class="nz-page-footer">',
      '  <div class="nz-footer-links">',
      '    <a href="#">Building Analytics</a>',
      '    <a href="#">Energy Report</a>',
      '    <a href="#">Data Quality</a>',
      '  </div>',
      '  <span class="nz-footer-ts">YTD 2026</span>',
      '</footer>'
    ].join('\n');
  }
};
