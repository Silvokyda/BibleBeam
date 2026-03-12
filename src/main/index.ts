// src/main/index.ts
// Electron main process.
// Manages windows, wires audio → STT → verse matcher → projector.

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { IPC } from './ipc';
import type { SettingsPayload, ProjectorPayload } from './ipc';
import { audioCapture } from './audio';
import { startDisplayServer, broadcastVerse, broadcastClear, stopDisplayServer } from './websocket';
import { keychain, KEYS } from './keychain';

let operatorWindow: BrowserWindow | null = null;
let projectorWindow: BrowserWindow | null = null;

// ─── Window creation ─────────────────────────────────────────────────────────

function createOperatorWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'BibleBeam',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:9080/#/operator');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/operator',
    });
  }

  return win;
}

function createProjectorWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    backgroundColor: '#000000',
    title: 'BibleBeam — Projector',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:9080/#/projector');
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/projector',
    });
  }

  return win;
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  operatorWindow = createOperatorWindow();
  projectorWindow = createProjectorWindow();

  startDisplayServer(7700);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      operatorWindow = createOperatorWindow();
    }
  });
});

app.on('window-all-closed', () => {
  audioCapture.stop();
  stopDisplayServer();
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC handlers ─────────────────────────────────────────────────────────────

// Audio control
ipcMain.handle(IPC.AUDIO_START, () => {
  audioCapture.start();
  return { ok: true };
});

ipcMain.handle(IPC.AUDIO_STOP, () => {
  audioCapture.stop();
  return { ok: true };
});

// Verse approved by operator — push to projector + network
ipcMain.handle(IPC.VERSE_APPROVED, (_event, payload: ProjectorPayload) => {
  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, payload);
  broadcastVerse(payload);
});

// Verse cleared
ipcMain.handle(IPC.VERSE_CLEAR, () => {
  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, null);
  broadcastClear();
});

// Settings — read
ipcMain.handle(IPC.SETTINGS_GET_KEY, async (_event, keyName: string) => {
  return keychain.get(keyName);
});

// Settings — write
ipcMain.handle(IPC.SETTINGS_SET_KEY, async (_event, keyName: string, value: string) => {
  await keychain.set(keyName, value);
  return { ok: true };
});

// Audio data → pipe to active STT provider
// (STT wiring is added in Phase 1 Task 1.5 when Deepgram adapter is built)
audioCapture.on('data', (_chunk: Buffer) => {
  // TODO: forward chunk to active ISTTProvider
});

audioCapture.on('error', (err: Error) => {
  console.error('[Audio]', err.message);
  operatorWindow?.webContents.send('audio:error', err.message);
});
