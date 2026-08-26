import type { RefObject } from 'react';

type MetadataDialogProps = Readonly<{
  dialogRef: RefObject<HTMLDialogElement | null>;
  itemId: string;
  title: string;
  rows: readonly Readonly<{ label: string; value: string }>[];
}>;

export function MetadataDialog({ dialogRef, itemId, title, rows }: MetadataDialogProps) {
  const headingId = `${itemId}-metadata-heading`;
  const dialogId = `${itemId}-metadata-dialog`;

  return (
    <dialog id={dialogId} ref={dialogRef} aria-labelledby={headingId}>
      <h2 id={headingId}>{title} · Метадата</h2>
      <dl>
        {rows.map((row) => (
          <div key={`${row.label}:${row.value}`}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <form method="dialog">
        <button type="submit" style={{ minHeight: 44, minWidth: 44 }}>
          Хаах
        </button>
      </form>
    </dialog>
  );
}
