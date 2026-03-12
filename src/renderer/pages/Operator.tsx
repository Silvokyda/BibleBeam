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
  const [listening, setListening]         = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [transcript, setTranscript]       = useState<TranscriptLine[]>([]);
  const [queue, setQueue]                 = useState<DetectedVerse[]>([]);
  const [current, setCurrent]             = useState<DetectedVerse | null>(null);
  const [override, setOverride]           = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Check projector status on mount
  useEffect(() => {
    (async () => {
      const status = await bb?.getProjectorStatus?.();
      setProjectorOpen(!!status);
    })();

    const unsubStatus = bb?.onProjectorStatus?.((open: boolean) => {
      setProjectorOpen(open);
    });

    return () => unsubStatus?.();
  }, []);

  useEffect(() => {
    const unsubT = bb?.onTranscript?.((payload: any) => {
      setTranscript(prev => {
        const lines = [...prev];
        if (!payload.isFinal && lines.length > 0 && !lines[lines.length - 1].isFinal) {
          lines[lines.length - 1] = { ...lines[lines.length - 1], text: payload.text };
          return lines;
        }
        const next = [...lines, { id: uid(), text: payload.text, isFinal: payload.isFinal, ts: Date.now() }];
        return next.slice(-80);
      });
    });

    const unsubV = bb?.onVerseDetected?.((payload: any) => {
      const verse: DetectedVerse = { id: uid(), ...payload, ts: Date.now() };
      if (payload.confidence >= 0.9) {
        setCurrent(verse);
        bb?.approveVerse?.(payload);
      } else {
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

  const toggleProjector = async () => {
    if (projectorOpen) {
      await bb?.closeProjector?.();
    } else {
      await bb?.openProjector?.();
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
    await bb?.overrideVerse?.({ reference: override.trim() });
    setOverride('');
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logoWrap}>
            <div style={s.logoIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
              </svg>
            </div>
            <span style={s.logoText}>BibleBeam</span>
          </div>
          <div style={s.statusPills}>
            {listening && (
              <span className="pill pill-green">
                <span style={s.liveDot} />
                Live
              </span>
            )}
            {projectorOpen && (
              <span className="pill pill-blue">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="15" x="2" y="3" rx="2"/>
                  <line x1="8" x2="16" y1="21" y2="21"/>
                  <line x1="12" x2="12" y1="18" y2="21"/>
                </svg>
                Projector
              </span>
            )}
          </div>
        </div>
        <div style={s.headerRight}>
          <button onClick={toggleProjector}
            style={projectorOpen ? s.btnProjectorActive : s.btnProjector}
            title={projectorOpen ? 'Close projector window' : 'Open projector window'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ marginRight: 6 }}>
              <rect width="20" height="15" x="2" y="3" rx="2"/>
              <line x1="8" x2="16" y1="21" y2="21"/>
              <line x1="12" x2="12" y1="18" y2="21"/>
            </svg>
            {projectorOpen ? 'Close projector' : 'Open projector'}
          </button>
          <button onClick={() => navigate('/settings')} style={s.btnGhost}
            title="Settings">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button onClick={toggleListening}
            style={listening ? s.btnStop : s.btnStart}>
            {listening ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"
                  style={{ marginRight: 6 }}>
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ marginRight: 6 }}>
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
                Start listening
              </>
            )}
          </button>
        </div>
      </header>

      <div style={s.body}>
        {/* Transcript */}
        <section style={s.mainPanel}>
          <div style={s.panelBar}>
            <div style={s.panelBarLeft}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: 'var(--text3)' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span style={s.panelBarTitle}>Transcript</span>
            </div>
            <span className="pill pill-gray" style={{ fontSize: 9 }}>
              {listening ? 'LISTENING' : 'IDLE'}
            </span>
          </div>

          <div style={s.transcriptBody}>
            {transcript.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" x2="12" y1="19" y2="22"/>
                  </svg>
                </div>
                <span style={s.emptyTitle}>
                  {listening ? 'Waiting for speech...' : 'Ready to listen'}
                </span>
                <span style={s.emptyDesc}>
                  {listening
                    ? 'Speak into the microphone — transcript appears here in real time.'
                    : 'Press "Start listening" to begin detecting Bible verses from speech.'}
                </span>
              </div>
            ) : (
              transcript.map(line => (
                <div key={line.id} style={{
                  ...s.tLine,
                  opacity: line.isFinal ? 1 : 0.35,
                }}>
                  <span style={s.tTime}>
                    {new Date(line.ts).toLocaleTimeString('en', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </span>
                  <span>{line.text}</span>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </section>

        {/* Sidebar */}
        <aside style={s.sidebar}>
          {/* Queue */}
          <div style={s.sideSection}>
            <div style={s.panelBar}>
              <div style={s.panelBarLeft}>
                <span style={s.panelBarTitle}>Queue</span>
                {queue.length > 0 && (
                  <span className="pill pill-amber">{queue.length}</span>
                )}
              </div>
            </div>
            <div style={s.sideSectionBody}>
              {queue.length === 0 ? (
                <p style={s.sideEmpty}>No verses pending</p>
              ) : (
                queue.map(verse => (
                  <div key={verse.id} style={s.qCard} className="animate-in">
                    <div style={s.qMeta}>
                      <span style={s.qRef}>{verse.reference}</span>
                      <span className={`pill pill-${verse.method === 'regex' ? 'green' : verse.method === 'fuzzy' ? 'amber' : 'purple'}`}>
                        {verse.method}
                      </span>
                    </div>
                    <p style={s.qPreview}>
                      {verse.verseText?.slice(0, 100)}{(verse.verseText?.length ?? 0) > 100 ? '…' : ''}
                    </p>
                    <div style={s.qBar}>
                      <div style={s.qTrack}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${verse.confidence * 100}%`,
                          background: verse.confidence >= 0.8 ? 'var(--accent)' : 'var(--amber)',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={s.qScore}>{Math.round(verse.confidence * 100)}%</span>
                    </div>
                    <div style={s.qActions}>
                      <button onClick={() => approve(verse)} style={s.btnApprove}>Show</button>
                      <button onClick={() => reject(verse)} style={s.btnReject}>Dismiss</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* On screen */}
          <div style={s.sideSection}>
            <div style={s.panelBar}>
              <div style={s.panelBarLeft}>
                <span style={s.panelBarTitle}>On screen</span>
                {current && <span className="pill pill-green">Live</span>}
              </div>
            </div>
            <div style={s.sideSectionBody}>
              {current ? (
                <div style={s.currentCard}>
                  <div style={s.currentMeta}>
                    <span style={s.currentRef}>{current.reference}</span>
                    <span style={s.currentTranslation}>{current.translation}</span>
                  </div>
                  <p style={s.currentText}>"{current.verseText}"</p>
                  <button onClick={clearScreen} style={s.btnClear}>Clear screen</button>
                </div>
              ) : (
                <p style={s.sideEmpty}>
                  {projectorOpen ? 'Nothing displayed' : 'Projector not open'}
                </p>
              )}
            </div>
          </div>

          {/* Override */}
          <div style={s.sideSection}>
            <div style={s.panelBar}>
              <span style={s.panelBarTitle}>Manual override</span>
            </div>
            <form onSubmit={handleOverride} style={s.overrideForm}>
              <input
                value={override}
                onChange={e => setOverride(e.target.value)}
                placeholder="e.g. John 3:16"
                style={s.overrideInput}
              />
              <button type="submit" disabled={!override.trim()} style={s.btnOverride}>
                Show
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', background: 'var(--bg)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 12px 0 16px', height: 48,
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg2)',
    flexShrink: 0,
  },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 6 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 28, height: 28, borderRadius: 'var(--radius)',
    background: 'var(--accent-dim)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--accent)',
  },
  logoText: {
    fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em',
    color: 'var(--text)',
  },
  statusPills: { display: 'flex', gap: 6 },
  liveDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--accent)', display: 'inline-block',
    animation: 'pulse-dot 1.5s ease-in-out infinite',
  },

  btnStart: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--accent)', color: 'var(--text-inverse)',
    padding: '6px 14px', fontWeight: 600, fontSize: 12,
  },
  btnStop: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--red)', color: '#fff',
    padding: '6px 14px', fontWeight: 600, fontSize: 12,
  },
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', color: 'var(--text2)',
    width: 32, height: 32, padding: 0,
    borderRadius: 'var(--radius)',
  },
  btnProjector: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    color: 'var(--text2)', padding: '6px 12px', fontSize: 12,
  },
  btnProjectorActive: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--blue-dim)', border: '1px solid var(--blue-border)',
    color: 'var(--blue)', padding: '6px 12px', fontSize: 12,
  },
  btnApprove: {
    flex: 1,
    background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
    color: 'var(--accent)', padding: '5px 10px', fontSize: 11, fontWeight: 600,
  },
  btnReject: {
    background: 'var(--red-dim)', border: '1px solid var(--red-border)',
    color: 'var(--red)', padding: '5px 10px', fontSize: 11, fontWeight: 600,
  },
  btnClear: {
    width: '100%', marginTop: 8,
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    color: 'var(--text2)', padding: '5px 10px', fontSize: 11,
  },
  btnOverride: {
    background: 'var(--bg-active)', border: '1px solid var(--border2)',
    color: 'var(--text)', padding: '7px 14px', fontSize: 12,
    fontWeight: 500, flexShrink: 0,
  },

  body: { display: 'flex', flex: 1, overflow: 'hidden' },

  mainPanel: {
    flex: 1, display: 'flex', flexDirection: 'column',
    borderRight: '1px solid var(--border)', overflow: 'hidden',
  },
  panelBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 16px', height: 36,
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg2)', flexShrink: 0,
  },
  panelBarLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  panelBarTitle: {
    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500,
    color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em',
  },

  transcriptBody: {
    flex: 1, overflowY: 'auto', padding: '8px 16px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  tLine: {
    display: 'flex', gap: 12, alignItems: 'baseline',
    padding: '3px 0', fontSize: 13, lineHeight: 1.6,
  },
  tTime: {
    fontFamily: 'var(--mono)', color: 'var(--text3)',
    fontSize: 10, flexShrink: 0, minWidth: 68,
  },

  emptyState: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 6, padding: 40,
  },
  emptyIcon: {
    width: 48, height: 48, borderRadius: 'var(--radius-lg)',
    background: 'var(--bg3)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: 'var(--text3)', marginBottom: 8,
  },
  emptyTitle: { fontSize: 14, fontWeight: 500, color: 'var(--text2)' },
  emptyDesc: {
    fontSize: 12, color: 'var(--text3)',
    textAlign: 'center', maxWidth: 300, lineHeight: 1.6,
  },

  sidebar: {
    width: 320, flexShrink: 0,
    display: 'flex', flexDirection: 'column',
    overflowY: 'auto', background: 'var(--bg)',
  },
  sideSection: { borderBottom: '1px solid var(--border)' },
  sideSectionBody: { padding: 0 },
  sideEmpty: {
    padding: '20px 16px', color: 'var(--text3)',
    fontSize: 12, textAlign: 'center',
  },

  qCard: {
    padding: '10px 16px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  qMeta: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  qRef: { fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 },
  qPreview: {
    fontSize: 11, color: 'var(--text2)',
    lineHeight: 1.5, marginBottom: 6,
  },
  qBar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  qTrack: {
    flex: 1, height: 3, background: 'var(--bg3)',
    borderRadius: 2, overflow: 'hidden',
  },
  qScore: { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' },
  qActions: { display: 'flex', gap: 6 },

  currentCard: { padding: '10px 16px' },
  currentMeta: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  currentRef: { fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 },
  currentTranslation: {
    fontFamily: 'var(--mono)', fontSize: 10,
    color: 'var(--text3)', textTransform: 'uppercase',
  },
  currentText: {
    fontSize: 12, color: 'var(--text2)',
    lineHeight: 1.6, fontStyle: 'italic',
  },

  overrideForm: { display: 'flex', gap: 8, padding: '10px 16px' },
  overrideInput: { flex: 1, fontFamily: 'var(--mono)', fontSize: 12 },
};