import {
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from 'react';

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
  returnFocusRef?: RefObject<HTMLElement | null>;
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
  returnFocusRef,
  onAcknowledge,
}: PresentationLayerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const duration = presentationDuration(beat, reducedMotion);
  const isEndingAftermath = endingStage === 'aftermath';
  const heading = records[0]?.title ?? beatLabels[beat];

  useLayoutEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const fallbackFocus = returnFocusRef?.current;
    continueRef.current?.focus({ preventScroll: true });
    return () => {
      const returnTarget = previouslyFocused?.isConnected
        ? previouslyFocused
        : fallbackFocus;
      returnTarget?.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);

  const keepFocusInside = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), audio[controls], summary, [tabindex]:not([tabindex="-1"])',
    ) ?? [])];
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <aside
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-live="assertive"
      aria-atomic="true"
      data-presentation-beat={beat}
      data-presentation-duration={duration}
      data-ending-aftermath={isEndingAftermath || undefined}
      className={styles.presentationLayer}
      onKeyDown={keepFocusInside}
    >
      <div className={styles.presentationCard}>
        <p className={styles.eyebrow}>{beatLabels[beat]}</p>
        <h2 id={titleId}>{heading}</h2>

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
          ref={continueRef}
          type="button"
          autoFocus
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
