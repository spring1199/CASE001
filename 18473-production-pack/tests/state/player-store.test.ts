import { describe, expect, it } from 'vitest';

import type { PersistenceAdapter } from '@/game/persistence/adapter';
import { createPlayerStore } from '@/game/state/store';
import { createInitialPlayerState, type PlayerState } from '@/game/state/types';

const T0 = '2026-08-26T00:00:00.000Z';
const T1 = '2026-08-26T00:01:00.000Z';
const T2 = '2026-08-26T00:02:00.000Z';

class MemoryAdapter implements PersistenceAdapter {
  saved = new Map<string, PlayerState>();
  loadCalls: string[] = [];
  saveCalls: PlayerState[] = [];
  clearCalls: string[] = [];

  async load(caseId: string): Promise<PlayerState | null> {
    this.loadCalls.push(caseId);
    return structuredClone(this.saved.get(caseId) ?? null);
  }

  async save(state: PlayerState): Promise<void> {
    this.saveCalls.push(structuredClone(state));
    this.saved.set(state.caseId, structuredClone(state));
  }

  async clear(caseId: string): Promise<void> {
    this.clearCalls.push(caseId);
    this.saved.delete(caseId);
  }
}

class PausedSaveAdapter extends MemoryAdapter {
  readonly saveStarts: PlayerState[] = [];
  private readonly pendingReleases: Array<() => void> = [];

  override async save(state: PlayerState): Promise<void> {
    const snapshot = structuredClone(state);
    this.saveStarts.push(snapshot);
    await new Promise<void>((resolve) => {
      this.pendingReleases.push(resolve);
    });
    this.saveCalls.push(snapshot);
    this.saved.set(snapshot.caseId, snapshot);
  }

  releaseNext(): void {
    const release = this.pendingReleases.shift();
    if (release === undefined) throw new Error('No save is pending.');
    release();
  }
}

async function waitForSaveStarts(adapter: PausedSaveAdapter, count: number): Promise<void> {
  for (let attempt = 0; attempt < 10 && adapter.saveStarts.length < count; attempt += 1) {
    await Promise.resolve();
  }
  expect(adapter.saveStarts).toHaveLength(count);
}

function sequenceClock(...values: string[]): () => string {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? T0;
}

describe('createInitialPlayerState', () => {
  it('creates reusable empty runtime state for the requested case and time', () => {
    expect(createInitialPlayerState('case_custom', T0)).toEqual({
      caseId: 'case_custom',
      discoveredArtifactIds: [],
      discoveredEvidenceIds: [],
      unlockedAppIds: [],
      unlockedContentIds: [],
      completedDeductionIds: [],
      knownFactIds: [],
      objectiveStates: {},
      timelinePlacements: [],
      confirmedGraphEdgeIds: [],
      severedGraphEdgeIds: [],
      flags: {},
      endingBranchId: null,
      endingId: null,
      timestamps: {
        startedAt: T0,
        updatedAt: T0,
        lastPlayedAt: T0,
        lastSavedAt: null,
      },
    });
  });
});

