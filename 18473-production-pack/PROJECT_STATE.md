# 18473 Project State

## Project name

18473 — a 2–3 hour psychological digital-detective thriller set in fictional modern Arvantai.

## Current phase

Phase 04 — Case #001 Content: implemented and validated on the dedicated branch. The branch is intentionally unmerged and awaits explicit review/merge approval. Phase 05 has not started.

## Last completed and approved phase

Phase 03 — Case Engine, approved and merged through PR #4. The latest approved `main` state is `a7cbd62df2ff06b1ece60144377f620a47042ae1`.

## Current active branch

`codex/phase-04-case001-content`

## Latest approved commit hash

`a7cbd62df2ff06b1ece60144377f620a47042ae1` on `main`.

## Current task implementation commit

`eb1ce6db8cfc085fde8688485d72d6e95af43e1f` is the final Phase 04 implementation commit before this state-only handoff refresh. The final branch HEAD is the subsequent state-only commit because a commit cannot contain its own hash.

## Current implementation status

Phase 04 converts the corrected `18473-PHASE04-PRODUCTION-PACK-v1.0.1-FINAL` authored source into strict, indexed, data-driven Case #001 content. It adds eight Phase 04 authored collection schemas and referential validation; projects the Case #001 phone through all eight Phase 02 apps; resolves the 21-item Phase 03 progression debt to zero; implements F17, Winter 47, Hope #1/#2/#3, the 41→57→73→88→91 GRAPH confidence path, TRACE/SEVER, and post-ending NODE: 0 gates; and marks `progressionComplete: true`.

Authored Case #001 and engine data remain server-only. The client requests a validated player-visible projection from `/api/case-runtime` only after device unlock. S3/S4 binaries remain outside `public/` and are served by the uniform 404-gated `/api/case-assets/[assetId]` route. ADR 0005 records this boundary.

## Completed milestones

- Verified all 40 corrected production-pack checksums and confirmed `content/authored/CASE001_AUTHORED_CONTENT_v1.0.md` is the sole authoritative authored-content source.
- Reconciled the corrected pack against repository canon without changing narrative canon.
- Added strict schemas, duplicate checks, cross-source references, and metadata for all eight authored phone collections.
- Integrated 118 authored records: 12 artifacts/files, 16 browser records, 9 calls/audio scripts, 4 emails, 3 locations, 36 message threads containing 471 messages, 3 notes, and 35 gallery records.
- Integrated 54 evidence records, 17 deductions (including 2 contradictions), 12 objectives, 5 locks, 5 triggers, 8 timeline events plus 5 positions, and 10 GRAPH nodes plus 6 edges.
- Verified multiple discovery orders, repeated events, deterministic replay, persistence, cycle freedom, no soft locks, and zero progression debt.
- Generated 79 visual masters, derived 2 approved crops, retained 4 UI DATA assets as native UI, and integrated all 85 registry entries. Runtime delivery contains 57 public S0–S2 and 24 gated S3–S4 binaries; every binary has dimensions and SHA-256 in `generation-ledger.json`.
- Added server-projected authored phone delivery, gated asset route coverage, client-bundle leak scanning, and production Case #001 Playwright flows.
- Preserved all approved audio scripts/transcripts and playback wiring. No fake voice recording was created; unavailable audio is explicitly `scripted` and makes no broken media request.

## Current task status

Phase 04 implementation is complete on its dedicated branch and is undergoing the final continuity refresh. It is not merged. No Phase 05 implementation has begun.

## Validation and test results

Final Phase 04 verification on 2026-08-27:

- Corrected production pack: 40/40 SHA-256 entries verified before branch creation.
- Pack validation: passed, 154 unique authored IDs checked.
- Continuity validation: passed, 4 files and 21 required state fields checked.
- Continuity tests: 8/8 passed.
- Lint: passed with zero warnings.
- Strict TypeScript: passed.
- Unit tests: 301/301 passed across 25 files.
- Playwright: 14/14 passed, including initial-client protected-content scanning, deferred projection, uniform hidden-record rejection, and S3/S4 public-path leakage checks.
- Production build: passed with no warnings; `/` is static and both case APIs are dynamic server routes.
- Asset production: 81/81 runtime binaries reproduced from source masters; ledger hashes and dimensions verified.
- Progression analyzer: 21 debt items before Phase 04, 0 after; no dependency cycles, unreachable progression, or soft locks.
- Security audit: 0 vulnerabilities; dependency versions were unchanged.
- Protected-name/spoiler/asset scans: passed; representative secret facts, ending IDs, final call content, S3/S4 filenames, and Phase 05 implementation files are absent from initial browser delivery/public assets.

## Open tasks

