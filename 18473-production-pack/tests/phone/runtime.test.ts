import { describe, expect, it, vi } from 'vitest';

import { createInitialPlayerState } from '@/game/state/types';
import { requestCasePhoneProjection } from '@/phone/case-runtime-client';
import { neutralPhoneContent } from '@/phone/data/neutral-seed';
import {
  commitPhoneDiscovery,
  initializePhonePlayer,
  phoneInitializationFailureMessage,
} from '@/phone/runtime';

const discovery = {
  artifactIds: ['neutral-voice-note'],
  evidenceIds: ['neutral-weather-detail'],
  unlockAppIds: ['files'] as const,
  unlockContentIds: ['neutral-receipt-file'],
};

function runtimeActions() {
  return {
    discoverArtifacts: vi.fn(),
    discoverEvidence: vi.fn(),
    unlockApps: vi.fn(),
    unlockContent: vi.fn(),
    save: vi.fn(() => Promise.resolve()),
  };
}

describe('phone runtime discovery', () => {
  it('does not dispatch, announce a new unlock, or save already-recorded effects', () => {
    const state = {
      ...createInitialPlayerState('case_test', '2026-08-26T00:00:00.000Z'),
      discoveredArtifactIds: ['neutral-voice-note'],
      discoveredEvidenceIds: ['neutral-weather-detail'],
      unlockedAppIds: ['files'],
      unlockedContentIds: ['neutral-receipt-file'],
    };
    const actions = runtimeActions();

    const result = commitPhoneDiscovery(discovery, state, actions);

    expect(result).toEqual({ kind: 'already-recorded', saveOperation: null });
    expect(actions.save).not.toHaveBeenCalled();
    expect(
      [
        actions.discoverArtifacts,
        actions.discoverEvidence,
        actions.unlockApps,
        actions.unlockContent,
      ].every((action) => action.mock.calls.length === 0),
    ).toBe(true);
  });

  it('dispatches only genuinely new IDs and saves once', async () => {
    const state = {
      ...createInitialPlayerState('case_test', '2026-08-26T00:00:00.000Z'),
      discoveredArtifactIds: ['neutral-voice-note'],
    };
    const actions = runtimeActions();

    const result = commitPhoneDiscovery(discovery, state, actions);

    expect(result.kind).toBe('content-unlocked');
    expect(actions.discoverArtifacts).not.toHaveBeenCalled();
    expect(actions.discoverEvidence).toHaveBeenCalledExactlyOnceWith([
      'neutral-weather-detail',
    ]);
    expect(actions.unlockApps).toHaveBeenCalledExactlyOnceWith(['files']);
    expect(actions.unlockContent).toHaveBeenCalledExactlyOnceWith([
      'neutral-receipt-file',
    ]);
    expect(actions.save).toHaveBeenCalledTimes(1);
    await expect(result.saveOperation).resolves.toBeUndefined();
  });
});

describe('phone runtime initialization', () => {
  it('reports hydration failure without attempting the initial save', async () => {
    const actions = {
      unlockApps: vi.fn(),
      hydrate: vi.fn(() => Promise.reject(new Error('load failed'))),
      save: vi.fn(() => Promise.resolve()),
    };

    await expect(initializePhonePlayer(['messages'], actions)).resolves.toEqual({
      kind: 'hydrate-failed',
    });
    expect(actions.unlockApps).toHaveBeenCalledExactlyOnceWith(['messages']);
    expect(actions.save).not.toHaveBeenCalled();
    expect(phoneInitializationFailureMessage('hydrate-failed')).toBe(
      'Хадгалсан төлөвийг ачаалж чадсангүй. Дахин оролдоно уу.',
    );
  });

  it('reports initial-save failure distinctly after successful hydration', async () => {
    const actions = {
      unlockApps: vi.fn(),
      hydrate: vi.fn(() => Promise.resolve()),
      save: vi.fn(() => Promise.reject(new Error('save failed'))),
    };

    await expect(initializePhonePlayer(['messages'], actions)).resolves.toEqual({
      kind: 'initial-save-failed',
    });
    expect(actions.save).toHaveBeenCalledTimes(1);
    expect(phoneInitializationFailureMessage('initial-save-failed')).toBe(
      'Анхны төлөвийг хадгалж чадсангүй. Дахин оролдоно уу.',
    );
  });

  it('can retry after a failed hydration', async () => {
    const actions = {
      unlockApps: vi.fn(),
      hydrate: vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error('load failed'))
        .mockResolvedValueOnce(),
      save: vi.fn(() => Promise.resolve()),
    };

    await expect(initializePhonePlayer(['messages'], actions)).resolves.toEqual({
      kind: 'hydrate-failed',
    });
    await expect(initializePhonePlayer(['messages'], actions)).resolves.toEqual({
      kind: 'ready',
    });
    expect(actions.hydrate).toHaveBeenCalledTimes(2);
    expect(actions.save).toHaveBeenCalledTimes(1);
  });
});

describe('case runtime client', () => {
  it('sends one allowlisted event and exposes validated view and outcomes', async () => {
    const state = createInitialPlayerState('case_test', '2026-08-27T00:00:00.000Z');
    const outcomes = [{
      type: 'event-rejected' as const,
      reason: 'unrecognized-id' as const,
      ids: ['not_visible'],
    }];
    const view = {
      caseId: 'case_test',
      title: 'Neutral case',
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
    };
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      state,
      outcomes,
      content: neutralPhoneContent,
      gatedContentIds: [],
      view,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const event = { type: 'pin-evidence' as const, evidenceIds: ['not_visible'] };
    const projection = await requestCasePhoneProjection(state, undefined, event);

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ event });
    expect(projection.view).toEqual(view);
    expect(projection.outcomes).toEqual(outcomes);
    expect(projection.phoneIndex.content).toEqual(neutralPhoneContent);
    vi.unstubAllGlobals();
  });
});
