import type { PhoneAppDescriptor } from '@/phone/data/schema';

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
      style={{ minHeight: 44, minWidth: 44 }}
    >
      <span aria-hidden="true">{app.label.slice(0, 1)}</span>
      <span>{app.shortLabel}</span>
      {locked ? <span aria-hidden="true"> · Түгжээтэй</span> : null}
    </button>
  );
}
