// components/TrendingView.js — Full-page trending takeover for the MBCx dashboard
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  var _chart = null;
  var _state = { equipId: null, hiddenPoints: {} };

  // ── Demo data ────────────────────────────────────────────────────────────────
  var _demo = (function () {
    var days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var hrs   = ['00:00','06:00','12:00','18:00'];
    var LABELS = [];
    days.forEach(function (d) { hrs.forEach(function (h) { LABELS.push(d + ' ' + h); }); });

    function lcg(seed) {
      var s = seed >>> 0;
      return function () { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
    }
    function wave(rng, base, amp, noise) {
      return LABELS.map(function (_, i) {
        var occ = (i % 4 === 0 || i % 4 === 3) ? 0 : 1;
        return Math.round((base + amp * Math.sin(i / 4 * Math.PI) * occ + (rng() - 0.5) * noise) * 10) / 10;
      });
    }
    function ahu(seed, name) {
      var r = lcg(seed);
      return { id: name, name: name, type: 'AHU', points: [
        { key:'zoneTemp',     label:'Zone Temp',       unit:'°F', color:'#3b82f6', data:wave(r,72,3,1.5) },
        { key:'sat',          label:'Supply Air Temp',  unit:'°F', color:'#ef4444', data:wave(r,58,5,2) },
        { key:'coolingValve', label:'Cooling Valve',    unit:'%',  color:'#06b6d4', data:wave(r,35,35,8) },
        { key:'heatingValve', label:'Heating Valve',    unit:'%',  color:'#f97316', data:wave(r,15,15,5).map(function(v){return Math.max(0,v);}) },
        { key:'vfdSpeed',     label:'VFD Speed',        unit:'%',  color:'#8b5cf6', data:wave(r,55,40,6).map(function(v){return Math.max(10,Math.min(100,v));}) },
        { key:'oaDamper',     label:'OA Damper',        unit:'%',  color:'#10b981', data:wave(r,30,30,8).map(function(v){return Math.max(0,Math.min(100,v));}) }
      ]};
    }
    function vav(seed, name) {
      var r = lcg(seed);
      return { id: name, name: name, type: 'VAV', points: [
        { key:'zoneTemp',    label:'Zone Temp',    unit:'°F',  color:'#3b82f6', data:wave(r,71,4,1.5) },
        { key:'zoneSp',      label:'Zone SP',      unit:'°F',  color:'#64748b', data:LABELS.map(function(){return 70;}) },
        { key:'airflow',     label:'Airflow',      unit:'CFM', color:'#10b981', data:wave(r,400,250,40).map(function(v){return Math.max(50,Math.round(v));}) },
        { key:'reheatValve', label:'Reheat Valve', unit:'%',   color:'#ef4444', data:wave(r,20,20,6).map(function(v){return Math.max(0,Math.min(100,Math.round(v)));}) },
        { key:'damper',      label:'Damper',       unit:'%',   color:'#8b5cf6', data:wave(r,50,45,8).map(function(v){return Math.max(0,Math.min(100,Math.round(v)));}) }
      ]};
    }
    return {
      labels: LABELS,
      equipment: [
        ahu(10,'AHU-1'), ahu(20,'AHU-2'), ahu(30,'AHU-3'),
        vav(40,'VAV-L1-01'), vav(50,'VAV-L1-02'), vav(60,'VAV-L1-05'),
        vav(70,'VAV-L2-01'), vav(80,'VAV-L2-04')
      ]
    };
  })();

  // ── CSS ──────────────────────────────────────────────────────────────────────
  function loadStyles() {
    if (document.getElementById('mbcxTrendingCSS')) return;
    var link = document.createElement('link');
    link.id   = 'mbcxTrendingCSS';
    link.rel  = 'stylesheet';
    link.href = '/pub/ui/mbcxTrending/mbcxTrendingStyles.css?_v=' + Date.now();
    document.head.appendChild(link);
  }

  // ── HTML shell ───────────────────────────────────────────────────────────────
  function buildShell(ctx) {
    var dateStr = (ctx.datesStart && ctx.datesEnd)
      ? ctx.datesStart + ' – ' + ctx.datesEnd
      : (ctx.datesStart || '');
    return [
      '<div class="tr-title-bar">',
      '  <a class="tr-back-btn" href="#" id="trBackBtn">← Dashboard</a>',
      '  <div class="tr-title-site" id="trTitleSite">' + (ctx.siteName || 'Trending') + '</div>',
      dateStr ? '  <div class="tr-title-dates">' + dateStr + '</div>' : '',
      '</div>',
      '<div class="tr-layout">',
      '  <div class="tr-sidebar" id="trSidebar">',
      '    <div class="tr-sidebar-label">Equipment</div>',
      '    <div class="tr-equip-list" id="trEquipList"></div>',
      '  </div>',
      '  <div class="tr-main" id="trMain">',
      '    <div class="tr-empty" id="trEmpty">',
      '      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5">',
      '        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      '      </svg>',
      '      <div>Select equipment from the sidebar to view trends</div>',
      '    </div>',
      '    <div class="tr-chart-area" id="trChartArea" style="display:none;">',
      '      <div class="tr-chart-header">',
      '        <div class="tr-chart-title" id="trChartTitle"></div>',
      '        <div class="tr-point-chips" id="trPointChips"></div>',
      '      </div>',
      '      <div class="tr-chart-wrap">',
      '        <canvas id="trCanvas"></canvas>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  function populateSidebar(root) {
    var listEl = root.querySelector('#trEquipList');
    if (!listEl) return;
    var types = [], groups = {};
    _demo.equipment.forEach(function (e) {
      if (!groups[e.type]) { groups[e.type] = []; types.push(e.type); }
      groups[e.type].push(e);
    });
    listEl.innerHTML = types.map(function (type) {
      return '<div class="tr-group-label">' + type + '</div>' +
        groups[type].map(function (e) {
          return '<div class="tr-equip-item" data-id="' + e.id + '">' +
            '<span class="tr-equip-dot tr-dot-' + type.toLowerCase() + '"></span>' + e.name + '</div>';
        }).join('');
    }).join('');
  }

  // ── Chart ────────────────────────────────────────────────────────────────────
  function buildDatasets(equip) {
    return {
      labels: _demo.labels,
      datasets: equip.points.map(function (p) {
        return {
          label: p.label, data: p.data,
          borderColor: p.color, backgroundColor: p.color + '18',
          fill: false, hidden: !!_state.hiddenPoints[p.key], tension: 0.3
        };
      })
    };
  }

  function renderChart(root, equip) {
    if (_chart) { _chart.destroy(); _chart = null; }
    var canvas = root.querySelector('#trCanvas');
    if (!canvas || !window.Chart) return;
    _chart = new window.Chart(canvas, {
      type: 'line',
      data: buildDatasets(equip),
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#1F2937', titleFont:{size:11}, bodyFont:{size:11},
            padding: 10, cornerRadius: 6,
            callbacks: {
              label: function (c) {
                var pt = equip.points.filter(function(p){return p.label===c.dataset.label;})[0];
                return ' ' + c.dataset.label + ': ' + c.raw + (pt ? pt.unit : '');
              }
            }
          }
        },
        scales: {
          x: { ticks:{font:{size:10},color:'#9CA3AF',maxTicksLimit:14,maxRotation:0}, grid:{color:'#F3F4F6'} },
          y: { ticks:{font:{size:10},color:'#9CA3AF'}, grid:{color:'#F3F4F6'} }
        },
        interaction: { mode:'index', intersect:false },
        elements: { point:{radius:0,hoverRadius:4}, line:{borderWidth:2} }
      }
    });
  }

  function showEquip(root, equipId) {
    var equip = _demo.equipment.filter(function (e) { return e.id === equipId; })[0];
    if (!equip) return;

    root.querySelector('#trEmpty').style.display = 'none';
    root.querySelector('#trChartArea').style.display = '';
    root.querySelector('#trChartTitle').textContent = equip.name;

    var chipsEl = root.querySelector('#trPointChips');
    chipsEl.innerHTML = equip.points.map(function (p) {
      return '<button class="tr-chip tr-chip-active" data-key="' + p.key +
        '" style="--chip-color:' + p.color + ';">' + p.label + '</button>';
    }).join('');
    chipsEl.querySelectorAll('.tr-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        _state.hiddenPoints[key] = !_state.hiddenPoints[key];
        btn.classList.toggle('tr-chip-active', !_state.hiddenPoints[key]);
        btn.classList.toggle('tr-chip-off', !!_state.hiddenPoints[key]);
        if (_chart) { _chart.data = buildDatasets(equip); _chart.update('none'); }
      });
    });

    renderChart(root, equip);
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  NS.components.TrendingView = {

    show: function (container, ctx, onBack) {
      loadStyles();
      if (_chart) { _chart.destroy(); _chart = null; }
      _state = { equipId: null, hiddenPoints: {} };

      // Switch container to full-height non-scrolling mode
      container.style.height   = '100%';
      container.style.overflow = 'hidden';
      if (container.parentElement) container.parentElement.style.overflow = 'hidden';

      container.innerHTML = '<div id="mbcxTrending"></div>';
      var root = container.querySelector('#mbcxTrending');
      root.innerHTML = buildShell(ctx);

      // Back button
      root.querySelector('#trBackBtn').addEventListener('click', function (e) {
        e.preventDefault();
        if (_chart) { _chart.destroy(); _chart = null; }
        // Restore dashboard scroll
        container.style.height   = '';
        container.style.overflow = '';
        if (container.parentElement) container.parentElement.style.overflow = 'auto';
        onBack();
      });

      // Sidebar selection
      populateSidebar(root);
      root.querySelector('#trEquipList').addEventListener('click', function (e) {
        var item = e.target.closest('.tr-equip-item');
        if (!item) return;
        var id = item.getAttribute('data-id');
        root.querySelectorAll('.tr-equip-item').forEach(function (el) { el.classList.remove('active'); });
        item.classList.add('active');
        _state.equipId = id;
        _state.hiddenPoints = {};
        showEquip(root, id);
      });
    }
  };

})(window.mbcxDashboard);
