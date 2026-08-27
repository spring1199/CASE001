import { describe, expect, it } from 'vitest';
import {
  createInitialCaseState,
  processEngineEvent,
  settleEngineState,
  type CaseEngineEvent,
} from '../../src/game/engine/engine';
import type { PlayerState } from '../../src/game/state/types';
import { loadMiniCase } from '../fixtures/mini-case';

const T0 = '2026-08-27T00:00:00.000Z';
const bundle = loadMiniCase();

function run(state: PlayerState, events: CaseEngineEvent[]): PlayerState {
  return events.reduce(
    (current, event) => processEngineEvent(bundle, current, event).state,
    state,
  );
}

function progressSnapshot(state: PlayerState) {
  return {
    evidence: [...state.discoveredEvidenceIds].sort(),
    facts: [...state.knownFactIds].sort(),
    deductions: [...state.completedDeductionIds].sort(),
    content: [...state.unlockedContentIds].sort(),
    objectives: Object.fromEntries(
      Object.entries(state.objectiveStates).sort(([left], [right]) => left.localeCompare(right)),
    ),
    placements: [...state.timelinePlacements]
      .sort((left, right) => left.eventId.localeCompare(right.eventId)),
    confirmed: [...state.confirmedGraphEdgeIds].sort(),
    severed: [...state.severedGraphEdgeIds].sort(),
    ending: state.endingId,
  };
}

describe('createInitialCaseState', () => {
  it('seeds authored objective states explicitly', () => {
    const state = createInitialCaseState(bundle, T0);
    expect(state.objectiveStates).toEqual({
      obj_m_start: 'active',
      obj_m_identify: 'locked',
      obj_m_manual: 'locked',
    });
    expect(state.knownFactIds).toEqual([]);
    expect(state.unlockedContentIds).toEqual([]);
  });
});

describe('evidence discovery', () => {
  it('grants authored facts and cascades objectives and unlocks', () => {
    const initial = createInitialCaseState(bundle, T0);
    const result = processEngineEvent(bundle, initial, {
      type: 'discover-evidence',
      evidenceIds: ['ev_m_key'],
    });

    expect(result.state.discoveredEvidenceIds).toEqual(['ev_m_key']);
    expect(result.state.knownFactIds).toEqual(['fact_m_open']);
    expect(result.state.objectiveStates.obj_m_start).toBe('completed');
    expect(result.state.objectiveStates.obj_m_identify).toBe('active');
    expect(result.state.unlockedContentIds).toEqual(['content_m_vault']);
    expect(result.outcomes).toContainEqual({
      type: 'evidence-discovered',
      evidenceIds: ['ev_m_key'],
    });
    expect(result.outcomes).toContainEqual({
      type: 'facts-learned',
      factIds: ['fact_m_open'],
    });
  });

  it('is idempotent for repeated discovery', () => {
    const initial = createInitialCaseState(bundle, T0);
    const once = processEngineEvent(bundle, initial, {
      type: 'discover-evidence',
      evidenceIds: ['ev_m_key'],
    });
    const twice = processEngineEvent(bundle, once.state, {
      type: 'discover-evidence',
      evidenceIds: ['ev_m_key'],
    });

    expect(twice.state).toBe(once.state);
    expect(twice.outcomes).toEqual([]);
  });

  it('rejects unknown evidence without partial application', () => {
    const initial = createInitialCaseState(bundle, T0);
    const result = processEngineEvent(bundle, initial, {
      type: 'discover-evidence',
      evidenceIds: ['ev_m_key', 'ev_missing'],
    });

    expect(result.state).toBe(initial);
    expect(result.outcomes).toEqual([
      { type: 'event-rejected', reason: 'unrecognized-id', ids: ['ev_missing'] },
    ]);
  });

  it('rejects gated evidence exactly like unknown evidence until its facts are known', () => {
    const initial = createInitialCaseState(bundle, T0);
    const hiddenAttempt = processEngineEvent(bundle, initial, {
      type: 'discover-evidence',
      evidenceIds: ['ev_m_hidden'],
    });
    expect(hiddenAttempt.state).toBe(initial);
    expect(hiddenAttempt.outcomes).toEqual([
      { type: 'event-rejected', reason: 'unrecognized-id', ids: ['ev_m_hidden'] },
    ]);

    const revealed = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_anchor', 'ev_m_hint1', 'ev_m_hint2'] },
      { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
    ]);
    const allowed = processEngineEvent(bundle, revealed, {
      type: 'discover-evidence',
      evidenceIds: ['ev_m_hidden'],
    });
    expect(allowed.state.discoveredEvidenceIds).toContain('ev_m_hidden');
  });
});

