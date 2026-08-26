export type PlayerState = {
  caseId: string;
  discoveredEvidenceIds: string[];
  knownFactIds: string[];
  completedDeductionIds: string[];
  unlockedContentIds: string[];
  completedObjectiveIds: string[];
  flags: Record<string, boolean | number | string>;
  endingId?: string;
};

export const initialPlayerState: PlayerState = {
  caseId: 'case_001',
  discoveredEvidenceIds: [],
  knownFactIds: [],
  completedDeductionIds: [],
  unlockedContentIds: [],
  completedObjectiveIds: [],
  flags: {},
};
