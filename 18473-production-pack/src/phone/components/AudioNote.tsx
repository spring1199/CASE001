type AudioNoteProps = Readonly<{
  audio: Readonly<{
    src: string;
    durationLabel: string;
    transcript: string;
  }>;
  label?: string;
}>;

export function AudioNote({ audio, label = 'Дуут тэмдэглэл' }: AudioNoteProps) {
  return (
    <figure>
      <figcaption>
        {label} · {audio.durationLabel}
      </figcaption>
      <audio controls preload="metadata" aria-label={label}>
        <source src={audio.src} />
        Таны хөтөч аудио тоглуулах боломжгүй байна.
      </audio>
      <details>
        <summary style={{ minHeight: 44 }}>Бичлэгийн тайлал</summary>
        <p>{audio.transcript}</p>
      </details>
    </figure>
  );
}
