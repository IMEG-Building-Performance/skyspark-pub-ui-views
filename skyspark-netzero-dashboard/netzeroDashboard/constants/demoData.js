// constants/demoData.js
// Placeholder data matching the dashboard's data contract.
// Replace with live Axon eval results in evals/loadData.js.
window.netzeroDashboard = window.netzeroDashboard || {};

window.netzeroDashboard.demoData = {

  meta: {
    title:    'Building Energy \u2014 Actual vs. Modeled',
    sites:    ['All Sites', 'Main Campus', 'Annex'],
    dateRange:'2026-01-01 \u2013 12-31',
    units:    'Monthly \u00b7 kWh'
  },

  kpis: {
    buildingUsage:    531236,
    solarGeneration:  402600,
    netPerformance:  -128636,
    coverageRatio:    75.8,
    surplusNote:      'Surplus months: May \u2013 Sep \u00b7 Deficit widening Q4',
    sourceMix: {
      water:  44,
      wind:   26,
      fossil: 30
    }
  },

  equiv: {
    trees:   { total: 28217, monthly: 1103, unit: 'total planted equiv.' },
    water:   { total: 797967, monthly: 31191, unit: 'total gallons equiv.' },
    gas:     { total: 123830, monthly: 4840, unit: 'total gallons equiv.' },
    methane: { total: 97046, monthly: 3793, unit: 'total lbs. equiv.' }
  },

  charts: {
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    building: {
      actual: [64378, 54713, 39275, 35366, 34930, 40757, 44521, 40532, 36653, 37057, 41293, 61761],
      model:  [102343, 88224, 71012, 80000, 78000, 75000, 88000, 90000, 85000, 82000, 80000, 99000]
    },
    solar: {
      actual: [11169, 13163, 27328, 30266, 48725, 64506, 58375, 57793, 47391, 27503, 12049, 4332],
      model:  [66742, 74373, 97773, 110000, 130000, 135000, 140000, 145000, 120000, 90000, 60000, 55000]
    }
  },

  detail: {
    months: ['Jan', 'Feb', 'Mar'],
    buildingConsumption: {
      actual: [112461, 104149, 93903],
      model:  [102343, 88224, 71012],
      diff:   [-10118, -15926, -22891]
    },
    solarGeneration: {
      actual: [74840, 89864, 78489],
      model:  [66742, 74373, 97773],
      diff:   [-8098, -15491, 19284]
    },
    actualNetZero: {
      building: [112461, 104149, 93903],
      solar:    [74840, 89864, 78489],
      net:      [-37621, -14286, -15414]
    },
    modeledNetZero: {
      building: [102343, 88224, 71012],
      solar:    [66742, 74373, 97773],
      net:      [-35601, -13851, 26761]
    }
  },

  meterBreakdown: {
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    consumption: [
      { name: 'HVAC',              values: [51185, 42553, 27128, 23773, 23037, 28783, 32113, 28431, 24703, 24532, 28896, 48042], total: 383176 },
      { name: 'Plug & Process',    values: [4340, 3891, 4101, 3975, 3981, 3951, 4133, 4014, 3831, 3911, 3932, 4627],           total: 48687 },
      { name: 'Exterior Lighting', values: [277, 224, 98, 140, 230, 261, 239, 220, 243, 273, 259, 293],                         total: 2757 },
      { name: 'Interior Lighting', values: [5600, 5340, 5078, 4688, 4809, 4630, 4740, 4800, 4910, 5335, 5436, 5881],           total: 61247 },
      { name: 'DHW',               values: [2976, 2705, 2870, 2790, 2873, 3132, 3296, 3067, 2966, 3006, 2770, 2918],           total: 35369 }
    ],
    consumptionTotal: { name: 'Total Energy Consumption (kWh)', values: [64378, 54713, 39275, 35366, 34930, 40757, 44521, 40532, 36653, 37057, 41293, 61761], total: 531236 },
    generation: [
      { name: 'Elec Meter SolarEdge',                   values: [8124, 10450, 21959, 24899, 42060, 57731, 52142, 51030, 41257, 23066, 9273, 3164],   total: 345155 },
      { name: 'Elec Power Meter Solar Trans Disc (PV)',  values: [3045, 2713, 5369, 5367, 6665, 6775, 6233, 6763, 6134, 4437, 2776, 1168],           total: 57445 }
    ],
    generationTotal: { name: 'Total Energy Generation (kWh)', values: [11169, 13163, 27328, 30266, 48725, 64506, 58375, 57793, 47391, 27503, 12049, 4332], total: 402600 },
    netPerformance:  { name: 'Net Building Performance (kWh)', values: [-53209, -41550, -11947, -5100, 13795, 23749, 13854, 17261, 10738, -9354, -29244, -57429], total: -128636 }
  }

};
