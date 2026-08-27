import { z } from 'zod';
import {
  artifactRecordSchema,
  browserRecordSchema,
  callRecordSchema,
  emailRecordSchema,
  locationRecordSchema,
  messageThreadRecordSchema,
  noteRecordSchema,
  photoRecordSchema,
} from '@/game/schema/authored-artifact';

const idSchema = z.string().min(1);
const nonEmptyStringSchema = z.string().min(1);

export const caseManifestSchema = z.object({
  id: idSchema,
  title: nonEmptyStringSchema,
  version: z.number().int().positive(),
  locale: z.literal('mn'),
  targetMinutes: z.number().int().positive(),
  initialObjectiveIds: z.array(idSchema),
  appIds: z.array(idSchema),
  canonEndingId: idSchema,
  progressionComplete: z.boolean().optional(),
}).strict();

export type CaseManifest = z.infer<typeof caseManifestSchema>;

export const characterSchema = z.object({
  id: idSchema,
  name: nonEmptyStringSchema,
  age: z.number().int().positive().optional(),
  role: z.enum(['protagonist', 'missing_person', 'suspect', 'family', 'unknown']),
  playerVisibleAtStart: z.boolean().optional(),
  canonicalCharacterId: idSchema.optional(),
  hiddenUntilFact: idSchema.optional(),
}).strict();

export type Character = z.infer<typeof characterSchema>;

export const evidenceSchema = z.object({
  id: idSchema,
  title: nonEmptyStringSchema,
  sourceArtifactId: idSchema,
  description: nonEmptyStringSchema,
  tags: z.array(nonEmptyStringSchema),
  grantsFacts: z.array(idSchema).optional(),
  hiddenUntilFacts: z.array(idSchema).optional(),
}).strict();

export type Evidence = z.infer<typeof evidenceSchema>;

export const factSchema = z.object({
  id: idSchema,
  secret: z.boolean(),
  reveal: idSchema.optional(),
}).strict();

export type Fact = z.infer<typeof factSchema>;

export const deductionSchema = z.object({
  id: idSchema,
  title: nonEmptyStringSchema,
  kind: z.enum(['deduction', 'contradiction']).optional(),
  requiredAll: z.array(idSchema).optional(),
  requiredAnyGroups: z.array(z.array(idSchema).min(1)).optional(),
  minimumFromAnyGroup: z.number().int().positive().optional(),
  prerequisiteFacts: z.array(idSchema).optional(),
  grantsFacts: z.array(idSchema),
  unlocks: z.array(idSchema).optional(),
}).strict().superRefine((deduction, context) => {
  const candidates = new Set<string>();

  deduction.requiredAnyGroups?.forEach((group, groupIndex) => {
    group.forEach((evidenceId, evidenceIndex) => {
      if (candidates.has(evidenceId)) {
        context.addIssue({
          code: 'custom',
          path: ['requiredAnyGroups', groupIndex, evidenceIndex],
          message: `duplicate candidate evidence ID "${evidenceId}"`,
        });
      }
      candidates.add(evidenceId);
    });
  });

  if (
    deduction.minimumFromAnyGroup !== undefined
    && deduction.minimumFromAnyGroup > candidates.size
  ) {
    context.addIssue({
      code: 'custom',
      path: ['minimumFromAnyGroup'],
      message: `threshold ${deduction.minimumFromAnyGroup} exceeds ${candidates.size} distinct candidate(s)`,
    });
  }
});

export type Deduction = z.infer<typeof deductionSchema>;

export type Condition =
  | { fact: string }
  | { allFacts: string[] }
  | { evidence: string }
  | { allEvidence: string[] }
  | { evidenceThreshold: { anyOf: string[]; minimum: number } }
  | { deductionCompleted: string }
  | { objectiveCompleted: string }
  | { artifactViewed: string }
  | { edgeConfidenceAtLeast: { edgeId: string; minimum: number } }
  | { endingSelected: string }
  | { allOf: Condition[] }
  | { anyOf: Condition[] };

