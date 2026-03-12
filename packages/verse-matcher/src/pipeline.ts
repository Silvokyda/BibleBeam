// packages/verse-matcher/src/pipeline.ts
// Orchestrates: regex → fuzzy → semantic
// Includes a sliding window so verses spoken across multiple STT chunks are caught.

import { detectExplicitReference, formatReference } from './regex';
import { fuzzyMatch } from './fuzzy';
import type { VerseReference } from './regex';

export type MatchMethod = 'regex' | 'fuzzy' | 'semantic';

export interface VerseMatch {
  reference: VerseReference;
  referenceString: string;
  confidence: number;
  method: MatchMethod;
}

export interface PipelineOptions {
  minFuzzyScore?: number;
  semanticEnabled?: boolean;
  semanticThreshold?: number;
}

// ── Sliding window ────────────────────────────────────────────────────────────
// Keeps the last N transcript segments so a verse quote that spans multiple
// 4-second chunks can still be matched (e.g. "For God so loved the world" +
// "that he gave his only begotten son" arrive in separate chunks).

const WINDOW_SIZE = 4; // number of segments to keep
const recentSegments: string[] = [];

export function pushSegment(text: string): void {
  recentSegments.push(text.trim());
  if (recentSegments.length > WINDOW_SIZE) {
    recentSegments.shift();
  }
}

function windowText(): string {
  return recentSegments.join(' ');
}

export function clearWindow(): void {
  recentSegments.length = 0;
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function detectVerse(
  text: string,
  options: PipelineOptions = {}
): Promise<VerseMatch | null> {
  const opts = {
    minFuzzyScore: 0.45,   // slightly more permissive than before
    semanticEnabled: false,
    semanticThreshold: 0.75,
    ...options,
  };

  // Add this segment to the sliding window
  pushSegment(text);

  // --- Stage 1: Regex on current segment first (fast path) ---
  const explicitCurrent = detectExplicitReference(text);
  if (explicitCurrent) {
    clearWindow(); // fresh start after an explicit hit
    return {
      reference: explicitCurrent,
      referenceString: formatReference(explicitCurrent),
      confidence: 1.0,
      method: 'regex',
    };
  }

  // --- Stage 1b: Regex on the sliding window (catches split references) ---
  // e.g. "...that's in John 3" followed by ".16" or "verse 16" next chunk
  const combined = windowText();
  const explicitWindow = detectExplicitReference(combined);
  if (explicitWindow) {
    clearWindow();
    return {
      reference: explicitWindow,
      referenceString: formatReference(explicitWindow),
      confidence: 0.95, // slightly less than 1.0 since it needed context
      method: 'regex',
    };
  }

  // --- Stage 2: Fuzzy on current segment ---
  const fuzzyCurrent = fuzzyMatch(text);
  if (fuzzyCurrent && fuzzyCurrent.normalizedScore >= opts.minFuzzyScore) {
    return {
      reference: fuzzyCurrent.ref,
      referenceString: formatReference(fuzzyCurrent.ref),
      confidence: fuzzyCurrent.normalizedScore,
      method: 'fuzzy',
    };
  }

  // --- Stage 2b: Fuzzy on sliding window (catches multi-chunk quotes) ---
  if (recentSegments.length > 1) {
    const fuzzyWindow = fuzzyMatch(combined);
    if (fuzzyWindow && fuzzyWindow.normalizedScore >= opts.minFuzzyScore) {
      return {
        reference: fuzzyWindow.ref,
        referenceString: formatReference(fuzzyWindow.ref),
        // Slight penalty since it needed multiple chunks to match
        confidence: fuzzyWindow.normalizedScore * 0.9,
        method: 'fuzzy',
      };
    }
  }

  // Stage 3: Semantic — not yet implemented
  return null;
}