import type { PlayerStoreActions } from '@/game/state/store';
import type { PhoneDiscoveryEffects } from '@/phone/data/schema';

export type NormalizedPhoneDiscoveryEffects = Readonly<{
  artifactIds: string[];
  evidenceIds: string[];
  unlockAppIds: string[];
  unlockContentIds: string[];
}>;

export type PhoneDiscoveryActions = Pick<
  PlayerStoreActions,
  'discoverArtifacts' | 'discoverEvidence' | 'unlockApps' | 'unlockContent'
>;

function stableUnique(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])];
}

export function normalizeDiscoveryEffects(
  effects: PhoneDiscoveryEffects,
): NormalizedPhoneDiscoveryEffects {
  return {
    artifactIds: stableUnique(effects.artifactIds),
    evidenceIds: stableUnique(effects.evidenceIds),
    unlockAppIds: stableUnique(effects.unlockAppIds),
    unlockContentIds: stableUnique(effects.unlockContentIds),
  };
}

export function mergeDiscoveryEffects(
  ...effects: readonly PhoneDiscoveryEffects[]
): NormalizedPhoneDiscoveryEffects {
  return normalizeDiscoveryEffects({
    artifactIds: effects.flatMap((effect) => effect.artifactIds ?? []),
    evidenceIds: effects.flatMap((effect) => effect.evidenceIds ?? []),
    unlockAppIds: effects.flatMap((effect) => effect.unlockAppIds ?? []),
    unlockContentIds: effects.flatMap((effect) => effect.unlockContentIds ?? []),
  });
}

export function applyDiscoveryEffects(
  effects: PhoneDiscoveryEffects,
  actions: PhoneDiscoveryActions,
): NormalizedPhoneDiscoveryEffects {
  const normalized = normalizeDiscoveryEffects(effects);
  if (normalized.artifactIds.length > 0) actions.discoverArtifacts(normalized.artifactIds);
  if (normalized.evidenceIds.length > 0) actions.discoverEvidence(normalized.evidenceIds);
  if (normalized.unlockAppIds.length > 0) actions.unlockApps(normalized.unlockAppIds);
  if (normalized.unlockContentIds.length > 0) actions.unlockContent(normalized.unlockContentIds);
  return normalized;
}
