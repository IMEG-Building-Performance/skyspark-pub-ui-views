// App.js
// Full-screen AI analysis tool with built-in site/date selector.
window.siteSummary = window.siteSummary || {};

(function (NS) {
  NS.App = {};

  // ── Init ─────────────────────────────────────────────────────────────────

  NS.App.init = function (container, attestKey, projectName) {
    NS.App._attestKey   = attestKey;
    NS.App._projectName = projectName;
    NS.App._siteGenCtr  = 0;
    NS.App._equipGenCtr = 0;
    NS.App._chart       = null;

    container.innerHTML = [
      '<div class="ssc-layout">',

      // ── Sidebar ──────────────────────────────────────────────────────────
      '  <aside class="ssc-sidebar">',

      '    <div class="ssc-sidebar-header">',
      '      <span class="ssc-logo-icon">&#10022;</span>',
      '      <span class="ssc-logo-text">Site AI</span>',
      '    </div>',

      '    <div class="ssc-sidebar-body">',

      '      <div class="ssc-field-group">',
      '        <label class="ssc-field-label">Site</label>',
      '        <select id="ssc-site-select" class="ssc-select" disabled>',
      '          <option value="">Loading sites…</option>',
      '        </select>',
      '      </div>',

      '      <div class="ssc-field-group">',
      '        <label class="ssc-field-label">Analysis Date</label>',
      '        <input type="date" id="ssc-date" class="ssc-input">',
      '      </div>',

      '      <button id="ssc-summary-btn" class="ssc-btn-primary" disabled>',
      '        Generate Site Summary',
      '      </button>',

      '      <div id="ssc-equip-section" class="ssc-equip-section ssc-hidden">',
      '        <div class="ssc-sidebar-divider"></div>',
      '        <label class="ssc-field-label" style="margin-bottom:6px;display:block;">Equipment</label>',
      '        <select id="ssc-equip-select" class="ssc-select" disabled>',
      '          <option value="">Loading…</option>',
      '        </select>',
      '        <button id="ssc-equip-btn" class="ssc-btn-secondary" disabled>',
      '          Analyze Equipment',
      '        </button>',
      '      </div>',

      '    </div>',

      '    <div id="ssc-sidebar-status" class="ssc-sidebar-status ssc-hidden">',
      '      <div class="ssc-status-spinner"></div>',
      '      <span id="ssc-status-text" class="ssc-status-text">Generating…</span>',
      '    </div>',

      '  </aside>',

      // ── Main area ─────────────────────────────────────────────────────────
      '  <main class="ssc-main">',

      // Welcome state (shown until first analysis)
      '    <div id="ssc-welcome" class="ssc-welcome">',
      '      <div class="ssc-welcome-icon">&#10022;</div>',
      '      <h1 class="ssc-welcome-title">Site AI Analysis</h1>',
      '      <p class="ssc-welcome-sub">',
      '        Select a site from the sidebar, then generate a summary',
      '        <br>or analyze individual equipment performance.',
      '      </p>',
      '      <div class="ssc-chips">',
      '        <span class="ssc-chip">Site Summary</span>',
      '        <span class="ssc-chip">Equipment Analysis</span>',
      '        <span class="ssc-chip">Performance Trends</span>',
      '      </div>',
      '    </div>',

      // Results area (shown after first analysis)
      '    <div id="ssc-results" class="ssc-results ssc-hidden">',

      '      <div id="ssc-loading" class="ssc-loading ssc-hidden">',
      '        <div class="ssc-loading-spinner"></div>',
      '        <span id="ssc-loading-text" class="ssc-loading-text">Analyzing…</span>',
      '      </div>',

      // Site summary block
      '      <div id="ssc-summary-result" class="ssc-result-block ssc-hidden">',
      '        <div class="ssc-result-label">Site Summary</div>',
      '        <div id="ssc-summary-text" class="ssc-result-text"></div>',
      '      </div>',

      // Equipment analysis block
      '      <div id="ssc-equip-result" class="ssc-result-block ssc-hidden">',
      '        <div class="ssc-result-label">',
      '          Equipment Analysis — <span id="ssc-equip-name"></span>',
      '        </div>',
      '        <div id="ssc-equip-grid" class="ssc-equip-grid">',
      '          <div class="ssc-inner-card">',
      '            <div class="ssc-inner-card-title">24-Hour Trend</div>',
      '            <div class="ssc-chart-wrap">',
      '              <canvas id="ssc-chart-canvas"></canvas>',
      '              <div id="ssc-chart-empty" class="ssc-chart-empty ssc-hidden">No history data available</div>',
      '            </div>',
      '          </div>',
      '          <div class="ssc-inner-card">',
      '            <div class="ssc-inner-card-title">AI Analysis</div>',
      '            <div id="ssc-equip-text" class="ssc-result-text"></div>',
      '            <div id="ssc-equip-error" class="ssc-inline-error ssc-hidden">',
      '              <span id="ssc-equip-error-msg"></span>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      </div>',

      // Top-level error block
      '      <div id="ssc-error" class="ssc-error-block ssc-hidden">',
      '        <span id="ssc-error-msg"></span>',
      '      </div>',

      '    </div>',
      '  </main>',

      '</div>'
    ].join('\n');

    // ── Cache DOM refs ──
    NS.App._siteSelect    = container.querySelector('#ssc-site-select');
    NS.App._dateInput     = container.querySelector('#ssc-date');
    NS.App._summaryBtn    = container.querySelector('#ssc-summary-btn');
    NS.App._equipSection  = container.querySelector('#ssc-equip-section');
    NS.App._equipSelect   = container.querySelector('#ssc-equip-select');
    NS.App._equipBtn      = container.querySelector('#ssc-equip-btn');
    NS.App._sidebarStatus = container.querySelector('#ssc-sidebar-status');
    NS.App._statusText    = container.querySelector('#ssc-status-text');

    NS.App._welcome       = container.querySelector('#ssc-welcome');
    NS.App._results       = container.querySelector('#ssc-results');
    NS.App._loading       = container.querySelector('#ssc-loading');
    NS.App._loadingText   = container.querySelector('#ssc-loading-text');

    NS.App._summaryResult = container.querySelector('#ssc-summary-result');
    NS.App._summaryText   = container.querySelector('#ssc-summary-text');

    NS.App._equipResult   = container.querySelector('#ssc-equip-result');
    NS.App._equipName     = container.querySelector('#ssc-equip-name');
    NS.App._equipText     = container.querySelector('#ssc-equip-text');
    NS.App._equipError    = container.querySelector('#ssc-equip-error');
    NS.App._equipErrorMsg = container.querySelector('#ssc-equip-error-msg');
    NS.App._chartCanvas   = container.querySelector('#ssc-chart-canvas');
    NS.App._chartEmpty    = container.querySelector('#ssc-chart-empty');

    NS.App._error         = container.querySelector('#ssc-error');
    NS.App._errorMsg      = container.querySelector('#ssc-error-msg');

    // Default to today
    NS.App._dateInput.value = _todayStr();

    // ── Wire events ──
    NS.App._siteSelect.addEventListener('change', NS.App._onSiteChange);
    NS.App._summaryBtn.addEventListener('click', NS.App._onSummary);
    NS.App._equipBtn.addEventListener('click', NS.App._onAnalyzeEquip);
  };

  // ── Site populate ─────────────────────────────────────────────────────────

  NS.App.populateSites = function (sites) {
    var sel = NS.App._siteSelect;
    sel.innerHTML = '';
    if (!sites || sites.length === 0) {
      sel.appendChild(_opt('', 'No sites found'));
      return;
    }
    sel.appendChild(_opt('', '— Choose a site —'));
    sites.forEach(function (s) { sel.appendChild(_opt(s.id, s.dis)); });
    sel.disabled = false;
  };

  NS.App.showLoadError = function (msg) {
    NS.App._siteSelect.innerHTML = '';
    NS.App._siteSelect.appendChild(_opt('', 'Failed to load'));
    NS.App._showError('Could not load sites: ' + msg);
    NS.App._showResults();
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
    sel.appendChild(_opt('', '— Choose equipment —'));
    equipList.forEach(function (e) { sel.appendChild(_opt(e.id, e.navName || e.dis)); });
    sel.disabled = false;
    NS.App._equipBtn.disabled = false;
  };

  // ── Private: site change ──────────────────────────────────────────────────

  NS.App._onSiteChange = function () {
    var siteId = NS.App._siteSelect.value;
    NS.App._summaryBtn.disabled = !siteId;
    NS.App._clearResults();

    if (!siteId) {
      NS.App._equipSection.classList.add('ssc-hidden');
      return;
    }

    NS.App._equipSection.classList.remove('ssc-hidden');
    NS.App._equipSelect.innerHTML = '';
    NS.App._equipSelect.appendChild(_opt('', 'Loading equipment…'));
    NS.App._equipSelect.disabled = true;
    NS.App._equipBtn.disabled = true;

    NS.evals.loadEquip(siteId, NS.App._attestKey, NS.App._projectName)
      .then(function (list) { NS.App.populateEquip(list); })
      .catch(function (err) {
        NS.App._equipSelect.innerHTML = '';
        NS.App._equipSelect.appendChild(_opt('', 'Failed to load equipment'));
        console.error('[siteSummary] loadEquip:', err);
      });
  };

  // ── Private: site summary ─────────────────────────────────────────────────

  NS.App._onSummary = function () {
    var siteId = NS.App._siteSelect.value;
    if (!siteId) return;
    var gen = ++NS.App._siteGenCtr;

    NS.App._clearResults();
    NS.App._showLoading('Generating site summary…');
    NS.App._summaryBtn.disabled = true;

    NS.api.evalAxon('siteSummary(@' + siteId + ')', NS.App._attestKey, NS.App._projectName)
      .then(function (data) {
        if (gen !== NS.App._siteGenCtr) return;
        var rows = data && data.rows;
        var raw  = rows && rows.length > 0 ? rows[0].val : null;
        var text = (raw !== null && typeof raw === 'object') ? NS.api.extractValue(raw) : raw;
        if (typeof text !== 'string' || !text.trim()) {
          throw new Error('siteSummary() returned an empty value.');
        }
        NS.App._hideLoading();
        NS.App._summaryText.innerHTML = _renderMarkdown(text);
        NS.App._summaryResult.classList.remove('ssc-hidden');
        NS.App._summaryBtn.disabled = false;
      })
      .catch(function (err) {
        if (gen !== NS.App._siteGenCtr) return;
        NS.App._hideLoading();
        NS.App._showError(err.message || 'Error generating summary.');
        NS.App._summaryBtn.disabled = false;
      });
  };

  // ── Private: equipment analysis ───────────────────────────────────────────

  NS.App._onAnalyzeEquip = function () {
    var equipId  = NS.App._equipSelect.value;
    if (!equipId) return;
    var equipDis = NS.App._equipSelect.options[NS.App._equipSelect.selectedIndex].text;
    var dateStr  = NS.App._dateInput.value || _todayStr();
    var gen = ++NS.App._equipGenCtr;

    NS.App._clearResults();
    NS.App._showLoading('Analyzing equipment…');
    NS.App._equipBtn.disabled = true;

    var aiP = NS.evals.analyzeEquip(equipId, NS.App._attestKey, NS.App._projectName, dateStr)
      .then(function (t) { return { ok: true, text: t }; })
      .catch(function (e) { return { ok: false, err: e }; });

    var histP = NS.evals.loadEquipHistory(equipId, NS.App._attestKey, NS.App._projectName, dateStr)
      .then(function (d) { return { ok: true, data: d }; })
      .catch(function (e) { return { ok: false, err: e }; });

    Promise.all([aiP, histP]).then(function (res) {
      if (gen !== NS.App._equipGenCtr) return;

      NS.App._hideLoading();
      NS.App._equipBtn.disabled = false;
      NS.App._equipName.textContent = equipDis;
      NS.App._equipText.innerHTML = '';
      NS.App._equipError.classList.add('ssc-hidden');
      NS.App._chartEmpty.classList.add('ssc-hidden');

      if (res[1].ok) {
        NS.App._renderChart(res[1].data);
      } else {
        NS.App._chartEmpty.classList.remove('ssc-hidden');
        console.error('[siteSummary] History failed:', res[1].err);
      }

      if (res[0].ok) {
        NS.App._equipText.innerHTML = _renderMarkdown(res[0].text);
      } else {
        NS.App._equipErrorMsg.textContent = res[0].err.message || 'Analysis failed.';
        NS.App._equipError.classList.remove('ssc-hidden');
      }

      NS.App._equipResult.classList.remove('ssc-hidden');
    });
  };

  // ── Private: chart ────────────────────────────────────────────────────────

  NS.App._renderChart = function (histData) {
    NS.App._chartEmpty.classList.add('ssc-hidden');
    if (!window.Chart) {
      NS.App._chartEmpty.textContent = 'Chart.js unavailable.';
      NS.App._chartEmpty.classList.remove('ssc-hidden');
      return;
    }
    if (!histData || !histData.labels || histData.labels.length === 0) {
      NS.App._chartEmpty.classList.remove('ssc-hidden');
      return;
    }
    if (NS.App._chart) { NS.App._chart.destroy(); NS.App._chart = null; }

    NS.App._chart = new window.Chart(NS.App._chartCanvas, {
      type: 'line',
      data: { labels: histData.labels, datasets: histData.datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, padding: 12 } }
        },
        scales: {
          x: { ticks: { maxTicksLimit: 12, maxRotation: 0, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
          y: { ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
        }
      }
    });
  };

  // ── Private: UI state helpers ─────────────────────────────────────────────

  NS.App._showResults = function () {
    NS.App._welcome.classList.add('ssc-hidden');
    NS.App._results.classList.remove('ssc-hidden');
  };

  NS.App._clearResults = function () {
    NS.App._summaryResult.classList.add('ssc-hidden');
    NS.App._equipResult.classList.add('ssc-hidden');
    NS.App._error.classList.add('ssc-hidden');
    NS.App._loading.classList.add('ssc-hidden');
    if (NS.App._chart) { NS.App._chart.destroy(); NS.App._chart = null; }
  };

  NS.App._showLoading = function (msg) {
    NS.App._loadingText.textContent = msg || 'Loading…';
    NS.App._loading.classList.remove('ssc-hidden');
    NS.App._showResults();
  };

  NS.App._hideLoading = function () {
    NS.App._loading.classList.add('ssc-hidden');
  };

  NS.App._showError = function (msg) {
    NS.App._errorMsg.textContent = msg;
    NS.App._error.classList.remove('ssc-hidden');
    NS.App._showResults();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _renderMarkdown(text) {
    if (typeof window.marked !== 'undefined') return window.marked.parse(text);
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
