import { describe, expect, it } from 'vitest';
import { case001PhoneIndex, createCase001PhoneIndex } from '@/phone/data/case-001';

describe('Case #001 structured phone content', () => {
  it('ships the complete localized app surface', () => {
    expect(Object.keys(case001PhoneIndex.appsById).sort()).toEqual([
      'browser', 'calls', 'files', 'gallery', 'mail', 'messages', 'notes', 'settings',
    ]);
    expect(case001PhoneIndex.content.locale).toBe('mn');
    expect(case001PhoneIndex.content.device.ownerLabel).toContain('Тэнүүн');
  });

  it('contains 30–40 threads and the full 217-day INC-18473 spine', () => {
    const threads = case001PhoneIndex.appsById.messages.items;
    expect(threads.length).toBeGreaterThanOrEqual(30);
    expect(threads.length).toBeLessThanOrEqual(40);

    const incident = threads.find((thread) => thread.id === 'msg_inc_18473');
    expect(incident?.kind).toBe('message-thread');
    if (incident?.kind !== 'message-thread') throw new Error('INC-18473 thread missing');
    const body = incident.messages.map((message) => message.body ?? '').join('\n');
    expect(incident.subtitle).toContain('217');
    expect(body).toContain('систем намайг өөртэй минь андуураад');
    expect(body).toContain('Миний өмнөөс битгий сонго');
    expect(body).toContain('бөөрөлзгөнө');
  });

  it('integrates authored mail, browser, notes, files, calls, and gallery records', () => {
    expect(case001PhoneIndex.appsById.mail.items).toHaveLength(4);
    expect(case001PhoneIndex.appsById.browser.items.length).toBeGreaterThanOrEqual(16);
    expect(case001PhoneIndex.appsById.notes.items).toHaveLength(3);
    expect(case001PhoneIndex.appsById.files.items.length).toBeGreaterThanOrEqual(3);
    expect(case001PhoneIndex.appsById.calls.items.length).toBeGreaterThanOrEqual(8);
    expect(case001PhoneIndex.appsById.gallery.items.length).toBeGreaterThanOrEqual(35);
  });

  it('preserves searchable transcripts, deep links, and discovery effects', () => {
    const finalCall = case001PhoneIndex.itemsById.call_18473_03;
    expect(finalCall?.kind).toBe('call');
    expect(finalCall?.audio?.transcript).toContain('Бөөрөлзгөнө');
    expect(finalCall?.audio?.productionStatus).toBe('scripted');
    expect(finalCall?.audio?.src).toBeUndefined();

    const winter = case001PhoneIndex.itemsById.file_winter47;
    expect(winter?.deepLinks?.some((link) => link.target.itemId === 'mail_winter47')).toBe(true);
    expect(winter?.discovery?.evidenceIds).toContain('ev_winter47_operator');
  });

  it('does not project gated records or private image URLs before their reveal', () => {
    const locked = createCase001PhoneIndex({ factIds: [], endingId: null });
    expect(locked.itemsById.call_18473_03).toBeUndefined();
    expect(locked.itemsById.file_winter47).toBeUndefined();
    expect(locked.appsById.gallery.items
      .find((item) => item.visual?.assetId === 'REL-002')?.visual?.src).toBeUndefined();

    const revealed = createCase001PhoneIndex({
      factIds: ['fact_18473_archive_open', 'fact_f17_is_maral', 'fact_tenuun_alive'],
      endingId: 'ending_sever',
    });
    expect(revealed.itemsById.call_18473_03).toBeDefined();
    expect(revealed.itemsById.file_winter47).toBeDefined();
    expect(revealed.appsById.gallery.items
      .find((item) => item.visual?.assetId === 'REL-002')?.visual?.src)
      .toBe('/api/case-assets/REL-002');
  });
});
