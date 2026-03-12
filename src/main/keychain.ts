// src/main/keychain.ts
// Credential storage — uses a simple in-memory store for development.
// TODO: Replace with keytar for production (requires libsecret-1-dev on Linux)

const store = new Map<string, string>();

export const keychain = {
  get: async (account: string): Promise<string | null> => {
    return store.get(account) ?? null;
  },
  set: async (account: string, value: string): Promise<void> => {
    store.set(account, value);
  },
  delete: async (account: string): Promise<boolean> => {
    return store.delete(account);
  },
};

export const KEYS = {
  DEEPGRAM:   'deepgram-api-key',
  WHISPER:    'whisper-api-key',
  ASSEMBLYAI: 'assemblyai-api-key',
  GROQ:       'groq-api-key',
  ESV:        'esv-api-key',
} as const;