export const conditionSchema: z.ZodType<Condition> = z.lazy(() => z.union([
  z.object({ fact: idSchema }).strict(),
  z.object({ allFacts: z.array(idSchema).min(1) }).strict(),
  z.object({ evidence: idSchema }).strict(),
  z.object({ allEvidence: z.array(idSchema).min(1) }).strict(),
  z.object({
    evidenceThreshold: z.object({
      anyOf: z.array(idSchema).min(1),
      minimum: z.number().int().positive(),
    }).strict().superRefine((threshold, context) => {
      const distinct = new Set(threshold.anyOf);
      if (distinct.size !== threshold.anyOf.length) {
        context.addIssue({
          code: 'custom',
          path: ['anyOf'],
          message: 'candidate evidence IDs must be distinct',
        });
      }
      if (threshold.minimum > distinct.size) {
        context.addIssue({
          code: 'custom',
          path: ['minimum'],
          message: `threshold ${threshold.minimum} exceeds ${distinct.size} distinct candidate(s)`,
        });
      }
    }),
  }).strict(),
  z.object({ deductionCompleted: idSchema }).strict(),
  z.object({ objectiveCompleted: idSchema }).strict(),
  z.object({ artifactViewed: idSchema }).strict(),
  z.object({
    edgeConfidenceAtLeast: z.object({
      edgeId: idSchema,
      minimum: z.number().min(0).max(100),
    }).strict(),
  }).strict(),
  z.object({ endingSelected: idSchema }).strict(),
  z.object({ allOf: z.array(conditionSchema).min(1) }).strict(),
  z.object({ anyOf: z.array(conditionSchema).min(1) }).strict(),
]));

export const objectiveSchema = z.object({
  id: idSchema,
  title: nonEmptyStringSchema,
  state: z.enum(['active', 'locked']),
  activateWhen: conditionSchema.optional(),
  completeWhen: conditionSchema.optional(),
}).strict().superRefine((objective, context) => {
  if (objective.state === 'active' && objective.activateWhen !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['activateWhen'],
      message: 'an initially active objective cannot also declare activateWhen',
    });
  }
});

export type Objective = z.infer<typeof objectiveSchema>;

export const lockSchema = z.object({
  id: idSchema,
  title: nonEmptyStringSchema,
  unlockWhen: conditionSchema,
  requiredEvidence: z.array(idSchema).optional(),
}).strict();

export type Lock = z.infer<typeof lockSchema>;

export const triggerEffectSchema = z.object({
  type: z.literal('unlock'),
  target: idSchema,
}).strict();

export type TriggerEffect = z.infer<typeof triggerEffectSchema>;

export const triggerSchema = z.object({
  id: idSchema,
  when: conditionSchema,
  effects: z.array(triggerEffectSchema).min(1),
}).strict();

export type Trigger = z.infer<typeof triggerSchema>;

export const endingSchema = z.object({
  id: idSchema,
  title: nonEmptyStringSchema,
  choiceLabel: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  canon: z.boolean(),
  gateLockId: idSchema.optional(),
  revealsExactLocation: z.boolean().optional(),
  onSelect: z.object({
    confirmGraphEdgeIds: z.array(idSchema).optional(),
    severGraphEdgeIds: z.array(idSchema).optional(),
  }).strict().optional(),
}).strict();

export type Ending = z.infer<typeof endingSchema>;

export const timelinePositionSchema = z.object({
  recordType: z.literal('position'),
  id: idSchema,
  title: nonEmptyStringSchema,
  order: z.number().int(),
}).strict();

export type TimelinePosition = z.infer<typeof timelinePositionSchema>;

