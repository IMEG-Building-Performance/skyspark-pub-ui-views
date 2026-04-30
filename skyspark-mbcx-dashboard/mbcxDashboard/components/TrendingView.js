// components/TrendingView.js — Full-page trending takeover for the MBCx dashboard
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  var _chart = null;
  var _state = { equipId: null, hiddenPoints: {}, ctx: null, liveEquip: null };

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
  function populateSidebar(root, equipment) {
    var listEl = root.querySelector('#trEquipList');
    if (!listEl) return;
    var list = equipment || _demo.equipment;
    var types = [], groups = {};
    list.forEach(function (e) {
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

  // ── Shared layout helpers ────────────────────────────────────────────────────
  function buildLayout() {
    return [
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

  function wireSidebar(root) {
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

  // ── Live data helpers ────────────────────────────────────────────────────────
  var TR_COLORS = ['#3b82f6','#ef4444','#10b981','#f97316','#8b5cf6','#06b6d4','#f59e0b','#ec4899'];

  function _trFindCol(cols, patterns) {
    for (var i = 0; i < patterns.length; i++)
      for (var j = 0; j < cols.length; j++)
        if (cols[j].toLowerCase().indexOf(patterns[i]) !== -1) return cols[j];
    return null;
  }

  function _trGuessType(name) {
    var s = String(name).toUpperCase();
    if (s.indexOf('AHU') !== -1 || s.indexOf('FCU') !== -1 || s.indexOf('RTU') !== -1 || s.indexOf('MAU') !== -1) return 'AHU';
    if (s.indexOf('VAV') !== -1 || s.indexOf('FPB') !== -1) return 'VAV';
    if (s.indexOf('CHIL') !== -1 || s.indexOf('CUP') !== -1 || s.indexOf('BOIL') !== -1) return 'CUP';
    return 'Other';
  }

  function _trGuessUnit(col) {
    var c = col.toLowerCase();
    if (c.indexOf('temp') !== -1 || c.indexOf('sat') !== -1 || c.indexOf('dat') !== -1 || c.indexOf('zone') !== -1) return '°F';
    if (c.indexOf('flow') !== -1 || c.indexOf('cfm') !== -1) return 'CFM';
    if (c.indexOf('valve') !== -1 || c.indexOf('damper') !== -1 || c.indexOf('speed') !== -1 || c.indexOf('vfd') !== -1 || c.indexOf('pct') !== -1 || c.indexOf('output') !== -1) return '%';
    if (c.indexOf('kw') !== -1) return 'kW';
    if (c.indexOf('press') !== -1) return 'inWC';
    if (c.indexOf('humid') !== -1) return '%RH';
    return '';
  }

  function _trFormatTs(ts) {
    if (!ts) return '';
    var m = String(ts).match(/\d{4}-(\d{2})-(\d{2})[T ](\d{2}:\d{2})/);
    return m ? (m[1] + '/' + m[2] + ' ' + m[3]) : String(ts).slice(0, 16);
  }

  function _mapEquipList(rows, cols) {
    var refCol  = _trFindCol(cols, ['equipref', 'ref', 'targetref', 'id']);
    var nameCol = _trFindCol(cols, ['dis', 'name', 'equip']);
    var typeCol = _trFindCol(cols, ['equiptype', 'type', 'kind']);
    return rows.map(function (r, i) {
      var ref  = refCol  ? r[refCol]  : null;
      var refId = ref ? (typeof ref === 'object' ? (ref.id ? '@' + ref.id : null) : String(ref)) : null;
      var name = nameCol ? (typeof r[nameCol] === 'object' ? (r[nameCol].dis || r[nameCol].id || '') : String(r[nameCol] || '')) : ('Equip-' + i);
      var type = typeCol ? String(r[typeCol] || '').toUpperCase() : _trGuessType(name);
      return { id: refId || ('equip-' + i), name: name || ('Equip-' + i), type: type || 'Other' };
    });
  }

  function _mapHistoryData(rows, cols) {
    var tsCol = _trFindCol(cols, ['ts']) || _trFindCol(cols, ['time', 'date']) || cols[0];
    var dataCols = cols.filter(function (c) { return c !== tsCol; });
    var labels = rows.map(function (r) { return _trFormatTs(String(r[tsCol] || '')); });
    var points = dataCols.map(function (c, i) {
      return {
        key: c, label: c, unit: _trGuessUnit(c),
        color: TR_COLORS[i % TR_COLORS.length],
        data: rows.map(function (r) {
          var v = r[c];
          return (v === null || v === undefined) ? null : (typeof v === 'number' ? Math.round(v * 10) / 10 : parseFloat(v) || null);
        })
      };
    });
    return { labels: labels, points: points };
  }

  function _buildChartFromMapped(root, mapped) {
    if (_chart) { _chart.destroy(); _chart = null; }
    var canvas = root.querySelector('#trCanvas');
    if (!canvas || !window.Chart) return;
    _chart = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: mapped.labels,
        datasets: mapped.points.map(function (p) {
          return { label: p.label, data: p.data, borderColor: p.color, backgroundColor: p.color + '18',
            fill: false, hidden: !!_state.hiddenPoints[p.key], tension: 0.3 };
        })
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#1F2937', titleFont:{size:11}, bodyFont:{size:11}, padding:10, cornerRadius:6,
            callbacks: {
              label: function (c) {
                var pt = mapped.points.filter(function(p){return p.label===c.dataset.label;})[0];
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

  function _showEquipLive(root, equipId, ctx) {
    var equip = (_state.liveEquip || []).filter(function (e) { return e.id === equipId; })[0];
    root.querySelector('#trEmpty').style.display = 'none';
    root.querySelector('#trChartArea').style.display = '';
    root.querySelector('#trChartTitle').textContent = equip ? equip.name : equipId;
    root.querySelector('#trPointChips').innerHTML = '<span style="color:#9CA3AF;font-size:12px">Loading…</span>';
    if (_chart) { _chart.destroy(); _chart = null; }

    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var dateArg = (ctx.datesStart && ctx.datesEnd) ? ctx.datesStart + '..' + ctx.datesEnd : 'today()';
    var axon = 'view_cxAppSummary(' + ctx.siteRef + ', ' + dateArg + ', 4, ' + equipId + ', null)';

    API.evalAxon(ctx.attestKey, ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        console.log('[TrendingView] History cols:', parsed.cols, '(' + parsed.rows.length + ' rows)');
        if (!parsed.rows.length) {
          root.querySelector('#trPointChips').innerHTML = '<span style="color:#9CA3AF;font-size:12px">No history data returned</span>';
          return;
        }
        var mapped = _mapHistoryData(parsed.rows, parsed.cols);
        var chipsEl = root.querySelector('#trPointChips');
        chipsEl.innerHTML = mapped.points.map(function (p) {
          return '<button class="tr-chip tr-chip-active" data-key="' + p.key +
            '" style="--chip-color:' + p.color + ';">' + p.label + '</button>';
        }).join('');
        chipsEl.querySelectorAll('.tr-chip').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var key = btn.getAttribute('data-key');
            _state.hiddenPoints[key] = !_state.hiddenPoints[key];
            btn.classList.toggle('tr-chip-active', !_state.hiddenPoints[key]);
            btn.classList.toggle('tr-chip-off',    !!_state.hiddenPoints[key]);
            if (_chart) {
              mapped.points.forEach(function (p, i) { _chart.data.datasets[i].hidden = !!_state.hiddenPoints[p.key]; });
              _chart.update('none');
            }
          });
        });
        _buildChartFromMapped(root, mapped);
      })
      .catch(function (err) {
        console.error('[TrendingView] History fetch failed:', err);
        root.querySelector('#trPointChips').innerHTML =
          '<span style="color:#9B2335;font-size:12px">Failed to load: ' + (err && err.message ? err.message : 'see console') + '</span>';
      });
  }

  function _fetchEquipList(root, ctx) {
    var listEl = root.querySelector('#trEquipList');
    if (listEl) listEl.innerHTML = '<div style="padding:12px;color:#9CA3AF;font-size:12px">Loading equipment…</div>';

    var API = window.mbcxDashboard.api;
    var HP  = window.mbcxDashboard.haystackParser;
    var dateArg = (ctx.datesStart && ctx.datesEnd) ? ctx.datesStart + '..' + ctx.datesEnd : 'today()';
    var axon = 'view_cxAppSummary(' + ctx.siteRef + ', ' + dateArg + ', 1, null, null)';

    API.evalAxon(ctx.attestKey, ctx.projectName, axon)
      .then(function (grid) {
        var parsed = HP.parseGrid(grid);
        console.log('[TrendingView] Equip list cols:', parsed.cols, '(' + parsed.rows.length + ' rows)');
        if (!parsed.rows.length) {
          if (listEl) listEl.innerHTML = '<div style="padding:12px;color:#9CA3AF;font-size:12px">No equipment found</div>';
          return;
        }
        var equipment = _mapEquipList(parsed.rows, parsed.cols);
        _state.liveEquip = equipment;
        populateSidebar(root, equipment);
        root.querySelector('#trEquipList').addEventListener('click', function (e) {
          var item = e.target.closest('.tr-equip-item');
          if (!item) return;
          var id = item.getAttribute('data-id');
          root.querySelectorAll('.tr-equip-item').forEach(function (el) { el.classList.remove('active'); });
          item.classList.add('active');
          _state.equipId = id;
          _state.hiddenPoints = {};
          _showEquipLive(root, id, ctx);
        });
      })
      .catch(function (err) {
        console.error('[TrendingView] Equip list fetch failed:', err);
        if (listEl) listEl.innerHTML = '<div style="padding:12px;color:#9B2335;font-size:12px">Failed to load equipment</div>';
      });
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  NS.components.TrendingView = {

    // Render into a content div (tab mode — no title bar, no back button)
    showInContent: function (contentEl, ctx) {
      loadStyles();
      if (_chart) { _chart.destroy(); _chart = null; }
      _state = { equipId: null, hiddenPoints: {}, ctx: ctx || null, liveEquip: null };

      contentEl.innerHTML = '<div id="mbcxTrending"></div>';
      var root = contentEl.querySelector('#mbcxTrending');
      root.innerHTML = buildLayout();

      if (ctx && ctx.attestKey && ctx.siteRef) {
        _fetchEquipList(root, ctx);
      } else {
        wireSidebar(root);
      }
    },

    destroy: function () {
      if (_chart) { _chart.destroy(); _chart = null; }
    },

    // Legacy full-page takeover (kept for reference)
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
