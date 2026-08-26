import { describe, expect, it } from 'vitest';

import {
  LocalStoragePersistenceAdapter,
  type StorageLike,
} from '@/game/persistence/adapter';
import { CURRENT_SAVE_VERSION, LEGACY_TIMESTAMP_SENTINEL } from '@/game/persistence/save';
import { createInitialPlayerState, type PlayerState } from '@/game/state/types';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const NOW = '2026-08-26T01:02:03.000Z';

function completeState(caseId = 'case_alpha'): PlayerState {
  return {
    ...createInitialPlayerState(caseId, NOW),
    discoveredArtifactIds: ['artifact_2', 'artifact_1'],
    discoveredEvidenceIds: ['evidence_2', 'evidence_1'],
    unlockedAppIds: ['app_messages', 'app_graph'],
    unlockedContentIds: ['thread_2', 'file_9'],
    completedDeductionIds: ['deduction_3'],
    knownFactIds: ['fact_7', 'fact_4'],
    objectiveStates: {
      objective_locked: 'locked',
      objective_active: 'active',
      objective_done: 'completed',
    },
    timelinePlacements: [
      { eventId: 'event_b', positionId: 'slot_2' },
      { eventId: 'event_a', positionId: 'slot_1' },
    ],
    confirmedGraphEdgeIds: ['edge_confirmed'],
    severedGraphEdgeIds: ['edge_severed'],
    flags: {
      bool_flag: true,
      number_flag: 47,
      string_flag: 'value',
    },
    endingBranchId: 'branch_custom',
    endingId: 'ending_custom',
    timestamps: {
      startedAt: NOW,
      updatedAt: '2026-08-26T01:12:03.000Z',
      lastPlayedAt: '2026-08-26T01:11:03.000Z',
      lastSavedAt: '2026-08-26T01:10:03.000Z',
    },
  };
}

