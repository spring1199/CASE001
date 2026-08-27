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
    <li>
      <article>
        <h3>{event.title}</h3>
        {event.missingRequiredEvidenceCount > 0 ? (
          <p>{event.missingRequiredEvidenceCount} зайлшгүй баримт дутуу</p>
        ) : null}
        {event.placedPositionId ? (
          <p>{event.placedCorrectly ? 'Зөв байрлуулсан' : 'Байрлалыг дахин шалгана уу'}</p>
        ) : null}
        <form onSubmit={placeEvent}>
          <label htmlFor={selectId}>{event.title} — байрлал</label>
          <select
            id={selectId}
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
            disabled={!positionId || !event.placeable || actionPending}
          >
            Цагийн шугамд байрлуулах
          </button>
        </form>
      </article>
    </li>
  );
}

export function TimelineView({ events, positions, actionPending, onEvent }: TimelineViewProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.appHeading}>Цагийн шугам</h2>
      {events.length === 0 ? (
        <p className={styles.emptyState}>Одоогоор байрлуулах үйл явдал алга.</p>
      ) : (
        <ul className={styles.itemList}>
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
