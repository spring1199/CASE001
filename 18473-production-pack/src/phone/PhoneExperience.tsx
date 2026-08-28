'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';

import type { PublicCaseSummary } from '@/game/content/public-case-summary';
import type { CaseView } from '@/game/engine/view';
import { LocalStoragePersistenceAdapter } from '@/game/persistence/adapter';
import { applyEngineTransition } from '@/game/runtime/case-runtime';
import type { PlayerCaseEngineEvent } from '@/game/schema/case-view';
import { createPlayerStore } from '@/game/state/store';
import type { PlayerState } from '@/game/state/types';
import { ArtifactDetail } from '@/phone/apps/ArtifactDetail';
import { PhoneAppView } from '@/phone/apps/PhoneAppView';
import { AppIcon } from '@/phone/components/AppIcon';
import { PhoneChrome, type ExperienceSurface } from '@/phone/components/PhoneChrome';
import {
  requestCasePhoneProjection,
  type CasePhoneProjection,
} from '@/phone/case-runtime-client';
import { InvestigationWorkspace } from '@/phone/polish/InvestigationWorkspace';
import { AudioSettings } from '@/phone/polish/AudioSettings';
import { AudioPlaybackProvider } from '@/phone/polish/audio-playback';
import { AudioDirector, type AudioCue } from '@/phone/polish/audio-director';
import {
  AudioPreferencesStorage,
  type AudioPreferences,
} from '@/phone/polish/audio-preferences';
import {
  PresentationLayer,
  type EndingAftermath,
  type ProjectedPresentationRecord,
} from '@/phone/polish/PresentationLayer';
import type { PresentationBeat } from '@/phone/polish/presentation';
import {
  createPresentationSnapshot,
  derivePresentationChange,
  isBlockingPresentationChange,
  type PresentationSnapshot,
} from '@/phone/polish/presentation-flow';
import {
  acknowledgePendingPresentation as acknowledgePersistedPresentation,
  pendingPresentationQueue,
  PresentationCheckpointStorage,
  presentationCheckpointAfterEndingSelection,
  presentationStageForEnding,
  setPendingPresentation as persistPendingPresentation,
  setEndingPresentationStage,
  type EndingPresentationStage,
  type PresentationCheckpoint,
} from '@/phone/polish/presentation-storage';
import {
  RuntimeMutationError,
  RuntimeMutationQueue,
  RuntimeRetryRegistry,
  shouldFocusAfterRuntimeOutcomes,
  type RuntimeRetryEntry,
} from '@/phone/runtime-mutation-queue';
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

