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
    id: string;
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

export type PresentationScale = 'sheet' | 'reveal' | 'ending';

/**
 * Ordinary discoveries arrive as a compact sheet; authored reveals and the
 * ending take the whole screen so the writing gets room and silence.
 */
export function presentationScale(
  beat: PresentationBeat,
  endingStage?: EndingPresentationStage,
): PresentationScale {
  if (endingStage === 'aftermath' || beat === 'ending' || beat === 'postcredit') return 'ending';
  return beat === 'ordinary' ? 'sheet' : 'reveal';
}

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
    const activeElement = document.activeElement;
    const layer = dialogRef.current;
    // `document.body` owns focus when a reveal is restored on load, and this
    // layer's own controls must never become their own return target.
    const previouslyFocused = activeElement instanceof HTMLElement
      && activeElement !== document.body
      && layer?.contains(activeElement) !== true
      ? activeElement
      : null;
    const fallbackFocus = returnFocusRef?.current;
    continueRef.current?.focus({ preventScroll: true });
    return () => {
      // The background is still inert while this cleanup runs, so focus is
      // restored once the commit that removes `inert` has finished.
      queueMicrotask(() => {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        const active = document.activeElement;
        if (active !== null && active !== document.body) return;
        const canRestorePrevious = previouslyFocused !== null
          && previouslyFocused !== document.documentElement
          && previouslyFocused.isConnected;
        const returnTarget = canRestorePrevious ? previouslyFocused : fallbackFocus;
        if (returnTarget?.isConnected === true) returnTarget.focus({ preventScroll: true });
      });
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
      data-presentation-scale={presentationScale(beat, endingStage)}
      data-ending-aftermath={isEndingAftermath || undefined}
      className={styles.presentationLayer}
      onKeyDown={keepFocusInside}
    >
      <div className={styles.presentationCard}>
        {heading === beatLabels[beat] ? null : (
          <p className={styles.eyebrow}>{beatLabels[beat]}</p>
        )}
        <h2 id={titleId}>{heading}</h2>

        {records.map((record) => (
          <div key={record.id} className={styles.presentationRecord}>
            {record.title === heading ? null : <h3>{record.title}</h3>}
            <p>{record.description}</p>
          </div>
        ))}

        {isEndingAftermath && aftermath?.audio ? (
          <div data-ending-audio-id={aftermath.audio.id}>
            <AudioNote audio={aftermath.audio} label={aftermath.audio.label} />
          </div>
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
