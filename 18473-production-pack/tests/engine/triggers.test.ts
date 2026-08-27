import { describe, expect, it } from 'vitest';
import type { Trigger } from '../../src/game/schema/case';
import type { ConditionContext } from '../../src/game/engine/conditions';
import {
  computeUnlocks,
  evaluateTrigger,
} from '../../src/game/engine/triggers';

function contextWithFacts(factIds: readonly string[]): ConditionContext {
  return {
    knownFactIds: new Set(factIds),
    discoveredEvidenceIds: new Set<string>(),
    completedDeductionIds: new Set<string>(),
    completedObjectiveIds: new Set<string>(),
    viewedArtifactIds: new Set<string>(),
    selectedEndingId: null,
    edgeConfidence: () => 0,
  };
}

const triggers: Trigger[] = [
  {
    id: 'tr_single',
    when: { fact: 'fact_a' },
    effects: [
      { type: 'unlock', target: 'content_second' },
      { type: 'unlock', target: 'content_shared' },
    ],
  },
  {
    id: 'tr_all',
    when: { allFacts: ['fact_a', 'fact_b'] },
    effects: [
      { type: 'unlock', target: 'content_first' },
      { type: 'unlock', target: 'content_shared' },
    ],
  },
  {
    id: 'tr_unmet',
    when: { fact: 'fact_c' },
    effects: [{ type: 'unlock', target: 'content_never' }],
  },
];

describe('evaluateTrigger', () => {
  it('evaluates a single-fact condition', () => {
    expect(evaluateTrigger(triggers[0].when, contextWithFacts(['fact_a']))).toBe(true);
    expect(evaluateTrigger(triggers[0].when, contextWithFacts([]))).toBe(false);
  });

  it('requires every fact in an all-facts condition', () => {
    expect(evaluateTrigger(triggers[1].when, contextWithFacts(['fact_a', 'fact_b']))).toBe(true);
    expect(evaluateTrigger(triggers[1].when, contextWithFacts(['fact_a']))).toBe(false);
  });
});

describe('computeUnlocks', () => {
  it('keeps authored trigger and effect order while de-duplicating targets', () => {
    expect(computeUnlocks(
      triggers,
      contextWithFacts(['fact_a', 'fact_b']),
    )).toEqual(['content_second', 'content_shared', 'content_first']);
  });

  it('filters targets that are already unlocked', () => {
    expect(computeUnlocks(
      triggers,
      contextWithFacts(['fact_a', 'fact_b']),
      new Set(['content_shared']),
    )).toEqual(['content_second', 'content_first']);
  });

  it('is deterministic and does not mutate triggers or input sets', () => {
    const authored = structuredClone(triggers);
    const context = contextWithFacts(['fact_a', 'fact_b']);
    const unlocked = new Set(['content_shared']);
    const beforeFacts = [...context.knownFactIds];
    const beforeUnlocked = [...unlocked];

    const first = computeUnlocks(authored, context, unlocked);
    const second = computeUnlocks(authored, context, unlocked);

    expect(second).toEqual(first);
    expect(authored).toEqual(triggers);
    expect([...context.knownFactIds]).toEqual(beforeFacts);
    expect([...unlocked]).toEqual(beforeUnlocked);
  });
});
