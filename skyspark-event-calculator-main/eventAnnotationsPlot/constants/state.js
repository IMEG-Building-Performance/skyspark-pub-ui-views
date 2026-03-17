/**
 * state.js
 *
 * Runtime mutable state for Event Annotations Plot.
 * Static config values (annotationStyle, utilityConfig, detailColors)
 * are pulled from config.js so there is a single source of truth.
 *
 * Requires: constants/config.js loaded first.
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};

var _cfg = window.EventAnnotationsPlot.config;

window.EventAnnotationsPlot.state = {

  // ── Responsive scaling (computed at runtime by computeScaling()) ───
  responsiveScaling: {
    vhScale: 1.0    // 0.7..1.0 based on viewport height
  },

  // ── Static config refs (sourced from config.js) ────────────────────
  annotationStyle: _cfg.annotationStyle,
  utilityConfig:   _cfg.utilityConfig,
  detailColors:    _cfg.detailColors,

  // ── Hover and selection interactivity state ────────────────────────
  hoverState: {
    hoveredEvent:  null,
    hoveredIndex:  -1,
    selectedIndex: -1,  // Click-to-select: locks highlight on an event
    mouseX: 0,
    mouseY: 0
  },

  // ── Per-event visibility (keyed by event index, true = visible) ───
  visibilityState: {},

  // ── Filter panel UI state ──────────────────────────────────────────
  filterPanelCollapsed: false,

  // ── Active utility (single-select) ──────────────────────────────
  activeUtility: 'Electric',

  // ── Cached utility data (keyed by utility name) ──────────────────
  utilityData: {},

  // ── Event detail panel state ──────────────────────────────────────
  detailPanelOpen: false,
  selectedEventForDetail: null,
  rawExecSummaryEvents: null,
  siteName: null,

  // ── Runtime references (populated during initialisation) ──────────
  chartInstance: null,
  chartJsLoaded: false,
  overlayCanvas: null,
  timelineCanvas: null,
  attestKey: null,
  projectName: null,
  currentEvents: null,
  placeholderMsg: null,

  /**
   * DOM / data references stored after the chart is built.
   * Populated with: canvas, overlayCanvas, timelineCanvas,
   * canvasWrapper, eventsContainer, timeSeriesData
   */
  refs: null,

  // ── Events Database panel state ───────────────────────────────────
  eventsDatabaseState: {
    isOpen: false,
    allEvents: [],
    filteredEvents: [],
    currentPage: 1,
    pageSize: 25,
    selectedEvent: null,
    filters: {
      nameSearch: '',
      idSearch: '',
      dateStart: '',
      dateEnd: '',
      sqftMin: null,
      sqftMax: null,
      costMin: null,
      costMax: null
    },
    // Internal DOM / sort references (populated at runtime)
    _savedContent: null,
    _tableWrap: null,
    _paginationEl: null,
    _summaryPanel: null,
    _filterInputs: null,
    _sortKey: null,
    _sortDir: null
  }

};

/**
 * Recompute responsive scaling factors based on current viewport.
 * Called on init and on window resize.
 *
 * vhScale: 0.7 at <=600px, 1.0 at >=1000px, linear between.
 */
window.EventAnnotationsPlot.computeScaling = function() {
  var vh = window.innerHeight;
  var s = window.EventAnnotationsPlot.state.responsiveScaling;
  s.vhScale = Math.max(0.7, Math.min(1.0, (vh - 600) / 400));
};
