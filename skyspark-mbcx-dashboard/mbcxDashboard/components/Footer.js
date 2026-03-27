// components/Footer.js
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.Footer = {
  render: function () {
    var updated = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return [
      '<footer>',
      '  <div class="footer-links">',
      '    <a href="#">Building Analytics</a>',
      '    <a href="#">FDD Report</a>',
      '    <a href="#">AHU Detail</a>',
      '    <a href="#">VAV Detail</a>',
      '    <a href="#">CUP Detail</a>',
      '    <a href="#">Data Quality</a>',
      '  </div>',
      '  <span>Updated ' + updated + ' &nbsp;&middot;&nbsp; IMEG Corp &nbsp;&middot;&nbsp; Powered by SkySpark&reg;</span>',
      '</footer>'
    ].join('\n');
  }
};
