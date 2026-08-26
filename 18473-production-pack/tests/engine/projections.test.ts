import { describe, expect, it } from 'vitest';
import { projectVisibleArtifact } from '../../src/game/engine/projections';

const artifact = {
  id: 'artifact_test',
  title: 'Public title',
  sourceArtifactId: 'source_test',
  description: 'Public description',
  tags: ['public', 'filterable'],
  grantsFacts: ['fact_internal'],
  hiddenUntilFacts: ['fact_opened', 'fact_verified'],
  canonicalCharacterId: 'char_internal',
  futureMetadata: { spoiler: true },
};

describe('projectVisibleArtifact', () => {
  it('does not return a record while any reveal fact is unknown', () => {
    expect(projectVisibleArtifact(
      artifact,
      new Set(['fact_opened']),
    )).toBeNull();
  });

  it('returns only explicitly allowed public fields once visible', () => {
    expect(projectVisibleArtifact(
      artifact,
      new Set(['fact_opened', 'fact_verified']),
    )).toEqual({
      id: 'artifact_test',
      title: 'Public title',
      sourceArtifactId: 'source_test',
      description: 'Public description',
      tags: ['public', 'filterable'],
    });
  });

  it('returns records with no reveal gate', () => {
    expect(projectVisibleArtifact(
      {
        id: 'artifact_public',
        title: 'Already public',
        sourceArtifactId: 'source_public',
        description: 'Visible from the start',
        tags: [],
        grantsFacts: ['fact_internal'],
      },
      new Set(),
    )).toEqual({
      id: 'artifact_public',
      title: 'Already public',
      sourceArtifactId: 'source_public',
      description: 'Visible from the start',
      tags: [],
    });
  });

  it('returns a frozen projection with cloned frozen tags', () => {
    const authored = structuredClone(artifact);
    const projection = projectVisibleArtifact(
      authored,
      new Set(['fact_opened', 'fact_verified']),
    );

    expect(projection).not.toBeNull();
    if (projection === null) throw new Error('expected visible projection');

    expect(projection.tags).not.toBe(authored.tags);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.tags)).toBe(true);
    expect(() => (projection.tags as string[]).push('mutated')).toThrow(TypeError);
    expect(authored.tags).toEqual(['public', 'filterable']);
  });

  it('is deterministic and does not mutate the authored record or known facts', () => {
    const authored = structuredClone(artifact);
    const knownFacts = new Set(['fact_opened', 'fact_verified']);
    const beforeFacts = [...knownFacts];

    const first = projectVisibleArtifact(authored, knownFacts);
    const second = projectVisibleArtifact(authored, knownFacts);

    expect(second).toEqual(first);
    expect(authored).toEqual(artifact);
    expect([...knownFacts]).toEqual(beforeFacts);
  });
});
