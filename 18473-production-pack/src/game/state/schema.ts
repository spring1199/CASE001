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
}).superRefine((timestamps, context) => {
  const startedAt = Date.parse(timestamps.startedAt);
  for (const key of ['updatedAt', 'lastPlayedAt', 'lastSavedAt'] as const) {
    const value = timestamps[key];
    if (value !== null && Date.parse(value) < startedAt) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: `${key} cannot be before startedAt.`,
      });
    }
  }
});

export function orderedUniqueStringArraySchema(itemSchema: z.ZodType<string>) {
  return z.array(itemSchema).superRefine((values, context) => {
    const firstIndexByValue = new Map<string, number>();
    values.forEach((value, index) => {
      const firstIndex = firstIndexByValue.get(value);
      if (firstIndex === undefined) {
        firstIndexByValue.set(value, index);
        return;
      }
      context.addIssue({
        code: 'custom',
        path: [index],
        message: `Duplicate ID "${value}"; first occurrence is at index ${firstIndex}.`,
      });
    });
  });
}

const orderedUniqueIdentifierArraySchema = orderedUniqueStringArraySchema(identifierSchema);

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
  discoveredArtifactIds: orderedUniqueIdentifierArraySchema,
  discoveredEvidenceIds: orderedUniqueIdentifierArraySchema,
  unlockedAppIds: orderedUniqueIdentifierArraySchema,
  unlockedContentIds: orderedUniqueIdentifierArraySchema,
  completedDeductionIds: orderedUniqueIdentifierArraySchema,
  knownFactIds: orderedUniqueIdentifierArraySchema,
  objectiveStates: z.record(identifierSchema, objectiveStateSchema),
  timelinePlacements: z.array(timelinePlacementSchema),
  confirmedGraphEdgeIds: orderedUniqueIdentifierArraySchema,
  severedGraphEdgeIds: orderedUniqueIdentifierArraySchema,
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
