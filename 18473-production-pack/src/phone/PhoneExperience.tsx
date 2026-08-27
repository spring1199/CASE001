'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';

import type { PublicCaseSummary } from '@/game/content/public-case-summary';
import { case001Seed } from '@/game/content/case-001';
import { LocalStoragePersistenceAdapter } from '@/game/persistence/adapter';
import { createCaseRuntime } from '@/game/runtime/case-runtime';
import { createPlayerStore } from '@/game/state/store';
import { ArtifactDetail } from '@/phone/apps/ArtifactDetail';
import { PhoneAppView } from '@/phone/apps/PhoneAppView';
import { AppIcon } from '@/phone/components/AppIcon';
import { PhoneChrome } from '@/phone/components/PhoneChrome';
import { case001PhoneIndex } from '@/phone/data/case-001';
import type {
  DeepReadonly,
  PhoneAppDescriptor,
  PhoneAppId,
  PhoneDeepLinkTarget,
  PhoneItem,
} from '@/phone/data/schema';
import {
  createPhoneNavigationState,
  goBack,
  goHome,
  navigateToApp,
  navigateToDeepLink,
  navigateToItem,
  phoneRouteKey,
  unlockPhone,
} from '@/phone/navigation';
import {
  commitPhoneDiscovery,
  initializePhonePlayer,
  phoneInitializationFailureMessage,
  type PhoneInitializationFailure,
  type PhoneInitializationResult,
} from '@/phone/runtime';
import styles from '@/phone/phone.module.css';

type PhoneExperienceProps = Readonly<{
  caseSummary: PublicCaseSummary;
}>;

type ScrollNavigationMode = 'reset' | 'restore';

const INITIAL_UNLOCKED_APP_IDS: PhoneAppId[] = case001PhoneIndex.content.apps
  .filter((app) => !app.lockedInitially)
  .map((app) => app.id);

const GATED_CONTENT_IDS: ReadonlySet<string> = new Set(
  case001PhoneIndex.content.apps.flatMap((app) =>
    app.items.flatMap((item) => item.discovery?.unlockContentIds ?? []),
  ),
);

function hasDiscoveries(item: DeepReadonly<PhoneItem>): boolean {
  const discovery = item.discovery;
  return Boolean(
    discovery &&
      ((discovery.artifactIds?.length ?? 0) > 0 ||
        (discovery.evidenceIds?.length ?? 0) > 0 ||
        (discovery.unlockAppIds?.length ?? 0) > 0 ||
        (discovery.unlockContentIds?.length ?? 0) > 0),
  );
}

