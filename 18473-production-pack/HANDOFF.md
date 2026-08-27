# 18473 Handoff Guide

## What this project is

18473 is a 2–3 hour, Mongolian-language psychological digital-detective thriller set in fictional modern Arvantai. The product goal is a grounded investigation experience in which the player examines a missing person's phone, connects evidence, tests deductions, and reaches an earned consequence without supernatural or cyberpunk shortcuts.

This file is a navigation and workflow guide. It does not replace canon or technical specifications.

## Source map and precedence

Use this order when starting work:

1. The user's explicit current task and phase boundary.
2. `AGENTS.md` for mandatory process, safety, and reading rules.
3. `PROJECT_STATE.md` for the latest approved operational state and exact continuation point.
4. The current file in `docs/exec-plans/` and its matching file in `tasks/`.
5. Relevant authoritative documents under `docs/`.
6. `docs/decisions/` for accepted architecture decisions.
7. This `HANDOFF.md` as a map only.

If an operational summary conflicts with canonical `docs/`, the canonical document wins. If Git state conflicts with `PROJECT_STATE.md` or the phase/task documents, stop and report the conflict instead of guessing.

## Where authority lives

- Narrative canon: `docs/01-MASTER-STORY-BIBLE.md`, character/timeline/evidence documents in `docs/`, and the content authoring guide.
- Product and game-design rules: `docs/00-PROJECT-VISION.md` and `docs/07-GAME-DESIGN.md`.
- UI and audiovisual direction: `docs/10-UI-UX.md` and `docs/11-AUDIO-VISUAL-DIRECTION.md`.
- Engine and technical architecture: `docs/09-CASE-ENGINE.md`, `docs/12-TECH-ARCHITECTURE.md`, and `docs/13-DATA-SCHEMA.md`.
- Testing and reveal gates: `docs/14-TESTING-ACCEPTANCE.md`.
- Phase scope: `docs/exec-plans/PHASE-XX-*.md`.
- Current task instructions: `tasks/XX-*.md`.

Read only the canonical documents relevant to the requested task. Do not copy their full content into continuity files.

## How phases and tasks work

Each phase has one execution plan and one matching task brief. A request must explicitly authorize the phase before implementation begins. Complete only that phase, validate it, update `PROJECT_STATE.md`, and stop for approval. Never infer authorization for the next phase from successful completion of the current one.

## Spoiler and reveal discipline

Gated identities, relationships, survival/status truths, final-location information, and ending consequences must remain behind their authored facts/reveals. The precise gates live in canonical documents and `docs/14-TESTING-ACCEPTANCE.md`.

Reusable engine and UI code must not contain Case #001 answers. Debug labels, fixtures, tests, server projections, and client bundles are all potential leak paths. Use neutral synthetic data until the designated content phase, and preserve browser-delivery spoiler tests.

## Data-driven Case #001 boundary

Authored records live under `content/cases/`. Zod schemas and fail-closed loaders validate them. Pure engine modules consume typed records; UI receives player-visible projections. Reusable phone and engine code must not import canon merely to simplify rendering. Later authored collections remain empty until their scheduled phases.

## Safe inspection sequence

Before changing anything:

```text
git status --short --branch
git log -5 --oneline --decorate
git branch --show-current
git rev-parse HEAD
```

Then read `AGENTS.md`, `PROJECT_STATE.md`, this file, the current phase execution plan, its task file, and only the relevant source documents. Compare the Git state with the approved commit and exact continuation point recorded in `PROJECT_STATE.md`.

## Continuing from the approved state

1. Resolve the latest approved `main` commit from `PROJECT_STATE.md` and Git.
2. Preserve or create the requested `codex/` branch.
3. Confirm the phase boundary before implementation.
4. Use tests first for behavior or validation changes.
5. Keep canon changes separate and explicit.
6. Run the mandatory validation matrix.
7. Update `PROJECT_STATE.md` with completed work, branch, approved/base commit, final task implementation commit, results, limitations, risks, decisions, deferred work, next task, and exact continuation point. If a state-only commit follows, report that final branch HEAD separately because a commit cannot contain its own hash.
8. Commit with a clean worktree and stop at the authorized boundary.

## Mandatory validation

Run as applicable before completion:

```text
npm run validate:pack
npm run validate:continuity
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Run `npm audit` when dependency manifests change. Fix failures; do not silently skip them. Restore generated-only changes such as `next-env.d.ts` when they are not intentional.

## Maintaining continuity

`PROJECT_STATE.md` must be updated before every task or phase is declared complete. It is the mutable operational snapshot.

Update `HANDOFF.md` only when architecture boundaries, workflow, source-of-truth locations/precedence, validation policy, or continuation rules materially change. Ordinary feature completion belongs only in `PROJECT_STATE.md` and the relevant phase documentation.

Run `npm run validate:continuity` after either continuity file changes. A task is not complete until a zero-history agent could follow the recorded continuation point without relying on chat context.
