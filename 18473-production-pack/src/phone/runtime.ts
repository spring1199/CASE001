import type { PlayerStoreActions } from '@/game/state/store';
import type { PlayerState } from '@/game/state/types';
import type {
  DeepReadonly,
  PhoneDiscoveryEffects,
} from '@/phone/data/schema';
import {
  applyDiscoveryEffects,
  normalizeDiscoveryEffects,
  type NormalizedPhoneDiscoveryEffects,
  type PhoneDiscoveryActions,
} from '@/phone/discovery';

export type PhoneRuntimeDiscoveryActions = PhoneDiscoveryActions &
  Pick<PlayerStoreActions, 'save'>;

export type PhoneDiscoveryCommit = Readonly<{
  kind: 'already-recorded' | 'information-recorded' | 'content-unlocked';
  saveOperation: Promise<void> | null;
}>;

export type PhoneInitializationFailure = 'hydrate-failed' | 'initial-save-failed';
export type PhoneInitializationResult = Readonly<{
  kind: 'ready' | PhoneInitializationFailure;
}>;
export type PhoneInitializationActions = Pick<
  PlayerStoreActions,
  'unlockApps' | 'hydrate' | 'save'
>;

export function phoneInitializationFailureMessage(
  failure: PhoneInitializationFailure,
): string {
  return failure === 'hydrate-failed'
    ? 'Хадгалсан төлөвийг ачаалж чадсангүй. Дахин оролдоно уу.'
    : 'Анхны төлөвийг хадгалж чадсангүй. Дахин оролдоно уу.';
}

export async function initializePhonePlayer(
  initialUnlockedAppIds: readonly string[],
  actions: PhoneInitializationActions,
): Promise<PhoneInitializationResult> {
  actions.unlockApps([...initialUnlockedAppIds]);
  try {
    await actions.hydrate();
  } catch {
    return { kind: 'hydrate-failed' };
  }

  try {
    await actions.save();
  } catch {
    return { kind: 'initial-save-failed' };
  }

  return { kind: 'ready' };
}

export function selectNewPhoneDiscoveryEffects(
  effects: DeepReadonly<PhoneDiscoveryEffects>,
  playerState: PlayerState,
): NormalizedPhoneDiscoveryEffects {
  const normalized = normalizeDiscoveryEffects({
    artifactIds: effects.artifactIds ? [...effects.artifactIds] : undefined,
    evidenceIds: effects.evidenceIds ? [...effects.evidenceIds] : undefined,
    unlockAppIds: effects.unlockAppIds ? [...effects.unlockAppIds] : undefined,
    unlockContentIds: effects.unlockContentIds ? [...effects.unlockContentIds] : undefined,
  });
  const knownArtifacts = new Set(playerState.discoveredArtifactIds);
  const knownEvidence = new Set(playerState.discoveredEvidenceIds);
  const unlockedApps = new Set(playerState.unlockedAppIds);
  const unlockedContent = new Set(playerState.unlockedContentIds);

  return {
    artifactIds: normalized.artifactIds.filter((id) => !knownArtifacts.has(id)),
    evidenceIds: normalized.evidenceIds.filter((id) => !knownEvidence.has(id)),
    unlockAppIds: normalized.unlockAppIds.filter((id) => !unlockedApps.has(id)),
    unlockContentIds: normalized.unlockContentIds.filter((id) => !unlockedContent.has(id)),
  };
}

export function commitPhoneDiscovery(
  effects: DeepReadonly<PhoneDiscoveryEffects>,
  playerState: PlayerState,
  actions: PhoneRuntimeDiscoveryActions,
): PhoneDiscoveryCommit {
  const pending = selectNewPhoneDiscoveryEffects(effects, playerState);
  const hasInformation = pending.artifactIds.length > 0 || pending.evidenceIds.length > 0;
  const hasUnlocks = pending.unlockAppIds.length > 0 || pending.unlockContentIds.length > 0;

  if (!hasInformation && !hasUnlocks) {
    return { kind: 'already-recorded', saveOperation: null };
  }

  applyDiscoveryEffects(pending, actions);
  return {
    kind: hasUnlocks ? 'content-unlocked' : 'information-recorded',
    saveOperation: actions.save(),
  };
}
