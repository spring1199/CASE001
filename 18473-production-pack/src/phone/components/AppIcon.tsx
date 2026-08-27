import type { PhoneAppDescriptor } from '@/phone/data/schema';
import styles from '@/phone/phone.module.css';

type AppIconProps = Readonly<{
  app: Readonly<Pick<PhoneAppDescriptor, 'iconLabel' | 'label' | 'shortLabel'>>;
  locked: boolean;
  onActivate(): void;
}>;

export function AppIcon({ app, locked, onActivate }: AppIconProps) {
  const accessibleLabel = locked ? `${app.iconLabel}, түгжээтэй` : app.iconLabel;

  return (
    <button
      type="button"
      aria-disabled={locked || undefined}
      aria-label={accessibleLabel}
      onClick={onActivate}
      className={styles.appIcon}
    >
      <span aria-hidden="true" className={styles.appGlyph}>{app.label.slice(0, 1)}</span>
      <span className={styles.appLabel}>{app.shortLabel}</span>
      {locked ? <span aria-hidden="true" className={styles.lockBadge}>Түгжээтэй</span> : null}
    </button>
  );
}
