import { readdirSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  parseCaseBundle,
  type CaseBundleSources,
} from '../../src/game/content/case-loader';
import { case001Seed } from '../../src/game/content/case-001';
import type { Evidence } from '../../src/game/schema/case';

function createValidSources() {
  return {
    manifest: {
      sourcePath: 'content/cases/test/case.json',
      data: {
        id: 'case_test',
        title: 'Test case',
        version: 1,
        locale: 'mn',
        targetMinutes: 60,
        initialObjectiveIds: ['obj_test'],
        appIds: ['messages'],
        canonEndingId: 'ending_test',
      },
    },
    characters: {
      sourcePath: 'content/cases/test/characters.json',
      data: [{ id: 'char_test', name: 'Test', role: 'suspect' }],
    },
    evidence: {
      sourcePath: 'content/cases/test/evidence.json',
      data: [{
        id: 'ev_test',
        title: 'Evidence',
        sourceArtifactId: 'artifact_test',
        description: 'Description',
        tags: [],
      }],
    },
    facts: {
      sourcePath: 'content/cases/test/facts.json',
      data: [{ id: 'fact_test', secret: false }],
    },
    deductions: {
      sourcePath: 'content/cases/test/deductions.json',
      data: [{ id: 'ded_test', title: 'Deduction', grantsFacts: ['fact_test'] }],
    },
    objectives: {
      sourcePath: 'content/cases/test/objectives.json',
      data: [{ id: 'obj_test', title: 'Objective', state: 'active' }],
    },
    locks: {
      sourcePath: 'content/cases/test/locks.json',
      data: [{ id: 'lock_test', title: 'Lock', unlockWhen: { fact: 'fact_test' } }],
    },
    triggers: {
      sourcePath: 'content/cases/test/triggers.json',
      data: [{
        id: 'tr_test',
        when: { fact: 'fact_test' },
        effects: [{ type: 'unlock', target: 'artifact_test' }],
      }],
    },
    endings: {
      sourcePath: 'content/cases/test/endings.json',
      data: [{
        id: 'ending_test',
        title: 'Ending',
        choiceLabel: 'END',
        description: 'Description',
        canon: true,
      }],
    },
    graph: { sourcePath: 'content/cases/test/graph.json', data: [] },
    timeline: { sourcePath: 'content/cases/test/timeline.json', data: [] },
    artifacts: { sourcePath: 'content/cases/test/artifacts.json', data: [] },
    browser: { sourcePath: 'content/cases/test/browser.json', data: [] },
    calls: { sourcePath: 'content/cases/test/calls.json', data: [] },
    emails: { sourcePath: 'content/cases/test/emails.json', data: [] },
    locations: { sourcePath: 'content/cases/test/locations.json', data: [] },
    messages: { sourcePath: 'content/cases/test/messages.json', data: [] },
    notes: { sourcePath: 'content/cases/test/notes.json', data: [] },
    photos: { sourcePath: 'content/cases/test/photos.json', data: [] },
  };
}

type ValidSources = ReturnType<typeof createValidSources>;

function replaceSource(
  sources: ValidSources,
  key: keyof ValidSources,
  data: unknown,
): CaseBundleSources {
  return {
    ...sources,
    [key]: { ...sources[key], data },
  };
}

