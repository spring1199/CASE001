import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from '@/app/api/case-assets/[assetId]/route';

function request(cookies = ''): NextRequest {
  return new NextRequest('http://localhost/api/case-assets/asset', {
    headers: cookies === '' ? undefined : { cookie: cookies },
  });
}

function context(assetId: string) {
  return { params: Promise.resolve({ assetId }) };
}

describe('Case #001 gated asset route', () => {
  it('makes locked and nonexistent private IDs indistinguishable', async () => {
    const locked = await GET(request(), context('HOPE-003'));
    const missing = await GET(request(), context('DOES-NOT-EXIST'));

    expect(locked.status).toBe(404);
    expect(missing.status).toBe(404);
    expect([...locked.headers]).toEqual([...missing.headers]);
    expect((await locked.arrayBuffer()).byteLength).toBe(0);
    expect((await missing.arrayBuffer()).byteLength).toBe(0);
  });

  it('delivers a gated binary only after its reveal fact', async () => {
    const response = await GET(
      request('case-001-facts=fact_tenuun_alive'),
      context('HOPE-003'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('keeps ending art unavailable until both fact and ending gates pass', async () => {
    const beforeChoice = await GET(
      request('case-001-facts=fact_tenuun_alive'),
      context('END-002'),
    );
    const afterChoice = await GET(
      request('case-001-facts=fact_tenuun_alive; case-001-ending=ending_sever'),
      context('END-002'),
    );

    expect(beforeChoice.status).toBe(404);
    expect(afterChoice.status).toBe(200);
  });
});
