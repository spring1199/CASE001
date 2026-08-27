import { describe, expect, it } from 'vitest';
import {
  createInitialCaseState,
  processEngineEvent,
  type CaseEngineEvent,
} from '../../src/game/engine/engine';
import { projectCaseView, type CaseView } from '../../src/game/engine/view';
import type { PlayerState } from '../../src/game/state/types';
import { loadMiniCase } from '../fixtures/mini-case';

const T0 = '2026-08-27T00:00:00.000Z';
const bundle = loadMiniCase();

function run(state: PlayerState, events: CaseEngineEvent[]): PlayerState {
  return events.reduce(
    (current, event) => processEngineEvent(bundle, current, event).state,
    state,
  );
}

const identityEvents: CaseEngineEvent[] = [
  { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_anchor', 'ev_m_hint1', 'ev_m_hint2'] },
  { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
];

const finaleEvents: CaseEngineEvent[] = [
  ...identityEvents,
  { type: 'discover-evidence', evidenceIds: ['ev_m_contra_a', 'ev_m_contra_b'] },
  { type: 'attempt-deduction', deductionId: 'ded_m_motive' },
  { type: 'place-timeline-event', eventId: 'tev_m_meeting', positionId: 'tpos_m_2' },
  { type: 'discover-evidence', evidenceIds: ['ev_m_edge_1', 'ev_m_edge_2', 'ev_m_final'] },
];

function viewJson(view: CaseView): string {
  return JSON.stringify(view);
}

describe('spoiler-safe projection', () => {
  it('withholds every gated record and secret fact ID before the reveal', () => {
    const state = run(createInitialCaseState(bundle, T0), [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_anchor', 'ev_m_hint1'] },
    ]);
    const view = projectCaseView(bundle, state);
    const json = viewJson(view);

    expect(json).not.toContain('fact_m_identity');
    expect(json).not.toContain('fact_m_motive');
    expect(json).not.toContain('ev_m_hidden');
    expect(json).not.toContain('char_m_alias');
    expect(view.characters.map(({ id }) => id)).toEqual(['char_m_resident']);
    expect(view.characters.every(({ aliasOfCharacterId }) => aliasOfCharacterId === null))
      .toBe(true);
    expect(view.graph.nodes.find((node) => node.id === 'node_m_alias')).toMatchObject({
      label: 'X7',
      identityRevealed: false,
    });
    expect(view.graph.edges.map(({ id }) => id)).toEqual(['edge_m_link']);
    expect(view.objectives.map(({ id }) => id)).not.toContain('obj_m_manual');
    expect(view.availableDeductions.map(({ id }) => id)).toEqual(['ded_m_identity']);
    expect(json).not.toContain('ded_m_motive');
    expect(view.finalChoice).toBeNull();
    expect(view.ending).toBeNull();
  });

  it('reveals the alias identity everywhere only after the reveal fact', () => {
    const state = run(createInitialCaseState(bundle, T0), identityEvents);
    const view = projectCaseView(bundle, state);

    expect(view.characters.map(({ id }) => id).sort())
      .toEqual(['char_m_alias', 'char_m_resident']);
    expect(view.characters.find(({ id }) => id === 'char_m_alias')?.aliasOfCharacterId)
      .toBe('char_m_resident');
    expect(view.graph.nodes.find((node) => node.id === 'node_m_alias')).toMatchObject({
      label: 'Оршин суугч',
      identityRevealed: true,
    });
    expect(view.graph.edges.map(({ id }) => id).sort())
      .toEqual(['edge_m_fixed', 'edge_m_link']);
    expect(view.availableDeductions.map(({ id }) => id)).toEqual(['ded_m_motive']);
    expect(view.completedDeductions).toEqual([
      { id: 'ded_m_identity', title: 'X7 бол оршин суугч', kind: 'deduction' },
    ]);
  });

  it('labels contradictions distinctly and reports threshold progress without evidence IDs', () => {
    const state = run(createInitialCaseState(bundle, T0), [
      { type: 'discover-evidence', evidenceIds: ['ev_m_key', 'ev_m_hint1'] },
    ]);
    const view = projectCaseView(bundle, state);
    const identity = view.availableDeductions.find(({ id }) => id === 'ded_m_identity');
    expect(identity).toMatchObject({
      kind: 'deduction',
      missingRequiredEvidenceCount: 1,
      thresholdMatched: 1,
      thresholdRequired: 2,
    });
    expect(JSON.stringify(view.availableDeductions)).not.toContain('ev_m_anchor');

    const contradictionView = projectCaseView(bundle, run(createInitialCaseState(bundle, T0), identityEvents));
    expect(contradictionView.availableDeductions.find(({ id }) => id === 'ded_m_motive'))
      .toMatchObject({ kind: 'contradiction' });
  });

  it('exposes edge confidence only from discovered supporting evidence', () => {
    const initial = createInitialCaseState(bundle, T0);
    expect(projectCaseView(bundle, initial).graph.edges[0]).toMatchObject({
      id: 'edge_m_link',
      confidence: 0,
      supportingEvidenceIds: [],
    });

    const withLogs = run(initial, [
      { type: 'discover-evidence', evidenceIds: ['ev_m_edge_1'] },
    ]);
    expect(projectCaseView(bundle, withLogs).graph.edges[0]).toMatchObject({
      confidence: 40,
      supportingEvidenceIds: ['ev_m_edge_1'],
    });
  });

  it('keeps the final choice hidden until eligible, then projects only choice-facing fields', () => {
    const almostReady = run(createInitialCaseState(bundle, T0), finaleEvents.slice(0, -1));
    expect(projectCaseView(bundle, almostReady).finalChoice).toBeNull();

    const ready = run(createInitialCaseState(bundle, T0), finaleEvents);
    const view = projectCaseView(bundle, ready);
    expect(view.finalChoice).toEqual([
      { id: 'ending_m_close', choiceLabel: 'CLOSE', description: 'Холболтыг тасалж хэргийг хаана.' },
      {
        id: 'ending_m_expose',
        choiceLabel: 'EXPOSE',
        description: 'Холболтыг баталгаажуулж байршлыг ил гаргана.',
      },
    ]);
    expect(viewJson(view)).not.toContain('revealsExactLocation');
    expect(viewJson(view)).not.toContain('gateLockId');
  });

  it('projects the selected ending outcome and hides the exact location on the canon branch', () => {
    const ready = run(createInitialCaseState(bundle, T0), finaleEvents);
    const closed = run(ready, [{ type: 'select-ending', endingId: 'ending_m_close' }]);
    const closedView = projectCaseView(bundle, closed);
    expect(closedView.finalChoice).toBeNull();
    expect(closedView.ending).toEqual({
      endingId: 'ending_m_close',
      title: 'CLOSE',
      description: 'Холболтыг тасалж хэргийг хаана.',
      exactLocationRevealed: false,
    });
    expect(closedView.graph.edges.find(({ id }) => id === 'edge_m_link')?.playerStatus)
      .toBe('severed');
    expect(closedView.unlockedContentIds).toContain('content_m_epilogue');

    const exposed = run(ready, [{ type: 'select-ending', endingId: 'ending_m_expose' }]);
    const exposedView = projectCaseView(bundle, exposed);
    expect(exposedView.ending?.exactLocationRevealed).toBe(true);
    expect(exposedView.graph.edges.find(({ id }) => id === 'edge_m_link')?.playerStatus)
      .toBe('confirmed');
  });

  it('never leaks unknown secret fact IDs at any stage of a full playthrough', () => {
    const secretFactIds = bundle.facts.filter(({ secret }) => secret).map(({ id }) => id);
    let state = createInitialCaseState(bundle, T0);

    for (const event of finaleEvents) {
      const known = new Set(state.knownFactIds);
      const json = viewJson(projectCaseView(bundle, state));
      for (const secretId of secretFactIds) {
        if (!known.has(secretId)) expect(json).not.toContain(secretId);
      }
      state = processEngineEvent(bundle, state, event).state;
    }
  });
});

describe('premature ending protection', () => {
  it('rejects an ending selection until the gate lock opens', () => {
    const initial = createInitialCaseState(bundle, T0);
    expect(processEngineEvent(bundle, initial, {
      type: 'select-ending',
      endingId: 'ending_m_close',
    }).outcomes).toEqual([
      { type: 'ending-rejected', endingId: 'ending_m_close', reason: 'not-eligible' },
    ]);

    const missingFinalEvidence = run(initial, finaleEvents.slice(0, -1));
    const stillRejected = processEngineEvent(bundle, missingFinalEvidence, {
      type: 'select-ending',
      endingId: 'ending_m_close',
    });
    expect(stillRejected.outcomes[0]).toMatchObject({ reason: 'not-eligible' });
  });

  it('locks the decision after the first selection', () => {
    const ready = run(createInitialCaseState(bundle, T0), finaleEvents);
    const decided = run(ready, [{ type: 'select-ending', endingId: 'ending_m_close' }]);

    const repeat = processEngineEvent(bundle, decided, {
      type: 'select-ending',
      endingId: 'ending_m_close',
    });
    expect(repeat.state).toBe(decided);
    expect(repeat.outcomes).toEqual([]);

    const flip = processEngineEvent(bundle, decided, {
      type: 'select-ending',
      endingId: 'ending_m_expose',
    });
    expect(flip.state).toBe(decided);
    expect(flip.outcomes).toEqual([
      { type: 'ending-rejected', endingId: 'ending_m_expose', reason: 'already-decided' },
    ]);
  });
});
