// components/CUP.js — Central Utility Plant card
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.components = window.mbcxDashboard.components || {};

(function (NS) {

  // ── Demo data (mirrors structure from centralplantcard.html) ─────────────
  var _DEMO = {
    cooling: {
      accentColor: '#4a90a4',
      pillBg: '#3b6b7a',
      iconBg: '#eaf2f5',
      plantLeavingTemp: 44.2,
      plantEnteringTemp: 56.1,
      plantLeavingLabel: 'CHWST',
      plantEnteringLabel: 'CHWRT',
      tempUnit: '°F',
      plantKw: null, plantEfficiency: null, plantTonnage: null,
      equipment: [
        { name: 'CH-01', status: 'running', lwt: 44.1, ewt: 56.3 },
        { name: 'CH-02', status: 'running', lwt: 44.4, ewt: 55.8 },
        { name: 'CH-03', status: 'running' },
        { name: 'CH-04', status: 'off' }
      ],
      equipLabel: 'Chiller',
      equipLabelPlural: 'Chillers',
      runtimeLabel: 'Total Chiller Runtime',
      runtimeUnit: 'hrs',
      monthlyRuntime: {
        prior:   [0, 0, 120, 680, 1400, 2800, 3500, 3820, 3100, 1600, 480, 0],
        current: [0, 0, 95, 580, 1250, null, null, null, null, null, null, null]
      }
    },
    heating: {
      accentColor: '#c0392b',
      pillBg: '#8e2c20',
      iconBg: '#fbeae8',
      plantLeavingTemp: 162.4,
      plantEnteringTemp: 148.7,
      plantLeavingLabel: 'HWST',
      plantEnteringLabel: 'HWRT',
      tempUnit: '°F',
      plantKw: null, plantEfficiency: null, plantTonnage: null,
      equipment: [
        { name: 'BLR-01', status: 'running' },
        { name: 'BLR-02', status: 'off' }
      ],
      equipLabel: 'Boiler',
      equipLabelPlural: 'Boilers',
      runtimeLabel: 'Total Boiler Runtime',
      runtimeUnit: 'hrs',
      monthlyRuntime: {
        prior:   [2200, 1950, 1400, 680, 120, 0, 0, 0, 0, 240, 1100, 2400],
        current: [2100, 1820, 1280, 590, 80, null, null, null, null, null, null, null]
      }
    },
    condenser: {
      accentColor: '#4a5568',
      pillBg: '#353f4e',
      iconBg: '#edf0f4',
      plantLeavingTemp: 82.1,
      plantEnteringTemp: 74.6,
      plantLeavingLabel: 'CWS',
      plantEnteringLabel: 'CWR',
      tempUnit: '°F',
      plantKw: null, plantEfficiency: null, plantTonnage: null,
      equipment: [
        { name: 'CT-01', status: 'running' },
        { name: 'CT-02', status: 'running' },
        { name: 'CT-03', status: 'off' }
      ],
      equipLabel: 'Tower',
      equipLabelPlural: 'Towers',
      runtimeLabel: 'Total Tower Runtime',
      runtimeUnit: 'hrs',
      monthlyRuntime: {
        prior:   [0, 0, 180, 820, 1600, 3200, 3900, 4100, 3400, 1800, 600, 0],
        current: [0, 0, 140, 720, 1480, null, null, null, null, null, null, null]
      }
    },
    dhw: {
      accentColor: '#d4853f',
      pillBg: '#a66830',
      iconBg: '#fdf2e8',
      plantLeavingTemp: 138.5,
      plantEnteringTemp: null,
      plantLeavingLabel: 'DHW Supply',
      plantEnteringLabel: 'DHW Return',
      tempUnit: '°F',
      plantKw: null, plantEfficiency: null, plantTonnage: null,
      equipment: [
        { name: 'DHW-HTR-01', status: 'running' }
      ],
      equipLabel: 'Heater',
      equipLabelPlural: 'Heaters',
      runtimeLabel: 'Total Heater Runtime',
      runtimeUnit: 'hrs',
      monthlyRuntime: {
        prior:   [744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744],
        current: [744, 672, 744, 720, 500, null, null, null, null, null, null, null]
      }
    }
  };

  // Clone the demo data but suppress chart bars and equipment data values
  // until real API data arrives, so no demo bars or fake temps flash to the user.
  function _makePlantData(source) {
    var out = {};
    var systems = Object.keys(source);
    systems.forEach(function (s) {
      out[s] = {};
      var keys = Object.keys(source[s]);
      keys.forEach(function (k) { out[s][k] = source[s][k]; });
      out[s].monthlyRuntime = null;
      // Keep equipment names only — no status or temperatures until live data loads
      out[s].equipment = (source[s].equipment || []).map(function (e) {
        return { name: e.name };
      });
    });
    return out;
  }

  var _activeSystem  = 'cooling';
  var _plantData     = null;
  var _container     = null;
  var _co            = null;
  var _data          = null;
  var _ctx           = null;
  var _chartInstance = null;

  var CHART_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function _hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function _fmtTick(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + 'M';
    if (v >= 1000)    return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'K';
    return String(v);
  }

  function _initCupChart(canvas, d, priorYear, currentYear) {
    var C = window.Chart;
    if (!C) return null;

    var rt      = d.monthlyRuntime;
    var prior   = rt.prior   || [];
    var current = rt.current || [];
    var prevPalette = { bg: 'rgba(156,163,175,0.45)', border: 'rgba(156,163,175,0.7)' };

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
        backgroundColor: _hexToRgba(d.accentColor, 0.7),
        borderColor: d.accentColor,
        borderWidth: 1, barPercentage: 0.8, categoryPercentage: 0.85
      });
    }

    var unitMatch = d.runtimeLabel && d.runtimeLabel.match(/\(([^)]+)\)/);
    var unit      = unitMatch ? unitMatch[1] : '';

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

  // ── Equipment table (names + placeholder dashes) ─────────────────────────
  function _renderEquipTable(d) {
    var equip  = d.equipment || [];
    if (!equip.length) return '';
    var label  = d.plantLeavingLabel  || '';
    var enter  = d.plantEnteringLabel || '';
    var unit   = d.tempUnit           || '';

    var thName  = '<th class="ahu-th">' + (d.equipLabel || 'Unit') + '</th>';
    var thLeave = label ? '<th class="ahu-th">' + label + (unit ? ' (' + unit + ')' : '') + '</th>' : '';
    var thEnter = enter ? '<th class="ahu-th">' + enter + (unit ? ' (' + unit + ')' : '') + '</th>' : '';

    var rows = equip.map(function (e) {
      return '<tr>' +
        '<td class="ahu-td">' + e.name + '</td>' +
        (label ? '<td class="ahu-td ahu-td-num">&mdash;</td>' : '') +
        (enter ? '<td class="ahu-td ahu-td-num">&mdash;</td>' : '') +
        '</tr>';
    }).join('');

    return '<table class="ahu-table">' +
      '<thead><tr>' + thName + thLeave + thEnter + '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table>';
  }

  // ── Inner card render + event wiring ────────────────────────────────────
  function _renderInner(mountEl, plantData) {
    var d = plantData[_activeSystem];

    var currentYear = new Date().getFullYear();
    var priorYear   = currentYear - 1;

    var systemKeys   = ['cooling', 'heating', 'condenser', 'dhw'];
    var systemLabels = { cooling: 'Cooling', heating: 'Heating', condenser: 'Condenser Water', dhw: 'DHW' };

    var pillsHtml = systemKeys.map(function (s) {
      var isActive  = s === _activeSystem;
      var styleAttr = isActive
        ? ' style="background:' + d.pillBg + ';color:#fff;border-color:' + d.pillBg + ';"'
        : '';
      return '<button class="cup-system-pill' + (isActive ? ' active' : '') + '"' +
        styleAttr + ' data-system="' + s + '">' + systemLabels[s] + '</button>';
    }).join('');

    var equipHtml  = _renderEquipTable(d);
    var equipCount = (d.equipment || []).length;
    var equipLabel = equipCount
      ? '<div class="cup-equip-label">' +
          (d.equipLabelPlural || 'Equipment').toUpperCase() +
          '<span class="cup-equip-count">&nbsp;&middot;&nbsp;' + equipCount + '</span>' +
        '</div>'
      : '';

    var hasChartData = d.monthlyRuntime && (
      (d.monthlyRuntime.prior   && d.monthlyRuntime.prior.some(function (v) { return v != null; })) ||
      (d.monthlyRuntime.current && d.monthlyRuntime.current.some(function (v) { return v != null; }))
    );

    var chartBodyHtml = hasChartData
      ? '<div class="ahu-metric-block">' +
          '<div class="ahu-chart-wrap"><canvas id="cupChart"></canvas></div>' +
          '<div class="ahu-table-wrap">' + equipLabel + equipHtml + '</div>' +
        '</div>'
      : '<div class="cup-no-data">No data available for this system.</div>';

    if (_chartInstance) {
      _chartInstance.destroy();
      _chartInstance = null;
    }

    mountEl.innerHTML =
      '<div class="cup-system-toggle">' + pillsHtml + '</div>' +
      chartBodyHtml;

    // ── System pill listeners ──────────────────────────────────────────────
    mountEl.querySelectorAll('.cup-system-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _activeSystem = btn.getAttribute('data-system');
        _renderInner(mountEl, plantData);
      });
    });

    // ── Init Chart.js ─────────────────────────────────────────────────────
    var canvas = mountEl.querySelector('#cupChart');
    if (canvas && hasChartData) {
      _chartInstance = _initCupChart(canvas, d, priorYear, currentYear);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────
  NS.components.CUP = {
    render: function (data) {
      _plantData    = _makePlantData((data && data.plant) ? data.plant : _DEMO);
      _activeSystem = 'cooling';
      return [
        '<div class="equip-section">',
        '  <div class="equip-header">',
        '    <div class="equip-header-left">',
        '      <div class="equip-icon" style="background:#EDE9FE;">',
        '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2"',
        '          stroke-linecap="round" stroke-linejoin="round">',
        '          <rect x="2" y="7" width="20" height="14" rx="2"/>',
        '          <path d="M12 7V3"/><path d="M8 7V5"/><path d="M16 7V5"/>',
        '          <path d="M6 12h2"/><path d="M6 16h2"/><path d="M16 12h2"/><path d="M16 16h2"/>',
        '          <path d="M10 12h4v5h-4z"/>',
        '        </svg>',
        '      </div>',
        '      <div><div class="equip-title">Central Utility Plant</div><div class="equip-meta">Chillers &middot; Heating &middot; Condenser &middot; Domestic Hot Water</div></div>',
        '    </div>',
        '  </div>',
        '  <div class="equip-body" id="cupCard"></div>',
        '</div>'
      ].join('\n');
    },

    initCard: function (contentEl, container, co, data, ctx) {
      _container = container;
      _co        = co;
      _data      = data;
      _ctx       = ctx;
      var mountEl = contentEl.querySelector('#cupCard');
      if (!mountEl || !_plantData) return;
      _renderInner(mountEl, _plantData);

      // Load real chart data when credentials are available
      var _hasCredentials = !!(ctx && ctx.attestKey && ctx.projectName && (ctx.siteRef || (ctx.siteRefs && ctx.siteRefs.length)));
      var _hasLoader      = !!(NS.evals && NS.evals.loadCupSummary);
      var _isMultiSite    = ctx && ctx.siteRefs && ctx.siteRefs.length > 1 && !ctx.isAllSites
        ? ctx.siteRefs.length > 1
        : (ctx && ctx.isAllSites);
      if (_hasCredentials && _hasLoader) {
        if (_isMultiSite) {
          var _cupEl = document.querySelector('#cupCard');
          if (_cupEl) {
            var _notice = _cupEl.querySelector('.cup-multi-site-notice');
            if (!_notice) {
              _notice = document.createElement('div');
              _notice.className = 'cup-multi-site-notice';
              _notice.style.cssText = 'margin:12px 0;padding:10px 14px;background:#FEF3C7;border:1px solid #D97706;border-radius:6px;font-size:12px;color:#92400E;';
              _notice.textContent = 'Central Utility Plant data is only available for a single site. Please select one site to view CUP charts.';
              _cupEl.insertBefore(_notice, _cupEl.firstChild);
            }
          }
        } else {
        var _siteArg = window.mbcxDashboard.siteAxonArg ? window.mbcxDashboard.siteAxonArg(ctx) : ctx.siteRef;
        NS.evals.loadCupSummary(ctx.attestKey, ctx.projectName, _siteArg)
          .then(function (chartData) {
            var el = document.querySelector('#cupCard');

            if (!el) return;

            function hasData(arr) {
              return arr && arr.some(function (v) { return v !== null; });
            }

            var systems = ['cooling', 'heating', 'condenser', 'dhw'];
            systems.forEach(function (sys) {
              var cd = chartData[sys];
              if (!cd || !_plantData[sys]) return;

              var hasCurrent = hasData(cd.current);
              var hasPrior   = hasData(cd.prior);

              if (!hasCurrent && !hasPrior) return;

              _plantData[sys].monthlyRuntime = {
                current: hasCurrent ? cd.current : [null,null,null,null,null,null,null,null,null,null,null,null],
                prior:   hasPrior   ? cd.prior   : [null,null,null,null,null,null,null,null,null,null,null,null]
              };
              if (cd.unit) {
                _plantData[sys].runtimeLabel = 'Monthly Energy Consumption (' + cd.unit + ')';
              }
            });

            _renderInner(el, _plantData);
          })
          .catch(function (err) {
            console.warn('[mbcxDashboard] CUP chart load failed:', err);
          });
        } // end else (single site)
      }
    }
  };

})(window.mbcxDashboard);