describe('deductions and contradictions', () => {
  it('rejects a premature deduction with spoiler-safe progress counts only', () => {
    const initial = createInitialCaseState(bundle, T0);
    const partial = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_hint1'] },
    ]);
    const result = processEngineEvent(bundle, partial, {
      type: 'attempt-deduction',
      deductionId: 'ded_m_identity',
    });

    expect(result.state).toBe(partial);
    expect(result.outcomes).toEqual([{
      type: 'deduction-rejected',
      deductionId: 'ded_m_identity',
      progress: {
        missingPrerequisiteCount: 0,
        missingRequiredEvidenceCount: 1,
        thresholdMatched: 1,
        thresholdRequired: 2,
      },
    }]);
  });

  it('enforces contradiction prerequisites before the contradiction can be challenged', () => {
    const initial = createInitialCaseState(bundle, T0);
    const withPair = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_contra_a', 'ev_m_contra_b'] },
    ]);
    const premature = processEngineEvent(bundle, withPair, {
      type: 'attempt-deduction',
      deductionId: 'ded_m_motive',
    });
    expect(premature.outcomes[0]).toMatchObject({
      type: 'deduction-rejected',
      deductionId: 'ded_m_motive',
      progress: { missingPrerequisiteCount: 1 },
    });

    const ready = run(withPair, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_anchor', 'ev_m_hint1', 'ev_m_hint2'] },
      { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
    ]);
    const resolved = processEngineEvent(bundle, ready, {
      type: 'attempt-deduction',
      deductionId: 'ded_m_motive',
    });
    expect(resolved.state.knownFactIds).toContain('fact_m_motive');
    expect(resolved.outcomes).toContainEqual({
      type: 'deduction-completed',
      deductionId: 'ded_m_motive',
    });
  });

  it('completes a threshold deduction with any sufficient evidence combination', () => {
    const initial = createInitialCaseState(bundle, T0);
    const viaHints13 = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_anchor', 'ev_m_hint1', 'ev_m_hint3'] },
      { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
    ]);
    const viaHints23 = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_anchor', 'ev_m_hint2', 'ev_m_hint3'] },
      { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
    ]);

    expect(viaHints13.knownFactIds).toContain('fact_m_identity');
    expect(viaHints23.knownFactIds).toContain('fact_m_identity');
    expect(viaHints13.objectiveStates.obj_m_identify).toBe('completed');
    expect(viaHints13.objectiveStates.obj_m_manual).toBe('active');
    expect(viaHints13.unlockedContentIds).toContain('content_m_archive');
  });

  it('is idempotent for repeated deduction attempts', () => {
    const initial = createInitialCaseState(bundle, T0);
    const once = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_anchor', 'ev_m_hint1', 'ev_m_hint2'] },
      { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
    ]);
    const twice = processEngineEvent(bundle, once, {
      type: 'attempt-deduction',
      deductionId: 'ded_m_identity',
    });
    expect(twice.state).toBe(once);
    expect(twice.outcomes).toEqual([]);
  });
});

