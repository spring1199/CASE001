import { useId } from 'react';

import type { CaseView } from '@/game/engine/view';
import type { PlayerCaseEngineEvent } from '@/game/schema/case-view';
import styles from '@/phone/phone.module.css';
import { EndingSequence, type EndingStage } from '@/phone/polish/EndingSequence';
import { GraphView } from '@/phone/polish/GraphView';
import { TimelineView } from '@/phone/polish/TimelineView';

type InvestigationWorkspaceProps = Readonly<{
  view: CaseView;
  actionPending: boolean;
  endingStage?: EndingStage;
  onEndingStageChange?(stage: EndingStage): void;
  onEvent(event: PlayerCaseEngineEvent): void | Promise<void>;
}>;

export function deductionProgressPercentage(matched: number, required: number): number {
  if (required <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((matched / required) * 100)));
}

export function InvestigationWorkspace({
  view,
  actionPending,
  endingStage = 'decision',
  onEndingStageChange,
  onEvent,
}: InvestigationWorkspaceProps) {
  const objectiveHeadingId = useId();
  const evidenceHeadingId = useId();
  const deductionHeadingId = useId();
  const choiceHeadingId = useId();

  return (
    <section
      aria-label="Мөрдлөгийн ажлын талбар"
      aria-busy={actionPending}
      className={styles.appShell}
    >
      <section aria-labelledby={objectiveHeadingId} className={styles.workbenchSection}>
        <h2 id={objectiveHeadingId} className={styles.sectionHeading}>Зорилтууд</h2>
        <ul className={styles.itemList} data-list-style="grouped">
          {view.objectives.map((objective) => (
            <li key={objective.id} className={styles.objectiveRow}>
              <span className={styles.recordTitle}>{objective.title}</span>
              <span className={styles.stateTag} data-state={objective.state}>
                {objective.state === 'completed' ? 'Биелсэн' : 'Идэвхтэй'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={evidenceHeadingId} className={styles.workbenchSection}>
        <h2 id={evidenceHeadingId} className={styles.sectionHeading}>Баримтууд</h2>
        {view.evidence.length === 0 ? (
          <p className={styles.emptyState}>Одоогоор бүртгэсэн баримт алга.</p>
        ) : (
          <ul className={styles.itemList} data-list-style="grouped">
            {view.evidence.map((evidence) => (
              <li key={evidence.id} className={styles.recordRow} data-pinned={evidence.pinned}>
                <h3 className={styles.recordTitle}>{evidence.title}</h3>
                <p className={styles.recordBody}>{evidence.description}</p>
                <div className={styles.recordActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    data-action-label
                    disabled={actionPending}
                    aria-label={evidence.pinned
                      ? `Самбараас авах: ${evidence.title}`
                      : `Самбарт тогтоох: ${evidence.title}`}
                    onClick={() => void onEvent(evidence.pinned
                      ? { type: 'unpin-evidence', evidenceIds: [evidence.id] }
                      : { type: 'pin-evidence', evidenceIds: [evidence.id] })}
                  >
                    {evidence.pinned ? 'Самбараас авах' : 'Самбарт тогтоох'}
                  </button>
                  {evidence.pinned ? (
                    <span className={styles.stateTag} data-state="pinned">Самбар дээр</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={deductionHeadingId} className={styles.workbenchSection}>
        <h2 id={deductionHeadingId} className={styles.sectionHeading}>Дүгнэлтүүд</h2>
        <ul className={styles.itemList} data-list-style="grouped">
          {view.completedDeductions.map((deduction) => (
            <li key={deduction.id} className={styles.objectiveRow}>
              <span className={styles.recordTitle}>{deduction.title}</span>
              <span className={styles.stateTag} data-state="completed">Биелсэн</span>
            </li>
          ))}
          {view.availableDeductions.map((deduction) => (
            <li key={deduction.id} className={styles.recordRow}>
              <h3 className={styles.recordTitle}>{deduction.title}</h3>
              <span aria-hidden="true" className={styles.progressMeter}>
                <span
                  className={styles.progressMeterFill}
                  style={{
                    inlineSize: `${deductionProgressPercentage(
                      deduction.thresholdMatched,
                      deduction.thresholdRequired,
                    )}%`,
                  }}
                />
              </span>
              <p className={styles.recordBody}>{deduction.thresholdMatched} / {deduction.thresholdRequired} баримт таарсан</p>
              {deduction.missingRequiredEvidenceCount > 0 ? (
                <p className={styles.recordBody}>{deduction.missingRequiredEvidenceCount} зайлшгүй баримт дутуу</p>
              ) : null}
              <div className={styles.recordActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  data-action-label
                  disabled={actionPending}
                  aria-label={`Дүгнэлтийг шалгах: ${deduction.title}`}
                  onClick={() => void onEvent({
                    type: 'attempt-deduction',
                    deductionId: deduction.id,
                  })}
                >
                  Дүгнэлтийг шалгах
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <TimelineView
        events={view.timelineEvents}
        positions={view.timelinePositions}
        actionPending={actionPending}
        onEvent={onEvent}
      />

      {view.ending === null ? (
        <GraphView graph={view.graph} actionPending={actionPending} onEvent={onEvent} />
      ) : null}

      {view.finalChoice ? (
        <section
          aria-labelledby={choiceHeadingId}
          className={`${styles.workbenchSection} ${styles.choiceSection}`}
        >
          <h2 id={choiceHeadingId} className={styles.sectionHeading}>Эцсийн сонголт</h2>
          <p className={styles.sectionNote}>
            Хоёулаа боломжтой. Аль нэгийг сонговол нөгөө нь боломжгүй болно.
          </p>
          <ul className={styles.choiceList}>
            {view.finalChoice.map((option) => (
              <li key={option.id} className={styles.choiceCard}>
                <p>{option.description}</p>
                <button
                  type="button"
                  className={styles.choiceButton}
                  data-action-label
                  disabled={actionPending}
                  onClick={() => void onEvent({
                    type: 'select-ending',
                    endingId: option.id,
                  })}
                >
                  {option.choiceLabel}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.ending ? (
        <EndingSequence
          ending={view.ending}
          graph={view.graph}
          stage={endingStage}
          onStageChange={(stage) => onEndingStageChange?.(stage)}
        />
      ) : null}
    </section>
  );
}
