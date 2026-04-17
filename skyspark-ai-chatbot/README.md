# Site Summary pUb View

A SkySpark pUb UI view that lets users select a site and generate an AI-powered plain-English summary via an Axon function.

## Features

- **Site selector** — dropdown populated by `readAll(site)` on load
- **Generate Summary** button — calls `siteSummary(@siteRef)` with the selected site
- **Summary panel** — displays the returned string with clean typography
- **Loading indicator** — spinner shown while the Axon function runs
- **Error handling** — inline banner for API or function failures
- **No-session guard** — graceful message when loaded outside SkySpark

## Axon contract

| Function | Signature | Returns |
|---|---|---|
| `siteSummary` | `siteSummary(siteRef)` | `Str` — plain-English AI summary |

The function is expected to be defined in the target SkySpark project. It receives a single `Ref` argument and must return a plain `Str`.

## Project structure

```
skyspark-ai-chatbot/
├── siteSummaryEntry.js          ← Deploy to {var}/pub/ui/ root
└── siteSummary/
    ├── siteSummaryStyles.css
    ├── utils/
    │   └── api.js               ← evalAxon(), unwrapGrid(), extractValue()
    ├── evals/
    │   └── loadSites.js         ← readAll(site) → [{id, dis}]
    ├── App.js                   ← DOM rendering, event wiring
    └── siteSummaryUI.js         ← onUpdate() bootstrap, CSS injection
```

## Deployment

1. Copy `siteSummaryEntry.js` to `{var}/pub/ui/siteSummaryEntry.js`
2. Copy the entire `siteSummary/` folder to `{var}/pub/ui/siteSummary/`
3. Create a view record (trio) in your SkySpark project with:
   ```
   dis: "Site Summary"
   view
   jsHandler: "siteSummaryHandler"
   ```

## SkySpark view record (trio)

```trio
dis: "Site Summary"
view
jsHandler: "siteSummaryHandler"
```

## Development notes

- All CSS is scoped under `#siteSummary` to avoid conflicts with SkySpark host styles
- The entry handler caches loaded modules so repeated `onUpdate` calls skip re-loading
- A generation counter (`_genCounter`) discards stale in-flight `siteSummary()` responses if the user changes the selection mid-flight
- No build tooling required — plain JS modules loaded sequentially via dynamic `<script>` tags
