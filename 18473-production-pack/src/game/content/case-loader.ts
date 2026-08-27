import { z } from 'zod';
import { analyzeCaseProgression } from '@/game/engine/progression';
import {
  caseBundleSchema,
  caseManifestSchema,
  characterSchema,
  deductionSchema,
  endingSchema,
  evidenceSchema,
  factSchema,
  graphRecordSchema,
  lockSchema,
  objectiveSchema,
  timelineRecordSchema,
  triggerSchema,
  type CaseBundle,
  type Condition,
} from '@/game/schema/case';
import {
  artifactRecordSchema,
  browserRecordSchema,
  callRecordSchema,
  emailRecordSchema,
  locationRecordSchema,
  messageThreadRecordSchema,
  noteRecordSchema,
  photoRecordSchema,
  type AuthoredArtifactRecord,
} from '@/game/schema/authored-artifact';

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
  graph: AuthoredSource;
  timeline: AuthoredSource;
  artifacts: AuthoredSource;
  browser: AuthoredSource;
  calls: AuthoredSource;
  emails: AuthoredSource;
  locations: AuthoredSource;
  messages: AuthoredSource;
  notes: AuthoredSource;
  photos: AuthoredSource;
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
  'graph',
  'timeline',
] as const;

export const authoredArtifactCaseSourceKeys = [
  'artifacts',
  'browser',
  'calls',
  'emails',
  'locations',
  'messages',
  'notes',
  'photos',
] as const;

/** @deprecated Phase 04 promoted these sources; retained as a migration alias. */
export const deferredCaseSourceKeys = authoredArtifactCaseSourceKeys;

export type CoreCaseSourceKey = (typeof coreCaseSourceKeys)[number];
export type AuthoredArtifactCaseSourceKey = (typeof authoredArtifactCaseSourceKeys)[number];
export type CaseSourceKey = CoreCaseSourceKey | AuthoredArtifactCaseSourceKey;