const danglingReferenceCases: Array<{
  name: string;
  makeSources: (sources: ValidSources) => CaseBundleSources;
  expected: RegExp;
}> = [
  {
    name: 'rejects an unknown canonical ending',
    makeSources: (sources) => replaceSource(sources, 'manifest', {
      ...sources.manifest.data,
      canonEndingId: 'ending_missing',
    }),
    expected: /case\.json.*case_test.*canonEndingId.*unknown ending ID "ending_missing"/s,
  },
  {
    name: 'rejects an unknown initial objective',
    makeSources: (sources) => replaceSource(sources, 'manifest', {
      ...sources.manifest.data,
      initialObjectiveIds: ['obj_missing'],
    }),
    expected: /case\.json.*case_test.*initialObjectiveIds\[0\].*unknown objective ID "obj_missing"/s,
  },
  {
    name: 'rejects an unknown canonical character',
    makeSources: (sources) => replaceSource(sources, 'characters', [{
      id: 'char_test',
      name: 'Test',
      role: 'suspect',
      canonicalCharacterId: 'char_missing',
    }]),
    expected: /characters\.json.*char_test.*\[0\]\.canonicalCharacterId.*unknown character ID "char_missing"/s,
  },
  {
    name: 'rejects an unknown character reveal fact',
    makeSources: (sources) => replaceSource(sources, 'characters', [{
      id: 'char_test',
      name: 'Test',
      role: 'suspect',
      hiddenUntilFact: 'fact_missing',
    }]),
    expected: /characters\.json.*char_test.*\[0\]\.hiddenUntilFact.*unknown fact ID "fact_missing"/s,
  },
  {
    name: 'rejects an unknown evidence-granted fact',
    makeSources: (sources) => replaceSource(sources, 'evidence', [{
      ...sources.evidence.data[0],
      grantsFacts: ['fact_missing'],
    }]),
    expected: /evidence\.json.*ev_test.*\[0\]\.grantsFacts\[0\].*unknown fact ID "fact_missing"/s,
  },
  {
    name: 'rejects an unknown evidence reveal fact',
    makeSources: (sources) => replaceSource(sources, 'evidence', [{
      ...sources.evidence.data[0],
      hiddenUntilFacts: ['fact_missing'],
    }]),
    expected: /evidence\.json.*ev_test.*\[0\]\.hiddenUntilFacts\[0\].*unknown fact ID "fact_missing"/s,
  },
  {
    name: 'rejects an unknown required deduction evidence ID',
    makeSources: (sources) => replaceSource(sources, 'deductions', [{
      ...sources.deductions.data[0],
      requiredAll: ['ev_missing'],
    }]),
    expected: /deductions\.json.*ded_test.*\[0\]\.requiredAll\[0\].*unknown evidence ID "ev_missing"/s,
  },
  {
    name: 'rejects an unknown grouped deduction evidence ID',
    makeSources: (sources) => replaceSource(sources, 'deductions', [{
      ...sources.deductions.data[0],
      requiredAnyGroups: [['ev_missing']],
    }]),
    expected: /deductions\.json.*ded_test.*\[0\]\.requiredAnyGroups\[0\]\[0\].*unknown evidence ID "ev_missing"/s,
  },
  {
    name: 'rejects an unknown prerequisite fact',
    makeSources: (sources) => replaceSource(sources, 'deductions', [{
      ...sources.deductions.data[0],
      prerequisiteFacts: ['fact_missing'],
    }]),
    expected: /deductions\.json.*ded_test.*\[0\]\.prerequisiteFacts\[0\].*unknown fact ID "fact_missing"/s,
  },
  {
    name: 'rejects an unknown granted fact',
    makeSources: (sources) => replaceSource(sources, 'deductions', [{
      ...sources.deductions.data[0],
      grantsFacts: ['fact_missing'],
    }]),
    expected: /deductions\.json.*ded_test.*\[0\]\.grantsFacts\[0\].*unknown fact ID "fact_missing"/s,
  },
  {
    name: 'rejects an unknown fact reveal deduction',
    makeSources: (sources) => replaceSource(sources, 'facts', [{
      ...sources.facts.data[0],
      reveal: 'ded_missing',
    }]),
    expected: /facts\.json.*fact_test.*\[0\]\.reveal.*unknown deduction ID "ded_missing"/s,
  },
  {
    name: 'rejects an unknown lock condition fact',
    makeSources: (sources) => replaceSource(sources, 'locks', [{
      ...sources.locks.data[0],
      unlockWhen: { allFacts: ['fact_missing'] },
    }]),
    expected: /locks\.json.*lock_test.*\[0\]\.unlockWhen\.allFacts\[0\].*unknown fact ID "fact_missing"/s,
  },
  {
    name: 'rejects an unknown lock evidence requirement',
    makeSources: (sources) => replaceSource(sources, 'locks', [{
      ...sources.locks.data[0],
      requiredEvidence: ['ev_missing'],
    }]),
    expected: /locks\.json.*lock_test.*\[0\]\.requiredEvidence\[0\].*unknown evidence ID "ev_missing"/s,
  },
  {
    name: 'rejects an unknown trigger condition fact',
    makeSources: (sources) => replaceSource(sources, 'triggers', [{
      ...sources.triggers.data[0],
      when: { fact: 'fact_missing' },
    }]),
    expected: /triggers\.json.*tr_test.*\[0\]\.when\.fact.*unknown fact ID "fact_missing"/s,
  },
  {
    name: 'rejects an unknown evidence ID inside a nested composite condition',
    makeSources: (sources) => replaceSource(sources, 'triggers', [{
      ...sources.triggers.data[0],
      when: { allOf: [{ anyOf: [{ evidence: 'ev_missing' }] }] },
    }]),
    expected: /triggers\.json.*tr_test.*\[0\]\.when\.allOf\[0\]\.anyOf\[0\]\.evidence.*unknown evidence ID "ev_missing"/s,
  },
  {
    name: 'rejects an unknown evidence-threshold candidate',
    makeSources: (sources) => replaceSource(sources, 'triggers', [{
      ...sources.triggers.data[0],
      when: { evidenceThreshold: { anyOf: ['ev_missing'], minimum: 1 } },
    }]),
    expected: /triggers\.json.*tr_test.*\[0\]\.when\.evidenceThreshold\.anyOf\[0\].*unknown evidence ID "ev_missing"/s,
  },
  {
    name: 'rejects an unknown deduction reference in a trigger condition',
    makeSources: (sources) => replaceSource(sources, 'triggers', [{
      ...sources.triggers.data[0],
      when: { deductionCompleted: 'ded_missing' },
    }]),
    expected: /triggers\.json.*tr_test.*\[0\]\.when\.deductionCompleted.*unknown deduction ID "ded_missing"/s,
  },
  {
    name: 'rejects an unknown edge reference in a confidence condition',
    makeSources: (sources) => replaceSource(sources, 'triggers', [{
      ...sources.triggers.data[0],
      when: { edgeConfidenceAtLeast: { edgeId: 'edge_missing', minimum: 50 } },
    }]),
    expected: /triggers\.json.*tr_test.*\[0\]\.when\.edgeConfidenceAtLeast\.edgeId.*unknown graph edge ID "edge_missing"/s,
  },
  {
    name: 'rejects an unknown ending reference in a trigger condition',
    makeSources: (sources) => replaceSource(sources, 'triggers', [{
      ...sources.triggers.data[0],
      when: { endingSelected: 'ending_missing' },
    }]),
    expected: /triggers\.json.*tr_test.*\[0\]\.when\.endingSelected.*unknown ending ID "ending_missing"/s,
  },
  {
    name: 'rejects an unknown objective activation condition fact',
    makeSources: (sources) => replaceSource(sources, 'objectives', [
      sources.objectives.data[0],
      {
        id: 'obj_gated',
        title: 'Gated objective',
        state: 'locked',
        activateWhen: { fact: 'fact_missing' },
      },
    ]),
    expected: /objectives\.json.*obj_gated.*\[1\]\.activateWhen\.fact.*unknown fact ID "fact_missing"/s,
  },
  {
    name: 'rejects an unknown ending gate lock',
    makeSources: (sources) => replaceSource(sources, 'endings', [{
      ...sources.endings.data[0],
      gateLockId: 'lock_missing',
    }]),
    expected: /endings\.json.*ending_test.*\[0\]\.gateLockId.*unknown lock ID "lock_missing"/s,
  },
  {
    name: 'rejects an unknown ending edge effect',
    makeSources: (sources) => replaceSource(sources, 'endings', [{
      ...sources.endings.data[0],
      onSelect: { severGraphEdgeIds: ['edge_missing'] },
    }]),
    expected: /endings\.json.*ending_test.*\[0\]\.onSelect\.severGraphEdgeIds\[0\].*unknown graph edge ID "edge_missing"/s,
  },
  {
    name: 'rejects a graph edge referencing an unknown node',
    makeSources: (sources) => replaceSource(sources, 'graph', [
      {
        recordType: 'node',
        id: 'node_a',
        nodeType: 'person',
        publicLabel: 'A',
      },
      {
        recordType: 'edge',
        id: 'edge_test',
        fromNodeId: 'node_a',
        toNodeId: 'node_missing',
        kind: 'observed',
        confidenceSources: [],
      },
    ]),
    expected: /graph\.json.*edge_test.*\[1\]\.toNodeId.*unknown graph node ID "node_missing"/s,
  },
  {
    name: 'rejects a graph edge whose endpoints are the same node',
    makeSources: (sources) => replaceSource(sources, 'graph', [
      {
        recordType: 'node',
        id: 'node_a',
        nodeType: 'person',
        publicLabel: 'A',
      },
      {
        recordType: 'edge',
        id: 'edge_test',
        fromNodeId: 'node_a',
        toNodeId: 'node_a',
        kind: 'observed',
        confidenceSources: [],
      },
    ]),
    expected: /graph\.json.*edge_test.*\[1\]\.toNodeId.*edge endpoints must reference two different graph nodes/s,
  },
  {
    name: 'rejects a graph confidence source with unknown evidence',
    makeSources: (sources) => replaceSource(sources, 'graph', [
      {
        recordType: 'node',
        id: 'node_a',
        nodeType: 'person',
        publicLabel: 'A',
      },
      {
        recordType: 'node',
        id: 'node_b',
        nodeType: 'device',
        publicLabel: 'B',
      },
      {
        recordType: 'edge',
        id: 'edge_test',
        fromNodeId: 'node_a',
        toNodeId: 'node_b',
        kind: 'inferred',
        confidenceSources: [{ evidenceId: 'ev_missing', weight: 10 }],
      },
    ]),
    expected: /graph\.json.*edge_test.*\[2\]\.confidenceSources\[0\]\.evidenceId.*unknown evidence ID "ev_missing"/s,
  },
  {
    name: 'rejects a timeline event referencing an unknown position',
    makeSources: (sources) => replaceSource(sources, 'timeline', [{
      recordType: 'event',
      id: 'tev_test',
      title: 'Event',
      acceptablePositionIds: ['tpos_missing'],
    }]),
    expected: /timeline\.json.*tev_test.*\[0\]\.acceptablePositionIds\[0\].*unknown timeline position ID "tpos_missing"/s,
  },
  {
    name: 'rejects timeline positions with a duplicated order',
    makeSources: (sources) => replaceSource(sources, 'timeline', [
      { recordType: 'position', id: 'tpos_a', title: 'First', order: 1 },
      { recordType: 'position', id: 'tpos_b', title: 'Second', order: 1 },
    ]),
    expected: /timeline\.json.*tpos_b.*\[1\]\.order.*order 1 is already used by position "tpos_a"/s,
  },
  {
    name: 'rejects an initial objective that is not authored active',
    makeSources: (sources) => {
      const withLockedObjective = replaceSource(sources, 'objectives', [{
        ...sources.objectives.data[0],
        state: 'locked',
      }]);
      return withLockedObjective;
    },
    expected: /case\.json.*case_test.*initialObjectiveIds\[0\].*objective "obj_test" is not authored with state "active"/s,
  },
];

