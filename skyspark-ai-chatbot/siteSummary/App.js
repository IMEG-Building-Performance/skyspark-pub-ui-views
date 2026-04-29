// App.js
// Main UI component — topbar site selector, equipment analysis with chart + AI panel.
window.siteSummary = window.siteSummary || {};

(function (NS) {
  NS.App = {};

  // ── Init ─────────────────────────────────────────────────────────────────

  NS.App.init = function (container, attestKey, projectName) {
    NS.App._attestKey    = attestKey;
    NS.App._projectName  = projectName;
    NS.App._siteGenCtr   = 0;
    NS.App._equipGenCtr  = 0;
    NS.App._chart        = null;

    container.innerHTML = [
      // ── Topbar ──
      '<div class="ss-topbar">',
      '  <span class="ss-topbar-logo">Site AI Analysis</span>',
      '  <div class="ss-topbar-site">',
      '    <select id="ss-site-select" class="ss-topbar-select" disabled>',
      '      <option value="">Loading sites\u2026</option>',
      '    </select>',
      '    <button id="ss-generate-btn" class="ss-topbar-btn" disabled>Summary</button>',
      '  </div>',
      '  <div class="ss-topbar-sep"></div>',
      '  <div id="ss-topbar-loader" class="ss-topbar-loader ss-hidden">',
      '    <div class="ss-topbar-spinner"></div>',
      '    <span class="ss-topbar-loader-text">Generating\u2026</span>',
      '  </div>',
      '  <div id="ss-topbar-summary" class="ss-topbar-summary ss-hidden">',
      '    <span class="ss-topbar-ai-label">AI</span>',
      '    <span id="ss-topbar-text" class="ss-topbar-text"></span>',
      '  </div>',
      '  <div id="ss-topbar-err" class="ss-topbar-err ss-hidden">',
      '    <span id="ss-topbar-err-msg"></span>',
      '  </div>',
      '</div>',

      // ── Main area ──
      '<div class="ss-main">',

      // Equipment bar
      '  <div class="ss-card ss-equip-bar">',
      '    <span class="ss-equip-bar-label">Equipment Analysis</span>',
      '    <div class="ss-equip-bar-controls">',
      '      <select id="ss-equip-select" class="ss-select" disabled>',
      '        <option value="">Select a site first</option>',
      '      </select>',
      '      <input type="date" id="ss-date-select" class="ss-date-input">',
      '      <button id="ss-equip-btn" class="ss-btn" disabled>Analyze Equipment</button>',
      '    </div>',
      '  </div>',

      // Analysis area (hidden until first analysis)
      '  <div id="ss-analysis-area" class="ss-hidden">',

      '    <div id="ss-equip-loading-card" class="ss-card ss-equip-loading-card ss-hidden">',
      '      <div class="ss-spinner"></div>',
      '      <span class="ss-loading-text">Analyzing equipment\u2026</span>',
      '    </div>',

      '    <div id="ss-analysis-grid" class="ss-analysis-grid ss-hidden">',

      // Chart panel
      '      <div class="ss-card">',
      '        <div class="ss-panel-header">',
      '          <span class="ss-panel-label">24-Hour Trend</span>',
      '          <span id="ss-chart-name" class="ss-panel-name"></span>',
      '        </div>',
      '        <div class="ss-chart-wrap">',
      '          <canvas id="ss-chart-canvas"></canvas>',
      '          <div id="ss-chart-empty" class="ss-chart-empty ss-hidden">No history data available</div>',
      '        </div>',
      '      </div>',

      // AI panel
      '      <div class="ss-card ss-ai-card">',
      '        <div class="ss-panel-header">',
      '          <span class="ss-panel-label">AI Analysis</span>',
      '          <span id="ss-equip-name" class="ss-panel-name"></span>',
      '        </div>',
      '        <div id="ss-equip-text" class="ss-summary-text"></div>',
      '        <div id="ss-equip-error" class="ss-error ss-hidden">',
      '          <span class="ss-error-icon">&#9888;</span>',
      '          <span id="ss-equip-error-msg"></span>',
      '        </div>',
      '      </div>',

      '    </div>',
      '  </div>',

      '</div>'
    ].join('\n');

    // ── Cache DOM refs: topbar ──
    NS.App._siteSelect     = container.querySelector('#ss-site-select');
    NS.App._generateBtn    = container.querySelector('#ss-generate-btn');
    NS.App._topbarLoader   = container.querySelector('#ss-topbar-loader');
    NS.App._topbarSummary  = container.querySelector('#ss-topbar-summary');
    NS.App._topbarText     = container.querySelector('#ss-topbar-text');
    NS.App._topbarErr      = container.querySelector('#ss-topbar-err');
    NS.App._topbarErrMsg   = container.querySelector('#ss-topbar-err-msg');

    // ── Cache DOM refs: equipment bar ──
    NS.App._equipSelect    = container.querySelector('#ss-equip-select');
    NS.App._equipBtn       = container.querySelector('#ss-equip-btn');
    NS.App._dateSelect     = container.querySelector('#ss-date-select');

    // Default date to today (local time)
    NS.App._dateSelect.value = _todayStr();

    // ── Cache DOM refs: analysis area ──
    NS.App._analysisArea        = container.querySelector('#ss-analysis-area');
    NS.App._equipLoadingCard    = container.querySelector('#ss-equip-loading-card');
    NS.App._analysisGrid        = container.querySelector('#ss-analysis-grid');
    NS.App._chartName           = container.querySelector('#ss-chart-name');
    NS.App._chartCanvas         = container.querySelector('#ss-chart-canvas');
    NS.App._chartEmpty          = container.querySelector('#ss-chart-empty');
    NS.App._equipName           = container.querySelector('#ss-equip-name');
    NS.App._equipText           = container.querySelector('#ss-equip-text');
    NS.App._equipError          = container.querySelector('#ss-equip-error');
    NS.App._equipErrorMsg       = container.querySelector('#ss-equip-error-msg');

    // ── Events ──
    NS.App._generateBtn.addEventListener('click', NS.App._onGenerate);
    NS.App._equipBtn.addEventListener('click', NS.App._onAnalyzeEquip);

    NS.App._siteSelect.addEventListener('change', function () {
      NS.App._clearTopbar();
      NS.App._clearAnalysis();
      var siteId = NS.App._siteSelect.value;
      if (siteId) {
        NS.App._loadEquipForSite(siteId);
      } else {
        NS.App._resetEquipSelect();
      }
    });

    NS.App._equipSelect.addEventListener('change', function () {
      NS.App._clearAnalysis();
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
      sel.appendChild(_opt(s.id, s.dis));
    });
    sel.disabled = false;
    NS.App._generateBtn.disabled = false;
  };

  NS.App.showLoadError = function (msg) {
    NS.App._siteSelect.innerHTML = '';
    NS.App._siteSelect.appendChild(_opt('', 'Failed to load sites'));
    NS.App._topbarErr.classList.remove('ss-hidden');
    NS.App._topbarErrMsg.textContent = 'Could not load sites: ' + msg;
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
      sel.appendChild(_opt(e.id, e.navName || e.dis));
    });
    sel.disabled = false;
    NS.App._equipBtn.disabled = false;
  };

  // ── Private: equipment loading ────────────────────────────────────────────

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

  // ── Private: topbar site summary ──────────────────────────────────────────

  NS.App._clearTopbar = function () {
    NS.App._topbarLoader.classList.add('ss-hidden');
    NS.App._topbarSummary.classList.add('ss-hidden');
    NS.App._topbarErr.classList.add('ss-hidden');
  };

  NS.App._onGenerate = function () {
    var siteId = NS.App._siteSelect.value;
    if (!siteId) return;
    var gen = ++NS.App._siteGenCtr;

    NS.App._clearTopbar();
    NS.App._topbarLoader.classList.remove('ss-hidden');
    NS.App._generateBtn.disabled = true;
    NS.App._siteSelect.disabled  = true;

    NS.api.evalAxon('siteSummary(@' + siteId + ')', NS.App._attestKey, NS.App._projectName)
      .then(function (data) {
        if (gen !== NS.App._siteGenCtr) return;
        var rows = data && data.rows;
        var raw  = rows && rows.length > 0 ? rows[0].val : null;
        var text = (raw !== null && typeof raw === 'object') ? NS.api.extractValue(raw) : raw;
        if (typeof text !== 'string' || !text.trim()) {
          throw new Error('siteSummary() returned an empty value.');
        }
        NS.App._topbarLoader.classList.add('ss-hidden');
        NS.App._generateBtn.disabled = false;
        NS.App._siteSelect.disabled  = false;
        NS.App._topbarText.textContent = text;
        NS.App._topbarText.title = text;
        NS.App._topbarSummary.classList.remove('ss-hidden');
      })
      .catch(function (err) {
        if (gen !== NS.App._siteGenCtr) return;
        NS.App._topbarLoader.classList.add('ss-hidden');
        NS.App._generateBtn.disabled = false;
        NS.App._siteSelect.disabled  = false;
        NS.App._topbarErrMsg.textContent = err.message || 'Error generating summary.';
        NS.App._topbarErr.classList.remove('ss-hidden');
      });
  };

  // ── Private: equipment analysis ───────────────────────────────────────────

  NS.App._clearAnalysis = function () {
    NS.App._analysisArea.classList.add('ss-hidden');
    NS.App._equipLoadingCard.classList.add('ss-hidden');
    NS.App._analysisGrid.classList.add('ss-hidden');
    if (NS.App._chart) {
      NS.App._chart.destroy();
      NS.App._chart = null;
    }
  };

  NS.App._onAnalyzeEquip = function () {
    var equipId  = NS.App._equipSelect.value;
    if (!equipId) return;
    var equipDis = NS.App._equipSelect.options[NS.App._equipSelect.selectedIndex].text;
    var dateStr  = NS.App._dateSelect.value || _todayStr();
    var gen = ++NS.App._equipGenCtr;

    // Show analysis area with loading card
    NS.App._clearAnalysis();
    NS.App._analysisArea.classList.remove('ss-hidden');
    NS.App._equipLoadingCard.classList.remove('ss-hidden');
    NS.App._equipBtn.disabled    = true;
    NS.App._equipSelect.disabled = true;

    // Fire AI analysis and history fetch in parallel; handle each independently
    var aiPromise = NS.evals.analyzeEquip(equipId, NS.App._attestKey, NS.App._projectName, dateStr)
      .then(function (text) { return { ok: true, text: text }; })
      .catch(function (err) { return { ok: false, err: err }; });

    var histPromise = NS.evals.loadEquipHistory(equipId, NS.App._attestKey, NS.App._projectName, dateStr)
      .then(function (data) { return { ok: true, data: data }; })
      .catch(function (err) { return { ok: false, err: err }; });

    Promise.all([aiPromise, histPromise]).then(function (results) {
      if (gen !== NS.App._equipGenCtr) return;

      var aiResult   = results[0];
      var histResult = results[1];

      NS.App._equipLoadingCard.classList.add('ss-hidden');
      NS.App._equipBtn.disabled    = false;
      NS.App._equipSelect.disabled = false;

      NS.App._chartName.textContent = equipDis;
      NS.App._equipName.textContent = equipDis;
      NS.App._equipText.innerHTML   = '';
      NS.App._equipError.classList.add('ss-hidden');

      // Render chart
      if (histResult.ok) {
        NS.App._renderChart(histResult.data);
      } else {
        NS.App._chartEmpty.classList.remove('ss-hidden');
        console.error('[siteSummary] History load failed:', histResult.err);
      }

      // Render AI text
      if (aiResult.ok) {
        NS.App._equipText.innerHTML = _renderMarkdown(aiResult.text);
      } else {
        NS.App._equipErrorMsg.textContent = aiResult.err.message || 'Analysis failed.';
        NS.App._equipError.classList.remove('ss-hidden');
      }

      NS.App._analysisGrid.classList.remove('ss-hidden');
    });
  };

  // ── Private: chart rendering ──────────────────────────────────────────────

  NS.App._renderChart = function (histData) {
    NS.App._chartEmpty.classList.add('ss-hidden');

    if (!window.Chart) {
      NS.App._chartEmpty.textContent = 'Chart.js unavailable — unable to render trend.';
      NS.App._chartEmpty.classList.remove('ss-hidden');
      return;
    }

    if (!histData || !histData.labels || histData.labels.length === 0) {
      NS.App._chartEmpty.classList.remove('ss-hidden');
      return;
    }

    if (NS.App._chart) {
      NS.App._chart.destroy();
      NS.App._chart = null;
    }

    NS.App._chart = new window.Chart(NS.App._chartCanvas, {
      type: 'line',
      data: {
        labels: histData.labels,
        datasets: histData.datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 10 }, padding: 10 }
          }
        },
        scales: {
          x: {
            ticks: { maxTicksLimit: 12, maxRotation: 0, font: { size: 10 } },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          y: {
            ticks: { font: { size: 10 } },
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        }
      }
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _renderMarkdown(text) {
    if (typeof window.marked !== 'undefined') {
      return window.marked.parse(text);
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  function _todayStr() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function _opt(value, label) {
    var o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }

})(window.siteSummary);
