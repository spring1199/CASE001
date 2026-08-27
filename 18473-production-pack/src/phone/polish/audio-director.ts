import {
  DEFAULT_AUDIO_PREFERENCES,
  clampGain,
  type AudioPreferences,
} from '@/phone/polish/audio-preferences';

export type AudioCue = 'interface' | 'discovery' | 'reveal' | 'graph' | 'ending';

export interface AudioParamPort {
  value: number;
  cancelScheduledValues(time: number): void;
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, endTime: number): void;
  exponentialRampToValueAtTime(value: number, endTime: number): void;
}

export interface AudioNodePort {
  connect(destination: AudioNodePort): AudioNodePort;
  disconnect(): void;
}

export interface GainNodePort extends AudioNodePort {
  gain: AudioParamPort;
}

export interface OscillatorNodePort extends AudioNodePort {
  frequency: AudioParamPort;
  type: OscillatorType;
  onended: (() => void) | null;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface AudioBufferPort {
  getChannelData(channel: number): Float32Array;
}

export interface BufferSourceNodePort extends AudioNodePort {
  buffer: AudioBufferPort | null;
  loop: boolean;
  onended: (() => void) | null;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface AudioContextPort {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: AudioNodePort;
  readonly sampleRate: number;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
  createGain(): GainNodePort;
  createOscillator(): OscillatorNodePort;
  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBufferPort;
  createBufferSource(): BufferSourceNodePort;
}

export interface VisibilityPort {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export type AudioDirectorOptions = Readonly<{
  contextFactory?: () => AudioContextPort | null;
  visibility?: VisibilityPort | null;
  preferences?: AudioPreferences;
}>;

const CUE_SPEC: Readonly<Record<AudioCue, {
  category: 'interface' | 'reveal';
  frequency: number;
  duration: number;
  peak: number;
  noise: boolean;
}>> = {
  interface: { category: 'interface', frequency: 440, duration: 0.055, peak: 0.035, noise: false },
  discovery: { category: 'interface', frequency: 330, duration: 0.14, peak: 0.05, noise: true },
  reveal: { category: 'reveal', frequency: 196, duration: 0.42, peak: 0.07, noise: true },
  graph: { category: 'interface', frequency: 260, duration: 0.18, peak: 0.045, noise: false },
  ending: { category: 'reveal', frequency: 110, duration: 0.72, peak: 0.065, noise: true },
};

const defaultContextFactory = (): AudioContextPort | null => {
  if (typeof window === 'undefined') return null;
  const Context = window.AudioContext;
  if (Context === undefined) return null;
  return new Context() as unknown as AudioContextPort;
};

const defaultVisibility = (): VisibilityPort | null => (
  typeof document === 'undefined' ? null : document
);

export class AudioDirector {
  private readonly contextFactory: () => AudioContextPort | null;
  private readonly visibility: VisibilityPort | null;
  private readonly nodes = new Set<AudioNodePort>();
  private context: AudioContextPort | null = null;
  private masterGain: GainNodePort | null = null;
  private duckGain: GainNodePort | null = null;
  private interfaceGain: GainNodePort | null = null;
  private revealGain: GainNodePort | null = null;
  private ambienceGain: GainNodePort | null = null;
  private ambienceSource: BufferSourceNodePort | null = null;
  private preferences: AudioPreferences;
  private activated = false;
  private disposed = false;
  private disposePromise: Promise<void> | null = null;

  private readonly onVisibilityChange = () => {
    void this.handleVisibilityChange(this.visibility?.hidden ?? false);
  };

