import { describe, expect, it } from 'vitest';
import { case001Seed } from '../../src/game/content/case-001';
import {
  createInitialCaseState,
  processEngineEvent,
  settleEngineState,
} from '../../src/game/engine/engine';
import { analyzeCaseProgression } from '../../src/game/engine/progression';
import { projectCaseView } from '../../src/game/engine/view';
import type { PlayerState } from '../../src/game/state/types';

/**
 * Automated narrative gate tests from docs/14-TESTING-ACCEPTANCE.md, run
 * against the real authored Case #001 data. Facts that Phase 04 content will
 * grant are injected directly where a gate must be tested from both sides.
 */

const T0 = '2026-08-27T00:00:00.000Z';

function initialState(): PlayerState {
  return createInitialCaseState(case001Seed, T0);
}

function withFacts(state: PlayerState, factIds: string[]): PlayerState {
  const merged = [...new Set([...state.knownFactIds, ...factIds])];
  return settleEngineState(case001Seed, { ...state, knownFactIds: merged }).state;
}

function discover(state: PlayerState, evidenceIds: string[]): PlayerState {
  const result = processEngineEvent(case001Seed, state, {
    type: 'discover-evidence',
    evidenceIds,
  });
  return result.state;
}

describe('gate 1 — F17 canonical identity', () => {
  it('never renders the canonical identity before the reveal fact', () => {
    const view = projectCaseView(case001Seed, initialState());
    const json = JSON.stringify(view);

    expect(json).not.toContain('char_f17');
    expect(json).not.toContain('fact_f17_is_maral');
    expect(view.characters.every(({ aliasOfCharacterId }) => aliasOfCharacterId === null))
      .toBe(true);
  });

  it('reveals the alias linkage only after the reveal fact is known', () => {
    const revealed = withFacts(initialState(), ['fact_f17_is_maral']);
    const view = projectCaseView(case001Seed, revealed);
    expect(view.characters.find(({ id }) => id === 'char_f17')?.aliasOfCharacterId)
      .toBe('char_maral');
  });
});

describe('gate 2 — Winter 47 operator', () => {
  it('cannot be discovered or rendered before Reveal #1', () => {
    const state = initialState();
    const attempt = processEngineEvent(case001Seed, state, {
      type: 'discover-evidence',
      evidenceIds: ['ev_winter47_operator'],
    });
    expect(attempt.state).toBe(state);
    expect(attempt.outcomes).toEqual([
      { type: 'event-rejected', reason: 'unrecognized-id', ids: ['ev_winter47_operator'] },
    ]);
    expect(JSON.stringify(projectCaseView(case001Seed, state)))
      .not.toContain('ev_winter47_operator');
  });

  it('becomes discoverable after Reveal #1', () => {
    const revealed = withFacts(initialState(), ['fact_f17_is_maral']);
    const discovered = discover(revealed, ['ev_winter47_operator']);
    expect(discovered.discoveredEvidenceIds).toContain('ev_winter47_operator');
    expect(discovered.unlockedContentIds).toContain('audit_winter47');
  });
});

describe('gate 3 — Hope artifacts never confirm the live truth', () => {
  it('grants no live-status fact from Hope #1 or Hope #2 evidence', () => {
    const state = discover(initialState(), ['ev_bank_hope1', 'ev_device_hope2']);
    expect(state.knownFactIds).not.toContain('fact_tenuun_alive');
    expect(JSON.stringify(projectCaseView(case001Seed, state)))
      .not.toContain('fact_tenuun_alive');
  });

  it('keeps the live-truth fact exclusively behind its authored reveal deduction', () => {
    const grantors = case001Seed.evidence
      .filter((evidence) => (evidence.grantsFacts ?? []).includes('fact_tenuun_alive'));
    expect(grantors).toEqual([]);
    const deductions = case001Seed.deductions
      .filter((deduction) => deduction.grantsFacts.includes('fact_tenuun_alive'));
    expect(deductions.map(({ id }) => id)).toEqual(['ded_tenuun_alive']);
  });
});

