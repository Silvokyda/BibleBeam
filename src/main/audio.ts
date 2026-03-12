// src/main/audio.ts
// Captures mic / line-in audio and emits Buffer chunks.
// Uses parecord (PulseAudio/PipeWire compat) on Linux.
// Device name comes from Settings — defaults to system default mic.

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export class AudioCapture extends EventEmitter {
  private process: ChildProcess | null = null;
  private running = false;

  get isRunning() {
    return this.running;
  }

  start(deviceName?: string): void {
    if (this.running) return;

    const platform = process.platform;
    let child: ChildProcess;

    if (platform === 'linux') {
      // PipeWire exposes PulseAudio compat — parecord works on both
      const args = [
        '--format=s16le',
        '--rate=16000',
        '--channels=1',
        '--raw',
      ];

      // If a specific device is given, use it. Otherwise parecord picks default.
      // deviceName comes from pactl list sources short output.
      // Example: 'alsa_input.pci-0000_00_1f.3-platform-skl_hda_dsp_generic.HiFi__Mic1__source'
      if (deviceName) {
        args.push(`--device=${deviceName}`);
      }

      child = spawn('parecord', args);

    } else if (platform === 'darwin' || platform === 'win32') {
      child = spawn('sox', [
        '-d',
        '-t', 'raw',
        '-r', '16000',
        '-e', 'signed',
        '-b', '16',
        '-c', '1',
        '-',
      ]);
    } else {
      this.emit('error', new Error(`Unsupported platform: ${platform}`));
      return;
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      this.emit('data', chunk);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString();
      // parecord writes harmless connection info to stderr — ignore unless error
      if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed')) {
        this.emit('error', new Error(`Audio capture: ${msg.trim()}`));
      }
    });

    child.on('error', (err) => {
      this.emit('error', new Error(
        `Failed to start audio capture. Is parecord installed?\n${err.message}`
      ));
    });

    child.on('exit', (code) => {
      if (this.running && code !== 0 && code !== null) {
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

export const audioCapture = new AudioCapture();