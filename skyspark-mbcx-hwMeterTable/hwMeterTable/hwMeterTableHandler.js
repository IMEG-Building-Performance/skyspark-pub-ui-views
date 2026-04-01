// hwMeterTable/hwMeterTableHandler.js
//
// Main handler module — orchestrates stylesheet injection, variable reading,
// data loading, table rendering, and site detail navigation.
// Loaded dynamically by hwMeterTableEntry.js.
//
// At startup this file exposes window.hwMeterTableApp, which the entry
// file delegates to. The name MUST differ from the entry file's jsHandler
// global ("hwMeterTableHandler") to avoid collision.
//
// ── Navigation ──────────────────────────────────────────────────────────────
// Two views share the same #hwMeterTable-root container; only one is shown
// at a time using display:none toggling:
//
//   #hwMeterTable-root
//   ├─ .hw-table-title      (hidden in detail view)
//   ├─ .hw-table-container  (hidden in detail view)
//   └─ .hw-detail-container (hidden in table view)
//
// Clicking a site row calls _showDetail(); the back button calls _showTable().
//
// ── Re-render behaviour ──────────────────────────────────────────────────────
// onUpdate is called by SkySpark on every view refresh. The DOM scaffold is
// built once; refreshData is called on every onUpdate so variable changes
// always trigger a new fetch. A fetch-generation counter ensures stale
// in-flight responses are silently discarded.

window.hwMeterTable = window.hwMeterTable || {};

