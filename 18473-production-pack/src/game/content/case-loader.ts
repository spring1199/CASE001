import { z } from 'zod';
import {
  caseBundleSchema,
  caseManifestSchema,
  characterSchema,
  deductionSchema,
  endingSchema,
  evidenceSchema,
  factSchema,
  lockSchema,
  objectiveSchema,
  triggerSchema,
  type CaseBundle,
} from '@/game/schema/case';

type AuthoredSource = {
  sourcePath: string;
  data: unknown;
};

export type CaseBundleSources = {
  manifest: AuthoredSource;
  characters: AuthoredSource;
  evidence: AuthoredSource;
  facts: AuthoredSource;
  deductions: AuthoredSource;
  objectives: AuthoredSource;
  locks: AuthoredSource;
  triggers: AuthoredSource;
  endings: AuthoredSource;
};

export type CaseRecordKind =
  | 'manifest'
  | 'character'
  | 'evidence'
  | 'fact'
  | 'deduction'
  | 'objective'
  | 'lock'
  | 'trigger'
  | 'ending';

type CaseRecord =
  | CaseBundle['manifest']
  | CaseBundle['characters'][number]
  | CaseBundle['evidence'][number]
  | CaseBundle['facts'][number]
  | CaseBundle['deductions'][number]
  | CaseBundle['objectives'][number]
  | CaseBundle['locks'][number]
  | CaseBundle['triggers'][number]
  | CaseBundle['endings'][number];

export type CaseIndexEntry = {
  kind: CaseRecordKind;
  sourcePath: string;
  value: CaseRecord;
};

export type LoadedCaseBundle = CaseBundle & {
  index: ReadonlyMap<string, CaseIndexEntry>;
};

function formatIssuePath(path: PropertyKey[]): string {
  if (path.length === 0) return '<root>';

  return path.map((segment) => (
    typeof segment === 'number' ? `[${segment}]` : `.${String(segment)}`
  )).join('').replace(/^\./, '');
}

function recordIdAtIssue(sourceData: unknown, issuePath: PropertyKey[]): string | undefined {
  const candidate = Array.isArray(sourceData) && typeof issuePath[0] === 'number'
    ? sourceData[issuePath[0]]
    : sourceData;

  if (typeof candidate !== 'object' || candidate === null || !('id' in candidate)) {
    return undefined;
  }

  return typeof candidate.id === 'string' ? candidate.id : undefined;
}

function parseSource<T>(schema: z.ZodType<T>, source: AuthoredSource): T {
  const result = schema.safeParse(source.data);
  if (result.success) return result.data;

  const details = result.error.issues.map((issue) => {
    const recordId = recordIdAtIssue(source.data, issue.path);
    const context = recordId === undefined ? '' : ` (record "${recordId}")`;
    return `${source.sourcePath}${context} at ${formatIssuePath(issue.path)}: ${issue.message}`;
  });

  throw new Error(`Invalid authored case data:\n${details.join('\n')}`);
}

export function parseCaseBundle(sources: CaseBundleSources): LoadedCaseBundle {
  const bundle = caseBundleSchema.parse({
    manifest: parseSource(caseManifestSchema, sources.manifest),
    characters: parseSource(z.array(characterSchema), sources.characters),
    evidence: parseSource(z.array(evidenceSchema), sources.evidence),
    facts: parseSource(z.array(factSchema), sources.facts),
    deductions: parseSource(z.array(deductionSchema), sources.deductions),
    objectives: parseSource(z.array(objectiveSchema), sources.objectives),
    locks: parseSource(z.array(lockSchema), sources.locks),
    triggers: parseSource(z.array(triggerSchema), sources.triggers),
    endings: parseSource(z.array(endingSchema), sources.endings),
  });

  const index = new Map<string, CaseIndexEntry>();

  const addRecord = (
    value: CaseRecord,
    kind: CaseRecordKind,
    sourcePath: string,
  ) => {
    const existing = index.get(value.id);
    if (existing !== undefined) {
      throw new Error(
        `Duplicate ID "${value.id}": first declared in ${existing.sourcePath}; repeated in ${sourcePath}`,
      );
    }

    index.set(value.id, { kind, sourcePath, value });
  };

  addRecord(bundle.manifest, 'manifest', sources.manifest.sourcePath);

  const collections = [
    [bundle.characters, 'character', sources.characters.sourcePath],
    [bundle.evidence, 'evidence', sources.evidence.sourcePath],
    [bundle.facts, 'fact', sources.facts.sourcePath],
    [bundle.deductions, 'deduction', sources.deductions.sourcePath],
    [bundle.objectives, 'objective', sources.objectives.sourcePath],
    [bundle.locks, 'lock', sources.locks.sourcePath],
    [bundle.triggers, 'trigger', sources.triggers.sourcePath],
    [bundle.endings, 'ending', sources.endings.sourcePath],
  ] as const;

  for (const [records, kind, sourcePath] of collections) {
    for (const record of records) addRecord(record, kind, sourcePath);
  }

  return { ...bundle, index };
}
