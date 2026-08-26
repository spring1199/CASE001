import { z } from 'zod';
import {
  caseBundleSchema,
  caseManifestSchema,
  characterSchema,
  deferredEmptyCollectionSchema,
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
  artifacts: AuthoredSource;
  browser: AuthoredSource;
  calls: AuthoredSource;
  emails: AuthoredSource;
  locations: AuthoredSource;
  messages: AuthoredSource;
  notes: AuthoredSource;
  photos: AuthoredSource;
  timeline: AuthoredSource;
};

export const coreCaseSourceKeys = [
  'manifest',
  'characters',
  'evidence',
  'facts',
  'deductions',
  'objectives',
  'locks',
  'triggers',
  'endings',
] as const;

export const deferredCaseSourceKeys = [
  'artifacts',
  'browser',
  'calls',
  'emails',
  'locations',
  'messages',
  'notes',
  'photos',
  'timeline',
] as const;

export type CoreCaseSourceKey = (typeof coreCaseSourceKeys)[number];
export type DeferredCaseSourceKey = (typeof deferredCaseSourceKeys)[number];
export type CaseSourceKey = CoreCaseSourceKey | DeferredCaseSourceKey;

export type CaseSourceMetadata = {
  [Key in CaseSourceKey]: {
    sourcePath: string;
    validation: Key extends DeferredCaseSourceKey ? 'deferred-empty' : 'core';
    indexed: Key extends DeferredCaseSourceKey ? false : true;
  }
};

type CaseRecordByKind = {
  manifest: CaseBundle['manifest'];
  character: CaseBundle['characters'][number];
  evidence: CaseBundle['evidence'][number];
  fact: CaseBundle['facts'][number];
  deduction: CaseBundle['deductions'][number];
  objective: CaseBundle['objectives'][number];
  lock: CaseBundle['locks'][number];
  trigger: CaseBundle['triggers'][number];
  ending: CaseBundle['endings'][number];
};

export type CaseRecordKind = keyof CaseRecordByKind;

export type CoreCaseIndexEntry = {
  [Kind in CaseRecordKind]: {
    kind: Kind;
    sourcePath: string;
    value: CaseRecordByKind[Kind];
  }
}[CaseRecordKind];

export type LoadedCaseBundle = CaseBundle & {
  coreIndex: ReadonlyMap<string, CoreCaseIndexEntry>;
  sourceMetadata: CaseSourceMetadata;
};

type ReferenceTargetKind = 'character' | 'deduction' | 'ending' | 'evidence' | 'fact' | 'objective';

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

function assertKnownReference(
  validIds: ReadonlySet<string>,
  targetKind: ReferenceTargetKind,
  targetId: string,
  sourcePath: string,
  recordId: string,
  issuePath: string,
): void {
  if (validIds.has(targetId)) return;

  throw new Error(
    `Invalid authored case reference:\n${sourcePath} (record "${recordId}") at ${issuePath}: unknown ${targetKind} ID "${targetId}"`,
  );
}

function assertKnownReferences(
  validIds: ReadonlySet<string>,
  targetKind: ReferenceTargetKind,
  targetIds: readonly string[] | undefined,
  sourcePath: string,
  recordId: string,
  issuePath: string,
): void {
  targetIds?.forEach((targetId, targetIndex) => {
    assertKnownReference(
      validIds,
      targetKind,
      targetId,
      sourcePath,
      recordId,
      `${issuePath}[${targetIndex}]`,
    );
  });
}

