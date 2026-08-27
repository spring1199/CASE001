# 18473 Project State

## Project name

18473 — a 2–3 hour psychological digital-detective thriller set in fictional modern Arvantai.

## Current phase

Phase 03 — Case Engine: completed, approved, and merged into `main` via PR #4. Phase 04 has not started, and no Case #001 authored narrative content exists yet.

## Last completed and approved phase

Phase 03 — Case Engine, approved and merged through PR #4 (previously Phase 02 — Fake Phone OS through PR #2).

## Current active branch

`main`

## Latest approved commit hash

`e0af251e4e66b49dab8717792510d53d05faa89a` on `main` (Phase 03 merge commit, PR #4).

## Current task implementation commit

`5f8d9cfac82b3056c3694fa1f886198f2b454f67` (final Phase 03 branch commit, merged via PR #4; implementation commit `79dbcc48ad23d5a36f47f47e918bdd9d7ffe75df`). This state-only refresh commit follows the merge because a commit cannot contain its own hash.

## Current implementation status

Phases 01, 02, and 03 are implemented and merged; continuity infrastructure is merged via PR #3. Phase 03 added the reusable case engine, now on `main`: a recursive authored condition vocabulary; `graph` and `timeline` as validated core collections; a pure deterministic event processor with monotone derived-state settlement; deduction/contradiction evaluation; conditioned objectives; lock/trigger evaluation; timeline reconstruction; gated graph projection with evidence-weighted confidence; lock-gated ending eligibility with the TRACE/SEVER location boundary; reachability/cycle/final-choice progression analysis (fail-closed when a manifest declares `progressionComplete`); evidence-board pins with save envelope v2 and a chained v0→v1→v2 migration; the spoiler-safe `projectCaseView` engine-to-UI surface; and a store-integrated `createCaseRuntime` bridge. Architecture decisions are recorded in `docs/decisions/0004-phase03-case-engine.md`. A synthetic mini-case (`tests/fixtures/mini-case.ts`) proves the engine end-to-end under strict progression validation.

## Completed milestones

- Phase 01 foundation: schemas, fail-closed case loading, engine primitives, player state, save envelope, and spoiler-safe public projection.
- Phase 02 phone OS: lock/home, Messages, Gallery, Calls, Mail, Browser, Notes, Files, Settings, deep links, metadata, zoom, audio transcripts, discovery persistence, accessibility, and responsive QA.
- Phase 02 PR: [#2](https://github.com/spring1199/CASE001/pull/2), merged as `1c2d8b75b632c855cde06052a517eeaa5a6757ee`.
- Continuity handoff PR: [#3](https://github.com/spring1199/CASE001/pull/3), merged as `bcee8e101e7950779c408176f33dac9c2e3e2b03`.
- Phase 03 case engine implemented as `79dbcc48ad23d5a36f47f47e918bdd9d7ffe75df`, including the docs/14 narrative gate tests automated against real Case #001 data.
- Phase 03 PR: [#4](https://github.com/spring1199/CASE001/pull/4), approved and merged as `e0af251e4e66b49dab8717792510d53d05faa89a`.

## Current task status

Phase 03 was explicitly approved by the user and merged into `main` via PR #4 on 2026-08-27, with the full local validation matrix re-run green immediately before the merge. This commit records the post-merge state transition. Phase 04 has not started: no Case #001 authored narrative content (chats, messages, emails, photos, audio, timeline events, clues, deductions, or dialogue) has been created, and none may be created until the dedicated Phase 04 Content Production Pack is provided and explicitly authorized.

## Validation and test results

Re-run in full on 2026-08-27 immediately before the PR #4 merge (branch HEAD `5f8d9cfac82b3056c3694fa1f886198f2b454f67`):

- Pack validation: 51 authored IDs passed, including the new `graph.json`/`timeline.json` scan and the SEVER-never-reveals-location assertion.
- Continuity validation: 4 files and 21 required state fields passed.
- Continuity unit tests: 8/8 passed.
- Lint and strict typecheck: passed with zero warnings.
- Project unit tests: 273/273 passed (85 new Phase 03 tests: conditions, engine events, progression analysis, spoiler projections, mini-case end-to-end, save migrations, and the docs/14 Case #001 gate tests).
- Playwright: 12/12 passed, including the browser-delivery spoiler scan.
- Production build: passed (generated `next-env.d.ts` rewrite restored, no intentional change).
- Security audit: 0 vulnerabilities (no dependency manifest changes this phase).

## Open tasks

- Wait for the dedicated Phase 04 Content Production Pack and explicit authorization before beginning Phase 04.
- Do not author any Case #001 narrative content until then.

## Known limitations

- Phone content is deliberately neutral placeholder content, not final Case #001 narrative content.
- Case #001 `graph.json` and `timeline.json` are validated core collections but intentionally empty until Phase 04 authors them; eight phone-content collections remain deferred-empty.
- Case #001 progression is intentionally incomplete: the 21 pinned progression-debt items (unreachable facts, undiscoverable evidence, uncompletable deductions, unopenable locks, unactivatable objectives, unfirable triggers, ineligible endings) remain deliberately unresolved for Phase 04 authoring. The exact debt is pinned by `tests/content/case-001-gates.test.ts` and must shrink to empty before the manifest may declare `progressionComplete: true`.
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

- Time/pacing trigger gates remain an unresolved Phase 04 authoring decision (docs/09 lists them; deferred for determinism, ADR 0004).
- The mechanical ending gate wiring (`gateLockId`, `revealsExactLocation` on Case #001 endings) was merged with Phase 03 approval but must be validated against the final Phase 04 authored progression before Case #001 declares `progressionComplete`.
- Whether Phase 04 wires the phone UI to the case runtime or a dedicated UI phase does; resolve from the Phase 04 execution plan and user direction.

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

Phase 04 — Case #001 Content is the next expected phase. Begin only after the user provides the dedicated Phase 04 Content Production Pack and explicit authorization, then read `docs/exec-plans/PHASE-04-CASE001-CONTENT.md`, the matching `tasks/` brief if present, that production pack, and every canonical document they reference.

## Exact continuation point

From `main` at `e0af251e4e66b49dab8717792510d53d05faa89a` with a clean worktree, wait for the dedicated Phase 04 Content Production Pack and explicit user authorization. When authorized, create a `codex/phase-04-case001-content` branch, read `docs/exec-plans/PHASE-04-CASE001-CONTENT.md`, the matching task brief if present, and the narrative read-order in `AGENTS.md`, then author Case #001 content in small reviewable batches that shrink the pinned 21-item progression debt in `tests/content/case-001-gates.test.ts`, running the spoiler-gate tests after each batch. Do not invent chats, messages, emails, photos, audio, timeline events, clues, deductions, or character dialogue before that pack arrives. Resolve the time/pacing gate decision and validate the ending gate wiring against the final authored progression during Phase 04.

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
- The active phase boundary: Phase 04 must not start without the dedicated Phase 04 Content Production Pack and explicit instruction.
