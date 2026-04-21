/**
 * eventsDatabase.js
 *
 * Full-page Events Database panel with filterable, paginated table
 * and event summary with utility cost breakdown mini bar chart.
 *
 * Accessed via "View All Events" button in the header.
 * Replaces the main content area; "Back to Chart" restores it.
 *
 * Uses window.EventAnnotationsPlot.api.loadExecSummary() for data,
 * so no additional API helpers are needed.
 *
 * CSS namespace: edb- (Events Database)
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.eventsDatabase = {};

// ── Styles ──────────────────────────────────────────────────────────────
// Styles are loaded via eventAnnotationsPlotStyles.css (injected by eventAnnotationsPlotUI.js)

window.EventAnnotationsPlot.eventsDatabase.injectStyles = function() {
  // No-op: styles are loaded externally via eventAnnotationsPlotStyles.css
};

// ── Currency / Date helpers ─────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase.formatCurrency = function(val) {
  var num = parseFloat(val) || 0;
  return '$' + Math.round(num).toLocaleString('en-US');
};

window.EventAnnotationsPlot.eventsDatabase.formatCurrencyCents = function(val) {
  var num = parseFloat(val) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

window.EventAnnotationsPlot.eventsDatabase.formatDate = function(dateVal) {
  if (!dateVal) return '—';
  var d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

window.EventAnnotationsPlot.eventsDatabase.formatDateShort = function(dateVal) {
  if (!dateVal) return '—';
  var d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Debounce ────────────────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase._debounce = function(fn, delay) {
  var timer = null;
  return function() {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
  };
};

// ── Open Panel ──────────────────────────────────────────────────────────

/**
 * Replace the main content area with the Events Database.
 * @param {HTMLElement} mainContainer - The top-level container element (from index.js)
 * @param {Object} state - window.EventAnnotationsPlot.state reference
 */
window.EventAnnotationsPlot.eventsDatabase.openPanel = function(mainContainer, state) {
  var edb = window.EventAnnotationsPlot.eventsDatabase;
  var dbState = state.eventsDatabaseState;

  edb.injectStyles();

  // Save the current main content so we can restore on close
  dbState._savedContent = [];
  while (mainContainer.firstChild) {
    dbState._savedContent.push(mainContainer.removeChild(mainContainer.firstChild));
  }
  dbState.isOpen = true;

  // ── Root container ────────────────────────────────────────────────
  var container = document.createElement('div');
  container.className = 'edb-container';
  mainContainer.appendChild(container);

  // ── Header ────────────────────────────────────────────────────────
  var header = document.createElement('div');
  header.className = 'edb-header';

  var titleEl = document.createElement('h2');
  titleEl.textContent = 'Events Database';
  header.appendChild(titleEl);

  var backBtn = document.createElement('button');
  backBtn.className = 'edb-back-btn';
  backBtn.innerHTML = '\u2190 Back to Chart';
  backBtn.onclick = function() {
    edb.closePanel(mainContainer, state);
  };
  header.appendChild(backBtn);
  container.appendChild(header);

  // ── Content area ──────────────────────────────────────────────────
  var content = document.createElement('div');
  content.className = 'edb-content';
  container.appendChild(content);

  // ── Table panel ───────────────────────────────────────────────────
  var tablePanel = document.createElement('div');
  tablePanel.className = 'edb-table-panel';
  content.appendChild(tablePanel);

  // Filter bar
  edb.buildFilterBar(tablePanel, dbState, function() {
    edb._refresh(tablePanel, dbState);
  });

  // Table wrapper (will be populated after data load)
  var tableWrap = document.createElement('div');
  tableWrap.className = 'edb-table-wrap';
  tablePanel.appendChild(tableWrap);
  dbState._tableWrap = tableWrap;

  // Pagination
  var paginationEl = document.createElement('div');
  paginationEl.className = 'edb-pagination';
  tablePanel.appendChild(paginationEl);
  dbState._paginationEl = paginationEl;

  // ── Summary panel ─────────────────────────────────────────────────
  var summaryPanel = document.createElement('div');
  summaryPanel.className = 'edb-summary-panel';
  content.appendChild(summaryPanel);
  dbState._summaryPanel = summaryPanel;

  // Show placeholder
  edb._renderSummaryPlaceholder(summaryPanel);

  // ── Load data ─────────────────────────────────────────────────────
  // Don't auto-load — show empty state until user clicks Search
  dbState.allEvents = [];
  dbState.filteredEvents = [];
  edb._renderTablePlaceholder(dbState._tableWrap);
};

