import { describe, expect, it } from 'vitest';

import {
  REQUIRED_PHONE_APP_IDS,
  createPhoneContentIndex,
  parsePhoneContent,
} from '@/phone/data/schema';
import { neutralPhoneContent, neutralPhoneIndex } from '@/phone/data/neutral-seed';

describe('phone content boundary', () => {
  it('contains every Phase 02 app exactly once and never exposes GRAPH', () => {
    expect(neutralPhoneContent.apps.map((app) => app.id)).toEqual([
      ...REQUIRED_PHONE_APP_IDS,
    ]);
    expect(neutralPhoneContent.apps.some((app) => app.id === ('graph' as never))).toBe(false);
    expect('graph' in neutralPhoneIndex.appsById).toBe(false);
  });

  it('builds immutable app and item lookup records', () => {
    const messageItem = neutralPhoneContent.apps
      .find((app) => app.id === 'messages')
      ?.items.at(0);

    expect(messageItem).toBeDefined();
    expect(neutralPhoneIndex.appsById.messages.label).toBe('Зурвас');
    expect(neutralPhoneIndex.itemsById[messageItem!.id]).toBe(messageItem);
    expect(Object.isFrozen(neutralPhoneIndex)).toBe(true);
    expect(Object.isFrozen(neutralPhoneIndex.appsById)).toBe(true);
    expect(Object.isFrozen(neutralPhoneIndex.itemsById)).toBe(true);
  });

  it('rejects duplicate app IDs', () => {
    const duplicate = structuredClone(neutralPhoneContent);
    duplicate.apps[1]!.id = duplicate.apps[0]!.id;

    expect(() => parsePhoneContent(duplicate)).toThrow(/Duplicate app ID/);
  });

  it('rejects duplicate item IDs across apps', () => {
    const duplicate = structuredClone(neutralPhoneContent);
    duplicate.apps[1]!.items[0]!.id = duplicate.apps[0]!.items[0]!.id;

    expect(() => createPhoneContentIndex(duplicate)).toThrow(/Duplicate item ID/);
  });

  it('rejects deep links whose app or item target is missing', () => {
    const broken = structuredClone(neutralPhoneContent);
    broken.apps[0]!.items[0]!.deepLinks = [
      {
        label: 'Алга болсон холбоос',
        target: { appId: 'notes', itemId: 'missing-neutral-item' },
      },
    ];

    expect(() => parsePhoneContent(broken)).toThrow(/Broken deep link/);
  });

  it('requires accessible visual descriptions, metadata labels, and audio transcripts', () => {
    const invalidVisual = structuredClone(neutralPhoneContent);
    invalidVisual.apps[1]!.items[0]!.visual = {
      alt: '',
      description: 'Өнгөөр үл хамаарах тайлбар',
    };
    expect(() => parsePhoneContent(invalidVisual)).toThrow();

    const invalidMetadata = structuredClone(neutralPhoneContent);
    invalidMetadata.apps[1]!.items[0]!.metadata = [{ label: '', value: '12:00' }];
    expect(() => parsePhoneContent(invalidMetadata)).toThrow();

    const audioItem = structuredClone(neutralPhoneContent);
    audioItem.apps[0]!.items[0]!.audio = {
      src: '/audio/neutral-note.mp3',
      durationLabel: '0:08',
      transcript: '',
    };
    expect(() => parsePhoneContent(audioItem)).toThrow();
  });

  it('keeps audio transcripts and visual equivalents available in neutral seed data', () => {
    const items = neutralPhoneContent.apps.flatMap((app) => app.items);
    const audio = items.find((item) => item.audio !== undefined)?.audio;
    const visual = items.find((item) => item.visual !== undefined)?.visual;

    expect(audio?.transcript.length).toBeGreaterThan(0);
    expect(visual?.alt.length).toBeGreaterThan(0);
    expect(visual?.description.length).toBeGreaterThan(0);
  });
});
