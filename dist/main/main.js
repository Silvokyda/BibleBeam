/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./packages/bible-data/src/index.ts"
/*!******************************************!*\
  !*** ./packages/bible-data/src/index.ts ***!
  \******************************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.loadTranslation = loadTranslation;
exports.getVerse = getVerse;
exports.getBooks = getBooks;
exports.getAvailableTranslations = getAvailableTranslations;
// packages/bible-data/src/index.ts
const fs_1 = __importDefault(__webpack_require__(/*! fs */ "fs"));
const path_1 = __importDefault(__webpack_require__(/*! path */ "path"));
const cache = {};
function findTranslationFile(id) {
    const candidates = [
        path_1.default.join(__dirname, '..', 'translations', `${id.toLowerCase()}.json`),
        path_1.default.join(process.cwd(), 'packages', 'bible-data', 'translations', `${id.toLowerCase()}.json`),
    ];
    for (const p of candidates) {
        if (fs_1.default.existsSync(p))
            return p;
    }
    return null;
}
function loadTranslation(id) {
    if (cache[id])
        return cache[id];
    const filePath = findTranslationFile(id);
    if (!filePath) {
        console.warn(`[BibleData] Translation "${id}" not found`);
        return null;
    }
    try {
        const raw = fs_1.default.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        cache[id] = data;
        const books = Object.keys(data).length;
        const verses = Object.values(data).reduce((t, chs) => t + Object.values(chs).reduce((t2, vs) => t2 + Object.keys(vs).length, 0), 0);
        console.log(`[BibleData] ${id} loaded: ${books} books, ${verses} verses`);
        return data;
    }
    catch (err) {
        console.error(`[BibleData] Failed to load ${id}:`, err.message);
        return null;
    }
}
function getVerse(bible, book, chapter, verse) {
    return bible[book]?.[String(chapter)]?.[String(verse)] ?? null;
}
function getBooks(bible) {
    return Object.keys(bible);
}
function getAvailableTranslations() {
    const dir = findTranslationDir();
    if (!dir)
        return [];
    return fs_1.default.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', '').toUpperCase());
}
function findTranslationDir() {
    const candidates = [
        path_1.default.join(__dirname, '..', 'translations'),
        path_1.default.join(process.cwd(), 'packages', 'bible-data', 'translations'),
    ];
    for (const p of candidates) {
        if (fs_1.default.existsSync(p))
            return p;
    }
    return null;
}


/***/ },

/***/ "./packages/stt-providers/src/deepgram.ts"
/*!************************************************!*\
  !*** ./packages/stt-providers/src/deepgram.ts ***!
  \************************************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

// packages/stt-providers/src/deepgram.ts
// Deepgram streaming STT adapter.
// Free tier: $200 credit — effectively unlimited for weekly church use.
// Get a key at: https://console.deepgram.com
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DeepgramProvider = void 0;
class DeepgramProvider {
    constructor() {
        this.name = 'Deepgram';
        this.id = 'deepgram';
        this.client = null;
        this.live = null;
    }
    async connect(apiKey) {
        // Lazy-require so the app doesn't break if the SDK isn't installed yet
        const { createClient } = await Promise.resolve(`${'@deepgram/sdk'}`).then(s => __importStar(__webpack_require__("./packages/stt-providers/src sync recursive")(s)));
        this.client = createClient(apiKey);
        // Validate the key with a lightweight API call
        const { error } = await this.client.manage.getProjects();
        if (error) {
            throw new Error(`Deepgram key invalid: ${error.message}`);
        }
    }
    startStreaming(onTranscript, onError) {
        if (!this.client) {
            onError(new Error('DeepgramProvider.connect() must be called before startStreaming()'));
            return;
        }
        this.live = this.client.listen.live({
            model: 'nova-2',
            language: 'en-US',
            encoding: 'linear16',
            sample_rate: 16000,
            channels: 1,
            interim_results: true,
            punctuate: true,
            smart_format: true,
        });
        this.live.on('Results', (data) => {
            const alt = data?.channel?.alternatives?.[0];
            if (!alt)
                return;
            onTranscript({
                text: alt.transcript,
                isFinal: data.is_final === true,
                confidence: alt.confidence,
                timestampMs: Date.now(),
            });
        });
        this.live.on('error', (err) => {
            onError(new Error(`Deepgram error: ${err?.message ?? JSON.stringify(err)}`));
        });
        this.live.on('close', () => {
            // Auto-reconnect after a grace period (Deepgram drops idle connections)
            setTimeout(() => {
                if (this.client) {
                    this.startStreaming(onTranscript, onError);
                }
            }, 2000);
        });
    }
    sendAudio(chunk) {
        if (this.live?.getReadyState() === 1 /* OPEN */) {
            this.live.send(chunk);
        }
    }
    stopStreaming() {
        this.live?.finish();
        this.live = null;
    }
    disconnect() {
        this.stopStreaming();
        this.client = null;
    }
}
exports.DeepgramProvider = DeepgramProvider;


/***/ },

/***/ "./packages/stt-providers/src/groq.ts"
/*!********************************************!*\
  !*** ./packages/stt-providers/src/groq.ts ***!
  \********************************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

// packages/stt-providers/src/groq.ts
// Groq Whisper STT — buffers audio chunks, sends to Groq for transcription.
// Free tier: 7,200 seconds/day. More than enough for church use.
// Get a key at: https://console.groq.com
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GroqProvider = void 0;
const groq_sdk_1 = __importStar(__webpack_require__(/*! groq-sdk */ "groq-sdk"));
// Buffer config: 4 seconds of 16kHz mono s16le audio
const CHUNK_MS = 4000;
const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const CHUNK_BYTES = (SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * CHUNK_MS) / 1000;
class GroqProvider {
    constructor() {
        this.name = 'Groq (Whisper)';
        this.id = 'groq';
        this.groq = null;
        this.buffer = [];
        this.bufferSize = 0;
        this.streaming = false;
        this.processing = false;
        this.onTranscript = null;
        this.onError = null;
    }
    async connect(apiKey) {
        this.groq = new groq_sdk_1.default({ apiKey });
        // Validate key — list models to confirm it works
        try {
            await this.groq.models.list();
            console.log('[Groq] API key valid');
        }
        catch (err) {
            this.groq = null;
            if (err?.status === 401 || err?.message?.includes('401')) {
                throw new Error('Invalid Groq API key. Check it in Settings.');
            }
            throw new Error(`Cannot reach Groq API: ${err?.message || err}`);
        }
    }
    startStreaming(onTranscript, onError) {
        if (!this.groq) {
            onError(new Error('Call connect() before startStreaming()'));
            return;
        }
        this.onTranscript = onTranscript;
        this.onError = onError;
        this.streaming = true;
        this.buffer = [];
        this.bufferSize = 0;
        console.log('[Groq] Streaming started — buffering audio');
    }
    sendAudio(chunk) {
        if (!this.streaming)
            return;
        this.buffer.push(chunk);
        this.bufferSize += chunk.length;
        if (this.bufferSize >= CHUNK_BYTES && !this.processing) {
            const audioData = Buffer.concat(this.buffer);
            this.buffer = [];
            this.bufferSize = 0;
            this.transcribeChunk(audioData);
        }
    }
    stopStreaming() {
        if (this.bufferSize >= CHUNK_BYTES / 2 && !this.processing) {
            const audioData = Buffer.concat(this.buffer);
            this.transcribeChunk(audioData);
        }
        this.streaming = false;
        this.buffer = [];
        this.bufferSize = 0;
        console.log('[Groq] Streaming stopped');
    }
    disconnect() {
        this.stopStreaming();
        this.onTranscript = null;
        this.onError = null;
        this.groq = null;
    }
    // ── Internal ──────────────────────────────────────────────────────────────
    async transcribeChunk(pcmData) {
        if (!this.groq || !this.onTranscript)
            return;
        this.processing = true;
        try {
            // Convert raw PCM → WAV in memory — no temp file needed
            const wav = pcmToWav(pcmData, SAMPLE_RATE, CHANNELS);
            // toFile() is the Groq SDK's own helper — accepts a Buffer/Uint8Array
            // and returns the correct Uploadable type, no globalThis.File needed.
            const file = await (0, groq_sdk_1.toFile)(wav, 'audio.wav', { type: 'audio/wav' });
            const result = await this.groq.audio.transcriptions.create({
                file,
                model: 'whisper-large-v3-turbo',
                language: 'en',
            });
            const text = result?.text?.trim();
            if (text) {
                this.onTranscript({
                    text,
                    isFinal: true,
                    timestampMs: Date.now(),
                });
            }
        }
        catch (err) {
            console.error('[Groq] Transcription error:', err?.message || err);
            this.onError?.(new Error(`Transcription failed: ${err?.message || err}`));
        }
        finally {
            this.processing = false;
        }
    }
}
exports.GroqProvider = GroqProvider;
// ── PCM → WAV ─────────────────────────────────────────────────────────────────
function pcmToWav(pcm, sampleRate, channels) {
    const bytesPerSample = 2;
    const byteRate = sampleRate * channels * bytesPerSample;
    const blockAlign = channels * bytesPerSample;
    const dataSize = pcm.length;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(16, 34); // bits per sample
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    return Buffer.concat([header, pcm]);
}


/***/ },

/***/ "./packages/stt-providers/src/index.ts"
/*!*********************************************!*\
  !*** ./packages/stt-providers/src/index.ts ***!
  \*********************************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DeepgramProvider = exports.GroqProvider = void 0;
exports.createProvider = createProvider;
var groq_1 = __webpack_require__(/*! ./groq */ "./packages/stt-providers/src/groq.ts");
Object.defineProperty(exports, "GroqProvider", ({ enumerable: true, get: function () { return groq_1.GroqProvider; } }));
var deepgram_1 = __webpack_require__(/*! ./deepgram */ "./packages/stt-providers/src/deepgram.ts");
Object.defineProperty(exports, "DeepgramProvider", ({ enumerable: true, get: function () { return deepgram_1.DeepgramProvider; } }));
const groq_2 = __webpack_require__(/*! ./groq */ "./packages/stt-providers/src/groq.ts");
const deepgram_2 = __webpack_require__(/*! ./deepgram */ "./packages/stt-providers/src/deepgram.ts");
function createProvider(id) {
    switch (id) {
        case 'groq': return new groq_2.GroqProvider();
        case 'deepgram': return new deepgram_2.DeepgramProvider();
        default:
            throw new Error(`Provider "${id}" is not yet implemented. Use Groq or Deepgram.`);
    }
}


/***/ },

/***/ "./packages/verse-matcher/src/fuzzy.ts"
/*!*********************************************!*\
  !*** ./packages/verse-matcher/src/fuzzy.ts ***!
  \*********************************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

// packages/verse-matcher/src/fuzzy.ts
// Stage 2 — fuzzy first-line matching via fuse.js
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildFuzzyIndex = buildFuzzyIndex;
exports.fuzzyMatch = fuzzyMatch;
exports.firstWords = firstWords;
const fuse_js_1 = __importDefault(__webpack_require__(/*! fuse.js */ "./node_modules/fuse.js/dist/fuse.cjs"));
let fuse = null;
function buildFuzzyIndex(entries) {
    fuse = new fuse_js_1.default(entries, {
        keys: ['firstLine'],
        threshold: 0.5,
        includeScore: true,
        minMatchCharLength: 4,
        ignoreLocation: true,
    });
    console.log(`[FuzzyMatcher] Index built: ${entries.length} entries`);
}
function fuzzyMatch(text) {
    if (!fuse)
        return null;
    const query = text.trim().slice(0, 60);
    const results = fuse.search(query, { limit: 1 });
    if (!results.length || results[0].score === undefined)
        return null;
    const best = results[0];
    return {
        ref: best.item.ref,
        score: best.score,
        normalizedScore: 1 - best.score,
    };
}
function firstWords(text, n = 8) {
    return text.split(/\s+/).slice(0, n).join(' ');
}


/***/ },

/***/ "./packages/verse-matcher/src/pipeline.ts"
/*!************************************************!*\
  !*** ./packages/verse-matcher/src/pipeline.ts ***!
  \************************************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

// packages/verse-matcher/src/pipeline.ts
// Orchestrates: regex → fuzzy → semantic
// Includes a sliding window so verses spoken across multiple STT chunks are caught.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pushSegment = pushSegment;
exports.clearWindow = clearWindow;
exports.detectVerse = detectVerse;
const regex_1 = __webpack_require__(/*! ./regex */ "./packages/verse-matcher/src/regex.ts");
const fuzzy_1 = __webpack_require__(/*! ./fuzzy */ "./packages/verse-matcher/src/fuzzy.ts");
// ── Sliding window ────────────────────────────────────────────────────────────
// Keeps the last N transcript segments so a verse quote that spans multiple
// 4-second chunks can still be matched (e.g. "For God so loved the world" +
// "that he gave his only begotten son" arrive in separate chunks).
const WINDOW_SIZE = 4; // number of segments to keep
const recentSegments = [];
function pushSegment(text) {
    recentSegments.push(text.trim());
    if (recentSegments.length > WINDOW_SIZE) {
        recentSegments.shift();
    }
}
function windowText() {
    return recentSegments.join(' ');
}
function clearWindow() {
    recentSegments.length = 0;
}
// ── Main entry ────────────────────────────────────────────────────────────────
async function detectVerse(text, options = {}) {
    const opts = {
        minFuzzyScore: 0.45, // slightly more permissive than before
        semanticEnabled: false,
        semanticThreshold: 0.75,
        ...options,
    };
    // Add this segment to the sliding window
    pushSegment(text);
    // --- Stage 1: Regex on current segment first (fast path) ---
    const explicitCurrent = (0, regex_1.detectExplicitReference)(text);
    if (explicitCurrent) {
        clearWindow(); // fresh start after an explicit hit
        return {
            reference: explicitCurrent,
            referenceString: (0, regex_1.formatReference)(explicitCurrent),
            confidence: 1.0,
            method: 'regex',
        };
    }
    // --- Stage 1b: Regex on the sliding window (catches split references) ---
    // e.g. "...that's in John 3" followed by ".16" or "verse 16" next chunk
    const combined = windowText();
    const explicitWindow = (0, regex_1.detectExplicitReference)(combined);
    if (explicitWindow) {
        clearWindow();
        return {
            reference: explicitWindow,
            referenceString: (0, regex_1.formatReference)(explicitWindow),
            confidence: 0.95, // slightly less than 1.0 since it needed context
            method: 'regex',
        };
    }
    // --- Stage 2: Fuzzy on current segment ---
    const fuzzyCurrent = (0, fuzzy_1.fuzzyMatch)(text);
    if (fuzzyCurrent && fuzzyCurrent.normalizedScore >= opts.minFuzzyScore) {
        return {
            reference: fuzzyCurrent.ref,
            referenceString: (0, regex_1.formatReference)(fuzzyCurrent.ref),
            confidence: fuzzyCurrent.normalizedScore,
            method: 'fuzzy',
        };
    }
    // --- Stage 2b: Fuzzy on sliding window (catches multi-chunk quotes) ---
    if (recentSegments.length > 1) {
        const fuzzyWindow = (0, fuzzy_1.fuzzyMatch)(combined);
        if (fuzzyWindow && fuzzyWindow.normalizedScore >= opts.minFuzzyScore) {
            return {
                reference: fuzzyWindow.ref,
                referenceString: (0, regex_1.formatReference)(fuzzyWindow.ref),
                // Slight penalty since it needed multiple chunks to match
                confidence: fuzzyWindow.normalizedScore * 0.9,
                method: 'fuzzy',
            };
        }
    }
    // Stage 3: Semantic — not yet implemented
    return null;
}


/***/ },

/***/ "./packages/verse-matcher/src/regex.ts"
/*!*********************************************!*\
  !*** ./packages/verse-matcher/src/regex.ts ***!
  \*********************************************/
(__unused_webpack_module, exports) {

"use strict";

// packages/verse-matcher/src/regex.ts
// Stage 1 of the detection pipeline.
// Detects explicit references in many spoken/written forms:
//   "John 3:16", "John 3.16", "John 3 16", "John chapter 3 verse 16",
//   "John three sixteen", "Revelation 21 verse six", "Genesis 1 1"
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.detectExplicitReference = detectExplicitReference;
exports.formatReference = formatReference;
// All 66 books + common abbreviations, ordered longest-first so
// greedy matching prefers "1 Corinthians" over "Cor"
const BOOK_MAP = {
    // Old Testament
    'genesis': 'Genesis', 'gen': 'Genesis',
    'exodus': 'Exodus', 'exo': 'Exodus', 'ex': 'Exodus',
    'leviticus': 'Leviticus', 'lev': 'Leviticus',
    'numbers': 'Numbers', 'num': 'Numbers',
    'deuteronomy': 'Deuteronomy', 'deut': 'Deuteronomy', 'deu': 'Deuteronomy',
    'joshua': 'Joshua', 'josh': 'Joshua',
    'judges': 'Judges', 'judg': 'Judges',
    'ruth': 'Ruth',
    '1 samuel': '1 Samuel', '1 sam': '1 Samuel', '1sam': '1 Samuel',
    '2 samuel': '2 Samuel', '2 sam': '2 Samuel', '2sam': '2 Samuel',
    '1 kings': '1 Kings', '1 kgs': '1 Kings', '1kgs': '1 Kings',
    '2 kings': '2 Kings', '2 kgs': '2 Kings', '2kgs': '2 Kings',
    '1 chronicles': '1 Chronicles', '1 chron': '1 Chronicles', '1chr': '1 Chronicles',
    '2 chronicles': '2 Chronicles', '2 chron': '2 Chronicles', '2chr': '2 Chronicles',
    'ezra': 'Ezra',
    'nehemiah': 'Nehemiah', 'neh': 'Nehemiah',
    'esther': 'Esther', 'esth': 'Esther',
    'job': 'Job',
    'psalms': 'Psalms', 'psalm': 'Psalms', 'ps': 'Psalms', 'psa': 'Psalms', 'ps.': 'Psalms',
    'proverbs': 'Proverbs', 'prov': 'Proverbs', 'pro': 'Proverbs',
    'ecclesiastes': 'Ecclesiastes', 'eccl': 'Ecclesiastes', 'ecc': 'Ecclesiastes',
    'song of solomon': 'Song of Solomon', 'song of songs': 'Song of Solomon',
    'song': 'Song of Solomon', 'sos': 'Song of Solomon',
    'isaiah': 'Isaiah', 'isa': 'Isaiah',
    'jeremiah': 'Jeremiah', 'jer': 'Jeremiah',
    'lamentations': 'Lamentations', 'lam': 'Lamentations',
    'ezekiel': 'Ezekiel', 'ezek': 'Ezekiel', 'eze': 'Ezekiel',
    'daniel': 'Daniel', 'dan': 'Daniel',
    'hosea': 'Hosea', 'hos': 'Hosea',
    'joel': 'Joel',
    'amos': 'Amos',
    'obadiah': 'Obadiah', 'obad': 'Obadiah',
    'jonah': 'Jonah', 'jon': 'Jonah',
    'micah': 'Micah', 'mic': 'Micah',
    'nahum': 'Nahum', 'nah': 'Nahum',
    'habakkuk': 'Habakkuk', 'hab': 'Habakkuk',
    'zephaniah': 'Zephaniah', 'zeph': 'Zephaniah',
    'haggai': 'Haggai', 'hag': 'Haggai',
    'zechariah': 'Zechariah', 'zech': 'Zechariah',
    'malachi': 'Malachi', 'mal': 'Malachi',
    // New Testament
    'matthew': 'Matthew', 'matt': 'Matthew', 'mat': 'Matthew',
    'mark': 'Mark',
    'luke': 'Luke',
    'john': 'John',
    'acts': 'Acts',
    'romans': 'Romans', 'rom': 'Romans',
    '1 corinthians': '1 Corinthians', '1 cor': '1 Corinthians', '1cor': '1 Corinthians',
    '2 corinthians': '2 Corinthians', '2 cor': '2 Corinthians', '2cor': '2 Corinthians',
    'galatians': 'Galatians', 'gal': 'Galatians',
    'ephesians': 'Ephesians', 'eph': 'Ephesians',
    'philippians': 'Philippians', 'phil': 'Philippians', 'php': 'Philippians',
    'colossians': 'Colossians', 'col': 'Colossians',
    '1 thessalonians': '1 Thessalonians', '1 thess': '1 Thessalonians', '1thess': '1 Thessalonians',
    '2 thessalonians': '2 Thessalonians', '2 thess': '2 Thessalonians', '2thess': '2 Thessalonians',
    '1 timothy': '1 Timothy', '1 tim': '1 Timothy', '1tim': '1 Timothy',
    '2 timothy': '2 Timothy', '2 tim': '2 Timothy', '2tim': '2 Timothy',
    'titus': 'Titus', 'tit': 'Titus',
    'philemon': 'Philemon', 'phlm': 'Philemon',
    'hebrews': 'Hebrews', 'heb': 'Hebrews',
    'james': 'James', 'jas': 'James',
    '1 peter': '1 Peter', '1 pet': '1 Peter', '1pet': '1 Peter',
    '2 peter': '2 Peter', '2 pet': '2 Peter', '2pet': '2 Peter',
    '1 john': '1 John', '1jn': '1 John',
    '2 john': '2 John', '2jn': '2 John',
    '3 john': '3 John', '3jn': '3 John',
    'jude': 'Jude',
    'revelation': 'Revelation', 'rev': 'Revelation',
};
// Spoken number words → digits (handles "verse sixteen", "chapter three")
const NUMBER_WORDS = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'twenty one': 21, 'twenty two': 22, 'twenty three': 23, 'twenty four': 24,
    'twenty five': 25, 'twenty six': 26, 'twenty seven': 27, 'twenty eight': 28,
    'twenty nine': 29, 'thirty': 30,
};
function wordToNumber(s) {
    const n = parseInt(s, 10);
    if (!isNaN(n))
        return n;
    const w = s.toLowerCase().trim();
    return NUMBER_WORDS[w] ?? null;
}
const ALIASES = Object.keys(BOOK_MAP).sort((a, b) => b.length - a.length);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BOOK_PATTERN = ALIASES.map(escapeRegex).join('|');
// Number token: digit string OR number word
const NUM = `(?:\\d{1,3}|${Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).map(escapeRegex).join('|')})`;
// Separator between chapter and verse:
//   colon, dot, dash, "verse", "v", whitespace-only (e.g. "Genesis 1 1")
const SEP = `(?:\\s*[:.\\-]\\s*|\\s+(?:verse|v\\.?)?\\s*)`;
// Optional "chapter N" prefix before the chapter number
const CHAP_PREFIX = `(?:chapter\\s+)?`;
const REF_REGEX = new RegExp(`\\b(${BOOK_PATTERN})\\s+${CHAP_PREFIX}(${NUM})${SEP}(${NUM})(?:\\s*[-–]\\s*(${NUM}))?\\b`, 'gi');
function detectExplicitReference(text) {
    // Normalise: lowercase, collapse whitespace
    const normalised = text.toLowerCase().replace(/\s+/g, ' ').trim();
    REF_REGEX.lastIndex = 0;
    const match = REF_REGEX.exec(normalised);
    if (!match)
        return null;
    const [, bookRaw, chapterRaw, verseRaw, endVerseRaw] = match;
    const book = BOOK_MAP[bookRaw.toLowerCase().trim()];
    if (!book)
        return null;
    const chapter = wordToNumber(chapterRaw);
    const verse = wordToNumber(verseRaw);
    const endVerse = endVerseRaw ? wordToNumber(endVerseRaw) : undefined;
    if (!chapter || !verse)
        return null;
    return {
        book,
        chapter,
        verse,
        endVerse: endVerse ?? undefined,
    };
}
function formatReference(ref) {
    const base = `${ref.book} ${ref.chapter}:${ref.verse}`;
    return ref.endVerse ? `${base}-${ref.endVerse}` : base;
}


/***/ },

/***/ "./src/main/audio.ts"
/*!***************************!*\
  !*** ./src/main/audio.ts ***!
  \***************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

// src/main/audio.ts
// Captures mic / line-in audio and emits Buffer chunks.
// Uses parecord (PulseAudio/PipeWire compat) on Linux.
// Device name comes from Settings — defaults to system default mic.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.audioCapture = exports.AudioCapture = void 0;
const child_process_1 = __webpack_require__(/*! child_process */ "child_process");
const events_1 = __webpack_require__(/*! events */ "events");
class AudioCapture extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.process = null;
        this.running = false;
    }
    get isRunning() {
        return this.running;
    }
    start(deviceName) {
        if (this.running)
            return;
        const platform = process.platform;
        let child;
        if (platform === 'linux') {
            // PipeWire exposes PulseAudio compat — parecord works on both
            const args = [
                '--format=s16le',
                '--rate=16000',
                '--channels=1',
                '--raw',
            ];
            // If a specific device is given, use it. Otherwise parecord picks default.
            // deviceName comes from pactl list sources short output.
            // Example: 'alsa_input.pci-0000_00_1f.3-platform-skl_hda_dsp_generic.HiFi__Mic1__source'
            if (deviceName) {
                args.push(`--device=${deviceName}`);
            }
            child = (0, child_process_1.spawn)('parecord', args);
        }
        else if (platform === 'darwin' || platform === 'win32') {
            child = (0, child_process_1.spawn)('sox', [
                '-d',
                '-t', 'raw',
                '-r', '16000',
                '-e', 'signed',
                '-b', '16',
                '-c', '1',
                '-',
            ]);
        }
        else {
            this.emit('error', new Error(`Unsupported platform: ${platform}`));
            return;
        }
        child.stdout?.on('data', (chunk) => {
            this.emit('data', chunk);
        });
        child.stderr?.on('data', (data) => {
            const msg = data.toString();
            // parecord writes harmless connection info to stderr — ignore unless error
            if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed')) {
                this.emit('error', new Error(`Audio capture: ${msg.trim()}`));
            }
        });
        child.on('error', (err) => {
            this.emit('error', new Error(`Failed to start audio capture. Is parecord installed?\n${err.message}`));
        });
        child.on('exit', (code) => {
            if (this.running && code !== 0 && code !== null) {
                this.emit('error', new Error(`Audio process exited with code ${code}`));
            }
            this.running = false;
            this.emit('stop');
        });
        this.process = child;
        this.running = true;
        this.emit('start');
    }
    stop() {
        if (!this.running || !this.process)
            return;
        this.process.kill('SIGTERM');
        this.process = null;
        this.running = false;
        this.emit('stop');
    }
}
exports.AudioCapture = AudioCapture;
exports.audioCapture = new AudioCapture();


/***/ },