export function PhoneExperience({ caseSummary }: PhoneExperienceProps) {
  const [playerStore] = useState(() =>
    createPlayerStore({
      caseId: caseSummary.id,
      adapter: new LocalStoragePersistenceAdapter(),
    }),
  );
  const playerState = useStore(playerStore, (state) => state.playerState);
  const caseRuntime = useMemo(() => createCaseRuntime(case001Seed, playerStore), [playerStore]);
  const hydrationStatus = useStore(playerStore, (state) => state.hydrationStatus);
  const [navigation, setNavigation] = useState(createPhoneNavigationState);
  const [status, setStatus] = useState('Төхөөрөмж түгжээтэй байна.');
  const [initializationFailure, setInitializationFailure] =
    useState<PhoneInitializationFailure | null>(null);
  const [collectionSelections, setCollectionSelections] = useState<
    Partial<Record<PhoneAppId, string>>
  >({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const scrollPositionsRef = useRef(new Map<string, number>());
  const scrollNavigationModeRef = useRef<ScrollNavigationMode>('reset');

  const prepareNavigation = useCallback(
    (mode: ScrollNavigationMode): void => {
      const scrollRegion = scrollRegionRef.current;
      if (scrollRegion) {
        scrollPositionsRef.current.set(
          phoneRouteKey(navigation.current),
          scrollRegion.scrollTop,
        );
      }
      scrollNavigationModeRef.current = mode;
    },
    [navigation],
  );

  const unlockedAppIds = useMemo(() => {
    const unlocked = new Set<PhoneAppId>(INITIAL_UNLOCKED_APP_IDS);
    for (const app of case001PhoneIndex.content.apps) {
      if (playerState.unlockedAppIds.includes(app.id)) unlocked.add(app.id);
    }
    return unlocked;
  }, [playerState.unlockedAppIds]);

  const unlockedContentIds = useMemo(
    () => new Set(playerState.unlockedContentIds),
    [playerState.unlockedContentIds],
  );

  const applyInitializationResult = useCallback(
    (result: PhoneInitializationResult, retry: boolean): void => {
      if (result.kind === 'ready') {
        setInitializationFailure(null);
        if (retry) setStatus('Төлөвийг амжилттай шинэчиллээ.');
        return;
      }
      setInitializationFailure(result.kind);
      setStatus(phoneInitializationFailureMessage(result.kind));
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void initializePhonePlayer(
      INITIAL_UNLOCKED_APP_IDS,
      playerStore.getState().actions,
    ).then((result) => {
      if (active) applyInitializationResult(result, false);
    });
    return () => {
      active = false;
    };
  }, [applyInitializationResult, playerStore]);

  const retryInitialization = (): void => {
    setInitializationFailure(null);
    setStatus('Төлөвийг дахин ачаалж байна.');
    void initializePhonePlayer(
      INITIAL_UNLOCKED_APP_IDS,
      playerStore.getState().actions,
    ).then((result) => applyInitializationResult(result, true));
  };

  const recordDiscovery = (item: DeepReadonly<PhoneItem>): void => {
    if (!item.discovery || !hasDiscoveries(item)) return;
    const artifactIds = item.discovery.artifactIds ? [...item.discovery.artifactIds] : [];
    const evidenceIds = item.discovery.evidenceIds ? [...item.discovery.evidenceIds] : [];
    if (artifactIds.length > 0) {
      caseRuntime.dispatch({ type: 'discover-artifacts', artifactIds });
    }
    if (evidenceIds.length > 0) {
      caseRuntime.dispatch({ type: 'discover-evidence', evidenceIds });
    }
    const result = commitPhoneDiscovery(
      {
        unlockAppIds: item.discovery.unlockAppIds,
        unlockContentIds: item.discovery.unlockContentIds,
      },
      playerStore.getState().playerState,
      playerStore.getState().actions,
    );
    caseRuntime.settle();
    setStatus(
      result.kind === 'content-unlocked'
        ? 'Шинэ агуулга нээгдлээ.'
        : result.kind === 'information-recorded'
          ? 'Шинэ мэдээлэл бүртгэгдлээ.'
          : 'Энэ мэдээлэл өмнө бүртгэгдсэн байна.',
    );
    void result.saveOperation?.catch(() => setStatus('Илрүүлэлтийг хадгалж чадсангүй.'));
  };

  useLayoutEffect(() => {
    const scrollRegion = scrollRegionRef.current;
    if (scrollRegion) {
      scrollRegion.scrollTop =
        scrollNavigationModeRef.current === 'restore'
          ? (scrollPositionsRef.current.get(phoneRouteKey(navigation.current)) ?? 0)
          : 0;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [navigation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || document.querySelector('dialog[open]')) return;

      const eventTarget = event.target;
      const isEditableTarget =
        eventTarget instanceof HTMLInputElement ||
        eventTarget instanceof HTMLTextAreaElement ||
        (eventTarget instanceof HTMLElement && eventTarget.isContentEditable);

      if (event.key === 'Home' && !isEditableTarget && navigation.current.screen !== 'home') {
        event.preventDefault();
        prepareNavigation('reset');
        setNavigation((current) => goHome(current));
        setStatus('Аппын нүүр рүү шилжлээ.');
        return;
      }

      if (event.key !== 'Escape' && !(event.altKey && event.key === 'ArrowLeft')) return;

      const next = goBack(navigation);
      if (next === navigation) return;
      event.preventDefault();
      prepareNavigation('restore');
      setNavigation(next);
      setStatus('Өмнөх дэлгэц рүү буцлаа.');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation, prepareNavigation]);

  const openApp = (app: DeepReadonly<PhoneAppDescriptor>): void => {
    if (!unlockedAppIds.has(app.id)) {
      setStatus(`${app.label} апп түгжээтэй байна.`);
      return;
    }
    prepareNavigation('reset');
    setNavigation((current) =>
      navigateToApp(current, app.id, case001PhoneIndex, unlockedAppIds),
    );
    setStatus(`${app.label} апп нээгдлээ.`);
  };

  const openItem = (item: DeepReadonly<PhoneItem>): void => {
    const appId = case001PhoneIndex.itemAppIds[item.id];
    if (appId === undefined) return;
    if (GATED_CONTENT_IDS.has(item.id) && !unlockedContentIds.has(item.id)) {
      setStatus('Энэ зүйл одоогоор түгжээтэй байна.');
      return;
    }
    recordDiscovery(item);
    prepareNavigation('reset');
    setNavigation((current) =>
      navigateToItem(current, appId, item.id, case001PhoneIndex, unlockedAppIds),
    );
    if (!hasDiscoveries(item)) setStatus(`${item.title} нээгдлээ.`);
  };

  const openDeepLink = (target: DeepReadonly<PhoneDeepLinkTarget>): void => {
    if (!unlockedAppIds.has(target.appId)) {
      setStatus(`${case001PhoneIndex.appsById[target.appId].label} апп түгжээтэй байна.`);
      return;
    }
    if (
      target.itemId &&
      GATED_CONTENT_IDS.has(target.itemId) &&
      !unlockedContentIds.has(target.itemId)
    ) {
      setStatus('Холбоотой зүйл одоогоор түгжээтэй байна.');
      return;
    }
    const targetItem = target.itemId ? case001PhoneIndex.itemsById[target.itemId] : undefined;
    if (targetItem) recordDiscovery(targetItem);
    prepareNavigation('reset');
    setNavigation((current) =>
      navigateToDeepLink(current, target, case001PhoneIndex, unlockedAppIds),
    );
    if (!targetItem || !hasDiscoveries(targetItem)) setStatus('Холбоотой зүйл нээгдлээ.');
  };

  if (navigation.current.screen === 'lock') {
    return (
      <section
        aria-label={`${caseSummary.label}: ${caseSummary.title}`}
        data-phone-screen="lock"
        className={`${styles.phoneSurface} ${styles.lockScreen}`}
      >
        <header className={styles.lockHeader}>
          <p className={styles.eyebrow}>{caseSummary.label}</p>
          <h1 ref={headingRef} tabIndex={-1} className={styles.lockTitle}>
            {caseSummary.title}
          </h1>
        </header>
        <div className={styles.lockContent}>
          <p className={styles.lockOwner}>{case001PhoneIndex.content.device.ownerLabel}</p>
          <p className={styles.lockPrompt}>{case001PhoneIndex.content.device.lockPrompt}</p>
          <button
            type="button"
            className={styles.primaryButton}
            data-action-label
            onClick={() => {
              prepareNavigation('reset');
              setNavigation((current) => unlockPhone(current));
              setStatus('Төхөөрөмжийн түгжээ тайлагдлаа.');
            }}
          >
            Түгжээ тайлах
          </button>
          <p role="status" aria-live="polite" className={styles.statusMessage}>
            {hydrationStatus === 'hydrating' ? 'Хадгалсан төлөвийг ачаалж байна.' : status}
          </p>
          {initializationFailure ? (
            <button
              type="button"
              className={styles.secondaryButton}
              data-action-label
              onClick={retryInitialization}
            >
              Дахин оролдох
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  const route = navigation.current;
  const currentApp =
    route.screen === 'app' || route.screen === 'item'
      ? case001PhoneIndex.appsById[route.appId]
      : undefined;
  const currentItem =
    route.screen === 'item' ? case001PhoneIndex.itemsById[route.itemId] : undefined;
  const title =
    route.screen === 'home'
      ? 'Аппын нүүр'
      : route.screen === 'item'
        ? (currentApp?.label ?? 'Зүйл')
        : (currentApp?.label ?? 'Апп');

  return (
    <PhoneChrome
      title={title}
      screen={route.screen}
      canGoBack={navigation.history.length > 0}
      canGoHome={route.screen !== 'home'}
      headingRef={headingRef}
      scrollRegionRef={scrollRegionRef}
      onBack={() => {
        prepareNavigation('restore');
        setNavigation((current) => goBack(current));
        setStatus('Өмнөх дэлгэц рүү буцлаа.');
      }}
      onHome={() => {
        prepareNavigation('reset');
        setNavigation((current) => goHome(current));
        setStatus('Аппын нүүр рүү шилжлээ.');
      }}
    >
      <p role="status" aria-live="polite" className={styles.statusMessage}>
        {hydrationStatus === 'hydrating' ? 'Хадгалсан төлөвийг ачаалж байна.' : status}
      </p>
      {initializationFailure ? (
        <button
          type="button"
          className={styles.secondaryButton}
          data-action-label
          onClick={retryInitialization}
        >
          Дахин оролдох
        </button>
      ) : null}

      {route.screen === 'home' ? (
        <div role="region" aria-label="Аппын нүүр" className={styles.homeGrid}>
          {case001PhoneIndex.content.apps.map((app) => (
            <AppIcon
              key={app.id}
              app={app}
              locked={!unlockedAppIds.has(app.id)}
              onActivate={() => openApp(app)}
            />
          ))}
        </div>
      ) : null}

      {route.screen === 'app' && currentApp ? (
        <PhoneAppView
          key={currentApp.id}
          app={currentApp}
          unlockedContentIds={unlockedContentIds}
          gatedContentIds={GATED_CONTENT_IDS}
          initialCollectionId={collectionSelections[currentApp.id]}
          onCollectionChange={(collectionId) => {
            setCollectionSelections((current) => ({
              ...current,
              [currentApp.id]: collectionId,
            }));
          }}
          onOpenItem={openItem}
        />
      ) : null}

      {route.screen === 'item' && currentItem ? (
        <ArtifactDetail item={currentItem} onOpenDeepLink={openDeepLink} />
      ) : null}
    </PhoneChrome>
  );
}
