import type { RefObject, ReactNode } from 'react';

import styles from '@/phone/phone.module.css';

type PhoneChromeProps = Readonly<{
  title: string;
  screen: 'home' | 'app' | 'item';
  canGoBack: boolean;
  canGoHome: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack(): void;
  onHome(): void;
  children: ReactNode;
}>;

export function PhoneChrome({
  title,
  screen,
  canGoBack,
  canGoHome,
  headingRef,
  onBack,
  onHome,
  children,
}: PhoneChromeProps) {
  return (
    <section
      aria-labelledby="phone-screen-heading"
      data-phone-screen={screen}
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
      </header>
      <div className={styles.scrollRegion} data-phone-scroll-region>
        {children}
      </div>
    </section>
  );
}
