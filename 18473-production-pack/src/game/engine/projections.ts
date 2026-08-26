export type RevealProtectedArtifact = {
  id: string;
  hiddenUntilFacts?: readonly string[];
};

export function projectVisibleArtifact<T extends RevealProtectedArtifact>(
  artifact: T,
  knownFactIds: ReadonlySet<string>,
): Omit<T, 'hiddenUntilFacts'> | null {
  const { hiddenUntilFacts, ...projection } = artifact;

  if (hiddenUntilFacts?.some((factId) => !knownFactIds.has(factId))) {
    return null;
  }

  return projection;
}
