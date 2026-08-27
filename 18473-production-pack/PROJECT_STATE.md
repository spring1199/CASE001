# 18473 Project State

## Project name

18473 — a 2–3 hour psychological digital-detective thriller set in fictional modern Arvantai.

## Current phase

Phase 03 — Case Engine: implemented and fully validated on `codex/phase-03-case-engine`, awaiting user review/approval. Phase 04 has not started.

## Last completed and approved phase

Phase 02 — Fake Phone OS, approved and merged through PR #2.

## Current active branch

`codex/phase-03-case-engine` (created from `main` at `9254bcc6a002de63e53a4d46b93b8633601b6aef`).

## Latest approved commit hash

`bcee8e101e7950779c408176f33dac9c2e3e2b03` on `main` (continuity merge commit, PR #3), followed by state-only refresh `9254bcc6a002de63e53a4d46b93b8633601b6aef`.

## Current task implementation commit

`79dbcc48ad23d5a36f47f47e918bdd9d7ffe75df` (Phase 03 case engine implementation). This state-only refresh commit follows it because a commit cannot contain its own hash.

## Current implementation status

Phases 01 and 02 are implemented and merged; continuity infrastructure is merged via PR #3. Phase 03 adds the reusable case engine on `codex/phase-03-case-engine`: a recursive authored condition vocabulary; `graph` and `timeline` as validated core collections; a pure deterministic event processor with monotone derived-state settlement; deduction/contradiction evaluation; conditioned objectives; lock/trigger evaluation; timeline reconstruction; gated graph projection with evidence-weighted confidence; lock-gated ending eligibility with the TRACE/SEVER location boundary; reachability/cycle/final-choice progression analysis (fail-closed when a manifest declares `progressionComplete`); evidence-board pins with save envelope v2 and a chained v0→v1→v2 migration; the spoiler-safe `projectCaseView` engine-to-UI surface; and a store-integrated `createCaseRuntime` bridge. Architecture decisions are recorded in `docs/decisions/0004-phase03-case-engine.md`. A synthetic mini-case (`tests/fixtures/mini-case.ts`) proves the engine end-to-end under strict progression validation.

## Completed milestones

- Phase 01 foundation: schemas, fail-closed case loading, engine primitives, player state, save envelope, and spoiler-safe public projection.
- Phase 02 phone OS: lock/home, Messages, Gallery, Calls, Mail, Browser, Notes, Files, Settings, deep links, metadata, zoom, audio transcripts, discovery persistence, accessibility, and responsive QA.
- Phase 02 PR: [#2](https://github.com/spring1199/CASE001/pull/2), merged as `1c2d8b75b632c855cde06052a517eeaa5a6757ee`.
- Continuity handoff PR: [#3](https://github.com/spring1199/CASE001/pull/3), merged as `bcee8e101e7950779c408176f33dac9c2e3e2b03`.
- Phase 03 case engine implemented on `codex/phase-03-case-engine` (`79dbcc48ad23d5a36f47f47e918bdd9d7ffe75df`), including the docs/14 narrative gate tests automated against real Case #001 data.

## Current task status

Phase 03 is implemented and fully validated on `codex/phase-03-case-engine` (2026-08-27). All Phase 01/02 behavior is preserved (273/273 unit tests, 12/12 Playwright including the browser-delivery spoiler scan). The branch awaits user review; do not merge without explicit approval, and do not start Phase 04.

## Validation and test results

Run on 2026-08-27 at Phase 03 completion (`79dbcc48ad23d5a36f47f47e918bdd9d7ffe75df`):

- Pack validation: 51 authored IDs passed, including the new `graph.json`/`timeline.json` scan and the SEVER-never-reveals-location assertion.
- Continuity validation: 4 files and 21 required state fields passed.
- Continuity unit tests: 8/8 passed.
- Lint and strict typecheck: passed with zero warnings.
- Project unit tests: 273/273 passed (85 new Phase 03 tests: conditions, engine events, progression analysis, spoiler projections, mini-case end-to-end, save migrations, and the docs/14 Case #001 gate tests).
- Playwright: 12/12 passed, including the browser-delivery spoiler scan.
- Production build: passed (generated `next-env.d.ts` rewrite restored, no intentional change).
- Security audit: 0 vulnerabilities (no dependency manifest changes this phase).

## Open tasks

- Review and merge `codex/phase-03-case-engine` after explicit approval.
- Do not begin Phase 04 or author final Case #001 narrative content until explicitly requested.

## Known limitations

- Phone content is deliberately neutral placeholder content, not final Case #001 narrative content.
- Case #001 `graph.json` and `timeline.json` are validated core collections but intentionally empty until Phase 04 authors them; eight phone-content collections remain deferred-empty.
- Case #001 progression is intentionally incomplete: nothing grants `fact_18473_archive_open`, four objectives lack activation conditions, and both endings are therefore unreachable in normal play. The exact debt is pinned by `tests/content/case-001-gates.test.ts` and must shrink to empty before the manifest may declare `progressionComplete: true`.
- The phone UI does not yet consume the case engine (`createCaseRuntime`/`projectCaseView`); wiring the investigation surfaces is later-phase work.
- Time/pacing trigger gates are deferred pending a determinism design decision (ADR 0004).
- Physical notched-device testing remains useful beyond Chromium safe-area checks.

## Known technical risks

- Progression reachability treats every visible evidence record as discoverable because artifact delivery lives in deferred collections; once artifacts gain schemas, discovery paths must join the analysis (ADR 0001/0004).
- The browser-delivery spoiler scan protects the bare word "unknown" (F17's authored role); client-delivered source must avoid emitting it as a standalone token (Phase 03 renamed engine rejection reasons to `unrecognized-*` and avoided `z.unknown()` in client-bundled persistence code for this reason).
- Engine settlement has a bounded fixed-point guard; pathological authored data throws instead of looping.
- `PROJECT_STATE.md` can become stale if agents skip the mandatory completion update; `npm run validate:continuity` verifies structure, not factual accuracy.
- Next.js may rewrite generated `next-env.d.ts` during build; restore it if no intentional source change exists.

## Known narrative risks

- Importing authored case records into client phone code could leak gated facts; `projectCaseView` is the only intended engine-to-UI surface.
- Neutral fixtures (the Phase 02 phone seed and the Phase 03 mini-case) must never evolve into a second canon source.
- Future content must preserve fair-play clue reachability and reveal timing; the pinned Case #001 debt list documents exactly what Phase 04 must author.
- Deduction titles are shown once prerequisites are met, so Phase 04 must author titles that do not pre-confirm their own conclusions before completion.

## Unresolved decisions

- Time/pacing trigger gates (docs/09 lists them; deferred for determinism, ADR 0004).
- Whether Phase 04 wires the phone UI to the case runtime or a dedicated UI phase does; resolve from the Phase 04 execution plan and user direction.
- The mechanical ending gate wiring (`gateLockId`, `revealsExactLocation` on Case #001 endings) encodes documented canon; flag it during review if the user considers it a canon-adjacent change.

## Current spoiler/reveal gates

- Canonical alias identity projection remains gated by its authored reveal fact (now enforced in `projectCaseView` for characters and graph nodes).
- Winter 47 operator projection remains gated until Reveal #1 (hidden evidence is also non-discoverable and rejects like a nonexistent ID).
- Hope events #1 and #2 must not confirm the live-status truth (the live fact is grantable only by its reveal deduction).
- Final choice and exact-location projection must obey the ending gates, including the SEVER boundary (endings are eligible only through `lock_final_choice`; SEVER never reveals the location, asserted in pack validation and gate tests).
- Explicit romantic-love confirmation remains forbidden (asserted by an authored-content scan test).
- All ten docs/14 narrative gate tests are automated in `tests/content/case-001-gates.test.ts` and the Playwright browser-delivery spoiler scan.

Authoritative details and automated expectations live in `AGENTS.md`, `docs/01-MASTER-STORY-BIBLE.md`, `docs/06-CLUE-EVIDENCE-MATRIX.md`, and `docs/14-TESTING-ACCEPTANCE.md`.

## Deferred work

- Phase 04 final Case #001 content, including `graph.json`/`timeline.json` records, the `fact_18473_archive_open` grant path, objective activation conditions, and eventually `progressionComplete: true`.
- Wiring the phone UI to `createCaseRuntime`/`projectCaseView`.
- Time/pacing trigger gates (needs determinism design).
- Artifact-collection schemas plus referential checks for `artifactViewed` conditions and deduction/trigger unlock targets (ADR 0001/0004).
- Phase 05 audio/polish and Phase 06 QA.
- The eight remaining deferred-empty phone content collections until their designated phases.

## Next expected task

Review and merge `codex/phase-03-case-engine` after explicit user approval. After a separate explicit authorization, begin Phase 04 by reading `docs/exec-plans/PHASE-04-CASE001-CONTENT.md`, `tasks/04-case001-content.md` if present, and every document they reference.

## Exact continuation point

Checkout `codex/phase-03-case-engine`, confirm a clean worktree, verify implementation commit `79dbcc48ad23d5a36f47f47e918bdd9d7ffe75df` followed by the state-only refresh at branch HEAD, inspect `git log -5 --oneline` and `git diff main...HEAD`, then review the Phase 03 work against `docs/exec-plans/PHASE-03-CASE-ENGINE.md`, `tasks/03-case-engine.md`, and `docs/decisions/0004-phase03-case-engine.md`. Merge only after explicit approval. After merge, sync `main`, immediately refresh the active branch, approved commit, task status, next task, and continuation point in `PROJECT_STATE.md`, run continuity validation, and commit that state transition; do not start Phase 04.

## Source-of-truth documents

- Workflow and boundaries: `AGENTS.md`, `PROJECT_STATE.md`, `HANDOFF.md`.
- Canon/product sources: `docs/`, especially `docs/00-PROJECT-VISION.md` through the relevant domain documents.
- Phase specifications: `docs/exec-plans/`.
- Executable task briefs: `tasks/`.
- Current phase sources: `docs/exec-plans/PHASE-03-CASE-ENGINE.md`, `tasks/03-case-engine.md`, and `docs/decisions/0004-phase03-case-engine.md`.
- Continuity-infrastructure brief (historical): `docs/superpowers/specs/2026-08-27-continuity-handoff-design.md` and `docs/superpowers/plans/2026-08-27-continuity-handoff.md`.
- Architecture and schema: `docs/09-CASE-ENGINE.md`, `docs/12-TECH-ARCHITECTURE.md`, `docs/13-DATA-SCHEMA.md`.
- Acceptance and reveal gates: `docs/14-TESTING-ACCEPTANCE.md`.
- Architectural decisions: `docs/decisions/`.

## Things that must NOT be changed without explicit approval

- Narrative canon, character truths, true timeline, ending canon, or reveal order.
- Spoiler/reveal gates or client-delivery protections.
- Phase 01/02 approved behavior or fail-closed validation.
- Case #001 data-driven boundaries by hardcoding narrative into reusable engine/UI code.
- Intentionally deferred collections before their designated phases.
- The active phase boundary: Phase 03 must not start without explicit instruction.