// ── Close Panel ─────────────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase.closePanel = function(mainContainer, state) {
  var dbState = state.eventsDatabaseState;
  dbState.isOpen = false;

  // Clear cached data so next open fetches fresh
  dbState.allEvents = [];
  dbState.filteredEvents = [];
  dbState._loadedDateStart = null;
  dbState._loadedDateEnd = null;
  dbState._filterInputs = null;

  // Reset date filters so next open re-reads SkySpark dates
  dbState.filters.dateStart = '';
  dbState.filters.dateEnd = '';

  // Restore saved content
  mainContainer.innerHTML = '';
  if (dbState._savedContent) {
    dbState._savedContent.forEach(function(child) {
      mainContainer.appendChild(child);
    });
    dbState._savedContent = null;
  }
};

// ── Data Loading ────────────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase._loadData = function(tablePanel, dbState) {
  var state = window.EventAnnotationsPlot.state;
  var api = window.EventAnnotationsPlot.api;
  var edb = window.EventAnnotationsPlot.eventsDatabase;

  var tableWrap = dbState._tableWrap;

  // Show loading state
  tableWrap.innerHTML = '';
  var loading = document.createElement('div');
  loading.className = 'edb-loading';
  var spinner = document.createElement('div');
  spinner.className = 'edb-spinner';
  loading.appendChild(spinner);
  var loadText = document.createElement('div');
  loadText.textContent = 'Loading events\u2026';
  loading.appendChild(loadText);
  tableWrap.appendChild(loading);

  var siteRef = state._selectedSite;

  if (!siteRef) {
    tableWrap.innerHTML = '';
    var emptyDiv = document.createElement('div');
    emptyDiv.className = 'edb-empty-msg';
    emptyDiv.innerHTML = '<div style="font-size:36px;margin-bottom:12px;">\uD83D\uDCCB</div>' +
      '<div style="font-size:15px;font-weight:600;margin-bottom:4px;">No Site Selected</div>' +
      '<div style="font-size:13px;">Select a site in SkySpark first, then return here.</div>';
    tableWrap.appendChild(emptyDiv);
    return;
  }

  // Use filter dates if provided; otherwise query all-time so dates are truly optional
  var startDate = dbState.filters.dateStart || '2000-01-01';
  var endDate = dbState.filters.dateEnd || '2099-12-31';

  dbState._loadedDateStart = startDate;
  dbState._loadedDateEnd = endDate;

  api.loadExecSummary(siteRef, startDate, endDate)
    .then(function(result) {
      dbState.allEvents = result.events || [];
      edb.applyFilters(dbState);
      edb._refresh(tablePanel, dbState);
    })
    .catch(function(err) {
      tableWrap.innerHTML = '';
      var errDiv = document.createElement('div');
      errDiv.className = 'edb-empty-msg';
      errDiv.innerHTML = '<div style="font-size:36px;margin-bottom:12px;">\u26A0\uFE0F</div>' +
        '<div style="font-size:15px;font-weight:600;margin-bottom:4px;">Error Loading Events</div>' +
        '<div style="font-size:13px;">' + (err.message || 'Unknown error') + '</div>';
      tableWrap.appendChild(errDiv);
    });
};

