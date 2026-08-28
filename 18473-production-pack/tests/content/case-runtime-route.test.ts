import { describe, expect, it } from 'vitest';

import { createInitialPlayerState } from '@/game/state/types';
import { POST } from '@/app/api/case-runtime/route';

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
    expect(JSON.stringify(payload.content)).not.toContain('CALL_18473_03');
    expect(JSON.stringify(payload.content)).not.toContain('fact_tenuun_alive');
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

  it('rejects invalid or cross-case player states', async () => {
    const state = createInitialPlayerState('case_999', '2026-08-27T00:00:00.000Z');
    const response = await POST(requestFor({ state }));
    expect(response.status).toBe(400);
  });
});
