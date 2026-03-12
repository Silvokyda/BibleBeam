// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './ipc';

contextBridge.exposeInMainWorld('biblebeam', {
  // Audio
  startListening:    () => ipcRenderer.invoke(IPC.AUDIO_START),
  stopListening:     () => ipcRenderer.invoke(IPC.AUDIO_STOP),
  getAudioDevices:   () => ipcRenderer.invoke(IPC.AUDIO_GET_DEVICES),

  // Verse actions
  approveVerse:      (payload: any) => ipcRenderer.invoke(IPC.VERSE_APPROVED, payload),
  rejectVerse:       () => ipcRenderer.invoke(IPC.VERSE_REJECTED),
  overrideVerse:     (payload: any) => ipcRenderer.invoke(IPC.VERSE_OVERRIDE, payload),
  clearVerse:        () => ipcRenderer.invoke(IPC.VERSE_CLEAR),

  // Projector
  openProjector:     () => ipcRenderer.invoke(IPC.PROJECTOR_OPEN),
  closeProjector:    () => ipcRenderer.invoke(IPC.PROJECTOR_CLOSE),
  getProjectorStatus: () => ipcRenderer.invoke(IPC.PROJECTOR_STATUS),

  // Settings
  getKey:            (keyName: string) => ipcRenderer.invoke(IPC.SETTINGS_GET_KEY, keyName),
  setKey:            (keyName: string, value: string) => ipcRenderer.invoke(IPC.SETTINGS_SET_KEY, keyName, value),
  getSettings:       () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  saveSettings:      (s: any) => ipcRenderer.invoke(IPC.SETTINGS_SET, s),

  // Theme
  getTheme:          () => ipcRenderer.invoke(IPC.THEME_GET),
  setTheme:          (theme: string) => ipcRenderer.invoke(IPC.THEME_SET, theme),

  // Event listeners
  onTranscript: (cb: (payload: any) => void) => {
    ipcRenderer.on(IPC.TRANSCRIPT_UPDATE, (_e, p) => cb(p));
    return () => ipcRenderer.removeAllListeners(IPC.TRANSCRIPT_UPDATE);
  },
  onVerseDetected: (cb: (payload: any) => void) => {
    ipcRenderer.on(IPC.VERSE_DETECTED, (_e, p) => cb(p));
    return () => ipcRenderer.removeAllListeners(IPC.VERSE_DETECTED);
  },
  onProjectorUpdate: (cb: (payload: any) => void) => {
    ipcRenderer.on(IPC.PROJECTOR_UPDATE, (_e, p) => cb(p));
    return () => ipcRenderer.removeAllListeners(IPC.PROJECTOR_UPDATE);
  },
  onThemeChanged: (cb: (theme: string) => void) => {
    ipcRenderer.on(IPC.THEME_SET, (_e, t) => cb(t));
    return () => ipcRenderer.removeAllListeners(IPC.THEME_SET);
  },
  onProjectorStatus: (cb: (open: boolean) => void) => {
    ipcRenderer.on(IPC.PROJECTOR_STATUS, (_e, s) => cb(s));
    return () => ipcRenderer.removeAllListeners(IPC.PROJECTOR_STATUS);
  },
});