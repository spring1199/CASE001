import { NextResponse } from 'next/server';
import { z } from 'zod';

import { processEngineEvent, settleEngineState, type EngineOutcome } from '@/game/engine/engine';
import { case001Seed } from '@/game/content/case-001';
import { playerStateSchema } from '@/game/state/schema';
import type { PlayerState } from '@/game/state/types';
import { case001PhoneIndex, createCase001PhoneIndex } from '@/phone/data/case-001';
import { phoneDiscoveryEffectsSchema } from '@/phone/data/schema';

const requestSchema = z.strictObject({
  state: playerStateSchema,
  discovery: phoneDiscoveryEffectsSchema.optional(),
});

function appendUnique(existing: string[], incoming: readonly string[]): string[] {
  const seen = new Set(existing);
  const added = incoming.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return added.length === 0 ? existing : [...existing, ...added];
}

function applyDiscovery(state: PlayerState, discovery: z.infer<typeof phoneDiscoveryEffectsSchema>) {
  let next = state;
  const outcomes: EngineOutcome[] = [];
  if ((discovery.artifactIds?.length ?? 0) > 0) {
    const result = processEngineEvent(case001Seed, next, {
      type: 'discover-artifacts',
      artifactIds: discovery.artifactIds ?? [],
    });
    next = result.state;
    outcomes.push(...result.outcomes);
  }
  if ((discovery.evidenceIds?.length ?? 0) > 0) {
    const result = processEngineEvent(case001Seed, next, {
      type: 'discover-evidence',
      evidenceIds: discovery.evidenceIds ?? [],
    });
    next = result.state;
    outcomes.push(...result.outcomes);
  }

  const unlockedAppIds = appendUnique(next.unlockedAppIds, discovery.unlockAppIds ?? []);
  const unlockedContentIds = appendUnique(
    next.unlockedContentIds,
    discovery.unlockContentIds ?? [],
  );
  if (unlockedAppIds !== next.unlockedAppIds || unlockedContentIds !== next.unlockedContentIds) {
    next = { ...next, unlockedAppIds, unlockedContentIds };
  }
  return { state: next, outcomes };
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ kind: 'invalid-request' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success || parsed.data.state.caseId !== case001Seed.manifest.id) {
    return NextResponse.json({ kind: 'invalid-request' }, { status: 400 });
  }

  const initialUnlockedAppIds = case001PhoneIndex.content.apps
    .filter((app) => !app.lockedInitially)
    .map((app) => app.id);
  let state: PlayerState = {
    ...parsed.data.state,
    unlockedAppIds: appendUnique(parsed.data.state.unlockedAppIds, initialUnlockedAppIds),
  };
  const outcomes: EngineOutcome[] = [];
  if (parsed.data.discovery !== undefined) {
    const discoveryResult = applyDiscovery(state, parsed.data.discovery);
    state = discoveryResult.state;
    outcomes.push(...discoveryResult.outcomes);
  }
  const settled = settleEngineState(case001Seed, state);
  state = settled.state;
  outcomes.push(...settled.outcomes);

  const endingId = state.endingId === 'ending_trace' || state.endingId === 'ending_sever'
    ? state.endingId
    : null;
  const phoneIndex = createCase001PhoneIndex({
    factIds: state.knownFactIds,
    endingId,
  });
  const visibleItemIds = new Set(
    phoneIndex.content.apps.flatMap((app) => app.items.map((item) => item.id)),
  );
  const gatedContentIds = [...new Set(
    case001PhoneIndex.content.apps.flatMap((app) =>
      app.items.flatMap((item) => item.discovery?.unlockContentIds ?? [])),
  )].filter((itemId) => visibleItemIds.has(itemId));

  return NextResponse.json({
    state,
    outcomes,
    content: phoneIndex.content,
    gatedContentIds,
  }, {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
