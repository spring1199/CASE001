import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_AUDIO_PREFERENCES } from '@/phone/polish/audio-preferences';
import { createCase001PhoneIndex } from '@/phone/data/case-001';
import { PhoneChrome } from '@/phone/components/PhoneChrome';
import { nativeAudioPlaybackHandlers } from '@/phone/components/AudioNote';
import {
  AudioSettings,
  updateAudioPreference,
} from '@/phone/polish/AudioSettings';
import {
  PresentationLayer,
  presentationBeatKey,
} from '@/phone/polish/PresentationLayer';

describe('Phase 05 audio settings', () => {
  it('bridges every ready native-audio lifecycle exit to director duck/release callbacks', () => {
    const onPlaybackStart = vi.fn();
    const onPlaybackStop = vi.fn();
    const handlers = nativeAudioPlaybackHandlers({ onPlaybackStart, onPlaybackStop });

    handlers.onPlay();
    handlers.onPause();
    handlers.onEnded();
    handlers.onEmptied();
    handlers.onError();

    expect(onPlaybackStart).toHaveBeenCalledOnce();
    expect(onPlaybackStop).toHaveBeenCalledTimes(4);
  });

  it('exposes a labeled header mixer control without changing the top-level tab contract', () => {
    const markup = renderToStaticMarkup(
      <PhoneChrome
        title="Аппын нүүр"
        screen="home"
        activeSurface="phone"
        canGoBack={false}
        canGoHome={false}
        headingRef={createRef<HTMLHeadingElement>()}
        scrollRegionRef={createRef<HTMLDivElement>()}
        onBack={vi.fn()}
        onHome={vi.fn()}
        onSurfaceChange={vi.fn()}
        onOpenAudioSettings={vi.fn()}
      >
        <p>Агуулга</p>
      </PhoneChrome>,
    );

    expect(markup).toContain('aria-label="Дууны тохиргоо нээх"');
    expect(markup).toContain('id="phone-surface-tab"');
    expect(markup).toContain('id="investigation-surface-tab"');
  });

  it('renders labeled native category controls, mute, and ambience toggles', () => {
    const markup = renderToStaticMarkup(
      <AudioSettings
        preferences={DEFAULT_AUDIO_PREFERENCES}
        audioAvailable
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="Дууны тохиргоо"');
    expect(markup).toContain('type="range"');
    for (const label of ['Ерөнхий дуу', 'Орчны дуу', 'Үйлдлийн дуу', 'Илрүүлэлтийн дуу']) {
      expect(markup).toContain(`>${label}<`);
    }
    expect(markup).toContain('>Бүх дууг хаах<');
    expect(markup).toContain('>Орчны дууг идэвхжүүлэх<');
  });

  it('clamps native range values and preserves the versioned preference envelope', () => {
    expect(updateAudioPreference(DEFAULT_AUDIO_PREFERENCES, 'master', 2)).toEqual({
      ...DEFAULT_AUDIO_PREFERENCES,
      master: 1,
    });
    expect(updateAudioPreference(DEFAULT_AUDIO_PREFERENCES, 'ambience', -1)).toEqual({
      ...DEFAULT_AUDIO_PREFERENCES,
      ambience: 0,
    });
    expect(updateAudioPreference(DEFAULT_AUDIO_PREFERENCES, 'mute', true)).toEqual({
      ...DEFAULT_AUDIO_PREFERENCES,
      mute: true,
    });
  });

  it('reports unavailable Web Audio without hiding any settings or transcript information', () => {
    const markup = renderToStaticMarkup(
      <AudioSettings
        preferences={{ ...DEFAULT_AUDIO_PREFERENCES, mute: true }}
        audioAvailable={false}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('Дуу тоглуулах боломжгүй');
    expect(markup).toContain('Текстэн мэдээлэл, тайлал бүрэн хэвээр байна.');
    expect(markup).toContain('type="range"');
  });
});

describe('Phase 05 deterministic presentation layer', () => {
  const records = [
    {
      id: 'visible-a',
      title: 'Шинэ дохио',
      description: 'Тоглогчид аль хэдийн харагдсан тайлбар.',
      tags: ['hope3', 'finale'],
    },
  ];

  it('renders a user-advanceable aria-live reveal using only supplied projected text', () => {
    const markup = renderToStaticMarkup(
      <PresentationLayer
        beat="hope3"
        records={records}
        reducedMotion={false}
        onAcknowledge={vi.fn()}
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-live="assertive"');
    expect(markup).toContain('autofocus=""');
    expect(markup).toContain('data-presentation-beat="hope3"');
    expect(markup).toContain('>Шинэ дохио</h2>');
    expect(markup).toContain('Тоглогчид аль хэдийн харагдсан тайлбар.');
    expect(markup).toContain('>Үргэлжлүүлэх</button>');
  });

  it('caps reduced-motion presentation at 150ms without dropping content', () => {
    const markup = renderToStaticMarkup(
      <PresentationLayer
        beat="f17"
        records={records}
        reducedMotion
        onAcknowledge={vi.fn()}
      />,
    );

    expect(markup).toContain('data-presentation-duration="120"');
    expect(markup).toContain('Шинэ дохио');
  });

  it('builds stable acknowledgement keys from visible semantic inputs, not story answers', () => {
    expect(presentationBeatKey('hope3', records, ['evidence-discovered']))
      .toBe('hope3:evidence-discovered:visible-a');
  });

  it('renders the ending aftermath from projected audio and raspberry records with transcript parity', () => {
    const markup = renderToStaticMarkup(
      <PresentationLayer
        beat="ending"
        records={[]}
        reducedMotion={false}
        endingStage="aftermath"
        aftermath={{
          audio: {
            label: 'Сэргээгдсэн дуудлага',
            durationLabel: 'Сэргээгдсэн',
            transcript: 'Энгийн ярианы батлагдсан тайлал.',
            productionStatus: 'scripted',
          },
          raspberry: {
            title: 'Raspberry — 6',
            description: 'Тоглогчид харагдсан төлөвлөгөөний мөр.',
          },
        }}
        onAcknowledge={vi.fn()}
      />,
    );

    expect(markup).toContain('data-ending-aftermath="true"');
    expect(markup).toContain('Энгийн ярианы батлагдсан тайлал.');
    expect(markup).toContain('Raspberry — 6');
    expect(markup).not.toContain('<audio');
  });
});

describe('spoiler-safe projected presentation semantics', () => {
  it('withholds all phone presentation semantics before an ending and projects narrow roles afterwards', () => {
    const locked = createCase001PhoneIndex({ factIds: [], endingId: null });
    const ended = createCase001PhoneIndex({ factIds: [], endingId: 'ending_sever' });
    const lockedSerialized = JSON.stringify(locked.content);
    const endedItems = ended.content.apps.flatMap((app) => app.items);
    const endingAudioItems = endedItems
      .filter((item) => item.presentationRole === 'ending-audio');
    const raspberryItems = endedItems
      .filter((item) => item.presentationRole === 'ending-raspberry');

    expect(lockedSerialized).not.toContain('presentationTags');
    expect(lockedSerialized).not.toContain('presentationRole');
    expect(endingAudioItems).toHaveLength(1);
    expect(endingAudioItems[0]?.audio?.transcript).toBeTruthy();
    expect(raspberryItems.length).toBeGreaterThan(0);
    expect(raspberryItems.some((item) => item.body || item.visual)).toBe(true);
    expect(JSON.stringify(ended.content)).not.toContain('presentationTags');
  });
});
