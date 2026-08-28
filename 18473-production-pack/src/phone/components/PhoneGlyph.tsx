import type { ReactElement } from 'react';

/**
 * Fictional, brand-neutral phone iconography. Every glyph is a plain inline SVG
 * so the interface needs no icon font, no network asset, and no vendor artwork.
 */
export type PhoneGlyphName =
  | 'signal'
  | 'wifi'
  | 'battery'
  | 'chevron-left'
  | 'chevron-right'
  | 'speaker'
  | 'search'
  | 'surface-device'
  | 'surface-board'
  | 'lock'
  | 'call-incoming'
  | 'call-outgoing'
  | 'call-system'
  | 'app-messages'
  | 'app-gallery'
  | 'app-calls'
  | 'app-mail'
  | 'app-browser'
  | 'app-notes'
  | 'app-files'
  | 'app-settings';

type PhoneGlyphProps = Readonly<{
  name: PhoneGlyphName;
  size?: string;
}>;

const strokePaths: Readonly<Partial<Record<PhoneGlyphName, ReactElement>>> = {
  'chevron-left': <path d="M15 5 8 12l7 7" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.4 15.4 4.6 4.6" />
    </>
  ),
  'chevron-right': <path d="m9.5 5 7 7-7 7" />,
  speaker: (
    <>
      <path d="M4 9.5h3L11 6v12L7 14.5H4z" />
      <path d="M15 9.5a4 4 0 0 1 0 5" />
      <path d="M17.8 7a7.5 7.5 0 0 1 0 10" />
    </>
  ),
  'surface-device': (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
      <path d="M10.5 18.6h3" />
    </>
  ),
  'surface-board': (
    <>
      <circle cx="6" cy="7" r="2.2" />
      <circle cx="18" cy="10" r="2.2" />
      <circle cx="9.5" cy="18" r="2.2" />
      <path d="m8 8.2 8 1.2M17 12l-6 4.4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.4" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
    </>
  ),
  'call-incoming': (
    <>
      <path d="M20 4 14 10" />
      <path d="M14 5v5h5" />
      <path d="M4.5 13.4a13 13 0 0 0 6.1 6.1l2-2 3.9 1.4v3.1H14A11.5 11.5 0 0 1 2.5 10.6V9h3.1L7 12.9z" />
    </>
  ),
  'call-outgoing': (
    <>
      <path d="m14 10 6-6" />
      <path d="M20 9V4h-5" />
      <path d="M4.5 13.4a13 13 0 0 0 6.1 6.1l2-2 3.9 1.4v3.1H14A11.5 11.5 0 0 1 2.5 10.6V9h3.1L7 12.9z" />
    </>
  ),
  'call-system': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5l3 1.8" />
    </>
  ),
  'app-messages': (
    <path d="M4 6.6A2.6 2.6 0 0 1 6.6 4h10.8A2.6 2.6 0 0 1 20 6.6v7.2a2.6 2.6 0 0 1-2.6 2.6H10l-4.6 3.4a.6.6 0 0 1-1-.5v-2.9H6.6A2.6 2.6 0 0 1 4 13.8z" />
  ),
  'app-gallery': (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.8" />
      <circle cx="9" cy="9.6" r="1.7" />
      <path d="m4.4 17.2 4.4-4.3a2 2 0 0 1 2.8 0l3.1 3 1.6-1.5a2 2 0 0 1 2.8 0l1.4 1.3" />
    </>
  ),
  'app-calls': (
    <path d="M5.2 14.6a15 15 0 0 0 6.9 6.9l2.4-2.4 4.6 1.6v3.1h-2.9A13.6 13.6 0 0 1 2.6 10.1V7.2h3.1l1.6 4.6z" />
  ),
  'app-mail': (
    <>
      <rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.6" />
      <path d="m3.9 7.4 7.1 5a1.8 1.8 0 0 0 2 0l7.1-5" />
    </>
  ),
  'app-browser': (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m15.6 8.4-1.9 5.3-5.3 1.9 1.9-5.3z" />
    </>
  ),
  'app-notes': (
    <>
      <rect x="5" y="3.4" width="14" height="17.2" rx="2.6" />
      <path d="M8.6 8.6h6.8M8.6 12h6.8M8.6 15.4h4.2" />
    </>
  ),
  'app-files': (
    <path d="M3.6 7.4a2.4 2.4 0 0 1 2.4-2.4h3l2.2 2.4h7.2a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4H6a2.4 2.4 0 0 1-2.4-2.4z" />
  ),
  'app-settings': (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7 5 5M19 19l-1.7-1.7M6.7 17.3 5 19M19 5l-1.7 1.7" />
    </>
  ),
};

function StatusSignal() {
  return (
    <>
      <rect x="1" y="10.5" width="3.2" height="4.5" rx="1" fill="currentColor" />
      <rect x="6.4" y="8" width="3.2" height="7" rx="1" fill="currentColor" />
      <rect x="11.8" y="5.5" width="3.2" height="9.5" rx="1" fill="currentColor" />
      <rect x="17.2" y="3" width="3.2" height="12" rx="1" fill="currentColor" />
    </>
  );
}

function StatusWifi() {
  return (
    <>
      <path
        d="M3 8.2a13.5 13.5 0 0 1 18 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M6.4 11.7a8.6 8.6 0 0 1 11.2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M9.7 15.2a3.9 3.9 0 0 1 4.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </>
  );
}

function StatusBattery() {
  return (
    <>
      <rect
        x="1"
        y="5.5"
        width="18"
        height="9.5"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.4"
      />
      <rect x="2.8" y="7.3" width="11.6" height="5.9" rx="1.8" fill="currentColor" />
      <path d="M20.6 8.6v3.3a2.4 2.4 0 0 0 0-3.3z" fill="currentColor" fillOpacity="0.45" />
    </>
  );
}

export function PhoneGlyph({ name, size = '1.25rem' }: PhoneGlyphProps) {
  const shared = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    focusable: 'false',
    xmlns: 'http://www.w3.org/2000/svg',
  } as const;

  if (name === 'signal') return <svg {...shared} viewBox="0 0 22 18">{StatusSignal()}</svg>;
  if (name === 'wifi') return <svg {...shared} viewBox="0 0 24 18">{StatusWifi()}</svg>;
  if (name === 'battery') return <svg {...shared} viewBox="0 0 22 20">{StatusBattery()}</svg>;

  return (
    <svg
      {...shared}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {strokePaths[name]}
    </svg>
  );
}
