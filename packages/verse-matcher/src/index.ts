export { detectVerse } from './pipeline';
export { detectExplicitReference, formatReference } from './regex';
export { buildFuzzyIndex, fuzzyMatch, firstWords } from './fuzzy';
export type { VerseReference } from './regex';
export type { VerseMatch, MatchMethod, PipelineOptions } from './pipeline';
export type { FuzzyIndexEntry, FuzzyMatch } from './fuzzy';