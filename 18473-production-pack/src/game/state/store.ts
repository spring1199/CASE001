import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';

import type { PersistenceAdapter } from '@/game/persistence/adapter';
import { playerStateSchema } from '@/game/state/schema';
import { createInitialPlayerState } from '@/game/state/types';
import type { FlagValue, ObjectiveState, PlayerState } from '@/game/state/types';

export type PlayerStoreActions = {
  discoverArtifacts(ids: string[]): void;
  discoverEvidence(ids: string[]): void;
  pinEvidence(ids: string[]): void;
  unpinEvidence(ids: string[]): void;
  unlockApps(ids: string[]): void;
  unlockContent(ids: string[]): void;
  completeDeductions(ids: string[]): void;
  learnFacts(ids: string[]): void;
  setObjectiveState(objectiveId: string, state: ObjectiveState): void;
  placeTimelineEvent(eventId: string, positionId: string): void;
  confirmGraphEdges(ids: string[]): void;
  severGraphEdges(ids: string[]): void;
  setFlag(flagId: string, value: FlagValue): void;
  setEnding(branchId: string | null, endingId: string | null): void;
  hydrate(): Promise<void>;
  save(): Promise<void>;
  clear(): Promise<void>;
};

export type PlayerStoreState = {
  playerState: PlayerState;
  hydrationStatus: 'idle' | 'hydrating' | 'hydrated';
  actions: PlayerStoreActions;
};

export type CreatePlayerStoreOptions = {
  caseId: string;
  adapter: PersistenceAdapter;
  now?: () => string;
};

export type PlayerStoreValidationOperation = 'hydrate' | 'save';

export class PlayerStoreValidationError extends Error {
  constructor(
    readonly operation: PlayerStoreValidationOperation,
    readonly caseId: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PlayerStoreValidationError';
  }
}

const defaultClock = (): string => new Date().toISOString();

type PlayerMutation = (state: PlayerState) => PlayerState;

type ActiveHydration = {
  generation: number;
  owner: symbol;
  operation: Promise<void>;
};

type ActiveClear = {
  generation: number;
  owner: symbol;
  operation: Promise<void>;
};

function latestIsoInstant(values: Array<string | null>): string {
  let latestValue: string | null = null;
  let latestInstant = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value === null) continue;
    const instant = Date.parse(value);
    if (!Number.isFinite(instant)) throw new RangeError(`Invalid ISO timestamp: "${value}".`);
    if (instant > latestInstant) {
      latestValue = value;
      latestInstant = instant;
    }
  }
  if (latestValue === null) throw new RangeError('At least one ISO timestamp is required.');
  return latestValue;
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, child]) => [key, canonicalizeJson(child)]),
  );
}

function fingerprintPlayerState(state: PlayerState): string {
  return JSON.stringify(canonicalizeJson(state));
}

function validateStorePlayerState(
  input: unknown,
  operation: PlayerStoreValidationOperation,
  expectedCaseId: string,
): PlayerState {
  const result = playerStateSchema.safeParse(input);
  if (!result.success) {
    throw new PlayerStoreValidationError(
      operation,
      expectedCaseId,
      `Cannot ${operation} invalid player state for case "${expectedCaseId}": ${z.prettifyError(result.error)}`,
      { cause: result.error },
    );
  }
  if (result.data.caseId !== expectedCaseId) {
    throw new PlayerStoreValidationError(
      operation,
      expectedCaseId,
      `Cannot ${operation} player state for case "${result.data.caseId}" into store for case "${expectedCaseId}".`,
    );
  }
  return result.data;
}

function appendUnique(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing);
  const additions = incoming.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return additions.length === 0 ? existing : [...existing, ...additions];
}

