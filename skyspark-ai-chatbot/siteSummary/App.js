// App.js
// Main UI component — site summary + equipment analysis panels.
window.siteSummary = window.siteSummary || {};

(function (NS) {
  NS.App = {};

  // ── Init ─────────────────────────────────────────────────────────────────

  NS.App.init = function (container, attestKey, projectName) {
    NS.App._attestKey    = attestKey;
    NS.App._projectName  = projectName;
    NS.App._siteGenCtr   = 0;
    NS.App._equipGenCtr  = 0;

    container.innerHTML = [
      '<div class="ss-wrap">',

      // ── Header ──
      '  <div class="ss-header">',
      '    <h1 class="ss-title">Site AI Analysis</h1>',
      '    <p class="ss-subtitle">AI-generated insights for facilities management</p>',
      '  </div>',

      // ── Site Summary section ──
      '  <div class="ss-section-label">Site Summary</div>',
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

      // ── Equipment Analysis section ──
      '  <div class="ss-section-label ss-section-label--gap">Equipment Analysis</div>',
      '  <div class="ss-card ss-controls">',
      '    <label class="ss-label" for="ss-equip-select">Select AHU / RTU</label>',
      '    <div class="ss-select-row">',
      '      <select id="ss-equip-select" class="ss-select" disabled>',
      '        <option value="">Select a site first</option>',
      '      </select>',
      '      <button id="ss-equip-btn" class="ss-btn" disabled>Analyze Equipment</button>',
      '    </div>',
      '  </div>',
      '  <div id="ss-equip-result-panel" class="ss-card ss-result-panel ss-hidden">',
      '    <div id="ss-equip-loading" class="ss-loading ss-hidden">',
      '      <div class="ss-spinner"></div>',
      '      <span class="ss-loading-text">Analyzing equipment\u2026</span>',
      '    </div>',
      '    <div id="ss-equip-content" class="ss-hidden">',
      '      <div class="ss-result-header">',
      '        <span class="ss-result-label">AI ANALYSIS</span>',
      '        <span id="ss-equip-name" class="ss-site-name"></span>',
      '      </div>',
      '      <p id="ss-equip-text" class="ss-summary-text"></p>',
      '    </div>',
      '    <div id="ss-equip-error" class="ss-error ss-hidden">',
      '      <span class="ss-error-icon">&#9888;</span>',
      '      <span id="ss-equip-error-msg"></span>',
      '    </div>',
      '  </div>',

      '</div>'
    ].join('\n');

    // ── Cache DOM refs ──
    NS.App._siteSelect      = container.querySelector('#ss-site-select');
    NS.App._generateBtn     = container.querySelector('#ss-generate-btn');
    NS.App._resultPanel     = container.querySelector('#ss-result-panel');
    NS.App._loading         = container.querySelector('#ss-loading');
    NS.App._summaryContent  = container.querySelector('#ss-summary-content');
    NS.App._summaryText     = container.querySelector('#ss-summary-text');
    NS.App._siteName        = container.querySelector('#ss-site-name');
    NS.App._siteError       = container.querySelector('#ss-error');
    NS.App._siteErrorMsg    = container.querySelector('#ss-error-msg');

    NS.App._equipSelect     = container.querySelector('#ss-equip-select');
    NS.App._equipBtn        = container.querySelector('#ss-equip-btn');
    NS.App._equipResultPanel= container.querySelector('#ss-equip-result-panel');
    NS.App._equipLoading    = container.querySelector('#ss-equip-loading');
    NS.App._equipContent    = container.querySelector('#ss-equip-content');
    NS.App._equipText       = container.querySelector('#ss-equip-text');
    NS.App._equipName       = container.querySelector('#ss-equip-name');
    NS.App._equipError      = container.querySelector('#ss-equip-error');
    NS.App._equipErrorMsg   = container.querySelector('#ss-equip-error-msg');

    // ── Events ──
    NS.App._generateBtn.addEventListener('click', NS.App._onGenerate);
    NS.App._equipBtn.addEventListener('click', NS.App._onAnalyzeEquip);

    NS.App._siteSelect.addEventListener('change', function () {
      NS.App._clearSiteResult();
      NS.App._clearEquipResult();
      var siteId = NS.App._siteSelect.value;
      if (siteId) {
        NS.App._loadEquipForSite(siteId);
      } else {
        NS.App._resetEquipSelect();
      }
    });

    NS.App._equipSelect.addEventListener('change', function () {
      NS.App._clearEquipResult();
    });
  };

  // ── Site populate ─────────────────────────────────────────────────────────

  NS.App.populateSites = function (sites) {
    var sel = NS.App._siteSelect;
    sel.innerHTML = '';
    if (!sites || sites.length === 0) {
      sel.appendChild(_opt('', 'No sites found'));
      return;
    }
    sel.appendChild(_opt('', '\u2014 Choose a site \u2014'));
    sites.forEach(function (s) {
      var o = _opt(s.id, s.dis);
      sel.appendChild(o);
    });
    sel.disabled = false;
    NS.App._generateBtn.disabled = false;
  };

  NS.App.showLoadError = function (msg) {
    NS.App._siteSelect.innerHTML = '';
    NS.App._siteSelect.appendChild(_opt('', 'Failed to load sites'));
    NS.App._showSiteError('Could not load site list: ' + msg);
    NS.App._resultPanel.classList.remove('ss-hidden');
  };

  // ── Equipment populate ────────────────────────────────────────────────────

  NS.App.populateEquip = function (equipList) {
    var sel = NS.App._equipSelect;
    sel.innerHTML = '';
    if (!equipList || equipList.length === 0) {
      sel.appendChild(_opt('', 'No AHU/RTU found'));
      sel.disabled = true;
      NS.App._equipBtn.disabled = true;
      return;
    }
    sel.appendChild(_opt('', '\u2014 Choose equipment \u2014'));
    equipList.forEach(function (e) {
      sel.appendChild(_opt(e.id, e.navName));
    });
    sel.disabled = false;
    NS.App._equipBtn.disabled = false;
  };

  // ── Private: equip loading ────────────────────────────────────────────────

  NS.App._loadEquipForSite = function (siteId) {
    NS.App._equipSelect.disabled = true;
    NS.App._equipSelect.innerHTML = '';
    NS.App._equipSelect.appendChild(_opt('', 'Loading equipment\u2026'));
    NS.App._equipBtn.disabled = true;

    NS.evals.loadEquip(siteId, NS.App._attestKey, NS.App._projectName)
      .then(function (equipList) {
        NS.App.populateEquip(equipList);
      })
      .catch(function (err) {
        NS.App._equipSelect.innerHTML = '';
        NS.App._equipSelect.appendChild(_opt('', 'Failed to load equipment'));
        console.error('[siteSummary] loadEquip error:', err);
      });
  };

  NS.App._resetEquipSelect = function () {
    NS.App._equipSelect.innerHTML = '';
    NS.App._equipSelect.appendChild(_opt('', 'Select a site first'));
    NS.App._equipSelect.disabled = true;
    NS.App._equipBtn.disabled = true;
  };

  // ── Private: site summary handlers ───────────────────────────────────────

  NS.App._clearSiteResult = function () {
    NS.App._resultPanel.classList.add('ss-hidden');
    NS.App._loading.classList.add('ss-hidden');
    NS.App._summaryContent.classList.add('ss-hidden');
    NS.App._siteError.classList.add('ss-hidden');
  };

  NS.App._setSiteLoading = function (on) {
    NS.App._resultPanel.classList.remove('ss-hidden');
    if (on) {
      NS.App._loading.classList.remove('ss-hidden');
      NS.App._summaryContent.classList.add('ss-hidden');
      NS.App._siteError.classList.add('ss-hidden');
      NS.App._generateBtn.disabled = true;
      NS.App._siteSelect.disabled = true;
    } else {
      NS.App._loading.classList.add('ss-hidden');
      NS.App._generateBtn.disabled = false;
      NS.App._siteSelect.disabled = false;
    }
  };

  NS.App._showSiteError = function (msg) {
    NS.App._siteError.classList.remove('ss-hidden');
    NS.App._siteErrorMsg.textContent = msg;
  };

  NS.App._onGenerate = function () {
    var siteId = NS.App._siteSelect.value;
    if (!siteId) return;
    var siteDis = NS.App._siteSelect.options[NS.App._siteSelect.selectedIndex].text;
    var gen = ++NS.App._siteGenCtr;

    NS.App._setSiteLoading(true);

    NS.api.evalAxon('siteSummary(@' + siteId + ')', NS.App._attestKey, NS.App._projectName)
      .then(function (data) {
        if (gen !== NS.App._siteGenCtr) return;
        var rows = data && data.rows;
        var raw  = rows && rows.length > 0 ? rows[0].val : null;
        var text = (raw !== null && typeof raw === 'object') ? NS.api.extractValue(raw) : raw;
        if (typeof text !== 'string' || !text.trim()) {
          throw new Error('siteSummary() returned an empty value.');
        }
        NS.App._setSiteLoading(false);
        NS.App._summaryContent.classList.remove('ss-hidden');
        NS.App._summaryText.textContent = text;
        NS.App._siteName.textContent = siteDis;
      })
      .catch(function (err) {
        if (gen !== NS.App._siteGenCtr) return;
        NS.App._setSiteLoading(false);
        NS.App._showSiteError(err.message || 'An unexpected error occurred.');
      });
  };

  // ── Private: equipment analysis handlers ─────────────────────────────────

  NS.App._clearEquipResult = function () {
    NS.App._equipResultPanel.classList.add('ss-hidden');
    NS.App._equipLoading.classList.add('ss-hidden');
    NS.App._equipContent.classList.add('ss-hidden');
    NS.App._equipError.classList.add('ss-hidden');
  };

  NS.App._setEquipLoading = function (on) {
    NS.App._equipResultPanel.classList.remove('ss-hidden');
    if (on) {
      NS.App._equipLoading.classList.remove('ss-hidden');
      NS.App._equipContent.classList.add('ss-hidden');
      NS.App._equipError.classList.add('ss-hidden');
      NS.App._equipBtn.disabled = true;
      NS.App._equipSelect.disabled = true;
    } else {
      NS.App._equipLoading.classList.add('ss-hidden');
      NS.App._equipBtn.disabled = false;
      NS.App._equipSelect.disabled = false;
    }
  };

  NS.App._onAnalyzeEquip = function () {
    var equipId = NS.App._equipSelect.value;
    if (!equipId) return;
    var equipDis = NS.App._equipSelect.options[NS.App._equipSelect.selectedIndex].text;
    var gen = ++NS.App._equipGenCtr;

    NS.App._setEquipLoading(true);

    NS.evals.analyzeEquip(equipId, NS.App._attestKey, NS.App._projectName)
      .then(function (text) {
        if (gen !== NS.App._equipGenCtr) return;
        NS.App._setEquipLoading(false);
        NS.App._equipContent.classList.remove('ss-hidden');
        NS.App._equipText.textContent = text;
        NS.App._equipName.textContent = equipDis;
      })
      .catch(function (err) {
        if (gen !== NS.App._equipGenCtr) return;
        NS.App._setEquipLoading(false);
        NS.App._equipError.classList.remove('ss-hidden');
        NS.App._equipErrorMsg.textContent = err.message || 'An unexpected error occurred.';
      });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _opt(value, label) {
    var o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }

})(window.siteSummary);
