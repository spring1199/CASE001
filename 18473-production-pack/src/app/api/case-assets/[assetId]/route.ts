import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { NextRequest } from 'next/server';
import { resolveCaseAsset } from '@/game/assets/case-assets';

const unavailable = (): Response => new Response(null, {
  status: 404,
  headers: { 'Cache-Control': 'private, no-store' },
});

function contentType(filename: string): string {
  return filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  const { assetId } = await context.params;
  const facts = request.cookies.get('case-001-facts')?.value
    .split(',').filter(Boolean) ?? [];
  const endingCookie = request.cookies.get('case-001-ending')?.value;
  const endingId = endingCookie === 'ending_trace' || endingCookie === 'ending_sever'
    ? endingCookie
    : null;
  const resolution = resolveCaseAsset(assetId, { factIds: facts, endingId });
  if (resolution.kind !== 'private-file') return unavailable();

  try {
    const bytes = await readFile(resolve(process.cwd(), resolution.runtimePath));
    return new Response(bytes, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `inline; filename="${resolution.filename}"`,
        'Content-Type': contentType(resolution.filename),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return unavailable();
  }
}
