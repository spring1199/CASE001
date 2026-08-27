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
      <section aria-labelledby={objectiveHeadingId}>
        <h2 id={objectiveHeadingId} className={styles.appHeading}>Зорилтууд</h2>
        <ul className={styles.itemList}>
          {view.objectives.map((objective) => (
            <li key={objective.id}>
              <span>{objective.title}</span>{' '}
              <span>{objective.state === 'completed' ? 'Биелсэн' : 'Идэвхтэй'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={evidenceHeadingId}>
        <h2 id={evidenceHeadingId} className={styles.appHeading}>Баримтууд</h2>
        {view.evidence.length === 0 ? (
          <p className={styles.emptyState}>Одоогоор бүртгэсэн баримт алга.</p>
        ) : (
          <ul className={styles.itemList}>
            {view.evidence.map((evidence) => (
              <li key={evidence.id}>
                <article>
                  <h3>{evidence.title}</h3>
                  <p>{evidence.description}</p>
                  <button
                    type="button"
                    className={styles.secondaryButton}
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
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={deductionHeadingId}>
        <h2 id={deductionHeadingId} className={styles.appHeading}>Дүгнэлтүүд</h2>
        <ul className={styles.itemList}>
          {view.completedDeductions.map((deduction) => (
            <li key={deduction.id}>
              <span>{deduction.title}</span> <span>Биелсэн</span>
            </li>
          ))}
          {view.availableDeductions.map((deduction) => (
            <li key={deduction.id}>
              <article>
                <h3>{deduction.title}</h3>
                <p>{deduction.thresholdMatched} / {deduction.thresholdRequired} баримт таарсан</p>
                {deduction.missingRequiredEvidenceCount > 0 ? (
                  <p>{deduction.missingRequiredEvidenceCount} зайлшгүй баримт дутуу</p>
                ) : null}
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={actionPending}
                  aria-label={`Дүгнэлтийг шалгах: ${deduction.title}`}
                  onClick={() => void onEvent({
                    type: 'attempt-deduction',
                    deductionId: deduction.id,
                  })}
                >
                  Дүгнэлтийг шалгах
                </button>
              </article>
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
        <section aria-labelledby={choiceHeadingId}>
          <h2 id={choiceHeadingId} className={styles.appHeading}>Эцсийн сонголт</h2>
          <ul className={styles.itemList}>
            {view.finalChoice.map((option) => (
              <li key={option.id}>
                <p>{option.description}</p>
                <button
                  type="button"
                  className={styles.primaryButton}
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
