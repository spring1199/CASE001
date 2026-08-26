import { describe, expect, it } from 'vitest';

import type { PersistenceAdapter } from '@/game/persistence/adapter';
import { playerStateSchema } from '@/game/state/schema';
import { createPlayerStore } from '@/game/state/store';
import { createInitialPlayerState, type PlayerState } from '@/game/state/types';

const T0 = '2026-08-26T00:00:00.000Z';
const T1 = '2026-08-26T00:01:00.000Z';
const T2 = '2026-08-26T00:02:00.000Z';
const T3 = '2026-08-26T00:03:00.000Z';

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
  pauseClears = false;
  pauseLoads = false;
  pauseSaves = true;
  readonly clearStarts: string[] = [];
  readonly loadStarts: string[] = [];
  readonly saveStarts: PlayerState[] = [];
  private readonly pendingLoads: Array<{
    value: PlayerState | null;
    resolve: (value: PlayerState | null) => void;
    reject: (error: Error) => void;
  }> = [];
  private readonly pendingReleases: Array<() => void> = [];
  private readonly pendingSaveRejections: Array<(error: Error) => void> = [];
  private readonly pendingClears: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  override async clear(caseId: string): Promise<void> {
    if (!this.pauseClears) return super.clear(caseId);
    this.clearCalls.push(caseId);
    this.clearStarts.push(caseId);
    await new Promise<void>((resolve, reject) => {
      this.pendingClears.push({ resolve, reject });
    });
    this.saved.delete(caseId);
  }

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

  releaseNextClear(): void {
    const pending = this.pendingClears.shift();
    if (pending === undefined) throw new Error('No clear is pending.');
    pending.resolve();
  }

  rejectNextClear(error = new Error('clear failed')): void {
    const pending = this.pendingClears.shift();
    if (pending === undefined) throw new Error('No clear is pending.');
    pending.reject(error);
  }
}

