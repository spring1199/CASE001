import { describe, expect, test } from 'vitest';

import {
  presentationDuration,
  selectPresentationBeat,
  type PresentationBeat,
} from '@/phone/polish/presentation';
import {
  DEFAULT_PRESENTATION_CHECKPOINT,
  PresentationCheckpointStorage,
  presentationCheckpointAfterEndingSelection,
  presentationStageForEnding,
  resetEndingPresentation,
  acknowledgePendingPresentation,
  setPendingPresentation,
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
  test('preserves two immutable snapshots of the same GRAPH edge across reload and acknowledgement', () => {
    const storage = new MemoryStorage();
    const checkpoints = new PresentationCheckpointStorage(() => storage);
    const atFiftySeven = setPendingPresentation(DEFAULT_PRESENTATION_CHECKPOINT, {
      beat: 'ordinary',
      key: 'ordinary:graph-visible:57',
      records: [{
        id: 'graph:visible-edge',
        title: 'Visible relationship',
        description: '57% · unresolved',
        tags: ['graph'],
      }],
    });
    const atSeventyThree = setPendingPresentation(atFiftySeven, {
      beat: 'ordinary',
      key: 'ordinary:graph-visible:73',
      records: [{
        id: 'graph:visible-edge',
        title: 'Visible relationship',
        description: '73% · confirmed',
        tags: ['graph'],
      }],
    });

    expect(checkpoints.save(atSeventyThree)).toBe(true);
    const reloaded = new PresentationCheckpointStorage(() => storage).load();
    expect(reloaded.pendingPresentations.map(({ records }) => records[0]?.description))
      .toEqual(['57% · unresolved', '73% · confirmed']);

    const afterFirst = acknowledgePendingPresentation(reloaded);
    expect(afterFirst.pendingPresentations[0]?.records[0]).toEqual({
      id: 'graph:visible-edge',
      title: 'Visible relationship',
      description: '73% · confirmed',
      tags: ['graph'],
    });
  });

  test('persists two pending reveals in FIFO order without overwriting the first', () => {
    const storage = new MemoryStorage();
    const checkpoints = new PresentationCheckpointStorage(() => storage);
    const first = setPendingPresentation(DEFAULT_PRESENTATION_CHECKPOINT, {
      beat: 'hope1',
      key: 'hope1:first',
      records: [{
        id: 'evidence:first',
        title: 'First visible record',
        description: 'First visible description',
        tags: ['hope1'],
      }],
    });
    const queued = setPendingPresentation(first, {
      beat: 'f17',
      key: 'f17:second',
      records: [{
        id: 'deduction:second',
        title: 'Second visible record',
        description: 'Second visible description',
        tags: ['f17'],
      }],
    });

    expect(queued.pendingPresentations?.map(({ key }) => key))
      .toEqual(['hope1:first', 'f17:second']);
    expect(checkpoints.save(queued)).toBe(true);
    const reloaded = new PresentationCheckpointStorage(() => storage).load();
    expect(reloaded.pendingPresentations?.map(({ key }) => key))
      .toEqual(['hope1:first', 'f17:second']);

    const afterFirst = acknowledgePendingPresentation(reloaded);
    expect(afterFirst.acknowledgedBeatKeys).toContain('hope1:first');
    expect(afterFirst.pendingPresentations?.map(({ key }) => key)).toEqual(['f17:second']);
    const afterSecond = acknowledgePendingPresentation(afterFirst);
    expect(afterSecond.acknowledgedBeatKeys).toContain('f17:second');
    expect(afterSecond.pendingPresentations).toEqual([]);
  });

  test('persists an unacknowledged reveal across reload and suppresses it after acknowledgement', () => {
    const storage = new MemoryStorage();
    const checkpoints = new PresentationCheckpointStorage(() => storage);
    const pending = setPendingPresentation(DEFAULT_PRESENTATION_CHECKPOINT, {
      beat: 'f17',
      key: 'f17:deduction-completed:visible-a:deduction:visible-a',
      records: [{
        id: 'deduction:visible-a',
        title: 'Visible deduction',
        description: 'Visible deduction description',
        tags: ['f17'],
      }],
    });

    expect(checkpoints.save(pending)).toBe(true);
    expect(new PresentationCheckpointStorage(() => storage).load().pendingPresentations)
      .toEqual(pending.pendingPresentations);

    const acknowledged = acknowledgePendingPresentation(pending);
    expect(acknowledged.pendingPresentations).toEqual([]);
    expect(acknowledged.acknowledgedBeatKeys).toContain(pending.pendingPresentations[0]?.key);
    expect(checkpoints.save(acknowledged)).toBe(true);
    expect(new PresentationCheckpointStorage(() => storage).load().pendingPresentations).toEqual([]);
  });

  test('migrates version-one metadata and safely drops ID-only pending beats that cannot be exact', () => {
    const storage = new MemoryStorage();
    storage.value = JSON.stringify({
      version: 1,
      acknowledgedBeatKeys: ['older-key'],
      endingId: null,
      endingStage: null,
      pendingPresentation: {
        beat: 'ordinary' as const,
        key: 'legacy-id-only',
        recordIds: ['graph:visible-edge'],
      },
      pendingPresentations: [{
        beat: 'ordinary',
        key: 'legacy-id-only',
        recordIds: ['graph:visible-edge'],
      }],
    });

    expect(new PresentationCheckpointStorage(() => storage).load()).toEqual({
      version: 2,
      acknowledgedBeatKeys: ['older-key'],
      endingId: null,
      endingStage: null,
      pendingPresentations: [],
    });
    expect(JSON.parse(storage.value ?? '{}')).toMatchObject({
      version: 2,
      acknowledgedBeatKeys: ['older-key'],
      pendingPresentations: [],
    });
  });

  test('rejects non-projected raw fields from persisted presentation snapshots', () => {
    const storage = new MemoryStorage();
    const checkpoints = new PresentationCheckpointStorage(() => storage);
    const unsafe = {
      ...DEFAULT_PRESENTATION_CHECKPOINT,
      pendingPresentations: [{
        beat: 'ordinary' as const,
        key: 'unsafe-extra-field',
        records: [{
          id: 'graph:visible-edge',
          title: 'Visible relationship',
          description: '57% · unresolved',
          tags: ['graph'],
          rawAuthoringSecret: 'must-not-persist',
        }],
      }],
    };

    expect(checkpoints.save(unsafe)).toBe(false);
    expect(storage.value).toBeNull();
  });
  test('round trips acknowledged beats and ending stage', () => {
    const storage = new MemoryStorage();
    const checkpoints = new PresentationCheckpointStorage(() => storage);
    const checkpoint = {
      version: 2 as const,
      acknowledgedBeatKeys: ['hope3:signal'],
      endingId: 'ending_alpha',
      endingStage: 'aftermath' as const,
      pendingPresentations: [],
    };

    expect(checkpoints.save(checkpoint)).toBe(true);
    expect(checkpoints.load()).toEqual(checkpoint);
    expect(new PresentationCheckpointStorage(() => storage).load()).toEqual(checkpoint);
  });

  test('updates and resets only presentation stage while preserving acknowledged beats', () => {
    const checkpoint = {
      version: 2 as const,
      acknowledgedBeatKeys: ['opaque:beat'],
      endingId: 'ending_alpha',
      endingStage: 'aftermath' as const,
      pendingPresentations: [],
    };

    expect(setEndingPresentationStage(checkpoint, 'ending_alpha', 'closure')).toEqual({
      ...checkpoint,
      endingStage: 'closure',
    });
    expect(resetEndingPresentation(checkpoint, 'ending_beta')).toEqual({
      ...checkpoint,
      endingId: 'ending_beta',
      endingStage: 'decision',
    });
    expect(presentationStageForEnding(checkpoint, 'ending_alpha')).toBe('aftermath');
    expect(presentationStageForEnding(checkpoint, 'ending_beta')).toBe('decision');
  });

  test('resets a same-ending replay from postcredit back to decision', () => {
    const checkpoint = {
      version: 2 as const,
      acknowledgedBeatKeys: ['opaque:ending'],
      endingId: 'ending_same',
      endingStage: 'postcredit' as const,
      pendingPresentations: [],
    };

    expect(presentationCheckpointAfterEndingSelection(
      checkpoint,
      [{ type: 'ending-selected', endingId: 'ending_same' }],
      'ending_same',
    )).toEqual({
      ...checkpoint,
      endingStage: 'decision',
    });
  });

  test('keeps a volatile in-session round trip when persistent storage is denied', () => {
    const denied = () => { throw new Error('denied'); };
    const key = 'test:presentation:volatile';
    const first = new PresentationCheckpointStorage(denied, key);
    const checkpoint = resetEndingPresentation(DEFAULT_PRESENTATION_CHECKPOINT, 'ending_volatile');

    expect(first.save(checkpoint)).toBe(false);
    expect(new PresentationCheckpointStorage(denied, key).load()).toEqual(checkpoint);
  });

  test('falls back safely for corrupt, stale, or unavailable storage', () => {
    const storage = new MemoryStorage();
    const checkpoints = new PresentationCheckpointStorage(() => storage);
    storage.value = '{oops';
    expect(checkpoints.load()).toEqual(DEFAULT_PRESENTATION_CHECKPOINT);
    storage.value = JSON.stringify({ version: 3, acknowledgedBeatKeys: [] });
    expect(checkpoints.load()).toEqual(DEFAULT_PRESENTATION_CHECKPOINT);

    const unavailable = new PresentationCheckpointStorage(() => { throw new Error('denied'); });
    expect(unavailable.load()).toEqual(DEFAULT_PRESENTATION_CHECKPOINT);
    expect(unavailable.save(DEFAULT_PRESENTATION_CHECKPOINT)).toBe(false);
  });
});
