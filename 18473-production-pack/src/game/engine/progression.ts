import type { CaseBundle, Condition } from '@/game/schema/case';

/**
 * Static fair-play analysis of an authored case. It computes, from the
 * initial state, everything a completionist player could ever reach, assuming:
 * - every evidence record whose visibility gate is satisfied is discoverable
 *   (artifact delivery lives in deferred collections, ADR 0001);
 * - `artifactViewed` conditions are satisfiable for the same reason;
 * - graph-confidence thresholds use the best achievable confidence from
 *   discoverable positive-weight sources;
 * - endings must become eligible before any ending is selected, so no
 *   required content may hide behind the final TRACE/SEVER choice.
 */

export type ProgressionIssueKind =
  | 'unreachable-fact'
  | 'undiscoverable-evidence'
  | 'uncompletable-deduction'
  | 'unopenable-lock'
  | 'unactivatable-objective'
  | 'uncompletable-objective'
  | 'unfirable-trigger'
  | 'unplaceable-timeline-event'
  | 'ineligible-ending'
  | 'dependency-cycle';

export type ProgressionIssue = Readonly<{
  kind: ProgressionIssueKind;
  recordIds: readonly string[];
  message: string;
}>;

export type ProgressionAnalysis = Readonly<{
  reachableFactIds: ReadonlySet<string>;
  discoverableEvidenceIds: ReadonlySet<string>;
  completableDeductionIds: ReadonlySet<string>;
  openableLockIds: ReadonlySet<string>;
  eligibleEndingIds: ReadonlySet<string>;
  issues: readonly ProgressionIssue[];
}>;

type Reachable = {
  factIds: Set<string>;
  evidenceIds: Set<string>;
  deductionIds: Set<string>;
  activatableObjectiveIds: Set<string>;
  completableObjectiveIds: Set<string>;
  placeableTimelineEventIds: Set<string>;
  openableLockIds: Set<string>;
  eligibleEndingIds: Set<string>;
};

function collectEndingSelections(condition: Condition, into: Set<string>): void {
  if ('endingSelected' in condition) {
    into.add(condition.endingSelected);
    return;
  }
  if ('allOf' in condition) {
    condition.allOf.forEach((child) => collectEndingSelections(child, into));
    return;
  }
  if ('anyOf' in condition) {
    condition.anyOf.forEach((child) => collectEndingSelections(child, into));
  }
}

function maxAchievableEdgeConfidence(
  bundle: CaseBundle,
  edgeId: string,
  discoverableEvidenceIds: ReadonlySet<string>,
): number {
  for (const record of bundle.graph) {
    if (record.recordType !== 'edge' || record.id !== edgeId) continue;
    const total = record.confidenceSources.reduce((sum, source) => (
      source.weight > 0 && discoverableEvidenceIds.has(source.evidenceId)
        ? sum + source.weight
        : sum
    ), 0);
    return Math.min(100, Math.max(0, total));
  }
  return 0;
}

function conditionSatisfiable(
  bundle: CaseBundle,
  condition: Condition,
  reachable: Reachable,
  selectableEndingIds: ReadonlySet<string> | null,
): boolean {
  if ('fact' in condition) return reachable.factIds.has(condition.fact);
  if ('allFacts' in condition) {
    return condition.allFacts.every((factId) => reachable.factIds.has(factId));
  }
  if ('evidence' in condition) return reachable.evidenceIds.has(condition.evidence);
  if ('allEvidence' in condition) {
    return condition.allEvidence.every((evidenceId) => reachable.evidenceIds.has(evidenceId));
  }
  if ('evidenceThreshold' in condition) {
    const matched = condition.evidenceThreshold.anyOf
      .filter((evidenceId) => reachable.evidenceIds.has(evidenceId));
    return matched.length >= condition.evidenceThreshold.minimum;
  }
  if ('deductionCompleted' in condition) {
    return reachable.deductionIds.has(condition.deductionCompleted);
  }
  if ('objectiveCompleted' in condition) {
    return reachable.completableObjectiveIds.has(condition.objectiveCompleted);
  }
  if ('artifactViewed' in condition) return true;
  if ('edgeConfidenceAtLeast' in condition) {
    return maxAchievableEdgeConfidence(
      bundle,
      condition.edgeConfidenceAtLeast.edgeId,
      reachable.evidenceIds,
    ) >= condition.edgeConfidenceAtLeast.minimum;
  }
  if ('endingSelected' in condition) {
    return selectableEndingIds !== null
      && selectableEndingIds.has(condition.endingSelected);
  }
  if ('allOf' in condition) {
    const endingSelections = new Set<string>();
    collectEndingSelections(condition, endingSelections);
    if (endingSelections.size > 1) return false;
    return condition.allOf.every((child) =>
      conditionSatisfiable(bundle, child, reachable, selectableEndingIds));
  }
  return condition.anyOf.some((child) =>
    conditionSatisfiable(bundle, child, reachable, selectableEndingIds));
}

