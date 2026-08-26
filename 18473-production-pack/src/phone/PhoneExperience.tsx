'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';

import type { PublicCaseSummary } from '@/game/content/public-case-summary';
import { LocalStoragePersistenceAdapter } from '@/game/persistence/adapter';
import { createPlayerStore } from '@/game/state/store';
import { ArtifactDetail } from '@/phone/apps/ArtifactDetail';
import { PhoneAppView } from '@/phone/apps/PhoneAppView';
import { AppIcon } from '@/phone/components/AppIcon';
import { PhoneChrome } from '@/phone/components/PhoneChrome';
import { neutralPhoneIndex } from '@/phone/data/neutral-seed';
import type {
  DeepReadonly,
  PhoneAppDescriptor,
  PhoneAppId,
  PhoneDeepLinkTarget,
  PhoneItem,
} from '@/phone/data/schema';
import { applyDiscoveryEffects } from '@/phone/discovery';
import {
  createPhoneNavigationState,
  goBack,
  goHome,
  navigateToApp,
  navigateToDeepLink,
  navigateToItem,
  unlockPhone,
} from '@/phone/navigation';

type PhoneExperienceProps = Readonly<{
  caseSummary: PublicCaseSummary;
}>;

const INITIAL_UNLOCKED_APP_IDS: PhoneAppId[] = neutralPhoneIndex.content.apps
  .filter((app) => !app.lockedInitially)
  .map((app) => app.id);

