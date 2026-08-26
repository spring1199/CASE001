import { describe, expect, it } from 'vitest';

import type { PersistenceAdapter } from '@/game/persistence/adapter';
import { playerStateSchema } from '@/game/state/schema';
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

class ControlledAdapter extends MemoryAdapter {
  pauseLoads = false;
  pauseSaves = true;
  readonly loadStarts: string[] = [];
  readonly saveStarts: PlayerState[] = [];
  private readonly pendingLoads: Array<{
    value: PlayerState | null;
    resolve: (value: PlayerState | null) => void;
    reject: (error: Error) => void;
  }> = [];
  private readonly pendingReleases: Array<() => void> = [];
  private readonly pendingSaveRejections: Array<(error: Error) => void> = [];

  override async load(caseId: string): Promise<PlayerState | null> {
    if (!this.pauseLoads) return super.load(caseId);
    this.loadCalls.push(caseId);
    this.loadStarts.push(caseId);
    const value = structuredClone(this.saved.get(caseId) ?? null);
    return new Promise<PlayerState | null>((resolve, reject) => {
      this.pendingLoads.push({ value, resolve, reject });
    });
  }

  override async save(state: PlayerState): Promise<void> {
    if (!this.pauseSaves) return super.save(state);
    const snapshot = structuredClone(state);
    this.saveStarts.push(snapshot);
    await new Promise<void>((resolve, reject) => {
      this.pendingReleases.push(resolve);
      this.pendingSaveRejections.push(reject);
    });
    this.saveCalls.push(snapshot);
    this.saved.set(snapshot.caseId, snapshot);
  }

  releaseNextLoad(): void {
    const pending = this.pendingLoads.shift();
    if (pending === undefined) throw new Error('No load is pending.');
    pending.resolve(pending.value);
  }

  rejectNextLoad(error = new Error('load failed')): void {
    const pending = this.pendingLoads.shift();
    if (pending === undefined) throw new Error('No load is pending.');
    pending.reject(error);
  }

  releaseNextSave(): void {
    const release = this.pendingReleases.shift();
    if (release === undefined) throw new Error('No save is pending.');
    this.pendingSaveRejections.shift();
    release();
  }

  rejectNextSave(error = new Error('save failed')): void {
    this.pendingReleases.shift();
    const reject = this.pendingSaveRejections.shift();
    if (reject === undefined) throw new Error('No save is pending.');
    reject(error);
  }
}

class FinalizationGapAdapter extends MemoryAdapter {
  onFinalizationGap: (() => void) | null = null;

  override async save(state: PlayerState): Promise<void> {
    await super.save(state);
    const callback = this.onFinalizationGap;
    this.onFinalizationGap = null;
    if (callback !== null) {
      queueMicrotask(() => {
        queueMicrotask(callback);
      });
    }
  }
}

