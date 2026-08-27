# Phase 05 Audio, Visual, and Emotional Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a polished, accessible Case #001 investigation workspace, restrained audio system, deterministic emotional presentation, and responsive performance improvements without changing canon or Phase 04 progression.

**Architecture:** Extend the existing server-only Case #001 runtime route to return the generic `CaseView` and accept a strict engine-event allowlist. Keep audio preferences and acknowledged presentation beats in separate validated local persistence, then compose the current phone and new investigation workbench through reusable client components. Every story-sensitive value remains server-projected or authored data.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Zod, Zustand, Web Audio API, CSS Modules, Vitest, Playwright.

---

### Task 1: Runtime projection and action boundary

**Files:**
- Create: `src/game/schema/case-view.ts`
- Modify: `src/app/api/case-runtime/route.ts`
- Modify: `src/phone/case-runtime-client.ts`
- Test: `tests/content/case-runtime-route.test.ts`
- Test: `tests/phone/runtime.test.ts`

- [ ] **Step 1: Write failing route tests**

Add assertions that an unlock projection contains a parsed `view`, that a valid `attempt-deduction` event is processed through the engine, and that an unknown/hidden ID returns a non-oracular rejected outcome without exposing hidden records.

```ts
expect(payload.view.caseId).toBe('case_001');
expect(payload.view.evidence).toEqual([]);
expect(payload.outcomes).toContainEqual({
  type: 'event-rejected',
  reason: 'unrecognized-id',
  ids: ['not_visible'],
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/content/case-runtime-route.test.ts tests/phone/runtime.test.ts`

Expected: failure because the route has no `view` or `event` contract.

- [ ] **Step 3: Add the strict projection schema and event allowlist**

Define Zod schemas for the player-visible `CaseView` fields and the permitted event union. Update the route to process at most one event, settle state, and return `{ state, outcomes, content, gatedContentIds, view }`. Update the client to parse and expose the view and outcomes.

```ts
const runtimeEventSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('attempt-deduction'), deductionId: idSchema }),
  z.strictObject({ type: z.literal('place-timeline-event'), eventId: idSchema, positionId: idSchema }),
  z.strictObject({ type: z.literal('pin-evidence'), evidenceIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('unpin-evidence'), evidenceIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('confirm-graph-edges'), edgeIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('sever-graph-edges'), edgeIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('select-ending'), endingId: idSchema }),
]);
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- tests/content/case-runtime-route.test.ts tests/phone/runtime.test.ts`

Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```text
git add src/game/schema/case-view.ts src/app/api/case-runtime/route.ts src/phone/case-runtime-client.ts tests/content/case-runtime-route.test.ts tests/phone/runtime.test.ts
git commit -m "feat: project Phase 05 investigation runtime"
```

### Task 2: Audio preferences, mixer, and presentation director

**Files:**
- Create: `src/phone/polish/audio-preferences.ts`
- Create: `src/phone/polish/audio-director.ts`
- Create: `src/phone/polish/presentation.ts`
- Create: `src/phone/polish/presentation-storage.ts`
- Test: `tests/phone/audio-polish.test.ts`
- Test: `tests/phone/presentation.test.ts`

- [ ] **Step 1: Write failing pure behavior tests**

Cover validated preference defaults, corrupt-storage fallback, category gain multiplication, deterministic beat priority, reduced-motion durations, and presentation checkpoint round trips.

```ts
expect(computeCategoryGain({ master: 0.8, interface: 0.5 }, 'interface')).toBe(0.4);
expect(selectPresentationBeat([{ tags: ['hope3'] }, { tags: ['hope1'] }])).toBe('hope3');
expect(presentationDuration('major-reveal', true)).toBeLessThanOrEqual(150);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/phone/audio-polish.test.ts tests/phone/presentation.test.ts`

Expected: module-not-found failures.

- [ ] **Step 3: Implement versioned preferences and pure presentation rules**

Use Zod for the persisted preference envelope, clamp category gains to `[0, 1]`, and expose a storage adapter that never throws. Derive presentation beats from visible evidence tags and engine outcomes; never reference Case #001 fact IDs.

```ts
export type PresentationBeat =
  | 'ordinary' | 'hope1' | 'hope2' | 'f17' | 'winter47'
  | 'decoy' | 'hope3' | 'ending' | 'postcredit';
```

- [ ] **Step 4: Implement the lazy Web Audio director**

