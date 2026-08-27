import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { CaseView } from '@/game/engine/view';
import { PhoneChrome } from '@/phone/components/PhoneChrome';
import { EndingSequence } from '@/phone/polish/EndingSequence';
import { InvestigationWorkspace } from '@/phone/polish/InvestigationWorkspace';

const syntheticView: CaseView = {
  caseId: 'case_synthetic',
  title: 'Синтетик хэрэг',
  characters: [],
  objectives: [
    { id: 'objective_active', title: 'Дохионы эх үүсвэрийг шалгах', state: 'active' },
    { id: 'objective_complete', title: 'Төхөөрөмжийг нээх', state: 'completed' },
  ],
  evidence: [
    {
      id: 'evidence_signal',
      title: 'Дохионы бүртгэл',
      sourceArtifactId: 'artifact_signal',
      description: 'Сүлжээний цагийн тэмдэглэл.',
      tags: ['signal'],
      pinned: false,
    },
    {
      id: 'evidence_note',
      title: 'Гарын тэмдэглэл',
      sourceArtifactId: 'artifact_note',
      description: 'Огнооны тухай тэмдэглэл.',
      tags: ['timeline'],
      pinned: true,
    },
  ],
  completedDeductions: [
    { id: 'deduction_complete', title: 'Эхний холбоос', kind: 'deduction' },
  ],
  availableDeductions: [
    {
      id: 'deduction_available',
      title: 'Дохионы давхцал',
      kind: 'contradiction',
      missingRequiredEvidenceCount: 1,
      thresholdMatched: 2,
      thresholdRequired: 3,
    },
  ],
  timelinePositions: [
    { id: 'position_early', title: 'Эхэнд', order: 1 },
    { id: 'position_late', title: 'Дараа нь', order: 2 },
  ],
  timelineEvents: [
    {
      id: 'event_signal',
      title: 'Дохио бүртгэгдэв',
      placeable: true,
      missingRequiredEvidenceCount: 0,
      placedPositionId: null,
      placedCorrectly: false,
    },
  ],
  graph: {
    nodes: [
      { id: 'node_alpha', nodeType: 'person', label: 'Альфа', identityRevealed: true },
      { id: 'node_beta', nodeType: 'device', label: 'Бета', identityRevealed: false },
    ],
    edges: [
      {
        id: 'edge_alpha_beta',
        fromNodeId: 'node_alpha',
        toNodeId: 'node_beta',
        label: 'Дохионы холбоо',
        kind: 'inferred',
        confidence: 73,
        supportingEvidenceIds: ['evidence_signal', 'evidence_note'],
        playerStatus: 'unresolved',
        playerCanConfirm: true,
        playerCanSever: true,
      },
    ],
  },
  openLockIds: [],
  unlockedContentIds: [],
  finalChoice: [
    {
      id: 'ending_trace',
      choiceLabel: 'TRACE',
      description: 'Дохионы холбоог үргэлжлүүлэн дагана.',
    },
    {
      id: 'ending_sever',
      choiceLabel: 'SEVER',
      description: 'Дохионы холбоог тасалж, байршлыг нууц хэвээр үлдээнэ.',
    },
  ],
  ending: null,
  progression: {
    discoveredEvidenceCount: 2,
    completedDeductionCount: 1,
    activeObjectiveCount: 1,
    completedObjectiveCount: 1,
  },
};

