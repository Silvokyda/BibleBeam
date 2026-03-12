// packages/stt-providers/src/groq.ts
// Groq Whisper STT adapter.
// Groq runs Whisper at very high speed — typically <1s per chunk.
// Free tier: 7,200 seconds of audio per day. More than enough for weekly services.
// Get a key at: https://console.groq.com

import type { ISTTProvider, TranscriptSegment } from './base';
import { Writable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Groq does not support true streaming like Deepgram.
// Instead we buffer audio into fixed-size chunks and send each one.
// CHUNK_MS controls latency vs accuracy tradeoff:
//   lower = faster display, but less context for Whisper to work with
//   higher = better accuracy, slightly more delay
const CHUNK_MS     = 4000;  // 4 seconds per chunk — good balance for sermons
const SAMPLE_RATE  = 16000;
const CHANNELS     = 1;
const BYTES_PER_SAMPLE = 2; // s16le
const CHUNK_BYTES  = (SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * CHUNK_MS) / 1000;

export class GroqProvider implements ISTTProvider {
  readonly name = 'Groq (Whisper)';
  readonly id   = 'groq';

  private apiKey: string = '';
  private groq: any = null;
  private buffer: Buffer[] = [];
  private bufferSize = 0;
  private streaming = false;
  private onTranscript: ((seg: TranscriptSegment) => void) | null = null;
  private onError: ((err: Error) => void) | null = null;

  async connect(apiKey: string): Promise<void> {
    const { Groq } = await import('groq-sdk' as any);
    this.groq = new Groq({ apiKey });
    this.apiKey = apiKey;

    // Lightweight validation — list models to confirm key works
    try {
      await this.groq.models.list();
    } catch (err: any) {
      throw new Error(`Groq API key invalid or unreachable: ${err?.message}`);
    }
  }

  startStreaming(
    onTranscript: (segment: TranscriptSegment) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.groq) {
      onError(new Error('GroqProvider.connect() must be called before startStreaming()'));
      return;
    }
    this.onTranscript = onTranscript;
    this.onError      = onError;
    this.streaming    = true;
    this.buffer       = [];
    this.bufferSize   = 0;
  }

  sendAudio(chunk: Buffer): void {
    if (!this.streaming) return;

    this.buffer.push(chunk);
    this.bufferSize += chunk.length;

    if (this.bufferSize >= CHUNK_BYTES) {
      const audioData = Buffer.concat(this.buffer);
      this.buffer     = [];
      this.bufferSize = 0;
      this._transcribeChunk(audioData);
    }
  }

  private async _transcribeChunk(pcmData: Buffer): Promise<void> {
    if (!this.groq || !this.onTranscript || !this.onError) return;

    // Groq expects a file upload. We write a temp WAV file from raw PCM,
    // then send it. WAV header is minimal but valid.
    const tmpFile = path.join(os.tmpdir(), `bb_chunk_${Date.now()}.wav`);

    try {
      const wav = pcmToWav(pcmData, SAMPLE_RATE, CHANNELS);
      fs.writeFileSync(tmpFile, wav);

      const transcription = await this.groq.audio.transcriptions.create({
        file:     fs.createReadStream(tmpFile),
        model:    'whisper-large-v3-turbo',
        language: 'en',
      });

      const text = transcription?.text?.trim();
      if (text) {
        this.onTranscript({
          text,
          isFinal:    true,
          timestampMs: Date.now(),
        });
      }
    } catch (err: any) {
      this.onError?.(new Error(`Groq transcription error: ${err?.message}`));
    } finally {
      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }

  stopStreaming(): void {
    this.streaming    = false;
    this.onTranscript = null;
    this.onError      = null;
    this.buffer       = [];
    this.bufferSize   = 0;
  }

  disconnect(): void {
    this.stopStreaming();
    this.groq   = null;
    this.apiKey = '';
  }
}

// ── Minimal PCM → WAV converter ───────────────────────────────────────────────
// Groq needs an audio file, not raw PCM. We build a valid WAV header.

function pcmToWav(pcm: Buffer, sampleRate: number, channels: number): Buffer {
  const byteRate    = sampleRate * channels * BYTES_PER_SAMPLE;
  const blockAlign  = channels * BYTES_PER_SAMPLE;
  const dataSize    = pcm.length;
  const header      = Buffer.alloc(44);

  header.write('RIFF',           0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE',           8);
  header.write('fmt ',          12);
  header.writeUInt32LE(16,      16); // PCM chunk size
  header.writeUInt16LE(1,       20); // PCM format
  header.writeUInt16LE(channels,22);
  header.writeUInt32LE(sampleRate,  24);
  header.writeUInt32LE(byteRate,    28);
  header.writeUInt16LE(blockAlign,  32);
  header.writeUInt16LE(16,          34); // bits per sample
  header.write('data',              36);
  header.writeUInt32LE(dataSize,    40);

  return Buffer.concat([header, pcm]);
}