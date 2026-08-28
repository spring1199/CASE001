'use client';

import { createContext, type ReactNode, useContext } from 'react';

type AudioPlaybackCallbacks = Readonly<{
  onPlaybackStart(): void;
  onPlaybackStop(): void;
}>;

const NO_AUDIO_PLAYBACK: AudioPlaybackCallbacks = Object.freeze({
  onPlaybackStart: () => undefined,
  onPlaybackStop: () => undefined,
});

const AudioPlaybackContext = createContext<AudioPlaybackCallbacks>(NO_AUDIO_PLAYBACK);

export function AudioPlaybackProvider({
  callbacks,
  children,
}: Readonly<{ callbacks: AudioPlaybackCallbacks; children: ReactNode }>) {
  return (
    <AudioPlaybackContext.Provider value={callbacks}>
      {children}
    </AudioPlaybackContext.Provider>
  );
}

export function useAudioPlayback(): AudioPlaybackCallbacks {
  return useContext(AudioPlaybackContext);
}
