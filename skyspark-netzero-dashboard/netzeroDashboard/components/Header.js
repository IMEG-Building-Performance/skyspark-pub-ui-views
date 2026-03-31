// components/Header.js
window.netzeroDashboard = window.netzeroDashboard || {};
window.netzeroDashboard.components = window.netzeroDashboard.components || {};

window.netzeroDashboard.components.Header = {
  renderMeta: function (data) {
    var siteOpts = data.meta.sites.map(function (s) { return '<option>' + s + '</option>'; }).join('');
    return [
      '<select class="nz-meta-item">' + siteOpts + '</select>',
      '<span class="nz-meta-item">' + data.meta.dateRange + '</span>',
      '<span class="nz-meta-item">' + data.meta.units + '</span>'
    ].join('');
  }
};