function lockOpenable(
  bundle: CaseBundle,
  lockId: string,
  reachable: Reachable,
  selectableEndingIds: ReadonlySet<string> | null,
): boolean {
  const lock = bundle.locks.find(({ id }) => id === lockId);
  if (lock === undefined) return false;
  return conditionSatisfiable(bundle, lock.unlockWhen, reachable, selectableEndingIds)
    && (lock.requiredEvidence ?? []).every((evidenceId) =>
      reachable.evidenceIds.has(evidenceId));
}

function computeReachable(
  bundle: CaseBundle,
  selectableEndingIds: ReadonlySet<string> | null,
): Reachable {
  const reachable: Reachable = {
    factIds: new Set(),
    evidenceIds: new Set(),
    deductionIds: new Set(),
    activatableObjectiveIds: new Set(
      bundle.objectives.flatMap((objective) => (
        objective.state === 'active' ? [objective.id] : []
      )),
    ),
    completableObjectiveIds: new Set(),
    placeableTimelineEventIds: new Set(),
    openableLockIds: new Set(),
    eligibleEndingIds: new Set(),
  };

  for (let changed = true; changed;) {
    changed = false;
    const add = (target: Set<string>, id: string): void => {
      if (target.has(id)) return;
      target.add(id);
      changed = true;
    };

    for (const evidence of bundle.evidence) {
      if (reachable.evidenceIds.has(evidence.id)) {
        (evidence.grantsFacts ?? []).forEach((factId) => add(reachable.factIds, factId));
        continue;
      }
      const visible = (evidence.hiddenUntilFacts ?? [])
        .every((factId) => reachable.factIds.has(factId));
      if (!visible) continue;
      add(reachable.evidenceIds, evidence.id);
      (evidence.grantsFacts ?? []).forEach((factId) => add(reachable.factIds, factId));
    }

    for (const record of bundle.timeline) {
      if (record.recordType !== 'event') continue;
      if (!reachable.placeableTimelineEventIds.has(record.id)) {
        const visible = (record.hiddenUntilFacts ?? [])
          .every((factId) => reachable.factIds.has(factId));
        const evidenceReady = (record.requiredEvidenceIds ?? [])
          .every((evidenceId) => reachable.evidenceIds.has(evidenceId));
        if (!visible || !evidenceReady) continue;
        add(reachable.placeableTimelineEventIds, record.id);
      }
      (record.grantsFactsWhenPlaced ?? []).forEach((factId) => add(reachable.factIds, factId));
    }

    for (const deduction of bundle.deductions) {
      if (!reachable.deductionIds.has(deduction.id)) {
        const prerequisitesMet = (deduction.prerequisiteFacts ?? [])
          .every((factId) => reachable.factIds.has(factId));
        const requiredMet = (deduction.requiredAll ?? [])
          .every((evidenceId) => reachable.evidenceIds.has(evidenceId));
        const groups = deduction.requiredAnyGroups ?? [];
        const candidates = [...new Set(groups.flat())];
        const required = groups.length === 0
          ? 0
          : (deduction.minimumFromAnyGroup ?? groups.length);
        const matched = candidates
          .filter((evidenceId) => reachable.evidenceIds.has(evidenceId))
          .length;
        if (!prerequisitesMet || !requiredMet || matched < required) continue;
        add(reachable.deductionIds, deduction.id);
      }
      deduction.grantsFacts.forEach((factId) => add(reachable.factIds, factId));
    }

    for (const objective of bundle.objectives) {
      const activatable = objective.state === 'active'
        || (objective.activateWhen !== undefined
          && conditionSatisfiable(bundle, objective.activateWhen, reachable, selectableEndingIds));
      if (activatable) add(reachable.activatableObjectiveIds, objective.id);
      const completable = reachable.activatableObjectiveIds.has(objective.id)
        && (objective.completeWhen === undefined
          || conditionSatisfiable(bundle, objective.completeWhen, reachable, selectableEndingIds));
      if (completable) add(reachable.completableObjectiveIds, objective.id);
    }

    for (const lock of bundle.locks) {
      if (lockOpenable(bundle, lock.id, reachable, selectableEndingIds)) {
        add(reachable.openableLockIds, lock.id);
      }
    }

    for (const ending of bundle.endings) {
      if (ending.gateLockId === undefined) continue;
      if (reachable.openableLockIds.has(ending.gateLockId)) {
        add(reachable.eligibleEndingIds, ending.id);
      }
    }
  }

  return reachable;
}

