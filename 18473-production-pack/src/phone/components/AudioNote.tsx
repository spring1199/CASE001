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
  return (
    <figure className={styles.audioFigure}>
      <figcaption className={styles.audioCaption}>
        {label} · {audio.durationLabel}
      </figcaption>
      {audio.src === undefined ? (
        <p role="status">Аудио мастер ороогүй · продакшны тайлал бэлэн</p>
      ) : (
        <audio controls preload="metadata" aria-label={label} className={styles.audioControl}>
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
import styles from '@/phone/phone.module.css';
