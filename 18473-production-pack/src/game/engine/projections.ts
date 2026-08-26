import type { Evidence } from '@/game/schema/case';

export type VisibleEvidence = Readonly<{
  id: string;
  title: string;
  sourceArtifactId: string;
  description: string;
  tags: readonly string[];
}>;

/**
 * Docs require the projectVisibleArtifact API name. In Phase 01 it projects an
 * Evidence record because the authored artifact schema is explicitly deferred.
 */
export type VisibleArtifact = VisibleEvidence;

export function projectVisibleArtifact(
  evidence: Evidence,
  knownFactIds: ReadonlySet<string>,
): VisibleArtifact | null {
  if (evidence.hiddenUntilFacts?.some((factId) => !knownFactIds.has(factId))) {
    return null;
  }

  return Object.freeze({
    id: evidence.id,
    title: evidence.title,
    sourceArtifactId: evidence.sourceArtifactId,
    description: evidence.description,
    tags: Object.freeze([...evidence.tags]),
  });
}
