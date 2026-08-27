import { describe, expect, it } from 'vitest';
import {
  createInitialCaseState,
  processEngineEvent,
  type CaseEngineEvent,
} from '../../src/game/engine/engine';
import { projectCaseView } from '../../src/game/engine/view';
import { createSaveEnvelope, deserializeSave } from '../../src/game/persistence/save';
import type { PersistenceAdapter } from '../../src/game/persistence/adapter';
import { createCaseRuntime } from '../../src/game/runtime/case-runtime';
import { createPlayerStore } from '../../src/game/state/store';
import type { PlayerState } from '../../src/game/state/types';
import { loadMiniCase } from '../fixtures/mini-case';

const T0 = '2026-08-27T00:00:00.000Z';
const bundle = loadMiniCase();

const fullPlaythrough: CaseEngineEvent[] = [
  { type: 'discover-evidence', evidenceIds: ['ev_m_key'] },
  { type: 'discover-evidence', evidenceIds: ['ev_m_anchor', 'ev_m_hint1', 'ev_m_hint2'] },
  { type: 'pin-evidence', evidenceIds: ['ev_m_anchor'] },
  { type: 'attempt-deduction', deductionId: 'ded_m_identity' },
  { type: 'discover-evidence', evidenceIds: ['ev_m_contra_a', 'ev_m_contra_b'] },
  { type: 'attempt-deduction', deductionId: 'ded_m_motive' },
  { type: 'place-timeline-event', eventId: 'tev_m_meeting', positionId: 'tpos_m_2' },
  { type: 'discover-evidence', evidenceIds: ['ev_m_edge_1', 'ev_m_edge_2', 'ev_m_final'] },
  { type: 'confirm-graph-edges', edgeIds: ['edge_m_link'] },
  { type: 'select-ending', endingId: 'ending_m_close' },
];

function runPure(events: CaseEngineEvent[]): PlayerState {
  return events.reduce(
    (state, event) => processEngineEvent(bundle, state, event).state,
    createInitialCaseState(bundle, T0),
  );
}

function withoutTimestamps(state: PlayerState): Omit<PlayerState, 'timestamps'> {
  const clone: Partial<PlayerState> = { ...state };
  delete clone.timestamps;
  return clone as Omit<PlayerState, 'timestamps'>;
}

class MemoryAdapter implements PersistenceAdapter {
  saved = new Map<string, string>();

  async load(caseId: string): Promise<PlayerState | null> {
    const raw = this.saved.get(caseId);
    return raw === undefined ? null : deserializeSave(raw, caseId);
  }

  async save(state: PlayerState): Promise<void> {
    this.saved.set(
      state.caseId,
      JSON.stringify(createSaveEnvelope(state, state.timestamps.updatedAt)),
    );
  }

  async clear(caseId: string): Promise<void> {
    this.saved.delete(caseId);
  }
}

function createRuntimeHarness() {
  const adapter = new MemoryAdapter();
  let tick = 0;
  const clock = (): string =>
    new Date(Date.parse(T0) + (tick += 1000)).toISOString();
  const store = createPlayerStore({ caseId: 'case_mini', adapter, now: clock });
  store.setState((current) => ({
    ...current,
    playerState: createInitialCaseState(bundle, clock()),
    hydrationStatus: 'hydrated',
  }));
  return { adapter, store, runtime: createCaseRuntime(bundle, store) };
}

