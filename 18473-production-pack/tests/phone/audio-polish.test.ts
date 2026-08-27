import { describe, expect, test, vi } from 'vitest';

import {
  AudioPreferencesStorage,
  DEFAULT_AUDIO_PREFERENCES,
  clampGain,
  computeCategoryGain,
} from '@/phone/polish/audio-preferences';
import {
  AudioDirector,
  type AudioContextPort,
  type AudioNodePort,
  type AudioParamPort,
} from '@/phone/polish/audio-director';

class MemoryStorage {
  value: string | null = null;

  getItem(): string | null {
    return this.value;
  }

  setItem(_key: string, value: string): void {
    this.value = value;
  }
}

function fakeParam(initial = 1): AudioParamPort {
  return {
    value: initial,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

function fakeNode(extra: Record<string, unknown> = {}): AudioNodePort & Record<string, unknown> {
  return {
    connect: vi.fn(function connect(this: AudioNodePort) { return this; }),
    disconnect: vi.fn(),
    onended: null,
    ...extra,
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => { resolve = settle; });
  return { promise, resolve };
}

function endNode(node: ReturnType<typeof fakeNode>): void {
  const onended = node.onended as (() => void) | null;
  onended?.();
}

function createFakeContext() {
  const destination = fakeNode();
  const gains: Array<ReturnType<typeof fakeNode>> = [];
  const oscillators: Array<ReturnType<typeof fakeNode>> = [];
  const bufferSources: Array<ReturnType<typeof fakeNode>> = [];
  const context: AudioContextPort = {
    currentTime: 10,
    state: 'suspended',
    destination,
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    createGain: vi.fn(() => {
      const node = fakeNode({ gain: fakeParam() });
      gains.push(node);
      return node as unknown as ReturnType<AudioContextPort['createGain']>;
    }),
    createOscillator: vi.fn(() => {
      const node = fakeNode({
        frequency: fakeParam(220),
        type: 'sine',
        start: vi.fn(),
        stop: vi.fn(),
      });
      oscillators.push(node);
      return node as unknown as ReturnType<AudioContextPort['createOscillator']>;
    }),
    createBuffer: vi.fn(() => ({
      getChannelData: () => new Float32Array(64),
    })),
    createBufferSource: vi.fn(() => {
      const node = fakeNode({
        buffer: null,
        loop: false,
        start: vi.fn(),
        stop: vi.fn(),
      });
      bufferSources.push(node);
      return node as unknown as ReturnType<AudioContextPort['createBufferSource']>;
    }),
    sampleRate: 48_000,
  };
  return { context, gains, oscillators, bufferSources };
}

describe('audio preferences', () => {
  test('falls back to versioned defaults when storage is missing or corrupt', () => {
    const storage = new MemoryStorage();
    const preferences = new AudioPreferencesStorage(() => storage);

    expect(preferences.load()).toEqual(DEFAULT_AUDIO_PREFERENCES);
    storage.value = '{broken';
    expect(preferences.load()).toEqual(DEFAULT_AUDIO_PREFERENCES);
    storage.value = JSON.stringify({ version: 99, master: 5 });
    expect(preferences.load()).toEqual(DEFAULT_AUDIO_PREFERENCES);
  });

  test('round trips a valid preference envelope and never throws on storage errors', () => {
    const storage = new MemoryStorage();
    const preferences = new AudioPreferencesStorage(() => storage);
    const saved = { ...DEFAULT_AUDIO_PREFERENCES, master: 0.8, interface: 0.5, ambienceEnabled: true };

    expect(preferences.save(saved)).toBe(true);
    expect(preferences.load()).toEqual(saved);

    const unavailable = new AudioPreferencesStorage(() => { throw new Error('blocked'); });
    expect(unavailable.load()).toEqual(DEFAULT_AUDIO_PREFERENCES);
    expect(unavailable.save(saved)).toBe(false);
  });

  test('clamps gains and multiplies master by the requested category', () => {
    expect(clampGain(-1)).toBe(0);
    expect(clampGain(2)).toBe(1);
    expect(computeCategoryGain({ ...DEFAULT_AUDIO_PREFERENCES, master: 0.8, interface: 0.5 }, 'interface')).toBeCloseTo(0.4);
    expect(computeCategoryGain({ ...DEFAULT_AUDIO_PREFERENCES, master: 1, reveal: 4 }, 'reveal')).toBe(1);
    expect(computeCategoryGain({ ...DEFAULT_AUDIO_PREFERENCES, mute: true }, 'ambience')).toBe(0);
  });
});

describe('AudioDirector', () => {
  test('does not instantiate AudioContext until activation from a user gesture', async () => {
    const fake = createFakeContext();
    const contextFactory = vi.fn(() => fake.context);
    const director = new AudioDirector({ contextFactory });

    director.playCue('interface');
    expect(contextFactory).not.toHaveBeenCalled();

    expect(await director.activateFromUserGesture()).toBe(true);
    expect(contextFactory).toHaveBeenCalledOnce();
    expect(fake.context.resume).toHaveBeenCalledOnce();
  });

  test('generates every non-dialogue cue without requiring a browser AudioContext', async () => {
    const fake = createFakeContext();
    const director = new AudioDirector({ contextFactory: () => fake.context });
    await director.activateFromUserGesture();

    for (const cue of ['interface', 'discovery', 'reveal', 'graph', 'ending'] as const) {
      director.playCue(cue);
    }

    expect(fake.oscillators.length).toBeGreaterThanOrEqual(5);
    expect(fake.oscillators.every((node) => vi.mocked(node.start as () => void).mock.calls.length === 1)).toBe(true);
    expect(fake.bufferSources.length).toBeGreaterThan(0);
  });

  test('keeps ambience opt-in, responds to visibility, ducks native audio, and disconnects on dispose', async () => {
    const fake = createFakeContext();
    const director = new AudioDirector({ contextFactory: () => fake.context });
    await director.activateFromUserGesture();

    expect(fake.bufferSources).toHaveLength(0);
    director.setAmbienceEnabled(true);
    expect(fake.bufferSources).toHaveLength(1);

    director.setNativeAudioActive(true);
    director.setNativeAudioActive(false);
    const duckGain = fake.gains[1]?.gain as AudioParamPort;
    expect(duckGain.linearRampToValueAtTime).toHaveBeenCalled();

    await director.handleVisibilityChange(true);
    await director.handleVisibilityChange(false);
    expect(fake.context.suspend).toHaveBeenCalledOnce();
    expect(fake.context.resume).toHaveBeenCalledTimes(2);

    await director.dispose();
    expect(fake.context.close).toHaveBeenCalledOnce();
    expect([...fake.gains, ...fake.oscillators, ...fake.bufferSources]
      .every((node) => vi.mocked(node.disconnect).mock.calls.length > 0)).toBe(true);
  });

  test('releases completed one-shot nodes and stopped ambience instead of retaining them', async () => {
    const fake = createFakeContext();
    const director = new AudioDirector({ contextFactory: () => fake.context });
    await director.activateFromUserGesture();

    for (let index = 0; index < 3; index += 1) director.playCue('reveal');
    const oneShotGains = fake.gains.slice(5);
    for (const node of [...fake.oscillators, ...fake.bufferSources]) endNode(node);

    expect([...fake.oscillators, ...fake.bufferSources, ...oneShotGains]
      .every((node) => vi.mocked(node.disconnect).mock.calls.length === 1)).toBe(true);
    expect(fake.bufferSources.every((node) => node.buffer === null)).toBe(true);

    const disconnectCounts = [...fake.oscillators, ...fake.bufferSources, ...oneShotGains]
      .map((node) => vi.mocked(node.disconnect).mock.calls.length);
    await director.dispose();
    expect([...fake.oscillators, ...fake.bufferSources, ...oneShotGains]
      .map((node) => vi.mocked(node.disconnect).mock.calls.length)).toEqual(disconnectCounts);

    const ambienceFake = createFakeContext();
    const ambience = new AudioDirector({ contextFactory: () => ambienceFake.context });
    await ambience.activateFromUserGesture();
    for (let index = 0; index < 3; index += 1) {
      ambience.setAmbienceEnabled(true);
      ambience.setAmbienceEnabled(false);
    }
    expect(ambienceFake.bufferSources).toHaveLength(3);
    expect(ambienceFake.bufferSources.every((node) => (
      vi.mocked(node.disconnect).mock.calls.length === 1 && node.buffer === null
    ))).toBe(true);
    await ambience.dispose();
    expect(ambienceFake.bufferSources.every((node) => (
      vi.mocked(node.disconnect).mock.calls.length === 1
    ))).toBe(true);
  });

  test('does not activate after a deferred resume is disposed and shares concurrent disposal', async () => {
    const fake = createFakeContext();
    const resume = deferred();
    const close = deferred();
    fake.context.resume = vi.fn(() => resume.promise);
    fake.context.close = vi.fn(() => close.promise);
    const director = new AudioDirector({
      contextFactory: () => fake.context,
      preferences: { ...DEFAULT_AUDIO_PREFERENCES, ambienceEnabled: true },
    });

    const activation = director.activateFromUserGesture();
    const firstDispose = director.dispose();
    const secondDispose = director.dispose();
    expect(firstDispose).toBe(secondDispose);
    expect(fake.context.close).toHaveBeenCalledOnce();

    resume.resolve();
    expect(await activation).toBe(false);
    expect(fake.bufferSources).toHaveLength(0);

    let secondFinished = false;
    void secondDispose.then(() => { secondFinished = true; });
    await Promise.resolve();
    expect(secondFinished).toBe(false);
    close.resolve();
    await Promise.all([firstDispose, secondDispose]);
    expect(secondFinished).toBe(true);
  });

  test('does not activate or start ambience when visibility becomes hidden during resume', async () => {
    const fake = createFakeContext();
    const resume = deferred();
    fake.context.resume = vi.fn(() => resume.promise);
    const visibility = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const director = new AudioDirector({
      contextFactory: () => fake.context,
      visibility,
      preferences: { ...DEFAULT_AUDIO_PREFERENCES, ambienceEnabled: true },
    });

    const activation = director.activateFromUserGesture();
    visibility.hidden = true;
    resume.resolve();

    expect(await activation).toBe(false);
    expect(fake.context.suspend).toHaveBeenCalledOnce();
    expect(fake.bufferSources).toHaveLength(0);
    await director.dispose();
  });

  test('deactivates synchronously and ignores public audio mutations while close is deferred', async () => {
    const fake = createFakeContext();
    const close = deferred();
    fake.context.close = vi.fn(() => close.promise);
    const director = new AudioDirector({ contextFactory: () => fake.context });
    await director.activateFromUserGesture();

    const initialGainCount = fake.gains.length;
    const initialOscillatorCount = fake.oscillators.length;
    const initialSourceCount = fake.bufferSources.length;
    const duckGain = fake.gains[1]?.gain as AudioParamPort;
    const initialDuckRamps = vi.mocked(duckGain.linearRampToValueAtTime).mock.calls.length;
    const initialResumes = vi.mocked(fake.context.resume).mock.calls.length;
    const disposal = director.dispose();

    director.playCue('reveal');
    director.updatePreferences({ ...DEFAULT_AUDIO_PREFERENCES, ambienceEnabled: true });
    director.setAmbienceEnabled(true);
    director.setNativeAudioActive(true);
    await director.handleVisibilityChange(false);

    expect(fake.gains).toHaveLength(initialGainCount);
    expect(fake.oscillators).toHaveLength(initialOscillatorCount);
    expect(fake.bufferSources).toHaveLength(initialSourceCount);
    expect(duckGain.linearRampToValueAtTime).toHaveBeenCalledTimes(initialDuckRamps);
    expect(fake.context.resume).toHaveBeenCalledTimes(initialResumes);

    close.resolve();
    await disposal;
  });

  test('cleans partial ambience connect and start failures without retaining sources', async () => {
    for (const failure of ['connect', 'start'] as const) {
      const fake = createFakeContext();
      const originalCreateSource = fake.context.createBufferSource;
      fake.context.createBufferSource = vi.fn(() => {
        const source = originalCreateSource();
        source[failure] = vi.fn(() => { throw new Error(`${failure} failed`); });
        return source;
      });
      const director = new AudioDirector({ contextFactory: () => fake.context });
      await director.activateFromUserGesture();

      director.setAmbienceEnabled(true);
      const source = fake.bufferSources[0];
      expect(source).toBeDefined();
      expect(source?.buffer).toBeNull();
      expect(source?.disconnect).toHaveBeenCalledOnce();

      await director.dispose();
      expect(source?.disconnect).toHaveBeenCalledOnce();
    }
  });

  test('cleans partial noise-burst start failures without retaining transient nodes', async () => {
    const fake = createFakeContext();
    const originalCreateSource = fake.context.createBufferSource;
    fake.context.createBufferSource = vi.fn(() => {
      const source = originalCreateSource();
      source.start = vi.fn(() => { throw new Error('start failed'); });
      return source;
    });
    const director = new AudioDirector({ contextFactory: () => fake.context });
    await director.activateFromUserGesture();

    director.playCue('reveal');
    const transientGains = fake.gains.slice(5);
    expect(fake.bufferSources[0]?.buffer).toBeNull();
    expect([...fake.oscillators, ...fake.bufferSources, ...transientGains]
      .every((node) => vi.mocked(node.disconnect).mock.calls.length === 1)).toBe(true);

    await director.dispose();
    expect([...fake.oscillators, ...fake.bufferSources, ...transientGains]
      .every((node) => vi.mocked(node.disconnect).mock.calls.length === 1)).toBe(true);
  });

  test('cleans and closes a partially constructed mix graph', async () => {
    const fake = createFakeContext();
    const originalCreateGain = fake.context.createGain;
    let gainCalls = 0;
    fake.context.createGain = vi.fn(() => {
      gainCalls += 1;
      if (gainCalls === 3) throw new Error('mix graph failed');
      return originalCreateGain();
    });
    const director = new AudioDirector({ contextFactory: () => fake.context });

    expect(await director.activateFromUserGesture()).toBe(false);
    expect(fake.gains).toHaveLength(2);
    expect(fake.gains.every((node) => vi.mocked(node.disconnect).mock.calls.length === 1)).toBe(true);
    expect(fake.context.close).toHaveBeenCalledOnce();

    await director.dispose();
    expect(fake.gains.every((node) => vi.mocked(node.disconnect).mock.calls.length === 1)).toBe(true);
    expect(fake.context.close).toHaveBeenCalledOnce();
  });
});
