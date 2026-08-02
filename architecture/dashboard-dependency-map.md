# Canonical application dependency map

## Source and build chain

`app/src` and `app/config/builds.json` are the only application source. `scripts/build-static.mjs` generates both theme builds. Gold and silver share identical JavaScript and application styles; only configured identity, metadata, theme tokens, domain files, and required assets differ.

## Runtime ownership

| Responsibility | Sole owner |
|---|---|
| Ticket persistence and stable IDs | `storage.js` |
| Builder state, serialization, validation, and leg ordering | `builder-controller.js` |
| Dashboard sorting, filtering, rendering, expansion, selection, deletion, and actions | `dashboard-controller.js` |
| Score refresh and outcome persistence | `tracker-service.js` |
| Event-ledger settlement | `settlement-service.js` |
| Ticket and active-ticket views | `ticket-view-controller.js` |
| Import and sportsbook-free sharing | `sharing-controller.js` |
| Navigation and cross-controller commands | `app-controller.js` |
| Initialization and teardown | `bootstrap.js` |
| Dashboard presentation | `dashboard.css` |

## Data contract

The storage key remains `parlayTracker.savedTickets.v1`. Existing IDs are preserved. Missing or duplicate IDs are repaired once by storage. Rendering and actions bind records only by canonical ticket ID, never card position.

## Retired architecture

The former live-root runtime fetched or rewrote historical HTML, injected versioned patch scripts, repeatedly wrapped dashboard functions, and used mutation observers and delayed repair passes. That entire runtime, including `show-legs-label-fix.js`, historical loaders, duplicate dashboard controllers, patch workflows, and superseded regression scripts, has been removed from the canonical branch.

## Enforced prohibitions

- no runtime historical-HTML loading or `document.write()`;
- no application runtime outside `app/src`;
- no duplicate dashboard controller or stylesheet;
- no positional ticket ownership;
- no post-render DOM sorting;
- no dashboard render wrappers, broad mutation observers, or delayed repair layers;
- no committed generated build output;
- no historical patch or verification workflows.