describe('gate 4 — Hope #2 resolves to Bilguun', () => {
  it('keeps the authored resolution evidence discoverable alongside the hope clue', () => {
    const resolution = case001Seed.evidence.find(({ id }) => id === 'ev_bilguun_device');
    expect(resolution).toBeDefined();
    expect(resolution?.tags).toContain('hope2');
    const state = discover(initialState(), ['ev_device_hope2', 'ev_bilguun_device']);
    expect(state.discoveredEvidenceIds)
      .toEqual(expect.arrayContaining(['ev_device_hope2', 'ev_bilguun_device']));
  });
});

describe('gates 5 and 6 — final choice and SEVER location boundary', () => {
  const finalFacts = ['fact_tenuun_decoy', 'fact_tenuun_alive'];
  const finalEvidence = ['ev_maral_voice', 'ev_graph_confidence_tutorial'];

  it('cannot unlock the final choice without the required facts', () => {
    const missingFact = withFacts(
      discover(initialState(), finalEvidence),
      ['fact_tenuun_decoy'],
    );
    expect(projectCaseView(case001Seed, missingFact).finalChoice).toBeNull();
    expect(processEngineEvent(case001Seed, missingFact, {
      type: 'select-ending',
      endingId: 'ending_sever',
    }).outcomes).toEqual([
      { type: 'ending-rejected', endingId: 'ending_sever', reason: 'not-eligible' },
    ]);
  });

  it('cannot unlock the final choice without the required evidence', () => {
    const missingEvidence = withFacts(initialState(), finalFacts);
    expect(projectCaseView(case001Seed, missingEvidence).finalChoice).toBeNull();
  });

  it('unlocks both branches when the authored gate is satisfied', () => {
    const ready = withFacts(discover(initialState(), finalEvidence), finalFacts);
    const view = projectCaseView(case001Seed, ready);
    expect(view.finalChoice?.map(({ id }) => id).sort())
      .toEqual(['ending_sever', 'ending_trace']);
    expect(ready.unlockedContentIds).toContain('choice_final');
  });

  it('never reveals the exact location on the SEVER branch', () => {
    const ready = withFacts(discover(initialState(), finalEvidence), finalFacts);
    const severed = processEngineEvent(case001Seed, ready, {
      type: 'select-ending',
      endingId: 'ending_sever',
    }).state;
    expect(projectCaseView(case001Seed, severed).ending).toMatchObject({
      endingId: 'ending_sever',
      exactLocationRevealed: false,
    });

    const traced = processEngineEvent(case001Seed, ready, {
      type: 'select-ending',
      endingId: 'ending_trace',
    }).state;
    expect(projectCaseView(case001Seed, traced).ending?.exactLocationRevealed).toBe(true);
  });
});

describe('gate 7 — no explicit love confirmation exists in Case #001 content', () => {
  it('finds no love-confirmation phrasing anywhere in the authored bundle', () => {
    const authored = JSON.stringify({
      manifest: case001Seed.manifest,
      characters: case001Seed.characters,
      evidence: case001Seed.evidence,
      facts: case001Seed.facts,
      deductions: case001Seed.deductions,
      objectives: case001Seed.objectives,
      locks: case001Seed.locks,
      triggers: case001Seed.triggers,
      endings: case001Seed.endings,
      graph: case001Seed.graph,
      timeline: case001Seed.timeline,
    }).toLowerCase();

    expect(authored).not.toContain('хайртай');
    expect(authored).not.toContain('i love you');
  });
});

describe('gates 8, 9, 10 — reachability protection for Case #001', () => {
  it('has zero progression debt after Phase 04 integration', () => {
    const analysis = analyzeCaseProgression(case001Seed);
    expect(analysis.issues).toEqual([]);
    expect(case001Seed.manifest.progressionComplete).toBe(true);
  });

  it('has no dependency cycles in the authored chains', () => {
    const analysis = analyzeCaseProgression(case001Seed);
    expect(analysis.issues.filter(({ kind }) => kind === 'dependency-cycle')).toEqual([]);
  });

  it('places no required record behind the TRACE/SEVER branch choice', () => {
    const authoredConditions = JSON.stringify({
      objectives: case001Seed.objectives,
      locks: case001Seed.locks,
      triggers: case001Seed.triggers,
    });
    expect(authoredConditions).not.toContain('endingSelected');
  });
});