export const timelineEventSchema = z.object({
  recordType: z.literal('event'),
  id: idSchema,
  title: nonEmptyStringSchema,
  acceptablePositionIds: z.array(idSchema).min(1),
  requiredEvidenceIds: z.array(idSchema).optional(),
  hiddenUntilFacts: z.array(idSchema).optional(),
  grantsFactsWhenPlaced: z.array(idSchema).optional(),
}).strict().superRefine((event, context) => {
  const distinct = new Set(event.acceptablePositionIds);
  if (distinct.size !== event.acceptablePositionIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['acceptablePositionIds'],
      message: 'acceptable position IDs must be distinct',
    });
  }
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const timelineRecordSchema = z.discriminatedUnion('recordType', [
  timelinePositionSchema,
  timelineEventSchema,
]);

export type TimelineRecord = z.infer<typeof timelineRecordSchema>;

export const graphNodeSchema = z.object({
  recordType: z.literal('node'),
  id: idSchema,
  nodeType: z.enum(['person', 'device', 'location', 'account']),
  publicLabel: nonEmptyStringSchema,
  canonicalCharacterId: idSchema.optional(),
  identityRevealFact: idSchema.optional(),
  hiddenUntilFacts: z.array(idSchema).optional(),
}).strict().superRefine((node, context) => {
  if ((node.canonicalCharacterId === undefined) !== (node.identityRevealFact === undefined)) {
    context.addIssue({
      code: 'custom',
      path: ['identityRevealFact'],
      message: 'canonicalCharacterId and identityRevealFact must be declared together',
    });
  }
});

export type GraphNode = z.infer<typeof graphNodeSchema>;

export const graphConfidenceSourceSchema = z.object({
  evidenceId: idSchema,
  weight: z.number().finite(),
}).strict();

export type GraphConfidenceSource = z.infer<typeof graphConfidenceSourceSchema>;

export const graphEdgeSchema = z.object({
  recordType: z.literal('edge'),
  id: idSchema,
  fromNodeId: idSchema,
  toNodeId: idSchema,
  label: nonEmptyStringSchema.optional(),
  kind: z.enum(['observed', 'inferred']),
  confidenceSources: z.array(graphConfidenceSourceSchema),
  hiddenUntilFacts: z.array(idSchema).optional(),
  playerCanConfirm: z.boolean().optional(),
  playerCanSever: z.boolean().optional(),
}).strict().superRefine((edge, context) => {
  const seenEvidenceIds = new Set<string>();
  edge.confidenceSources.forEach((source, sourceIndex) => {
    if (seenEvidenceIds.has(source.evidenceId)) {
      context.addIssue({
        code: 'custom',
        path: ['confidenceSources', sourceIndex, 'evidenceId'],
        message: `duplicate confidence source evidence ID "${source.evidenceId}"`,
      });
    }
    seenEvidenceIds.add(source.evidenceId);
  });
});

export type GraphEdge = z.infer<typeof graphEdgeSchema>;

export const graphRecordSchema = z.discriminatedUnion('recordType', [
  graphNodeSchema,
  graphEdgeSchema,
]);

export type GraphRecord = z.infer<typeof graphRecordSchema>;

export const caseBundleSchema = z.object({
  manifest: caseManifestSchema,
  characters: z.array(characterSchema),
  evidence: z.array(evidenceSchema),
  facts: z.array(factSchema),
  deductions: z.array(deductionSchema),
  objectives: z.array(objectiveSchema),
  locks: z.array(lockSchema),
  triggers: z.array(triggerSchema),
  endings: z.array(endingSchema),
  graph: z.array(graphRecordSchema),
  timeline: z.array(timelineRecordSchema),
  artifacts: z.array(artifactRecordSchema),
  browser: z.array(browserRecordSchema),
  calls: z.array(callRecordSchema),
  emails: z.array(emailRecordSchema),
  locations: z.array(locationRecordSchema),
  messages: z.array(messageThreadRecordSchema),
  notes: z.array(noteRecordSchema),
  photos: z.array(photoRecordSchema),
}).strict();

export type CaseBundle = z.infer<typeof caseBundleSchema>;
