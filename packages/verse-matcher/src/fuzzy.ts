// packages/verse-matcher/src/fuzzy.ts
// Stage 2 — fuzzy first-line matching via fuse.js

import Fuse from 'fuse.js';
import type { VerseReference } from './regex';

export interface FuzzyIndexEntry {
  ref: VerseReference;
  firstLine: string;
}

export interface FuzzyMatch {
  ref: VerseReference;
  score: number;
  normalizedScore: number;
}

let fuse: Fuse<FuzzyIndexEntry> | null = null;

export function buildFuzzyIndex(entries: FuzzyIndexEntry[]): void {
  fuse = new Fuse(entries, {
    keys: ['firstLine'],
    threshold: 0.5,
    includeScore: true,
    minMatchCharLength: 4,
    ignoreLocation: true,
  });
  console.log(`[FuzzyMatcher] Index built: ${entries.length} entries`);
}

export function fuzzyMatch(text: string): FuzzyMatch | null {
  if (!fuse) return null;

  const query = text.trim().slice(0, 60);
  const results = fuse.search(query, { limit: 1 });

  if (!results.length || results[0].score === undefined) return null;

  const best = results[0];
  return {
    ref: best.item.ref,
    score: best.score!,
    normalizedScore: 1 - best.score!,
  };
}

export function firstWords(text: string, n = 8): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}