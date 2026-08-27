import { useState } from 'react';

import type { DeepReadonly, PhoneAppDescriptor, PhoneItem } from '@/phone/data/schema';
import styles from '@/phone/phone.module.css';

type PhoneAppViewProps = Readonly<{
  app: DeepReadonly<PhoneAppDescriptor>;
  unlockedContentIds: ReadonlySet<string>;
  gatedContentIds?: ReadonlySet<string>;
  onOpenItem(item: DeepReadonly<PhoneItem>): void;
}>;

const LIST_LABELS: Readonly<Record<PhoneAppDescriptor['id'], string>> = {
  messages: 'Зурвасын жагсаалт',
  gallery: 'Зургийн цагийн шугам',
  calls: 'Дуудлагын түүх',
  mail: 'Шуудангийн хайрцаг',
  browser: 'Хадгалсан хуудсууд',
  notes: 'Тэмдэглэлийн жагсаалт',
  files: 'Файлын жагсаалт',
  settings: 'Системийн мэдээлэл',
};

function searchableText(item: DeepReadonly<PhoneItem>): string {
  return [item.title, item.subtitle, item.body].filter(Boolean).join(' ').toLocaleLowerCase('mn');
}

export function PhoneAppView({
  app,
  unlockedContentIds,
  gatedContentIds = new Set<string>(),
  onOpenItem,
}: PhoneAppViewProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('mn');
  const availableItems = app.items.filter(
    (item) => !gatedContentIds.has(item.id) || unlockedContentIds.has(item.id),
  );
  const visibleItems =
    app.id === 'browser' && normalizedQuery.length > 0
      ? availableItems.filter((item) => searchableText(item).includes(normalizedQuery))
      : availableItems;

  return (
    <section
      aria-labelledby={`${app.id}-app-heading`}
      className={styles.appShell}
      data-app-shell={app.id}
    >
      <h2 id={`${app.id}-app-heading`} className={styles.appHeading}>{app.label}</h2>

      {app.id === 'browser' ? (
        <search className={styles.searchForm}>
          <label htmlFor="browser-saved-page-search" className={styles.searchLabel}>
            Хадгалсан хуудсаас хайх
          </label>
          <input
            id="browser-saved-page-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            className={styles.searchInput}
          />
        </search>
      ) : null}

      {visibleItems.length > 0 ? (
        <ol
          aria-label={LIST_LABELS[app.id]}
          data-app-list={app.id}
          data-gallery-layout={app.id === 'gallery' ? 'timeline-grid' : undefined}
          className={app.id === 'gallery' ? styles.galleryList : styles.itemList}
        >
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className={app.id === 'gallery' ? styles.galleryListItem : styles.itemListItem}
            >
              <button
                type="button"
                onClick={() => onOpenItem(item)}
                className={styles.listButton}
              >
                <strong className={styles.itemTitle}>{item.title}</strong>
                {item.subtitle ? <span className={styles.itemSubtitle}>{item.subtitle}</span> : null}
                {item.timestampLabel ? <time className={styles.timestamp}>{item.timestampLabel}</time> : null}
                {item.kind === 'message-thread' && item.messages.some((message) => !message.read) ? (
                  <span className={styles.unreadMarker}>Уншаагүй</span>
                ) : null}
                {item.visual ? <span className={styles.visualAlt}>{item.visual.alt}</span> : null}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p role="status" className={styles.emptyState}>Харуулах зүйл алга.</p>
      )}
    </section>
  );
}
