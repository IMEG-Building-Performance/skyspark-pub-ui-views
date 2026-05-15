# Event Utility Cost Tracking — V2 Build Prompt

## Context

I'm building a V2 of an Event Utility Cost Tracking tool for the Indiana Convention Center in SkySpark. The tool is a SkySpark pUb (published view) that uses vanilla JavaScript, Chart.js, and the SkySpark eval API to display event utility cost data. It runs inside SkySpark's browser-based interface.

The V1 codebase is attached as a Git repo (`skyspark-event-calculator-main/`). It has a working modular JS architecture, Chart.js integration, and a tabbed interface. V2 will reuse the existing infrastructure (module loader, Axon API helper, Chart.js setup, CSS patterns) but restructure the tabs and replace demo/placeholder data with real API calls.

---

## Architecture Overview

### How it works

- The app is a SkySpark pUb view backed by a vanilla JS handler (`eventAnnotationsPlotHandler`).
- An entry file (`eventAnnotationsPlotEntry.js`) is placed on the client's SkySpark server. It loads a UI module (`eventAnnotationsPlotUI.js`) from a cloud server, which chain-loads all JS modules in dependency order.
- All data comes from Axon expressions executed via the SkySpark `/api/{project}/eval` endpoint using `evalAxon()` (see `utils/axon.js`).
- SkySpark variables (site, dateRange) are read from the view context via `utils/skysparkVars.js` and polled for changes every 2 seconds.
- The app uses Chart.js v4.4.0 with date-fns adapter and annotation plugin (bundled locally in `vendor/`).

### Existing file structure

```
eventAnnotationsPlot/
├── constants/config.js          # Static config (colors, annotation style)
├── constants/state.js           # Runtime mutable state
├── utils/axon.js                # evalAxon(), extractValue(), parseCurrencyValue()
├── utils/chartLoader.js         # Chart.js dynamic loading
├── utils/interactions.js        # Mouse hover detection, event filter panel, utility toggle
├── utils/skysparkVars.js        # SkySpark variable reading + polling
├── utils/transformers.js        # Event data format transformers
├── utils/rendering/
│   ├── chart.js                 # Chart.js creation + configuration
│   ├── annotations.js           # Overlay drawing (span annotations)
│   ├── timeline.js              # Event timeline track below chart
│   ├── labels.js                # Label positioning + drawing
│   └── tooltips.js              # Rich tooltip rendering
├── evals/
│   ├── loadExecSummary.js       # Loads exec summary table (modes 1/2/3)
│   ├── loadPowerData.js         # Loads time-series power data for chart
│   ├── loadSiteName.js          # Loads site display name
│   ├── loadEventDates.js        # Loads event start/end dates
│   ├── loadTotalEventCost.js    # Loads total event cost (mode 2)
│   └── loadUtilityCost.js       # Loads utility cost (mode 3)
├── components/
│   ├── Table.js                 # Events table component
│   ├── Widgets.js               # Summary cost widgets
│   ├── EventDetail.js           # Event detail slide-over panel
│   ├── ExpandView.js            # Fullscreen chart modal
│   ├── EventsDatabase.js        # Events database panel (filter/paginate)
│   └── Documentation.js         # Documentation panel
├── fixtures/generators.js       # Sample data generators (dev only)
├── App.js                       # Root application (tab shell + summary tab)
├── eventAnnotationsPlotStyles.css
├── eventAnnotationsPlotUI.js    # Module loader
└── vendor/                      # Chart.js + plugins (bundled)
```

### Key utilities to reuse

- `evalAxon(expr)` — executes an Axon expression, returns parsed JSON grid
- `extractValue(val)` — unwraps Haystack-format values
- `parseCurrencyValue(val)` — parses currency from Haystack format
- `skysparkVars.readVariables(arg, view)` — reads site, dateRange, attestKey, projectName
- `skysparkVars.startPolling(view, initialValues, callback)` — polls for variable changes
- `interactions.createUtilityToggle(onSelect)` — creates Electric/CHW/Steam/Gas/Water toggle bar
- `chart.createChart(canvas, utilityData, events, dateRange)` — creates Chart.js line chart

---

## Data Architecture

### Backend Axon Functions (already built)

These are the SkySpark Axon functions that power the data:

