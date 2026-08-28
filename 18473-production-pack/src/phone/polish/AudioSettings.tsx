import type { ChangeEvent } from 'react';

import {
  clampGain,
  type AudioPreferences,
} from '@/phone/polish/audio-preferences';
import styles from '@/phone/phone.module.css';

type GainPreference = 'master' | 'ambience' | 'interface' | 'reveal';
type BooleanPreference = 'mute' | 'ambienceEnabled';
type AudioPreferenceKey = GainPreference | BooleanPreference;

export function updateAudioPreference(
  preferences: AudioPreferences,
  key: GainPreference,
  value: number,
): AudioPreferences;
export function updateAudioPreference(
  preferences: AudioPreferences,
  key: BooleanPreference,
  value: boolean,
): AudioPreferences;
export function updateAudioPreference(
  preferences: AudioPreferences,
  key: AudioPreferenceKey,
  value: number | boolean,
): AudioPreferences {
  if (typeof value === 'number') return { ...preferences, [key]: clampGain(value) };
  return { ...preferences, [key]: value };
}

type AudioSettingsProps = Readonly<{
  preferences: AudioPreferences;
  audioAvailable: boolean | null;
  onChange(preferences: AudioPreferences): void;
  onClose(): void;
}>;

const gainControls: readonly Readonly<{
  key: GainPreference;
  label: string;
}>[] = [
  { key: 'master', label: 'Ерөнхий дуу' },
  { key: 'ambience', label: 'Орчны дуу' },
  { key: 'interface', label: 'Үйлдлийн дуу' },
  { key: 'reveal', label: 'Илрүүлэлтийн дуу' },
];

export function AudioSettings({
  preferences,
  audioAvailable,
  onChange,
  onClose,
}: AudioSettingsProps) {
  const updateGain = (key: GainPreference) => (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(updateAudioPreference(preferences, key, event.currentTarget.valueAsNumber));
  };

  return (
    <section aria-label="Дууны тохиргоо" className={styles.audioSettings}>
      <div className={styles.panelHeadingRow}>
        <div>
          <p className={styles.eyebrow}>AUDIO</p>
          <h2>Дууны тохиргоо</h2>
        </div>
        <button
          type="button"
          className={styles.navButton}
          aria-label="Дууны тохиргоог хаах"
          onClick={onClose}
        >
          Хаах
        </button>
      </div>

      {audioAvailable === false ? (
        <p role="status" className={styles.statusMessage}>
          Дуу тоглуулах боломжгүй. Текстэн мэдээлэл, тайлал бүрэн хэвээр байна.
        </p>
      ) : null}

      <div className={styles.audioControlList}>
        {gainControls.map(({ key, label }) => (
          <div key={key} className={styles.audioRangeLabel}>
            <label htmlFor={`audio-${key}`}>{label}</label>
            <output htmlFor={`audio-${key}`}>{Math.round(preferences[key] * 100)}%</output>
            <input
              id={`audio-${key}`}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={preferences[key]}
              onChange={updateGain(key)}
            />
          </div>
        ))}

        <label className={styles.audioToggleLabel}>
          <input
            type="checkbox"
            checked={preferences.mute}
            onChange={(event) => onChange(updateAudioPreference(
              preferences,
              'mute',
              event.currentTarget.checked,
            ))}
          />
          <span>Бүх дууг хаах</span>
        </label>
        <label className={styles.audioToggleLabel}>
          <input
            type="checkbox"
            checked={preferences.ambienceEnabled}
            onChange={(event) => onChange(updateAudioPreference(
              preferences,
              'ambienceEnabled',
              event.currentTarget.checked,
            ))}
          />
          <span>Орчны дууг идэвхжүүлэх</span>
        </label>
      </div>
    </section>
  );
}
