import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PhoneShell } from '@/components/PhoneShell';
import { ArtifactDetail, nextMessageWindowSize } from '@/phone/apps/ArtifactDetail';
import { PhoneAppView } from '@/phone/apps/PhoneAppView';
import { neutralPhoneIndex } from '@/phone/data/neutral-seed';
import { phoneAppDescriptorSchema, phoneItemSchema } from '@/phone/data/schema';

const syntheticSummary = {
  id: 'case_777',
  label: 'CASE 777',
  title: 'Синтетик хэрэг',
} as const;

describe('phone shell server markup', () => {
  it('renders a named lock region and unlock control before exposing the launcher', () => {
    const markup = renderToStaticMarkup(<PhoneShell caseSummary={syntheticSummary} />);

    expect(markup).toContain('<section aria-label="CASE 777: Синтетик хэрэг"');
    expect(markup).toContain('data-phone-screen="lock"');
    expect(markup).toContain('<button type="button"');
    expect(markup).toContain('Түгжээ тайлах');
    expect(markup).toContain('Мөрдөн шалгах төхөөрөмжийг нээнэ үү');
    expect(markup).not.toContain('aria-label="Аппын нүүр"');
    expect(markup).not.toContain('Зурвас апп');
  });

  it('keeps future-phase systems and internal implementation labels out of delivery markup', () => {
    const markup = renderToStaticMarkup(<PhoneShell caseSummary={syntheticSummary} />);

    expect(markup).not.toMatch(/GRAPH|Evidence board|Phase 0[23]|fake phone OS/i);
  });
});

