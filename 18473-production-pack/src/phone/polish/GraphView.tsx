import { useId } from 'react';

import type { GraphView as ProjectedGraphView } from '@/game/engine/graph';
import type { PlayerCaseEngineEvent } from '@/game/schema/case-view';
import styles from '@/phone/phone.module.css';

type GraphViewProps = Readonly<{
  graph: ProjectedGraphView;
  actionPending: boolean;
  onEvent(event: PlayerCaseEngineEvent): void | Promise<void>;
}>;

const graphStatusLabels = {
  confirmed: 'Баталгаажуулсан',
  severed: 'Тасалсан',
  unresolved: 'Шийдээгүй',
} as const;

export function GraphView({ graph, actionPending, onEvent }: GraphViewProps) {
  const headingId = useId();
  const nodeLabels = new Map(graph.nodes.map((node) => [node.id, node.label]));

  return (
    <section aria-labelledby={headingId} className={styles.workbenchSection}>
      <h2 id={headingId} className={styles.sectionHeading}>GRAPH</h2>
      {graph.nodes.length === 0 ? (
        <p className={styles.emptyState}>Одоогоор харагдах зангилаа алга.</p>
      ) : (
        <ul className={styles.itemList} data-list-style="grouped" aria-label="GRAPH зангилаанууд">
          {graph.nodes.map((node) => (
            <li key={node.id} className={styles.objectiveRow}>
              <span className={styles.recordTitle}>{node.label}</span>
              <span className={styles.stateTag}>
                {node.identityRevealed ? 'Танигдсан' : 'Тодорхойгүй'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {graph.edges.length > 0 ? (
        <ul className={styles.itemList} data-list-style="grouped" aria-label="GRAPH холбоосууд">
          {graph.edges.map((edge) => {
            const edgeLabel = edge.label
              ?? `${nodeLabels.get(edge.fromNodeId) ?? 'Тодорхойгүй'} → ${nodeLabels.get(edge.toNodeId) ?? 'Тодорхойгүй'}`;

            return (
              <li
                key={edge.id}
                className={styles.graphEdgeRow}
                data-graph-confidence={edge.confidence}
                data-graph-status={edge.playerStatus}
              >
                <h3 className={styles.graphEdgePath}>
                  <span>{nodeLabels.get(edge.fromNodeId) ?? 'Тодорхойгүй'}</span>
                  <span aria-hidden="true">→</span>
                  <span>{nodeLabels.get(edge.toNodeId) ?? 'Тодорхойгүй'}</span>
                </h3>
                {edge.label ? <p className={styles.recordBody}>{edge.label}</p> : null}
                <span aria-hidden="true" className={styles.progressMeter}>
                  <span
                    className={styles.progressMeterFill}
                    style={{ inlineSize: `${edge.confidence}%` }}
                  />
                </span>
                <div className={styles.graphEdgeMeta}>
                  <span className={styles.confidenceValue}>{edge.confidence}% итгэлцэл</span>
                  <span className={styles.recordBody}>{edge.supportingEvidenceIds.length} баримтын эх үүсвэр</span>
                  <span className={styles.graphStatus}>{graphStatusLabels[edge.playerStatus]}</span>
                </div>
                {edge.playerStatus === 'unresolved' ? (
                  <div className={styles.recordActions}>
                    {edge.playerCanConfirm ? (
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        data-action-label
                        disabled={actionPending}
                        aria-label={`Холбоог батлах: ${edgeLabel}`}
                        onClick={() => void onEvent({
                          type: 'confirm-graph-edges',
                          edgeIds: [edge.id],
                        })}
                      >
                        Холбоог батлах
                      </button>
                    ) : null}
                    {edge.playerCanSever ? (
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        data-action-label
                        disabled={actionPending}
                        aria-label={`Холбоог таслах: ${edgeLabel}`}
                        onClick={() => void onEvent({
                          type: 'sever-graph-edges',
                          edgeIds: [edge.id],
                        })}
                      >
                        Холбоог таслах
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
