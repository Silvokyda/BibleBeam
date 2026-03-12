// src/renderer/pages/Projector.tsx
// Full-screen display — drag this window to the projector monitor.
// Dark background, large text, smooth fade transitions.

import React, { useState, useEffect } from 'react';

const bb = (window as any).biblebeam;

interface VerseDisplay {
  reference: string;
  verseText: string;
  translation: string;
}

export function Projector() {
  const [verse, setVerse]     = useState<VerseDisplay | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsub = bb?.onProjectorUpdate?.((payload: VerseDisplay | null) => {
      if (!payload) {
        // Fade out
        setVisible(false);
        setTimeout(() => setVerse(null), 400);
      } else {
        // Fade out old, swap, fade in new
        setVisible(false);
        setTimeout(() => {
          setVerse(payload);
          setVisible(true);
        }, 250);
      }
    });
    return () => unsub?.();
  }, []);

  return (
    <div style={styles.root}>
      <div style={{ ...styles.content, opacity: visible ? 1 : 0 }}>
        {verse && (
          <>
            <div style={styles.meta}>
              {verse.reference}
              <span style={styles.translation}>{verse.translation}</span>
            </div>
            <div style={styles.verseText}>
              {verse.verseText}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw', height: '100vh',
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8vw',
    overflow: 'hidden',
    userSelect: 'none',
  },
  content: {
    textAlign: 'center',
    maxWidth: '900px',
    transition: 'opacity 0.35s ease',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 'clamp(13px, 1.5vw, 20px)',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: '2.5vw',
  },
  translation: {
    borderLeft: '1px solid rgba(255,255,255,0.15)',
    paddingLeft: 16,
    color: 'rgba(255,255,255,0.25)',
  },
  verseText: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 'clamp(22px, 4vw, 58px)',
    fontWeight: 300,
    lineHeight: 1.55,
    color: '#fff',
    letterSpacing: '-0.01em',
  },
};
