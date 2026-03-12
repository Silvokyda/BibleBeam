// packages/stt-providers/src/index.ts
// Provider registry — add new providers here.

export type { ISTTProvider, TranscriptSegment } from './base';
export { DeepgramProvider }  from './deepgram';
// export { WhisperProvider }   from './whisper';    // Phase 2
// export { AssemblyAIProvider } from './assemblyai'; // Phase 2

import type { ISTTProvider } from './base';
import { DeepgramProvider }  from './deepgram';

export type ProviderId = 'deepgram' | 'whisper' | 'assemblyai';

export const PROVIDERS: Record<ProviderId, () => ISTTProvider> = {
  deepgram:   () => new DeepgramProvider(),
  whisper:    () => { throw new Error('Whisper provider not yet implemented'); },
  assemblyai: () => { throw new Error('AssemblyAI provider not yet implemented'); },
};

export function createProvider(id: ProviderId): ISTTProvider {
  const factory = PROVIDERS[id];
  if (!factory) throw new Error(`Unknown STT provider: ${id}`);
  return factory();
}
