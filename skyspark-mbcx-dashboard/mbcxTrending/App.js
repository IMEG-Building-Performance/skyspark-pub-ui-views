// mbcxTrending/App.js — Trending view application
window.mbcxTrending = window.mbcxTrending || {};

(function (NS) {
  var _chart = null;
  var _state = { equipId: null, hiddenPoints: {} };

  NS.App = {

    init: function (container, ctx) {
      NS.App._ctx = ctx;
      container.innerHTML = NS.App._shell(ctx);
      NS.App._populateSidebar(container);
      NS.App._wireEvents(container);
    },

    _shell: function (ctx) {
      var dateStr = (ctx.datesStart && ctx.datesEnd)
        ? ctx.datesStart + ' – ' + ctx.datesEnd
        : (ctx.datesStart || '');
      return [
        '<div class="tr-title-bar">',
        '  <div style="display:flex;align-items:baseline;gap:16px;flex:1;min-width:0;">',
        '    <div class="tr-title-site" id="trTitleSite">' + (ctx.siteName || 'Loading…') + '</div>',
        dateStr ? '  <div class="tr-title-dates">' + dateStr + '</div>' : '',
        '  </div>',
        '  <a class="tr-back-btn" href="#" onclick="history.back();return false;">← Dashboard</a>',
        '</div>',
        '<div class="tr-layout">',
        '  <div class="tr-sidebar" id="trSidebar">',
        '    <div class="tr-sidebar-label">Equipment</div>',
        '    <div class="tr-equip-list" id="trEquipList"></div>',
        '  </div>',
        '  <div class="tr-main" id="trMain">',
        '    <div class="tr-empty" id="trEmpty">',
        '      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
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
    },

    _populateSidebar: function (container) {
      var equip = NS.demoData.equipment;
      var listEl = container.querySelector('#trEquipList');
      if (!listEl) return;

      // Group by type
      var types = [];
      var groups = {};
      equip.forEach(function (e) {
        if (!groups[e.type]) { groups[e.type] = []; types.push(e.type); }
        groups[e.type].push(e);
      });

      listEl.innerHTML = types.map(function (type) {
        var items = groups[type].map(function (e) {
          return '<div class="tr-equip-item" data-id="' + e.id + '">' +
            '<span class="tr-equip-dot tr-dot-' + type.toLowerCase() + '"></span>' + e.name +
            '</div>';
        }).join('');
        return '<div class="tr-group-label">' + type + '</div>' + items;
      }).join('');
    },

    _wireEvents: function (container) {
      // Sidebar clicks
      container.querySelector('#trEquipList').addEventListener('click', function (e) {
        var item = e.target.closest('.tr-equip-item');
        if (!item) return;
        var id = item.getAttribute('data-id');
        container.querySelectorAll('.tr-equip-item').forEach(function (el) { el.classList.remove('active'); });
        item.classList.add('active');
        _state.equipId = id;
        _state.hiddenPoints = {};
        NS.App._showEquip(container, id);
      });
    },

    _showEquip: function (container, equipId) {
      var equip = NS.demoData.equipment.filter(function (e) { return e.id === equipId; })[0];
      if (!equip) return;

      container.querySelector('#trEmpty').style.display = 'none';
      var chartArea = container.querySelector('#trChartArea');
      chartArea.style.display = '';

      // Title
      container.querySelector('#trChartTitle').textContent = equip.name;

      // Point chips
      var chipsEl = container.querySelector('#trPointChips');
      chipsEl.innerHTML = equip.points.map(function (p) {
        return '<button class="tr-chip tr-chip-active" data-key="' + p.key + '" style="--chip-color:' + p.color + ';">' + p.label + '</button>';
      }).join('');
      chipsEl.querySelectorAll('.tr-chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-key');
          _state.hiddenPoints[key] = !_state.hiddenPoints[key];
          btn.classList.toggle('tr-chip-active', !_state.hiddenPoints[key]);
          btn.classList.toggle('tr-chip-off', !!_state.hiddenPoints[key]);
          NS.App._updateChart(equip);
        });
      });

      NS.App._renderChart(container, equip);
    },

    _renderChart: function (container, equip) {
      if (_chart) { _chart.destroy(); _chart = null; }
      var canvas = container.querySelector('#trCanvas');
      if (!canvas || !window.Chart) return;

      _chart = new window.Chart(canvas, {
        type: 'line',
        data: NS.App._buildChartData(equip),
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index', intersect: false,
              backgroundColor: '#1F2937', titleFont: { size: 11 }, bodyFont: { size: 11 },
              padding: 10, cornerRadius: 6,
              callbacks: {
                label: function (ctx) {
                  var pt = equip.points.filter(function(p){ return p.label === ctx.dataset.label; })[0];
                  return ' ' + ctx.dataset.label + ': ' + ctx.raw + (pt ? pt.unit : '');
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { font: { size: 10 }, color: '#9CA3AF', maxTicksLimit: 14, maxRotation: 0 },
              grid: { color: '#F3F4F6' }
            },
            y: {
              ticks: { font: { size: 10 }, color: '#9CA3AF' },
              grid: { color: '#F3F4F6' }
            }
          },
          interaction: { mode: 'index', intersect: false },
          elements: { point: { radius: 0, hoverRadius: 4 }, line: { borderWidth: 2 } }
        }
      });
    },

    _buildChartData: function (equip) {
      return {
        labels: NS.demoData.labels,
        datasets: equip.points.map(function (p) {
          return {
            label: p.label,
            data: p.data,
            borderColor: p.color,
            backgroundColor: p.color + '18',
            fill: false,
            hidden: !!_state.hiddenPoints[p.key],
            tension: 0.3
          };
        })
      };
    },

    _updateChart: function (equip) {
      if (!_chart) return;
      _chart.data = NS.App._buildChartData(equip);
      _chart.update('none');
    }
  };

})(window.mbcxTrending);
