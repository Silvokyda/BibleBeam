// src/renderer/pages/Operator.tsx
// Full professional Bible presentation interface — BibleBeam
// Features: verse browser, bookmarks, history, preview monitor, keyboard nav,
//           translation switcher, smart reference search, play/bookmark buttons

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const bb = (window as any).biblebeam;

const OT_BOOKS = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
];
const NT_BOOKS = [
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];
const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

const BOOK_ABBREVS: Record<string, string> = {
  gen: "Genesis",
  exo: "Exodus",
  ex: "Exodus",
  lev: "Leviticus",
  num: "Numbers",
  deut: "Deuteronomy",
  deu: "Deuteronomy",
  josh: "Joshua",
  judg: "Judges",
  "1sam": "1 Samuel",
  "2sam": "2 Samuel",
  "1kgs": "1 Kings",
  "1kings": "1 Kings",
  "2kgs": "2 Kings",
  "2kings": "2 Kings",
  "1chr": "1 Chronicles",
  "2chr": "2 Chronicles",
  neh: "Nehemiah",
  esth: "Esther",
  psa: "Psalms",
  ps: "Psalms",
  prov: "Proverbs",
  pro: "Proverbs",
  eccl: "Ecclesiastes",
  ecc: "Ecclesiastes",
  song: "Song of Solomon",
  isa: "Isaiah",
  jer: "Jeremiah",
  lam: "Lamentations",
  ezek: "Ezekiel",
  dan: "Daniel",
  hos: "Hosea",
  obad: "Obadiah",
  jon: "Jonah",
  mic: "Micah",
  nah: "Nahum",
  hab: "Habakkuk",
  zeph: "Zephaniah",
  hag: "Haggai",
  zech: "Zechariah",
  mal: "Malachi",
  matt: "Matthew",
  mat: "Matthew",
  mk: "Mark",
  lk: "Luke",
  jn: "John",
  rom: "Romans",
  "1cor": "1 Corinthians",
  "2cor": "2 Corinthians",
  gal: "Galatians",
  eph: "Ephesians",
  phil: "Philippians",
  php: "Philippians",
  col: "Colossians",
  "1thess": "1 Thessalonians",
  "2thess": "2 Thessalonians",
  "1tim": "1 Timothy",
  "2tim": "2 Timothy",
  tit: "Titus",
  phlm: "Philemon",
  heb: "Hebrews",
  jas: "James",
  "1pet": "1 Peter",
  "2pet": "2 Peter",
  "1jn": "1 John",
  "2jn": "2 John",
  "3jn": "3 John",
  rev: "Revelation",
};

const CHAPTER_COUNTS: Record<string, number> = {
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Kings": 22,
  "2 Kings": 25,
  "1 Chronicles": 29,
  "2 Chronicles": 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 10,
  Job: 42,
  Psalms: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  "Song of Solomon": 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 12,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  "1 Corinthians": 16,
  "2 Corinthians": 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  "1 Thessalonians": 5,
  "2 Thessalonians": 3,
  "1 Timothy": 6,
  "2 Timothy": 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  "1 Peter": 5,
  "2 Peter": 3,
  "1 John": 5,
  "2 John": 1,
  "3 John": 1,
  Jude: 1,
  Revelation: 22,
};

const TRANSLATIONS = ["KJV", "ASV", "WEB", "ESV"];

interface VerseItem {
  verse: number;
  text: string;
}
interface VerseRef {
  reference: string;
  verseText: string;
  translation: string;
}
interface DetectedVerse extends VerseRef {
  id: number;
  confidence: number;
  method: string;
  ts: number;
}
interface TranscriptLine {
  id: number;
  text: string;
  isFinal: boolean;
  ts: number;
}

let _id = 0;
const uid = () => ++_id;

function parseSmartRef(
  input: string,
): { book: string; chapter: number; verse: number } | null {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[:.]/g, " ")
    .replace(/\s+/g, " ");
  const m = s.match(
    /^((?:[123]\s*)?[a-z]+(?:\s+of\s+solomon)?)\s+(\d+)\s+(\d+)$/,
  );
  if (!m) return null;
  const bookKey = m[1].replace(/\s+/g, "");
  const bookFull =
    BOOK_ABBREVS[bookKey] ||
    ALL_BOOKS.find((b) => b.toLowerCase().startsWith(m[1])) ||
    ALL_BOOKS.find((b) => b.toLowerCase() === m[1]);
  if (!bookFull) return null;
  return { book: bookFull, chapter: parseInt(m[2]), verse: parseInt(m[3]) };
}

