# skyspark-mbcx-hwMeterTable

A SkySpark pub/ui JavaScript view that renders a hot water meter demand table — 95th-percentile peak demand values for all sites, plus campus-wide KPI totals.

---

## What It Displays

| Section | Content |
|---------|---------|
| **KPI strip** | Four campus totals: Measured Peak Load, Estimated Max Load, Actual HW Flow, Estimated HW Flow |
| **Site table** | One row per site; columns are 95th-percentile demand metrics computed by SkySpark |
| **Color coding** | Cells highlighted per a `presentation` sub-grid returned by the Axon function |

---

## SkySpark Axon Function

The entire view is driven by a single Axon function:

```
report_demandValCalcs_allSites(targets, dates)       // → per-site detail grid
report_demandValCalcs_allSites(targets, dates, 2)    // → single-row campus totals grid
```

`targets` is a Haystack Ref pointing to the equipment set (e.g. `@nav:equip.all`).
`dates` is a date range expression (e.g. `pastMonth`, `2025-01-01..2025-03-31`).

Both calls are made in parallel on every view refresh. The function lives in your SkySpark project — if you need to change the data source, swap out the function name in `evals/loadDemandData.js` (lines 46–47).

### Columns returned by mode 1 (per-site)

| Column | Description |
|--------|-------------|
| `id` | Site identifier (Haystack Ref) |
| `point1` | 95th-percentile peak hot water demand |
| `point2` | 95th-percentile peak hot water flow rate |
| `estMaxLoad` | Estimated maximum load |
| `measuredVsMaxLoad` | Ratio of measured peak to estimated max load |
| *(+ additional computed metrics)* | Defined in `PLACEHOLDER_META` in `components/SiteTable.js` |

### Columns returned by mode 2 (campus totals)

| Column | Description |
|--------|-------------|
| `totalMeasuredMaxLoad` | Sum of all sites' measured peak loads |
| `totalEstimatedMaximumLoad` | Sum of all sites' estimated max loads |
| `totalActualHwFlow` | Sum of all sites' actual hot water flows |
| `totalEstimatedHwFlow` | Sum of all sites' estimated hot water flows |

---

## How Data Filtering Works

Filtering is controlled by two **SkySpark view variables**:

### `targets` — equipment set
- Source: view variable `targets` → parent view's `targets` → default `@nav:equip.all`
- Passed directly to the Axon function; the function filters results to sites within that equipment set
- Accepts any Haystack Ref (e.g. a campus group, a specific site nav ref)

### `dates` — date range
- Source: view variable `dates` → parent view's `dates` → default `pastMonth`
- Supported formats:
  - Named spans: `pastMonth`, `pastYear`, `thisMonth`, etc.
  - Explicit ISO range: `2025-01-01..2025-03-31`
- Passed to the Axon function to filter the underlying history reads

### Column-level filtering
- Any column tagged `{hidden}` in the Axon grid metadata is removed before rendering
- This is set server-side in the Axon function; no client-side configuration needed

### Fetch deduplication
- The view tracks the last `targets + dates` pair it fetched
- If SkySpark calls `onUpdate` again with the same values, the fetch is skipped entirely
- A generation counter discards any in-flight response that was superseded by a newer variable change (prevents race conditions)

---

## How the Table Is Built

```
SkySpark calls onUpdate(arg)
    │
    ├─ Read session credentials: attestKey, projectName
    ├─ Read view variables: targets, dates
    │
    ├─ loadDemandData(attestKey, projectName, targets, dates)
    │       │
    │       ├─ POST /api/{projectName}/eval  ← site grid  (mode 1)
    │       └─ POST /api/{projectName}/eval  ← totals row (mode 2)
    │
    └─ renderSiteTable(container, siteGrid, totalsGrid)
            │
            ├─ KPI strip  — 4 cards from totalsGrid
            └─ <table>    — one <tr> per site from siteGrid
                            cells colored from grid.meta.presentation
```

