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

function findDuplicate(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

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
}).superRefine((state, context) => {
  const duplicateTimelineEventId = findDuplicate(
    state.timelinePlacements.map((placement) => placement.eventId),
  );
  if (duplicateTimelineEventId !== null) {
    context.addIssue({
      code: 'custom',
      path: ['timelinePlacements'],
      message: `Timeline event "${duplicateTimelineEventId}" has more than one placement.`,
    });
  }

  for (const key of ['confirmedGraphEdgeIds', 'severedGraphEdgeIds'] as const) {
    const duplicateEdgeId = findDuplicate(state[key]);
    if (duplicateEdgeId !== null) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: `Graph edge "${duplicateEdgeId}" appears more than once.`,
      });
    }
  }

  const confirmedEdges = new Set(state.confirmedGraphEdgeIds);
  const conflictingEdgeId = state.severedGraphEdgeIds.find((edgeId) =>
    confirmedEdges.has(edgeId),
  );
  if (conflictingEdgeId !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['severedGraphEdgeIds'],
      message: `Graph edge "${conflictingEdgeId}" cannot be both confirmed and severed.`,
    });
  }
}) satisfies z.ZodType<PlayerState>;
