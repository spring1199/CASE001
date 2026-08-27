import { createConditionContext, evaluateCondition } from '@/game/engine/conditions';
import { evaluateDeduction } from '@/game/engine/deductions';
import { isEndingEligible } from '@/game/engine/endings';
import { splitGraphRecords } from '@/game/engine/graph';
import { evaluateTimelinePlacement, splitTimelineRecords } from '@/game/engine/timeline';
import { computeUnlocks } from '@/game/engine/triggers';
import type { CaseBundle } from '@/game/schema/case';
import { createInitialPlayerState } from '@/game/state/types';
import type { ObjectiveState, PlayerState } from '@/game/state/types';

export type CaseEngineEvent =
  | { type: 'discover-artifacts'; artifactIds: string[] }
  | { type: 'discover-evidence'; evidenceIds: string[] }
  | { type: 'attempt-deduction'; deductionId: string }
  | { type: 'place-timeline-event'; eventId: string; positionId: string }
  | { type: 'pin-evidence'; evidenceIds: string[] }
  | { type: 'unpin-evidence'; evidenceIds: string[] }
  | { type: 'confirm-graph-edges'; edgeIds: string[] }
  | { type: 'sever-graph-edges'; edgeIds: string[] }
  | { type: 'complete-objective'; objectiveId: string }
  | { type: 'select-ending'; endingId: string };

export type DeductionRejectionSummary = Readonly<{
  missingPrerequisiteCount: number;
  missingRequiredEvidenceCount: number;
  thresholdMatched: number;
  thresholdRequired: number;
}>;

export type EngineOutcome =
  | { type: 'artifacts-discovered'; artifactIds: readonly string[] }
  | { type: 'evidence-discovered'; evidenceIds: readonly string[] }
  | { type: 'facts-learned'; factIds: readonly string[] }
  | { type: 'deduction-completed'; deductionId: string }
  | { type: 'deduction-rejected'; deductionId: string; progress: DeductionRejectionSummary }
  | { type: 'timeline-placed'; eventId: string; positionId: string; correct: boolean }
  | {
    type: 'timeline-rejected';
    eventId: string;
    positionId: string;
    reason: 'unrecognized-event' | 'unrecognized-position' | 'not-placeable';
  }
  | { type: 'evidence-pinned'; evidenceIds: readonly string[] }
  | { type: 'evidence-unpinned'; evidenceIds: readonly string[] }
  | { type: 'edges-confirmed'; edgeIds: readonly string[] }
  | { type: 'edges-severed'; edgeIds: readonly string[] }
  | {
    type: 'edges-rejected';
    edgeIds: readonly string[];
    reason: 'unrecognized-edge' | 'hidden-edge' | 'not-permitted';
  }
  | { type: 'objective-activated'; objectiveId: string }
  | { type: 'objective-completed'; objectiveId: string }
  | {
    type: 'objective-rejected';
    objectiveId: string;
    reason: 'unrecognized-objective' | 'not-active' | 'authored-condition';
  }
  | { type: 'content-unlocked'; contentIds: readonly string[] }
  | { type: 'ending-selected'; endingId: string }
  | {
    type: 'ending-rejected';
    endingId: string;
    reason: 'unrecognized-ending' | 'not-eligible' | 'already-decided';
  }
  | { type: 'event-rejected'; reason: 'unrecognized-id'; ids: readonly string[] };

export type EngineResult = Readonly<{
  state: PlayerState;
  outcomes: readonly EngineOutcome[];
}>;

function appendUnique(existing: readonly string[], incoming: readonly string[]): {
  next: string[];
  added: string[];
} {
  const seen = new Set(existing);
  const added: string[] = [];
  for (const id of incoming) {
    if (seen.has(id)) continue;
    seen.add(id);
    added.push(id);
  }
  return { next: added.length === 0 ? [...existing] : [...existing, ...added], added };
}

function unknownIds(ids: readonly string[], known: ReadonlySet<string>): string[] {
  return [...new Set(ids.filter((id) => !known.has(id)))];
}

/**
 * Authored objective state and runtime overrides combine into the effective
 * state. Runtime entries win so hydrated progress is preserved; missing
 * entries fall back to the authored initial state.
 */
