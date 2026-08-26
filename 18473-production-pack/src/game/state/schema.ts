import { z } from 'zod';

import type { PlayerState } from '@/game/state/types';

const identifierSchema = z.string().min(1);
const timestampSchema = z.iso.datetime({ offset: true });

export const flagValueSchema = z.union([z.boolean(), z.number().finite(), z.string()]);
export const objectiveStateSchema = z.enum(['locked', 'active', 'completed']);

export const timelinePlacementSchema = z.strictObject({
  eventId: identifierSchema,
  positionId: identifierSchema,
});

export const playerTimestampsSchema = z.strictObject({
  startedAt: timestampSchema,
  updatedAt: timestampSchema,
  lastPlayedAt: timestampSchema,
  lastSavedAt: timestampSchema.nullable(),
});

export const playerStateSchema = z.strictObject({
  caseId: identifierSchema,
  discoveredArtifactIds: z.array(identifierSchema),
  discoveredEvidenceIds: z.array(identifierSchema),
  unlockedAppIds: z.array(identifierSchema),
  unlockedContentIds: z.array(identifierSchema),
  completedDeductionIds: z.array(identifierSchema),
  knownFactIds: z.array(identifierSchema),
  objectiveStates: z.record(identifierSchema, objectiveStateSchema),
  timelinePlacements: z.array(timelinePlacementSchema),
  confirmedGraphEdgeIds: z.array(identifierSchema),
  severedGraphEdgeIds: z.array(identifierSchema),
  flags: z.record(identifierSchema, flagValueSchema),
  endingBranchId: identifierSchema.nullable(),
  endingId: identifierSchema.nullable(),
  timestamps: playerTimestampsSchema,
}) satisfies z.ZodType<PlayerState>;
