import { z } from 'zod';

import type { KeyValueStorage } from '@/phone/polish/audio-preferences';

export const presentationCheckpointSchema = z.strictObject({
  version: z.literal(1),
  acknowledgedBeatKeys: z.array(z.string().min(1)),
  endingId: z.string().min(1).nullable(),
  endingStage: z.enum(['decision', 'aftermath', 'closure', 'postcredit']).nullable(),
});

export type PresentationCheckpoint = z.infer<typeof presentationCheckpointSchema>;
export type EndingPresentationStage = NonNullable<PresentationCheckpoint['endingStage']>;

export const DEFAULT_PRESENTATION_CHECKPOINT: PresentationCheckpoint = Object.freeze({
  version: 1,
  acknowledgedBeatKeys: [],
  endingId: null,
  endingStage: null,
});

export const PRESENTATION_CHECKPOINT_STORAGE_KEY = '18473:presentation-checkpoint:v1';

export type PresentationStorageFactory = () => KeyValueStorage | null;

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
  return { ...checkpoint, acknowledgedBeatKeys: [...checkpoint.acknowledgedBeatKeys] };
}
