# Reheat KPI Scatter Plot

A SkySpark diagnostic dashboard that visualizes HVAC reheat valve health across VAV (Variable Air Volume) terminal units. It helps facility managers quickly identify faulty heating coils and leaking reheat valves by plotting average discharge air temperature against reheat valve output.

## Features

- **KPI Summary Row** — Total VAVs, faulty reheat count, leaking valve count, fleet average RH%, and fleet average DAT
- **Interactive Scatter Plot** — SVG chart plotting Avg DAT (50–100 °F) vs. Avg Reheat Valve Output (0–100%) with color-coded anomaly zones
- **Sortable/Searchable Table** — Click column headers to sort, search by name or status, click rows to highlight on the scatter plot
- **Fullscreen Mode** — Expand the scatter plot to fill the screen
- **Collapsible Table** — Hide/show the table panel to give the chart more room
- **Smart Tooltips** — Hover any dot for unit details; tooltips clamp to viewport edges

## Classification Rules

Units are classified based on configurable thresholds in `constants/fields.js`:

| Status | Condition |
|---|---|
| **Faulty Reheat** | DAT < 68 °F AND RH > 60% |
| **Leaking Valve** | DAT > 75 °F AND RH < 30% |
| **Watch** | DAT < 65 °F AND RH > 42% |
| **Normal** | Everything else |

## Project Structure

```
skyspark-reheat-dashboard/
├── index.html                          # Standalone dev/test page
├── reheatDashboardEntry.js             # SkySpark entry point (deploy to pub/ui/ root)
└── reheatDashboard/
    ├── App.js                          # Root app — DOM, events, orchestration
    ├── reheatDashboardUI.js            # SkySpark integration, CSS loading, data fetch
    ├── reheatDashboardStyles.css       # All scoped styles
    ├── constants/
    │   └── fields.js                   # Thresholds, labels, badge/tooltip CSS classes
    ├── components/
    │   ├── KpiRow.js                   # Summary KPI cards
    │   ├── ScatterChart.js             # SVG scatter plot
    │   └── VavTable.js                 # Sortable, searchable data table
    ├── evals/
    │   └── loadReheatData.js           # Axon eval caller and data mapper
    └── utils/
        ├── api.js                      # Haystack API utilities (eval, unwrap, extract)
        ├── classify.js                 # VAV status classification logic
        ├── demoData.js                 # Deterministic demo dataset generator
        └── svg.js                      # SVG element helpers, dot color scheme
```

## Deployment to SkySpark

### 1. Upload files

- Copy `reheatDashboardEntry.js` to `{var}/pub/ui/` (the root — SkySpark only auto-discovers JS here)
- Copy the `reheatDashboard/` directory to `{var}/pub/ui/reheatDashboard/`

### 2. Create a View record

The view record's `jsHandler` should reference `reheatDashboardHandler`. The view expects two variables:

| Variable | Type | Description |
|---|---|---|
| `targets` | Axon ref | Equipment set expression (e.g. `@nav:equip.all`) |
| `dates` | Axon DateSpan | Date range (e.g. `2025-01-01..2025-02-01`) |

These can be set on the view itself or inherited from a parent view.

### 3. Axon function

The dashboard calls `view_reheatReport_pubUI(targets, dates)` and expects a grid with these columns:

| Column | Description |
|---|---|
| `targetRef` | VAV unit display name |
| `vav_SupplyAirTemperature` | Average discharge air temperature |
| `vav_HeatingValveOutput` | Average heating valve output (%) |

## Local Development

Open `index.html` in a browser — no build step or server required. It loads all modules in dependency order and renders with 200 synthetic demo data points. No SkySpark session is needed.

## Data Flow

1. SkySpark view system calls `reheatDashboardHandler.onUpdate({ view, elem })`
2. Entry file loads all modules sequentially (with cache-busting)
3. `reheatDashboardUI.js` reads session credentials and view variables
4. `loadReheatData.js` evals the Axon function via the Haystack API
5. Results are mapped to `{ id, name, dat, rh, flag }` objects (rounded to integers)
6. `App.js` builds the DOM and wires up KPIs, scatter chart, and table
7. If the API call fails or no session exists, demo data is used as a fallback

## Fallback Behavior

- **No SkySpark session or missing variables** — renders with demo data
- **API error** — shows an error banner at the top, then falls back to demo data
- **Stale responses** — a generation counter discards in-flight responses that arrive after a newer request
