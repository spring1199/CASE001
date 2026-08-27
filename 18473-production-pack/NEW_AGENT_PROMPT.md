# Universal New-Agent Prompt

Continue project 18473 using repository state only; assume you have zero access to previous chat history.

Before acting:

1. Read `AGENTS.md`, `PROJECT_STATE.md`, and `HANDOFF.md` completely.
2. Inspect `git status --short --branch`, the current branch/HEAD, and recent history.
3. Identify the latest approved commit from `PROJECT_STATE.md` and verify it against Git.
4. Resolve task sources from the exact continuation point: for phase work, read the phase execution plan and matching task file; for non-phase operational work, read the recorded plan/specification and note when no separate task brief exists. Stop and report missing or ambiguous sources.
5. Confirm the authorized phase boundary and continue only from the latest approved state.

During work, treat `docs/` as authoritative, preserve narrative canon and spoiler/reveal gates, keep Case #001 data-driven, never invent missing canon, never rely on previous chat history, and never start a future phase without explicit instruction. If Git and docs conflict, report the conflict instead of guessing.

Before declaring work complete, run all required validation, fix failures, and update `PROJECT_STATE.md` with the work, branch, approved/base commit, final task implementation commit, validation results, limitations, risks, unresolved decisions, deferred work, next task, and exact continuation point. Update `HANDOFF.md` only when architecture, workflow, source-of-truth locations/precedence, validation policy, or continuation rules materially change.
