# 18473 Handoff Guide

## What this project is

18473 is a 2–3 hour, Mongolian-language psychological digital-detective thriller set in fictional modern Arvantai. The product goal is a grounded investigation experience in which the player examines a missing person's phone, connects evidence, tests deductions, and reaches an earned consequence without supernatural or cyberpunk shortcuts.

This file is a navigation and workflow guide. It does not replace canon or technical specifications.

## Source map and precedence

Authority is separated by purpose:

1. The user's explicit current instruction authorizes task scope and the phase boundary. Only explicit user approval may authorize a canon change.
2. `AGENTS.md` defines mandatory process, safety, and reading rules.
3. `PROJECT_STATE.md` records the latest approved operational state and exact continuation point.
4. Relevant canonical domain documents under `docs/` govern narrative facts, product rules, architecture, and acceptance criteria.
5. The current file in `docs/exec-plans/` and its matching file in `tasks/` define implementation scope for an authorized phase; recorded plans/specifications define non-phase operational work.
6. `docs/decisions/` records accepted architecture decisions.
7. This `HANDOFF.md` is a map only.

Phase plans, task briefs, state files, and handoff files cannot override canonical domain documents. If any of them conflict with canon, product rules, Git state, or each other, stop and report the conflict unless the user explicitly authorized that exact change. Do not guess which stale instruction to follow.

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

For implemented Case #001 delivery, authored phone data and engine settlement remain server-only behind `/api/case-runtime`; the client requests a validated projection only after device unlock. S3/S4 binaries remain outside `public/` and resolve through the opaque, fact/ending-gated `/api/case-assets/[assetId]` route with uniform locked/missing responses. See `docs/decisions/0005-phase04-server-projections.md`.

Phase 05 extends that same boundary without moving canon client-side: `/api/case-runtime` accepts only the strict player-action allowlist and returns player-visible phone plus `CaseView` projections. Client presentation derives from already-visible evidence, deductions, GRAPH state, and narrow ending-gated roles. Narrative progression stays in the player save; audio preferences and the strict versioned presentation FIFO are separate local checkpoints. The FIFO stores only immutable already-projected visible records so reload cannot reveal hidden authoring data or collapse historical GRAPH beats.

## Safe inspection sequence

Before changing anything:

```text
git status --short --branch
git log -5 --oneline --decorate
git branch --show-current
git rev-parse HEAD
```

Then read `AGENTS.md`, `PROJECT_STATE.md`, this file, and the task sources named by the exact continuation point. For phase work, those sources must include the phase execution plan and matching task brief. For non-phase operational work, use the recorded plan/specification; do not invent a matching phase task file. Read only the relevant canonical documents. Compare Git state with the approved commit and exact continuation point recorded in `PROJECT_STATE.md`.

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
