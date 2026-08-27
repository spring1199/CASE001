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
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.appHeading}>GRAPH</h2>
      {graph.nodes.length === 0 ? (
        <p className={styles.emptyState}>Одоогоор харагдах зангилаа алга.</p>
      ) : (
        <ul className={styles.itemList} aria-label="GRAPH зангилаанууд">
          {graph.nodes.map((node) => (
            <li key={node.id}>
              <span>{node.label}</span>
              <span className={styles.timestamp}>
                {node.identityRevealed ? 'Танигдсан' : 'Тодорхойгүй'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {graph.edges.length > 0 ? (
        <ul className={styles.itemList} aria-label="GRAPH холбоосууд">
          {graph.edges.map((edge) => (
            <li
              key={edge.id}
              data-graph-confidence={edge.confidence}
              data-graph-status={edge.playerStatus}
            >
              <article>
                <h3>
                  {nodeLabels.get(edge.fromNodeId) ?? 'Тодорхойгүй'} →{' '}
                  {nodeLabels.get(edge.toNodeId) ?? 'Тодорхойгүй'}
                </h3>
                {edge.label ? <p>{edge.label}</p> : null}
                <p>{edge.confidence}% итгэлцэл</p>
                <p>{edge.supportingEvidenceIds.length} баримтын эх үүсвэр</p>
                <p>{graphStatusLabels[edge.playerStatus]}</p>
                {edge.playerStatus === 'unresolved' ? (
                  <div>
                    {edge.playerCanConfirm ? (
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        disabled={actionPending}
                        aria-label={`Холбоог батлах: ${edge.label ?? `${nodeLabels.get(edge.fromNodeId) ?? 'Тодорхойгүй'} → ${nodeLabels.get(edge.toNodeId) ?? 'Тодорхойгүй'}`}`}
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
                        disabled={actionPending}
                        aria-label={`Холбоог таслах: ${edge.label ?? `${nodeLabels.get(edge.fromNodeId) ?? 'Тодорхойгүй'} → ${nodeLabels.get(edge.toNodeId) ?? 'Тодорхойгүй'}`}`}
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
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