/***/ "./src/main/index.ts"
/*!***************************!*\
  !*** ./src/main/index.ts ***!
  \***************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
// src/main/index.ts
// Full working pipeline: audio → Groq STT → verse detection → KJV lookup → projector
const node_buffer_1 = __webpack_require__(/*! node:buffer */ "node:buffer");
if (!('File' in globalThis)) {
    globalThis.File = node_buffer_1.File;
}
const electron_1 = __webpack_require__(/*! electron */ "electron");
const child_process_1 = __webpack_require__(/*! child_process */ "child_process");
const path_1 = __importDefault(__webpack_require__(/*! path */ "path"));
const audio_1 = __webpack_require__(/*! ./audio */ "./src/main/audio.ts");
const ipc_1 = __webpack_require__(/*! ./ipc */ "./src/main/ipc.ts");
const keychain_1 = __webpack_require__(/*! ./keychain */ "./src/main/keychain.ts");
const websocket_1 = __webpack_require__(/*! ./websocket */ "./src/main/websocket.ts");
// Pipeline imports — using your existing packages
const index_1 = __webpack_require__(/*! ../../packages/stt-providers/src/index */ "./packages/stt-providers/src/index.ts");
const pipeline_1 = __webpack_require__(/*! ../../packages/verse-matcher/src/pipeline */ "./packages/verse-matcher/src/pipeline.ts");
const regex_1 = __webpack_require__(/*! ../../packages/verse-matcher/src/regex */ "./packages/verse-matcher/src/regex.ts");
const fuzzy_1 = __webpack_require__(/*! ../../packages/verse-matcher/src/fuzzy */ "./packages/verse-matcher/src/fuzzy.ts");
const index_2 = __webpack_require__(/*! ../../packages/bible-data/src/index */ "./packages/bible-data/src/index.ts");
let operatorWindow = null;
let projectorWindow = null;
// Pipeline state
let sttProvider = null;
let bibleData = null;
let settings = {
    sttProvider: 'groq',
    translation: 'KJV',
    confidenceThreshold: 0.9,
    semanticMatchingEnabled: false,
    autoDisplay: true,
    audioDevice: undefined,
    theme: 'system',
};
// ─── Audio device enumeration ─────────────────────────────────────────────────
function getAudioDevices() {
    if (process.platform === 'linux') {
        try {
            const output = (0, child_process_1.execSync)('pactl list sources short', { encoding: 'utf-8' });
            return output.trim().split('\n').filter(l => l.trim()).map(line => {
                const parts = line.split('\t');
                const id = parts[1] || parts[0];
                let name = id
                    .replace('alsa_input.', '')
                    .replace('alsa_output.', 'Monitor: ')
                    .replace(/_/g, ' ');
                if (name.length > 60)
                    name = name.slice(0, 57) + '...';
                return { id, name, isDefault: false };
            });
        }
        catch { /* fall through */ }
    }
    return [{ id: 'default', name: 'Default microphone', isDefault: true }];
}
// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
    electron_1.nativeTheme.themeSource = theme === 'system' ? 'system' : theme;
    settings.theme = theme;
    operatorWindow?.webContents.send(ipc_1.IPC.THEME_SET, theme);
}
// ─── Window creation ──────────────────────────────────────────────────────────
function createOperatorWindow() {
    const primary = electron_1.screen.getPrimaryDisplay();
    const { width, height } = primary.workAreaSize;
    const win = new electron_1.BrowserWindow({
        width: Math.min(1400, width), height: Math.min(860, height),
        minWidth: 960, minHeight: 600,
        x: primary.workArea.x + Math.round((width - Math.min(1400, width)) / 2),
        y: primary.workArea.y + Math.round((height - Math.min(860, height)) / 2),
        title: 'BibleBeam',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
    });
    if (true) {
        win.loadURL('http://localhost:9080/#/operator');
        win.webContents.openDevTools({ mode: 'detach' });
    }
    else // removed by dead control flow
{}
    win.on('closed', () => {
        operatorWindow = null;
        if (projectorWindow && !projectorWindow.isDestroyed())
            projectorWindow.close();
    });
    return win;
}
function createProjectorWindow() {
    const displays = electron_1.screen.getAllDisplays();
    const primary = electron_1.screen.getPrimaryDisplay();
    const external = displays.find(d => d.id !== primary.id);
    const hasExternal = !!external;
    let x, y, w, h;
    if (hasExternal) {
        x = external.bounds.x;
        y = external.bounds.y;
        w = external.bounds.width;
        h = external.bounds.height;
        console.log(`[BibleBeam] Projector → external display ${w}x${h}`);
    }
    else {
        const area = primary.workArea;
        w = Math.round(area.width * 0.5);
        h = Math.round(area.height * 0.55);
        x = area.x + area.width - w - 24;
        y = area.y + area.height - h - 24;
        console.log('[BibleBeam] Projector → single monitor');
    }
    const win = new electron_1.BrowserWindow({
        x, y, width: w, height: h,
        frame: false, backgroundColor: '#000000',
        title: 'BibleBeam — Projector',
        fullscreen: hasExternal, alwaysOnTop: hasExternal, skipTaskbar: hasExternal,
        webPreferences: {
            nodeIntegration: false, contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
    });
    if (true) {
        win.loadURL('http://localhost:9080/#/projector');
    }
    else // removed by dead control flow
{}
    win.on('closed', () => {
        projectorWindow = null;
        operatorWindow?.webContents.send(ipc_1.IPC.PROJECTOR_STATUS, false);
    });
    return win;
}
// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
    // Load Bible data + build fuzzy index
    bibleData = (0, index_2.loadTranslation)(settings.translation);
    if (bibleData) {
        try {
            const entries = Object.entries(bibleData).flatMap(([book, chapters]) => Object.entries(chapters).flatMap(([chapter, verses]) => Object.entries(verses).map(([verse, text]) => ({
                ref: { book, chapter: parseInt(chapter), verse: parseInt(verse) },
                firstLine: (0, fuzzy_1.firstWords)(text, 8),
            }))));
            (0, fuzzy_1.buildFuzzyIndex)(entries);
        }
        catch (e) {
            console.warn('[BibleBeam] Could not build fuzzy index:', e);
        }
    }
    applyTheme(settings.theme);
    (0, websocket_1.startDisplayServer)(7700);
    console.log('[BibleBeam] Boot complete');
}
// ─── STT Pipeline ─────────────────────────────────────────────────────────────
async function startSTT() {
    // Determine key name based on provider
    const keyMap = {
        groq: 'groq-api-key',
        deepgram: 'deepgram-api-key',
        assemblyai: 'assemblyai-api-key',
    };
    const keyName = keyMap[settings.sttProvider] || 'groq-api-key';
    const apiKey = await keychain_1.keychain.get(keyName);
    if (!apiKey) {
        operatorWindow?.webContents.send('audio:error', `No API key saved for ${settings.sttProvider}. Go to Settings to add it.`);
        return;
    }
    // Create the provider
    try {
        sttProvider = (0, index_1.createProvider)(settings.sttProvider);
    }
    catch (err) {
        operatorWindow?.webContents.send('audio:error', err.message);
        return;
    }
    // Connect (validates key)
    try {
        console.log(`[BibleBeam] Connecting to ${sttProvider.name}...`);
        await sttProvider.connect(apiKey);
        console.log(`[BibleBeam] ${sttProvider.name} connected`);
    }
    catch (err) {
        operatorWindow?.webContents.send('audio:error', `Connection failed: ${err.message}`);
        sttProvider = null;
        return;
    }
    // Start streaming — this is where the magic happens
    sttProvider.startStreaming(async (segment) => {
        // Forward every transcript segment to the operator UI
        operatorWindow?.webContents.send(ipc_1.IPC.TRANSCRIPT_UPDATE, {
            text: segment.text,
            isFinal: segment.isFinal,
            timestampMs: segment.timestampMs ?? Date.now(),
        });
        // Only run verse detection on final segments with actual text
        if (!segment.isFinal || !segment.text.trim())
            return;
        console.log(`[STT] Final: "${segment.text}"`);
        // Run the detection pipeline
        const match = await (0, pipeline_1.detectVerse)(segment.text, {
            minFuzzyScore: 0.5,
            semanticEnabled: settings.semanticMatchingEnabled,
        });
        if (!match)
            return;
        // Look up the actual verse text from loaded Bible data
        let verseText = '[verse text not available]';
        if (bibleData) {
            const text = (0, index_2.getVerse)(bibleData, match.reference.book, match.reference.chapter, match.reference.verse);
            if (text)
                verseText = text;
        }
        const payload = {
            reference: match.referenceString,
            verseText,
            translation: settings.translation,
            confidence: match.confidence,
            method: match.method,
        };
        console.log(`[BibleBeam] ✅ Detected: ${match.referenceString} (${match.method}, ${Math.round(match.confidence * 100)}%)`);
        // Always send to operator panel
        operatorWindow?.webContents.send(ipc_1.IPC.VERSE_DETECTED, payload);
        // Auto-display if confidence is high enough and projector is open
        if (settings.autoDisplay && match.confidence >= settings.confidenceThreshold) {
            if (projectorWindow && !projectorWindow.isDestroyed()) {
                projectorWindow.webContents.send(ipc_1.IPC.PROJECTOR_UPDATE, payload);
                (0, websocket_1.broadcastVerse)(payload);
                console.log(`[BibleBeam] → Auto-displayed on projector`);
            }
        }
    }, (err) => {
        console.error('[STT Error]', err.message);
        operatorWindow?.webContents.send('audio:error', err.message);
    });
    // Wire audio → STT
    audio_1.audioCapture.removeAllListeners('data');
    audio_1.audioCapture.on('data', (chunk) => {
        sttProvider?.sendAudio(chunk);
    });
    // Start capturing from mic
    audio_1.audioCapture.start(settings.audioDevice);
    console.log(`[BibleBeam] 🎙️ Pipeline active: mic → ${sttProvider.name} → verse detection`);
}
function stopSTT() {
    audio_1.audioCapture.stop();
    audio_1.audioCapture.removeAllListeners('data');
    sttProvider?.stopStreaming();
    sttProvider?.disconnect();
    sttProvider = null;
    console.log('[BibleBeam] Pipeline stopped');
}
// ─── IPC handlers ─────────────────────────────────────────────────────────────
// Audio
electron_1.ipcMain.handle(ipc_1.IPC.AUDIO_START, async () => {
    try {
        await startSTT();
        return { ok: true };
    }
    catch (err) {
        return { ok: false, error: err.message };
    }
});
electron_1.ipcMain.handle(ipc_1.IPC.AUDIO_STOP, () => {
    stopSTT();
    return { ok: true };
});
electron_1.ipcMain.handle(ipc_1.IPC.AUDIO_GET_DEVICES, () => getAudioDevices());
// Projector — on demand
electron_1.ipcMain.handle(ipc_1.IPC.PROJECTOR_OPEN, () => {
    if (projectorWindow && !projectorWindow.isDestroyed()) {
        projectorWindow.focus();
    }
    else {
        projectorWindow = createProjectorWindow();
    }
    operatorWindow?.webContents.send(ipc_1.IPC.PROJECTOR_STATUS, true);
    return { ok: true };
});
electron_1.ipcMain.handle(ipc_1.IPC.PROJECTOR_CLOSE, () => {
    if (projectorWindow && !projectorWindow.isDestroyed())
        projectorWindow.close();
    projectorWindow = null;
    operatorWindow?.webContents.send(ipc_1.IPC.PROJECTOR_STATUS, false);
    return { ok: true };
});
electron_1.ipcMain.handle(ipc_1.IPC.PROJECTOR_STATUS, () => {
    return !!(projectorWindow && !projectorWindow.isDestroyed());
});
// Verse actions
electron_1.ipcMain.handle(ipc_1.IPC.VERSE_APPROVED, (_event, payload) => {
    projectorWindow?.webContents.send(ipc_1.IPC.PROJECTOR_UPDATE, payload);
    (0, websocket_1.broadcastVerse)(payload);
});
electron_1.ipcMain.handle(ipc_1.IPC.VERSE_CLEAR, () => {
    projectorWindow?.webContents.send(ipc_1.IPC.PROJECTOR_UPDATE, null);
    (0, websocket_1.broadcastClear)();
});
electron_1.ipcMain.handle(ipc_1.IPC.VERSE_OVERRIDE, async (_event, { reference }) => {
    const ref = (0, regex_1.detectExplicitReference)(reference);
    if (!ref) {
        operatorWindow?.webContents.send('audio:error', `Could not parse: "${reference}"`);
        return;
    }
    let verseText = '[verse not found]';
    if (bibleData) {
        const text = (0, index_2.getVerse)(bibleData, ref.book, ref.chapter, ref.verse);
        if (text)
            verseText = text;
    }
    const payload = {
        reference: (0, regex_1.formatReference)(ref),
        verseText,
        translation: settings.translation,
    };
    projectorWindow?.webContents.send(ipc_1.IPC.PROJECTOR_UPDATE, payload);
    (0, websocket_1.broadcastVerse)(payload);
    operatorWindow?.webContents.send(ipc_1.IPC.VERSE_DETECTED, {
        ...payload, confidence: 1.0, method: 'regex',
    });
    console.log(`[BibleBeam] Manual override: ${(0, regex_1.formatReference)(ref)}`);
});
electron_1.ipcMain.handle('bible:get-verses', (_e, { book, chapter }) => {
    if (!bibleData)
        return [];
    const chapterData = bibleData[book]?.[chapter];
    if (!chapterData)
        return [];
    return Object.entries(chapterData).map(([verse, text]) => ({
        verse: parseInt(verse),
        text,
    })).sort((a, b) => a.verse - b.verse);
});
// Bible search — simple substring search across all verses
electron_1.ipcMain.handle('bible:search-verses', (_e, { query }) => {
    if (!bibleData || !query.trim())
        return [];
    const q = query.toLowerCase();
    const results = [];
    for (const [book, chapters] of Object.entries(bibleData)) {
        for (const [chapter, verses] of Object.entries(chapters)) {
            for (const [verse, text] of Object.entries(verses)) {
                if (text.toLowerCase().includes(q)) {
                    results.push({
                        ref: `${book} ${chapter}:${verse}`,
                        text: text,
                    });
                    if (results.length >= 50)
                        return results; // cap at 50 results
                }
            }
        }
    }
    return results;
});
// Settings
electron_1.ipcMain.handle(ipc_1.IPC.SETTINGS_GET_KEY, async (_e, keyName) => keychain_1.keychain.get(keyName));
electron_1.ipcMain.handle(ipc_1.IPC.SETTINGS_SET_KEY, async (_e, keyName, value) => {
    await keychain_1.keychain.set(keyName, value);
    return { ok: true };
});
electron_1.ipcMain.handle(ipc_1.IPC.SETTINGS_GET, () => settings);
electron_1.ipcMain.handle(ipc_1.IPC.SETTINGS_SET, (_e, s) => {
    const oldTranslation = settings.translation;
    settings = { ...settings, ...s };
    // If translation changed, reload Bible data + rebuild fuzzy index
    if (s.translation && s.translation !== oldTranslation) {
        bibleData = (0, index_2.loadTranslation)(settings.translation);
        if (bibleData) {
            const entries = Object.entries(bibleData).flatMap(([book, chapters]) => Object.entries(chapters).flatMap(([chapter, verses]) => Object.entries(verses).map(([verse, text]) => ({
                ref: { book, chapter: parseInt(chapter), verse: parseInt(verse) },
                firstLine: (0, fuzzy_1.firstWords)(text, 8),
            }))));
            (0, fuzzy_1.buildFuzzyIndex)(entries);
        }
    }
    if (s.theme)
        applyTheme(s.theme);
    return { ok: true };
});
// Theme
electron_1.ipcMain.handle(ipc_1.IPC.THEME_GET, () => settings.theme);
electron_1.ipcMain.handle(ipc_1.IPC.THEME_SET, (_e, theme) => {
    applyTheme(theme);
    return { ok: true };
});
// ─── Audio error forwarding ───────────────────────────────────────────────────
audio_1.audioCapture.on('error', (err) => {
    console.error('[Audio]', err.message);
    operatorWindow?.webContents.send('audio:error', err.message);
});
// ─── App lifecycle ────────────────────────────────────────────────────────────
electron_1.app.whenReady().then(async () => {
    await boot();
    operatorWindow = createOperatorWindow();
    electron_1.screen.on('display-added', () => {
        console.log('[BibleBeam] Display added');
    });
    electron_1.screen.on('display-removed', () => {
        console.log('[BibleBeam] Display removed');
        if (projectorWindow && !projectorWindow.isDestroyed()) {
            projectorWindow.close();
            projectorWindow = createProjectorWindow();
        }
    });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            operatorWindow = createOperatorWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    stopSTT();
    (0, websocket_1.stopDisplayServer)();
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});


/***/ },

/***/ "./src/main/ipc.ts"
/*!*************************!*\
  !*** ./src/main/ipc.ts ***!
  \*************************/
(__unused_webpack_module, exports) {

"use strict";

// src/main/ipc.ts
// All IPC channel names in one place.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IPC = void 0;
exports.IPC = {
    // Audio control
    AUDIO_START: 'audio:start',
    AUDIO_STOP: 'audio:stop',
    AUDIO_STATUS: 'audio:status',
    AUDIO_GET_DEVICES: 'audio:get-devices',
    // Transcript
    TRANSCRIPT_UPDATE: 'transcript:update',
    // Verse lifecycle
    VERSE_DETECTED: 'verse:detected',
    VERSE_APPROVED: 'verse:approved',
    VERSE_REJECTED: 'verse:rejected',
    VERSE_OVERRIDE: 'verse:override',
    VERSE_CLEAR: 'verse:clear',
    // Projector
    PROJECTOR_UPDATE: 'projector:update',
    PROJECTOR_OPEN: 'projector:open',
    PROJECTOR_CLOSE: 'projector:close',
    PROJECTOR_STATUS: 'projector:status',
    // Settings
    SETTINGS_GET: 'settings:get',
    SETTINGS_SET: 'settings:set',
    SETTINGS_GET_KEY: 'settings:get-key',
    SETTINGS_SET_KEY: 'settings:set-key',
    SETTINGS_TEST_STT: 'settings:test-stt',
    // Theme
    THEME_GET: 'theme:get',
    THEME_SET: 'theme:set',
};


/***/ },

/***/ "./src/main/keychain.ts"
/*!******************************!*\
  !*** ./src/main/keychain.ts ***!
  \******************************/
(__unused_webpack_module, exports) {

"use strict";

// src/main/keychain.ts
// Credential storage — uses a simple in-memory store for development.
// TODO: Replace with keytar for production (requires libsecret-1-dev on Linux)
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KEYS = exports.keychain = void 0;
const store = new Map();
exports.keychain = {
    get: async (account) => {
        return store.get(account) ?? null;
    },
    set: async (account, value) => {
        store.set(account, value);
    },
    delete: async (account) => {
        return store.delete(account);
    },
};
exports.KEYS = {
    DEEPGRAM: 'deepgram-api-key',
    WHISPER: 'whisper-api-key',
    ASSEMBLYAI: 'assemblyai-api-key',
    GROQ: 'groq-api-key',
    ESV: 'esv-api-key',
};


/***/ },

/***/ "./src/main/websocket.ts"
/*!*******************************!*\
  !*** ./src/main/websocket.ts ***!
  \*******************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

// src/main/websocket.ts
// Broadcasts the current verse to any device on the local network.
// Devices open http://[local-ip]:7700 in a browser to display verses.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.startDisplayServer = startDisplayServer;
exports.broadcastVerse = broadcastVerse;
exports.broadcastClear = broadcastClear;
exports.stopDisplayServer = stopDisplayServer;
const ws_1 = __webpack_require__(/*! ws */ "./node_modules/ws/index.js");
let wss = null;
let lastPayload = null;
function startDisplayServer(port = 7700) {
    if (wss)
        return;
    wss = new ws_1.WebSocketServer({ port });
    wss.on('connection', (ws) => {
        // Send the current verse state immediately on connect
        // so a late-joining device is in sync
        if (lastPayload) {
            ws.send(JSON.stringify({ type: 'verse', payload: lastPayload }));
        }
        else {
            ws.send(JSON.stringify({ type: 'clear' }));
        }
    });
    wss.on('error', (err) => {
        console.error('[WebSocket] Server error:', err.message);
    });
    console.log(`[WebSocket] Display server running on ws://localhost:${port}`);
}
function broadcastVerse(payload) {
    lastPayload = payload;
    _broadcast({ type: 'verse', payload });
}
function broadcastClear() {
    lastPayload = null;
    _broadcast({ type: 'clear' });
}
function stopDisplayServer() {
    wss?.close();
    wss = null;
}
function _broadcast(message) {
    if (!wss)
        return;
    const msg = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(msg);
        }
    });
}


/***/ },

/***/ "./node_modules/ws/index.js"
/*!**********************************!*\
  !*** ./node_modules/ws/index.js ***!
  \**********************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const WebSocket = __webpack_require__(/*! ./lib/websocket */ "./node_modules/ws/lib/websocket.js");

WebSocket.createWebSocketStream = __webpack_require__(/*! ./lib/stream */ "./node_modules/ws/lib/stream.js");
WebSocket.Server = __webpack_require__(/*! ./lib/websocket-server */ "./node_modules/ws/lib/websocket-server.js");
WebSocket.Receiver = __webpack_require__(/*! ./lib/receiver */ "./node_modules/ws/lib/receiver.js");
WebSocket.Sender = __webpack_require__(/*! ./lib/sender */ "./node_modules/ws/lib/sender.js");

WebSocket.WebSocket = WebSocket;
WebSocket.WebSocketServer = WebSocket.Server;

module.exports = WebSocket;


/***/ },

/***/ "./node_modules/ws/lib/buffer-util.js"
/*!********************************************!*\
  !*** ./node_modules/ws/lib/buffer-util.js ***!
  \********************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { EMPTY_BUFFER } = __webpack_require__(/*! ./constants */ "./node_modules/ws/lib/constants.js");

const FastBuffer = Buffer[Symbol.species];

/**
 * Merges an array of buffers into a new buffer.
 *
 * @param {Buffer[]} list The array of buffers to concat
 * @param {Number} totalLength The total length of buffers in the list
 * @return {Buffer} The resulting buffer
 * @public
 */
function concat(list, totalLength) {
  if (list.length === 0) return EMPTY_BUFFER;
  if (list.length === 1) return list[0];

  const target = Buffer.allocUnsafe(totalLength);
  let offset = 0;

  for (let i = 0; i < list.length; i++) {
    const buf = list[i];
    target.set(buf, offset);
    offset += buf.length;
  }

  if (offset < totalLength) {
    return new FastBuffer(target.buffer, target.byteOffset, offset);
  }

  return target;
}

/**
 * Masks a buffer using the given mask.
 *
 * @param {Buffer} source The buffer to mask
 * @param {Buffer} mask The mask to use
 * @param {Buffer} output The buffer where to store the result
 * @param {Number} offset The offset at which to start writing
 * @param {Number} length The number of bytes to mask.
 * @public
 */
function _mask(source, mask, output, offset, length) {
  for (let i = 0; i < length; i++) {
    output[offset + i] = source[i] ^ mask[i & 3];
  }
}

/**
 * Unmasks a buffer using the given mask.
 *
 * @param {Buffer} buffer The buffer to unmask
 * @param {Buffer} mask The mask to use
 * @public
 */
function _unmask(buffer, mask) {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] ^= mask[i & 3];
  }
}

/**
 * Converts a buffer to an `ArrayBuffer`.
 *
 * @param {Buffer} buf The buffer to convert
 * @return {ArrayBuffer} Converted buffer
 * @public
 */
function toArrayBuffer(buf) {
  if (buf.length === buf.buffer.byteLength) {
    return buf.buffer;
  }

  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
}

/**
 * Converts `data` to a `Buffer`.
 *
 * @param {*} data The data to convert
 * @return {Buffer} The buffer
 * @throws {TypeError}
 * @public
 */
function toBuffer(data) {
  toBuffer.readOnly = true;

  if (Buffer.isBuffer(data)) return data;

  let buf;

  if (data instanceof ArrayBuffer) {
    buf = new FastBuffer(data);
  } else if (ArrayBuffer.isView(data)) {
    buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
  } else {
    buf = Buffer.from(data);
    toBuffer.readOnly = false;
  }

  return buf;
}

module.exports = {
  concat,
  mask: _mask,
  toArrayBuffer,
  toBuffer,
  unmask: _unmask
};

/* istanbul ignore else  */
if (!process.env.WS_NO_BUFFER_UTIL) {
  try {
    const bufferUtil = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module 'bufferutil'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));

    module.exports.mask = function (source, mask, output, offset, length) {
      if (length < 48) _mask(source, mask, output, offset, length);
      else bufferUtil.mask(source, mask, output, offset, length);
    };

    module.exports.unmask = function (buffer, mask) {
      if (buffer.length < 32) _unmask(buffer, mask);
      else bufferUtil.unmask(buffer, mask);
    };
  } catch (e) {
    // Continue regardless of the error.
  }
}


/***/ },

/***/ "./node_modules/ws/lib/constants.js"
/*!******************************************!*\
  !*** ./node_modules/ws/lib/constants.js ***!
  \******************************************/
(module) {

"use strict";


const BINARY_TYPES = ['nodebuffer', 'arraybuffer', 'fragments'];
const hasBlob = typeof Blob !== 'undefined';

if (hasBlob) BINARY_TYPES.push('blob');

module.exports = {
  BINARY_TYPES,
  CLOSE_TIMEOUT: 30000,
  EMPTY_BUFFER: Buffer.alloc(0),
  GUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
  hasBlob,
  kForOnEventAttribute: Symbol('kIsForOnEventAttribute'),
  kListener: Symbol('kListener'),
  kStatusCode: Symbol('status-code'),
  kWebSocket: Symbol('websocket'),
  NOOP: () => {}
};


/***/ },

/***/ "./node_modules/ws/lib/event-target.js"
/*!*********************************************!*\
  !*** ./node_modules/ws/lib/event-target.js ***!
  \*********************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { kForOnEventAttribute, kListener } = __webpack_require__(/*! ./constants */ "./node_modules/ws/lib/constants.js");

const kCode = Symbol('kCode');
const kData = Symbol('kData');
const kError = Symbol('kError');
const kMessage = Symbol('kMessage');
const kReason = Symbol('kReason');
const kTarget = Symbol('kTarget');
const kType = Symbol('kType');
const kWasClean = Symbol('kWasClean');

/**
 * Class representing an event.
 */
class Event {
  /**
   * Create a new `Event`.
   *
   * @param {String} type The name of the event
   * @throws {TypeError} If the `type` argument is not specified
   */
  constructor(type) {
    this[kTarget] = null;
    this[kType] = type;
  }

  /**
   * @type {*}
   */
  get target() {
    return this[kTarget];
  }

  /**
   * @type {String}
   */
  get type() {
    return this[kType];
  }
}

Object.defineProperty(Event.prototype, 'target', { enumerable: true });
Object.defineProperty(Event.prototype, 'type', { enumerable: true });

/**
 * Class representing a close event.
 *
 * @extends Event
 */
class CloseEvent extends Event {
  /**
   * Create a new `CloseEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {Number} [options.code=0] The status code explaining why the
   *     connection was closed
   * @param {String} [options.reason=''] A human-readable string explaining why
   *     the connection was closed
   * @param {Boolean} [options.wasClean=false] Indicates whether or not the
   *     connection was cleanly closed
   */
  constructor(type, options = {}) {
    super(type);

    this[kCode] = options.code === undefined ? 0 : options.code;
    this[kReason] = options.reason === undefined ? '' : options.reason;
    this[kWasClean] = options.wasClean === undefined ? false : options.wasClean;
  }

  /**
   * @type {Number}
   */
  get code() {
    return this[kCode];
  }

  /**
   * @type {String}
   */
  get reason() {
    return this[kReason];
  }

  /**
   * @type {Boolean}
   */
  get wasClean() {
    return this[kWasClean];
  }
}

Object.defineProperty(CloseEvent.prototype, 'code', { enumerable: true });
Object.defineProperty(CloseEvent.prototype, 'reason', { enumerable: true });
Object.defineProperty(CloseEvent.prototype, 'wasClean', { enumerable: true });

/**
 * Class representing an error event.
 *
 * @extends Event
 */
class ErrorEvent extends Event {
  /**
   * Create a new `ErrorEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.error=null] The error that generated this event
   * @param {String} [options.message=''] The error message
   */
  constructor(type, options = {}) {
    super(type);

    this[kError] = options.error === undefined ? null : options.error;
    this[kMessage] = options.message === undefined ? '' : options.message;
  }

  /**
   * @type {*}
   */
  get error() {
    return this[kError];
  }

