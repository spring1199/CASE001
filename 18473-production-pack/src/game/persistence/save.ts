import { z } from 'zod';

import { playerStateSchema } from '@/game/state/schema';
import { createInitialPlayerState, type PlayerState } from '@/game/state/types';

export const CURRENT_SAVE_VERSION = 1 as const;
export const LEGACY_SAVE_VERSION = 0 as const;
export const LEGACY_TIMESTAMP_SENTINEL = '1970-01-01T00:00:00.000Z';

export const saveEnvelopeSchema = z.strictObject({
  version: z.literal(CURRENT_SAVE_VERSION),
  savedAt: z.iso.datetime({ offset: true }),
  state: playerStateSchema,
});

export type SaveEnvelope = z.infer<typeof saveEnvelopeSchema>;

const legacyPlayerStateSchema = z.strictObject({
  caseId: z.string().min(1),
  discoveredEvidenceIds: z.array(z.string().min(1)),
  knownFactIds: z.array(z.string().min(1)),
  completedDeductionIds: z.array(z.string().min(1)),
  unlockedContentIds: z.array(z.string().min(1)),
  completedObjectiveIds: z.array(z.string().min(1)),
  flags: z.record(z.string().min(1), z.union([z.boolean(), z.number().finite(), z.string()])),
  endingId: z.string().min(1).optional(),
});

export type SavePersistenceErrorCode =
  | 'CORRUPT_SAVE'
  | 'UNSUPPORTED_VERSION'
  | 'INVALID_SAVE'
  | 'CASE_ID_MISMATCH';

export class SavePersistenceError extends Error {
  constructor(
    readonly code: SavePersistenceErrorCode,
    readonly caseId: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SavePersistenceError';
  }
}

type Migration = (input: unknown) => PlayerState;

function uniqueInOrder(values: string[]): string[] {
  return [...new Set(values)];
}

function migrateLegacyPlayerState(input: unknown): PlayerState {
  const result = legacyPlayerStateSchema.safeParse(input);
  if (!result.success) throw new Error(z.prettifyError(result.error));

  const legacy = result.data;
  return {
    ...createInitialPlayerState(legacy.caseId, LEGACY_TIMESTAMP_SENTINEL),
    discoveredEvidenceIds: uniqueInOrder(legacy.discoveredEvidenceIds),
    knownFactIds: uniqueInOrder(legacy.knownFactIds),
    completedDeductionIds: uniqueInOrder(legacy.completedDeductionIds),
    unlockedContentIds: uniqueInOrder(legacy.unlockedContentIds),
    objectiveStates: Object.fromEntries(
      uniqueInOrder(legacy.completedObjectiveIds).map(
        (objectiveId) => [objectiveId, 'completed'] as const,
      ),
    ),
    flags: legacy.flags,
    endingId: legacy.endingId ?? null,
  };
}

export const SAVE_MIGRATIONS: Readonly<Record<number, Migration>> = {
  [LEGACY_SAVE_VERSION]: migrateLegacyPlayerState,
};

function assertMatchingCaseId(state: PlayerState, expectedCaseId: string): void {
  if (state.caseId !== expectedCaseId) {
    throw new SavePersistenceError(
      'CASE_ID_MISMATCH',
      expectedCaseId,
      `Save for case "${expectedCaseId}" contains state for case "${state.caseId}".`,
    );
  }
}

export function createSaveEnvelope(state: PlayerState, savedAt: string): SaveEnvelope {
  const result = saveEnvelopeSchema.safeParse({
    version: CURRENT_SAVE_VERSION,
    savedAt,
    state,
  });
  if (!result.success) {
    throw new SavePersistenceError(
      'INVALID_SAVE',
      state.caseId,
      `Cannot save invalid player state for case "${state.caseId}": ${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

export function deserializeSave(raw: string, expectedCaseId: string): PlayerState {
  let input: unknown;
  try {
    input = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new SavePersistenceError(
      'CORRUPT_SAVE',
      expectedCaseId,
      `Save for case "${expectedCaseId}" is not valid JSON.`,
      { cause: error },
    );
  }

  if (typeof input === 'object' && input !== null && 'version' in input) {
    const version = (input as { version?: unknown }).version;
    if (typeof version === 'number' && version > CURRENT_SAVE_VERSION) {
      throw new SavePersistenceError(
        'UNSUPPORTED_VERSION',
        expectedCaseId,
        `Save for case "${expectedCaseId}" uses unsupported future version ${version}; current version is ${CURRENT_SAVE_VERSION}.`,
      );
    }

    const result = saveEnvelopeSchema.safeParse(input);
    if (!result.success) {
      throw new SavePersistenceError(
        'INVALID_SAVE',
        expectedCaseId,
        `Save envelope for case "${expectedCaseId}" is invalid: ${z.prettifyError(result.error)}`,
      );
    }
    assertMatchingCaseId(result.data.state, expectedCaseId);
    return result.data.state;
  }

  try {
    const migrated = SAVE_MIGRATIONS[LEGACY_SAVE_VERSION](input);
    assertMatchingCaseId(migrated, expectedCaseId);
    return playerStateSchema.parse(migrated);
  } catch (error) {
    if (error instanceof SavePersistenceError) throw error;
    throw new SavePersistenceError(
      'INVALID_SAVE',
      expectedCaseId,
      `Legacy save for case "${expectedCaseId}" is invalid and cannot be migrated.`,
      { cause: error },
    );
  }
}
