import type { EngineOutcome } from '@/game/engine/engine';
import type { CaseView } from '@/game/engine/view';
import type { AudioCue } from '@/phone/polish/audio-director';
import {
  presentationBeatKey,
  selectPresentationBeat,
  type PresentationBeat,
} from '@/phone/polish/presentation';
import type { ProjectedPresentationRecord } from '@/phone/polish/PresentationLayer';

type GraphPresentationState = Readonly<{
  id: string;
  title: string;
  confidence: number;
  playerStatus: 'confirmed' | 'severed' | 'unresolved';
}>;

export type PresentationSnapshot = Readonly<{
  records: readonly ProjectedPresentationRecord[];
  graphEdges: readonly GraphPresentationState[];
}>;

export type PresentationChange = Readonly<{
  beat: PresentationBeat;
  key: string;
  records: readonly ProjectedPresentationRecord[];
  cue: AudioCue;
}>;

export function isBlockingPresentationChange(change: PresentationChange): boolean {
  return change.beat !== 'ordinary' || change.cue === 'graph';
}

function graphPresentationRecord(edge: GraphPresentationState): ProjectedPresentationRecord {
  return {
    id: `graph:${edge.id}`,
    title: edge.title,
    description: `${edge.confidence}% · ${edge.playerStatus}`,
    tags: ['graph'],
  };
}

export function presentationRecordsForIds(
  snapshot: PresentationSnapshot,
  recordIds: readonly string[],
): ProjectedPresentationRecord[] {
  const requested = new Set(recordIds);
  return [
    ...snapshot.records,
    ...snapshot.graphEdges.map(graphPresentationRecord),
  ].filter(({ id }) => requested.has(id));
}

export function createPresentationSnapshot(view: CaseView): PresentationSnapshot {
  return {
    records: [
      ...view.evidence.map((record): ProjectedPresentationRecord => ({
        id: `evidence:${record.id}`,
        title: record.title,
        description: record.description,
        tags: record.tags,
      })),
      ...view.completedDeductions.map((record): ProjectedPresentationRecord => ({
        id: `deduction:${record.id}`,
        title: record.title,
        description: record.kind === 'contradiction'
          ? 'Зөрчил баталгаажлаа.'
          : 'Дүгнэлт баталгаажлаа.',
        tags: record.presentationTags,
      })),
    ],
    graphEdges: view.graph.edges.map((edge) => ({
      id: edge.id,
      title: edge.label ?? 'GRAPH холбоос',
      confidence: edge.confidence,
      playerStatus: edge.playerStatus,
    })),
  };
}

function visibleOutcomeIdentities(outcomes: readonly EngineOutcome[]): string[] {
  return outcomes.flatMap((outcome): string[] => {
    switch (outcome.type) {
      case 'artifacts-discovered':
        return outcome.artifactIds.map((id) => `${outcome.type}:${id}`);
      case 'evidence-discovered':
      case 'evidence-pinned':
      case 'evidence-unpinned':
        return outcome.evidenceIds.map((id) => `${outcome.type}:${id}`);
      case 'deduction-completed':
        return [`${outcome.type}:${outcome.deductionId}`];
      case 'timeline-placed':
        return [`${outcome.type}:${outcome.eventId}:${outcome.positionId}`];
      case 'edges-confirmed':
      case 'edges-severed':
        return outcome.edgeIds.map((id) => `${outcome.type}:${id}`);
      case 'objective-activated':
      case 'objective-completed':
        return [`${outcome.type}:${outcome.objectiveId}`];
      case 'content-unlocked':
        return outcome.contentIds.map((id) => `${outcome.type}:${id}`);
      case 'ending-selected':
        return [`${outcome.type}:${outcome.endingId}`];
      default:
        return [];
    }
  });
}

function cueForChange(
  beat: PresentationBeat,
  records: readonly ProjectedPresentationRecord[],
  outcomes: readonly EngineOutcome[],
): AudioCue {
  const graphChanged = records.some(({ tags }) => tags.includes('graph'))
    || outcomes.some(({ type }) => type === 'edges-confirmed' || type === 'edges-severed');
  if (graphChanged) return 'graph';
  if (beat === 'ending' || beat === 'postcredit') return 'ending';
  if (beat === 'ordinary') return 'discovery';
  return 'reveal';
}

export function derivePresentationChange(
  previous: PresentationSnapshot,
  current: PresentationSnapshot,
  outcomes: readonly EngineOutcome[],
): PresentationChange | null {
  const previousRecordIds = new Set(previous.records.map(({ id }) => id));
  const records = current.records.filter(({ id }) => !previousRecordIds.has(id));
  const previousGraph = new Map(previous.graphEdges.map((edge) => [edge.id, edge]));
  for (const edge of current.graphEdges) {
    const prior = previousGraph.get(edge.id);
    if (
      prior !== undefined
      && prior.confidence === edge.confidence
      && prior.playerStatus === edge.playerStatus
    ) continue;
    records.push(graphPresentationRecord(edge));
  }

  const beat = selectPresentationBeat(records, outcomes);
  if (beat === null) return null;
  const outcomeIdentities = visibleOutcomeIdentities(outcomes);
  return {
    beat,
    records,
    cue: cueForChange(beat, records, outcomes),
    key: presentationBeatKey(beat, records.map(({ id }) => id), outcomeIdentities),
  };
}
