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
];

describe('case bundle loading', () => {
  it('loads and indexes the authored Case #001 seed', () => {
    expect(case001Seed.manifest.id).toBe('case_001');
    expect(case001Seed.index.get('ev_18473_paper')).toMatchObject({
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
      + case001Seed.endings.length;

    expect(case001Seed.index.size).toBe(expectedRecordCount);
  });

  it('narrows an indexed record value from its kind', () => {
    const entry = case001Seed.index.get('ev_18473_paper');
    expect(entry?.kind).toBe('evidence');
    if (entry?.kind !== 'evidence') throw new Error('Expected indexed evidence');

    expectTypeOf(entry.value).toEqualTypeOf<Evidence>();
  });

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
});