export function effectiveObjectiveState(
  bundle: Pick<CaseBundle, 'objectives'>,
  state: PlayerState,
  objectiveId: string,
): ObjectiveState | null {
  const runtime = state.objectiveStates[objectiveId];
  if (runtime !== undefined) return runtime;
  const authored = bundle.objectives.find((objective) => objective.id === objectiveId);
  if (authored === undefined) return null;
  return authored.state;
}

const SETTLE_ITERATION_SAFETY_MARGIN = 2;

/**
 * Recomputes every derived consequence of the current player state until it
 * reaches a fixed point: facts granted by discovered evidence and correct
 * timeline placements, objective activation/completion, and trigger unlocks.
 * All derivations are monotone, so the result is order-independent and
 * repeated settlement is idempotent.
 */
export function settleEngineState(
  bundle: CaseBundle,
  initialState: PlayerState,
): EngineResult {
  let state = initialState;
  const learnedFactIds: string[] = [];
  const unlockedContentIds: string[] = [];
  const activatedObjectiveIds: string[] = [];
  const completedObjectiveIds: string[] = [];
  const { events: timelineEvents } = splitTimelineRecords(bundle);

  const maxIterations = bundle.facts.length
    + bundle.objectives.length * 2
    + bundle.triggers.length
    + SETTLE_ITERATION_SAFETY_MARGIN;

  for (let iteration = 0; ; iteration += 1) {
    if (iteration >= maxIterations) {
      throw new Error(
        `Case "${bundle.manifest.id}" derived-state settlement did not converge after ${maxIterations} iterations.`,
      );
    }

    let changed = false;
    const context = createConditionContext(bundle, state);

    const grantableFactIds: string[] = [];
    for (const evidence of bundle.evidence) {
      if (!context.discoveredEvidenceIds.has(evidence.id)) continue;
      grantableFactIds.push(...(evidence.grantsFacts ?? []));
    }
    for (const placement of state.timelinePlacements) {
      const event = timelineEvents.find((candidate) => candidate.id === placement.eventId);
      if (event === undefined) continue;
      const evaluation = evaluateTimelinePlacement(event, placement.positionId, context);
      if (!evaluation.correct) continue;
      grantableFactIds.push(...(event.grantsFactsWhenPlaced ?? []));
    }
    const factAppend = appendUnique(state.knownFactIds, grantableFactIds);
    if (factAppend.added.length > 0) {
      state = { ...state, knownFactIds: factAppend.next };
      learnedFactIds.push(...factAppend.added);
      changed = true;
    }

    const settledContext = createConditionContext(bundle, state);
    let objectiveStates = state.objectiveStates;
    for (const objective of bundle.objectives) {
      const current = objectiveStates[objective.id] ?? objective.state;
      let next: ObjectiveState = current;
      if (
        current === 'locked'
        && objective.activateWhen !== undefined
        && evaluateCondition(objective.activateWhen, settledContext)
      ) {
        next = 'active';
        activatedObjectiveIds.push(objective.id);
      }
      if (
        (next === 'active')
        && objective.completeWhen !== undefined
        && evaluateCondition(objective.completeWhen, settledContext)
      ) {
        next = 'completed';
        completedObjectiveIds.push(objective.id);
      }
      if (objectiveStates[objective.id] !== next) {
        if (objectiveStates === state.objectiveStates) objectiveStates = { ...objectiveStates };
        objectiveStates[objective.id] = next;
        changed = true;
      }
    }
    if (objectiveStates !== state.objectiveStates) {
      state = { ...state, objectiveStates };
    }

    const finalContext = createConditionContext(bundle, state);
    const newUnlocks = computeUnlocks(
      bundle.triggers,
      finalContext,
      new Set(state.unlockedContentIds),
    );
    if (newUnlocks.length > 0) {
      state = {
        ...state,
        unlockedContentIds: [...state.unlockedContentIds, ...newUnlocks],
      };
      unlockedContentIds.push(...newUnlocks);
      changed = true;
    }

    if (!changed) break;
  }

  const outcomes: EngineOutcome[] = [];
  if (learnedFactIds.length > 0) {
    outcomes.push({ type: 'facts-learned', factIds: learnedFactIds });
  }
  for (const objectiveId of activatedObjectiveIds) {
    outcomes.push({ type: 'objective-activated', objectiveId });
  }
  for (const objectiveId of completedObjectiveIds) {
    outcomes.push({ type: 'objective-completed', objectiveId });
  }
  if (unlockedContentIds.length > 0) {
    outcomes.push({ type: 'content-unlocked', contentIds: unlockedContentIds });
  }

  return { state, outcomes };
}

