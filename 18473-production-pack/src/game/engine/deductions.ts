import type { Deduction } from '@/game/schema/case';

export type DeductionState = {
  evidenceIds: ReadonlySet<string>;
  factIds: ReadonlySet<string>;
};

export type DeductionThresholdProgress = {
  candidateEvidenceIds: string[];
  matchedEvidenceIds: string[];
  matched: number;
  required: number;
  remaining: number;
};

export type DeductionEvaluation = {
  complete: boolean;
  missingPrerequisiteFactIds: string[];
  missingRequiredEvidenceIds: string[];
  threshold: DeductionThresholdProgress;
};

function distinctInAuthoredOrder(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

export function evaluateDeduction(
  deduction: Deduction,
  state: DeductionState,
): DeductionEvaluation {
  const missingPrerequisiteFactIds = (deduction.prerequisiteFacts ?? [])
    .filter((id) => !state.factIds.has(id));
  const missingRequiredEvidenceIds = (deduction.requiredAll ?? [])
    .filter((id) => !state.evidenceIds.has(id));

  const groups = deduction.requiredAnyGroups ?? [];
  const candidateEvidenceIds = distinctInAuthoredOrder(groups.flat());
  const matchedEvidenceIds = candidateEvidenceIds
    .filter((id) => state.evidenceIds.has(id));
  const required = groups.length === 0
    ? 0
    : (deduction.minimumFromAnyGroup ?? groups.length);
  const remaining = Math.max(0, required - matchedEvidenceIds.length);

  return {
    complete: missingPrerequisiteFactIds.length === 0
      && missingRequiredEvidenceIds.length === 0
      && remaining === 0,
    missingPrerequisiteFactIds,
    missingRequiredEvidenceIds,
    threshold: {
      candidateEvidenceIds,
      matchedEvidenceIds,
      matched: matchedEvidenceIds.length,
      required,
      remaining,
    },
  };
}

export function canCompleteDeduction(deduction: Deduction, state: DeductionState): boolean {
  return evaluateDeduction(deduction, state).complete;
}
