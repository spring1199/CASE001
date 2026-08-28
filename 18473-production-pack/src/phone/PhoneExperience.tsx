'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';

import type { PublicCaseSummary } from '@/game/content/public-case-summary';
import { LocalStoragePersistenceAdapter } from '@/game/persistence/adapter';
import { applyEngineTransition } from '@/game/runtime/case-runtime';
import { createPlayerStore } from '@/game/state/store';
import { ArtifactDetail } from '@/phone/apps/ArtifactDetail';
import { PhoneAppView } from '@/phone/apps/PhoneAppView';
import { AppIcon } from '@/phone/components/AppIcon';
import { PhoneChrome } from '@/phone/components/PhoneChrome';
import { requestCasePhoneProjection } from '@/phone/case-runtime-client';
import type {
  DeepReadonly,
  PhoneAppDescriptor,
  PhoneAppId,
  PhoneDeepLinkTarget,
  PhoneDiscoveryEffects,
  PhoneItem,
  PhoneContentIndex,
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
  phoneInitializationFailureMessage,
  type PhoneInitializationFailure,
} from '@/phone/runtime';
import styles from '@/phone/phone.module.css';

type PhoneExperienceProps = Readonly<{
  caseSummary: PublicCaseSummary;
}>;

type ScrollNavigationMode = 'reset' | 'restore';

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

function discoveryChanged(
  previous: Readonly<{ discoveredArtifactIds: string[]; discoveredEvidenceIds: string[]; unlockedAppIds: string[]; unlockedContentIds: string[] }>,
  next: Readonly<{ discoveredArtifactIds: string[]; discoveredEvidenceIds: string[]; unlockedAppIds: string[]; unlockedContentIds: string[] }>,
) {
  return {
    information: next.discoveredArtifactIds.length > previous.discoveredArtifactIds.length
      || next.discoveredEvidenceIds.length > previous.discoveredEvidenceIds.length,
    unlocks: next.unlockedAppIds.length > previous.unlockedAppIds.length
      || next.unlockedContentIds.length > previous.unlockedContentIds.length,
  };
}