1. **`eventCost_bookings(eventID)`** — Returns one row per booking-meter/valve combination for ALL utilities. Columns:
   - `bookingStart`, `bookingEnd`, `eventID`, `spaceCode`, `site`, `spaceSF`
   - Electric: `meterID` (non-null), `valveRef` (null), `valveMBH` (null), `chwMeterID` (null)
   - CHW: `meterID` (null), `valveRef` (non-null), `valveMBH` (non-null), `chwMeterID` (non-null)

2. **`eventCost_elec_detail(meterGrid, eventID, utilityType, includeBaseload)`** — Per-timestamp, per-meter attribution. Returns: `site`, `ts`, `meterID`, `energy`, `hourlyBaseline`, `increment`, `myEventSF`, `totalEventSF`, `sfRatio`, `attributedEnergy`

3. **`eventCost_chw_detail(meterGrid, eventID, includeBaseload)`** — Per-timestamp CHW attribution using valve load proration. Returns: `site`, `ts`, `chwMeterID`, `energy`, `hourlyBaseline`, `increment`, `myEventLoad`, `totalLoad`, `loadRatio`, `attributedEnergy`, `status`

4. **`eventCost_summary(eventID, utilityType, includeBaseload)`** — Calls the appropriate detail function, aggregates per site. Returns one row per site: `site`, `eventID`, `eventName`, `eventSF`, `eventStart`, `eventEnd`, `usage` (usage amount), `rate`, `cost` (usage × rate), `errorCount`, `dataQuality`, `mostCommonError`, `meters`

5. **`report_EventsByDate(dates)`** — Returns all events overlapping a date range.

### Stored Results (eventCostResult records)

Pre-computed cost results stored in SkySpark Folio. One record per event/site/utility/costType combination:

| Tag | Description |
|-----|-------------|
| `eventCostResult` | Marker tag |
| `eventRef` | Reference to event record |
| `eventID` | Event ID number |
| `siteRef` | Reference to site record |
| `utilityType` | "Electric" / "CHW" / "Steam" / "Gas" |
| `costType` | "Usage" / "Demand" |
| `usage` | Number with unit (kWh, ton-hr, etc.) |
| `rate` | Rate per unit |
| `cost` | Usage × rate |
| `eventSF` | Total event square footage for this site |
| `metersUsed` | Count of meters/valves |
| `calculatedOn` | DateTime of last calculation |

Query example: `readAll(eventCostResult and eventID == 48020)` returns all cost records for event 48020.

### Utility Rates (current hardcoded values)

| Utility | Usage Rate | Demand Rate | Usage Unit | Demand Unit |
|---------|-----------|-------------|------------|-------------|
| Electric | $0.13/kWh | TBD | kWh | kW |
| CHW | $0.33/ton-hr | TBD | ton-hr | ton |
| Steam | TBD | TBD | Mlb | Mlb/hr |
| Gas | TBD | TBD | therms | therms/hr |

### Existing API Calls to Keep

- `view_demandByMeter_plot(siteRef, dates, "Combined Power", utilityType)` — time-series power data for the chart
- `view_performanceImprovement_baseloadDashboard(site, dates, utilityType, mode)` — baseline data
- Site name lookup: `readById(siteRef).dis`

### New API Calls Needed

For V2, the eval calls should query the stored `eventCostResult` records rather than running live calculations (which are slow). The live calculation functions are available for drill-down/triage only.

Key new queries:
```
// All event cost results for a date range
readAll(eventCostResult and siteRef == @siteRef).findAll(r => r->eventStart >= startDate and r->eventStart <= endDate)

// All event cost results for a specific event
readAll(eventCostResult and eventID == eventID)

// Monthly aggregation (done client-side from the above)

// Utility bill data (future — from separate API, placeholder for now)
```

---

## V2 Tab Structure

### Tab 1: Monthly Overview (default landing page)

**Purpose:** At-a-glance monthly event cost summary. Answer "how much did events cost this month?"

**Components:**
- **Summary cards** (top row): Total Events, Total Event Cost, Average Cost/Event for the selected date range
- **Monthly bar chart**: Stacked bar chart showing total event cost by month, stacked by utility (Electric = green, CHW = blue, Steam = orange, Gas = red). Clickable — clicking a bar filters the table below to that month.
- **Event summary table** below the chart:
  - Columns: Event Name, Event ID, Start Date, End Date, Sq Ft, Electric Cost, CHW Cost, Steam Cost, Gas Cost, Total Cost, Data Quality (colored dot: green >95%, yellow 80-95%, red <80%)
  - Sortable by any column
  - Searchable by event name or ID
  - Click a row → navigates to Tab 3 (Event Detail) for that event
