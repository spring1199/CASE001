# Continuity Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 18473 handoff-safe for a new agent with no prior chat history.

**Architecture:** Root continuity documents point to authoritative project sources while a standalone Python validator enforces their presence and required state fields. Package scripts expose continuity-only and combined validation without coupling operational state to canon validation.

**Tech Stack:** Markdown, Python standard library, npm scripts, Vitest/Playwright project validation.

---

### Task 1: Add continuity validator with TDD

**Files:**
- Create: `tests/scripts/test_validate_continuity.py`
- Create: `scripts/validate_continuity.py`
- Modify: `package.json`

- [ ] **Step 1: Write failing validator tests**

Cover a complete temporary repository plus missing files, missing/empty required fields, absent phase/next-task declarations, and absent source-of-truth references.

- [ ] **Step 2: Verify RED**

Run: `python -m unittest tests/scripts/test_validate_continuity.py`

Expected: fail because `scripts/validate_continuity.py` does not exist.

- [ ] **Step 3: Implement minimal validator**

Export `validate_continuity(root: Path) -> list[str]` and a CLI that prints all errors and exits non-zero, or prints `CONTINUITY VALIDATION OK`.

- [ ] **Step 4: Verify GREEN**

Run: `python -m unittest tests/scripts/test_validate_continuity.py`

Expected: all focused tests pass.

- [ ] **Step 5: Add npm workflow scripts**

Add `validate:continuity`, `test:continuity`, and composite `validate` scripts without changing dependency manifests.

### Task 2: Create root continuity documents

**Files:**
- Create: `PROJECT_STATE.md`
- Create: `HANDOFF.md`
- Create: `NEW_AGENT_PROMPT.md`

- [ ] **Step 1: Write the approved operational state**

Record Phase 02 merged at `1c2d8b75b632c855cde06052a517eeaa5a6757ee`, continuity work on `codex/continuity-handoff`, Phase 03 not started, open review/merge work, risks, gates, deferred work, sources, and the exact continuation point.

- [ ] **Step 2: Write durable handoff rules**

Explain project purpose, source precedence, phase/task workflow, data-driven content boundary, validation, and maintenance triggers using references instead of copied canon.

- [ ] **Step 3: Write universal prompt**

Keep it short and explicitly require reading continuity files, inspecting Git, resolving the approved commit, respecting phase/reveal boundaries, validating, and updating state.

- [ ] **Step 4: Run live continuity validation**

Run: `npm run validate:continuity`

Expected: `CONTINUITY VALIDATION OK`.

### Task 3: Integrate mandatory rules

**Files:**
- Modify: `AGENTS.md`
- Modify: `CODEX_BOOTSTRAP_PROMPT.md`

- [ ] **Step 1: Add continuity lifecycle rules to AGENTS.md**

Add explicit start, during-task, and completion gates from the approved brief. State that a task or phase is not complete until `PROJECT_STATE.md` is current.

- [ ] **Step 2: Replace stale bootstrap routing**

Turn `CODEX_BOOTSTRAP_PROMPT.md` into a short redirect to `NEW_AGENT_PROMPT.md` and the repository continuity order so it cannot restart Phase 01.

- [ ] **Step 3: Re-run continuity validation**

Run: `npm run validate`

Expected: pack validation and continuity validation both pass.

### Task 4: Final verification and state refresh

**Files:**
- Modify: `PROJECT_STATE.md` only if final evidence changes its operational state.

- [ ] **Step 1: Run required validation**

Run pack validation, continuity validation, lint, typecheck, all unit tests, Playwright, and production build. Run `npm audit` only if dependencies changed.

- [ ] **Step 2: Verify narrative and phase boundaries**

Confirm authored Case #001 files and dependency manifests are unchanged from `main`, Phase 03 files were not implemented, and the worktree contains only continuity infrastructure changes.

- [ ] **Step 3: Commit and verify clean state**

Commit on `codex/continuity-handoff`, restore generated `next-env.d.ts` if the production build rewrites it, and verify `git status --short` is empty.
