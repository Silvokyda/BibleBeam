// src/main/index.ts
// Full working pipeline: audio → Groq STT → verse detection → KJV lookup → projector
import { File as NodeFile } from 'node:buffer';
if (!('File' in globalThis)) {
  (globalThis as any).File = NodeFile;
}

import { app, BrowserWindow, ipcMain, screen, nativeTheme } from 'electron';
import { execSync } from 'child_process';
import path from 'path';
import { audioCapture } from './audio';
import { IPC } from './ipc';
import type { SettingsPayload, ProjectorPayload, AudioDevice, ThemeMode } from './ipc';
import { keychain } from './keychain';
import { startDisplayServer, broadcastVerse, broadcastClear, stopDisplayServer } from './websocket';

// Pipeline imports — using your existing packages
import { createProvider } from '../../packages/stt-providers/src/index';
import type { ISTTProvider, TranscriptSegment } from '../../packages/stt-providers/src/base';
import { detectVerse } from '../../packages/verse-matcher/src/pipeline';
import { detectExplicitReference, formatReference } from '../../packages/verse-matcher/src/regex';
import { buildFuzzyIndex, firstWords } from '../../packages/verse-matcher/src/fuzzy';
import { loadTranslation, getVerse } from '../../packages/bible-data/src/index';
import type { BibleData } from '../../packages/bible-data/src/index';

let operatorWindow:  BrowserWindow | null = null;
let projectorWindow: BrowserWindow | null = null;

// Pipeline state
let sttProvider: ISTTProvider | null = null;
let bibleData: BibleData | null = null;

let settings: SettingsPayload = {
  sttProvider:             'groq',
  translation:             'KJV',
  confidenceThreshold:     0.9,
  semanticMatchingEnabled: false,
  autoDisplay:             true,
  audioDevice:             undefined,
  theme:                   'system',
};

// ─── Audio device enumeration ─────────────────────────────────────────────────

function getAudioDevices(): AudioDevice[] {
  if (process.platform === 'linux') {
    try {
      const output = execSync('pactl list sources short', { encoding: 'utf-8' });
      return output.trim().split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split('\t');
        const id = parts[1] || parts[0];
        let name = id
          .replace('alsa_input.', '')
          .replace('alsa_output.', 'Monitor: ')
          .replace(/_/g, ' ');
        if (name.length > 60) name = name.slice(0, 57) + '...';
        return { id, name, isDefault: false };
      });
    } catch { /* fall through */ }
  }
  return [{ id: 'default', name: 'Default microphone', isDefault: true }];
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function applyTheme(theme: ThemeMode): void {
  nativeTheme.themeSource = theme === 'system' ? 'system' : theme;
  settings.theme = theme;
  operatorWindow?.webContents.send(IPC.THEME_SET, theme);
}

// ─── Window creation ──────────────────────────────────────────────────────────

