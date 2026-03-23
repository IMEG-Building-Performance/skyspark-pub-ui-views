// constants/fields.js
// Static config: classification thresholds, label maps, badge/tooltip classes
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  NS.fields = {
    // Classification thresholds
    thresholds: {
      faultyMaxDAT: 68,
      faultyMinRH: 60,
      leakingMinDAT: 75,
      leakingMaxRH: 30,
      watchMaxDAT: 65,
      watchMinRH: 42
    },

    // Display labels per flag
    tipLabels: {
      faulty: 'Faulty Reheat',
      leaking: 'Leaking Valve',
      watch: 'Watch',
      ok: 'Normal'
    },

    // Tooltip flag CSS classes
    tipCls: {
      faulty: 'flag-faulty',
      leaking: 'flag-leaking',
      watch: 'flag-watch',
      ok: 'flag-ok'
    },

    // Table badge CSS classes
    badgeCls: {
      faulty: 'badge badge-faulty',
      leaking: 'badge badge-leaking',
      ok: 'badge badge-ok',
      watch: 'badge badge-watch'
    }
  };
})(window.reheatDashboard);
