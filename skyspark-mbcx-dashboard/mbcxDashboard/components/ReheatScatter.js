// components/ReheatScatter.js — SVG scatter plot, ported from skyspark-reheat-dashboard
// Plots Avg SAT (x) vs Avg Reheat Valve % (y) per VAV with fault-zone shading.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  // ── SVG helpers ──────────────────────────────────────────────────────────────
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgTxt(content, attrs, parent) { var e = svgEl('text', attrs, parent); e.textContent = content; return e; }

  // ── Classification ───────────────────────────────────────────────────────────
  var T = { faultyMaxDAT:68, faultyMinRH:60, leakingMinDAT:75, leakingMaxRH:30, watchMaxDAT:65, watchMinRH:42 };

  function classify(dat, rh) {
    if (isNaN(dat) || isNaN(rh)) return 'sensor';
    if (dat < T.faultyMaxDAT  && rh > T.faultyMinRH)  return 'faulty';
    if (dat > T.leakingMinDAT && rh < T.leakingMaxRH) return 'leaking';
    if (dat < T.watchMaxDAT   && rh > T.watchMinRH)   return 'watch';
    return 'ok';
  }

  function dotFill(flag, sel) {
    if (sel) return '#f59e0b';
    return { faulty:'#ef4444', leaking:'#8b5cf6', watch:'#f59e0b', ok:'#3b82f6', sensor:'#94a3b8' }[flag] || '#3b82f6';
  }
  function dotStroke(flag, sel) {
    if (sel) return '#b45309';
    return { faulty:'#b91c1c', leaking:'#5b21b6', watch:'#b45309', ok:'#1d4ed8', sensor:'#64748b' }[flag] || '#1d4ed8';
  }

  // Labels/classes for tooltip + table
  var FLAGS = { faulty:'Faulty Reheat', leaking:'Leaking Valve', watch:'Watch', ok:'Normal', sensor:'No Data' };
  var FLAG_CLS = { faulty:'rs-flag-faulty', leaking:'rs-flag-leaking', watch:'rs-flag-watch', ok:'rs-flag-ok', sensor:'rs-flag-sensor' };
  var BADGE_CLS = { faulty:'rs-badge rs-badge-faulty', leaking:'rs-badge rs-badge-leaking', watch:'rs-badge rs-badge-watch', ok:'rs-badge rs-badge-ok', sensor:'rs-badge rs-badge-sensor' };

  // ── Demo data (LCG deterministic) ────────────────────────────────────────────
  function lcg(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
  }

  NS.components.ReheatScatter = {

    generateDemo: function () {
      var rng = lcg(42);
      var pfx = ['AHU-1.', 'AHU-2.', 'AHU-3.'];
      var tpl = [];
      var i;
      for (i = 0; i < 28; i++) tpl.push([55 + rng()*6, rng()*22]);
      for (i = 0; i < 52; i++) tpl.push([60 + rng()*9, 8 + rng()*52]);
      for (i = 0; i < 48; i++) tpl.push([65 + rng()*9, 22 + rng()*68]);
      for (i = 0; i < 22; i++) tpl.push([58 + rng()*11, 58 + rng()*42]);
      for (i = 0; i < 32; i++) tpl.push([72 + rng()*11, 22 + rng()*68]);
      for (i = 0; i < 14; i++) tpl.push([76 + rng()*10, 3 + rng()*24]);
      for (i = 0; i < 12; i++) tpl.push([84 + rng()*9, 48 + rng()*48]);
      return tpl.map(function (t, idx) {
        var dat = Math.round(t[0] * 10) / 10;
        var rh  = Math.min(100, Math.max(0, Math.round(t[1])));
        return { id: idx, name: pfx[idx % 3] + 'VAV-' + String(Math.floor(idx / 3) + 1).padStart(2,'0'),
                 dat: dat, rh: rh, flag: classify(dat, rh) };
      });
    },

    fromRows: function (rows, cols) {
      var nameCol = _rsFindCol(cols, ['vav','name']);
      var datCol  = _rsFindCol(cols, ['satavg','sat_f','discharge','dat','supplyair','sat']);
      var rhCol   = _rsFindCol(cols, ['reheat']);
      if (!datCol || !rhCol) return null;
      return rows.map(function (r, i) {
        var dat = parseFloat(r[datCol]);
        var rh  = parseFloat(r[rhCol]);
        return { id: i, name: nameCol ? String(r[nameCol]) : 'VAV-' + (i+1),
                 dat: isNaN(dat) ? null : dat, rh: isNaN(rh) ? null : rh,
                 flag: classify(dat, rh) };
      });
    },

    // Map rows from view_reheatReport_pubUI (after HP.parseGrid)
    fromReheatGrid: function (rows) {
      return rows.map(function (r, i) {
        var ref = r.targetRef;
        var name = (ref && typeof ref === 'object')
          ? (ref.dis || ref.id || 'VAV-' + (i + 1))
          : (ref ? String(ref) : 'VAV-' + (i + 1));

        var rawDat = r.vav_SupplyAirTemperature;
        var rawRh  = r.vav_HeatingValveOutput;
        var dat = typeof rawDat === 'number' ? rawDat
                : (rawDat && rawDat.val !== undefined) ? parseFloat(rawDat.val) : parseFloat(rawDat);
        var rh  = typeof rawRh  === 'number' ? rawRh
                : (rawRh  && rawRh.val  !== undefined) ? parseFloat(rawRh.val)  : parseFloat(rawRh);
        var sensorErr = isNaN(dat) || isNaN(rh) || dat === null || rh === null;
        return {
          id:   i,
          name: name,
          dat:  sensorErr ? null : Math.round(dat * 10) / 10,
          rh:   sensorErr ? null : Math.round(rh),
          flag: sensorErr ? 'sensor' : classify(dat, rh)
        };
      });
    },

    // Renders legend row HTML
    legendHTML: function () {
      return [
        ['#ef4444','Faulty Reheat'], ['#8b5cf6','Leaking Valve'],
        ['#f59e0b','Watch'], ['#3b82f6','Normal']
      ].map(function (l) {
        return '<span class="rs-leg"><span class="rs-leg-dot" style="background:' + l[0] + '"></span>' + l[1] + '</span>';
      }).join('');
    },

    // Renders scatter summary HTML (counts)
    summaryHTML: function (data) {
      var counts = { faulty:0, leaking:0, watch:0, ok:0, sensor:0 };
      data.forEach(function (d) { counts[d.flag] = (counts[d.flag] || 0) + 1; });
      var total = data.length;
      return [
        '<span class="rs-sum"><span class="rs-badge rs-badge-faulty">' + counts.faulty + ' Faulty</span></span>',
        '<span class="rs-sum"><span class="rs-badge rs-badge-leaking">' + counts.leaking + ' Leaking</span></span>',
        '<span class="rs-sum"><span class="rs-badge rs-badge-watch">' + counts.watch + ' Watch</span></span>',
        '<span class="rs-sum"><span class="rs-badge rs-badge-ok">' + counts.ok + ' Normal</span></span>',
        '<span class="rs-sum-total">' + total + ' total</span>'
      ].join('');
    },

    // Main render — draws into svgEl, uses tipEl for tooltip
    render: function (svgEl_, tipEl, data, selectedId, onSelect) {
      var W = 1200, H = 400;
      var M = { top: 20, right: 32, bottom: 44, left: 52 };
      svgEl_.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svgEl_.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svgEl_.innerHTML = '';

      var plotData = data.filter(function (d) { return d.flag !== 'sensor'; });
      var maxDAT = 100;
      plotData.forEach(function (d) { if (d.dat > maxDAT) maxDAT = d.dat; });
      maxDAT = Math.min(200, Math.ceil(maxDAT / 10) * 10);
      var XD = [50, maxDAT], YD = [0, 100];
      var plotW = W - M.left - M.right, plotH = H - M.top - M.bottom;

      function toX(v) { return M.left + (v - XD[0]) / (XD[1] - XD[0]) * plotW; }
      function toY(v) { return M.top  + (1 - (v - YD[0]) / (YD[1] - YD[0])) * plotH; }

      // Background
      svgEl('rect', { x:M.left, y:M.top, width:plotW, height:plotH, fill:'#fafbfc' }, svgEl_);

      // Fault zones
      var fx = toX(68), fy60 = toY(60);
      svgEl('rect', { x:M.left, y:M.top, width:fx-M.left, height:fy60-M.top, fill:'#fde8e8', opacity:0.4 }, svgEl_);
      var lx = toX(75), ly30 = toY(30);
      svgEl('rect', { x:lx, y:ly30, width:W-M.right-lx, height:H-M.bottom-ly30, fill:'#ede9fe', opacity:0.4 }, svgEl_);

      // Grid lines — Y
      [0,20,40,60,80,100].forEach(function (v) {
        var y = toY(v);
        svgEl('line', { x1:M.left, x2:W-M.right, y1:y, y2:y,
          stroke: v===0||v===100 ? '#c8cdd2' : '#e4e7ea', 'stroke-width':1 }, svgEl_);
        svgTxt(v+'%', { x:M.left-7, y:y+4, 'text-anchor':'end',
          'font-family':'system-ui,sans-serif', 'font-size':10, fill:'#8a8f96' }, svgEl_);
      });

      // Grid lines — X
      for (var t = 50; t <= maxDAT; t += 10) {
        var x = toX(t);
        svgEl('line', { x1:x, x2:x, y1:M.top, y2:H-M.bottom,
          stroke: t===50||t===maxDAT ? '#c8cdd2' : '#e4e7ea', 'stroke-width':1 }, svgEl_);
        svgTxt(t+'°F', { x:x, y:H-M.bottom+14, 'text-anchor':'middle',
          'font-family':'system-ui,sans-serif', 'font-size':10, fill:'#8a8f96' }, svgEl_);
      }

      // Axis labels
      var yLbl = svgEl('text', { transform:'rotate(-90)', x:-(M.top+plotH/2), y:15,
        'text-anchor':'middle', 'font-family':'system-ui,sans-serif', 'font-size':10, fill:'#6b6b6b' }, svgEl_);
      yLbl.textContent = 'AVG REHEAT VALVE OUTPUT (%)';
      svgTxt('AVG SUPPLY AIR TEMPERATURE (°F)', { x:M.left+plotW/2, y:H-4,
        'text-anchor':'middle', 'font-family':'system-ui,sans-serif', 'font-size':10, fill:'#6b6b6b' }, svgEl_);

      // Zone labels
      svgTxt('FAULTY REHEAT', { x:M.left+8, y:M.top+13,
        'font-family':'system-ui,sans-serif', 'font-size':9, 'font-weight':700, fill:'#c0392b', opacity:0.65 }, svgEl_);
      svgTxt('LEAKING VALVE', { x:W-M.right-8, y:H-M.bottom-8, 'text-anchor':'end',
        'font-family':'system-ui,sans-serif', 'font-size':9, 'font-weight':700, fill:'#7c3aed', opacity:0.65 }, svgEl_);

      // Reference diagonal
      svgEl('line', { x1:toX(50), y1:toY(0), x2:toX(Math.min(maxDAT,150)), y2:toY(100),
        stroke:'#e05252', 'stroke-width':1.5, 'stroke-dasharray':'5,4', opacity:0.4 }, svgEl_);

      // Dots — normals first, anomalies on top, selected last
      var order = ['ok','watch','faulty','leaking'];
      var groups = [];
      order.forEach(function (f) { plotData.forEach(function (d) { if (d.flag===f && d.id!==selectedId) groups.push(d); }); });
      if (selectedId !== null) { var sel = plotData.filter(function(d){return d.id===selectedId;})[0]; if (sel) groups.push(sel); }

      groups.forEach(function (d) {
        var cx = toX(d.dat), cy = toY(d.rh);
        var isSel = d.id === selectedId;
        var c = svgEl('circle', { cx:cx, cy:cy, r:isSel?7.5:5.5,
          fill:dotFill(d.flag,isSel), opacity:isSel?1:(d.flag==='ok'?0.72:0.88),
          stroke:dotStroke(d.flag,isSel), 'stroke-width':isSel?2.5:1 }, svgEl_);
        c.style.cursor = 'pointer';
        c.addEventListener('mouseenter', function (e) {
          tipEl.innerHTML =
            '<strong>' + d.name + '</strong>' +
            '<div class="rs-tip-row"><span>Avg SAT</span><span class="rs-tip-val">' + d.dat + '°F</span></div>' +
            '<div class="rs-tip-row"><span>Avg Reheat</span><span class="rs-tip-val">' + d.rh + '%</span></div>' +
            '<div class="rs-tip-flag ' + FLAG_CLS[d.flag] + '">' + FLAGS[d.flag] + '</div>';
          tipEl.classList.add('visible');
          var tw = tipEl.offsetWidth || 180, th = tipEl.offsetHeight || 80;
          var lx2 = e.clientX + 16, ly = e.clientY - 12;
          if (lx2 + tw > window.innerWidth - 8) lx2 = e.clientX - tw - 16;
          if (ly + th > window.innerHeight - 8) ly = window.innerHeight - th - 8;
          if (ly < 8) ly = 8;
          tipEl.style.left = lx2 + 'px'; tipEl.style.top = ly + 'px';
        });
        c.addEventListener('mouseleave', function () { tipEl.classList.remove('visible'); });
        c.addEventListener('click', function () { onSelect(d.id); });
      });
    },

    FLAGS: FLAGS,
    BADGE_CLS: BADGE_CLS
  };

  function _rsFindCol(cols, patterns) {
    for (var i = 0; i < patterns.length; i++)
      for (var j = 0; j < cols.length; j++)
        if (cols[j].toLowerCase().indexOf(patterns[i]) !== -1) return cols[j];
    return null;
  }

})(window.mbcxDashboard);
