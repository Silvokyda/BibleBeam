// packages/verse-matcher/src/pipeline.ts
// Orchestrates: regex → fuzzy → semantic

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

export async function detectVerse(
  text: string,
  options: PipelineOptions = {}
): Promise<VerseMatch | null> {
  const opts = {
    minFuzzyScore: 0.5,
    semanticEnabled: false,
    semanticThreshold: 0.75,
    ...options,
  };

  // Stage 1: Regex — explicit references
  const explicit = detectExplicitReference(text);
  if (explicit) {
    return {
      reference: explicit,
      referenceString: formatReference(explicit),
      confidence: 1.0,
      method: 'regex',
    };
  }

  // Stage 2: Fuzzy — first-line matching
  const fuzzy = fuzzyMatch(text);
  if (fuzzy && fuzzy.normalizedScore >= opts.minFuzzyScore) {
    return {
      reference: fuzzy.ref,
      referenceString: formatReference(fuzzy.ref),
      confidence: fuzzy.normalizedScore,
      method: 'fuzzy',
    };
  }

  // Stage 3: Semantic — Phase 3, not yet implemented

  return null;
}