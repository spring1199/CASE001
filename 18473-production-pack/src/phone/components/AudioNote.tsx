import styles from '@/phone/phone.module.css';
import {
  useAudioPlayback,
  type AudioPlaybackCallbacks,
} from '@/phone/polish/audio-playback';

export function nativeAudioPlaybackHandlers(callbacks: AudioPlaybackCallbacks) {
  return {
    onPlay: callbacks.onPlaybackStart,
    onPause: callbacks.onPlaybackStop,
    onEnded: callbacks.onPlaybackStop,
    onEmptied: callbacks.onPlaybackStop,
    onError: callbacks.onPlaybackStop,
  };
}

type AudioNoteProps = Readonly<{
  audio: Readonly<{
    src?: string;
    durationLabel: string;
    transcript: string;
    productionStatus: 'scripted' | 'ready';
  }>;
  label?: string;
}>;

export function AudioNote({ audio, label = 'Дуут тэмдэглэл' }: AudioNoteProps) {
  const hasReadyMaster = audio.productionStatus === 'ready' && audio.src !== undefined;
  const playbackHandlers = nativeAudioPlaybackHandlers(useAudioPlayback());

  return (
    <figure
      className={styles.audioFigure}
      data-audio-production-status={audio.productionStatus}
    >
      <figcaption className={styles.audioCaption}>
        <span>{label} · {audio.durationLabel}</span>
        <span className={styles.productionStatus}>
          {hasReadyMaster ? 'Тоглуулахад бэлэн' : 'Тайлал бэлэн'}
        </span>
      </figcaption>
      {!hasReadyMaster ? (
        <p role="status">Аудио мастер ороогүй · продакшны тайлал бэлэн</p>
      ) : (
        <audio
          controls
          preload="metadata"
          aria-label={label}
          className={styles.audioControl}
          {...playbackHandlers}
        >
          <source src={audio.src} />
          Таны хөтөч аудио тоглуулах боломжгүй байна.
        </audio>
      )}
      <details className={styles.transcript}>
        <summary>Бичлэгийн тайлал</summary>
        <p>{audio.transcript}</p>
      </details>
    </figure>
  );
}
