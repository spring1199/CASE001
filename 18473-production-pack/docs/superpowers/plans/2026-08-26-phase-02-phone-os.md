# Phase 02 Phone OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, mobile-first fake smartphone OS and all Phase 02 application shells using neutral seed data, while preserving Phase 01 validation and spoiler boundaries.

**Architecture:** Keep authored Case #001 collections deferred. A strict phone-content schema validates a neutral UI fixture and builds an index for app/item lookup and deep links. A client-side phone experience consumes that data and bridges only discovery effects into the existing Phase 01 player store; reusable views never import canonical case records.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Zod, Zustand vanilla store, CSS Modules/tokens, Vitest, Playwright.

---

### Task 1: Typed phone content, navigation, and discovery

**Files:**
- Create: `src/phone/data/schema.ts`
- Create: `src/phone/data/neutral-seed.ts`
- Create: `src/phone/navigation.ts`
- Create: `src/phone/discovery.ts`
- Create: `tests/phone/phone-content.test.ts`
- Create: `tests/phone/navigation.test.ts`
- Create: `tests/phone/discovery.test.ts`

- [ ] **Step 1: Write failing schema and index tests**

Cover the required app IDs (`messages`, `gallery`, `calls`, `mail`, `browser`, `notes`, `files`, `settings`), reject duplicate app/item IDs and broken deep links, require accessible metadata/audio transcript fields, and assert that `graph` is absent.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm test -- tests/phone/phone-content.test.ts`

Expected: FAIL because the phone schema and seed modules do not exist.

- [ ] **Step 3: Implement the strict phone data boundary**

Define a discriminated, Zod-validated model with app descriptors, generic browsable items, optional message records, visual descriptions, audio/transcript data, metadata rows, deep-link targets, and discovery effects. Export an immutable lookup index and a neutral Mongolian seed fixture that contains no Case #001 narrative or internal canon identifiers.

- [ ] **Step 4: Write failing navigation and discovery tests**

Verify lock → home → app/item history, back/home behavior, locked-app refusal, deep-link resolution, stable de-duplication of discovery IDs, and exact mapping to `discoverArtifacts`, `discoverEvidence`, `unlockApps`, and `unlockContent` actions.

- [ ] **Step 5: Implement pure navigation and discovery helpers**

Keep these modules React-free. Navigation state contains a history stack and current route; discovery returns declarative effects and applies them through the narrow `Pick<PlayerStoreActions, ...>` boundary.

- [ ] **Step 6: Run all Task 1 tests and confirm GREEN**

Run: `npm test -- tests/phone/phone-content.test.ts tests/phone/navigation.test.ts tests/phone/discovery.test.ts`

Expected: all focused tests pass.

- [ ] **Step 7: Commit Task 1**

Run: `git add src/phone/data src/phone/navigation.ts src/phone/discovery.ts tests/phone && git commit -m "feat: add data-driven phone domain"`

### Task 2: Player-store bridge and reusable phone shell

**Files:**
- Create: `src/phone/PhoneExperience.tsx`
- Create: `src/phone/components/PhoneChrome.tsx`
- Create: `src/phone/components/AppIcon.tsx`
- Create: `src/phone/components/MetadataDialog.tsx`
- Create: `src/phone/components/AudioNote.tsx`
- Create: `src/phone/apps/PhoneAppView.tsx`
- Create: `src/phone/apps/ArtifactDetail.tsx`
- Modify: `src/components/PhoneShell.tsx`
- Modify: `src/game/content/public-case-summary.ts`
- Modify: `src/app/page.tsx`
- Create: `tests/phone/phone-shell.test.tsx`
- Modify: `tests/content/public-case-summary.test.tsx`

- [ ] **Step 1: Write failing server-markup tests**

Assert that the initial lock surface has a named region and unlock control, the public summary stays synthetic/data-driven, no future-phase labels render, and the app launcher is not exposed before unlock.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/phone/phone-shell.test.tsx tests/content/public-case-summary.test.tsx`

Expected: FAIL against the Phase 01 placeholder shell.

- [ ] **Step 3: Implement the phone runtime boundary**

Create one client boundary that owns phone navigation, instantiates the existing vanilla player store with `LocalStoragePersistenceAdapter`, hydrates it, applies initial neutral app unlocks, and saves discovery progress. Do not import raw case content into any client module.

