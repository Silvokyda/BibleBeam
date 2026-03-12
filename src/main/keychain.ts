// src/main/keychain.ts
// Thin wrapper around keytar for OS-native credential storage.
// Keys are NEVER written to disk in plaintext.

import keytar from 'keytar';

const SERVICE = 'biblebeam';

export const keychain = {
  get: (account: string): Promise<string | null> =>
    keytar.getPassword(SERVICE, account),

  set: (account: string, value: string): Promise<void> =>
    keytar.setPassword(SERVICE, account, value),

  delete: (account: string): Promise<boolean> =>
    keytar.deletePassword(SERVICE, account),
};

// Named key accounts — use these constants instead of raw strings
export const KEYS = {
  DEEPGRAM:    'deepgram-api-key',
  WHISPER:     'whisper-api-key',
  ASSEMBLYAI:  'assemblyai-api-key',
  ESV:         'esv-api-key',
} as const;
