import { computeGraphConfidence } from '@/game/engine/graph-confidence';
import type { CaseBundle, Condition, GraphEdge } from '@/game/schema/case';
import type { PlayerState } from '@/game/state/types';

export type ConditionContext = Readonly<{
  knownFactIds: ReadonlySet<string>;
  discoveredEvidenceIds: ReadonlySet<string>;
  completedDeductionIds: ReadonlySet<string>;
  completedObjectiveIds: ReadonlySet<string>;
  viewedArtifactIds: ReadonlySet<string>;
  selectedEndingId: string | null;
  edgeConfidence: (edgeId: string) => number;
}>;

export function graphEdgesById(bundle: Pick<CaseBundle, 'graph'>): ReadonlyMap<string, GraphEdge> {
  const edges = new Map<string, GraphEdge>();
  for (const record of bundle.graph) {
    if (record.recordType === 'edge') edges.set(record.id, record);
  }
  return edges;
}

export function createConditionContext(
  bundle: Pick<CaseBundle, 'graph'>,
  state: PlayerState,
): ConditionContext {
  const discoveredEvidenceIds = new Set(state.discoveredEvidenceIds);
  const completedObjectiveIds = new Set(
    Object.entries(state.objectiveStates)
      .filter(([, objectiveState]) => objectiveState === 'completed')
      .map(([objectiveId]) => objectiveId),
  );
  const edges = graphEdgesById(bundle);

  return {
    knownFactIds: new Set(state.knownFactIds),
    discoveredEvidenceIds,
    completedDeductionIds: new Set(state.completedDeductionIds),
    completedObjectiveIds,
    viewedArtifactIds: new Set(state.discoveredArtifactIds),
    selectedEndingId: state.endingId,
    edgeConfidence: (edgeId) => {
      const edge = edges.get(edgeId);
      if (edge === undefined) return 0;
      return computeGraphConfidence(edge.confidenceSources, discoveredEvidenceIds).confidence;
    },
  };
}

export function evaluateCondition(condition: Condition, context: ConditionContext): boolean {
  if ('fact' in condition) {
    return context.knownFactIds.has(condition.fact);
  }
  if ('allFacts' in condition) {
    return condition.allFacts.every((factId) => context.knownFactIds.has(factId));
  }
  if ('evidence' in condition) {
    return context.discoveredEvidenceIds.has(condition.evidence);
  }
  if ('allEvidence' in condition) {
    return condition.allEvidence.every((evidenceId) =>
      context.discoveredEvidenceIds.has(evidenceId),
    );
  }
  if ('evidenceThreshold' in condition) {
    const matched = condition.evidenceThreshold.anyOf
      .filter((evidenceId) => context.discoveredEvidenceIds.has(evidenceId));
    return matched.length >= condition.evidenceThreshold.minimum;
  }
  if ('deductionCompleted' in condition) {
    return context.completedDeductionIds.has(condition.deductionCompleted);
  }
  if ('objectiveCompleted' in condition) {
    return context.completedObjectiveIds.has(condition.objectiveCompleted);
  }
  if ('artifactViewed' in condition) {
    return context.viewedArtifactIds.has(condition.artifactViewed);
  }
  if ('edgeConfidenceAtLeast' in condition) {
    return context.edgeConfidence(condition.edgeConfidenceAtLeast.edgeId)
      >= condition.edgeConfidenceAtLeast.minimum;
  }
  if ('endingSelected' in condition) {
    return context.selectedEndingId === condition.endingSelected;
  }
  if ('allOf' in condition) {
    return condition.allOf.every((child) => evaluateCondition(child, context));
  }
  return condition.anyOf.some((child) => evaluateCondition(child, context));
}
