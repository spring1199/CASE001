# 18473 Project State

## Project name

18473 — a 2–3 hour psychological digital-detective thriller set in fictional modern Arvantai.

## Current phase

Phase 04 — Case #001 Content: completed, approved, and merged into `main` through PR #5. Phase 05 is the current next phase; its implementation exists on `codex/phase-05-polish` and must be restacked onto this merged main state before technical acceptance or review.

## Last completed and approved phase

Phase 04 — Case #001 Content, approved and merged through PR #5 at merge commit `caf1acdddea1a2e545256a9ec5fc439cc1b238a6`.

## Current active branch

`main`

## Latest approved commit hash

`caf1acdddea1a2e545256a9ec5fc439cc1b238a6` is the approved Phase 04 merge commit on `main`. A state-only post-merge refresh follows because a commit cannot contain its own hash.

## Current task implementation commit

`eb1ce6db8cfc085fde8688485d72d6e95af43e1f` is the final Phase 04 implementation commit, `455c79882f61ca06ed14d1d2ffe31688e2aca772` is the approved Phase 04 branch head, and `caf1acdddea1a2e545256a9ec5fc439cc1b238a6` is the Phase 04 merge commit.

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

Phase 04 is complete, approved, and merged into `main`. `progressionComplete = true`, progression debt is 0, and all required visual assets are integrated. Phase 05 is implemented on a separate branch but remains unmerged and must be restacked onto this main state. Full human story/pacing playthrough testing is intentionally pending until after Phase 05 technical validation. Phase 06 has not started.

## Validation and test results

Fresh Phase 04 pre-merge verification on 2026-08-28:

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

- Restack `codex/phase-05-polish` onto the latest approved `main` state without duplicating Phase 04 history.
- Rerun the complete Phase 05 validation matrix, including browser-backed Playwright and the normal production build.
- Keep Phase 05 unmerged pending human playtest and explicit approval.

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

- Full 2–3 hour human playthrough after Phase 05 technical validation.
- Phase 06 human-playtest feedback, regression QA, and release-readiness work only after explicit authorization.
- Optional human art-direction pass, physical-device QA, and production anti-tamper/session hardening.

## Next expected task

Retarget/rebase `codex/phase-05-polish` onto the latest approved `main`, rerun the full Phase 05 validation matrix, and prepare the branch for the pending full human playthrough. Do not merge Phase 05 or start Phase 06.

## Exact continuation point

Continue from `codex/phase-05-polish` at `49f6b3c2916a89eac5d4456d1fa240b50939040f`. Confirm `main` contains Phase 04 merge commit `caf1acdddea1a2e545256a9ec5fc439cc1b238a6` plus this state-only refresh, then restack only the Phase 05 commits after the former Phase 04 head `455c79882f61ca06ed14d1d2ffe31688e2aca772`. Preserve canon, rerun the full validation matrix, and stop before Phase 05 merge or Phase 06.

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
- Phase 05 merge without explicit approval and the pending full human playtest.
- Phase 06 scope or implementation before explicit authorization.
