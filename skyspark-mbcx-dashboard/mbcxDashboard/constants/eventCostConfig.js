/**
 * eventCostConfig.js — Static configuration for Event Cost (MBCx Dashboard)
 */

window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.eventCost = window.mbcxDashboard.eventCost || {};

window.mbcxDashboard.eventCost.config = {

  annotationStyle: {
    lineWidth: 4,
    highlightWidth: 12,
    glowOpacity: 0.25,
    shadowBlur: 6,
    shadowOpacity: 0.35,
    useGlow: true,
    useShadow: true
  },

  utilityConfig: {
    Electric: { color: '#4CAF50', label: 'Electric', unit: 'kW',     yLabel: 'Power (kW)' },
    CHW:      { color: '#2196F3', label: 'CHW',      unit: 'Ton',    yLabel: 'Cooling (Ton)' },
    Steam:    { color: '#FF9800', label: 'Steam',    unit: 'Mlb/hr', yLabel: 'Steam (Mlb/hr)' },
    Gas:      { color: '#F44336', label: 'Gas',      unit: 'Therms', yLabel: 'Gas (Therms)' },
    Water:    { color: '#5DADE2', label: 'Water',    unit: 'ft³',    yLabel: 'Water (ft³)' }
  },

  // Cost colors per utility for charts and badges
  utilityCostColors: {
    Electric: '#4CAF50',
    CHW:      '#2196F3',
    Steam:    '#FF9800',
    Gas:      '#F44336'
  },

  detailColors: {
    primary:  '#17a2b8',
    electric: '#4CAF50',
    chw:      '#2196F3',
    steam:    '#FF9800',
    gas:      '#F44336',
    water:    '#5dade2',
    textDark: '#2c3e50',
    textMuted:'#6c757d',
    border:   '#e9ecef',
    bgLight:  '#f8f9fa'
  },

  // Utility rates (usage only; demand TBD)
  utilityRates: {
    Electric: { usageRate: 0.13, usageUnit: 'kWh',   demandRate: null, demandUnit: 'kW' },
    CHW:      { usageRate: 0.33, usageUnit: 'ton-hr', demandRate: null, demandUnit: 'ton' },
    Steam:    { usageRate: null, usageUnit: 'Mlb',    demandRate: null, demandUnit: 'Mlb/hr' },
    Gas:      { usageRate: null, usageUnit: 'therms', demandRate: null, demandUnit: 'therms/hr' }
  }

};
