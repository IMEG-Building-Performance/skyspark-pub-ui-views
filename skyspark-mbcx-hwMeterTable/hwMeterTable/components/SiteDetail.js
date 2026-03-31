// hwMeterTable/components/SiteDetail.js
//
// Renders the site detail panel: a header with a back button, site-specific
// KPI cards pulled from the already-loaded summary row, and a time-series
// SVG line chart of the raw hot water meter history.
//
// Chart features:
//   - One polyline per history point (column in the hisRead grid)
//   - Nice Y-axis bounds and grid lines
//   - X-axis timestamps formatted for the span (daily vs. sub-day)
//   - Hover crosshair with a floating tooltip showing all series values
//   - Color-coded legend when more than one series is present

window.hwMeterTable = window.hwMeterTable || {};
window.hwMeterTable.components = window.hwMeterTable.components || {};

(function (components) {
  var utils = window.hwMeterTable.utils;

  // IMEG-aligned palette for chart lines
  var CHART_COLORS = ['#01538b', '#e07000', '#2e7d32', '#6a1b9a', '#c62828', '#00838f'];

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Parse a Haystack DateTime value to milliseconds since epoch. */
  function parseTS(v) {
    if (!v) return null;
    if (typeof v === 'object' && v._kind === 'dateTime') return new Date(v.val).getTime();
    return null;
  }

  /** Create an element in the SVG namespace. */
  function svgEl(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  /** Format a timestamp for an axis tick label given the overall span. */
  function fmtAxisTS(ms, spanMs) {
    var d = new Date(ms);
    if (spanMs > 3 * 86400000) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  /** Format a numeric value for tooltip display. */
  function fmtVal(v, unit) {
    if (v === null || v === undefined) return '\u2014';
    var n = Math.abs(v) >= 100 ? Math.round(v) : parseFloat(v.toFixed(1));
    return n.toLocaleString() + (unit ? '\u00a0' + unit : '');
  }

  /**
   * Choose a nice round tick interval for a given range and target tick count.
   * Produces intervals like 1, 2, 5, 10, 20, 50, 100, …
   */
  function niceInterval(range, targetTicks) {
    var rough = range / targetTicks;
    var mag   = Math.pow(10, Math.floor(Math.log10(rough)));
    var norm  = rough / mag;
    var nice  = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return nice * mag;
  }

  // ── SVG chart ─────────────────────────────────────────────────────────────

  /**
   * Render a time-series SVG line chart into `container`.
   *
   * @param {HTMLElement} container  - DOM element to render into
   * @param {Object}      histGrid   - Haystack grid: ts column + ≥1 value column
   */
  function renderChart(container, histGrid) {
    var cols = histGrid.cols || [];
    var rows = histGrid.rows || [];

    // Partition columns into ts and value series
    var valCols = cols.filter(function (c) { return c.name !== 'ts'; });

    if (!cols.some(function (c) { return c.name === 'ts'; }) ||
        rows.length === 0 || valCols.length === 0) {
      var msg = document.createElement('div');
      msg.className   = 'hw-chart-empty';
      msg.textContent = 'No history data found for this site.';
      container.appendChild(msg);
      return;
    }

    // Extract timestamps
    var timestamps = rows.map(function (r) { return parseTS(r.ts); });

    // Build series objects
    var series = valCols.map(function (col, idx) {
      var unit   = null;
      var values = rows.map(function (r) {
        var v = r[col.name];
        if (v === null || v === undefined) return null;
        if (typeof v === 'object' && v._kind === 'number') {
          if (!unit && v.unit) unit = v.unit;
          return v.val;
        }
        if (typeof v === 'number') return v;
        return null;
      });
      var dis = (col.meta && col.meta.dis) ? col.meta.dis : col.name;
      return { name: dis, unit: unit, values: values, color: CHART_COLORS[idx % CHART_COLORS.length] };
    });

    // ── Compute extents ───────────────────────────────────────────────────
    var validTS = timestamps.filter(Boolean);
    if (validTS.length < 2) {
      var insuffEl = document.createElement('div');
      insuffEl.className   = 'hw-chart-empty';
      insuffEl.textContent = 'Insufficient data points to plot.';
      container.appendChild(insuffEl);
      return;
    }

    var tMin = Math.min.apply(null, validTS);
    var tMax = Math.max.apply(null, validTS);
    var tSpan = tMax - tMin;

    var allVals = [];
    series.forEach(function (s) {
      s.values.forEach(function (v) { if (v !== null) allVals.push(v); });
    });
    if (!allVals.length) {
      var noNumEl = document.createElement('div');
      noNumEl.className   = 'hw-chart-empty';
      noNumEl.textContent = 'No numeric values to plot.';
      container.appendChild(noNumEl);
      return;
    }

    var vMin = Math.min.apply(null, allVals);
    var vMax = Math.max.apply(null, allVals);

    // Nice Y bounds
    var vRange    = vMax - vMin || 1;
    var yInterval = niceInterval(vRange * 1.2, 6);
    var yAxisMin  = Math.floor((vMin - vRange * 0.05) / yInterval) * yInterval;
    var yAxisMax  = Math.ceil( (vMax + vRange * 0.05) / yInterval) * yInterval;

    var yTicks = [];
    for (var yt = yAxisMin; yt <= yAxisMax + 1e-9; yt += yInterval) {
      yTicks.push(parseFloat(yt.toFixed(10)));
    }

    // X ticks: 5–7 evenly spaced
    var xTickCount = Math.min(7, Math.max(4, Math.floor(760 / 110)));
    var xTicks = [];
    for (var xi = 0; xi <= xTickCount; xi++) {
      xTicks.push(tMin + tSpan * xi / xTickCount);
    }

    // ── SVG layout constants ──────────────────────────────────────────────
    var W  = 900, H  = 300;
    var ML = 72,  MR = 24, MT = 16, MB = 46;
    var plotW = W - ML - MR;
    var plotH = H - MT - MB;

    function xScale(t) { return ML + (t - tMin) / tSpan * plotW; }
    function yScale(v) { return MT + plotH - (v - yAxisMin) / (yAxisMax - yAxisMin) * plotH; }

    // ── Build SVG ─────────────────────────────────────────────────────────
    var svg = svgEl('svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('class', 'hw-chart-svg');

    // Y grid lines + labels
    var gridG    = svgEl('g'); gridG.setAttribute('class', 'hw-chart-grid');
    var yLabelG  = svgEl('g'); yLabelG.setAttribute('class', 'hw-chart-y-labels');

    yTicks.forEach(function (yv) {
      var yy = yScale(yv);

      var gl = svgEl('line');
      gl.setAttribute('x1', ML);       gl.setAttribute('y1', yy);
      gl.setAttribute('x2', ML + plotW); gl.setAttribute('y2', yy);
      gridG.appendChild(gl);

      var label = svgEl('text');
      label.setAttribute('x', ML - 8);
      label.setAttribute('y', yy + 4);
      label.setAttribute('text-anchor', 'end');
      var n = Math.abs(yv) >= 100 ? Math.round(yv) : parseFloat(yv.toFixed(1));
      label.textContent = n.toLocaleString();
      yLabelG.appendChild(label);
    });

    svg.appendChild(gridG);
    svg.appendChild(yLabelG);

    // Y unit label (rotated)
    var yUnit = series[0].unit;
    if (yUnit) {
      var unitLbl = svgEl('text');
      unitLbl.setAttribute('class', 'hw-chart-unit-label');
      unitLbl.setAttribute('x', 13);
      unitLbl.setAttribute('y', MT + plotH / 2);
      unitLbl.setAttribute('text-anchor', 'middle');
      unitLbl.setAttribute('transform', 'rotate(-90, 13, ' + (MT + plotH / 2) + ')');
      unitLbl.textContent = yUnit;
      svg.appendChild(unitLbl);
    }

    // X axis baseline
    var axisLine = svgEl('line');
    axisLine.setAttribute('class', 'hw-chart-axis');
    axisLine.setAttribute('x1', ML);       axisLine.setAttribute('y1', MT + plotH);
    axisLine.setAttribute('x2', ML + plotW); axisLine.setAttribute('y2', MT + plotH);
    svg.appendChild(axisLine);

    // X tick labels
    var xLabelG = svgEl('g'); xLabelG.setAttribute('class', 'hw-chart-x-labels');
    xTicks.forEach(function (tv) {
      var xt = svgEl('text');
      xt.setAttribute('x', xScale(tv));
      xt.setAttribute('y', H - 6);
      xt.setAttribute('text-anchor', 'middle');
      xt.textContent = fmtAxisTS(tv, tSpan);
      xLabelG.appendChild(xt);
    });
    svg.appendChild(xLabelG);

    // Data polylines
    series.forEach(function (s) {
      var pts = [];
      for (var i = 0; i < timestamps.length; i++) {
        if (timestamps[i] !== null && s.values[i] !== null) {
          pts.push(xScale(timestamps[i]).toFixed(1) + ',' + yScale(s.values[i]).toFixed(1));
        }
      }
      if (pts.length < 2) return;

      var line = svgEl('polyline');
      line.setAttribute('class', 'hw-chart-line');
      line.setAttribute('points', pts.join(' '));
      line.setAttribute('stroke', s.color);
      svg.appendChild(line);
    });

    // Legend (only when multiple series)
    if (series.length > 1) {
      var legendG = svgEl('g');
      legendG.setAttribute('class', 'hw-chart-legend');
      var lx = ML + 10, ly = MT + 14;

      series.forEach(function (s) {
        var swatch = svgEl('rect');
        swatch.setAttribute('x', lx); swatch.setAttribute('y', ly - 10);
        swatch.setAttribute('width', 16); swatch.setAttribute('height', 10);
        swatch.setAttribute('rx', 2);
        swatch.setAttribute('fill', s.color);
        legendG.appendChild(swatch);

        var lText = svgEl('text');
        lText.setAttribute('x', lx + 22);
        lText.setAttribute('y', ly);
        lText.setAttribute('class', 'hw-chart-legend-text');
        lText.textContent = s.name;
        legendG.appendChild(lText);

        ly += 20;
      });
      svg.appendChild(legendG);
    }

    // Crosshair line (hidden until hover)
    var crosshair = svgEl('line');
    crosshair.setAttribute('class', 'hw-chart-crosshair');
    crosshair.setAttribute('x1', ML); crosshair.setAttribute('y1', MT);
    crosshair.setAttribute('x2', ML); crosshair.setAttribute('y2', MT + plotH);
    crosshair.style.display = 'none';
    svg.appendChild(crosshair);

    // Transparent overlay rect for mouse events
    var overlay = svgEl('rect');
    overlay.setAttribute('x', ML); overlay.setAttribute('y', MT);
    overlay.setAttribute('width', plotW); overlay.setAttribute('height', plotH);
    overlay.setAttribute('fill', 'transparent');
    overlay.setAttribute('class', 'hw-chart-overlay');

    // Floating HTML tooltip (positioned relative to container)
    var tooltip = document.createElement('div');
    tooltip.className    = 'hw-chart-tooltip';
    tooltip.style.display = 'none';
    container.style.position = 'relative';
    container.appendChild(tooltip);

    overlay.addEventListener('mousemove', function (e) {
      var svgRect = svg.getBoundingClientRect();
      var svgX    = ((e.clientX - svgRect.left) / svgRect.width) * W;
      var t       = tMin + Math.max(0, Math.min(1, (svgX - ML) / plotW)) * tSpan;

      // Find nearest timestamp index
      var nearIdx = 0, nearDist = Infinity;
      timestamps.forEach(function (ts, i) {
        if (ts === null) return;
        var d = Math.abs(ts - t);
        if (d < nearDist) { nearDist = d; nearIdx = i; }
      });

      var nearX = xScale(timestamps[nearIdx]);
      crosshair.setAttribute('x1', nearX); crosshair.setAttribute('y1', MT);
      crosshair.setAttribute('x2', nearX); crosshair.setAttribute('y2', MT + plotH);
      crosshair.style.display = '';

      // Build tooltip HTML
      var tsLabel = new Date(timestamps[nearIdx]).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      var lines = ['<strong>' + tsLabel + '</strong>'];
      series.forEach(function (s) {
        var dot = '<span style="color:' + s.color + ';font-size:16px;line-height:0.5">&#9679;</span> ';
        lines.push(dot + s.name + ': ' + fmtVal(s.values[nearIdx], s.unit));
      });
      tooltip.innerHTML = lines.join('<br>');
      tooltip.style.display = 'block';

      // Position tooltip, keeping it inside the container
      var cRect = container.getBoundingClientRect();
      var tx = e.clientX - cRect.left + 14;
      var ty = e.clientY - cRect.top  - 14;
      var tipW = tooltip.offsetWidth || 180;
      if (tx + tipW > cRect.width - 4) tx = tx - tipW - 28;
      tooltip.style.left = tx + 'px';
      tooltip.style.top  = ty + 'px';
    });

    overlay.addEventListener('mouseleave', function () {
      crosshair.style.display  = 'none';
      tooltip.style.display    = 'none';
    });

    svg.appendChild(overlay);
    container.appendChild(svg);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Render the site detail panel into `container`.
   *
   * @param {HTMLElement} container - Element to render into (will be cleared)
   * @param {Object}      opts
   *   @param {string}   opts.siteId      - Axon ref string, e.g. "@p:proj:r:abc"
   *   @param {string}   opts.siteName    - Display name for the site
   *   @param {Object}   opts.rowData     - Raw row data from the summary grid
   *   @param {Array}    opts.visibleCols - Visible column descriptors from renderSiteTable
   *   @param {string}   opts.attestKey   - Session attest key
   *   @param {string}   opts.projectName - SkySpark project name
   *   @param {string}   opts.dates       - Date range expression
   * @param {Function}  onBack - Called when the user clicks "← All Sites"
   */
  components.renderSiteDetail = function (container, opts, onBack) {
    container.innerHTML = '';

    var evals = window.hwMeterTable.evals;

    // ── Header: back button + site name ──────────────────────────────────
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

    // ── Site-specific KPI cards (from the in-memory summary row) ─────────
    if (opts.rowData && opts.visibleCols && opts.visibleCols.length) {
      var kpiStrip = document.createElement('div');
      kpiStrip.className = 'hw-kpi-strip';

      opts.visibleCols.forEach(function (col) {
        if (col.name === 'id') return;
        var raw = opts.rowData[col.name];
        if (raw === null || raw === undefined) return;

        var numVal, unit;
        if (typeof raw === 'object' && raw._kind === 'number') {
          numVal = raw.val; unit = raw.unit || '';
        } else if (typeof raw === 'number') {
          numVal = raw; unit = '';
        } else {
          return; // skip non-numeric (strings, refs, etc.)
        }

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

    // ── Chart section ─────────────────────────────────────────────────────
    var chartSection = document.createElement('div');
    chartSection.className = 'hw-chart-section';

    var chartTitle = document.createElement('div');
    chartTitle.className   = 'hw-chart-section-title';
    chartTitle.textContent = 'Hot Water History \u2014 ' + opts.dates;
    chartSection.appendChild(chartTitle);

    var chartArea = document.createElement('div');
    chartArea.className = 'hw-chart-area';

    var loadingEl = document.createElement('div');
    loadingEl.className   = 'hw-table-loading';
    loadingEl.textContent = 'Loading history\u2026';
    chartArea.appendChild(loadingEl);

    chartSection.appendChild(chartArea);
    container.appendChild(chartSection);

    // Fetch history then render chart
    evals.loadSiteHistory(opts.attestKey, opts.projectName, opts.siteId, opts.dates)
      .then(function (histGrid) {
        chartArea.innerHTML = '';
        renderChart(chartArea, histGrid);
      })
      .catch(function (err) {
        chartArea.innerHTML = '';
        var errEl = document.createElement('div');
        errEl.className   = 'hw-table-error';
        errEl.textContent = 'Error loading history: ' + err.message;
        chartArea.appendChild(errEl);
        console.error('[hwMeterTable] SiteDetail fetch error:', err);
      });
  };

})(window.hwMeterTable.components);
