import { z } from 'zod';

import type { EngineOutcome } from '@/game/engine/engine';
import type { KeyValueStorage } from '@/phone/polish/audio-preferences';

const presentationBeatSchema = z.enum([
  'ordinary', 'hope1', 'hope2', 'f17', 'winter47',
  'decoy', 'hope3', 'ending', 'postcredit',
]);

const projectedPresentationRecordSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)),
});

const pendingPresentationSchema = z.strictObject({
  beat: presentationBeatSchema,
  key: z.string().min(1),
  records: z.array(projectedPresentationRecordSchema),
});

export const presentationCheckpointSchema = z.strictObject({
  version: z.literal(2),
  acknowledgedBeatKeys: z.array(z.string().min(1)),
  endingId: z.string().min(1).nullable(),
  endingStage: z.enum(['decision', 'aftermath', 'closure', 'postcredit']).nullable(),
  pendingPresentations: z.array(pendingPresentationSchema),
});

const legacyPendingPresentationSchema = z.strictObject({
  beat: presentationBeatSchema,
  key: z.string().min(1),
  recordIds: z.array(z.string().min(1)),
});

const legacyPresentationCheckpointSchema = z.strictObject({
  version: z.literal(1),
  acknowledgedBeatKeys: z.array(z.string().min(1)),
  endingId: z.string().min(1).nullable(),
  endingStage: z.enum(['decision', 'aftermath', 'closure', 'postcredit']).nullable(),
  pendingPresentation: legacyPendingPresentationSchema.nullable().optional(),
  pendingPresentations: z.array(legacyPendingPresentationSchema).optional(),
});

export type PresentationCheckpoint = z.infer<typeof presentationCheckpointSchema>;
export type EndingPresentationStage = NonNullable<PresentationCheckpoint['endingStage']>;

export const DEFAULT_PRESENTATION_CHECKPOINT: PresentationCheckpoint = Object.freeze({
  version: 2,
  acknowledgedBeatKeys: [],
  endingId: null,
  endingStage: null,
  pendingPresentations: [],
});

export const PRESENTATION_CHECKPOINT_STORAGE_KEY = '18473:presentation-checkpoint:v1';

export type PresentationStorageFactory = () => KeyValueStorage | null;

export type PendingPresentationCheckpoint = PresentationCheckpoint['pendingPresentations'][number];
export type PendingPresentationInput = Readonly<{
  beat: PendingPresentationCheckpoint['beat'];
  key: string;
  records: readonly Readonly<{
    id: string;
    title: string;
    description: string;
    tags: readonly string[];
  }>[];
}>;

export function pendingPresentationQueue(
  checkpoint: PresentationCheckpoint,
): PendingPresentationCheckpoint[] {
  return checkpoint.pendingPresentations.map(copyPendingPresentation);
}

export function setPendingPresentation(
  checkpoint: PresentationCheckpoint,
  pendingPresentation: PendingPresentationInput,
): PresentationCheckpoint {
  const queue = pendingPresentationQueue(checkpoint);
  if (
    checkpoint.acknowledgedBeatKeys.includes(pendingPresentation.key)
    || queue.some(({ key }) => key === pendingPresentation.key)
  ) return copyCheckpoint(checkpoint);
  const pendingPresentations = [
    ...queue,
    copyPendingPresentation(pendingPresentation),
  ];
  return {
    ...checkpoint,
    acknowledgedBeatKeys: [...checkpoint.acknowledgedBeatKeys],
    pendingPresentations,
  };
}

export function acknowledgePendingPresentation(
  checkpoint: PresentationCheckpoint,
): PresentationCheckpoint {
  const queue = pendingPresentationQueue(checkpoint);
  const pending = queue[0];
  if (pending === undefined) return copyCheckpoint(checkpoint);
  const pendingPresentations = queue.slice(1);
  return {
    ...checkpoint,
    acknowledgedBeatKeys: [...new Set([...checkpoint.acknowledgedBeatKeys, pending.key])],
    pendingPresentations,
  };
}

export function setEndingPresentationStage(
  checkpoint: PresentationCheckpoint,
  endingId: string,
  endingStage: EndingPresentationStage,
): PresentationCheckpoint {
  return {
    ...checkpoint,
    acknowledgedBeatKeys: [...checkpoint.acknowledgedBeatKeys],
    endingId,
    endingStage,
  };
}

