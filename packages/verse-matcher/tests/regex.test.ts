// packages/verse-matcher/tests/regex.test.ts
// Run: pnpm test
// These tests must pass before any STT integration begins.

import { detectExplicitReference, formatReference } from '../src/regex';

describe('detectExplicitReference', () => {

  // ── Exact matches ──────────────────────────────────────────────────────────

  test('detects standard reference: John 3:16', () => {
    const ref = detectExplicitReference('Turn with me to John 3:16 tonight');
    expect(ref).not.toBeNull();
    expect(ref!.book).toBe('John');
    expect(ref!.chapter).toBe(3);
    expect(ref!.verse).toBe(16);
  });

  test('detects Psalm reference', () => {
    const ref = detectExplicitReference('As it says in Psalms 23:1');
    expect(ref!.book).toBe('Psalms');
    expect(ref!.chapter).toBe(23);
    expect(ref!.verse).toBe(1);
  });

  // ── Abbreviations ─────────────────────────────────────────────────────────

  test('handles Ps. abbreviation', () => {
    const ref = detectExplicitReference('Ps. 23:1 says the Lord is my shepherd');
    expect(ref).not.toBeNull();
    expect(ref!.book).toBe('Psalms');
  });

  test('handles 1 Cor abbreviation', () => {
    const ref = detectExplicitReference('Paul writes in 1 Cor 13:4');
    expect(ref!.book).toBe('1 Corinthians');
    expect(ref!.chapter).toBe(13);
    expect(ref!.verse).toBe(4);
  });

  test('handles Phil abbreviation', () => {
    const ref = detectExplicitReference('Phil 4:13 says I can do all things');
    expect(ref!.book).toBe('Philippians');
  });

  test('handles Jer abbreviation', () => {
    const ref = detectExplicitReference("Jer 29:11 says I know the plans I have for you");
    expect(ref!.book).toBe('Jeremiah');
  });

  // ── Verse ranges ──────────────────────────────────────────────────────────

  test('detects verse range: John 3:16-17', () => {
    const ref = detectExplicitReference('Read with me from John 3:16-17');
    expect(ref!.verse).toBe(16);
    expect(ref!.endVerse).toBe(17);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  test('returns null for non-scripture text', () => {
    const ref = detectExplicitReference('Welcome everyone to our Sunday service');
    expect(ref).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(detectExplicitReference('')).toBeNull();
  });

  test('is case-insensitive', () => {
    const ref = detectExplicitReference('JOHN 3:16');
    expect(ref).not.toBeNull();
    expect(ref!.book).toBe('John');
  });
});

describe('formatReference', () => {
  test('formats single verse', () => {
    expect(formatReference({ book: 'John', chapter: 3, verse: 16 }))
      .toBe('John 3:16');
  });

  test('formats verse range', () => {
    expect(formatReference({ book: 'John', chapter: 3, verse: 16, endVerse: 17 }))
      .toBe('John 3:16-17');
  });
});
