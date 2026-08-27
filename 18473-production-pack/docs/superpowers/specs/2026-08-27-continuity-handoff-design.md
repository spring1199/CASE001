# Continuity Handoff Design

## Purpose

Make repository state sufficient for a new Codex agent to continue 18473 safely without access to earlier chat history. The continuity layer records operational state and navigation rules; it does not replace narrative canon, phase plans, task files, or architecture documents.

## Documents

- `PROJECT_STATE.md` is the concise mutable snapshot: approved phase, active branch, approved commit, milestones, risks, reveal gates, deferred work, next task, and exact continuation point.
- `HANDOFF.md` is the durable workflow map: project purpose, source locations and precedence, phase discipline, spoiler handling, validation, and maintenance rules.
- `NEW_AGENT_PROMPT.md` is a short reusable prompt that directs a new agent into the repository-owned context.
- `AGENTS.md` makes the continuity read/update cycle mandatory for every future task.
- `CODEX_BOOTSTRAP_PROMPT.md` redirects from the obsolete Phase 01 bootstrap instructions to the universal continuity entrypoint.

## Validation

Add `scripts/validate_continuity.py` as a dependency-free, fail-closed validator. It checks that the four required root files exist, every required `PROJECT_STATE.md` section is present and non-empty, current phase and next task are declared, and source-of-truth references exist. Focused Python unit tests cover valid and invalid temporary repositories.

Expose:

- `npm run validate:continuity` for continuity checks;
- `npm run validate` for pack plus continuity validation.

Keep `validate:pack` unchanged so canon validation remains independently runnable.

## State semantics

`Latest approved commit hash` means the commit already approved and merged into `main`, not the unapproved HEAD of the continuity branch. `Current task implementation commit` records the commit containing the substantive task changes. A later state-only refresh commit cannot embed its own Git hash without changing that hash, so the exact final branch HEAD remains authoritative through `git rev-parse HEAD` and is reported at handoff.

## Scope boundaries

- Do not modify authored Case #001 content or runtime behavior.
- Do not start Phase 03.
- Do not copy full canon or secret story material into continuity files.
- Reference canonical documents and state reveal gates operationally.
- Update `PROJECT_STATE.md` on every completed task; update `HANDOFF.md` only when durable workflow or source locations change.
