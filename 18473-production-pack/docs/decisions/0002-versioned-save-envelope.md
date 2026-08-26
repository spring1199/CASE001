# ADR 0002: Versioned save envelope and migration boundary

## Status

Accepted

## Context

Player progress must survive changes to the runtime state model. Local browser storage is the Phase 01 implementation, while the persistence contract must also permit a later Supabase adapter. Reading stored JSON with an unchecked TypeScript cast would allow corrupt, incompatible, or cross-case data into gameplay state.

## Decision

Persist player state inside a strict envelope containing a numeric save version, save timestamp, and Zod-validated `PlayerState`. Keep decoding and migration independent of the storage adapter. A migration registry owns transitions from older formats; version `0` represents the starter's legacy unversioned shape and migrates deterministically to the current version `1` state.

Adapters namespace records by case ID and verify that the embedded case ID matches the requested namespace. Unknown future versions, corrupt JSON, invalid envelopes, and case mismatches produce contextual typed errors. Browser storage is obtained lazily through an injected storage factory so importing persistence code is safe during server rendering and unit tests.

## Consequences

- Local storage and future remote adapters can share validation and migrations.
- Adding a save version requires a schema and an explicit migration step rather than a cast or silent fallback.
- Legacy saves receive deterministic defaults for fields that did not exist in the starter shape. Missing timestamps use the Unix epoch sentinel rather than load time so repeated decoding cannot reset pacing metadata.
- Legacy ordered ID lists are normalized by first occurrence before current-schema validation; current-version saves reject duplicates instead of silently changing them.
- Runtime mutation/save timestamps use the latest parsed instant across the candidate clock and existing metadata, so an older local clock cannot regress hydrated progress. Clear uses its request time for the new baseline. Store hydration and save boundaries validate state even when a custom adapter is used.
- Unsupported future saves fail closed instead of risking progress corruption.
