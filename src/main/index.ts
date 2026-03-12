// src/main/index.ts
// Full pipeline: audio → STT → verse matcher → projector
// Merged from main-index.ts — this is the single main entry point.

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { audioCapture } from './audio';
import { IPC } from './ipc';
import type { SettingsPayload, ProjectorPayload } from './ipc';
import { keychain } from './keychain';
import { startDisplayServer, broadcastVerse, broadcastClear, stopDisplayServer } from './websocket';

// ── These imports are commented out until the packages are built ──
// import { GroqProvider } from '../../packages/stt-providers/src/groq';
// import { firstWords, buildFuzzyIndex } from '../../packages/verse-matcher/src/fuzzy';
// import { detectVerse } from '../../packages/verse-matcher/src/pipeline';
// import KJV from '../../packages/bible-data/translations/kjv.json';

let operatorWindow:  BrowserWindow | null = null;
let projectorWindow: BrowserWindow | null = null;

// Active STT provider — swappable via settings
let sttProvider: any = null;

// Settings state
let settings: SettingsPayload = {
  sttProvider:             'deepgram',
  translation:             'KJV',
  confidenceThreshold:     0.9,
  semanticMatchingEnabled: false,
  autoDisplay:             true,
};

// ─── Window creation ──────────────────────────────────────────────────────────

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
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/operator',
    });
  }

  win.on('closed', () => {
    operatorWindow = null;
    if (projectorWindow && !projectorWindow.isDestroyed()) {
      projectorWindow.close();
    }
  });

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

  win.on('closed', () => {
    projectorWindow = null;
  });

  return win;
}

// ─── Boot sequence ────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  // TODO: Build fuzzy verse index from KJV on startup
  // Once bible-data package is ready, uncomment:
  //
  // const entries = Object.entries(KJV).flatMap(([book, chapters]: [string, any]) =>
  //   Object.entries(chapters).flatMap(([chapter, verses]: [string, any]) =>
  //     Object.entries(verses).map(([verse, text]: [string, any]) => ({
  //       ref: { book, chapter: parseInt(chapter), verse: parseInt(verse) },
  //       firstLine: firstWords(text as string, 8),
  //     }))
  //   )
  // );
  // buildFuzzyIndex(entries);
  // console.log(`[BibleBeam] Fuzzy index built: ${entries.length} verses`);

  startDisplayServer(7700);
  console.log('[BibleBeam] Boot complete');
}

// ─── STT provider management ─────────────────────────────────────────────────

async function startSTT(): Promise<void> {
  const apiKey = await keychain.get('groq-api-key');
  if (!apiKey) {
    operatorWindow?.webContents.send('audio:error',
      'No API key saved. Go to Settings to add your key.');
    return;
  }

  // TODO: Wire STT provider once packages/stt-providers is built
  // sttProvider = new GroqProvider();
  // await sttProvider.connect(apiKey);
  // sttProvider.startStreaming(onTranscript, onError);

  // For now, just start audio capture so we can verify the pipeline
  audioCapture.start();
  console.log('[BibleBeam] Audio capture started (STT not yet wired)');
}

function stopSTT(): void {
  audioCapture.stop();
  sttProvider?.stopStreaming?.();
  sttProvider = null;
}

// ─── Bible lookup (placeholder until bible-data package) ──────────────────────

function lookupVerse(_book: string, _chapter: number, _verse: number): string | null {
  // TODO: implement once KJV JSON is loaded
  return null;
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle(IPC.AUDIO_START, async () => {
  await startSTT();
  return { ok: true };
});

ipcMain.handle(IPC.AUDIO_STOP, () => {
  stopSTT();
  return { ok: true };
});

ipcMain.handle(IPC.VERSE_APPROVED, (_event, payload: ProjectorPayload) => {
  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, payload);
  broadcastVerse(payload);
});

ipcMain.handle(IPC.VERSE_CLEAR, () => {
  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, null);
  broadcastClear();
});

ipcMain.handle(IPC.VERSE_OVERRIDE, async (_event, { reference }: { reference: string }) => {
  // TODO: wire to verse-matcher regex once package exists
  // const { detectExplicitReference } = await import('../../packages/verse-matcher/src/regex');
  // const ref = detectExplicitReference(reference);
  // if (!ref) return;
  // const verseText = lookupVerse(ref.book, ref.chapter, ref.verse);

  // For now, echo the reference back as a placeholder
  const payload: ProjectorPayload = {
    reference,
    verseText: `[lookup not yet implemented for "${reference}"]`,
    translation: settings.translation,
  };

  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, payload);
  broadcastVerse(payload);
  operatorWindow?.webContents.send(IPC.VERSE_DETECTED, {
    ...payload, confidence: 1.0, method: 'regex' as const,
  });
});

ipcMain.handle(IPC.SETTINGS_GET_KEY, async (_e, keyName: string) => {
  return keychain.get(keyName);
});

ipcMain.handle(IPC.SETTINGS_SET_KEY, async (_e, keyName: string, value: string) => {
  await keychain.set(keyName, value);
  return { ok: true };
});

ipcMain.handle(IPC.SETTINGS_GET, () => settings);

ipcMain.handle(IPC.SETTINGS_SET, (_e, s: SettingsPayload) => {
  settings = { ...settings, ...s };
  return { ok: true };
});

// ─── Audio data forwarding ────────────────────────────────────────────────────

audioCapture.on('data', (chunk: Buffer) => {
  sttProvider?.sendAudio?.(chunk);
});

audioCapture.on('error', (err: Error) => {
  console.error('[Audio]', err.message);
  operatorWindow?.webContents.send('audio:error', err.message);
});

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await boot();
  operatorWindow  = createOperatorWindow();
  projectorWindow = createProjectorWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      operatorWindow = createOperatorWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopSTT();
  stopDisplayServer();
  if (process.platform !== 'darwin') app.quit();
});
