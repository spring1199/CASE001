import { describe, expect, it, vi } from 'vitest';

import { processEngineEvent } from '@/game/engine/engine';
import { createInitialPlayerState } from '@/game/state/types';
import { POST } from '@/app/api/case-runtime/route';

vi.mock('@/game/engine/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/game/engine/engine')>();
  return { ...actual, processEngineEvent: vi.fn(actual.processEngineEvent) };
});

function requestFor(body: unknown): Request {
  return new Request('http://localhost/api/case-runtime', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Case #001 server runtime projection', () => {
  it('delivers phone content after unlock without revealing ending-gated records', async () => {
    const state = createInitialPlayerState('case_001', '2026-08-27T00:00:00.000Z');
    const response = await POST(requestFor({ state }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.content.apps).toHaveLength(8);
    expect(payload.state.unlockedAppIds).toHaveLength(8);
    expect(payload.view.caseId).toBe('case_001');
    expect(payload.view.evidence).toEqual([]);
    expect(JSON.stringify(payload.content)).not.toContain('CALL_18473_03');
    expect(JSON.stringify(payload.content)).not.toContain('fact_tenuun_alive');
    expect(JSON.stringify(payload.view)).not.toContain('fact_tenuun_alive');
  });

  it('runs discovery through the engine before returning a refreshed projection', async () => {
    const state = createInitialPlayerState('case_001', '2026-08-27T00:00:00.000Z');
    const response = await POST(requestFor({
      state,
      discovery: {
        artifactIds: ['art_package_note'],
        evidenceIds: ['ev_18473_paper'],
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.state.discoveredArtifactIds).toContain('art_package_note');
    expect(payload.state.discoveredEvidenceIds).toContain('ev_18473_paper');
  });

  it('processes one allowed investigation event through the engine before projection', async () => {
    const state = createInitialPlayerState('case_001', '2026-08-27T00:00:00.000Z');
    const response = await POST(requestFor({
      state,
      discovery: {
        evidenceIds: ['ev_cabin_plan', 'ev_vehicle_trace', 'ev_tuya_drive'],
      },
      event: {
        type: 'attempt-deduction',
        deductionId: 'ded_planned_disappearance',
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.outcomes).toContainEqual({
      type: 'deduction-completed',
      deductionId: 'ded_planned_disappearance',
    });
    expect(payload.state.completedDeductionIds).toContain('ded_planned_disappearance');
    expect(payload.view.completedDeductions).toContainEqual({
      id: 'ded_planned_disappearance',
      title: 'Тэнүүн амиа хорлохоор бус, алга болохоор төлөвлөсөн',
      kind: 'deduction',
    });
  });

  it('rejects unknown and hidden event IDs without turning the runtime into an oracle', async () => {
    const state = createInitialPlayerState('case_001', '2026-08-27T00:00:00.000Z');
    vi.mocked(processEngineEvent).mockClear();
    const unknownResponse = await POST(requestFor({
      state,
      event: { type: 'pin-evidence', evidenceIds: ['not_visible'] },
    }));
    expect(processEngineEvent).not.toHaveBeenCalled();
    const hiddenResponse = await POST(requestFor({
      state,
      event: { type: 'pin-evidence', evidenceIds: ['ev_winter47_operator'] },
    }));
    expect(processEngineEvent).not.toHaveBeenCalled();
    const hiddenDeductionResponse = await POST(requestFor({
      state,
      event: { type: 'attempt-deduction', deductionId: 'ded_maral_winter47' },
    }));
    expect(processEngineEvent).not.toHaveBeenCalled();
    const ineligibleEndingResponse = await POST(requestFor({
      state,
      event: { type: 'select-ending', endingId: 'ending_sever' },
    }));
    expect(processEngineEvent).not.toHaveBeenCalled();
    const hiddenTimelineResponse = await POST(requestFor({
      state,
      event: { type: 'place-timeline-event', eventId: 'tev_audit', positionId: 'tpos_4' },
    }));
    expect(processEngineEvent).not.toHaveBeenCalled();
    const hiddenGraphResponse = await POST(requestFor({
      state,
      event: { type: 'confirm-graph-edges', edgeIds: ['edge_tenuun_location'] },
    }));
    expect(processEngineEvent).not.toHaveBeenCalled();
    const unknownPayload = await unknownResponse.json();
    const hiddenPayload = await hiddenResponse.json();
    const hiddenDeductionPayload = await hiddenDeductionResponse.json();
    const ineligibleEndingPayload = await ineligibleEndingResponse.json();
    const hiddenTimelinePayload = await hiddenTimelineResponse.json();
    const hiddenGraphPayload = await hiddenGraphResponse.json();

    expect(unknownResponse.status).toBe(200);
    expect(hiddenResponse.status).toBe(200);
    expect(unknownPayload.outcomes).toContainEqual({
      type: 'event-rejected',
      reason: 'unrecognized-id',
      ids: ['not_visible'],
    });
    expect(hiddenPayload.outcomes[0]).toMatchObject({
      type: 'event-rejected',
      reason: 'unrecognized-id',
    });
    expect(hiddenDeductionPayload.outcomes).toContainEqual({
      type: 'event-rejected',
      reason: 'unrecognized-id',
      ids: ['ded_maral_winter47'],
    });
    expect(ineligibleEndingPayload.outcomes).toContainEqual({
      type: 'event-rejected',
      reason: 'unrecognized-id',
      ids: ['ending_sever'],
    });
    expect(hiddenTimelinePayload.outcomes).toContainEqual({
      type: 'event-rejected',
      reason: 'unrecognized-id',
      ids: ['tev_audit'],
    });
    expect(hiddenGraphPayload.outcomes).toContainEqual({
      type: 'event-rejected',
      reason: 'unrecognized-id',
      ids: ['edge_tenuun_location'],
    });
    expect(JSON.stringify(hiddenPayload.view)).not.toContain('ev_winter47_operator');
    expect(JSON.stringify(hiddenDeductionPayload.view)).not.toContain('ded_maral_winter47');
  });

  it('rejects engine events outside the strict player-action allowlist', async () => {
    const state = createInitialPlayerState('case_001', '2026-08-27T00:00:00.000Z');
    const response = await POST(requestFor({
      state,
      event: { type: 'complete-objective', objectiveId: 'obj_find_sender' },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ kind: 'invalid-request' });
  });

  it('rejects invalid or cross-case player states', async () => {
    const state = createInitialPlayerState('case_999', '2026-08-27T00:00:00.000Z');
    const response = await POST(requestFor({ state }));
    expect(response.status).toBe(400);
  });
});