  /**
   * @type {String}
   */
  get message() {
    return this[kMessage];
  }
}

Object.defineProperty(ErrorEvent.prototype, 'error', { enumerable: true });
Object.defineProperty(ErrorEvent.prototype, 'message', { enumerable: true });

/**
 * Class representing a message event.
 *
 * @extends Event
 */
class MessageEvent extends Event {
  /**
   * Create a new `MessageEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.data=null] The message content
   */
  constructor(type, options = {}) {
    super(type);

    this[kData] = options.data === undefined ? null : options.data;
  }

  /**
   * @type {*}
   */
  get data() {
    return this[kData];
  }
}

Object.defineProperty(MessageEvent.prototype, 'data', { enumerable: true });

/**
 * This provides methods for emulating the `EventTarget` interface. It's not
 * meant to be used directly.
 *
 * @mixin
 */
const EventTarget = {
  /**
   * Register an event listener.
   *
   * @param {String} type A string representing the event type to listen for
   * @param {(Function|Object)} handler The listener to add
   * @param {Object} [options] An options object specifies characteristics about
   *     the event listener
   * @param {Boolean} [options.once=false] A `Boolean` indicating that the
   *     listener should be invoked at most once after being added. If `true`,
   *     the listener would be automatically removed when invoked.
   * @public
   */
  addEventListener(type, handler, options = {}) {
    for (const listener of this.listeners(type)) {
      if (
        !options[kForOnEventAttribute] &&
        listener[kListener] === handler &&
        !listener[kForOnEventAttribute]
      ) {
        return;
      }
    }

    let wrapper;

    if (type === 'message') {
      wrapper = function onMessage(data, isBinary) {
        const event = new MessageEvent('message', {
          data: isBinary ? data : data.toString()
        });

        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else if (type === 'close') {
      wrapper = function onClose(code, message) {
        const event = new CloseEvent('close', {
          code,
          reason: message.toString(),
          wasClean: this._closeFrameReceived && this._closeFrameSent
        });

        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else if (type === 'error') {
      wrapper = function onError(error) {
        const event = new ErrorEvent('error', {
          error,
          message: error.message
        });

        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else if (type === 'open') {
      wrapper = function onOpen() {
        const event = new Event('open');

        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else {
      return;
    }

    wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
    wrapper[kListener] = handler;

    if (options.once) {
      this.once(type, wrapper);
    } else {
      this.on(type, wrapper);
    }
  },

  /**
   * Remove an event listener.
   *
   * @param {String} type A string representing the event type to remove
   * @param {(Function|Object)} handler The listener to remove
   * @public
   */
  removeEventListener(type, handler) {
    for (const listener of this.listeners(type)) {
      if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
        this.removeListener(type, listener);
        break;
      }
    }
  }
};

module.exports = {
  CloseEvent,
  ErrorEvent,
  Event,
  EventTarget,
  MessageEvent
};

/**
 * Call an event listener
 *
 * @param {(Function|Object)} listener The listener to call
 * @param {*} thisArg The value to use as `this`` when calling the listener
 * @param {Event} event The event to pass to the listener
 * @private
 */
function callListener(listener, thisArg, event) {
  if (typeof listener === 'object' && listener.handleEvent) {
    listener.handleEvent.call(listener, event);
  } else {
    listener.call(thisArg, event);
  }
}


/***/ },

/***/ "./node_modules/ws/lib/extension.js"
/*!******************************************!*\
  !*** ./node_modules/ws/lib/extension.js ***!
  \******************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { tokenChars } = __webpack_require__(/*! ./validation */ "./node_modules/ws/lib/validation.js");

/**
 * Adds an offer to the map of extension offers or a parameter to the map of
 * parameters.
 *
 * @param {Object} dest The map of extension offers or parameters
 * @param {String} name The extension or parameter name
 * @param {(Object|Boolean|String)} elem The extension parameters or the
 *     parameter value
 * @private
 */
function push(dest, name, elem) {
  if (dest[name] === undefined) dest[name] = [elem];
  else dest[name].push(elem);
}

/**
 * Parses the `Sec-WebSocket-Extensions` header into an object.
 *
 * @param {String} header The field value of the header
 * @return {Object} The parsed object
 * @public
 */
function parse(header) {
  const offers = Object.create(null);
  let params = Object.create(null);
  let mustUnescape = false;
  let isEscaping = false;
  let inQuotes = false;
  let extensionName;
  let paramName;
  let start = -1;
  let code = -1;
  let end = -1;
  let i = 0;

  for (; i < header.length; i++) {
    code = header.charCodeAt(i);

    if (extensionName === undefined) {
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1) start = i;
      } else if (
        i !== 0 &&
        (code === 0x20 /* ' ' */ || code === 0x09) /* '\t' */
      ) {
        if (end === -1 && start !== -1) end = i;
      } else if (code === 0x3b /* ';' */ || code === 0x2c /* ',' */) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }

        if (end === -1) end = i;
        const name = header.slice(start, end);
        if (code === 0x2c) {
          push(offers, name, params);
          params = Object.create(null);
        } else {
          extensionName = name;
        }

        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    } else if (paramName === undefined) {
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1) start = i;
      } else if (code === 0x20 || code === 0x09) {
        if (end === -1 && start !== -1) end = i;
      } else if (code === 0x3b || code === 0x2c) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }

        if (end === -1) end = i;
        push(params, header.slice(start, end), true);
        if (code === 0x2c) {
          push(offers, extensionName, params);
          params = Object.create(null);
          extensionName = undefined;
        }

        start = end = -1;
      } else if (code === 0x3d /* '=' */ && start !== -1 && end === -1) {
        paramName = header.slice(start, i);
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    } else {
      //
      // The value of a quoted-string after unescaping must conform to the
      // token ABNF, so only token characters are valid.
      // Ref: https://tools.ietf.org/html/rfc6455#section-9.1
      //
      if (isEscaping) {
        if (tokenChars[code] !== 1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (start === -1) start = i;
        else if (!mustUnescape) mustUnescape = true;
        isEscaping = false;
      } else if (inQuotes) {
        if (tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (code === 0x22 /* '"' */ && start !== -1) {
          inQuotes = false;
          end = i;
        } else if (code === 0x5c /* '\' */) {
          isEscaping = true;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else if (code === 0x22 && header.charCodeAt(i - 1) === 0x3d) {
        inQuotes = true;
      } else if (end === -1 && tokenChars[code] === 1) {
        if (start === -1) start = i;
      } else if (start !== -1 && (code === 0x20 || code === 0x09)) {
        if (end === -1) end = i;
      } else if (code === 0x3b || code === 0x2c) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }

        if (end === -1) end = i;
        let value = header.slice(start, end);
        if (mustUnescape) {
          value = value.replace(/\\/g, '');
          mustUnescape = false;
        }
        push(params, paramName, value);
        if (code === 0x2c) {
          push(offers, extensionName, params);
          params = Object.create(null);
          extensionName = undefined;
        }

        paramName = undefined;
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    }
  }

  if (start === -1 || inQuotes || code === 0x20 || code === 0x09) {
    throw new SyntaxError('Unexpected end of input');
  }

  if (end === -1) end = i;
  const token = header.slice(start, end);
  if (extensionName === undefined) {
    push(offers, token, params);
  } else {
    if (paramName === undefined) {
      push(params, token, true);
    } else if (mustUnescape) {
      push(params, paramName, token.replace(/\\/g, ''));
    } else {
      push(params, paramName, token);
    }
    push(offers, extensionName, params);
  }

  return offers;
}

/**
 * Builds the `Sec-WebSocket-Extensions` header field value.
 *
 * @param {Object} extensions The map of extensions and parameters to format
 * @return {String} A string representing the given object
 * @public
 */
function format(extensions) {
  return Object.keys(extensions)
    .map((extension) => {
      let configurations = extensions[extension];
      if (!Array.isArray(configurations)) configurations = [configurations];
      return configurations
        .map((params) => {
          return [extension]
            .concat(
              Object.keys(params).map((k) => {
                let values = params[k];
                if (!Array.isArray(values)) values = [values];
                return values
                  .map((v) => (v === true ? k : `${k}=${v}`))
                  .join('; ');
              })
            )
            .join('; ');
        })
        .join(', ');
    })
    .join(', ');
}

module.exports = { format, parse };


/***/ },

/***/ "./node_modules/ws/lib/limiter.js"
/*!****************************************!*\
  !*** ./node_modules/ws/lib/limiter.js ***!
  \****************************************/
(module) {

"use strict";


const kDone = Symbol('kDone');
const kRun = Symbol('kRun');

/**
 * A very simple job queue with adjustable concurrency. Adapted from
 * https://github.com/STRML/async-limiter
 */
class Limiter {
  /**
   * Creates a new `Limiter`.
   *
   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
   *     to run concurrently
   */
  constructor(concurrency) {
    this[kDone] = () => {
      this.pending--;
      this[kRun]();
    };
    this.concurrency = concurrency || Infinity;
    this.jobs = [];
    this.pending = 0;
  }

  /**
   * Adds a job to the queue.
   *
   * @param {Function} job The job to run
   * @public
   */
  add(job) {
    this.jobs.push(job);
    this[kRun]();
  }

  /**
   * Removes a job from the queue and runs it if possible.
   *
   * @private
   */
  [kRun]() {
    if (this.pending === this.concurrency) return;

    if (this.jobs.length) {
      const job = this.jobs.shift();

      this.pending++;
      job(this[kDone]);
    }
  }
}

module.exports = Limiter;


/***/ },

/***/ "./node_modules/ws/lib/permessage-deflate.js"
/*!***************************************************!*\
  !*** ./node_modules/ws/lib/permessage-deflate.js ***!
  \***************************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const zlib = __webpack_require__(/*! zlib */ "zlib");

const bufferUtil = __webpack_require__(/*! ./buffer-util */ "./node_modules/ws/lib/buffer-util.js");
const Limiter = __webpack_require__(/*! ./limiter */ "./node_modules/ws/lib/limiter.js");
const { kStatusCode } = __webpack_require__(/*! ./constants */ "./node_modules/ws/lib/constants.js");

const FastBuffer = Buffer[Symbol.species];
const TRAILER = Buffer.from([0x00, 0x00, 0xff, 0xff]);
const kPerMessageDeflate = Symbol('permessage-deflate');
const kTotalLength = Symbol('total-length');
const kCallback = Symbol('callback');
const kBuffers = Symbol('buffers');
const kError = Symbol('error');

//
// We limit zlib concurrency, which prevents severe memory fragmentation
// as documented in https://github.com/nodejs/node/issues/8871#issuecomment-250915913
// and https://github.com/websockets/ws/issues/1202
//
// Intentionally global; it's the global thread pool that's an issue.
//
let zlibLimiter;

/**
 * permessage-deflate implementation.
 */
class PerMessageDeflate {
  /**
   * Creates a PerMessageDeflate instance.
   *
   * @param {Object} [options] Configuration options
   * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
   *     for, or request, a custom client window size
   * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
   *     acknowledge disabling of client context takeover
   * @param {Number} [options.concurrencyLimit=10] The number of concurrent
   *     calls to zlib
   * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
   *     use of a custom server window size
   * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
   *     disabling of server context takeover
   * @param {Number} [options.threshold=1024] Size (in bytes) below which
   *     messages should not be compressed if context takeover is disabled
   * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
   *     deflate
   * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
   *     inflate
   * @param {Boolean} [isServer=false] Create the instance in either server or
   *     client mode
   * @param {Number} [maxPayload=0] The maximum allowed message length
   */
  constructor(options, isServer, maxPayload) {
    this._maxPayload = maxPayload | 0;
    this._options = options || {};
    this._threshold =
      this._options.threshold !== undefined ? this._options.threshold : 1024;
    this._isServer = !!isServer;
    this._deflate = null;
    this._inflate = null;

    this.params = null;

    if (!zlibLimiter) {
      const concurrency =
        this._options.concurrencyLimit !== undefined
          ? this._options.concurrencyLimit
          : 10;
      zlibLimiter = new Limiter(concurrency);
    }
  }

  /**
   * @type {String}
   */
  static get extensionName() {
    return 'permessage-deflate';
  }

  /**
   * Create an extension negotiation offer.
   *
   * @return {Object} Extension parameters
   * @public
   */
  offer() {
    const params = {};

    if (this._options.serverNoContextTakeover) {
      params.server_no_context_takeover = true;
    }
    if (this._options.clientNoContextTakeover) {
      params.client_no_context_takeover = true;
    }
    if (this._options.serverMaxWindowBits) {
      params.server_max_window_bits = this._options.serverMaxWindowBits;
    }
    if (this._options.clientMaxWindowBits) {
      params.client_max_window_bits = this._options.clientMaxWindowBits;
    } else if (this._options.clientMaxWindowBits == null) {
      params.client_max_window_bits = true;
    }

    return params;
  }

  /**
   * Accept an extension negotiation offer/response.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Object} Accepted configuration
   * @public
   */
  accept(configurations) {
    configurations = this.normalizeParams(configurations);

    this.params = this._isServer
      ? this.acceptAsServer(configurations)
      : this.acceptAsClient(configurations);

    return this.params;
  }

  /**
   * Releases all resources used by the extension.
   *
   * @public
   */
  cleanup() {
    if (this._inflate) {
      this._inflate.close();
      this._inflate = null;
    }

    if (this._deflate) {
      const callback = this._deflate[kCallback];

      this._deflate.close();
      this._deflate = null;

      if (callback) {
        callback(
          new Error(
            'The deflate stream was closed while data was being processed'
          )
        );
      }
    }
  }

  /**
   *  Accept an extension negotiation offer.
   *
   * @param {Array} offers The extension negotiation offers
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsServer(offers) {
    const opts = this._options;
    const accepted = offers.find((params) => {
      if (
        (opts.serverNoContextTakeover === false &&
          params.server_no_context_takeover) ||
        (params.server_max_window_bits &&
          (opts.serverMaxWindowBits === false ||
            (typeof opts.serverMaxWindowBits === 'number' &&
              opts.serverMaxWindowBits > params.server_max_window_bits))) ||
        (typeof opts.clientMaxWindowBits === 'number' &&
          !params.client_max_window_bits)
      ) {
        return false;
      }

      return true;
    });

    if (!accepted) {
      throw new Error('None of the extension offers can be accepted');
    }

    if (opts.serverNoContextTakeover) {
      accepted.server_no_context_takeover = true;
    }
    if (opts.clientNoContextTakeover) {
      accepted.client_no_context_takeover = true;
    }
    if (typeof opts.serverMaxWindowBits === 'number') {
      accepted.server_max_window_bits = opts.serverMaxWindowBits;
    }
    if (typeof opts.clientMaxWindowBits === 'number') {
      accepted.client_max_window_bits = opts.clientMaxWindowBits;
    } else if (
      accepted.client_max_window_bits === true ||
      opts.clientMaxWindowBits === false
    ) {
      delete accepted.client_max_window_bits;
    }

    return accepted;
  }

  /**
   * Accept the extension negotiation response.
   *
   * @param {Array} response The extension negotiation response
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsClient(response) {
    const params = response[0];

    if (
      this._options.clientNoContextTakeover === false &&
      params.client_no_context_takeover
    ) {
      throw new Error('Unexpected parameter "client_no_context_takeover"');
    }

    if (!params.client_max_window_bits) {
      if (typeof this._options.clientMaxWindowBits === 'number') {
        params.client_max_window_bits = this._options.clientMaxWindowBits;
      }
    } else if (
      this._options.clientMaxWindowBits === false ||
      (typeof this._options.clientMaxWindowBits === 'number' &&
        params.client_max_window_bits > this._options.clientMaxWindowBits)
    ) {
      throw new Error(
        'Unexpected or invalid parameter "client_max_window_bits"'
      );
    }

    return params;
  }

  /**
   * Normalize parameters.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Array} The offers/response with normalized parameters
   * @private
   */
  normalizeParams(configurations) {
    configurations.forEach((params) => {
      Object.keys(params).forEach((key) => {
        let value = params[key];

        if (value.length > 1) {
          throw new Error(`Parameter "${key}" must have only a single value`);
        }

        value = value[0];

        if (key === 'client_max_window_bits') {
          if (value !== true) {
            const num = +value;
            if (!Number.isInteger(num) || num < 8 || num > 15) {
              throw new TypeError(
                `Invalid value for parameter "${key}": ${value}`
              );
            }
            value = num;
          } else if (!this._isServer) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
        } else if (key === 'server_max_window_bits') {
          const num = +value;
          if (!Number.isInteger(num) || num < 8 || num > 15) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
          value = num;
        } else if (
          key === 'client_no_context_takeover' ||
          key === 'server_no_context_takeover'
        ) {
          if (value !== true) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
        } else {
          throw new Error(`Unknown parameter "${key}"`);
        }

        params[key] = value;
      });
    });

    return configurations;
  }

  /**
   * Decompress data. Concurrency limited.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  decompress(data, fin, callback) {
    zlibLimiter.add((done) => {
      this._decompress(data, fin, (err, result) => {
        done();
        callback(err, result);
      });
    });
  }

  /**
   * Compress data. Concurrency limited.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  compress(data, fin, callback) {
    zlibLimiter.add((done) => {
      this._compress(data, fin, (err, result) => {
        done();
        callback(err, result);
      });
    });
  }

  /**
   * Decompress data.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _decompress(data, fin, callback) {
    const endpoint = this._isServer ? 'client' : 'server';

    if (!this._inflate) {
      const key = `${endpoint}_max_window_bits`;
      const windowBits =
        typeof this.params[key] !== 'number'
          ? zlib.Z_DEFAULT_WINDOWBITS
          : this.params[key];

      this._inflate = zlib.createInflateRaw({
        ...this._options.zlibInflateOptions,
        windowBits
      });
      this._inflate[kPerMessageDeflate] = this;
      this._inflate[kTotalLength] = 0;
      this._inflate[kBuffers] = [];
      this._inflate.on('error', inflateOnError);
      this._inflate.on('data', inflateOnData);
    }

    this._inflate[kCallback] = callback;

    this._inflate.write(data);
    if (fin) this._inflate.write(TRAILER);

    this._inflate.flush(() => {
      const err = this._inflate[kError];

      if (err) {
        this._inflate.close();
        this._inflate = null;
        callback(err);
        return;
      }

      const data = bufferUtil.concat(
        this._inflate[kBuffers],
        this._inflate[kTotalLength]
      );

      if (this._inflate._readableState.endEmitted) {
        this._inflate.close();
        this._inflate = null;
      } else {
        this._inflate[kTotalLength] = 0;
        this._inflate[kBuffers] = [];

        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
          this._inflate.reset();
        }
      }

      callback(null, data);
    });
  }

  /**
   * Compress data.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _compress(data, fin, callback) {
    const endpoint = this._isServer ? 'server' : 'client';

    if (!this._deflate) {
      const key = `${endpoint}_max_window_bits`;
      const windowBits =
        typeof this.params[key] !== 'number'
          ? zlib.Z_DEFAULT_WINDOWBITS
          : this.params[key];

      this._deflate = zlib.createDeflateRaw({
        ...this._options.zlibDeflateOptions,
        windowBits
      });

      this._deflate[kTotalLength] = 0;
      this._deflate[kBuffers] = [];

      this._deflate.on('data', deflateOnData);
    }

    this._deflate[kCallback] = callback;

    this._deflate.write(data);
    this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
      if (!this._deflate) {
        //
        // The deflate stream was closed while data was being processed.
        //
        return;
      }

      let data = bufferUtil.concat(
        this._deflate[kBuffers],
        this._deflate[kTotalLength]
      );

      if (fin) {
        data = new FastBuffer(data.buffer, data.byteOffset, data.length - 4);
      }

      //
      // Ensure that the callback will not be called again in
      // `PerMessageDeflate#cleanup()`.
      //
      this._deflate[kCallback] = null;

      this._deflate[kTotalLength] = 0;
      this._deflate[kBuffers] = [];

      if (fin && this.params[`${endpoint}_no_context_takeover`]) {
        this._deflate.reset();
      }

      callback(null, data);
    });
  }
}

module.exports = PerMessageDeflate;

/**
 * The listener of the `zlib.DeflateRaw` stream `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function deflateOnData(chunk) {
  this[kBuffers].push(chunk);
  this[kTotalLength] += chunk.length;
}

/**
 * The listener of the `zlib.InflateRaw` stream `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function inflateOnData(chunk) {
  this[kTotalLength] += chunk.length;

  if (
    this[kPerMessageDeflate]._maxPayload < 1 ||
    this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload
  ) {
    this[kBuffers].push(chunk);
    return;
  }

  this[kError] = new RangeError('Max payload size exceeded');
  this[kError].code = 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH';
  this[kError][kStatusCode] = 1009;
  this.removeListener('data', inflateOnData);

  //
  // The choice to employ `zlib.reset()` over `zlib.close()` is dictated by the
  // fact that in Node.js versions prior to 13.10.0, the callback for
  // `zlib.flush()` is not called if `zlib.close()` is used. Utilizing
  // `zlib.reset()` ensures that either the callback is invoked or an error is
  // emitted.
  //
  this.reset();
}

/**
 * The listener of the `zlib.InflateRaw` stream `'error'` event.
 *
 * @param {Error} err The emitted error
 * @private
 */
function inflateOnError(err) {
  //
  // There is no need to call `Zlib#close()` as the handle is automatically
  // closed when an error is emitted.
  //
  this[kPerMessageDeflate]._inflate = null;

  if (this[kError]) {
    this[kCallback](this[kError]);
    return;
  }

  err[kStatusCode] = 1007;
  this[kCallback](err);
}


/***/ },

/***/ "./node_modules/ws/lib/receiver.js"
/*!*****************************************!*\
  !*** ./node_modules/ws/lib/receiver.js ***!
  \*****************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { Writable } = __webpack_require__(/*! stream */ "stream");

const PerMessageDeflate = __webpack_require__(/*! ./permessage-deflate */ "./node_modules/ws/lib/permessage-deflate.js");
const {
  BINARY_TYPES,
  EMPTY_BUFFER,
  kStatusCode,
  kWebSocket
} = __webpack_require__(/*! ./constants */ "./node_modules/ws/lib/constants.js");
const { concat, toArrayBuffer, unmask } = __webpack_require__(/*! ./buffer-util */ "./node_modules/ws/lib/buffer-util.js");
const { isValidStatusCode, isValidUTF8 } = __webpack_require__(/*! ./validation */ "./node_modules/ws/lib/validation.js");

const FastBuffer = Buffer[Symbol.species];

const GET_INFO = 0;
const GET_PAYLOAD_LENGTH_16 = 1;
const GET_PAYLOAD_LENGTH_64 = 2;
const GET_MASK = 3;
const GET_DATA = 4;
const INFLATING = 5;
const DEFER_EVENT = 6;

/**
 * HyBi Receiver implementation.
 *
 * @extends Writable
 */
class Receiver extends Writable {
  /**
   * Creates a Receiver instance.
   *
   * @param {Object} [options] Options object
   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {String} [options.binaryType=nodebuffer] The type for binary data
   * @param {Object} [options.extensions] An object containing the negotiated
   *     extensions
   * @param {Boolean} [options.isServer=false] Specifies whether to operate in
   *     client or server mode
   * @param {Number} [options.maxPayload=0] The maximum allowed message length
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   */
  constructor(options = {}) {
    super();

    this._allowSynchronousEvents =
      options.allowSynchronousEvents !== undefined
        ? options.allowSynchronousEvents
        : true;
    this._binaryType = options.binaryType || BINARY_TYPES[0];
    this._extensions = options.extensions || {};
    this._isServer = !!options.isServer;
    this._maxPayload = options.maxPayload | 0;
    this._skipUTF8Validation = !!options.skipUTF8Validation;
    this[kWebSocket] = undefined;

    this._bufferedBytes = 0;
    this._buffers = [];

    this._compressed = false;
    this._payloadLength = 0;
    this._mask = undefined;
    this._fragmented = 0;
    this._masked = false;
    this._fin = false;
    this._opcode = 0;

    this._totalPayloadLength = 0;
    this._messageLength = 0;
    this._fragments = [];

    this._errored = false;
    this._loop = false;
    this._state = GET_INFO;
  }

  /**
   * Implements `Writable.prototype._write()`.
   *
   * @param {Buffer} chunk The chunk of data to write
   * @param {String} encoding The character encoding of `chunk`
   * @param {Function} cb Callback
   * @private
   */
  _write(chunk, encoding, cb) {
    if (this._opcode === 0x08 && this._state == GET_INFO) return cb();

    this._bufferedBytes += chunk.length;
    this._buffers.push(chunk);
    this.startLoop(cb);
  }

  /**
   * Consumes `n` bytes from the buffered data.
   *
   * @param {Number} n The number of bytes to consume
   * @return {Buffer} The consumed bytes
   * @private
   */
  consume(n) {
    this._bufferedBytes -= n;

    if (n === this._buffers[0].length) return this._buffers.shift();

    if (n < this._buffers[0].length) {
      const buf = this._buffers[0];
      this._buffers[0] = new FastBuffer(
        buf.buffer,
        buf.byteOffset + n,
        buf.length - n
      );

      return new FastBuffer(buf.buffer, buf.byteOffset, n);
    }

    const dst = Buffer.allocUnsafe(n);

    do {
      const buf = this._buffers[0];
      const offset = dst.length - n;

      if (n >= buf.length) {
        dst.set(this._buffers.shift(), offset);
      } else {
        dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
        this._buffers[0] = new FastBuffer(
          buf.buffer,
          buf.byteOffset + n,
          buf.length - n
        );
      }

      n -= buf.length;
    } while (n > 0);

    return dst;
  }

  /**
   * Starts the parsing loop.
   *
   * @param {Function} cb Callback
   * @private
   */
  startLoop(cb) {
    this._loop = true;

    do {
      switch (this._state) {
        case GET_INFO:
          this.getInfo(cb);
          break;
        case GET_PAYLOAD_LENGTH_16:
          this.getPayloadLength16(cb);
          break;
        case GET_PAYLOAD_LENGTH_64:
          this.getPayloadLength64(cb);
          break;
        case GET_MASK:
          this.getMask();
          break;
        case GET_DATA:
          this.getData(cb);
          break;
        case INFLATING:
        case DEFER_EVENT:
          this._loop = false;
          return;
      }
    } while (this._loop);

    if (!this._errored) cb();
  }

  /**
   * Reads the first two bytes of a frame.
   *
   * @param {Function} cb Callback
   * @private
   */
  getInfo(cb) {
    if (this._bufferedBytes < 2) {
      this._loop = false;
      return;
    }

    const buf = this.consume(2);

    if ((buf[0] & 0x30) !== 0x00) {
      const error = this.createError(
        RangeError,
        'RSV2 and RSV3 must be clear',
        true,
        1002,
        'WS_ERR_UNEXPECTED_RSV_2_3'
      );

      cb(error);
      return;
    }

    const compressed = (buf[0] & 0x40) === 0x40;

    if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
      const error = this.createError(
        RangeError,
        'RSV1 must be clear',
        true,
        1002,
        'WS_ERR_UNEXPECTED_RSV_1'
      );

      cb(error);
      return;
    }

    this._fin = (buf[0] & 0x80) === 0x80;
    this._opcode = buf[0] & 0x0f;
    this._payloadLength = buf[1] & 0x7f;

