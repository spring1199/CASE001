import { z } from 'zod';

import type { EngineOutcome } from '@/game/engine/engine';
import type { KeyValueStorage } from '@/phone/polish/audio-preferences';

export const presentationCheckpointSchema = z.strictObject({
  version: z.literal(1),
  acknowledgedBeatKeys: z.array(z.string().min(1)),
  endingId: z.string().min(1).nullable(),
  endingStage: z.enum(['decision', 'aftermath', 'closure', 'postcredit']).nullable(),
  pendingPresentation: z.strictObject({
    beat: z.enum([
      'ordinary', 'hope1', 'hope2', 'f17', 'winter47',
      'decoy', 'hope3', 'ending', 'postcredit',
    ]),
    key: z.string().min(1),
    recordIds: z.array(z.string().min(1)),
  }).nullable().optional(),
});

export type PresentationCheckpoint = z.infer<typeof presentationCheckpointSchema>;
export type EndingPresentationStage = NonNullable<PresentationCheckpoint['endingStage']>;

export const DEFAULT_PRESENTATION_CHECKPOINT: PresentationCheckpoint = Object.freeze({
  version: 1,
  acknowledgedBeatKeys: [],
  endingId: null,
  endingStage: null,
  pendingPresentation: null,
});

export const PRESENTATION_CHECKPOINT_STORAGE_KEY = '18473:presentation-checkpoint:v1';

export type PresentationStorageFactory = () => KeyValueStorage | null;

export type PendingPresentationCheckpoint = NonNullable<PresentationCheckpoint['pendingPresentation']>;

export function setPendingPresentation(
  checkpoint: PresentationCheckpoint,
  pendingPresentation: PendingPresentationCheckpoint,
): PresentationCheckpoint {
  return {
    ...checkpoint,
    acknowledgedBeatKeys: [...checkpoint.acknowledgedBeatKeys],
    pendingPresentation: {
      ...pendingPresentation,
      recordIds: [...pendingPresentation.recordIds],
    },
  };
}

export function acknowledgePendingPresentation(
  checkpoint: PresentationCheckpoint,
): PresentationCheckpoint {
  const pending = checkpoint.pendingPresentation;
  if (pending === null || pending === undefined) return checkpoint;
  return {
    ...checkpoint,
    acknowledgedBeatKeys: [...new Set([...checkpoint.acknowledgedBeatKeys, pending.key])],
    pendingPresentation: null,
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
      if (!parsed.success) {
        volatileCheckpoints.delete(this.key);
        return copyCheckpoint(DEFAULT_PRESENTATION_CHECKPOINT);
      }
      const checkpoint = copyCheckpoint(parsed.data);
      volatileCheckpoints.set(this.key, checkpoint);
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
  return {
    ...checkpoint,
    acknowledgedBeatKeys: [...checkpoint.acknowledgedBeatKeys],
    pendingPresentation: checkpoint.pendingPresentation === undefined
      ? null
      : checkpoint.pendingPresentation === null
        ? null
        : {
            ...checkpoint.pendingPresentation,
            recordIds: [...checkpoint.pendingPresentation.recordIds],
          },
  };
}
