import { computeGraphConfidence } from '@/game/engine/graph-confidence';
import type { ConditionContext } from '@/game/engine/conditions';
import type { CaseBundle, GraphEdge, GraphNode } from '@/game/schema/case';
import type { PlayerState } from '@/game/state/types';

export type GraphRecords = Readonly<{
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
}>;

export function splitGraphRecords(bundle: Pick<CaseBundle, 'graph'>): GraphRecords {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const record of bundle.graph) {
    if (record.recordType === 'node') nodes.push(record);
    else edges.push(record);
  }
  return { nodes, edges };
}

export type VisibleGraphNode = Readonly<{
  id: string;
  nodeType: GraphNode['nodeType'];
  label: string;
  identityRevealed: boolean;
}>;

export type GraphEdgePlayerStatus = 'confirmed' | 'severed' | 'unresolved';

export type VisibleGraphEdge = Readonly<{
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string | null;
  kind: GraphEdge['kind'];
  confidence: number;
  supportingEvidenceIds: readonly string[];
  playerStatus: GraphEdgePlayerStatus;
  playerCanConfirm: boolean;
  playerCanSever: boolean;
}>;

export type GraphView = Readonly<{
  nodes: readonly VisibleGraphNode[];
  edges: readonly VisibleGraphEdge[];
}>;

function isRecordVisible(
  hiddenUntilFacts: readonly string[] | undefined,
  context: ConditionContext,
): boolean {
  return (hiddenUntilFacts ?? []).every((factId) => context.knownFactIds.has(factId));
}

function projectNodeLabel(
  node: GraphNode,
  bundle: Pick<CaseBundle, 'characters'>,
  context: ConditionContext,
): Pick<VisibleGraphNode, 'label' | 'identityRevealed'> {
  if (
    node.identityRevealFact === undefined
    || node.canonicalCharacterId === undefined
    || !context.knownFactIds.has(node.identityRevealFact)
  ) {
    return { label: node.publicLabel, identityRevealed: false };
  }

  const canonicalCharacter = bundle.characters
    .find((character) => character.id === node.canonicalCharacterId);
  return {
    label: canonicalCharacter?.name ?? node.publicLabel,
    identityRevealed: canonicalCharacter !== undefined,
  };
}

export function projectGraphView(
  bundle: Pick<CaseBundle, 'graph' | 'characters'>,
  state: PlayerState,
  context: ConditionContext,
): GraphView {
  const { nodes, edges } = splitGraphRecords(bundle);
  const confirmedEdgeIds = new Set(state.confirmedGraphEdgeIds);
  const severedEdgeIds = new Set(state.severedGraphEdgeIds);

  const visibleNodes = nodes
    .filter((node) => isRecordVisible(node.hiddenUntilFacts, context))
    .map((node): VisibleGraphNode => Object.freeze({
      id: node.id,
      nodeType: node.nodeType,
      ...projectNodeLabel(node, bundle, context),
    }));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

  const visibleEdges = edges
    .filter((edge) => isRecordVisible(edge.hiddenUntilFacts, context)
      && visibleNodeIds.has(edge.fromNodeId)
      && visibleNodeIds.has(edge.toNodeId))
    .map((edge): VisibleGraphEdge => {
      const evaluation = computeGraphConfidence(
        edge.confidenceSources,
        context.discoveredEvidenceIds,
      );
      const playerStatus: GraphEdgePlayerStatus = confirmedEdgeIds.has(edge.id)
        ? 'confirmed'
        : severedEdgeIds.has(edge.id)
          ? 'severed'
          : 'unresolved';

      return Object.freeze({
        id: edge.id,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        label: edge.label ?? null,
        kind: edge.kind,
        confidence: evaluation.confidence,
        supportingEvidenceIds: Object.freeze(
          evaluation.appliedSources.map((source) => source.evidenceId),
        ),
        playerStatus,
        playerCanConfirm: edge.playerCanConfirm === true,
        playerCanSever: edge.playerCanSever === true,
      });
    });

  return Object.freeze({
    nodes: Object.freeze(visibleNodes),
    edges: Object.freeze(visibleEdges),
  });
}
