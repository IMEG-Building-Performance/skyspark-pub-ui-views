// components/Header.js
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

window.mbcxDashboard.components.Header = {
  render: function (data) {
    var siteOpts = data.meta.sites.map(function (s) { return '<option>' + s + '</option>'; }).join('');
    var periodOpts = data.meta.periods.map(function (p) { return '<option>' + p + '</option>'; }).join('');
    return [
      '<header>',
      '  <div class="logo-group">',
      '    <a class="logo-link" href="https://imegcorp.com" target="_blank" rel="noopener" aria-label="IMEG">',
      '      <svg width="128" height="40" viewBox="0 0 256 80" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '        <polygon points="38,4 58,24 38,44 18,24" fill="#4A6FA5"/>',
      '        <polygon points="58,24 78,44 58,64 38,44" fill="#4A6FA5"/>',
      '        <polygon points="18,24 38,44 18,64 -2,44" fill="#9B2335"/>',
      '        <polygon points="38,44 58,64 38,84 18,64" fill="#4A6FA5"/>',
      '        <polygon points="38,4 78,44 38,84 -2,44" fill="none" stroke="#fff" stroke-width="1.2"/>',
      '        <line x1="38" y1="4" x2="38" y2="84" stroke="#fff" stroke-width="1"/>',
      '        <line x1="-2" y1="44" x2="78" y2="44" stroke="#fff" stroke-width="1"/>',
      '        <polygon points="32,38 38,32 44,38 38,44" fill="#5C8A3C"/>',
      '        <text x="90" y="57" font-family="\'Arial Black\',Arial,sans-serif" font-size="46" font-weight="900" fill="#4A6FA5">IMEG</text>',
      '      </svg>',
      '    </a>',
      '    <div class="logo-divider"></div>',
      '    <a class="logo-link" href="https://skyfoundry.com" target="_blank" rel="noopener" aria-label="SkySpark">',
      '      <svg width="155" height="40" viewBox="0 0 310 80" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '        <defs><radialGradient id="mbcxRBg" cx="45%" cy="38%" r="58%"><stop offset="0%" stop-color="#7B6FC0"/><stop offset="55%" stop-color="#3D4E8A"/><stop offset="100%" stop-color="#1C2558"/></radialGradient></defs>',
      '        <circle cx="40" cy="40" r="37" fill="#DEDEDE"/>',
      '        <circle cx="40" cy="40" r="33" fill="url(#mbcxRBg)"/>',
      '        <circle cx="40" cy="40" r="25" fill="none" stroke="#8898C8" stroke-width="0.7" opacity="0.5"/>',
      '        <circle cx="40" cy="40" r="16" fill="none" stroke="#8898C8" stroke-width="0.7" opacity="0.5"/>',
      '        <line x1="40" y1="10" x2="40" y2="70" stroke="#8898C8" stroke-width="0.7" opacity="0.4"/>',
      '        <line x1="10" y1="40" x2="70" y2="40" stroke="#8898C8" stroke-width="0.7" opacity="0.4"/>',
      '        <line x1="40" y1="40" x2="64" y2="20" stroke="#B0C8E0" stroke-width="1.4" opacity="0.8"/>',
      '        <circle cx="55" cy="27" r="2.2" fill="#B8D4EE" opacity="0.95"/>',
      '        <text x="88" y="54" font-family="Arial,Helvetica,sans-serif" font-size="38" font-weight="700" fill="#5B7FA6" letter-spacing="-0.5">SkySpark</text>',
      '        <text x="279" y="26" font-family="Arial,sans-serif" font-size="15" fill="#5B7FA6">&#174;</text>',
      '      </svg>',
      '    </a>',
      '  </div>',
      '  <div class="header-right">',
      '    <select class="hs">' + siteOpts + '</select>',
      '    <select class="hs">' + periodOpts + '</select>',
      '    <div class="header-meta" id="mbcxTimestamp"></div>',
      '  </div>',
      '</header>'
    ].join('\n');
  },

  initTimestamp: function () {
    var el = document.getElementById('mbcxTimestamp');
    if (!el) return;
    el.textContent = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
};
