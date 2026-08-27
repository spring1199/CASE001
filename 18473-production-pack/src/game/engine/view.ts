import { createConditionContext } from '@/game/engine/conditions';
import { eligibleEndings, projectEndingOutcome, type EndingOutcome } from '@/game/engine/endings';
import { evaluateDeduction } from '@/game/engine/deductions';
import { evaluateLock } from '@/game/engine/locks';
import { projectGraphView, type GraphView } from '@/game/engine/graph';
import { projectVisibleArtifact, type VisibleEvidence } from '@/game/engine/projections';
import {
  evaluateTimelinePlacement,
  isTimelineEventVisible,
  splitTimelineRecords,
} from '@/game/engine/timeline';
import type { CaseBundle, Deduction } from '@/game/schema/case';
import type { PlayerState } from '@/game/state/types';

export type ObjectiveView = Readonly<{
  id: string;
  title: string;
  state: 'active' | 'completed';
}>;

export type CharacterView = Readonly<{
  id: string;
  name: string;
  role: 'protagonist' | 'missing_person' | 'suspect' | 'family' | 'unknown';
  aliasOfCharacterId: string | null;
}>;

export type EvidenceView = VisibleEvidence & Readonly<{ pinned: boolean }>;

export type DeductionKind = NonNullable<Deduction['kind']>;

export type CompletedDeductionView = Readonly<{
  id: string;
  title: string;
  kind: DeductionKind;
}>;

export type AvailableDeductionView = CompletedDeductionView & Readonly<{
  missingRequiredEvidenceCount: number;
  thresholdMatched: number;
  thresholdRequired: number;
}>;

export type TimelinePositionView = Readonly<{
  id: string;
  title: string;
  order: number;
}>;

export type TimelineEventView = Readonly<{
  id: string;
  title: string;
  placeable: boolean;
  missingRequiredEvidenceCount: number;
  placedPositionId: string | null;
  placedCorrectly: boolean;
}>;

export type FinalChoiceOptionView = Readonly<{
  id: string;
  choiceLabel: string;
  description: string;
}>;

export type CaseProgressionView = Readonly<{
  discoveredEvidenceCount: number;
  completedDeductionCount: number;
  activeObjectiveCount: number;
  completedObjectiveCount: number;
}>;

export type CaseView = Readonly<{
  caseId: string;
  title: string;
  characters: readonly CharacterView[];
  objectives: readonly ObjectiveView[];
  evidence: readonly EvidenceView[];
  completedDeductions: readonly CompletedDeductionView[];
  availableDeductions: readonly AvailableDeductionView[];
  timelinePositions: readonly TimelinePositionView[];
  timelineEvents: readonly TimelineEventView[];
  graph: GraphView;
  openLockIds: readonly string[];
  unlockedContentIds: readonly string[];
  finalChoice: readonly FinalChoiceOptionView[] | null;
  ending: EndingOutcome | null;
  progression: CaseProgressionView;
}>;

/**
 * The only engine surface intended for UI consumption. Everything it returns
 * is information the player has legally reached: locked objectives, hidden
 * records, unmet deductions' evidence lists, gated identities, ineligible
 * endings, and unknown fact IDs are all withheld.
 */
