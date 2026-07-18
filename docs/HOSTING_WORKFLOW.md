# Parlay Tracker hosting and release workflow

## Repository roles

- `SuperL0ng/parlay-tracker` is the canonical source repository and gold deployment target for `simonsports.bet`.
- `SuperL0ng/SuperL0ng.github.io` is the independent silver deployment target for `simonsportsbetting.com`.

Neither production site may fetch, mirror, rewrite, or import the other repository at runtime.

## Build contract

From one audited source commit:

1. run `npm ci`;
2. run `npm test`;
3. run `npm run build`;
4. verify `build/gold` and `build/silver` with `npm run verify:hosting`;
5. retain the exact source commit and build hashes used for both deployments.

Generated `build/` output is ignored on the development branch.

## Gold deployment

1. Export the existing `simonsports.bet` ticket library as a precaution.
2. Replace the gold repository deployment root with the complete contents of `build/gold`; do not retain historical root scripts or manifests.
3. Publish and verify `simonsports.bet` before touching silver.
4. Test saved-ticket preservation, four-ticket ordering, expansion, filters, selection/deletion, actions, settlement timestamps, refresh, sharing, mobile layout, icons, manifest, and theme identity.

## Silver deployment

1. Use `build/silver` produced from the exact same audited source commit as gold.
2. Export the existing `simonsportsbetting.com` ticket library as a precaution.
3. Replace the silver repository deployment root completely; do not copy gold metadata or retain old runtime patches.
4. Publish and repeat the production verification matrix.

## Storage boundary

The domains are separate browser origins and therefore maintain separate `localStorage` libraries. Deployment on the same domain preserves its existing `parlayTracker.savedTickets.v1` data, but ticket libraries do not transfer between domains automatically.
