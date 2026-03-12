// packages/verse-matcher/src/regex.ts
// Stage 1 of the detection pipeline.
// Detects explicit references in many spoken/written forms:
//   "John 3:16", "John 3.16", "John 3 16", "John chapter 3 verse 16",
//   "John three sixteen", "Revelation 21 verse six", "Genesis 1 1"

export interface VerseReference {
  book: string;
  chapter: number;
  verse: number;
  endVerse?: number;
}

// All 66 books + common abbreviations, ordered longest-first so
// greedy matching prefers "1 Corinthians" over "Cor"
const BOOK_MAP: Record<string, string> = {
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
const NUMBER_WORDS: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'twenty one': 21, 'twenty two': 22, 'twenty three': 23, 'twenty four': 24,
  'twenty five': 25, 'twenty six': 26, 'twenty seven': 27, 'twenty eight': 28,
  'twenty nine': 29, 'thirty': 30,
};

function wordToNumber(s: string): number | null {
  const n = parseInt(s, 10);
  if (!isNaN(n)) return n;
  const w = s.toLowerCase().trim();
  return NUMBER_WORDS[w] ?? null;
}

const ALIASES = Object.keys(BOOK_MAP).sort((a, b) => b.length - a.length);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BOOK_PATTERN = ALIASES.map(escapeRegex).join('|');

// Number token: digit string OR number word
const NUM = `(?:\\d{1,3}|${Object.keys(NUMBER_WORDS).sort((a,b) => b.length - a.length).map(escapeRegex).join('|')})`;

// Separator between chapter and verse:
//   colon, dot, dash, "verse", "v", whitespace-only (e.g. "Genesis 1 1")
const SEP = `(?:\\s*[:.\\-]\\s*|\\s+(?:verse|v\\.?)?\\s*)`;

// Optional "chapter N" prefix before the chapter number
const CHAP_PREFIX = `(?:chapter\\s+)?`;

const REF_REGEX = new RegExp(
  `\\b(${BOOK_PATTERN})\\s+${CHAP_PREFIX}(${NUM})${SEP}(${NUM})(?:\\s*[-–]\\s*(${NUM}))?\\b`,
  'gi'
);

export function detectExplicitReference(text: string): VerseReference | null {
  // Normalise: lowercase, collapse whitespace
  const normalised = text.toLowerCase().replace(/\s+/g, ' ').trim();

  REF_REGEX.lastIndex = 0;
  const match = REF_REGEX.exec(normalised);
  if (!match) return null;

  const [, bookRaw, chapterRaw, verseRaw, endVerseRaw] = match;
  const book = BOOK_MAP[bookRaw.toLowerCase().trim()];
  if (!book) return null;

  const chapter  = wordToNumber(chapterRaw);
  const verse    = wordToNumber(verseRaw);
  const endVerse = endVerseRaw ? wordToNumber(endVerseRaw) : undefined;

  if (!chapter || !verse) return null;

  return {
    book,
    chapter,
    verse,
    endVerse: endVerse ?? undefined,
  };
}

export function formatReference(ref: VerseReference): string {
  const base = `${ref.book} ${ref.chapter}:${ref.verse}`;
  return ref.endVerse ? `${base}-${ref.endVerse}` : base;
}