    if (this._opcode === 0x00) {
      if (compressed) {
        const error = this.createError(
          RangeError,
          'RSV1 must be clear',
          true,
          1002,
          'WS_ERR_UNEXPECTED_RSV_1'
        );

        cb(error);
        return;
      }

      if (!this._fragmented) {
        const error = this.createError(
          RangeError,
          'invalid opcode 0',
          true,
          1002,
          'WS_ERR_INVALID_OPCODE'
        );

        cb(error);
        return;
      }

      this._opcode = this._fragmented;
    } else if (this._opcode === 0x01 || this._opcode === 0x02) {
      if (this._fragmented) {
        const error = this.createError(
          RangeError,
          `invalid opcode ${this._opcode}`,
          true,
          1002,
          'WS_ERR_INVALID_OPCODE'
        );

        cb(error);
        return;
      }

      this._compressed = compressed;
    } else if (this._opcode > 0x07 && this._opcode < 0x0b) {
      if (!this._fin) {
        const error = this.createError(
          RangeError,
          'FIN must be set',
          true,
          1002,
          'WS_ERR_EXPECTED_FIN'
        );

        cb(error);
        return;
      }

      if (compressed) {
        const error = this.createError(
          RangeError,
          'RSV1 must be clear',
          true,
          1002,
          'WS_ERR_UNEXPECTED_RSV_1'
        );

        cb(error);
        return;
      }

      if (
        this._payloadLength > 0x7d ||
        (this._opcode === 0x08 && this._payloadLength === 1)
      ) {
        const error = this.createError(
          RangeError,
          `invalid payload length ${this._payloadLength}`,
          true,
          1002,
          'WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH'
        );

        cb(error);
        return;
      }
    } else {
      const error = this.createError(
        RangeError,
        `invalid opcode ${this._opcode}`,
        true,
        1002,
        'WS_ERR_INVALID_OPCODE'
      );

      cb(error);
      return;
    }

    if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
    this._masked = (buf[1] & 0x80) === 0x80;

    if (this._isServer) {
      if (!this._masked) {
        const error = this.createError(
          RangeError,
          'MASK must be set',
          true,
          1002,
          'WS_ERR_EXPECTED_MASK'
        );

        cb(error);
        return;
      }
    } else if (this._masked) {
      const error = this.createError(
        RangeError,
        'MASK must be clear',
        true,
        1002,
        'WS_ERR_UNEXPECTED_MASK'
      );

      cb(error);
      return;
    }

    if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
    else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
    else this.haveLength(cb);
  }

  /**
   * Gets extended payload length (7+16).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength16(cb) {
    if (this._bufferedBytes < 2) {
      this._loop = false;
      return;
    }

    this._payloadLength = this.consume(2).readUInt16BE(0);
    this.haveLength(cb);
  }

  /**
   * Gets extended payload length (7+64).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength64(cb) {
    if (this._bufferedBytes < 8) {
      this._loop = false;
      return;
    }

    const buf = this.consume(8);
    const num = buf.readUInt32BE(0);

    //
    // The maximum safe integer in JavaScript is 2^53 - 1. An error is returned
    // if payload length is greater than this number.
    //
    if (num > Math.pow(2, 53 - 32) - 1) {
      const error = this.createError(
        RangeError,
        'Unsupported WebSocket frame: payload length > 2^53 - 1',
        false,
        1009,
        'WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH'
      );

      cb(error);
      return;
    }

    this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
    this.haveLength(cb);
  }

  /**
   * Payload length has been read.
   *
   * @param {Function} cb Callback
   * @private
   */
  haveLength(cb) {
    if (this._payloadLength && this._opcode < 0x08) {
      this._totalPayloadLength += this._payloadLength;
      if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
        const error = this.createError(
          RangeError,
          'Max payload size exceeded',
          false,
          1009,
          'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
        );

        cb(error);
        return;
      }
    }

    if (this._masked) this._state = GET_MASK;
    else this._state = GET_DATA;
  }

  /**
   * Reads mask bytes.
   *
   * @private
   */
  getMask() {
    if (this._bufferedBytes < 4) {
      this._loop = false;
      return;
    }

    this._mask = this.consume(4);
    this._state = GET_DATA;
  }

  /**
   * Reads data bytes.
   *
   * @param {Function} cb Callback
   * @private
   */
  getData(cb) {
    let data = EMPTY_BUFFER;

    if (this._payloadLength) {
      if (this._bufferedBytes < this._payloadLength) {
        this._loop = false;
        return;
      }

      data = this.consume(this._payloadLength);

      if (
        this._masked &&
        (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0
      ) {
        unmask(data, this._mask);
      }
    }

    if (this._opcode > 0x07) {
      this.controlMessage(data, cb);
      return;
    }

    if (this._compressed) {
      this._state = INFLATING;
      this.decompress(data, cb);
      return;
    }

    if (data.length) {
      //
      // This message is not compressed so its length is the sum of the payload
      // length of all fragments.
      //
      this._messageLength = this._totalPayloadLength;
      this._fragments.push(data);
    }

    this.dataMessage(cb);
  }

  /**
   * Decompresses data.
   *
   * @param {Buffer} data Compressed data
   * @param {Function} cb Callback
   * @private
   */
  decompress(data, cb) {
    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

    perMessageDeflate.decompress(data, this._fin, (err, buf) => {
      if (err) return cb(err);

      if (buf.length) {
        this._messageLength += buf.length;
        if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
          const error = this.createError(
            RangeError,
            'Max payload size exceeded',
            false,
            1009,
            'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
          );

          cb(error);
          return;
        }

        this._fragments.push(buf);
      }

      this.dataMessage(cb);
      if (this._state === GET_INFO) this.startLoop(cb);
    });
  }

  /**
   * Handles a data message.
   *
   * @param {Function} cb Callback
   * @private
   */
  dataMessage(cb) {
    if (!this._fin) {
      this._state = GET_INFO;
      return;
    }

    const messageLength = this._messageLength;
    const fragments = this._fragments;

    this._totalPayloadLength = 0;
    this._messageLength = 0;
    this._fragmented = 0;
    this._fragments = [];

    if (this._opcode === 2) {
      let data;

      if (this._binaryType === 'nodebuffer') {
        data = concat(fragments, messageLength);
      } else if (this._binaryType === 'arraybuffer') {
        data = toArrayBuffer(concat(fragments, messageLength));
      } else if (this._binaryType === 'blob') {
        data = new Blob(fragments);
      } else {
        data = fragments;
      }

      if (this._allowSynchronousEvents) {
        this.emit('message', data, true);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit('message', data, true);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    } else {
      const buf = concat(fragments, messageLength);

      if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
        const error = this.createError(
          Error,
          'invalid UTF-8 sequence',
          true,
          1007,
          'WS_ERR_INVALID_UTF8'
        );

        cb(error);
        return;
      }

      if (this._state === INFLATING || this._allowSynchronousEvents) {
        this.emit('message', buf, false);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit('message', buf, false);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    }
  }

  /**
   * Handles a control message.
   *
   * @param {Buffer} data Data to handle
   * @return {(Error|RangeError|undefined)} A possible error
   * @private
   */
  controlMessage(data, cb) {
    if (this._opcode === 0x08) {
      if (data.length === 0) {
        this._loop = false;
        this.emit('conclude', 1005, EMPTY_BUFFER);
        this.end();
      } else {
        const code = data.readUInt16BE(0);

        if (!isValidStatusCode(code)) {
          const error = this.createError(
            RangeError,
            `invalid status code ${code}`,
            true,
            1002,
            'WS_ERR_INVALID_CLOSE_CODE'
          );

          cb(error);
          return;
        }

        const buf = new FastBuffer(
          data.buffer,
          data.byteOffset + 2,
          data.length - 2
        );

        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
          const error = this.createError(
            Error,
            'invalid UTF-8 sequence',
            true,
            1007,
            'WS_ERR_INVALID_UTF8'
          );

          cb(error);
          return;
        }

        this._loop = false;
        this.emit('conclude', code, buf);
        this.end();
      }

      this._state = GET_INFO;
      return;
    }

    if (this._allowSynchronousEvents) {
      this.emit(this._opcode === 0x09 ? 'ping' : 'pong', data);
      this._state = GET_INFO;
    } else {
      this._state = DEFER_EVENT;
      setImmediate(() => {
        this.emit(this._opcode === 0x09 ? 'ping' : 'pong', data);
        this._state = GET_INFO;
        this.startLoop(cb);
      });
    }
  }

  /**
   * Builds an error object.
   *
   * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
   * @param {String} message The error message
   * @param {Boolean} prefix Specifies whether or not to add a default prefix to
   *     `message`
   * @param {Number} statusCode The status code
   * @param {String} errorCode The exposed error code
   * @return {(Error|RangeError)} The error
   * @private
   */
  createError(ErrorCtor, message, prefix, statusCode, errorCode) {
    this._loop = false;
    this._errored = true;

    const err = new ErrorCtor(
      prefix ? `Invalid WebSocket frame: ${message}` : message
    );

    Error.captureStackTrace(err, this.createError);
    err.code = errorCode;
    err[kStatusCode] = statusCode;
    return err;
  }
}

module.exports = Receiver;


/***/ },

/***/ "./node_modules/ws/lib/sender.js"
/*!***************************************!*\
  !*** ./node_modules/ws/lib/sender.js ***!
  \***************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex" }] */



const { Duplex } = __webpack_require__(/*! stream */ "stream");
const { randomFillSync } = __webpack_require__(/*! crypto */ "crypto");

const PerMessageDeflate = __webpack_require__(/*! ./permessage-deflate */ "./node_modules/ws/lib/permessage-deflate.js");
const { EMPTY_BUFFER, kWebSocket, NOOP } = __webpack_require__(/*! ./constants */ "./node_modules/ws/lib/constants.js");
const { isBlob, isValidStatusCode } = __webpack_require__(/*! ./validation */ "./node_modules/ws/lib/validation.js");
const { mask: applyMask, toBuffer } = __webpack_require__(/*! ./buffer-util */ "./node_modules/ws/lib/buffer-util.js");

const kByteLength = Symbol('kByteLength');
const maskBuffer = Buffer.alloc(4);
const RANDOM_POOL_SIZE = 8 * 1024;
let randomPool;
let randomPoolPointer = RANDOM_POOL_SIZE;

const DEFAULT = 0;
const DEFLATING = 1;
const GET_BLOB_DATA = 2;

/**
 * HyBi Sender implementation.
 */
class Sender {
  /**
   * Creates a Sender instance.
   *
   * @param {Duplex} socket The connection socket
   * @param {Object} [extensions] An object containing the negotiated extensions
   * @param {Function} [generateMask] The function used to generate the masking
   *     key
   */
  constructor(socket, extensions, generateMask) {
    this._extensions = extensions || {};

    if (generateMask) {
      this._generateMask = generateMask;
      this._maskBuffer = Buffer.alloc(4);
    }

    this._socket = socket;

    this._firstFragment = true;
    this._compress = false;

    this._bufferedBytes = 0;
    this._queue = [];
    this._state = DEFAULT;
    this.onerror = NOOP;
    this[kWebSocket] = undefined;
  }

  /**
   * Frames a piece of data according to the HyBi WebSocket protocol.
   *
   * @param {(Buffer|String)} data The data to frame
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @return {(Buffer|String)[]} The framed data
   * @public
   */
  static frame(data, options) {
    let mask;
    let merge = false;
    let offset = 2;
    let skipMasking = false;

    if (options.mask) {
      mask = options.maskBuffer || maskBuffer;

      if (options.generateMask) {
        options.generateMask(mask);
      } else {
        if (randomPoolPointer === RANDOM_POOL_SIZE) {
          /* istanbul ignore else  */
          if (randomPool === undefined) {
            //
            // This is lazily initialized because server-sent frames must not
            // be masked so it may never be used.
            //
            randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
          }

          randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
          randomPoolPointer = 0;
        }

        mask[0] = randomPool[randomPoolPointer++];
        mask[1] = randomPool[randomPoolPointer++];
        mask[2] = randomPool[randomPoolPointer++];
        mask[3] = randomPool[randomPoolPointer++];
      }

      skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
      offset = 6;
    }

    let dataLength;

    if (typeof data === 'string') {
      if (
        (!options.mask || skipMasking) &&
        options[kByteLength] !== undefined
      ) {
        dataLength = options[kByteLength];
      } else {
        data = Buffer.from(data);
        dataLength = data.length;
      }
    } else {
      dataLength = data.length;
      merge = options.mask && options.readOnly && !skipMasking;
    }

    let payloadLength = dataLength;

    if (dataLength >= 65536) {
      offset += 8;
      payloadLength = 127;
    } else if (dataLength > 125) {
      offset += 2;
      payloadLength = 126;
    }

    const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);

    target[0] = options.fin ? options.opcode | 0x80 : options.opcode;
    if (options.rsv1) target[0] |= 0x40;

    target[1] = payloadLength;

    if (payloadLength === 126) {
      target.writeUInt16BE(dataLength, 2);
    } else if (payloadLength === 127) {
      target[2] = target[3] = 0;
      target.writeUIntBE(dataLength, 4, 6);
    }

    if (!options.mask) return [target, data];

    target[1] |= 0x80;
    target[offset - 4] = mask[0];
    target[offset - 3] = mask[1];
    target[offset - 2] = mask[2];
    target[offset - 1] = mask[3];

    if (skipMasking) return [target, data];

    if (merge) {
      applyMask(data, mask, target, offset, dataLength);
      return [target];
    }

    applyMask(data, mask, data, 0, dataLength);
    return [target, data];
  }

  /**
   * Sends a close message to the other peer.
   *
   * @param {Number} [code] The status code component of the body
   * @param {(String|Buffer)} [data] The message component of the body
   * @param {Boolean} [mask=false] Specifies whether or not to mask the message
   * @param {Function} [cb] Callback
   * @public
   */
  close(code, data, mask, cb) {
    let buf;

    if (code === undefined) {
      buf = EMPTY_BUFFER;
    } else if (typeof code !== 'number' || !isValidStatusCode(code)) {
      throw new TypeError('First argument must be a valid error code number');
    } else if (data === undefined || !data.length) {
      buf = Buffer.allocUnsafe(2);
      buf.writeUInt16BE(code, 0);
    } else {
      const length = Buffer.byteLength(data);

      if (length > 123) {
        throw new RangeError('The message must not be greater than 123 bytes');
      }

      buf = Buffer.allocUnsafe(2 + length);
      buf.writeUInt16BE(code, 0);

      if (typeof data === 'string') {
        buf.write(data, 2);
      } else {
        buf.set(data, 2);
      }
    }

    const options = {
      [kByteLength]: buf.length,
      fin: true,
      generateMask: this._generateMask,
      mask,
      maskBuffer: this._maskBuffer,
      opcode: 0x08,
      readOnly: false,
      rsv1: false
    };

    if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, buf, false, options, cb]);
    } else {
      this.sendFrame(Sender.frame(buf, options), cb);
    }
  }

  /**
   * Sends a ping message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  ping(data, mask, cb) {
    let byteLength;
    let readOnly;

    if (typeof data === 'string') {
      byteLength = Buffer.byteLength(data);
      readOnly = false;
    } else if (isBlob(data)) {
      byteLength = data.size;
      readOnly = false;
    } else {
      data = toBuffer(data);
      byteLength = data.length;
      readOnly = toBuffer.readOnly;
    }

    if (byteLength > 125) {
      throw new RangeError('The data size must not be greater than 125 bytes');
    }

    const options = {
      [kByteLength]: byteLength,
      fin: true,
      generateMask: this._generateMask,
      mask,
      maskBuffer: this._maskBuffer,
      opcode: 0x09,
      readOnly,
      rsv1: false
    };

    if (isBlob(data)) {
      if (this._state !== DEFAULT) {
        this.enqueue([this.getBlobData, data, false, options, cb]);
      } else {
        this.getBlobData(data, false, options, cb);
      }
    } else if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, data, false, options, cb]);
    } else {
      this.sendFrame(Sender.frame(data, options), cb);
    }
  }

  /**
   * Sends a pong message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  pong(data, mask, cb) {
    let byteLength;
    let readOnly;

    if (typeof data === 'string') {
      byteLength = Buffer.byteLength(data);
      readOnly = false;
    } else if (isBlob(data)) {
      byteLength = data.size;
      readOnly = false;
    } else {
      data = toBuffer(data);
      byteLength = data.length;
      readOnly = toBuffer.readOnly;
    }

    if (byteLength > 125) {
      throw new RangeError('The data size must not be greater than 125 bytes');
    }

    const options = {
      [kByteLength]: byteLength,
      fin: true,
      generateMask: this._generateMask,
      mask,
      maskBuffer: this._maskBuffer,
      opcode: 0x0a,
      readOnly,
      rsv1: false
    };

    if (isBlob(data)) {
      if (this._state !== DEFAULT) {
        this.enqueue([this.getBlobData, data, false, options, cb]);
      } else {
        this.getBlobData(data, false, options, cb);
      }
    } else if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, data, false, options, cb]);
    } else {
      this.sendFrame(Sender.frame(data, options), cb);
    }
  }

  /**
   * Sends a data message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Object} options Options object
   * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
   *     or text
   * @param {Boolean} [options.compress=false] Specifies whether or not to
   *     compress `data`
   * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Function} [cb] Callback
   * @public
   */
  send(data, options, cb) {
    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
    let opcode = options.binary ? 2 : 1;
    let rsv1 = options.compress;

    let byteLength;
    let readOnly;

    if (typeof data === 'string') {
      byteLength = Buffer.byteLength(data);
      readOnly = false;
    } else if (isBlob(data)) {
      byteLength = data.size;
      readOnly = false;
    } else {
      data = toBuffer(data);
      byteLength = data.length;
      readOnly = toBuffer.readOnly;
    }

    if (this._firstFragment) {
      this._firstFragment = false;
      if (
        rsv1 &&
        perMessageDeflate &&
        perMessageDeflate.params[
          perMessageDeflate._isServer
            ? 'server_no_context_takeover'
            : 'client_no_context_takeover'
        ]
      ) {
        rsv1 = byteLength >= perMessageDeflate._threshold;
      }
      this._compress = rsv1;
    } else {
      rsv1 = false;
      opcode = 0;
    }

    if (options.fin) this._firstFragment = true;

    const opts = {
      [kByteLength]: byteLength,
      fin: options.fin,
      generateMask: this._generateMask,
      mask: options.mask,
      maskBuffer: this._maskBuffer,
      opcode,
      readOnly,
      rsv1
    };

    if (isBlob(data)) {
      if (this._state !== DEFAULT) {
        this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
      } else {
        this.getBlobData(data, this._compress, opts, cb);
      }
    } else if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, data, this._compress, opts, cb]);
    } else {
      this.dispatch(data, this._compress, opts, cb);
    }
  }

  /**
   * Gets the contents of a blob as binary data.
   *
   * @param {Blob} blob The blob
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     the data
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  getBlobData(blob, compress, options, cb) {
    this._bufferedBytes += options[kByteLength];
    this._state = GET_BLOB_DATA;

    blob
      .arrayBuffer()
      .then((arrayBuffer) => {
        if (this._socket.destroyed) {
          const err = new Error(
            'The socket was closed while the blob was being read'
          );

          //
          // `callCallbacks` is called in the next tick to ensure that errors
          // that might be thrown in the callbacks behave like errors thrown
          // outside the promise chain.
          //
          process.nextTick(callCallbacks, this, err, cb);
          return;
        }

        this._bufferedBytes -= options[kByteLength];
        const data = toBuffer(arrayBuffer);

        if (!compress) {
          this._state = DEFAULT;
          this.sendFrame(Sender.frame(data, options), cb);
          this.dequeue();
        } else {
          this.dispatch(data, compress, options, cb);
        }
      })
      .catch((err) => {
        //
        // `onError` is called in the next tick for the same reason that
        // `callCallbacks` above is.
        //
        process.nextTick(onError, this, err, cb);
      });
  }

  /**
   * Dispatches a message.
   *
   * @param {(Buffer|String)} data The message to send
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     `data`
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  dispatch(data, compress, options, cb) {
    if (!compress) {
      this.sendFrame(Sender.frame(data, options), cb);
      return;
    }

    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

    this._bufferedBytes += options[kByteLength];
    this._state = DEFLATING;
    perMessageDeflate.compress(data, options.fin, (_, buf) => {
      if (this._socket.destroyed) {
        const err = new Error(
          'The socket was closed while data was being compressed'
        );

        callCallbacks(this, err, cb);
        return;
      }

      this._bufferedBytes -= options[kByteLength];
      this._state = DEFAULT;
      options.readOnly = false;
      this.sendFrame(Sender.frame(buf, options), cb);
      this.dequeue();
    });
  }

  /**
   * Executes queued send operations.
   *
   * @private
   */
  dequeue() {
    while (this._state === DEFAULT && this._queue.length) {
      const params = this._queue.shift();

      this._bufferedBytes -= params[3][kByteLength];
      Reflect.apply(params[0], this, params.slice(1));
    }
  }

  /**
   * Enqueues a send operation.
   *
   * @param {Array} params Send operation parameters.
   * @private
   */
  enqueue(params) {
    this._bufferedBytes += params[3][kByteLength];
    this._queue.push(params);
  }

  /**
   * Sends a frame.
   *
   * @param {(Buffer | String)[]} list The frame to send
   * @param {Function} [cb] Callback
   * @private
   */
  sendFrame(list, cb) {
    if (list.length === 2) {
      this._socket.cork();
      this._socket.write(list[0]);
      this._socket.write(list[1], cb);
      this._socket.uncork();
    } else {
      this._socket.write(list[0], cb);
    }
  }
}

module.exports = Sender;

/**
 * Calls queued callbacks with an error.
 *
 * @param {Sender} sender The `Sender` instance
 * @param {Error} err The error to call the callbacks with
 * @param {Function} [cb] The first callback
 * @private
 */
function callCallbacks(sender, err, cb) {
  if (typeof cb === 'function') cb(err);

  for (let i = 0; i < sender._queue.length; i++) {
    const params = sender._queue[i];
    const callback = params[params.length - 1];

    if (typeof callback === 'function') callback(err);
  }
}

/**
 * Handles a `Sender` error.
 *
 * @param {Sender} sender The `Sender` instance
 * @param {Error} err The error
 * @param {Function} [cb] The first pending callback
 * @private
 */
function onError(sender, err, cb) {
  callCallbacks(sender, err, cb);
  sender.onerror(err);
}


/***/ },

/***/ "./node_modules/ws/lib/stream.js"
/*!***************************************!*\
  !*** ./node_modules/ws/lib/stream.js ***!
  \***************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^WebSocket$" }] */


const WebSocket = __webpack_require__(/*! ./websocket */ "./node_modules/ws/lib/websocket.js");
const { Duplex } = __webpack_require__(/*! stream */ "stream");

/**
 * Emits the `'close'` event on a stream.
 *
 * @param {Duplex} stream The stream.
 * @private
 */
function emitClose(stream) {
  stream.emit('close');
}

/**
 * The listener of the `'end'` event.
 *
 * @private
 */
function duplexOnEnd() {
  if (!this.destroyed && this._writableState.finished) {
    this.destroy();
  }
}

/**
 * The listener of the `'error'` event.
 *
 * @param {Error} err The error
 * @private
 */
function duplexOnError(err) {
  this.removeListener('error', duplexOnError);
  this.destroy();
  if (this.listenerCount('error') === 0) {
    // Do not suppress the throwing behavior.
    this.emit('error', err);
  }
}

/**
 * Wraps a `WebSocket` in a duplex stream.
 *
 * @param {WebSocket} ws The `WebSocket` to wrap
 * @param {Object} [options] The options for the `Duplex` constructor
 * @return {Duplex} The duplex stream
 * @public
 */
function createWebSocketStream(ws, options) {
  let terminateOnDestroy = true;

  const duplex = new Duplex({
    ...options,
    autoDestroy: false,
    emitClose: false,
    objectMode: false,
    writableObjectMode: false
  });

  ws.on('message', function message(msg, isBinary) {
    const data =
      !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;

    if (!duplex.push(data)) ws.pause();
  });

  ws.once('error', function error(err) {
    if (duplex.destroyed) return;

    // Prevent `ws.terminate()` from being called by `duplex._destroy()`.
    //
    // - If the `'error'` event is emitted before the `'open'` event, then
    //   `ws.terminate()` is a noop as no socket is assigned.
    // - Otherwise, the error is re-emitted by the listener of the `'error'`
    //   event of the `Receiver` object. The listener already closes the
    //   connection by calling `ws.close()`. This allows a close frame to be
    //   sent to the other peer. If `ws.terminate()` is called right after this,
    //   then the close frame might not be sent.
    terminateOnDestroy = false;
    duplex.destroy(err);
  });

  ws.once('close', function close() {
    if (duplex.destroyed) return;

    duplex.push(null);
  });

  duplex._destroy = function (err, callback) {
    if (ws.readyState === ws.CLOSED) {
      callback(err);
      process.nextTick(emitClose, duplex);
      return;
    }

    let called = false;

    ws.once('error', function error(err) {
      called = true;
      callback(err);
    });

    ws.once('close', function close() {
      if (!called) callback(err);
      process.nextTick(emitClose, duplex);
    });

    if (terminateOnDestroy) ws.terminate();
  };

  duplex._final = function (callback) {
    if (ws.readyState === ws.CONNECTING) {
      ws.once('open', function open() {
        duplex._final(callback);
      });
      return;
    }

    // If the value of the `_socket` property is `null` it means that `ws` is a
    // client websocket and the handshake failed. In fact, when this happens, a
    // socket is never assigned to the websocket. Wait for the `'error'` event
    // that will be emitted by the websocket.
    if (ws._socket === null) return;

    if (ws._socket._writableState.finished) {
      callback();
      if (duplex._readableState.endEmitted) duplex.destroy();
    } else {
      ws._socket.once('finish', function finish() {
        // `duplex` is not destroyed here because the `'end'` event will be
        // emitted on `duplex` after this `'finish'` event. The EOF signaling
        // `null` chunk is, in fact, pushed when the websocket emits `'close'`.
        callback();
      });
      ws.close();
    }
  };

  duplex._read = function () {
    if (ws.isPaused) ws.resume();
  };

  duplex._write = function (chunk, encoding, callback) {
    if (ws.readyState === ws.CONNECTING) {
      ws.once('open', function open() {
        duplex._write(chunk, encoding, callback);
      });
      return;
    }

    ws.send(chunk, callback);
  };

  duplex.on('end', duplexOnEnd);
  duplex.on('error', duplexOnError);
  return duplex;
}

module.exports = createWebSocketStream;


/***/ },

/***/ "./node_modules/ws/lib/subprotocol.js"
/*!********************************************!*\
  !*** ./node_modules/ws/lib/subprotocol.js ***!
  \********************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { tokenChars } = __webpack_require__(/*! ./validation */ "./node_modules/ws/lib/validation.js");

/**
 * Parses the `Sec-WebSocket-Protocol` header into a set of subprotocol names.
 *
 * @param {String} header The field value of the header
 * @return {Set} The subprotocol names
 * @public
 */
function parse(header) {
  const protocols = new Set();
  let start = -1;
  let end = -1;
  let i = 0;

  for (i; i < header.length; i++) {
    const code = header.charCodeAt(i);

    if (end === -1 && tokenChars[code] === 1) {
      if (start === -1) start = i;
    } else if (
      i !== 0 &&
      (code === 0x20 /* ' ' */ || code === 0x09) /* '\t' */
    ) {
      if (end === -1 && start !== -1) end = i;
    } else if (code === 0x2c /* ',' */) {
      if (start === -1) {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }

      if (end === -1) end = i;

      const protocol = header.slice(start, end);

      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }

      protocols.add(protocol);
      start = end = -1;
    } else {
      throw new SyntaxError(`Unexpected character at index ${i}`);
    }
  }

  if (start === -1 || end !== -1) {
    throw new SyntaxError('Unexpected end of input');
  }

  const protocol = header.slice(start, i);

  if (protocols.has(protocol)) {
    throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
  }

  protocols.add(protocol);
  return protocols;
}

