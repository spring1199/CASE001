import type { StoreApi } from 'zustand/vanilla';

import {
  processEngineEvent,
  settleEngineState,
  type CaseEngineEvent,
  type EngineOutcome,
} from '@/game/engine/engine';
import { projectCaseView, type CaseView } from '@/game/engine/view';
import type { CaseBundle } from '@/game/schema/case';
import type { PlayerStoreState } from '@/game/state/store';
import type { PlayerState } from '@/game/state/types';

export type CaseRuntimeDispatchResult = Readonly<{
  outcomes: readonly EngineOutcome[];
  changed: boolean;
  saveOperation: Promise<void> | null;
}>;

export type CaseRuntime = Readonly<{
  dispatch(event: CaseEngineEvent): CaseRuntimeDispatchResult;
  settle(): CaseRuntimeDispatchResult;
  view(): CaseView;
}>;

function addedIds(previous: readonly string[], next: readonly string[]): string[] {
  const seen = new Set(previous);
  return next.filter((id) => !seen.has(id));
}

function removedIds(previous: readonly string[], next: readonly string[]): string[] {
  const kept = new Set(next);
  return previous.filter((id) => !kept.has(id));
}

/**
 * Replays the difference between two engine-computed states through the
 * store's own actions so persistence, timestamps, and dirty tracking keep
 * their Phase 01/02 semantics.
 */
export function applyEngineTransition(
  store: StoreApi<PlayerStoreState>,
  previous: PlayerState,
  next: PlayerState,
): void {
  const { actions } = store.getState();

  const artifacts = addedIds(previous.discoveredArtifactIds, next.discoveredArtifactIds);
  if (artifacts.length > 0) actions.discoverArtifacts(artifacts);

  const evidence = addedIds(previous.discoveredEvidenceIds, next.discoveredEvidenceIds);
  if (evidence.length > 0) actions.discoverEvidence(evidence);

  const pinned = addedIds(previous.pinnedEvidenceIds, next.pinnedEvidenceIds);
  if (pinned.length > 0) actions.pinEvidence(pinned);
  const unpinned = removedIds(previous.pinnedEvidenceIds, next.pinnedEvidenceIds);
  if (unpinned.length > 0) actions.unpinEvidence(unpinned);

  const content = addedIds(previous.unlockedContentIds, next.unlockedContentIds);
  if (content.length > 0) actions.unlockContent(content);

  const apps = addedIds(previous.unlockedAppIds, next.unlockedAppIds);
  if (apps.length > 0) actions.unlockApps(apps);

  const deductions = addedIds(previous.completedDeductionIds, next.completedDeductionIds);
  if (deductions.length > 0) actions.completeDeductions(deductions);

  const facts = addedIds(previous.knownFactIds, next.knownFactIds);
  if (facts.length > 0) actions.learnFacts(facts);

  for (const [objectiveId, objectiveState] of Object.entries(next.objectiveStates)) {
    if (previous.objectiveStates[objectiveId] !== objectiveState) {
      actions.setObjectiveState(objectiveId, objectiveState);
    }
  }

  const previousPlacements = new Map(
    previous.timelinePlacements.map((placement) => [placement.eventId, placement.positionId]),
  );
  for (const placement of next.timelinePlacements) {
    if (previousPlacements.get(placement.eventId) !== placement.positionId) {
      actions.placeTimelineEvent(placement.eventId, placement.positionId);
    }
  }

  const confirmedEdges = addedIds(previous.confirmedGraphEdgeIds, next.confirmedGraphEdgeIds);
  if (confirmedEdges.length > 0) actions.confirmGraphEdges(confirmedEdges);
  const severedEdges = addedIds(previous.severedGraphEdgeIds, next.severedGraphEdgeIds);
  if (severedEdges.length > 0) actions.severGraphEdges(severedEdges);

  if (
    previous.endingBranchId !== next.endingBranchId
    || previous.endingId !== next.endingId
  ) {
    actions.setEnding(next.endingBranchId, next.endingId);
  }

  for (const [flagId, value] of Object.entries(next.flags)) {
    if (previous.flags[flagId] !== value) actions.setFlag(flagId, value);
  }
}

export function createCaseRuntime(
  bundle: CaseBundle,
  store: StoreApi<PlayerStoreState>,
): CaseRuntime {
  const commit = (
    previous: PlayerState,
    next: PlayerState,
    outcomes: readonly EngineOutcome[],
  ): CaseRuntimeDispatchResult => {
    if (next === previous) {
      return { outcomes, changed: false, saveOperation: null };
    }
    applyEngineTransition(store, previous, next);
    return {
      outcomes,
      changed: true,
      saveOperation: store.getState().actions.save(),
    };
  };

  return Object.freeze({
    dispatch(event: CaseEngineEvent): CaseRuntimeDispatchResult {
      const previous = store.getState().playerState;
      const result = processEngineEvent(bundle, previous, event);
      return commit(previous, result.state, result.outcomes);
    },
    settle(): CaseRuntimeDispatchResult {
      const previous = store.getState().playerState;
      const result = settleEngineState(bundle, previous);
      return commit(previous, result.state, result.outcomes);
    },
    view(): CaseView {
      return projectCaseView(bundle, store.getState().playerState);
    },
  });
}