  constructor(options: AudioDirectorOptions = {}) {
    this.contextFactory = options.contextFactory ?? defaultContextFactory;
    this.visibility = options.visibility === undefined ? defaultVisibility() : options.visibility;
    this.preferences = options.preferences ?? { ...DEFAULT_AUDIO_PREFERENCES };
    this.visibility?.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  async activateFromUserGesture(): Promise<boolean> {
    if (this.disposed) return false;
    if (this.context === null) {
      try {
        this.context = this.contextFactory();
        if (this.context === null) return false;
        this.createMixGraph(this.context);
      } catch {
        this.context = null;
        return false;
      }
    }

    const context = this.context;
    try {
      if (context.state !== 'running') await context.resume();
      if (this.disposed || this.context !== context) return false;
      if (this.visibility?.hidden === true) {
        await context.suspend();
        return false;
      }
      this.activated = true;
      if (this.preferences.ambienceEnabled) this.startAmbience();
      return true;
    } catch {
      return false;
    }
  }

  updatePreferences(preferences: AudioPreferences): void {
    this.preferences = preferences;
    this.applyMixLevels();
    if (preferences.ambienceEnabled) this.startAmbience();
    else this.stopAmbience();
  }

  setAmbienceEnabled(enabled: boolean): void {
    this.updatePreferences({ ...this.preferences, ambienceEnabled: enabled });
  }

  playCue(cue: AudioCue): void {
    const context = this.context;
    if (!this.activated || context === null || this.preferences.mute) return;
    const spec = CUE_SPEC[cue];
    const destination = spec.category === 'reveal' ? this.revealGain : this.interfaceGain;
    if (destination === null) return;

    let oscillator: OscillatorNodePort | null = null;
    let envelope: GainNodePort | null = null;
    try {
      const now = context.currentTime;
      oscillator = this.track(context.createOscillator());
      envelope = this.track(context.createGain());
      const oneShotNodes = [oscillator, envelope] as const;
      oscillator.onended = () => this.releaseNodes(oneShotNodes);
      oscillator.type = cue === 'ending' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(spec.frequency, now);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(spec.peak, now + Math.min(0.025, spec.duration / 4));
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
      oscillator.connect(envelope);
      envelope.connect(destination);
      oscillator.start(now);
      oscillator.stop(now + spec.duration);
      if (spec.noise) this.playNoiseBurst(destination, spec.duration, spec.peak * 0.22);
    } catch {
      this.releaseNodes([oscillator, envelope]);
      // Audio is supplemental; presentation remains usable when a browser rejects a node operation.
    }
  }

  setNativeAudioActive(active: boolean): void {
    const context = this.context;
    const duck = this.duckGain;
    if (context === null || duck === null) return;
    const now = context.currentTime;
    const target = active ? 0.32 : 1;
    duck.gain.cancelScheduledValues(now);
    duck.gain.setValueAtTime(clampGain(duck.gain.value), now);
    duck.gain.linearRampToValueAtTime(target, now + (active ? 0.08 : 0.28));
  }

  async handleVisibilityChange(hidden: boolean): Promise<void> {
    if (!this.activated || this.context === null || this.disposed) return;
    try {
      if (hidden) await this.context.suspend();
      else await this.context.resume();
    } catch {
      // Visibility-driven audio lifecycle must never block the investigation UI.
    }
  }

  dispose(): Promise<void> {
    if (this.disposePromise !== null) return this.disposePromise;
    this.disposed = true;
    this.disposePromise = this.disposeResources();
    return this.disposePromise;
  }

  private async disposeResources(): Promise<void> {
    this.visibility?.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.stopAmbience();
    for (const node of this.nodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    this.nodes.clear();
    if (this.context !== null) {
      try { await this.context.close(); } catch { /* already closed */ }
    }
    this.context = null;
    this.masterGain = null;
    this.duckGain = null;
    this.interfaceGain = null;
    this.revealGain = null;
    this.ambienceGain = null;
    this.activated = false;
  }

  private createMixGraph(context: AudioContextPort): void {
    this.masterGain = this.track(context.createGain());
    this.duckGain = this.track(context.createGain());
    this.interfaceGain = this.track(context.createGain());
    this.revealGain = this.track(context.createGain());
    this.ambienceGain = this.track(context.createGain());

    this.masterGain.connect(context.destination);
    this.duckGain.connect(this.masterGain);
    this.interfaceGain.connect(this.duckGain);
    this.revealGain.connect(this.duckGain);
    this.ambienceGain.connect(this.duckGain);
    this.duckGain.gain.value = 1;
    this.applyMixLevels();
  }

  private applyMixLevels(): void {
    if (this.masterGain !== null) this.masterGain.gain.value = this.preferences.mute ? 0 : clampGain(this.preferences.master);
    if (this.interfaceGain !== null) this.interfaceGain.gain.value = clampGain(this.preferences.interface);
    if (this.revealGain !== null) this.revealGain.gain.value = clampGain(this.preferences.reveal);
    if (this.ambienceGain !== null) this.ambienceGain.gain.value = clampGain(this.preferences.ambience) * 0.16;
  }

  private startAmbience(): void {
    const context = this.context;
    const destination = this.ambienceGain;
    if (!this.activated || context === null || destination === null || this.ambienceSource !== null) return;
    try {
      const sampleCount = Math.max(1, Math.floor(context.sampleRate * 2));
      const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
      fillRestrainedNoise(buffer.getChannelData(0));
      const source = this.track(context.createBufferSource());
      source.buffer = buffer;
      source.loop = true;
      source.onended = () => {
        if (this.ambienceSource === source) this.ambienceSource = null;
        this.releaseNodes([source], source);
      };
      source.connect(destination);
      source.start();
      this.ambienceSource = source;
    } catch {
      this.ambienceSource = null;
    }
  }

  private stopAmbience(): void {
    if (this.ambienceSource === null) return;
    const source = this.ambienceSource;
    this.ambienceSource = null;
    source.onended = null;
    try { source.stop(); } catch { /* already stopped */ }
    this.releaseNodes([source], source);
  }

  private playNoiseBurst(destination: AudioNodePort, duration: number, peak: number): void {
    const context = this.context;
    if (context === null) return;
    const samples = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, samples, context.sampleRate);
    fillRestrainedNoise(buffer.getChannelData(0));
    const source = this.track(context.createBufferSource());
    const envelope = this.track(context.createGain());
    const oneShotNodes = [source, envelope] as const;
    source.onended = () => this.releaseNodes(oneShotNodes, source);
    const now = context.currentTime;
    source.buffer = buffer;
    envelope.gain.setValueAtTime(peak, now);
    envelope.gain.linearRampToValueAtTime(0, now + duration);
    source.connect(envelope);
    envelope.connect(destination);
    source.start(now);
    source.stop(now + duration);
  }

  private track<Node extends AudioNodePort>(node: Node): Node {
    this.nodes.add(node);
    return node;
  }

  private releaseNodes(
    nodes: readonly (AudioNodePort | null)[],
    bufferSource?: BufferSourceNodePort,
  ): void {
    if (bufferSource !== undefined) bufferSource.buffer = null;
    for (const node of nodes) {
      if (node === null || !this.nodes.delete(node)) continue;
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
  }
}

function fillRestrainedNoise(samples: Float32Array): void {
  let previous = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.985 + white * 0.015;
    samples[index] = previous * 0.35;
  }
}
