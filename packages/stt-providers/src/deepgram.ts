// packages/stt-providers/src/deepgram.ts
// Deepgram streaming STT adapter.
// Free tier: $200 credit — effectively unlimited for weekly church use.
// Get a key at: https://console.deepgram.com

import type { ISTTProvider, TranscriptSegment } from './base';

// Deepgram SDK is a peer dependency — install: pnpm add @deepgram/sdk
// Typed loosely here so this file compiles without the SDK during CI tests
type DeepgramClient = any;
type LiveClient = any;

export class DeepgramProvider implements ISTTProvider {
  readonly name = 'Deepgram';
  readonly id   = 'deepgram';

  private client: DeepgramClient | null = null;
  private live:   LiveClient | null = null;

  async connect(apiKey: string): Promise<void> {
    // Lazy-require so the app doesn't break if the SDK isn't installed yet
    const { createClient } = await import('@deepgram/sdk' as any);
    this.client = createClient(apiKey);

    // Validate the key with a lightweight API call
    const { error } = await this.client.manage.getProjects();
    if (error) {
      throw new Error(`Deepgram key invalid: ${error.message}`);
    }
  }

  startStreaming(
    onTranscript: (segment: TranscriptSegment) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.client) {
      onError(new Error('DeepgramProvider.connect() must be called before startStreaming()'));
      return;
    }

    this.live = this.client.listen.live({
      model:           'nova-2',
      language:        'en-US',
      encoding:        'linear16',
      sample_rate:     16000,
      channels:        1,
      interim_results: true,
      punctuate:       true,
      smart_format:    true,
    });

    this.live.on('Results', (data: any) => {
      const alt = data?.channel?.alternatives?.[0];
      if (!alt) return;

      onTranscript({
        text:       alt.transcript,
        isFinal:    data.is_final === true,
        confidence: alt.confidence,
        timestampMs: Date.now(),
      });
    });

    this.live.on('error', (err: any) => {
      onError(new Error(`Deepgram error: ${err?.message ?? JSON.stringify(err)}`));
    });

    this.live.on('close', () => {
      // Auto-reconnect after a grace period (Deepgram drops idle connections)
      setTimeout(() => {
        if (this.client) {
          this.startStreaming(onTranscript, onError);
        }
      }, 2000);
    });
  }

  sendAudio(chunk: Buffer): void {
    if (this.live?.getReadyState() === 1 /* OPEN */) {
      this.live.send(chunk);
    }
  }

  stopStreaming(): void {
    this.live?.finish();
    this.live = null;
  }

  disconnect(): void {
    this.stopStreaming();
    this.client = null;
  }
}
