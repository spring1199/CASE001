import { describe, expect, it } from 'vitest';
import { projectVisibleArtifact } from '../../src/game/engine/projections';

const artifact = {
  id: 'artifact_test',
  title: 'Public title',
  payload: { body: 'Public body' },
  hiddenUntilFacts: ['fact_opened', 'fact_verified'],
};

describe('projectVisibleArtifact', () => {
  it('does not return a record while any reveal fact is unknown', () => {
    expect(projectVisibleArtifact(
      artifact,
      new Set(['fact_opened']),
    )).toBeNull();
  });

  it('returns public fields without reveal-gate metadata once visible', () => {
    expect(projectVisibleArtifact(
      artifact,
      new Set(['fact_opened', 'fact_verified']),
    )).toEqual({
      id: 'artifact_test',
      title: 'Public title',
      payload: { body: 'Public body' },
    });
  });

  it('returns records with no reveal gate', () => {
    expect(projectVisibleArtifact(
      { id: 'artifact_public', title: 'Already public' },
      new Set(),
    )).toEqual({ id: 'artifact_public', title: 'Already public' });
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
