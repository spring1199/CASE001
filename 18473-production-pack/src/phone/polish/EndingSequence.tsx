import type { EndingOutcome } from '@/game/engine/endings';
import type { GraphView } from '@/game/engine/graph';
import styles from '@/phone/phone.module.css';
import type { EndingPresentationStage } from '@/phone/polish/presentation-storage';

export type EndingStage = EndingPresentationStage;

type EndingSequenceProps = Readonly<{
  ending: EndingOutcome;
  graph: GraphView;
  stage: EndingStage;
  onStageChange(stage: EndingStage): void;
}>;

const endingStageSequence: Readonly<Partial<Record<EndingStage, EndingStage>>> = {
  decision: 'aftermath',
  aftermath: 'closure',
  closure: 'postcredit',
};

export function nextEndingStage(stage: EndingStage): EndingStage | null {
  return endingStageSequence[stage] ?? null;
}

export function advanceEndingStage(
  stage: EndingStage,
  onStageChange: (stage: EndingStage) => void,
): boolean {
  const followingStage = nextEndingStage(stage);
  if (followingStage === null) return false;
  onStageChange(followingStage);
  return true;
}

export function EndingSequence({
  ending,
  graph,
  stage,
  onStageChange,
}: EndingSequenceProps) {
  // Task 5 PresentationLayer supplies the approved gated final phone beats;
  // this workbench sequence intentionally stays structural.
  const followingStage = nextEndingStage(stage);

  const advance = (): void => {
    advanceEndingStage(stage, onStageChange);
  };

  return (
    <section
      aria-label="Төгсгөлийн дараалал"
      data-ending-stage={stage}
      data-next-ending-stage={followingStage ?? undefined}
      className={styles.endingStage}
    >
      {stage === 'decision' ? (
        <>
          <h2 className={styles.endingTitle}>{ending.title}</h2>
          <p className={styles.endingBody}>{ending.description}</p>
          <p className={styles.endingNote}>
            {ending.exactLocationRevealed
              ? 'Нарийн байршил ил болсон.'
              : 'Байршил UNKNOWN хэвээр үлдсэн.'}
          </p>
        </>
      ) : null}

      {stage === 'aftermath' ? (
        <h2 className={styles.endingTitle}>Үр дагавар</h2>
      ) : null}

      {stage === 'closure' ? (
        <h2 className={styles.endingTitle}>Хэргийн хаалт</h2>
      ) : null}

      {stage === 'postcredit' ? (
        <>
          <h2 className={styles.endingTitle}>Төгсгөлийн дараах бүртгэл</h2>
          <ul className={styles.endingRecordList}>
            {graph.nodes.map((node) => <li key={node.id}>{node.label}</li>)}
          </ul>
        </>
      ) : null}

      {followingStage && stage !== 'aftermath' ? (
        <button type="button" className={styles.continueButton} data-action-label onClick={advance}>
          Үргэлжлүүлэх
        </button>
      ) : null}
    </section>
  );
}
