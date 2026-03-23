// utils/classify.js
// VAV status classification based on DAT and RH values
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  var t = NS.fields.thresholds;

  NS.classify = function (dat, rh) {
    if (dat < t.faultyMaxDAT && rh > t.faultyMinRH) return 'faulty';
    if (dat > t.leakingMinDAT && rh < t.leakingMaxRH) return 'leaking';
    if (dat < t.watchMaxDAT && rh > t.watchMinRH) return 'watch';
    return 'ok';
  };
})(window.reheatDashboard);