module.exports = { parse };


/***/ },

/***/ "./node_modules/ws/lib/validation.js"
/*!*******************************************!*\
  !*** ./node_modules/ws/lib/validation.js ***!
  \*******************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


const { isUtf8 } = __webpack_require__(/*! buffer */ "buffer");

const { hasBlob } = __webpack_require__(/*! ./constants */ "./node_modules/ws/lib/constants.js");

//
// Allowed token characters:
//
// '!', '#', '$', '%', '&', ''', '*', '+', '-',
// '.', 0-9, A-Z, '^', '_', '`', a-z, '|', '~'
//
// tokenChars[32] === 0 // ' '
// tokenChars[33] === 1 // '!'
// tokenChars[34] === 0 // '"'
// ...
//
// prettier-ignore
const tokenChars = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
  0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, // 32 - 47
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, // 80 - 95
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0 // 112 - 127
];

/**
 * Checks if a status code is allowed in a close frame.
 *
 * @param {Number} code The status code
 * @return {Boolean} `true` if the status code is valid, else `false`
 * @public
 */
function isValidStatusCode(code) {
  return (
    (code >= 1000 &&
      code <= 1014 &&
      code !== 1004 &&
      code !== 1005 &&
      code !== 1006) ||
    (code >= 3000 && code <= 4999)
  );
}

/**
 * Checks if a given buffer contains only correct UTF-8.
 * Ported from https://www.cl.cam.ac.uk/%7Emgk25/ucs/utf8_check.c by
 * Markus Kuhn.
 *
 * @param {Buffer} buf The buffer to check
 * @return {Boolean} `true` if `buf` contains only correct UTF-8, else `false`
 * @public
 */
function _isValidUTF8(buf) {
  const len = buf.length;
  let i = 0;

  while (i < len) {
    if ((buf[i] & 0x80) === 0) {
      // 0xxxxxxx
      i++;
    } else if ((buf[i] & 0xe0) === 0xc0) {
      // 110xxxxx 10xxxxxx
      if (
        i + 1 === len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i] & 0xfe) === 0xc0 // Overlong
      ) {
        return false;
      }

      i += 2;
    } else if ((buf[i] & 0xf0) === 0xe0) {
      // 1110xxxx 10xxxxxx 10xxxxxx
      if (
        i + 2 >= len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i + 2] & 0xc0) !== 0x80 ||
        (buf[i] === 0xe0 && (buf[i + 1] & 0xe0) === 0x80) || // Overlong
        (buf[i] === 0xed && (buf[i + 1] & 0xe0) === 0xa0) // Surrogate (U+D800 - U+DFFF)
      ) {
        return false;
      }

      i += 3;
    } else if ((buf[i] & 0xf8) === 0xf0) {
      // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
      if (
        i + 3 >= len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i + 2] & 0xc0) !== 0x80 ||
        (buf[i + 3] & 0xc0) !== 0x80 ||
        (buf[i] === 0xf0 && (buf[i + 1] & 0xf0) === 0x80) || // Overlong
        (buf[i] === 0xf4 && buf[i + 1] > 0x8f) ||
        buf[i] > 0xf4 // > U+10FFFF
      ) {
        return false;
      }

      i += 4;
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Determines whether a value is a `Blob`.
 *
 * @param {*} value The value to be tested
 * @return {Boolean} `true` if `value` is a `Blob`, else `false`
 * @private
 */
function isBlob(value) {
  return (
    hasBlob &&
    typeof value === 'object' &&
    typeof value.arrayBuffer === 'function' &&
    typeof value.type === 'string' &&
    typeof value.stream === 'function' &&
    (value[Symbol.toStringTag] === 'Blob' ||
      value[Symbol.toStringTag] === 'File')
  );
}

module.exports = {
  isBlob,
  isValidStatusCode,
  isValidUTF8: _isValidUTF8,
  tokenChars
};

if (isUtf8) {
  module.exports.isValidUTF8 = function (buf) {
    return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
  };
} /* istanbul ignore else  */ else if (!process.env.WS_NO_UTF_8_VALIDATE) {
  try {
    const isValidUTF8 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module 'utf-8-validate'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));

    module.exports.isValidUTF8 = function (buf) {
      return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
    };
  } catch (e) {
    // Continue regardless of the error.
  }
}


/***/ },

/***/ "./node_modules/ws/lib/websocket-server.js"
/*!*************************************************!*\
  !*** ./node_modules/ws/lib/websocket-server.js ***!
  \*************************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex$", "caughtErrors": "none" }] */



const EventEmitter = __webpack_require__(/*! events */ "events");
const http = __webpack_require__(/*! http */ "http");
const { Duplex } = __webpack_require__(/*! stream */ "stream");
const { createHash } = __webpack_require__(/*! crypto */ "crypto");

const extension = __webpack_require__(/*! ./extension */ "./node_modules/ws/lib/extension.js");
const PerMessageDeflate = __webpack_require__(/*! ./permessage-deflate */ "./node_modules/ws/lib/permessage-deflate.js");
const subprotocol = __webpack_require__(/*! ./subprotocol */ "./node_modules/ws/lib/subprotocol.js");
const WebSocket = __webpack_require__(/*! ./websocket */ "./node_modules/ws/lib/websocket.js");
const { CLOSE_TIMEOUT, GUID, kWebSocket } = __webpack_require__(/*! ./constants */ "./node_modules/ws/lib/constants.js");

const keyRegex = /^[+/0-9A-Za-z]{22}==$/;

const RUNNING = 0;
const CLOSING = 1;
const CLOSED = 2;

/**
 * Class representing a WebSocket server.
 *
 * @extends EventEmitter
 */
class WebSocketServer extends EventEmitter {
  /**
   * Create a `WebSocketServer` instance.
   *
   * @param {Object} options Configuration options
   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {Boolean} [options.autoPong=true] Specifies whether or not to
   *     automatically send a pong in response to a ping
   * @param {Number} [options.backlog=511] The maximum length of the queue of
   *     pending connections
   * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
   *     track clients
   * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
   *     wait for the closing handshake to finish after `websocket.close()` is
   *     called
   * @param {Function} [options.handleProtocols] A hook to handle protocols
   * @param {String} [options.host] The hostname where to bind the server
   * @param {Number} [options.maxPayload=104857600] The maximum allowed message
   *     size
   * @param {Boolean} [options.noServer=false] Enable no server mode
   * @param {String} [options.path] Accept only connections matching this path
   * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
   *     permessage-deflate
   * @param {Number} [options.port] The port where to bind the server
   * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
   *     server to use
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   * @param {Function} [options.verifyClient] A hook to reject connections
   * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
   *     class to use. It must be the `WebSocket` class or class that extends it
   * @param {Function} [callback] A listener for the `listening` event
   */
  constructor(options, callback) {
    super();

    options = {
      allowSynchronousEvents: true,
      autoPong: true,
      maxPayload: 100 * 1024 * 1024,
      skipUTF8Validation: false,
      perMessageDeflate: false,
      handleProtocols: null,
      clientTracking: true,
      closeTimeout: CLOSE_TIMEOUT,
      verifyClient: null,
      noServer: false,
      backlog: null, // use default (511 as implemented in net.js)
      server: null,
      host: null,
      path: null,
      port: null,
      WebSocket,
      ...options
    };

    if (
      (options.port == null && !options.server && !options.noServer) ||
      (options.port != null && (options.server || options.noServer)) ||
      (options.server && options.noServer)
    ) {
      throw new TypeError(
        'One and only one of the "port", "server", or "noServer" options ' +
          'must be specified'
      );
    }

    if (options.port != null) {
      this._server = http.createServer((req, res) => {
        const body = http.STATUS_CODES[426];

        res.writeHead(426, {
          'Content-Length': body.length,
          'Content-Type': 'text/plain'
        });
        res.end(body);
      });
      this._server.listen(
        options.port,
        options.host,
        options.backlog,
        callback
      );
    } else if (options.server) {
      this._server = options.server;
    }

    if (this._server) {
      const emitConnection = this.emit.bind(this, 'connection');

      this._removeListeners = addListeners(this._server, {
        listening: this.emit.bind(this, 'listening'),
        error: this.emit.bind(this, 'error'),
        upgrade: (req, socket, head) => {
          this.handleUpgrade(req, socket, head, emitConnection);
        }
      });
    }

    if (options.perMessageDeflate === true) options.perMessageDeflate = {};
    if (options.clientTracking) {
      this.clients = new Set();
      this._shouldEmitClose = false;
    }

    this.options = options;
    this._state = RUNNING;
  }

  /**
   * Returns the bound address, the address family name, and port of the server
   * as reported by the operating system if listening on an IP socket.
   * If the server is listening on a pipe or UNIX domain socket, the name is
   * returned as a string.
   *
   * @return {(Object|String|null)} The address of the server
   * @public
   */
  address() {
    if (this.options.noServer) {
      throw new Error('The server is operating in "noServer" mode');
    }

    if (!this._server) return null;
    return this._server.address();
  }

  /**
   * Stop the server from accepting new connections and emit the `'close'` event
   * when all existing connections are closed.
   *
   * @param {Function} [cb] A one-time listener for the `'close'` event
   * @public
   */
  close(cb) {
    if (this._state === CLOSED) {
      if (cb) {
        this.once('close', () => {
          cb(new Error('The server is not running'));
        });
      }

      process.nextTick(emitClose, this);
      return;
    }

    if (cb) this.once('close', cb);

    if (this._state === CLOSING) return;
    this._state = CLOSING;

    if (this.options.noServer || this.options.server) {
      if (this._server) {
        this._removeListeners();
        this._removeListeners = this._server = null;
      }

      if (this.clients) {
        if (!this.clients.size) {
          process.nextTick(emitClose, this);
        } else {
          this._shouldEmitClose = true;
        }
      } else {
        process.nextTick(emitClose, this);
      }
    } else {
      const server = this._server;

      this._removeListeners();
      this._removeListeners = this._server = null;

      //
      // The HTTP/S server was created internally. Close it, and rely on its
      // `'close'` event.
      //
      server.close(() => {
        emitClose(this);
      });
    }
  }

  /**
   * See if a given request should be handled by this server instance.
   *
   * @param {http.IncomingMessage} req Request object to inspect
   * @return {Boolean} `true` if the request is valid, else `false`
   * @public
   */
  shouldHandle(req) {
    if (this.options.path) {
      const index = req.url.indexOf('?');
      const pathname = index !== -1 ? req.url.slice(0, index) : req.url;

      if (pathname !== this.options.path) return false;
    }

    return true;
  }