describe('createPlayerStore', () => {
  it('applies data-driven progress actions idempotently and preserves input ordering', () => {
    const adapter = new MemoryAdapter();
    const store = createPlayerStore({
      caseId: 'case_custom',
      adapter,
      now: sequenceClock(T0, T1, T2),
    });
    const actions = store.getState().actions;

    actions.discoverArtifacts(['artifact_b', 'artifact_a', 'artifact_b']);
    actions.discoverArtifacts(['artifact_b']);
    actions.discoverEvidence(['evidence_b', 'evidence_a', 'evidence_b']);
    actions.unlockApps(['app_b', 'app_a', 'app_b']);
    actions.unlockContent(['content_b', 'content_a', 'content_b']);
    actions.completeDeductions(['deduction_b', 'deduction_a', 'deduction_b']);
    actions.learnFacts(['fact_b', 'fact_a', 'fact_b']);
    actions.setObjectiveState('objective_1', 'active');
    actions.setObjectiveState('objective_1', 'active');
    actions.placeTimelineEvent('event_1', 'slot_a');
    actions.placeTimelineEvent('event_1', 'slot_a');
    actions.confirmGraphEdges(['edge_b', 'edge_a', 'edge_b']);
    actions.severGraphEdges(['edge_b']);
    actions.setFlag('bool', true);
    actions.setFlag('number', 3);
    actions.setFlag('string', 'route');
    actions.setEnding('branch_any', 'ending_any');

    const state = store.getState().playerState;
    expect(state).toMatchObject({
      discoveredArtifactIds: ['artifact_b', 'artifact_a'],
      discoveredEvidenceIds: ['evidence_b', 'evidence_a'],
      unlockedAppIds: ['app_b', 'app_a'],
      unlockedContentIds: ['content_b', 'content_a'],
      completedDeductionIds: ['deduction_b', 'deduction_a'],
      knownFactIds: ['fact_b', 'fact_a'],
      objectiveStates: { objective_1: 'active' },
      timelinePlacements: [{ eventId: 'event_1', positionId: 'slot_a' }],
      confirmedGraphEdgeIds: ['edge_a'],
      severedGraphEdgeIds: ['edge_b'],
      flags: { bool: true, number: 3, string: 'route' },
      endingBranchId: 'branch_any',
      endingId: 'ending_any',
    });
    expect(state.timestamps.updatedAt).toBe(T2);
    expect(state.timestamps.lastPlayedAt).toBe(T2);
  });

  it('does not update timestamps for a no-op action', () => {
    const store = createPlayerStore({
      caseId: 'case_custom',
      adapter: new MemoryAdapter(),
      now: sequenceClock(T0, T1, T2),
    });
    const actions = store.getState().actions;
    actions.discoverEvidence(['evidence_1']);
    const afterChange = store.getState().playerState;

    actions.discoverEvidence(['evidence_1']);

    expect(store.getState().playerState).toBe(afterChange);
    expect(store.getState().playerState.timestamps.updatedAt).toBe(T1);
  });

  it('hydrates, saves, and clears through the injected adapter', async () => {
    const adapter = new MemoryAdapter();
    const hydrated: PlayerState = {
      ...createInitialPlayerState('case_custom', T0),
      discoveredArtifactIds: ['artifact_saved'],
      flags: { count: 4 },
    };
    adapter.saved.set('case_custom', hydrated);
    const store = createPlayerStore({
      caseId: 'case_custom',
      adapter,
      now: sequenceClock(T0, T1, T2),
    });

    await store.getState().actions.hydrate();
    expect(adapter.loadCalls).toEqual(['case_custom']);
    expect(store.getState().playerState).toEqual(hydrated);

    store.getState().actions.learnFacts(['fact_new']);
    await store.getState().actions.save();
    expect(adapter.saveCalls).toHaveLength(1);
    expect(adapter.saveCalls[0]?.timestamps.lastSavedAt).toBe(T2);
    expect(store.getState().playerState).toEqual(adapter.saveCalls[0]);

    await store.getState().actions.clear();
    expect(adapter.clearCalls).toEqual(['case_custom']);
    expect(store.getState().playerState).toEqual(createInitialPlayerState('case_custom', T2));
  });

  it('round-trips all progress through store persistence without loss', async () => {
    const adapter = new MemoryAdapter();
    const first = createPlayerStore({ caseId: 'case_roundtrip', adapter, now: () => T1 });
    const actions = first.getState().actions;
    actions.discoverArtifacts(['artifact_1']);
    actions.discoverEvidence(['evidence_1']);
    actions.unlockApps(['app_1']);
    actions.unlockContent(['content_1']);
    actions.completeDeductions(['deduction_1']);
    actions.learnFacts(['fact_1']);
    actions.setObjectiveState('objective_1', 'completed');
    actions.placeTimelineEvent('event_1', 'slot_1');
    actions.confirmGraphEdges(['edge_1']);
    actions.severGraphEdges(['edge_2']);
    actions.setFlag('boolean', false);
    actions.setFlag('number', 18473);
    actions.setFlag('string', 'custom');
    actions.setEnding('branch_1', 'ending_1');
    await actions.save();
    const expected = first.getState().playerState;

    const second = createPlayerStore({ caseId: 'case_roundtrip', adapter, now: () => T2 });
    await second.getState().actions.hydrate();

    expect(second.getState().playerState).toEqual(expected);
  });

  it('persists progress made while an asynchronous save is pending before resolving', async () => {
    const adapter = new PausedSaveAdapter();
    const store = createPlayerStore({ caseId: 'case_concurrent', adapter, now: () => T1 });

    const save = store.getState().actions.save();
    let saveResolved = false;
    void save.then(() => {
      saveResolved = true;
    });
    store.getState().actions.learnFacts(['fact_during_save']);
    adapter.releaseNext();
    await waitForSaveStarts(adapter, 2);
    expect(saveResolved).toBe(false);
    adapter.releaseNext();
    await save;

    const reloaded = createPlayerStore({ caseId: 'case_concurrent', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_during_save']);
    expect(reloaded.getState().playerState.timestamps.lastSavedAt).toBe(T1);
  });

  it('serializes concurrent saves so an older snapshot cannot finish last', async () => {
    const adapter = new PausedSaveAdapter();
    const store = createPlayerStore({ caseId: 'case_ordered', adapter, now: () => T1 });

    const firstSave = store.getState().actions.save();
    store.getState().actions.learnFacts(['fact_1']);
    const secondSave = store.getState().actions.save();
    store.getState().actions.learnFacts(['fact_2']);

    expect(adapter.saveStarts).toHaveLength(1);
    adapter.releaseNext();
    await waitForSaveStarts(adapter, 2);
    expect(adapter.saveStarts[1]?.knownFactIds).toEqual(['fact_1', 'fact_2']);
    adapter.releaseNext();
    await Promise.all([firstSave, secondSave]);

    const reloaded = createPlayerStore({ caseId: 'case_ordered', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_1', 'fact_2']);
    expect(adapter.saveCalls).toHaveLength(2);
  });
});