async function waitForCount(values: unknown[], count: number): Promise<void> {
  for (let attempt = 0; attempt < 10 && values.length < count; attempt += 1) {
    await Promise.resolve();
  }
  expect(values).toHaveLength(count);
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
    expect(playerStateSchema.safeParse(state).success).toBe(true);
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
    const adapter = new ControlledAdapter();
    const store = createPlayerStore({ caseId: 'case_concurrent', adapter, now: () => T1 });

    const save = store.getState().actions.save();
    let saveResolved = false;
    void save.then(() => {
      saveResolved = true;
    });
    await waitForCount(adapter.saveStarts, 1);
    store.getState().actions.learnFacts(['fact_during_save']);
    adapter.releaseNextSave();
    await waitForCount(adapter.saveStarts, 2);
    expect(saveResolved).toBe(false);
    adapter.releaseNextSave();
    await save;

    const reloaded = createPlayerStore({ caseId: 'case_concurrent', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_during_save']);
    expect(reloaded.getState().playerState.timestamps.lastSavedAt).toBe(T1);
  });

  it('serializes concurrent saves so an older snapshot cannot finish last', async () => {
    const adapter = new ControlledAdapter();
    const store = createPlayerStore({ caseId: 'case_ordered', adapter, now: () => T1 });

    const firstSave = store.getState().actions.save();
    await waitForCount(adapter.saveStarts, 1);
    store.getState().actions.learnFacts(['fact_1']);
    const secondSave = store.getState().actions.save();
    store.getState().actions.learnFacts(['fact_2']);

    expect(adapter.saveStarts).toHaveLength(1);
    adapter.releaseNextSave();
    await waitForCount(adapter.saveStarts, 2);
    expect(adapter.saveStarts[1]?.knownFactIds).toEqual(['fact_1', 'fact_2']);
    adapter.releaseNextSave();
    await Promise.all([firstSave, secondSave]);

    const reloaded = createPlayerStore({ caseId: 'case_ordered', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_1', 'fact_2']);
    expect(adapter.saveCalls).toHaveLength(2);
  });

  it('replays actions made after hydrate starts onto the persisted baseline', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_hydrate_action', {
      ...createInitialPlayerState('case_hydrate_action', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({ caseId: 'case_hydrate_action', adapter, now: () => T1 });

    const hydration = store.getState().actions.hydrate();
    store.getState().actions.learnFacts(['fact_during_hydrate']);
    await waitForCount(adapter.loadStarts, 1);
    adapter.releaseNextLoad();
    await hydration;
    await store.getState().actions.save();

    const reloaded = createPlayerStore({ caseId: 'case_hydrate_action', adapter, now: () => T2 });
    adapter.pauseLoads = false;
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_during_hydrate',
    ]);
  });

  it('orders save after an in-flight hydrate so stale loaded state cannot win', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_hydrate_save', {
      ...createInitialPlayerState('case_hydrate_save', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({ caseId: 'case_hydrate_save', adapter, now: () => T1 });

    const hydration = store.getState().actions.hydrate();
    store.getState().actions.learnFacts(['fact_newer']);
    const save = store.getState().actions.save();
    await waitForCount(adapter.loadStarts, 1);
    expect(adapter.saveCalls).toHaveLength(0);
    adapter.releaseNextLoad();
    await Promise.all([hydration, save]);

    adapter.pauseLoads = false;
    const reloaded = createPlayerStore({ caseId: 'case_hydrate_save', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(store.getState().playerState.knownFactIds).toEqual(['fact_persisted', 'fact_newer']);
    expect(reloaded.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_newer',
    ]);
  });

  it('orders clear after an active save and preserves actions made after clear begins', async () => {
    const adapter = new ControlledAdapter();
    const store = createPlayerStore({ caseId: 'case_clear_race', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_before_clear']);

    const save = store.getState().actions.save();
    await waitForCount(adapter.saveStarts, 1);
    const clear = store.getState().actions.clear();
    store.getState().actions.learnFacts(['fact_after_clear_started']);
    adapter.releaseNextSave();
    await clear;
    for (let attempt = 0; attempt < 10; attempt += 1) await Promise.resolve();
    expect(adapter.saveStarts).toHaveLength(1);
    await save;

    expect(store.getState().playerState.knownFactIds).toEqual(['fact_after_clear_started']);
    expect(await adapter.load('case_clear_race')).toBeNull();
  });

  it('hands a save requested during finalization to a new persistence operation', async () => {
    const adapter = new FinalizationGapAdapter();
    const store = createPlayerStore({ caseId: 'case_handoff', adapter, now: () => T1 });
    let handoffSave: Promise<void> | null = null;
    adapter.onFinalizationGap = () => {
      store.getState().actions.learnFacts(['fact_in_finalization_gap']);
      handoffSave = store.getState().actions.save();
    };

    await store.getState().actions.save();
    await Promise.resolve();
    if (handoffSave === null) throw new Error('Finalization hook did not run.');
    await handoffSave;

    const reloaded = createPlayerStore({ caseId: 'case_handoff', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_in_finalization_gap']);
    expect(adapter.saveCalls).toHaveLength(2);
  });

  it('recovers after an adapter save rejection without wedging later saves', async () => {
    const adapter = new ControlledAdapter();
    const store = createPlayerStore({ caseId: 'case_retry', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_retry']);

    const failedSave = store.getState().actions.save();
    await waitForCount(adapter.saveStarts, 1);
    adapter.rejectNextSave();
    await expect(failedSave).rejects.toThrow('save failed');

    const retry = store.getState().actions.save();
    await waitForCount(adapter.saveStarts, 2);
    adapter.releaseNextSave();
    await retry;

    expect((await adapter.load('case_retry'))?.knownFactIds).toEqual(['fact_retry']);
  });

  it('runs a queued save after hydrate rejects and preserves live progress', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseSaves = false;
    const store = createPlayerStore({ caseId: 'case_load_retry', adapter, now: () => T1 });

    const hydration = store.getState().actions.hydrate();
    store.getState().actions.learnFacts(['fact_after_failed_load']);
    const save = store.getState().actions.save();
    await waitForCount(adapter.loadStarts, 1);
    adapter.rejectNextLoad();

    await expect(hydration).rejects.toThrow('load failed');
    await save;
    adapter.pauseLoads = false;
    expect((await adapter.load('case_load_retry'))?.knownFactIds).toEqual([
      'fact_after_failed_load',
    ]);
  });
});