function validateCaseReferences(bundle: CaseBundle, sources: CaseBundleSources): void {
  const characterIds = new Set(bundle.characters.map(({ id }) => id));
  const deductionIds = new Set(bundle.deductions.map(({ id }) => id));
  const endingIds = new Set(bundle.endings.map(({ id }) => id));
  const evidenceIds = new Set(bundle.evidence.map(({ id }) => id));
  const factIds = new Set(bundle.facts.map(({ id }) => id));
  const objectiveIds = new Set(bundle.objectives.map(({ id }) => id));

  const validateCondition = (
    condition: CaseBundle['locks'][number]['unlockWhen'],
    sourcePath: string,
    recordId: string,
    basePath: string,
  ) => {
    if ('fact' in condition) {
      assertKnownReference(factIds, 'fact', condition.fact, sourcePath, recordId, `${basePath}.fact`);
      return;
    }

    assertKnownReferences(
      factIds,
      'fact',
      condition.allFacts,
      sourcePath,
      recordId,
      `${basePath}.allFacts`,
    );
  };

  assertKnownReference(
    endingIds,
    'ending',
    bundle.manifest.canonEndingId,
    sources.manifest.sourcePath,
    bundle.manifest.id,
    'canonEndingId',
  );

  const canonicalEndings = bundle.endings.flatMap((ending, endingIndex) => (
    ending.canon ? [{ ending, endingIndex }] : []
  ));
  if (canonicalEndings.length === 0) {
    throw new Error(
      `Invalid authored case reference:\n${sources.manifest.sourcePath} (record "${bundle.manifest.id}") at canonEndingId: expected exactly one canon ending, found 0`,
    );
  }
  if (canonicalEndings.length > 1) {
    const [firstCanonical, secondCanonical] = canonicalEndings;
    throw new Error(
      `Invalid authored case data:\n${sources.endings.sourcePath} (record "${secondCanonical.ending.id}") at [${secondCanonical.endingIndex}].canon: expected exactly one canon ending; "${firstCanonical.ending.id}" is already marked canon`,
    );
  }

  const [canonicalEnding] = canonicalEndings;
  if (bundle.manifest.canonEndingId !== canonicalEnding.ending.id) {
    throw new Error(
      `Invalid authored case reference:\n${sources.manifest.sourcePath} (record "${bundle.manifest.id}") at canonEndingId: "${bundle.manifest.canonEndingId}" does not match canon ending "${canonicalEnding.ending.id}"`,
    );
  }

  assertKnownReferences(
    objectiveIds,
    'objective',
    bundle.manifest.initialObjectiveIds,
    sources.manifest.sourcePath,
    bundle.manifest.id,
    'initialObjectiveIds',
  );

  bundle.characters.forEach((character, characterIndex) => {
    if (character.canonicalCharacterId !== undefined) {
      assertKnownReference(
        characterIds,
        'character',
        character.canonicalCharacterId,
        sources.characters.sourcePath,
        character.id,
        `[${characterIndex}].canonicalCharacterId`,
      );
    }
    if (character.hiddenUntilFact !== undefined) {
      assertKnownReference(
        factIds,
        'fact',
        character.hiddenUntilFact,
        sources.characters.sourcePath,
        character.id,
        `[${characterIndex}].hiddenUntilFact`,
      );
    }
  });

  bundle.evidence.forEach((evidence, evidenceIndex) => {
    assertKnownReferences(
      factIds,
      'fact',
      evidence.grantsFacts,
      sources.evidence.sourcePath,
      evidence.id,
      `[${evidenceIndex}].grantsFacts`,
    );
    assertKnownReferences(
      factIds,
      'fact',
      evidence.hiddenUntilFacts,
      sources.evidence.sourcePath,
      evidence.id,
      `[${evidenceIndex}].hiddenUntilFacts`,
    );
  });

  bundle.facts.forEach((fact, factIndex) => {
    if (fact.reveal !== undefined) {
      assertKnownReference(
        deductionIds,
        'deduction',
        fact.reveal,
        sources.facts.sourcePath,
        fact.id,
        `[${factIndex}].reveal`,
      );
    }
  });

  bundle.deductions.forEach((deduction, deductionIndex) => {
    assertKnownReferences(
      evidenceIds,
      'evidence',
      deduction.requiredAll,
      sources.deductions.sourcePath,
      deduction.id,
      `[${deductionIndex}].requiredAll`,
    );
    deduction.requiredAnyGroups?.forEach((group, groupIndex) => {
      assertKnownReferences(
        evidenceIds,
        'evidence',
        group,
        sources.deductions.sourcePath,
        deduction.id,
        `[${deductionIndex}].requiredAnyGroups[${groupIndex}]`,
      );
    });
    assertKnownReferences(
      factIds,
      'fact',
      deduction.prerequisiteFacts,
      sources.deductions.sourcePath,
      deduction.id,
      `[${deductionIndex}].prerequisiteFacts`,
    );
    assertKnownReferences(
      factIds,
      'fact',
      deduction.grantsFacts,
      sources.deductions.sourcePath,
      deduction.id,
      `[${deductionIndex}].grantsFacts`,
    );
  });

  bundle.locks.forEach((lock, lockIndex) => {
    validateCondition(
      lock.unlockWhen,
      sources.locks.sourcePath,
      lock.id,
      `[${lockIndex}].unlockWhen`,
    );
    assertKnownReferences(
      evidenceIds,
      'evidence',
      lock.requiredEvidence,
      sources.locks.sourcePath,
      lock.id,
      `[${lockIndex}].requiredEvidence`,
    );
  });

  bundle.triggers.forEach((trigger, triggerIndex) => {
    validateCondition(
      trigger.when,
      sources.triggers.sourcePath,
      trigger.id,
      `[${triggerIndex}].when`,
    );
  });
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
    artifacts: parseSource(deferredEmptyCollectionSchema, sources.artifacts),
    browser: parseSource(deferredEmptyCollectionSchema, sources.browser),
    calls: parseSource(deferredEmptyCollectionSchema, sources.calls),
    emails: parseSource(deferredEmptyCollectionSchema, sources.emails),
    locations: parseSource(deferredEmptyCollectionSchema, sources.locations),
    messages: parseSource(deferredEmptyCollectionSchema, sources.messages),
    notes: parseSource(deferredEmptyCollectionSchema, sources.notes),
    photos: parseSource(deferredEmptyCollectionSchema, sources.photos),
    timeline: parseSource(deferredEmptyCollectionSchema, sources.timeline),
  });

  const coreIndex = new Map<string, CoreCaseIndexEntry>();

  const addRecord = (entry: CoreCaseIndexEntry) => {
    const existing = coreIndex.get(entry.value.id);
    if (existing !== undefined) {
      throw new Error(
        `Duplicate ID "${entry.value.id}": first declared in ${existing.sourcePath}; repeated in ${entry.sourcePath}`,
      );
    }

    coreIndex.set(entry.value.id, entry);
  };

  addRecord({
    kind: 'manifest',
    sourcePath: sources.manifest.sourcePath,
    value: bundle.manifest,
  });
  bundle.characters.forEach((value) => addRecord({
    kind: 'character', sourcePath: sources.characters.sourcePath, value,
  }));
  bundle.evidence.forEach((value) => addRecord({
    kind: 'evidence', sourcePath: sources.evidence.sourcePath, value,
  }));
  bundle.facts.forEach((value) => addRecord({
    kind: 'fact', sourcePath: sources.facts.sourcePath, value,
  }));
  bundle.deductions.forEach((value) => addRecord({
    kind: 'deduction', sourcePath: sources.deductions.sourcePath, value,
  }));
  bundle.objectives.forEach((value) => addRecord({
    kind: 'objective', sourcePath: sources.objectives.sourcePath, value,
  }));
  bundle.locks.forEach((value) => addRecord({
    kind: 'lock', sourcePath: sources.locks.sourcePath, value,
  }));
  bundle.triggers.forEach((value) => addRecord({
    kind: 'trigger', sourcePath: sources.triggers.sourcePath, value,
  }));
  bundle.endings.forEach((value) => addRecord({
    kind: 'ending', sourcePath: sources.endings.sourcePath, value,
  }));

  validateCaseReferences(bundle, sources);

  const sourceMetadata: CaseSourceMetadata = {
    manifest: {
      sourcePath: sources.manifest.sourcePath, validation: 'core', indexed: true,
    },
    characters: {
      sourcePath: sources.characters.sourcePath, validation: 'core', indexed: true,
    },
    evidence: {
      sourcePath: sources.evidence.sourcePath, validation: 'core', indexed: true,
    },
    facts: {
      sourcePath: sources.facts.sourcePath, validation: 'core', indexed: true,
    },
    deductions: {
      sourcePath: sources.deductions.sourcePath, validation: 'core', indexed: true,
    },
    objectives: {
      sourcePath: sources.objectives.sourcePath, validation: 'core', indexed: true,
    },
    locks: {
      sourcePath: sources.locks.sourcePath, validation: 'core', indexed: true,
    },
    triggers: {
      sourcePath: sources.triggers.sourcePath, validation: 'core', indexed: true,
    },
    endings: {
      sourcePath: sources.endings.sourcePath, validation: 'core', indexed: true,
    },
    artifacts: {
      sourcePath: sources.artifacts.sourcePath, validation: 'deferred-empty', indexed: false,
    },
    browser: {
      sourcePath: sources.browser.sourcePath, validation: 'deferred-empty', indexed: false,
    },
    calls: {
      sourcePath: sources.calls.sourcePath, validation: 'deferred-empty', indexed: false,
    },
    emails: {
      sourcePath: sources.emails.sourcePath, validation: 'deferred-empty', indexed: false,
    },
    locations: {
      sourcePath: sources.locations.sourcePath, validation: 'deferred-empty', indexed: false,
    },
    messages: {
      sourcePath: sources.messages.sourcePath, validation: 'deferred-empty', indexed: false,
    },
    notes: {
      sourcePath: sources.notes.sourcePath, validation: 'deferred-empty', indexed: false,
    },
    photos: {
      sourcePath: sources.photos.sourcePath, validation: 'deferred-empty', indexed: false,
    },
    timeline: {
      sourcePath: sources.timeline.sourcePath, validation: 'deferred-empty', indexed: false,
    },
  };

  return { ...bundle, coreIndex, sourceMetadata };
}
