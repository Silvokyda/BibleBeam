// src/main/ipc.ts
// All IPC channel names in one place.
// Import this in both main and renderer to avoid string typos.

export const IPC = {
  // Audio control
  AUDIO_START:        'audio:start',
  AUDIO_STOP:         'audio:stop',
  AUDIO_STATUS:       'audio:status',

  // Transcript
  TRANSCRIPT_UPDATE:  'transcript:update',

  // Verse lifecycle
  VERSE_DETECTED:     'verse:detected',
  VERSE_APPROVED:     'verse:approved',
  VERSE_REJECTED:     'verse:rejected',
  VERSE_OVERRIDE:     'verse:override',
  VERSE_CLEAR:        'verse:clear',

  // Projector
  PROJECTOR_UPDATE:   'projector:update',

  // Settings
  SETTINGS_GET:       'settings:get',
  SETTINGS_SET:       'settings:set',
  SETTINGS_GET_KEY:   'settings:get-key',
  SETTINGS_SET_KEY:   'settings:set-key',
  SETTINGS_TEST_STT:  'settings:test-stt',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];

// Payload shapes for each channel
export interface TranscriptPayload {
  text: string;
  isFinal: boolean;
  timestampMs: number;
}

export interface VerseDetectedPayload {
  reference: string;       // e.g. "John 3:16"
  confidence: number;      // 0.0 – 1.0
  method: 'regex' | 'fuzzy' | 'semantic';
  verseText?: string;
  translation?: string;
}

export interface ProjectorPayload {
  reference: string;
  verseText: string;
  translation: string;
}

export interface SettingsPayload {
  sttProvider: 'deepgram' | 'whisper' | 'assemblyai';
  translation: 'KJV' | 'ASV' | 'WEB' | 'ESV';
  confidenceThreshold: number;
  semanticMatchingEnabled: boolean;
  autoDisplay: boolean;
}