- Data source: Query `eventCostResult` records for the selected site and date range, aggregate client-side

### Tab 2: Utility Reconciliation

**Purpose:** Compare event-attributed costs to actual utility bills. Answer "what % of our utility bill is from events?"

**Components:**
- **Utility selector** at top (Electric / CHW / Steam / Gas toggle, reuse `createUtilityToggle`)
- **Monthly comparison chart**: Grouped bar chart per month showing:
  - Bar 1: Total utility bill cost (from external data source — placeholder/demo data for now)
  - Bar 2: Total event-attributed cost (from `eventCostResult` records)
  - Line overlay: Event attribution % (event cost / bill cost × 100)
- **Comparison table** below:
  - Columns: Month, Bill Cost, Event Cost, Non-Event Cost, Attribution %, Variance Flag
  - Variance Flag: highlight months where attribution % is unusually high (>50%) or low (<5%) compared to historical average
- **Note:** Utility bill data will come from a separate software system via SkySpark API call. For V2 initial build, use placeholder/demo data and mark clearly where the real API call will go. Structure the code so swapping in the real call is straightforward.

### Tab 3: Event Detail

**Purpose:** Deep dive into a single event's cost breakdown. Used for triage and client reporting.

**Navigation:** Reached by clicking an event row in Tab 1 or Tab 4. Show a "← Back" button to return.

**Components:**
- **Header card**: Event name (large), total cost (prominent), event ID, date range, total SF, duration
- **Per-site utility breakdown section**: One card per site showing:
  - Site name
  - Per-utility cost breakdown with energy/demand split (similar to existing V1 EventDetail.js cards)
  - Data quality indicator per utility with most common error shown
  - Cost as % of event total
- **Spaces & Meters section** (two-column layout):
  - Left: Spaces occupied — from `eventCost_bookings(eventID)`, showing space code, SF, site. **Real data, not demo.**
  - Right: Meters/valves serving the event — from `eventCost_bookings(eventID)`, showing meter/valve ID, type (Electric/CHW), site. **Real data, not demo.**
- **Concurrent Events section**: Other events overlapping this event's date range — from `report_EventsByDate(dates)`. Show event name, dates, SF, cost, overlap duration. Clickable to navigate to that event's detail.
- **Data for this tab** comes from:
  - `readAll(eventCostResult and eventID == X)` for cost data
  - `eventCost_bookings(eventID)` for spaces and meters (called via evalAxon)
  - `report_EventsByDate(dates)` for concurrent events (called via evalAxon)

### Tab 4: Site Status

**Purpose:** Show real-time utility consumption with events overlaid. This is largely the existing V1 chart functionality.

**Components:**
- **Utility toggle** (Electric / CHW / Steam / Gas / Water)
- **Time-series line chart** showing utility power consumption with event annotations overlaid as shaded regions (carry forward from V1)
- **Event timeline track** below the chart (carry forward from V1)
- **Event sidebar/list** with visibility toggles (carry forward from V1)
- **Expand button** for fullscreen chart view (carry forward from V1)
- This tab is essentially the existing V1 Summary tab's chart section, extracted into its own tab

### Tab 5: Documentation

**Purpose:** Methodology explanation and tool usage guide.

**Components:**
- **Methodology section**: Explain the baseline-plus-increment approach, SF proration for electric, valve load proration for CHW, how baseline is calculated, how concurrent events are handled
- **Tool usage guide**: How to read each tab, what the data quality indicators mean, how to triage issues
- **Glossary**: Key terms (baseload, increment, proration, valve load, etc.)
- **Role-based visibility** (future): For now, show all content. Add a note in the code where role-checking logic would go (e.g., checking a SkySpark user role to show/hide the methodology deep-dive vs. just the user guide)

---

## Design Requirements

### Visual Style

