// src/main/preload.ts
// Exposes a typed IPC bridge to the renderer process.
// contextIsolation is ON — renderer never touches Node directly.

import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './ipc';

contextBridge.exposeInMainWorld('biblebeam', {
  // Audio
  startListening:  () => ipcRenderer.invoke(IPC.AUDIO_START),
  stopListening:   () => ipcRenderer.invoke(IPC.AUDIO_STOP),

  // Verse actions
  approveVerse:    (payload: any) => ipcRenderer.invoke(IPC.VERSE_APPROVED, payload),
  rejectVerse:     () => ipcRenderer.invoke(IPC.VERSE_REJECTED),
  overrideVerse:   (payload: any) => ipcRenderer.invoke(IPC.VERSE_OVERRIDE, payload),
  clearVerse:      () => ipcRenderer.invoke(IPC.VERSE_CLEAR),

  // Settings
  getKey:          (keyName: string) => ipcRenderer.invoke(IPC.SETTINGS_GET_KEY, keyName),
  setKey:          (keyName: string, value: string) => ipcRenderer.invoke(IPC.SETTINGS_SET_KEY, keyName, value),
  getSettings:     () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  saveSettings:    (s: any) => ipcRenderer.invoke(IPC.SETTINGS_SET, s),

  // Event listeners
  onTranscript:    (cb: (payload: any) => void) => {
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
});