describe('timeline reconstruction', () => {
  const readyEvents: CaseEngineEvent[] = [
    { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_hint1'] },
  ];

  it('rejects placement of hidden or unready events without penalty', () => {
    const initial = createInitialCaseState(bundle, T0);
    const hidden = processEngineEvent(bundle, initial, {
      type: 'place-timeline-event',
      eventId: 'tev_m_meeting',
      positionId: 'tpos_m_2',
    });
    expect(hidden.state).toBe(initial);
    expect(hidden.outcomes[0]).toMatchObject({
      type: 'timeline-rejected',
      reason: 'not-placeable',
    });

    const unknownPosition = processEngineEvent(bundle, run(initial, readyEvents), {
      type: 'place-timeline-event',
      eventId: 'tev_m_meeting',
      positionId: 'tpos_missing',
    });
    expect(unknownPosition.outcomes[0]).toMatchObject({
      type: 'timeline-rejected',
      reason: 'unrecognized-position',
    });
  });

  it('accepts any authored window position and grants placement facts once', () => {
    const initial = createInitialCaseState(bundle, T0);
    const ready = run(initial, readyEvents);
    const placed = processEngineEvent(bundle, ready, {
      type: 'place-timeline-event',
      eventId: 'tev_m_meeting',
      positionId: 'tpos_m_3',
    });

    expect(placed.outcomes).toContainEqual({
      type: 'timeline-placed',
      eventId: 'tev_m_meeting',
      positionId: 'tpos_m_3',
      correct: true,
    });
    expect(placed.state.knownFactIds).toContain('fact_m_timeline');

    const repeated = processEngineEvent(bundle, placed.state, {
      type: 'place-timeline-event',
      eventId: 'tev_m_meeting',
      positionId: 'tpos_m_3',
    });
    expect(repeated.state).toBe(placed.state);
    expect(repeated.outcomes).toEqual([]);
  });

  it('lets a wrong placement be corrected later, and facts never regress', () => {
    const initial = createInitialCaseState(bundle, T0);
    const ready = run(initial, readyEvents);
    const wrong = processEngineEvent(bundle, ready, {
      type: 'place-timeline-event',
      eventId: 'tev_m_meeting',
      positionId: 'tpos_m_1',
    });
    expect(wrong.outcomes).toContainEqual({
      type: 'timeline-placed',
      eventId: 'tev_m_meeting',
      positionId: 'tpos_m_1',
      correct: false,
    });
    expect(wrong.state.knownFactIds).not.toContain('fact_m_timeline');

    const corrected = processEngineEvent(bundle, wrong.state, {
      type: 'place-timeline-event',
      eventId: 'tev_m_meeting',
      positionId: 'tpos_m_2',
    });
    expect(corrected.state.timelinePlacements).toEqual([
      { eventId: 'tev_m_meeting', positionId: 'tpos_m_2' },
    ]);
    expect(corrected.state.knownFactIds).toContain('fact_m_timeline');

    const movedBack = processEngineEvent(bundle, corrected.state, {
      type: 'place-timeline-event',
      eventId: 'tev_m_meeting',
      positionId: 'tpos_m_1',
    });
    expect(movedBack.state.knownFactIds).toContain('fact_m_timeline');
  });
});

describe('graph edges and evidence board', () => {
  it('rejects operations on hidden or non-permitted edges', () => {
    const initial = createInitialCaseState(bundle, T0);
    const hidden = processEngineEvent(bundle, initial, {
      type: 'sever-graph-edges',
      edgeIds: ['edge_m_fixed'],
    });
    expect(hidden.outcomes).toEqual([
      { type: 'edges-rejected', edgeIds: ['edge_m_fixed'], reason: 'hidden-edge' },
    ]);

    const revealed = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_anchor', 'ev_m_hint1', 'ev_m_hint2'] },
      { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
    ]);
    const notPermitted = processEngineEvent(bundle, revealed, {
      type: 'sever-graph-edges',
      edgeIds: ['edge_m_fixed'],
    });
    expect(notPermitted.outcomes).toEqual([
      { type: 'edges-rejected', edgeIds: ['edge_m_fixed'], reason: 'not-permitted' },
    ]);

    const unknown = processEngineEvent(bundle, revealed, {
      type: 'confirm-graph-edges',
      edgeIds: ['edge_missing'],
    });
    expect(unknown.outcomes).toEqual([
      { type: 'edges-rejected', edgeIds: ['edge_missing'], reason: 'unrecognized-edge' },
    ]);
  });

  it('moves permitted edges between confirmed and severed deterministically', () => {
    const initial = createInitialCaseState(bundle, T0);
    const confirmed = processEngineEvent(bundle, initial, {
      type: 'confirm-graph-edges',
      edgeIds: ['edge_m_link'],
    });
    expect(confirmed.state.confirmedGraphEdgeIds).toEqual(['edge_m_link']);

    const severed = processEngineEvent(bundle, confirmed.state, {
      type: 'sever-graph-edges',
      edgeIds: ['edge_m_link'],
    });
    expect(severed.state.severedGraphEdgeIds).toEqual(['edge_m_link']);
    expect(severed.state.confirmedGraphEdgeIds).toEqual([]);

    const repeated = processEngineEvent(bundle, severed.state, {
      type: 'sever-graph-edges',
      edgeIds: ['edge_m_link'],
    });
    expect(repeated.state).toBe(severed.state);
    expect(repeated.outcomes).toEqual([]);
  });

  it('pins only discovered evidence and unpins idempotently', () => {
    const initial = createInitialCaseState(bundle, T0);
    const rejected = processEngineEvent(bundle, initial, {
      type: 'pin-evidence',
      evidenceIds: ['ev_m_key'],
    });
    expect(rejected.outcomes).toEqual([
      { type: 'event-rejected', reason: 'unrecognized-id', ids: ['ev_m_key'] },
    ]);

    const discovered = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key'] },
    ]);
    const pinned = processEngineEvent(bundle, discovered, {
      type: 'pin-evidence',
      evidenceIds: ['ev_m_key'],
    });
    expect(pinned.state.pinnedEvidenceIds).toEqual(['ev_m_key']);

    const repinned = processEngineEvent(bundle, pinned.state, {
      type: 'pin-evidence',
      evidenceIds: ['ev_m_key'],
    });
    expect(repinned.state).toBe(pinned.state);

    const unpinned = processEngineEvent(bundle, pinned.state, {
      type: 'unpin-evidence',
      evidenceIds: ['ev_m_key'],
    });
    expect(unpinned.state.pinnedEvidenceIds).toEqual([]);
    const reUnpinned = processEngineEvent(bundle, unpinned.state, {
      type: 'unpin-evidence',
      evidenceIds: ['ev_m_key'],
    });
    expect(reUnpinned.state).toBe(unpinned.state);
  });
});