describe('investigation workspace semantics', () => {
  it('renders objectives, evidence actions, deduction progress, timeline controls, and GRAPH state', () => {
    const markup = renderToStaticMarkup(
      <InvestigationWorkspace
        view={syntheticView}
        actionPending={false}
        onEvent={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="Мөрдлөгийн ажлын талбар"');
    expect(markup).toContain('>Зорилтууд</h2>');
    expect(markup).toContain('>Баримтууд</h2>');
    expect(markup).toContain('>Дүгнэлтүүд</h2>');
    expect(markup).toContain('>Цагийн шугам</h2>');
    expect(markup).toContain('>GRAPH</h2>');
    expect(markup).toContain('Самбарт тогтоох: Дохионы бүртгэл');
    expect(markup).toContain('Самбараас авах: Гарын тэмдэглэл');
    expect(markup).toContain('2 / 3 баримт таарсан');
    expect(markup).toContain('1 зайлшгүй баримт дутуу');
    expect(markup).toContain('<select');
    expect(markup).toContain('Дохио бүртгэгдэв — байрлал');
    expect(markup).toContain('data-graph-confidence="73"');
    expect(markup).toContain('73% итгэлцэл');
    expect(markup).toContain('2 баримтын эх үүсвэр');
    expect(markup).toContain('Шийдээгүй');
    expect(markup).toContain('Холбоог батлах');
    expect(markup).toContain('Холбоог таслах');
    expect(markup.indexOf('>Альфа</')).toBeLessThan(markup.indexOf('>Бета</'));
  });

  it('uses only projected ending labels and consequences without morality labels', () => {
    const markup = renderToStaticMarkup(
      <InvestigationWorkspace
        view={syntheticView}
        actionPending={false}
        onEvent={vi.fn()}
      />,
    );

    expect(markup).toContain('>TRACE</button>');
    expect(markup).toContain('Дохионы холбоог үргэлжлүүлэн дагана.');
    expect(markup).toContain('>SEVER</button>');
    expect(markup).toContain('байршлыг нууц хэвээр үлдээнэ.');
    expect(markup).not.toMatch(/GOOD|BAD|САЙН|МУУ/);
  });

  it('renders named Phone and Investigation top-level tabs', () => {
    const markup = renderToStaticMarkup(
      <PhoneChrome
        title="Аппын нүүр"
        screen="home"
        activeSurface="phone"
        canGoBack={false}
        canGoHome={false}
        headingRef={createRef<HTMLHeadingElement>()}
        scrollRegionRef={createRef<HTMLDivElement>()}
        onBack={vi.fn()}
        onHome={vi.fn()}
        onSurfaceChange={vi.fn()}
      >
        <p>Утасны агуулга</p>
      </PhoneChrome>,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Үндсэн ажлын талбар"');
    expect(markup).toContain('id="phone-surface-tab"');
    expect(markup).toContain('>Утас</button>');
    expect(markup).toContain('id="investigation-surface-tab"');
    expect(markup).toContain('>Мөрдлөг</button>');
  });
});

describe('ending sequence ordering', () => {
  const endingView: CaseView = {
    ...syntheticView,
    finalChoice: null,
    ending: {
      endingId: 'ending_synthetic',
      title: 'Шийдвэр бүртгэгдлээ',
      description: 'Сонголтын бодит үр дагавар хадгалагдав.',
      exactLocationRevealed: false,
    },
    graph: {
      ...syntheticView.graph,
      nodes: [
        ...syntheticView.graph.nodes,
        {
          id: 'postcredit_node',
          nodeType: 'account',
          label: 'NODE: 0',
          identityRevealed: false,
        },
      ],
    },
  };

  it.each(['decision', 'aftermath', 'closure'] as const)(
    'keeps post-credit graph records hidden during the %s stage',
    (stage) => {
      const markup = renderToStaticMarkup(
        <EndingSequence
          ending={endingView.ending!}
          graph={endingView.graph}
          initialStage={stage}
        />,
      );

      expect(markup).toContain(`data-ending-stage="${stage}"`);
      expect(markup).not.toContain('NODE: 0');
    },
  );

  it('reveals projected graph records only at the explicit post-credit stage', () => {
    const markup = renderToStaticMarkup(
      <EndingSequence
        ending={endingView.ending!}
        graph={endingView.graph}
        initialStage="postcredit"
      />,
    );

    expect(markup).toContain('data-ending-stage="postcredit"');
    expect(markup).toContain('NODE: 0');
    expect(markup).not.toMatch(/GOOD|BAD|САЙН|МУУ/);
  });
});
