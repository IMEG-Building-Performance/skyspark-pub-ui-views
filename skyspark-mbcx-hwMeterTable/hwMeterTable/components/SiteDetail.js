// hwMeterTable/components/SiteDetail.js
//
// Site detail panel — header, KPI strip, and three tabbed views:
//
//   Trends           — SVG line charts grouped by unit (one chart per unit group)
//   Building Metrics — visual comparison cards: measured vs. calculated per metric
//   Data Management  — overlay charts (raw vs. treated) + removed-sample count cards
//
// Tabs lazy-load their data on first activation; results are cached so
// switching tabs does not re-fetch.

window.hwMeterTable = window.hwMeterTable || {};
window.hwMeterTable.components = window.hwMeterTable.components || {};

(function (components) {
  var utils = window.hwMeterTable.utils;

  // ── Color palette ─────────────────────────────────────────────────────────
  var SERIES_COLORS = ['#01538b', '#e07000', '#2e7d32', '#6a1b9a', '#c62828', '#00838f'];
  var RAW_COLOR     = '#c8d8e8';  // original / unfiltered data — light so treated stands out
  var TREATED_COLOR = '#01538b'; // treated / cleaned data — dark, drawn on top

  // ── Shared helpers ────────────────────────────────────────────────────────

  function parseTS(v) {
    if (!v) return null;
    if (typeof v === 'object' && v._kind === 'dateTime') return new Date(v.val).getTime();
    return null;
  }

  function svgEl(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  function fmtAxisTS(ms, spanMs) {
    var d = new Date(ms);
    return spanMs > 3 * 86400000
      ? d.toLocaleDateString(undefined,  { month: 'short', day: 'numeric' })
      : d.toLocaleTimeString(undefined,  { hour: '2-digit', minute: '2-digit' });
  }

  function fmtNum(v, unit) {
    if (v === null || v === undefined) return '\u2014';
    var n = Math.abs(v) >= 100 ? Math.round(v) : parseFloat(v.toFixed(1));
    return n.toLocaleString() + (unit ? '\u00a0' + unit : '');
  }

  function niceInterval(range, ticks) {
    var rough = range / ticks;
    var mag   = Math.pow(10, Math.floor(Math.log10(rough)));
    var norm  = rough / mag;
    return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  }

  function extractNum(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && v._kind === 'number') return v.val;
    return null;
  }

  function extractUnit(v) {
    if (v && typeof v === 'object' && v._kind === 'number') return v.unit || null;
    return null;
  }

  /**
   * Best display name for a history column.
   * Prefer id.dis (unique per point) with the siteRef.dis prefix stripped so
   * the label reads "Hot Water Meter 1 Supply Temperature" rather than
   * "Barrett Hall Hot Water Meter 1  Hot Water Supply Temperature".
   * navName is NOT used as primary because multiple columns in the same unit
   * group often share the same navName (e.g. two "Hot Water kBTU/h" columns).
   */
  function colDis(col) {
    if (!col.meta) return col.name;
    if (col.meta.id && col.meta.id.dis) {
      var dis = col.meta.id.dis;
      if (col.meta.siteRef && col.meta.siteRef.dis) {
        var prefix = col.meta.siteRef.dis + ' ';
        if (dis.indexOf(prefix) === 0) dis = dis.slice(prefix.length);
      }
      return dis.replace(/\s+/g, ' ').trim();
    }
    if (col.meta.navName) return col.meta.navName;
    if (col.meta.dis)     return col.meta.dis;
    return col.name;
  }

  /**
   * Unit string for a history column.
   * col.meta.unit is a plain string ("kBTU/h") set by SkySpark on every
   * hisRead column — more reliable than scanning sparse row values.
   */
  function colUnit(col) {
    if (col.meta && typeof col.meta.unit === 'string') return col.meta.unit;
    return null;
  }

  // ── SVG line chart engine ─────────────────────────────────────────────────
  // Returns a .hw-chart-card element containing title + SVG + hover tooltip.
  // series: [{ name, color, unit, values: [number|null] }]

  function buildChart(timestamps, series, chartTitle) {
    var wrap = document.createElement('div');
    wrap.className = 'hw-chart-card';

    if (chartTitle) {
      var ttl = document.createElement('div');
      ttl.className   = 'hw-chart-card-title';
      ttl.textContent = chartTitle;
      wrap.appendChild(ttl);
    }

    var area = document.createElement('div');
    area.className      = 'hw-chart-area';
    area.style.position = 'relative';
    wrap.appendChild(area);

    var validTS = timestamps.filter(Boolean);
    var allVals = [];
    series.forEach(function (s) {
      s.values.forEach(function (v) { if (v !== null) allVals.push(v); });
    });

    if (validTS.length < 2 || !allVals.length) {
      var msg = document.createElement('div');
      msg.className   = 'hw-chart-empty';
      msg.textContent = 'No data.';
      area.appendChild(msg);
      return wrap;
    }

    var tMin = Math.min.apply(null, validTS);
    var tMax = Math.max.apply(null, validTS);
    var tSpan = tMax - tMin;
    var vMin = Math.min.apply(null, allVals);
    var vMax = Math.max.apply(null, allVals);
    var vRange    = vMax - vMin || 1;
    var yInterval = niceInterval(vRange * 1.2, 5);
    var yAxisMin  = Math.floor((vMin - vRange * 0.05) / yInterval) * yInterval;
    var yAxisMax  = Math.ceil( (vMax + vRange * 0.05) / yInterval) * yInterval;

    var yTicks = [];
    for (var yt = yAxisMin; yt <= yAxisMax + 1e-9; yt += yInterval) {
      yTicks.push(parseFloat(yt.toFixed(10)));
    }
    var xTicks = [];
    for (var xi = 0; xi <= 5; xi++) xTicks.push(tMin + tSpan * xi / 5);

    var W = 900, H = 260, ML = 66, MR = 20, MT = 14, MB = 40;
    var plotW = W - ML - MR, plotH = H - MT - MB;

    function xs(t) { return ML + (t - tMin) / tSpan * plotW; }
    function ys(v) { return MT + plotH - (v - yAxisMin) / (yAxisMax - yAxisMin) * plotH; }

    var svg = svgEl('svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('class', 'hw-chart-svg');

    // Y grid + labels
    var gridG = svgEl('g'); gridG.setAttribute('class', 'hw-chart-grid');
    var yLblG = svgEl('g'); yLblG.setAttribute('class', 'hw-chart-y-labels');
    yTicks.forEach(function (yv) {
      var yy = ys(yv);
      var gl = svgEl('line');
      gl.setAttribute('x1', ML); gl.setAttribute('y1', yy);
      gl.setAttribute('x2', ML + plotW); gl.setAttribute('y2', yy);
      gridG.appendChild(gl);
      var lbl = svgEl('text');
      lbl.setAttribute('x', ML - 7); lbl.setAttribute('y', yy + 4);
      lbl.setAttribute('text-anchor', 'end');
      lbl.textContent = (Math.abs(yv) >= 100 ? Math.round(yv) : parseFloat(yv.toFixed(1))).toLocaleString();
      yLblG.appendChild(lbl);
    });
    svg.appendChild(gridG);
    svg.appendChild(yLblG);

    // Y unit label
    var yUnit = series[0].unit;
    if (yUnit) {
      var uLbl = svgEl('text');
      uLbl.setAttribute('class', 'hw-chart-unit-label');
      uLbl.setAttribute('x', 12); uLbl.setAttribute('y', MT + plotH / 2);
      uLbl.setAttribute('text-anchor', 'middle');
      uLbl.setAttribute('transform', 'rotate(-90, 12, ' + (MT + plotH / 2) + ')');
      uLbl.textContent = yUnit;
      svg.appendChild(uLbl);
    }

    // X axis baseline
    var axLine = svgEl('line');
    axLine.setAttribute('class', 'hw-chart-axis');
    axLine.setAttribute('x1', ML); axLine.setAttribute('y1', MT + plotH);
    axLine.setAttribute('x2', ML + plotW); axLine.setAttribute('y2', MT + plotH);
    svg.appendChild(axLine);

    // X labels
    var xLblG = svgEl('g'); xLblG.setAttribute('class', 'hw-chart-x-labels');
    xTicks.forEach(function (tv) {
      var xt = svgEl('text');
      xt.setAttribute('x', xs(tv)); xt.setAttribute('y', H - 4);
      xt.setAttribute('text-anchor', 'middle');
      xt.textContent = fmtAxisTS(tv, tSpan);
      xLblG.appendChild(xt);
    });
    svg.appendChild(xLblG);

    // Data polylines
    series.forEach(function (s) {
      var pts = [];
      for (var i = 0; i < timestamps.length; i++) {
        if (timestamps[i] !== null && s.values[i] !== null) {
          pts.push(xs(timestamps[i]).toFixed(1) + ',' + ys(s.values[i]).toFixed(1));
        }
      }
      if (pts.length < 2) return;
      var poly = svgEl('polyline');
      poly.setAttribute('class', 'hw-chart-line');
      poly.setAttribute('points', pts.join(' '));
      poly.setAttribute('stroke', s.color);
      svg.appendChild(poly);
    });

    // Legend
    var legG = svgEl('g'); legG.setAttribute('class', 'hw-chart-legend');
    var lx = ML + 10, ly = MT + 14;
    series.forEach(function (s) {
      var sw = svgEl('rect');
      sw.setAttribute('x', lx); sw.setAttribute('y', ly - 10);
      sw.setAttribute('width', 16); sw.setAttribute('height', 10);
      sw.setAttribute('rx', 2); sw.setAttribute('fill', s.color);
      legG.appendChild(sw);
      var lt = svgEl('text');
      lt.setAttribute('x', lx + 22); lt.setAttribute('y', ly);
      lt.setAttribute('class', 'hw-chart-legend-text');
      lt.textContent = s.name;
      legG.appendChild(lt);
      ly += 20;
    });
    svg.appendChild(legG);

    // Crosshair
    var crosshair = svgEl('line');
    crosshair.setAttribute('class', 'hw-chart-crosshair');
    crosshair.style.display = 'none';
    svg.appendChild(crosshair);

    // Hover overlay
    var overlay = svgEl('rect');
    overlay.setAttribute('x', ML); overlay.setAttribute('y', MT);
    overlay.setAttribute('width', plotW); overlay.setAttribute('height', plotH);
    overlay.setAttribute('fill', 'transparent');
    overlay.setAttribute('class', 'hw-chart-overlay');

    var tooltip = document.createElement('div');
    tooltip.className     = 'hw-chart-tooltip';
    tooltip.style.display = 'none';
    area.appendChild(tooltip);

    var tooltipPinned = false;

    function nearestIdx(e) {
      var rect = svg.getBoundingClientRect();
      var svgX = ((e.clientX - rect.left) / rect.width) * W;
      var t    = tMin + Math.max(0, Math.min(1, (svgX - ML) / plotW)) * tSpan;
      var best = 0, bestDist = Infinity;
      timestamps.forEach(function (ts, i) {
        if (ts === null) return;
        var d = Math.abs(ts - t);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    function showTooltip(e, idx) {
      var nx = xs(timestamps[idx]);
      crosshair.setAttribute('x1', nx); crosshair.setAttribute('y1', MT);
      crosshair.setAttribute('x2', nx); crosshair.setAttribute('y2', MT + plotH);
      crosshair.style.display = '';

      var tsLabel = new Date(timestamps[idx]).toLocaleString(undefined,
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      var lines = ['<strong>' + tsLabel + '</strong>'];
      series.forEach(function (s) {
        var dot = '<span style="color:' + s.color + ';font-size:16px;line-height:0.5">&#9679;</span> ';
        lines.push(dot + s.name + ': ' + fmtNum(s.values[idx], s.unit));
      });
      tooltip.innerHTML     = lines.join('<br>');
      tooltip.style.display = 'block';

      var cRect = area.getBoundingClientRect();
      var tx = e.clientX - cRect.left + 14;
      var ty = e.clientY - cRect.top  - 14;
      if (tx + (tooltip.offsetWidth || 180) > cRect.width - 4) tx = tx - (tooltip.offsetWidth || 180) - 28;
      tooltip.style.left = tx + 'px';
      tooltip.style.top  = ty + 'px';
    }

    // Crosshair follows mouse; tooltip only appears on click
    overlay.addEventListener('mousemove', function (e) {
      var idx = nearestIdx(e);
      var nx  = xs(timestamps[idx]);
      crosshair.setAttribute('x1', nx); crosshair.setAttribute('y1', MT);
      crosshair.setAttribute('x2', nx); crosshair.setAttribute('y2', MT + plotH);
      crosshair.style.display = '';
      if (tooltipPinned) showTooltip(e, idx); // update pinned tooltip position while moving
    });

    overlay.addEventListener('click', function (e) {
      var idx = nearestIdx(e);
      if (tooltipPinned) {
        tooltipPinned = false;
        tooltip.style.display = 'none';
      } else {
        tooltipPinned = true;
        showTooltip(e, idx);
      }
    });

    overlay.addEventListener('mouseleave', function () {
      crosshair.style.display = 'none';
      if (!tooltipPinned) tooltip.style.display = 'none';
    });
    svg.appendChild(overlay);
    area.appendChild(svg);

    return wrap;
  }

  // ── Trends tab ────────────────────────────────────────────────────────────
  // Groups value columns by unit; renders one chart per group in a 2-col grid.

  function renderTrends(pane, grid) {
    var cols = grid.cols || [];
    var rows = grid.rows || [];
    var valCols = cols.filter(function (c) { return c.name !== 'ts'; });

    if (!valCols.length) {
      pane.innerHTML = '<div class="hw-chart-empty">No meter points found for this site. ' +
        'Verify <code>view_pubUI_helper_DetailPage</code> includes this site\'s equipment.</div>';
      return;
    }
    if (!rows.length) {
      pane.innerHTML = '<div class="hw-chart-empty">No data in the selected date range. ' +
        'Try a past period such as <em>lastMonth</em> or <em>lastQuarter</em>.</div>';
      return;
    }

    var timestamps = rows.map(function (r) { return parseTS(r.ts); });

    var seriesList = valCols.map(function (col, idx) {
      // Unit: prefer col.meta.unit (always present on hisRead cols); fall back
      // to scanning row values for grids that don't carry it on the column.
      var unit = colUnit(col);
      var values = rows.map(function (r) {
        var v = r[col.name];
        if (!unit) unit = extractUnit(v);
        return extractNum(v);
      });
      return {
        name:   colDis(col),
        unit:   unit,
        values: values,
        color:  SERIES_COLORS[idx % SERIES_COLORS.length]
      };
    });

    // Group by unit — produces one chart per unit (kBTU/h, °F, gal/min, kBTU, …)
    var groups = {}, groupOrder = [];
    seriesList.forEach(function (s) {
      var key = s.unit || 'Other';
      if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
      groups[key].push(s);
    });

    var chartGrid = document.createElement('div');
    chartGrid.className = 'hw-chart-grid-2col';
    pane.appendChild(chartGrid);

    groupOrder.forEach(function (unitKey) {
      chartGrid.appendChild(buildChart(timestamps, groups[unitKey], unitKey));
    });
  }

  // ── Data Management tab ───────────────────────────────────────────────────
  // Groups columns by unit; pairs original vs treated series per group.
  // Shows removed-sample count cards above full-width overlay charts.

  function renderDataManagement(pane, grid, siteName) {
    var cols = grid.cols || [];
    var rows = grid.rows || [];
    var valCols = cols.filter(function (c) { return c.name !== 'ts'; });

    if (!valCols.length || !rows.length) {
      pane.innerHTML = '<div class="hw-chart-empty">No data management data returned.</div>';
      return;
    }

    var timestamps = rows.map(function (r) { return parseTS(r.ts); });

    var seriesList = valCols.map(function (col) {
      var unit = colUnit(col);
      var values = rows.map(function (r) {
        var v = r[col.name];
        if (!unit) unit = extractUnit(v);
        return extractNum(v);
      });
      var lname = col.name.toLowerCase();
      var dis   = colDis(col).toLowerCase();
      var isRaw = lname.indexOf('raw') !== -1 || lname.indexOf('orig') !== -1 || lname.indexOf('untreat') !== -1
               || dis.indexOf('raw')  !== -1 || dis.indexOf('orig')  !== -1 || dis.indexOf('untreat')  !== -1;
      return {
        name:    colDis(col),
        colName: col.name,
        unit:    unit,
        values:  values,
        isRaw:   isRaw
      };
    });

    // Group by unit
    var groups = {}, groupOrder = [];
    seriesList.forEach(function (s) {
      var key = s.unit || 'Other';
      if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
      groups[key].push(s);
    });

    // ── Pair helper: heuristic first, positional fallback ────────────────
    function pairGroup(group) {
      var rawCandidates     = group.filter(function (s) { return  s.isRaw; });
      var treatedCandidates = group.filter(function (s) { return !s.isRaw; });
      if (rawCandidates.length > 0 && treatedCandidates.length > 0) {
        return { rawS: rawCandidates[0], treatedS: treatedCandidates[0] };
      }
      if (group.length >= 2) {
        return { rawS: group[0], treatedS: group[1] };
      }
      return null;
    }

    // ── Removed-sample summary cards ─────────────────────────────────────
    var summaryStrip = document.createElement('div');
    summaryStrip.className = 'hw-kpi-strip';

    groupOrder.forEach(function (unitKey) {
      var group = groups[unitKey];
      var pair  = pairGroup(group);
      if (!pair) return;
      var rawS = pair.rawS, treatedS = pair.treatedS;

      var rawCount     = rawS.values.filter(    function (v) { return v !== null; }).length;
      var treatedCount = treatedS.values.filter(function (v) { return v !== null; }).length;
      var removed      = Math.max(0, rawCount - treatedCount);

      var card = document.createElement('div');
      card.className = 'hw-kpi-card hw-kpi-card-removed';

      var valEl = document.createElement('div');
      valEl.className   = 'hw-kpi-value';
      valEl.textContent = removed.toLocaleString();

      var lblEl = document.createElement('div');
      lblEl.className   = 'hw-kpi-label';
      lblEl.textContent = 'Samples removed\u00a0(' + unitKey + ')';

      var subEl = document.createElement('div');
      subEl.className   = 'hw-kpi-sublabel';
      subEl.textContent = rawCount.toLocaleString() + ' original \u2192 ' + treatedCount.toLocaleString() + ' treated';

      card.appendChild(valEl);
      card.appendChild(lblEl);
      card.appendChild(subEl);
      summaryStrip.appendChild(card);
    });

    if (summaryStrip.children.length > 0) pane.appendChild(summaryStrip);

    // ── Overlay charts — full-width one per unit ──────────────────────────
    var chartGrid = document.createElement('div');
    chartGrid.className = 'hw-chart-grid-1col';
    pane.appendChild(chartGrid);

    groupOrder.forEach(function (unitKey) {
      var group  = groups[unitKey];
      var pair   = pairGroup(group);
      var prefix = siteName ? siteName + ' ' : '';
      var pairedSeries;
      if (pair) {
        // Original drawn first (behind, light); Treated drawn second (on top, dark)
        pairedSeries = [
          { name: prefix + 'Original Data', unit: pair.rawS.unit,     values: pair.rawS.values,     color: RAW_COLOR     },
          { name: prefix + 'Treated Data',  unit: pair.treatedS.unit, values: pair.treatedS.values, color: TREATED_COLOR }
        ];
      } else {
        pairedSeries = group.map(function (s, i) {
          return { name: s.name, unit: s.unit, values: s.values, color: SERIES_COLORS[i % SERIES_COLORS.length] };
        });
      }

      chartGrid.appendChild(buildChart(timestamps, pairedSeries, unitKey));
    });
  }

  // ── Tab definitions ───────────────────────────────────────────────────────

  // TABS is built per-render so renderDataManagement gets opts.siteName via closure
  function buildTabs(siteName) {
    return [
      { key: 'Trends',          label: 'Trends',          render: renderTrends },
      { key: 'Data Management', label: 'Data Management', render: function (pane, grid) {
          renderDataManagement(pane, grid, siteName);
        }
      }
    ];
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Render the site detail panel into `container`.
   *
   * @param {HTMLElement} container
   * @param {Object}      opts  — { siteId, siteName, rowData, visibleCols,
   *                               attestKey, projectName, dates }
   * @param {Function}    onBack
   */
  components.renderSiteDetail = function (container, opts, onBack) {
    container.innerHTML = '';

    var evals = window.hwMeterTable.evals;

    // ── Header ──────────────────────────────────────────────────────────────
    var header = document.createElement('div');
    header.className = 'hw-detail-header';

    var backBtn = document.createElement('button');
    backBtn.className   = 'hw-back-btn';
    backBtn.textContent = '\u2190 All Sites';
    backBtn.addEventListener('click', onBack);

    var titleEl = document.createElement('div');
    titleEl.className   = 'hw-detail-title';
    titleEl.textContent = opts.siteName || 'Site Detail';

    header.appendChild(backBtn);
    header.appendChild(titleEl);
    container.appendChild(header);

    // ── Site KPI cards (from in-memory summary row) ─────────────────────────
    if (opts.rowData && opts.visibleCols && opts.visibleCols.length) {
      var kpiStrip = document.createElement('div');
      kpiStrip.className = 'hw-kpi-strip';

      opts.visibleCols.forEach(function (col) {
        if (col.name === 'id') return;
        var raw    = opts.rowData[col.name];
        var numVal = extractNum(raw);
        if (numVal === null) return;
        var unit   = extractUnit(raw) || '';

        var card = document.createElement('div');
        card.className = 'hw-kpi-card';

        var valEl = document.createElement('div');
        valEl.className   = 'hw-kpi-value';
        valEl.textContent = Math.round(numVal).toLocaleString() + (unit ? '\u00a0' + unit : '');

        var lblEl = document.createElement('div');
        lblEl.className   = 'hw-kpi-label';
        lblEl.textContent = (col.meta && col.meta.dis) ? col.meta.dis : col.name;

        card.appendChild(valEl);
        card.appendChild(lblEl);
        kpiStrip.appendChild(card);
      });

      if (kpiStrip.children.length > 0) container.appendChild(kpiStrip);
    }

    // ── Tab bar ─────────────────────────────────────────────────────────────
    var tabBar = document.createElement('div');
    tabBar.className = 'hw-tab-bar';
    container.appendChild(tabBar);

    var tabPane = document.createElement('div');
    tabPane.className = 'hw-tab-pane';
    container.appendChild(tabPane);

    // Per-tab data cache
    var tabCache  = {};
    var activeKey = null;

    function activateTab(tabKey) {
      if (activeKey === tabKey) return;
      activeKey = tabKey;

      tabBar.querySelectorAll('.hw-tab-btn').forEach(function (btn) {
        btn.classList.toggle('hw-tab-btn-active', btn.dataset.tab === tabKey);
      });

      tabPane.innerHTML = '';

      var tab = TABS.find(function (t) { return t.key === tabKey; }); // TABS is in enclosing scope
      if (!tab) return;

      // Serve from cache
      if (tabCache[tabKey]) {
        if (tabCache[tabKey] instanceof Error) {
          showTabError(tabPane, tab.label, tabCache[tabKey]);
        } else {
          tab.render(tabPane, tabCache[tabKey]);
        }
        return;
      }

      // First activation — fetch
      var loadEl = document.createElement('div');
      loadEl.className   = 'hw-table-loading';
      loadEl.textContent = 'Loading ' + tab.label + '\u2026';
      tabPane.appendChild(loadEl);

      var promise;
      try {
        promise = evals.loadDetailPage(opts.attestKey, opts.projectName, opts.siteId, opts.dates, tabKey);
      } catch (syncErr) {
        // evals.loadDetailPage not defined (module not loaded) or other sync throw
        console.error('[hwMeterTable] Detail tab "' + tabKey + '" sync error:', syncErr);
        tabCache[tabKey] = syncErr;
        tabPane.innerHTML = '';
        showTabError(tabPane, tab.label, syncErr);
        return;
      }

      promise
        .then(function (grid) {
          tabCache[tabKey] = grid;
          if (activeKey !== tabKey) return;
          tabPane.innerHTML = '';
          tab.render(tabPane, grid);
        })
        .catch(function (err) {
          console.error('[hwMeterTable] Detail tab "' + tabKey + '" error:', err);
          tabCache[tabKey] = err;
          if (activeKey !== tabKey) return;
          tabPane.innerHTML = '';
          showTabError(tabPane, tab.label, err);
        });
    }

    function showTabError(pane, label, err) {
      var el = document.createElement('div');
      el.className   = 'hw-table-error';
      el.textContent = 'Error loading ' + label + ': ' + err.message;
      pane.appendChild(el);
    }

    var TABS = buildTabs(opts.siteName);

    TABS.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.className   = 'hw-tab-btn';
      btn.textContent = tab.label;
      btn.dataset.tab = tab.key;
      btn.addEventListener('click', function () { activateTab(tab.key); });
      tabBar.appendChild(btn);
    });

    activateTab(TABS[0].key);
  };

})(window.hwMeterTable.components);