const deferredSourceCases = [
  ['artifacts', 'artifacts.json'],
  ['browser', 'browser.json'],
  ['calls', 'calls.json'],
  ['emails', 'emails.json'],
  ['locations', 'locations.json'],
  ['messages', 'messages.json'],
  ['notes', 'notes.json'],
  ['photos', 'photos.json'],
] as const;

const expectedSourceFiles = [
  'artifacts.json',
  'browser.json',
  'calls.json',
  'case.json',
  'characters.json',
  'deductions.json',
  'emails.json',
  'endings.json',
  'evidence.json',
  'facts.json',
  'graph.json',
  'locations.json',
  'locks.json',
  'messages.json',
  'notes.json',
  'objectives.json',
  'photos.json',
  'timeline.json',
  'triggers.json',
];

describe('case bundle loading', () => {
  it('loads and core-indexes the authored Case #001 seed', () => {
    expect(case001Seed.manifest.id).toBe('case_001');
    expect(case001Seed.coreIndex.get('ev_18473_paper')).toMatchObject({
      kind: 'evidence',
      sourcePath: 'content/cases/case-001/evidence.json',
    });

    const expectedRecordCount = 1
      + case001Seed.characters.length
      + case001Seed.evidence.length
      + case001Seed.facts.length
      + case001Seed.deductions.length
      + case001Seed.objectives.length
      + case001Seed.locks.length
      + case001Seed.triggers.length
      + case001Seed.endings.length
      + case001Seed.graph.length
      + case001Seed.timeline.length;

    expect(case001Seed.coreIndex.size).toBe(expectedRecordCount);
  });

  it('narrows an indexed record value from its kind', () => {
    const entry = case001Seed.coreIndex.get('ev_18473_paper');
    expect(entry?.kind).toBe('evidence');
    if (entry?.kind !== 'evidence') throw new Error('Expected indexed evidence');

    expectTypeOf(entry.value).toEqualTypeOf<Evidence>();
  });

  it('loads every authored Case #001 JSON source with explicit metadata', () => {
    const authoredFiles = readdirSync(
      new URL('../../content/cases/case-001/', import.meta.url),
    ).filter((fileName) => fileName.endsWith('.json')).sort();

    expect(authoredFiles).toEqual(expectedSourceFiles);
    expect(Object.values(case001Seed.sourceMetadata)
      .map(({ sourcePath }) => sourcePath.split('/').at(-1))
      .sort()).toEqual(authoredFiles);
    expect(Object.keys(case001Seed.sourceMetadata)).toHaveLength(19);
  });

  it.each(['graph', 'timeline'] as const)(
    'classifies Phase 03 source %s as core and indexed',
    (sourceKey) => {
      expect(case001Seed.sourceMetadata[sourceKey]).toMatchObject({
        validation: 'core',
        indexed: true,
      });
    },
  );

  it.each(deferredSourceCases)(
    'loads deferred source %s as an explicitly unindexed empty array',
    (sourceKey) => {
      expect(case001Seed[sourceKey]).toEqual([]);
      expect(case001Seed.sourceMetadata[sourceKey]).toMatchObject({
        validation: 'deferred-empty',
        indexed: false,
      });
    },
  );

  it.each(deferredSourceCases)(
    'rejects records in deferred source %s until its later-phase schema exists',
    (sourceKey, fileName) => {
      const invalidSources = replaceSource(createValidSources(), sourceKey, [{ id: 'future' }]);

      expect(() => parseCaseBundle(invalidSources)).toThrowError(
        new RegExp(
          `content/cases/test/${fileName.replace('.', '\\.')}.*record "future".*requires its later-phase schema`,
          's',
        ),
      );
    },
  );

  it.each(deferredSourceCases)(
    'rejects malformed non-array deferred source %s',
    (sourceKey, fileName) => {
      const invalidSources = replaceSource(createValidSources(), sourceKey, { records: [] });

      expect(() => parseCaseBundle(invalidSources)).toThrowError(
        new RegExp(
          `content/cases/test/${fileName.replace('.', '\\.')}.*expected array`,
          's',
        ),
      );
    },
  );

  it('reports the source path, record ID, and issue path for invalid authored data', () => {
    const sources = createValidSources();
    const invalidSources = {
      ...sources,
      characters: {
        ...sources.characters,
        data: [{
          id: 'char_broken',
          name: '',
          role: 'suspect',
          unexpected: true,
        }],
      },
    };

    expect(() => parseCaseBundle(invalidSources)).toThrowError(
      /content\/cases\/test\/characters\.json.*char_broken.*\[0\]\.name/s,
    );
  });

  it('rejects unknown record keys independently of other validation issues', () => {
    const sources = createValidSources();
    const invalidSources = replaceSource(sources, 'characters', [{
      id: 'char_extra_key',
      name: 'Valid name',
      role: 'suspect',
      unexpected: true,
    }]);

    expect(() => parseCaseBundle(invalidSources)).toThrowError(
      /characters\.json.*char_extra_key.*\[0\].*Unrecognized key.*unexpected/s,
    );
  });

  it('rejects duplicate IDs across typed record sources', () => {
    const sources = createValidSources();
    const duplicateSources = {
      ...sources,
      facts: {
        ...sources.facts,
        data: [{ id: 'ev_test', secret: false }],
      },
    };

    expect(() => parseCaseBundle(duplicateSources)).toThrowError(
      /Duplicate ID "ev_test".*evidence\.json.*facts\.json/s,
    );
  });

  it.each(danglingReferenceCases)('$name', ({ makeSources, expected }) => {
    expect(() => parseCaseBundle(makeSources(createValidSources()))).toThrowError(expected);
  });

  it('rejects duplicate evidence candidates that could be double-counted', () => {
    const sources = createValidSources();
    const invalidSources = replaceSource(sources, 'deductions', [{
      ...sources.deductions.data[0],
      requiredAnyGroups: [['ev_test', 'ev_test']],
      minimumFromAnyGroup: 1,
    }]);

    expect(() => parseCaseBundle(invalidSources)).toThrowError(
      /deductions\.json.*ded_test.*\[0\]\.requiredAnyGroups\[0\]\[1\].*duplicate candidate evidence ID "ev_test"/s,
    );
  });

  it('rejects a threshold above the number of distinct evidence candidates', () => {
    const sources = createValidSources();
    const invalidSources = replaceSource(sources, 'deductions', [{
      ...sources.deductions.data[0],
      requiredAnyGroups: [['ev_test']],
      minimumFromAnyGroup: 2,
    }]);

    expect(() => parseCaseBundle(invalidSources)).toThrowError(
      /deductions\.json.*ded_test.*\[0\]\.minimumFromAnyGroup.*threshold 2 exceeds 1 distinct candidate/s,
    );
  });

  it('rejects a manifest ending that exists but is not the canonical ending', () => {
    const sources = createValidSources();
    const invalidSources = replaceSource(sources, 'endings', [
      { ...sources.endings.data[0], canon: false },
      {
        id: 'ending_actual',
        title: 'Actual ending',
        choiceLabel: 'ACTUAL',
        description: 'Canonical ending',
        canon: true,
      },
    ]);

    expect(() => parseCaseBundle(invalidSources)).toThrowError(
      /case\.json.*case_test.*canonEndingId.*ending_test.*canon ending.*ending_actual/s,
    );
  });

  it('rejects multiple canonical endings at the second canonical record', () => {
    const sources = createValidSources();
    const invalidSources = replaceSource(sources, 'endings', [
      sources.endings.data[0],
      {
        id: 'ending_other',
        title: 'Other ending',
        choiceLabel: 'OTHER',
        description: 'Another canonical ending',
        canon: true,
      },
    ]);

    expect(() => parseCaseBundle(invalidSources)).toThrowError(
      /endings\.json.*ending_other.*\[1\]\.canon.*exactly one canon ending.*ending_test/s,
    );
  });

  it('rejects a bundle with no canonical ending', () => {
    const sources = createValidSources();
    const invalidSources = replaceSource(sources, 'endings', [
      { ...sources.endings.data[0], canon: false },
    ]);

    expect(() => parseCaseBundle(invalidSources)).toThrowError(
      /case\.json.*case_test.*canonEndingId.*exactly one canon ending.*found 0/s,
    );
  });
});
