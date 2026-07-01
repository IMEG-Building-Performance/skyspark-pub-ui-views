# MBCx Dashboard Directory Reconcile

This branch starts the dashboard toward a clearer no-build SkySpark structure.
It intentionally keeps the current deployment contract intact:

- `mbcxDashboardEntry.js` still lives at the package root because SkySpark only auto-discovers root pub UI handlers.
- Runtime files still load sequentially from `/pub/ui/mbcxDashboard/`.
- Existing component paths remain in place so the branch is easy to deploy and test.

## Target Shape

```text
skyspark-mbcx-dashboard/
  mbcxDashboardEntry.js
  mbcxTrendingEntry.js
  mbcxDashboard/
    App.js
    mbcxDashboardUI.js
    mbcxDashboardStyles.css
    core/
      tabRegistry.js
      appState.js
      configStore.js
      navigation.js
      permissions.js
    skySpark/
      session.js
      viewVars.js
      refs.js
      axonClient.js
      haystackParser.js
    data/
      dashboardLoader.js
      sitesApi.js
      faultsApi.js
      equipmentApi.js
      complianceApi.js
      meetingsApi.js
      tenantAllocationApi.js
      trendsApi.js
    components/
      shared/
      layout/
      summary/
      faults/
      equipment/
      compliance/
      trends/
      meetings/
      tenantAllocation/
      config/
    utils/
      escape.js
      format.js
      dates.js
      scriptLoader.js
      chartLoader.js
    styles/
      tokens.css
      layout.css
      shared.css
      feature-files.css
    vendor/
      chart.umd.min.js
```

## First Slice In This Branch

- Adds `core/tabRegistry.js` as the central source of tab labels, order, default visibility, and future permissions metadata.
- Adds `utils/escape.js` for shared escaping in string-template render paths.
- Updates `mbcxDashboardEntry.js` to load the new organizational modules before the app.
- Updates `mbcxTrendingEntry.js` to use the locally vendored Chart.js file instead of a CDN dependency.

## Suggested Next Slices

1. Extract config persistence from `App.js` into `core/configStore.js`.
2. Extract SkySpark session/view-var parsing from `mbcxDashboardUI.js` into `skySpark/session.js`, `skySpark/viewVars.js`, and `skySpark/refs.js`.
3. Move feature components into grouped folders once the loader has a path-map helper.
4. Split `mbcxDashboardStyles.css` into `styles/` source files, then concatenate for deployment if SkySpark should still receive a single CSS file.
