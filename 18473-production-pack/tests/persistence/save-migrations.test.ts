import { describe, expect, it } from 'vitest';
import {
  createSaveEnvelope,
  deserializeSave,
  CURRENT_SAVE_VERSION,
  SavePersistenceError,
} from '../../src/game/persistence/save';
import { createInitialPlayerState, type PlayerState } from '../../src/game/state/types';

const T0 = '2026-08-27T00:00:00.000Z';

function richState(): PlayerState {
  return {
    ...createInitialPlayerState('case_test', T0),
    discoveredArtifactIds: ['art_1'],
    discoveredEvidenceIds: ['ev_1', 'ev_2'],
    pinnedEvidenceIds: ['ev_2'],
    unlockedAppIds: ['messages'],
    unlockedContentIds: ['content_1'],
    completedDeductionIds: ['ded_1'],
    knownFactIds: ['fact_1'],
    objectiveStates: { obj_1: 'completed', obj_2: 'active' },
    timelinePlacements: [{ eventId: 'tev_1', positionId: 'tpos_2' }],
    confirmedGraphEdgeIds: ['edge_1'],
    severedGraphEdgeIds: ['edge_2'],
    flags: { note: 'kept' },
  };
}

function toVersion1Envelope(state: PlayerState): string {
  const phase01State: Partial<PlayerState> = { ...state };
  delete phase01State.pinnedEvidenceIds;
  return JSON.stringify({ version: 1, savedAt: T0, state: phase01State });
}

describe('save version 2', () => {
  it('is the current version and round-trips full Phase 03 progression', () => {
    expect(CURRENT_SAVE_VERSION).toBe(2);
    const state = richState();
    const envelope = createSaveEnvelope(state, T0);
    expect(envelope.version).toBe(2);
    expect(deserializeSave(JSON.stringify(envelope), 'case_test')).toEqual(state);
  });

  it('rejects future versions and mismatched cases', () => {
    const envelope = createSaveEnvelope(richState(), T0);
    expect(() => deserializeSave(
      JSON.stringify({ ...envelope, version: 3 }),
      'case_test',
    )).toThrowError(SavePersistenceError);
    expect(() => deserializeSave(JSON.stringify(envelope), 'case_other'))
      .toThrowError(SavePersistenceError);
  });
});

describe('version 1 migration', () => {
  it('migrates a Phase 01/02 envelope by adding empty pinned evidence', () => {
    const expected = { ...richState(), pinnedEvidenceIds: [] };
    const migrated = deserializeSave(toVersion1Envelope(richState()), 'case_test');
    expect(migrated).toEqual(expected);
  });

  it('rejects a version 1 state that already claims Phase 03 fields', () => {
    const raw = JSON.stringify({ version: 1, savedAt: T0, state: richState() });
    expect(() => deserializeSave(raw, 'case_test')).toThrowError(
      /Version 1 save.*cannot be migrated/,
    );
  });

  it('rejects a version 1 envelope with a malformed state', () => {
    const raw = JSON.stringify({ version: 1, savedAt: T0, state: { caseId: 'case_test' } });
    expect(() => deserializeSave(raw, 'case_test')).toThrowError(SavePersistenceError);
  });
});

describe('legacy version 0 migration chain', () => {
  it('runs the full chain from an envelope-less legacy save', () => {
    const legacy = JSON.stringify({
      caseId: 'case_test',
      discoveredEvidenceIds: ['ev_1', 'ev_1', 'ev_2'],
      knownFactIds: ['fact_1'],
      completedDeductionIds: ['ded_1'],
      unlockedContentIds: ['content_1'],
      completedObjectiveIds: ['obj_1'],
      flags: { legacy: true },
      endingId: 'ending_old',
    });

    const migrated = deserializeSave(legacy, 'case_test');
    expect(migrated.discoveredEvidenceIds).toEqual(['ev_1', 'ev_2']);
    expect(migrated.pinnedEvidenceIds).toEqual([]);
    expect(migrated.objectiveStates).toEqual({ obj_1: 'completed' });
    expect(migrated.endingId).toBe('ending_old');
    expect(migrated.timestamps.startedAt).toBe('1970-01-01T00:00:00.000Z');
  });
});