export function Operator() {
  const navigate = useNavigate();
  const [selectedBook, setSelectedBook] = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(3);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [verses, setVerses] = useState<VerseItem[]>([]);
  const [translation, setTranslation] = useState("KJV");
  const [bookSearch, setBookSearch] = useState("");
  const [rightTab, setRightTab] = useState<"history" | "bookmarks" | "queue">(
    "history",
  );
  const [liveVerse, setLiveVerse] = useState<VerseRef | null>(null);
  const [previewVerse, setPreviewVerse] = useState<VerseRef | null>(null);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [history, setHistory] = useState<VerseRef[]>([]);
  const [bookmarks, setBookmarks] = useState<VerseRef[]>([]);
  const [queue, setQueue] = useState<DetectedVerse[]>([]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VerseRef[]>([]);
  const [searching, setSearching] = useState(false);
  const verseListRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const data = await bb?.getVerses?.({
        book: selectedBook,
        chapter: selectedChapter,
        translation,
      });
      setVerses(data?.length ? data : []);
      setSelectedVerse(null);
    })();
  }, [selectedBook, selectedChapter, translation]);

  useEffect(() => {
    if (selectedVerse && verseListRef.current) {
      const el = verseListRef.current.querySelector(
        `[data-verse="${selectedVerse}"]`,
      ) as HTMLElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedVerse, verses]);

  useEffect(() => {
    (async () => setProjectorOpen(!!(await bb?.getProjectorStatus?.())))();
    const u1 = bb?.onProjectorStatus?.((v: boolean) => setProjectorOpen(v));
    const u2 = bb?.onTranscript?.((p: any) => {
      setTranscript((prev) => {
        const lines = [...prev];
        if (!p.isFinal && lines.length && !lines[lines.length - 1].isFinal) {
          lines[lines.length - 1] = {
            ...lines[lines.length - 1],
            text: p.text,
          };
          return lines;
        }
        return [
          ...lines,
          { id: uid(), text: p.text, isFinal: p.isFinal, ts: Date.now() },
        ].slice(-80);
      });
      setTimeout(() => {
        if (transcriptRef.current) transcriptRef.current.scrollTop = 99999;
      }, 50);
    });
    const u3 = bb?.onVerseDetected?.((p: any) => {
      const v: DetectedVerse = { id: uid(), ...p, ts: Date.now() };
      if (p.confidence >= 0.85) {
        goLive({
          reference: p.reference,
          verseText: p.verseText,
          translation: p.translation || translation,
        });
        navigateToBibleRef(p.reference);
      } else {
        setQueue((q) => [v, ...q].slice(0, 20));
        setRightTab("queue");
      }
    });
    return () => {
      u1?.();
      u2?.();
      u3?.();
    };
  }, [translation]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "PageDown") {
        e.preventDefault();
        goNextVerse();
      } else if (e.key === "PageUp") {
        e.preventDefault();
        goPrevVerse();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [verses, selectedVerse, selectedBook, selectedChapter]);

  function goLive(ref: VerseRef) {
    setLiveVerse(ref);
    setHistory((h) =>
      [ref, ...h.filter((x) => x.reference !== ref.reference)].slice(0, 50),
    );
    bb?.approveVerse?.(ref);
  }
  function goPreview(ref: VerseRef) {
    setPreviewVerse(ref);
  }
  function addBookmark(ref: VerseRef) {
    setBookmarks((b) =>
      b.find((x) => x.reference === ref.reference) ? b : [ref, ...b],
    );
  }
  function removeBookmark(ref: string) {
    setBookmarks((b) => b.filter((x) => x.reference !== ref));
  }
  function clearScreen() {
    setLiveVerse(null);
    setPreviewVerse(null);
    bb?.clearVerse?.();
  }

  function makeRef(v: VerseItem): VerseRef {
    return {
      reference: `${selectedBook} ${selectedChapter}:${v.verse}`,
      verseText: v.text,
      translation,
    };
  }
  function sendVerseToLive(v: VerseItem) {
    setSelectedVerse(v.verse);
    goLive(makeRef(v));
  }
  function sendVerseToPreview(v: VerseItem) {
    setSelectedVerse(v.verse);
    goPreview(makeRef(v));
  }
  function bookmarkVerse(v: VerseItem) {
    addBookmark(makeRef(v));
    setRightTab("bookmarks");
  }

  function goNextVerse() {
    if (!verses.length) return;
    const idx = selectedVerse
      ? verses.findIndex((v) => v.verse === selectedVerse)
      : -1;
    if (idx < verses.length - 1) {
      sendVerseToLive(verses[idx + 1]);
    } else {
      const max = CHAPTER_COUNTS[selectedBook] || 1;
      if (selectedChapter < max) setSelectedChapter((c) => c + 1);
    }
  }
  function goPrevVerse() {
    if (!verses.length) return;
    const idx = selectedVerse
      ? verses.findIndex((v) => v.verse === selectedVerse)
      : 0;
    if (idx > 0) {
      sendVerseToLive(verses[idx - 1]);
    } else if (selectedChapter > 1) setSelectedChapter((c) => c - 1);
  }

  function navigateToBibleRef(reference: string) {
    const m = reference.match(/^(.+?)\s+(\d+):(\d+)/);
    if (m) {
      const book =
        ALL_BOOKS.find((b) => b.toLowerCase() === m[1].toLowerCase()) || m[1];
      setSelectedBook(book);
      setSelectedChapter(parseInt(m[2]));
      setSelectedVerse(parseInt(m[3]));
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    const parsed = parseSmartRef(searchQuery);
    if (parsed) {
      const data = await bb?.getVerses?.({
        book: parsed.book,
        chapter: parsed.chapter,
        translation,
      });
      const match = data?.find((v: VerseItem) => v.verse === parsed.verse);
      if (match) {
        setSearchResults([
          {
            reference: `${parsed.book} ${parsed.chapter}:${parsed.verse}`,
            verseText: match.text,
            translation,
          },
        ]);
        setSearching(false);
        return;
      }
    }
    const results =
      (await bb?.searchVerses?.({ query: searchQuery, translation })) || [];
    setSearchResults(results);
    setSearching(false);
  }

  const chapterCount = CHAPTER_COUNTS[selectedBook] || 50;
  const filteredBooks = ALL_BOOKS.filter((b) =>
    b.toLowerCase().includes(bookSearch.toLowerCase()),
  );
  const LiveIcon = () => (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
  const PrevIcon = () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
  const NextIcon = () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );

  return (
    <div style={s.root}>
      {/* TOP BAR */}
      <header style={s.topBar}>
        <div style={s.topLeft}>
          <div style={s.logo}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            <span style={s.logoText}>BibleBeam</span>
          </div>
          {/* Translation switcher */}
          <div style={s.transSwitcher}>
            {TRANSLATIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTranslation(t)}
                style={{
                  ...s.transBtn,
                  ...(translation === t ? s.transBtnOn : {}),
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={s.topPills}>
            {listening && (
              <span className="pill pill-green">
                <span style={s.dot} />
                Live
              </span>
            )}
            {projectorOpen && <span className="pill pill-blue">Projector</span>}
            {liveVerse && (
              <span className="pill pill-amber">
                <span style={{ ...s.dot, background: "var(--amber)" }} />{" "}
                {liveVerse.reference}
              </span>
            )}
          </div>
        </div>
        <div style={s.topRight}>
          <span style={s.kbdHint}>
            <kbd style={s.kbd}>PgUp</kbd> prev · <kbd style={s.kbd}>PgDn</kbd>{" "}
            next
          </span>
          <button
            onClick={() =>
              projectorOpen ? bb?.closeProjector?.() : bb?.openProjector?.()
            }
            style={projectorOpen ? s.btnProjOn : s.btnProjOff}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ marginRight: 4 }}
            >
              <rect width="20" height="15" x="2" y="3" rx="2" />
              <line x1="8" x2="16" y1="21" y2="21" />
              <line x1="12" x2="12" y1="18" y2="21" />
            </svg>
            {projectorOpen ? "Close" : "Open"} projector
          </button>
          <button onClick={() => navigate("/settings")} style={s.btnIcon}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            onClick={() =>
              listening
                ? bb?.stopListening?.().then(() => setListening(false))
                : bb?.startListening?.().then(() => setListening(true))
            }
            style={listening ? s.btnStop : s.btnStart}
          >
            {listening ? (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ marginRight: 4 }}
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: 4 }}
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                Start listening
              </>
            )}
          </button>
        </div>
      </header>

      {/* BODY */}
      <div style={s.body}>
        {/* COL 1: Reference navigator */}
        <div style={s.col1}>
          <div style={s.colHdr}>Reference</div>
          <div style={{ padding: "5px 5px 2px" }}>
            <input
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              placeholder="Search books…"
              style={s.bookSearch}
            />
          </div>
          <div style={s.bookList}>
            {bookSearch === "" && <div style={s.grpLabel}>OLD TESTAMENT</div>}
            {filteredBooks
              .filter((b) => bookSearch !== "" || OT_BOOKS.includes(b))
              .map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setSelectedBook(b);
                    setSelectedChapter(1);
                  }}
                  style={{
                    ...s.bookBtn,
                    ...(selectedBook === b ? s.bookBtnOn : {}),
                  }}
                >
                  {b}
                </button>
              ))}
            {bookSearch === "" && (
              <div style={{ ...s.grpLabel, marginTop: 5 }}>NEW TESTAMENT</div>
            )}
            {filteredBooks
              .filter((b) => bookSearch !== "" || NT_BOOKS.includes(b))
              .map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setSelectedBook(b);
                    setSelectedChapter(1);
                  }}
                  style={{
                    ...s.bookBtn,
                    ...(selectedBook === b ? s.bookBtnOn : {}),
                  }}
                >
                  {b}
                </button>
              ))}
          </div>
          <div style={s.chWrap}>
            <div style={s.secLabel}>Chapter</div>
            <div style={s.chGrid}>
              {Array.from({ length: chapterCount }, (_, i) => i + 1).map(
                (ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChapter(ch)}
                    style={{
                      ...s.chBtn,
                      ...(selectedChapter === ch ? s.chBtnOn : {}),
                    }}
                  >
                    {ch}
                  </button>
                ),
              )}
            </div>
          </div>
          <div style={s.arrowRow}>
            <button onClick={goPrevVerse} style={s.arrBtn} title="Prev verse">
              <PrevIcon />
            </button>
            <button onClick={goNextVerse} style={s.arrBtn} title="Next verse">
              <NextIcon />
            </button>
            <button
              onClick={() => setSelectedChapter((c) => Math.max(1, c - 1))}
              style={s.arrBtn}
              title="Prev chapter"
            >
              ▲
            </button>
            <button
              onClick={() =>
                setSelectedChapter((c) => Math.min(chapterCount, c + 1))
              }
              style={s.arrBtn}
              title="Next chapter"
            >
              ▼
            </button>
          </div>
        </div>

        {/* COL 2: Verse browser */}
        <div style={s.col2}>
          <div style={s.col2Hdr}>
            <span style={s.col2Title}>
              {selectedBook} {selectedChapter}{" "}
              <span style={s.col2Sub}>({translation})</span>
            </span>
            <div style={{ display: "flex", gap: 3 }}>
              <button
                onClick={() => setSelectedChapter((c) => Math.max(1, c - 1))}
                style={s.navBtn}
              >
                ‹
              </button>
              <button
                onClick={() =>
                  setSelectedChapter((c) => Math.min(chapterCount, c + 1))
                }
                style={s.navBtn}
              >
                ›
              </button>
            </div>
          </div>

          <div style={s.verseList} ref={verseListRef}>
            {verses.length === 0 ? (
              <div style={s.emptyPane}>
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{ color: "var(--text4)", marginBottom: 8 }}
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  Wire bb.getVerses() to load verses
                </span>
              </div>
            ) : (
              verses.map((v) => {
                const ref = `${selectedBook} ${selectedChapter}:${v.verse}`;
                const isLive = liveVerse?.reference === ref;
                const isPreview = previewVerse?.reference === ref && !isLive;
                const isSelected =
                  selectedVerse === v.verse && !isLive && !isPreview;
                const isBookmarked = bookmarks.some((b) => b.reference === ref);
                return (
                  <div
                    key={v.verse}
                    data-verse={v.verse}
                    style={{
                      ...s.vRow,
                      ...(isLive
                        ? s.vRowLive
                        : isPreview
                          ? s.vRowPreview
                          : isSelected
                            ? s.vRowSel
                            : {}),
                    }}
                  >
                    <span style={s.vNum}>{v.verse}</span>
                    <span style={s.vText} onClick={() => sendVerseToPreview(v)}>
                      {v.text}
                    </span>
                    <div style={s.vBtns}>
                      <button
                        onClick={() => sendVerseToLive(v)}
                        style={s.playBtn}
                        title="Send to projector (live)"
                      >
                        <LiveIcon />
                      </button>
                      <button
                        onClick={() => bookmarkVerse(v)}
                        style={{
                          ...s.bmBtn,
                          ...(isBookmarked ? s.bmBtnOn : {}),
                        }}
                        title="Bookmark"
                      >
                        {isBookmarked ? "★" : "+"}
                      </button>
                    </div>
                    {isLive && <span style={s.liveTag}>LIVE</span>}
                    {isPreview && <span style={s.previewTag}>PREVIEW</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Search */}
          <div style={s.searchWrap}>
            <div style={s.searchLabel}>
              Search{" "}
              <span style={{ fontWeight: 400, color: "var(--text4)" }}>
                — "gen 1 1", "matt 7 7", or any phrase
              </span>
            </div>
            <form onSubmit={handleSearch} style={s.searchRow}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='gen 1 1 · john 3 16 · "love one another"'
                style={s.searchInput}
              />
              <button type="submit" style={s.searchBtn} disabled={searching}>
                {searching ? "…" : "Search"}
              </button>
            </form>
            {searchResults.length > 0 && (
              <div style={s.srList}>
                {searchResults.slice(0, 30).map((r, i) => (
                  <div
                    key={i}
                    style={s.srRow}
                    onClick={() => {
                      navigateToBibleRef(r.reference);
                      goPreview(r);
                    }}
                  >
                    <span style={s.srRef}>{r.reference}</span>
                    <span style={s.srText}>{r.verseText}</span>
                    <div style={s.srBtns}>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          goLive(r);
                        }}
                        style={s.playBtn}
                        title="Live"
                      >
                        <LiveIcon />
                      </button>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          addBookmark(r);
                          setRightTab("bookmarks");
                        }}
                        style={s.bmBtn}
                        title="Bookmark"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COL 3: Monitor + panels */}
        <div style={s.col3}>
          {/* BIG MONITOR PREVIEW - top, prominent */}
          <div style={s.monBlock}>
            <div style={s.monHdr}>
              <span style={s.monLabel}>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginRight: 4 }}
                >
                  <rect width="20" height="15" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="18" y2="21" />
                </svg>
                Monitor
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {liveVerse && (
                  <span className="pill pill-green" style={{ fontSize: 9 }}>
                    LIVE
                  </span>
                )}
                {previewVerse && !liveVerse && (
                  <span className="pill pill-amber" style={{ fontSize: 9 }}>
                    PREVIEW
                  </span>
                )}
                {liveVerse && (
                  <button onClick={clearScreen} style={s.clearBtn}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div style={s.monScreen}>
              {liveVerse || previewVerse ? (
                (() => {
                  const v = liveVerse || previewVerse!;
                  return (
                    <div style={s.monContent}>
                      <div style={s.monRef}>
                        {v.reference} · {v.translation}
                      </div>
                      <div style={s.monVerse}>{v.verseText}</div>
                    </div>
                  );
                })()
              ) : (
                <div style={s.monEmpty}>
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    style={{ opacity: 0.15, marginBottom: 6 }}
                  >
                    <rect width="20" height="15" x="2" y="3" rx="2" />
                    <line x1="8" x2="16" y1="21" y2="21" />
                    <line x1="12" x2="12" y1="18" y2="21" />
                  </svg>
                  <span
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}
                  >
                    No verse on screen
                  </span>
                </div>
              )}
            </div>
            <div style={s.monCtrlRow}>
              <button onClick={goPrevVerse} style={s.monNavBtn}>
                <PrevIcon />
              </button>
              <button
                onClick={() => {
                  if (previewVerse) goLive(previewVerse);
                }}
                style={s.monShowBtn}
                disabled={!previewVerse}
              >
                Show on Projector
              </button>
              <button onClick={goNextVerse} style={s.monNavBtn}>
                <NextIcon />
              </button>
            </div>
          </div>

          {/* Tabs: History / Bookmarks / AI Queue */}
          <div style={s.rTabs}>
            {(["history", "bookmarks", "queue"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                style={{ ...s.rTab, ...(rightTab === tab ? s.rTabOn : {}) }}
              >
                {tab === "history"
                  ? "History"
                  : tab === "bookmarks"
                    ? `Bookmarks${bookmarks.length ? ` (${bookmarks.length})` : ""}`
                    : `AI Queue${queue.length ? ` (${queue.length})` : ""}`}
              </button>
            ))}
          </div>

          <div style={s.rBody}>
            {/* HISTORY */}
            {rightTab === "history" && (
              <div style={s.listPane}>
                {history.length === 0 ? (
                  <div style={s.emptyPane}>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>
                      No history yet
                    </span>
                  </div>
                ) : (
                  history.map((v, i) => (
                    <div
                      key={i}
                      style={{
                        ...s.listRow,
                        ...(liveVerse?.reference === v.reference
                          ? s.listRowLive
                          : {}),
                      }}
                    >
                      <div
                        onClick={() => {
                          navigateToBibleRef(v.reference);
                          goLive(v);
                        }}
                        style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
                      >
                        <div style={s.listRef}>
                          {v.reference}{" "}
                          <span style={s.listTrans}>{v.translation}</span>
                        </div>
                        <div style={s.listText}>
                          {v.verseText?.slice(0, 65)}
                          {(v.verseText?.length ?? 0) > 65 ? "…" : ""}
                        </div>
                      </div>
                      <div style={s.listBtns}>
                        <button
                          onClick={() => goLive(v)}
                          style={s.playBtn}
                          title="Live"
                        >
                          <LiveIcon />
                        </button>
                        <button
                          onClick={() => addBookmark(v)}
                          style={s.bmBtn}
                          title="Bookmark"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* BOOKMARKS */}
            {rightTab === "bookmarks" && (
              <div style={s.listPane}>
                {bookmarks.length === 0 ? (
                  <div style={s.emptyPane}>
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ color: "var(--text4)", marginBottom: 5 }}
                    >
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>
                      No bookmarks yet
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text4)",
                        textAlign: "center",
                        marginTop: 2,
                      }}
                    >
                      Click + on any verse to bookmark it
                    </span>
                  </div>
                ) : (
                  bookmarks.map((v, i) => (
                    <div
                      key={i}
                      style={{
                        ...s.listRow,
                        ...(liveVerse?.reference === v.reference
                          ? s.listRowLive
                          : {}),
                      }}
                    >
                      <div
                        onClick={() => goPreview(v)}
                        style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
                        title="Click → preview  •  Double-click → live"
                      >
                        <div style={s.listRef}>
                          {v.reference}{" "}
                          <span style={s.listTrans}>{v.translation}</span>
                        </div>
                        <div style={s.listText}>
                          {v.verseText?.slice(0, 65)}
                          {(v.verseText?.length ?? 0) > 65 ? "…" : ""}
                        </div>
                      </div>
                      <div style={s.listBtns}>
                        <button
                          onClick={() => goPreview(v)}
                          style={s.previewBtn}
                          title="Preview"
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <rect width="18" height="14" x="3" y="5" rx="2" />
                            <polyline points="10,9 15,12 10,15" />
                          </svg>
                        </button>
                        <button
                          onDoubleClick={() => goLive(v)}
                          onClick={() => goLive(v)}
                          style={s.playBtn}
                          title="Live (double-tap)"
                        >
                          <LiveIcon />
                        </button>
                        <button
                          onClick={() => removeBookmark(v.reference)}
                          style={s.rmBtn}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* AI QUEUE */}
            {rightTab === "queue" && (
              <div style={s.listPane}>
                {queue.length === 0 ? (
                  <div style={s.emptyPane}>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>
                      {listening
                        ? "Listening for Bible verses…"
                        : "Start listening to detect verses"}
                    </span>
                  </div>
                ) : (
                  queue.map((v) => (
                    <div key={v.id} style={s.qCard} className="animate-in">
                      <div style={s.qTop}>
                        <span style={s.qRef}>{v.reference}</span>
                        <span
                          className={`pill pill-${v.method === "regex" ? "green" : v.method === "fuzzy" ? "amber" : "purple"}`}
                        >
                          {v.method}
                        </span>
                      </div>
                      <p style={s.qText}>
                        {v.verseText?.slice(0, 75)}
                        {(v.verseText?.length ?? 0) > 75 ? "…" : ""}
                      </p>
                      <div style={s.qConf}>
                        <div style={s.qBar}>
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 2,
                              width: `${v.confidence * 100}%`,
                              background:
                                v.confidence >= 0.8
                                  ? "var(--accent)"
                                  : "var(--amber)",
                            }}
                          />
                        </div>
                        <span style={s.qScore}>
                          {Math.round(v.confidence * 100)}%
                        </span>
                      </div>
                      <div style={s.qBtns}>
                        <button
                          onClick={() => {
                            goLive(v);
                            setQueue((q) => q.filter((x) => x.id !== v.id));
                            navigateToBibleRef(v.reference);
                          }}
                          style={s.btnShow}
                        >
                          Show
                        </button>
                        <button
                          onClick={() =>
                            setQueue((q) => q.filter((x) => x.id !== v.id))
                          }
                          style={s.btnDismiss}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                )}
                {transcript.length > 0 && (
                  <div style={s.txMini} ref={transcriptRef}>
                    {transcript.slice(-8).map((l) => (
                      <div
                        key={l.id}
                        style={{ ...s.txLine, opacity: l.isFinal ? 1 : 0.4 }}
                      >
                        <span style={s.txTime}>
                          {new Date(l.ts).toLocaleTimeString("en", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>
                          {l.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "var(--bg)",
    overflow: "hidden",
  },
  // topbar
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 46,
    padding: "0 10px 0 12px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg2)",
    flexShrink: 0,
  },
  topLeft: { display: "flex", alignItems: "center", gap: 8 },
  topRight: { display: "flex", alignItems: "center", gap: 5 },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "var(--accent)",
  },
  logoText: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    color: "var(--text)",
  },
  topPills: { display: "flex", gap: 5 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--accent)",
    display: "inline-block",
    animation: "pulse-dot 1.5s ease-in-out infinite",
  },
  transSwitcher: {
    display: "flex",
    gap: 2,
    background: "var(--bg3)",
    padding: "2px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
  },
  transBtn: {
    padding: "3px 7px",
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "var(--mono)",
    background: "transparent",
    color: "var(--text3)",
    borderRadius: "var(--radius-sm)",
    letterSpacing: "0.04em",
  },
  transBtnOn: { background: "var(--accent)", color: "var(--text-inverse)" },
  kbdHint: { fontSize: 10, color: "var(--text4)" },
  kbd: {
    background: "var(--bg3)",
    border: "1px solid var(--border2)",
    borderRadius: 3,
    padding: "1px 4px",
    fontFamily: "var(--mono)",
    fontSize: 9,
    color: "var(--text3)",
  },
  btnStart: {
    display: "inline-flex",
    alignItems: "center",
    background: "var(--accent)",
    color: "var(--text-inverse)",
    padding: "5px 12px",
    fontWeight: 600,
    fontSize: 12,
    borderRadius: "var(--radius)",
  },
  btnStop: {
    display: "inline-flex",
    alignItems: "center",
    background: "var(--red)",
    color: "#fff",
    padding: "5px 12px",
    fontWeight: 600,
    fontSize: 12,
    borderRadius: "var(--radius)",
  },
  btnIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    color: "var(--text2)",
    width: 30,
    height: 30,
    padding: 0,
    borderRadius: "var(--radius)",
  },
  btnProjOff: {
    display: "inline-flex",
    alignItems: "center",
    background: "var(--bg3)",
    border: "1px solid var(--border2)",
    color: "var(--text2)",
    padding: "4px 9px",
    fontSize: 11,
    borderRadius: "var(--radius)",
  },
  btnProjOn: {
    display: "inline-flex",
    alignItems: "center",
    background: "var(--blue-dim)",
    border: "1px solid var(--blue-border)",
    color: "var(--blue)",
    padding: "4px 9px",
    fontSize: 11,
    borderRadius: "var(--radius)",
  },
  // body
  body: { display: "flex", flex: 1, overflow: "hidden" },
  // col1
  col1: {
    width: 175,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--border)",
    background: "var(--bg2)",
    overflow: "hidden",
  },
  colHdr: {
    padding: "7px 8px 5px",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "var(--mono)",
    borderBottom: "1px solid var(--border-subtle)",
    flexShrink: 0,
  },
  bookSearch: { padding: "4px 6px", fontSize: 11, width: "100%" },
  bookList: { flex: "1 1 0", overflowY: "auto", padding: "0 3px" },
  grpLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "var(--text4)",
    letterSpacing: "0.1em",
    padding: "4px 5px 1px",
    textTransform: "uppercase",
  },
  bookBtn: {
    width: "100%",
    textAlign: "left",
    padding: "4px 5px",
    fontSize: 11,
    background: "transparent",
    color: "var(--text2)",
    borderRadius: "var(--radius-sm)",
  },
  bookBtnOn: {
    background: "var(--accent-dim)",
    color: "var(--accent)",
    fontWeight: 600,
  },
  chWrap: {
    flexShrink: 0,
    borderTop: "1px solid var(--border)",
    padding: "5px",
    maxHeight: 155,
    overflowY: "auto",
  },
  secLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "var(--text4)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  chGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2 },
  chBtn: {
    padding: "3px 1px",
    fontSize: 10,
    textAlign: "center",
    background: "var(--bg3)",
    color: "var(--text2)",
    borderRadius: 3,
  },
  chBtnOn: {
    background: "var(--accent)",
    color: "var(--text-inverse)",
    fontWeight: 700,
  },
  arrowRow: {
    display: "flex",
    gap: 3,
    padding: "5px",
    borderTop: "1px solid var(--border)",
    flexShrink: 0,
  },
  arrBtn: {
    flex: 1,
    padding: "5px 0",
    fontSize: 12,
    background: "var(--bg3)",
    border: "1px solid var(--border2)",
    color: "var(--text2)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  // col2
  col2: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--border)",
    overflow: "hidden",
  },
  col2Hdr: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 10px",
    height: 35,
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--bg2)",
    flexShrink: 0,
  },
  col2Title: { fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em" },
  col2Sub: { fontSize: 11, color: "var(--text3)", fontWeight: 400 },
  navBtn: {
    padding: "2px 8px",
    fontSize: 13,
    background: "var(--bg3)",
    border: "1px solid var(--border2)",
    color: "var(--text2)",
    borderRadius: "var(--radius-sm)",
  },
  verseList: { flex: 1, overflowY: "auto" },
  vRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 7,
    padding: "6px 10px",
    borderBottom: "1px solid var(--border-subtle)",
    cursor: "pointer",
    position: "relative",
    transition: "background 80ms",
  },
  vRowLive: {
    background: "rgba(34,197,94,0.09)",
    borderLeft: "3px solid var(--accent)",
  },
  vRowPreview: {
    background: "rgba(245,158,11,0.07)",
    borderLeft: "3px solid var(--amber)",
  },
  vRowSel: { background: "var(--bg-hover)" },
  vNum: {
    fontFamily: "var(--mono)",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--accent)",
    minWidth: 18,
    flexShrink: 0,
    paddingTop: 2,
  },
  vText: { flex: 1, fontSize: 13, lineHeight: 1.65, color: "var(--text)" },
  vBtns: { display: "flex", gap: 2, flexShrink: 0, paddingTop: 2 },
  playBtn: {
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--accent-dim)",
    border: "1px solid var(--accent-border)",
    color: "var(--accent)",
    borderRadius: 3,
  },
  bmBtn: {
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg3)",
    border: "1px solid var(--border2)",
    color: "var(--text2)",
    borderRadius: 3,
    fontSize: 12,
  },
  bmBtnOn: {
    background: "var(--amber-dim)",
    border: "1px solid var(--amber-border)",
    color: "var(--amber)",
  },
  liveTag: {
    position: "absolute",
    right: 4,
    top: 3,
    fontSize: 8,
    fontFamily: "var(--mono)",
    fontWeight: 700,
    color: "var(--accent)",
    letterSpacing: "0.06em",
  },
  previewTag: {
    position: "absolute",
    right: 4,
    top: 3,
    fontSize: 8,
    fontFamily: "var(--mono)",
    fontWeight: 700,
    color: "var(--amber)",
    letterSpacing: "0.06em",
  },
  // search
  searchWrap: {
    flexShrink: 0,
    borderTop: "1px solid var(--border)",
    background: "var(--bg2)",
    padding: "7px 10px",
  },
  searchLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text3)",
    fontFamily: "var(--mono)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 4,
  },
  searchRow: { display: "flex", gap: 5 },
  searchInput: {
    flex: 1,
    fontSize: 11,
    padding: "5px 7px",
    fontFamily: "var(--mono)",
  },
  searchBtn: {
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 600,
    background: "var(--accent)",
    color: "var(--text-inverse)",
    borderRadius: "var(--radius)",
  },
  srList: {
    marginTop: 5,
    maxHeight: 155,
    overflowY: "auto",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
  },
  srRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    padding: "5px 7px",
    borderBottom: "1px solid var(--border-subtle)",
    cursor: "pointer",
  },
  srRef: {
    fontFamily: "var(--mono)",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--accent)",
    minWidth: 75,
    flexShrink: 0,
  },
  srText: { flex: 1, fontSize: 11, color: "var(--text2)", lineHeight: 1.4 },
  srBtns: { display: "flex", gap: 3, flexShrink: 0 },
  // col3
  col3: {
    width: 290,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: "var(--bg)",
    overflow: "hidden",
  },
  monBlock: {
    flexShrink: 0,
    background: "var(--bg2)",
    borderBottom: "1px solid var(--border)",
  },
  monHdr: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 9px",
    height: 30,
    borderBottom: "1px solid var(--border-subtle)",
  },
  monLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "var(--mono)",
  },
  clearBtn: {
    padding: "2px 7px",
    fontSize: 9,
    background: "var(--red-dim)",
    border: "1px solid var(--red-border)",
    color: "var(--red)",
    borderRadius: "var(--radius-sm)",
  },
  monScreen: {
    background: "#000",
    margin: "7px",
    borderRadius: "var(--radius-md)",
    border: "1px solid #1e1e1e",
    minHeight: 155,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px",
    overflow: "hidden",
  },
  monContent: { textAlign: "center", width: "100%" },
  monRef: {
    fontSize: 9,
    fontFamily: "var(--mono)",
    color: "rgba(255,255,255,0.28)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  monVerse: { fontSize: 14, color: "#fff", lineHeight: 1.55, fontWeight: 300 },
  monEmpty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  monCtrlRow: { display: "flex", gap: 4, padding: "0 7px 7px" },
  monNavBtn: {
    width: 30,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg3)",
    border: "1px solid var(--border2)",
    color: "var(--text2)",
    borderRadius: "var(--radius-sm)",
  },
  monShowBtn: {
    flex: 1,
    padding: "5px",
    fontSize: 11,
    fontWeight: 600,
    background: "var(--accent)",
    color: "var(--text-inverse)",
    borderRadius: "var(--radius-sm)",
  },
  // right tabs
  rTabs: {
    display: "flex",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  },
  rTab: {
    flex: 1,
    padding: "6px 2px",
    fontSize: 10,
    fontWeight: 600,
    background: "transparent",
    color: "var(--text3)",
    borderBottom: "2px solid transparent",
    borderRadius: 0,
  },
  rTabOn: { color: "var(--text)", borderBottomColor: "var(--accent)" },
  rBody: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  listPane: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  listRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    padding: "7px 9px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  listRowLive: {
    background: "rgba(34,197,94,0.07)",
    borderLeft: "3px solid var(--accent)",
  },
  listRef: {
    fontFamily: "var(--mono)",
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 1,
  },
  listTrans: {
    fontFamily: "var(--mono)",
    fontSize: 9,
    color: "var(--text4)",
    textTransform: "uppercase",
    fontWeight: 400,
    marginLeft: 4,
  },
  listText: { fontSize: 11, color: "var(--text3)", lineHeight: 1.4 },
  listBtns: { display: "flex", gap: 3, flexShrink: 0, paddingTop: 1 },
  previewBtn: {
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--amber-dim)",
    border: "1px solid var(--amber-border)",
    color: "var(--amber)",
    borderRadius: 3,
  },
  rmBtn: {
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--red-dim)",
    border: "1px solid var(--red-border)",
    color: "var(--red)",
    borderRadius: 3,
    fontSize: 9,
  },
  qCard: { padding: "7px 9px", borderBottom: "1px solid var(--border-subtle)" },
  qTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  qRef: { fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700 },
  qText: {
    fontSize: 11,
    color: "var(--text2)",
    lineHeight: 1.4,
    marginBottom: 4,
  },
  qConf: { display: "flex", alignItems: "center", gap: 5, marginBottom: 5 },
  qBar: {
    flex: 1,
    height: 3,
    background: "var(--bg3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  qScore: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--text3)" },
  qBtns: { display: "flex", gap: 4 },
  btnShow: {
    flex: 1,
    padding: "4px 7px",
    fontSize: 10,
    fontWeight: 600,
    background: "var(--accent-dim)",
    border: "1px solid var(--accent-border)",
    color: "var(--accent)",
    borderRadius: "var(--radius-sm)",
  },
  btnDismiss: {
    padding: "4px 7px",
    fontSize: 10,
    background: "var(--red-dim)",
    border: "1px solid var(--red-border)",
    color: "var(--red)",
    borderRadius: "var(--radius-sm)",
  },
  txMini: {
    margin: "6px",
    padding: "5px 7px",
    background: "var(--bg3)",
    borderRadius: "var(--radius-md)",
    maxHeight: 100,
    overflowY: "auto",
  },
  txLine: { display: "flex", gap: 5, alignItems: "baseline", padding: "1px 0" },
  txTime: {
    fontFamily: "var(--mono)",
    color: "var(--text4)",
    fontSize: 9,
    flexShrink: 0,
    minWidth: 54,
  },
  emptyPane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 3,
  },
};
