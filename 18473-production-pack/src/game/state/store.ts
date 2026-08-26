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
  let activeSave: Promise<void> | null = null;

  return createStore<PlayerStoreState>((set, get) => {
    const updateProgress = (change: (state: PlayerState) => PlayerState): void => {
      const current = get().playerState;
      const changed = change(current);
      if (changed === current) return;
      const changedAt = now();
      progressRevision += 1;
      set({
        playerState: {
          ...changed,
          timestamps: {
            ...changed.timestamps,
            updatedAt: changedAt,
            lastPlayedAt: changedAt,
          },
        },
      });
    };

    const drainSave = async (): Promise<void> => {
      while (true) {
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
        if (progressRevision !== revisionToSave) continue;

        set({ playerState: savedState });
        if (progressRevision === revisionToSave) return;
      }
    };

    const saveLatestProgress = (): Promise<void> => {
      if (activeSave !== null) return activeSave;

      const trackedSave = drainSave().finally(() => {
        if (activeSave === trackedSave) activeSave = null;
      });
      activeSave = trackedSave;
      return trackedSave;
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
      updateProgress((state) => {
        const nextIds = appendUnique(state[key], ids);
        return nextIds === state[key] ? state : { ...state, [key]: nextIds };
      });
    };

    const moveGraphEdges = (
      ids: string[],
      targetKey: 'confirmedGraphEdgeIds' | 'severedGraphEdgeIds',
      oppositeKey: 'confirmedGraphEdgeIds' | 'severedGraphEdgeIds',
    ): void => {
      updateProgress((state) => {
        const moving = new Set(ids);
        const target = appendUnique(state[targetKey], ids);
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
      hydrate: async () => {
        const loaded = await options.adapter.load(options.caseId);
        if (loaded !== null) set({ playerState: loaded });
      },
      save: saveLatestProgress,
      clear: async () => {
        await options.adapter.clear(options.caseId);
        set({ playerState: createInitialPlayerState(options.caseId, now()) });
      },
    };

    return {
      playerState: createInitialPlayerState(options.caseId, now()),
      actions,
    };
  });
}
