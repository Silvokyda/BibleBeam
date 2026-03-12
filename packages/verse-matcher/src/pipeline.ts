// packages/verse-matcher/src/pipeline.ts
// Orchestrates the three detection stages:
//   1. Regex  — explicit references (instant, 100% accurate)
//   2. Fuzzy  — first-line matching (fast, ~5ms)
//   3. Semantic — embedding similarity (slow, opt-in, Phase 3)

import { detectExplicitReference } from './regex';
import { fuzzyMatch } from './fuzzy';
import type { VerseReference } from '@biblebeam/bible-providers';

export type MatchMethod = 'regex' | 'fuzzy' | 'semantic';

export interface VerseMatch {
  reference: VerseReference;
  confidence: number;   // 0.0 – 1.0
  method: MatchMethod;
}

export interface PipelineOptions {
  /**
   * Minimum fuzzy score to return a match (0.0–1.0).
   * Matches below this are discarded entirely.
   * Default: 0.5
   */
  minFuzzyScore?: number;

  /**
   * If true, run semantic matching when fuzzy confidence < this threshold.
   * Default: false (Phase 3 feature)
   */
  semanticEnabled?: boolean;
  semanticThreshold?: number;
}

const DEFAULTS: Required<PipelineOptions> = {
  minFuzzyScore:      0.5,
  semanticEnabled:    false,
  semanticThreshold:  0.75,
};

/**
 * Run the detection pipeline on a final transcript segment.
 * Returns the best match, or null if nothing was detected.
 */
export async function detectVerse(
  text: string,
  options: PipelineOptions = {}
): Promise<VerseMatch | null> {
  const opts = { ...DEFAULTS, ...options };

  // ── Stage 1: Regex ────────────────────────────────────────────────────────
  const explicit = detectExplicitReference(text);
  if (explicit) {
    return {
      reference:  explicit,
      confidence: 1.0,
      method:     'regex',
    };
  }

  // ── Stage 2: Fuzzy ────────────────────────────────────────────────────────
  const fuzzy = fuzzyMatch(text);
  if (fuzzy && fuzzy.normalizedScore >= opts.minFuzzyScore) {
    return {
      reference:  fuzzy.ref,
      confidence: fuzzy.normalizedScore,
      method:     'fuzzy',
    };
  }

  // ── Stage 3: Semantic (Phase 3, opt-in) ───────────────────────────────────
  if (opts.semanticEnabled) {
    // TODO: implement in Phase 3 using @xenova/transformers
    // const semantic = await semanticMatch(text);
    // if (semantic && semantic.score >= opts.semanticThreshold) {
    //   return { reference: semantic.ref, confidence: semantic.score, method: 'semantic' };
    // }
  }

  return null;
}