Create/resume the context only from a user gesture. Generate short, gain-limited oscillator/noise envelopes for interface, discovery, reveal, GRAPH, and ending cues. Start ambience only when enabled, suspend on document hide, duck during native audio playback, and make `dispose()` disconnect every node.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- tests/phone/audio-polish.test.ts tests/phone/presentation.test.ts`

Expected: all focused tests pass without a browser AudioContext.

- [ ] **Step 6: Commit**

```text
git add src/phone/polish tests/phone/audio-polish.test.ts tests/phone/presentation.test.ts
git commit -m "feat: add deterministic audio and presentation directors"
```

### Task 3: Investigation workbench

**Files:**
- Create: `src/phone/polish/InvestigationWorkspace.tsx`
- Create: `src/phone/polish/GraphView.tsx`
- Create: `src/phone/polish/TimelineView.tsx`
- Create: `src/phone/polish/EndingSequence.tsx`
- Modify: `src/phone/PhoneExperience.tsx`
- Modify: `src/phone/components/PhoneChrome.tsx`
- Test: `tests/phone/investigation-workspace.test.tsx`

- [ ] **Step 1: Write failing semantic component tests**

Render a synthetic projected case view and assert named Phone/Investigation tabs, evidence pin actions, deduction progress, native timeline controls, GRAPH confidence text, concrete TRACE/SEVER consequences, and post-credit ordering.

```ts
expect(markup).toContain('aria-label="Мөрдлөгийн ажлын талбар"');
expect(markup).toContain('data-graph-confidence="73"');
expect(markup).not.toMatch(/GOOD|BAD|САЙН|МУУ/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/phone/investigation-workspace.test.tsx`

Expected: module-not-found failure.

- [ ] **Step 3: Implement the accessible workbench components**

Use semantic sections and lists. Deduction buttons expose prerequisite progress. Timeline uses labeled `<select>` controls and explicit placement buttons. GRAPH exposes nodes and edges in DOM order, with confidence and confirmed/severed/unresolved text. Ending buttons display only authored labels and consequences.

- [ ] **Step 4: Wire runtime actions through `PhoneExperience`**

Maintain the latest `CaseView` in component state. Add a `dispatchCaseEvent` function that calls the runtime client, replays the state transition through Zustand, updates both projections, persists, and announces a generic outcome. Keep prior state on request failure.

- [ ] **Step 5: Run focused and existing phone tests**

Run: `npm test -- tests/phone/investigation-workspace.test.tsx tests/phone/phone-shell.test.tsx tests/phone/runtime.test.ts`

Expected: all pass.

- [ ] **Step 6: Commit**

```text
git add src/phone/polish src/phone/PhoneExperience.tsx src/phone/components/PhoneChrome.tsx tests/phone/investigation-workspace.test.tsx
git commit -m "feat: add the Case 001 investigation workbench"
```

### Task 4: Phone, gallery, long-thread, and transcript polish

**Files:**
- Modify: `src/phone/apps/PhoneAppView.tsx`
- Modify: `src/phone/apps/ArtifactDetail.tsx`
- Modify: `src/phone/components/AudioNote.tsx`
- Modify: `src/phone/components/VisualDialog.tsx`
- Modify: `src/phone/phone.module.css`
- Test: `tests/phone/phone-shell.test.tsx`
- Test: `tests/phone/phone-content.test.ts`

- [ ] **Step 1: Write failing rendering tests**

Assert gallery cards render lazy images with intrinsic dimensions and responsive sizes; scripted audio has no media request and an always-reachable transcript; ready audio keeps native controls; long threads render the newest bounded window and offer an accessible earlier-message control.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/phone/phone-shell.test.tsx tests/phone/phone-content.test.ts`

Expected: failures for thumbnails and progressive thread rendering.

- [ ] **Step 3: Implement minimal rendering changes**

Reuse `VisualMedia` for gallery thumbnails, add explicit `loading="lazy"` and `sizes`, and introduce a 60-message initial window that expands by 60 while preserving chronological DOM order. Style production status and transcript state without hiding text.

- [ ] **Step 4: Apply restrained visual polish**

Preserve existing tokens and Workbench/Halo stamp. Add only token-based surfaces, hierarchy, responsive workbench layouts, `content-visibility`, transform/opacity transitions, complete focus/disabled/loading/error/success states, and reduced-motion overrides.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- tests/phone/phone-shell.test.tsx tests/phone/phone-content.test.ts`

Expected: all pass.

- [ ] **Step 6: Commit**

```text
git add src/phone/apps src/phone/components src/phone/phone.module.css tests/phone/phone-shell.test.tsx tests/phone/phone-content.test.ts
git commit -m "feat: polish Phase 05 phone presentation"
```

### Task 5: Mixer controls and integrated presentation flow

**Files:**
- Create: `src/phone/polish/AudioSettings.tsx`
- Create: `src/phone/polish/PresentationLayer.tsx`
- Modify: `src/phone/PhoneExperience.tsx`
- Modify: `src/phone/components/AudioNote.tsx`
- Test: `tests/phone/audio-settings.test.tsx`
- Test: `tests/e2e/polish.spec.ts`

- [ ] **Step 1: Write failing component and browser tests**

Protect labeled mixer controls, preference persistence, no AudioContext before a user gesture, audio-disabled information parity, reveal-layer accessibility, reduced-motion timing, Phone/Investigation navigation, ending stage persistence, and NODE: 0 appearing only after the post-credit advance.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/phone/audio-settings.test.tsx && npx playwright test tests/e2e/polish.spec.ts`

Expected: failures because the controls and integrated flow do not exist.

- [ ] **Step 3: Implement mixer and presentation integration**

Open the mixer from a labeled header control, initialize sound from that user gesture, route UI actions to audio cues, and duck/release around real `<audio>` playback events. Render presentation beats in an `aria-live` layer with explicit continue/dismiss actions and persistent acknowledgement.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/phone/audio-settings.test.tsx && npx playwright test tests/e2e/polish.spec.ts`

Expected: all pass.

- [ ] **Step 5: Commit**

```text
git add src/phone/polish src/phone/PhoneExperience.tsx src/phone/components/AudioNote.tsx tests/phone/audio-settings.test.tsx tests/e2e/polish.spec.ts
git commit -m "feat: integrate Phase 05 audio and pacing"
```

### Task 6: Performance, accessibility, and spoiler regression

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`
- Modify: `tests/e2e/spoiler-delivery.spec.ts`
- Modify: `tests/content/case-001-progression.test.ts`
- Modify: implementation files only when a failing regression test requires it

- [ ] **Step 1: Add regression assertions before fixes**

Cover 320/375/414/768 workbench layouts, no horizontal overflow, minimum touch targets, visible focus, reduced motion, bounded long-thread DOM count, lazy gallery images, no initial authored/workbench leak, no gated filename leak, progression debt zero, and ending/location guarantees.

- [ ] **Step 2: Run targeted E2E and content tests**

Run: `npx playwright test tests/e2e/smoke.spec.ts tests/e2e/spoiler-delivery.spec.ts tests/e2e/polish.spec.ts && npm test -- tests/content/case-001-progression.test.ts tests/content/case-001-gates.test.ts`

Expected: any new failure identifies a concrete performance, accessibility, or spoiler regression.

- [ ] **Step 3: Fix only observed failures and rerun**

Keep every Phase 04 gate intact; do not weaken or replace existing assertions.

- [ ] **Step 4: Hallmark self-review**

Load `references/slop-test.md` and `references/contract.md`, run the atmospheric/restrained UI gates, verify the existing CSS stamp remains truthful, and revise any score below 3. Verify all colors/fonts remain token-based and motion uses only opacity/transform.

- [ ] **Step 5: Commit**

```text
git add tests src
git commit -m "test: protect Phase 05 presentation quality"
```

### Task 7: Full verification and continuity handoff

**Files:**
- Modify: `PROJECT_STATE.md`
- Modify: `HANDOFF.md` only if an architecture/workflow/source-of-truth boundary changed materially

- [ ] **Step 1: Run the repository validation matrix**

```text
npm run assets:case001
npm run validate:pack
npm run validate:continuity
npm run test:continuity
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=high
```

Also scan production client chunks and public assets for protected names, hidden record values, S3/S4 filenames, and Phase 06 implementation.

- [ ] **Step 2: Restore generated-only diffs**

If Next.js rewrites `next-env.d.ts` without an intentional source change, restore its tracked content with `apply_patch` and refresh the index.

- [ ] **Step 3: Update `PROJECT_STATE.md`**

Record the stacked base, Phase 05 branch, implementation commit, audio/voice/visual/performance/accessibility results, full validation, limitations, human-playtest pending status, Phase 04-first retarget/rebase requirement, Phase 06 unstarted status, and exact continuation point.

- [ ] **Step 4: Validate continuity and commit state**

Run: `npm run validate:continuity && git diff --check`

```text
git add PROJECT_STATE.md HANDOFF.md
git commit -m "docs: record Phase 05 completion state"
```

- [ ] **Step 5: Verify the stack and push**

```text
git status --short
git merge-base --is-ancestor 455c79882f61ca06ed14d1d2ffe31688e2aca772 HEAD
git diff --name-only 455c79882f61ca06ed14d1d2ffe31688e2aca772...HEAD
git push -u origin codex/phase-05-polish
```

Do not merge, rebase, or begin Phase 06.
