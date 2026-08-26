import type { RefObject, ReactNode } from 'react';

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
    <section aria-labelledby="phone-screen-heading" data-phone-screen={screen}>
      <header>
        <p aria-label="Төхөөрөмжийн цаг">09:41</p>
        <nav aria-label="Утасны навигаци">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            style={{ minHeight: 44, minWidth: 44 }}
          >
            Буцах
          </button>
          <button
            type="button"
            onClick={onHome}
            disabled={!canGoHome}
            style={{ minHeight: 44, minWidth: 44 }}
          >
            Нүүр
          </button>
        </nav>
        <h1 id="phone-screen-heading" ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
      </header>
      {children}
    </section>
  );
}