  /**
   * Handle a HTTP Upgrade request.
   *
   * @param {http.IncomingMessage} req The request object
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Function} cb Callback
   * @public
   */
  handleUpgrade(req, socket, head, cb) {
    socket.on('error', socketOnError);

    const key = req.headers['sec-websocket-key'];
    const upgrade = req.headers.upgrade;
    const version = +req.headers['sec-websocket-version'];

    if (req.method !== 'GET') {
      const message = 'Invalid HTTP method';
      abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
      return;
    }

    if (upgrade === undefined || upgrade.toLowerCase() !== 'websocket') {
      const message = 'Invalid Upgrade header';
      abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
      return;
    }

    if (key === undefined || !keyRegex.test(key)) {
      const message = 'Missing or invalid Sec-WebSocket-Key header';
      abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
      return;
    }

    if (version !== 13 && version !== 8) {
      const message = 'Missing or invalid Sec-WebSocket-Version header';
      abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
        'Sec-WebSocket-Version': '13, 8'
      });
      return;
    }

    if (!this.shouldHandle(req)) {
      abortHandshake(socket, 400);
      return;
    }

    const secWebSocketProtocol = req.headers['sec-websocket-protocol'];
    let protocols = new Set();

    if (secWebSocketProtocol !== undefined) {
      try {
        protocols = subprotocol.parse(secWebSocketProtocol);
      } catch (err) {
        const message = 'Invalid Sec-WebSocket-Protocol header';
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
    }

    const secWebSocketExtensions = req.headers['sec-websocket-extensions'];
    const extensions = {};

    if (
      this.options.perMessageDeflate &&
      secWebSocketExtensions !== undefined
    ) {
      const perMessageDeflate = new PerMessageDeflate(
        this.options.perMessageDeflate,
        true,
        this.options.maxPayload
      );

      try {
        const offers = extension.parse(secWebSocketExtensions);

        if (offers[PerMessageDeflate.extensionName]) {
          perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
          extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
      } catch (err) {
        const message =
          'Invalid or unacceptable Sec-WebSocket-Extensions header';
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
    }

    //
    // Optionally call external client verification handler.
    //
    if (this.options.verifyClient) {
      const info = {
        origin:
          req.headers[`${version === 8 ? 'sec-websocket-origin' : 'origin'}`],
        secure: !!(req.socket.authorized || req.socket.encrypted),
        req
      };

      if (this.options.verifyClient.length === 2) {
        this.options.verifyClient(info, (verified, code, message, headers) => {
          if (!verified) {
            return abortHandshake(socket, code || 401, message, headers);
          }

          this.completeUpgrade(
            extensions,
            key,
            protocols,
            req,
            socket,
            head,
            cb
          );
        });
        return;
      }

      if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
    }

    this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
  }

  /**
   * Upgrade the connection to WebSocket.
   *
   * @param {Object} extensions The accepted extensions
   * @param {String} key The value of the `Sec-WebSocket-Key` header
   * @param {Set} protocols The subprotocols
   * @param {http.IncomingMessage} req The request object
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Function} cb Callback
   * @throws {Error} If called more than once with the same socket
   * @private
   */
  completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
    //
    // Destroy the socket if the client has already sent a FIN packet.
    //
    if (!socket.readable || !socket.writable) return socket.destroy();

    if (socket[kWebSocket]) {
      throw new Error(
        'server.handleUpgrade() was called more than once with the same ' +
          'socket, possibly due to a misconfiguration'
      );
    }

    if (this._state > RUNNING) return abortHandshake(socket, 503);

    const digest = createHash('sha1')
      .update(key + GUID)
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${digest}`
    ];

    const ws = new this.options.WebSocket(null, undefined, this.options);

    if (protocols.size) {
      //
      // Optionally call external protocol selection handler.
      //
      const protocol = this.options.handleProtocols
        ? this.options.handleProtocols(protocols, req)
        : protocols.values().next().value;

      if (protocol) {
        headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
        ws._protocol = protocol;
      }
    }

    if (extensions[PerMessageDeflate.extensionName]) {
      const params = extensions[PerMessageDeflate.extensionName].params;
      const value = extension.format({
        [PerMessageDeflate.extensionName]: [params]
      });
      headers.push(`Sec-WebSocket-Extensions: ${value}`);
      ws._extensions = extensions;
    }

    //
    // Allow external modification/inspection of handshake headers.
    //
    this.emit('headers', headers, req);

    socket.write(headers.concat('\r\n').join('\r\n'));
    socket.removeListener('error', socketOnError);

    ws.setSocket(socket, head, {
      allowSynchronousEvents: this.options.allowSynchronousEvents,
      maxPayload: this.options.maxPayload,
      skipUTF8Validation: this.options.skipUTF8Validation
    });

    if (this.clients) {
      this.clients.add(ws);
      ws.on('close', () => {
        this.clients.delete(ws);

        if (this._shouldEmitClose && !this.clients.size) {
          process.nextTick(emitClose, this);
        }
      });
    }

    cb(ws, req);
  }
}

module.exports = WebSocketServer;

/**
 * Add event listeners on an `EventEmitter` using a map of <event, listener>
 * pairs.
 *
 * @param {EventEmitter} server The event emitter
 * @param {Object.<String, Function>} map The listeners to add
 * @return {Function} A function that will remove the added listeners when
 *     called
 * @private
 */
function addListeners(server, map) {
  for (const event of Object.keys(map)) server.on(event, map[event]);

  return function removeListeners() {
    for (const event of Object.keys(map)) {
      server.removeListener(event, map[event]);
    }
  };
}

/**
 * Emit a `'close'` event on an `EventEmitter`.
 *
 * @param {EventEmitter} server The event emitter
 * @private
 */
function emitClose(server) {
  server._state = CLOSED;
  server.emit('close');
}

/**
 * Handle socket errors.
 *
 * @private
 */
function socketOnError() {
  this.destroy();
}

/**
 * Close the connection when preconditions are not fulfilled.
 *
 * @param {Duplex} socket The socket of the upgrade request
 * @param {Number} code The HTTP response status code
 * @param {String} [message] The HTTP response body
 * @param {Object} [headers] Additional HTTP response headers
 * @private
 */
function abortHandshake(socket, code, message, headers) {
  //
  // The socket is writable unless the user destroyed or ended it before calling
  // `server.handleUpgrade()` or in the `verifyClient` function, which is a user
  // error. Handling this does not make much sense as the worst that can happen
  // is that some of the data written by the user might be discarded due to the
  // call to `socket.end()` below, which triggers an `'error'` event that in
  // turn causes the socket to be destroyed.
  //
  message = message || http.STATUS_CODES[code];
  headers = {
    Connection: 'close',
    'Content-Type': 'text/html',
    'Content-Length': Buffer.byteLength(message),
    ...headers
  };

  socket.once('finish', socket.destroy);

  socket.end(
    `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r\n` +
      Object.keys(headers)
        .map((h) => `${h}: ${headers[h]}`)
        .join('\r\n') +
      '\r\n\r\n' +
      message
  );
}

/**
 * Emit a `'wsClientError'` event on a `WebSocketServer` if there is at least
 * one listener for it, otherwise call `abortHandshake()`.
 *
 * @param {WebSocketServer} server The WebSocket server
 * @param {http.IncomingMessage} req The request object
 * @param {Duplex} socket The socket of the upgrade request
 * @param {Number} code The HTTP response status code
 * @param {String} message The HTTP response body
 * @param {Object} [headers] The HTTP response headers
 * @private
 */
function abortHandshakeOrEmitwsClientError(
  server,
  req,
  socket,
  code,
  message,
  headers
) {
  if (server.listenerCount('wsClientError')) {
    const err = new Error(message);
    Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);

    server.emit('wsClientError', err, socket, req);
  } else {
    abortHandshake(socket, code, message, headers);
  }
}


/***/ },

/***/ "./node_modules/ws/lib/websocket.js"
/*!******************************************!*\
  !*** ./node_modules/ws/lib/websocket.js ***!
  \******************************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex|Readable$", "caughtErrors": "none" }] */



const EventEmitter = __webpack_require__(/*! events */ "events");
const https = __webpack_require__(/*! https */ "https");
const http = __webpack_require__(/*! http */ "http");
const net = __webpack_require__(/*! net */ "net");
const tls = __webpack_require__(/*! tls */ "tls");
const { randomBytes, createHash } = __webpack_require__(/*! crypto */ "crypto");
const { Duplex, Readable } = __webpack_require__(/*! stream */ "stream");
const { URL } = __webpack_require__(/*! url */ "url");

const PerMessageDeflate = __webpack_require__(/*! ./permessage-deflate */ "./node_modules/ws/lib/permessage-deflate.js");
const Receiver = __webpack_require__(/*! ./receiver */ "./node_modules/ws/lib/receiver.js");
const Sender = __webpack_require__(/*! ./sender */ "./node_modules/ws/lib/sender.js");
const { isBlob } = __webpack_require__(/*! ./validation */ "./node_modules/ws/lib/validation.js");

const {
  BINARY_TYPES,
  CLOSE_TIMEOUT,
  EMPTY_BUFFER,
  GUID,
  kForOnEventAttribute,
  kListener,
  kStatusCode,
  kWebSocket,
  NOOP
} = __webpack_require__(/*! ./constants */ "./node_modules/ws/lib/constants.js");
const {
  EventTarget: { addEventListener, removeEventListener }
} = __webpack_require__(/*! ./event-target */ "./node_modules/ws/lib/event-target.js");
const { format, parse } = __webpack_require__(/*! ./extension */ "./node_modules/ws/lib/extension.js");
const { toBuffer } = __webpack_require__(/*! ./buffer-util */ "./node_modules/ws/lib/buffer-util.js");

const kAborted = Symbol('kAborted');
const protocolVersions = [8, 13];
const readyStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
const subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;

/**
 * Class representing a WebSocket.
 *
 * @extends EventEmitter
 */
class WebSocket extends EventEmitter {
  /**
   * Create a new `WebSocket`.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] Connection options
   */
  constructor(address, protocols, options) {
    super();

    this._binaryType = BINARY_TYPES[0];
    this._closeCode = 1006;
    this._closeFrameReceived = false;
    this._closeFrameSent = false;
    this._closeMessage = EMPTY_BUFFER;
    this._closeTimer = null;
    this._errorEmitted = false;
    this._extensions = {};
    this._paused = false;
    this._protocol = '';
    this._readyState = WebSocket.CONNECTING;
    this._receiver = null;
    this._sender = null;
    this._socket = null;

    if (address !== null) {
      this._bufferedAmount = 0;
      this._isServer = false;
      this._redirects = 0;

      if (protocols === undefined) {
        protocols = [];
      } else if (!Array.isArray(protocols)) {
        if (typeof protocols === 'object' && protocols !== null) {
          options = protocols;
          protocols = [];
        } else {
          protocols = [protocols];
        }
      }

      initAsClient(this, address, protocols, options);
    } else {
      this._autoPong = options.autoPong;
      this._closeTimeout = options.closeTimeout;
      this._isServer = true;
    }
  }

  /**
   * For historical reasons, the custom "nodebuffer" type is used by the default
   * instead of "blob".
   *
   * @type {String}
   */
  get binaryType() {
    return this._binaryType;
  }

  set binaryType(type) {
    if (!BINARY_TYPES.includes(type)) return;

    this._binaryType = type;

    //
    // Allow to change `binaryType` on the fly.
    //
    if (this._receiver) this._receiver._binaryType = type;
  }

  /**
   * @type {Number}
   */
  get bufferedAmount() {
    if (!this._socket) return this._bufferedAmount;

    return this._socket._writableState.length + this._sender._bufferedBytes;
  }

  /**
   * @type {String}
   */
  get extensions() {
    return Object.keys(this._extensions).join();
  }

  /**
   * @type {Boolean}
   */
  get isPaused() {
    return this._paused;
  }

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onclose() {
    return null;
  }

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onerror() {
    return null;
  }

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onopen() {
    return null;
  }

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onmessage() {
    return null;
  }

  /**
   * @type {String}
   */
  get protocol() {
    return this._protocol;
  }

  /**
   * @type {Number}
   */
  get readyState() {
    return this._readyState;
  }

  /**
   * @type {String}
   */
  get url() {
    return this._url;
  }

  /**
   * Set up the socket and the internal resources.
   *
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Object} options Options object
   * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Number} [options.maxPayload=0] The maximum allowed message size
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   * @private
   */
  setSocket(socket, head, options) {
    const receiver = new Receiver({
      allowSynchronousEvents: options.allowSynchronousEvents,
      binaryType: this.binaryType,
      extensions: this._extensions,
      isServer: this._isServer,
      maxPayload: options.maxPayload,
      skipUTF8Validation: options.skipUTF8Validation
    });

    const sender = new Sender(socket, this._extensions, options.generateMask);

    this._receiver = receiver;
    this._sender = sender;
    this._socket = socket;

    receiver[kWebSocket] = this;
    sender[kWebSocket] = this;
    socket[kWebSocket] = this;

    receiver.on('conclude', receiverOnConclude);
    receiver.on('drain', receiverOnDrain);
    receiver.on('error', receiverOnError);
    receiver.on('message', receiverOnMessage);
    receiver.on('ping', receiverOnPing);
    receiver.on('pong', receiverOnPong);

    sender.onerror = senderOnError;

    //
    // These methods may not be available if `socket` is just a `Duplex`.
    //
    if (socket.setTimeout) socket.setTimeout(0);
    if (socket.setNoDelay) socket.setNoDelay();

    if (head.length > 0) socket.unshift(head);

    socket.on('close', socketOnClose);
    socket.on('data', socketOnData);
    socket.on('end', socketOnEnd);
    socket.on('error', socketOnError);

    this._readyState = WebSocket.OPEN;
    this.emit('open');
  }

  /**
   * Emit the `'close'` event.
   *
   * @private
   */
  emitClose() {
    if (!this._socket) {
      this._readyState = WebSocket.CLOSED;
      this.emit('close', this._closeCode, this._closeMessage);
      return;
    }

    if (this._extensions[PerMessageDeflate.extensionName]) {
      this._extensions[PerMessageDeflate.extensionName].cleanup();
    }

    this._receiver.removeAllListeners();
    this._readyState = WebSocket.CLOSED;
    this.emit('close', this._closeCode, this._closeMessage);
  }

  /**
   * Start a closing handshake.
   *
   *          +----------+   +-----------+   +----------+
   *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
   *    |     +----------+   +-----------+   +----------+     |
   *          +----------+   +-----------+         |
   * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
   *          +----------+   +-----------+   |
   *    |           |                        |   +---+        |
   *                +------------------------+-->|fin| - - - -
   *    |         +---+                      |   +---+
   *     - - - - -|fin|<---------------------+
   *              +---+
   *
   * @param {Number} [code] Status code explaining why the connection is closing
   * @param {(String|Buffer)} [data] The reason why the connection is
   *     closing
   * @public
   */
  close(code, data) {
    if (this.readyState === WebSocket.CLOSED) return;
    if (this.readyState === WebSocket.CONNECTING) {
      const msg = 'WebSocket was closed before the connection was established';
      abortHandshake(this, this._req, msg);
      return;
    }

    if (this.readyState === WebSocket.CLOSING) {
      if (
        this._closeFrameSent &&
        (this._closeFrameReceived || this._receiver._writableState.errorEmitted)
      ) {
        this._socket.end();
      }

      return;
    }

    this._readyState = WebSocket.CLOSING;
    this._sender.close(code, data, !this._isServer, (err) => {
      //
      // This error is handled by the `'error'` listener on the socket. We only
      // want to know if the close frame has been sent here.
      //
      if (err) return;

      this._closeFrameSent = true;

      if (
        this._closeFrameReceived ||
        this._receiver._writableState.errorEmitted
      ) {
        this._socket.end();
      }
    });

    setCloseTimer(this);
  }

  /**
   * Pause the socket.
   *
   * @public
   */
  pause() {
    if (
      this.readyState === WebSocket.CONNECTING ||
      this.readyState === WebSocket.CLOSED
    ) {
      return;
    }

    this._paused = true;
    this._socket.pause();
  }

  /**
   * Send a ping.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the ping is sent
   * @public
   */
  ping(data, mask, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof data === 'function') {
      cb = data;
      data = mask = undefined;
    } else if (typeof mask === 'function') {
      cb = mask;
      mask = undefined;
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }

    if (mask === undefined) mask = !this._isServer;
    this._sender.ping(data || EMPTY_BUFFER, mask, cb);
  }

  /**
   * Send a pong.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the pong is sent
   * @public
   */
  pong(data, mask, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof data === 'function') {
      cb = data;
      data = mask = undefined;
    } else if (typeof mask === 'function') {
      cb = mask;
      mask = undefined;
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }

    if (mask === undefined) mask = !this._isServer;
    this._sender.pong(data || EMPTY_BUFFER, mask, cb);
  }

  /**
   * Resume the socket.
   *
   * @public
   */
  resume() {
    if (
      this.readyState === WebSocket.CONNECTING ||
      this.readyState === WebSocket.CLOSED
    ) {
      return;
    }

    this._paused = false;
    if (!this._receiver._writableState.needDrain) this._socket.resume();
  }

  /**
   * Send a data message.
   *
   * @param {*} data The message to send
   * @param {Object} [options] Options object
   * @param {Boolean} [options.binary] Specifies whether `data` is binary or
   *     text
   * @param {Boolean} [options.compress] Specifies whether or not to compress
   *     `data`
   * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when data is written out
   * @public
   */
  send(data, options, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }

    const opts = {
      binary: typeof data !== 'string',
      mask: !this._isServer,
      compress: true,
      fin: true,
      ...options
    };

    if (!this._extensions[PerMessageDeflate.extensionName]) {
      opts.compress = false;
    }

    this._sender.send(data || EMPTY_BUFFER, opts, cb);
  }

  /**
   * Forcibly close the connection.
   *
   * @public
   */
  terminate() {
    if (this.readyState === WebSocket.CLOSED) return;
    if (this.readyState === WebSocket.CONNECTING) {
      const msg = 'WebSocket was closed before the connection was established';
      abortHandshake(this, this._req, msg);
      return;
    }

    if (this._socket) {
      this._readyState = WebSocket.CLOSING;
      this._socket.destroy();
    }
  }
}

/**
 * @constant {Number} CONNECTING
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CONNECTING', {
  enumerable: true,
  value: readyStates.indexOf('CONNECTING')
});

/**
 * @constant {Number} CONNECTING
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CONNECTING', {
  enumerable: true,
  value: readyStates.indexOf('CONNECTING')
});

/**
 * @constant {Number} OPEN
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'OPEN', {
  enumerable: true,
  value: readyStates.indexOf('OPEN')
});

/**
 * @constant {Number} OPEN
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'OPEN', {
  enumerable: true,
  value: readyStates.indexOf('OPEN')
});

/**
 * @constant {Number} CLOSING
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CLOSING', {
  enumerable: true,
  value: readyStates.indexOf('CLOSING')
});

/**
 * @constant {Number} CLOSING
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CLOSING', {
  enumerable: true,
  value: readyStates.indexOf('CLOSING')
});

/**
 * @constant {Number} CLOSED
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CLOSED', {
  enumerable: true,
  value: readyStates.indexOf('CLOSED')
});

/**
 * @constant {Number} CLOSED
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CLOSED', {
  enumerable: true,
  value: readyStates.indexOf('CLOSED')
});

[
  'binaryType',
  'bufferedAmount',
  'extensions',
  'isPaused',
  'protocol',
  'readyState',
  'url'
].forEach((property) => {
  Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
});

//
// Add the `onopen`, `onerror`, `onclose`, and `onmessage` attributes.
// See https://html.spec.whatwg.org/multipage/comms.html#the-websocket-interface
//
['open', 'error', 'close', 'message'].forEach((method) => {
  Object.defineProperty(WebSocket.prototype, `on${method}`, {
    enumerable: true,
    get() {
      for (const listener of this.listeners(method)) {
        if (listener[kForOnEventAttribute]) return listener[kListener];
      }

      return null;
    },
    set(handler) {
      for (const listener of this.listeners(method)) {
        if (listener[kForOnEventAttribute]) {
          this.removeListener(method, listener);
          break;
        }
      }

      if (typeof handler !== 'function') return;

      this.addEventListener(method, handler, {
        [kForOnEventAttribute]: true
      });
    }
  });
});

WebSocket.prototype.addEventListener = addEventListener;
WebSocket.prototype.removeEventListener = removeEventListener;

module.exports = WebSocket;

/**
 * Initialize a WebSocket client.
 *
 * @param {WebSocket} websocket The client to initialize
 * @param {(String|URL)} address The URL to which to connect
 * @param {Array} protocols The subprotocols
 * @param {Object} [options] Connection options
 * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether any
 *     of the `'message'`, `'ping'`, and `'pong'` events can be emitted multiple
 *     times in the same tick
 * @param {Boolean} [options.autoPong=true] Specifies whether or not to
 *     automatically send a pong in response to a ping
 * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to wait
 *     for the closing handshake to finish after `websocket.close()` is called
 * @param {Function} [options.finishRequest] A function which can be used to
 *     customize the headers of each http request before it is sent
 * @param {Boolean} [options.followRedirects=false] Whether or not to follow
 *     redirects
 * @param {Function} [options.generateMask] The function used to generate the
 *     masking key
 * @param {Number} [options.handshakeTimeout] Timeout in milliseconds for the
 *     handshake request
 * @param {Number} [options.maxPayload=104857600] The maximum allowed message
 *     size
 * @param {Number} [options.maxRedirects=10] The maximum number of redirects
 *     allowed
 * @param {String} [options.origin] Value of the `Origin` or
 *     `Sec-WebSocket-Origin` header
 * @param {(Boolean|Object)} [options.perMessageDeflate=true] Enable/disable
 *     permessage-deflate
 * @param {Number} [options.protocolVersion=13] Value of the
 *     `Sec-WebSocket-Version` header
 * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
 *     not to skip UTF-8 validation for text and close messages
 * @private
 */
function initAsClient(websocket, address, protocols, options) {
  const opts = {
    allowSynchronousEvents: true,
    autoPong: true,
    closeTimeout: CLOSE_TIMEOUT,
    protocolVersion: protocolVersions[1],
    maxPayload: 100 * 1024 * 1024,
    skipUTF8Validation: false,
    perMessageDeflate: true,
    followRedirects: false,
    maxRedirects: 10,
    ...options,
    socketPath: undefined,
    hostname: undefined,
    protocol: undefined,
    timeout: undefined,
    method: 'GET',
    host: undefined,
    path: undefined,
    port: undefined
  };

  websocket._autoPong = opts.autoPong;
  websocket._closeTimeout = opts.closeTimeout;

  if (!protocolVersions.includes(opts.protocolVersion)) {
    throw new RangeError(
      `Unsupported protocol version: ${opts.protocolVersion} ` +
        `(supported versions: ${protocolVersions.join(', ')})`
    );
  }

  let parsedUrl;

  if (address instanceof URL) {
    parsedUrl = address;
  } else {
    try {
      parsedUrl = new URL(address);
    } catch (e) {
      throw new SyntaxError(`Invalid URL: ${address}`);
    }
  }

  if (parsedUrl.protocol === 'http:') {
    parsedUrl.protocol = 'ws:';
  } else if (parsedUrl.protocol === 'https:') {
    parsedUrl.protocol = 'wss:';
  }

  websocket._url = parsedUrl.href;

  const isSecure = parsedUrl.protocol === 'wss:';
  const isIpcUrl = parsedUrl.protocol === 'ws+unix:';
  let invalidUrlMessage;

  if (parsedUrl.protocol !== 'ws:' && !isSecure && !isIpcUrl) {
    invalidUrlMessage =
      'The URL\'s protocol must be one of "ws:", "wss:", ' +
      '"http:", "https:", or "ws+unix:"';
  } else if (isIpcUrl && !parsedUrl.pathname) {
    invalidUrlMessage = "The URL's pathname is empty";
  } else if (parsedUrl.hash) {
    invalidUrlMessage = 'The URL contains a fragment identifier';
  }

  if (invalidUrlMessage) {
    const err = new SyntaxError(invalidUrlMessage);

    if (websocket._redirects === 0) {
      throw err;
    } else {
      emitErrorAndClose(websocket, err);
      return;
    }
  }

  const defaultPort = isSecure ? 443 : 80;
  const key = randomBytes(16).toString('base64');
  const request = isSecure ? https.request : http.request;
  const protocolSet = new Set();
  let perMessageDeflate;

  opts.createConnection =
    opts.createConnection || (isSecure ? tlsConnect : netConnect);
  opts.defaultPort = opts.defaultPort || defaultPort;
  opts.port = parsedUrl.port || defaultPort;
  opts.host = parsedUrl.hostname.startsWith('[')
    ? parsedUrl.hostname.slice(1, -1)
    : parsedUrl.hostname;
  opts.headers = {
    ...opts.headers,
    'Sec-WebSocket-Version': opts.protocolVersion,
    'Sec-WebSocket-Key': key,
    Connection: 'Upgrade',
    Upgrade: 'websocket'
  };
  opts.path = parsedUrl.pathname + parsedUrl.search;
  opts.timeout = opts.handshakeTimeout;

  if (opts.perMessageDeflate) {
    perMessageDeflate = new PerMessageDeflate(
      opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
      false,
      opts.maxPayload
    );
    opts.headers['Sec-WebSocket-Extensions'] = format({
      [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
    });
  }
  if (protocols.length) {
    for (const protocol of protocols) {
      if (
        typeof protocol !== 'string' ||
        !subprotocolRegex.test(protocol) ||
        protocolSet.has(protocol)
      ) {
        throw new SyntaxError(
          'An invalid or duplicated subprotocol was specified'
        );
      }

      protocolSet.add(protocol);
    }

    opts.headers['Sec-WebSocket-Protocol'] = protocols.join(',');
  }
  if (opts.origin) {
    if (opts.protocolVersion < 13) {
      opts.headers['Sec-WebSocket-Origin'] = opts.origin;
    } else {
      opts.headers.Origin = opts.origin;
    }
  }
  if (parsedUrl.username || parsedUrl.password) {
    opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
  }

  if (isIpcUrl) {
    const parts = opts.path.split(':');

    opts.socketPath = parts[0];
    opts.path = parts[1];
  }

  let req;

  if (opts.followRedirects) {
    if (websocket._redirects === 0) {
      websocket._originalIpc = isIpcUrl;
      websocket._originalSecure = isSecure;
      websocket._originalHostOrSocketPath = isIpcUrl
        ? opts.socketPath
        : parsedUrl.host;

      const headers = options && options.headers;

      //
      // Shallow copy the user provided options so that headers can be changed
      // without mutating the original object.
      //
      options = { ...options, headers: {} };

      if (headers) {
        for (const [key, value] of Object.entries(headers)) {
          options.headers[key.toLowerCase()] = value;
        }
      }
    } else if (websocket.listenerCount('redirect') === 0) {
      const isSameHost = isIpcUrl
        ? websocket._originalIpc
          ? opts.socketPath === websocket._originalHostOrSocketPath
          : false
        : websocket._originalIpc
          ? false
          : parsedUrl.host === websocket._originalHostOrSocketPath;

      if (!isSameHost || (websocket._originalSecure && !isSecure)) {
        //
        // Match curl 7.77.0 behavior and drop the following headers. These
        // headers are also dropped when following a redirect to a subdomain.
        //
        delete opts.headers.authorization;
        delete opts.headers.cookie;

        if (!isSameHost) delete opts.headers.host;

        opts.auth = undefined;
      }
    }

    //
    // Match curl 7.77.0 behavior and make the first `Authorization` header win.
    // If the `Authorization` header is set, then there is nothing to do as it
    // will take precedence.
    //
    if (opts.auth && !options.headers.authorization) {
      options.headers.authorization =
        'Basic ' + Buffer.from(opts.auth).toString('base64');
    }

    req = websocket._req = request(opts);

    if (websocket._redirects) {
      //
      // Unlike what is done for the `'upgrade'` event, no early exit is
      // triggered here if the user calls `websocket.close()` or
      // `websocket.terminate()` from a listener of the `'redirect'` event. This
      // is because the user can also call `request.destroy()` with an error
      // before calling `websocket.close()` or `websocket.terminate()` and this
      // would result in an error being emitted on the `request` object with no
      // `'error'` event listeners attached.
      //
      websocket.emit('redirect', websocket.url, req);
    }
  } else {
    req = websocket._req = request(opts);
  }

  if (opts.timeout) {
    req.on('timeout', () => {
      abortHandshake(websocket, req, 'Opening handshake has timed out');
    });
  }

  req.on('error', (err) => {
    if (req === null || req[kAborted]) return;

    req = websocket._req = null;
    emitErrorAndClose(websocket, err);
  });

  req.on('response', (res) => {
    const location = res.headers.location;
    const statusCode = res.statusCode;

    if (
      location &&
      opts.followRedirects &&
      statusCode >= 300 &&
      statusCode < 400
    ) {
      if (++websocket._redirects > opts.maxRedirects) {
        abortHandshake(websocket, req, 'Maximum redirects exceeded');
        return;
      }

      req.abort();

      let addr;

      try {
        addr = new URL(location, address);
      } catch (e) {
        const err = new SyntaxError(`Invalid URL: ${location}`);
        emitErrorAndClose(websocket, err);
        return;
      }

      initAsClient(websocket, addr, protocols, options);
    } else if (!websocket.emit('unexpected-response', req, res)) {
      abortHandshake(
        websocket,
        req,
        `Unexpected server response: ${res.statusCode}`
      );
    }
  });

  req.on('upgrade', (res, socket, head) => {
    websocket.emit('upgrade', res);

    //
    // The user may have closed the connection from a listener of the
    // `'upgrade'` event.
    //
    if (websocket.readyState !== WebSocket.CONNECTING) return;

    req = websocket._req = null;

    const upgrade = res.headers.upgrade;

    if (upgrade === undefined || upgrade.toLowerCase() !== 'websocket') {
      abortHandshake(websocket, socket, 'Invalid Upgrade header');
      return;
    }

    const digest = createHash('sha1')
      .update(key + GUID)
      .digest('base64');

    if (res.headers['sec-websocket-accept'] !== digest) {
      abortHandshake(websocket, socket, 'Invalid Sec-WebSocket-Accept header');
      return;
    }

    const serverProt = res.headers['sec-websocket-protocol'];
    let protError;

    if (serverProt !== undefined) {
      if (!protocolSet.size) {
        protError = 'Server sent a subprotocol but none was requested';
      } else if (!protocolSet.has(serverProt)) {
        protError = 'Server sent an invalid subprotocol';
      }
    } else if (protocolSet.size) {
      protError = 'Server sent no subprotocol';
    }

    if (protError) {
      abortHandshake(websocket, socket, protError);
      return;
    }

    if (serverProt) websocket._protocol = serverProt;

    const secWebSocketExtensions = res.headers['sec-websocket-extensions'];

    if (secWebSocketExtensions !== undefined) {
      if (!perMessageDeflate) {
        const message =
          'Server sent a Sec-WebSocket-Extensions header but no extension ' +
          'was requested';
        abortHandshake(websocket, socket, message);
        return;
      }

      let extensions;

      try {
        extensions = parse(secWebSocketExtensions);
      } catch (err) {
        const message = 'Invalid Sec-WebSocket-Extensions header';
        abortHandshake(websocket, socket, message);
        return;
      }

      const extensionNames = Object.keys(extensions);

      if (
        extensionNames.length !== 1 ||
        extensionNames[0] !== PerMessageDeflate.extensionName
      ) {
        const message = 'Server indicated an extension that was not requested';
        abortHandshake(websocket, socket, message);
        return;
      }

      try {
        perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
      } catch (err) {
        const message = 'Invalid Sec-WebSocket-Extensions header';
        abortHandshake(websocket, socket, message);
        return;
      }

      websocket._extensions[PerMessageDeflate.extensionName] =
        perMessageDeflate;
    }

    websocket.setSocket(socket, head, {
      allowSynchronousEvents: opts.allowSynchronousEvents,
      generateMask: opts.generateMask,
      maxPayload: opts.maxPayload,
      skipUTF8Validation: opts.skipUTF8Validation
    });
  });

  if (opts.finishRequest) {
    opts.finishRequest(req, websocket);
  } else {
    req.end();
  }
}

/**
 * Emit the `'error'` and `'close'` events.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {Error} The error to emit
 * @private
 */
function emitErrorAndClose(websocket, err) {
  websocket._readyState = WebSocket.CLOSING;
  //
  // The following assignment is practically useless and is done only for
  // consistency.
  //
  websocket._errorEmitted = true;
  websocket.emit('error', err);
  websocket.emitClose();
}

/**
 * Create a `net.Socket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {net.Socket} The newly created socket used to start the connection
 * @private
 */
function netConnect(options) {
  options.path = options.socketPath;
  return net.connect(options);
}

/**
 * Create a `tls.TLSSocket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {tls.TLSSocket} The newly created socket used to start the connection
 * @private
 */
function tlsConnect(options) {
  options.path = undefined;

  if (!options.servername && options.servername !== '') {
    options.servername = net.isIP(options.host) ? '' : options.host;
  }

  return tls.connect(options);
}

/**
 * Abort the handshake and emit an error.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {(http.ClientRequest|net.Socket|tls.Socket)} stream The request to
 *     abort or the socket to destroy
 * @param {String} message The error message
 * @private
 */
function abortHandshake(websocket, stream, message) {
  websocket._readyState = WebSocket.CLOSING;

  const err = new Error(message);
  Error.captureStackTrace(err, abortHandshake);

  if (stream.setHeader) {
    stream[kAborted] = true;
    stream.abort();

    if (stream.socket && !stream.socket.destroyed) {
      //
      // On Node.js >= 14.3.0 `request.abort()` does not destroy the socket if
      // called after the request completed. See
      // https://github.com/websockets/ws/issues/1869.
      //
      stream.socket.destroy();
    }

    process.nextTick(emitErrorAndClose, websocket, err);
  } else {
    stream.destroy(err);
    stream.once('error', websocket.emit.bind(websocket, 'error'));
    stream.once('close', websocket.emitClose.bind(websocket));
  }
}

/**
 * Handle cases where the `ping()`, `pong()`, or `send()` methods are called
 * when the `readyState` attribute is `CLOSING` or `CLOSED`.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {*} [data] The data to send
 * @param {Function} [cb] Callback
 * @private
 */
function sendAfterClose(websocket, data, cb) {
  if (data) {
    const length = isBlob(data) ? data.size : toBuffer(data).length;

    //
    // The `_bufferedAmount` property is used only when the peer is a client and
    // the opening handshake fails. Under these circumstances, in fact, the
    // `setSocket()` method is not called, so the `_socket` and `_sender`
    // properties are set to `null`.
    //
    if (websocket._socket) websocket._sender._bufferedBytes += length;
    else websocket._bufferedAmount += length;
  }

  if (cb) {
    const err = new Error(
      `WebSocket is not open: readyState ${websocket.readyState} ` +
        `(${readyStates[websocket.readyState]})`
    );
    process.nextTick(cb, err);
  }
}

/**
 * The listener of the `Receiver` `'conclude'` event.
 *
 * @param {Number} code The status code
 * @param {Buffer} reason The reason for closing
 * @private
 */
function receiverOnConclude(code, reason) {
  const websocket = this[kWebSocket];

  websocket._closeFrameReceived = true;
  websocket._closeMessage = reason;
  websocket._closeCode = code;

  if (websocket._socket[kWebSocket] === undefined) return;

  websocket._socket.removeListener('data', socketOnData);
  process.nextTick(resume, websocket._socket);

  if (code === 1005) websocket.close();
  else websocket.close(code, reason);
}

/**
 * The listener of the `Receiver` `'drain'` event.
 *
 * @private
 */
function receiverOnDrain() {
  const websocket = this[kWebSocket];

  if (!websocket.isPaused) websocket._socket.resume();
}

/**
 * The listener of the `Receiver` `'error'` event.
 *
 * @param {(RangeError|Error)} err The emitted error
 * @private
 */
function receiverOnError(err) {
  const websocket = this[kWebSocket];

  if (websocket._socket[kWebSocket] !== undefined) {
    websocket._socket.removeListener('data', socketOnData);

    //
    // On Node.js < 14.0.0 the `'error'` event is emitted synchronously. See
    // https://github.com/websockets/ws/issues/1940.
    //
    process.nextTick(resume, websocket._socket);

    websocket.close(err[kStatusCode]);
  }

  if (!websocket._errorEmitted) {
    websocket._errorEmitted = true;
    websocket.emit('error', err);
  }
}

/**
 * The listener of the `Receiver` `'finish'` event.
 *
 * @private
 */
function receiverOnFinish() {
  this[kWebSocket].emitClose();
}

/**
 * The listener of the `Receiver` `'message'` event.
 *
 * @param {Buffer|ArrayBuffer|Buffer[])} data The message
 * @param {Boolean} isBinary Specifies whether the message is binary or not
 * @private
 */
function receiverOnMessage(data, isBinary) {
  this[kWebSocket].emit('message', data, isBinary);
}

/**
 * The listener of the `Receiver` `'ping'` event.
 *
 * @param {Buffer} data The data included in the ping frame
 * @private
 */
function receiverOnPing(data) {
  const websocket = this[kWebSocket];

  if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
  websocket.emit('ping', data);
}

/**
 * The listener of the `Receiver` `'pong'` event.
 *
 * @param {Buffer} data The data included in the pong frame
 * @private
 */
function receiverOnPong(data) {
  this[kWebSocket].emit('pong', data);
}

/**
 * Resume a readable stream
 *
 * @param {Readable} stream The readable stream
 * @private
 */
function resume(stream) {
  stream.resume();
}

/**
 * The `Sender` error event handler.
 *
 * @param {Error} The error
 * @private
 */
function senderOnError(err) {
  const websocket = this[kWebSocket];

  if (websocket.readyState === WebSocket.CLOSED) return;
  if (websocket.readyState === WebSocket.OPEN) {
    websocket._readyState = WebSocket.CLOSING;
    setCloseTimer(websocket);
  }

  //
  // `socket.end()` is used instead of `socket.destroy()` to allow the other
  // peer to finish sending queued data. There is no need to set a timer here
  // because `CLOSING` means that it is already set or not needed.
  //
  this._socket.end();

  if (!websocket._errorEmitted) {
    websocket._errorEmitted = true;
    websocket.emit('error', err);
  }
}

/**
 * Set a timer to destroy the underlying raw socket of a WebSocket.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @private
 */
function setCloseTimer(websocket) {
  websocket._closeTimer = setTimeout(
    websocket._socket.destroy.bind(websocket._socket),
    websocket._closeTimeout
  );
}

/**
 * The listener of the socket `'close'` event.
 *
 * @private
 */
function socketOnClose() {
  const websocket = this[kWebSocket];

  this.removeListener('close', socketOnClose);
  this.removeListener('data', socketOnData);
  this.removeListener('end', socketOnEnd);

  websocket._readyState = WebSocket.CLOSING;

  //
  // The close frame might not have been received or the `'end'` event emitted,
  // for example, if the socket was destroyed due to an error. Ensure that the
  // `receiver` stream is closed after writing any remaining buffered data to
  // it. If the readable side of the socket is in flowing mode then there is no
  // buffered data as everything has been already written. If instead, the
  // socket is paused, any possible buffered data will be read as a single
  // chunk.
  //
  if (
    !this._readableState.endEmitted &&
    !websocket._closeFrameReceived &&
    !websocket._receiver._writableState.errorEmitted &&
    this._readableState.length !== 0
  ) {
    const chunk = this.read(this._readableState.length);

    websocket._receiver.write(chunk);
  }

  websocket._receiver.end();

  this[kWebSocket] = undefined;

  clearTimeout(websocket._closeTimer);

  if (
    websocket._receiver._writableState.finished ||
    websocket._receiver._writableState.errorEmitted
  ) {
    websocket.emitClose();
  } else {
    websocket._receiver.on('error', receiverOnFinish);
    websocket._receiver.on('finish', receiverOnFinish);
  }
}

/**
 * The listener of the socket `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function socketOnData(chunk) {
  if (!this[kWebSocket]._receiver.write(chunk)) {
    this.pause();
  }
}

/**
 * The listener of the socket `'end'` event.
 *
 * @private
 */
function socketOnEnd() {
  const websocket = this[kWebSocket];

  websocket._readyState = WebSocket.CLOSING;
  websocket._receiver.end();
  this.end();
}

/**
 * The listener of the socket `'error'` event.
 *
 * @private
 */
function socketOnError() {
  const websocket = this[kWebSocket];

  this.removeListener('error', socketOnError);
  this.on('error', NOOP);

  if (websocket) {
    websocket._readyState = WebSocket.CLOSING;
    this.destroy();
  }
}


/***/ },

/***/ "./packages/stt-providers/src sync recursive"
/*!******************************************!*\
  !*** ./packages/stt-providers/src/ sync ***!
  \******************************************/
(module) {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = "./packages/stt-providers/src sync recursive";
module.exports = webpackEmptyContext;

/***/ },

/***/ "electron"
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
(module) {

"use strict";
module.exports = require("electron");

/***/ },

/***/ "groq-sdk"
/*!***************************!*\
  !*** external "groq-sdk" ***!
  \***************************/
(module) {

"use strict";
module.exports = require("groq-sdk");

/***/ },

/***/ "buffer"
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
(module) {

"use strict";
module.exports = require("buffer");

/***/ },

/***/ "child_process"
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
(module) {

"use strict";
module.exports = require("child_process");

/***/ },

/***/ "crypto"
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
(module) {

"use strict";
module.exports = require("crypto");

/***/ },

/***/ "events"
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
(module) {

"use strict";
module.exports = require("events");

/***/ },

/***/ "fs"
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
(module) {

"use strict";
module.exports = require("fs");

/***/ },

/***/ "http"
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
(module) {

"use strict";
module.exports = require("http");

/***/ },

/***/ "https"
/*!************************!*\
  !*** external "https" ***!
  \************************/
(module) {

"use strict";
module.exports = require("https");

/***/ },

/***/ "net"
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
(module) {

"use strict";
module.exports = require("net");

/***/ },

/***/ "node:buffer"
/*!******************************!*\
  !*** external "node:buffer" ***!
  \******************************/
(module) {

"use strict";
module.exports = require("node:buffer");

/***/ },

/***/ "path"
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
(module) {

"use strict";
module.exports = require("path");

/***/ },

/***/ "stream"
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
(module) {

"use strict";
module.exports = require("stream");

/***/ },

/***/ "tls"
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
(module) {

"use strict";
module.exports = require("tls");

/***/ },

/***/ "url"
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
(module) {

"use strict";
module.exports = require("url");

/***/ },

/***/ "zlib"
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
(module) {

"use strict";
module.exports = require("zlib");

/***/ },

/***/ "./node_modules/fuse.js/dist/fuse.cjs"
/*!********************************************!*\
  !*** ./node_modules/fuse.js/dist/fuse.cjs ***!
  \********************************************/
(module) {

"use strict";
/**
 * Fuse.js v7.1.0 - Lightweight fuzzy-search (http://fusejs.io)
 *
 * Copyright (c) 2025 Kiro Risk (http://kiro.me)
 * All Rights Reserved. Apache Software License 2.0
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */



function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }
  return target;
}
function _typeof(obj) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, _typeof(obj);
}
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  Object.defineProperty(subClass, "prototype", {
    writable: false
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}
function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}
function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };
  return _setPrototypeOf(o, p);
}
function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;
  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}
function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return self;
}
function _possibleConstructorReturn(self, call) {
  if (call && (typeof call === "object" || typeof call === "function")) {
    return call;
  } else if (call !== void 0) {
    throw new TypeError("Derived constructors may only return object or undefined");
  }
  return _assertThisInitialized(self);
}
function _createSuper(Derived) {
  var hasNativeReflectConstruct = _isNativeReflectConstruct();
  return function _createSuperInternal() {
    var Super = _getPrototypeOf(Derived),
      result;
    if (hasNativeReflectConstruct) {
      var NewTarget = _getPrototypeOf(this).constructor;
      result = Reflect.construct(Super, arguments, NewTarget);
    } else {
      result = Super.apply(this, arguments);
    }
    return _possibleConstructorReturn(this, result);
  };
}
function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _toPrimitive(input, hint) {
  if (typeof input !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return typeof key === "symbol" ? key : String(key);
}

function isArray(value) {
  return !Array.isArray ? getTag(value) === '[object Array]' : Array.isArray(value);
}

// Adapted from: https://github.com/lodash/lodash/blob/master/.internal/baseToString.js
var INFINITY = 1 / 0;
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  var result = value + '';
  return result == '0' && 1 / value == -INFINITY ? '-0' : result;
}
function toString(value) {
  return value == null ? '' : baseToString(value);
}
function isString(value) {
  return typeof value === 'string';
}
function isNumber(value) {
  return typeof value === 'number';
}

