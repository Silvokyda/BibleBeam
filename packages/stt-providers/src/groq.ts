// packages/stt-providers/src/groq.ts
// Groq Whisper STT — buffers audio chunks, sends to Groq for transcription.
// Free tier: 7,200 seconds/day. More than enough for church use.
// Get a key at: https://console.groq.com

import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ISTTProvider, TranscriptSegment } from './base';

// Buffer config: 4 seconds of 16kHz mono s16le audio
const CHUNK_MS         = 4000;
const SAMPLE_RATE      = 16000;
const CHANNELS         = 1;
const BYTES_PER_SAMPLE = 2;
const CHUNK_BYTES      = (SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * CHUNK_MS) / 1000;

export class GroqProvider implements ISTTProvider {
  readonly name = 'Groq (Whisper)';
  readonly id   = 'groq';

  private groq: Groq | null = null;
  private buffer: Buffer[] = [];
  private bufferSize = 0;
  private streaming = false;
  private processing = false;
  private onTranscript: ((seg: TranscriptSegment) => void) | null = null;
  private onError: ((err: Error) => void) | null = null;

  async connect(apiKey: string): Promise<void> {
    this.groq = new Groq({ apiKey });

    // Validate key — list models to confirm it works
    try {
      await this.groq.models.list();
      console.log('[Groq] API key valid');
    } catch (err: any) {
      this.groq = null;
      if (err?.status === 401 || err?.message?.includes('401')) {
        throw new Error('Invalid Groq API key. Check it in Settings.');
      }
      throw new Error(`Cannot reach Groq API: ${err?.message || err}`);
    }
  }

  startStreaming(
    onTranscript: (segment: TranscriptSegment) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.groq) {
      onError(new Error('Call connect() before startStreaming()'));
      return;
    }
    this.onTranscript = onTranscript;
    this.onError      = onError;
    this.streaming    = true;
    this.buffer       = [];
    this.bufferSize   = 0;
    console.log('[Groq] Streaming started — buffering audio');
  }

  sendAudio(chunk: Buffer): void {
    if (!this.streaming) return;

    this.buffer.push(chunk);
    this.bufferSize += chunk.length;

    // When we have enough audio, transcribe it
    if (this.bufferSize >= CHUNK_BYTES && !this.processing) {
      const audioData = Buffer.concat(this.buffer);
      this.buffer     = [];
      this.bufferSize = 0;
      this.transcribeChunk(audioData);
    }
  }

  stopStreaming(): void {
    // Flush remaining buffer if substantial
    if (this.bufferSize >= CHUNK_BYTES / 2 && !this.processing) {
      const audioData = Buffer.concat(this.buffer);
      this.transcribeChunk(audioData);
    }

    this.streaming    = false;
    this.buffer       = [];
    this.bufferSize   = 0;
    console.log('[Groq] Streaming stopped');
  }

  disconnect(): void {
    this.stopStreaming();
    this.onTranscript = null;
    this.onError      = null;
    this.groq         = null;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async transcribeChunk(pcmData: Buffer): Promise<void> {
    if (!this.groq || !this.onTranscript) return;
    this.processing = true;

    const tmpFile = path.join(os.tmpdir(), `biblebeam_${Date.now()}.wav`);

    try {
      // Convert raw PCM to WAV (Groq needs a file upload)
      const wav = pcmToWav(pcmData, SAMPLE_RATE, CHANNELS);
      fs.writeFileSync(tmpFile, wav);

      const result = await this.groq.audio.transcriptions.create({
        file:     fs.createReadStream(tmpFile),
        model:    'whisper-large-v3-turbo',
        language: 'en',
      });

      const text = result?.text?.trim();
      if (text) {
        this.onTranscript({
          text,
          isFinal: true,
          timestampMs: Date.now(),
        });
      }
    } catch (err: any) {
      console.error('[Groq] Transcription error:', err?.message || err);
      this.onError?.(new Error(`Transcription failed: ${err?.message || err}`));
    } finally {
      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch {}
      this.processing = false;
    }
  }
}

// ── PCM → WAV ─────────────────────────────────────────────────────────────────

function pcmToWav(pcm: Buffer, sampleRate: number, channels: number): Buffer {
  const bytesPerSample = 2;
  const byteRate   = sampleRate * channels * bytesPerSample;
  const blockAlign = channels * bytesPerSample;
  const dataSize   = pcm.length;
  const header     = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);            // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);           // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}