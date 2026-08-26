import { describe, expect, it } from 'vitest';
import {
  canCompleteDeduction,
  evaluateDeduction,
} from '../../src/game/engine/deductions';

const deduction = {
  id: 'ded_test',
  title: 'test',
  requiredAll: ['anchor'],
  requiredAnyGroups: [['a', 'b', 'c']],
  minimumFromAnyGroup: 2,
  prerequisiteFacts: ['opened'],
  grantsFacts: ['done'],
};

describe('evaluateDeduction', () => {
  it('reports completion and threshold progress when every requirement is met', () => {
    expect(evaluateDeduction(deduction, {
      evidenceIds: new Set(['anchor', 'a', 'b']),
      factIds: new Set(['opened']),
    })).toEqual({
      complete: true,
      missingPrerequisiteFactIds: [],
      missingRequiredEvidenceIds: [],
      threshold: {
        candidateEvidenceIds: ['a', 'b', 'c'],
        matchedEvidenceIds: ['a', 'b'],
        matched: 2,
        required: 2,
        remaining: 0,
      },
    });
  });

  it('reports missing prerequisites, required evidence, and threshold evidence', () => {
    expect(evaluateDeduction(deduction, {
      evidenceIds: new Set(['a']),
      factIds: new Set(),
    })).toEqual({
      complete: false,
      missingPrerequisiteFactIds: ['opened'],
      missingRequiredEvidenceIds: ['anchor'],
      threshold: {
        candidateEvidenceIds: ['a', 'b', 'c'],
        matchedEvidenceIds: ['a'],
        matched: 1,
        required: 2,
        remaining: 1,
      },
    });
  });

  it('counts distinct threshold candidates in authored order', () => {
    const overlappingGroups = {
      ...deduction,
      requiredAnyGroups: [['a', 'b'], ['b', 'c']],
      minimumFromAnyGroup: 3,
    };
    const state = {
      evidenceIds: new Set(['anchor', 'a', 'b']),
      factIds: new Set(['opened']),
    };

    expect(evaluateDeduction(overlappingGroups, state).threshold).toEqual({
      candidateEvidenceIds: ['a', 'b', 'c'],
      matchedEvidenceIds: ['a', 'b'],
      matched: 2,
      required: 3,
      remaining: 1,
    });
  });

  it('is deterministic and does not mutate authored data or player state', () => {
    const authored = structuredClone(deduction);
    const evidenceIds = new Set(['anchor', 'a', 'b']);
    const factIds = new Set(['opened']);
    const beforeEvidence = [...evidenceIds];
    const beforeFacts = [...factIds];

    const first = evaluateDeduction(authored, { evidenceIds, factIds });
    const second = evaluateDeduction(authored, { evidenceIds, factIds });

    expect(second).toEqual(first);
    expect(authored).toEqual(deduction);
    expect([...evidenceIds]).toEqual(beforeEvidence);
    expect([...factIds]).toEqual(beforeFacts);
  });
});

describe('canCompleteDeduction', () => {
  it('remains a boolean compatibility wrapper', () => {
    expect(canCompleteDeduction(deduction, {
      evidenceIds: new Set(['anchor', 'a', 'b']),
      factIds: new Set(['opened']),
    })).toBe(true);

    expect(canCompleteDeduction(deduction, {
      evidenceIds: new Set(['anchor', 'a']),
      factIds: new Set(['opened']),
    })).toBe(false);
  });
});