export type CaseSourceMetadata = {
  [Key in CaseSourceKey]: {
    sourcePath: string;
    validation: Key extends AuthoredArtifactCaseSourceKey ? 'authored-artifact' : 'core';
    indexed: true;
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
  'graph-node': Extract<CaseBundle['graph'][number], { recordType: 'node' }>;
  'graph-edge': Extract<CaseBundle['graph'][number], { recordType: 'edge' }>;
  'timeline-position': Extract<CaseBundle['timeline'][number], { recordType: 'position' }>;
  'timeline-event': Extract<CaseBundle['timeline'][number], { recordType: 'event' }>;
  artifact: CaseBundle['artifacts'][number];
  browser: CaseBundle['browser'][number];
  call: CaseBundle['calls'][number];
  email: CaseBundle['emails'][number];
  location: CaseBundle['locations'][number];
  message: CaseBundle['messages'][number];
  note: CaseBundle['notes'][number];
  photo: CaseBundle['photos'][number];
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

type ReferenceTargetKind =
  | 'character'
  | 'artifact'
  | 'content'
  | 'deduction'
  | 'ending'
  | 'evidence'
  | 'fact'
  | 'graph edge'
  | 'graph node'
  | 'lock'
  | 'objective'
  | 'timeline position';

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
  const lockIds = new Set(bundle.locks.map(({ id }) => id));
  const objectiveIds = new Set(bundle.objectives.map(({ id }) => id));
  const graphNodeIds = new Set(
    bundle.graph.flatMap((record) => (record.recordType === 'node' ? [record.id] : [])),
  );
  const graphEdgeIds = new Set(
    bundle.graph.flatMap((record) => (record.recordType === 'edge' ? [record.id] : [])),
  );
  const timelinePositionIds = new Set(
    bundle.timeline.flatMap((record) => (record.recordType === 'position' ? [record.id] : [])),
  );
  const authoredCollections: Array<{
    sourceKey: AuthoredArtifactCaseSourceKey;
    records: readonly AuthoredArtifactRecord[];
  }> = authoredArtifactCaseSourceKeys.map((sourceKey) => ({
    sourceKey,
    records: bundle[sourceKey],
  }));
  const artifactIds = new Set(
    authoredCollections.flatMap(({ records }) => records.map(({ id }) => id)),
  );

  const validateCondition = (
    condition: Condition,
    sourcePath: string,
    recordId: string,
    basePath: string,
  ): void => {
    if ('fact' in condition) {
      assertKnownReference(factIds, 'fact', condition.fact, sourcePath, recordId, `${basePath}.fact`);
    } else if ('allFacts' in condition) {
      assertKnownReferences(
        factIds,
        'fact',
        condition.allFacts,
        sourcePath,
        recordId,
        `${basePath}.allFacts`,
      );
    } else if ('evidence' in condition) {
      assertKnownReference(
        evidenceIds,
        'evidence',
        condition.evidence,
        sourcePath,
        recordId,
        `${basePath}.evidence`,
      );
    } else if ('allEvidence' in condition) {
      assertKnownReferences(
        evidenceIds,
        'evidence',
        condition.allEvidence,
        sourcePath,
        recordId,
        `${basePath}.allEvidence`,
      );
    } else if ('evidenceThreshold' in condition) {
      assertKnownReferences(
        evidenceIds,
        'evidence',
        condition.evidenceThreshold.anyOf,
        sourcePath,
        recordId,
        `${basePath}.evidenceThreshold.anyOf`,
      );
    } else if ('deductionCompleted' in condition) {
      assertKnownReference(
        deductionIds,
        'deduction',
        condition.deductionCompleted,
        sourcePath,
        recordId,
        `${basePath}.deductionCompleted`,
      );
    } else if ('objectiveCompleted' in condition) {
      assertKnownReference(
        objectiveIds,
        'objective',
        condition.objectiveCompleted,
        sourcePath,
        recordId,
        `${basePath}.objectiveCompleted`,
      );
    } else if ('artifactViewed' in condition) {
      assertKnownReference(
        artifactIds,
        'artifact',
        condition.artifactViewed,
        sourcePath,
        recordId,
        `${basePath}.artifactViewed`,
      );
    } else if ('edgeConfidenceAtLeast' in condition) {
      assertKnownReference(
        graphEdgeIds,
        'graph edge',
        condition.edgeConfidenceAtLeast.edgeId,
        sourcePath,
        recordId,
        `${basePath}.edgeConfidenceAtLeast.edgeId`,
      );
    } else if ('endingSelected' in condition) {
      assertKnownReference(
        endingIds,
        'ending',
        condition.endingSelected,
        sourcePath,
        recordId,
        `${basePath}.endingSelected`,
      );
    } else if ('allOf' in condition) {
      condition.allOf.forEach((child, childIndex) => {
        validateCondition(child, sourcePath, recordId, `${basePath}.allOf[${childIndex}]`);
      });
    } else if ('anyOf' in condition) {
      condition.anyOf.forEach((child, childIndex) => {
        validateCondition(child, sourcePath, recordId, `${basePath}.anyOf[${childIndex}]`);
      });
    }
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

  const activeObjectiveIds = new Set(
    bundle.objectives.flatMap((objective) => (objective.state === 'active' ? [objective.id] : [])),
  );
  bundle.manifest.initialObjectiveIds.forEach((objectiveId, objectiveIndex) => {
    if (activeObjectiveIds.has(objectiveId)) return;
    throw new Error(
      `Invalid authored case reference:\n${sources.manifest.sourcePath} (record "${bundle.manifest.id}") at initialObjectiveIds[${objectiveIndex}]: objective "${objectiveId}" is not authored with state "active"`,
    );
  });

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
    assertKnownReference(
      artifactIds,
      'artifact',
      evidence.sourceArtifactId,
      sources.evidence.sourcePath,
      evidence.id,
      `[${evidenceIndex}].sourceArtifactId`,
    );
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

  bundle.objectives.forEach((objective, objectiveIndex) => {
    if (objective.activateWhen !== undefined) {
      validateCondition(
        objective.activateWhen,
        sources.objectives.sourcePath,
        objective.id,
        `[${objectiveIndex}].activateWhen`,
      );
    }
    if (objective.completeWhen !== undefined) {
      validateCondition(
        objective.completeWhen,
        sources.objectives.sourcePath,
        objective.id,
        `[${objectiveIndex}].completeWhen`,
      );
    }
  });

  bundle.endings.forEach((ending, endingIndex) => {
    if (ending.gateLockId !== undefined) {
      assertKnownReference(
        lockIds,
        'lock',
        ending.gateLockId,
        sources.endings.sourcePath,
        ending.id,
        `[${endingIndex}].gateLockId`,
      );
    }
    assertKnownReferences(
      graphEdgeIds,
      'graph edge',
      ending.onSelect?.confirmGraphEdgeIds,
      sources.endings.sourcePath,
      ending.id,
      `[${endingIndex}].onSelect.confirmGraphEdgeIds`,
    );
    assertKnownReferences(
      graphEdgeIds,
      'graph edge',
      ending.onSelect?.severGraphEdgeIds,
      sources.endings.sourcePath,
      ending.id,
      `[${endingIndex}].onSelect.severGraphEdgeIds`,
    );
  });

  bundle.graph.forEach((record, recordIndex) => {
    if (record.recordType === 'node') {
      if (record.canonicalCharacterId !== undefined) {
        assertKnownReference(
          characterIds,
          'character',
          record.canonicalCharacterId,
          sources.graph.sourcePath,
          record.id,
          `[${recordIndex}].canonicalCharacterId`,
        );
      }
      if (record.identityRevealFact !== undefined) {
        assertKnownReference(
          factIds,
          'fact',
          record.identityRevealFact,
          sources.graph.sourcePath,
          record.id,
          `[${recordIndex}].identityRevealFact`,
        );
      }
      assertKnownReferences(
        factIds,
        'fact',
        record.hiddenUntilFacts,
        sources.graph.sourcePath,
        record.id,
        `[${recordIndex}].hiddenUntilFacts`,
      );
      return;
    }

    if (record.fromNodeId === record.toNodeId) {
      throw new Error(
        `Invalid authored case reference:\n${sources.graph.sourcePath} (record "${record.id}") at [${recordIndex}].toNodeId: edge endpoints must reference two different graph nodes`,
      );
    }
    assertKnownReference(
      graphNodeIds,
      'graph node',
      record.fromNodeId,
      sources.graph.sourcePath,
      record.id,
      `[${recordIndex}].fromNodeId`,
    );
    assertKnownReference(
      graphNodeIds,
      'graph node',
      record.toNodeId,
      sources.graph.sourcePath,
      record.id,
      `[${recordIndex}].toNodeId`,
    );
    record.confidenceSources.forEach((source, sourceIndex) => {
      assertKnownReference(
        evidenceIds,
        'evidence',
        source.evidenceId,
        sources.graph.sourcePath,
        record.id,
        `[${recordIndex}].confidenceSources[${sourceIndex}].evidenceId`,
      );
    });
    assertKnownReferences(
      factIds,
      'fact',
      record.hiddenUntilFacts,
      sources.graph.sourcePath,
      record.id,
      `[${recordIndex}].hiddenUntilFacts`,
    );
  });

  const seenPositionOrders = new Map<number, string>();
  bundle.timeline.forEach((record, recordIndex) => {
    if (record.recordType === 'position') {
      const existingPositionId = seenPositionOrders.get(record.order);
      if (existingPositionId !== undefined) {
        throw new Error(
          `Invalid authored case reference:\n${sources.timeline.sourcePath} (record "${record.id}") at [${recordIndex}].order: order ${record.order} is already used by position "${existingPositionId}"`,
        );
      }
      seenPositionOrders.set(record.order, record.id);
      return;
    }

    assertKnownReferences(
      timelinePositionIds,
      'timeline position',
      record.acceptablePositionIds,
      sources.timeline.sourcePath,
      record.id,
      `[${recordIndex}].acceptablePositionIds`,
    );
    assertKnownReferences(
      evidenceIds,
      'evidence',
      record.requiredEvidenceIds,
      sources.timeline.sourcePath,
      record.id,
      `[${recordIndex}].requiredEvidenceIds`,
    );
    assertKnownReferences(
      factIds,
      'fact',
      record.hiddenUntilFacts,
      sources.timeline.sourcePath,
      record.id,
      `[${recordIndex}].hiddenUntilFacts`,
    );
    assertKnownReferences(
      factIds,
      'fact',
      record.grantsFactsWhenPlaced,
      sources.timeline.sourcePath,
      record.id,
      `[${recordIndex}].grantsFactsWhenPlaced`,
    );
  });

  authoredCollections.forEach(({ sourceKey, records }) => {
    records.forEach((record, recordIndex) => {
      const sourcePath = sources[sourceKey].sourcePath;
      assertKnownReferences(
        factIds,
        'fact',
        record.hiddenUntilFacts,
        sourcePath,
        record.id,
        `[${recordIndex}].hiddenUntilFacts`,
      );
      assertKnownReferences(
        endingIds,
        'ending',
        record.hiddenUntilEndings,
        sourcePath,
        record.id,
        `[${recordIndex}].hiddenUntilEndings`,
      );
      assertKnownReferences(
        artifactIds,
        'artifact',
        record.discovery?.artifactIds,
        sourcePath,
        record.id,
        `[${recordIndex}].discovery.artifactIds`,
      );
      assertKnownReferences(
        evidenceIds,
        'evidence',
        record.discovery?.evidenceIds,
        sourcePath,
        record.id,
        `[${recordIndex}].discovery.evidenceIds`,
      );
      assertKnownReferences(
        artifactIds,
        'content',
        record.discovery?.unlockContentIds,
        sourcePath,
        record.id,
        `[${recordIndex}].discovery.unlockContentIds`,
      );
      record.deepLinks?.forEach((link, linkIndex) => {
        if (link.contentId === undefined) return;
        assertKnownReference(
          artifactIds,
          'content',
          link.contentId,
          sourcePath,
          record.id,
          `[${recordIndex}].deepLinks[${linkIndex}].contentId`,
        );
      });
    });
  });
}

/**
 * A manifest that declares `progressionComplete: true` promises a finished,
 * fair-play case: every authored record must be reachable. Cases still in
 * production omit the flag and use `analyzeCaseProgression` reports instead,
 * so enabling the flag later only adds validation and never weakens it.
 */
function enforceDeclaredCompleteProgression(
  bundle: CaseBundle,
  sources: CaseBundleSources,
): void {
  if (bundle.manifest.progressionComplete !== true) return;
  const { issues } = analyzeCaseProgression(bundle);
  if (issues.length === 0) return;

  const details = issues.map((issue) => (
    `${sources.manifest.sourcePath} (record "${bundle.manifest.id}") at progressionComplete: ${issue.message}`
  ));
  throw new Error(`Invalid authored case progression:\n${details.join('\n')}`);
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
    graph: parseSource(z.array(graphRecordSchema), sources.graph),
    timeline: parseSource(z.array(timelineRecordSchema), sources.timeline),
    artifacts: parseSource(z.array(artifactRecordSchema), sources.artifacts),
    browser: parseSource(z.array(browserRecordSchema), sources.browser),
    calls: parseSource(z.array(callRecordSchema), sources.calls),
    emails: parseSource(z.array(emailRecordSchema), sources.emails),
    locations: parseSource(z.array(locationRecordSchema), sources.locations),
    messages: parseSource(z.array(messageThreadRecordSchema), sources.messages),
    notes: parseSource(z.array(noteRecordSchema), sources.notes),
    photos: parseSource(z.array(photoRecordSchema), sources.photos),
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
  bundle.graph.forEach((value) => addRecord(value.recordType === 'node'
    ? { kind: 'graph-node', sourcePath: sources.graph.sourcePath, value }
    : { kind: 'graph-edge', sourcePath: sources.graph.sourcePath, value }));
  bundle.timeline.forEach((value) => addRecord(value.recordType === 'position'
    ? { kind: 'timeline-position', sourcePath: sources.timeline.sourcePath, value }
    : { kind: 'timeline-event', sourcePath: sources.timeline.sourcePath, value }));
  bundle.artifacts.forEach((value) => addRecord({
    kind: 'artifact', sourcePath: sources.artifacts.sourcePath, value,
  }));
  bundle.browser.forEach((value) => addRecord({
    kind: 'browser', sourcePath: sources.browser.sourcePath, value,
  }));
  bundle.calls.forEach((value) => addRecord({
    kind: 'call', sourcePath: sources.calls.sourcePath, value,
  }));
  bundle.emails.forEach((value) => addRecord({
    kind: 'email', sourcePath: sources.emails.sourcePath, value,
  }));
  bundle.locations.forEach((value) => addRecord({
    kind: 'location', sourcePath: sources.locations.sourcePath, value,
  }));
  bundle.messages.forEach((value) => addRecord({
    kind: 'message', sourcePath: sources.messages.sourcePath, value,
  }));
  bundle.notes.forEach((value) => addRecord({
    kind: 'note', sourcePath: sources.notes.sourcePath, value,
  }));
  bundle.photos.forEach((value) => addRecord({
    kind: 'photo', sourcePath: sources.photos.sourcePath, value,
  }));

  validateCaseReferences(bundle, sources);
  enforceDeclaredCompleteProgression(bundle, sources);

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
    graph: {
      sourcePath: sources.graph.sourcePath, validation: 'core', indexed: true,
    },
    timeline: {
      sourcePath: sources.timeline.sourcePath, validation: 'core', indexed: true,
    },
    artifacts: {
      sourcePath: sources.artifacts.sourcePath, validation: 'authored-artifact', indexed: true,
    },
    browser: {
      sourcePath: sources.browser.sourcePath, validation: 'authored-artifact', indexed: true,
    },
    calls: {
      sourcePath: sources.calls.sourcePath, validation: 'authored-artifact', indexed: true,
    },
    emails: {
      sourcePath: sources.emails.sourcePath, validation: 'authored-artifact', indexed: true,
    },
    locations: {
      sourcePath: sources.locations.sourcePath, validation: 'authored-artifact', indexed: true,
    },
    messages: {
      sourcePath: sources.messages.sourcePath, validation: 'authored-artifact', indexed: true,
    },
    notes: {
      sourcePath: sources.notes.sourcePath, validation: 'authored-artifact', indexed: true,
    },
    photos: {
      sourcePath: sources.photos.sourcePath, validation: 'authored-artifact', indexed: true,
    },
  };

  return { ...bundle, coreIndex, sourceMetadata };
}