(function (app) {
  var utils      = window.hwMeterTable.utils;
  var evals      = window.hwMeterTable.evals;
  var components = window.hwMeterTable.components;

  var APP_ID   = 'hwMeterTable-root';
  var CSS_ID   = 'hwMeterTable-styles';
  var CSS_PATH = '/pub/ui/hwMeterTable/hwMeterTableStyles.css?v=' +
                 (window.hwMeterTable._version || '0');

  // ── Module-level state ─────────────────────────────────────────────────
  // Persists across onUpdate calls so the detail view's back button and
  // onSiteClick can always use up-to-date session values.

  var _fetchGen          = 0;   // incremented on every new fetch
  var _attestKey         = '';
  var _projectName       = '';
  var _dates             = '';
  var _currentDetailInfo = null; // set while detail view is open; null in table view

  // DOM handles — set once when the scaffold is built
  var _titleEl;
  var _tableContainer;
  var _detailContainer;

  // ── Private helpers ────────────────────────────────────────────────────

  /** Inject the stylesheet, replacing it if the version has changed. */
  function loadStyles() {
    var existing = document.getElementById(CSS_ID);
    if (existing) {
      if (existing.href.indexOf('v=' + (window.hwMeterTable._version || '0')) !== -1) return;
      existing.parentNode.removeChild(existing);
    }
    var link  = document.createElement('link');
    link.id   = CSS_ID;
    link.rel  = 'stylesheet';
    link.href = CSS_PATH;
    document.head.appendChild(link);
  }

  /**
   * Read a named VarNode from the SkySpark view using view.var(name).
   * Returns the Axon string representation, or null if not set.
   *
   * Fantom proxy objects don't always expose toAxon/toStr, so we also
   * pattern-match the String() output to fix up common Fantom formats:
   *   Ref:      [nav:equip.all]          → @nav:equip.all
   *   DateSpan: 2026-02-01,2026-03-01   → 2026-02-01..2026-03-01
   */
  function tryReadVar(view, varName) {
    try {
      var val = view.var(varName);
      if (val == null) return null;
      if (typeof val.toAxon === 'function') return val.toAxon();
      var s;
      try { s = typeof val.toStr === 'function' ? val.toStr() : String(val); }
      catch (e) { s = String(val); }
      if (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']') return '@' + s.slice(1, -1);
      if (/^[a-z][a-z0-9]*:[a-z]/i.test(s)) return '@' + s;
      if (/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(',', '..');
      return s;
    } catch (e) { /* variable not set or not found */ }
    return null;
  }

  /**
   * Switch to the detail view for a clicked site row.
   *
   * @param {Object} info - { siteId, siteName, rowData, visibleCols }
   */
  function _showDetail(info) {
    _currentDetailInfo             = info;
    _titleEl.style.display         = 'none';
    _tableContainer.style.display  = 'none';
    _detailContainer.style.display = '';

    components.renderSiteDetail(
      _detailContainer,
      {
        siteId:      info.siteId,
        siteName:    info.siteName,
        rowData:     info.rowData,
        visibleCols: info.visibleCols,
        attestKey:   _attestKey,
        projectName: _projectName,
        dates:       _dates
      },
      _showTable  // back button callback
    );
  }

  /** Switch to the table view (hide detail, show table + title). */
  function _showTable() {
    _currentDetailInfo              = null;
    _detailContainer.style.display  = 'none';
    _titleEl.style.display          = '';
    _tableContainer.style.display   = '';
  }

  /**
   * Clear tableContainer, show a loading indicator, fetch data, then render.
   * Skips the fetch entirely if the targets+dates key matches the last
   * successful fetch — prevents redundant API calls when SkySpark fires
   * onUpdate multiple times for the same view state.
   * Uses a generation counter so stale in-flight responses are discarded.
   */
  function refreshData(tableContainer, attestKey, projectName, targets, dates) {
    var fetchKey = targets + '\x00' + dates;
    if (tableContainer.getAttribute('data-fetch-key') === fetchKey) {
      return; // same parameters already fetched — skip
    }
    tableContainer.setAttribute('data-fetch-key', fetchKey);

    var gen = ++_fetchGen;

    tableContainer.innerHTML = '';
    var loadingEl = document.createElement('div');
    loadingEl.className   = 'hw-table-loading';
    loadingEl.textContent = 'Loading\u2026';
    tableContainer.appendChild(loadingEl);

    evals.loadDemandData(attestKey, projectName, targets, dates)
      .then(function (result) {
        if (gen !== _fetchGen) return; // superseded — discard
        tableContainer.removeChild(loadingEl);
        components.renderSiteTable(
          tableContainer,
          result.siteGrid,
          result.totalsGrid,
          {
            onSiteClick:  _showDetail,
            attestKey:    attestKey,
            projectName:  projectName
          }
        );
      })
      .catch(function (err) {
        if (gen !== _fetchGen) return;
        tableContainer.removeChild(loadingEl);
        var errEl = document.createElement('div');
        errEl.className   = 'hw-table-error';
        errEl.textContent = 'Error loading data: ' + err.message;
        tableContainer.appendChild(errEl);
        console.error('[hwMeterTable] Error:', err);
      });
  }

  // ── Public handler ─────────────────────────────────────────────────────

  /**
   * Entry point called by SkySpark (via the entry file stub) on each view update.
   * Called on first load and whenever any view variable changes.
   *
   * The scaffold (title + tableContainer + detailContainer) is built once on
   * the first call. refreshData is called on every onUpdate so variable changes
   * always trigger a re-fetch.
   *
   * @param {Object} arg - SkySpark view argument ({ view, elem })
   */
  app.onUpdate = function (arg) {
    var view = arg.view;
    var elem = arg.elem;

    loadStyles();

    elem.style.width  = '100%';
    elem.style.height = '100%';

    // ── Session credentials ──────────────────────────────────────────────
    var session    = view.session();
    _attestKey     = session.attestKey();
    _projectName   = session.proj().name();

    // ── View variables ───────────────────────────────────────────────────
    var parentView = null;
    try { parentView = view.parent(); } catch (e) {}

    var targets = tryReadVar(view, 'targets') || (parentView && tryReadVar(parentView, 'targets')) || '@nav:equip.all';
    _dates      = tryReadVar(view, 'dates')   || (parentView && tryReadVar(parentView, 'dates'))   || 'pastMonth';

    console.log('[hwMeterTable] onUpdate — targets:', targets, '| dates:', _dates);

    // ── Build scaffold once ──────────────────────────────────────────────
    var root = elem.querySelector('#' + APP_ID);

    if (!root) {
      root    = document.createElement('div');
      root.id = APP_ID;
      elem.appendChild(root);

      _titleEl = document.createElement('div');
      _titleEl.className   = 'hw-table-title';
      _titleEl.textContent = 'Hot Water Meter \u2014 95% Demand Values';
      root.appendChild(_titleEl);

      _tableContainer = document.createElement('div');
      _tableContainer.className = 'hw-table-container';
      root.appendChild(_tableContainer);

      _detailContainer = document.createElement('div');
      _detailContainer.className = 'hw-detail-container';
      _detailContainer.style.display = 'none';
      root.appendChild(_detailContainer);
    }

    // If the detail view is open, re-render it with updated dates/session values.
    // Invalidate the table cache so it re-fetches when the user navigates back.
    // Otherwise fall through to normal table refresh.
    if (_currentDetailInfo && _detailContainer && _detailContainer.style.display !== 'none') {
      if (_tableContainer) _tableContainer.removeAttribute('data-fetch-key');
      _showDetail(_currentDetailInfo);
    } else {
      _showTable();
      refreshData(_tableContainer, _attestKey, _projectName, targets, _dates);
    }
  };

})(window.hwMeterTable);

// Expose the app global that the entry file delegates to.
// CRITICAL: must differ from the entry file's jsHandler global name.
window.hwMeterTableApp = window.hwMeterTable;
console.log('[hwMeterTable] Handler ready. window.hwMeterTableApp exposed.');
