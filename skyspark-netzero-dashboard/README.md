# Net Zero Dashboard — SkySpark Pub UI View

## Carbon Equivalencies

The dashboard calculates carbon equivalencies from the site's **solar generation (kWh)** using EPA-standard conversion factors. These are computed client-side in `loadData.js` via the `_calcEquivalencies(solarKWh)` function.

### Data Source

Solar generation kWh comes from the KPI eval:

```
view_pubUI_Source_netZeroDashboard(site, dates, "view_pubUI_netZeroKpis")
```

The `solarGeneration` field from the returned grid is used as the input.

### Conversion Factors

All factors are from the [EPA Greenhouse Gas Equivalencies Calculator](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator), based on eGRID national average emission data and EIA household consumption data.

| Metric | Factor | Source |
|---|---|---|
| **CO₂ Avoided** | 0.000709 metric tons per kWh | eGRID US national average emission factor for delivered electricity |
| **Trees Equivalent** | 0.06 MT CO₂ sequestered per tree per year | Medium growth coniferous/deciduous tree, grown for 10 years |
| **Gasoline Gallons** | 0.008887 MT CO₂ per gallon combusted | EPA emission factor for motor gasoline |
| **Homes Powered** | 10,500 kWh per US household per year | EIA average annual electricity consumption |
| **Miles Driven** | 0.0004035 MT CO₂ per mile | Average passenger vehicle (22.2 mpg) |

### Formulas

```javascript
// Step 1: Convert solar kWh to CO₂ avoided (metric tons)
co2MT = solarKWh × 0.000709

// Step 2: Derive each equivalency from CO₂ avoided
trees           = co2MT / 0.06        // seedlings grown 10 years
gasolineGallons = co2MT / 0.008887    // gallons of gasoline
homesPowered    = solarKWh / 10500    // US homes for 1 year
milesDriven     = co2MT / 0.0004035   // avg passenger vehicle miles
```

### Example (277,000 kWh solar)

| Metric | Value |
|---|---|
| CO₂ Avoided | 196.4 metric tons |
| Trees Equivalent | 3,273 seedlings |
| Gasoline Saved | 22,100 gallons |
| Homes Powered | 26.4 homes |
| Driving Offset | 486,741 miles |

### Architecture Note

The equivalency calculation is intentionally performed client-side rather than in SkySpark. This keeps the EPA conversion factors visible, auditable, and easy to update without modifying server-side Axon functions. If a SkySpark-side calculation is preferred (e.g., for use by other views), the same factors can be implemented as an Axon function — the `_calcEquivalencies` function in `evals/loadData.js` serves as the reference implementation.

### Updating Factors

EPA updates the eGRID emission factor periodically as the US grid decarbonizes. To update:

1. Check the latest factor at [epa.gov/energy/greenhouse-gas-equivalencies-calculator](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator)
2. Update the constants in `_calcEquivalencies()` in `evals/loadData.js`
3. Update this README to match

## SkySpark Eval Functions

| Function | Description |
|---|---|
| `view_pubUI_netZeroKpis` | Returns `buildingUsage` and `solarGeneration` KPIs |
| `view_pubUI_netZeroMonthly` + `"Building"` | Monthly building actual/model/diff |
| `view_pubUI_netZeroMonthly` + `"Solar"` | Monthly solar actual/model/diff |
| `view_pubUI_netZeroMonthly` + `"Net Zero"` | Monthly net zero actual (nzActual) and model (nzModel) |
| `view_pubUI_netZeroMonthly` + `"Meter Breakdown"` | Monthly meter-level breakdown by end use |

All evals are called via:
```
view_pubUI_Source_netZeroDashboard(siteRef, dateRange, funcName[, category])
```
