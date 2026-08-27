import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PhoneShell } from '@/components/PhoneShell';
import { ArtifactDetail } from '@/phone/apps/ArtifactDetail';
import { PhoneAppView } from '@/phone/apps/PhoneAppView';
import { neutralPhoneIndex } from '@/phone/data/neutral-seed';
import { phoneItemSchema } from '@/phone/data/schema';

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

  it('renders browser search without requiring authored case logic', () => {
    const markup = renderToStaticMarkup(
      <PhoneAppView
        app={neutralPhoneIndex.appsById.browser}
        unlockedContentIds={new Set<string>()}
        onOpenItem={vi.fn()}
      />,
    );

    expect(markup).toContain('type="search"');
    expect(markup).toContain('Хадгалсан хуудсаас хайх');
    expect(markup).toContain('Долоо хоногийн цаг агаар');
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