- [ ] **Step 4: Implement lock, home, app chrome, and shared artifact detail**

Use semantic buttons/landmarks, an announced status area, 44 px targets, focus restoration on route changes, Escape/Alt+Left back behavior, Home navigation, native `<dialog>` metadata inspection, native `<audio controls>` and an always-available transcript disclosure.

- [ ] **Step 5: Implement all required app shells through data**

Render Messages, Gallery, Calls, Mail, Browser, Notes, Files, and Settings/System info from the validated index. Preserve application-specific browsing shapes while reusing list/detail primitives. Files begins locked and is unlocked by a neutral discovery; GRAPH is not present.

- [ ] **Step 6: Run Task 2 tests and confirm GREEN**

Run: `npm test -- tests/phone tests/content/public-case-summary.test.tsx`

Expected: all phone and public-summary tests pass.

- [ ] **Step 7: Commit Task 2**

Run: `git add src/phone src/components/PhoneShell.tsx src/game/content/public-case-summary.ts src/app/page.tsx tests/phone tests/content/public-case-summary.test.tsx && git commit -m "feat: build reusable phone application shells"`

### Task 3: Production styling, responsive behavior, and E2E flow

**Files:**
- Create: `tokens.css`
- Create: `src/phone/phone.module.css`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `tests/e2e/smoke.spec.ts`
- Create: `.hallmark/preflight.json`
- Create: `.hallmark/log.json`
- Create: `docs/decisions/0003-neutral-phone-demo-content.md`

- [ ] **Step 1: Write failing Playwright scenarios**

Keep the existing browser-delivery spoiler scan. Add lock/unlock, app navigation, browser search, neutral deep-link traversal, metadata dialog keyboard close, audio transcript visibility, neutral discovery persistence, and locked-files-to-unlocked-files behavior.

- [ ] **Step 2: Run the focused E2E test and confirm RED**

Run: `npm run test:e2e`

Expected: the new Phase 02 interaction assertions fail before the styled runtime is wired.

- [ ] **Step 3: Implement tokenized, scoped styling**

Use an OKLCH cold-neutral palette, one restrained amber accent, Cyrillic-capable Onest plus IBM Plex Mono through `next/font`, a 4 pt spacing scale, `dvh`, `viewport-fit=cover`, safe-area insets, `overflow-x: clip`, tabular numbers, reduced-motion handling, and scoped CSS Modules. Verify 320, 375, 414, and 768 px widths without horizontal overflow or wrapped action labels.

- [ ] **Step 4: Record the architecture decision**

Document why neutral Phase 02 fixture data lives under `src/phone/data`, why deferred authored collections stay empty, and how later phases can replace the fixture through the same validated interface.

- [ ] **Step 5: Run E2E and visual/accessibility checks**

Run: `npm run test:e2e`

Expected: all scenarios pass. Inspect the four required widths, keyboard navigation, focus visibility, safe areas, and reduced motion.

- [ ] **Step 6: Commit Task 3**

Run: `git add tokens.css src/app src/phone/phone.module.css tests/e2e .hallmark docs/decisions/0003-neutral-phone-demo-content.md && git commit -m "feat: polish Phase 02 phone experience"`

### Task 4: Phase acceptance and final verification

**Files:**
- Modify only files required to fix verification failures.

- [ ] **Step 1: Run repository validation**

Run, in order:

```powershell
npm run validate:pack
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit
git diff --check
```

Expected: every command exits 0; the audit reports 0 vulnerabilities.

- [ ] **Step 2: Confirm deferred collections and spoiler boundary**

Confirm the nine deferred JSON collections remain empty, GRAPH is absent from the launcher, no raw canon record is imported by `src/phone`, and the browser-delivery leak scan passes.

- [ ] **Step 3: Run spec and quality reviews**

Review every Phase 02 acceptance item against the implementation, then review maintainability, accessibility, responsive behavior, and architecture boundaries. Fix and re-run affected validation for every finding.

- [ ] **Step 4: Create the final Phase 02 commit if fixes were required**

Run: `git add <reviewed-files> && git commit -m "fix: complete Phase 02 acceptance"`

- [ ] **Step 5: Confirm clean, unmerged handoff**

Run: `git status --short --branch && git rev-parse HEAD`

Expected: branch `codex/phase-02-phone-os`, clean worktree, no Phase 02 merge.
