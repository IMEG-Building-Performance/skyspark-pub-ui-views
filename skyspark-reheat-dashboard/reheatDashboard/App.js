// App.js
// Root application — builds DOM, wires events, orchestrates components
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  NS.App = {};

  // ── Build page HTML shell ──
  function buildDOM(container) {
    container.innerHTML = [
      '<div class="page-header">',
      '  <h1>VAV Reheat Diagnostic</h1>',
      '  <div class="meta">',
      '    <span>VAV Air Terminal Units</span>',
      '    <span class="meta-sep">&middot;</span>',
      '    <span>Daily averages</span>',
      '    <span class="meta-sep">&middot;</span>',
      '    <span>Building Analytics</span>',
      '    <span class="date-badge" style="margin-left:auto">Current Period</span>',
      '  </div>',
      '</div>',
      '<div class="kpi-row" id="rdKpiRow"></div>',
      '<div class="main-body">',
      '  <div class="card">',
      '    <div class="card-header">',
      '      <h2>VAV Units</h2>',
      '      <span class="subtitle" id="rdRowCount"></span>',
      '    </div>',
      '    <div class="table-search">',
      '      <div class="search-wrap">',
      '        <svg class="ico" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">',
      '          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      '        </svg>',
      '        <input type="text" id="rdSearch" placeholder="Search name or status\u2026">',
      '      </div>',
      '    </div>',
      '    <div class="table-scroll">',
      '      <table>',
      '        <thead>',
      '          <tr>',
      '            <th data-col="name">VAV Unit</th>',
      '            <th data-col="dat">Avg DAT</th>',
      '            <th data-col="rh">Avg RH%</th>',
      '            <th data-col="flag">Status</th>',
      '          </tr>',
      '        </thead>',
      '        <tbody id="rdTableBody"></tbody>',
      '      </table>',
      '    </div>',
      '  </div>',
      '  <div class="card">',
      '    <div class="card-header">',
      '      <h2>KPI Scatter &mdash; Avg Discharge Air Temp vs. Avg Reheat Valve Output</h2>',
      '      <div class="legend-row" style="margin:0">',
      '        <span class="leg"><span class="leg-dot" style="background:#3b82f6"></span>Normal</span>',
      '        <span class="leg"><span class="leg-dot" style="background:#ef4444"></span>Faulty Reheat</span>',
      '        <span class="leg"><span class="leg-dot" style="background:#8b5cf6"></span>Leaking Valve</span>',
      '        <span class="leg"><span class="leg-dot" style="background:#f59e0b;border:1.5px solid #b45309"></span>Selected</span>',
      '      </div>',
      '    </div>',
      '    <div class="chart-inner">',
      '      <svg class="rd-scatter" style="cursor:crosshair"></svg>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="rd-tooltip"></div>'
    ].join('\n');
  }

  // ── Main initialization ──
  NS.App.init = function (container, vavData) {
    var state = { selectedId: null, sortCol: 'name', sortDir: 1, searchVal: '' };

    buildDOM(container);

    var svgEl = container.querySelector('.rd-scatter');
    var tipEl = container.querySelector('.rd-tooltip');

    // Tooltip tracking on mousemove
    svgEl.addEventListener('mousemove', function (e) {
      tipEl.style.left = (e.clientX + 16) + 'px';
      tipEl.style.top = (e.clientY - 12) + 'px';
    });

    // Render KPIs (static)
    NS.KpiRow.render(vavData);

    function refresh() {
      NS.ScatterChart.render(svgEl, tipEl, vavData, state.selectedId, selectVAV);
      NS.VavTable.render(vavData, state.selectedId, state.sortCol, state.sortDir, state.searchVal, selectVAV);
    }

    // Selection handler
    function selectVAV(id) {
      state.selectedId = state.selectedId === id ? null : id;
      refresh();
      if (state.selectedId !== null) {
        var row = container.querySelector('#rdTableBody tr[data-id="' + state.selectedId + '"]');
        if (row) row.scrollIntoView({ block: 'nearest' });
      }
    }

    // Sort headers
    var ths = container.querySelectorAll('thead th[data-col]');
    for (var i = 0; i < ths.length; i++) {
      (function (th) {
        th.addEventListener('click', function () {
          var col = th.getAttribute('data-col');
          state.sortDir = state.sortCol === col ? state.sortDir * -1 : 1;
          state.sortCol = col;
          var allTh = container.querySelectorAll('thead th');
          for (var j = 0; j < allTh.length; j++) {
            allTh[j].classList.remove('sort-asc', 'sort-desc');
          }
          th.classList.add(state.sortDir === 1 ? 'sort-asc' : 'sort-desc');
          NS.VavTable.render(vavData, state.selectedId, state.sortCol, state.sortDir, state.searchVal, selectVAV);
        });
      })(ths[i]);
    }

    // Search
    var searchInput = container.querySelector('#rdSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.searchVal = e.target.value;
        NS.VavTable.render(vavData, state.selectedId, state.sortCol, state.sortDir, state.searchVal, selectVAV);
      });
    }

    // Resize handler
    window.addEventListener('resize', function () {
      NS.ScatterChart.render(svgEl, tipEl, vavData, state.selectedId, selectVAV);
    });

    // Initial render
    refresh();
  };
})(window.reheatDashboard);
