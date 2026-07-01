// core/tabRegistry.js
// Central tab metadata used by navigation, config defaults, and future permissions.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.core = window.mbcxDashboard.core || {};

(function (CORE) {
  var tabs = [
    { key: 'summary', label: 'Summary', visibleByDefault: true },
    { key: 'faults', label: 'Faults', visibleByDefault: true },
    { key: 'compliance', label: 'Compliance', visibleByDefault: false },
    { key: 'equipment', label: 'Equipment', visibleByDefault: true },
    { key: 'trends', label: 'Trends', visibleByDefault: false },
    { key: 'meetings', label: 'Meetings', visibleByDefault: false },
    { key: 'tenant-allocation', label: 'Tenant Usage Allocation', visibleByDefault: false },
    {
      key: 'meeting-prep',
      label: 'Meeting Prep',
      visibleByDefault: false,
      internal: true,
      requiredRole: 'mbcxAdmin'
    }
  ];

  CORE.tabRegistry = {
    all: function () {
      return tabs.slice();
    },
    keys: function () {
      return tabs.map(function (tab) { return tab.key; });
    },
    labelsByKey: function () {
      var out = {};
      tabs.forEach(function (tab) { out[tab.key] = tab.label; });
      return out;
    },
    defaultVisibility: function () {
      var out = {};
      tabs.forEach(function (tab) { out[tab.key] = !!tab.visibleByDefault; });
      return out;
    }
  };
})(window.mbcxDashboard.core);
