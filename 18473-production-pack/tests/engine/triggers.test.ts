import { describe, expect, it } from 'vitest';
import type { Trigger } from '../../src/game/schema/case';
import {
  computeUnlocks,
  evaluateTrigger,
} from '../../src/game/engine/triggers';

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
    expect(evaluateTrigger(triggers[0].when, new Set(['fact_a']))).toBe(true);
    expect(evaluateTrigger(triggers[0].when, new Set())).toBe(false);
  });

  it('requires every fact in an all-facts condition', () => {
    expect(evaluateTrigger(triggers[1].when, new Set(['fact_a', 'fact_b']))).toBe(true);
    expect(evaluateTrigger(triggers[1].when, new Set(['fact_a']))).toBe(false);
  });
});

describe('computeUnlocks', () => {
  it('keeps authored trigger and effect order while de-duplicating targets', () => {
    expect(computeUnlocks(
      triggers,
      new Set(['fact_a', 'fact_b']),
    )).toEqual(['content_second', 'content_shared', 'content_first']);
  });

  it('filters targets that are already unlocked', () => {
    expect(computeUnlocks(
      triggers,
      new Set(['fact_a', 'fact_b']),
      new Set(['content_shared']),
    )).toEqual(['content_second', 'content_first']);
  });

  it('is deterministic and does not mutate triggers or input sets', () => {
    const authored = structuredClone(triggers);
    const facts = new Set(['fact_a', 'fact_b']);
    const unlocked = new Set(['content_shared']);
    const beforeFacts = [...facts];
    const beforeUnlocked = [...unlocked];

    const first = computeUnlocks(authored, facts, unlocked);
    const second = computeUnlocks(authored, facts, unlocked);

    expect(second).toEqual(first);
    expect(authored).toEqual(triggers);
    expect([...facts]).toEqual(beforeFacts);
    expect([...unlocked]).toEqual(beforeUnlocked);
  });
});