describe('synthetic mini-case end-to-end', () => {
  it('plays through the entire case on the pure engine', () => {
    const final = runPure(fullPlaythrough);
    const view = projectCaseView(bundle, final);

    expect(final.endingId).toBe('ending_m_close');
    expect(view.ending?.exactLocationRevealed).toBe(false);
    expect(view.completedDeductions.map(({ id }) => id).sort())
      .toEqual(['ded_m_identity', 'ded_m_motive']);
    expect(view.graph.edges.find(({ id }) => id === 'edge_m_link')?.playerStatus)
      .toBe('severed');
    expect([...final.unlockedContentIds].sort()).toEqual([
      'content_m_archive',
      'content_m_epilogue',
      'content_m_threshold',
      'content_m_vault',
    ]);
    expect(final.objectiveStates).toEqual({
      obj_m_start: 'completed',
      obj_m_identify: 'completed',
      obj_m_manual: 'active',
    });
  });

  it('drives the same playthrough through the runtime bridge with matching state', async () => {
    const { runtime, store } = createRuntimeHarness();

    for (const event of fullPlaythrough) {
      const result = runtime.dispatch(event);
      if (result.saveOperation !== null) await result.saveOperation;
    }

    const pure = runPure(fullPlaythrough);
    expect(withoutTimestamps(store.getState().playerState))
      .toEqual(withoutTimestamps(pure));
    expect(JSON.stringify(runtime.view()))
      .toBe(JSON.stringify(projectCaseView(bundle, pure)));
  });

  it('persists and saves through the store after every effective dispatch', async () => {
    const { adapter, runtime } = createRuntimeHarness();

    const effective = runtime.dispatch({ type: 'discover-evidence', evidenceIds: ['ev_m_key'] });
    expect(effective.changed).toBe(true);
    await effective.saveOperation;
    expect(adapter.saved.has('case_mini')).toBe(true);

    const noop = runtime.dispatch({ type: 'discover-evidence', evidenceIds: ['ev_m_key'] });
    expect(noop.changed).toBe(false);
    expect(noop.saveOperation).toBeNull();

    const rejected = runtime.dispatch({ type: 'attempt-deduction', deductionId: 'ded_m_identity' });
    expect(rejected.changed).toBe(false);
    expect(rejected.outcomes[0]).toMatchObject({ type: 'deduction-rejected' });
  });

  it('restores exact progression through save, reload, and hydration', async () => {
    const { adapter, runtime } = createRuntimeHarness();
    const midGame = fullPlaythrough.slice(0, 7);
    for (const event of midGame) {
      const result = runtime.dispatch(event);
      if (result.saveOperation !== null) await result.saveOperation;
    }

    const reloadedStore = createPlayerStore({ caseId: 'case_mini', adapter });
    await reloadedStore.getState().actions.hydrate();
    const restored = reloadedStore.getState().playerState;
    const pure = runPure(midGame);

    expect(withoutTimestamps(restored)).toEqual(withoutTimestamps(pure));

    const resumed = createCaseRuntime(bundle, reloadedStore);
    expect(resumed.settle().changed).toBe(false);
    for (const event of fullPlaythrough.slice(7)) {
      const result = resumed.dispatch(event);
      if (result.saveOperation !== null) await result.saveOperation;
    }
    expect(reloadedStore.getState().playerState.endingId).toBe('ending_m_close');
  });

  it('round-trips mid-game progression through the save envelope exactly', () => {
    const midGame = runPure(fullPlaythrough.slice(0, 8));
    const envelope = createSaveEnvelope(midGame, T0);
    const restored = deserializeSave(JSON.stringify(envelope), 'case_mini');
    expect(restored).toEqual(midGame);
  });

  it('heals a hydrated save whose derived unlocks were stripped', () => {
    const midGame = runPure(fullPlaythrough.slice(0, 8));
    const stripped: PlayerState = { ...midGame, unlockedContentIds: [], objectiveStates: {} };
    const adapter = new MemoryAdapter();
    const store = createPlayerStore({ caseId: 'case_mini', adapter });
    store.setState((current) => ({
      ...current,
      playerState: stripped,
      hydrationStatus: 'hydrated',
    }));

    const runtime = createCaseRuntime(bundle, store);
    const settled = runtime.settle();
    expect(settled.changed).toBe(true);
    expect([...store.getState().playerState.unlockedContentIds].sort())
      .toEqual([...midGame.unlockedContentIds].sort());
    expect(store.getState().playerState.objectiveStates).toEqual(midGame.objectiveStates);
  });
});
