// packages/bible-data/src/index.ts
import fs from 'fs';
import path from 'path';

export interface BibleData {
  [book: string]: {
    [chapter: string]: {
      [verse: string]: string;
    };
  };
}

const cache: Record<string, BibleData> = {};

function findTranslationFile(id: string): string | null {
  const candidates = [
    path.join(__dirname, '..', 'translations', `${id.toLowerCase()}.json`),
    path.join(process.cwd(), 'packages', 'bible-data', 'translations', `${id.toLowerCase()}.json`),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function loadTranslation(id: string): BibleData | null {
  if (cache[id]) return cache[id];

  const filePath = findTranslationFile(id);
  if (!filePath) {
    console.warn(`[BibleData] Translation "${id}" not found`);
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as BibleData;
    cache[id] = data;

    const books = Object.keys(data).length;
    const verses = Object.values(data).reduce((t, chs) =>
      t + Object.values(chs).reduce((t2, vs) => t2 + Object.keys(vs).length, 0), 0
    );
    console.log(`[BibleData] ${id} loaded: ${books} books, ${verses} verses`);
    return data;
  } catch (err: any) {
    console.error(`[BibleData] Failed to load ${id}:`, err.message);
    return null;
  }
}

export function getVerse(
  bible: BibleData,
  book: string,
  chapter: number,
  verse: number
): string | null {
  return bible[book]?.[String(chapter)]?.[String(verse)] ?? null;
}

export function getBooks(bible: BibleData): string[] {
  return Object.keys(bible);
}

export function getAvailableTranslations(): string[] {
  const dir = findTranslationDir();
  if (!dir) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', '').toUpperCase());
}

function findTranslationDir(): string | null {
  const candidates = [
    path.join(__dirname, '..', 'translations'),
    path.join(process.cwd(), 'packages', 'bible-data', 'translations'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}