import { z } from 'zod';

import type { EngineOutcome } from '@/game/engine/engine';
import type { CaseView } from '@/game/engine/view';
import {
  caseViewSchema,
  engineOutcomeSchema,
  type PlayerCaseEngineEvent,
} from '@/game/schema/case-view';
import { playerStateSchema } from '@/game/state/schema';
import type { PlayerState } from '@/game/state/types';
import {
  createPhoneContentIndex,
  phoneContentSchema,
  type PhoneContentIndex,
  type PhoneDiscoveryEffects,
} from '@/phone/data/schema';

const projectionSchema = z.strictObject({
  state: playerStateSchema,
  outcomes: z.array(engineOutcomeSchema),
  content: phoneContentSchema,
  gatedContentIds: z.array(z.string()),
  view: caseViewSchema,
});

export type CasePhoneProjection = Readonly<{
  state: PlayerState;
  phoneIndex: PhoneContentIndex;
  gatedContentIds: ReadonlySet<string>;
  view: CaseView;
  outcomes: readonly EngineOutcome[];
}>;

export async function requestCasePhoneProjection(
  state: PlayerState,
  discovery?: PhoneDiscoveryEffects,
  event?: PlayerCaseEngineEvent,
): Promise<CasePhoneProjection> {
  const response = await fetch('/api/case-runtime', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state, discovery, event }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Case runtime projection failed.');
  const projection = projectionSchema.parse(await response.json());
  return {
    state: projection.state,
    phoneIndex: createPhoneContentIndex(projection.content),
    gatedContentIds: new Set(projection.gatedContentIds),
    view: projection.view,
    outcomes: projection.outcomes,
  };
}
