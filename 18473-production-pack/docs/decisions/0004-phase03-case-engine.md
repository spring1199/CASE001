# ADR 0004: Phase 03 case engine

## Status

Accepted for Phase 03.

## Context

Phases 01/02 delivered fail-closed content loading, engine primitives, a
persisted player store, and the neutral phone OS. Phase 03 needs the reusable
investigation engine — evidence, deductions, contradictions, objectives,
locks, triggers, timeline reconstruction, GRAPH, reveal gates, and ending
evaluation — while Case #001 stays data-driven and its final content remains
unwritten until Phase 04.

## Decisions

### Conditions are one recursive authored vocabulary

`Condition` now covers the docs/09 trigger sources: single/all facts,
single/all evidence, N-of-M evidence thresholds, deduction completion,
objective completion, content viewed (`artifactViewed`), graph-confidence
thresholds, ending selection, and `allOf`/`anyOf` composites. Locks,
triggers, and objective `activateWhen`/`completeWhen` share it, so every gate
is validated, evaluated, and analyzed by one code path. Time/pacing gates are
deferred: they break the pure determinism contract and need a design decision
about the time source first.

### The engine is a pure deterministic event processor

`processEngineEvent(bundle, state, event)` and `settleEngineState` are pure
functions over `PlayerState`. Derived consequences (facts from evidence and
correct timeline placements, objective transitions, trigger unlocks) are
recomputed to a monotone fixed point, which makes repeated events idempotent
and progression independent of discovery order. Events referencing unknown
IDs are rejected without partial application; gated evidence rejects under
the same `unknown-id` reason so rejections cannot become an oracle for hidden
records. Wrong deduction attempts return count-only progress, never missing
evidence IDs.

### `graph` and `timeline` become core authored collections

Both were Phase 03 deliverables, so their deferred-empty boundary is replaced
with real schemas: discriminated unions of node/edge and position/event
records, fully reference-validated and core-indexed. Graph nodes carry a
neutral `publicLabel` plus an optional `canonicalCharacterId` +
`identityRevealFact` pair, mirroring the Phase 01 character aliasing rule.
Edge confidence derives only from discovered evidence via authored weights.
Case #001 authors both files as empty arrays until Phase 04; the engine is
proved by a synthetic mini-case fixture instead (ADR 0003 discipline).

### Ending eligibility is gated through authored locks

An ending references its gate with `gateLockId` and fails closed: no gate, no
eligibility. `revealsExactLocation` and optional `onSelect` edge effects
encode the documented TRACE/SEVER consequences mechanically. Case #001's
endings now point at the already-authored `lock_final_choice`; this wires
existing canon, it does not change it. The first selected ending is final.

### Reachability protection is staged by `progressionComplete`

`analyzeCaseProgression` computes everything a completionist player can reach
and reports unreachable facts, undiscoverable evidence, uncompletable
deductions, unopenable locks, dead objectives, unfirable triggers,
unplaceable timeline events, ineligible endings, and dependency cycles.
Endings must be reachable before any ending is selected, which structurally
forbids required content behind the TRACE/SEVER choice. A manifest that
declares `progressionComplete: true` (the mini-case, and Case #001 once
Phase 04 finishes) fails the load on any issue; in-production cases keep the
report advisory, and a gate test pins Case #001's current issue list to the
exact documented Phase 04 authoring debt so regressions fail immediately.

### Evidence board pins are first-class state (save v2)

`pinnedEvidenceIds` joins `PlayerState`; the save envelope moves to version 2
through a chained migration path (legacy v0 → v1 → v2), exercising the
docs-required migration system. Pins require discovery, both in the engine
and in the state schema.

### UI consumes one spoiler-safe projection

`projectCaseView` is the only intended engine-to-UI surface: visible
characters (alias linkage only after its reveal fact), non-locked objectives,
discovered-and-visible evidence, completed plus prerequisite-satisfied
deductions (locked ones are absent entirely), timeline state, the gated graph
view, open lock IDs, unlock targets, eligible-only final-choice options, and
the selected ending outcome. Contradictions are deductions with
`kind: 'contradiction'` — same mechanics, distinct presentation. The
`createCaseRuntime` bridge replays pure engine transitions through the
existing store actions so persistence semantics stay untouched.

## Consequences

- Reusable engine modules contain no Case #001 names or story branches; the
  authored JSON stays the single narrative source.
- The synthetic mini-case (`tests/fixtures/mini-case.ts`) is the engine's
  acceptance vehicle and runs under strict progression validation.
- Phase 04 must author `graph.json`/`timeline.json` content, grant
  `fact_18473_archive_open`, wire objective conditions, and only then set
  `progressionComplete: true` on Case #001 — shrinking the pinned debt list
  to empty as it goes.
- `artifactViewed` and trigger/deduction unlock targets stay referentially
  unchecked until the artifact collection gains its schema (ADR 0001).
