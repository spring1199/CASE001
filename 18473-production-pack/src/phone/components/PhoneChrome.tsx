'use client';

import { useState, type KeyboardEvent, type RefObject, type ReactNode, type UIEvent } from 'react';

import { PhoneGlyph } from '@/phone/components/PhoneGlyph';
import styles from '@/phone/phone.module.css';

export type ExperienceSurface = 'phone' | 'investigation';

/** Scroll depth at which the compact navigation title replaces the large title. */
export const COMPACT_TITLE_SCROLL_THRESHOLD = 24;

export function nextExperienceSurfaceForKey(
  activeSurface: ExperienceSurface,
  key: string,
): ExperienceSurface | null {
  if (key === 'Home') return 'phone';
  if (key === 'End') return 'investigation';
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    return activeSurface === 'phone' ? 'investigation' : 'phone';
  }
  return null;
}

type PhoneChromeProps = Readonly<{
  title: string;
  screen: 'home' | 'app' | 'item';
  activeSurface: ExperienceSurface;
  canGoBack: boolean;
  canGoHome: boolean;
  runtimeBusy?: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  scrollRegionRef: RefObject<HTMLDivElement | null>;
  onBack(): void;
  onHome(): void;
  onSurfaceChange(surface: ExperienceSurface): void;
  onOpenAudioSettings?(): void;
  contentInert?: boolean;
  overlay?: ReactNode;
  children: ReactNode;
}>;

export function PhoneChrome({
  title,
  screen,
  activeSurface,
  canGoBack,
  canGoHome,
  runtimeBusy = false,
  headingRef,
  scrollRegionRef,
  onBack,
  onHome,
  onSurfaceChange,
  onOpenAudioSettings,
  contentInert = false,
  overlay,
  children,
}: PhoneChromeProps) {
  const [scrolled, setScrolled] = useState(false);

  const moveBetweenSurfaceTabs = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const nextSurface = nextExperienceSurfaceForKey(activeSurface, event.key);
    if (nextSurface === null) return;
    event.preventDefault();
    onSurfaceChange(nextSurface);
    document.getElementById(`${nextSurface}-surface-tab`)?.focus();
  };

  const trackScrollDepth = (event: UIEvent<HTMLDivElement>): void => {
    const past = event.currentTarget.scrollTop > COMPACT_TITLE_SCROLL_THRESHOLD;
    setScrolled((current) => (current === past ? current : past));
  };

  return (
    <section
      aria-labelledby="phone-screen-heading"
      data-phone-screen={screen}
      data-active-surface={activeSurface}
      data-runtime-busy={runtimeBusy}
      aria-busy={runtimeBusy}
      className={styles.phoneSurface}
    >
      <div
        data-phone-chrome-content
        inert={contentInert}
        aria-hidden={contentInert || undefined}
        className={styles.phoneChromeContent}
      >
      <header className={styles.phoneHeader} data-scrolled={scrolled}>
        <div className={styles.statusBar}>
          <p aria-label="Төхөөрөмжийн цаг" className={styles.statusTime}>09:41</p>
          <div className={styles.statusCluster}>
            <span aria-hidden="true" className={styles.statusIndicators}>
              <PhoneGlyph name="signal" size="1.0625rem" />
              <PhoneGlyph name="wifi" size="1.0625rem" />
              <PhoneGlyph name="battery" size="1.5rem" />
            </span>
            {onOpenAudioSettings ? (
              <button
                type="button"
                className={styles.statusAction}
                aria-label="Дууны тохиргоо нээх"
                data-action-label
                onClick={onOpenAudioSettings}
              >
                <PhoneGlyph name="speaker" size="1.125rem" />
              </button>
            ) : null}
          </div>
        </div>
        <div className={styles.navigationBar}>
          <nav aria-label="Утасны навигаци" className={styles.navigationActions}>
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className={styles.navButton}
            data-action-label
          >
            <PhoneGlyph name="chevron-left" size="1.125rem" />
            Буцах
          </button>
          <button
            type="button"
            onClick={onHome}
            disabled={!canGoHome}
            className={styles.navButton}
            data-action-label
          >
            Нүүр
          </button>
          </nav>
          <p aria-hidden="true" className={styles.navTitle}>{title}</p>
          <div className={styles.headerUtilities}>
            <span className={styles.deviceLabel}>18473</span>
          </div>
        </div>
      </header>
      <div
        ref={scrollRegionRef}
        className={styles.scrollRegion}
        data-phone-scroll-region
        onScroll={trackScrollDepth}
      >
        <h1 id="phone-screen-heading" ref={headingRef} tabIndex={-1} className={styles.screenTitle}>
          {title}
        </h1>
        {children}
      </div>
      <nav className={styles.tabBar}>
        <div role="tablist" aria-label="Үндсэн ажлын талбар" className={styles.tabBarInner}>
          <button
            type="button"
            role="tab"
            id="phone-surface-tab"
            aria-controls="phone-surface-panel"
            aria-selected={activeSurface === 'phone'}
            tabIndex={activeSurface === 'phone' ? 0 : -1}
            className={styles.tabButton}
            onClick={() => onSurfaceChange('phone')}
            onKeyDown={moveBetweenSurfaceTabs}
          >
            <span aria-hidden="true" className={styles.tabGlyph}>
              <PhoneGlyph name="surface-device" size="1.375rem" />
            </span>
            Утас
          </button>
          <button
            type="button"
            role="tab"
            id="investigation-surface-tab"
            aria-controls="investigation-surface-panel"
            aria-selected={activeSurface === 'investigation'}
            tabIndex={activeSurface === 'investigation' ? 0 : -1}
            className={styles.tabButton}
            onClick={() => onSurfaceChange('investigation')}
            onKeyDown={moveBetweenSurfaceTabs}
          >
            <span aria-hidden="true" className={styles.tabGlyph}>
              <PhoneGlyph name="surface-board" size="1.375rem" />
            </span>
            Мөрдлөг
          </button>
        </div>
      </nav>
      </div>
      {overlay}
    </section>
  );
}
