import type { RefObject, ReactNode } from 'react';

import styles from '@/phone/phone.module.css';

type PhoneChromeProps = Readonly<{
  title: string;
  screen: 'home' | 'app' | 'item';
  activeSurface: 'phone' | 'investigation';
  canGoBack: boolean;
  canGoHome: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  scrollRegionRef: RefObject<HTMLDivElement | null>;
  onBack(): void;
  onHome(): void;
  onSurfaceChange(surface: 'phone' | 'investigation'): void;
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
  children,
}: PhoneChromeProps) {
  return (
    <section
      aria-labelledby="phone-screen-heading"
      data-phone-screen={screen}
      data-active-surface={activeSurface}
      className={styles.phoneSurface}
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
          <span className={styles.deviceLabel}>18473</span>
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
            className={styles.collectionButton}
            onClick={() => onSurfaceChange('phone')}
          >
            Утас
          </button>
          <button
            type="button"
            role="tab"
            id="investigation-surface-tab"
            aria-controls="investigation-surface-panel"
            aria-selected={activeSurface === 'investigation'}
            className={styles.collectionButton}
            onClick={() => onSurfaceChange('investigation')}
          >
            Мөрдлөг
          </button>
        </div>
      </header>
      <div ref={scrollRegionRef} className={styles.scrollRegion} data-phone-scroll-region>
        {children}
      </div>
    </section>
  );
}
