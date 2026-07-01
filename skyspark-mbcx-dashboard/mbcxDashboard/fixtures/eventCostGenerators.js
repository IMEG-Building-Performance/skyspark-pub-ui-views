window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};
window.mbcxDashboard.eventCost.generators = {};

window.mbcxDashboard.eventCost.generators.generateDemoEventCostResults = function() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  function dateOffset(days) { var d = new Date(today); d.setDate(d.getDate() + days); return d.toISOString().substring(0, 10); }
  var defs = [
    { id: 'E-001', name: 'Healthcare Summit', start: -187, end: -185, sf: 85000, dq: 0.97, costs: { Electric: 12400, CHW: 3200, Steam: 1800 } },
    { id: 'E-002', name: 'Annual Fall Gala', start: -181, end: -180, sf: 42000, dq: 0.95, costs: { Electric: 6800, CHW: 1400 } },
    { id: 'E-003', name: 'Year-End Conference', start: -163, end: -161, sf: 95000, dq: 0.98, costs: { Electric: 14200, CHW: 4100, Steam: 2600 } },
    { id: 'E-004', name: 'Holiday Corporate Event', start: -156, end: -155, sf: 38000, dq: 0.91, costs: { Electric: 5100, Gas: 890 } },
    { id: 'E-005', name: 'New Year Kickoff', start: -126, end: -124, sf: 72000, dq: 0.96, costs: { Electric: 9800, CHW: 2900, Steam: 1400 } },
    { id: 'E-006', name: 'Board Quarterly Review', start: -118, end: -117, sf: 28000, dq: 0.99, costs: { Electric: 4200 } },
    { id: 'E-007', name: 'Industry Forum', start: -99, end: -96, sf: 110000, dq: 0.94, costs: { Electric: 18600, CHW: 5800, Steam: 3200 } },
    { id: 'E-008', name: 'Innovation Workshop', start: -84, end: -83, sf: 55000, dq: 0.88, costs: { Electric: 7400, Gas: 1200 } },
    { id: 'E-009', name: 'Spring Symposium', start: -71, end: -69, sf: 88000, dq: 0.96, costs: { Electric: 13200, CHW: 3900, Steam: 2100 } },
    { id: 'E-010', name: 'Alumni Weekend', start: -59, end: -58, sf: 64000, dq: 0.93, costs: { Electric: 8600, CHW: 2200 } },
    { id: 'E-011', name: 'Regional Summit', start: -43, end: -40, sf: 125000, dq: 0.97, costs: { Electric: 22400, CHW: 6900, Steam: 4100, Gas: 1800 } },
    { id: 'E-012', name: 'Innovation Day', start: -27, end: -26, sf: 47000, dq: 0.90, costs: { Electric: 6900, CHW: 1800 } },
    { id: 'E-013', name: 'Leadership Forum', start: -15, end: -13, sf: 78000, dq: 0.95, costs: { Electric: 11600, CHW: 3400, Steam: 1900 } },
    { id: 'E-014', name: 'Summer Leadership Summit', start: 26, end: 29, sf: 105000, dq: null, costs: {} },
    { id: 'E-015', name: 'Annual Review Conference', start: 51, end: 52, sf: 62000, dq: null, costs: {} }
  ];
  var results = [];
  defs.forEach(function(def) {
    var startDate = dateOffset(def.start);
    var endDate = dateOffset(def.end);
    var utilities = Object.keys(def.costs);
    if (utilities.length === 0) {
      results.push({ eventID: def.id, eventName: def.name, siteRef: 'demo', utilityType: 'Electric', costType: 'Usage', usage: 0, rate: 0, cost: 0, eventSF: def.sf, metersUsed: 0, calculatedOn: null, dataQuality: null, errorCount: 0, mostCommonError: null, eventStart: startDate, eventEnd: endDate });
    } else {
      utilities.forEach(function(u) {
        var cost = def.costs[u];
        var rates = { Electric: 0.228, CHW: 0.421, Steam: 19.42, Gas: 0.794 };
        var rate = rates[u] || 0.228;
        results.push({ eventID: def.id, eventName: def.name, siteRef: 'demo', utilityType: u, costType: 'Usage', usage: rate > 0 ? cost / rate : 0, rate: rate, cost: cost, eventSF: def.sf, metersUsed: utilities.length, calculatedOn: endDate, dataQuality: def.dq, errorCount: 0, mostCommonError: null, eventStart: startDate, eventEnd: endDate });
      });
    }
  });
  return results;
};

