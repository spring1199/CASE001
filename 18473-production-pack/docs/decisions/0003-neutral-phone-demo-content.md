# ADR 0003: Neutral phone demo content

## Status

Accepted for Phase 02.

## Context

Phase 02 needs complete, testable phone application shells before the authored case collections for later phases are populated. Loading future case records into the reusable phone UI would couple presentation code to one case, weaken the existing fail-closed content boundary, and risk delivering unrevealed material to the browser.

## Decision

The Phase 02 demonstration content lives under `src/phone/data` and is validated by the same strict phone-content schema used by the runtime. It is intentionally ordinary, fictional, and independent of Case #001 canon. Reusable components consume the validated phone index and receive all navigation and discovery effects through typed interfaces; they do not import authored case records.

The later-phase JSON collections remain empty until their designated implementation phases. Phase 02 does not add exceptions to pack validation and does not use a placeholder collection to bypass a required authored-content check.

When authored phone content is ready, a later phase can parse it through the existing schema and provide the resulting index to the same phone runtime. The application shells, deep-link handling, metadata inspection, audio transcripts, and discovery bridge therefore remain unchanged while the data source is replaced.

## Consequences

- Phase 02 can exercise every required phone surface without establishing narrative canon.
- Browser-delivery spoiler scans remain meaningful because no future case record enters the phone client bundle.
- The neutral fixture is demonstration and test data, not a second source of narrative truth.
- Later content work must satisfy the existing schema and fail-closed validation before it can replace the fixture.