Follow the existing V1 design language (see `eventAnnotationsPlotStyles.css`), which uses:
- **Title bar**: IMEG blue (`#4A6FA5`) with white text
- **Background**: `#F9FAFB` (light gray)
- **Cards**: White background, `1px solid #E5E7EB` border, `8px` border-radius, subtle shadow
- **Typography**: System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`)
- **Accent colors**: Blue (`#1565c0`) for interactive elements, utility-specific colors from `config.js`:
  - Electric: `#4CAF50` (green)
  - CHW: `#2196F3` (blue)
  - Steam: `#FF9800` (orange)
  - Gas: `#F44336` (red)
  - Water: `#5DADE2` (light blue)
- **Tables**: Sticky headers with blue background (`#1565c0`), white text, hover highlight on rows
- **Loading states**: Spinner animation (`.edb-spinner` class)

### Key Design Principles

- Professional, clean, data-dense but not cluttered
- Every chart and table should be immediately readable without explanation
- Color-coded utility indicators should be consistent throughout
- Data quality indicators should be visible but not alarming — green/yellow/red dots, not big warning banners
- Mobile-responsive is not required (this runs on desktop workstations)

---

## Implementation Notes

### Module Organization

Follow the existing V1 pattern:
- New eval wrappers go in `evals/` (e.g., `loadEventCostResults.js`, `loadBookingTable.js`)
- New components go in `components/` (e.g., `MonthlyOverview.js`, `UtilityReconciliation.js`, `EventDetailV2.js`)
- Update `App.js` with the new 5-tab structure
- Update `eventAnnotationsPlotUI.js` module list with new files
- Update `eventAnnotationsPlotStyles.css` with new component styles

### State Management

Use the existing `window.EventAnnotationsPlot.state` object (see `constants/state.js`). Add new state properties as needed for:
- Selected month (for monthly overview filtering)
- Selected event (for event detail drill-down)
- Selected utility (for reconciliation tab)
- Cached query results (to avoid re-fetching when switching tabs)

### Data Loading Pattern

Follow the existing pattern in `App.js`:
1. Read SkySpark variables (site, dateRange)
2. Call `evalAxon()` with Axon expressions
3. Parse response using `extractValue()`
4. Cache results in state
5. Render components with the data

For `eventCostResult` queries, the Axon expression would be something like:
```javascript
var axonExpr = 'readAll(eventCostResult and siteRef == @' + siteRef + ')';
// Then filter client-side by date range
```

### Chart.js Usage

- Monthly bar chart (Tab 1): Use Chart.js bar chart with `stacked: true` option
- Reconciliation chart (Tab 2): Use Chart.js bar chart with grouped bars + line overlay (mixed chart type)
- Site status chart (Tab 4): Reuse existing `chart.createChart()` from V1

### Event Detail Navigation

When a user clicks an event row in Tab 1, the app should:
1. Set `state.selectedEventID` to the clicked event's ID
2. Switch to Tab 3
3. Tab 3 reads `state.selectedEventID` and loads the detail data
4. "← Back" button returns to Tab 1

### What NOT to build yet

- Real utility bill API integration (use placeholder data, clearly marked)
- Steam and Gas detail functions (they don't exist yet — show "Coming Soon" in the UI)
- Demand cost calculations (not yet implemented — show usage costs only, with a placeholder column for demand)
- Nightly batch task (separate from the UI)
- Role-based access control (add code comments where it would go)

---

## Reference Files

The following files from the V1 codebase should be studied before starting:

1. **`App.js`** — Root application, tab structure, data loading flow
2. **`constants/config.js`** + **`constants/state.js`** — Config and state management patterns
3. **`utils/axon.js`** — API communication pattern
4. **`evals/loadExecSummary.js`** — Example of an eval wrapper (query + parse pattern)
5. **`components/EventsDatabase.js`** — Example of a complex component (filter bar, table, pagination, summary panel)
6. **`components/EventDetail.js`** — Example of event detail rendering
7. **`eventAnnotationsPlotStyles.css`** — All existing CSS patterns

---

## Deliverables

1. Updated `App.js` with 5-tab structure
2. New eval wrapper files for `eventCostResult` queries and booking table queries
3. New component files for Monthly Overview, Utility Reconciliation, and Event Detail V2
4. Updated `eventAnnotationsPlotUI.js` module list
5. Updated `eventAnnotationsPlotStyles.css` with new component styles
6. Updated `constants/state.js` with new state properties
7. Updated `build.ps1` with new module list
