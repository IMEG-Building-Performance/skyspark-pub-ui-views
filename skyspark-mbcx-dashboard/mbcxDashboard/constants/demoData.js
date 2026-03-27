// constants/demoData.js
// Placeholder data matching the dashboard's data contract.
// Replace with live Axon eval results in evals/loadData.js.
window.mbcxDashboard = window.mbcxDashboard || {};

window.mbcxDashboard.demoData = {

  meta: {
    title:    'FDD Dashboard \u2014 HVAC Equipment Health',
    subtitle: 'All Sites \u00b7 Building Meters \u00b7 CUP \u00b7 AHUs \u00b7 Terminal Units',
    sites:    ['All Sites', 'Main Campus', 'Annex'],
    periods:  ['Past Week', 'Past Month', 'YTD 2026']
  },

  healthBanner: {
    score:        72,
    riskLabel:    'Moderate Risk',
    critical:     8,
    warnings:     14,
    normal:       479,
    totalUnits:   501,
    estWasteKwh:  9240
  },

  buildingMeters: {
    eui:              54.2,
    euiTarget:        48.0,
    euiVariancePct:   12.9,
    grossAreaSf:      218400,
    ytdUsageKwh:      310514,
    cbecsMedian:      50.0,
    energyStarScore:  61,
    normalizedMonthly: {
      y2025: [5.1, 4.7, 4.4, 4.0, 3.8, 3.6, 3.9, 4.1, 3.9, 4.2, 4.6, 5.0],
      y2026: [5.8, 5.4, 5.0, null, null, null, null, null, null, null, null, null]
    }
  },

  cup: {
    cooling: {
      avgOutput:     847,
      avgOutputUnit: 'tons \u00b7 avg cooling load',
      avgOutputCls:  'blue',
      kpis: [
        { name: 'Chiller-1 Load', val: '82%',    cls: 'ok'   },
        { name: 'Chiller-2 Load', val: '91%',    cls: 'warn' },
        { name: 'Fleet kW/ton',   val: '0.71',   cls: 'warn' },
        { name: 'Avg CHW \u0394T', val: '10.2\u00b0F', cls: 'blue' },
        { name: 'Design \u0394T',  val: '12\u00b0F',   cls: 'ok'   }
      ],
      pump: {
        title:   'Chilled Water Pump Speed',
        sub:     'CWP avg VFD output % \u2014 daily this week',
        dataA:   [78, 80, 82, 79, 83, 75, 77],
        dataB:   [72, 74, 76, 71, 74, 68, 70],
        colorA:  '#4A6FA5',
        colorB:  '#9B2335',
        legendA: 'CWP-A',
        legendB: 'CWP-B'
      },
      dt: {
        title:   'CHW Delta-T Trend',
        sub:     'Supply/return \u0394T \u00b0F \u2014 daily avg',
        data:    [9.8, 10.1, 10.4, 10.2, 10.5, 9.6, 9.9],
        design:  12,
        color:   '#4A6FA5',
        legendA: 'Actual \u0394T',
        legendB: '\u2014 Design 12\u00b0F'
      }
    },
    heating: {
      avgOutput:     1240,
      avgOutputUnit: 'MBH \u00b7 avg heating load',
      avgOutputCls:  'warn',
      kpis: [
        { name: 'Boiler-1 Load', val: '68%',     cls: 'ok'   },
        { name: 'Boiler-2 Load', val: '54%',     cls: 'ok'   },
        { name: 'Boiler AFUE',   val: '81%',     cls: 'neg'  },
        { name: 'Avg HHW \u0394T', val: '18.4\u00b0F', cls: 'warn' },
        { name: 'Design \u0394T',  val: '20\u00b0F',   cls: 'ok'   }
      ],
      pump: {
        title:   'Hot Water Pump Speed',
        sub:     'HWP avg VFD output % \u2014 daily this week',
        dataA:   [64, 67, 70, 68, 72, 60, 62],
        dataB:   [58, 61, 64, 62, 66, 55, 57],
        colorA:  '#D97706',
        colorB:  '#9B2335',
        legendA: 'HWP-A',
        legendB: 'HWP-B'
      },
      dt: {
        title:   'HHW Delta-T Trend',
        sub:     'Supply/return \u0394T \u00b0F \u2014 daily avg',
        data:    [17.8, 18.2, 18.6, 18.4, 19.1, 17.2, 17.9],
        design:  20,
        color:   '#D97706',
        legendA: 'Actual \u0394T'
      }
    },
    condenser: {
      avgOutput:     85.1,
      avgOutputUnit: '\u00b0F \u00b7 avg condenser supply temp',
      avgOutputCls:  'blue',
      kpis: [
        { name: 'CT Fan Speed', val: '72%',     cls: 'ok'   },
        { name: 'CW Return',    val: '95.3\u00b0F', cls: 'ok'   },
        { name: 'CW Approach',  val: '7.2\u00b0F',  cls: 'warn' },
        { name: 'Avg CW \u0394T', val: '10.2\u00b0F', cls: 'blue' },
        { name: 'Design \u0394T', val: '10\u00b0F',   cls: 'ok'   }
      ],
      pump: {
        title:   'Condenser Water Pump Speed',
        sub:     'CDWP avg VFD output % \u2014 daily this week',
        dataA:   [82, 84, 86, 83, 85, 79, 81],
        dataB:   [80, 82, 84, 81, 83, 77, 79],
        colorA:  '#7C3AED',
        colorB:  '#5C8A3C',
        legendA: 'CDWP-A',
        legendB: 'CDWP-B'
      },
      dt: {
        title:   'Condenser \u0394T Trend',
        sub:     'Supply/return \u0394T \u00b0F \u2014 daily avg',
        data:    [9.8, 10.0, 10.3, 10.2, 10.4, 9.7, 9.9],
        design:  10,
        color:   '#7C3AED',
        legendA: 'Actual \u0394T'
      }
    },
    dhw: {
      avgOutput:     122,
      avgOutputUnit: '\u00b0F \u00b7 avg DHW supply temp',
      avgOutputCls:  'blue',
      kpis: [
        { name: 'DHW Heater-1', val: 'Active',  cls: 'ok'   },
        { name: 'DHW Heater-2', val: 'Standby', cls: 'info' },
        { name: 'Avg Flow',     val: '14.2 gpm', cls: 'blue' },
        { name: 'Avg \u0394T',  val: '62\u00b0F', cls: 'ok'  },
        { name: 'Setpoint',     val: '120\u00b0F', cls: 'ok' }
      ],
      pump: {
        title:   'DHW Pump Speed',
        sub:     'DHWP avg VFD output % \u2014 daily this week',
        dataA:   [55, 57, 58, 56, 59, 52, 54],
        dataB:   null,
        colorA:  '#0EA5E9',
        legendA: 'DHWP-A'
      },
      dt: {
        title:   'DHW Supply Temp Trend',
        sub:     'Supply temp \u00b0F vs. setpoint \u2014 daily avg',
        data:    [121, 122, 122, 123, 121, 120, 122],
        design:  120,
        color:   '#0EA5E9',
        legendA: 'Actual',
        legendB: 'Setpoint 120\u00b0F'
      }
    }
  },

  ahu: {
    unitCount: 24,
    metrics: {
      vfd: {
        title:    'Fleet Avg VFD Speed by Month',
        tblTitle: 'AHU Unit Summary \u2014 VFD Speed',
        unit:     '%',
        y2025:    [38, 44, 53, 47, 38, 44, 45, 41, 38, 35, 37, 40],
        y2026:    [41, 47, 56, 51, null, null, null, null, null, null, null, null],
        rows: [
          { name: 'AHU-01.1',         v26: 56.93, v25: 58.52, diff: -1.598  },
          { name: 'AHU-01.2',         v26: 65.45, v25: 89.40, diff: -23.950 },
          { name: 'AHU-11 (Roof)',     v26: 82.39, v25: 82.98, diff: -0.595  },
          { name: 'AHU-16 (Maint.)',   v26: 61.53, v25: 60.37, diff:  1.156  },
          { name: 'AHU-18',           v26: 57.87, v25: 77.62, diff: -19.750 },
          { name: 'AHU-2',            v26: 65.10, v25: 28.01, diff:  37.090 },
          { name: 'AHU-30',           v26: 67.24, v25: 87.73, diff: -20.490 },
          { name: 'AHU-3 Rheumatology', v26: 35.29, v25: 71.20, diff: -35.910 },
          { name: 'AHU-43',           v26: 79.75, v25: 58.07, diff:  21.680 },
          { name: 'AHU-45',           v26: 66.72, v25: 73.98, diff: -7.253  },
          { name: 'AHU-70',           v26:  0,    v25:  0,    diff:  0      },
          { name: 'AHU-71',           v26: 50.16, v25: 51.28, diff: -1.121  },
          { name: 'AHU-72',           v26: 82.47, v25: 76.42, diff:  6.049  },
          { name: 'AHU-73',           v26: 95.51, v25: 95.22, diff:  0.292  },
          { name: 'AHU-74',           v26: 72.01, v25: 68.26, diff:  3.746  },
          { name: 'AHU-80-A',         v26: 67.24, v25: 66.35, diff:  0.889  },
          { name: 'AHU-81-A',         v26: 88.93, v25: 82.86, diff:  6.067  },
          { name: 'AHU-82-A',         v26: 61.59, v25:  0.08, diff:  61.510 },
          { name: 'AHU-82-B',         v26:  7.87, v25: 69.52, diff: -61.650 },
          { name: 'AHU-83',           v26:  0,    v25: 66.35, diff: -66.350 },
          { name: 'AHU-84',           v26: 63.98, v25: 71.73, diff: -7.747  },
          { name: 'AHU-86',           v26:  7.856,v25:  0,    diff:  7.856  },
          { name: 'AHU-87',           v26: 42.41, v25: 45.89, diff: -3.479  },
          { name: 'AHU-X',            v26:  7.368,v25: 14.42, diff: -7.053  }
        ]
      },
      oad: {
        title:    'Fleet Avg OAD Position by Month',
        tblTitle: 'AHU Unit Summary \u2014 OAD Position',
        unit:     '%',
        y2025:    [47, 58, 57, 54, 55, 38, 37, 43, 49, 51, 52, 49],
        y2026:    [52, 60, 68, 66, null, null, null, null, null, null, null, null],
        rows: [
          { name: 'AHU-01.1',           v26: 52.1, v25: 48.3, diff:  3.8  },
          { name: 'AHU-01.2',           v26: 61.2, v25: 70.1, diff: -8.9  },
          { name: 'AHU-11 (Roof)',       v26: 44.5, v25: 42.8, diff:  1.7  },
          { name: 'AHU-18',             v26: 38.2, v25: 55.6, diff: -17.4 },
          { name: 'AHU-2',              v26: 72.1, v25: 51.3, diff:  20.8 },
          { name: 'AHU-30',             v26: 58.4, v25: 74.2, diff: -15.8 },
          { name: 'AHU-3 Rheumatology', v26: 28.4, v25: 62.1, diff: -33.7 },
          { name: 'AHU-43',             v26: 68.2, v25: 52.4, diff:  15.8 },
          { name: 'AHU-72',             v26: 71.3, v25: 65.8, diff:  5.5  },
          { name: 'AHU-73',             v26: 88.4, v25: 90.1, diff: -1.7  },
          { name: 'AHU-74',             v26: 61.2, v25: 58.4, diff:  2.8  },
          { name: 'AHU-82-B',           v26:  5.2, v25: 62.4, diff: -57.2 },
          { name: 'AHU-83',             v26:  0,   v25: 58.3, diff: -58.3 },
          { name: 'AHU-84',             v26: 55.1, v25: 60.2, diff: -5.1  }
        ]
      },
      clg: {
        title:    'Fleet Avg Cooling Valve Position by Month',
        tblTitle: 'AHU Unit Summary \u2014 Cooling Valve',
        unit:     '%',
        y2025:    [12, 14, 18, 24, 38, 52, 61, 58, 42, 28, 16, 13],
        y2026:    [14, 16, 22, null, null, null, null, null, null, null, null, null],
        rows: [
          { name: 'AHU-01.1', v26: 14.2, v25: 12.1, diff:  2.1  },
          { name: 'AHU-01.2', v26: 22.4, v25: 18.3, diff:  4.1  },
          { name: 'AHU-2',    v26: 38.4, v25: 14.2, diff:  24.2 },
          { name: 'AHU-30',   v26: 18.2, v25: 28.4, diff: -10.2 },
          { name: 'AHU-43',   v26: 32.1, v25: 24.5, diff:  7.6  },
          { name: 'AHU-72',   v26: 28.4, v25: 22.1, diff:  6.3  },
          { name: 'AHU-73',   v26: 44.2, v25: 38.6, diff:  5.6  },
          { name: 'AHU-82-B', v26:  0,   v25: 28.4, diff: -28.4 },
          { name: 'AHU-83',   v26:  0,   v25: 24.2, diff: -24.2 }
        ]
      },
      htg: {
        title:    'Fleet Avg Heating Valve Position by Month',
        tblTitle: 'AHU Unit Summary \u2014 Heating Valve',
        unit:     '%',
        y2025:    [62, 58, 44, 28, 14, 8, 6, 7, 12, 22, 48, 60],
        y2026:    [58, 54, 38, null, null, null, null, null, null, null, null, null],
        rows: [
          { name: 'AHU-01.1',           v26: 58.2, v25: 62.4, diff: -4.2  },
          { name: 'AHU-01.2',           v26: 44.8, v25: 52.1, diff: -7.3  },
          { name: 'AHU-18',             v26: 72.4, v25: 55.2, diff:  17.2 },
          { name: 'AHU-2',              v26: 22.1, v25:  8.4, diff:  13.7 },
          { name: 'AHU-3 Rheumatology', v26: 81.2, v25: 62.4, diff:  18.8 },
          { name: 'AHU-43',             v26: 18.4, v25: 22.1, diff: -3.7  },
          { name: 'AHU-72',             v26: 14.2, v25: 16.8, diff: -2.6  },
          { name: 'AHU-82-B',           v26: 88.4, v25: 42.1, diff:  46.3 },
          { name: 'AHU-83',             v26:  0,   v25: 38.4, diff: -38.4 }
        ]
      },
      hum: {
        title:    'Fleet Avg Humidifier Output by Month',
        tblTitle: 'AHU Unit Summary \u2014 Humidifier',
        unit:     '%',
        y2025:    [44, 38, 24, 8, 2, 0, 0, 0, 4, 14, 32, 42],
        y2026:    [42, 36, 20, null, null, null, null, null, null, null, null, null],
        rows: [
          { name: 'AHU-01.1',           v26: 42.1, v25: 44.2, diff: -2.1 },
          { name: 'AHU-01.2',           v26: 38.4, v25: 40.1, diff: -1.7 },
          { name: 'AHU-11 (Roof)',       v26: 28.4, v25: 30.2, diff: -1.8 },
          { name: 'AHU-18',             v26: 18.2, v25: 22.4, diff: -4.2 },
          { name: 'AHU-3 Rheumatology', v26: 52.4, v25: 44.1, diff:  8.3 },
          { name: 'AHU-72',             v26:  8.4, v25: 12.1, diff: -3.7 },
          { name: 'AHU-73',             v26:  4.2, v25:  6.8, diff: -2.6 }
        ]
      }
    }
  },

  terminalUnits: {
    totalVavs: 501,
    compliance: {
      coveragePct:   94.2,
      criticalZones: 72,
      compliant:     68,
      openFaults:    4,
      noData:        0
    },
    operation: {
      faultyReheat:  6,
      leakingValves: 15,
      faults: [
        { equip: '1450.12 Office (V1)', desc: 'Valve 78% \u00b7 DAT 83\u00b0F', sev: 'crit', dur: '4d' },
        { equip: '1480.01 Lab A',       desc: 'Valve 35% \u00b7 DAT 88\u00b0F', sev: 'crit', dur: '3d' },
        { equip: '1450.06 Conf. RM',    desc: 'Leaking \u00b7 DAT 76\u00b0F',   sev: 'warn', dur: '6d' },
        { equip: '1470.03 Board Rm',    desc: 'Valve 81% \u00b7 DAT 79\u00b0F', sev: 'warn', dur: '2d' }
      ]
    },
    energy: {
      totalReheatKwh:    4820,
      faultyReheatKwh:   2560,
      leakingValveKwh:   2260,
      fleetAvgFlowCfm:   142,
      maxZoneFlow:       '680 cfm \u00b7 1470.03',
      reheatDaily: {
        faultyReheat: [340, 380, 395, 410, 385, 320, 330],
        leakingValve: [290, 310, 330, 345, 310, 275, 280]
      }
    },
    comfort: {
      avgTempF:      71.4,
      avgRhPct:      38,
      zonesInRange:  468,
      tooWarm:       21,
      tooCool:       12,
      rhOutOfRange:  8
    }
  }

};
