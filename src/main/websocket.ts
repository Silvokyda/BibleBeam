// src/main/websocket.ts
// Broadcasts the current verse to any device on the local network.
// Devices open http://[local-ip]:7700 in a browser to display verses.

import { WebSocketServer, WebSocket } from 'ws';
import type { ProjectorPayload } from './ipc';

let wss: WebSocketServer | null = null;
let lastPayload: ProjectorPayload | null = null;

export function startDisplayServer(port = 7700): void {
  if (wss) return;

  wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket) => {
    // Send the current verse state immediately on connect
    // so a late-joining device is in sync
    if (lastPayload) {
      ws.send(JSON.stringify({ type: 'verse', payload: lastPayload }));
    } else {
      ws.send(JSON.stringify({ type: 'clear' }));
    }
  });

  wss.on('error', (err) => {
    console.error('[WebSocket] Server error:', err.message);
  });

  console.log(`[WebSocket] Display server running on ws://localhost:${port}`);
}

export function broadcastVerse(payload: ProjectorPayload): void {
  lastPayload = payload;
  _broadcast({ type: 'verse', payload });
}

export function broadcastClear(): void {
  lastPayload = null;
  _broadcast({ type: 'clear' });
}

export function stopDisplayServer(): void {
  wss?.close();
  wss = null;
}

function _broadcast(message: object): void {
  if (!wss) return;
  const msg = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
