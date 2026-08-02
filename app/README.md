# Canonical Parlay Tracker application

This directory is the only application source for both production builds.

```text
app/src + app/config/builds.json
          ↓
 scripts/build-static.mjs
          ↓
 build/gold
 build/silver
```

## Ownership

- `storage.js`: the sole owner of `parlayTracker.savedTickets.v1` and stable record IDs.
- `builder-controller.js`: builder state, leg ordering, validation, serialization, editing, manual legs, and doubleheader identity.
- `dashboard-controller.js`: all dashboard state, sorting before rendering, filtering, expansion, selection, deletion, and actions.
- `tracker-service.js`: score refresh and ticket outcome persistence.
- `settlement-service.js`: event-ledger settlement timestamps.
- `ticket-view-controller.js`: standalone ticket and active-ticket rendering.
- `sharing-controller.js`: Scriptable-code import and sportsbook-free share packages.
- `app-controller.js`: navigation and cross-controller commands.

Gold and silver may differ only through generated metadata and theme variables. Application JavaScript, `app.css`, and `dashboard.css` must be identical.

The branch remains off-live until the behavioral test matrix passes.
