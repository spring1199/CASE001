import { describe, expect, it } from 'vitest';
import {
  createConditionContext,
  evaluateCondition,
  type ConditionContext,
} from '../../src/game/engine/conditions';
import type { Condition } from '../../src/game/schema/case';
import { createInitialPlayerState } from '../../src/game/state/types';
import { loadMiniCase } from '../fixtures/mini-case';

function makeContext(overrides: Partial<{
  facts: string[];
  evidence: string[];
  deductions: string[];
  objectives: string[];
  artifacts: string[];
  endingId: string | null;
  edgeConfidence: (edgeId: string) => number;
}> = {}): ConditionContext {
  return {
    knownFactIds: new Set(overrides.facts ?? []),
    discoveredEvidenceIds: new Set(overrides.evidence ?? []),
    completedDeductionIds: new Set(overrides.deductions ?? []),
    completedObjectiveIds: new Set(overrides.objectives ?? []),
    viewedArtifactIds: new Set(overrides.artifacts ?? []),
    selectedEndingId: overrides.endingId ?? null,
    edgeConfidence: overrides.edgeConfidence ?? (() => 0),
  };
}

describe('evaluateCondition', () => {
  it('evaluates fact conditions', () => {
    expect(evaluateCondition({ fact: 'f1' }, makeContext({ facts: ['f1'] }))).toBe(true);
    expect(evaluateCondition({ fact: 'f1' }, makeContext())).toBe(false);
    expect(evaluateCondition(
      { allFacts: ['f1', 'f2'] },
      makeContext({ facts: ['f1', 'f2'] }),
    )).toBe(true);
    expect(evaluateCondition({ allFacts: ['f1', 'f2'] }, makeContext({ facts: ['f1'] }))).toBe(false);
  });

  it('evaluates evidence conditions including N-of-M thresholds', () => {
    expect(evaluateCondition({ evidence: 'e1' }, makeContext({ evidence: ['e1'] }))).toBe(true);
    expect(evaluateCondition({ evidence: 'e1' }, makeContext())).toBe(false);
    expect(evaluateCondition(
      { allEvidence: ['e1', 'e2'] },
      makeContext({ evidence: ['e1', 'e2'] }),
    )).toBe(true);
    expect(evaluateCondition(
      { allEvidence: ['e1', 'e2'] },
      makeContext({ evidence: ['e1'] }),
    )).toBe(false);

    const threshold: Condition = {
      evidenceThreshold: { anyOf: ['e1', 'e2', 'e3'], minimum: 2 },
    };
    expect(evaluateCondition(threshold, makeContext({ evidence: ['e1', 'e3'] }))).toBe(true);
    expect(evaluateCondition(threshold, makeContext({ evidence: ['e2'] }))).toBe(false);
  });

  it('evaluates deduction, objective, artifact, and ending conditions', () => {
    expect(evaluateCondition(
      { deductionCompleted: 'd1' },
      makeContext({ deductions: ['d1'] }),
    )).toBe(true);
    expect(evaluateCondition({ deductionCompleted: 'd1' }, makeContext())).toBe(false);
    expect(evaluateCondition(
      { objectiveCompleted: 'o1' },
      makeContext({ objectives: ['o1'] }),
    )).toBe(true);
    expect(evaluateCondition(
      { artifactViewed: 'a1' },
      makeContext({ artifacts: ['a1'] }),
    )).toBe(true);
    expect(evaluateCondition({ artifactViewed: 'a1' }, makeContext())).toBe(false);
    expect(evaluateCondition(
      { endingSelected: 'end1' },
      makeContext({ endingId: 'end1' }),
    )).toBe(true);
    expect(evaluateCondition(
      { endingSelected: 'end1' },
      makeContext({ endingId: 'end2' }),
    )).toBe(false);
  });

  it('evaluates graph-confidence thresholds through the context', () => {
    const context = makeContext({
      edgeConfidence: (edgeId) => (edgeId === 'edge1' ? 75 : 0),
    });
    expect(evaluateCondition(
      { edgeConfidenceAtLeast: { edgeId: 'edge1', minimum: 70 } },
      context,
    )).toBe(true);
    expect(evaluateCondition(
      { edgeConfidenceAtLeast: { edgeId: 'edge1', minimum: 80 } },
      context,
    )).toBe(false);
    expect(evaluateCondition(
      { edgeConfidenceAtLeast: { edgeId: 'edge_other', minimum: 1 } },
      context,
    )).toBe(false);
  });

  it('evaluates nested composite conditions', () => {
    const composite: Condition = {
      allOf: [
        { fact: 'f1' },
        { anyOf: [{ evidence: 'e1' }, { evidence: 'e2' }] },
      ],
    };
    expect(evaluateCondition(composite, makeContext({ facts: ['f1'], evidence: ['e2'] }))).toBe(true);
    expect(evaluateCondition(composite, makeContext({ facts: ['f1'] }))).toBe(false);
    expect(evaluateCondition(composite, makeContext({ evidence: ['e1'] }))).toBe(false);
  });
});

describe('createConditionContext', () => {
  it('derives every context set from player state', () => {
    const bundle = loadMiniCase();
    const state = {
      ...createInitialPlayerState('case_mini', '2026-08-27T00:00:00.000Z'),
      discoveredArtifactIds: ['art_seen'],
      discoveredEvidenceIds: ['ev_m_edge_1', 'ev_m_edge_2'],
      knownFactIds: ['fact_m_open'],
      completedDeductionIds: ['ded_m_identity'],
      objectiveStates: { obj_m_start: 'completed' as const, obj_m_identify: 'active' as const },
      endingId: 'ending_m_close',
      endingBranchId: 'ending_m_close',
    };

    const context = createConditionContext(bundle, state);
    expect(context.knownFactIds.has('fact_m_open')).toBe(true);
    expect(context.discoveredEvidenceIds.has('ev_m_edge_1')).toBe(true);
    expect(context.completedDeductionIds.has('ded_m_identity')).toBe(true);
    expect(context.completedObjectiveIds.has('obj_m_start')).toBe(true);
    expect(context.completedObjectiveIds.has('obj_m_identify')).toBe(false);
    expect(context.viewedArtifactIds.has('art_seen')).toBe(true);
    expect(context.selectedEndingId).toBe('ending_m_close');
  });

  it('computes deterministic edge confidence from discovered evidence', () => {
    const bundle = loadMiniCase();
    const initial = createInitialPlayerState('case_mini', '2026-08-27T00:00:00.000Z');
    expect(createConditionContext(bundle, initial).edgeConfidence('edge_m_link')).toBe(0);

    const partial = { ...initial, discoveredEvidenceIds: ['ev_m_edge_1'] };
    expect(createConditionContext(bundle, partial).edgeConfidence('edge_m_link')).toBe(40);

    const full = { ...initial, discoveredEvidenceIds: ['ev_m_edge_2', 'ev_m_edge_1'] };
    expect(createConditionContext(bundle, full).edgeConfidence('edge_m_link')).toBe(75);
    expect(createConditionContext(bundle, full).edgeConfidence('edge_unknown')).toBe(0);
  });
});