// ── Filter Bar ──────────────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase.buildFilterBar = function(parent, dbState, onFilterChange) {
  var edb = window.EventAnnotationsPlot.eventsDatabase;
  var bar = document.createElement('div');
  bar.className = 'edb-filter-bar';

  var filters = dbState.filters;

  // Reference to the table panel for re-fetching on date changes
  var tablePanel = parent;

  // Helper to create a filter group
  function makeGroup(label, type, key, placeholder) {
    var group = document.createElement('div');
    group.className = 'edb-filter-group';

    var lbl = document.createElement('div');
    lbl.className = 'edb-filter-label';
    lbl.textContent = label;
    group.appendChild(lbl);

    var input = document.createElement('input');
    input.type = type;
    input.className = 'edb-filter-input';
    if (placeholder) input.placeholder = placeholder;

    // Restore current filter value
    if (filters[key] !== null && filters[key] !== '') {
      input.value = filters[key];
    }

    var isDateField = (key === 'dateStart' || key === 'dateEnd');

    var handler = edb._debounce(function() {
      if (type === 'number') {
        filters[key] = input.value === '' ? null : parseFloat(input.value);
      } else {
        filters[key] = input.value;
      }
      dbState.currentPage = 1;

      // Date fields only take effect when Search is clicked — no auto-fetch
      if (!isDateField && dbState.allEvents.length > 0) {
        onFilterChange();
      }
    }, type === 'text' ? 300 : 0);

    input.addEventListener('input', handler);
    if (type === 'date') {
      input.addEventListener('change', function() {
        if (type === 'number') {
          filters[key] = input.value === '' ? null : parseFloat(input.value);
        } else {
          filters[key] = input.value;
        }
      });
    }

    group.appendChild(input);
    // Store input reference for clearing
    dbState._filterInputs = dbState._filterInputs || [];
    dbState._filterInputs.push({ input: input, key: key, type: type });

    return group;
  }

  bar.appendChild(makeGroup('Event Name', 'text', 'nameSearch', 'Search by name\u2026'));
  bar.appendChild(makeGroup('Event ID', 'text', 'idSearch', 'Search by ID\u2026'));
  bar.appendChild(makeGroup('Date Start', 'date', 'dateStart', ''));
  bar.appendChild(makeGroup('Date End', 'date', 'dateEnd', ''));
  bar.appendChild(makeGroup('Sqft Min', 'number', 'sqftMin', 'Min'));
  bar.appendChild(makeGroup('Sqft Max', 'number', 'sqftMax', 'Max'));
  bar.appendChild(makeGroup('Cost Min', 'number', 'costMin', '$Min'));
  bar.appendChild(makeGroup('Cost Max', 'number', 'costMax', '$Max'));

  // Search button + Clear button group
  var actionGroup = document.createElement('div');
  actionGroup.className = 'edb-filter-group';
  actionGroup.style.justifyContent = 'flex-end';
  actionGroup.style.gap = '8px';
  actionGroup.style.flexDirection = 'column';

  var searchBtn = document.createElement('button');
  searchBtn.textContent = 'Search';
  searchBtn.style.cssText = 'padding:8px 18px;border:1px solid #1565c0;border-radius:6px;background:#1565c0;color:white;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;width:100%;';
  searchBtn.onmouseover = function() { searchBtn.style.background = '#1976d2'; };
  searchBtn.onmouseout = function() { searchBtn.style.background = '#1565c0'; };
  searchBtn.onclick = function() {
    dbState.allEvents = [];
    dbState.currentPage = 1;
    edb._loadData(tablePanel, dbState);
  };
  actionGroup.appendChild(searchBtn);

  var clearBtn = document.createElement('button');
  clearBtn.className = 'edb-clear-btn';
  clearBtn.textContent = 'Clear';
  clearBtn.style.width = '100%';
  clearBtn.onclick = function() {
    filters.nameSearch = '';
    filters.idSearch = '';
    filters.dateStart = '';
    filters.dateEnd = '';
    filters.sqftMin = null;
    filters.sqftMax = null;
    filters.costMin = null;
    filters.costMax = null;

    if (dbState._filterInputs) {
      dbState._filterInputs.forEach(function(ref) {
        ref.input.value = '';
      });
    }

    // Only re-filter in-memory if data is already loaded
    if (dbState.allEvents.length > 0) {
      dbState.currentPage = 1;
      onFilterChange();
    }
  };
  actionGroup.appendChild(clearBtn);
  bar.appendChild(actionGroup);

  parent.appendChild(bar);
};

// ── Table placeholder (shown before first search) ───────────────────────

