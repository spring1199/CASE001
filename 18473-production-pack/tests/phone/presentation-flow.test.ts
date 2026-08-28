import { describe, expect, it } from 'vitest';

import type { CaseView } from '@/game/engine/view';
import {
  createPresentationSnapshot,
  derivePresentationChange,
  presentationRecordsForIds,
} from '@/phone/polish/presentation-flow';

function view(overrides: Partial<CaseView> = {}): CaseView {
  return {
    caseId: 'case_visible',
    title: 'Visible case',
    characters: [],
    objectives: [],
    evidence: [],
    completedDeductions: [],
    availableDeductions: [],
    timelinePositions: [],
    timelineEvents: [],
    graph: { nodes: [], edges: [] },
    openLockIds: [],
    unlockedContentIds: [],
    finalChoice: null,
    ending: null,
    progression: {
      discoveredEvidenceCount: 0,
      completedDeductionCount: 0,
      activeObjectiveCount: 0,
      completedObjectiveCount: 0,
    },
    ...overrides,
  };
}

describe('state-derived presentation flow', () => {
  it('gives two distinct completed deductions stable non-colliding acknowledgement keys', () => {
    const initial = createPresentationSnapshot(view());
    const firstView = view({
      completedDeductions: [{
        id: 'deduction-visible-a',
        title: 'First visible deduction',
        kind: 'deduction',
        presentationTags: ['ordinary'],
      }],
    });
    const first = derivePresentationChange(
      initial,
      createPresentationSnapshot(firstView),
      [{ type: 'deduction-completed', deductionId: 'deduction-visible-a' }],
    );
    const secondView = view({
      completedDeductions: [
        ...firstView.completedDeductions,
        {
          id: 'deduction-visible-b',
          title: 'Second visible deduction',
          kind: 'contradiction',
          presentationTags: ['ordinary'],
        },
      ],
    });
    const second = derivePresentationChange(
      createPresentationSnapshot(firstView),
      createPresentationSnapshot(secondView),
      [{ type: 'deduction-completed', deductionId: 'deduction-visible-b' }],
    );

    expect(first?.records.map(({ id }) => id)).toEqual(['deduction:deduction-visible-a']);
    expect(second?.records.map(({ id }) => id)).toEqual(['deduction:deduction-visible-b']);
    expect(first?.key).not.toBe(second?.key);
    expect(first?.key).toContain('deduction-completed:deduction-visible-a');
    expect(second?.key).toContain('deduction-completed:deduction-visible-b');
  });

  it('uses newly completed projected deduction semantics for reveal priority', () => {
    const previous = createPresentationSnapshot(view());
    const f17 = derivePresentationChange(previous, createPresentationSnapshot(view({
      completedDeductions: [{
        id: 'visible-deduction',
        title: 'Projected reveal title',
        kind: 'deduction',
        presentationTags: ['f17'],
      }],
    })), [{ type: 'deduction-completed', deductionId: 'visible-deduction' }]);

    expect(f17).toMatchObject({ beat: 'f17', cue: 'reveal' });
    expect(f17?.records[0]).toMatchObject({
      id: 'deduction:visible-deduction',
      title: 'Projected reveal title',
      tags: ['f17'],
    });
  });

  it('routes confirmed/severed or confidence-changing GRAPH deltas to the graph cue before ordinary', () => {
    const edge = {
      id: 'edge-visible',
      fromNodeId: 'node-a',
      toNodeId: 'node-b',
      label: 'Visible relationship',
      kind: 'inferred' as const,
      confidence: 40,
      supportingEvidenceIds: [],
      playerStatus: 'unresolved' as const,
      playerCanConfirm: true,
      playerCanSever: true,
    };
    const previous = createPresentationSnapshot(view({
      graph: { nodes: [], edges: [edge] },
    }));
    const current = createPresentationSnapshot(view({
      graph: {
        nodes: [],
        edges: [{ ...edge, confidence: 73, playerStatus: 'confirmed' }],
      },
    }));
    const change = derivePresentationChange(previous, current, [{
      type: 'edges-confirmed',
      edgeIds: ['edge-visible'],
    }]);

    expect(change).toMatchObject({ beat: 'ordinary', cue: 'graph' });
    expect(change?.records[0]).toMatchObject({
      id: 'graph:edge-visible',
      title: 'Visible relationship',
      tags: ['graph'],
    });
    expect(presentationRecordsForIds(current, ['graph:edge-visible']))
      .toEqual(change?.records);
  });

  it('keeps ordinary evidence on the discovery cue', () => {
    const change = derivePresentationChange(
      createPresentationSnapshot(view()),
      createPresentationSnapshot(view({
        evidence: [{
          id: 'visible-evidence',
          title: 'Visible evidence',
          sourceArtifactId: 'visible-artifact',
          description: 'Visible description',
          tags: ['ordinary'],
          pinned: false,
        }],
      })),
      [{ type: 'evidence-discovered', evidenceIds: ['visible-evidence'] }],
    );

    expect(change).toMatchObject({ beat: 'ordinary', cue: 'discovery' });
  });
});