type CycleNode = Readonly<{ id: string; dependencyIds: readonly string[] }>;

function findDependencyCycles(nodes: readonly CycleNode[]): string[][] {
  const dependencyIdsByNode = new Map(nodes.map((node) => [node.id, node.dependencyIds]));
  const cycles: string[][] = [];
  const reported = new Set<string>();

  for (const node of nodes) {
    if (reported.has(node.id)) continue;
    const stack: string[] = [];
    const onStack = new Set<string>();
    const visited = new Set<string>();

    const visit = (id: string): string[] | null => {
      if (onStack.has(id)) {
        return stack.slice(stack.indexOf(id));
      }
      if (visited.has(id)) return null;
      visited.add(id);
      stack.push(id);
      onStack.add(id);
      for (const dependencyId of dependencyIdsByNode.get(id) ?? []) {
        if (!dependencyIdsByNode.has(dependencyId)) continue;
        const cycle = visit(dependencyId);
        if (cycle !== null) return cycle;
      }
      stack.pop();
      onStack.delete(id);
      return null;
    };

    const cycle = visit(node.id);
    if (cycle !== null && !cycle.some((memberId) => reported.has(memberId))) {
      cycle.forEach((memberId) => reported.add(memberId));
      cycles.push(cycle);
    }
  }

  return cycles;
}

function unreachableDependencyCycles(
  bundle: CaseBundle,
  reachable: Reachable,
): string[][] {
  const factGrantors = new Map<string, string[]>();
  const registerGrantor = (factId: string, recordId: string): void => {
    const grantors = factGrantors.get(factId);
    if (grantors === undefined) factGrantors.set(factId, [recordId]);
    else grantors.push(recordId);
  };
  for (const evidence of bundle.evidence) {
    (evidence.grantsFacts ?? []).forEach((factId) => registerGrantor(factId, evidence.id));
  }
  for (const deduction of bundle.deductions) {
    deduction.grantsFacts.forEach((factId) => registerGrantor(factId, deduction.id));
  }
  for (const record of bundle.timeline) {
    if (record.recordType !== 'event') continue;
    (record.grantsFactsWhenPlaced ?? []).forEach((factId) => registerGrantor(factId, record.id));
  }

  const nodes: CycleNode[] = [];
  for (const fact of bundle.facts) {
    if (reachable.factIds.has(fact.id)) continue;
    nodes.push({ id: fact.id, dependencyIds: factGrantors.get(fact.id) ?? [] });
  }
  for (const evidence of bundle.evidence) {
    if (reachable.evidenceIds.has(evidence.id)) continue;
    nodes.push({ id: evidence.id, dependencyIds: evidence.hiddenUntilFacts ?? [] });
  }
  for (const deduction of bundle.deductions) {
    if (reachable.deductionIds.has(deduction.id)) continue;
    nodes.push({
      id: deduction.id,
      dependencyIds: [
        ...(deduction.prerequisiteFacts ?? []),
        ...(deduction.requiredAll ?? []),
        ...(deduction.requiredAnyGroups ?? []).flat(),
      ],
    });
  }
  for (const record of bundle.timeline) {
    if (record.recordType !== 'event' || reachable.placeableTimelineEventIds.has(record.id)) {
      continue;
    }
    nodes.push({
      id: record.id,
      dependencyIds: [
        ...(record.hiddenUntilFacts ?? []),
        ...(record.requiredEvidenceIds ?? []),
      ],
    });
  }

  return findDependencyCycles(nodes);
}

