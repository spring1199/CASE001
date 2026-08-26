import Image from 'next/image';
import type { RefObject } from 'react';

import type { DeepReadonly, PhoneVisual } from '@/phone/data/schema';

type VisualMediaProps = Readonly<{
  visual: DeepReadonly<PhoneVisual>;
}>;

export function VisualMedia({ visual }: VisualMediaProps) {
  const aspectRatio =
    visual.width && visual.height ? `${visual.width} / ${visual.height}` : undefined;

  return visual.src ? (
    <Image
      src={visual.src}
      alt={visual.alt}
      width={visual.width ?? 1}
      height={visual.height ?? 1}
      unoptimized
    />
  ) : (
    <div role="img" aria-label={visual.alt} style={{ aspectRatio }}>
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
    <dialog id={dialogId} ref={dialogRef} aria-labelledby={headingId}>
      <h2 id={headingId}>{title} · Томруулсан зураг</h2>
      <VisualMedia visual={visual} />
      <p>{visual.description}</p>
      <form method="dialog">
        <button type="submit" style={{ minHeight: 44, minWidth: 44 }}>
          Хаах
        </button>
      </form>
    </dialog>
  );
}
