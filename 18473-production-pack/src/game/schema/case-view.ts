import { z } from 'zod';

import type { CaseEngineEvent, EngineOutcome } from '@/game/engine/engine';
import type { CaseView } from '@/game/engine/view';

const idSchema = z.string().min(1);
const textSchema = z.string().min(1);
const countSchema = z.number().int().nonnegative();

const objectiveViewSchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  state: z.enum(['active', 'completed']),
});

const characterViewSchema = z.strictObject({
  id: idSchema,
  name: textSchema,
  role: z.enum(['protagonist', 'missing_person', 'suspect', 'family', 'unknown']),
  aliasOfCharacterId: idSchema.nullable(),
});

const evidenceViewSchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  sourceArtifactId: idSchema,
  description: textSchema,
  tags: z.array(textSchema),
  pinned: z.boolean(),
});

const completedDeductionViewSchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  kind: z.enum(['deduction', 'contradiction']),
});

const availableDeductionViewSchema = completedDeductionViewSchema.extend({
  missingRequiredEvidenceCount: countSchema,
  thresholdMatched: countSchema,
  thresholdRequired: countSchema,
}).strict();

const timelinePositionViewSchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  order: z.number().int(),
});

const timelineEventViewSchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  placeable: z.boolean(),
  missingRequiredEvidenceCount: countSchema,
  placedPositionId: idSchema.nullable(),
  placedCorrectly: z.boolean(),
});

const graphViewSchema = z.strictObject({
  nodes: z.array(z.strictObject({
    id: idSchema,
    nodeType: z.enum(['person', 'device', 'location', 'account']),
    label: textSchema,
    identityRevealed: z.boolean(),
  })),
  edges: z.array(z.strictObject({
    id: idSchema,
    fromNodeId: idSchema,
    toNodeId: idSchema,
    label: textSchema.nullable(),
    kind: z.enum(['observed', 'inferred']),
    confidence: z.number().min(0).max(100),
    supportingEvidenceIds: z.array(idSchema),
    playerStatus: z.enum(['confirmed', 'severed', 'unresolved']),
    playerCanConfirm: z.boolean(),
    playerCanSever: z.boolean(),
  })),
});

const finalChoiceOptionViewSchema = z.strictObject({
  id: idSchema,
  choiceLabel: textSchema,
  description: textSchema,
});

const endingOutcomeSchema = z.strictObject({
  endingId: idSchema,
  title: textSchema,
  description: textSchema,
  exactLocationRevealed: z.boolean(),
});

export const caseViewSchema = z.strictObject({
  caseId: idSchema,
  title: textSchema,
  characters: z.array(characterViewSchema),
  objectives: z.array(objectiveViewSchema),
  evidence: z.array(evidenceViewSchema),
  completedDeductions: z.array(completedDeductionViewSchema),
  availableDeductions: z.array(availableDeductionViewSchema),
  timelinePositions: z.array(timelinePositionViewSchema),
  timelineEvents: z.array(timelineEventViewSchema),
  graph: graphViewSchema,
  openLockIds: z.array(idSchema),
  unlockedContentIds: z.array(idSchema),
  finalChoice: z.array(finalChoiceOptionViewSchema).nullable(),
  ending: endingOutcomeSchema.nullable(),
  progression: z.strictObject({
    discoveredEvidenceCount: countSchema,
    completedDeductionCount: countSchema,
    activeObjectiveCount: countSchema,
    completedObjectiveCount: countSchema,
  }),
}) satisfies z.ZodType<CaseView>;

export type PlayerCaseEngineEvent = Extract<
  CaseEngineEvent,
  { type:
    | 'attempt-deduction'
    | 'place-timeline-event'
    | 'pin-evidence'
    | 'unpin-evidence'
    | 'confirm-graph-edges'
    | 'sever-graph-edges'
    | 'select-ending' }
>;

export const playerCaseEngineEventSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('attempt-deduction'), deductionId: idSchema }),
  z.strictObject({
    type: z.literal('place-timeline-event'),
    eventId: idSchema,
    positionId: idSchema,
  }),
  z.strictObject({ type: z.literal('pin-evidence'), evidenceIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('unpin-evidence'), evidenceIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('confirm-graph-edges'), edgeIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('sever-graph-edges'), edgeIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('select-ending'), endingId: idSchema }),
]) satisfies z.ZodType<PlayerCaseEngineEvent>;

const deductionProgressSchema = z.strictObject({
  missingPrerequisiteCount: countSchema,
  missingRequiredEvidenceCount: countSchema,
  thresholdMatched: countSchema,
  thresholdRequired: countSchema,
});

export const engineOutcomeSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('artifacts-discovered'), artifactIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('evidence-discovered'), evidenceIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('facts-learned'), factIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('deduction-completed'), deductionId: idSchema }),
  z.strictObject({
    type: z.literal('deduction-rejected'),
    deductionId: idSchema,
    progress: deductionProgressSchema,
  }),
  z.strictObject({
    type: z.literal('timeline-placed'),
    eventId: idSchema,
    positionId: idSchema,
    correct: z.boolean(),
  }),
  z.strictObject({
    type: z.literal('timeline-rejected'),
    eventId: idSchema,
    positionId: idSchema,
    reason: z.enum(['unrecognized-event', 'unrecognized-position', 'not-placeable']),
  }),
  z.strictObject({ type: z.literal('evidence-pinned'), evidenceIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('evidence-unpinned'), evidenceIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('edges-confirmed'), edgeIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('edges-severed'), edgeIds: z.array(idSchema) }),
  z.strictObject({
    type: z.literal('edges-rejected'),
    edgeIds: z.array(idSchema),
    reason: z.enum(['unrecognized-edge', 'hidden-edge', 'not-permitted']),
  }),
  z.strictObject({ type: z.literal('objective-activated'), objectiveId: idSchema }),
  z.strictObject({ type: z.literal('objective-completed'), objectiveId: idSchema }),
  z.strictObject({
    type: z.literal('objective-rejected'),
    objectiveId: idSchema,
    reason: z.enum(['unrecognized-objective', 'not-active', 'authored-condition']),
  }),
  z.strictObject({ type: z.literal('content-unlocked'), contentIds: z.array(idSchema) }),
  z.strictObject({ type: z.literal('ending-selected'), endingId: idSchema }),
  z.strictObject({
    type: z.literal('ending-rejected'),
    endingId: idSchema,
    reason: z.enum(['unrecognized-ending', 'not-eligible', 'already-decided']),
  }),
  z.strictObject({
    type: z.literal('event-rejected'),
    reason: z.literal('unrecognized-id'),
    ids: z.array(idSchema),
  }),
]) satisfies z.ZodType<EngineOutcome>;