const GATED_CONTENT_IDS: ReadonlySet<string> = new Set(
  neutralPhoneIndex.content.apps.flatMap((app) =>
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
  const hydrationStatus = useStore(playerStore, (state) => state.hydrationStatus);
  const [navigation, setNavigation] = useState(createPhoneNavigationState);
  const [status, setStatus] = useState('Төхөөрөмж түгжээтэй байна.');
  const headingRef = useRef<HTMLHeadingElement>(null);

  const unlockedAppIds = useMemo(() => {
    const unlocked = new Set<PhoneAppId>(INITIAL_UNLOCKED_APP_IDS);
    for (const app of neutralPhoneIndex.content.apps) {
      if (playerState.unlockedAppIds.includes(app.id)) unlocked.add(app.id);
    }
    return unlocked;
  }, [playerState.unlockedAppIds]);

  const unlockedContentIds = useMemo(
    () => new Set(playerState.unlockedContentIds),
    [playerState.unlockedContentIds],
  );

  useEffect(() => {
    let active = true;
    const actions = playerStore.getState().actions;
    actions.unlockApps([...INITIAL_UNLOCKED_APP_IDS]);
    void actions
      .hydrate()
      .then(() => actions.save())
      .catch(() => {
        if (active) setStatus('Хадгалсан төлөвийг ачаалж чадсангүй.');
      });
    return () => {
      active = false;
    };
  }, [playerStore]);

  const recordDiscovery = (item: DeepReadonly<PhoneItem>): void => {
    if (!item.discovery || !hasDiscoveries(item)) return;
    const actions = playerStore.getState().actions;
    const applied = applyDiscoveryEffects(
      {
        artifactIds: item.discovery.artifactIds
          ? [...item.discovery.artifactIds]
          : undefined,
        evidenceIds: item.discovery.evidenceIds
          ? [...item.discovery.evidenceIds]
          : undefined,
        unlockAppIds: item.discovery.unlockAppIds
          ? [...item.discovery.unlockAppIds]
          : undefined,
        unlockContentIds: item.discovery.unlockContentIds
          ? [...item.discovery.unlockContentIds]
          : undefined,
      },
      actions,
    );
    setStatus(
      applied.unlockAppIds.length > 0 || applied.unlockContentIds.length > 0
        ? 'Шинэ агуулга нээгдлээ.'
        : 'Шинэ мэдээлэл бүртгэгдлээ.',
    );
    void actions.save().catch(() => setStatus('Илрүүлэлтийг хадгалж чадсангүй.'));
  };

  useEffect(() => {
    headingRef.current?.focus();
  }, [navigation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (event.key !== 'Escape' && !(event.altKey && event.key === 'ArrowLeft')) return;

      const next = goBack(navigation);
      if (next === navigation) return;
      event.preventDefault();
      setNavigation(next);
      setStatus('Өмнөх дэлгэц рүү буцлаа.');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation]);

  const openApp = (app: DeepReadonly<PhoneAppDescriptor>): void => {
    if (!unlockedAppIds.has(app.id)) {
      setStatus(`${app.label} апп түгжээтэй байна.`);
      return;
    }
    setNavigation((current) =>
      navigateToApp(current, app.id, neutralPhoneIndex, unlockedAppIds),
    );
    setStatus(`${app.label} апп нээгдлээ.`);
  };

  const openItem = (item: DeepReadonly<PhoneItem>): void => {
    const appId = neutralPhoneIndex.itemAppIds[item.id];
    if (appId === undefined) return;
    if (GATED_CONTENT_IDS.has(item.id) && !unlockedContentIds.has(item.id)) {
      setStatus('Энэ зүйл одоогоор түгжээтэй байна.');
      return;
    }
    recordDiscovery(item);
    setNavigation((current) =>
      navigateToItem(current, appId, item.id, neutralPhoneIndex, unlockedAppIds),
    );
    if (!hasDiscoveries(item)) setStatus(`${item.title} нээгдлээ.`);
  };

  const openDeepLink = (target: DeepReadonly<PhoneDeepLinkTarget>): void => {
    if (!unlockedAppIds.has(target.appId)) {
      setStatus(`${neutralPhoneIndex.appsById[target.appId].label} апп түгжээтэй байна.`);
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
    const targetItem = target.itemId ? neutralPhoneIndex.itemsById[target.itemId] : undefined;
    if (targetItem) recordDiscovery(targetItem);
    setNavigation((current) =>
      navigateToDeepLink(current, target, neutralPhoneIndex, unlockedAppIds),
    );
    if (!targetItem || !hasDiscoveries(targetItem)) setStatus('Холбоотой зүйл нээгдлээ.');
  };

  if (navigation.current.screen === 'lock') {
    return (
      <section
        aria-label={`${caseSummary.label}: ${caseSummary.title}`}
        data-phone-screen="lock"
      >
        <header>
          <p>{caseSummary.label}</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {caseSummary.title}
          </h1>
        </header>
        <p>{neutralPhoneIndex.content.device.ownerLabel}</p>
        <p>{neutralPhoneIndex.content.device.lockPrompt}</p>
        <button
          type="button"
          onClick={() => {
            setNavigation((current) => unlockPhone(current));
            setStatus('Төхөөрөмжийн түгжээ тайлагдлаа.');
          }}
          style={{ minHeight: 44, minWidth: 44 }}
        >
          Түгжээ тайлах
        </button>
        <p role="status" aria-live="polite">
          {hydrationStatus === 'hydrating' ? 'Хадгалсан төлөвийг ачаалж байна.' : status}
        </p>
      </section>
    );
  }

  const route = navigation.current;
  const currentApp =
    route.screen === 'app' || route.screen === 'item'
      ? neutralPhoneIndex.appsById[route.appId]
      : undefined;
  const currentItem =
    route.screen === 'item' ? neutralPhoneIndex.itemsById[route.itemId] : undefined;
  const title =
    route.screen === 'home'
      ? 'Аппын нүүр'
      : route.screen === 'item'
        ? (currentItem?.title ?? currentApp?.label ?? 'Зүйл')
        : (currentApp?.label ?? 'Апп');

  return (
    <PhoneChrome
      title={title}
      screen={route.screen}
      canGoBack={navigation.history.length > 0}
      canGoHome={route.screen !== 'home'}
      headingRef={headingRef}
      onBack={() => {
        setNavigation((current) => goBack(current));
        setStatus('Өмнөх дэлгэц рүү буцлаа.');
      }}
      onHome={() => {
        setNavigation((current) => goHome(current));
        setStatus('Аппын нүүр рүү шилжлээ.');
      }}
    >
      <p role="status" aria-live="polite">
        {hydrationStatus === 'hydrating' ? 'Хадгалсан төлөвийг ачаалж байна.' : status}
      </p>

      {route.screen === 'home' ? (
        <div role="region" aria-label="Аппын нүүр">
          {neutralPhoneIndex.content.apps.map((app) => (
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
          onOpenItem={openItem}
        />
      ) : null}

      {route.screen === 'item' && currentItem ? (
        <ArtifactDetail item={currentItem} onOpenDeepLink={openDeepLink} />
      ) : null}
    </PhoneChrome>
  );
}
