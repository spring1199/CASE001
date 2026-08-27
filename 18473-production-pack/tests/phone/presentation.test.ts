import { describe, expect, test } from 'vitest';

import {
  presentationDuration,
  selectPresentationBeat,
  type PresentationBeat,
} from '@/phone/polish/presentation';
import {
  DEFAULT_PRESENTATION_CHECKPOINT,
  PresentationCheckpointStorage,
  resetEndingPresentation,
  setEndingPresentationStage,
} from '@/phone/polish/presentation-storage';

class MemoryStorage {
  value: string | null = null;

  getItem(): string | null {
    return this.value;
  }

  setItem(_key: string, value: string): void {
    this.value = value;
  }
}

describe('presentation director', () => {
  test('selects deterministic reveal priority from visible tags only', () => {
    const evidence = [
      { tags: ['hope1'] },
      { tags: ['f17'] },
      { tags: ['hope3', 'finale'] },
    ];

    expect(selectPresentationBeat(evidence)).toBe('hope3');
    expect(selectPresentationBeat([{ tags: ['winter47'] }, { tags: ['decoy'] }])).toBe('decoy');
    expect(selectPresentationBeat([{ tags: ['hope2'] }, { tags: ['hope1'] }])).toBe('hope2');
  });

  test('uses engine outcome types but never outcome record IDs to select beats', () => {
    expect(selectPresentationBeat([], [{ type: 'ending-selected', endingId: 'opaque-a' }])).toBe('ending');
    expect(selectPresentationBeat([], [{ type: 'deduction-completed', deductionId: 'opaque-b' }])).toBe('ordinary');
    expect(selectPresentationBeat([], [{
      type: 'ending-rejected',
      endingId: 'opaque-c',
      reason: 'not-eligible',
    }])).toBeNull();
  });

  test('keeps postcredit explicit and returns no beat when nothing presentable changed', () => {
    expect(selectPresentationBeat([{ tags: ['postcredit'] }])).toBe('postcredit');
    expect(selectPresentationBeat([])).toBeNull();
  });

  test('reserves Hope 3 pacing for the conclusive finale signal', () => {
    expect(selectPresentationBeat([{ tags: ['optional', 'hope3'] }])).toBe('ordinary');
    expect(selectPresentationBeat([{ tags: ['hope3', 'finale'] }])).toBe('hope3');
    expect(selectPresentationBeat([
      { tags: ['optional', 'hope3'] },
      { tags: ['finale'] },
    ])).toBe('ordinary');
  });

  test('collapses every reduced-motion beat to at most 150ms', () => {
    const beats: PresentationBeat[] = [
      'ordinary', 'hope1', 'hope2', 'f17', 'winter47', 'decoy', 'hope3', 'ending', 'postcredit',
    ];
    expect(beats.every((beat) => presentationDuration(beat, true) <= 150)).toBe(true);
    expect(presentationDuration('ending', false)).toBeGreaterThan(150);
  });
});

describe('presentation checkpoint storage', () => {
  test('round trips acknowledged beats and ending stage', () => {
    const storage = new MemoryStorage();
    const checkpoints = new PresentationCheckpointStorage(() => storage);
    const checkpoint = {
      version: 1 as const,
      acknowledgedBeatKeys: ['hope3:signal'],
      endingStage: 'aftermath' as const,
    };

    expect(checkpoints.save(checkpoint)).toBe(true);
    expect(checkpoints.load()).toEqual(checkpoint);
    expect(new PresentationCheckpointStorage(() => storage).load()).toEqual(checkpoint);
  });

  test('updates and resets only presentation stage while preserving acknowledged beats', () => {
    const checkpoint = {
      version: 1 as const,
      acknowledgedBeatKeys: ['opaque:beat'],
      endingStage: 'aftermath' as const,
    };

    expect(setEndingPresentationStage(checkpoint, 'closure')).toEqual({
      ...checkpoint,
      endingStage: 'closure',
    });
    expect(resetEndingPresentation(checkpoint)).toEqual({
      ...checkpoint,
      endingStage: 'decision',
    });
  });

  test('falls back safely for corrupt, stale, or unavailable storage', () => {
    const storage = new MemoryStorage();
    const checkpoints = new PresentationCheckpointStorage(() => storage);
    storage.value = '{oops';
    expect(checkpoints.load()).toEqual(DEFAULT_PRESENTATION_CHECKPOINT);
    storage.value = JSON.stringify({ version: 2, acknowledgedBeatKeys: [] });
    expect(checkpoints.load()).toEqual(DEFAULT_PRESENTATION_CHECKPOINT);

    const unavailable = new PresentationCheckpointStorage(() => { throw new Error('denied'); });
    expect(unavailable.load()).toEqual(DEFAULT_PRESENTATION_CHECKPOINT);
    expect(unavailable.save(DEFAULT_PRESENTATION_CHECKPOINT)).toBe(false);
  });
});