window.mbcxDashboard.eventCost.generators.generateSampleData = function(startDateStr, endDateStr) {
  var data = [];
  var startDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : new Date('2025-12-01T00:00:00');
  var endDate = endDateStr ? new Date(endDateStr + 'T23:59:59') : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  var numHours = Math.ceil((endDate - startDate) / (60 * 60 * 1000));

  for (var i = 0; i < numHours; i++) {
    var timestamp = new Date(startDate.getTime() + i * 60 * 60 * 1000);

    var hourOfDay = timestamp.getHours();
    var basePower = 65;

    var businessHoursBoost = 0;
    if (hourOfDay >= 7 && hourOfDay <= 18) {
      businessHoursBoost = 15 * Math.sin((hourOfDay - 7) * Math.PI / 11);
    }

    var noise = (Math.random() - 0.5) * 5;
    var power = basePower + businessHoursBoost + noise;

    data.push({
      x: timestamp,
      y: Math.max(50, power)
    });
  }

  return data;
};

window.mbcxDashboard.eventCost.generators.generateSampleEvents = function() {
  return [
    {
      startTime: new Date('2025-12-02T08:00:00'),
      endTime: new Date('2025-12-02T11:30:00'),
      label: 'HVAC Maintenance',
      description: 'Scheduled maintenance on rooftop unit.',
      duration: '3.5 hours',
      avgPower: '68.2 kW',
      color: 'rgba(54, 162, 235, 0.8)'
    },
    {
      startTime: new Date('2025-12-02T10:00:00'),
      endTime: new Date('2025-12-02T13:00:00'),
      label: 'Chiller Startup',
      description: 'Seasonal chiller system activation.',
      duration: '3 hours',
      avgPower: '75.8 kW',
      color: 'rgba(255, 159, 64, 0.8)'
    },
    {
      startTime: new Date('2025-12-03T09:00:00'),
      endTime: new Date('2025-12-03T12:00:00'),
      label: 'High Load Event',
      description: 'Peak demand period exceeded threshold.',
      duration: '3 hours',
      avgPower: '82.4 kW',
      color: 'rgba(255, 99, 132, 0.8)'
    },
    {
      startTime: new Date('2025-12-03T10:30:00'),
      endTime: new Date('2025-12-03T14:00:00'),
      label: 'Load Testing',
      description: 'Electrical system load capacity test.',
      duration: '3.5 hours',
      avgPower: '78.1 kW',
      color: 'rgba(153, 102, 255, 0.8)'
    },
    {
      startTime: new Date('2025-12-03T11:00:00'),
      endTime: new Date('2025-12-03T11:45:00'),
      label: 'Alarm Response',
      description: 'Investigating temperature alarm in zone 3.',
      duration: '45 min',
      avgPower: '69.5 kW',
      color: 'rgba(255, 206, 86, 0.8)'
    },
    {
      startTime: new Date('2025-12-04T09:30:00'),
      endTime: new Date('2025-12-04T10:45:00'),
      label: 'System Restart',
      description: 'BMS system restart and recalibration.',
      duration: '1.25 hours',
      avgPower: '55.1 kW',
      color: 'rgba(75, 192, 192, 0.8)'
    },
    {
      startTime: new Date('2025-12-05T14:00:00'),
      endTime: new Date('2025-12-05T17:00:00'),
      label: 'Load Reduction',
      description: 'Demand response program active.',
      duration: '3 hours',
      avgPower: '58.7 kW',
      color: 'rgba(75, 192, 192, 0.8)'
    },
    {
      startTime: new Date('2025-12-05T15:30:00'),
      endTime: new Date('2025-12-05T18:30:00'),
      label: 'Generator Test',
      description: 'Monthly backup generator runtime test.',
      duration: '3 hours',
      avgPower: '64.2 kW',
      color: 'rgba(201, 203, 207, 0.8)'
    },
    {
      startTime: new Date('2025-12-06T08:00:00'),
      endTime: new Date('2025-12-06T10:30:00'),
      label: 'Equipment Test',
      description: 'Annual equipment performance testing.',
      duration: '2.5 hours',
      avgPower: '71.3 kW',
      color: 'rgba(255, 159, 64, 0.8)'
    },
    {
      startTime: new Date('2025-12-06T09:15:00'),
      endTime: new Date('2025-12-06T11:00:00'),
      label: 'Calibration',
      description: 'Sensor calibration and verification.',
      duration: '1.75 hours',
      avgPower: '66.8 kW',
      color: 'rgba(54, 162, 235, 0.8)'
    }
  ];
};
