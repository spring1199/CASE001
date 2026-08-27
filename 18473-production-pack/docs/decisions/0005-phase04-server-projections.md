# ADR 0005: Phase 04 server projections and gated assets

## Status

Accepted for Phase 04.

## Context

Phase 04 replaces neutral phone fixtures with authored Case #001 records. A static client import would place hidden text, reveal IDs, endings, and asset metadata in the initial JavaScript bundle even when the UI did not render them. S3/S4 image files likewise cannot live under `public/`, because their paths and existence are spoilers.

## Decisions

### Authored content and engine settlement stay server-only

The client no longer imports the Case #001 bundle or the Case #001 phone adapter. After local save hydration and an explicit device-unlock action, it posts the validated player state and optional discovery effects to `/api/case-runtime`. The server validates the request, applies deterministic engine events and fixed-point settlement, and returns only the current phone projection. Hidden records are absent rather than redacted.

The client validates the response, reconstructs the generic phone index, and replays the monotone state difference through existing Zustand actions. This preserves local persistence and save migrations without placing authored canon in reusable client code.

### Private visual delivery uses opaque IDs and uniform rejection

S0–S2 runtime derivatives may use static public paths. S3/S4 derivatives live under `private-assets/case-001/runtime` and are read only through `/api/case-assets/[assetId]` after the required fact and ending gates pass. Locked and nonexistent IDs return identical empty 404 responses. The route resolves files inside one fixed directory and never accepts a caller-provided filename.

### Scripted audio never impersonates a finished master

Phone audio records carry `scripted` or `ready` production status. A ready record requires a playback source. A scripted record renders its transcript and production notice without requesting a missing file or substituting synthetic/unrelated voice audio.

## Consequences

- Initial HTML and JavaScript contain only the public case summary and reusable phone/runtime code.
- Unlocking the device is the first authored-content request; later projections remain limited by facts and ending state.
- Browser and route tests scan initial delivery, response projections, public paths, and uniform 404 behavior.
- Client-provided local state is sufficient for accidental-spoiler prevention in the current single-player build, but it is not an anti-tamper entitlement system. Signed server sessions remain a hosting decision.
- Source masters and S3/S4 binaries remain repository/server artifacts, never public static assets.