export function analyzeCaseProgression(bundle: CaseBundle): ProgressionAnalysis {
  const preChoice = computeReachable(bundle, null);
  const withEndings = computeReachable(bundle, preChoice.eligibleEndingIds);

  const issues: ProgressionIssue[] = [];
  const report = (kind: ProgressionIssueKind, recordId: string, detail: string): void => {
    issues.push({
      kind,
      recordIds: [recordId],
      message: `${kind}: "${recordId}" ${detail}`,
    });
  };

  for (const fact of bundle.facts) {
    if (!withEndings.factIds.has(fact.id)) {
      report('unreachable-fact', fact.id, 'can never be granted by any reachable source');
    }
  }
  for (const evidence of bundle.evidence) {
    if (!withEndings.evidenceIds.has(evidence.id)) {
      report('undiscoverable-evidence', evidence.id, 'can never become visible for discovery');
    }
  }
  for (const deduction of bundle.deductions) {
    if (!withEndings.deductionIds.has(deduction.id)) {
      report('uncompletable-deduction', deduction.id, 'can never satisfy its requirements');
    }
  }
  for (const lock of bundle.locks) {
    if (!withEndings.openableLockIds.has(lock.id)) {
      report('unopenable-lock', lock.id, 'has no discoverable key path');
    }
  }
  for (const objective of bundle.objectives) {
    if (!withEndings.activatableObjectiveIds.has(objective.id)) {
      report('unactivatable-objective', objective.id, 'can never activate');
    } else if (!withEndings.completableObjectiveIds.has(objective.id)) {
      report('uncompletable-objective', objective.id, 'can never complete');
    }
  }
  for (const trigger of bundle.triggers) {
    if (!conditionSatisfiable(bundle, trigger.when, withEndings, preChoice.eligibleEndingIds)) {
      report('unfirable-trigger', trigger.id, 'can never fire');
    }
  }
  for (const record of bundle.timeline) {
    if (record.recordType !== 'event') continue;
    if (!withEndings.placeableTimelineEventIds.has(record.id)) {
      report('unplaceable-timeline-event', record.id, 'can never be placed');
    }
  }
  for (const ending of bundle.endings) {
    if (!preChoice.eligibleEndingIds.has(ending.id)) {
      report(
        'ineligible-ending',
        ending.id,
        ending.gateLockId === undefined
          ? 'declares no gate lock, so the final choice can never unlock'
          : 'can never become eligible before an ending is selected',
      );
    }
  }

  for (const cycle of unreachableDependencyCycles(bundle, withEndings)) {
    issues.push({
      kind: 'dependency-cycle',
      recordIds: cycle,
      message: `dependency-cycle: ${cycle.map((id) => `"${id}"`).join(' -> ')} depend on each other and can never unlock`,
    });
  }

  return {
    reachableFactIds: withEndings.factIds,
    discoverableEvidenceIds: withEndings.evidenceIds,
    completableDeductionIds: withEndings.deductionIds,
    openableLockIds: withEndings.openableLockIds,
    eligibleEndingIds: preChoice.eligibleEndingIds,
    issues,
  };
}
