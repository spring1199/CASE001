export type FlagValue = boolean | number | string;

export type ObjectiveState = 'locked' | 'active' | 'completed';

export type TimelinePlacement = {
  eventId: string;
  positionId: string;
};

export type PlayerTimestamps = {
  startedAt: string;
  updatedAt: string;
  lastPlayedAt: string;
  lastSavedAt: string | null;
};

export type PlayerState = {
  caseId: string;
  discoveredArtifactIds: string[];
  discoveredEvidenceIds: string[];
  unlockedAppIds: string[];
  unlockedContentIds: string[];
  completedDeductionIds: string[];
  knownFactIds: string[];
  objectiveStates: Record<string, ObjectiveState>;
  timelinePlacements: TimelinePlacement[];
  confirmedGraphEdgeIds: string[];
  severedGraphEdgeIds: string[];
  flags: Record<string, FlagValue>;
  endingBranchId: string | null;
  endingId: string | null;
  timestamps: PlayerTimestamps;
};

export function createInitialPlayerState(caseId: string, now: string): PlayerState {
  return {
    caseId,
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
      startedAt: now,
      updatedAt: now,
      lastPlayedAt: now,
      lastSavedAt: null,
    },
  };
}
