import { isLockOpen } from '@/game/engine/locks';
import type { ConditionContext } from '@/game/engine/conditions';
import type { CaseBundle, Ending } from '@/game/schema/case';

/**
 * An ending without an authored gate lock is never selectable: eligibility
 * fails closed until the case author wires the final-choice gate.
 */
export function isEndingEligible(
  bundle: Pick<CaseBundle, 'locks'>,
  ending: Ending,
  context: ConditionContext,
): boolean {
  if (ending.gateLockId === undefined) return false;
  const gateLock = bundle.locks.find((lock) => lock.id === ending.gateLockId);
  if (gateLock === undefined) return false;
  return isLockOpen(gateLock, context);
}

export function eligibleEndings(
  bundle: Pick<CaseBundle, 'locks' | 'endings'>,
  context: ConditionContext,
): Ending[] {
  return bundle.endings.filter((ending) => isEndingEligible(bundle, ending, context));
}

export type EndingOutcome = Readonly<{
  endingId: string;
  title: string;
  description: string;
  exactLocationRevealed: boolean;
}>;

export function projectEndingOutcome(
  bundle: Pick<CaseBundle, 'endings'>,
  selectedEndingId: string | null,
): EndingOutcome | null {
  if (selectedEndingId === null) return null;
  const ending = bundle.endings.find((candidate) => candidate.id === selectedEndingId);
  if (ending === undefined) return null;

  return Object.freeze({
    endingId: ending.id,
    title: ending.title,
    description: ending.description,
    exactLocationRevealed: ending.revealsExactLocation === true,
  });
}
