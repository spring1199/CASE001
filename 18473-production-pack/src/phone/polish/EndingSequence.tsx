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
    >
      {stage === 'decision' ? (
        <>
          <h2>{ending.title}</h2>
          <p>{ending.description}</p>
          <p>
            {ending.exactLocationRevealed
              ? 'Нарийн байршил ил болсон.'
              : 'Байршил UNKNOWN хэвээр үлдсэн.'}
          </p>
        </>
      ) : null}

      {stage === 'aftermath' ? (
        <h2>Үр дагавар</h2>
      ) : null}

      {stage === 'closure' ? (
        <h2>Хэргийн хаалт</h2>
      ) : null}

      {stage === 'postcredit' ? (
        <>
          <h2>Төгсгөлийн дараах бүртгэл</h2>
          <ul className={styles.itemList}>
            {graph.nodes.map((node) => <li key={node.id}>{node.label}</li>)}
          </ul>
        </>
      ) : null}

      {followingStage ? (
        <button type="button" className={styles.primaryButton} onClick={advance}>
          Үргэлжлүүлэх
        </button>
      ) : null}
    </section>
  );
}
