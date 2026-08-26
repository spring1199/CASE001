import { describe, expect, it } from 'vitest';
import { canCompleteDeduction } from '../../src/game/engine/deductions';

const deduction = {
  id: 'ded_test',
  title: 'test',
  requiredAll: ['anchor'],
  requiredAnyGroups: [['a', 'b', 'c']],
  minimumFromAnyGroup: 2,
  prerequisiteFacts: ['opened'],
  grantsFacts: ['done'],
};

describe('canCompleteDeduction', () => {
  it('requires prerequisites, anchor, and threshold evidence', () => {
    expect(canCompleteDeduction(deduction, {
      evidenceIds: new Set(['anchor', 'a', 'b']),
      factIds: new Set(['opened']),
    })).toBe(true);
  });

  it('rejects insufficient identity clues', () => {
    expect(canCompleteDeduction(deduction, {
      evidenceIds: new Set(['anchor', 'a']),
      factIds: new Set(['opened']),
    })).toBe(false);
  });
});
