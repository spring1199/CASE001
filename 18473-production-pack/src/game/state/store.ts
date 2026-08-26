import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PersistenceAdapter } from '@/game/persistence/adapter';
import { createInitialPlayerState } from '@/game/state/types';
import type { FlagValue, ObjectiveState, PlayerState } from '@/game/state/types';

export type PlayerStoreActions = {
  discoverArtifacts(ids: string[]): void;
  discoverEvidence(ids: string[]): void;
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
  actions: PlayerStoreActions;
};

export type CreatePlayerStoreOptions = {
  caseId: string;
  adapter: PersistenceAdapter;
  now?: () => string;
};

const defaultClock = (): string => new Date().toISOString();

type PlayerMutation = (state: PlayerState) => PlayerState;

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
  let persistedRevision: number | null = null;
  let lifecycleGeneration = 0;
  let lifecycleTail = Promise.resolve();
  const mutationCaptures = new Set<PlayerMutation[]>();

  return createStore<PlayerStoreState>((set, get) => {
    const enqueueLifecycle = (operation: () => Promise<void>): Promise<void> => {
      const result = lifecycleTail.then(operation);
      lifecycleTail = result.catch(() => undefined);
      return result;
    };

    const updateProgress = (change: PlayerMutation): void => {
      const current = get().playerState;
      const changed = change(current);
      if (changed === current) return;
      const changedAt = now();
      const mutation: PlayerMutation = (state) => {
        const next = change(state);
        return {
          ...(next === state ? state : next),
          timestamps: {
            ...(next === state ? state.timestamps : next.timestamps),
            updatedAt: changedAt,
            lastPlayedAt: changedAt,
          },
        };
      };
      progressRevision += 1;
      for (const capture of mutationCaptures) capture.push(mutation);
      set({ playerState: mutation(current) });
    };

    const saveLatestProgress = (requestedGeneration: number): Promise<void> => {
      return enqueueLifecycle(async () => {
        if (
          requestedGeneration !== lifecycleGeneration ||
          persistedRevision === progressRevision
        ) {
          return;
        }

        while (requestedGeneration === lifecycleGeneration) {
          const revisionToSave = progressRevision;
          const savedAt = now();
          const current = get().playerState;
          const savedState: PlayerState = {
            ...current,
            timestamps: {
              ...current.timestamps,
              updatedAt: savedAt,
              lastSavedAt: savedAt,
            },
          };

          await options.adapter.save(savedState);
          if (requestedGeneration !== lifecycleGeneration) return;
          if (progressRevision !== revisionToSave) continue;

          set({ playerState: savedState });
          if (requestedGeneration !== lifecycleGeneration) return;
          if (progressRevision !== revisionToSave) continue;
          persistedRevision = revisionToSave;
          return;
        }
      });
    };

    const appendIds = (
      key:
        | 'discoveredArtifactIds'
        | 'discoveredEvidenceIds'
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

    const actions: PlayerStoreActions = {
      discoverArtifacts: (ids) => appendIds('discoveredArtifactIds', ids),
      discoverEvidence: (ids) => appendIds('discoveredEvidenceIds', ids),
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
      hydrate: () => {
        const requestedGeneration = lifecycleGeneration;
        const capturedMutations: PlayerMutation[] = [];
        mutationCaptures.add(capturedMutations);
        return enqueueLifecycle(async () => {
          try {
            const loaded = await options.adapter.load(options.caseId);
            if (requestedGeneration !== lifecycleGeneration || loaded === null) return;

            const playerState = capturedMutations.reduce(
              (state, mutation) => mutation(state),
              loaded,
            );
            set({ playerState });
            persistedRevision =
              capturedMutations.length === 0 ? progressRevision : null;
          } finally {
            mutationCaptures.delete(capturedMutations);
          }
        });
      },
      save: () => saveLatestProgress(lifecycleGeneration),
      clear: () => {
        lifecycleGeneration += 1;
        const requestedGeneration = lifecycleGeneration;
        const capturedMutations: PlayerMutation[] = [];
        mutationCaptures.add(capturedMutations);
        return enqueueLifecycle(async () => {
          try {
            await options.adapter.clear(options.caseId);
            if (requestedGeneration !== lifecycleGeneration) return;

            const playerState = capturedMutations.reduce(
              (state, mutation) => mutation(state),
              createInitialPlayerState(options.caseId, now()),
            );
            set({ playerState });
            persistedRevision = null;
          } finally {
            mutationCaptures.delete(capturedMutations);
          }
        });
      },
    };

    return {
      playerState: createInitialPlayerState(options.caseId, now()),
      actions,
    };
  });
}
