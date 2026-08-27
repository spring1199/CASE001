import { evaluateCondition, type ConditionContext } from '@/game/engine/conditions';
import type { Lock } from '@/game/schema/case';

export type LockEvaluation = Readonly<{
  open: boolean;
  conditionMet: boolean;
  missingRequiredEvidenceCount: number;
}>;

export function evaluateLock(lock: Lock, context: ConditionContext): LockEvaluation {
  const conditionMet = evaluateCondition(lock.unlockWhen, context);
  const missingRequiredEvidenceCount = (lock.requiredEvidence ?? [])
    .filter((evidenceId) => !context.discoveredEvidenceIds.has(evidenceId))
    .length;

  return {
    open: conditionMet && missingRequiredEvidenceCount === 0,
    conditionMet,
    missingRequiredEvidenceCount,
  };
}

export function isLockOpen(lock: Lock, context: ConditionContext): boolean {
  return evaluateLock(lock, context).open;
}
