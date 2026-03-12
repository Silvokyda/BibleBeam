// packages/verse-matcher/src/fuzzy.ts
// Stage 2 of the detection pipeline.
// Builds an index of verse first-lines and fuzzy-matches incoming text.
// Install: pnpm add fuse.js

import Fuse from 'fuse.js';
import type { VerseReference } from '@biblebeam/bible-providers';

export interface FuzzyIndexEntry {
  ref: VerseReference;
  firstLine: string; // first 8 words of the verse
}

export interface FuzzyMatch {
  ref: VerseReference;
  score: number; // 0.0 = perfect, 1.0 = no match (Fuse.js convention)
  normalizedScore: number; // inverted: 1.0 = perfect
}

let fuse: Fuse<FuzzyIndexEntry> | null = null;

/**
 * Build (or rebuild) the fuzzy index from a verse list.
 * Call this once on startup, or when the active translation changes.
 * Typical KJV: ~31,000 verses, builds in <50ms.
 */
export function buildFuzzyIndex(entries: FuzzyIndexEntry[]): void {
  fuse = new Fuse(entries, {
    keys: ['firstLine'],
    threshold: 0.5,       // lower = stricter. 0.5 catches paraphrases well
    includeScore: true,
    minMatchCharLength: 4,
    ignoreLocation: true,
  });
}

/**
 * Find the best fuzzy match for a transcript chunk.
 * Returns null if no match is found above the minimum threshold.
 */
export function fuzzyMatch(text: string): FuzzyMatch | null {
  if (!fuse) {
    console.warn('[FuzzyMatcher] Index not built. Call buildFuzzyIndex() first.');
    return null;
  }

  // Use only the first ~60 chars — Deepgram often gives us more context than needed
  const query = text.trim().slice(0, 60);
  const results = fuse.search(query, { limit: 1 });

  if (!results.length || results[0].score === undefined) return null;

  const best = results[0];
  const normalizedScore = 1 - best.score;

  return {
    ref: best.item.ref,
    score: best.score,
    normalizedScore,
  };
}

/** Extract the first N words of a string for index building */
export function firstWords(text: string, n = 8): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}
