// src/main/audio.ts
// Captures mic / line-in audio and emits Buffer chunks.
// Primary: PulseAudio (parecord) for Linux.
// Fallback: sox for macOS and Windows.

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface AudioCaptureEvents {
  data: (chunk: Buffer) => void;
  error: (err: Error) => void;
  start: () => void;
  stop: () => void;
}

class AudioCapture extends EventEmitter {
  private process: ChildProcess | null = null;
  private running = false;

  get isRunning() {
    return this.running;
  }

  start(): void {
    if (this.running) return;

    const platform = process.platform;
    let child: ChildProcess;

    if (platform === 'linux') {
      // PulseAudio — works on both PulseAudio and PipeWire (via compat layer)
      child = spawn('parecord', [
        '--format=s16le',
        '--rate=16000',
        '--channels=1',
        '--raw',
      ]);
    } else if (platform === 'darwin' || platform === 'win32') {
      // sox — install: brew install sox (mac) or download from sourceforge (win)
      child = spawn('sox', [
        '-d',                 // default audio input device
        '-t', 'raw',
        '-r', '16000',
        '-e', 'signed',
        '-b', '16',
        '-c', '1',
        '-',                  // output to stdout
      ]);
    } else {
      this.emit('error', new Error(`Unsupported platform: ${platform}`));
      return;
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      this.emit('data', chunk);
    });

    child.stderr?.on('data', (data: Buffer) => {
      // parecord writes connection info to stderr — not an error
      const msg = data.toString();
      if (msg.includes('Error') || msg.includes('error')) {
        this.emit('error', new Error(msg));
      }
    });

    child.on('error', (err) => {
      this.emit('error', new Error(
        `Audio capture failed to start. Is parecord/sox installed?\n${err.message}`
      ));
    });

    child.on('exit', (code) => {
      if (this.running && code !== 0) {
        this.emit('error', new Error(`Audio process exited with code ${code}`));
      }
      this.running = false;
      this.emit('stop');
    });

    this.process = child;
    this.running = true;
    this.emit('start');
  }

  stop(): void {
    if (!this.running || !this.process) return;
    this.process.kill('SIGTERM');
    this.process = null;
    this.running = false;
    this.emit('stop');
  }
}

// Singleton — one audio capture per app instance
export const audioCapture = new AudioCapture();
