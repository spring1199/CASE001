import { z } from 'zod';

export const caseManifestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  version: z.number().int().positive(),
  locale: z.literal('mn'),
  targetMinutes: z.number().int().positive(),
  initialObjectiveIds: z.array(z.string()),
  appIds: z.array(z.string()),
  canonEndingId: z.string(),
});

export type CaseManifest = z.infer<typeof caseManifestSchema>;

export const evidenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceArtifactId: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  grantsFacts: z.array(z.string()).optional(),
  hiddenUntilFacts: z.array(z.string()).optional(),
});

export type Evidence = z.infer<typeof evidenceSchema>;

export const deductionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  requiredAll: z.array(z.string()).optional(),
  requiredAnyGroups: z.array(z.array(z.string())).optional(),
  minimumFromAnyGroup: z.number().int().nonnegative().optional(),
  prerequisiteFacts: z.array(z.string()).optional(),
  grantsFacts: z.array(z.string()).default([]),
  unlocks: z.array(z.string()).optional(),
});

export type Deduction = z.infer<typeof deductionSchema>;
