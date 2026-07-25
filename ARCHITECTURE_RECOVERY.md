# Parlay Tracker Canonical Rebuild Recovery Contract

## Purpose

Rebuild the application as a clean, maintainable canonical codebase while preserving approved production behavior, user data compatibility, and the approved visual interface.

The current live Gold application remains the visual reference. The audited canonical source remains the architectural starting point. No live branch or domain may be modified during recovery work.

## Branch policy

- Recovery branch: `recovery/canonical-rebuild`
- Starting commit: `3731f982987ac34a0b1d3bcf11a03b15399574a8`
- The former `work/visual-parity-rc1` branch is frozen as an investigation record only.
- Generated preview output must never be edited directly.
- All application changes must originate under canonical source and be produced by the build process.

## State ownership

Each concept has one owner.

| Concept | Canonical owner |
| --- | --- |
| Ticket workflow | `status`: active or completed |
| Runtime tracker phase | normalized tracker evaluation: pending, live, suspended, unavailable |
| Final ticket result | normalized evaluated outcome: won, lost, push |
| Leg result | normalized leg evaluation |
| Leg actual value | normalized leg evaluation |
| Settlement time and reason | settlement service |
| Dashboard presentation | normalized read-only ticket view model |

Rendering code must not search several persistence fields and guess which value is authoritative.

## Required normalized view model

The dashboard and Ticket View must render from one normalized model assembled outside the DOM renderer. At minimum it must expose:

- ticket id;
- ticket type, league, game, odds/title, sportsbook;
- workflow status;
- runtime phase;
- final outcome;
- saved and settlement timestamps;
- normalized legs containing label, metadata, state, actual value, target, display value, and settlement data.

Legacy stored records may be read through a compatibility adapter, but legacy field conflicts must be resolved before rendering.

## Build contract

1. Edit canonical source only.
2. Run the canonical build.
3. Generate Gold and Silver from the same source commit.
4. Verify generated output matches a clean rebuild.
5. Publish only an off-live preview branch for review.
6. Never patch generated preview files.

## Styling contract

- Approved component styles belong in the primary stylesheet structure.
- Temporary override layers must not become permanent architecture.
- Visual parity changes must be integrated by component rather than appended as accumulating corrections.

## Verification gates

No increment is complete until all applicable gates pass:

1. static build succeeds;
2. generated-output consistency check succeeds;
3. automated unit/integration checks succeed;
4. existing localStorage records load without loss;
5. real-browser functional checks succeed;
6. visual comparison against LIVE succeeds for the bounded area;
7. source branch, preview branch, and verification status are reported accurately.

## Recovery sequence

1. Audit the audited baseline and map current state flow.
2. Implement the normalized ticket view model and legacy compatibility adapter.
3. Make tracker evaluation persist actual values and normalized leg states coherently.
4. Make settlement consume normalized evaluation rather than independently creating contradictory state.
5. Make Dashboard and Ticket View consume only the normalized view model.
6. Establish deterministic preview generation and generated-output verification.
7. Reapply the approved My Tickets visual requirements as one coherent component implementation.
8. Validate existing tickets, active/completed overrides, refresh, settlement, expansion, filtering, selection, actions, and navigation.
9. Continue the remaining visual review only after the rebuilt My Tickets section passes.

## Non-negotiable restrictions

- No deployment.
- No modification to live Gold or Silver branches/domains.
- No direct generated-file edits.
- No renderer-level guesses used as permanent fixes.
- No completion claim without verification evidence.