export function createPlayerStore(options: CreatePlayerStoreOptions): StoreApi<PlayerStoreState> {
  const now = options.now ?? defaultClock;
  let progressRevision = 0;
  let persistedFingerprint: string | null = null;
  let lifecycleGeneration = 0;
  let lifecycleTail = Promise.resolve();
  const mutationCaptures = new Set<PlayerMutation[]>();
  const initialHydrationMutations: PlayerMutation[] = [];
  mutationCaptures.add(initialHydrationMutations);
  let activeHydration: ActiveHydration | null = null;
  let activeClear: ActiveClear | null = null;

  return createStore<PlayerStoreState>((set, get) => {
    const enqueueLifecycle = (operation: () => Promise<void>): Promise<void> => {
      const result = lifecycleTail.then(operation);
      lifecycleTail = result.catch(() => undefined);
      return result;
    };

    const updateProgress = (change: PlayerMutation): void => {
      const current = get().playerState;
      const changed = change(current);
      if (changed === current && mutationCaptures.size === 0) return;
      const changedAt = now();
      const mutation: PlayerMutation = (state) => {
        const next = change(state);
        if (next === state) return state;
        const appliedAt = latestIsoInstant([
          state.timestamps.startedAt,
          state.timestamps.updatedAt,
          state.timestamps.lastPlayedAt,
          state.timestamps.lastSavedAt,
          changedAt,
        ]);
        return {
          ...next,
          timestamps: {
            ...next.timestamps,
            updatedAt: appliedAt,
            lastPlayedAt: appliedAt,
          },
        };
      };
      for (const capture of mutationCaptures) capture.push(mutation);
      if (changed === current) return;
      progressRevision += 1;
      set({ playerState: mutation(current) });
    };

    const saveLatestProgress = (requestedGeneration: number): Promise<void> => {
      return enqueueLifecycle(async () => {
        if (requestedGeneration !== lifecycleGeneration) return;

        while (requestedGeneration === lifecycleGeneration) {
          const revisionToSave = progressRevision;
          const current = validateStorePlayerState(
            get().playerState,
            'save',
            options.caseId,
          );
          const currentFingerprint = fingerprintPlayerState(current);
          if (persistedFingerprint === currentFingerprint) return;
          const savedAt = latestIsoInstant([
            current.timestamps.startedAt,
            current.timestamps.updatedAt,
            current.timestamps.lastPlayedAt,
            current.timestamps.lastSavedAt,
            now(),
          ]);
          const savedState = validateStorePlayerState(
            {
              ...current,
              timestamps: {
                ...current.timestamps,
                updatedAt: savedAt,
                lastSavedAt: savedAt,
              },
            },
            'save',
            options.caseId,
          );
          const savedFingerprint = fingerprintPlayerState(savedState);

          await options.adapter.save(savedState);
          if (requestedGeneration !== lifecycleGeneration) return;
          if (progressRevision !== revisionToSave) continue;

          const latestState = validateStorePlayerState(
            get().playerState,
            'save',
            options.caseId,
          );
          if (fingerprintPlayerState(latestState) !== currentFingerprint) continue;

          set({ playerState: savedState });
          if (requestedGeneration !== lifecycleGeneration) return;
          if (progressRevision !== revisionToSave) continue;
          const finalizedState = validateStorePlayerState(
            get().playerState,
            'save',
            options.caseId,
          );
          if (fingerprintPlayerState(finalizedState) !== savedFingerprint) continue;
          persistedFingerprint = savedFingerprint;
          return;
        }
      });
    };

    const appendIds = (
      key:
        | 'discoveredArtifactIds'
        | 'discoveredEvidenceIds'
        | 'pinnedEvidenceIds'
        | 'unlockedAppIds'
        | 'unlockedContentIds'
        | 'completedDeductionIds'
        | 'knownFactIds',
      ids: string[],
    ): void => {
      const orderedIds = [...ids];
      updateProgress((state) => {
        const nextIds = appendUnique(state[key], orderedIds);
        return nextIds === state[key] ? state : { ...state, [key]: nextIds };
      });
    };

    const moveGraphEdges = (
      ids: string[],
      targetKey: 'confirmedGraphEdgeIds' | 'severedGraphEdgeIds',
      oppositeKey: 'confirmedGraphEdgeIds' | 'severedGraphEdgeIds',
    ): void => {
      const orderedIds = [...ids];
      updateProgress((state) => {
        const moving = new Set(orderedIds);
        const target = appendUnique(state[targetKey], orderedIds);
        const opposite = state[oppositeKey].filter((id) => !moving.has(id));
        if (target === state[targetKey] && opposite.length === state[oppositeKey].length) {
          return state;
        }
        return { ...state, [targetKey]: target, [oppositeKey]: opposite };
      });
    };

    const hydrateInitialState = (): Promise<void> => {
      if (get().hydrationStatus === 'hydrated') return Promise.resolve();

      const requestedGeneration = lifecycleGeneration;
      if (activeHydration?.generation === requestedGeneration) {
        return activeHydration.operation;
      }

      set({ hydrationStatus: 'hydrating' });
      const owner = Symbol('player-store-hydration');
      const operation = enqueueLifecycle(async () => {
        try {
          if (requestedGeneration !== lifecycleGeneration) return;
          if (get().hydrationStatus === 'hydrated') return;
          const loadedInput = await options.adapter.load(options.caseId);
          if (requestedGeneration !== lifecycleGeneration) return;

          if (loadedInput === null) {
            set({ hydrationStatus: 'hydrated' });
            persistedFingerprint = null;
          } else {
            const loaded = validateStorePlayerState(
              loadedInput,
              'hydrate',
              options.caseId,
            );
            const playerState = initialHydrationMutations.reduce(
              (state, mutation) => mutation(state),
              loaded,
            );
            set({ playerState, hydrationStatus: 'hydrated' });
            const loadedFingerprint = fingerprintPlayerState(loaded);
            persistedFingerprint =
              fingerprintPlayerState(playerState) === loadedFingerprint
                ? loadedFingerprint
                : null;
          }

          mutationCaptures.delete(initialHydrationMutations);
          initialHydrationMutations.length = 0;
        } catch (error) {
          if (
            requestedGeneration === lifecycleGeneration &&
            activeHydration?.owner === owner
          ) {
            activeHydration = null;
            set({ hydrationStatus: 'idle' });
          }
          throw error;
        }
      });
      const hydration: ActiveHydration = { generation: requestedGeneration, owner, operation };
      activeHydration = hydration;
      void operation.then(
        () => {
          if (activeHydration === hydration) activeHydration = null;
        },
        () => {
          if (activeHydration === hydration) activeHydration = null;
        },
      );
      return operation;
    };

    const actions: PlayerStoreActions = {
      discoverArtifacts: (ids) => appendIds('discoveredArtifactIds', ids),
      discoverEvidence: (ids) => appendIds('discoveredEvidenceIds', ids),
      pinEvidence: (ids) => {
        const orderedIds = [...ids];
        updateProgress((state) => {
          const discovered = new Set(state.discoveredEvidenceIds);
          const nextIds = appendUnique(
            state.pinnedEvidenceIds,
            orderedIds.filter((id) => discovered.has(id)),
          );
          return nextIds === state.pinnedEvidenceIds
            ? state
            : { ...state, pinnedEvidenceIds: nextIds };
        });
      },
      unpinEvidence: (ids) => {
        const removing = new Set(ids);
        updateProgress((state) => {
          const remaining = state.pinnedEvidenceIds.filter((id) => !removing.has(id));
          return remaining.length === state.pinnedEvidenceIds.length
            ? state
            : { ...state, pinnedEvidenceIds: remaining };
        });
      },
      unlockApps: (ids) => appendIds('unlockedAppIds', ids),
      unlockContent: (ids) => appendIds('unlockedContentIds', ids),
      completeDeductions: (ids) => appendIds('completedDeductionIds', ids),
      learnFacts: (ids) => appendIds('knownFactIds', ids),
      setObjectiveState: (objectiveId, objectiveState) => {
        updateProgress((state) =>
          state.objectiveStates[objectiveId] === objectiveState
            ? state
            : {
                ...state,
                objectiveStates: { ...state.objectiveStates, [objectiveId]: objectiveState },
              },
        );
      },
      placeTimelineEvent: (eventId, positionId) => {
        updateProgress((state) => {
          const index = state.timelinePlacements.findIndex((item) => item.eventId === eventId);
          if (index === -1) {
            return {
              ...state,
              timelinePlacements: [...state.timelinePlacements, { eventId, positionId }],
            };
          }
          if (state.timelinePlacements[index]?.positionId === positionId) return state;
          const timelinePlacements = [...state.timelinePlacements];
          timelinePlacements[index] = { eventId, positionId };
          return { ...state, timelinePlacements };
        });
      },
      confirmGraphEdges: (ids) =>
        moveGraphEdges(ids, 'confirmedGraphEdgeIds', 'severedGraphEdgeIds'),
      severGraphEdges: (ids) =>
        moveGraphEdges(ids, 'severedGraphEdgeIds', 'confirmedGraphEdgeIds'),
      setFlag: (flagId, value) => {
        updateProgress((state) =>
          state.flags[flagId] === value
            ? state
            : { ...state, flags: { ...state.flags, [flagId]: value } },
        );
      },
      setEnding: (branchId, endingId) => {
        updateProgress((state) =>
          state.endingBranchId === branchId && state.endingId === endingId
            ? state
            : { ...state, endingBranchId: branchId, endingId },
        );
      },
      hydrate: hydrateInitialState,
      save: () => {
        const requestedGeneration = lifecycleGeneration;
        return hydrateInitialState().then(() => saveLatestProgress(requestedGeneration));
      },
      clear: () => {
        if (activeClear?.generation === lifecycleGeneration) return activeClear.operation;

        const requestedAt = now();
        const hydrationStatusAtRequest = get().hydrationStatus;
        lifecycleGeneration += 1;
        const requestedGeneration = lifecycleGeneration;
        const capturedMutations: PlayerMutation[] = [];
        mutationCaptures.add(capturedMutations);
        const owner = Symbol('player-store-clear');
        const operation = enqueueLifecycle(async () => {
          try {
            await options.adapter.clear(options.caseId);
            if (requestedGeneration !== lifecycleGeneration) return;

            const playerState = capturedMutations.reduce(
              (state, mutation) => mutation(state),
              createInitialPlayerState(options.caseId, requestedAt),
            );
            persistedFingerprint = null;
            mutationCaptures.delete(initialHydrationMutations);
            initialHydrationMutations.length = 0;
            if (activeClear?.owner === owner) activeClear = null;
            set({ playerState, hydrationStatus: 'hydrated' });
          } catch (error) {
            if (activeClear?.owner === owner) {
              activeClear = null;
              if (
                requestedGeneration === lifecycleGeneration &&
                hydrationStatusAtRequest !== 'hydrated'
              ) {
                set({ hydrationStatus: 'idle' });
              }
            }
            throw error;
          } finally {
            mutationCaptures.delete(capturedMutations);
          }
        });
        const clearOperation: ActiveClear = { generation: requestedGeneration, owner, operation };
        activeClear = clearOperation;
        void operation.then(
          () => {
            if (activeClear === clearOperation) activeClear = null;
          },
          () => {
            if (activeClear === clearOperation) activeClear = null;
          },
        );
        return operation;
      },
    };

    return {
      playerState: createInitialPlayerState(options.caseId, now()),
      hydrationStatus: 'idle',
      actions,
    };
  });
}
