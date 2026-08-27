import { z } from 'zod';

const gainSchema = z.number().finite().min(0).max(1);

export const audioPreferencesSchema = z.strictObject({
  version: z.literal(1),
  master: gainSchema,
  ambience: gainSchema,
  interface: gainSchema,
  reveal: gainSchema,
  mute: z.boolean(),
  ambienceEnabled: z.boolean(),
});

export type AudioPreferences = z.infer<typeof audioPreferencesSchema>;
export type AudioCategory = 'ambience' | 'interface' | 'reveal';

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = Object.freeze({
  version: 1,
  master: 0.8,
  ambience: 0.32,
  interface: 0.55,
  reveal: 0.62,
  mute: false,
  ambienceEnabled: false,
});

export const AUDIO_PREFERENCES_STORAGE_KEY = '18473:audio-preferences:v1';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type AudioPreferencesStorageFactory = () => KeyValueStorage | null;

const defaultStorageFactory: AudioPreferencesStorageFactory = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

export function clampGain(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function computeCategoryGain(
  preferences: Pick<AudioPreferences, 'master' | 'ambience' | 'interface' | 'reveal' | 'mute'>,
  category: AudioCategory,
): number {
  if (preferences.mute) return 0;
  return clampGain(preferences.master) * clampGain(preferences[category]);
}

export class AudioPreferencesStorage {
  constructor(
    private readonly storageFactory: AudioPreferencesStorageFactory = defaultStorageFactory,
    private readonly key = AUDIO_PREFERENCES_STORAGE_KEY,
  ) {}

  load(): AudioPreferences {
    try {
      const stored = this.storageFactory()?.getItem(this.key);
      if (stored === null || stored === undefined) return { ...DEFAULT_AUDIO_PREFERENCES };
      const parsed = audioPreferencesSchema.safeParse(JSON.parse(stored));
      return parsed.success ? parsed.data : { ...DEFAULT_AUDIO_PREFERENCES };
    } catch {
      return { ...DEFAULT_AUDIO_PREFERENCES };
    }
  }

  save(preferences: AudioPreferences): boolean {
    const parsed = audioPreferencesSchema.safeParse(preferences);
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