class ValidatingMemoryAdapter extends MemoryAdapter {
  override async save(state: PlayerState): Promise<void> {
    playerStateSchema.parse(state);
    await super.save(state);
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

class FailOnSecondClearAdapter extends MemoryAdapter {
  readonly clearStarts: string[] = [];
  private releaseFirst: (() => void) | null = null;

  override async clear(caseId: string): Promise<void> {
    this.clearCalls.push(caseId);
    this.clearStarts.push(caseId);
    if (this.clearStarts.length > 1) throw new Error('second clear failed');
    await new Promise<void>((resolve) => {
      this.releaseFirst = resolve;
    });
    this.saved.delete(caseId);
  }

  releaseFirstClear(): void {
    if (this.releaseFirst === null) throw new Error('First clear is not pending.');
    const release = this.releaseFirst;
    this.releaseFirst = null;
    release();
  }
}

class FailFirstClearAdapter extends MemoryAdapter {
  private shouldFail = true;

  override async clear(caseId: string): Promise<void> {
    this.clearCalls.push(caseId);
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error('first clear failed');
    }
    this.saved.delete(caseId);
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

  it('rejects a queued save after hydrate fails and preserves progress for retry', async () => {
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
    await expect(save).rejects.toThrow('load failed');

    const retry = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 2);
    adapter.releaseNextLoad();
    await retry;
    await store.getState().actions.save();
    adapter.pauseLoads = false;
    expect((await adapter.load('case_load_retry'))?.knownFactIds).toEqual([
      'fact_after_failed_load',
    ]);
  });

  it('replays a live no-op action onto the empty baseline of a pending clear', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseClears = true;
    adapter.pauseSaves = false;
    const store = createPlayerStore({ caseId: 'case_clear_intent', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_a']);

    const clear = store.getState().actions.clear();
    await waitForCount(adapter.clearStarts, 1);
    store.getState().actions.learnFacts(['fact_a']);
    adapter.releaseNextClear();
    await clear;
    expect(store.getState().playerState.knownFactIds).toEqual(['fact_a']);

    await store.getState().actions.save();
    const reloaded = createPlayerStore({ caseId: 'case_clear_intent', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_a']);
  });

  it('replays a live no-op action onto an older baseline loaded by hydrate', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_hydrate_intent', createInitialPlayerState('case_hydrate_intent', T2));
    const store = createPlayerStore({ caseId: 'case_hydrate_intent', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_a']);

    const hydration = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 1);
    store.getState().actions.learnFacts(['fact_a']);
    adapter.releaseNextLoad();
    await hydration;
    expect(store.getState().playerState.knownFactIds).toEqual(['fact_a']);
    expect(store.getState().playerState.timestamps.updatedAt).toBe(T2);
    expect(playerStateSchema.safeParse(store.getState().playerState).success).toBe(true);

    await store.getState().actions.save();
    adapter.pauseLoads = false;
    const reloaded = createPlayerStore({ caseId: 'case_hydrate_intent', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_a']);
  });

  it('uses clear request time as the baseline before replaying later mutations', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseClears = true;
    adapter.pauseSaves = false;
    let currentTime = T0;
    const store = createPlayerStore({
      caseId: 'case_clear_clock',
      adapter,
      now: () => currentTime,
    });

    currentTime = T1;
    const clear = store.getState().actions.clear();
    await waitForCount(adapter.clearStarts, 1);
    currentTime = T2;
    store.getState().actions.learnFacts(['fact_after_clear']);
    currentTime = T3;
    adapter.releaseNextClear();
    await clear;

    expect(store.getState().playerState.timestamps).toMatchObject({
      startedAt: T1,
      updatedAt: T2,
      lastPlayedAt: T2,
      lastSavedAt: null,
    });
    expect(playerStateSchema.safeParse(store.getState().playerState).success).toBe(true);

    await store.getState().actions.save();
    const reloaded = createPlayerStore({ caseId: 'case_clear_clock', adapter, now: () => T3 });
    await reloaded.getState().actions.hydrate();
    const timestamps = reloaded.getState().playerState.timestamps;
    expect(timestamps.startedAt <= timestamps.updatedAt).toBe(true);
    expect(timestamps.startedAt <= timestamps.lastPlayedAt).toBe(true);
    expect(timestamps.lastSavedAt !== null && timestamps.startedAt <= timestamps.lastSavedAt).toBe(
      true,
    );
  });

  it('mutates and saves a newer hydrated clock through a validating adapter without regression', async () => {
    const adapter = new ValidatingMemoryAdapter();
    adapter.saved.set('case_remote_clock', {
      ...createInitialPlayerState('case_remote_clock', T3),
      timestamps: {
        startedAt: T3,
        updatedAt: T3,
        lastPlayedAt: T3,
        lastSavedAt: T3,
      },
    });
    const store = createPlayerStore({ caseId: 'case_remote_clock', adapter, now: () => T1 });

    await store.getState().actions.hydrate();
    store.getState().actions.learnFacts(['fact_local']);
    await store.getState().actions.save();

    const reloaded = createPlayerStore({ caseId: 'case_remote_clock', adapter, now: () => T1 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_local']);
    expect(reloaded.getState().playerState.timestamps).toEqual({
      startedAt: T3,
      updatedAt: T3,
      lastPlayedAt: T3,
      lastSavedAt: T3,
    });
  });

  it('does not regress newer baseline timestamps when replaying an older captured mutation', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_newer_replay', {
      ...createInitialPlayerState('case_newer_replay', T0),
      timestamps: {
        startedAt: T0,
        updatedAt: T3,
        lastPlayedAt: T3,
        lastSavedAt: T3,
      },
    });
    const store = createPlayerStore({ caseId: 'case_newer_replay', adapter, now: () => T1 });

    const hydration = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 1);
    store.getState().actions.learnFacts(['fact_captured']);
    adapter.releaseNextLoad();
    await hydration;

    expect(store.getState().playerState.knownFactIds).toEqual(['fact_captured']);
    expect(store.getState().playerState.timestamps).toEqual({
      startedAt: T0,
      updatedAt: T3,
      lastPlayedAt: T3,
      lastSavedAt: T3,
    });
    expect(playerStateSchema.safeParse(store.getState().playerState).success).toBe(true);
  });

  it('preserves baseline timestamps and skips persistence when replayed intent remains a no-op', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseSaves = false;
    const baseline: PlayerState = {
      ...createInitialPlayerState('case_replay_noop', T0),
      knownFactIds: ['fact_a'],
      timestamps: {
        startedAt: T0,
        updatedAt: T3,
        lastPlayedAt: T3,
        lastSavedAt: T3,
      },
    };
    adapter.saved.set('case_replay_noop', baseline);
    const store = createPlayerStore({ caseId: 'case_replay_noop', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_a']);

    const hydration = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 1);
    store.getState().actions.learnFacts(['fact_a']);
    adapter.releaseNextLoad();
    await hydration;

    expect(store.getState().playerState).toEqual(baseline);
    await store.getState().actions.save();
    expect(adapter.saveCalls).toHaveLength(0);
  });

  it('rejects invalid custom-adapter hydration before installing state', async () => {
    const adapter = new MemoryAdapter();
    const invalid = createInitialPlayerState('case_invalid_hydrate', T2);
    invalid.timestamps.updatedAt = T1;
    adapter.saved.set('case_invalid_hydrate', invalid);
    const store = createPlayerStore({ caseId: 'case_invalid_hydrate', adapter, now: () => T0 });
    const initial = store.getState().playerState;

    await expect(store.getState().actions.hydrate()).rejects.toMatchObject({
      name: 'PlayerStoreValidationError',
      operation: 'hydrate',
      caseId: 'case_invalid_hydrate',
    });
    expect(store.getState().playerState).toBe(initial);
  });

  it('rejects invalid state before handing it to a custom persistence adapter', async () => {
    const adapter = new MemoryAdapter();
    const store = createPlayerStore({ caseId: 'case_invalid_save', adapter, now: () => T0 });
    const invalid = createInitialPlayerState('case_invalid_save', T2);
    invalid.timestamps.lastPlayedAt = T1;
    store.setState({ playerState: invalid });

    await expect(store.getState().actions.save()).rejects.toMatchObject({
      name: 'PlayerStoreValidationError',
      operation: 'save',
      caseId: 'case_invalid_save',
    });
    expect(adapter.saveCalls).toHaveLength(0);
  });

  it('persists a valid external setState change after an established save', async () => {
    const adapter = new MemoryAdapter();
    const store = createPlayerStore({ caseId: 'case_external_set', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_initial']);
    await store.getState().actions.save();
    const current = store.getState().playerState;
    store.setState({
      playerState: {
        ...current,
        knownFactIds: [...current.knownFactIds, 'fact_external'],
      },
    });

    await store.getState().actions.save();

    expect(adapter.saveCalls).toHaveLength(2);
    const reloaded = createPlayerStore({ caseId: 'case_external_set', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual([
      'fact_initial',
      'fact_external',
    ]);
  });

  it('persists a valid in-place collection mutation after an established save', async () => {
    const adapter = new MemoryAdapter();
    const store = createPlayerStore({ caseId: 'case_in_place', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_initial']);
    await store.getState().actions.save();
    store.getState().playerState.knownFactIds.push('fact_in_place');

    await store.getState().actions.save();

    expect(adapter.saveCalls).toHaveLength(2);
    const reloaded = createPlayerStore({ caseId: 'case_in_place', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual([
      'fact_initial',
      'fact_in_place',
    ]);
  });

  it('rejects invalid external setState content even when the revision is unchanged', async () => {
    const adapter = new MemoryAdapter();
    const store = createPlayerStore({ caseId: 'case_invalid_external', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_initial']);
    await store.getState().actions.save();
    const current = store.getState().playerState;
    store.setState({
      playerState: {
        ...current,
        knownFactIds: [...current.knownFactIds, 'fact_initial'],
      },
    });

    await expect(store.getState().actions.save()).rejects.toMatchObject({
      name: 'PlayerStoreValidationError',
      operation: 'save',
      caseId: 'case_invalid_external',
    });
    expect(adapter.saveCalls).toHaveLength(1);
  });

  it('rejects an invalid in-place collection mutation after an established save', async () => {
    const adapter = new MemoryAdapter();
    const store = createPlayerStore({ caseId: 'case_invalid_in_place', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_initial']);
    await store.getState().actions.save();
    store.getState().playerState.knownFactIds.push('fact_initial');

    await expect(store.getState().actions.save()).rejects.toMatchObject({
      name: 'PlayerStoreValidationError',
      operation: 'save',
      caseId: 'case_invalid_in_place',
    });
    expect(adapter.saveCalls).toHaveLength(1);
  });

  it('deduplicates a repeated save when validated state content is unchanged', async () => {
    const adapter = new MemoryAdapter();
    const store = createPlayerStore({ caseId: 'case_unchanged', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_initial']);

    await store.getState().actions.save();
    await store.getState().actions.save();

    expect(adapter.saveCalls).toHaveLength(1);
  });

  it('replays an immediate pre-hydrate action onto the persisted baseline and saves it', async () => {
    const adapter = new MemoryAdapter();
    adapter.saved.set('case_pre_hydrate', {
      ...createInitialPlayerState('case_pre_hydrate', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({ caseId: 'case_pre_hydrate', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_immediate']);

    await store.getState().actions.hydrate();
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_immediate',
    ]);
    await store.getState().actions.save();

    const reloaded = createPlayerStore({ caseId: 'case_pre_hydrate', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_immediate',
    ]);
  });

  it('marks empty-storage hydration ready without losing pre-hydrate progress', async () => {
    const adapter = new MemoryAdapter();
    const store = createPlayerStore({ caseId: 'case_empty_hydrate', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_immediate']);

    await store.getState().actions.hydrate();

    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual(['fact_immediate']);
    await store.getState().actions.save();
    const reloaded = createPlayerStore({ caseId: 'case_empty_hydrate', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_immediate']);
  });

  it('makes hydrate a one-shot no-op after successful readiness', async () => {
    const adapter = new MemoryAdapter();
    adapter.saved.set('case_hydrate_once', createInitialPlayerState('case_hydrate_once', T0));
    const store = createPlayerStore({ caseId: 'case_hydrate_once', adapter, now: () => T1 });

    await store.getState().actions.hydrate();
    store.getState().actions.learnFacts(['fact_after_ready']);
    await store.getState().actions.hydrate();

    expect(adapter.loadCalls).toEqual(['case_hydrate_once']);
    expect(store.getState().playerState.knownFactIds).toEqual(['fact_after_ready']);
  });

  it('retries failed hydration without losing pre-hydrate intent', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_hydrate_retry', {
      ...createInitialPlayerState('case_hydrate_retry', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({ caseId: 'case_hydrate_retry', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_pre_retry']);

    const failed = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 1);
    adapter.rejectNextLoad();
    await expect(failed).rejects.toThrow('load failed');
    expect(store.getState().hydrationStatus).toBe('idle');

    const retry = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 2);
    adapter.releaseNextLoad();
    await retry;
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_pre_retry',
    ]);
    await store.getState().actions.save();
    adapter.pauseLoads = false;
    const reloaded = createPlayerStore({ caseId: 'case_hydrate_retry', adapter, now: () => T2 });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_pre_retry',
    ]);
  });

  it('releases failed hydration ownership before an idle subscriber retries', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_subscriber_retry', {
      ...createInitialPlayerState('case_subscriber_retry', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({
      caseId: 'case_subscriber_retry',
      adapter,
      now: () => T1,
    });
    store.getState().actions.learnFacts(['fact_pre_retry']);

    let retry: Promise<void> | null = null;
    const unsubscribe = store.subscribe((state, previousState) => {
      if (
        previousState.hydrationStatus === 'hydrating' &&
        state.hydrationStatus === 'idle'
      ) {
        retry = state.actions.hydrate();
        void retry.catch(() => undefined);
      }
    });

    const firstHydration = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 1);
    adapter.rejectNextLoad();
    await expect(firstHydration).rejects.toThrow('load failed');
    await waitForCount(adapter.loadStarts, 2);

    adapter.releaseNextLoad();
    if (retry === null) throw new Error('Idle subscriber did not start hydration retry.');
    await retry;
    unsubscribe();

    expect(adapter.loadStarts).toEqual(['case_subscriber_retry', 'case_subscriber_retry']);
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_pre_retry',
    ]);
  });

  it('hydrates before an initial save so persisted and pre-hydrate progress are merged', async () => {
    const adapter = new MemoryAdapter();
    adapter.saved.set('case_save_before_hydrate', {
      ...createInitialPlayerState('case_save_before_hydrate', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({
      caseId: 'case_save_before_hydrate',
      adapter,
      now: () => T1,
    });
    store.getState().actions.learnFacts(['fact_pre_save']);

    await store.getState().actions.save();

    expect(store.getState().hydrationStatus).toBe('hydrated');
    const reloaded = createPlayerStore({
      caseId: 'case_save_before_hydrate',
      adapter,
      now: () => T2,
    });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_pre_save',
    ]);
  });

  it('makes a successful pre-hydrate clear authoritative and preserves later progress', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseClears = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_clear_before_hydrate', {
      ...createInitialPlayerState('case_clear_before_hydrate', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({
      caseId: 'case_clear_before_hydrate',
      adapter,
      now: () => T1,
    });
    store.getState().actions.learnFacts(['fact_before_clear']);

    const clear = store.getState().actions.clear();
    await waitForCount(adapter.clearStarts, 1);
    const hydration = store.getState().actions.hydrate();
    adapter.releaseNextClear();
    await clear;
    await hydration;
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([]);
    await store.getState().actions.hydrate();
    expect(adapter.loadCalls).toEqual([]);

    store.getState().actions.learnFacts(['fact_after_clear']);
    await store.getState().actions.save();
    const reloaded = createPlayerStore({
      caseId: 'case_clear_before_hydrate',
      adapter,
      now: () => T2,
    });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual(['fact_after_clear']);
  });

  it('does not let a pre-hydrate save repopulate storage after a concurrent clear', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseClears = true;
    adapter.pauseSaves = false;
    adapter.saved.set(
      'case_save_then_clear',
      createInitialPlayerState('case_save_then_clear', T0),
    );
    const store = createPlayerStore({
      caseId: 'case_save_then_clear',
      adapter,
      now: () => T1,
    });
    store.getState().actions.learnFacts(['fact_before_clear']);

    const save = store.getState().actions.save();
    await waitForCount(adapter.loadStarts, 1);
    const clear = store.getState().actions.clear();
    adapter.releaseNextLoad();
    await waitForCount(adapter.clearStarts, 1);
    adapter.releaseNextClear();
    await clear;
    await save;

    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([]);
    expect(adapter.saveCalls).toEqual([]);
    adapter.pauseLoads = false;
    expect(await adapter.load('case_save_then_clear')).toBeNull();
  });

  it('returns to idle after a clear cancels hydration and then fails', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseClears = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_clear_retry', {
      ...createInitialPlayerState('case_clear_retry', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({ caseId: 'case_clear_retry', adapter, now: () => T1 });
    store.getState().actions.learnFacts(['fact_pre_hydrate']);

    const save = store.getState().actions.save();
    await waitForCount(adapter.loadStarts, 1);
    const clear = store.getState().actions.clear();
    adapter.releaseNextLoad();
    await waitForCount(adapter.clearStarts, 1);
    adapter.rejectNextClear();

    await expect(clear).rejects.toThrow('clear failed');
    await save;
    expect(store.getState().hydrationStatus).toBe('idle');
    expect(adapter.saveCalls).toEqual([]);

    const retry = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 2);
    adapter.releaseNextLoad();
    await retry;
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_pre_hydrate',
    ]);
  });

  it('waits for an authoritative clear when hydrate is requested after invalidation', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseClears = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_hydrate_clear_hydrate', {
      ...createInitialPlayerState('case_hydrate_clear_hydrate', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({
      caseId: 'case_hydrate_clear_hydrate',
      adapter,
      now: () => T1,
    });

    const firstHydration = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 1);
    const clear = store.getState().actions.clear();
    let secondHydrationResolved = false;
    const secondHydration = store.getState().actions.hydrate().then(() => {
      secondHydrationResolved = true;
    });

    adapter.releaseNextLoad();
    await waitForCount(adapter.clearStarts, 1);
    expect(secondHydrationResolved).toBe(false);
    expect(store.getState().hydrationStatus).toBe('hydrating');

    adapter.releaseNextClear();
    await clear;
    await Promise.all([firstHydration, secondHydration]);
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([]);
    expect(adapter.loadStarts).toEqual(['case_hydrate_clear_hydrate']);
    adapter.pauseLoads = false;
    expect(await adapter.load('case_hydrate_clear_hydrate')).toBeNull();
  });

  it('hydrates the current generation when the invalidating clear rejects', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseLoads = true;
    adapter.pauseClears = true;
    adapter.pauseSaves = false;
    adapter.saved.set('case_hydrate_clear_reject', {
      ...createInitialPlayerState('case_hydrate_clear_reject', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({
      caseId: 'case_hydrate_clear_reject',
      adapter,
      now: () => T1,
    });
    store.getState().actions.learnFacts(['fact_pre_hydrate']);

    const firstHydration = store.getState().actions.hydrate();
    await waitForCount(adapter.loadStarts, 1);
    const clear = store.getState().actions.clear();
    let secondHydrationResolved = false;
    const secondHydration = store.getState().actions.hydrate().then(() => {
      secondHydrationResolved = true;
    });

    adapter.releaseNextLoad();
    await waitForCount(adapter.clearStarts, 1);
    expect(secondHydrationResolved).toBe(false);
    adapter.rejectNextClear();
    await expect(clear).rejects.toThrow('clear failed');
    await waitForCount(adapter.loadStarts, 2);
    expect(secondHydrationResolved).toBe(false);

    adapter.releaseNextLoad();
    await Promise.all([firstHydration, secondHydration]);
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([
      'fact_persisted',
      'fact_pre_hydrate',
    ]);
    adapter.pauseLoads = false;
    expect((await adapter.load('case_hydrate_clear_reject'))?.knownFactIds).toEqual([
      'fact_persisted',
    ]);
  });

  it('coalesces overlapping clears so a hypothetical second failure cannot win', async () => {
    const adapter = new FailOnSecondClearAdapter();
    adapter.saved.set('case_coalesced_clear', {
      ...createInitialPlayerState('case_coalesced_clear', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({
      caseId: 'case_coalesced_clear',
      adapter,
      now: () => T1,
    });
    store.getState().actions.learnFacts(['fact_live']);

    const firstClear = store.getState().actions.clear();
    const secondClear = store.getState().actions.clear();
    const clearResults = Promise.allSettled([firstClear, secondClear]);
    await waitForCount(adapter.clearStarts, 1);
    adapter.releaseFirstClear();
    const results = await clearResults;

    expect(secondClear).toBe(firstClear);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled']);
    expect(adapter.clearCalls).toEqual(['case_coalesced_clear']);
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([]);
    expect(await adapter.load('case_coalesced_clear')).toBeNull();

    await store.getState().actions.save();
    await store.getState().actions.save();
    expect(adapter.saveCalls).toHaveLength(1);
    expect(adapter.saveCalls[0]?.knownFactIds).toEqual([]);
    const reloaded = createPlayerStore({
      caseId: 'case_coalesced_clear',
      adapter,
      now: () => T2,
    });
    await reloaded.getState().actions.hydrate();
    expect(reloaded.getState().playerState.knownFactIds).toEqual([]);
  });

  it('coalesces a rejected clear and releases ownership for retry', async () => {
    const adapter = new FailFirstClearAdapter();
    adapter.saved.set('case_coalesced_clear_retry', {
      ...createInitialPlayerState('case_coalesced_clear_retry', T0),
      knownFactIds: ['fact_persisted'],
    });
    const store = createPlayerStore({
      caseId: 'case_coalesced_clear_retry',
      adapter,
      now: () => T1,
    });
    store.getState().actions.learnFacts(['fact_live']);

    const firstClear = store.getState().actions.clear();
    const secondClear = store.getState().actions.clear();
    const results = await Promise.allSettled([firstClear, secondClear]);

    expect(secondClear).toBe(firstClear);
    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    expect(adapter.clearCalls).toEqual(['case_coalesced_clear_retry']);
    expect(store.getState().hydrationStatus).toBe('idle');
    expect(store.getState().playerState.knownFactIds).toEqual(['fact_live']);
    expect((await adapter.load('case_coalesced_clear_retry'))?.knownFactIds).toEqual([
      'fact_persisted',
    ]);

    await store.getState().actions.clear();
    expect(adapter.clearCalls).toEqual([
      'case_coalesced_clear_retry',
      'case_coalesced_clear_retry',
    ]);
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([]);
    expect(await adapter.load('case_coalesced_clear_retry')).toBeNull();
  });

  it('releases clear ownership before a reset subscriber starts another clear', async () => {
    const adapter = new ControlledAdapter();
    adapter.pauseClears = true;
    adapter.pauseSaves = false;
    const store = createPlayerStore({
      caseId: 'case_clear_subscriber_retry',
      adapter,
      now: () => T1,
    });
    store.getState().actions.learnFacts(['fact_before_clear']);

    let subscriberClear: Promise<void> | null = null;
    let subscriberTriggered = false;
    const unsubscribe = store.subscribe((state, previousState) => {
      if (
        !subscriberTriggered &&
        previousState.hydrationStatus === 'idle' &&
        state.hydrationStatus === 'hydrated'
      ) {
        subscriberTriggered = true;
        subscriberClear = state.actions.clear();
        void subscriberClear.catch(() => undefined);
      }
    });

    const firstClear = store.getState().actions.clear();
    await waitForCount(adapter.clearStarts, 1);
    adapter.releaseNextClear();
    await firstClear;
    await waitForCount(adapter.clearStarts, 2);
    adapter.releaseNextClear();
    if (subscriberClear === null) throw new Error('Reset subscriber did not start clear.');
    await subscriberClear;
    unsubscribe();

    expect(adapter.clearCalls).toEqual([
      'case_clear_subscriber_retry',
      'case_clear_subscriber_retry',
    ]);
    expect(store.getState().hydrationStatus).toBe('hydrated');
    expect(store.getState().playerState.knownFactIds).toEqual([]);
  });
});
