import { describe, expect, it, vi } from 'vitest';

import {
  applyDiscoveryEffects,
  mergeDiscoveryEffects,
  normalizeDiscoveryEffects,
} from '@/phone/discovery';

describe('phone discovery effects', () => {
  it('stably de-duplicates every discovery ID', () => {
    expect(
      normalizeDiscoveryEffects({
        artifactIds: ['artifact-a', 'artifact-a', 'artifact-b'],
        evidenceIds: ['evidence-b', 'evidence-a', 'evidence-b'],
        unlockAppIds: ['files', 'files'],
        unlockContentIds: ['content-a', 'content-a', 'content-b'],
      }),
    ).toEqual({
      artifactIds: ['artifact-a', 'artifact-b'],
      evidenceIds: ['evidence-b', 'evidence-a'],
      unlockAppIds: ['files'],
      unlockContentIds: ['content-a', 'content-b'],
    });
  });

  it('merges effects without changing first-seen order', () => {
    expect(
      mergeDiscoveryEffects(
        { artifactIds: ['artifact-a'], unlockContentIds: ['content-a'] },
        {
          artifactIds: ['artifact-b', 'artifact-a'],
          evidenceIds: ['evidence-a'],
          unlockContentIds: ['content-b'],
        },
      ),
    ).toEqual({
      artifactIds: ['artifact-a', 'artifact-b'],
      evidenceIds: ['evidence-a'],
      unlockAppIds: [],
      unlockContentIds: ['content-a', 'content-b'],
    });
  });

  it('maps declarative effects only to the four permitted player-store actions', () => {
    const actions = {
      discoverArtifacts: vi.fn(),
      discoverEvidence: vi.fn(),
      unlockApps: vi.fn(),
      unlockContent: vi.fn(),
    };

    applyDiscoveryEffects(
      {
        artifactIds: ['artifact-a', 'artifact-a'],
        evidenceIds: ['evidence-a'],
        unlockAppIds: ['files'],
        unlockContentIds: ['content-a'],
      },
      actions,
    );

    expect(actions.discoverArtifacts).toHaveBeenCalledExactlyOnceWith(['artifact-a']);
    expect(actions.discoverEvidence).toHaveBeenCalledExactlyOnceWith(['evidence-a']);
    expect(actions.unlockApps).toHaveBeenCalledExactlyOnceWith(['files']);
    expect(actions.unlockContent).toHaveBeenCalledExactlyOnceWith(['content-a']);
  });

  it('does not dispatch empty discovery categories', () => {
    const actions = {
      discoverArtifacts: vi.fn(),
      discoverEvidence: vi.fn(),
      unlockApps: vi.fn(),
      unlockContent: vi.fn(),
    };

    applyDiscoveryEffects({}, actions);

    expect(Object.values(actions).every((action) => action.mock.calls.length === 0)).toBe(true);
  });
});
