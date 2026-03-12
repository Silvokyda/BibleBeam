# 📖 BibleBeam

> **Open-source, real-time Bible verse detection for live sermons.**
> Bring your own API keys. No subscriptions. No lock-in. Run it at your church tonight.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)]()

---

## What is BibleBeam?

BibleBeam listens to your pastor speak and automatically detects Bible references — exact quotes, paraphrases, and familiar passages — then displays them on your projector screen in real time.

No subscriptions. No cloud accounts to create. No audio sent to our servers. Your API keys stay on your machine.

```
Pastor says: "Turn with me to John 3:16..."
BibleBeam: ✅ John 3:16 detected → on projector
```

---

## Development Progress

### ✅ Phase 1 — Core Shell (Complete)

| Milestone | Status | Description |
|---|---|---|
| M1 — Electron app boots | ✅ Done | Two-process Electron app with Webpack 5, React, TypeScript |
| M1.1 — Operator panel | ✅ Done | Live transcript feed, approval queue, manual override, current verse display |
| M1.2 — Projector window | ✅ Done | Frameless, dark, large text, smooth fade transitions, auto-detects external monitors |
| M1.3 — Projector on demand | ✅ Done | Opens from operator panel when ready — not on launch |
| M1.4 — IPC typed channels | ✅ Done | All main↔renderer communication through typed IPC channels |
| M1.5 — Audio capture | ✅ Done | PulseAudio/PipeWire on Linux, sox on macOS/Windows |
| M1.6 — Audio device picker | ✅ Done | Enumerate and select input devices from settings |
| M1.7 — WebSocket server | ✅ Done | Local network display on port 7700 — any device on church WiFi |
| M1.8 — Keychain storage | ✅ Done | API keys stored in OS keychain (in-memory stub for dev) |
| M1.9 — Settings page | ✅ Done | Tabbed settings: General, Audio, Detection, About |
| M1.10 — Theme system | ✅ Done | Light / Dark / System themes with live switching |
| M1.11 — Preload bridge | ✅ Done | Secure contextIsolation with typed API bridge |

### 🔧 Phase 2 — In Progress

| Milestone | Status | Description |
|---|---|---|
| M2 — Deepgram/Groq STT | 🔧 Stubbed | Audio capture works, STT provider interface defined, wiring pending |
| M3 — Regex verse matching | 🔧 Planned | `packages/verse-matcher/` interface defined |
| M4 — Fuzzy matching | 🔧 Planned | fuse.js against first-line index |
| M5 — KJV JSON bundle | 🔧 Planned | `packages/bible-data/` structure defined |

### ⬚ Phase 3— Operator Experience

| Milestone | Status | Description |
|---|---|---|
| M6 — Settings → keychain | ⬚ | Save/load from real OS keychain (keytar) |
| M7 — Operator approval queue | ⬚ | Confidence-based auto-display vs manual approval |
| M8 — WebSocket browser display | ⬚ | `web-display/` standalone HTML page |
| M9 — Whisper + AssemblyAI | ⬚ | Additional STT provider adapters |
| M10 — ESV API | ⬚ | ESV.org REST API integration |

### ⬚ Phase 4 — Community

| Milestone | Status | Description |
|---|---|---|
| M11 — GitHub Actions CI | ⬚ | Lint + test on every push |
| M12 — Release builds | ⬚ | .deb, .AppImage, .dmg, .exe via electron-builder |
| M13 — Contributor docs | ⬚ | Adding STT providers, translations |
| M14 — Semantic matching | ⬚ | transformers.js local embeddings |
| M15 — Auto-update | ⬚ | electron-updater from GitHub Releases |

---

## Features (Current)

- 🖥️ **Two-window Electron app** — operator panel + projector display
- 🎛️ **Operator panel** — live transcript, approval queue, manual override
- 📺 **Projector window** — frameless, auto-detects external monitors, opens on demand
- 📡 **Local network display** — WebSocket server on port 7700
- 🎙️ **Audio capture** — PulseAudio/PipeWire on Linux, sox on macOS/Windows
- 🔌 **Audio device picker** — select input device from settings
- 🎨 **Theme system** — light, dark, or follow system preference
- ⚙️ **Settings** — tabbed UI for provider, audio, detection, and about
- 🔐 **Secure key storage** — API keys in OS keychain (never plaintext)
- 🔧 **Pluggable architecture** — interfaces for STT providers and Bible sources

## Features (Planned)

- 🎙️ **Real-time speech-to-text** via Groq, Deepgram, or AssemblyAI
- 📖 **Verse detection** — regex, fuzzy, and semantic matching
- 📚 **KJV, ASV, WEB bundled free** — ESV via your own API key
- 🐧 **Cross-platform** — Windows, macOS, Linux

---

## Quick Start (Development)

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/YOUR_USERNAME/biblebeam.git
cd biblebeam
npm install
npm run dev
```

This opens:
1. **Operator window** — the main control panel
2. Click **"Open projector"** in the header when you're ready to present
3. Drag the projector window to your second screen

---

## Architecture

```
┌──────────────────────────────────────────────┐
│              BibleBeam Desktop               │
│                                              │
│  ┌─────────────┐    ┌──────────────────────┐ │
│  │  Operator   │    │  Settings            │ │
│  │   Panel     │    │  (tabbed UI)         │ │
│  │             │    └──────────────────────┘ │
│  │ - Transcript│                              │
│  │ - Queue     │    ┌──────────────────────┐ │
│  │ - Override  │    │  Projector Window    │ │
│  └─────────────┘    │  (opens on demand)   │ │
│                     └──────────────────────┘ │
└───────────────┬──────────────────────────────┘
                │
     ┌──────────▼──────────┐
     │     Main Process    │
     │  AudioCapture       │
     │  ISTTProvider       │  ← Groq / Deepgram / AssemblyAI
     │  VerseMatcher       │  ← Regex → Fuzzy → Semantic
     │  IBibleProvider     │  ← Local JSON + ESV API
     └──────────┬──────────┘
                │
     ┌──────────▼──────────┐
     │  WebSocket Server   │  ← port 7700, local network
     └─────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop app | Electron 28 + React 18 |
| Build system | Webpack 5 + TypeScript |
| Styling | CSS custom properties (no framework) |
| Fonts | Inter + JetBrains Mono |
| STT (planned) | Groq / Deepgram / AssemblyAI |
| Verse matching (planned) | fuse.js + transformers.js |
| Key storage | OS keychain via keytar |
| Network display | WebSocket (ws) |

---

## Privacy

- **Audio** — streamed only to your chosen STT provider, never stored
- **API keys** — stored in your OS keychain, never in plaintext
- **Verse matching** — runs entirely locally
- **Telemetry** — none. Zero analytics, zero tracking

---

## License

MIT — free for churches, free forever.