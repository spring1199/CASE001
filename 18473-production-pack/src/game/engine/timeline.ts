import type { ConditionContext } from '@/game/engine/conditions';
import type { CaseBundle, TimelineEvent, TimelinePosition } from '@/game/schema/case';

export type TimelineRecords = Readonly<{
  positions: readonly TimelinePosition[];
  events: readonly TimelineEvent[];
}>;

export function splitTimelineRecords(bundle: Pick<CaseBundle, 'timeline'>): TimelineRecords {
  const positions: TimelinePosition[] = [];
  const events: TimelineEvent[] = [];
  for (const record of bundle.timeline) {
    if (record.recordType === 'position') positions.push(record);
    else events.push(record);
  }
  positions.sort((left, right) => left.order - right.order);
  return { positions, events };
}

export function isTimelineEventVisible(
  event: TimelineEvent,
  context: ConditionContext,
): boolean {
  return (event.hiddenUntilFacts ?? []).every((factId) => context.knownFactIds.has(factId));
}

export type TimelinePlacementEvaluation = Readonly<{
  placeable: boolean;
  visible: boolean;
  missingRequiredEvidenceCount: number;
  positionAcceptable: boolean;
  correct: boolean;
}>;

export function evaluateTimelinePlacement(
  event: TimelineEvent,
  positionId: string,
  context: ConditionContext,
): TimelinePlacementEvaluation {
  const visible = isTimelineEventVisible(event, context);
  const missingRequiredEvidenceCount = (event.requiredEvidenceIds ?? [])
    .filter((evidenceId) => !context.discoveredEvidenceIds.has(evidenceId))
    .length;
  const positionAcceptable = event.acceptablePositionIds.includes(positionId);
  const placeable = visible && missingRequiredEvidenceCount === 0;

  return {
    placeable,
    visible,
    missingRequiredEvidenceCount,
    positionAcceptable,
    correct: placeable && positionAcceptable,
  };
}
