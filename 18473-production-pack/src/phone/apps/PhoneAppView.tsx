import { useState } from 'react';

import type { DeepReadonly, PhoneAppDescriptor, PhoneItem } from '@/phone/data/schema';

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
    <section aria-labelledby={`${app.id}-app-heading`}>
      <h2 id={`${app.id}-app-heading`}>{app.label}</h2>

      {app.id === 'browser' ? (
        <search>
          <label htmlFor="browser-saved-page-search">Хадгалсан хуудсаас хайх</label>
          <input
            id="browser-saved-page-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            style={{ minHeight: 44 }}
          />
        </search>
      ) : null}

      {visibleItems.length > 0 ? (
        <ol aria-label={LIST_LABELS[app.id]} data-app-list={app.id}>
          {visibleItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpenItem(item)}
                style={{ minHeight: 44, minWidth: 44 }}
              >
                <strong>{item.title}</strong>
                {item.subtitle ? <span>{item.subtitle}</span> : null}
                {item.timestampLabel ? <time>{item.timestampLabel}</time> : null}
                {item.kind === 'message-thread' && item.messages.some((message) => !message.read) ? (
                  <span>Уншаагүй</span>
                ) : null}
                {item.visual ? <span>{item.visual.alt}</span> : null}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p role="status">Харуулах зүйл алга.</p>
      )}
    </section>
  );
}
