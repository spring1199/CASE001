import { evaluateCondition, type ConditionContext } from '@/game/engine/conditions';
import type { Condition, Trigger } from '@/game/schema/case';

export function evaluateTrigger(
  condition: Condition,
  context: ConditionContext,
): boolean {
  return evaluateCondition(condition, context);
}

export function computeUnlocks(
  triggers: readonly Trigger[],
  context: ConditionContext,
  existingUnlockedTargetIds: ReadonlySet<string> = new Set<string>(),
): string[] {
  const seenTargetIds = new Set(existingUnlockedTargetIds);
  const unlockedTargetIds: string[] = [];

  for (const trigger of triggers) {
    if (!evaluateTrigger(trigger.when, context)) continue;

    for (const effect of trigger.effects) {
      if (seenTargetIds.has(effect.target)) continue;

      seenTargetIds.add(effect.target);
      unlockedTargetIds.push(effect.target);
    }
  }

  return unlockedTargetIds;
}
