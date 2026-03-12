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
BibleBeam: ✅ John 3:16 detected (1.4s) → on projector
```

---

## Features

- 🎙️ **Real-time speech-to-text** via Deepgram, OpenAI Whisper, or AssemblyAI
- 📖 **Detects exact references, fuzzy matches, and paraphrases**
- 📚 **KJV, ASV, WEB bundled free** — ESV via your own API key
- 🖥️ **Projector window** — drag to second screen, done
- 📡 **Local network display** — any device on church WiFi can be a screen (`http://192.168.x.x:7700`)
- 🎛️ **Operator panel** — live transcript, manual override, approve/reject queue
- 🔐 **100% local** — your audio never touches any BibleBeam server
- 🐧 **Cross-platform** — Windows, macOS, Linux

---

## Quick Start

### 1. Download

Grab the latest release for your platform from [Releases](../../releases).

- Windows: `.exe` installer
- macOS: `.dmg`
- Linux: `.deb` / `.AppImage`

### 2. Get a free API key

BibleBeam needs a speech-to-text provider. We recommend **Deepgram** — it has a generous free tier and the best real-time streaming quality.

- [Deepgram](https://deepgram.com) — Free tier: $200 credit (effectively unlimited for church use)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text) — pay-per-use, widely known
- [AssemblyAI](https://www.assemblyai.com) — good alternative

Paste your key in **Settings → Speech-to-Text** on first launch. It's stored in your OS keychain and never leaves your machine.

### 3. Connect your audio

Plug your mixer or soundboard output into your computer's audio input, or use a USB audio interface. BibleBeam works with any audio input your OS recognizes.

### 4. Start

Hit **Start Listening**. Drag the projector window to your second screen. You're live.

---

## Bible Translations

| Translation | How it works | License |
|---|---|---|
| KJV | Bundled locally | Public domain |
| ASV | Bundled locally | Public domain |
| WEB (World English Bible) | Bundled locally | Public domain |
| ESV | Your free ESV API key ([esv.org/api](https://api.esv.org)) | Free: 500 req/day |
| NIV, NLT, NKJV | Not included (copyright) | — |

Want to add a translation? See [docs/adding-translation.md](docs/adding-translation.md).

---

## Architecture

BibleBeam is a single Electron + React desktop app. Everything runs locally. Internet is only used to call the STT provider you configure.

```
┌──────────────────────────────────────────────┐
│              BibleBeam Desktop               │
│                                              │
│  ┌─────────────┐    ┌──────────────────────┐ │
│  │  Operator   │    │  Settings / API Keys  │ │
│  │   Panel     │    │  (OS keychain, local) │ │
│  │             │    └──────────────────────┘ │
│  │ - Transcript│                              │
│  │ - Detected  │    ┌──────────────────────┐ │
│  │   verses    │    │   Projector Window   │ │
│  │ - Override  │    │  (drag to 2nd screen)│ │
│  └─────────────┘    └──────────────────────┘ │
└───────────────┬──────────────────────────────┘
                │
     ┌──────────▼──────────┐
     │     Core Engine     │
     │                     │
     │  AudioCapture       │
     │       ↓             │
     │  STT Provider       │  ← Deepgram / Whisper / AssemblyAI
     │  (pluggable)        │
     │       ↓             │
     │  VerseMatcher       │  ← Local fuzzy + semantic
     │       ↓             │
     │  BibleProvider      │  ← Local DB + optional ESV API
     └─────────────────────┘
                │
     ┌──────────▼──────────┐
     │  WebSocket Server   │  ← Any device on church WiFi
     │  (local network)    │     opens http://192.168.x.x:7700
     └─────────────────────┘
```

---

## Verse Detection Pipeline

```
Transcript chunk
      ↓
1. Regex scan for explicit refs       →  "John 3:16", "Psalm 23"
      ↓ (if none found)
2. Fuzzy match against first-line     →  "For God so loved"
      ↓ (if confidence < threshold)
3. Semantic / embedding match         →  paraphrases & allusions
      ↓
Candidate verse + confidence score
      ↓
If above threshold  →  auto-display on projector
If below threshold  →  queue in operator panel for approval
```

---

## Repo Structure

```
biblebeam/
├── src/
│   ├── main/                   # Electron main process
│   │   ├── index.ts
│   │   ├── audio.ts            # mic / soundboard capture
│   │   ├── websocket.ts        # local WebSocket server
│   │   └── keychain.ts         # OS keychain via keytar
│   └── renderer/               # React UI
│       ├── pages/
│       │   ├── Operator.tsx    # main control panel
│       │   ├── Projector.tsx   # full-screen display window
│       │   └── Settings.tsx    # API keys, preferences
│       └── components/
├── packages/
│   ├── verse-matcher/          # Core matching logic (framework-agnostic)
│   │   ├── fuzzy.ts            # fuse.js reference matching
│   │   ├── semantic.ts         # embeddings-based paraphrase detection
│   │   └── index.ts
│   ├── bible-data/             # Bundled public domain translations
│   │   ├── translations/
│   │   │   ├── kjv.json
│   │   │   ├── web.json
│   │   │   └── asv.json
│   │   └── index.ts
│   ├── stt-providers/          # Pluggable STT adapters
│   │   ├── base.ts             # ISTTProvider interface
│   │   ├── deepgram.ts
│   │   ├── whisper.ts
│   │   └── assemblyai.ts
│   └── bible-providers/        # Pluggable Bible translation sources
│       ├── base.ts             # IBibleProvider interface
│       ├── local.ts            # uses bible-data package
│       └── esv-api.ts
├── docs/
│   ├── getting-started.md
│   ├── adding-stt-provider.md
│   └── adding-translation.md
├── CONTRIBUTING.md
├── README.md
└── package.json
```

---

## Build from Source

**Prerequisites:** Node.js 18+, pnpm

```bash
git clone https://github.com/YOUR_USERNAME/biblebeam.git
cd biblebeam
pnpm install
pnpm dev          # start in development mode
pnpm build        # build for your current platform
```

To build for a specific platform:
```bash
pnpm build:linux
pnpm build:mac
pnpm build:win
```

---

## Adding a New STT Provider

Implement the `ISTTProvider` interface in `packages/stt-providers/`:

```typescript
export interface ISTTProvider {
  name: string;
  connect(apiKey: string): Promise<void>;
  startStreaming(onTranscript: (text: string, isFinal: boolean) => void): void;
  stopStreaming(): void;
  disconnect(): void;
}
```

Then register it in `packages/stt-providers/index.ts`. Open a PR — see [docs/adding-stt-provider.md](docs/adding-stt-provider.md) for the full guide.

---

## Adding a New Bible Translation

Implement the `IBibleProvider` interface:

```typescript
export interface IBibleProvider {
  name: string;
  abbreviation: string;
  getVerse(book: string, chapter: number, verse: number): Promise<string>;
  searchText(query: string): Promise<VerseResult[]>;
}
```

See [docs/adding-translation.md](docs/adding-translation.md) for the full guide.

---

## Privacy & Security

- **Your audio is never recorded or stored** by BibleBeam
- **API keys are stored in your OS keychain** (`keytar`) — never in plaintext files, never sent to us
- **All verse matching runs locally** — only the STT stream goes to your chosen provider
- BibleBeam has no telemetry, no analytics, no call-home

---

## Roadmap

**Phase 1 — Core MVP**
- [x] Electron shell + React UI
- [ ] Mic capture → Deepgram streaming STT
- [ ] Regex + fuzzy verse matching (KJV bundled)
- [ ] Basic projector window

**Phase 2 — Polish**
- [ ] Settings page with keychain storage
- [ ] Whisper + AssemblyAI providers
- [ ] ESV API integration
- [ ] WebSocket local network display
- [ ] Operator approval queue

**Phase 3 — Community**
- [ ] Plugin docs for new STT / Bible providers
- [ ] GitHub Actions CI (lint, test, build binaries)
- [ ] Packaged releases (`.deb`, `.exe`, `.dmg`, `.AppImage`)
- [ ] Auto-update

---

## Contributing

Contributions are very welcome! Whether you're a church tech volunteer or a developer, there's something you can help with:

- 🐛 Bug reports and fixes
- 🌍 New STT provider integrations
- 📖 New Bible translation support
- 🎨 UI/UX improvements
- 📝 Documentation

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

**Issue templates available for:**
- New STT Provider
- New Bible Translation
- Bug Report
- Feature Request

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop app | Electron + React |
| Styling | Tailwind CSS |
| STT (default) | Deepgram streaming API |
| Verse matching | fuse.js + transformers.js embeddings |
| Secure key storage | keytar (OS keychain) |
| Local network display | WebSocket server |
| Monorepo | pnpm workspaces |
| CI/CD | GitHub Actions |

---

## License

MIT — free for churches, free forever.

---

## Community

- **Discussions** — for church setup questions, configuration help, sharing your setup
- **Issues** — for bugs and feature requests
- **PRs** — always welcome

Built with ❤️ for churches everywhere.