export function projectCaseView(bundle: CaseBundle, state: PlayerState): CaseView {
  const context = createConditionContext(bundle, state);
  const knownFactIds = context.knownFactIds;
  const discoveredEvidenceIds = context.discoveredEvidenceIds;
  const pinnedEvidenceIds = new Set(state.pinnedEvidenceIds);
  const completedDeductionIds = new Set(state.completedDeductionIds);

  const characters: CharacterView[] = [];
  for (const character of bundle.characters) {
    const gateSatisfied = character.hiddenUntilFact === undefined
      || knownFactIds.has(character.hiddenUntilFact);
    if (!gateSatisfied || character.playerVisibleAtStart === false) continue;
    characters.push(Object.freeze({
      id: character.id,
      name: character.name,
      role: character.role,
      aliasOfCharacterId: character.canonicalCharacterId ?? null,
    }));
  }

  const objectives: ObjectiveView[] = [];
  let activeObjectiveCount = 0;
  let completedObjectiveCount = 0;
  for (const objective of bundle.objectives) {
    const objectiveState = state.objectiveStates[objective.id] ?? objective.state;
    if (objectiveState === 'locked') continue;
    objectives.push(Object.freeze({
      id: objective.id,
      title: objective.title,
      state: objectiveState,
    }));
    if (objectiveState === 'active') activeObjectiveCount += 1;
    else completedObjectiveCount += 1;
  }

  const evidence: EvidenceView[] = [];
  for (const record of bundle.evidence) {
    if (!discoveredEvidenceIds.has(record.id)) continue;
    const visible = projectVisibleArtifact(record, knownFactIds);
    if (visible === null) continue;
    evidence.push(Object.freeze({ ...visible, pinned: pinnedEvidenceIds.has(record.id) }));
  }

  const completedDeductions: CompletedDeductionView[] = [];
  const availableDeductions: AvailableDeductionView[] = [];
  for (const deduction of bundle.deductions) {
    const kind: DeductionKind = deduction.kind ?? 'deduction';
    if (completedDeductionIds.has(deduction.id)) {
      completedDeductions.push(Object.freeze({ id: deduction.id, title: deduction.title, kind }));
      continue;
    }
    const evaluation = evaluateDeduction(deduction, {
      evidenceIds: discoveredEvidenceIds,
      factIds: knownFactIds,
    });
    if (evaluation.missingPrerequisiteFactIds.length > 0) continue;
    availableDeductions.push(Object.freeze({
      id: deduction.id,
      title: deduction.title,
      kind,
      missingRequiredEvidenceCount: evaluation.missingRequiredEvidenceIds.length,
      thresholdMatched: evaluation.threshold.matched,
      thresholdRequired: evaluation.threshold.required,
    }));
  }

  const { positions, events } = splitTimelineRecords(bundle);
  const placementsByEventId = new Map(
    state.timelinePlacements.map((placement) => [placement.eventId, placement.positionId]),
  );
  const timelinePositions = positions.map((position): TimelinePositionView => Object.freeze({
    id: position.id,
    title: position.title,
    order: position.order,
  }));
  const timelineEvents: TimelineEventView[] = [];
  for (const event of events) {
    if (!isTimelineEventVisible(event, context)) continue;
    const placedPositionId = placementsByEventId.get(event.id) ?? null;
    const evaluation = evaluateTimelinePlacement(event, placedPositionId ?? '', context);
    timelineEvents.push(Object.freeze({
      id: event.id,
      title: event.title,
      placeable: evaluation.placeable,
      missingRequiredEvidenceCount: evaluation.missingRequiredEvidenceCount,
      placedPositionId,
      placedCorrectly: placedPositionId !== null && evaluation.correct,
    }));
  }

  const openLockIds = bundle.locks
    .filter((lock) => evaluateLock(lock, context).open)
    .map((lock) => lock.id);

  const ending = projectEndingOutcome(bundle, state.endingId);
  const finalChoice = ending !== null
    ? null
    : (() => {
      const options = eligibleEndings(bundle, context)
        .map((candidate): FinalChoiceOptionView => Object.freeze({
          id: candidate.id,
          choiceLabel: candidate.choiceLabel,
          description: candidate.description,
        }));
      return options.length === 0 ? null : Object.freeze(options);
    })();

  return Object.freeze({
    caseId: bundle.manifest.id,
    title: bundle.manifest.title,
    characters: Object.freeze(characters),
    objectives: Object.freeze(objectives),
    evidence: Object.freeze(evidence),
    completedDeductions: Object.freeze(completedDeductions),
    availableDeductions: Object.freeze(availableDeductions),
    timelinePositions: Object.freeze(timelinePositions),
    timelineEvents: Object.freeze(timelineEvents),
    graph: projectGraphView(bundle, state, context),
    openLockIds: Object.freeze(openLockIds),
    unlockedContentIds: Object.freeze([...state.unlockedContentIds]),
    finalChoice,
    ending,
    progression: Object.freeze({
      discoveredEvidenceCount: evidence.length,
      completedDeductionCount: completedDeductions.length,
      activeObjectiveCount,
      completedObjectiveCount,
    }),
  });
}
