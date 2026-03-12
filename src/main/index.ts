// src/main/index.ts
import { app, BrowserWindow, ipcMain, screen, nativeTheme } from 'electron';
import { execSync } from 'child_process';
import path from 'path';
import { audioCapture } from './audio';
import { IPC } from './ipc';
import type { SettingsPayload, ProjectorPayload, AudioDevice, ThemeMode } from './ipc';
import { keychain } from './keychain';
import { startDisplayServer, broadcastVerse, broadcastClear, stopDisplayServer } from './websocket';

let operatorWindow:  BrowserWindow | null = null;
let projectorWindow: BrowserWindow | null = null;
let sttProvider: any = null;

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
  const platform = process.platform;

  if (platform === 'linux') {
    try {
      const output = execSync('pactl list sources short', { encoding: 'utf-8' });
      const lines = output.trim().split('\n').filter(l => l.trim());
      return lines.map(line => {
        const parts = line.split('\t');
        const id = parts[1] || parts[0];
        const isMonitor = id.includes('.monitor');
        let name = id;

        // Make names human-readable
        if (id.includes('alsa_input')) {
          name = id.replace('alsa_input.', '').replace(/_/g, ' ');
        } else if (id.includes('alsa_output') && isMonitor) {
          name = 'Monitor of ' + id.replace('alsa_output.', '').replace('.monitor', '').replace(/_/g, ' ');
        }

        return {
          id,
          name: name.length > 60 ? name.slice(0, 57) + '...' : name,
          isDefault: parts[1]?.includes('RUNNING') || false,
        };
      });
    } catch {
      return [{ id: 'default', name: 'Default microphone', isDefault: true }];
    }
  }

  // Fallback for macOS / Windows
  return [{ id: 'default', name: 'Default microphone', isDefault: true }];
}

// ─── Theme management ─────────────────────────────────────────────────────────

function applyTheme(theme: ThemeMode): void {
  if (theme === 'system') {
    nativeTheme.themeSource = 'system';
  } else {
    nativeTheme.themeSource = theme;
  }
  settings.theme = theme;

  // Notify all renderer windows
  operatorWindow?.webContents.send(IPC.THEME_SET, theme);
}

// ─── Window creation ──────────────────────────────────────────────────────────

function createOperatorWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: Math.min(1400, width),
    height: Math.min(860, height),
    minWidth: 960,
    minHeight: 600,
    x: primaryDisplay.workArea.x + Math.round((width - Math.min(1400, width)) / 2),
    y: primaryDisplay.workArea.y + Math.round((height - Math.min(860, height)) / 2),
    title: 'BibleBeam',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
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
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const externalDisplay = displays.find(d => d.id !== primaryDisplay.id);

  let x: number, y: number, width: number, height: number;
  const hasExternal = !!externalDisplay;

  if (hasExternal) {
    x = externalDisplay.bounds.x;
    y = externalDisplay.bounds.y;
    width = externalDisplay.bounds.width;
    height = externalDisplay.bounds.height;
    console.log(`[BibleBeam] Projector → external: ${width}x${height}`);
  } else {
    const primary = primaryDisplay.workArea;
    width = Math.round(primary.width * 0.5);
    height = Math.round(primary.height * 0.55);
    x = primary.x + primary.width - width - 24;
    y = primary.y + primary.height - height - 24;
    console.log('[BibleBeam] Projector → single monitor mode');
  }

  const win = new BrowserWindow({
    x, y, width, height,
    frame: false,
    backgroundColor: '#000000',
    title: 'BibleBeam — Projector',
    fullscreen: hasExternal,
    alwaysOnTop: hasExternal,
    skipTaskbar: hasExternal,
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
    operatorWindow?.webContents.send(IPC.PROJECTOR_STATUS, false);
  });

  return win;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  applyTheme(settings.theme);
  startDisplayServer(7700);
  console.log('[BibleBeam] Boot complete');
}

// ─── STT ──────────────────────────────────────────────────────────────────────

async function startSTT(): Promise<void> {
  const apiKey = await keychain.get('groq-api-key');
  if (!apiKey) {
    operatorWindow?.webContents.send('audio:error',
      'No API key saved. Go to Settings to add your key.');
    return;
  }
  audioCapture.start(settings.audioDevice);
  console.log('[BibleBeam] Audio capture started');
}

function stopSTT(): void {
  audioCapture.stop();
  sttProvider?.stopStreaming?.();
  sttProvider = null;
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

// Audio
ipcMain.handle(IPC.AUDIO_START, async () => {
  await startSTT();
  return { ok: true };
});

ipcMain.handle(IPC.AUDIO_STOP, () => {
  stopSTT();
  return { ok: true };
});

ipcMain.handle(IPC.AUDIO_GET_DEVICES, () => {
  return getAudioDevices();
});

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
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.close();
  }
  projectorWindow = null;
  operatorWindow?.webContents.send(IPC.PROJECTOR_STATUS, false);
  return { ok: true };
});

ipcMain.handle(IPC.PROJECTOR_STATUS, () => {
  return !!(projectorWindow && !projectorWindow.isDestroyed());
});

// Verse
ipcMain.handle(IPC.VERSE_APPROVED, (_event, payload: ProjectorPayload) => {
  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, payload);
  broadcastVerse(payload);
});

ipcMain.handle(IPC.VERSE_CLEAR, () => {
  projectorWindow?.webContents.send(IPC.PROJECTOR_UPDATE, null);
  broadcastClear();
});

ipcMain.handle(IPC.VERSE_OVERRIDE, async (_event, { reference }: { reference: string }) => {
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

// Settings
ipcMain.handle(IPC.SETTINGS_GET_KEY, async (_e, keyName: string) => {
  return keychain.get(keyName);
});

ipcMain.handle(IPC.SETTINGS_SET_KEY, async (_e, keyName: string, value: string) => {
  await keychain.set(keyName, value);
  return { ok: true };
});

ipcMain.handle(IPC.SETTINGS_GET, () => settings);

ipcMain.handle(IPC.SETTINGS_SET, (_e, s: Partial<SettingsPayload>) => {
  settings = { ...settings, ...s };
  if (s.theme) applyTheme(s.theme);
  return { ok: true };
});

// Theme
ipcMain.handle(IPC.THEME_GET, () => settings.theme);

ipcMain.handle(IPC.THEME_SET, (_e, theme: ThemeMode) => {
  applyTheme(theme);
  return { ok: true };
});

// ─── Audio forwarding ─────────────────────────────────────────────────────────

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
  operatorWindow = createOperatorWindow();
  // Projector NOT opened here — user opens it when ready

  screen.on('display-added', () => {
    console.log('[BibleBeam] Display added');
    operatorWindow?.webContents.send('display:changed', true);
  });

  screen.on('display-removed', () => {
    console.log('[BibleBeam] Display removed');
    if (projectorWindow && !projectorWindow.isDestroyed()) {
      projectorWindow.close();
      projectorWindow = createProjectorWindow();
    }
    operatorWindow?.webContents.send('display:changed', false);
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