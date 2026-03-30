// components/Header.js
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.Header = {
  render: function (data) {
    var siteOpts = data.meta.sites.map(function (s) { return '<option>' + s + '</option>'; }).join('');
    return [
      '<header class="nz-page-header">',
      '  <h1 class="nz-page-title" id="nzTitleSite">Building Energy<br><em>Actual vs. Modeled</em></h1>',
      '  <div class="nz-page-meta">',
      '    <select class="nz-meta-item">' + siteOpts + '</select>',
      '    <span class="nz-meta-item">' + data.meta.dateRange + '</span>',
      '    <span class="nz-meta-item">' + data.meta.units + '</span>',
      '  </div>',
      '</header>'
    ].join('\n');
  }
};