function createOperatorWindow(): BrowserWindow {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.workAreaSize;

  const win = new BrowserWindow({
    width: Math.min(1400, width), height: Math.min(860, height),
    minWidth: 960, minHeight: 600,
    x: primary.workArea.x + Math.round((width - Math.min(1400, width)) / 2),
    y: primary.workArea.y + Math.round((height - Math.min(860, height)) / 2),
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
    win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/operator' });
  }

  win.on('closed', () => {
    operatorWindow = null;
    if (projectorWindow && !projectorWindow.isDestroyed()) projectorWindow.close();
  });

  return win;
}

function createProjectorWindow(): BrowserWindow {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find(d => d.id !== primary.id);
  const hasExternal = !!external;

  let x: number, y: number, w: number, h: number;

  if (hasExternal) {
    x = external.bounds.x; y = external.bounds.y;
    w = external.bounds.width; h = external.bounds.height;
    console.log(`[BibleBeam] Projector → external display ${w}x${h}`);
  } else {
    const area = primary.workArea;
    w = Math.round(area.width * 0.5);
    h = Math.round(area.height * 0.55);
    x = area.x + area.width - w - 24;
    y = area.y + area.height - h - 24;
    console.log('[BibleBeam] Projector → single monitor');
  }

  const win = new BrowserWindow({
    x, y, width: w, height: h,
    frame: false, backgroundColor: '#000000',
    title: 'BibleBeam — Projector',
    fullscreen: hasExternal, alwaysOnTop: hasExternal, skipTaskbar: hasExternal,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:9080/#/projector');
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/projector' });
  }

  win.on('closed', () => {
    projectorWindow = null;
    operatorWindow?.webContents.send(IPC.PROJECTOR_STATUS, false);
  });

  return win;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  // Load Bible data + build fuzzy index
  bibleData = loadTranslation(settings.translation);

  if (bibleData) {
    try {
      const entries = Object.entries(bibleData).flatMap(([book, chapters]) =>
        Object.entries(chapters).flatMap(([chapter, verses]) =>
          Object.entries(verses).map(([verse, text]) => ({
            ref: { book, chapter: parseInt(chapter), verse: parseInt(verse) },
            firstLine: firstWords(text, 8),
          }))
        )
      );
      buildFuzzyIndex(entries);
    } catch (e) {
      console.warn('[BibleBeam] Could not build fuzzy index:', e);
    }
  }

  applyTheme(settings.theme);
  startDisplayServer(7700);
  console.log('[BibleBeam] Boot complete');
}

// ─── STT Pipeline ─────────────────────────────────────────────────────────────

async function startSTT(): Promise<void> {
  // Determine key name based on provider
  const keyMap: Record<string, string> = {
    groq: 'groq-api-key',
    deepgram: 'deepgram-api-key',
    assemblyai: 'assemblyai-api-key',
  };

  const keyName = keyMap[settings.sttProvider] || 'groq-api-key';
  const apiKey = await keychain.get(keyName);

  if (!apiKey) {
    operatorWindow?.webContents.send('audio:error',
      `No API key saved for ${settings.sttProvider}. Go to Settings to add it.`);
    return;
  }

  // Create the provider
  try {
    sttProvider = createProvider(settings.sttProvider as any);
  } catch (err: any) {
    operatorWindow?.webContents.send('audio:error', err.message);
    return;
  }

  // Connect (validates key)
  try {
    console.log(`[BibleBeam] Connecting to ${sttProvider.name}...`);
    await sttProvider.connect(apiKey);
    console.log(`[BibleBeam] ${sttProvider.name} connected`);
  } catch (err: any) {
    operatorWindow?.webContents.send('audio:error', `Connection failed: ${err.message}`);
    sttProvider = null;
    return;
  }

  // Start streaming — this is where the magic happens
  sttProvider.startStreaming(
    async (segment: TranscriptSegment) => {
      // Forward every transcript segment to the operator UI
      operatorWindow?.webContents.send(IPC.TRANSCRIPT_UPDATE, {
        text: segment.text,
        isFinal: segment.isFinal,
        timestampMs: segment.timestampMs ?? Date.now(),
      });

      // Only run verse detection on final segments with actual text
      if (!segment.isFinal || !segment.text.trim()) return;

      console.log(`[STT] Final: "${segment.text}"`);

      // Run the detection pipeline
      const match = await detectVerse(segment.text, {
        minFuzzyScore: 0.5,
        semanticEnabled: settings.semanticMatchingEnabled,
      });

      if (!match) return;

      // Look up the actual verse text from loaded Bible data
      let verseText = '[verse text not available]';
      if (bibleData) {
        const text = getVerse(
          bibleData,
          match.reference.book,
          match.reference.chapter,
          match.reference.verse
        );
        if (text) verseText = text;
      }

      const payload = {
        reference:   match.referenceString,
        verseText,
        translation: settings.translation,
        confidence:  match.confidence,
        method:      match.method,
      };

      console.log(`[BibleBeam] ✅ Detected: ${match.referenceString} (${match.method}, ${Math.round(match.confidence * 100)}%)`);

      // Always send to operator panel
      operatorWindow?.webContents.send(IPC.VERSE_DETECTED, payload);

      // Auto-display if confidence is high enough and projector is open
      if (settings.autoDisplay && match.confidence >= settings.confidenceThreshold) {
        if (projectorWindow && !projectorWindow.isDestroyed()) {
          projectorWindow.webContents.send(IPC.PROJECTOR_UPDATE, payload);
          broadcastVerse(payload);
          console.log(`[BibleBeam] → Auto-displayed on projector`);
        }
      }
    },
    (err: Error) => {
      console.error('[STT Error]', err.message);
      operatorWindow?.webContents.send('audio:error', err.message);
    }
  );

  // Wire audio → STT
  audioCapture.removeAllListeners('data');
  audioCapture.on('data', (chunk: Buffer) => {
    sttProvider?.sendAudio(chunk);
  });

  // Start capturing from mic
  audioCapture.start(settings.audioDevice);
  console.log(`[BibleBeam] 🎙️ Pipeline active: mic → ${sttProvider.name} → verse detection`);
}

function stopSTT(): void {
  audioCapture.stop();
  audioCapture.removeAllListeners('data');
  sttProvider?.stopStreaming();
  sttProvider?.disconnect();
  sttProvider = null;
  console.log('[BibleBeam] Pipeline stopped');
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

// Audio
ipcMain.handle(IPC.AUDIO_START, async () => {
  try {
    await startSTT();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle(IPC.AUDIO_STOP, () => {
  stopSTT();
  return { ok: true };
});

ipcMain.handle(IPC.AUDIO_GET_DEVICES, () => getAudioDevices());

// Projector — on demand
ipcMain.handle(IPC.PROJECTOR_OPEN, () => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.focus();
  } else {
    projectorWindow = createProjectorWindow();
  }
  operatorWindow?.webContents.send(IPC.PROJECTOR_STATUS, true);
  return { ok: true };
});

ipcMain.handle(IPC.PROJECTOR_CLOSE, () => {
  if (projectorWindow && !projectorWindow.isDestroyed()) projectorWindow.close();
  projectorWindow = null;
  operatorWindow?.webContents.send(IPC.PROJECTOR_STATUS, false);
  return { ok: true };
});

ipcMain.handle(IPC.PROJECTOR_STATUS, () => {
  return !!(projectorWindow && !projectorWindow.isDestroyed());
});

// Verse actions
ipcMain.handle(IPC.VERSE_APPROVED, (_event, payload: ProjectorPayload) => {
  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, payload);
  broadcastVerse(payload);
});

ipcMain.handle(IPC.VERSE_CLEAR, () => {
  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, null);
  broadcastClear();
});

ipcMain.handle(IPC.VERSE_OVERRIDE, async (_event, { reference }: { reference: string }) => {
  const ref = detectExplicitReference(reference);
  if (!ref) {
    operatorWindow?.webContents.send('audio:error', `Could not parse: "${reference}"`);
    return;
  }

  let verseText = '[verse not found]';
  if (bibleData) {
    const text = getVerse(bibleData, ref.book, ref.chapter, ref.verse);
    if (text) verseText = text;
  }

  const payload: ProjectorPayload = {
    reference: formatReference(ref),
    verseText,
    translation: settings.translation,
  };

  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, payload);
  broadcastVerse(payload);
  operatorWindow?.webContents.send(IPC.VERSE_DETECTED, {
    ...payload, confidence: 1.0, method: 'regex' as const,
  });

  console.log(`[BibleBeam] Manual override: ${formatReference(ref)}`);
});

// Settings
ipcMain.handle(IPC.SETTINGS_GET_KEY, async (_e, keyName: string) => keychain.get(keyName));

ipcMain.handle(IPC.SETTINGS_SET_KEY, async (_e, keyName: string, value: string) => {
  await keychain.set(keyName, value);
  return { ok: true };
});

ipcMain.handle(IPC.SETTINGS_GET, () => settings);

ipcMain.handle(IPC.SETTINGS_SET, (_e, s: Partial<SettingsPayload>) => {
  const oldTranslation = settings.translation;
  settings = { ...settings, ...s };

  // If translation changed, reload Bible data + rebuild fuzzy index
  if (s.translation && s.translation !== oldTranslation) {
    bibleData = loadTranslation(settings.translation);
    if (bibleData) {
      const entries = Object.entries(bibleData).flatMap(([book, chapters]) =>
        Object.entries(chapters).flatMap(([chapter, verses]) =>
          Object.entries(verses).map(([verse, text]) => ({
            ref: { book, chapter: parseInt(chapter), verse: parseInt(verse) },
            firstLine: firstWords(text, 8),
          }))
        )
      );
      buildFuzzyIndex(entries);
    }
  }

  if (s.theme) applyTheme(s.theme);
  return { ok: true };
});

// Theme
ipcMain.handle(IPC.THEME_GET, () => settings.theme);
ipcMain.handle(IPC.THEME_SET, (_e, theme: ThemeMode) => {
  applyTheme(theme);
  return { ok: true };
});

// ─── Audio error forwarding ───────────────────────────────────────────────────

audioCapture.on('error', (err: Error) => {
  console.error('[Audio]', err.message);
  operatorWindow?.webContents.send('audio:error', err.message);
});

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await boot();
  operatorWindow = createOperatorWindow();

  screen.on('display-added', () => {
    console.log('[BibleBeam] Display added');
  });

  screen.on('display-removed', () => {
    console.log('[BibleBeam] Display removed');
    if (projectorWindow && !projectorWindow.isDestroyed()) {
      projectorWindow.close();
      projectorWindow = createProjectorWindow();
    }
  });

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