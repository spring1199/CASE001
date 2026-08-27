import Image from 'next/image';
import type { RefObject } from 'react';

import type { DeepReadonly, PhoneVisual } from '@/phone/data/schema';
import styles from '@/phone/phone.module.css';

type VisualMediaProps = Readonly<{
  visual: DeepReadonly<PhoneVisual>;
  className?: string;
}>;

export function VisualMedia({ visual, className }: VisualMediaProps) {
  const aspectRatio =
    visual.width && visual.height ? `${visual.width} / ${visual.height}` : undefined;

  return visual.src ? (
    <Image
      src={visual.src}
      alt={visual.alt}
      width={visual.width ?? 1}
      height={visual.height ?? 1}
      unoptimized
      className={[styles.visualMedia, className].filter(Boolean).join(' ')}
    />
  ) : (
    <div
      role="img"
      aria-label={visual.alt}
      style={{ aspectRatio }}
      className={[styles.visualPlaceholder, className].filter(Boolean).join(' ')}
    >
      {visual.alt}
    </div>
  );
}

type VisualDialogProps = Readonly<{
  dialogRef: RefObject<HTMLDialogElement | null>;
  visualId: string;
  title: string;
  visual: DeepReadonly<PhoneVisual>;
}>;

export function VisualDialog({ dialogRef, visualId, title, visual }: VisualDialogProps) {
  const dialogId = `${visualId}-visual-dialog`;
  const headingId = `${visualId}-visual-heading`;

  return (
    <dialog id={dialogId} ref={dialogRef} aria-labelledby={headingId} className={styles.dialog}>
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <h2 id={headingId} className={styles.dialogTitle}>{title} · Томруулсан зураг</h2>
          <form method="dialog">
            <button type="submit" className={styles.dialogButton} data-action-label>
              Хаах
            </button>
          </form>
        </header>
        <VisualMedia visual={visual} className={styles.dialogVisual} />
        <p className={styles.visualCaption}>{visual.description}</p>
      </div>
    </dialog>
  );
}