describe('data-driven phone application views', () => {
  it.each(neutralPhoneIndex.content.apps)(
    'renders the $id shell from its validated descriptor',
    (app) => {
      const markup = renderToStaticMarkup(
        <PhoneAppView
          app={app}
          unlockedContentIds={new Set<string>()}
          onOpenItem={vi.fn()}
        />,
      );

      expect(markup).toContain(app.label);
      expect(markup).not.toMatch(/GRAPH/i);
    },
  );

  it('renders distinct neutral Browser collections without requiring authored case logic', () => {
    const markup = renderToStaticMarkup(
      <PhoneAppView
        app={neutralPhoneIndex.appsById.browser}
        unlockedContentIds={new Set<string>()}
        onOpenItem={vi.fn()}
      />,
    );

    expect(markup).toContain('type="search"');
    expect(markup).toContain('Хөтчийн бүртгэлээс хайх');
    expect(markup).toContain('>Түүх</button>');
    expect(markup).toContain('>Хадгалсан</button>');
    expect(markup).toContain('>Өмнөх хайлтууд</button>');
    expect(markup).toContain('Хотын дугуйн замын зураг');
  });

  it('renders Gallery timeline groups and neutral album shells', () => {
    const markup = renderToStaticMarkup(
      <PhoneAppView
        app={neutralPhoneIndex.appsById.gallery}
        unlockedContentIds={new Set<string>()}
        onOpenItem={vi.fn()}
      />,
    );

    expect(markup).toContain('>Цагийн шугам</button>');
    expect(markup).toContain('>Нуусан</button>');
    expect(markup).toContain('>Саяхан устгасан</button>');
    expect(markup).toContain('data-collection-group="8 сарын 24"');
    expect(markup).toContain('data-collection-group="8 сарын 23"');
  });

  it('renders sourced Gallery items as lazy responsive thumbnails with intrinsic dimensions', () => {
    const gallery = phoneAppDescriptorSchema.parse({
      ...neutralPhoneIndex.appsById.gallery,
      items: [
        {
          ...neutralPhoneIndex.appsById.gallery.items[0],
          visual: {
            ...neutralPhoneIndex.appsById.gallery.items[0]!.visual,
            src: '/assets/case-001/runtime/synthetic-gallery.jpg',
            width: 3024,
            height: 4032,
          },
        },
      ],
    });

    const markup = renderToStaticMarkup(
      <PhoneAppView
        app={gallery}
        unlockedContentIds={new Set<string>()}
        onOpenItem={vi.fn()}
      />,
    );

    expect(markup).toContain('data-gallery-thumbnail="true"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('width="3024" height="4032"');
    expect(markup).toContain(
      'sizes="(min-width: 48rem) 9rem, (min-width: 30rem) 30vw, 44vw"',
    );
  });

  it('keeps gated image delivery direct instead of routing it through an optimizer', () => {
    const galleryItem = neutralPhoneIndex.appsById.gallery.items[0]!;
    const gatedItem = phoneItemSchema.parse({
      ...galleryItem,
      visual: {
        ...galleryItem.visual!,
        src: '/api/case-assets/synthetic-gated-asset',
        width: 3024,
        height: 4032,
      },
    });

    const markup = renderToStaticMarkup(
      <ArtifactDetail item={gatedItem} onOpenDeepLink={vi.fn()} />,
    );

    expect(markup).toContain('src="/api/case-assets/synthetic-gated-asset"');
    expect(markup).not.toContain('/_next/image');
  });

  it('uses native metadata and audio controls with an available transcript', () => {
    const galleryItem = neutralPhoneIndex.appsById.gallery.items[0]!;
    const messageItem = neutralPhoneIndex.appsById.messages.items[0]!;
    const galleryMarkup = renderToStaticMarkup(
      <ArtifactDetail item={galleryItem} onOpenDeepLink={vi.fn()} />,
    );
    const messageMarkup = renderToStaticMarkup(
      <ArtifactDetail item={messageItem} onOpenDeepLink={vi.fn()} />,
    );

    expect(galleryMarkup).toContain('<dialog');
    expect(galleryMarkup).toContain('Метадата шалгах');
    expect(galleryMarkup).toContain('aria-controls="park-rain-photo-metadata-dialog"');
    expect(galleryMarkup).toContain('<dialog id="park-rain-photo-metadata-dialog"');
    expect(galleryMarkup).toContain('3024 × 4032');
    expect(messageMarkup).toContain('<audio controls=""');
    expect(messageMarkup).toContain('<summary>Бичлэгийн тайлал</summary>');
    expect(messageMarkup).toContain('Бороотой бол кофе шопт уулзаж болно шүү.');
  });

  it('never requests media for scripted audio even when a stale source is present', () => {
    const scripted = phoneItemSchema.parse({
      id: 'scripted-audio-test',
      kind: 'call',
      title: 'Продакшны скрипт',
      audio: {
        src: '/must-not-be-requested.mp3',
        durationLabel: '0:12',
        transcript: 'Энэ тайлал үргэлж хүртээмжтэй байна.',
        productionStatus: 'scripted',
      },
    });

    const markup = renderToStaticMarkup(
      <ArtifactDetail item={scripted} onOpenDeepLink={vi.fn()} />,
    );

    expect(markup).toContain('data-audio-production-status="scripted"');
    expect(markup).toContain('Аудио мастер ороогүй');
    expect(markup).toContain('<summary>Бичлэгийн тайлал</summary>');
    expect(markup).toContain('Энэ тайлал үргэлж хүртээмжтэй байна.');
    expect(markup).not.toContain('<audio');
    expect(markup).not.toContain('must-not-be-requested.mp3');
  });

  it('renders only the newest 60 messages initially in chronological order', () => {
    const messages = Array.from({ length: 125 }, (_, index) => ({
      id: `bounded-message-${String(index + 1).padStart(3, '0')}`,
      senderLabel: index % 2 === 0 ? 'Нэг' : 'Хоёр',
      direction: index % 2 === 0 ? 'incoming' as const : 'outgoing' as const,
      body: `Зурвас ${String(index + 1).padStart(3, '0')}`,
      timestampLabel: `${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`,
      read: true,
    }));
    const thread = phoneItemSchema.parse({
      id: 'bounded-thread',
      kind: 'message-thread',
      title: 'Урт түүх',
      messages,
    });

    const markup = renderToStaticMarkup(
      <ArtifactDetail item={thread} onOpenDeepLink={vi.fn()} />,
    );

    expect(markup).toContain('data-message-window-size="60"');
    expect(markup).toContain('Өмнөх 60 зурвасыг харуулах');
    expect(markup).not.toContain('>Зурвас 065</p>');
    expect(markup).toContain('>Зурвас 066</p>');
    expect(markup).toContain('>Зурвас 125</p>');
    expect(markup.indexOf('>Зурвас 066</p>')).toBeLessThan(
      markup.indexOf('>Зурвас 125</p>'),
    );
  });

  it('expands long message windows in bounded 60-message chunks', () => {
    expect(nextMessageWindowSize(125, 60)).toBe(120);
    expect(nextMessageWindowSize(125, 120)).toBe(125);
    expect(nextMessageWindowSize(40, 60)).toBe(40);
  });

  it('offers every visual artifact in a keyboard-accessible native zoom dialog', () => {
    const galleryItem = neutralPhoneIndex.appsById.gallery.items[0]!;
    const sizedItem = {
      ...galleryItem,
      visual: {
        ...galleryItem.visual!,
        src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
        width: 3024,
        height: 4032,
      },
    } as const;

    const markup = renderToStaticMarkup(
      <ArtifactDetail item={sizedItem} onOpenDeepLink={vi.fn()} />,
    );

    expect(markup).toContain('Зургийг томруулах');
    expect(markup).toContain('aria-controls="park-rain-photo-visual-dialog"');
    expect(markup).toContain('<dialog id="park-rain-photo-visual-dialog"');
    expect(markup).toContain('aria-describedby="park-rain-photo-visual-caption"');
    expect(markup).toContain(
      '<figcaption id="park-rain-photo-visual-caption">Саарал тэнгэрийн доор нойтон зам гялалзаж, модон сандал хоосон байна.</figcaption></figure><button',
    );
    expect(markup).toContain('width="3024" height="4032"');
    expect(markup).not.toContain('width="320" height="240"');
  });

  it('preserves incoming, outgoing, and system message direction semantically', () => {
    const thread = phoneItemSchema.parse({
      id: 'direction-test-thread',
      kind: 'message-thread',
      title: 'Чиглэлийн туршилт',
      messages: [
        {
          id: 'incoming-test-message',
          senderLabel: 'Хүлээн авагч',
          direction: 'incoming',
          body: 'Ирсэн туршилтын зурвас.',
          timestampLabel: '10:00',
          read: true,
        },
        {
          id: 'outgoing-test-message',
          senderLabel: 'Илгээгч',
          direction: 'outgoing',
          body: 'Илгээсэн туршилтын зурвас.',
          timestampLabel: '10:01',
          read: true,
        },
        {
          id: 'system-test-message',
          senderLabel: 'Систем',
          direction: 'system',
          body: 'Системийн туршилтын зурвас.',
          timestampLabel: '10:02',
          read: true,
        },
      ],
    });

    const markup = renderToStaticMarkup(
      <ArtifactDetail item={thread} onOpenDeepLink={vi.fn()} />,
    );

    expect(markup).toContain('data-message-direction="incoming"');
    expect(markup).toContain('data-message-direction="outgoing"');
    expect(markup).toContain('data-message-direction="system"');
    expect(markup).toContain('>Ирсэн</span>');
    expect(markup).toContain('>Илгээсэн</span>');
    expect(markup).toContain('>Системийн</span>');
  });
});
