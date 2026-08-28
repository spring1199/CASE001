import { describe, expect, it } from 'vitest';
import { case001Seed } from '@/game/content/case-001';
import { analyzeCaseProgression } from '@/game/engine/progression';
import { createInitialCaseState, processEngineEvent } from '@/game/engine/engine';
import { createSaveEnvelope, deserializeSave } from '@/game/persistence/save';

const TEST_NOW = '2026-08-28T00:00:00.000Z';

describe('Case #001 Phase 04 progression', () => {
  it('authors the complete approved investigation surface', () => {
    expect(case001Seed.evidence.length).toBeGreaterThanOrEqual(40);
    expect(case001Seed.deductions).toHaveLength(17);
    expect(case001Seed.objectives).toHaveLength(12);
    expect(case001Seed.timeline.filter((record) => record.recordType === 'event').length)
      .toBeGreaterThanOrEqual(7);
    expect(case001Seed.graph.filter((record) => record.recordType === 'edge').length)
      .toBeGreaterThanOrEqual(5);
  });

  it('keeps F17 fair-play at four independent clues plus edge and archive gate', () => {
    const deduction = case001Seed.deductions.find(({ id }) => id === 'ded_f17_identity');
    expect(deduction?.requiredAll).toContain('ev_f17_edge');
    expect(deduction?.minimumFromAnyGroup).toBe(4);
    expect(new Set(deduction?.requiredAnyGroups?.flat()).size).toBe(7);
    expect(deduction?.prerequisiteFacts).toContain('fact_18473_archive_open');
  });

  it('models 41→57→73→88→91 confidence and ending edge effects', () => {
    const edge = case001Seed.graph.find((record) => record.id === 'edge_tenuun_location');
    expect(edge?.recordType).toBe('edge');
    if (edge?.recordType !== 'edge') throw new Error('final edge missing');
    const running = edge.confidenceSources.reduce<number[]>((values, source) => {
      values.push((values.at(-1) ?? 0) + source.weight);
      return values;
    }, []);
    expect(running).toEqual([41, 57, 73, 88, 91]);
    expect(case001Seed.endings.find(({ id }) => id === 'ending_trace')?.onSelect)
      .toMatchObject({ confirmGraphEdgeIds: ['edge_tenuun_location'] });
    expect(case001Seed.endings.find(({ id }) => id === 'ending_sever')?.onSelect)
      .toMatchObject({ severGraphEdgeIds: ['edge_tenuun_location'] });
  });

  it('keeps Hope #1 ambiguous, attributes Hope #2 to Bilguun, and grants life only at Hope #3', () => {
    const hope1 = case001Seed.deductions.find(({ id }) => id === 'ded_planned_disappearance');
    const hope2 = case001Seed.deductions.find(({ id }) => id === 'ded_bilguun_device');
    const hope3 = case001Seed.deductions.find(({ id }) => id === 'ded_tenuun_alive');
    expect(hope1?.grantsFacts).not.toContain('fact_tenuun_alive');
    expect(hope2?.grantsFacts).toEqual(['fact_bilguun_device']);
    expect(hope3?.grantsFacts).toEqual(['fact_tenuun_alive']);
  });

  it('keeps the F17 reveal strictly before the Winter 47 operator reveal', () => {
    const f17 = case001Seed.deductions.find(({ id }) => id === 'ded_f17_identity');
    const winter47 = case001Seed.deductions.find(({ id }) => id === 'ded_maral_winter47');
    expect(f17?.grantsFacts).toEqual(['fact_f17_is_maral']);
    expect(winter47?.prerequisiteFacts).toContain('fact_f17_is_maral');
    expect(winter47?.grantsFacts).toEqual(['fact_maral_winter47_operator']);
  });

  it('keeps TRACE and SEVER as location consequences without morality labels', () => {
    const trace = case001Seed.endings.find(({ id }) => id === 'ending_trace');
    const sever = case001Seed.endings.find(({ id }) => id === 'ending_sever');
    expect(trace).toMatchObject({ revealsExactLocation: true, canon: false });
    expect(sever).toMatchObject({ revealsExactLocation: false, canon: true });
    expect(sever?.description).toContain('LOCATION: UNKNOWN');
    expect(JSON.stringify([trace, sever])).not.toMatch(/GOOD|BAD|САЙН|МУУ/i);
  });

  it('round-trips partial progress without introducing save or soft-lock debt', () => {
    const initial = createInitialCaseState(case001Seed, TEST_NOW);
    const progressed = processEngineEvent(case001Seed, initial, {
      type: 'discover-evidence',
      evidenceIds: ['ev_cabin_plan', 'ev_vehicle_trace', 'ev_tuya_drive'],
    }).state;
    const restored = deserializeSave(
      JSON.stringify(createSaveEnvelope(progressed, TEST_NOW)),
      case001Seed.manifest.id,
    );

    expect(restored).toEqual(progressed);
    expect(analyzeCaseProgression(case001Seed).issues).toHaveLength(0);
    expect(case001Seed.manifest.progressionComplete).toBe(true);
  });

  it('is fully reachable and repeat-event safe', () => {
    expect(analyzeCaseProgression(case001Seed).issues).toEqual([]);
    const initial = createInitialCaseState(case001Seed, '2026-08-27T00:00:00.000Z');
    const evidenceIds = case001Seed.evidence
      .filter(({ hiddenUntilFacts }) => hiddenUntilFacts === undefined)
      .map(({ id }) => id);
    const once = processEngineEvent(case001Seed, initial, { type: 'discover-evidence', evidenceIds });
    const twice = processEngineEvent(case001Seed, once.state, { type: 'discover-evidence', evidenceIds });
    expect(twice.state).toBe(once.state);
  });
});
