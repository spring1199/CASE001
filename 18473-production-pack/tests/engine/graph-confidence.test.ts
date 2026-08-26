import { describe, expect, it } from 'vitest';
import {
  computeGraphConfidence,
  type GraphConfidenceContribution,
} from '../../src/game/engine/graph-confidence';

const contributions: GraphConfidenceContribution[] = [
  { evidenceId: 'ev_alpha', weight: 35 },
  { evidenceId: 'ev_beta', weight: 20 },
  { evidenceId: 'ev_alpha', weight: 99 },
  { evidenceId: 'ev_hidden', weight: 40 },
];

describe('computeGraphConfidence', () => {
  it('returns transparent applied sources for discovered evidence', () => {
    expect(computeGraphConfidence(
      contributions,
      new Set(['ev_alpha', 'ev_beta']),
    )).toEqual({
      confidence: 55,
      rawConfidence: 55,
      appliedSources: [
        { evidenceId: 'ev_alpha', weight: 35 },
        { evidenceId: 'ev_beta', weight: 20 },
      ],
    });
  });

  it('does not double-count duplicate authored evidence contributions', () => {
    const result = computeGraphConfidence(
      contributions,
      new Set(['ev_alpha']),
    );

    expect(result.rawConfidence).toBe(35);
    expect(result.appliedSources).toEqual([
      { evidenceId: 'ev_alpha', weight: 35 },
    ]);
  });

  it('clamps confidence to the inclusive percentage range', () => {
    expect(computeGraphConfidence(
      [{ evidenceId: 'ev_high', weight: 140 }],
      new Set(['ev_high']),
    )).toMatchObject({ confidence: 100, rawConfidence: 140 });

    expect(computeGraphConfidence(
      [{ evidenceId: 'ev_low', weight: -20 }],
      new Set(['ev_low']),
    )).toMatchObject({ confidence: 0, rawConfidence: -20 });
  });

  it('rejects non-finite authored weights', () => {
    expect(() => computeGraphConfidence(
      [{ evidenceId: 'ev_invalid', weight: Number.NaN }],
      new Set(['ev_invalid']),
    )).toThrowError(/finite number/);
  });

  it('is deterministic and does not mutate contributions or discovered evidence', () => {
    const authored = structuredClone(contributions);
    const discovered = new Set(['ev_alpha', 'ev_beta']);
    const beforeDiscovered = [...discovered];

    const first = computeGraphConfidence(authored, discovered);
    const second = computeGraphConfidence(authored, discovered);

    expect(second).toEqual(first);
    expect(authored).toEqual(contributions);
    expect([...discovered]).toEqual(beforeDiscovered);
  });
});
