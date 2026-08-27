import { z } from 'zod';

import type { KeyValueStorage } from '@/phone/polish/audio-preferences';

export const presentationCheckpointSchema = z.strictObject({
  version: z.literal(1),
  acknowledgedBeatKeys: z.array(z.string().min(1)),
  endingStage: z.enum(['decision', 'aftermath', 'closure', 'postcredit']).nullable(),
});

export type PresentationCheckpoint = z.infer<typeof presentationCheckpointSchema>;
export type EndingPresentationStage = NonNullable<PresentationCheckpoint['endingStage']>;

export const DEFAULT_PRESENTATION_CHECKPOINT: PresentationCheckpoint = Object.freeze({
  version: 1,
  acknowledgedBeatKeys: [],
  endingStage: null,
});

export const PRESENTATION_CHECKPOINT_STORAGE_KEY = '18473:presentation-checkpoint:v1';

export type PresentationStorageFactory = () => KeyValueStorage | null;

export function setEndingPresentationStage(
  checkpoint: PresentationCheckpoint,
  endingStage: EndingPresentationStage,
): PresentationCheckpoint {
  return {
    ...checkpoint,
    acknowledgedBeatKeys: [...checkpoint.acknowledgedBeatKeys],
    endingStage,
  };
}

export function resetEndingPresentation(
  checkpoint: PresentationCheckpoint,
): PresentationCheckpoint {
  return setEndingPresentationStage(checkpoint, 'decision');
}

const defaultStorageFactory: PresentationStorageFactory = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

export class PresentationCheckpointStorage {
  constructor(
    private readonly storageFactory: PresentationStorageFactory = defaultStorageFactory,
    private readonly key = PRESENTATION_CHECKPOINT_STORAGE_KEY,
  ) {}

  load(): PresentationCheckpoint {
    try {
      const stored = this.storageFactory()?.getItem(this.key);
      if (stored === null || stored === undefined) return copyDefault();
      const parsed = presentationCheckpointSchema.safeParse(JSON.parse(stored));
      return parsed.success ? parsed.data : copyDefault();
    } catch {
      return copyDefault();
    }
  }

  save(checkpoint: PresentationCheckpoint): boolean {
    const parsed = presentationCheckpointSchema.safeParse(checkpoint);
    if (!parsed.success) return false;
    try {
      const storage = this.storageFactory();
      if (storage === null) return false;
      storage.setItem(this.key, JSON.stringify(parsed.data));
      return true;
    } catch {
      return false;
    }
  }
}

function copyDefault(): PresentationCheckpoint {
  return {
    ...DEFAULT_PRESENTATION_CHECKPOINT,
    acknowledgedBeatKeys: [...DEFAULT_PRESENTATION_CHECKPOINT.acknowledgedBeatKeys],
  };
}
