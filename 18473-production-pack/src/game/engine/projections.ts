import type { Evidence } from '@/game/schema/case';

export type VisibleArtifact = Readonly<{
  id: string;
  title: string;
  sourceArtifactId: string;
  description: string;
  tags: readonly string[];
}>;

export function projectVisibleArtifact(
  artifact: Evidence,
  knownFactIds: ReadonlySet<string>,
): VisibleArtifact | null {
  if (artifact.hiddenUntilFacts?.some((factId) => !knownFactIds.has(factId))) {
    return null;
  }

  return Object.freeze({
    id: artifact.id,
    title: artifact.title,
    sourceArtifactId: artifact.sourceArtifactId,
    description: artifact.description,
    tags: Object.freeze([...artifact.tags]),
  });
}