export function resetEndingPresentation(
  checkpoint: PresentationCheckpoint,
  endingId: string,
): PresentationCheckpoint {
  return setEndingPresentationStage(checkpoint, endingId, 'decision');
}

export function presentationStageForEnding(
  checkpoint: PresentationCheckpoint,
  endingId: string,
): EndingPresentationStage {
  return checkpoint.endingId === endingId && checkpoint.endingStage !== null
    ? checkpoint.endingStage
    : 'decision';
}

export function presentationCheckpointAfterEndingSelection(
  checkpoint: PresentationCheckpoint,
  outcomes: readonly EngineOutcome[],
  projectedEndingId: string | null,
): PresentationCheckpoint {
  return projectedEndingId !== null && outcomes.some(({ type }) => type === 'ending-selected')
    ? resetEndingPresentation(checkpoint, projectedEndingId)
    : checkpoint;
}

const defaultStorageFactory: PresentationStorageFactory = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const volatileCheckpoints = new Map<string, PresentationCheckpoint>();

export class PresentationCheckpointStorage {
  constructor(
    private readonly storageFactory: PresentationStorageFactory = defaultStorageFactory,
    private readonly key = PRESENTATION_CHECKPOINT_STORAGE_KEY,
  ) {}

  load(): PresentationCheckpoint {
    try {
      const storage = this.storageFactory();
      if (storage === null) {
        return copyCheckpoint(volatileCheckpoints.get(this.key) ?? DEFAULT_PRESENTATION_CHECKPOINT);
      }
      const stored = storage.getItem(this.key);
      if (stored === null) {
        return copyCheckpoint(volatileCheckpoints.get(this.key) ?? DEFAULT_PRESENTATION_CHECKPOINT);
      }
      let decoded: unknown;
      try {
        decoded = JSON.parse(stored);
      } catch {
        volatileCheckpoints.delete(this.key);
        return copyCheckpoint(DEFAULT_PRESENTATION_CHECKPOINT);
      }
      const parsed = presentationCheckpointSchema.safeParse(decoded);
      let checkpoint: PresentationCheckpoint;
      if (parsed.success) {
        checkpoint = copyCheckpoint(parsed.data);
      } else {
        const legacy = legacyPresentationCheckpointSchema.safeParse(decoded);
        if (!legacy.success) {
          volatileCheckpoints.delete(this.key);
          return copyCheckpoint(DEFAULT_PRESENTATION_CHECKPOINT);
        }
        checkpoint = migrateLegacyCheckpoint(legacy.data);
      }
      volatileCheckpoints.set(this.key, checkpoint);
      if (!parsed.success) {
        try {
          storage.setItem(this.key, JSON.stringify(checkpoint));
        } catch {}
      }
      return copyCheckpoint(checkpoint);
    } catch {}
    return copyCheckpoint(volatileCheckpoints.get(this.key) ?? DEFAULT_PRESENTATION_CHECKPOINT);
  }

  save(checkpoint: PresentationCheckpoint): boolean {
    const parsed = presentationCheckpointSchema.safeParse(checkpoint);
    if (!parsed.success) return false;
    const volatileCheckpoint = copyCheckpoint(parsed.data);
    volatileCheckpoints.set(this.key, volatileCheckpoint);
    try {
      const storage = this.storageFactory();
      if (storage === null) return false;
      storage.setItem(this.key, JSON.stringify(volatileCheckpoint));
      return true;
    } catch {
      return false;
    }
  }
}

function copyCheckpoint(checkpoint: PresentationCheckpoint): PresentationCheckpoint {
  const pendingPresentations = pendingPresentationQueue(checkpoint);
  return {
    ...checkpoint,
    acknowledgedBeatKeys: [...checkpoint.acknowledgedBeatKeys],
    pendingPresentations,
  };
}

function copyPendingPresentation(
  pending: PendingPresentationInput,
): PendingPresentationCheckpoint {
  return {
    ...pending,
    records: pending.records.map((record) => ({
      ...record,
      tags: [...record.tags],
    })),
  };
}

function migrateLegacyCheckpoint(
  legacy: z.infer<typeof legacyPresentationCheckpointSchema>,
): PresentationCheckpoint {
  return {
    version: 2,
    acknowledgedBeatKeys: [...legacy.acknowledgedBeatKeys],
    endingId: legacy.endingId,
    endingStage: legacy.endingStage,
    // Version one retained only record IDs, so replaying it cannot preserve the
    // exact already-visible label/description. Drop those pending beats safely.
    pendingPresentations: [],
  };
}
