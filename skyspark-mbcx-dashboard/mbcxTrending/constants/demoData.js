// mbcxTrending/constants/demoData.js — Demo equipment and time-series data
window.mbcxTrending = window.mbcxTrending || {};

(function (NS) {

  // 7 days of 6-hour interval labels
  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var hours = ['00:00','06:00','12:00','18:00'];
  var LABELS = [];
  days.forEach(function (d) { hours.forEach(function (h) { LABELS.push(d + ' ' + h); }); });

  // Deterministic pseudo-random (LCG)
  function lcg(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
  }

  function wave(rng, base, amp, noise) {
    return LABELS.map(function (_, i) {
      var occ = (i % 4 === 0 || i % 4 === 3) ? 0 : 1;
      var v = base + amp * Math.sin(i / 4 * Math.PI) * occ + (rng() - 0.5) * noise;
      return Math.round(v * 10) / 10;
    });
  }

  function genAhu(seed, name) {
    var rng = lcg(seed);
    return {
      id: name, name: name, type: 'AHU',
      points: [
        { key: 'zoneTemp',     label: 'Zone Temp',      unit: '°F', color: '#3b82f6',
          data: wave(rng, 72, 3, 1.5) },
        { key: 'sat',          label: 'Supply Air Temp', unit: '°F', color: '#ef4444',
          data: wave(rng, 58, 5, 2) },
        { key: 'coolingValve', label: 'Cooling Valve',   unit: '%',  color: '#06b6d4',
          data: wave(rng, 35, 35, 8) },
        { key: 'heatingValve', label: 'Heating Valve',   unit: '%',  color: '#f97316',
          data: wave(rng, 15, 15, 5).map(function(v){ return Math.max(0, v); }) },
        { key: 'vfdSpeed',     label: 'VFD Speed',       unit: '%',  color: '#8b5cf6',
          data: wave(rng, 55, 40, 6).map(function(v){ return Math.max(10, Math.min(100, v)); }) },
        { key: 'oaDamper',     label: 'OA Damper',       unit: '%',  color: '#10b981',
          data: wave(rng, 30, 30, 8).map(function(v){ return Math.max(0, Math.min(100, v)); }) }
      ]
    };
  }

  function genVav(seed, name) {
    var rng = lcg(seed);
    return {
      id: name, name: name, type: 'VAV',
      points: [
        { key: 'zoneTemp',    label: 'Zone Temp',    unit: '°F', color: '#3b82f6',
          data: wave(rng, 71, 4, 1.5) },
        { key: 'zoneSp',      label: 'Zone SP',      unit: '°F', color: '#64748b',
          data: LABELS.map(function(){ return 70; }) },
        { key: 'airflow',     label: 'Airflow',      unit: 'CFM', color: '#10b981',
          data: wave(rng, 400, 250, 40).map(function(v){ return Math.max(50, Math.round(v)); }) },
        { key: 'reheatValve', label: 'Reheat Valve', unit: '%',  color: '#ef4444',
          data: wave(rng, 20, 20, 6).map(function(v){ return Math.max(0, Math.min(100, Math.round(v))); }) },
        { key: 'damper',      label: 'Damper',       unit: '%',  color: '#8b5cf6',
          data: wave(rng, 50, 45, 8).map(function(v){ return Math.max(0, Math.min(100, Math.round(v))); }) }
      ]
    };
  }

  NS.demoData = {
    labels: LABELS,
    equipment: [
      genAhu(10, 'AHU-1'),
      genAhu(20, 'AHU-2'),
      genAhu(30, 'AHU-3'),
      genVav(40, 'VAV-L1-01'),
      genVav(50, 'VAV-L1-02'),
      genVav(60, 'VAV-L1-05'),
      genVav(70, 'VAV-L2-01'),
      genVav(80, 'VAV-L2-04'),
    ]
  };

})(window.mbcxTrending);