window.EventAnnotationsPlot.eventsDatabase._renderTablePlaceholder = function(tableWrap) {
  tableWrap.innerHTML = '';
  var placeholder = document.createElement('div');
  placeholder.className = 'edb-empty-msg';
  placeholder.innerHTML =
    '<div style="font-size:36px;margin-bottom:12px;">🔍</div>' +
    '<div style="font-size:15px;font-weight:600;margin-bottom:4px;">Set your filters and click Search</div>' +
    '<div style="font-size:13px;">Enter a date range and any additional filters to query events.</div>';
  tableWrap.appendChild(placeholder);
};

// ── Filtering ───────────────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase.applyFilters = function(dbState) {
  var f = dbState.filters;

  dbState.filteredEvents = dbState.allEvents.filter(function(evt) {
    // Name search
    if (f.nameSearch) {
      var name = (evt.event || '').toLowerCase();
      if (name.indexOf(f.nameSearch.toLowerCase()) === -1) return false;
    }

    // ID search
    if (f.idSearch) {
      var id = String(evt.eventID || '');
      if (id.indexOf(f.idSearch) === -1) return false;
    }

    // Date filters use overlap logic: show events that touch the range at all
    // (an event that starts before dateStart but ends after it is included)
    if (f.dateStart || f.dateEnd) {
      var evtStart = evt.eventStart ? new Date(evt.eventStart) : null;
      var evtEnd = evt.eventEnd ? new Date(evt.eventEnd) : null;
      if (!evtStart && !evtEnd) return false;

      if (f.dateEnd) {
        var rangeEnd = new Date(f.dateEnd + 'T23:59:59');
        var checkStart = evtStart || evtEnd;
        if (checkStart > rangeEnd) return false;
      }
      if (f.dateStart) {
        var rangeStart = new Date(f.dateStart);
        var checkEnd = evtEnd || evtStart;
        if (checkEnd < rangeStart) return false;
      }
    }

    // Sqft min
    if (f.sqftMin !== null && f.sqftMin !== undefined) {
      var sqft = parseFloat(evt.eventSF) || 0;
      if (sqft < f.sqftMin) return false;
    }

    // Sqft max
    if (f.sqftMax !== null && f.sqftMax !== undefined) {
      var sqft2 = parseFloat(evt.eventSF) || 0;
      if (sqft2 > f.sqftMax) return false;
    }

    // Cost min
    if (f.costMin !== null && f.costMin !== undefined) {
      var cost = parseFloat(evt.totalCost) || 0;
      if (cost < f.costMin) return false;
    }

    // Cost max
    if (f.costMax !== null && f.costMax !== undefined) {
      var cost2 = parseFloat(evt.totalCost) || 0;
      if (cost2 > f.costMax) return false;
    }

    return true;
  });

  // Sort by event start date descending (most recent first)
  dbState.filteredEvents.sort(function(a, b) {
    var da = a.eventStart ? new Date(a.eventStart).getTime() : 0;
    var db = b.eventStart ? new Date(b.eventStart).getTime() : 0;
    return db - da;
  });
};

