import { PhoneGlyph, type PhoneGlyphName } from '@/phone/components/PhoneGlyph';
import type { PhoneAppDescriptor, PhoneAppId } from '@/phone/data/schema';
import styles from '@/phone/phone.module.css';

type AppIconProps = Readonly<{
  app: Readonly<Pick<PhoneAppDescriptor, 'id' | 'iconLabel' | 'label' | 'shortLabel'>>;
  locked: boolean;
  onActivate(): void;
}>;

const APP_GLYPHS: Readonly<Record<PhoneAppId, PhoneGlyphName>> = {
  messages: 'app-messages',
  gallery: 'app-gallery',
  calls: 'app-calls',
  mail: 'app-mail',
  browser: 'app-browser',
  notes: 'app-notes',
  files: 'app-files',
  settings: 'app-settings',
};

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
      <span aria-hidden="true" data-app-glyph={app.id} className={styles.appGlyph}>
        <PhoneGlyph name={APP_GLYPHS[app.id]} size="1.75rem" />
        {locked ? (
          <span className={styles.lockBadge}>
            <PhoneGlyph name="lock" size="0.6875rem" />
          </span>
        ) : null}
      </span>
      <span className={styles.appLabel}>{app.shortLabel}</span>
    </button>
  );
}
