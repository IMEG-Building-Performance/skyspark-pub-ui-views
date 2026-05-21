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

  var _activeSystem = 'cooling';
  var _plantData    = null;

  // ── Bar chart SVG ────────────────────────────────────────────────────────
  function _renderBarChart(d) {
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var rt = d.monthlyRuntime;
    if (!rt) return '';

    var prior   = rt.prior   || [];
    var current = rt.current || [];
    var allVals = prior.concat(current.filter(function (v) { return v != null; }));
    var maxVal  = Math.max.apply(null, allVals.concat([1])) * 1.15;

    var W = 700, H = 200;
    var padL = 44, padR = 12, padT = 8, padB = 26;
    var chartW = W - padL - padR;
    var chartH = H - padT - padB;
    var groupW = chartW / 12;
    var barW   = groupW * 0.28;
    var gap    = 3;

    var rawStep = maxVal / 4;
    var mag  = Math.pow(10, Math.floor(Math.log10(rawStep)));
    var step = Math.ceil(rawStep / mag) * mag;
    var ticks = [];
    for (var t = 0; t <= maxVal; t += step) ticks.push(t);

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg"' +
      ' style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">';

    ticks.forEach(function (tick) {
      var y = padT + chartH - (tick / maxVal) * chartH;
      svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y +
        '" stroke="#eef0f3" stroke-width="1"/>';
      svg += '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end"' +
        ' fill="#9aa8b8" font-size="10">' + tick.toLocaleString() + '</text>';
    });

    months.forEach(function (m, i) {
      var x    = padL + i * groupW + groupW / 2;
      var pVal = prior[i] || 0;
      var cVal = current[i];

      if (pVal > 0) {
        var prH = (pVal / maxVal) * chartH;
        var prY = padT + chartH - prH;
        svg += '<rect x="' + (x - barW - gap / 2) + '" y="' + prY + '" width="' + barW +
          '" height="' + prH + '" fill="#c8cdd3" rx="2"/>';
      }

      if (cVal != null && cVal > 0) {
        var cuH = (cVal / maxVal) * chartH;
        var cuY = padT + chartH - cuH;
        svg += '<rect x="' + (x + gap / 2) + '" y="' + cuY + '" width="' + barW +
          '" height="' + cuH + '" fill="' + d.accentColor + '" rx="2"/>';
      }

      svg += '<text x="' + x + '" y="' + (H - 7) +
        '" text-anchor="middle" fill="#9aa8b8" font-size="11">' + m + '</text>';
    });

    svg += '</svg>';
    return svg;
  }

  // ── Inner card render + event wiring ────────────────────────────────────
  function _renderInner(mountEl, plantData) {
    var d     = plantData[_activeSystem];
    var equip = d.equipment || [];

    function has(field) {
      return equip.some(function (e) { return e[field] != null; });
    }
    var hasLwt = has('lwt');
    var hasEwt = has('ewt');

    var running = equip.filter(function (e) { return e.status === 'running'; }).length;

    var kpis = [
      { label: d.equipLabelPlural, value: running + '/' + equip.length, unit: 'running' },
      d.plantLeavingTemp  != null ? { label: 'Avg ' + d.plantLeavingLabel,  value: d.plantLeavingTemp,  unit: d.tempUnit } : null,
      d.plantEnteringTemp != null ? { label: 'Avg ' + d.plantEnteringLabel, value: d.plantEnteringTemp, unit: d.tempUnit } : null,
      d.plantEfficiency   != null ? { label: 'Plant Efficiency', value: d.plantEfficiency, unit: 'kW/ton' } : null
    ].filter(Boolean);

    var cols = [
      { key: 'name',   label: d.equipLabel },
      { key: 'status', label: 'Status' }
    ];
    if (hasLwt) cols.push({ key: 'lwt', label: 'LWT (' + d.tempUnit + ')' });
    if (hasEwt) cols.push({ key: 'ewt', label: 'EWT (' + d.tempUnit + ')' });

    var chartSvg = _renderBarChart(d);
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

    var kpisHtml = kpis.map(function (k) {
      return '<div class="cup-kpi-item">' +
        '<div class="cup-kpi-label">' + k.label + '</div>' +
        '<div class="cup-kpi-value">' + k.value +
          '<span class="cup-kpi-unit">' + k.unit + '</span>' +
        '</div>' +
        '</div>';
    }).join('');

    var theadHtml = cols.map(function (c) { return '<th>' + c.label + '</th>'; }).join('');

    var tbodyHtml = equip.map(function (e) {
      return '<tr>' + cols.map(function (c) {
        if (c.key === 'name') return '<td>' + e.name + '</td>';
        if (c.key === 'status') {
          var cls = e.status === 'running' ? 'running' : e.status === 'fault' ? 'fault' : 'off';
          var lbl = e.status.charAt(0).toUpperCase() + e.status.slice(1);
          return '<td><span class="cup-status-dot ' + cls + '"></span>' + lbl + '</td>';
        }
        var val = e[c.key];
        return '<td>' + (val != null ? val : '—') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    mountEl.innerHTML =
      // ── Header ──────────────────────────────────────────────────────────
      '<div class="cup-card-header">' +
        '<div class="cup-card-header-left">' +
          '<div class="cup-card-icon" style="background:' + d.iconBg + ';color:' + d.accentColor + ';">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
              ' stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="2" y="7" width="20" height="14" rx="2"/>' +
              '<path d="M12 7V3"/><path d="M8 7V5"/><path d="M16 7V5"/>' +
              '<path d="M6 12h2"/><path d="M6 16h2"/><path d="M16 12h2"/><path d="M16 16h2"/>' +
              '<path d="M10 12h4v5h-4z"/>' +
            '</svg>' +
          '</div>' +
          '<div>' +
            '<div class="cup-card-title">Central Utility Plant</div>' +
            '<div class="cup-card-subtitle">Chillers · Heating · Condenser · Domestic Hot Water</div>' +
          '</div>' +
        '</div>' +
        '<div class="cup-card-actions">' +
          '<button class="cup-toggle-body-btn" title="Collapse / Expand">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
              ' stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

      // ── Body ─────────────────────────────────────────────────────────────
      '<div class="cup-card-body" id="cupCardBody">' +
        '<div class="cup-system-toggle">' + pillsHtml + '</div>' +

        (chartSvg
          ? '<div class="cup-section-label">' + d.runtimeLabel + '</div>' +
            '<div class="cup-chart-legend">' +
              '<div class="cup-legend-item">' +
                '<div class="cup-legend-swatch" style="background:#c8cdd3;"></div> ' + priorYear +
              '</div>' +
              '<div class="cup-legend-item">' +
                '<div class="cup-legend-swatch" style="background:' + d.accentColor + ';"></div> ' + currentYear +
              '</div>' +
            '</div>' +
            '<div class="cup-bar-chart-container">' + chartSvg + '</div>' +
            '<div style="height:16px;"></div>'
          : '') +

        '<div class="cup-kpi-row">' + kpisHtml + '</div>' +

        '<div class="cup-section-label">' + d.equipLabel + ' Status</div>' +
        '<div class="cup-table-header">' +
          '<input type="text" class="cup-table-filter" placeholder="Filter…" id="cupEquipFilter">' +
          '<span class="cup-table-count" id="cupTableCount">' +
            equip.length + ' / ' + equip.length + ' ' + d.equipLabelPlural +
          '</span>' +
        '</div>' +
        '<table class="cup-equip-table" id="cupEquipTable">' +
          '<thead><tr>' + theadHtml + '</tr></thead>' +
          '<tbody>' + tbodyHtml + '</tbody>' +
        '</table>' +
      '</div>';

    // ── System pill listeners ──────────────────────────────────────────────
    mountEl.querySelectorAll('.cup-system-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _activeSystem = btn.getAttribute('data-system');
        _renderInner(mountEl, plantData);
      });
    });

    // ── Collapse / expand toggle ──────────────────────────────────────────
    var toggleBtn = mountEl.querySelector('.cup-toggle-body-btn');
    var bodyEl    = mountEl.querySelector('#cupCardBody');
    if (toggleBtn && bodyEl) {
      toggleBtn.addEventListener('click', function () {
        var hidden = bodyEl.style.display === 'none';
        bodyEl.style.display = hidden ? '' : 'none';
        var svg = toggleBtn.querySelector('svg polyline');
        if (svg) svg.setAttribute('points', hidden ? '18 15 12 9 6 15' : '6 9 12 15 18 9');
      });
    }

    // ── Filter table ──────────────────────────────────────────────────────
    var filterInput = mountEl.querySelector('#cupEquipFilter');
    if (filterInput) {
      filterInput.addEventListener('input', function () {
        var q       = filterInput.value.toLowerCase();
        var rows    = mountEl.querySelectorAll('#cupEquipTable tbody tr');
        var visible = 0;
        rows.forEach(function (r) {
          var match = r.textContent.toLowerCase().indexOf(q) !== -1;
          r.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        var countEl = mountEl.querySelector('#cupTableCount');
        if (countEl) {
          countEl.textContent = visible + ' / ' + rows.length + ' ' + d.equipLabelPlural;
        }
      });
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────
  NS.components.CUP = {
    render: function (data) {
      _plantData    = (data && data.plant) ? data.plant : _DEMO;
      _activeSystem = 'cooling';
      return '<div class="cup-card" id="cupCard"></div>';
    },

    initCard: function (container) {
      var mountEl = container.querySelector('#cupCard');
      if (!mountEl || !_plantData) return;
      _renderInner(mountEl, _plantData);
    }
  };

})(window.mbcxDashboard);
