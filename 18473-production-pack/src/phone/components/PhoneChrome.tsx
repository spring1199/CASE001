import type { KeyboardEvent, RefObject, ReactNode } from 'react';

import styles from '@/phone/phone.module.css';

export type ExperienceSurface = 'phone' | 'investigation';

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
  const moveBetweenSurfaceTabs = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const nextSurface = nextExperienceSurfaceForKey(activeSurface, event.key);
    if (nextSurface === null) return;
    event.preventDefault();
    onSurfaceChange(nextSurface);
    document.getElementById(`${nextSurface}-surface-tab`)?.focus();
  };

  return (
    <section
      aria-labelledby="phone-screen-heading"
      data-phone-screen={screen}
      data-active-surface={activeSurface}
      className={styles.phoneSurface}
    >
      <div
        data-phone-chrome-content
        inert={contentInert}
        aria-hidden={contentInert || undefined}
        className={styles.phoneChromeContent}
      >
      <header className={styles.phoneHeader}>
        <div className={styles.statusBar}>
          <p aria-label="Төхөөрөмжийн цаг" className={styles.statusTime}>09:41</p>
          <span aria-hidden="true" className={styles.statusIndicators}>● ◒</span>
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
          <div className={styles.headerUtilities}>
            <span className={styles.deviceLabel}>18473</span>
            {onOpenAudioSettings ? (
              <button
                type="button"
                className={styles.navButton}
                aria-label="Дууны тохиргоо нээх"
                data-action-label
                onClick={onOpenAudioSettings}
              >
                Дуу
              </button>
            ) : null}
          </div>
        </div>
        <h1 id="phone-screen-heading" ref={headingRef} tabIndex={-1} className={styles.screenTitle}>
          {title}
        </h1>
        <div role="tablist" aria-label="Үндсэн ажлын талбар" className={styles.collectionNav}>
          <button
            type="button"
            role="tab"
            id="phone-surface-tab"
            aria-controls="phone-surface-panel"
            aria-selected={activeSurface === 'phone'}
            tabIndex={activeSurface === 'phone' ? 0 : -1}
            className={styles.collectionButton}
            onClick={() => onSurfaceChange('phone')}
            onKeyDown={moveBetweenSurfaceTabs}
          >
            Утас
          </button>
          <button
            type="button"
            role="tab"
            id="investigation-surface-tab"
            aria-controls="investigation-surface-panel"
            aria-selected={activeSurface === 'investigation'}
            tabIndex={activeSurface === 'investigation' ? 0 : -1}
            className={styles.collectionButton}
            onClick={() => onSurfaceChange('investigation')}
            onKeyDown={moveBetweenSurfaceTabs}
          >
            Мөрдлөг
          </button>
        </div>
      </header>
      <div ref={scrollRegionRef} className={styles.scrollRegion} data-phone-scroll-region>
        {children}
      </div>
      </div>
      {overlay}
    </section>
  );
}
