/**
 * state.js — Runtime mutable state for Event Cost V2
 * Requires: constants/config.js loaded first.
 */

window.EventCostV2 = window.EventCostV2 || {};

var _cfg = window.EventCostV2.config;

window.EventCostV2.state = {

  // ── Responsive scaling ─────────────────────────────────────────────
  responsiveScaling: { vhScale: 1.0 },

  // ── Static config refs ─────────────────────────────────────────────
  annotationStyle: _cfg.annotationStyle,
  utilityConfig:   _cfg.utilityConfig,
  detailColors:    _cfg.detailColors,

  // ── Hover / selection state (used by chart + timeline) ───────────
  hoverState: {
    hoveredEvent:  null,
    hoveredIndex:  -1,
    selectedIndex: -1,
    mouseX: 0,
    mouseY: 0
  },

  visibilityState: {},
  timelineHidden: false,

  // ── Tab state ──────────────────────────────────────────────────────
  activeTab: 'tracker',

  // ── Site Status tab utility ────────────────────────────────────────
  activeUtility: 'Electric',
  utilityData: {},

  // ── Global data cache (populated once per site+dateRange load) ────
  eventCostResults: null,   // raw array from loadEventCostResults
  eventSummaries: null,     // aggregated per-event objects
  siteName: null,
  currentEvents: null,      // chart event objects for Site Status tab
  currentDateRange: null,

  // ── Monthly Overview ───────────────────────────────────────────────
  selectedMonth: null,      // 'YYYY-MM' string or null (all months)

  // ── Event Detail ───────────────────────────────────────────────────
  selectedEventID: null,
  detailReturnTab: 'monthly',  // which tab 'Back' returns to

  // ── Utility Reconciliation ─────────────────────────────────────────
  reconciliationUtility: 'Electric',

  // ── SkySpark session ───────────────────────────────────────────────
  attestKey: null,
  projectName: null,
  _selectedSite: null,
  _startDate: null,
  _endDate: null,

  // ── Chart / canvas refs ────────────────────────────────────────────
  chartInstance: null,
  chartJsLoaded: false,
  overlayCanvas: null,
  timelineCanvas: null,
  placeholderMsg: null,
  refs: null,

  // ── Detail panel ───────────────────────────────────────────────────
  detailPanelOpen: false,
  selectedEventForDetail: null,
  rawExecSummaryEvents: null

};

window.EventCostV2.computeScaling = function() {
  var vh = window.innerHeight;
  var s = window.EventCostV2.state.responsiveScaling;
  s.vhScale = Math.max(0.7, Math.min(1.0, (vh - 600) / 400));
};
