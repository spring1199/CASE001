import { useState } from 'react';

import type { EndingOutcome } from '@/game/engine/endings';
import type { GraphView } from '@/game/engine/graph';
import styles from '@/phone/phone.module.css';

export type EndingStage = 'decision' | 'aftermath' | 'closure' | 'postcredit';

type EndingSequenceProps = Readonly<{
  ending: EndingOutcome;
  graph: GraphView;
  initialStage?: EndingStage;
  onStageChange?(stage: EndingStage): void;
}>;

const nextEndingStage: Readonly<Partial<Record<EndingStage, EndingStage>>> = {
  decision: 'aftermath',
  aftermath: 'closure',
  closure: 'postcredit',
};

export function EndingSequence({
  ending,
  graph,
  initialStage = 'decision',
  onStageChange,
}: EndingSequenceProps) {
  const [stage, setStage] = useState<EndingStage>(initialStage);
  const nextStage = nextEndingStage[stage];

  const advance = (): void => {
    if (!nextStage) return;
    setStage(nextStage);
    onStageChange?.(nextStage);
  };

  return (
    <section aria-label="Төгсгөлийн дараалал" data-ending-stage={stage}>
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
        <>
          <h2>Үр дагавар</h2>
          <p>Шийдвэрийн дараах агуулгыг тайван хэмнэлээр үргэлжлүүлнэ.</p>
        </>
      ) : null}

      {stage === 'closure' ? (
        <>
          <h2>Хэргийн хаалт</h2>
          <p>Хэргийн бүртгэл хаагдсан. Дараагийн хэсгийг та өөрөө нээнэ.</p>
        </>
      ) : null}

      {stage === 'postcredit' ? (
        <>
          <h2>Төгсгөлийн дараах бүртгэл</h2>
          <ul className={styles.itemList}>
            {graph.nodes.map((node) => <li key={node.id}>{node.label}</li>)}
          </ul>
        </>
      ) : null}

      {nextStage ? (
        <button type="button" className={styles.primaryButton} onClick={advance}>
          Үргэлжлүүлэх
        </button>
      ) : null}
    </section>
  );
}
