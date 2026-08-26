import { z } from 'zod';

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
  requiredAll: z.array(idSchema).optional(),
  requiredAnyGroups: z.array(z.array(idSchema).min(1)).optional(),
  minimumFromAnyGroup: z.number().int().positive().optional(),
  prerequisiteFacts: z.array(idSchema).optional(),
  grantsFacts: z.array(idSchema),
  unlocks: z.array(idSchema).optional(),
}).strict();

export type Deduction = z.infer<typeof deductionSchema>;

export const objectiveSchema = z.object({
  id: idSchema,
  title: nonEmptyStringSchema,
  state: z.enum(['active', 'locked']),
}).strict();

export type Objective = z.infer<typeof objectiveSchema>;

export const conditionSchema = z.union([
  z.object({ fact: idSchema }).strict(),
  z.object({ allFacts: z.array(idSchema).min(1) }).strict(),
]);

export type Condition = z.infer<typeof conditionSchema>;

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
}).strict();

export type Ending = z.infer<typeof endingSchema>;

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
}).strict();

export type CaseBundle = z.infer<typeof caseBundleSchema>;