type PendingPresentation = Readonly<{
  beat: PresentationBeat;
  key: string;
  records: readonly ProjectedPresentationRecord[];
}>;

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
  const [persistenceAdapter] = useState(() => new LocalStoragePersistenceAdapter());
  const [playerStore] = useState(() =>
    createPlayerStore({
      caseId: caseSummary.id,
      adapter: persistenceAdapter,
    }),
  );
  const [presentationStorage] = useState(() => new PresentationCheckpointStorage());
  const [presentationCheckpoint, setPresentationCheckpoint] = useState(
    () => presentationStorage.load(),
  );
  const [audioPreferencesStorage] = useState(() => new AudioPreferencesStorage());
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>(
    () => audioPreferencesStorage.load(),
  );
  const [audioDirector] = useState(() => new AudioDirector({ preferences: audioPreferences }));
  const [audioAvailable, setAudioAvailable] = useState<boolean | null>(null);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [pendingPresentation, setPendingPresentationState] = useState<PendingPresentation | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const playerState = useStore(playerStore, (state) => state.playerState);
  const [phoneIndex, setPhoneIndex] = useState<PhoneContentIndex | null>(null);
  const [caseView, setCaseView] = useState<CaseView | null>(null);
  const [gatedContentIds, setGatedContentIds] = useState<ReadonlySet<string>>(new Set());
  const hydrationStatus = useStore(playerStore, (state) => state.hydrationStatus);
  const [navigation, setNavigation] = useState(createPhoneNavigationState);
  const [activeSurface, setActiveSurface] = useState<ExperienceSurface>('phone');
  const [status, setStatus] = useState('Төхөөрөмж түгжээтэй байна.');
  const [runtimeMutationPending, setRuntimeMutationPending] = useState(false);
  const [runtimeRetries, setRuntimeRetries] = useState<readonly RuntimeRetryEntry[]>([]);
  const [presentationPersistenceLimited, setPresentationPersistenceLimited] = useState(false);
  const [focusStatusRevision, setFocusStatusRevision] = useState(0);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [initializationFailure, setInitializationFailure] =
    useState<PhoneInitializationFailure | null>(null);
  const [collectionSelections, setCollectionSelections] = useState<
    Partial<Record<PhoneAppId, string>>
  >({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const actionStatusRef = useRef<HTMLParagraphElement>(null);
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const presentationCheckpointRef = useRef(presentationCheckpoint);
  const presentationSnapshotRef = useRef<PresentationSnapshot | null>(null);
  const audioLifecycleGenerationRef = useRef(0);
  const scrollPositionsRef = useRef(new Map<string, number>());
  const scrollNavigationModeRef = useRef<ScrollNavigationMode>('reset');
  const currentRouteKey = phoneRouteKey(navigation.current);
  const runtimeMutationQueue = useMemo(() => (
    new RuntimeMutationQueue<PlayerState, CasePhoneProjection>({
      getLatestState: () => playerStore.getState().playerState,
      persistProjectedState: (state) => persistenceAdapter.save(state),
      onPendingChange: setRuntimeMutationPending,
    })
  ), [persistenceAdapter, playerStore]);
  const runtimeRetryRegistry = useMemo(
    () => new RuntimeRetryRegistry(setRuntimeRetries),
    [],
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Remounting (React Strict Mode, route churn) must not leave the experience
  // permanently silent, so a superseded teardown never disposes the live director.
  useEffect(() => {
    const generation = audioLifecycleGenerationRef.current + 1;
    audioLifecycleGenerationRef.current = generation;
    return () => {
      queueMicrotask(() => {
        if (audioLifecycleGenerationRef.current === generation) {
          void audioDirector.dispose();
        }
      });
    };
  }, [audioDirector]);

  const activateAudio = useCallback(async (): Promise<boolean> => {
    const activated = await audioDirector.activateFromUserGesture();
    setAudioAvailable(activated);
    return activated;
  }, [audioDirector]);

  const playCue = useCallback((cue: AudioCue): void => {
    audioDirector.playCue(cue);
  }, [audioDirector]);

  const commitAudioPreferences = useCallback((preferences: AudioPreferences): void => {
    setAudioPreferences(preferences);
    audioDirector.updatePreferences(preferences);
    audioPreferencesStorage.save(preferences);
  }, [audioDirector, audioPreferencesStorage]);

  const commitPresentationCheckpoint = useCallback((checkpoint: PresentationCheckpoint): void => {
    presentationCheckpointRef.current = checkpoint;
    setPresentationCheckpoint(checkpoint);
    if (!presentationStorage.save(checkpoint)) setPresentationPersistenceLimited(true);
  }, [presentationStorage]);

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

  const applyProjection = useCallback((
    previous: PlayerState,
    projection: CasePhoneProjection,
  ): void => {
    const currentSnapshot = createPresentationSnapshot(projection.view);
    const previousSnapshot = presentationSnapshotRef.current;
    if (previousSnapshot === null) {
      const persistedPending = pendingPresentationQueue(presentationCheckpointRef.current)[0];
      if (persistedPending !== undefined) {
        setPendingPresentationState({
          beat: persistedPending.beat,
          key: persistedPending.key,
          records: persistedPending.records,
        });
      }
    } else {
      const change = derivePresentationChange(previousSnapshot, currentSnapshot, projection.outcomes);
      if (
        change !== null
        && !presentationCheckpointRef.current.acknowledgedBeatKeys.includes(change.key)
      ) {
        if (isBlockingPresentationChange(change)) {
          const queueBefore = pendingPresentationQueue(presentationCheckpointRef.current);
          const checkpoint = persistPendingPresentation(
            presentationCheckpointRef.current,
            {
              beat: change.beat,
              key: change.key,
              records: change.records,
            },
          );
          commitPresentationCheckpoint(checkpoint);
          if (queueBefore.length === 0) {
            setPendingPresentationState({
              beat: change.beat,
              key: change.key,
              records: change.records,
            });
          }
        }
        playCue(change.cue);
      } else if (projection.outcomes.length > 0) {
        playCue('interface');
      }
    }
    applyEngineTransition(playerStore, previous, projection.state);
    setPhoneIndex(projection.phoneIndex);
    setGatedContentIds(projection.gatedContentIds);
    setCaseView(projection.view);
    presentationSnapshotRef.current = currentSnapshot;
    void playerStore.getState().actions.save().catch(() => {
      setStatus('Үндсэн ахиц хадгалагдсан ч хугацааны тэмдгийг шинэчилж чадсангүй.');
    });
  }, [commitPresentationCheckpoint, playerStore, playCue]);

  const refreshProjection = useCallback(async (discovery?: PhoneDiscoveryEffects) => {
    let change = { information: false, unlocks: false };
    await runtimeMutationQueue.enqueue(
      (latestState) => requestCasePhoneProjection(latestState, discovery),
      (previous, projection) => {
        change = discoveryChanged(previous, projection.state);
        applyProjection(previous, projection);
      },
    );
    return change;
  }, [applyProjection, runtimeMutationQueue]);

  const updateEndingStage = useCallback((stage: EndingPresentationStage): void => {
    const endingId = caseView?.ending?.endingId;
    if (endingId === undefined) return;
    commitPresentationCheckpoint(setEndingPresentationStage(
      presentationCheckpointRef.current,
      endingId,
      stage,
    ));
    playCue(stage === 'postcredit' ? 'ending' : 'reveal');
  }, [caseView?.ending?.endingId, commitPresentationCheckpoint, playCue]);

  async function dispatchCaseEvent(event: PlayerCaseEngineEvent): Promise<void> {
    if (pendingPresentationQueue(presentationCheckpointRef.current).length > 0) {
      setStatus('Илрүүлэлтийг үргэлжлүүлсний дараа мөрдлөгийн үйлдэл хийнэ үү.');
      return;
    }
    setStatus('Мөрдлөгийн үйлдлийг шалгаж байна.');

    try {
      const projection = await runtimeMutationQueue.enqueue(
        (latestState) => requestCasePhoneProjection(latestState, undefined, event),
        (previous, committedProjection) => {
          const selectedEndingId = committedProjection.view.ending?.endingId;
          const endingCheckpoint = presentationCheckpointAfterEndingSelection(
            presentationCheckpointRef.current,
            committedProjection.outcomes,
            selectedEndingId ?? null,
          );
          if (endingCheckpoint !== presentationCheckpointRef.current) {
            commitPresentationCheckpoint(endingCheckpoint);
          }
          applyProjection(previous, committedProjection);
          if (shouldFocusAfterRuntimeOutcomes(committedProjection.outcomes)) {
            setFocusStatusRevision((revision) => revision + 1);
          }
        },
      );
      setStatus(projection.outcomes.some((outcome) => outcome.type.endsWith('rejected'))
        ? 'Энэ үйлдлийг одоогоор гүйцэтгэх боломжгүй байна.'
        : projection.outcomes.length > 0
          ? 'Мөрдлөгийн төлөв шинэчлэгдлээ.'
          : 'Шинэ өөрчлөлт бүртгэгдсэнгүй.');
    } catch (error) {
      setStatus(error instanceof RuntimeMutationError && error.stage === 'persist'
        ? 'Өөрчлөлтийг хадгалж чадсангүй. Өмнөх төлөв хэвээр байна.'
        : 'Мөрдлөгийн төлөвийг шинэчилж чадсангүй. Өмнөх төлөв хэвээр байна.');
      runtimeRetryRegistry.add(() => { void dispatchCaseEvent(event); });
    }
  }

  function recordDiscovery(item: DeepReadonly<PhoneItem>): void {
    if (pendingPresentationQueue(presentationCheckpointRef.current).length > 0) {
      setStatus('Илрүүлэлтийг үргэлжлүүлсний дараа шинэ мэдээлэл нээнэ үү.');
      return;
    }
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
      (changed) => {
        playCue(changed.information || changed.unlocks ? 'discovery' : 'interface');
        setStatus(
          changed.unlocks
            ? 'Шинэ агуулга нээгдлээ.'
            : changed.information
              ? 'Шинэ мэдээлэл бүртгэгдлээ.'
              : 'Энэ мэдээлэл өмнө бүртгэгдсэн байна.',
        );
      },
      () => {
        setStatus('Илрүүлэлтийг хадгалж чадсангүй. Өмнөх төлөв хэвээр байна.');
        runtimeRetryRegistry.add(() => recordDiscovery(item));
      },
    );
  }

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

  useLayoutEffect(() => {
    if (focusStatusRevision > 0) actionStatusRef.current?.focus({ preventScroll: true });
  }, [focusStatusRevision]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // A native dialog or a blocking reveal owns the keyboard while it is open.
      if (
        event.defaultPrevented
        || document.querySelector('dialog[open]')
        || document.querySelector('[data-presentation-beat]')
      ) return;

      const eventTarget = event.target;
      const isEditableTarget =
        eventTarget instanceof HTMLInputElement ||
        eventTarget instanceof HTMLTextAreaElement ||
        (eventTarget instanceof HTMLElement && eventTarget.isContentEditable);

      if (
        activeSurface === 'phone'
        && event.key === 'Home'
        && !isEditableTarget
        && navigation.current.screen !== 'home'
      ) {
        event.preventDefault();
        prepareNavigation('reset');
        setNavigation((current) => goHome(current));
        setStatus('Аппын нүүр рүү шилжлээ.');
        return;
      }

      if (
        activeSurface !== 'phone'
        || (event.key !== 'Escape' && !(event.altKey && event.key === 'ArrowLeft'))
      ) return;

      const next = goBack(navigation);
      if (next === navigation) return;
      event.preventDefault();
      prepareNavigation('restore');
      setNavigation(next);
      setStatus('Өмнөх дэлгэц рүү буцлаа.');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSurface, navigation, prepareNavigation]);

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
    playCue('interface');
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
    playCue('interface');
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
    playCue('interface');
    if (!targetItem || !hasDiscoveries(targetItem)) setStatus('Холбоотой зүйл нээгдлээ.');
  };

  function unlockDevice(): void {
    void activateAudio().then((activated) => {
      if (activated) playCue('interface');
    });
    setIsUnlocking(true);
    setStatus('Хэргийн өгөгдлийг аюулгүй ачаалж байна.');
    void refreshProjection().then(
      () => {
        prepareNavigation('reset');
        setNavigation((current) => unlockPhone(current));
        setStatus('Төхөөрөмжийн түгжээ тайлагдлаа.');
      },
      () => {
        setStatus('Хэргийн өгөгдлийг хадгалж ачаалж чадсангүй. Өмнөх төлөв хэвээр байна.');
        runtimeRetryRegistry.add(unlockDevice);
      },
    ).finally(() => setIsUnlocking(false));
  }

  if (navigation.current.screen === 'lock') {
    return (
      <section
        aria-label={`${caseSummary.label}: ${caseSummary.title}`}
        data-phone-screen="lock"
        className={`${styles.phoneSurface} ${styles.lockScreen}`}
      >
        <header className={styles.lockHeader}>
          <p aria-hidden="true" className={styles.lockClock}>09:41</p>
          <p className={styles.lockOwner}>Мөрдөн шалгах төхөөрөмж</p>
        </header>
        <div className={styles.lockContent}>
          <div className={styles.lockNotification}>
            <p className={styles.eyebrow}>{caseSummary.label}</p>
            <h1 ref={headingRef} tabIndex={-1} className={styles.lockTitle}>
              {caseSummary.title}
            </h1>
            <p className={styles.lockPrompt}>Мөрдөн шалгах төхөөрөмжийг нээнэ үү</p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            data-action-label
            disabled={hydrationStatus !== 'hydrated' || isUnlocking || runtimeMutationPending}
            onClick={unlockDevice}
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
          {runtimeRetries.length > 0 ? (
            <div role="group" aria-label="Амжилтгүй үйлдлүүд" className={styles.retryGroup}>
              <p role="alert">{runtimeRetries.length} үйлдлийг дахин оролдох шаардлагатай.</p>
              {runtimeRetries.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  className={styles.secondaryButton}
                  data-action-label
                  disabled={runtimeMutationPending}
                  onClick={() => runtimeRetryRegistry.invoke(entry.id)}
                >
                  Үйлдэл {index + 1}-ийг дахин оролдох
                </button>
              ))}
            </div>
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
    activeSurface === 'investigation'
      ? 'Мөрдлөг'
      : route.screen === 'home'
      ? 'Аппын нүүр'
      : route.screen === 'item'
        ? (currentApp?.label ?? 'Зүйл')
        : (currentApp?.label ?? 'Апп');

  const endingStage = caseView?.ending
    ? presentationStageForEnding(presentationCheckpoint, caseView.ending.endingId)
    : null;
  const taggedItems = phoneIndex.content.apps.flatMap((app) => app.items);
  const endingAudioItem = taggedItems.find((item) => (
    item.presentationRole === 'ending-audio' && item.audio !== undefined
  ));
  const raspberryItem = taggedItems.find((item) => item.presentationRole === 'ending-raspberry');
  const raspberryEvidence = caseView?.evidence.find(({ tags }) => tags.includes('raspberry'));
  const endingAudioEvidence = caseView?.evidence.find(({ tags }) => tags.includes('ending'));
  const aftermath: EndingAftermath | undefined = endingAudioItem?.audio || raspberryItem
    ? {
        audio: endingAudioItem?.audio ? {
          id: endingAudioItem.id,
          label: endingAudioItem.presentationLabel
            ?? endingAudioEvidence?.title
            ?? endingAudioItem.title,
          ...endingAudioItem.audio,
        } : undefined,
        raspberry: raspberryItem ? {
          title: raspberryItem.presentationLabel
            ?? raspberryEvidence?.title
            ?? raspberryItem.title,
          description: raspberryItem.body
            ?? raspberryEvidence?.description
            ?? raspberryItem.subtitle
            ?? raspberryItem.title,
        } : undefined,
      }
    : undefined;
  const presentationOpen = pendingPresentation !== null || endingStage === 'aftermath';

  const acknowledgePendingPresentation = (): void => {
    if (pendingPresentation === null) return;
    const checkpoint = acknowledgePersistedPresentation(
      presentationCheckpointRef.current,
    );
    commitPresentationCheckpoint(checkpoint);
    const next = pendingPresentationQueue(checkpoint)[0];
    setPendingPresentationState(next === undefined
      ? null
      : {
          beat: next.beat,
          key: next.key,
          records: next.records,
        });
  };

  const playbackCallbacks = {
    onPlaybackStart: () => audioDirector.setNativeAudioActive(true),
    onPlaybackStop: () => audioDirector.setNativeAudioActive(false),
  };

  return (
    <AudioPlaybackProvider callbacks={playbackCallbacks}>
    <PhoneChrome
      title={title}
      screen={route.screen}
      activeSurface={activeSurface}
      canGoBack={activeSurface === 'phone' && navigation.history.length > 0}
      canGoHome={activeSurface === 'phone' && route.screen !== 'home'}
      runtimeBusy={runtimeMutationPending}
      headingRef={headingRef}
      scrollRegionRef={scrollRegionRef}
      onBack={() => {
        prepareNavigation('restore');
        setNavigation((current) => goBack(current));
        playCue('interface');
        setStatus('Өмнөх дэлгэц рүү буцлаа.');
      }}
      onHome={() => {
        prepareNavigation('reset');
        setNavigation((current) => goHome(current));
        playCue('interface');
        setStatus('Аппын нүүр рүү шилжлээ.');
      }}
      onSurfaceChange={(surface) => {
        setActiveSurface(surface);
        playCue('interface');
        setStatus(surface === 'phone'
          ? 'Утасны ажлын талбар нээгдлээ.'
          : 'Мөрдлөгийн ажлын талбар нээгдлээ.');
      }}
      onOpenAudioSettings={() => {
        setAudioSettingsOpen(true);
        void activateAudio().then((activated) => {
          if (activated) playCue('interface');
        });
      }}
      contentInert={presentationOpen}
      overlay={pendingPresentation ? (
        <PresentationLayer
          key={pendingPresentation.key}
          beat={pendingPresentation.beat}
          records={pendingPresentation.records}
          reducedMotion={reducedMotion}
          returnFocusRef={headingRef}
          onAcknowledge={acknowledgePendingPresentation}
        />
      ) : endingStage === 'aftermath' ? (
        <PresentationLayer
          key={`ending:${caseView?.ending?.endingId ?? 'projected'}`}
          beat="ending"
          records={[]}
          reducedMotion={reducedMotion}
          endingStage={endingStage}
          aftermath={aftermath}
          returnFocusRef={headingRef}
          onAcknowledge={() => updateEndingStage('closure')}
        />
      ) : null}
    >
      {audioSettingsOpen ? (
        <AudioSettings
          preferences={audioPreferences}
          audioAvailable={audioAvailable}
          onChange={commitAudioPreferences}
          onClose={() => setAudioSettingsOpen(false)}
        />
      ) : null}
      <p
        ref={actionStatusRef}
        role="status"
        aria-live="polite"
        aria-label="Мөрдлөгийн үйлдлийн төлөв"
        tabIndex={-1}
        className={styles.statusMessage}
      >
        {hydrationStatus === 'hydrating' ? 'Хадгалсан төлөвийг ачаалж байна.' : status}
      </p>
      {presentationPersistenceLimited ? (
        <p role="status" className={styles.statusMessage}>
          Үзүүлэнгийн шат зөвхөн энэ сешнд хадгалагдана.
        </p>
      ) : null}
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
      {runtimeRetries.length > 0 ? (
        <div role="group" aria-label="Амжилтгүй үйлдлүүд" className={styles.retryGroup}>
          <p role="alert">{runtimeRetries.length} үйлдлийг дахин оролдох шаардлагатай.</p>
          {runtimeRetries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className={styles.secondaryButton}
              data-action-label
              disabled={runtimeMutationPending}
              onClick={() => runtimeRetryRegistry.invoke(entry.id)}
            >
              Үйлдэл {index + 1}-ийг дахин оролдох
            </button>
          ))}
        </div>
      ) : null}

      <div
        role="tabpanel"
        id="phone-surface-panel"
        aria-labelledby="phone-surface-tab"
        hidden={activeSurface !== 'phone'}
        inert={activeSurface !== 'phone'}
      >
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
      </div>

      <div
        role="tabpanel"
        id="investigation-surface-panel"
        aria-labelledby="investigation-surface-tab"
        hidden={activeSurface !== 'investigation'}
        inert={activeSurface !== 'investigation'}
      >
        {caseView ? (
          <InvestigationWorkspace
            view={caseView}
            actionPending={runtimeMutationPending}
            endingStage={caseView.ending
              ? endingStage ?? 'decision'
              : 'decision'}
            onEndingStageChange={updateEndingStage}
            onEvent={dispatchCaseEvent}
          />
        ) : (
          <p className={styles.emptyState}>Мөрдлөгийн төлөвийг ачаалж байна.</p>
        )}
      </div>
    </PhoneChrome>
    </AudioPlaybackProvider>
  );
}
