import { describe, expect, it } from 'vitest';

import {
  REQUIRED_PHONE_APP_IDS,
  createPhoneContentIndex,
  parsePhoneContent,
  type DeepReadonly,
  type PhoneAppDescriptor,
  type PhoneContent,
  type PhoneItem,
} from '@/phone/data/schema';
import { neutralPhoneContent, neutralPhoneIndex } from '@/phone/data/neutral-seed';

function mutableNeutralClone(): PhoneContent {
  return structuredClone(neutralPhoneContent) as PhoneContent;
}

describe('phone content boundary', () => {
  it('contains every Phase 02 app exactly once and never exposes GRAPH', () => {
    expect(neutralPhoneContent.apps.map((app) => app.id)).toEqual([
      ...REQUIRED_PHONE_APP_IDS,
    ]);
    expect(neutralPhoneContent.apps.some((app) => app.id === ('graph' as never))).toBe(false);
    expect('graph' in neutralPhoneIndex.appsById).toBe(false);
  });

  it('deeply freezes validated content and every nested lookup value', () => {
    const messageItem = neutralPhoneContent.apps
      .find((app) => app.id === 'messages')
      ?.items.at(0);
    const messageApp = neutralPhoneIndex.appsById.messages;
    const galleryItem = neutralPhoneIndex.appsById.gallery.items[0]!;
    const mailItem = neutralPhoneIndex.appsById.mail.items[0]!;

    expect(messageItem).toBeDefined();
    if (messageItem?.kind !== 'message-thread') {
      throw new Error('Neutral Messages fixture must contain a message thread.');
    }
    expect(neutralPhoneIndex.appsById.messages.label).toBe('Зурвас');
    expect(neutralPhoneIndex.itemsById[messageItem!.id]).toBe(messageItem);
    expect(Object.isFrozen(neutralPhoneIndex)).toBe(true);
    expect(Object.isFrozen(neutralPhoneIndex.content)).toBe(true);
    expect(Object.isFrozen(neutralPhoneIndex.content.apps)).toBe(true);
    expect(Object.isFrozen(neutralPhoneIndex.appsById)).toBe(true);
    expect(Object.isFrozen(neutralPhoneIndex.itemsById)).toBe(true);
    expect(Object.isFrozen(messageApp)).toBe(true);
    expect(Object.isFrozen(messageApp.items)).toBe(true);
    expect(Object.isFrozen(messageItem)).toBe(true);
    expect(Object.isFrozen(messageItem!.messages)).toBe(true);
    expect(Object.isFrozen(messageItem!.messages[0])).toBe(true);
    expect(Object.isFrozen(messageItem!.audio)).toBe(true);
    expect(Object.isFrozen(messageItem!.discovery)).toBe(true);
    expect(Object.isFrozen(messageItem!.discovery!.artifactIds)).toBe(true);
    expect(Object.isFrozen(galleryItem.visual)).toBe(true);
    expect(Object.isFrozen(galleryItem.metadata)).toBe(true);
    expect(Object.isFrozen(galleryItem.metadata![0])).toBe(true);
    expect(Object.isFrozen(mailItem.deepLinks)).toBe(true);
    expect(Object.isFrozen(mailItem.deepLinks![0])).toBe(true);
    expect(Object.isFrozen(mailItem.deepLinks![0]!.target)).toBe(true);

    expect(() => {
      (neutralPhoneIndex.content.apps as unknown as PhoneAppDescriptor[]).push(
        messageApp as unknown as PhoneAppDescriptor,
      );
    }).toThrow(TypeError);
    expect(() => {
      (messageApp as PhoneAppDescriptor).label = 'Өөрчлөгдсөн';
    }).toThrow(TypeError);
    expect(() => {
      (messageApp.items as unknown as PhoneItem[]).pop();
    }).toThrow(TypeError);
    expect(() => {
      (messageItem as PhoneItem).title = 'Өөрчлөгдсөн';
    }).toThrow(TypeError);
    expect(neutralPhoneIndex.appsById.messages.items[0]!.title).toBe(
      'Амралтын өдрийн төлөвлөгөө',
    );
  });

  it('builds null-prototype lookup records that safely return undefined for missing keys', () => {
    const constructorKeyContent = mutableNeutralClone();
    constructorKeyContent.apps[1]!.items[0]!.id = 'constructor';
    const constructorKeyIndex = createPhoneContentIndex(constructorKeyContent);
    const missingItem: DeepReadonly<PhoneItem> | undefined =
      neutralPhoneIndex.itemsById['missing-item'];
    const missingOwner = neutralPhoneIndex.itemAppIds['missing-item'];
    const constructorKey: string = 'constructor';

    expect(Object.getPrototypeOf(neutralPhoneIndex.appsById)).toBeNull();
    expect(Object.getPrototypeOf(neutralPhoneIndex.itemsById)).toBeNull();
    expect(Object.getPrototypeOf(neutralPhoneIndex.itemAppIds)).toBeNull();
    expect(missingItem).toBeUndefined();
    expect(missingOwner).toBeUndefined();
    expect(constructorKeyIndex.itemsById[constructorKey]?.id).toBe('constructor');
    expect(constructorKeyIndex.itemAppIds[constructorKey]).toBe('gallery');
    expect(
      (neutralPhoneIndex.itemsById as Readonly<Record<string, unknown>>).constructor,
    ).toBeUndefined();
  });

  it('rejects duplicate app IDs', () => {
    const duplicate = mutableNeutralClone();
    duplicate.apps[1]!.id = duplicate.apps[0]!.id;

    expect(() => parsePhoneContent(duplicate)).toThrow(/Duplicate app ID/);
  });

  it('rejects duplicate item IDs across apps', () => {
    const duplicate = mutableNeutralClone();
    duplicate.apps[1]!.items[0]!.id = duplicate.apps[0]!.items[0]!.id;

    expect(() => createPhoneContentIndex(duplicate)).toThrow(/Duplicate item ID/);
  });

  it('rejects deep links whose app or item target is missing', () => {
    const broken = mutableNeutralClone();
    broken.apps[0]!.items[0]!.deepLinks = [
      {
        label: 'Алга болсон холбоос',
        target: { appId: 'notes', itemId: 'missing-neutral-item' },
      },
    ];

    expect(() => parsePhoneContent(broken)).toThrow(/Broken deep link/);
  });

  it('rejects discovery content unlocks that do not target authored phone items', () => {
    const broken = mutableNeutralClone();
    broken.apps[0]!.items[0]!.discovery = {
      unlockContentIds: ['missing-neutral-item'],
    };

    expect(() => parsePhoneContent(broken)).toThrow(/Broken content unlock/);
  });

  it('rejects duplicate message IDs within a thread', () => {
    const duplicate = mutableNeutralClone();
    const thread = duplicate.apps[0]!.items[0]!;
    if (thread.kind !== 'message-thread') throw new Error('Expected message-thread fixture.');
    thread.messages[1]!.id = thread.messages[0]!.id;

    expect(() => parsePhoneContent(duplicate)).toThrow(/Duplicate message ID/);
  });

  it('requires accessible visual descriptions, metadata labels, and audio transcripts', () => {
    const invalidVisual = mutableNeutralClone();
    invalidVisual.apps[1]!.items[0]!.visual = {
      alt: '',
      description: 'Өнгөөр үл хамаарах тайлбар',
    };
    expect(() => parsePhoneContent(invalidVisual)).toThrow();

    const invalidMetadata = mutableNeutralClone();
    invalidMetadata.apps[1]!.items[0]!.metadata = [{ label: '', value: '12:00' }];
    expect(() => parsePhoneContent(invalidMetadata)).toThrow();

    const audioItem = mutableNeutralClone();
    audioItem.apps[0]!.items[0]!.audio = {
      src: '/audio/neutral-note.mp3',
      durationLabel: '0:08',
      transcript: '',
    };
    expect(() => parsePhoneContent(audioItem)).toThrow();
  });

  it('requires paired intrinsic dimensions for sourced visual artifacts', () => {
    const missingDimensions = mutableNeutralClone();
    missingDimensions.apps[1]!.items[0]!.visual = {
      src: '/images/neutral-photo.jpg',
      alt: 'Борооны дараах зам',
      description: 'Нойтон замын хүртээмжтэй тайлбар.',
    };

    expect(() => parsePhoneContent(missingDimensions)).toThrow(/intrinsic dimensions/i);
    expect(neutralPhoneIndex.appsById.gallery.items[0]!.visual).toMatchObject({
      width: 3024,
      height: 4032,
    });
  });

  it('keeps audio transcripts and visual equivalents available in neutral seed data', () => {
    const items = neutralPhoneContent.apps.flatMap((app) => app.items);
    const audio = items.find((item) => item.audio !== undefined)?.audio;
    const visual = items.find((item) => item.visual !== undefined)?.visual;

    expect(audio?.transcript.length).toBeGreaterThan(0);
    expect(visual?.alt.length).toBeGreaterThan(0);
    expect(visual?.description.length).toBeGreaterThan(0);
  });

  it('embeds a valid playable WAVE source instead of referencing a missing asset', () => {
    const audio = neutralPhoneContent.apps
      .flatMap((app) => app.items)
      .find((item) => item.audio !== undefined)?.audio;
    expect(audio?.src).toMatch(/^data:audio\/wav;base64,/);

    const waveBytes = Buffer.from(audio!.src.split(',')[1]!, 'base64');
    expect(waveBytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(waveBytes.subarray(8, 12).toString('ascii')).toBe('WAVE');
    expect(waveBytes.byteLength).toBeGreaterThan(44);
  });

  it('authors an audio duration label that matches the embedded PCM duration', () => {
    const audio = neutralPhoneContent.apps
      .flatMap((app) => app.items)
      .find((item) => item.audio !== undefined)?.audio;
    if (audio === undefined) throw new Error('Expected neutral audio fixture.');

    const waveBytes = Buffer.from(audio.src.split(',')[1]!, 'base64');
    const channels = waveBytes.readUInt16LE(22);
    const sampleRate = waveBytes.readUInt32LE(24);
    const bitsPerSample = waveBytes.readUInt16LE(34);
    const dataLength = waveBytes.readUInt32LE(40);
    const actualSeconds = dataLength / (sampleRate * channels * (bitsPerSample / 8));
    const [minutesLabel, secondsLabel] = audio.durationLabel.split(':').map(Number);
    const labelledSeconds = minutesLabel! * 60 + secondsLabel!;

    expect(labelledSeconds).toBe(actualSeconds);
  });
});
