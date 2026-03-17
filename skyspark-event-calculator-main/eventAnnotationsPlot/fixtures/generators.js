window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.generators = {};

/**
 * Generate sample time-series data (kW Power)
 * @param {string} startDateStr - Start date in YYYY-MM-DD format (optional)
 * @param {string} endDateStr - End date in YYYY-MM-DD format (optional)
 */
window.EventAnnotationsPlot.generators.generateSampleData = function(startDateStr, endDateStr) {
  var data = [];
  var startDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : new Date('2025-12-01T00:00:00');
  var endDate = endDateStr ? new Date(endDateStr + 'T23:59:59') : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Calculate number of hours between start and end
  var numHours = Math.ceil((endDate - startDate) / (60 * 60 * 1000));

  // Generate hourly data points
  for (var i = 0; i < numHours; i++) {
    var timestamp = new Date(startDate.getTime() + i * 60 * 60 * 1000);

    // Simulate power consumption with daily pattern
    var hourOfDay = timestamp.getHours();
    var basePower = 65; // Base load in kW

    // Business hours usage (7am-6pm)
    var businessHoursBoost = 0;
    if (hourOfDay >= 7 && hourOfDay <= 18) {
      businessHoursBoost = 15 * Math.sin((hourOfDay - 7) * Math.PI / 11);
    }

    var noise = (Math.random() - 0.5) * 5;
    var power = basePower + businessHoursBoost + noise;

    data.push({
      x: timestamp,
      y: Math.max(50, power) // Minimum 50 kW
    });
  }

  return data;
};

/**
 * Generate sample event annotations (time-span events with overlaps)
 */
window.EventAnnotationsPlot.generators.generateSampleEvents = function() {
  return [
    // Dec 2: Two overlapping events
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

    // Dec 3: Three overlapping events (complex overlap scenario)
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

    // Dec 4: Standalone event (no overlap)
    {
      startTime: new Date('2025-12-04T09:30:00'),
      endTime: new Date('2025-12-04T10:45:00'),
      label: 'System Restart',
      description: 'BMS system restart and recalibration.',
      duration: '1.25 hours',
      avgPower: '55.1 kW',
      color: 'rgba(75, 192, 192, 0.8)'
    },

    // Dec 5: Two overlapping events
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

    // Dec 6: Two overlapping events
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
