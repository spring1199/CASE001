import type { RefObject } from 'react';

import styles from '@/phone/phone.module.css';

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
    <dialog id={dialogId} ref={dialogRef} aria-labelledby={headingId} className={styles.dialog}>
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <h2 id={headingId} className={styles.dialogTitle}>{title} · Метадата</h2>
          <form method="dialog">
            <button type="submit" className={styles.dialogButton} data-action-label>
              Хаах
            </button>
          </form>
        </header>
        <dl className={styles.metadataList}>
          {rows.map((row) => (
            <div key={`${row.label}:${row.value}`} className={styles.metadataRow}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}
