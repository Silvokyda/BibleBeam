// src/main/ipc.ts
// All IPC channel names in one place.

export const IPC = {
  // Audio control
  AUDIO_START:          'audio:start',
  AUDIO_STOP:           'audio:stop',
  AUDIO_STATUS:         'audio:status',
  AUDIO_GET_DEVICES:    'audio:get-devices',

  // Transcript
  TRANSCRIPT_UPDATE:    'transcript:update',

  // Verse lifecycle
  VERSE_DETECTED:       'verse:detected',
  VERSE_APPROVED:       'verse:approved',
  VERSE_REJECTED:       'verse:rejected',
  VERSE_OVERRIDE:       'verse:override',
  VERSE_CLEAR:          'verse:clear',

  // Projector
  PROJECTOR_UPDATE:     'projector:update',
  PROJECTOR_OPEN:       'projector:open',
  PROJECTOR_CLOSE:      'projector:close',
  PROJECTOR_STATUS:     'projector:status',

  // Settings
  SETTINGS_GET:         'settings:get',
  SETTINGS_SET:         'settings:set',
  SETTINGS_GET_KEY:     'settings:get-key',
  SETTINGS_SET_KEY:     'settings:set-key',
  SETTINGS_TEST_STT:    'settings:test-stt',

  // Theme
  THEME_GET:            'theme:get',
  THEME_SET:            'theme:set',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];

export interface TranscriptPayload {
  text: string;
  isFinal: boolean;
  timestampMs: number;
}

export interface VerseDetectedPayload {
  reference: string;
  confidence: number;
  method: 'regex' | 'fuzzy' | 'semantic';
  verseText?: string;
  translation?: string;
}

export interface ProjectorPayload {
  reference: string;
  verseText: string;
  translation: string;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface SettingsPayload {
  sttProvider: string;
  translation: 'KJV' | 'ASV' | 'WEB' | 'ESV';
  confidenceThreshold: number;
  semanticMatchingEnabled: boolean;
  autoDisplay: boolean;
  audioDevice?: string;
  theme: ThemeMode;
}