// Adapted from: https://github.com/lodash/lodash/blob/master/isBoolean.js
function isBoolean(value) {
  return value === true || value === false || isObjectLike(value) && getTag(value) == '[object Boolean]';
}
function isObject(value) {
  return _typeof(value) === 'object';
}

// Checks if `value` is object-like.
function isObjectLike(value) {
  return isObject(value) && value !== null;
}
function isDefined(value) {
  return value !== undefined && value !== null;
}
function isBlank(value) {
  return !value.trim().length;
}

// Gets the `toStringTag` of `value`.
// Adapted from: https://github.com/lodash/lodash/blob/master/.internal/getTag.js
function getTag(value) {
  return value == null ? value === undefined ? '[object Undefined]' : '[object Null]' : Object.prototype.toString.call(value);
}

var EXTENDED_SEARCH_UNAVAILABLE = 'Extended search is not available';
var INCORRECT_INDEX_TYPE = "Incorrect 'index' type";
var LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = function LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key) {
  return "Invalid value for key ".concat(key);
};
var PATTERN_LENGTH_TOO_LARGE = function PATTERN_LENGTH_TOO_LARGE(max) {
  return "Pattern length exceeds max of ".concat(max, ".");
};
var MISSING_KEY_PROPERTY = function MISSING_KEY_PROPERTY(name) {
  return "Missing ".concat(name, " property in key");
};
var INVALID_KEY_WEIGHT_VALUE = function INVALID_KEY_WEIGHT_VALUE(key) {
  return "Property 'weight' in key '".concat(key, "' must be a positive integer");
};

var hasOwn = Object.prototype.hasOwnProperty;
var KeyStore = /*#__PURE__*/function () {
  function KeyStore(keys) {
    var _this = this;
    _classCallCheck(this, KeyStore);
    this._keys = [];
    this._keyMap = {};
    var totalWeight = 0;
    keys.forEach(function (key) {
      var obj = createKey(key);
      _this._keys.push(obj);
      _this._keyMap[obj.id] = obj;
      totalWeight += obj.weight;
    });

    // Normalize weights so that their sum is equal to 1
    this._keys.forEach(function (key) {
      key.weight /= totalWeight;
    });
  }
  _createClass(KeyStore, [{
    key: "get",
    value: function get(keyId) {
      return this._keyMap[keyId];
    }
  }, {
    key: "keys",
    value: function keys() {
      return this._keys;
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      return JSON.stringify(this._keys);
    }
  }]);
  return KeyStore;
}();
function createKey(key) {
  var path = null;
  var id = null;
  var src = null;
  var weight = 1;
  var getFn = null;
  if (isString(key) || isArray(key)) {
    src = key;
    path = createKeyPath(key);
    id = createKeyId(key);
  } else {
    if (!hasOwn.call(key, 'name')) {
      throw new Error(MISSING_KEY_PROPERTY('name'));
    }
    var name = key.name;
    src = name;
    if (hasOwn.call(key, 'weight')) {
      weight = key.weight;
      if (weight <= 0) {
        throw new Error(INVALID_KEY_WEIGHT_VALUE(name));
      }
    }
    path = createKeyPath(name);
    id = createKeyId(name);
    getFn = key.getFn;
  }
  return {
    path: path,
    id: id,
    weight: weight,
    src: src,
    getFn: getFn
  };
}
function createKeyPath(key) {
  return isArray(key) ? key : key.split('.');
}
function createKeyId(key) {
  return isArray(key) ? key.join('.') : key;
}

function get(obj, path) {
  var list = [];
  var arr = false;
  var deepGet = function deepGet(obj, path, index) {
    if (!isDefined(obj)) {
      return;
    }
    if (!path[index]) {
      // If there's no path left, we've arrived at the object we care about.
      list.push(obj);
    } else {
      var key = path[index];
      var value = obj[key];
      if (!isDefined(value)) {
        return;
      }

      // If we're at the last value in the path, and if it's a string/number/bool,
      // add it to the list
      if (index === path.length - 1 && (isString(value) || isNumber(value) || isBoolean(value))) {
        list.push(toString(value));
      } else if (isArray(value)) {
        arr = true;
        // Search each item in the array.
        for (var i = 0, len = value.length; i < len; i += 1) {
          deepGet(value[i], path, index + 1);
        }
      } else if (path.length) {
        // An object. Recurse further.
        deepGet(value, path, index + 1);
      }
    }
  };

  // Backwards compatibility (since path used to be a string)
  deepGet(obj, isString(path) ? path.split('.') : path, 0);
  return arr ? list : list[0];
}

var MatchOptions = {
  // Whether the matches should be included in the result set. When `true`, each record in the result
  // set will include the indices of the matched characters.
  // These can consequently be used for highlighting purposes.
  includeMatches: false,
  // When `true`, the matching function will continue to the end of a search pattern even if
  // a perfect match has already been located in the string.
  findAllMatches: false,
  // Minimum number of characters that must be matched before a result is considered a match
  minMatchCharLength: 1
};
var BasicOptions = {
  // When `true`, the algorithm continues searching to the end of the input even if a perfect
  // match is found before the end of the same input.
  isCaseSensitive: false,
  // When `true`, the algorithm will ignore diacritics (accents) in comparisons
  ignoreDiacritics: false,
  // When true, the matching function will continue to the end of a search pattern even if
  includeScore: false,
  // List of properties that will be searched. This also supports nested properties.
  keys: [],
  // Whether to sort the result list, by score
  shouldSort: true,
  // Default sort function: sort by ascending score, ascending index
  sortFn: function sortFn(a, b) {
    return a.score === b.score ? a.idx < b.idx ? -1 : 1 : a.score < b.score ? -1 : 1;
  }
};
var FuzzyOptions = {
  // Approximately where in the text is the pattern expected to be found?
  location: 0,
  // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
  // (of both letters and location), a threshold of '1.0' would match anything.
  threshold: 0.6,
  // Determines how close the match must be to the fuzzy location (specified above).
  // An exact letter match which is 'distance' characters away from the fuzzy location
  // would score as a complete mismatch. A distance of '0' requires the match be at
  // the exact location specified, a threshold of '1000' would require a perfect match
  // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
  distance: 100
};
var AdvancedOptions = {
  // When `true`, it enables the use of unix-like search commands
  useExtendedSearch: false,
  // The get function to use when fetching an object's properties.
  // The default will search nested paths *ie foo.bar.baz*
  getFn: get,
  // When `true`, search will ignore `location` and `distance`, so it won't matter
  // where in the string the pattern appears.
  // More info: https://fusejs.io/concepts/scoring-theory.html#fuzziness-score
  ignoreLocation: false,
  // When `true`, the calculation for the relevance score (used for sorting) will
  // ignore the field-length norm.
  // More info: https://fusejs.io/concepts/scoring-theory.html#field-length-norm
  ignoreFieldNorm: false,
  // The weight to determine how much field length norm effects scoring.
  fieldNormWeight: 1
};
var Config = _objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({}, BasicOptions), MatchOptions), FuzzyOptions), AdvancedOptions);

var SPACE = /[^ ]+/g;

// Field-length norm: the shorter the field, the higher the weight.
// Set to 3 decimals to reduce index size.
function norm() {
  var weight = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var mantissa = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3;
  var cache = new Map();
  var m = Math.pow(10, mantissa);
  return {
    get: function get(value) {
      var numTokens = value.match(SPACE).length;
      if (cache.has(numTokens)) {
        return cache.get(numTokens);
      }

      // Default function is 1/sqrt(x), weight makes that variable
      var norm = 1 / Math.pow(numTokens, 0.5 * weight);

      // In place of `toFixed(mantissa)`, for faster computation
      var n = parseFloat(Math.round(norm * m) / m);
      cache.set(numTokens, n);
      return n;
    },
    clear: function clear() {
      cache.clear();
    }
  };
}

var FuseIndex = /*#__PURE__*/function () {
  function FuseIndex() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$getFn = _ref.getFn,
      getFn = _ref$getFn === void 0 ? Config.getFn : _ref$getFn,
      _ref$fieldNormWeight = _ref.fieldNormWeight,
      fieldNormWeight = _ref$fieldNormWeight === void 0 ? Config.fieldNormWeight : _ref$fieldNormWeight;
    _classCallCheck(this, FuseIndex);
    this.norm = norm(fieldNormWeight, 3);
    this.getFn = getFn;
    this.isCreated = false;
    this.setIndexRecords();
  }
  _createClass(FuseIndex, [{
    key: "setSources",
    value: function setSources() {
      var docs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      this.docs = docs;
    }
  }, {
    key: "setIndexRecords",
    value: function setIndexRecords() {
      var records = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      this.records = records;
    }
  }, {
    key: "setKeys",
    value: function setKeys() {
      var _this = this;
      var keys = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      this.keys = keys;
      this._keysMap = {};
      keys.forEach(function (key, idx) {
        _this._keysMap[key.id] = idx;
      });
    }
  }, {
    key: "create",
    value: function create() {
      var _this2 = this;
      if (this.isCreated || !this.docs.length) {
        return;
      }
      this.isCreated = true;

      // List is Array<String>
      if (isString(this.docs[0])) {
        this.docs.forEach(function (doc, docIndex) {
          _this2._addString(doc, docIndex);
        });
      } else {
        // List is Array<Object>
        this.docs.forEach(function (doc, docIndex) {
          _this2._addObject(doc, docIndex);
        });
      }
      this.norm.clear();
    }
    // Adds a doc to the end of the index
  }, {
    key: "add",
    value: function add(doc) {
      var idx = this.size();
      if (isString(doc)) {
        this._addString(doc, idx);
      } else {
        this._addObject(doc, idx);
      }
    }
    // Removes the doc at the specified index of the index
  }, {
    key: "removeAt",
    value: function removeAt(idx) {
      this.records.splice(idx, 1);

      // Change ref index of every subsquent doc
      for (var i = idx, len = this.size(); i < len; i += 1) {
        this.records[i].i -= 1;
      }
    }
  }, {
    key: "getValueForItemAtKeyId",
    value: function getValueForItemAtKeyId(item, keyId) {
      return item[this._keysMap[keyId]];
    }
  }, {
    key: "size",
    value: function size() {
      return this.records.length;
    }
  }, {
    key: "_addString",
    value: function _addString(doc, docIndex) {
      if (!isDefined(doc) || isBlank(doc)) {
        return;
      }
      var record = {
        v: doc,
        i: docIndex,
        n: this.norm.get(doc)
      };
      this.records.push(record);
    }
  }, {
    key: "_addObject",
    value: function _addObject(doc, docIndex) {
      var _this3 = this;
      var record = {
        i: docIndex,
        $: {}
      };

      // Iterate over every key (i.e, path), and fetch the value at that key
      this.keys.forEach(function (key, keyIndex) {
        var value = key.getFn ? key.getFn(doc) : _this3.getFn(doc, key.path);
        if (!isDefined(value)) {
          return;
        }
        if (isArray(value)) {
          var subRecords = [];
          var stack = [{
            nestedArrIndex: -1,
            value: value
          }];
          while (stack.length) {
            var _stack$pop = stack.pop(),
              nestedArrIndex = _stack$pop.nestedArrIndex,
              _value = _stack$pop.value;
            if (!isDefined(_value)) {
              continue;
            }
            if (isString(_value) && !isBlank(_value)) {
              var subRecord = {
                v: _value,
                i: nestedArrIndex,
                n: _this3.norm.get(_value)
              };
              subRecords.push(subRecord);
            } else if (isArray(_value)) {
              _value.forEach(function (item, k) {
                stack.push({
                  nestedArrIndex: k,
                  value: item
                });
              });
            } else ;
          }
          record.$[keyIndex] = subRecords;
        } else if (isString(value) && !isBlank(value)) {
          var _subRecord = {
            v: value,
            n: _this3.norm.get(value)
          };
          record.$[keyIndex] = _subRecord;
        }
      });
      this.records.push(record);
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      return {
        keys: this.keys,
        records: this.records
      };
    }
  }]);
  return FuseIndex;
}();
function createIndex(keys, docs) {
  var _ref2 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
    _ref2$getFn = _ref2.getFn,
    getFn = _ref2$getFn === void 0 ? Config.getFn : _ref2$getFn,
    _ref2$fieldNormWeight = _ref2.fieldNormWeight,
    fieldNormWeight = _ref2$fieldNormWeight === void 0 ? Config.fieldNormWeight : _ref2$fieldNormWeight;
  var myIndex = new FuseIndex({
    getFn: getFn,
    fieldNormWeight: fieldNormWeight
  });
  myIndex.setKeys(keys.map(createKey));
  myIndex.setSources(docs);
  myIndex.create();
  return myIndex;
}
function parseIndex(data) {
  var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
    _ref3$getFn = _ref3.getFn,
    getFn = _ref3$getFn === void 0 ? Config.getFn : _ref3$getFn,
    _ref3$fieldNormWeight = _ref3.fieldNormWeight,
    fieldNormWeight = _ref3$fieldNormWeight === void 0 ? Config.fieldNormWeight : _ref3$fieldNormWeight;
  var keys = data.keys,
    records = data.records;
  var myIndex = new FuseIndex({
    getFn: getFn,
    fieldNormWeight: fieldNormWeight
  });
  myIndex.setKeys(keys);
  myIndex.setIndexRecords(records);
  return myIndex;
}

function computeScore$1(pattern) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
    _ref$errors = _ref.errors,
    errors = _ref$errors === void 0 ? 0 : _ref$errors,
    _ref$currentLocation = _ref.currentLocation,
    currentLocation = _ref$currentLocation === void 0 ? 0 : _ref$currentLocation,
    _ref$expectedLocation = _ref.expectedLocation,
    expectedLocation = _ref$expectedLocation === void 0 ? 0 : _ref$expectedLocation,
    _ref$distance = _ref.distance,
    distance = _ref$distance === void 0 ? Config.distance : _ref$distance,
    _ref$ignoreLocation = _ref.ignoreLocation,
    ignoreLocation = _ref$ignoreLocation === void 0 ? Config.ignoreLocation : _ref$ignoreLocation;
  var accuracy = errors / pattern.length;
  if (ignoreLocation) {
    return accuracy;
  }
  var proximity = Math.abs(expectedLocation - currentLocation);
  if (!distance) {
    // Dodge divide by zero error.
    return proximity ? 1.0 : accuracy;
  }
  return accuracy + proximity / distance;
}

function convertMaskToIndices() {
  var matchmask = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var minMatchCharLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Config.minMatchCharLength;
  var indices = [];
  var start = -1;
  var end = -1;
  var i = 0;
  for (var len = matchmask.length; i < len; i += 1) {
    var match = matchmask[i];
    if (match && start === -1) {
      start = i;
    } else if (!match && start !== -1) {
      end = i - 1;
      if (end - start + 1 >= minMatchCharLength) {
        indices.push([start, end]);
      }
      start = -1;
    }
  }

  // (i-1 - start) + 1 => i - start
  if (matchmask[i - 1] && i - start >= minMatchCharLength) {
    indices.push([start, i - 1]);
  }
  return indices;
}

// Machine word size
var MAX_BITS = 32;

function search(text, pattern, patternAlphabet) {
  var _ref = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {},
    _ref$location = _ref.location,
    location = _ref$location === void 0 ? Config.location : _ref$location,
    _ref$distance = _ref.distance,
    distance = _ref$distance === void 0 ? Config.distance : _ref$distance,
    _ref$threshold = _ref.threshold,
    threshold = _ref$threshold === void 0 ? Config.threshold : _ref$threshold,
    _ref$findAllMatches = _ref.findAllMatches,
    findAllMatches = _ref$findAllMatches === void 0 ? Config.findAllMatches : _ref$findAllMatches,
    _ref$minMatchCharLeng = _ref.minMatchCharLength,
    minMatchCharLength = _ref$minMatchCharLeng === void 0 ? Config.minMatchCharLength : _ref$minMatchCharLeng,
    _ref$includeMatches = _ref.includeMatches,
    includeMatches = _ref$includeMatches === void 0 ? Config.includeMatches : _ref$includeMatches,
    _ref$ignoreLocation = _ref.ignoreLocation,
    ignoreLocation = _ref$ignoreLocation === void 0 ? Config.ignoreLocation : _ref$ignoreLocation;
  if (pattern.length > MAX_BITS) {
    throw new Error(PATTERN_LENGTH_TOO_LARGE(MAX_BITS));
  }
  var patternLen = pattern.length;
  // Set starting location at beginning text and initialize the alphabet.
  var textLen = text.length;
  // Handle the case when location > text.length
  var expectedLocation = Math.max(0, Math.min(location, textLen));
  // Highest score beyond which we give up.
  var currentThreshold = threshold;
  // Is there a nearby exact match? (speedup)
  var bestLocation = expectedLocation;

  // Performance: only computer matches when the minMatchCharLength > 1
  // OR if `includeMatches` is true.
  var computeMatches = minMatchCharLength > 1 || includeMatches;
  // A mask of the matches, used for building the indices
  var matchMask = computeMatches ? Array(textLen) : [];
  var index;

  // Get all exact matches, here for speed up
  while ((index = text.indexOf(pattern, bestLocation)) > -1) {
    var score = computeScore$1(pattern, {
      currentLocation: index,
      expectedLocation: expectedLocation,
      distance: distance,
      ignoreLocation: ignoreLocation
    });
    currentThreshold = Math.min(score, currentThreshold);
    bestLocation = index + patternLen;
    if (computeMatches) {
      var i = 0;
      while (i < patternLen) {
        matchMask[index + i] = 1;
        i += 1;
      }
    }
  }

  // Reset the best location
  bestLocation = -1;
  var lastBitArr = [];
  var finalScore = 1;
  var binMax = patternLen + textLen;
  var mask = 1 << patternLen - 1;
  for (var _i = 0; _i < patternLen; _i += 1) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from the match location we can stray
    // at this error level.
    var binMin = 0;
    var binMid = binMax;
    while (binMin < binMid) {
      var _score = computeScore$1(pattern, {
        errors: _i,
        currentLocation: expectedLocation + binMid,
        expectedLocation: expectedLocation,
        distance: distance,
        ignoreLocation: ignoreLocation
      });
      if (_score <= currentThreshold) {
        binMin = binMid;
      } else {
        binMax = binMid;
      }
      binMid = Math.floor((binMax - binMin) / 2 + binMin);
    }

    // Use the result from this iteration as the maximum for the next.
    binMax = binMid;
    var start = Math.max(1, expectedLocation - binMid + 1);
    var finish = findAllMatches ? textLen : Math.min(expectedLocation + binMid, textLen) + patternLen;

    // Initialize the bit array
    var bitArr = Array(finish + 2);
    bitArr[finish + 1] = (1 << _i) - 1;
    for (var j = finish; j >= start; j -= 1) {
      var currentLocation = j - 1;
      var charMatch = patternAlphabet[text.charAt(currentLocation)];
      if (computeMatches) {
        // Speed up: quick bool to int conversion (i.e, `charMatch ? 1 : 0`)
        matchMask[currentLocation] = +!!charMatch;
      }

      // First pass: exact match
      bitArr[j] = (bitArr[j + 1] << 1 | 1) & charMatch;

      // Subsequent passes: fuzzy match
      if (_i) {
        bitArr[j] |= (lastBitArr[j + 1] | lastBitArr[j]) << 1 | 1 | lastBitArr[j + 1];
      }
      if (bitArr[j] & mask) {
        finalScore = computeScore$1(pattern, {
          errors: _i,
          currentLocation: currentLocation,
          expectedLocation: expectedLocation,
          distance: distance,
          ignoreLocation: ignoreLocation
        });

        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (finalScore <= currentThreshold) {
          // Indeed it is
          currentThreshold = finalScore;
          bestLocation = currentLocation;

          // Already passed `loc`, downhill from here on in.
          if (bestLocation <= expectedLocation) {
            break;
          }

          // When passing `bestLocation`, don't exceed our current distance from `expectedLocation`.
          start = Math.max(1, 2 * expectedLocation - bestLocation);
        }
      }
    }

    // No hope for a (better) match at greater error levels.
    var _score2 = computeScore$1(pattern, {
      errors: _i + 1,
      currentLocation: expectedLocation,
      expectedLocation: expectedLocation,
      distance: distance,
      ignoreLocation: ignoreLocation
    });
    if (_score2 > currentThreshold) {
      break;
    }
    lastBitArr = bitArr;
  }
  var result = {
    isMatch: bestLocation >= 0,
    // Count exact matches (those with a score of 0) to be "almost" exact
    score: Math.max(0.001, finalScore)
  };
  if (computeMatches) {
    var indices = convertMaskToIndices(matchMask, minMatchCharLength);
    if (!indices.length) {
      result.isMatch = false;
    } else if (includeMatches) {
      result.indices = indices;
    }
  }
  return result;
}

function createPatternAlphabet(pattern) {
  var mask = {};
  for (var i = 0, len = pattern.length; i < len; i += 1) {
    var _char = pattern.charAt(i);
    mask[_char] = (mask[_char] || 0) | 1 << len - i - 1;
  }
  return mask;
}

var stripDiacritics = String.prototype.normalize ? function (str) {
  return str.normalize('NFD').replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g, '');
} : function (str) {
  return str;
};

var BitapSearch = /*#__PURE__*/function () {
  function BitapSearch(pattern) {
    var _this = this;
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$location = _ref.location,
      location = _ref$location === void 0 ? Config.location : _ref$location,
      _ref$threshold = _ref.threshold,
      threshold = _ref$threshold === void 0 ? Config.threshold : _ref$threshold,
      _ref$distance = _ref.distance,
      distance = _ref$distance === void 0 ? Config.distance : _ref$distance,
      _ref$includeMatches = _ref.includeMatches,
      includeMatches = _ref$includeMatches === void 0 ? Config.includeMatches : _ref$includeMatches,
      _ref$findAllMatches = _ref.findAllMatches,
      findAllMatches = _ref$findAllMatches === void 0 ? Config.findAllMatches : _ref$findAllMatches,
      _ref$minMatchCharLeng = _ref.minMatchCharLength,
      minMatchCharLength = _ref$minMatchCharLeng === void 0 ? Config.minMatchCharLength : _ref$minMatchCharLeng,
      _ref$isCaseSensitive = _ref.isCaseSensitive,
      isCaseSensitive = _ref$isCaseSensitive === void 0 ? Config.isCaseSensitive : _ref$isCaseSensitive,
      _ref$ignoreDiacritics = _ref.ignoreDiacritics,
      ignoreDiacritics = _ref$ignoreDiacritics === void 0 ? Config.ignoreDiacritics : _ref$ignoreDiacritics,
      _ref$ignoreLocation = _ref.ignoreLocation,
      ignoreLocation = _ref$ignoreLocation === void 0 ? Config.ignoreLocation : _ref$ignoreLocation;
    _classCallCheck(this, BitapSearch);
    this.options = {
      location: location,
      threshold: threshold,
      distance: distance,
      includeMatches: includeMatches,
      findAllMatches: findAllMatches,
      minMatchCharLength: minMatchCharLength,
      isCaseSensitive: isCaseSensitive,
      ignoreDiacritics: ignoreDiacritics,
      ignoreLocation: ignoreLocation
    };
    pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
    this.pattern = pattern;
    this.chunks = [];
    if (!this.pattern.length) {
      return;
    }
    var addChunk = function addChunk(pattern, startIndex) {
      _this.chunks.push({
        pattern: pattern,
        alphabet: createPatternAlphabet(pattern),
        startIndex: startIndex
      });
    };
    var len = this.pattern.length;
    if (len > MAX_BITS) {
      var i = 0;
      var remainder = len % MAX_BITS;
      var end = len - remainder;
      while (i < end) {
        addChunk(this.pattern.substr(i, MAX_BITS), i);
        i += MAX_BITS;
      }
      if (remainder) {
        var startIndex = len - MAX_BITS;
        addChunk(this.pattern.substr(startIndex), startIndex);
      }
    } else {
      addChunk(this.pattern, 0);
    }
  }
  _createClass(BitapSearch, [{
    key: "searchIn",
    value: function searchIn(text) {
      var _this$options = this.options,
        isCaseSensitive = _this$options.isCaseSensitive,
        ignoreDiacritics = _this$options.ignoreDiacritics,
        includeMatches = _this$options.includeMatches;
      text = isCaseSensitive ? text : text.toLowerCase();
      text = ignoreDiacritics ? stripDiacritics(text) : text;

      // Exact match
      if (this.pattern === text) {
        var _result = {
          isMatch: true,
          score: 0
        };
        if (includeMatches) {
          _result.indices = [[0, text.length - 1]];
        }
        return _result;
      }

      // Otherwise, use Bitap algorithm
      var _this$options2 = this.options,
        location = _this$options2.location,
        distance = _this$options2.distance,
        threshold = _this$options2.threshold,
        findAllMatches = _this$options2.findAllMatches,
        minMatchCharLength = _this$options2.minMatchCharLength,
        ignoreLocation = _this$options2.ignoreLocation;
      var allIndices = [];
      var totalScore = 0;
      var hasMatches = false;
      this.chunks.forEach(function (_ref2) {
        var pattern = _ref2.pattern,
          alphabet = _ref2.alphabet,
          startIndex = _ref2.startIndex;
        var _search = search(text, pattern, alphabet, {
            location: location + startIndex,
            distance: distance,
            threshold: threshold,
            findAllMatches: findAllMatches,
            minMatchCharLength: minMatchCharLength,
            includeMatches: includeMatches,
            ignoreLocation: ignoreLocation
          }),
          isMatch = _search.isMatch,
          score = _search.score,
          indices = _search.indices;
        if (isMatch) {
          hasMatches = true;
        }
        totalScore += score;
        if (isMatch && indices) {
          allIndices = [].concat(_toConsumableArray(allIndices), _toConsumableArray(indices));
        }
      });
      var result = {
        isMatch: hasMatches,
        score: hasMatches ? totalScore / this.chunks.length : 1
      };
      if (hasMatches && includeMatches) {
        result.indices = allIndices;
      }
      return result;
    }
  }]);
  return BitapSearch;
}();

var BaseMatch = /*#__PURE__*/function () {
  function BaseMatch(pattern) {
    _classCallCheck(this, BaseMatch);
    this.pattern = pattern;
  }
  _createClass(BaseMatch, [{
    key: "search",
    value: function search( /*text*/) {}
  }], [{
    key: "isMultiMatch",
    value: function isMultiMatch(pattern) {
      return getMatch(pattern, this.multiRegex);
    }
  }, {
    key: "isSingleMatch",
    value: function isSingleMatch(pattern) {
      return getMatch(pattern, this.singleRegex);
    }
  }]);
  return BaseMatch;
}();
function getMatch(pattern, exp) {
  var matches = pattern.match(exp);
  return matches ? matches[1] : null;
}

var ExactMatch = /*#__PURE__*/function (_BaseMatch) {
  _inherits(ExactMatch, _BaseMatch);
  var _super = _createSuper(ExactMatch);
  function ExactMatch(pattern) {
    _classCallCheck(this, ExactMatch);
    return _super.call(this, pattern);
  }
  _createClass(ExactMatch, [{
    key: "search",
    value: function search(text) {
      var isMatch = text === this.pattern;
      return {
        isMatch: isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, this.pattern.length - 1]
      };
    }
  }], [{
    key: "type",
    get: function get() {
      return 'exact';
    }
  }, {
    key: "multiRegex",
    get: function get() {
      return /^="(.*)"$/;
    }
  }, {
    key: "singleRegex",
    get: function get() {
      return /^=(.*)$/;
    }
  }]);
  return ExactMatch;
}(BaseMatch);

