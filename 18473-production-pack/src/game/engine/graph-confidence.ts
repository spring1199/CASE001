export type GraphConfidenceContribution = Readonly<{
  evidenceId: string;
  weight: number;
}>;

export type GraphConfidenceEvaluation = {
  confidence: number;
  rawConfidence: number;
  appliedSources: GraphConfidenceContribution[];
};

export function computeGraphConfidence(
  contributions: readonly GraphConfidenceContribution[],
  discoveredEvidenceIds: ReadonlySet<string>,
): GraphConfidenceEvaluation {
  const seenEvidenceIds = new Set<string>();
  const appliedSources: GraphConfidenceContribution[] = [];

  for (const contribution of contributions) {
    if (!Number.isFinite(contribution.weight)) {
      throw new RangeError(
        `Graph confidence weight for "${contribution.evidenceId}" must be a finite number`,
      );
    }

    if (seenEvidenceIds.has(contribution.evidenceId)) continue;
    seenEvidenceIds.add(contribution.evidenceId);

    if (discoveredEvidenceIds.has(contribution.evidenceId)) {
      appliedSources.push({ ...contribution });
    }
  }

  const rawConfidence = appliedSources.reduce(
    (total, source) => total + source.weight,
    0,
  );

  return {
    confidence: Math.min(100, Math.max(0, rawConfidence)),
    rawConfidence,
    appliedSources,
  };
}
