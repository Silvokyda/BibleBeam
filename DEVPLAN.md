# BibleBeam — Development Plan

> This document is the single source of truth for how BibleBeam gets built.
> It covers architecture decisions, phased milestones, task breakdowns, technical
> implementation notes, and contributor guidance. Add it to the repo root as
> `DEVPLAN.md` so every collaborator starts from the same page.

---

## Table of Contents

1. [Project Goal](#1-project-goal)
2. [Guiding Principles](#2-guiding-principles)
3. [Tech Stack & Rationale](#3-tech-stack--rationale)
4. [Repository Structure](#4-repository-structure)
5. [Architecture Overview](#5-architecture-overview)
6. [Core Interfaces](#6-core-interfaces)
7. [Verse Detection Pipeline](#7-verse-detection-pipeline)
8. [Phase 1 — Core MVP](#8-phase-1--core-mvp)
9. [Phase 2 — Operator Experience](#9-phase-2--operator-experience)
10. [Phase 3 — Open Source Community](#10-phase-3--open-source-community)
11. [Bible Translation Strategy](#11-bible-translation-strategy)
12. [API Key & Privacy Model](#12-api-key--privacy-model)
13. [Platform Notes](#13-platform-notes)
14. [Testing Strategy](#14-testing-strategy)
15. [CI/CD Pipeline](#15-cicd-pipeline)
16. [Contributing Quick Reference](#16-contributing-quick-reference)
17. [Milestone Summary](#17-milestone-summary)

---

## 1. Project Goal

BibleBeam listens to a live sermon and automatically detects Bible references —
exact quotes, paraphrases, and familiar passages — then pushes them to a
projector screen in real time.

**What it is not:**
- A cloud service. All processing happens on the operator's machine.
- A subscription product. Bring your own API keys, no lock-in.
- A closed-source product. MIT licensed, PRs always welcome.

**The north star experience:**
> Pastor says "turn with me to John 3:16" — verse appears on screen within 2
> seconds, without anyone touching a keyboard.

---

## 2. Guiding Principles

These decisions were made upfront and should inform every future design choice.

### Bring Your Own Key (BYOK)
BibleBeam never creates accounts, never stores credentials on a server, and
never proxies API calls through infrastructure it controls. Users paste their
own Deepgram / Whisper / AssemblyAI key into the settings page. It is stored in
the OS keychain via `keytar` and never leaves the machine.

### Local-first
All verse matching runs locally. The only thing that touches the internet is the
speech-to-text stream sent to whichever STT provider the user configured. Bible
lookups, fuzzy matching, and semantic matching all happen on-device.

### Pluggable everything
Every STT provider is a class implementing `ISTTProvider`. Every Bible source is
a class implementing `IBibleProvider`. Adding a new provider should never require
touching core application logic — just drop a new adapter file and register it.

### No audio recording
BibleBeam does not record, store, or log sermon audio at any point. Audio is
streamed directly to the STT provider and discarded. Only the resulting
transcript text is processed.

### Contributor-friendly from day one
Documentation for adding a new STT provider or translation lives in `docs/`
before the first release. Issue templates, contributing guidelines, and clear
interfaces lower the barrier for church tech volunteers to contribute.

---

## 3. Tech Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| Desktop runtime | Electron | Cross-platform, web tech, large ecosystem, familiar to web devs |
| UI framework | React + TypeScript | Widely known, strong typing, good component model |
| Styling | Tailwind CSS | Fast to iterate, utility-first, no CSS file sprawl |
| STT default | Deepgram | Best real-time streaming latency, generous free tier |
| STT alternatives | OpenAI Whisper API, AssemblyAI | Widely known, easy onboarding for contributors |
| Fuzzy matching | fuse.js | Lightweight, no server needed, good enough for verse refs |
| Semantic matching | transformers.js | Runs entirely in Node/browser, no API key needed |
| Keychain storage | keytar | Native OS keychain on all three platforms |
| Local network display | ws (WebSocket) | Any device on church WiFi becomes a display screen |
| Monorepo | pnpm workspaces | Fast installs, clean package boundaries |
| Build/package | electron-builder | Produces .deb, .AppImage, .exe, .dmg from one config |
| CI | GitHub Actions | Free for open source, tight GitHub integration |

### Why Electron over Tauri?
Tauri is lighter and Rust-based, but Electron is chosen here because:
- Contributors are far more likely to know JavaScript/TypeScript than Rust
- The ecosystem for audio capture, WebSockets, and keychain access in Node is
  mature and well-documented
- electron-builder is battle-tested for cross-platform packaging

This decision can be revisited in a future major version if performance becomes
a concern.

---

## 4. Repository Structure

```
biblebeam/
│
├── src/                          # Electron application
│   ├── main/                     # Main process (Node.js)
│   │   ├── index.ts              # App entry point, window management
│   │   ├── audio.ts              # Mic / soundboard capture
│   │   ├── websocket.ts          # Local WebSocket server (port 7700)
│   │   ├── keychain.ts           # keytar wrapper — get/set/delete keys
│   │   └── ipc.ts                # IPC channel definitions (typed)
│   │
│   └── renderer/                 # Renderer process (React)
│       ├── pages/
│       │   ├── Operator.tsx      # Main control panel
│       │   ├── Projector.tsx     # Full-screen verse display window
│       │   └── Settings.tsx      # API keys, preferences, thresholds
│       ├── components/
│       │   ├── TranscriptFeed.tsx
│       │   ├── VerseCard.tsx
│       │   ├── ApprovalQueue.tsx
│       │   └── TranslationPicker.tsx
│       └── hooks/
│           ├── useTranscript.ts
│           └── useDetectedVerses.ts
│
├── packages/                     # Framework-agnostic shared packages
│   │
│   ├── verse-matcher/            # Core detection logic
│   │   ├── src/
│   │   │   ├── regex.ts          # Explicit reference detection (John 3:16)
│   │   │   ├── fuzzy.ts          # fuse.js first-line matching
│   │   │   ├── semantic.ts       # transformers.js embedding match
│   │   │   ├── pipeline.ts       # Orchestrates regex → fuzzy → semantic
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── bible-data/               # Bundled public domain translations
│   │   ├── translations/
│   │   │   ├── kjv.json          # King James Version
│   │   │   ├── web.json          # World English Bible
│   │   │   └── asv.json          # American Standard Version
│   │   ├── src/
│   │   │   └── index.ts          # Typed lookup helpers
│   │   └── package.json
│   │
│   ├── stt-providers/            # Pluggable STT adapters
│   │   ├── src/
│   │   │   ├── base.ts           # ISTTProvider interface
│   │   │   ├── deepgram.ts       # Deepgram streaming adapter
│   │   │   ├── whisper.ts        # OpenAI Whisper adapter
│   │   │   └── assemblyai.ts     # AssemblyAI adapter
│   │   └── package.json
│   │
│   └── bible-providers/          # Pluggable Bible text sources
│       ├── src/
│       │   ├── base.ts           # IBibleProvider interface
│       │   ├── local.ts          # Reads from bible-data package
│       │   └── esv-api.ts        # ESV.org REST API (user key required)
│       └── package.json
│
├── web-display/                  # Standalone browser display page
│   ├── index.html                # Opens on any device via local IP
│   └── display.ts                # Connects to WebSocket, renders verse
│
├── docs/
│   ├── getting-started.md        # Setup guide for non-developers
│   ├── adding-stt-provider.md    # How to add a new STT adapter
│   ├── adding-translation.md     # How to add a new Bible translation
│   └── audio-setup.md            # Connecting a mixer / soundboard
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # Lint + test on every push
│   │   └── release.yml           # Build binaries on tag push
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       ├── new_stt_provider.md
│       └── new_translation.md
│
├── CONTRIBUTING.md
├── DEVPLAN.md                    # This file
├── README.md
├── package.json                  # pnpm workspace root
└── electron-builder.yml          # Packaging config
```

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BibleBeam Desktop App                    │
│                                                             │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │    Operator Panel    │    │   Settings                 │ │
│  │                      │    │   - STT provider + key     │ │
│  │  Live transcript     │    │   - Bible translation      │ │
│  │  Detected verses     │    │   - Confidence threshold   │ │
│  │  Approval queue      │    │   - Auto-display on/off    │ │
│  │  Manual override     │    │                            │ │
│  └──────────────────────┘    └────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Projector Window                        │   │
│  │  Full-screen, drag to second monitor                 │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ Electron IPC
            ┌──────────────▼──────────────┐
            │         Main Process        │
            │                             │
            │  AudioCapture               │
            │       ↓                     │
            │  ISTTProvider               │ ← Deepgram / Whisper / AssemblyAI
            │  (pluggable)                │   (user's own API key)
            │       ↓                     │
            │  VerseMatcher pipeline      │ ← All local, no API needed
            │   1. Regex                  │
            │   2. Fuzzy (fuse.js)        │
            │   3. Semantic (transformers) │
            │       ↓                     │
            │  IBibleProvider             │ ← Local JSON or ESV API
            └──────────────┬──────────────┘
                           │
            ┌──────────────▼──────────────┐
            │     WebSocket Server        │ ← ws, port 7700
            │     (local network only)    │   any device on church WiFi
            └─────────────────────────────┘
```

### Data flow step by step

1. Audio enters via mic or soundboard line-in
2. `audio.ts` streams raw PCM chunks to the active `ISTTProvider`
3. The STT provider returns transcript segments (partial + final)
4. Final segments are passed to `VerseMatcher.pipeline()`
5. The pipeline runs regex → fuzzy → semantic in order, stopping at first match
6. A `VerseMatch` object (reference + confidence + text) is emitted
7. If confidence is above the auto-display threshold, it is pushed immediately
   to the projector window via IPC and to all WebSocket clients
8. If confidence is below threshold, it is placed in the operator approval queue
9. The operator can approve, reject, or manually override at any time

---

## 6. Core Interfaces

These two interfaces are the backbone of the pluggable architecture. Every
contributor building a new adapter must implement one of these. They should
never change without a major version bump.

### ISTTProvider

```typescript
// packages/stt-providers/src/base.ts

export interface TranscriptSegment {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestampMs?: number;
}

export interface ISTTProvider {
  /** Human-readable name shown in the Settings UI */
  readonly name: string;

  /** Short identifier used in config (e.g. "deepgram", "whisper") */
  readonly id: string;

  /**
   * Connect to the STT service using the provided API key.
   * Should throw a descriptive error if the key is invalid.
   */
  connect(apiKey: string): Promise<void>;

  /**
   * Begin streaming audio. The provider calls onTranscript for each
   * partial and final segment. Audio is passed as raw PCM Int16 chunks.
   */
  startStreaming(
    onTranscript: (segment: TranscriptSegment) => void,
    onError: (error: Error) => void
  ): void;

  /** Send a chunk of raw audio data to the STT service */
  sendAudio(chunk: Buffer): void;

  /** Stop streaming and release resources */
  stopStreaming(): void;

  /** Disconnect and clean up */
  disconnect(): void;
}
```

### IBibleProvider

```typescript
// packages/bible-providers/src/base.ts

export interface VerseReference {
  book: string;        // e.g. "John"
  chapter: number;     // e.g. 3
  verse: number;       // e.g. 16
  endVerse?: number;   // for ranges: John 3:16-17
}

export interface VerseResult {
  reference: VerseReference;
  text: string;
  translation: string; // e.g. "KJV", "ESV"
}

export interface IBibleProvider {
  /** Translation abbreviation shown in UI */
  readonly translation: string;

  /** Full translation name */
  readonly translationName: string;

  /** Whether this provider requires an API key */
  readonly requiresApiKey: boolean;

  /** Fetch a single verse or range */
  getVerse(ref: VerseReference): Promise<VerseResult>;

  /**
   * Search the translation's text for a string.
   * Used by the fuzzy and semantic matchers to build the index.
   * Returns up to `limit` results ordered by relevance.
   */
  search(query: string, limit?: number): Promise<VerseResult[]>;
}
```

### VerseMatch (internal)

```typescript
// packages/verse-matcher/src/index.ts

export type MatchMethod = 'regex' | 'fuzzy' | 'semantic';

export interface VerseMatch {
  reference: VerseReference;
  confidence: number;     // 0.0 – 1.0
  method: MatchMethod;
  verseText?: string;     // populated after Bible lookup
  translation?: string;
}
```

---

## 7. Verse Detection Pipeline

The matcher runs three stages in sequence. Each stage only runs if the previous
stage did not produce a match above the confidence threshold.

```
Transcript chunk (final segment from STT)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  Stage 1: Regex — explicit references                 │
│                                                       │
│  Pattern: /\b(book)\s+(\d+)\s*:\s*(\d+)/i            │
│  Handles: "John 3:16", "Ps. 23:1", "1 Cor 13:4-7"   │
│  Confidence: 1.0 on match                            │
│  Cost: negligible                                     │
└───────────────────┬───────────────────────────────────┘
                    │ no match
                    ▼
┌───────────────────────────────────────────────────────┐
│  Stage 2: Fuzzy — first-line index                    │
│                                                       │
│  Index: first 6 words of every verse in active       │
│         translation (built on startup, ~2ms)         │
│  Library: fuse.js                                     │
│  Threshold: score > 0.8 → auto-display               │
│             score 0.5–0.8 → operator queue           │
│  Cost: <5ms per call                                 │
└───────────────────┬───────────────────────────────────┘
                    │ confidence < 0.5
                    ▼
┌───────────────────────────────────────────────────────┐
│  Stage 3: Semantic — embedding match                  │
│                                                       │
│  Model: Xenova/all-MiniLM-L6-v2 (via transformers.js)│
│  Runs: locally in Node, no API key                   │
│  Index: precomputed embeddings for all verses        │
│         (cached to disk on first run, ~30s)          │
│  Threshold: cosine similarity > 0.75                 │
│  Cost: ~50ms per query (after warmup)                │
│  Default: disabled (toggle in Settings)              │
└───────────────────────────────────────────────────────┘
        │
        ▼
VerseMatch { reference, confidence, method }
        │
        ├── confidence ≥ auto_threshold → push to projector immediately
        │
        └── confidence < auto_threshold → push to operator approval queue
```

**Why three stages?**
Regex is instant and 100% accurate for explicit references. Fuzzy catches
common quotes without the overhead of running embeddings on every phrase.
Semantic is the most powerful but also the most expensive — it's opt-in so
churches with slower machines can still use the app comfortably.

---

## 8. Phase 1 — Core MVP

**Goal:** A working end-to-end demo. Audio goes in, verse comes out on a second
screen. Nothing polished, just functional.

**Definition of done:** A developer can sit at their laptop, speak "John 3:16",
and see the verse text appear in a second window within 3 seconds.

---

### Task 1.1 — Bootstrap the Electron app

```bash
npx create-electron-app biblebeam --template=webpack-typescript
cd biblebeam
pnpm install
```

Set up pnpm workspaces. Create the root `package.json` with workspace config
pointing to `packages/*` and `src/`. Verify hot reload works in development.

**Deliverable:** `pnpm dev` launches a blank two-window Electron app.

---

### Task 1.2 — Two-window setup

In `src/main/index.ts`:
- Create `operatorWindow` — your main 1200×800 control window
- Create `projectorWindow` — a frameless, always-on-top 1920×1080 window
- The projector window should be dark-background with large centered text
- Both windows load different React routes (`/operator` and `/projector`)

Set up React Router in the renderer. `Operator.tsx` shows placeholder text.
`Projector.tsx` shows a full-screen dark background with white text centered.

**Deliverable:** Two windows launch. Operator has placeholder UI. Projector is a
black screen. You can drag the projector window to a second monitor.

---

### Task 1.3 — IPC channel definitions

Define all IPC channels in `src/main/ipc.ts` before writing any handler:

```typescript
export const IPC = {
  TRANSCRIPT_UPDATE:  'transcript:update',
  VERSE_DETECTED:     'verse:detected',
  VERSE_APPROVED:     'verse:approved',
  VERSE_REJECTED:     'verse:rejected',
  VERSE_OVERRIDE:     'verse:override',
  PROJECTOR_UPDATE:   'projector:update',
  SETTINGS_GET:       'settings:get',
  SETTINGS_SET:       'settings:set',
  AUDIO_START:        'audio:start',
  AUDIO_STOP:         'audio:stop',
} as const;
```

Type all IPC payloads. This prevents silent breakage when channel names change.

---

### Task 1.4 — Audio capture

In `src/main/audio.ts`:

**Linux (PulseAudio):** Spawn `parecord --format=s16le --rate=16000 --channels=1`
as a child process. Pipe its stdout as a `Buffer` stream.

**macOS:** Use `node-audiorecorder` or `sox` via child process.

**Windows:** Use `node-audiorecorder` or `sox` via child process.

Design the audio module as an EventEmitter that emits `data` events with Buffer
chunks. The STT adapter subscribes to these events. This decouples audio capture
from the transport layer completely.

**Test:** Log chunk sizes to console. Confirm audio is flowing before connecting
to any external service.

---

### Task 1.5 — Deepgram STT adapter

Install: `pnpm add @deepgram/sdk`

Implement `packages/stt-providers/src/deepgram.ts` against `ISTTProvider`.

Key implementation notes:
- Use Deepgram's live streaming API (`createLive`)
- Set `model: 'nova-2'`, `language: 'en-US'`, `interim_results: true`
- Emit partial transcripts immediately (for the live feed display)
- Only run verse detection on `is_final: true` segments to avoid false triggers
- Handle reconnection on socket drop — streaming services disconnect periodically

**Test:** Speak into mic. Final transcript segments appear in the console.

---

### Task 1.6 — Verse matcher core (regex + fuzzy)

Build `packages/verse-matcher/` as a standalone package with no Electron
dependency. This makes it testable in isolation.

`src/regex.ts` — book name normalisation + reference extraction:
- Handle all 66 books including common abbreviations (Ps., 1 Cor., Gen.)
- Handle ranges (John 3:16-17)
- Return `VerseReference | null`

`src/fuzzy.ts` — fuse.js index over KJV first lines:
- On init, build an index of `{ ref, firstLine }` for every verse
- `match(text)` returns the best hit with a score

`src/pipeline.ts` — orchestrate stages, return `VerseMatch`

**Tests to write:**
- "John 3:16" → regex match, confidence 1.0
- "Ps 23:1" → regex match (abbreviation)
- "For God so loved the world" → fuzzy match to John 3:16
- "The Lord is my shepherd" → fuzzy match to Psalm 23:1
- Gibberish → no match

---

### Task 1.7 — KJV JSON bundle

`packages/bible-data/translations/kjv.json` structure:

```json
{
  "John": {
    "3": {
      "16": "For God so loved the world, that he gave his only begotten Son..."
    }
  }
}
```

Source: public domain KJV text is freely available. Confirm the specific source
file used and document it in `packages/bible-data/README.md`. Typical file size
is ~4MB — acceptable for bundling.

Build a typed `getVerse(ref)` lookup in `src/index.ts`.

---

### Task 1.8 — Wire it all together

In `src/main/index.ts`:
1. Start audio capture on app ready
2. Start Deepgram streaming (hardcoded key for now — settings comes in Phase 2)
3. On final transcript → run `VerseMatcher.pipeline(transcript)`
4. On `VerseMatch` returned → look up verse text from KJV
5. Send verse to projector window via `ipcMain.emit(IPC.PROJECTOR_UPDATE, verse)`
6. Projector window renders verse text and reference

**Phase 1 complete when:** Speak "John 3:16 says for God so loved the world" →
verse appears on projector window within 3 seconds.

---

## 9. Phase 2 — Operator Experience

**Goal:** Safe and reliable enough to use in a real Sunday service. A media
team volunteer can run it without developer help.

**Definition of done:** A non-technical person can install the app, paste in
their API key, connect their audio, and run a full service with confidence that
wrong verses will not auto-display.

---

### Task 2.1 — Settings page

`src/renderer/pages/Settings.tsx`:
- STT provider dropdown (Deepgram / Whisper / AssemblyAI)
- API key field per provider — shows masked value if already saved
- Save button → calls `keychain.set(provider, key)` via IPC
- Test connection button → verifies the key works before service
- Bible translation dropdown (KJV / ASV / WEB / ESV)
- Confidence threshold slider (default: 0.8 for auto-display)
- Semantic matching toggle (default: off)

`src/main/keychain.ts`:
```typescript
import keytar from 'keytar';

const SERVICE = 'biblebeam';

export const keychain = {
  get:    (key: string) => keytar.getPassword(SERVICE, key),
  set:    (key: string, value: string) => keytar.setPassword(SERVICE, key, value),
  delete: (key: string) => keytar.deletePassword(SERVICE, key),
};
```

**Security note:** Keys are stored in the OS keychain (macOS Keychain, Windows
Credential Manager, Linux libsecret). They are never written to disk in plaintext,
never logged, and never sent to any server other than the user's chosen STT provider.

---

### Task 2.2 — Operator panel

`src/renderer/pages/Operator.tsx` — three panels:

**Top: Live Transcript Feed**
- Rolling log of transcript segments (last ~20 lines)
- Final segments shown in full brightness
- Partial/interim segments shown dimmed
- Auto-scroll to bottom, pause on hover

**Middle: Approval Queue**
- Verses detected below the auto-display threshold wait here
- Each card shows: reference, confidence score, detection method, verse preview
- Two buttons: Approve (push to projector) / Reject (dismiss)
- Items expire after 60 seconds if not actioned

**Bottom: Current Verse + Override**
- Shows what is currently on the projector screen
- Manual override: type any reference (e.g. "Psalm 23:1") → look up → push
- Clear button: removes verse from projector screen
- Translation picker: switch translation for the current verse

---

### Task 2.3 — Whisper and AssemblyAI adapters

Add `packages/stt-providers/src/whisper.ts` and `assemblyai.ts`.

Each implements `ISTTProvider` exactly. The main process instantiates whichever
provider the user selected in Settings. No other code changes required — this
validates the interface design.

Note on Whisper: OpenAI's API is not natively streaming in the same way as
Deepgram. Buffer audio into ~5-second chunks, send to the Whisper transcription
endpoint, receive complete transcript. Latency will be higher (~3–5s vs ~1.5s
for Deepgram) but the accuracy is excellent.

---

### Task 2.4 — WebSocket local network display

In `src/main/websocket.ts`:

```typescript
import { WebSocketServer } from 'ws';

export function startDisplayServer(port = 7700) {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws) => {
    // Send current verse state immediately on connect
    ws.send(JSON.stringify(currentVerseState));
  });

  return {
    broadcast: (payload: object) => {
      const msg = JSON.stringify(payload);
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
      });
    }
  };
}
```

`web-display/index.html` — a standalone HTML page that:
- Connects to `ws://[local-ip]:7700`
- Renders the current verse full-screen (black bg, white large text)
- Auto-reconnects on disconnect
- Shows "Waiting..." when no verse is active

The operator panel shows a QR code linking to `http://[local-ip]:7700` so
phones and tablets can connect quickly without typing the IP address.

---

### Task 2.5 — ESV API integration

`packages/bible-providers/src/esv-api.ts` — implements `IBibleProvider`:
- Uses `https://api.esv.org/v3/passage/text/`
- Requires user's own ESV API key (free, 500 req/day)
- Key stored in keychain under `'esv-api'`
- Caches looked-up verses in memory to avoid re-fetching

ESV API key can be obtained free at: https://api.esv.org

---

### Task 2.6 — ASV and WEB translations

Add `packages/bible-data/translations/asv.json` and `web.json`. Both are fully
public domain. Register them in `packages/bible-providers/src/local.ts`.

Users can switch translations in the operator panel at any time. The currently
displayed verse re-fetches in the new translation.

---

### Task 2.7 — Projector window polish

- Black background, white text, large sans-serif font
- Reference shown small at top: "John 3:16 · ESV"
- Verse text fills ~60% of screen height
- Smooth fade transition when verse changes (200ms)
- "Listening..." indicator in corner when STT is active
- Completely blank when no verse is queued (not "no verse" text)
- Click-through / always-on-top option for when OBS or ProPresenter
  is capturing the window

---

## 10. Phase 3 — Open Source Community

**Goal:** Someone can find the repo, open a PR adding a new STT provider or
translation, and have it merged without asking questions in the issues.

---

### Task 3.1 — Contributor documentation

`docs/adding-stt-provider.md`:
1. Create `packages/stt-providers/src/your-provider.ts`
2. Implement all methods of `ISTTProvider` (link to interface definition)
3. Export from `packages/stt-providers/src/index.ts`
4. Register in `src/main/index.ts` provider map
5. Add your key ID to Settings page dropdown
6. Write at least one test in `packages/stt-providers/tests/`
7. Add your provider to the table in README.md
8. Open a PR — include a short note about your provider's free tier

`docs/adding-translation.md`:
1. Obtain the translation text (confirm license — must be public domain or
   have explicit permission for bundling)
2. Convert to the standard JSON schema in `bible-data/translations/`
3. Add a `local.ts` provider entry
4. Open a PR — include a note about the translation's license

`docs/audio-setup.md`:
- How to connect a Behringer or Yamaha mixer via USB
- How to use a 3.5mm jack from the main mix output
- How to use a Focusrite Scarlett as the audio interface
- Recommended system: take a feed from the monitor mix, not FOH

---

### Task 3.2 — GitHub Actions CI

`.github/workflows/ci.yml` — runs on every push and PR:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint         # ESLint + TypeScript check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test         # Jest — verse-matcher tests
```

`.github/workflows/release.yml` — runs when a tag is pushed (`v*`):

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]

steps:
  - run: pnpm build            # electron-builder
  - uses: actions/upload-release-asset@v1
    # Attaches .deb, .AppImage, .dmg, .exe to GitHub Release
```

---

### Task 3.3 — Release packaging

`electron-builder.yml`:

```yaml
appId: com.biblebeam.app
productName: BibleBeam

linux:
  target: [deb, AppImage]
  category: Utility

mac:
  target: [dmg]

win:
  target: [nsis]

files:
  - src/
  - packages/
  - node_modules/
```

Target artifacts per release:
- `BibleBeam-x.y.z-linux-amd64.deb`
- `BibleBeam-x.y.z-linux-x86_64.AppImage`
- `BibleBeam-x.y.z-mac-universal.dmg`
- `BibleBeam-x.y.z-win-x64-setup.exe`

---

### Task 3.4 — Issue templates

`.github/ISSUE_TEMPLATE/bug_report.md`:
- OS and version
- BibleBeam version
- STT provider being used
- What happened vs what was expected
- Transcript log snippet (if relevant)

`.github/ISSUE_TEMPLATE/new_stt_provider.md`:
- Provider name and URL
- Free tier details
- Streaming support (yes/no)
- Does the submitter plan to implement it?

`.github/ISSUE_TEMPLATE/new_translation.md`:
- Translation name and abbreviation
- License / copyright status
- Source of the text

---

### Task 3.5 — Semantic matching (transformers.js)

This is the hardest and most optional task in Phase 3. It enables paraphrase
detection without any API key.

`packages/verse-matcher/src/semantic.ts`:
1. Use `@xenova/transformers` — Node.js-compatible ONNX runtime
2. Model: `Xenova/all-MiniLM-L6-v2` (~23MB download on first use)
3. On first enable, compute embeddings for all ~31,000 KJV verses
4. Cache the embedding matrix to disk in the app's data directory
5. On query, embed the transcript chunk and compute cosine similarity
6. Return top match if similarity > 0.75

Performance expectations:
- First run: ~30 seconds to build the embedding index
- Subsequent runs: load from cache in ~2 seconds
- Per-query: ~50ms (CPU) after warmup

This is disabled by default. Users enable it in Settings. Show a one-time
progress bar when the index is being built.

---

### Task 3.6 — Auto-update

Install `electron-updater`. Configure it to check GitHub Releases on app start.
Show a non-intrusive banner: "BibleBeam 1.x.x is available — update after service."
Never force-update or interrupt a running session.

---

## 11. Bible Translation Strategy

| Translation | Bundled | Source | License |
|---|---|---|---|
| KJV | Yes | Public domain | Free |
| ASV | Yes | Public domain | Free |
| WEB | Yes | Public domain | Free |
| ESV | Via API | api.esv.org | Free (user key, 500 req/day) |
| NIV | No | Copyright | User must source |
| NLT | No | Copyright | User must source |
| NKJV | No | Copyright | User must source |

Copyright translations will not be bundled. If a user has a valid API key for a
service that provides NIV/NLT/NKJV, they can implement an `IBibleProvider`
adapter and the app will support it. Document this clearly in `docs/adding-translation.md`.

---

## 12. API Key & Privacy Model

### What BibleBeam does with your data

| Data | What happens |
|---|---|
| Sermon audio | Streamed to your chosen STT provider. Never stored anywhere. |
| Transcript text | Processed locally for verse detection. Never stored or sent. |
| API keys | Stored in OS keychain via `keytar`. Never logged or transmitted. |
| Detected verses | Displayed locally. Never sent anywhere. |
| Usage / analytics | None. BibleBeam has no telemetry. |

### Key storage implementation

```
User pastes key in Settings UI
        ↓
IPC call to main process
        ↓
keytar.setPassword('biblebeam', 'deepgram', userKey)
        ↓
Stored in OS keychain
  macOS:   Keychain Access
  Windows: Windows Credential Manager
  Linux:   libsecret / GNOME Keyring
```

Keys are read on app startup and held in memory only for the duration of the
session. They are never written to disk in plaintext, never appear in logs, and
are never included in bug reports or error messages.

---

## 13. Platform Notes

### Linux (primary dev platform)

Audio capture uses PulseAudio by default. Spawn `parecord`:

```typescript
import { spawn } from 'child_process';

const recorder = spawn('parecord', [
  '--format=s16le',
  '--rate=16000',
  '--channels=1',
  '--raw'
]);
recorder.stdout.on('data', (chunk: Buffer) => audioEmitter.emit('data', chunk));
```

If the user is on PipeWire (modern Ubuntu/Fedora), `parecord` still works via
the PulseAudio compatibility layer. No extra config needed.

Required system packages: `libasound2-dev` (for building native addons),
`libsecret-1-dev` (for keytar on GNOME). Document in README under "Build from source."

### macOS

Use `node-audiorecorder` or spawn `sox -d -t raw -r 16000 -e signed -b 16 -c 1 -`.
Test on both Intel and Apple Silicon — electron-builder supports universal binaries.
Code signing is required for Gatekeeper. For the open-source release, notarize
via GitHub Actions using a free Apple Developer account (costs $99/year but enables
distribution outside the App Store).

### Windows

Use `node-audiorecorder` or the Windows Audio Session API via a native Node addon.
The `.exe` installer is built with NSIS via electron-builder. Windows Defender
SmartScreen will warn on first run for unsigned binaries — the README should set
this expectation and explain it.

---

## 14. Testing Strategy

### What to test

**verse-matcher package** — pure functions, high priority, run in CI:
- Every regex pattern against known input strings
- Abbreviation normalisation (Ps. → Psalms, 1 Cor. → 1 Corinthians, etc.)
- Fuzzy match returns correct verse for partial quote
- Pipeline short-circuits at regex stage when explicit ref is found
- Pipeline falls through to fuzzy when no explicit ref
- No match returned for unrelated text

**bible-data package** — data integrity:
- Every book is present
- Every expected chapter/verse exists
- No empty strings

**stt-providers package** — interface conformance (mock the network):
- Provider correctly calls `onTranscript` with final segments
- Provider reconnects after simulated disconnect

### What not to test

- Electron window management (integration test territory, high maintenance)
- Deepgram's actual transcription accuracy (not our code)
- UI components (low ROI for this project's stage)

### Running tests

```bash
pnpm test                    # all packages
pnpm --filter verse-matcher test   # single package
```

---

## 15. CI/CD Pipeline

```
Push / PR to any branch
        │
        ▼
CI workflow
  ├── lint (ESLint + tsc --noEmit)
  └── test (Jest, verse-matcher)
        │
        ▼ (only on push to main)
Build check
  └── pnpm build (confirm app builds, no artifacts uploaded)
        │
        ▼ (only on git tag push: v*)
Release workflow (matrix: ubuntu, macos, windows)
  ├── Build platform binary
  ├── Sign (macOS: codesign + notarize; Windows: optional signtool)
  └── Upload to GitHub Release as attachment
```

Version tagging convention: `v1.0.0`, `v1.1.0`, `v1.1.1` — semantic versioning.
Tag from `main` only. Draft the release in GitHub, attach the binaries, then
publish. The release notes should list what changed and whether any API keys or
settings need to be re-entered.

---

## 16. Contributing Quick Reference

```bash
# Fork the repo, then:
git clone https://github.com/YOUR_USERNAME/biblebeam.git
cd biblebeam
pnpm install

# Development
pnpm dev                     # Electron app with hot reload

# Tests
pnpm test                    # All package tests
pnpm lint                    # ESLint + TypeScript check

# Build
pnpm build                   # Build for current platform
```

**To add a new STT provider:** See `docs/adding-stt-provider.md`

**To add a new Bible translation:** See `docs/adding-translation.md`

**Branch naming:**
- `feat/provider-assemblyai`
- `fix/regex-abbreviation-edge-case`
- `docs/audio-setup-guide`

**Commit style:** Conventional Commits — `feat:`, `fix:`, `docs:`, `chore:`

---

## 17. Milestone Summary

| Milestone | Key outcome | Phase |
|---|---|---|
| M1 | Two-window Electron app boots | 1 |
| M2 | Mic audio streams to Deepgram | 1 |
| M3 | Explicit verse reference detected and shown on screen | 1 |
| M4 | Fuzzy matching catches partial quotes | 1 |
| M5 | Settings page saves API key to keychain | 2 |
| M6 | Operator approval queue prevents bad auto-displays | 2 |
| M7 | Any device on WiFi can show the verse via WebSocket | 2 |
| M8 | Whisper and AssemblyAI providers working | 2 |
| M9 | ESV via API key, ASV + WEB bundled | 2 |
| M10 | GitHub Actions CI running on every PR | 3 |
| M11 | Release builds for Linux, macOS, Windows on tag push | 3 |
| M12 | Contributor docs complete, issue templates live | 3 |
| M13 | Semantic paraphrase detection (transformers.js) | 3 |
| M14 | Auto-update from GitHub Releases | 3 |

---

*Last updated: 2026 — maintained alongside the codebase.*
*If you are reading this and something is out of date, please open a PR to fix it.*