- Review the unmerged Phase 04 branch and approve or request changes.
- Merge only after explicit user approval.
- Keep Phase 05 unstarted until separately authorized.

## Known limitations

- Voice binaries were not supplied and audio generation was outside the available production capability. Nine approved call/audio records are delivered as production-ready scripts/transcripts with `scripted` status; ready-audio UI wiring remains intact and no unrelated placeholder voice is used.
- Generated imagery received manifest-driven and representative manual visual QA, but human art-direction review before release is still appropriate.
- Physical notched-device testing remains useful beyond Chromium safe-area coverage.

## Known technical risks

- The local-first single-player client sends its validated save state to the server projection endpoint, and gated asset cookies mirror that state. This prevents accidental/static/network preloading but is not an anti-tamper entitlement system; production account/server-session hardening is deferred.
- Source masters add approximately 157 MB and optimized runtime derivatives approximately 25 MB to the repository.
- Server projection is monotone and applies returned changes through the existing Zustand action surface; future non-monotone gameplay state would need an explicit server-authoritative replacement protocol.
- Next.js generated files should continue to be checked after production builds, although the final Phase 04 build produced no unintended diff.

## Known narrative risks

- F17 remains intentionally inferable through multiple independent clue families; future polish must not turn any single clue or image into conclusive proof.
- Generated recurring-character scenes may show modest photographic variation; future visual replacement must preserve the approved anchor identities and clue subtlety.
- The final recovered call strongly implies intimacy but does not prove romantic love; audio performance must preserve that ambiguity.
- Winter 47 must retain both the saved life and shelter-network harm without GOOD/BAD labeling.

## Unresolved decisions

- Final voice casting, recording, mix, and audio-master asset IDs belong to a separately authorized later phase.
- Production hosting must decide whether local single-player state is sufficient or whether signed server sessions are required for anti-tamper enforcement.
- No Phase 04 canon or progression decision remains unresolved.

## Current spoiler/reveal gates

- F17 = Maral and Maral = unauthorized Winter 47 operator remain separate reveals; four independent clue families plus archive access gate the first.
- Winter 47 preserves the life-saved and collateral-harm truths without moral scoring.
- Hope #1 is ambiguous, Hope #2 is Bilguun's false-positive device activity, and Hope #3 genuinely confirms Tenuun is alive.
- TRACE confirms the final edge and can reveal exact location only at the final authored gate. SEVER severs the edge and never reveals exact location; status remains UNKNOWN.
- NODE: 0 appears only after a completed ending.
- Initial HTML/JavaScript contains only the public case summary; authored phone projections arrive after device unlock, while hidden records and locked asset paths remain absent.

## Deferred work

- Phase 05 audio and emotional polish, only after explicit authorization.
- Optional human art-direction pass and physical-device QA.
- Optional production anti-tamper/session hardening if required by the eventual hosting model.

## Next expected task

Review and approve the unmerged Phase 04 branch. Merge only with explicit user approval. Phase 05 is the next possible phase after Phase 04 approval, but it has not been started or authorized.

## Exact continuation point

Continue from the clean `codex/phase-04-case001-content` branch at the state-only commit following implementation commit `eb1ce6db8cfc085fde8688485d72d6e95af43e1f`. Review the Phase 04 diff and validation evidence. Do not merge and do not begin Phase 05 without explicit user approval. The corrected production pack remains an external handoff artifact and was not committed as repository product code.

## Source-of-truth documents

- Workflow and continuity: `AGENTS.md`, `PROJECT_STATE.md`, `HANDOFF.md`.
- Canonical documentation directory: `docs/`.
- Phase execution-plan directory: `docs/exec-plans/`.
- Executable phase-task directory: `tasks/`.
- Narrative canon: the relevant canonical `docs/` files listed in `AGENTS.md`.
- Phase 04 scope: `docs/exec-plans/PHASE-04-CASE001-CONTENT.md` and `tasks/04-case001-content.md`.
- Integrated authored data: `content/cases/case-001/`.
- Phase 04 implementation design and plan: `docs/superpowers/specs/2026-08-27-phase04-case001-content-design.md` and `docs/superpowers/plans/2026-08-27-phase04-case001-content.md`.
- Server projection decision: `docs/decisions/0005-phase04-server-projections.md`.
- Acceptance and reveal gates: `docs/14-TESTING-ACCEPTANCE.md` and the automated test suites.

## Things that must NOT be changed without explicit approval

- Narrative canon, character truths, true timeline, ending canon, or reveal order.
- Spoiler/reveal gates or server-projected delivery protection.
- Case #001 data-driven boundaries by hardcoding story answers into reusable UI or engine code.
- The completed Phase 04 branch through merge without explicit approval.
- Phase 05 scope or implementation before explicit authorization.
