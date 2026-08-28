import { useState } from 'react';

import { PhoneGlyph } from '@/phone/components/PhoneGlyph';
import { VisualMedia } from '@/phone/components/VisualDialog';
import type { DeepReadonly, PhoneAppDescriptor, PhoneAppId, PhoneItem } from '@/phone/data/schema';
import styles from '@/phone/phone.module.css';

type PhoneAppViewProps = Readonly<{
  app: DeepReadonly<PhoneAppDescriptor>;
  unlockedContentIds: ReadonlySet<string>;
  gatedContentIds?: ReadonlySet<string>;
  initialCollectionId?: string;
  onCollectionChange?(collectionId: string): void;
  onOpenItem(item: DeepReadonly<PhoneItem>): void;
}>;

type RowVariant = 'contact' | 'record' | 'gallery';

type PhoneItemListProps = Readonly<{
  appId: PhoneAppDescriptor['id'];
  items: readonly DeepReadonly<PhoneItem>[];
  label: string;
  galleryLayout: boolean;
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

/** Conversational apps read as full-bleed rows; reference apps as inset groups. */
const PLAIN_LIST_APP_IDS: ReadonlySet<PhoneAppId> = new Set<PhoneAppId>([
  'messages',
  'calls',
  'mail',
  'gallery',
]);

const CONTACT_ROW_APP_IDS: ReadonlySet<PhoneAppId> = new Set<PhoneAppId>(['messages', 'calls']);

function rowVariant(appId: PhoneAppId, galleryLayout: boolean): RowVariant {
  if (galleryLayout) return 'gallery';
  return CONTACT_ROW_APP_IDS.has(appId) ? 'contact' : 'record';
}

/** First grapheme of the contact label, used as a neutral avatar monogram. */
export function contactMonogram(title: string): string {
  return [...title.trim()].find((character) => /\p{L}|\p{N}/u.test(character))?.toLocaleUpperCase('mn')
    ?? '·';
}

function searchableText(item: DeepReadonly<PhoneItem>): string {
  return [item.title, item.subtitle, item.body].filter(Boolean).join(' ').toLocaleLowerCase('mn');
}

function hasUnreadMessages(item: DeepReadonly<PhoneItem>): boolean {
  return item.kind === 'message-thread' && item.messages.some((message) => !message.read);
}

function PhoneItemList({ appId, items, label, galleryLayout, onOpenItem }: PhoneItemListProps) {
  const variant = rowVariant(appId, galleryLayout);

  return (
    <ol
      aria-label={label}
      data-app-list={appId}
      data-list-style={PLAIN_LIST_APP_IDS.has(appId) ? 'plain' : 'grouped'}
      className={galleryLayout ? styles.galleryList : styles.itemList}
    >
      {items.map((item) => (
        <li
          key={item.id}
          className={galleryLayout ? styles.galleryListItem : styles.itemListItem}
        >
          <button
            type="button"
            data-row-variant={variant}
            data-row-lead={variant === 'contact' || undefined}
            onClick={() => onOpenItem(item)}
            className={styles.listButton}
          >
            {galleryLayout && item.visual ? (
              <span data-gallery-thumbnail className={styles.galleryThumbnail}>
                <VisualMedia
                  visual={item.visual}
                  className={styles.galleryThumbnailMedia}
                  loading="lazy"
                  sizes="(min-width: 48rem) 9rem, (min-width: 30rem) 30vw, 44vw"
                />
              </span>
            ) : null}
            {variant === 'contact' ? (
              <span aria-hidden="true" className={styles.rowLead}>
                <span className={styles.avatar}>{contactMonogram(item.title)}</span>
              </span>
            ) : null}
            <span className={styles.rowMain}>
              <strong className={styles.itemTitle}>{item.title}</strong>
              {item.subtitle ? <span className={styles.itemSubtitle}>{item.subtitle}</span> : null}
              {item.visual && !galleryLayout ? (
                <span className={styles.visualAlt}>{item.visual.alt}</span>
              ) : null}
              {galleryLayout && item.timestampLabel ? (
                <time className={styles.timestamp}>{item.timestampLabel}</time>
              ) : null}
            </span>
            {galleryLayout ? null : (
              <span className={styles.rowTrail}>
                {item.timestampLabel ? (
                  <time className={styles.timestamp}>{item.timestampLabel}</time>
                ) : null}
                {hasUnreadMessages(item) ? (
                  <span className={styles.unreadMarker}>Уншаагүй</span>
                ) : null}
                <span aria-hidden="true" className={styles.chevron}>
                  <PhoneGlyph name="chevron-right" size="0.875rem" />
                </span>
              </span>
            )}
          </button>
        </li>
      ))}
    </ol>
  );
}

export function PhoneAppView({
  app,
  unlockedContentIds,
  gatedContentIds = new Set<string>(),
  initialCollectionId,
  onCollectionChange,
  onOpenItem,
}: PhoneAppViewProps) {
  const [query, setQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    app.collections?.some((collection) => collection.id === initialCollectionId)
      ? initialCollectionId
      : app.collections?.[0]?.id,
  );
  const normalizedQuery = query.trim().toLocaleLowerCase('mn');
  const activeCollection =
    app.collections?.find((collection) => collection.id === selectedCollectionId) ??
    app.collections?.[0];
  const availableItems = app.items.filter(
    (item) => !gatedContentIds.has(item.id) || unlockedContentIds.has(item.id),
  );
  const collectionItems = activeCollection
    ? availableItems.filter((item) => item.collectionId === activeCollection.id)
    : availableItems;
  const visibleItems =
    app.id === 'browser' && normalizedQuery.length > 0
      ? collectionItems.filter((item) => searchableText(item).includes(normalizedQuery))
      : collectionItems;
  const timelineGroups = new Map<string, DeepReadonly<PhoneItem>[]>();
  if (activeCollection?.presentation === 'timeline-grid') {
    for (const item of visibleItems) {
      const groupLabel = item.groupLabel ?? 'Бусад';
      const groupItems = timelineGroups.get(groupLabel) ?? [];
      groupItems.push(item);
      timelineGroups.set(groupLabel, groupItems);
    }
  }
  const listLabel = activeCollection?.label ?? LIST_LABELS[app.id];

  return (
    <section
      aria-labelledby={`${app.id}-app-heading`}
      className={styles.appShell}
      data-app-shell={app.id}
    >
      {/* The screen's large title already names the app; this keeps the landmark named. */}
      <h2 id={`${app.id}-app-heading`} className={styles.srOnly}>{app.label}</h2>

      {app.collections ? (
        <nav aria-label={`${app.label} цуглуулгууд`} className={styles.collectionNav}>
          {app.collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              aria-pressed={collection.id === activeCollection?.id}
              data-collection-id={collection.id}
              data-action-label
              className={styles.collectionButton}
              onClick={() => {
                setSelectedCollectionId(collection.id);
                setQuery('');
                onCollectionChange?.(collection.id);
              }}
            >
              {collection.label}
            </button>
          ))}
        </nav>
      ) : null}

      {app.id === 'browser' ? (
        <search className={styles.searchForm}>
          <label htmlFor="browser-record-search" className={styles.srOnly}>
            Хөтчийн бүртгэлээс хайх
          </label>
          <div className={styles.searchField}>
            <span aria-hidden="true" className={styles.searchGlyph}>
              <PhoneGlyph name="search" size="1rem" />
            </span>
            <input
              id="browser-record-search"
              type="search"
              value={query}
              placeholder="Хөтчийн бүртгэлээс хайх"
              onChange={(event) => setQuery(event.currentTarget.value)}
              className={styles.searchInput}
            />
          </div>
        </search>
      ) : null}

      {visibleItems.length > 0 && activeCollection?.presentation === 'timeline-grid' ? (
        <div className={styles.timelineGroups} data-gallery-layout="timeline-grid">
          {Array.from(timelineGroups).map(([groupLabel, groupItems], groupIndex) => {
            const groupHeadingId = `${app.id}-${activeCollection.id}-group-${groupIndex}-heading`;

            return (
              <section
                key={groupLabel}
                aria-labelledby={groupHeadingId}
                data-collection-group={groupLabel}
                className={styles.collectionGroup}
              >
                <h3 id={groupHeadingId} className={styles.collectionGroupHeading}>
                  {groupLabel}
                </h3>
                <PhoneItemList
                  appId={app.id}
                  items={groupItems}
                  label={`${activeCollection.label} · ${groupLabel}`}
                  galleryLayout
                  onOpenItem={onOpenItem}
                />
              </section>
            );
          })}
        </div>
      ) : visibleItems.length > 0 ? (
        <PhoneItemList
          appId={app.id}
          items={visibleItems}
          label={listLabel}
          galleryLayout={false}
          onOpenItem={onOpenItem}
        />
      ) : (
        <p role="status" className={styles.emptyState}>
          {activeCollection?.emptyLabel ?? 'Харуулах зүйл алга.'}
        </p>
      )}
    </section>
  );
}