describe('objectives', () => {
  it('rejects manual completion when an authored condition or lock applies', () => {
    const initial = createInitialCaseState(bundle, T0);
    expect(processEngineEvent(bundle, initial, {
      type: 'complete-objective',
      objectiveId: 'obj_m_start',
    }).outcomes).toEqual([
      { type: 'objective-rejected', objectiveId: 'obj_m_start', reason: 'authored-condition' },
    ]);
    expect(processEngineEvent(bundle, initial, {
      type: 'complete-objective',
      objectiveId: 'obj_m_manual',
    }).outcomes).toEqual([
      { type: 'objective-rejected', objectiveId: 'obj_m_manual', reason: 'not-active' },
    ]);
    expect(processEngineEvent(bundle, initial, {
      type: 'complete-objective',
      objectiveId: 'obj_missing',
    }).outcomes).toEqual([
      { type: 'objective-rejected', objectiveId: 'obj_missing', reason: 'unrecognized-objective' },
    ]);
  });

  it('completes an unconditioned active objective manually and idempotently', () => {
    const initial = createInitialCaseState(bundle, T0);
    const activated = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_anchor', 'ev_m_hint1', 'ev_m_hint2'] },
      { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
    ]);
    expect(activated.objectiveStates.obj_m_manual).toBe('active');

    const completed = processEngineEvent(bundle, activated, {
      type: 'complete-objective',
      objectiveId: 'obj_m_manual',
    });
    expect(completed.state.objectiveStates.obj_m_manual).toBe('completed');

    const repeated = processEngineEvent(bundle, completed.state, {
      type: 'complete-objective',
      objectiveId: 'obj_m_manual',
    });
    expect(repeated.state).toBe(completed.state);
    expect(repeated.outcomes).toEqual([]);
  });
});

describe('determinism and order independence', () => {
  const fullPlaythrough: CaseEngineEvent[] = [
    { type: 'discover-evidence', evidenceIds: ['ev_m_key'] },
    { type: 'discover-evidence', evidenceIds: ['ev_m_anchor', 'ev_m_hint1', 'ev_m_hint2'] },
    { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
    { type: 'discover-evidence', evidenceIds: ['ev_m_contra_a', 'ev_m_contra_b'] },
    { type: 'attempt-deduction', deductionId: 'ded_m_motive' },
    { type: 'place-timeline-event', eventId: 'tev_m_meeting', positionId: 'tpos_m_2' },
    { type: 'discover-evidence', evidenceIds: ['ev_m_edge_1', 'ev_m_edge_2', 'ev_m_final'] },
  ];

  it('replays the same event sequence to an identical state', () => {
    const first = run(createInitialCaseState(bundle, T0), fullPlaythrough);
    const second = run(createInitialCaseState(bundle, T0), fullPlaythrough);
    expect(second).toEqual(first);
  });

  it('reaches identical progression regardless of evidence discovery order', () => {
    const reordered: CaseEngineEvent[] = [
      { type: 'discover-evidence', evidenceIds: ['ev_m_edge_2'] },
      { type: 'discover-evidence', evidenceIds: ['ev_m_contra_b', 'ev_m_final'] },
      { type: 'discover-evidence', evidenceIds: ['ev_m_hint2'] },
      { type: 'discover-evidence', evidenceIds: ['ev_m_key'] },
      { type: 'discover-evidence', evidenceIds: ['ev_m_hint1', 'ev_m_edge_1'] },
      { type: 'place-timeline-event', eventId: 'tev_m_meeting', positionId: 'tpos_m_2' },
      { type: 'discover-evidence', evidenceIds: ['ev_m_anchor', 'ev_m_contra_a'] },
      { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
      { type: 'attempt-deduction', deductionId: 'ded_m_motive' },
    ];

    const canonical = run(createInitialCaseState(bundle, T0), fullPlaythrough);
    const shuffled = run(createInitialCaseState(bundle, T0), reordered);
    expect(progressSnapshot(shuffled)).toEqual(progressSnapshot(canonical));
  });

  it('settles hydrated legacy-style state idempotently', () => {
    const played = run(createInitialCaseState(bundle, T0), fullPlaythrough);
    const withoutDerived: PlayerState = {
      ...played,
      unlockedContentIds: [],
      objectiveStates: {},
    };

    const healed = settleEngineState(bundle, withoutDerived);
    expect([...healed.state.unlockedContentIds].sort())
      .toEqual([...played.unlockedContentIds].sort());
    expect(healed.state.objectiveStates).toEqual(played.objectiveStates);

    const again = settleEngineState(bundle, healed.state);
    expect(again.state).toBe(healed.state);
    expect(again.outcomes).toEqual([]);
  });
});
