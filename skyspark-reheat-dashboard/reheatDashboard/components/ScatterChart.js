// components/ScatterChart.js
// SVG scatter plot: Avg DAT vs. Avg Reheat Valve Output
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  var svgCreate = NS.svg.create;
  var svgText = NS.svg.text;
  var dotFill = NS.svg.dotFill;
  var dotStroke = NS.svg.dotStroke;

  // Fixed coordinate system — wider aspect ratio to match container shape
  var W = 1200, H = 420;
  var M = { top: 20, right: 32, bottom: 44, left: 52 };
  var YD = [0, 100];

  NS.ScatterChart = {};

  NS.ScatterChart.render = function (svgEl, tipEl, vavData, selectedId, onSelect) {
    svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgEl.innerHTML = '';

    // Filter out sensor-error units — they can't be plotted
    var plotData = vavData.filter(function (d) { return d.flag !== 'sensor'; });

    // Dynamic X-axis: 50°F min, max based on data (capped at 200°F)
    var maxDAT = 100;
    plotData.forEach(function (d) { if (d.dat > maxDAT) maxDAT = d.dat; });
    // Round up to next multiple of 10 for clean ticks, cap at 200
    maxDAT = Math.min(200, Math.ceil(maxDAT / 10) * 10);
    var XD = [50, maxDAT];

    function toX(v) { return M.left + (v - XD[0]) / (XD[1] - XD[0]) * (W - M.left - M.right); }
    function toY(v) { return M.top + (1 - (v - YD[0]) / (YD[1] - YD[0])) * (H - M.top - M.bottom); }

    var plotW = W - M.left - M.right;
    var plotH = H - M.top - M.bottom;

    // Background
    svgCreate('rect', { x: M.left, y: M.top, width: plotW, height: plotH, fill: '#fafbfc' }, svgEl);

    // Zone: faulty reheat (top-left)
    var fx = toX(68);
    var fy60 = toY(60);
    svgCreate('rect', {
      x: M.left, y: M.top, width: fx - M.left, height: fy60 - M.top,
      fill: '#fde8e8', opacity: 0.35, stroke: '#ef444428', 'stroke-width': 1
    }, svgEl);

    // Zone: leaking valve (bottom-right)
    var lx = toX(75);
    var ly30 = toY(30);
    svgCreate('rect', {
      x: lx, y: ly30, width: W - M.right - lx, height: H - M.bottom - ly30,
      fill: '#ede9fe', opacity: 0.35, stroke: '#8b5cf628', 'stroke-width': 1
    }, svgEl);

    // Grid lines — Y axis
    [0, 20, 40, 60, 80, 100].forEach(function (v) {
      var y = toY(v);
      svgCreate('line', {
        x1: M.left, x2: W - M.right, y1: y, y2: y,
        stroke: v === 0 || v === 100 ? '#c8cdd2' : '#e4e7ea', 'stroke-width': 1
      }, svgEl);
      svgText(v + '%', {
        x: M.left - 7, y: y + 4, 'text-anchor': 'end',
        'font-family': 'Segoe UI,Arial,sans-serif', 'font-size': 10, fill: '#8a8f96'
      }, svgEl);
    });

    // Grid lines — X axis (dynamic ticks every 10°F)
    var xTicks = [];
    for (var t = 50; t <= maxDAT; t += 10) xTicks.push(t);

    xTicks.forEach(function (v) {
      var x = toX(v);
      svgCreate('line', {
        x1: x, x2: x, y1: M.top, y2: H - M.bottom,
        stroke: v === 50 || v === maxDAT ? '#c8cdd2' : '#e4e7ea', 'stroke-width': 1
      }, svgEl);
      svgText(v + '\u00B0F', {
        x: x, y: H - M.bottom + 14, 'text-anchor': 'middle',
        'font-family': 'Segoe UI,Arial,sans-serif', 'font-size': 10, fill: '#8a8f96'
      }, svgEl);
    });

    // Axis labels
    var yLbl = svgCreate('text', {
      transform: 'rotate(-90)',
      x: -(M.top + plotH / 2), y: 15,
      'text-anchor': 'middle', 'font-family': 'Segoe UI,Arial,sans-serif',
      'font-size': 10, fill: '#6b6b6b', 'letter-spacing': '0.04em'
    }, svgEl);
    yLbl.textContent = 'AVG REHEAT VALVE OUTPUT (%)';

    svgText('AVG DISCHARGE AIR TEMPERATURE (\u00B0F)', {
      x: M.left + plotW / 2, y: H - 5, 'text-anchor': 'middle',
      'font-family': 'Segoe UI,Arial,sans-serif',
      'font-size': 10, fill: '#6b6b6b', 'letter-spacing': '0.04em'
    }, svgEl);

    // Reference diagonal (from origin to 1:1 at min of axis limits)
    svgCreate('line', {
      x1: toX(50), y1: toY(0), x2: toX(Math.min(maxDAT, 150)), y2: toY(100),
      stroke: '#e05252', 'stroke-width': 1.5, 'stroke-dasharray': '5,4', opacity: 0.45
    }, svgEl);

    // Zone annotations
    svgText('FAULTY REHEAT', {
      x: M.left + 7, y: M.top + 12,
      'font-family': 'Segoe UI,Arial,sans-serif', 'font-size': 9.5, 'font-weight': 700,
      fill: '#c0392b', opacity: 0.6, 'letter-spacing': '0.06em'
    }, svgEl);
    svgText('LEAKING VALVE', {
      x: W - M.right - 7, y: H - M.bottom - 8, 'text-anchor': 'end',
      'font-family': 'Segoe UI,Arial,sans-serif', 'font-size': 9.5, 'font-weight': 700,
      fill: '#7c3aed', opacity: 0.6, 'letter-spacing': '0.06em'
    }, svgEl);

    // Dots — normal first, anomalies on top, selected last
    var order = ['ok', 'watch', 'faulty', 'leaking'];
    var groups = [];
    order.forEach(function (f) {
      plotData.forEach(function (d) {
        if (d.flag === f && d.id !== selectedId) groups.push(d);
      });
    });
    if (selectedId !== null) {
      var sel = plotData.find(function (d) { return d.id === selectedId; });
      if (sel) groups.push(sel);
    }

    var tipLabels = NS.fields.tipLabels;
    var tipCls = NS.fields.tipCls;

    groups.forEach(function (d) {
      var cx = toX(d.dat), cy = toY(d.rh);
      var isSel = d.id === selectedId;
      var c = svgCreate('circle', {
        cx: cx, cy: cy,
        r: isSel ? 7.5 : 5.5,
        fill: dotFill(d.flag, isSel),
        opacity: isSel ? 1 : (d.flag === 'ok' ? 0.75 : 0.88),
        stroke: dotStroke(d.flag, isSel),
        'stroke-width': isSel ? 2.5 : 1
      }, svgEl);
      c.style.cursor = 'pointer';
      c.addEventListener('mouseenter', function (e) {
        tipEl.innerHTML =
          '<strong>' + d.name + '</strong>' +
          '<div class="tip-row"><span>Avg DAT</span><span class="tip-val">' + d.dat + ' \u00B0F</span></div>' +
          '<div class="tip-row"><span>Avg Reheat</span><span class="tip-val">' + d.rh + '%</span></div>' +
          '<div class="tip-flag ' + tipCls[d.flag] + '">' + tipLabels[d.flag] + '</div>';
        tipEl.classList.add('visible');
        var tw = tipEl.offsetWidth || 180;
        var th = tipEl.offsetHeight || 80;
        var lx = e.clientX + 16;
        var ly = e.clientY - 12;
        if (lx + tw > window.innerWidth - 8) lx = e.clientX - tw - 16;
        if (ly + th > window.innerHeight - 8) ly = window.innerHeight - th - 8;
        if (ly < 8) ly = 8;
        tipEl.style.left = lx + 'px';
        tipEl.style.top = ly + 'px';
      });
      c.addEventListener('mouseleave', function () { tipEl.classList.remove('visible'); });
      c.addEventListener('click', function () { onSelect(d.id); });
    });
  };
})(window.reheatDashboard);
