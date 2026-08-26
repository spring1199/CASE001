import { describe, expect, it } from 'vitest';
import { parseCaseBundle } from '../../src/game/content/case-loader';
import { case001Seed } from '../../src/game/content/case-001';

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
});
