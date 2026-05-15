/**
 * ProjectTracker.js — Tab 1: Kanban / Table / List project tracker
 *
 * Self-contained static view. All state persists in
 * window.EventCostV2.projectTracker.* across tab switches.
 */

window.EventCostV2 = window.EventCostV2 || {};
window.EventCostV2.projectTracker = window.EventCostV2.projectTracker || {};

(function(pt) {

  var _container = null;

  // ── Persistent data (initialised once) ────────────────────────────
  if (!pt._phases) {
    pt._phases = [
      { id:'p1', title:'Data Foundation', color:'#1565c0', tasks:[
        { id:'t1',  name:'Tag all spaces with square footages — Site 2',          status:'pending',  tags:['site2'],              notes:'capacityAmount tag. Site 1 done.' },
        { id:'t2',  name:'Tag all spaces with chwValveRefs — both sites',          status:'pending',  tags:['both','chw'],          notes:'List of AHU refs. New tag.' },
        { id:'t3',  name:'Tag all AHUs with coolingValveMBH',                      status:'pending',  tags:['both','chw'],          notes:'Number with MBH unit on AHU equip.' },
        { id:'t4',  name:'Verify meterRefs completeness — Site 2',                 status:'pending',  tags:['site2','elec'],        notes:'Confirm all spaces have electric meter refs.' },
        { id:'t5',  name:'Completeness audit — run booking table for test events', status:'pending',  tags:['both'],               notes:'Run eventCost_bookings() for 3–5 events, check for nulls.' },
      ]},
      { id:'p2', title:'Validate Functions', color:'#16A34A', tasks:[
        { id:'t6',  name:'Test electric summary — 3–5 events',             status:'pending', tags:['elec','axon'],         notes:'Small, large, multi-site. Check per-site output.' },
        { id:'t7',  name:'Test CHW summary — same events',                 status:'pending', tags:['chw','axon'],          notes:'Check valve load ratios and data quality.' },
        { id:'t8',  name:'Sanity check numbers vs raw meter data',         status:'pending', tags:['both'],                notes:'Ratio should be 10–60% depending on event size.' },
        { id:'t9',  name:'Fix bugs from testing',                          status:'pending', tags:['axon'],                notes:'' },
      ]},
      { id:'p3', title:'Storage & Batch', color:'#7C3AED', tasks:[
        { id:'t10', name:'Write function to commit eventCostResult records', status:'pending', tags:['axon'], notes:'One record per event/site/utility/costType.' },
        { id:'t11', name:'Manually run for test events to populate UI',      status:'pending', tags:['axon'], notes:'5–10 events. Verify with readAll(eventCostResult).' },
        { id:'t12', name:'Write nightly batch task',                         status:'pending', tags:['axon'], notes:'SkySpark task for active/recent events.' },
        { id:'t13', name:'Back-calculate 2024 onward',                       status:'pending', tags:['axon'], notes:'Run in batches. ~80 events/month × ~30 months.' },
      ]},
      { id:'p4', title:'Additional Utilities', color:'#D97706', tasks:[
        { id:'t14', name:'Decide on steam zoning approach',                     status:'pending', tags:['steam','methodology'], notes:'AHU HC / VAV RH. Similar decision to CHW.' },
        { id:'t15', name:'Write eventCost_steam_detail',                        status:'pending', tags:['steam','axon'],        notes:'Depends on zoning decision.' },
        { id:'t16', name:'Write eventCost_gas_detail',                          status:'pending', tags:['gas','axon'],          notes:'Metered like electric or valve-based?' },
        { id:'t17', name:'Decide how water fits',                               status:'pending', tags:['water','methodology'], notes:'Event-attributed or site-level?' },
        { id:'t18', name:'Update booking table — steamValveRefs, gasMeterRefs', status:'pending', tags:['axon','all'],          notes:'New utility branches in eventCost_bookings().' },
      ]},
      { id:'p5', title:'Demand Calculations', color:'#DC2626', tasks:[
        { id:'t19', name:'Define demand methodology — Electric',               status:'pending', tags:['elec','methodology'],        notes:'15-min peak demand shared across concurrent events.' },
        { id:'t20', name:'Define demand methodology — CHW & Steam',            status:'pending', tags:['chw','steam','methodology'], notes:'' },
        { id:'t21', name:'Write demand calculation logic',                     status:'pending', tags:['axon','all'],                notes:'New functions or additions to detail functions.' },
        { id:'t22', name:'Update summary — Usage and Demand costType records', status:'pending', tags:['axon'],                     notes:'' },
      ]},
      { id:'p6', title:'Rate Management', color:'#0891B2', tasks:[
        { id:'t23', name:'Decide where rates live',            status:'pending', tags:['methodology'], notes:'Site tags, lookup table, or config. Currently hardcoded.' },
        { id:'t24', name:'Implement per-site rate lookup',     status:'pending', tags:['axon'],        notes:'Replace hardcoded rates.' },
        { id:'t25', name:'Add TOU rate support for electric',  status:'pending', tags:['elec','axon'], notes:'May not be needed. Evaluate client rate structure.' },
      ]},
      { id:'p7', title:'UI & Testing', color:'#7C3AED', tasks:[
        { id:'t26', name:'Connect V2 tool to real eventCostResult data', status:'pending', tags:['ui'],        notes:'Replace demo/placeholder data.' },
        { id:'t27', name:'Test each tab with real data',                 status:'pending', tags:['ui'],        notes:'All 5 tabs.' },
        { id:'t28', name:'Build data quality audit view',                status:'pending', tags:['axon','ui'], notes:'Quick triage for low-quality events.' },
        { id:'t29', name:'Refine reconciliation tab with bill API',      status:'pending', tags:['ui'],        notes:'Swap placeholder when available.' },
      ]},
      { id:'p8', title:'Cleanup & Docs', color:'#6B7280', tasks:[
        { id:'t30', name:'Implement back-of-house space logic',      status:'pending', tags:['axon','methodology'], notes:'Docks, etc. Separate from bookable spaces.' },
        { id:'t31', name:'Write client-facing documentation',        status:'pending', tags:['all'],                notes:'What the numbers mean, what drives accuracy.' },
        { id:'t32', name:'Remove dead code, consolidate duplicates', status:'pending', tags:['axon'],               notes:'Booking table rebuild, unused variables.' },
      ]}
    ];
  }

  if (!pt._context) {
    pt._context = [
      { id:'fn', title:'Function Architecture',
        html:'<table class="pt-ctx-table"><thead><tr><th>Function</th><th>Purpose</th></tr></thead><tbody>' +
          '<tr><td><code>eventCost_bookings(eventID)</code></td><td>Booking-meter-SF table, all utilities</td></tr>' +
          '<tr><td><code>eventCost_elec_detail(...)</code></td><td>Per-timestamp electric attribution (SF proration)</td></tr>' +
          '<tr><td><code>eventCost_chw_detail(...)</code></td><td>Per-timestamp CHW attribution (valve load proration)</td></tr>' +
          '<tr><td><code>eventCost_summary(eventID, utilityType, ...)</code></td><td>Aggregates detail per site → usage, rate, cost, dataQuality</td></tr>' +
          '<tr><td><code>report_EventsByDate(dates)</code></td><td>Find all overlapping events</td></tr></tbody></table>' },
      { id:'method', title:'Cost Allocation Methodology',
        html:'<h4>Baseline-Plus-Increment</h4><p>Dynamic baseline per meter (OAT, hour, day type). Increment = actual − baseline, clamped to 0. Prorate by SF (electric) or valve load ratio (CHW).</p>' +
          '<h4>Electric</h4><p>SF proration: myEventSF / totalEventSF per timestamp per meter.</p>' +
          '<h4>CHW</h4><p>Two-layer: (1) valve MBH × valve % as share of total active load, (2) SF split when valve serves multiple events.</p>' +
          '<h4>Baseline</h4><p>Daily via <code>view_performanceImprovement_baseloadDashboard()</code>. Hourly = daily / 24. Pre-computed per site.</p>' },
      { id:'tags', title:'Tag Structure',
        html:'<table class="pt-ctx-table"><thead><tr><th>Tag</th><th>On</th><th>Status</th></tr></thead><tbody>' +
          '<tr><td><code>meterRefs</code></td><td>Space</td><td>Existing</td></tr>' +
          '<tr><td><code>chwValveRefs</code></td><td>Space</td><td>Needs tagging</td></tr>' +
          '<tr><td><code>steamValveRefs</code></td><td>Space</td><td>Future</td></tr>' +
          '<tr><td><code>gasMeterRefs</code></td><td>Space</td><td>Future</td></tr>' +
          '<tr><td><code>coolingValveMBH</code></td><td>AHU</td><td>Needs tagging</td></tr>' +
          '<tr><td><code>capacityAmount</code></td><td>Space</td><td>Site 1 done, Site 2 pending</td></tr></tbody></table>' },
      { id:'schema', title:'eventCostResult Schema',
        html:'<table class="pt-ctx-table"><thead><tr><th>Tag</th><th>Type</th></tr></thead><tbody>' +
          '<tr><td><code>eventCostResult</code></td><td>Marker</td></tr>' +
          '<tr><td><code>eventRef</code></td><td>Ref → event</td></tr>' +
          '<tr><td><code>eventID</code></td><td>Number</td></tr>' +
          '<tr><td><code>siteRef</code></td><td>Ref → site</td></tr>' +
          '<tr><td><code>utilityType</code></td><td>"Electric" / "CHW" / "Steam" / "Gas"</td></tr>' +
          '<tr><td><code>costType</code></td><td>"Usage" / "Demand"</td></tr>' +
          '<tr><td><code>usage, rate, cost</code></td><td>Numbers</td></tr>' +
          '<tr><td><code>eventSF, metersUsed</code></td><td>Numbers</td></tr>' +
          '<tr><td><code>calculatedOn</code></td><td>DateTime</td></tr></tbody></table>' +
          '<p style="margin:6px 0 0;font-size:11px;color:#6B7280;">~15k–20k records for 2024 onward. No pre-2024.</p>' },
      { id:'rates', title:'Utility Rates',
        html:'<table class="pt-ctx-table"><thead><tr><th>Utility</th><th>Usage</th><th>Demand</th></tr></thead><tbody>' +
          '<tr><td>Electric</td><td>$0.13/kWh</td><td>TBD</td></tr>' +
          '<tr><td>CHW</td><td>$0.33/ton-hr</td><td>TBD</td></tr>' +
          '<tr><td>Steam</td><td>TBD</td><td>TBD</td></tr>' +
          '<tr><td>Gas</td><td>TBD</td><td>TBD</td></tr></tbody></table>' },
      { id:'done', title:'Completed Items',
        html:'<ul style="padding-left:16px;font-size:12px;line-height:1.8;">' +
          '<li>Methodology design + worked examples</li>' +
          '<li>Booking table function (all utilities)</li>' +
          '<li>Electric detail with baseline subtraction</li>' +
          '<li>CHW detail with valve load proration</li>' +
          '<li>Summary function (utility-agnostic)</li>' +
          '<li>Error/status tracking on CHW</li>' +
          '<li>PowerPoint methodology deliverable</li>' +
          '<li>SKILL.md + process docs</li>' +
          '<li>Tag structure defined</li>' +
          '<li>V2 UI built via Claude Code</li>' +
          '</ul>' }
    ];
  }

  if (pt._activePhaseFilter === undefined) pt._activePhaseFilter = null;
  if (pt._viewMode         === undefined) pt._viewMode         = 'kanban';
  if (pt._drawerOpen       === undefined) pt._drawerOpen       = false;

  // ── Helpers ──────────────────────────────────────────────────────
  function getAllTasks() {
    var out = [];
    pt._phases.forEach(function(p) {
      p.tasks.forEach(function(t) { out.push({ task: t, phase: p }); });
    });
    return out;
  }

  function getFiltered() {
    var all = getAllTasks();
    if (pt._activePhaseFilter) all = all.filter(function(x) { return x.phase.id === pt._activePhaseFilter; });
    return all;
  }

  function getCounts() {
    var all = getAllTasks();
    var d = 0, ip = 0, p = 0;
    all.forEach(function(x) {
      if (x.task.status === 'done')            d++;
      else if (x.task.status === 'in-progress') ip++;
      else p++;
    });
    return { total: all.length, done: d, inProgress: ip, pending: p };
  }

  function findTask(id) {
    for (var i = 0; i < pt._phases.length; i++)
      for (var j = 0; j < pt._phases[i].tasks.length; j++)
        if (pt._phases[i].tasks[j].id === id)
          return { task: pt._phases[i].tasks[j], phase: pt._phases[i] };
    return null;
  }

  function statusBadge(status) {
    var cfg = {
      'pending':     { label:'Pending',     bg:'#F3F4F6', color:'#6B7280' },
      'in-progress': { label:'In Progress', bg:'#FEF3C7', color:'#D97706' },
      'done':        { label:'Done',        bg:'#D1FAE5', color:'#16A34A' }
    };
    var c = cfg[status] || cfg['pending'];
    return '<span class="pt-status-badge" style="background:' + c.bg + ';color:' + c.color + '" ' +
           'onclick="window.__pt_cycleStatus(\'{{ID}}\')" title="Click to advance status">' + c.label + '</span>';
  }

  // ── Global onclick callbacks ──────────────────────────────────────
  window.__pt_filterPhase = function(id) {
    pt._activePhaseFilter = id;
    if (_container) pt.renderTab(_container);
  };

  window.__pt_setViewMode = function(mode) {
    pt._viewMode = mode;
    if (_container) pt.renderTab(_container);
  };

  window.__pt_toggleDrawer = function() {
    pt._drawerOpen = !pt._drawerOpen;
    if (!_container) return;
    var el = _container.querySelector('.pt-context-drawer');
    if (el) el.classList.toggle('pt-context-drawer--open', pt._drawerOpen);
  };

  window.__pt_toggleCtx = function(id) {
    if (!_container) return;
    var body = _container.querySelector('[data-ctx="' + id + '"]');
    var chev = _container.querySelector('[data-chev="' + id + '"]');
    if (body) {
      var open = body.classList.contains('pt-ctx-body--open');
      body.classList.toggle('pt-ctx-body--open', !open);
      if (chev) chev.classList.toggle('pt-ctx-chev--open', !open);
    }
  };

  window.__pt_setStatus = function(taskId, status) {
    var item = findTask(taskId);
    if (item) { item.task.status = status; if (_container) pt.renderTab(_container); }
  };

  window.__pt_cycleStatus = function(taskId) {
    var item = findTask(taskId);
    if (!item) return;
    var seq = ['pending', 'in-progress', 'done'];
    var idx = seq.indexOf(item.task.status);
    item.task.status = seq[(idx + 1) % seq.length];
    if (_container) pt.renderTab(_container);
  };

  // ── View renderers ────────────────────────────────────────────────
  function renderKanban(filtered) {
    var pending    = filtered.filter(function(x) { return x.task.status === 'pending'; });
    var inProgress = filtered.filter(function(x) { return x.task.status === 'in-progress'; });
    var done       = filtered.filter(function(x) { return x.task.status === 'done'; });

    var h = '<div class="pt-board">';
    h += renderColumn('Pending',     '#6B7280', pending,    'pending');
    h += renderColumn('In Progress', '#D97706', inProgress, 'in-progress');
    h += renderColumn('Done',        '#16A34A', done,       'done');
    h += '</div>';
    return h;
  }

  function renderColumn(title, dotColor, items, statusKey) {
    var h = '<div class="pt-column">';
    h += '<div class="pt-column-header"><div class="pt-column-header-left">';
    h += '<div class="pt-column-dot" style="background:' + dotColor + '"></div>';
    h += '<span class="pt-column-title">' + title + '</span></div>';
    h += '<span class="pt-column-count">' + items.length + '</span></div>';
    h += '<div class="pt-column-body" data-status="' + statusKey + '">';
    items.forEach(function(item) {
      h += '<div class="pt-task-card" draggable="true" data-task-id="' + item.task.id + '">';
      h += '<div class="pt-task-phase" style="background:' + item.phase.color + '">' + item.phase.title + '</div>';
      h += '<div class="pt-task-name">' + item.task.name + '</div>';
      if (item.task.notes) h += '<div class="pt-task-notes">' + item.task.notes + '</div>';
      if (item.task.tags && item.task.tags.length) {
        h += '<div class="pt-task-tags">';
        item.task.tags.forEach(function(t) { h += '<span class="pt-tag pt-tag--' + t + '">' + t + '</span>'; });
        h += '</div>';
      }
      h += '</div>';
    });
    h += '</div></div>';
    return h;
  }

  function renderTable(filtered) {
    var h = '<div class="pt-table-wrap">';
    h += '<table class="pt-table">';
    h += '<thead><tr><th>Phase</th><th>Task</th><th>Notes</th><th>Status</th></tr></thead>';
    h += '<tbody>';
    filtered.forEach(function(item) {
      var t = item.task;
      var p = item.phase;
      var badge = statusBadge(t.status).replace('{{ID}}', t.id);
      var tagHtml = (t.tags && t.tags.length)
        ? '<div class="pt-task-tags" style="margin-top:4px;">' +
          t.tags.map(function(tg) { return '<span class="pt-tag pt-tag--' + tg + '">' + tg + '</span>'; }).join('') +
          '</div>'
        : '';
      h += '<tr>';
      h += '<td><span class="pt-table-phase" style="background:' + p.color + '">' + p.title + '</span></td>';
      h += '<td><div class="pt-task-name" style="margin:0;">' + t.name + '</div>' + tagHtml + '</td>';
      h += '<td class="pt-table-notes">' + (t.notes || '') + '</td>';
      h += '<td>' + badge + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
  }

  function renderList(filtered) {
    // Group by phase, preserving phase order
    var phaseMap = {};
    filtered.forEach(function(x) { phaseMap[x.phase.id] = x.phase; });

    var h = '<div class="pt-list-wrap">';
    pt._phases.forEach(function(phase) {
      if (!phaseMap[phase.id]) return;
      var items = filtered.filter(function(x) { return x.phase.id === phase.id; });
      if (!items.length) return;

      h += '<div class="pt-list-phase">';
      h += '<div class="pt-list-phase-header">';
      h += '<span class="pt-column-dot" style="background:' + phase.color + ';display:inline-block;margin-right:8px;"></span>';
      h += '<span class="pt-list-phase-title">' + phase.title + '</span>';
      h += '<span class="pt-column-count" style="margin-left:8px;">' + items.length + '</span>';
      h += '</div>';

      items.forEach(function(item) {
        var t = item.task;
        var badge = statusBadge(t.status).replace('{{ID}}', t.id);
        h += '<div class="pt-list-item">';
        h += '<div class="pt-list-item-main">';
        h += '<div class="pt-task-name" style="margin:0 0 2px;">' + t.name + '</div>';
        if (t.notes) h += '<div class="pt-task-notes" style="margin:0;">' + t.notes + '</div>';
        if (t.tags && t.tags.length) {
          h += '<div class="pt-task-tags" style="margin-top:4px;">';
          t.tags.forEach(function(tg) { h += '<span class="pt-tag pt-tag--' + tg + '">' + tg + '</span>'; });
          h += '</div>';
        }
        h += '</div>';
        h += '<div class="pt-list-item-status">' + badge + '</div>';
        h += '</div>';
      });

      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  // ── renderTab ─────────────────────────────────────────────────────
  pt.renderTab = function(container) {
    _container = container;
    container.style.height   = '100%';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    var counts   = getCounts();
    var pct      = counts.total > 0 ? Math.round(counts.done / counts.total * 100) : 0;
    var filtered = getFiltered();

    var h = '<div class="pt-root">';

    // ── Title bar ────────────────────────────────────────────────
    h += '<div class="pt-title-bar">';
    h += '<div class="pt-title-left"><span class="pt-title-text">Event Cost Calc — Project Tracker</span><span class="pt-subtitle">Indiana Convention Center</span></div>';
    h += '<div class="pt-header-stats">';
    h += '<div class="pt-header-stat"><div class="pt-stat-val">' + counts.done + '</div><div class="pt-stat-lbl">Done</div></div>';
    h += '<div class="pt-header-stat"><div class="pt-stat-val">' + counts.inProgress + '</div><div class="pt-stat-lbl">Active</div></div>';
    h += '<div class="pt-header-stat"><div class="pt-stat-val">' + counts.pending + '</div><div class="pt-stat-lbl">Pending</div></div>';
    h += '<div class="pt-header-divider"></div>';
    h += '<div><div style="font-size:12px;font-weight:600;margin-bottom:3px;">' + pct + '%</div>';
    h += '<div class="pt-progress-outer"><div class="pt-progress-inner" style="width:' + pct + '%"></div></div></div>';
    h += '</div></div>';

    // ── Filter bar ───────────────────────────────────────────────
    h += '<div class="pt-filter-bar">';

    // Phase filters
    h += '<span class="pt-filter-label">Phase:</span>';
    h += '<button class="pt-filter-btn' + (!pt._activePhaseFilter ? ' pt-filter-btn--active' : '') + '" onclick="window.__pt_filterPhase(null)">All</button>';
    pt._phases.forEach(function(p) {
      h += '<button class="pt-filter-btn' + (pt._activePhaseFilter === p.id ? ' pt-filter-btn--active' : '') + '" onclick="window.__pt_filterPhase(\'' + p.id + '\')">' +
        '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + p.color + ';margin-right:4px;vertical-align:middle;"></span>' +
        p.title + '</button>';
    });

    // View toggle (right-aligned)
    h += '<div class="pt-view-toggle">';
    h += '<button class="pt-filter-btn pt-view-btn' + (pt._viewMode === 'kanban' ? ' pt-view-btn--active' : '') + '" onclick="window.__pt_setViewMode(\'kanban\')" title="Kanban">&#9783; Kanban</button>';
    h += '<button class="pt-filter-btn pt-view-btn' + (pt._viewMode === 'table' ? ' pt-view-btn--active' : '') + '" onclick="window.__pt_setViewMode(\'table\')" title="Table">&#8801; Table</button>';
    h += '<button class="pt-filter-btn pt-view-btn' + (pt._viewMode === 'list'  ? ' pt-view-btn--active' : '') + '" onclick="window.__pt_setViewMode(\'list\')"  title="List">&#8226; List</button>';
    h += '</div>';

    h += '</div>'; // .pt-filter-bar

    // ── Content area ─────────────────────────────────────────────
    if (pt._viewMode === 'kanban') {
      h += renderKanban(filtered);
    } else if (pt._viewMode === 'table') {
      h += renderTable(filtered);
    } else {
      h += renderList(filtered);
    }

    // ── Context toggle + drawer ───────────────────────────────────
    h += '<button class="pt-ctx-toggle" onclick="window.__pt_toggleDrawer()" title="Reference & Context">&#9776;</button>';
    h += '<div class="pt-context-drawer' + (pt._drawerOpen ? ' pt-context-drawer--open' : '') + '">';
    h += '<div class="pt-drawer-header"><span class="pt-drawer-title">Reference & Context</span>';
    h += '<button class="pt-drawer-close" onclick="window.__pt_toggleDrawer()">&#10005;</button></div>';
    h += '<div class="pt-drawer-body">';
    pt._context.forEach(function(ctx) {
      h += '<div class="pt-drawer-section">';
      h += '<div class="pt-drawer-section-hd" onclick="window.__pt_toggleCtx(\'' + ctx.id + '\')">';
      h += '<span class="pt-drawer-section-title">' + ctx.title + '</span>';
      h += '<span class="pt-ctx-chev" data-chev="' + ctx.id + '">&#8250;</span></div>';
      h += '<div class="pt-ctx-body" data-ctx="' + ctx.id + '">' + ctx.html + '</div>';
      h += '</div>';
    });
    h += '</div></div>';

    h += '</div>'; // .pt-root

    container.innerHTML = h;

    if (pt._viewMode === 'kanban') attachDragEvents();

    // Explicitly size the content area because height:100% can't resolve when
    // .eap-root uses min-height (not height), breaking the percentage chain.
    requestAnimationFrame(function() {
      if (!_container) return;
      var tabContent = _container.parentElement; // .eap-tab-content (position:relative, flex:1)
      var totalH = (tabContent && tabContent.clientHeight) ? tabContent.clientHeight : window.innerHeight;
      var tb = _container.querySelector('.pt-title-bar');
      var fb = _container.querySelector('.pt-filter-bar');
      var usedH = (tb ? tb.offsetHeight : 0) + (fb ? fb.offsetHeight : 0);
      var contentH = Math.max(200, totalH - usedH);
      var content = _container.querySelector('.pt-board, .pt-table-wrap, .pt-list-wrap');
      if (content) {
        content.style.height = contentH + 'px';
        content.style.flex = 'none';
      }
    });
  };

  // ── Drag & Drop (kanban only) ─────────────────────────────────────
  function attachDragEvents() {
    if (!_container) return;
    var cards   = _container.querySelectorAll('.pt-task-card');
    var columns = _container.querySelectorAll('.pt-column-body');

    cards.forEach(function(card) {
      card.addEventListener('dragstart', function(e) {
        card.classList.add('pt-task-card--dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.getAttribute('data-task-id'));
      });
      card.addEventListener('dragend', function() {
        card.classList.remove('pt-task-card--dragging');
        columns.forEach(function(c) { c.classList.remove('pt-column-body--dragover'); });
      });
    });

    columns.forEach(function(col) {
      col.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('pt-column-body--dragover');
      });
      col.addEventListener('dragleave', function() {
        col.classList.remove('pt-column-body--dragover');
      });
      col.addEventListener('drop', function(e) {
        e.preventDefault();
        col.classList.remove('pt-column-body--dragover');
        var id     = e.dataTransfer.getData('text/plain');
        var status = col.getAttribute('data-status');
        if (id && status) window.__pt_setStatus(id, status);
      });
    });
  }

})(window.EventCostV2.projectTracker);
