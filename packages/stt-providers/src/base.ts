// packages/stt-providers/src/base.ts
// Every STT adapter implements this interface.
// Adding a new provider = implement this, register in index.ts. Nothing else changes.

export interface TranscriptSegment {
  /** The transcribed text for this segment */
  text: string;

  /**
   * true = final result, run verse detection
   * false = interim/partial result, only use for live transcript display
   */
  isFinal: boolean;

  /** Provider confidence, 0.0–1.0 (not all providers supply this) */
  confidence?: number;

  timestampMs?: number;
}

export interface ISTTProvider {
  /** Human-readable name shown in the Settings UI dropdown */
  readonly name: string;

  /**
   * Short snake_case identifier stored in settings.
   * e.g. 'deepgram', 'whisper', 'assemblyai'
   */
  readonly id: string;

  /**
   * Connect to the STT service using the provided API key.
   * Should throw a descriptive Error if the key is invalid or the
   * service is unreachable. Called before startStreaming().
   */
  connect(apiKey: string): Promise<void>;

  /**
   * Begin streaming. The provider calls onTranscript for every
   * partial and final segment as they arrive.
   * Audio chunks are delivered separately via sendAudio().
   */
  startStreaming(
    onTranscript: (segment: TranscriptSegment) => void,
    onError: (error: Error) => void
  ): void;

  /**
   * Send a raw audio chunk (PCM s16le, 16kHz, mono) to the provider.
   * Called by audio.ts on every Buffer emission.
   */
  sendAudio(chunk: Buffer): void;

  /** Stop streaming and release the connection */
  stopStreaming(): void;

  /** Full teardown — called on app quit or provider switch */
  disconnect(): void;
}