export function PhoneExperience({ caseSummary }: PhoneExperienceProps) {
  const [playerStore] = useState(() =>
    createPlayerStore({
      caseId: caseSummary.id,
      adapter: new LocalStoragePersistenceAdapter(),
    }),
  );
  const playerState = useStore(playerStore, (state) => state.playerState);
  const [phoneIndex, setPhoneIndex] = useState<PhoneContentIndex | null>(null);
  const [gatedContentIds, setGatedContentIds] = useState<ReadonlySet<string>>(new Set());
  const hydrationStatus = useStore(playerStore, (state) => state.hydrationStatus);
  const [navigation, setNavigation] = useState(createPhoneNavigationState);
  const [status, setStatus] = useState('Төхөөрөмж түгжээтэй байна.');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [initializationFailure, setInitializationFailure] =
    useState<PhoneInitializationFailure | null>(null);
  const [collectionSelections, setCollectionSelections] = useState<
    Partial<Record<PhoneAppId, string>>
  >({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const scrollPositionsRef = useRef(new Map<string, number>());
  const scrollNavigationModeRef = useRef<ScrollNavigationMode>('reset');
  const currentRouteKey = phoneRouteKey(navigation.current);

  const prepareNavigation = useCallback(
    (mode: ScrollNavigationMode): void => {
      const scrollRegion = scrollRegionRef.current;
      if (scrollRegion) {
        scrollPositionsRef.current.set(
          currentRouteKey,
          scrollRegion.scrollTop,
        );
      }
      scrollNavigationModeRef.current = mode;
    },
    [currentRouteKey],
  );

  const unlockedAppIds = useMemo(() => new Set<PhoneAppId>(
    phoneIndex?.content.apps
      .filter((app) => playerState.unlockedAppIds.includes(app.id))
      .map((app) => app.id) ?? [],
  ), [phoneIndex, playerState.unlockedAppIds]);

  const unlockedContentIds = useMemo(
    () => new Set(playerState.unlockedContentIds),
    [playerState.unlockedContentIds],
  );

  useEffect(() => {
    document.cookie = `case-001-facts=${playerState.knownFactIds.join(',')}; Path=/; SameSite=Strict`;
    document.cookie = `case-001-ending=${playerState.endingId ?? ''}; Path=/; SameSite=Strict`;
  }, [playerState.endingId, playerState.knownFactIds]);

  useEffect(() => {
    let active = true;
    void playerStore.getState().actions.hydrate().then(
      () => {
        if (active) setInitializationFailure(null);
      },
      () => {
        if (!active) return;
        setInitializationFailure('hydrate-failed');
        setStatus(phoneInitializationFailureMessage('hydrate-failed'));
      },
    );
    return () => {
      active = false;
    };
  }, [playerStore]);

  const retryInitialization = (): void => {
    setInitializationFailure(null);
    setStatus('Төлөвийг дахин ачаалж байна.');
    void playerStore.getState().actions.hydrate().then(
      () => setStatus('Төлөвийг амжилттай шинэчиллээ.'),
      () => {
        setInitializationFailure('hydrate-failed');
        setStatus(phoneInitializationFailureMessage('hydrate-failed'));
      },
    );
  };

  const refreshProjection = useCallback(async (discovery?: PhoneDiscoveryEffects) => {
    const previous = playerStore.getState().playerState;
    const projection = await requestCasePhoneProjection(previous, discovery);
    applyEngineTransition(playerStore, previous, projection.state);
    setPhoneIndex(projection.phoneIndex);
    setGatedContentIds(projection.gatedContentIds);
    await playerStore.getState().actions.save();
    return discoveryChanged(previous, projection.state);
  }, [playerStore]);

  const recordDiscovery = (item: DeepReadonly<PhoneItem>): void => {
    if (!item.discovery || !hasDiscoveries(item)) return;
    const discovery: PhoneDiscoveryEffects = {
      artifactIds: item.discovery.artifactIds ? [...item.discovery.artifactIds] : undefined,
      evidenceIds: item.discovery.evidenceIds ? [...item.discovery.evidenceIds] : undefined,
      unlockAppIds: item.discovery.unlockAppIds ? [...item.discovery.unlockAppIds] : undefined,
      unlockContentIds: item.discovery.unlockContentIds
        ? [...item.discovery.unlockContentIds]
        : undefined,
    };
    void refreshProjection(discovery).then(
      (changed) => setStatus(
        changed.unlocks
          ? 'Шинэ агуулга нээгдлээ.'
          : changed.information
            ? 'Шинэ мэдээлэл бүртгэгдлээ.'
            : 'Энэ мэдээлэл өмнө бүртгэгдсэн байна.',
      ),
      () => setStatus('Илрүүлэлтийг хадгалж чадсангүй.'),
    );
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
    if (phoneIndex === null) return;
    if (!unlockedAppIds.has(app.id)) {
      setStatus(`${app.label} апп түгжээтэй байна.`);
      return;
    }
    prepareNavigation('reset');
    setNavigation((current) =>
      navigateToApp(current, app.id, phoneIndex, unlockedAppIds),
    );
    setStatus(`${app.label} апп нээгдлээ.`);
  };

  const openItem = (item: DeepReadonly<PhoneItem>): void => {
    if (phoneIndex === null) return;
    const appId = phoneIndex.itemAppIds[item.id];
    if (appId === undefined) return;
    if (gatedContentIds.has(item.id) && !unlockedContentIds.has(item.id)) {
      setStatus('Энэ зүйл одоогоор түгжээтэй байна.');
      return;
    }
    recordDiscovery(item);
    prepareNavigation('reset');
    setNavigation((current) =>
      navigateToItem(current, appId, item.id, phoneIndex, unlockedAppIds),
    );
    if (!hasDiscoveries(item)) setStatus(`${item.title} нээгдлээ.`);
  };

  const openDeepLink = (target: DeepReadonly<PhoneDeepLinkTarget>): void => {
    if (phoneIndex === null) return;
    if (!unlockedAppIds.has(target.appId)) {
      setStatus(`${phoneIndex.appsById[target.appId].label} апп түгжээтэй байна.`);
      return;
    }
    if (
      target.itemId &&
      gatedContentIds.has(target.itemId) &&
      !unlockedContentIds.has(target.itemId)
    ) {
      setStatus('Холбоотой зүйл одоогоор түгжээтэй байна.');
      return;
    }
    const targetItem = target.itemId ? phoneIndex.itemsById[target.itemId] : undefined;
    if (targetItem) recordDiscovery(targetItem);
    prepareNavigation('reset');
    setNavigation((current) =>
      navigateToDeepLink(current, target, phoneIndex, unlockedAppIds),
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
          <p className={styles.lockOwner}>Мөрдөн шалгах төхөөрөмж</p>
          <p className={styles.lockPrompt}>Мөрдөн шалгах төхөөрөмжийг нээнэ үү</p>
          <button
            type="button"
            className={styles.primaryButton}
            data-action-label
            disabled={hydrationStatus !== 'hydrated' || isUnlocking}
            onClick={() => {
              setIsUnlocking(true);
              setStatus('Хэргийн өгөгдлийг аюулгүй ачаалж байна.');
              void refreshProjection().then(
                () => {
                  prepareNavigation('reset');
                  setNavigation((current) => unlockPhone(current));
                  setStatus('Төхөөрөмжийн түгжээ тайлагдлаа.');
                },
                () => setStatus('Хэргийн өгөгдлийг ачаалж чадсангүй.'),
              ).finally(() => setIsUnlocking(false));
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

  if (phoneIndex === null) return null;

  const route = navigation.current;
  const currentApp =
    route.screen === 'app' || route.screen === 'item'
      ? phoneIndex.appsById[route.appId]
      : undefined;
  const currentItem =
    route.screen === 'item' ? phoneIndex.itemsById[route.itemId] : undefined;
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
          {phoneIndex.content.apps.map((app) => (
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
          gatedContentIds={gatedContentIds}
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