/**
 * Seeds a brand-new engine run: empty player state with every objective's
 * authored initial state made explicit, then settled.
 */
export function createInitialCaseState(bundle: CaseBundle, now: string): PlayerState {
  const base = createInitialPlayerState(bundle.manifest.id, now);
  const objectiveStates: Record<string, ObjectiveState> = {};
  for (const objective of bundle.objectives) {
    objectiveStates[objective.id] = objective.state;
  }
  return settleEngineState(bundle, { ...base, objectiveStates }).state;
}

function reject(state: PlayerState, outcome: EngineOutcome): EngineResult {
  return { state, outcomes: [outcome] };
}

function settleAfter(
  bundle: CaseBundle,
  state: PlayerState,
  outcomes: EngineOutcome[],
): EngineResult {
  const settled = settleEngineState(bundle, state);
  return { state: settled.state, outcomes: [...outcomes, ...settled.outcomes] };
}

/**
 * Processes one player-facing investigation event deterministically. Events
 * referencing unknown authored IDs are rejected without partial application;
 * repeated events are idempotent.
 */
export function processEngineEvent(
  bundle: CaseBundle,
  state: PlayerState,
  event: CaseEngineEvent,
): EngineResult {
  switch (event.type) {
    case 'discover-artifacts': {
      // Artifact records live in a deferred collection, so IDs cannot be
      // validated against authored artifacts yet (ADR 0001).
      const { next, added } = appendUnique(state.discoveredArtifactIds, event.artifactIds);
      if (added.length === 0) return { state, outcomes: [] };
      return settleAfter(
        bundle,
        { ...state, discoveredArtifactIds: next },
        [{ type: 'artifacts-discovered', artifactIds: added }],
      );
    }

    case 'discover-evidence': {
      // Hidden evidence is reported together with nonexistent IDs so a
      // rejection can never become an oracle for gated records.
      const knownFactIds = new Set(state.knownFactIds);
      const discoverableEvidenceIds = new Set(
        bundle.evidence.flatMap((evidence) => (
          (evidence.hiddenUntilFacts ?? []).every((factId) => knownFactIds.has(factId))
            ? [evidence.id]
            : []
        )),
      );
      const unknown = unknownIds(event.evidenceIds, discoverableEvidenceIds);
      if (unknown.length > 0) {
        return reject(state, { type: 'event-rejected', reason: 'unrecognized-id', ids: unknown });
      }
      const { next, added } = appendUnique(state.discoveredEvidenceIds, event.evidenceIds);
      if (added.length === 0) return { state, outcomes: [] };
      return settleAfter(
        bundle,
        { ...state, discoveredEvidenceIds: next },
        [{ type: 'evidence-discovered', evidenceIds: added }],
      );
    }

    case 'attempt-deduction': {
      const deduction = bundle.deductions.find(({ id }) => id === event.deductionId);
      if (deduction === undefined) {
        return reject(state, {
          type: 'event-rejected',
          reason: 'unrecognized-id',
          ids: [event.deductionId],
        });
      }
      if (state.completedDeductionIds.includes(deduction.id)) {
        return { state, outcomes: [] };
      }
      const evaluation = evaluateDeduction(deduction, {
        evidenceIds: new Set(state.discoveredEvidenceIds),
        factIds: new Set(state.knownFactIds),
      });
      if (!evaluation.complete) {
        return reject(state, {
          type: 'deduction-rejected',
          deductionId: deduction.id,
          progress: {
            missingPrerequisiteCount: evaluation.missingPrerequisiteFactIds.length,
            missingRequiredEvidenceCount: evaluation.missingRequiredEvidenceIds.length,
            thresholdMatched: evaluation.threshold.matched,
            thresholdRequired: evaluation.threshold.required,
          },
        });
      }
      const facts = appendUnique(state.knownFactIds, deduction.grantsFacts);
      const outcomes: EngineOutcome[] = [
        { type: 'deduction-completed', deductionId: deduction.id },
      ];
      if (facts.added.length > 0) {
        outcomes.push({ type: 'facts-learned', factIds: facts.added });
      }
      let next: PlayerState = {
        ...state,
        completedDeductionIds: [...state.completedDeductionIds, deduction.id],
        knownFactIds: facts.next,
      };
      if (deduction.unlocks !== undefined && deduction.unlocks.length > 0) {
        const unlocks = appendUnique(next.unlockedContentIds, deduction.unlocks);
        if (unlocks.added.length > 0) {
          next = { ...next, unlockedContentIds: unlocks.next };
          outcomes.push({ type: 'content-unlocked', contentIds: unlocks.added });
        }
      }
      return settleAfter(bundle, next, outcomes);
    }

    case 'place-timeline-event': {
      const { positions, events } = splitTimelineRecords(bundle);
      const timelineEvent = events.find(({ id }) => id === event.eventId);
      if (timelineEvent === undefined) {
        return reject(state, {
          type: 'timeline-rejected',
          eventId: event.eventId,
          positionId: event.positionId,
          reason: 'unrecognized-event',
        });
      }
      if (!positions.some(({ id }) => id === event.positionId)) {
        return reject(state, {
          type: 'timeline-rejected',
          eventId: event.eventId,
          positionId: event.positionId,
          reason: 'unrecognized-position',
        });
      }
      const context = createConditionContext(bundle, state);
      const evaluation = evaluateTimelinePlacement(timelineEvent, event.positionId, context);
      if (!evaluation.placeable) {
        return reject(state, {
          type: 'timeline-rejected',
          eventId: event.eventId,
          positionId: event.positionId,
          reason: 'not-placeable',
        });
      }
      const existingIndex = state.timelinePlacements
        .findIndex((placement) => placement.eventId === event.eventId);
      const alreadyPlaced = existingIndex !== -1
        && state.timelinePlacements[existingIndex]?.positionId === event.positionId;
      if (alreadyPlaced) return { state, outcomes: [] };
      const timelinePlacements = existingIndex === -1
        ? [...state.timelinePlacements, { eventId: event.eventId, positionId: event.positionId }]
        : state.timelinePlacements.map((placement, index) => (
          index === existingIndex
            ? { eventId: event.eventId, positionId: event.positionId }
            : placement
        ));
      return settleAfter(
        bundle,
        { ...state, timelinePlacements },
        [{
          type: 'timeline-placed',
          eventId: event.eventId,
          positionId: event.positionId,
          correct: evaluation.correct,
        }],
      );
    }

    case 'pin-evidence': {
      const discovered = new Set(state.discoveredEvidenceIds);
      const unknown = unknownIds(event.evidenceIds, discovered);
      if (unknown.length > 0) {
        return reject(state, { type: 'event-rejected', reason: 'unrecognized-id', ids: unknown });
      }
      const { next, added } = appendUnique(state.pinnedEvidenceIds, event.evidenceIds);
      if (added.length === 0) return { state, outcomes: [] };
      return {
        state: { ...state, pinnedEvidenceIds: next },
        outcomes: [{ type: 'evidence-pinned', evidenceIds: added }],
      };
    }

    case 'unpin-evidence': {
      const removing = new Set(event.evidenceIds);
      const remaining = state.pinnedEvidenceIds.filter((id) => !removing.has(id));
      if (remaining.length === state.pinnedEvidenceIds.length) {
        return { state, outcomes: [] };
      }
      const removed = state.pinnedEvidenceIds.filter((id) => removing.has(id));
      return {
        state: { ...state, pinnedEvidenceIds: remaining },
        outcomes: [{ type: 'evidence-unpinned', evidenceIds: removed }],
      };
    }

    case 'confirm-graph-edges':
    case 'sever-graph-edges': {
      const confirming = event.type === 'confirm-graph-edges';
      const { edges } = splitGraphRecords(bundle);
      const edgesById = new Map(edges.map((edge) => [edge.id, edge]));
      const unknown = unknownIds(event.edgeIds, new Set(edgesById.keys()));
      if (unknown.length > 0) {
        return reject(state, {
          type: 'edges-rejected',
          edgeIds: unknown,
          reason: 'unrecognized-edge',
        });
      }
      const context = createConditionContext(bundle, state);
      const hidden = [...new Set(event.edgeIds)].filter((edgeId) => {
        const edge = edgesById.get(edgeId);
        return edge !== undefined
          && !(edge.hiddenUntilFacts ?? []).every((factId) => context.knownFactIds.has(factId));
      });
      if (hidden.length > 0) {
        return reject(state, {
          type: 'edges-rejected',
          edgeIds: hidden,
          reason: 'hidden-edge',
        });
      }
      const notPermitted = [...new Set(event.edgeIds)].filter((edgeId) => {
        const edge = edgesById.get(edgeId);
        if (edge === undefined) return true;
        return confirming ? edge.playerCanConfirm !== true : edge.playerCanSever !== true;
      });
      if (notPermitted.length > 0) {
        return reject(state, {
          type: 'edges-rejected',
          edgeIds: notPermitted,
          reason: 'not-permitted',
        });
      }
      const targetKey = confirming ? 'confirmedGraphEdgeIds' : 'severedGraphEdgeIds';
      const oppositeKey = confirming ? 'severedGraphEdgeIds' : 'confirmedGraphEdgeIds';
      const moving = new Set(event.edgeIds);
      const target = appendUnique(state[targetKey], event.edgeIds);
      const opposite = state[oppositeKey].filter((id) => !moving.has(id));
      if (target.added.length === 0 && opposite.length === state[oppositeKey].length) {
        return { state, outcomes: [] };
      }
      return settleAfter(
        bundle,
        { ...state, [targetKey]: target.next, [oppositeKey]: opposite },
        [confirming
          ? { type: 'edges-confirmed', edgeIds: target.added }
          : { type: 'edges-severed', edgeIds: target.added }],
      );
    }

    case 'complete-objective': {
      const objective = bundle.objectives.find(({ id }) => id === event.objectiveId);
      if (objective === undefined) {
        return reject(state, {
          type: 'objective-rejected',
          objectiveId: event.objectiveId,
          reason: 'unrecognized-objective',
        });
      }
      if (objective.completeWhen !== undefined) {
        return reject(state, {
          type: 'objective-rejected',
          objectiveId: objective.id,
          reason: 'authored-condition',
        });
      }
      const current = effectiveObjectiveState(bundle, state, objective.id);
      if (current === 'completed') return { state, outcomes: [] };
      if (current !== 'active') {
        return reject(state, {
          type: 'objective-rejected',
          objectiveId: objective.id,
          reason: 'not-active',
        });
      }
      return settleAfter(
        bundle,
        {
          ...state,
          objectiveStates: { ...state.objectiveStates, [objective.id]: 'completed' },
        },
        [{ type: 'objective-completed', objectiveId: objective.id }],
      );
    }

    case 'select-ending': {
      const ending = bundle.endings.find(({ id }) => id === event.endingId);
      if (ending === undefined) {
        return reject(state, {
          type: 'ending-rejected',
          endingId: event.endingId,
          reason: 'unrecognized-ending',
        });
      }
      if (state.endingId !== null) {
        if (state.endingId === ending.id) return { state, outcomes: [] };
        return reject(state, {
          type: 'ending-rejected',
          endingId: ending.id,
          reason: 'already-decided',
        });
      }
      const context = createConditionContext(bundle, state);
      if (!isEndingEligible(bundle, ending, context)) {
        return reject(state, {
          type: 'ending-rejected',
          endingId: ending.id,
          reason: 'not-eligible',
        });
      }
      const outcomes: EngineOutcome[] = [{ type: 'ending-selected', endingId: ending.id }];
      let next: PlayerState = {
        ...state,
        endingBranchId: ending.id,
        endingId: ending.id,
      };
      const confirmIds = ending.onSelect?.confirmGraphEdgeIds ?? [];
      const severIds = ending.onSelect?.severGraphEdgeIds ?? [];
      if (confirmIds.length > 0) {
        const confirmed = appendUnique(next.confirmedGraphEdgeIds, confirmIds);
        const severSet = new Set(confirmIds);
        next = {
          ...next,
          confirmedGraphEdgeIds: confirmed.next,
          severedGraphEdgeIds: next.severedGraphEdgeIds.filter((id) => !severSet.has(id)),
        };
        if (confirmed.added.length > 0) {
          outcomes.push({ type: 'edges-confirmed', edgeIds: confirmed.added });
        }
      }
      if (severIds.length > 0) {
        const severed = appendUnique(next.severedGraphEdgeIds, severIds);
        const confirmSet = new Set(severIds);
        next = {
          ...next,
          severedGraphEdgeIds: severed.next,
          confirmedGraphEdgeIds: next.confirmedGraphEdgeIds.filter((id) => !confirmSet.has(id)),
        };
        if (severed.added.length > 0) {
          outcomes.push({ type: 'edges-severed', edgeIds: severed.added });
        }
      }
      return settleAfter(bundle, next, outcomes);
    }
  }
}
