# Phase 04 Case #001 Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete data-driven Case #001, all required generated visuals, spoiler-safe delivery, and zero progression debt without starting Phase 05.

**Architecture:** Promote Phase 04 artifact collections into strict authored schemas, assemble them into the reusable Phone OS, and drive discovery through the Phase 03 case runtime. Serve reveal-sensitive binary assets through fact-gated server delivery while keeping public projections opaque.

**Tech Stack:** Next.js 16.3.3, React 19.2, strict TypeScript, Zod, Zustand, Vitest, Playwright, built-in image generation, Pillow/ImageMagick-compatible optimization tooling.

---

### Task 1: Promote Phase 04 authored collection schemas

**Files:**
- Modify: `src/game/schema/case.ts`
- Modify: `src/game/content/case-loader.ts`
- Test: `tests/content/case-loader.test.ts`

- [ ] Add failing tests proving non-empty artifact, browser, call, email, location, message, note, and photo collections validate strictly and reject duplicate IDs, broken artifact references, broken evidence references, and invalid reveal gates.
- [ ] Run `npm test -- tests/content/case-loader.test.ts` and confirm the new cases fail because deferred collections reject records.
- [ ] Add focused Zod record schemas and typed collection fields; promote all eight collection keys from deferred-empty to indexed Phase 04 sources.
- [ ] Add cross-collection reference validation for evidence `sourceArtifactId`, `artifactViewed`, discovery effects, reveal facts, and asset IDs.
- [ ] Re-run the focused tests and `npm run typecheck`.
- [ ] Commit as `feat: add Phase 04 authored collection schemas`.

### Task 2: Integrate structured phone content

**Files:**
- Create: `src/phone/data/case-001.ts`
- Modify: `src/phone/PhoneExperience.tsx`
- Modify: `src/phone/runtime.ts`
- Modify: `content/cases/case-001/{artifacts,browser,calls,emails,locations,messages,notes,photos}.json`
- Test: `tests/phone/case-001-content.test.ts`
- Test: `tests/phone/phone-shell.test.tsx`

- [ ] Write failing tests for required app presence, 30–40 message threads, the complete INC-18473 spine, mail/browser/notes/files/calls/gallery records, Mongolian labels, deep links, transcripts, and idempotent discovery.
- [ ] Confirm the focused tests fail against the neutral seed and empty authored collections.
- [ ] Convert the approved authored source into structured records, adding only approved harmless filler.
- [ ] Assemble the case records into `PhoneContentIndex` and replace neutral content in the production experience.
- [ ] Route item discovery through `createCaseRuntime` so evidence and unlocks settle deterministically and persist.
- [ ] Re-run phone/content tests, the docs/14 gate suite, lint, and typecheck.
- [ ] Commit as `feat: integrate Case 001 phone content`.

### Task 3: Author complete investigation progression

**Files:**
- Modify: `content/cases/case-001/{case,characters,evidence,facts,deductions,objectives,locks,triggers,endings,graph,timeline}.json`
- Modify: `tests/content/case-001-gates.test.ts`
- Create: `tests/content/case-001-progression.test.ts`

- [ ] Replace the pinned-debt expectation with failing zero-debt, full-reachability, multi-order, repeat-event, cycle, and soft-lock tests.
- [ ] Add failing narrative tests for F17 4-of-7 fair play, separate Winter 47 attribution, suspect truth payoffs, Hope #1 ambiguity, Hope #2/Bilguun recontextualization, Hope #3 truth, confidence checkpoints, and final eligibility.
- [ ] Add failing replay/save-load tests around the archive, both reveals, Hope #3, and final choice.
- [ ] Author the approved facts, evidence, 17 deductions/contradictions, 12 objectives, condition-based locks/triggers, final-night timeline, GRAPH nodes/edges/weights, TRACE/SEVER effects, and ending-gated NODE: 0.
- [ ] Set `progressionComplete: true` only after `analyzeCaseProgression` returns no issues.
- [ ] Run the focused progression/gate/engine/persistence suites until green.
- [ ] Commit as `feat: complete Case 001 progression`.

### Task 4: Add spoiler-safe asset registry and delivery

**Files:**
- Create: `content/cases/case-001/assets.json`
- Create: `src/game/assets/case-assets.ts`
- Create: `src/app/api/case-assets/[assetId]/route.ts`
- Modify: `src/phone/components/VisualDialog.tsx`
- Modify: `src/phone/apps/ArtifactDetail.tsx`
- Test: `tests/content/case-assets.test.ts`
- Test: `tests/e2e/spoiler-delivery.spec.ts`

- [ ] Write failing tests proving opaque IDs map to reveal facts, S3/S4 filenames never occur in public projections/bundles, locked and nonexistent IDs return the same response, and SEVER never requests exact-location imagery.
- [ ] Implement the strict asset registry and server-only resolver.
- [ ] Add a gated route that validates saved player facts before returning S3/S4 binaries and emits a uniform rejection otherwise.
- [ ] Render accessible neutral inspect text from structured content; fetch binary URLs only after eligibility.
- [ ] Re-run focused unit/E2E leakage tests and the protected-name scan.
- [ ] Commit as `feat: gate Case 001 visual delivery`.

### Task 5: Generate and integrate visual assets

**Files:**
- Create: `assets/case-001/source-masters/**`
- Create: `public/assets/case-001/runtime/**` for S0–S2
- Create: `private-assets/case-001/runtime/**` for S3–S4
- Create: `content/cases/case-001/generation-ledger.json`
- Modify: `content/cases/case-001/photos.json`

- [ ] Generate and visually inspect nine character anchors from canon and supplied identity seeds; reject wrong ages, role drift, or villain/martyr/femme-fatale coding.
- [ ] Generate the remaining 70 `GENERATE` source masters in manifest batch order with approved anchors as references where characters recur.
- [ ] Inspect every output for clue emphasis, malformed anatomy, logos, generated clue text, spoiler drift, weather/date mismatch, and identity inconsistency; regenerate failures.
- [ ] Derive `TEN-CONTACT-001` and `F17-IMG-001` only from their approved masters.
- [ ] Produce optimized runtime derivatives, strip EXIF, compute dimensions and SHA-256, and update the ledger for all 85 assets (79 generated, 2 derived, 4 UI DATA).
- [ ] Integrate all photo records by opaque asset ID and verify S3/S4 files are absent from public output.
- [ ] Commit as `assets: add Case 001 visual production`.

### Task 6: Complete hostile QA and continuity

**Files:**
- Modify: `PROJECT_STATE.md`
- Modify only if required by changed workflow: `HANDOFF.md`
- Modify/add QA scripts and tests only where the acceptance matrix lacks an executable check.

- [ ] Run `npm run validate:pack` and `npm run validate:continuity`.
- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test`.
- [ ] Run `npm run test:e2e` and `npm run build`.
- [ ] Run protected-name, spoiler, asset-leak, progression, cycle, unreachable-state, and no-Phase-05 scans.
- [ ] Run `npm audit` only if dependency manifests changed.
- [ ] Fix every failure without weakening requirements, then repeat the complete matrix.
- [ ] Update `PROJECT_STATE.md` with counts, debt 21→0, validation evidence, generated/derived/UI asset counts, limitations/risks, branch, implementation commit, and exact next continuation point.
- [ ] Commit implementation/state, verify the worktree is clean, and stop without merging.

