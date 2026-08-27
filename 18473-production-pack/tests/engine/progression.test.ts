import { describe, expect, it } from 'vitest';
import { parseCaseBundle, type CaseBundleSources } from '../../src/game/content/case-loader';
import { analyzeCaseProgression } from '../../src/game/engine/progression';
import { createMiniCaseSources, loadMiniCase } from '../fixtures/mini-case';

type SourceData = { data: unknown };

function withData(sources: CaseBundleSources, key: keyof CaseBundleSources, mutate: (data: unknown[]) => unknown[]): CaseBundleSources {
  const source = sources[key] as SourceData & { sourcePath: string };
  return {
    ...sources,
    [key]: { ...source, data: mutate(structuredClone(source.data) as unknown[]) },
  };
}

function inProduction(sources: CaseBundleSources): CaseBundleSources {
  const manifest = sources.manifest.data as Record<string, unknown>;
  return {
    ...sources,
    manifest: {
      ...sources.manifest,
      data: { ...manifest, progressionComplete: false },
    },
  };
}

describe('analyzeCaseProgression', () => {
  it('reports a fully reachable case with zero issues', () => {
    const analysis = analyzeCaseProgression(loadMiniCase());
    expect(analysis.issues).toEqual([]);
    expect([...analysis.reachableFactIds].sort()).toEqual([
      'fact_m_identity', 'fact_m_motive', 'fact_m_open', 'fact_m_timeline',
    ]);
    expect(analysis.discoverableEvidenceIds.size).toBe(11);
    expect([...analysis.completableDeductionIds].sort())
      .toEqual(['ded_m_identity', 'ded_m_motive']);
    expect([...analysis.openableLockIds].sort()).toEqual(['lock_m_final', 'lock_m_vault']);
    expect([...analysis.eligibleEndingIds].sort())
      .toEqual(['ending_m_close', 'ending_m_expose']);
  });

  it('flags a fact no source grants, and everything stranded behind it', () => {
    const sources = inProduction(withData(createMiniCaseSources(), 'evidence', (records) => (
      (records as Array<Record<string, unknown>>).map((record) => (
        record.id === 'ev_m_key' ? { ...record, grantsFacts: undefined } : record
      ))
    )));
    const analysis = analyzeCaseProgression(parseCaseBundle(sources));
    const issueIds = analysis.issues.flatMap(({ recordIds }) => recordIds);

    expect(analysis.issues.some(({ kind, recordIds }) =>
      kind === 'unreachable-fact' && recordIds.includes('fact_m_open'))).toBe(true);
    expect(issueIds).toContain('ded_m_identity');
    expect(issueIds).toContain('lock_m_vault');
    expect(issueIds).toContain('obj_m_identify');
    expect(issueIds).toContain('tr_m_vault');
    expect(issueIds).toContain('tev_m_meeting');
    expect(issueIds).toContain('ending_m_close');
  });

  it('detects a self-gating cycle where evidence hides behind its own fact', () => {
    const sources = inProduction(withData(createMiniCaseSources(), 'evidence', (records) => (
      (records as Array<Record<string, unknown>>).map((record) => (
        record.id === 'ev_m_key'
          ? { ...record, hiddenUntilFacts: ['fact_m_open'] }
          : record
      ))
    )));
    const analysis = analyzeCaseProgression(parseCaseBundle(sources));
    const cycle = analysis.issues.find(({ kind }) => kind === 'dependency-cycle');

    expect(cycle).toBeDefined();
    expect(cycle?.recordIds).toContain('ev_m_key');
    expect(cycle?.recordIds).toContain('fact_m_open');
  });

  it('detects mutually dependent deductions as a cycle', () => {
    let sources = createMiniCaseSources();
    sources = withData(sources, 'facts', (records) => [
      ...records,
      { id: 'fact_m_loop_a', secret: false },
      { id: 'fact_m_loop_b', secret: false },
    ]);
    sources = withData(sources, 'deductions', (records) => [
      ...records,
      {
        id: 'ded_m_loop_a',
        title: 'Loop A',
        requiredAll: ['ev_m_key'],
        prerequisiteFacts: ['fact_m_loop_b'],
        grantsFacts: ['fact_m_loop_a'],
      },
      {
        id: 'ded_m_loop_b',
        title: 'Loop B',
        requiredAll: ['ev_m_key'],
        prerequisiteFacts: ['fact_m_loop_a'],
        grantsFacts: ['fact_m_loop_b'],
      },
    ]);
    const analysis = analyzeCaseProgression(parseCaseBundle(inProduction(sources)));
    const cycle = analysis.issues.find(({ kind }) => kind === 'dependency-cycle');

    expect(cycle).toBeDefined();
    const members = new Set(cycle?.recordIds);
    expect(members.has('ded_m_loop_a') || members.has('ded_m_loop_b')).toBe(true);
    expect(members.has('fact_m_loop_a') || members.has('fact_m_loop_b')).toBe(true);
  });

  it('rejects required content hidden behind the final choice', () => {
    let sources = createMiniCaseSources();
    sources = withData(sources, 'locks', (records) => (
      (records as Array<Record<string, unknown>>).map((record) => (
        record.id === 'lock_m_final'
          ? {
            ...record,
            unlockWhen: {
              allOf: [
                { fact: 'fact_m_motive' },
                { endingSelected: 'ending_m_close' },
              ],
            },
          }
          : record
      ))
    ));
    const analysis = analyzeCaseProgression(parseCaseBundle(inProduction(sources)));

    expect(analysis.issues.some(({ kind, recordIds }) =>
      kind === 'ineligible-ending' && recordIds.includes('ending_m_close'))).toBe(true);
    expect(analysis.issues.some(({ kind, recordIds }) =>
      kind === 'unopenable-lock' && recordIds.includes('lock_m_final'))).toBe(true);
  });

  it('flags an ending that never declares a gate lock', () => {
    const sources = inProduction(withData(createMiniCaseSources(), 'endings', (records) => (
      (records as Array<Record<string, unknown>>).map((record) => (
        record.id === 'ending_m_expose'
          ? { ...record, gateLockId: undefined }
          : record
      ))
    )));
    const analysis = analyzeCaseProgression(parseCaseBundle(sources));

    expect(analysis.issues).toContainEqual(expect.objectContaining({
      kind: 'ineligible-ending',
      recordIds: ['ending_m_expose'],
    }));
  });

  it('permits legitimate post-choice triggers without issues', () => {
    const analysis = analyzeCaseProgression(loadMiniCase());
    expect(analysis.issues.filter(({ kind }) => kind === 'unfirable-trigger')).toEqual([]);
  });
});

describe('declared-complete enforcement at load', () => {
  it('fails closed when a progressionComplete case has unreachable content', () => {
    const sources = withData(createMiniCaseSources(), 'evidence', (records) => (
      (records as Array<Record<string, unknown>>).map((record) => (
        record.id === 'ev_m_key' ? { ...record, grantsFacts: undefined } : record
      ))
    ));

    expect(() => parseCaseBundle(sources)).toThrowError(
      /Invalid authored case progression:.*case_mini.*progressionComplete.*fact_m_open/s,
    );
  });

  it('loads a declared-complete case when every record is reachable', () => {
    expect(() => loadMiniCase()).not.toThrow();
  });
});
