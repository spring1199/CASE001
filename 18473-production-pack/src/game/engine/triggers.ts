import type { Condition, Trigger } from '@/game/schema/case';

export function evaluateTrigger(
  condition: Condition,
  knownFactIds: ReadonlySet<string>,
): boolean {
  if ('fact' in condition) {
    return knownFactIds.has(condition.fact);
  }

  return condition.allFacts.every((factId) => knownFactIds.has(factId));
}

export function computeUnlocks(
  triggers: readonly Trigger[],
  knownFactIds: ReadonlySet<string>,
  existingUnlockedTargetIds: ReadonlySet<string> = new Set<string>(),
): string[] {
  const seenTargetIds = new Set(existingUnlockedTargetIds);
  const unlockedTargetIds: string[] = [];

  for (const trigger of triggers) {
    if (!evaluateTrigger(trigger.when, knownFactIds)) continue;

    for (const effect of trigger.effects) {
      if (seenTargetIds.has(effect.target)) continue;

      seenTargetIds.add(effect.target);
      unlockedTargetIds.push(effect.target);
    }
  }

  return unlockedTargetIds;
}