// ── Column sort ─────────────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase._sortByColumn = function(dbState, key) {
  var current = dbState._sortKey;
  var dir = dbState._sortDir || 'desc';

  if (current === key) {
    dir = dir === 'asc' ? 'desc' : 'asc';
  } else {
    dir = 'asc';
  }

  dbState._sortKey = key;
  dbState._sortDir = dir;

  dbState.filteredEvents.sort(function(a, b) {
    var va = a[key];
    var vb = b[key];

    // Numeric sort for known numeric fields
    if (key === 'totalCost' || key === 'eventSF') {
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
    } else if (key === 'eventStart' || key === 'eventEnd') {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
    } else {
      va = String(va || '').toLowerCase();
      vb = String(vb || '').toLowerCase();
    }

    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
};

// ── Refresh (table + pagination) ────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase._refresh = function(tablePanel, dbState) {
  var edb = window.EventAnnotationsPlot.eventsDatabase;
  edb.applyFilters(dbState);

  // Re-apply column sort if active
  if (dbState._sortKey) {
    // Preserve current dir rather than toggling
    var savedDir = dbState._sortDir;
    var savedKey = dbState._sortKey;
    dbState._sortKey = null; // reset so _sortByColumn sets direction fresh
    dbState._sortKey = savedKey;
    dbState._sortDir = savedDir;
    // Direct sort without toggling
    dbState.filteredEvents.sort(function(a, b) {
      var key = savedKey;
      var dir = savedDir;
      var va = a[key];
      var vb = b[key];

      if (key === 'totalCost' || key === 'eventSF') {
        va = parseFloat(va) || 0;
        vb = parseFloat(vb) || 0;
      } else if (key === 'eventStart' || key === 'eventEnd') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else {
        va = String(va || '').toLowerCase();
        vb = String(vb || '').toLowerCase();
      }

      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  edb.buildTable(dbState._tableWrap, dbState);
  edb.buildPagination(dbState._paginationEl, dbState);
};

// ── Table Rendering ─────────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase.buildTable = function(tableWrap, dbState) {
  var edb = window.EventAnnotationsPlot.eventsDatabase;
  tableWrap.innerHTML = '';

  var events = dbState.filteredEvents;
  var pageSize = dbState.pageSize;
  var currentPage = dbState.currentPage;
  var startIdx = (currentPage - 1) * pageSize;
  var endIdx = Math.min(startIdx + pageSize, events.length);
  var pageEvents = events.slice(startIdx, endIdx);

  if (events.length === 0) {
    var emptyDiv = document.createElement('div');
    emptyDiv.className = 'edb-empty-msg';
    emptyDiv.innerHTML = '<div style="font-size:36px;margin-bottom:12px;">\uD83D\uDD0D</div>' +
      '<div style="font-size:15px;font-weight:600;margin-bottom:4px;">No Events Found</div>' +
      '<div style="font-size:13px;">Try adjusting your filter criteria.</div>';
    tableWrap.appendChild(emptyDiv);
    return;
  }

  var table = document.createElement('table');
  table.className = 'edb-table';

  // Columns
  var columns = [
    { key: 'event',      label: 'Event Name',  className: '' },
    { key: 'eventID',    label: 'ID',           className: '' },
    { key: 'eventStart', label: 'Start Date',   className: '' },
    { key: 'eventEnd',   label: 'End Date',     className: '' },
    { key: 'eventSF',    label: 'Sq Ft',        className: 'edb-number-cell' },
    { key: 'totalCost',  label: 'Total Cost',   className: 'edb-cost-cell' }
  ];

  // Thead
  var thead = document.createElement('thead');
  var headerRow = document.createElement('tr');

  columns.forEach(function(col) {
    var th = document.createElement('th');
    th.textContent = col.label;

    // Sort indicator
    if (dbState._sortKey === col.key) {
      th.textContent += dbState._sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
    }

    th.onclick = function() {
      edb._sortByColumn(dbState, col.key);
      edb.buildTable(tableWrap, dbState);
      edb.buildPagination(dbState._paginationEl, dbState);
    };

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Tbody
  var tbody = document.createElement('tbody');

  pageEvents.forEach(function(evt) {
    var tr = document.createElement('tr');

    if (dbState.selectedEvent === evt) {
      tr.className = 'edb-selected';
    }

    // Cells
    columns.forEach(function(col) {
      var td = document.createElement('td');
      if (col.className) td.className = col.className;

      var val = evt[col.key];

      if (col.key === 'eventStart' || col.key === 'eventEnd') {
        td.textContent = edb.formatDate(val);
      } else if (col.key === 'totalCost') {
        td.textContent = edb.formatCurrency(val);
      } else if (col.key === 'eventSF') {
        var sf = parseFloat(val);
        td.textContent = isNaN(sf) ? '—' : sf.toLocaleString();
      } else {
        td.textContent = val || '—';
      }

      tr.appendChild(td);
    });

    // Row click → select event
    tr.onclick = function() {
      dbState.selectedEvent = evt;
      edb.buildTable(tableWrap, dbState);
      edb.buildSummary(dbState._summaryPanel, evt);
    };

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
};

// ── Pagination ──────────────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase.buildPagination = function(paginationEl, dbState) {
  var edb = window.EventAnnotationsPlot.eventsDatabase;
  paginationEl.innerHTML = '';

  var total = dbState.filteredEvents.length;
  var pageSize = dbState.pageSize;
  var currentPage = dbState.currentPage;
  var totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clamp page
  if (currentPage > totalPages) {
    dbState.currentPage = totalPages;
    currentPage = totalPages;
  }

  var startIdx = (currentPage - 1) * pageSize + 1;
  var endIdx = Math.min(currentPage * pageSize, total);

  // Info text
  var info = document.createElement('div');
  info.className = 'edb-pagination-info';
  if (total > 0) {
    info.textContent = 'Showing ' + startIdx + '-' + endIdx + ' of ' + total + ' events';
  } else {
    info.textContent = 'No events';
  }
  paginationEl.appendChild(info);

  // Controls
  var controls = document.createElement('div');
  controls.className = 'edb-pagination-controls';

  // Page size selector
  var sizeLabel = document.createElement('span');
  sizeLabel.textContent = 'Per page:';
  sizeLabel.style.fontSize = '12px';
  sizeLabel.style.color = '#6c757d';
  controls.appendChild(sizeLabel);

  var sizeSelect = document.createElement('select');
  sizeSelect.className = 'edb-page-size-select';

  [25, 50, 100].forEach(function(size) {
    var opt = document.createElement('option');
    opt.value = size;
    opt.textContent = size;
    if (size === pageSize) opt.selected = true;
    sizeSelect.appendChild(opt);
  });

  sizeSelect.onchange = function() {
    dbState.pageSize = parseInt(sizeSelect.value);
    dbState.currentPage = 1;
    edb.buildTable(dbState._tableWrap, dbState);
    edb.buildPagination(paginationEl, dbState);
  };
  controls.appendChild(sizeSelect);

  // Previous button
  var prevBtn = document.createElement('button');
  prevBtn.className = 'edb-page-btn';
  prevBtn.textContent = '\u2190 Previous';
  prevBtn.disabled = currentPage <= 1;
  prevBtn.onclick = function() {
    if (dbState.currentPage > 1) {
      dbState.currentPage--;
      edb.buildTable(dbState._tableWrap, dbState);
      edb.buildPagination(paginationEl, dbState);
    }
  };
  controls.appendChild(prevBtn);

  // Page indicator
  var pageIndicator = document.createElement('span');
  pageIndicator.style.fontSize = '12px';
  pageIndicator.style.color = '#495057';
  pageIndicator.style.fontWeight = '600';
  pageIndicator.textContent = currentPage + ' / ' + totalPages;
  controls.appendChild(pageIndicator);

  // Next button
  var nextBtn = document.createElement('button');
  nextBtn.className = 'edb-page-btn';
  nextBtn.textContent = 'Next \u2192';
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.onclick = function() {
    if (dbState.currentPage < totalPages) {
      dbState.currentPage++;
      edb.buildTable(dbState._tableWrap, dbState);
      edb.buildPagination(paginationEl, dbState);
    }
  };
  controls.appendChild(nextBtn);

  paginationEl.appendChild(controls);
};

// ── Summary placeholder ─────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase._renderSummaryPlaceholder = function(panel) {
  panel.innerHTML = '';
  var placeholder = document.createElement('div');
  placeholder.className = 'edb-summary-placeholder';
  placeholder.innerHTML =
    '<div class="edb-summary-placeholder-icon">\uD83D\uDCCA</div>' +
    '<div style="font-size:15px;font-weight:600;margin-bottom:4px;">No Event Selected</div>' +
    '<div style="font-size:13px;">Click on a row in the table to see event details and utility cost breakdown.</div>';
  panel.appendChild(placeholder);
};

// ── Summary Panel ───────────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase.buildSummary = function(summaryPanel, evt) {
  var edb = window.EventAnnotationsPlot.eventsDatabase;
  var colors = window.EventAnnotationsPlot.state.detailColors;

  summaryPanel.innerHTML = '';

  if (!evt) {
    edb._renderSummaryPlaceholder(summaryPanel);
    return;
  }

  var totalCost = parseFloat(evt.totalCost) || 0;

  // ── Header: event name + total cost ──────────────────────────────
  var headerDiv = document.createElement('div');
  headerDiv.className = 'edb-summary-header';

  var nameDiv = document.createElement('div');
  nameDiv.className = 'edb-summary-event-name';
  nameDiv.textContent = evt.event || 'Unnamed Event';
  headerDiv.appendChild(nameDiv);

  var totalDiv = document.createElement('div');
  totalDiv.className = 'edb-summary-total-cost';
  totalDiv.textContent = edb.formatCurrency(totalCost);
  headerDiv.appendChild(totalDiv);

  var labelDiv = document.createElement('div');
  labelDiv.className = 'edb-summary-total-label';
  labelDiv.textContent = 'Total Event Utility Cost';
  headerDiv.appendChild(labelDiv);

  summaryPanel.appendChild(headerDiv);

  // ── Scrollable body ─────────────────────────────────────────────
  var body = document.createElement('div');
  body.className = 'edb-summary-body';
  summaryPanel.appendChild(body);

  // ── Info grid ───────────────────────────────────────────────────
  var infoGrid = document.createElement('div');
  infoGrid.className = 'edb-summary-info-grid';

  var infoItems = [];

  if (evt.eventID) {
    infoItems.push({ label: 'Event ID', value: evt.eventID });
  }

  if (evt.eventStart) {
    infoItems.push({ label: 'Start Date', value: edb.formatDate(evt.eventStart) });
  }

  if (evt.eventEnd) {
    infoItems.push({ label: 'End Date', value: edb.formatDate(evt.eventEnd) });
  }

  if (evt.eventSF) {
    var sf = parseFloat(evt.eventSF);
    if (!isNaN(sf)) {
      infoItems.push({ label: 'Event Space', value: sf.toLocaleString() + ' ft\u00B2' });
    }
  }

  // Duration
  if (evt.eventStart && evt.eventEnd) {
    var d1 = new Date(evt.eventStart);
    var d2 = new Date(evt.eventEnd);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      var durMs = d2.getTime() - d1.getTime();
      var durHours = Math.floor(durMs / (1000 * 60 * 60));
      var durStr;
      if (durHours >= 24) {
        var days = Math.floor(durHours / 24);
        var remHours = durHours % 24;
        durStr = days + 'd ' + remHours + 'h';
      } else {
        durStr = durHours + 'h ' + Math.floor((durMs % (1000 * 60 * 60)) / (1000 * 60)) + 'm';
      }
      infoItems.push({ label: 'Duration', value: durStr });
    }
  }

  infoItems.forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'edb-summary-info-item';

    var lbl = document.createElement('div');
    lbl.className = 'edb-summary-info-label';
    lbl.textContent = item.label;
    div.appendChild(lbl);

    var val = document.createElement('div');
    val.className = 'edb-summary-info-value';
    val.textContent = item.value;
    div.appendChild(val);

    infoGrid.appendChild(div);
  });

  body.appendChild(infoGrid);

  // ── Utility cost breakdown ─────────────────────────────────────
  var utilities = [
    {
      name: 'Electric',
      color: colors.electric,
      energyCost: parseFloat(evt.elec_energyCost) || 0,
      demandCost: parseFloat(evt.elec_demandCost) || 0
    },
    {
      name: 'Chilled Water',
      color: colors.chw,
      energyCost: parseFloat(evt.chw_energyCost) || 0,
      demandCost: parseFloat(evt.chw_demandCost) || 0
    },
    {
      name: 'Steam',
      color: colors.steam,
      energyCost: parseFloat(evt.steam_energyCost) || 0,
      demandCost: parseFloat(evt.steam_demandCost) || 0
    },
    {
      name: 'Gas',
      color: colors.gas,
      energyCost: parseFloat(evt.gas_energyCost) || 0,
      demandCost: parseFloat(evt.gas_demandCost) || 0
    }
  ];

  utilities.forEach(function(u) {
    u.total = u.energyCost + u.demandCost;
    u.percent = totalCost > 0 ? Math.round((u.total / totalCost) * 100) : 0;
  });

  var activeUtils = utilities.filter(function(u) { return u.total > 0; });
  activeUtils.sort(function(a, b) { return b.total - a.total; });

  if (activeUtils.length > 0) {
    // Section title
    var chartSection = document.createElement('div');
    chartSection.className = 'edb-chart-section';

    var chartTitle = document.createElement('div');
    chartTitle.className = 'edb-chart-title';
    chartTitle.textContent = 'Utility Cost Breakdown';
    chartSection.appendChild(chartTitle);

    // Mini bar chart (SVG)
    edb.renderMiniBarChart(chartSection, activeUtils, totalCost);

    // Cost cards
    activeUtils.forEach(function(util) {
      var card = document.createElement('div');
      card.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0;';

      var dot = document.createElement('div');
      dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + util.color + ';flex-shrink:0;';
      card.appendChild(dot);

      var info = document.createElement('div');
      info.style.cssText = 'flex:1;';

      var uName = document.createElement('div');
      uName.style.cssText = 'font-size:13px;font-weight:600;color:#2c3e50;';
      uName.textContent = util.name;
      info.appendChild(uName);

      var uDetail = document.createElement('div');
      uDetail.style.cssText = 'font-size:11px;color:#6c757d;';
      uDetail.textContent = 'Energy: ' + edb.formatCurrencyCents(util.energyCost) + ' | Demand: ' + edb.formatCurrencyCents(util.demandCost);
      info.appendChild(uDetail);

      card.appendChild(info);

      var costRight = document.createElement('div');
      costRight.style.cssText = 'text-align:right;flex-shrink:0;';

      var costAmount = document.createElement('div');
      costAmount.style.cssText = 'font-size:14px;font-weight:700;color:' + util.color + ';';
      costAmount.textContent = edb.formatCurrency(util.total);
      costRight.appendChild(costAmount);

      var costPct = document.createElement('div');
      costPct.style.cssText = 'font-size:11px;color:#6c757d;';
      costPct.textContent = util.percent + '%';
      costRight.appendChild(costPct);

      card.appendChild(costRight);
      chartSection.appendChild(card);
    });

    body.appendChild(chartSection);
  } else {
    var noData = document.createElement('div');
    noData.style.cssText = 'text-align:center;padding:24px;color:#adb5bd;font-size:13px;';
    noData.textContent = 'No utility cost data available for this event.';
    body.appendChild(noData);
  }
};

