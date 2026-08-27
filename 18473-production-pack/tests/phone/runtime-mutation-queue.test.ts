import { describe, expect, it, vi } from 'vitest';

import type { PlayerState } from '@/game/state/types';
import {
  RuntimeMutationError,
  RuntimeMutationQueue,
  shouldFocusAfterRuntimeOutcomes,
} from '@/phone/runtime-mutation-queue';

type Projection = Readonly<{ state: PlayerState; label: string }>;

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function stateWithEvidence(state: PlayerState, evidenceId: string): PlayerState {
  return { ...state, discoveredEvidenceIds: [...state.discoveredEvidenceIds, evidenceId] };
}

const initialState: PlayerState = {
  caseId: 'case_test',
  discoveredArtifactIds: [],
  discoveredEvidenceIds: [],
  pinnedEvidenceIds: [],
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
    startedAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    lastPlayedAt: '2026-08-27T00:00:00.000Z',
    lastSavedAt: null,
  },
};

describe('serialized runtime mutations', () => {
  it('executes deferred operations in order and snapshots latest applied state', async () => {
    let visibleState = initialState;
    const first = deferred<Projection>();
    const second = deferred<Projection>();
    const order: string[] = [];
    const queue = new RuntimeMutationQueue<PlayerState, Projection>({
      getLatestState: () => visibleState,
      persistProjectedState: async (state) => { order.push(`persist:${state.discoveredEvidenceIds.join(',')}`); },
      onPendingChange: vi.fn(),
    });

    const firstResult = queue.enqueue(
      async (state) => {
        order.push(`request:first:${state.discoveredEvidenceIds.join(',')}`);
        return first.promise;
      },
      (previous, projection) => {
        order.push(`apply:first:${previous.discoveredEvidenceIds.join(',')}`);
        visibleState = projection.state;
      },
    );
    const secondResult = queue.enqueue(
      async (state) => {
        order.push(`request:second:${state.discoveredEvidenceIds.join(',')}`);
        return second.promise;
      },
      (_previous, projection) => { visibleState = projection.state; },
    );

    await Promise.resolve();
    expect(order).toEqual(['request:first:']);
    const firstState = stateWithEvidence(initialState, 'first');
    first.resolve({ state: firstState, label: 'first' });
    await firstResult;
    expect(order).toEqual([
      'request:first:',
      'persist:first',
      'apply:first:',
      'request:second:first',
    ]);

    const secondState = stateWithEvidence(firstState, 'second');
    second.resolve({ state: secondState, label: 'second' });
    await secondResult;
    expect(visibleState.discoveredEvidenceIds).toEqual(['first', 'second']);
  });

  it('does not apply a projection when durable pre-save fails and allows a retry', async () => {
    let visibleState = initialState;
    let persistenceAttempts = 0;
    const apply = vi.fn((_previous: PlayerState, projection: Projection) => {
      visibleState = projection.state;
    });
    const pending: boolean[] = [];
    const projected = { state: stateWithEvidence(initialState, 'durable'), label: 'durable' };
    const queue = new RuntimeMutationQueue<PlayerState, Projection>({
      getLatestState: () => visibleState,
      persistProjectedState: async () => {
        persistenceAttempts += 1;
        if (persistenceAttempts === 1) throw new Error('quota');
      },
      onPendingChange: (value) => pending.push(value),
    });

    await expect(queue.enqueue(async () => projected, apply)).rejects.toMatchObject({
      stage: 'persist',
    } satisfies Partial<RuntimeMutationError>);
    expect(apply).not.toHaveBeenCalled();
    expect(visibleState).toBe(initialState);
    expect(pending.at(-1)).toBe(false);

    await expect(queue.enqueue(async () => projected, apply)).resolves.toBe(projected);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(visibleState).toBe(projected.state);
  });

  it('requests stable focus only for successful outcomes that remove their action control', () => {
    expect(shouldFocusAfterRuntimeOutcomes([{ type: 'deduction-completed', deductionId: 'opaque' }])).toBe(true);
    expect(shouldFocusAfterRuntimeOutcomes([{ type: 'edges-confirmed', edgeIds: ['opaque'] }])).toBe(true);
    expect(shouldFocusAfterRuntimeOutcomes([{ type: 'edges-severed', edgeIds: ['opaque'] }])).toBe(true);
    expect(shouldFocusAfterRuntimeOutcomes([{ type: 'ending-selected', endingId: 'opaque' }])).toBe(true);
    expect(shouldFocusAfterRuntimeOutcomes([{ type: 'deduction-rejected', deductionId: 'opaque', progress: {
      missingPrerequisiteCount: 0,
      missingRequiredEvidenceCount: 1,
      thresholdMatched: 1,
      thresholdRequired: 2,
    } }])).toBe(false);
  });
});
