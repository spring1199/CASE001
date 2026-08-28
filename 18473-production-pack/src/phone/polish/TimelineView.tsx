import { useId, useState, type FormEvent } from 'react';

import type { TimelineEventView, TimelinePositionView } from '@/game/engine/view';
import type { PlayerCaseEngineEvent } from '@/game/schema/case-view';
import styles from '@/phone/phone.module.css';

type TimelineViewProps = Readonly<{
  events: readonly TimelineEventView[];
  positions: readonly TimelinePositionView[];
  actionPending: boolean;
  onEvent(event: PlayerCaseEngineEvent): void | Promise<void>;
}>;

type TimelineEventControlProps = Readonly<{
  event: TimelineEventView;
  positions: readonly TimelinePositionView[];
  actionPending: boolean;
  onEvent(event: PlayerCaseEngineEvent): void | Promise<void>;
}>;

function TimelineEventControl({
  event,
  positions,
  actionPending,
  onEvent,
}: TimelineEventControlProps) {
  const selectId = useId();
  const [positionId, setPositionId] = useState(event.placedPositionId ?? '');

  const placeEvent = (formEvent: FormEvent<HTMLFormElement>): void => {
    formEvent.preventDefault();
    if (!positionId || !event.placeable || actionPending) return;
    void onEvent({
      type: 'place-timeline-event',
      eventId: event.id,
      positionId,
    });
  };

  return (
    <li className={styles.recordRow}>
      <h3 className={styles.recordTitle}>{event.title}</h3>
      {event.missingRequiredEvidenceCount > 0 ? (
        <p className={styles.recordBody}>{event.missingRequiredEvidenceCount} зайлшгүй баримт дутуу</p>
      ) : null}
      {event.placedPositionId ? (
        <span className={styles.stateTag} data-state={event.placedCorrectly ? 'completed' : undefined}>
          {event.placedCorrectly ? 'Зөв байрлуулсан' : 'Байрлалыг дахин шалгана уу'}
        </span>
      ) : null}
      <form className={styles.timelineForm} onSubmit={placeEvent}>
        <label htmlFor={selectId}>{event.title} — байрлал</label>
        <select
          id={selectId}
          className={styles.timelineSelect}
          value={positionId}
          disabled={!event.placeable || actionPending}
          onChange={(changeEvent) => setPositionId(changeEvent.currentTarget.value)}
        >
          <option value="">Байрлал сонгох</option>
          {[...positions]
            .sort((left, right) => left.order - right.order)
            .map((position) => (
              <option key={position.id} value={position.id}>{position.title}</option>
            ))}
        </select>
        <button
          type="submit"
          className={styles.secondaryButton}
          data-action-label
          disabled={!positionId || !event.placeable || actionPending}
        >
          Цагийн шугамд байрлуулах
        </button>
      </form>
    </li>
  );
}

export function TimelineView({ events, positions, actionPending, onEvent }: TimelineViewProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={styles.workbenchSection}>
      <h2 id={headingId} className={styles.sectionHeading}>Цагийн шугам</h2>
      {events.length === 0 ? (
        <p className={styles.emptyState}>Одоогоор байрлуулах үйл явдал алга.</p>
      ) : (
        <ul className={styles.itemList} data-list-style="grouped">
          {events.map((event) => (
            <TimelineEventControl
              key={event.id}
              event={event}
              positions={positions}
              actionPending={actionPending}
              onEvent={onEvent}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
