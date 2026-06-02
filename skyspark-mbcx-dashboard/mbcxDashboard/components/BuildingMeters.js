// components/BuildingMeters.js — Building Meters & EUI section
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  var CHART_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ── Demo data ───────────────────────────────────────────────────────────
  var _DEMO = {
    siteArea: 150000,
    eui: { current: 84.7, prior: 91.2, unit: 'kBtu/ft²' },
    electric: {
      label: 'Electric',
      unit: 'kWh',
      accentColor: '#4A6FA5',
      utility: {
        monthly: {
          prior:   [285000, 262000, 271000, 248000, 310000, 385000, 420000, 435000, 378000, 295000, 268000, 290000],
          current: [278000, 255000, 264000, 241000, 302000, null, null, null, null, null, null, null]
        },
        meters: [
          { name: 'Main Electric Meter', value: 302000 }
        ]
      },
      submeters: {
        monthly: {
          prior:   [268000, 247000, 256000, 234000, 293000, 364000, 397000, 411000, 357000, 279000, 253000, 274000],
          current: [262000, 241000, 249000, 228000, 286000, null, null, null, null, null, null, null]
        },
        meters: [
          { name: 'Lighting Panel LP-1',   value: 45200  },
          { name: 'Mechanical Panel MP-1', value: 128000 },
          { name: 'Plug Loads PL-1',       value: 62800  },
          { name: 'Data Center DC-1',      value: 66000  }
        ]
      }
    },
    gas: {
      label: 'Natural Gas',
      unit: 'therms',
      accentColor: '#C2410C',
      utility: {
        monthly: {
          prior:   [18500, 16200, 12800, 8400, 4200, 1800, 1200, 1100, 2400, 6800, 12400, 17800],
          current: [17900, 15600, 12200, 7800, 3900, null, null, null, null, null, null, null]
        },
        meters: [
          { name: 'Main Gas Meter', value: 3900 }
        ]
      },
      submeters: {
        monthly: {
          prior:   [17200, 15100, 11900, 7800, 3900, 1600, 1100, 1000, 2200, 6300, 11500, 16500],
          current: [16600, 14500, 11300, 7200, 3600, null, null, null, null, null, null, null]
        },
        meters: [
          { name: 'Boiler Plant', value: 2800 },
          { name: 'DHW System',   value: 680  },
          { name: 'Kitchen',      value: 420  }
        ]
      }
    },
    water: {
      label: 'Water',
      unit: 'gal',
      accentColor: '#0E7490',
      utility: {
        monthly: {
          prior:   [142000, 128000, 135000, 148000, 165000, 195000, 218000, 225000, 198000, 162000, 138000, 130000],
          current: [138000, 124000, 131000, 144000, 160000, null, null, null, null, null, null, null]
        },
        meters: [
          { name: 'Main Water Meter', value: 160000 }
        ]
      },
      submeters: {
        monthly: {
          prior:   [130000, 117000, 124000, 136000, 152000, 180000, 201000, 208000, 183000, 149000, 127000, 119000],
          current: [127000, 114000, 120000, 132000, 148000, null, null, null, null, null, null, null]
        },
        meters: [
          { name: 'Cooling Tower CT-M', value: 82000 },
          { name: 'Irrigation',         value: 35000 },
          { name: 'Domestic',           value: 43000 }
        ]
      }
    }
  };

  var _activeView    = 'utility';   // 'utility' | 'submeters'
  var _activeSystem  = 'electric';
  var _meterData     = null;
  var _chartInstance = null;

  function _hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function _fmtTick(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + 'M';
    if (v >= 1000)    return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'K';
    return String(v);
  }

  function _fmtVal(v) {
    if (v == null) return '—';
    return Math.round(v).toLocaleString();
  }

  function _ytd(arr) {
    if (!arr) return null;
    return arr.reduce(function (sum, v) { return sum + (v != null ? v : 0); }, 0);
  }

  // ── Chart.js initializer ────────────────────────────────────────────────
  function _initChart(canvas, sys, stream) {
    var C = window.Chart;
    if (!C) return null;

    var monthly = stream.monthly;
    var prior   = monthly.prior   || [];
    var current = monthly.current || [];
    var prevPalette = { bg: 'rgba(156,163,175,0.45)', border: 'rgba(156,163,175,0.7)' };

    var currentYear = new Date().getFullYear();
    var priorYear   = currentYear - 1;

    var datasets = [];
    if (prior.some(function (v) { return v != null; })) {
      datasets.push({
        label: String(priorYear),
        data: prior,
        backgroundColor: prevPalette.bg,
        borderColor: prevPalette.border,
        borderWidth: 1, barPercentage: 0.8, categoryPercentage: 0.85
      });
    }
    if (current.some(function (v) { return v != null; })) {
      datasets.push({
        label: String(currentYear),
        data: current,
        backgroundColor: _hexToRgba(sys.accentColor, 0.7),
        borderColor: sys.accentColor,
        borderWidth: 1, barPercentage: 0.8, categoryPercentage: 0.85
      });
    }

    var unit = sys.unit || '';

    return new C(canvas, {
      type: 'bar',
      data: { labels: CHART_MONTHS, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'top',
            labels: { font: { size: 10 }, color: '#6B7280', boxWidth: 12 }
          },
          tooltip: {
            backgroundColor: '#1F2937',
            titleFont: { size: 11 }, bodyFont: { size: 12 }, padding: 9, cornerRadius: 5,
            callbacks: {
              label: function (c) {
                var v = c.parsed.y;
                if (v == null) return '';
                var formatted = v >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(1);
                return c.dataset.label + ': ' + formatted + (unit ? ' ' + unit : '');
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 10 }, color: '#9CA3AF' },
            grid: { display: false }, border: { display: false }
          },
          y: {
            min: 0,
            ticks: {
              font: { size: 10 }, color: '#9CA3AF', maxTicksLimit: 6,
              callback: function (v) { return _fmtTick(v); }
            },
            grid: { color: '#F3F4F6' }, border: { display: false }
          }
        }
      }
    });
  }

  // ── Meter table ─────────────────────────────────────────────────────────
  function _renderMeterTable(sys, stream) {
    var meters = stream.meters || [];
    if (!meters.length) return '<p class="ahu-no-rows">No meters found.</p>';

    var rows = meters.map(function (m) {
      return '<tr>' +
        '<td class="ahu-td" style="font-weight:500;">' + m.name + '</td>' +
        '<td class="ahu-td ahu-td-num">' + _fmtVal(m.value) + '</td>' +
        '</tr>';
    }).join('');

    return '<table class="ahu-table">' +
      '<thead><tr>' +
        '<th class="ahu-th">Meter</th>' +
        '<th class="ahu-th">Current Mo (' + sys.unit + ')</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table>';
  }

  // ── Inner render ────────────────────────────────────────────────────────
  function _renderInner(mountEl) {
    var data   = _meterData;
    var eui    = data.eui;
    var sys    = data[_activeSystem];
    var stream = sys[_activeView];

    // EUI change
    var euiDelta = eui.prior ? ((eui.current - eui.prior) / eui.prior * 100) : 0;
    var euiSign  = euiDelta > 0 ? '+' : '';
    var euiCls   = euiDelta > 0 ? 'warn' : 'ok';
    var euiLabel = euiDelta > 0 ? 'above prior year' : 'below prior year';

    // YTD totals — always from utility meters (building-level)
    var elecYtd  = _ytd(data.electric.utility.monthly.current);
    var gasYtd   = _ytd(data.gas.utility.monthly.current);
    var waterYtd = _ytd(data.water.utility.monthly.current);

    // KPI strip
    var kpiHtml = [
      '<div class="tu-kpi-strip">',
      '  <div class="tu-kpi">',
      '    <div class="tu-kpi-label">Site EUI</div>',
      '    <div class="tu-kpi-val" style="color:var(--imeg-blue);">' + eui.current.toFixed(1) + '</div>',
      '    <div class="tu-kpi-unit">' + eui.unit + '</div>',
      '  </div>',
      '  <div class="tu-kpi">',
      '    <div class="tu-kpi-label">YTD Electric</div>',
      '    <div class="tu-kpi-val">' + _fmtVal(elecYtd) + '</div>',
      '    <div class="tu-kpi-unit">kWh</div>',
      '  </div>',
      '  <div class="tu-kpi">',
      '    <div class="tu-kpi-label">YTD Natural Gas</div>',
      '    <div class="tu-kpi-val">' + _fmtVal(gasYtd) + '</div>',
      '    <div class="tu-kpi-unit">therms</div>',
      '  </div>',
      '  <div class="tu-kpi">',
      '    <div class="tu-kpi-label">YTD Water</div>',
      '    <div class="tu-kpi-val">' + _fmtVal(waterYtd) + '</div>',
      '    <div class="tu-kpi-unit">gal</div>',
      '  </div>',
      '</div>'
    ].join('\n');

    // EUI context line
    var euiContextHtml =
      '<div class="eui-context">' +
        '<span class="' + euiCls + '">' + euiSign + Math.abs(euiDelta).toFixed(1) + '%</span> ' +
        euiLabel + ' (' + eui.prior.toFixed(1) + ' ' + eui.unit + ')' +
      '</div>';

    // View toggle (Utility Meters / Submeters)
    var viewLabels = { utility: 'Utility Meters', submeters: 'Submeters' };
    var viewToggleHtml = '<div class="ahu-toggle" style="margin-top:16px;margin-bottom:10px;">' +
      ['utility', 'submeters'].map(function (v) {
        var isActive  = v === _activeView;
        var styleAttr = isActive
          ? ' style="background:var(--gray-800);color:#fff;border-color:var(--gray-800);"'
          : '';
        return '<button class="ahu-toggle-btn' + (isActive ? ' ahu-toggle-btn--active' : '') + '"' +
          styleAttr + ' data-bm-view="' + v + '">' + viewLabels[v] + '</button>';
      }).join('') +
    '</div>';

    // System toggle pills (Electric / Gas / Water)
    var systemKeys   = ['electric', 'gas', 'water'];
    var systemLabels = { electric: 'Electric', gas: 'Natural Gas', water: 'Water' };
    var systemPillsHtml = '<div class="ahu-toggle" style="margin-bottom:16px;">' +
      systemKeys.map(function (s) {
        var isActive  = s === _activeSystem;
        var sd        = data[s];
        var styleAttr = isActive
          ? ' style="background:' + sd.accentColor + ';color:#fff;border-color:' + sd.accentColor + ';"'
          : '';
        return '<button class="ahu-toggle-btn' + (isActive ? ' ahu-toggle-btn--active' : '') + '"' +
          styleAttr + ' data-bm-system="' + s + '">' + systemLabels[s] + '</button>';
      }).join('') +
    '</div>';

    // Meter table
    var tableHtml = _renderMeterTable(sys, stream);

    // Chart data check
    var hasChartData = stream.monthly && (
      (stream.monthly.prior   && stream.monthly.prior.some(function (v) { return v != null; })) ||
      (stream.monthly.current && stream.monthly.current.some(function (v) { return v != null; }))
    );

    var chartBodyHtml = hasChartData
      ? '<div class="ahu-metric-block">' +
          '<div class="ahu-chart-wrap"><canvas id="bmChart"></canvas></div>' +
          '<div class="ahu-table-wrap">' + tableHtml + '</div>' +
        '</div>'
      : '<div class="ahu-no-data">No meter data available.</div>';

    // Destroy existing chart
    if (_chartInstance) {
      _chartInstance.destroy();
      _chartInstance = null;
    }

    mountEl.innerHTML =
      kpiHtml +
      euiContextHtml +
      viewToggleHtml +
      systemPillsHtml +
      chartBodyHtml;

    // View toggle listeners
    mountEl.querySelectorAll('[data-bm-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _activeView = btn.getAttribute('data-bm-view');
        _renderInner(mountEl);
      });
    });

    // System pill listeners
    mountEl.querySelectorAll('[data-bm-system]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _activeSystem = btn.getAttribute('data-bm-system');
        _renderInner(mountEl);
      });
    });

    // Init chart
    var canvas = mountEl.querySelector('#bmChart');
    if (canvas && hasChartData) {
      _chartInstance = _initChart(canvas, sys, stream);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────
  NS.components.BuildingMeters = {
    render: function (data) {
      _meterData     = (data && data.meters) ? data.meters : _DEMO;
      _activeView    = 'utility';
      _activeSystem  = 'electric';
      return [
        '<div class="equip-section equip-section--collapsible equip-section--open" style="border-left-color:#4A6FA5;">',
        '  <div class="equip-header equip-header--clickable" onclick="this.closest(\'.equip-section\').classList.toggle(\'equip-section--open\');">',
        '    <div class="equip-header-left">',
        '      <div class="equip-icon" style="background:var(--imeg-blue-lt);">',
        '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
        '      </div>',
        '      <div><div class="equip-title">Building Meters</div><div class="equip-meta">Site EUI &amp; normalized energy use</div></div>',
        '    </div>',
        '    <div class="equip-collapse-btn" title="Expand / Collapse">',
        '      <svg class="equip-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
        '    </div>',
        '  </div>',
        '  <div class="equip-body" id="bmContent">',
        '    <div class="ahu-loading">Loading meter data…</div>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    initLive: function (container, ctx) {
      var contentEl = container.querySelector('#bmContent');
      if (!contentEl || !_meterData) return;
      _renderInner(contentEl);
    }
  };

})(window.mbcxDashboard);