// ── Mini Bar Chart (SVG) ────────────────────────────────────────────────

window.EventAnnotationsPlot.eventsDatabase.renderMiniBarChart = function(container, activeUtils, totalCost) {
  var edb = window.EventAnnotationsPlot.eventsDatabase;
  var barHeight = 28;
  var chartWidth = 320; // We'll use viewBox for scaling
  var svgHeight = barHeight + 8;

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + chartWidth + ' ' + svgHeight);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', svgHeight + 'px');
  svg.style.display = 'block';
  svg.style.marginBottom = '16px';
  svg.style.borderRadius = '6px';
  svg.style.overflow = 'hidden';

  // Background
  var bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', chartWidth);
  bgRect.setAttribute('height', barHeight);
  bgRect.setAttribute('y', '4');
  bgRect.setAttribute('rx', '4');
  bgRect.setAttribute('fill', '#e9ecef');
  svg.appendChild(bgRect);

  var xOffset = 0;

  activeUtils.forEach(function(util) {
    if (totalCost <= 0) return;
    var barWidth = (util.total / totalCost) * chartWidth;

    if (barWidth < 1) return;

    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', xOffset);
    rect.setAttribute('y', '4');
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', util.color);

    // Tooltip title
    var title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = util.name + ': ' + edb.formatCurrency(util.total) + ' (' + util.percent + '%)';
    rect.appendChild(title);

    svg.appendChild(rect);

    // Label inside bar if wide enough
    if (barWidth > 50) {
      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', xOffset + barWidth / 2);
      text.setAttribute('y', 4 + barHeight / 2 + 1);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', '600');
      text.setAttribute('fill', 'white');
      text.textContent = util.percent + '%';
      svg.appendChild(text);
    }

    xOffset += barWidth;
  });

  container.appendChild(svg);
};