describe('LocalStoragePersistenceAdapter', () => {
  it('round-trips every player progress field in a versioned envelope', async () => {
    const storage = new MemoryStorage();
    const adapter = new LocalStoragePersistenceAdapter({
      storage: () => storage,
      now: () => NOW,
    });
    const state = completeState();

    await adapter.save(state);

    expect(await adapter.load(state.caseId)).toEqual(state);
    expect(JSON.parse(storage.values.get('18473:save:case_alpha') ?? '')).toMatchObject({
      version: CURRENT_SAVE_VERSION,
      savedAt: NOW,
      state,
    });
  });

  it('migrates the legacy unversioned player state deterministically', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      '18473:save:legacy_case',
      JSON.stringify({
        caseId: 'legacy_case',
        discoveredEvidenceIds: ['ev_1'],
        knownFactIds: ['fact_1'],
        completedDeductionIds: ['ded_1'],
        unlockedContentIds: ['content_1'],
        completedObjectiveIds: ['objective_1'],
        flags: { seen: true, score: 2, route: 'quiet' },
        endingId: 'ending_old',
      }),
    );
    const adapter = new LocalStoragePersistenceAdapter({
      storage: () => storage,
      now: () => NOW,
    });

    expect(await adapter.load('legacy_case')).toEqual({
      ...createInitialPlayerState('legacy_case', LEGACY_TIMESTAMP_SENTINEL),
      discoveredEvidenceIds: ['ev_1'],
      knownFactIds: ['fact_1'],
      completedDeductionIds: ['ded_1'],
      unlockedContentIds: ['content_1'],
      objectiveStates: { objective_1: 'completed' },
      flags: { seen: true, score: 2, route: 'quiet' },
      endingId: 'ending_old',
    });
  });

  it('produces identical timestamps when the same legacy save is loaded at different times', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      '18473:save:legacy_repeatable',
      JSON.stringify({
        caseId: 'legacy_repeatable',
        discoveredEvidenceIds: [],
        knownFactIds: [],
        completedDeductionIds: [],
        unlockedContentIds: [],
        completedObjectiveIds: [],
        flags: {},
      }),
    );
    const early = new LocalStoragePersistenceAdapter({
      storage: () => storage,
      now: () => '2026-01-01T00:00:00.000Z',
    });
    const late = new LocalStoragePersistenceAdapter({
      storage: () => storage,
      now: () => '2036-01-01T00:00:00.000Z',
    });

    const first = await early.load('legacy_repeatable');
    const second = await late.load('legacy_repeatable');

    expect(first?.timestamps).toEqual(second?.timestamps);
    expect(first?.timestamps.startedAt).toBe(LEGACY_TIMESTAMP_SENTINEL);
  });

  it('normalizes duplicate legacy progress IDs by first occurrence', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      '18473:save:legacy_duplicates',
      JSON.stringify({
        caseId: 'legacy_duplicates',
        discoveredEvidenceIds: ['ev_2', 'ev_1', 'ev_2'],
        knownFactIds: ['fact_2', 'fact_1', 'fact_2'],
        completedDeductionIds: ['ded_2', 'ded_1', 'ded_2'],
        unlockedContentIds: ['content_2', 'content_1', 'content_2'],
        completedObjectiveIds: ['objective_2', 'objective_1', 'objective_2'],
        flags: {},
      }),
    );
    const adapter = new LocalStoragePersistenceAdapter({ storage: () => storage });

    const migrated = await adapter.load('legacy_duplicates');

    expect(migrated).toMatchObject({
      discoveredEvidenceIds: ['ev_2', 'ev_1'],
      knownFactIds: ['fact_2', 'fact_1'],
      completedDeductionIds: ['ded_2', 'ded_1'],
      unlockedContentIds: ['content_2', 'content_1'],
      objectiveStates: { objective_2: 'completed', objective_1: 'completed' },
    });
  });

  it.each([
    ['corrupt JSON', '{nope', 'CORRUPT_SAVE'],
    [
      'a future version',
      JSON.stringify({ version: CURRENT_SAVE_VERSION + 1, savedAt: NOW, state: completeState() }),
      'UNSUPPORTED_VERSION',
    ],
    [
      'an invalid current envelope',
      JSON.stringify({ version: CURRENT_SAVE_VERSION, savedAt: NOW, state: { nope: true } }),
      'INVALID_SAVE',
    ],
  ])('rejects %s with a contextual error', async (_label, raw, code) => {
    const storage = new MemoryStorage();
    storage.setItem('18473:save:case_alpha', raw);
    const adapter = new LocalStoragePersistenceAdapter({ storage: () => storage });

    await expect(adapter.load('case_alpha')).rejects.toMatchObject({
      code,
      caseId: 'case_alpha',
    });
  });

  it('rejects a save stored under a mismatched case ID', async () => {
    const storage = new MemoryStorage();
    const adapter = new LocalStoragePersistenceAdapter({ storage: () => storage, now: () => NOW });
    await adapter.save(completeState('other_case'));
    storage.setItem(
      '18473:save:expected_case',
      storage.getItem('18473:save:other_case') ?? '',
    );

    await expect(adapter.load('expected_case')).rejects.toMatchObject({
      code: 'CASE_ID_MISMATCH',
      caseId: 'expected_case',
    });
  });

  it.each([
    [
      'duplicate discovered artifact IDs',
      (state: PlayerState) => {
        state.discoveredArtifactIds.push('artifact_2');
      },
    ],
    [
      'duplicate discovered evidence IDs',
      (state: PlayerState) => {
        state.discoveredEvidenceIds.push('evidence_2');
      },
    ],
    [
      'duplicate unlocked app IDs',
      (state: PlayerState) => {
        state.unlockedAppIds.push('app_messages');
      },
    ],
    [
      'duplicate unlocked content IDs',
      (state: PlayerState) => {
        state.unlockedContentIds.push('thread_2');
      },
    ],
    [
      'duplicate completed deduction IDs',
      (state: PlayerState) => {
        state.completedDeductionIds.push('deduction_3');
      },
    ],
    [
      'duplicate known fact IDs',
      (state: PlayerState) => {
        state.knownFactIds.push('fact_7');
      },
    ],
    [
      'duplicate timeline event placements',
      (state: PlayerState) => {
        state.timelinePlacements.push({ eventId: 'event_b', positionId: 'slot_3' });
      },
    ],
    [
      'duplicate confirmed graph edges',
      (state: PlayerState) => {
        state.confirmedGraphEdgeIds.push('edge_confirmed');
      },
    ],
    [
      'duplicate severed graph edges',
      (state: PlayerState) => {
        state.severedGraphEdgeIds.push('edge_severed');
      },
    ],
    [
      'an edge that is both confirmed and severed',
      (state: PlayerState) => {
        state.severedGraphEdgeIds.push('edge_confirmed');
      },
    ],
    [
      'an updated timestamp before the player start timestamp',
      (state: PlayerState) => {
        state.timestamps.updatedAt = '2026-08-26T00:59:00.000Z';
      },
    ],
    [
      'a last-played timestamp before the player start timestamp',
      (state: PlayerState) => {
        state.timestamps.lastPlayedAt = '2026-08-26T00:59:00.000Z';
      },
    ],
    [
      'a last-saved timestamp before the player start timestamp',
      (state: PlayerState) => {
        state.timestamps.lastSavedAt = '2026-08-26T00:59:00.000Z';
      },
    ],
    [
      'an updated timestamp before the last-played timestamp',
      (state: PlayerState) => {
        state.timestamps.updatedAt = '2026-08-26T01:05:00.000Z';
        state.timestamps.lastPlayedAt = '2026-08-26T01:06:00.000Z';
        state.timestamps.lastSavedAt = '2026-08-26T01:04:00.000Z';
      },
    ],
    [
      'an updated timestamp before the last-saved timestamp',
      (state: PlayerState) => {
        state.timestamps.updatedAt = '2026-08-26T01:05:00.000Z';
        state.timestamps.lastPlayedAt = '2026-08-26T01:04:00.000Z';
        state.timestamps.lastSavedAt = '2026-08-26T01:06:00.000Z';
      },
    ],
  ])('rejects %s in persisted player state', async (_label, makeInvalid) => {
    const storage = new MemoryStorage();
    const state = completeState();
    makeInvalid(state);
    storage.setItem(
      '18473:save:case_alpha',
      JSON.stringify({ version: CURRENT_SAVE_VERSION, savedAt: NOW, state }),
    );
    const adapter = new LocalStoragePersistenceAdapter({ storage: () => storage });

    await expect(adapter.load('case_alpha')).rejects.toMatchObject({
      code: 'INVALID_SAVE',
      caseId: 'case_alpha',
    });
  });

  it('reports the duplicate ordered ID field and index context', async () => {
    const storage = new MemoryStorage();
    const state = completeState();
    state.discoveredArtifactIds.push('artifact_2');
    storage.setItem(
      '18473:save:case_alpha',
      JSON.stringify({ version: CURRENT_SAVE_VERSION, savedAt: NOW, state }),
    );
    const adapter = new LocalStoragePersistenceAdapter({ storage: () => storage });

    await expect(adapter.load('case_alpha')).rejects.toThrow(
      /state\.discoveredArtifactIds\[2\]/,
    );
  });

  it('reports timestamp ordering field context', async () => {
    const storage = new MemoryStorage();
    const state = completeState();
    state.timestamps.updatedAt = '2026-08-26T00:59:00.000Z';
    storage.setItem(
      '18473:save:case_alpha',
      JSON.stringify({ version: CURRENT_SAVE_VERSION, savedAt: NOW, state }),
    );
    const adapter = new LocalStoragePersistenceAdapter({ storage: () => storage });

    await expect(adapter.load('case_alpha')).rejects.toThrow(/state\.timestamps\.updatedAt/);
  });

  it('clears only the targeted case namespace', async () => {
    const storage = new MemoryStorage();
    const adapter = new LocalStoragePersistenceAdapter({ storage: () => storage, now: () => NOW });
    await adapter.save(completeState('case_a'));
    await adapter.save(completeState('case_b'));

    await adapter.clear('case_a');

    expect(await adapter.load('case_a')).toBeNull();
    expect(await adapter.load('case_b')).toEqual(completeState('case_b'));
  });

  it('is safe when no browser storage is available', async () => {
    const adapter = new LocalStoragePersistenceAdapter({ storage: () => null, now: () => NOW });

    await expect(adapter.load('case_ssr')).resolves.toBeNull();
    await expect(adapter.save(createInitialPlayerState('case_ssr', NOW))).resolves.toBeUndefined();
    await expect(adapter.clear('case_ssr')).resolves.toBeUndefined();
  });
});
