import type { EngineOutcome } from '@/game/engine/engine';

export type PresentationBeat =
  | 'ordinary'
  | 'hope1'
  | 'hope2'
  | 'f17'
  | 'winter47'
  | 'decoy'
  | 'hope3'
  | 'ending'
  | 'postcredit';

export type VisiblePresentationEvidence = Readonly<{
  tags: readonly string[];
}>;

const TAG_PRIORITY: readonly Exclude<PresentationBeat, 'ordinary' | 'ending' | 'hope3' | 'postcredit'>[] = [
  'decoy',
  'winter47',
  'f17',
  'hope2',
  'hope1',
];

const ORDINARY_OUTCOME_TYPES: ReadonlySet<EngineOutcome['type']> = new Set([
  'artifacts-discovered',
  'evidence-discovered',
  'deduction-completed',
  'timeline-placed',
  'evidence-pinned',
  'edges-confirmed',
  'edges-severed',
  'objective-activated',
  'objective-completed',
  'content-unlocked',
]);

/** Selects one presentation beat using only already-visible semantic tags and outcome kinds. */
export function selectPresentationBeat(
  evidence: readonly VisiblePresentationEvidence[],
  outcomes: readonly EngineOutcome[] = [],
): PresentationBeat | null {
  if (outcomes.some(({ type }) => type === 'ending-selected')) return 'ending';

  const normalizedRecords = evidence.map((record) => (
    new Set(record.tags.map((tag) => tag.toLowerCase()))
  ));
  if (normalizedRecords.some((tags) => tags.has('postcredit'))) return 'postcredit';
  if (normalizedRecords.some((tags) => tags.has('hope3') && tags.has('finale'))) return 'hope3';

  const tags = new Set(normalizedRecords.flatMap((recordTags) => [...recordTags]));
  const taggedBeat = TAG_PRIORITY.find((beat) => tags.has(beat));
  if (taggedBeat !== undefined) return taggedBeat;

  if (evidence.length > 0 || outcomes.some(({ type }) => ORDINARY_OUTCOME_TYPES.has(type))) {
    return 'ordinary';
  }
  return null;
}

const BEAT_DURATIONS: Readonly<Record<PresentationBeat, number>> = {
  ordinary: 220,
  hope1: 360,
  hope2: 420,
  f17: 480,
  winter47: 520,
  decoy: 500,
  hope3: 620,
  ending: 720,
  postcredit: 600,
};

export function presentationDuration(beat: PresentationBeat, reducedMotion: boolean): number {
  return reducedMotion ? 120 : BEAT_DURATIONS[beat];
}
