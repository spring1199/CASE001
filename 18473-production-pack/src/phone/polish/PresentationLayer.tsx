import { AudioNote } from '@/phone/components/AudioNote';
import {
  presentationBeatKey,
  presentationDuration,
  type PresentationBeat,
} from '@/phone/polish/presentation';
import type { EndingPresentationStage } from '@/phone/polish/presentation-storage';
import styles from '@/phone/phone.module.css';

export type ProjectedPresentationRecord = Readonly<{
  id: string;
  title: string;
  description: string;
  tags: readonly string[];
}>;

export type EndingAftermath = Readonly<{
  audio?: Readonly<{
    label: string;
    src?: string;
    durationLabel: string;
    transcript: string;
    productionStatus: 'scripted' | 'ready';
  }>;
  raspberry?: Readonly<{
    title: string;
    description: string;
  }>;
}>;

type PresentationLayerProps = Readonly<{
  beat: PresentationBeat;
  records: readonly ProjectedPresentationRecord[];
  reducedMotion: boolean;
  endingStage?: EndingPresentationStage;
  aftermath?: EndingAftermath;
  onAcknowledge(): void;
}>;

const beatLabels: Readonly<Record<PresentationBeat, string>> = {
  ordinary: 'Шинэ мэдээлэл',
  hope1: 'Hope #1',
  hope2: 'Hope #2',
  f17: 'F17',
  winter47: 'Winter 47',
  decoy: 'Шинэ тайлбар',
  hope3: 'Hope #3',
  ending: 'Шийдвэрийн дараах бүртгэл',
  postcredit: 'Төгсгөлийн дараах бүртгэл',
};

export function presentationBeatKeyForRecords(
  beat: PresentationBeat,
  records: readonly Pick<ProjectedPresentationRecord, 'id'>[],
  outcomeTypes: readonly string[],
): string {
  return presentationBeatKey(beat, records.map(({ id }) => id), outcomeTypes);
}

export { presentationBeatKeyForRecords as presentationBeatKey };

export function PresentationLayer({
  beat,
  records,
  reducedMotion,
  endingStage,
  aftermath,
  onAcknowledge,
}: PresentationLayerProps) {
  const duration = presentationDuration(beat, reducedMotion);
  const isEndingAftermath = endingStage === 'aftermath';
  const heading = records[0]?.title ?? beatLabels[beat];

  return (
    <aside
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      data-presentation-beat={beat}
      data-presentation-duration={duration}
      data-ending-aftermath={isEndingAftermath || undefined}
      className={styles.presentationLayer}
    >
      <div className={styles.presentationCard}>
        <p className={styles.eyebrow}>{beatLabels[beat]}</p>
        <h2>{heading}</h2>

        {records.map((record) => (
          <div key={record.id} className={styles.presentationRecord}>
            {record.title === heading ? null : <h3>{record.title}</h3>}
            <p>{record.description}</p>
          </div>
        ))}

        {isEndingAftermath && aftermath?.audio ? (
          <AudioNote audio={aftermath.audio} label={aftermath.audio.label} />
        ) : null}
        {isEndingAftermath && aftermath?.raspberry ? (
          <section aria-label={aftermath.raspberry.title} className={styles.presentationRecord}>
            <h3>{aftermath.raspberry.title}</h3>
            <p>{aftermath.raspberry.description}</p>
          </section>
        ) : null}

        <button
          type="button"
          className={styles.primaryButton}
          data-action-label
          onClick={onAcknowledge}
        >
          Үргэлжлүүлэх
        </button>
      </div>
    </aside>
  );
}