var InverseExactMatch = /*#__PURE__*/function (_BaseMatch) {
  _inherits(InverseExactMatch, _BaseMatch);
  var _super = _createSuper(InverseExactMatch);
  function InverseExactMatch(pattern) {
    _classCallCheck(this, InverseExactMatch);
    return _super.call(this, pattern);
  }
  _createClass(InverseExactMatch, [{
    key: "search",
    value: function search(text) {
      var index = text.indexOf(this.pattern);
      var isMatch = index === -1;
      return {
        isMatch: isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, text.length - 1]
      };
    }
  }], [{
    key: "type",
    get: function get() {
      return 'inverse-exact';
    }
  }, {
    key: "multiRegex",
    get: function get() {
      return /^!"(.*)"$/;
    }
  }, {
    key: "singleRegex",
    get: function get() {
      return /^!(.*)$/;
    }
  }]);
  return InverseExactMatch;
}(BaseMatch);

var PrefixExactMatch = /*#__PURE__*/function (_BaseMatch) {
  _inherits(PrefixExactMatch, _BaseMatch);
  var _super = _createSuper(PrefixExactMatch);
  function PrefixExactMatch(pattern) {
    _classCallCheck(this, PrefixExactMatch);
    return _super.call(this, pattern);
  }
  _createClass(PrefixExactMatch, [{
    key: "search",
    value: function search(text) {
      var isMatch = text.startsWith(this.pattern);
      return {
        isMatch: isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, this.pattern.length - 1]
      };
    }
  }], [{
    key: "type",
    get: function get() {
      return 'prefix-exact';
    }
  }, {
    key: "multiRegex",
    get: function get() {
      return /^\^"(.*)"$/;
    }
  }, {
    key: "singleRegex",
    get: function get() {
      return /^\^(.*)$/;
    }
  }]);
  return PrefixExactMatch;
}(BaseMatch);

var InversePrefixExactMatch = /*#__PURE__*/function (_BaseMatch) {
  _inherits(InversePrefixExactMatch, _BaseMatch);
  var _super = _createSuper(InversePrefixExactMatch);
  function InversePrefixExactMatch(pattern) {
    _classCallCheck(this, InversePrefixExactMatch);
    return _super.call(this, pattern);
  }
  _createClass(InversePrefixExactMatch, [{
    key: "search",
    value: function search(text) {
      var isMatch = !text.startsWith(this.pattern);
      return {
        isMatch: isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, text.length - 1]
      };
    }
  }], [{
    key: "type",
    get: function get() {
      return 'inverse-prefix-exact';
    }
  }, {
    key: "multiRegex",
    get: function get() {
      return /^!\^"(.*)"$/;
    }
  }, {
    key: "singleRegex",
    get: function get() {
      return /^!\^(.*)$/;
    }
  }]);
  return InversePrefixExactMatch;
}(BaseMatch);

var SuffixExactMatch = /*#__PURE__*/function (_BaseMatch) {
  _inherits(SuffixExactMatch, _BaseMatch);
  var _super = _createSuper(SuffixExactMatch);
  function SuffixExactMatch(pattern) {
    _classCallCheck(this, SuffixExactMatch);
    return _super.call(this, pattern);
  }
  _createClass(SuffixExactMatch, [{
    key: "search",
    value: function search(text) {
      var isMatch = text.endsWith(this.pattern);
      return {
        isMatch: isMatch,
        score: isMatch ? 0 : 1,
        indices: [text.length - this.pattern.length, text.length - 1]
      };
    }
  }], [{
    key: "type",
    get: function get() {
      return 'suffix-exact';
    }
  }, {
    key: "multiRegex",
    get: function get() {
      return /^"(.*)"\$$/;
    }
  }, {
    key: "singleRegex",
    get: function get() {
      return /^(.*)\$$/;
    }
  }]);
  return SuffixExactMatch;
}(BaseMatch);

var InverseSuffixExactMatch = /*#__PURE__*/function (_BaseMatch) {
  _inherits(InverseSuffixExactMatch, _BaseMatch);
  var _super = _createSuper(InverseSuffixExactMatch);
  function InverseSuffixExactMatch(pattern) {
    _classCallCheck(this, InverseSuffixExactMatch);
    return _super.call(this, pattern);
  }
  _createClass(InverseSuffixExactMatch, [{
    key: "search",
    value: function search(text) {
      var isMatch = !text.endsWith(this.pattern);
      return {
        isMatch: isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, text.length - 1]
      };
    }
  }], [{
    key: "type",
    get: function get() {
      return 'inverse-suffix-exact';
    }
  }, {
    key: "multiRegex",
    get: function get() {
      return /^!"(.*)"\$$/;
    }
  }, {
    key: "singleRegex",
    get: function get() {
      return /^!(.*)\$$/;
    }
  }]);
  return InverseSuffixExactMatch;
}(BaseMatch);

var FuzzyMatch = /*#__PURE__*/function (_BaseMatch) {
  _inherits(FuzzyMatch, _BaseMatch);
  var _super = _createSuper(FuzzyMatch);
  function FuzzyMatch(pattern) {
    var _this;
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$location = _ref.location,
      location = _ref$location === void 0 ? Config.location : _ref$location,
      _ref$threshold = _ref.threshold,
      threshold = _ref$threshold === void 0 ? Config.threshold : _ref$threshold,
      _ref$distance = _ref.distance,
      distance = _ref$distance === void 0 ? Config.distance : _ref$distance,
      _ref$includeMatches = _ref.includeMatches,
      includeMatches = _ref$includeMatches === void 0 ? Config.includeMatches : _ref$includeMatches,
      _ref$findAllMatches = _ref.findAllMatches,
      findAllMatches = _ref$findAllMatches === void 0 ? Config.findAllMatches : _ref$findAllMatches,
      _ref$minMatchCharLeng = _ref.minMatchCharLength,
      minMatchCharLength = _ref$minMatchCharLeng === void 0 ? Config.minMatchCharLength : _ref$minMatchCharLeng,
      _ref$isCaseSensitive = _ref.isCaseSensitive,
      isCaseSensitive = _ref$isCaseSensitive === void 0 ? Config.isCaseSensitive : _ref$isCaseSensitive,
      _ref$ignoreDiacritics = _ref.ignoreDiacritics,
      ignoreDiacritics = _ref$ignoreDiacritics === void 0 ? Config.ignoreDiacritics : _ref$ignoreDiacritics,
      _ref$ignoreLocation = _ref.ignoreLocation,
      ignoreLocation = _ref$ignoreLocation === void 0 ? Config.ignoreLocation : _ref$ignoreLocation;
    _classCallCheck(this, FuzzyMatch);
    _this = _super.call(this, pattern);
    _this._bitapSearch = new BitapSearch(pattern, {
      location: location,
      threshold: threshold,
      distance: distance,
      includeMatches: includeMatches,
      findAllMatches: findAllMatches,
      minMatchCharLength: minMatchCharLength,
      isCaseSensitive: isCaseSensitive,
      ignoreDiacritics: ignoreDiacritics,
      ignoreLocation: ignoreLocation
    });
    return _this;
  }
  _createClass(FuzzyMatch, [{
    key: "search",
    value: function search(text) {
      return this._bitapSearch.searchIn(text);
    }
  }], [{
    key: "type",
    get: function get() {
      return 'fuzzy';
    }
  }, {
    key: "multiRegex",
    get: function get() {
      return /^"(.*)"$/;
    }
  }, {
    key: "singleRegex",
    get: function get() {
      return /^(.*)$/;
    }
  }]);
  return FuzzyMatch;
}(BaseMatch);

var IncludeMatch = /*#__PURE__*/function (_BaseMatch) {
  _inherits(IncludeMatch, _BaseMatch);
  var _super = _createSuper(IncludeMatch);
  function IncludeMatch(pattern) {
    _classCallCheck(this, IncludeMatch);
    return _super.call(this, pattern);
  }
  _createClass(IncludeMatch, [{
    key: "search",
    value: function search(text) {
      var location = 0;
      var index;
      var indices = [];
      var patternLen = this.pattern.length;

      // Get all exact matches
      while ((index = text.indexOf(this.pattern, location)) > -1) {
        location = index + patternLen;
        indices.push([index, location - 1]);
      }
      var isMatch = !!indices.length;
      return {
        isMatch: isMatch,
        score: isMatch ? 0 : 1,
        indices: indices
      };
    }
  }], [{
    key: "type",
    get: function get() {
      return 'include';
    }
  }, {
    key: "multiRegex",
    get: function get() {
      return /^'"(.*)"$/;
    }
  }, {
    key: "singleRegex",
    get: function get() {
      return /^'(.*)$/;
    }
  }]);
  return IncludeMatch;
}(BaseMatch);

// ❗Order is important. DO NOT CHANGE.
var searchers = [ExactMatch, IncludeMatch, PrefixExactMatch, InversePrefixExactMatch, InverseSuffixExactMatch, SuffixExactMatch, InverseExactMatch, FuzzyMatch];
var searchersLen = searchers.length;

// Regex to split by spaces, but keep anything in quotes together
var SPACE_RE = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/;
var OR_TOKEN = '|';

// Return a 2D array representation of the query, for simpler parsing.
// Example:
// "^core go$ | rb$ | py$ xy$" => [["^core", "go$"], ["rb$"], ["py$", "xy$"]]
function parseQuery(pattern) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return pattern.split(OR_TOKEN).map(function (item) {
    var query = item.trim().split(SPACE_RE).filter(function (item) {
      return item && !!item.trim();
    });
    var results = [];
    for (var i = 0, len = query.length; i < len; i += 1) {
      var queryItem = query[i];

      // 1. Handle multiple query match (i.e, once that are quoted, like `"hello world"`)
      var found = false;
      var idx = -1;
      while (!found && ++idx < searchersLen) {
        var searcher = searchers[idx];
        var token = searcher.isMultiMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          found = true;
        }
      }
      if (found) {
        continue;
      }

      // 2. Handle single query matches (i.e, once that are *not* quoted)
      idx = -1;
      while (++idx < searchersLen) {
        var _searcher = searchers[idx];
        var _token = _searcher.isSingleMatch(queryItem);
        if (_token) {
          results.push(new _searcher(_token, options));
          break;
        }
      }
    }
    return results;
  });
}

// These extended matchers can return an array of matches, as opposed
// to a singl match
var MultiMatchSet = new Set([FuzzyMatch.type, IncludeMatch.type]);

/**
 * Command-like searching
 * ======================
 *
 * Given multiple search terms delimited by spaces.e.g. `^jscript .python$ ruby !java`,
 * search in a given text.
 *
 * Search syntax:
 *
 * | Token       | Match type                 | Description                            |
 * | ----------- | -------------------------- | -------------------------------------- |
 * | `jscript`   | fuzzy-match                | Items that fuzzy match `jscript`       |
 * | `=scheme`   | exact-match                | Items that are `scheme`                |
 * | `'python`   | include-match              | Items that include `python`            |
 * | `!ruby`     | inverse-exact-match        | Items that do not include `ruby`       |
 * | `^java`     | prefix-exact-match         | Items that start with `java`           |
 * | `!^earlang` | inverse-prefix-exact-match | Items that do not start with `earlang` |
 * | `.js$`      | suffix-exact-match         | Items that end with `.js`              |
 * | `!.go$`     | inverse-suffix-exact-match | Items that do not end with `.go`       |
 *
 * A single pipe character acts as an OR operator. For example, the following
 * query matches entries that start with `core` and end with either`go`, `rb`,
 * or`py`.
 *
 * ```
 * ^core go$ | rb$ | py$
 * ```
 */
var ExtendedSearch = /*#__PURE__*/function () {
  function ExtendedSearch(pattern) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$isCaseSensitive = _ref.isCaseSensitive,
      isCaseSensitive = _ref$isCaseSensitive === void 0 ? Config.isCaseSensitive : _ref$isCaseSensitive,
      _ref$ignoreDiacritics = _ref.ignoreDiacritics,
      ignoreDiacritics = _ref$ignoreDiacritics === void 0 ? Config.ignoreDiacritics : _ref$ignoreDiacritics,
      _ref$includeMatches = _ref.includeMatches,
      includeMatches = _ref$includeMatches === void 0 ? Config.includeMatches : _ref$includeMatches,
      _ref$minMatchCharLeng = _ref.minMatchCharLength,
      minMatchCharLength = _ref$minMatchCharLeng === void 0 ? Config.minMatchCharLength : _ref$minMatchCharLeng,
      _ref$ignoreLocation = _ref.ignoreLocation,
      ignoreLocation = _ref$ignoreLocation === void 0 ? Config.ignoreLocation : _ref$ignoreLocation,
      _ref$findAllMatches = _ref.findAllMatches,
      findAllMatches = _ref$findAllMatches === void 0 ? Config.findAllMatches : _ref$findAllMatches,
      _ref$location = _ref.location,
      location = _ref$location === void 0 ? Config.location : _ref$location,
      _ref$threshold = _ref.threshold,
      threshold = _ref$threshold === void 0 ? Config.threshold : _ref$threshold,
      _ref$distance = _ref.distance,
      distance = _ref$distance === void 0 ? Config.distance : _ref$distance;
    _classCallCheck(this, ExtendedSearch);
    this.query = null;
    this.options = {
      isCaseSensitive: isCaseSensitive,
      ignoreDiacritics: ignoreDiacritics,
      includeMatches: includeMatches,
      minMatchCharLength: minMatchCharLength,
      findAllMatches: findAllMatches,
      ignoreLocation: ignoreLocation,
      location: location,
      threshold: threshold,
      distance: distance
    };
    pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
    this.pattern = pattern;
    this.query = parseQuery(this.pattern, this.options);
  }
  _createClass(ExtendedSearch, [{
    key: "searchIn",
    value: function searchIn(text) {
      var query = this.query;
      if (!query) {
        return {
          isMatch: false,
          score: 1
        };
      }
      var _this$options = this.options,
        includeMatches = _this$options.includeMatches,
        isCaseSensitive = _this$options.isCaseSensitive,
        ignoreDiacritics = _this$options.ignoreDiacritics;
      text = isCaseSensitive ? text : text.toLowerCase();
      text = ignoreDiacritics ? stripDiacritics(text) : text;
      var numMatches = 0;
      var allIndices = [];
      var totalScore = 0;

      // ORs
      for (var i = 0, qLen = query.length; i < qLen; i += 1) {
        var searchers = query[i];

        // Reset indices
        allIndices.length = 0;
        numMatches = 0;

        // ANDs
        for (var j = 0, pLen = searchers.length; j < pLen; j += 1) {
          var searcher = searchers[j];
          var _searcher$search = searcher.search(text),
            isMatch = _searcher$search.isMatch,
            indices = _searcher$search.indices,
            score = _searcher$search.score;
          if (isMatch) {
            numMatches += 1;
            totalScore += score;
            if (includeMatches) {
              var type = searcher.constructor.type;
              if (MultiMatchSet.has(type)) {
                allIndices = [].concat(_toConsumableArray(allIndices), _toConsumableArray(indices));
              } else {
                allIndices.push(indices);
              }
            }
          } else {
            totalScore = 0;
            numMatches = 0;
            allIndices.length = 0;
            break;
          }
        }

        // OR condition, so if TRUE, return
        if (numMatches) {
          var result = {
            isMatch: true,
            score: totalScore / numMatches
          };
          if (includeMatches) {
            result.indices = allIndices;
          }
          return result;
        }
      }

      // Nothing was matched
      return {
        isMatch: false,
        score: 1
      };
    }
  }], [{
    key: "condition",
    value: function condition(_, options) {
      return options.useExtendedSearch;
    }
  }]);
  return ExtendedSearch;
}();

var registeredSearchers = [];
function register() {
  registeredSearchers.push.apply(registeredSearchers, arguments);
}
function createSearcher(pattern, options) {
  for (var i = 0, len = registeredSearchers.length; i < len; i += 1) {
    var searcherClass = registeredSearchers[i];
    if (searcherClass.condition(pattern, options)) {
      return new searcherClass(pattern, options);
    }
  }
  return new BitapSearch(pattern, options);
}

var LogicalOperator = {
  AND: '$and',
  OR: '$or'
};
var KeyType = {
  PATH: '$path',
  PATTERN: '$val'
};
var isExpression = function isExpression(query) {
  return !!(query[LogicalOperator.AND] || query[LogicalOperator.OR]);
};
var isPath = function isPath(query) {
  return !!query[KeyType.PATH];
};
var isLeaf = function isLeaf(query) {
  return !isArray(query) && isObject(query) && !isExpression(query);
};
var convertToExplicit = function convertToExplicit(query) {
  return _defineProperty({}, LogicalOperator.AND, Object.keys(query).map(function (key) {
    return _defineProperty({}, key, query[key]);
  }));
};

// When `auto` is `true`, the parse function will infer and initialize and add
// the appropriate `Searcher` instance
function parse(query, options) {
  var _ref3 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
    _ref3$auto = _ref3.auto,
    auto = _ref3$auto === void 0 ? true : _ref3$auto;
  var next = function next(query) {
    var keys = Object.keys(query);
    var isQueryPath = isPath(query);
    if (!isQueryPath && keys.length > 1 && !isExpression(query)) {
      return next(convertToExplicit(query));
    }
    if (isLeaf(query)) {
      var key = isQueryPath ? query[KeyType.PATH] : keys[0];
      var pattern = isQueryPath ? query[KeyType.PATTERN] : query[key];
      if (!isString(pattern)) {
        throw new Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key));
      }
      var obj = {
        keyId: createKeyId(key),
        pattern: pattern
      };
      if (auto) {
        obj.searcher = createSearcher(pattern, options);
      }
      return obj;
    }
    var node = {
      children: [],
      operator: keys[0]
    };
    keys.forEach(function (key) {
      var value = query[key];
      if (isArray(value)) {
        value.forEach(function (item) {
          node.children.push(next(item));
        });
      }
    });
    return node;
  };
  if (!isExpression(query)) {
    query = convertToExplicit(query);
  }
  return next(query);
}

// Practical scoring function
function computeScore(results, _ref) {
  var _ref$ignoreFieldNorm = _ref.ignoreFieldNorm,
    ignoreFieldNorm = _ref$ignoreFieldNorm === void 0 ? Config.ignoreFieldNorm : _ref$ignoreFieldNorm;
  results.forEach(function (result) {
    var totalScore = 1;
    result.matches.forEach(function (_ref2) {
      var key = _ref2.key,
        norm = _ref2.norm,
        score = _ref2.score;
      var weight = key ? key.weight : null;
      totalScore *= Math.pow(score === 0 && weight ? Number.EPSILON : score, (weight || 1) * (ignoreFieldNorm ? 1 : norm));
    });
    result.score = totalScore;
  });
}

function transformMatches(result, data) {
  var matches = result.matches;
  data.matches = [];
  if (!isDefined(matches)) {
    return;
  }
  matches.forEach(function (match) {
    if (!isDefined(match.indices) || !match.indices.length) {
      return;
    }
    var indices = match.indices,
      value = match.value;
    var obj = {
      indices: indices,
      value: value
    };
    if (match.key) {
      obj.key = match.key.src;
    }
    if (match.idx > -1) {
      obj.refIndex = match.idx;
    }
    data.matches.push(obj);
  });
}

function transformScore(result, data) {
  data.score = result.score;
}

function format(results, docs) {
  var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
    _ref$includeMatches = _ref.includeMatches,
    includeMatches = _ref$includeMatches === void 0 ? Config.includeMatches : _ref$includeMatches,
    _ref$includeScore = _ref.includeScore,
    includeScore = _ref$includeScore === void 0 ? Config.includeScore : _ref$includeScore;
  var transformers = [];
  if (includeMatches) transformers.push(transformMatches);
  if (includeScore) transformers.push(transformScore);
  return results.map(function (result) {
    var idx = result.idx;
    var data = {
      item: docs[idx],
      refIndex: idx
    };
    if (transformers.length) {
      transformers.forEach(function (transformer) {
        transformer(result, data);
      });
    }
    return data;
  });
}

var Fuse$1 = /*#__PURE__*/function () {
  function Fuse(docs) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var index = arguments.length > 2 ? arguments[2] : undefined;
    _classCallCheck(this, Fuse);
    this.options = _objectSpread2(_objectSpread2({}, Config), options);
    if (this.options.useExtendedSearch && !true) // removed by dead control flow
{}
    this._keyStore = new KeyStore(this.options.keys);
    this.setCollection(docs, index);
  }
  _createClass(Fuse, [{
    key: "setCollection",
    value: function setCollection(docs, index) {
      this._docs = docs;
      if (index && !(index instanceof FuseIndex)) {
        throw new Error(INCORRECT_INDEX_TYPE);
      }
      this._myIndex = index || createIndex(this.options.keys, this._docs, {
        getFn: this.options.getFn,
        fieldNormWeight: this.options.fieldNormWeight
      });
    }
  }, {
    key: "add",
    value: function add(doc) {
      if (!isDefined(doc)) {
        return;
      }
      this._docs.push(doc);
      this._myIndex.add(doc);
    }
  }, {
    key: "remove",
    value: function remove() {
      var predicate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function /* doc, idx */ () {
        return false;
      };
      var results = [];
      for (var i = 0, len = this._docs.length; i < len; i += 1) {
        var doc = this._docs[i];
        if (predicate(doc, i)) {
          this.removeAt(i);
          i -= 1;
          len -= 1;
          results.push(doc);
        }
      }
      return results;
    }
  }, {
    key: "removeAt",
    value: function removeAt(idx) {
      this._docs.splice(idx, 1);
      this._myIndex.removeAt(idx);
    }
  }, {
    key: "getIndex",
    value: function getIndex() {
      return this._myIndex;
    }
  }, {
    key: "search",
    value: function search(query) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$limit = _ref.limit,
        limit = _ref$limit === void 0 ? -1 : _ref$limit;
      var _this$options = this.options,
        includeMatches = _this$options.includeMatches,
        includeScore = _this$options.includeScore,
        shouldSort = _this$options.shouldSort,
        sortFn = _this$options.sortFn,
        ignoreFieldNorm = _this$options.ignoreFieldNorm;
      var results = isString(query) ? isString(this._docs[0]) ? this._searchStringList(query) : this._searchObjectList(query) : this._searchLogical(query);
      computeScore(results, {
        ignoreFieldNorm: ignoreFieldNorm
      });
      if (shouldSort) {
        results.sort(sortFn);
      }
      if (isNumber(limit) && limit > -1) {
        results = results.slice(0, limit);
      }
      return format(results, this._docs, {
        includeMatches: includeMatches,
        includeScore: includeScore
      });
    }
  }, {
    key: "_searchStringList",
    value: function _searchStringList(query) {
      var searcher = createSearcher(query, this.options);
      var records = this._myIndex.records;
      var results = [];

      // Iterate over every string in the index
      records.forEach(function (_ref2) {
        var text = _ref2.v,
          idx = _ref2.i,
          norm = _ref2.n;
        if (!isDefined(text)) {
          return;
        }
        var _searcher$searchIn = searcher.searchIn(text),
          isMatch = _searcher$searchIn.isMatch,
          score = _searcher$searchIn.score,
          indices = _searcher$searchIn.indices;
        if (isMatch) {
          results.push({
            item: text,
            idx: idx,
            matches: [{
              score: score,
              value: text,
              norm: norm,
              indices: indices
            }]
          });
        }
      });
      return results;
    }
  }, {
    key: "_searchLogical",
    value: function _searchLogical(query) {
      var _this = this;
      var expression = parse(query, this.options);
      var evaluate = function evaluate(node, item, idx) {
        if (!node.children) {
          var keyId = node.keyId,
            searcher = node.searcher;
          var matches = _this._findMatches({
            key: _this._keyStore.get(keyId),
            value: _this._myIndex.getValueForItemAtKeyId(item, keyId),
            searcher: searcher
          });
          if (matches && matches.length) {
            return [{
              idx: idx,
              item: item,
              matches: matches
            }];
          }
          return [];
        }
        var res = [];
        for (var i = 0, len = node.children.length; i < len; i += 1) {
          var child = node.children[i];
          var result = evaluate(child, item, idx);
          if (result.length) {
            res.push.apply(res, _toConsumableArray(result));
          } else if (node.operator === LogicalOperator.AND) {
            return [];
          }
        }
        return res;
      };
      var records = this._myIndex.records;
      var resultMap = {};
      var results = [];
      records.forEach(function (_ref3) {
        var item = _ref3.$,
          idx = _ref3.i;
        if (isDefined(item)) {
          var expResults = evaluate(expression, item, idx);
          if (expResults.length) {
            // Dedupe when adding
            if (!resultMap[idx]) {
              resultMap[idx] = {
                idx: idx,
                item: item,
                matches: []
              };
              results.push(resultMap[idx]);
            }
            expResults.forEach(function (_ref4) {
              var _resultMap$idx$matche;
              var matches = _ref4.matches;
              (_resultMap$idx$matche = resultMap[idx].matches).push.apply(_resultMap$idx$matche, _toConsumableArray(matches));
            });
          }
        }
      });
      return results;
    }
  }, {
    key: "_searchObjectList",
    value: function _searchObjectList(query) {
      var _this2 = this;
      var searcher = createSearcher(query, this.options);
      var _this$_myIndex = this._myIndex,
        keys = _this$_myIndex.keys,
        records = _this$_myIndex.records;
      var results = [];

      // List is Array<Object>
      records.forEach(function (_ref5) {
        var item = _ref5.$,
          idx = _ref5.i;
        if (!isDefined(item)) {
          return;
        }
        var matches = [];

        // Iterate over every key (i.e, path), and fetch the value at that key
        keys.forEach(function (key, keyIndex) {
          matches.push.apply(matches, _toConsumableArray(_this2._findMatches({
            key: key,
            value: item[keyIndex],
            searcher: searcher
          })));
        });
        if (matches.length) {
          results.push({
            idx: idx,
            item: item,
            matches: matches
          });
        }
      });
      return results;
    }
  }, {
    key: "_findMatches",
    value: function _findMatches(_ref6) {
      var key = _ref6.key,
        value = _ref6.value,
        searcher = _ref6.searcher;
      if (!isDefined(value)) {
        return [];
      }
      var matches = [];
      if (isArray(value)) {
        value.forEach(function (_ref7) {
          var text = _ref7.v,
            idx = _ref7.i,
            norm = _ref7.n;
          if (!isDefined(text)) {
            return;
          }
          var _searcher$searchIn2 = searcher.searchIn(text),
            isMatch = _searcher$searchIn2.isMatch,
            score = _searcher$searchIn2.score,
            indices = _searcher$searchIn2.indices;
          if (isMatch) {
            matches.push({
              score: score,
              key: key,
              value: text,
              idx: idx,
              norm: norm,
              indices: indices
            });
          }
        });
      } else {
        var text = value.v,
          norm = value.n;
        var _searcher$searchIn3 = searcher.searchIn(text),
          isMatch = _searcher$searchIn3.isMatch,
          score = _searcher$searchIn3.score,
          indices = _searcher$searchIn3.indices;
        if (isMatch) {
          matches.push({
            score: score,
            key: key,
            value: text,
            norm: norm,
            indices: indices
          });
        }
      }
      return matches;
    }
  }]);
  return Fuse;
}();

Fuse$1.version = '7.1.0';
Fuse$1.createIndex = createIndex;
Fuse$1.parseIndex = parseIndex;
Fuse$1.config = Config;
{
  Fuse$1.parseQuery = parse;
}
{
  register(ExtendedSearch);
}
var Fuse = Fuse$1;

module.exports = Fuse;


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main/index.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=main.js.map