The DOM scaffold (title + table container `div`) is created once on the first call and reused on subsequent calls — only the table contents are replaced.

---

## How It Runs in SkySpark

### File layout on the server

```
/pub/ui/
├── hwMeterTableEntry.js          ← auto-discovered by SkySpark (must be at root)
└── hwMeterTable/
    ├── hwMeterTableHandler.js    ← main orchestrator
    ├── hwMeterTableStyles.css    ← all styles, scoped under #hwMeterTable-root
    ├── components/
    │   └── SiteTable.js          ← KPI cards + table renderer
    ├── evals/
    │   └── loadDemandData.js     ← Axon eval wrapper (two parallel calls)
    └── utils/
        └── api.js                ← fetch wrapper for /api/{project}/eval
```

### SkySpark view record (trio)

```
id: @p:yourProject:r:hwMeterTable
dis: "HW Meter Table"
view
jsHandler: "hwMeterTableHandler"   // ← must match the global exposed by Entry file
```

> **Note:** After renaming from `earlhamHWTable`, update `jsHandler` in the SkySpark view record to `hwMeterTableHandler`.

### Module loading sequence

1. SkySpark loads `hwMeterTableEntry.js` (auto-discovered at `/pub/ui/`)
2. Entry creates a stub `hwMeterTableHandler` global and calls `loadModules()`
3. Modules are loaded sequentially by injecting `<script>` tags:
   `utils/api.js` → `evals/loadDemandData.js` → `components/SiteTable.js` → `hwMeterTableHandler.js`
4. Each module self-registers to `window.hwMeterTable.*`
5. Handler sets `window.hwMeterTableApp = window.hwMeterTable`
6. Entry file delegates all `onUpdate` calls to `window.hwMeterTableApp.onUpdate`

### Cache busting
The `VERSION` constant in `hwMeterTableEntry.js` is appended as `?v=22` to every module URL. **Increment this number** before deploying updated module files to force browsers to reload them.

---

## Changing the Data Source

To swap the Axon function:

1. Open `evals/loadDemandData.js`
2. Edit lines 46–47:
   ```js
   var siteAxon   = 'your_new_function(' + targets + ', ' + dates + ')';
   var totalsAxon = 'your_new_function(' + targets + ', ' + dates + ', 2)';
   ```
3. Update `PLACEHOLDER_META` in `components/SiteTable.js` to match the new column names/labels
4. Bump `VERSION` in `hwMeterTableEntry.js` and redeploy

---

## Planned: Site Detail Page

When a user clicks a site row, a detail view should open showing the raw/filtered data for that site. Rough UX sketch:

### Interaction
- Click any site row → slide-in panel or new view loads for that site
- "Back to all sites" link returns to the summary table

### Detail page layout

```
┌─────────────────────────────────────────────────────────┐
│  ← Back    [Site Name]                    [date range]  │
├─────────────────────────────────────────────────────────┤
│  KPI cards (site-specific):                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Peak Load│ │ Peak Flow│ │Est. Max  │ │Meas/Est  │  │
│  │ 1,234 kW │ │ 567 gpm  │ │ 2,000 kW │ │  62%     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  Raw history table / chart (filtered data):             │
│  timestamp | demand (kW) | flow (gpm) | ...             │
│  ─────────────────────────────────────────────────────  │
│  2025-01-01 | 1,100      | 510        | ...             │
│  2025-01-02 | 1,234      | 567        | ...             │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

### Data source for detail page
The detail page would call a separate Axon function with the site ref and date range — e.g.:
```
report_demandValCalcs_singleSite(@siteRef, dates)
```
This is TBD — dependent on what functions exist in the SkySpark project.

### Implementation approach
- Add a `click` listener on each `<tr>` in `SiteTable.js`
- Store the site ref from the row's `id` column
- New component `components/SiteDetail.js` handles the detail panel render
- Toggle visibility with CSS classes (no page reload — stays within the pub/ui view)
