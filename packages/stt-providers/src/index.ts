// packages/stt-providers/src/index.ts
export type { ISTTProvider, TranscriptSegment } from './base';
export { GroqProvider } from './groq';
export { DeepgramProvider } from './deepgram';

import type { ISTTProvider } from './base';
import { GroqProvider } from './groq';
import { DeepgramProvider } from './deepgram';

export type ProviderId = 'groq' | 'deepgram' | 'whisper' | 'assemblyai';

export function createProvider(id: ProviderId): ISTTProvider {
  switch (id) {
    case 'groq':     return new GroqProvider();
    case 'deepgram': return new DeepgramProvider();
    default:
      throw new Error(`Provider "${id}" is not yet implemented. Use Groq or Deepgram.`);
  }
}