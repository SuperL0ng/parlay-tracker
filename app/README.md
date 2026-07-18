# Canonical Parlay Tracker application

This directory is the only application source for both production domains.

```text
app/src + app/config/builds.json
          ↓
 scripts/build-static.mjs
          ↓
 build/gold
 build/silver
```

The gold and silver builds share all JavaScript and structural CSS. They differ only through generated theme values, canonical metadata and copied brand assets.

Ownership rules:

- `storage.js` exclusively owns `parlayTracker.savedTickets.v1` and record IDs.
- `dashboard-controller.js` exclusively owns dashboard sorting, filtering, expansion, selection, deletion and actions.
- `builder-controller.js` exclusively owns the builder state, canonical ticket serialization, manual legs, doubleheader binding and leg reordering.
- `tracker-service.js` coordinates data retrieval, evaluation and settlement persistence.
- No runtime historical-HTML loader, dashboard wrapper stack, mutation-observer repair pass or delayed restoration layer is permitted.

This remains an off-live development build until the complete behavioral test matrix passes.