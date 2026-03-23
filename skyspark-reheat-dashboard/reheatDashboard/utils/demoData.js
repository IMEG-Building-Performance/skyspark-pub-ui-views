// utils/demoData.js
// Deterministic demo VAV dataset generator
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  // Deterministic pseudo-random (LCG)
  function lcg(seed) {
    var s = seed >>> 0;
    return function () {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  NS.generateDemoData = function () {
    var rng = lcg(42);
    var prefixes = ['AHU-1.', 'AHU-2.', 'AHU-3.'];
    var templates = [];
    var i;

    for (i = 0; i < 28; i++) templates.push([55 + rng() * 6, rng() * 22]);
    for (i = 0; i < 52; i++) templates.push([60 + rng() * 9, 8 + rng() * 52]);
    for (i = 0; i < 48; i++) templates.push([65 + rng() * 9, 22 + rng() * 68]);
    for (i = 0; i < 22; i++) templates.push([58 + rng() * 11, 58 + rng() * 42]);
    for (i = 0; i < 32; i++) templates.push([72 + rng() * 11, 22 + rng() * 68]);
    for (i = 0; i < 14; i++) templates.push([76 + rng() * 10, 3 + rng() * 24]);
    for (i = 0; i < 12; i++) templates.push([84 + rng() * 9, 48 + rng() * 48]);

    return templates.map(function (t, idx) {
      var dat = Math.round(t[0] * 10) / 10;
      var rh = Math.min(100, Math.max(0, Math.round(t[1])));
      var pfx = prefixes[idx % 3];
      var num = String(Math.floor(idx / 3) + 1).padStart(2, '0');
      return { id: idx, name: pfx + 'VAV-' + num, dat: dat, rh: rh, flag: NS.classify(dat, rh) };
    });
  };
})(window.reheatDashboard);
