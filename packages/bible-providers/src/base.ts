// packages/bible-providers/src/base.ts
// Every Bible source implements this interface.

export interface VerseReference {
  book: string;        // Full book name, e.g. "John", "Psalms", "1 Corinthians"
  chapter: number;
  verse: number;
  endVerse?: number;   // For ranges: John 3:16-17
}

export interface VerseResult {
  reference: VerseReference;
  /** Plain text of the verse, no HTML */
  text: string;
  translation: string; // e.g. "KJV", "ESV"
}

export interface IBibleProvider {
  /** Short translation code displayed in the UI */
  readonly translation: string;

  /** Full translation name */
  readonly translationName: string;

  /** true = user must supply an API key in Settings */
  readonly requiresApiKey: boolean;

  /**
   * Fetch a single verse or range.
   * Should throw if the reference is invalid or the API key is missing.
   */
  getVerse(ref: VerseReference): Promise<VerseResult>;

  /**
   * Full-text search across this translation.
   * Used by verse-matcher to build the fuzzy index.
   * Returns up to `limit` results (default 10) ordered by relevance.
   */
  search(query: string, limit?: number): Promise<VerseResult[]>;
}
