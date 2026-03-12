// src/renderer/pages/Operator.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const bb = (window as any).biblebeam;

interface TranscriptLine {
  id: number;
  text: string;
  isFinal: boolean;
  ts: number;
}

interface DetectedVerse {
  id: number;
  reference: string;
  verseText: string;
  translation: string;
  confidence: number;
  method: 'regex' | 'fuzzy' | 'semantic';
  ts: number;
}

let _id = 0;
const uid = () => ++_id;

export function Operator() {
  const navigate = useNavigate();
  const [listening, setListening]     = useState(false);
  const [transcript, setTranscript]   = useState<TranscriptLine[]>([]);
  const [queue, setQueue]             = useState<DetectedVerse[]>([]);
  const [current, setCurrent]         = useState<DetectedVerse | null>(null);
  const [override, setOverride]       = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // IPC listeners
  useEffect(() => {
    const unsubT = bb?.onTranscript?.((payload: any) => {
      setTranscript(prev => {
        const lines = [...prev];
        if (!payload.isFinal && lines.length > 0 && !lines[lines.length - 1].isFinal) {
          // Replace last interim line
          lines[lines.length - 1] = { ...lines[lines.length - 1], text: payload.text };
          return lines;
        }
        const next = [...lines, { id: uid(), text: payload.text, isFinal: payload.isFinal, ts: Date.now() }];
        return next.slice(-60); // keep last 60 lines
      });
    });

    const unsubV = bb?.onVerseDetected?.((payload: any) => {
      const verse: DetectedVerse = { id: uid(), ...payload, ts: Date.now() };
      // High confidence → auto-display
      if (payload.confidence >= 0.9) {
        setCurrent(verse);
        bb?.approveVerse?.(payload);
      } else {
        // Queue for operator approval
        setQueue(prev => [...prev, verse]);
      }
    });

    return () => { unsubT?.(); unsubV?.(); };
  }, []);

  const toggleListening = async () => {
    if (listening) {
      await bb?.stopListening?.();
      setListening(false);
    } else {
      await bb?.startListening?.();
      setListening(true);
    }
  };

  const approve = useCallback((verse: DetectedVerse) => {
    setCurrent(verse);
    bb?.approveVerse?.(verse);
    setQueue(q => q.filter(v => v.id !== verse.id));
  }, []);

  const reject = useCallback((verse: DetectedVerse) => {
    setQueue(q => q.filter(v => v.id !== verse.id));
  }, []);

  const clearScreen = () => {
    setCurrent(null);
    bb?.clearVerse?.();
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!override.trim()) return;
    // Send manual reference to main process for lookup
    await bb?.overrideVerse?.({ reference: override.trim() });
    setOverride('');
  };

  return (
    <div style={styles.root}>

      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>BibleBeam</span>
          {listening && (
            <span className="pill pill-green">
              <span style={styles.dot} />
              live
            </span>
          )}
        </div>
        <div style={styles.headerRight}>
          <button
            onClick={() => navigate('/settings')}
            style={styles.btnGhost}
          >
            Settings
          </button>
          <button
            onClick={toggleListening}
            style={listening ? styles.btnStop : styles.btnStart}
          >
            {listening ? 'Stop listening' : 'Start listening'}
          </button>
        </div>
      </header>

      <div style={styles.body}>

        {/* ── Left: Transcript ── */}
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>Transcript</span>
            <span className="muted" style={{ fontSize: 11 }}>
              {listening ? 'listening...' : 'idle'}
            </span>
          </div>
          <div style={styles.transcriptScroll}>
            {transcript.length === 0 ? (
              <p style={styles.empty}>
                {listening
                  ? 'Waiting for speech...'
                  : 'Press "Start listening" to begin.'}
              </p>
            ) : (
              transcript.map(line => (
                <div
                  key={line.id}
                  style={{
                    ...styles.transcriptLine,
                    opacity: line.isFinal ? 1 : 0.45,
                    animation: line.isFinal ? 'slide-up 0.2s ease' : 'none',
                  }}
                >
                  <span className="mono" style={styles.transcriptTime}>
                    {new Date(line.ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span>{line.text}</span>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </section>

        {/* ── Right: Controls ── */}
        <aside style={styles.sidebar}>

          {/* Approval Queue */}
          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelLabel}>Queue</span>
              {queue.length > 0 && (
                <span className="pill pill-amber">{queue.length}</span>
              )}
            </div>
            {queue.length === 0 ? (
              <p style={styles.empty}>No verses pending</p>
            ) : (
              queue.map(verse => (
                <div key={verse.id} style={styles.queueCard}>
                  <div style={styles.queueTop}>
                    <span style={styles.verseRef}>{verse.reference}</span>
                    <span className={`pill pill-${verse.method === 'regex' ? 'green' : 'amber'}`}>
                      {verse.method}
                    </span>
                  </div>
                  <p style={styles.versePreview}>
                    "{verse.verseText?.slice(0, 80)}..."
                  </p>
                  <div style={styles.queueActions}>
                    <button onClick={() => approve(verse)} style={styles.btnApprove}>
                      Show
                    </button>
                    <button onClick={() => reject(verse)} style={styles.btnReject}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Current verse on screen */}
          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelLabel}>On screen</span>
              {current && <span className="pill pill-green">live</span>}
            </div>
            {current ? (
              <div style={styles.currentCard}>
                <div style={styles.currentRef}>{current.reference}</div>
                <div style={styles.currentTranslation}>{current.translation}</div>
                <p style={styles.currentText}>"{current.verseText}"</p>
                <button onClick={clearScreen} style={styles.btnClear}>
                  Clear screen
                </button>
              </div>
            ) : (
              <p style={styles.empty}>Nothing on screen</p>
            )}
          </section>

          {/* Manual override */}
          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelLabel}>Manual override</span>
            </div>
            <form onSubmit={handleOverride} style={styles.overrideForm}>
              <input
                value={override}
                onChange={e => setOverride(e.target.value)}
                placeholder="John 3:16, Ps 23:1 ..."
                style={{ ...styles.overrideInput, flex: 1 }}
              />
              <button type="submit" style={styles.btnSend}>
                Show
              </button>
            </form>
          </section>

        </aside>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', background: 'var(--bg)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg2)',
    flexShrink: 0,
  },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  logo: {
    fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500,
    color: 'var(--accent)', letterSpacing: '0.05em',
  },
  dot: {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--accent)',
    display: 'inline-block',
    animation: 'pulse-dot 1.5s ease-in-out infinite',
  },
  body: {
    display: 'flex', flex: 1, overflow: 'hidden', gap: 0,
  },

  // Panel
  panel: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 12,
    background: 'var(--bg2)',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
  },
  panelLabel: {
    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500,
    color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em',
  },

  // Transcript
  panel_left: { flex: 1 },
  transcriptScroll: {
    height: 'calc(100vh - 130px)',
    overflowY: 'auto',
    padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  transcriptLine: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    fontSize: 13, lineHeight: 1.6,
    animation: 'slide-up 0.2s ease',
  },
  transcriptTime: {
    color: 'var(--text3)', fontSize: 11, paddingTop: 2,
    flexShrink: 0, minWidth: 72,
  },

  // Sidebar
  sidebar: {
    width: 320, flexShrink: 0,
    padding: '12px 12px 12px 0',
    overflowY: 'auto',
    borderLeft: '1px solid var(--border)',
    paddingLeft: 12,
  },

  // Queue card
  queueCard: {
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    animation: 'slide-up 0.2s ease',
  },
  queueTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  verseRef: { fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500 },
  versePreview: {
    fontSize: 12, color: 'var(--text2)',
    lineHeight: 1.5, marginBottom: 8,
  },
  queueActions: { display: 'flex', gap: 6 },

  // Current card
  currentCard: { padding: '12px 14px' },
  currentRef: {
    fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500,
    marginBottom: 2,
  },
  currentTranslation: {
    fontSize: 11, color: 'var(--text2)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: 8,
  },
  currentText: {
    fontSize: 12, color: 'var(--text2)',
    lineHeight: 1.6, marginBottom: 10,
  },

  // Override
  overrideForm: {
    display: 'flex', gap: 8, padding: '10px 14px',
  },
  overrideInput: { fontFamily: 'var(--mono)', fontSize: 12 },

  // Buttons
  btnStart: {
    background: 'var(--accent)', color: '#000',
    padding: '7px 16px',
  },
  btnStop: {
    background: 'var(--accent3)', color: '#fff',
    padding: '7px 16px',
  },
  btnGhost: {
    background: 'transparent',
    border: '1px solid var(--border2)',
    color: 'var(--text2)',
    padding: '7px 14px',
  },
  btnApprove: {
    background: 'var(--accent-dim)', color: 'var(--accent)',
    padding: '5px 12px', fontSize: 12,
  },
  btnReject: {
    background: '#450a0a', color: 'var(--accent3)',
    padding: '5px 12px', fontSize: 12,
  },
  btnClear: {
    background: 'var(--bg3)', color: 'var(--text2)',
    padding: '6px 12px', fontSize: 12,
    border: '1px solid var(--border2)',
  },
  btnSend: {
    background: 'var(--bg3)', color: 'var(--text)',
    padding: '8px 14px',
    border: '1px solid var(--border2)',
  },
  empty: {
    padding: '16px 14px',
    color: 'var(--text3)', fontSize: 12,
    fontStyle: 'italic',
  },
};
