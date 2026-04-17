// App.js
// Main UI component for the Site Summary pUb view.
// Renders the site selector, generate button, loading state, and summary panel.
window.siteSummary = window.siteSummary || {};

(function (NS) {
  NS.App = {};

  // ── Public API ────────────────────────────────────────────────────────────

  NS.App.init = function (container, attestKey, projectName) {
    NS.App._attestKey = attestKey;
    NS.App._projectName = projectName;
    NS.App._genCounter = 0;

    container.innerHTML = [
      '<div class="ss-wrap">',

      '  <div class="ss-header">',
      '    <h1 class="ss-title">Site Summary</h1>',
      '    <p class="ss-subtitle">AI-generated overview of site conditions and performance</p>',
      '  </div>',

      '  <div class="ss-card ss-controls">',
      '    <label class="ss-label" for="ss-site-select">Select Site</label>',
      '    <div class="ss-select-row">',
      '      <select id="ss-site-select" class="ss-select" disabled>',
      '        <option value="">Loading sites\u2026</option>',
      '      </select>',
      '      <button id="ss-generate-btn" class="ss-btn" disabled>Generate Summary</button>',
      '    </div>',
      '  </div>',

      '  <div id="ss-result-panel" class="ss-card ss-result-panel ss-hidden">',

      '    <div id="ss-loading" class="ss-loading ss-hidden">',
      '      <div class="ss-spinner"></div>',
      '      <span class="ss-loading-text">Generating summary\u2026</span>',
      '    </div>',

      '    <div id="ss-summary-content" class="ss-hidden">',
      '      <div class="ss-result-header">',
      '        <span class="ss-result-label">AI SUMMARY</span>',
      '        <span id="ss-site-name" class="ss-site-name"></span>',
      '      </div>',
      '      <p id="ss-summary-text" class="ss-summary-text"></p>',
      '    </div>',

      '    <div id="ss-error" class="ss-error ss-hidden">',
      '      <span class="ss-error-icon">&#9888;</span>',
      '      <span id="ss-error-msg"></span>',
      '    </div>',

      '  </div>',
      '</div>'
    ].join('\n');

    NS.App._select = container.querySelector('#ss-site-select');
    NS.App._btn = container.querySelector('#ss-generate-btn');
    NS.App._resultPanel = container.querySelector('#ss-result-panel');
    NS.App._loading = container.querySelector('#ss-loading');
    NS.App._summaryContent = container.querySelector('#ss-summary-content');
    NS.App._summaryText = container.querySelector('#ss-summary-text');
    NS.App._siteName = container.querySelector('#ss-site-name');
    NS.App._error = container.querySelector('#ss-error');
    NS.App._errorMsg = container.querySelector('#ss-error-msg');

    NS.App._btn.addEventListener('click', NS.App._onGenerate);
    NS.App._select.addEventListener('change', NS.App._clearResult);
  };

  NS.App.populateSites = function (sites) {
    var select = NS.App._select;
    select.innerHTML = '';

    if (!sites || sites.length === 0) {
      var none = document.createElement('option');
      none.value = '';
      none.textContent = 'No sites found';
      select.appendChild(none);
      return;
    }

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '\u2014 Choose a site \u2014';
    select.appendChild(placeholder);

    sites.forEach(function (site) {
      var opt = document.createElement('option');
      opt.value = site.id;
      opt.dataset.dis = site.dis;
      opt.textContent = site.dis;
      select.appendChild(opt);
    });

    select.disabled = false;
    NS.App._btn.disabled = false;
  };

  NS.App.showLoadError = function (msg) {
    var select = NS.App._select;
    select.innerHTML = '';
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Failed to load sites';
    select.appendChild(opt);
    NS.App._showError('Could not load site list: ' + msg);
    NS.App._resultPanel.classList.remove('ss-hidden');
  };

  // ── Private helpers ───────────────────────────────────────────────────────

  NS.App._clearResult = function () {
    NS.App._resultPanel.classList.add('ss-hidden');
    NS.App._loading.classList.add('ss-hidden');
    NS.App._summaryContent.classList.add('ss-hidden');
    NS.App._error.classList.add('ss-hidden');
  };

  NS.App._setLoading = function (on) {
    NS.App._resultPanel.classList.remove('ss-hidden');
    if (on) {
      NS.App._loading.classList.remove('ss-hidden');
      NS.App._summaryContent.classList.add('ss-hidden');
      NS.App._error.classList.add('ss-hidden');
      NS.App._btn.disabled = true;
      NS.App._select.disabled = true;
    } else {
      NS.App._loading.classList.add('ss-hidden');
      NS.App._btn.disabled = false;
      NS.App._select.disabled = false;
    }
  };

  NS.App._showSummary = function (text, siteDis) {
    NS.App._summaryContent.classList.remove('ss-hidden');
    NS.App._summaryText.textContent = text;
    NS.App._siteName.textContent = siteDis;
  };

  NS.App._showError = function (msg) {
    NS.App._error.classList.remove('ss-hidden');
    NS.App._errorMsg.textContent = msg;
  };

  NS.App._onGenerate = function () {
    var select = NS.App._select;
    var siteId = select.value;
    if (!siteId) return;

    var siteDis = select.options[select.selectedIndex].dataset.dis || siteId;
    var gen = ++NS.App._genCounter;

    NS.App._setLoading(true);

    NS.api.evalAxon(
      'siteSummary(@' + siteId + ')',
      NS.App._attestKey,
      NS.App._projectName
    )
    .then(function (data) {
      if (gen !== NS.App._genCounter) return; // discard stale response
      var rows = data && data.rows;
      var raw = rows && rows.length > 0 ? rows[0].val : null;
      var text = (raw !== null && typeof raw === 'object') ? NS.api.extractValue(raw) : raw;
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error('siteSummary() returned an empty or unexpected value.');
      }
      NS.App._setLoading(false);
      NS.App._showSummary(text, siteDis);
    })
    .catch(function (err) {
      if (gen !== NS.App._genCounter) return;
      NS.App._setLoading(false);
      NS.App._showError(err.message || 'An unexpected error occurred.');
    });
  };

})(window.siteSummary);
