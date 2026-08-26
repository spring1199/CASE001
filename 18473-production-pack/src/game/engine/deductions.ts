import type { Deduction } from '@/game/schema/case';

export type DeductionState = {
  evidenceIds: Set<string>;
  factIds: Set<string>;
};

export function canCompleteDeduction(deduction: Deduction, state: DeductionState): boolean {
  const prerequisites = deduction.prerequisiteFacts ?? [];
  if (!prerequisites.every((id) => state.factIds.has(id))) return false;

  const all = deduction.requiredAll ?? [];
  if (!all.every((id) => state.evidenceIds.has(id))) return false;

  const groups = deduction.requiredAnyGroups ?? [];
  if (groups.length === 0) return true;

  const matches = groups.flat().filter((id) => state.evidenceIds.has(id)).length;
  const minimum = deduction.minimumFromAnyGroup ?? groups.length;
  return matches >= minimum;
}
