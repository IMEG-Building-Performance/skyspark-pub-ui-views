/**
 * config.js
 *
 * Static configuration constants for Event Annotations Plot.
 * These values do not change at runtime.
 * Loaded before state.js so state can reference them.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};

window.EventAnnotationsPlot.config = {

  // ── Visual style for annotation lines ──────────────────────────────
  annotationStyle: {
    lineWidth: 4,
    highlightWidth: 12,
    glowOpacity: 0.25,
    shadowBlur: 6,
    shadowOpacity: 0.35,
    useGlow: true,
    useShadow: true
  },

  // ── Utility display colours, labels, and Y-axis units ───────────
  utilityConfig: {
    Electric: { color: '#4CAF50', label: 'Electric', unit: 'kW',     yLabel: 'Power (kW)' },
    CHW:      { color: '#2196F3', label: 'CHW',      unit: 'Ton',    yLabel: 'Cooling (Ton)' },
    Steam:    { color: '#FF9800', label: 'Steam',    unit: 'Mlb/hr', yLabel: 'Steam (Mlb/hr)' },
    Gas:      { color: '#F44336', label: 'Gas',      unit: 'Therms', yLabel: 'Gas (Therms)' },
    Water:    { color: '#5DADE2', label: 'Water',    unit: 'ft³',  yLabel: 'Water (ft³)' }
  },

  // ── Detail panel utility colours ────────────────────────────────
  detailColors: {
    primary:  '#17a2b8',
    electric: '#3498db',
    chw:      '#1abc9c',
    steam:    '#e74c3c',
    gas:      '#f39c12',
    water:    '#5dade2',
    textDark: '#2c3e50',
    textMuted:'#6c757d',
    border:   '#e9ecef',
    bgLight:  '#f8f9fa'
  }

};
